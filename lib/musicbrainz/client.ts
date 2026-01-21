import type {
  MusicBrainzRecording,
  MusicBrainzReleaseGroup,
  MusicBrainzRelease,
  CoverArtArchiveResponse,
  SearchResult,
} from '@/lib/types/musicbrainz'

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2'
const COVER_ART_ARCHIVE_BASE_URL = 'https://coverartarchive.org'

// User-Agent header required by MusicBrainz
const USER_AGENT = 'Rankify/1.0.0 (https://github.com/yourusername/rankify)'

// Rate limiting: MusicBrainz requires max 1 request per second
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100 // 1.1 seconds between requests (slightly more than 1s to be safe)

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  lastRequestTime = Date.now()
}

async function fetchWithHeaders(url: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Wait for rate limit before each request
      await waitForRateLimit()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // For Cover Art Archive, a 404 means no cover art, not an error
        if (url.startsWith(COVER_ART_ARCHIVE_BASE_URL) && response.status === 404) {
          return null // Indicate no cover art
        }
        
        // Handle rate limiting (503 Service Temporarily Unavailable) or 429 Too Many Requests
        if (response.status === 503 || response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000 // Use Retry-After header or exponential backoff
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        throw new Error(`API error: ${response.status} ${response.statusText} for URL: ${url}`)
      }

      return response.json()
    } catch (error: any) {
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        console.error(`Failed to fetch after ${retries} attempts:`, error)
        throw error
      }
      
      // If it's a network error or rate limit, wait before retrying
      if (
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.name === 'AbortError' || 
        error.message?.includes('fetch failed') ||
        error.message?.includes('Service Temporarily Unavailable') ||
        error.message?.includes('503')
      ) {
        const waitTime = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
        console.warn(`Network/rate limit error on attempt ${attempt}, retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }
}

/**
 * Search for recordings (songs) by query
 */
export async function searchRecordings(query: string, limit = 10): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query)
  const url = `${MUSICBRAINZ_BASE_URL}/recording?query=${encodedQuery}&limit=${limit}&fmt=json`

  try {
    const data = await fetchWithHeaders(url)
    const recordings: MusicBrainzRecording[] = data.recordings || []

    const results: SearchResult[] = await Promise.all(
      recordings.map(async (recording) => {
        const artist = recording['artist-credit']
          .map((ac) => ac.artist.name)
          .join(', ')
        const release = recording.releases?.[0]
        const releaseGroupId = release?.['release-group']?.id

        return {
          id: recording.id,
          title: recording.title,
          artist,
          type: 'recording' as const,
          albumTitle: release?.title,
          albumId: releaseGroupId,
        }
      })
    )

    return results
  } catch (error) {
    console.error('Error searching recordings:', error)
    throw error
  }
}

/**
 * Search for release groups (albums) by query
 * @param query - Search query
 * @param limit - Maximum number of results
 * @param filterStudioAlbumsOnly - If true, filters to only official studio albums (excludes compilations, live albums, etc.)
 */
export async function searchReleaseGroups(
  query: string,
  limit = 10,
  filterStudioAlbumsOnly = false
): Promise<SearchResult[]> {
  let fullQuery = query
  let requestLimit = limit

  // Add filters for official studio albums only when searching by artist
  if (filterStudioAlbumsOnly) {
    // primarytype:Album = only albums (not singles, EPs)
    // -secondarytype:Compilation = exclude compilations
    // -secondarytype:Live = exclude live albums
    // -secondarytype:Remix = exclude remix albums
    // -secondarytype:Demo = exclude demos
    // -secondarytype:Mixtape = exclude mixtapes
    // -secondarytype:Soundtrack = exclude soundtracks
    // -secondarytype:Spokenword = exclude spoken word
    // -secondarytype:Interview = exclude interviews
    const filters = [
      'primarytype:Album',
      '-secondarytype:Compilation',
      '-secondarytype:Live',
      '-secondarytype:Remix',
      '-secondarytype:Demo',
      '-secondarytype:Mixtape',
      '-secondarytype:Soundtrack',
      '-secondarytype:Spokenword',
      '-secondarytype:Interview',
    ].join(' AND ')
    
    fullQuery = `${query} AND ${filters}`
    requestLimit = limit * 2 // Get more results to account for filtering
  }
  
  const encodedQuery = encodeURIComponent(fullQuery)
  const url = `${MUSICBRAINZ_BASE_URL}/release-group?query=${encodedQuery}&limit=${requestLimit}&fmt=json`

  try {
    const data = await fetchWithHeaders(url)
    let releaseGroups: MusicBrainzReleaseGroup[] = data['release-groups'] || []

    // Additional client-side filtering when searching by artist
    if (filterStudioAlbumsOnly) {
      releaseGroups = releaseGroups.filter((rg) => {
        // Must be an album (primary type)
        if (rg['primary-type']?.toLowerCase() !== 'album') {
          return false
        }
        
        // Exclude if it has any secondary types (compilations, live, etc.)
        const secondaryTypes = rg['secondary-types'] || []
        if (secondaryTypes.length > 0) {
          return false
        }
        
        return true
      })

      // Sort by release date (earliest first) to prioritize original studio albums
      releaseGroups.sort((a, b) => {
        const dateA = a['first-release-date'] || '9999-12-31'
        const dateB = b['first-release-date'] || '9999-12-31'
        return dateA.localeCompare(dateB)
      })

      // Limit to requested number
      releaseGroups = releaseGroups.slice(0, limit)
    }

    const results: SearchResult[] = await Promise.all(
      releaseGroups.map(async (rg) => {
        const artist = rg['artist-credit']
          .map((ac) => ac.artist.name)
          .join(', ')

        // Fetch cover art for this release group
        const coverArtUrl = await getCoverArtUrl(rg.id)

        return {
          id: rg.id,
          title: rg.title,
          artist,
          type: 'release-group' as const,
          coverArtUrl,
        }
      })
    )

    return results
  } catch (error) {
    console.error('Error searching release groups:', error)
    throw error
  }
}

/**
 * Get cover art URL for a release group
 */
export async function getCoverArtUrl(releaseGroupId: string): Promise<string | undefined> {
  try {
    const url = `${COVER_ART_ARCHIVE_BASE_URL}/release-group/${releaseGroupId}`
    
    // Use fetchWithHeaders for retry logic, rate limiting, and timeout handling
    const data: CoverArtArchiveResponse | null = await fetchWithHeaders(url, 3)

    // fetchWithHeaders returns null for 404s (no cover art available)
    if (!data || !data.images || data.images.length === 0) {
      return undefined
    }

    // Prefer front cover image
    const frontImage = data.images.find((img) => img.front)
    if (frontImage) {
      // Use large thumbnail if available, otherwise use full image
      return frontImage.thumbnails?.large || frontImage.image
    }

    // Fallback to first image if no front image
    const firstImage = data.images[0]
    if (firstImage) {
      return firstImage.thumbnails?.large || firstImage.image
    }

    return undefined
  } catch (error) {
    // Cover art not available for this release group (network error, timeout, etc.)
    return undefined
  }
}

/**
 * Get recording details by ID
 */
export async function getRecordingById(recordingId: string): Promise<SearchResult | null> {
  const url = `${MUSICBRAINZ_BASE_URL}/recording/${recordingId}?inc=releases+artists&fmt=json`

  try {
    const recording: MusicBrainzRecording = await fetchWithHeaders(url)
    const artist = recording['artist-credit']
      .map((ac) => ac.artist.name)
      .join(', ')
    const release = recording.releases?.[0]
    const releaseGroupId = release?.['release-group']?.id

    return {
      id: recording.id,
      title: recording.title,
      artist,
      type: 'recording',
      albumTitle: release?.title,
      albumId: releaseGroupId,
    }
  } catch (error) {
    console.error('Error fetching recording:', error)
    return null
  }
}

/**
 * Get release group details by ID
 */
export async function getReleaseGroupById(releaseGroupId: string): Promise<SearchResult | null> {
  const url = `${MUSICBRAINZ_BASE_URL}/release-group/${releaseGroupId}?inc=artists&fmt=json`

  try {
    const rg: MusicBrainzReleaseGroup = await fetchWithHeaders(url)
    const artist = rg['artist-credit']
      .map((ac) => ac.artist.name)
      .join(', ')

    return {
      id: rg.id,
      title: rg.title,
      artist,
      type: 'release-group',
    }
  } catch (error) {
    console.error('Error fetching release group:', error)
    return null
  }
}

/**
 * Get releases for a release-group
 * Based on MusicBrainz best practices: filter by status=official and type=album,
 * then sort by date to get the original release
 */
export async function getReleasesForReleaseGroup(
  releaseGroupId: string
): Promise<MusicBrainzRelease[]> {
  // Get all releases for this release-group
  // Include release-group data so we can filter by primary-type
  // Include media so we can see track-count for sorting
  const url = `${MUSICBRAINZ_BASE_URL}/release?query=rgid:${releaseGroupId}&limit=100&inc=release-groups+media&fmt=json`

  try {
    const data = await fetchWithHeaders(url)
    const allReleases: MusicBrainzRelease[] = data.releases || []
    
    console.log(`Found ${allReleases.length} total releases for release-group ${releaseGroupId}`)
    
    // Filter for official album releases (best practice from MusicBrainz community)
    const officialAlbums = allReleases.filter((r) => {
      // Must be official status
      const isOfficial = r.status?.toLowerCase() === 'official'
      // Must be an album (check release-group primary type)
      const isAlbum = r['release-group']?.['primary-type']?.toLowerCase() === 'album'
      
      return isOfficial && isAlbum
    })
    
    console.log(`Found ${officialAlbums.length} official album releases`)
    
    // If no official albums found, fall back to filtering by title
    let releasesToSort = officialAlbums.length > 0 
      ? officialAlbums 
      : allReleases.filter((r) => {
          const title = (r.title || '').toLowerCase()
          // Skip obvious deluxe/expanded editions
          const skipKeywords = ['deluxe', 'expanded', 'super deluxe', 'anniversary', 'remastered']
          return !skipKeywords.some((keyword) => title.includes(keyword))
        })
    
    // Sort releases to find the original:
    // 1. Prefer releases with fewer media (single disc = standard album)
    // 2. Prefer earlier dates (original release) - MOST IMPORTANT
    // 3. Prefer releases with more tracks (complete version vs edited version) - tiebreaker
    const sorted = releasesToSort.sort((a, b) => {
      // First, prefer releases with fewer media (standard album vs multi-disc)
      const mediaA = a.media?.length || 999
      const mediaB = b.media?.length || 999
      if (mediaA !== mediaB) {
        return mediaA - mediaB
      }
      // Then, prefer earlier dates (original release) - this is the most important
      const dateA = a.date || '9999-12-31'
      const dateB = b.date || '9999-12-31'
      const dateCompare = dateA.localeCompare(dateB)
      if (dateCompare !== 0) {
        return dateCompare
      }
      // If same date, prefer releases with more tracks (complete version)
      // Get track count from first disc's tracks array length
      const firstMediaA = a.media?.[0] as any
      const firstMediaB = b.media?.[0] as any
      const trackCountA = firstMediaA?.['track-count'] || firstMediaA?.tracks?.length || firstMediaA?.track?.length || 0
      const trackCountB = firstMediaB?.['track-count'] || firstMediaB?.tracks?.length || firstMediaB?.track?.length || 0
      return trackCountB - trackCountA // More tracks = better (descending)
    })
    
    if (sorted.length > 0) {
      console.log(`Selected original release: ${sorted[0].id} (${sorted[0].title}) from ${sorted[0].date}, ${sorted[0].media?.length || 0} disc(s)`)
    }
    
    return sorted
  } catch (error) {
    console.error('Error fetching releases:', error)
    return []
  }
}

/**
 * Check if a track title indicates it's a bonus/alternate version
 */
function isBonusOrAlternateTrack(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  const bonusIndicators = [
    'bonus',
    'documentary',
    'rehearsal',
    'fragment',
    'early mix',
    'alternate',
    'demo',
    'outtake',
    'remix',
    'version',
    'take ',
    'live',
    'acoustic',
    'instrumental',
    'extended',
    'edit',
    'radio edit',
    'single version',
  ]
  
  return bonusIndicators.some((indicator) => lowerTitle.includes(indicator))
}

/**
 * Get tracks from a specific release
 * Only returns tracks from the first medium (disc 1) - standard album tracks
 */
export async function getTracksFromRelease(
  releaseId: string
): Promise<SearchResult[]> {
  // Include media and recordings to get the tracklist
  const url = `${MUSICBRAINZ_BASE_URL}/release/${releaseId}?inc=recordings+artist-credits+media&fmt=json`

  try {
    const response = await fetchWithHeaders(url)
    // MusicBrainz API might return the release directly or wrapped
    const release: MusicBrainzRelease = response.release || response
    
    const tracks: SearchResult[] = []

    console.log(`Fetching release ${releaseId}: ${release.title}`)
    console.log(`Response keys:`, Object.keys(response))
    console.log(`Release keys:`, Object.keys(release))
    
    // Check for media in different possible locations
    const media = release.media || (response as any)['media-list'] || []
    console.log(`Media found: ${media.length} disc(s)`)

    if (!media || media.length === 0) {
      console.warn(`No media found for release ${releaseId}`)
      // Debug: log the actual response structure
      console.log(`Full response structure:`, JSON.stringify(response).substring(0, 2000))
      return []
    }

    // CRITICAL: Only get tracks from the FIRST medium (disc 1)
    // Standard albums are on disc 1, bonus tracks are on disc 2+
    const firstDisc = media[0]
    
    // Check for tracks in different possible locations (MusicBrainz uses "tracks" plural)
    const discTracks = firstDisc.tracks || firstDisc.track || firstDisc['track-list'] || []
    console.log(`First disc has ${discTracks.length} tracks`)
    
    if (!discTracks || discTracks.length === 0) {
      console.warn(`No tracks found in first disc of release ${releaseId}`)
      // Try to see what we actually got
      console.log(`First disc structure:`, JSON.stringify(firstDisc, null, 2).substring(0, 1000))
      return []
    }

    console.log(`Release ${releaseId} has ${media.length} disc(s), ${discTracks.length} tracks on disc 1`)

    // Get tracks from first disc only
    // For original releases, we typically don't need to filter by title
    // because the first disc should only contain standard album tracks
    discTracks.forEach((track: any) => {
      // Handle different track structures
      const recording = track.recording || track
      
      if (!recording || !recording.title) {
        console.warn(`Track has no recording data:`, track)
        return
      }

      const title = recording.title
      
      // Still filter out obvious bonus/alternate tracks that might be on disc 1
      // (some releases have bonus tracks mixed in)
      if (isBonusOrAlternateTrack(title)) {
        console.log(`Skipping bonus/alternate track: ${title}`)
        return
      }

      const artistCredit = recording['artist-credit'] || recording['artist-credits']
      const artist = artistCredit
        ?.map((ac: any) => (ac.artist || ac).name)
        .join(', ') || 'Unknown Artist'

      tracks.push({
        id: recording.id,
        title: recording.title,
        artist,
        type: 'recording' as const,
        albumTitle: release.title,
        albumId: release['release-group']?.id,
      })
    })

    console.log(`Returning ${tracks.length} tracks from disc 1 of release ${releaseId}`)
    return tracks
  } catch (error) {
    console.error('Error fetching release tracks:', error)
    return []
  }
}

/**
 * Get songs from a release-group by fetching tracks from the original release
 * Based on MusicBrainz best practices:
 * 1. Filter for official album releases
 * 2. Select the earliest release (original)
 * 3. Only get tracks from disc 1 (standard album tracks)
 */
export async function getSongsFromReleaseGroup(
  releaseGroupId: string,
  albumTitle?: string,
  artist?: string
): Promise<SearchResult[]> {
  try {
    console.log(`Fetching songs for release-group: ${releaseGroupId}`)
    
    // Fetch cover art for the release group (once, shared by all songs)
    const coverArtUrl = await getCoverArtUrl(releaseGroupId)
    
    // Get all official album releases for this release-group
    const releases = await getReleasesForReleaseGroup(releaseGroupId)
    console.log(`Found ${releases.length} releases for release-group ${releaseGroupId}`)

    if (releases.length === 0) {
      console.warn(`No releases found for release-group ${releaseGroupId}`)
      return []
    }

    // Use the first release (earliest date, single disc = original)
    const originalRelease = releases[0]
    console.log(`Using original release: ${originalRelease.id} (${originalRelease.title}) from ${originalRelease.date}`)

    // Get tracks from disc 1 only (standard album tracks)
    const tracks = await getTracksFromRelease(originalRelease.id)

    if (tracks.length === 0) {
      console.warn(`No tracks found for release ${originalRelease.id}`)
      // Try next release if first one has no tracks
      if (releases.length > 1) {
        console.log(`Trying next release: ${releases[1].id}`)
        const nextTracks = await getTracksFromRelease(releases[1].id)
        // Add cover art to tracks
        return nextTracks.map(track => ({ ...track, coverArtUrl }))
      }
      return []
    }

    // For original releases, disc 1 should have the standard track count
    // If we have too many tracks (>25), it might be a deluxe edition
    // In that case, limit to first 20 tracks (typical album length)
    let processedTracks = tracks
    if (tracks.length > 25) {
      console.log(`Warning: ${tracks.length} tracks found, limiting to first 20 (likely deluxe edition)`)
      processedTracks = tracks.slice(0, 20)
    }

    // Deduplicate by title (normalize for comparison)
    const seen = new Set<string>()
    const uniqueTracks: SearchResult[] = []

    processedTracks.forEach((track) => {
      // Normalize title for comparison (lowercase, trim)
      const normalizedTitle = track.title.toLowerCase().trim()
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle)
        uniqueTracks.push({
          ...track,
          coverArtUrl, // Add cover art to each track
        })
      }
    })

    console.log(`Returning ${uniqueTracks.length} unique tracks from original release ${originalRelease.id}`)
    return uniqueTracks
  } catch (error) {
    console.error('Error getting songs from release group:', error)
    return []
  }
}

