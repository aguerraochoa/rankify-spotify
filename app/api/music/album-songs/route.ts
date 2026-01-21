import { NextRequest, NextResponse } from 'next/server'
import { getSongsFromReleaseGroup, searchRecordings } from '@/lib/musicbrainz/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const releaseGroupId = searchParams.get('releaseGroupId')
  const albumTitle = searchParams.get('albumTitle')
  const artist = searchParams.get('artist')

  // If releaseGroupId is null but we have albumTitle and artist, try to find the album first
  if (!releaseGroupId && albumTitle && artist) {
    try {
      // Search for the album to get its release-group ID
      const { searchReleaseGroups } = await import('@/lib/musicbrainz/client')
      const query = `release:"${albumTitle}" AND artist:"${artist}"`
      const searchResults = await searchReleaseGroups(query, 10, false)
      
      // Find exact match by title and artist (case-insensitive, flexible matching)
      const normalize = (str: string) => str.toLowerCase().trim()
      const normalizedTitle = normalize(albumTitle)
      const normalizedArtist = normalize(artist)
      
      const exactMatch = searchResults.find(
        (album) => {
          const albumTitleMatch = normalize(album.title) === normalizedTitle ||
            normalize(album.title).includes(normalizedTitle) ||
            normalizedTitle.includes(normalize(album.title))
          const artistMatch = normalize(album.artist).includes(normalizedArtist) ||
            normalizedArtist.includes(normalize(album.artist))
          return albumTitleMatch && artistMatch
        }
      )
      
      if (exactMatch) {
        // Use the found release-group ID
        const foundReleaseGroupId = exactMatch.id
        console.log(`Found album ${albumTitle} by ${artist} with ID: ${foundReleaseGroupId}`)
        const songs = await getSongsFromReleaseGroup(foundReleaseGroupId, albumTitle, artist)
        return NextResponse.json({ songs })
      } else {
        console.log(`Could not find exact match for album ${albumTitle} by ${artist}`)
      }
    } catch (error) {
      console.error('Error searching for album:', error)
      // Fall through to return error
    }
  }

  if (!releaseGroupId) {
    return NextResponse.json(
      { error: 'releaseGroupId is required, or albumTitle and artist must be provided' },
      { status: 400 }
    )
  }

  try {
    // Try new method: Get songs from the primary release of this release-group
    // Pass albumTitle and artist for cover art fetching
    let songs = await getSongsFromReleaseGroup(releaseGroupId, albumTitle || undefined, artist || undefined)

    // Fallback to old method if new method returns no songs
    if (songs.length === 0 && albumTitle) {
      console.log(`New method returned no songs, falling back to search method`)
      const query = artist 
        ? `release:"${albumTitle}" AND artist:"${artist}"`
        : `release:"${albumTitle}"`
      const searchResults = await searchRecordings(query, 100)
      
      // Filter to only include songs that match this release-group
      songs = searchResults.filter((song) => {
        return song.albumId === releaseGroupId
      })
      
      // Try to add cover art to fallback results
      if (songs.length > 0) {
        const { getCoverArtUrl } = await import('@/lib/musicbrainz/client')
        const coverArtUrl = await getCoverArtUrl(releaseGroupId)
        songs = songs.map(song => ({ ...song, coverArtUrl }))
      }
    }

    console.log(`API: Returning ${songs.length} songs for release-group ${releaseGroupId}`)
    return NextResponse.json({ songs })
  } catch (error) {
    console.error('Error fetching album songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch album songs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

