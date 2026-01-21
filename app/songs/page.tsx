'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BinaryInsertionRanker, type RankingState, type ComparisonResult, type Song } from '@/lib/ranking/binaryInsertion'
import { createClient } from '@/lib/supabase/client'

function SongsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'select' | 'review' | 'ranking'>('select')
  const [selectedAlbums, setSelectedAlbums] = useState<any[]>([])
  const [selectedSongs, setSelectedSongs] = useState<any[]>([])
  const [templateSongs, setTemplateSongs] = useState<any[]>([]) // Pre-selected songs from template
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [loadingType, setLoadingType] = useState<'template' | 'draft' | 'extend' | null>(null)
  const [existingRankingId, setExistingRankingId] = useState<string | null>(null)
  const [existingRankedSongs, setExistingRankedSongs] = useState<any[]>([]) // Songs already ranked in order
  const [draftRankingState, setDraftRankingState] = useState<RankingState | null>(null) // Draft state to restore


  // Load template, extend existing ranking, or resume draft
  useEffect(() => {
    const templateId = searchParams.get('template')
    const extendId = searchParams.get('extend')
    const resumeId = searchParams.get('resume')

    if (extendId) {
      setLoadingType('extend')
      loadExistingRanking(extendId)
    } else if (templateId) {
      setLoadingType('template')
      loadTemplate(templateId)
    } else if (resumeId) {
      setLoadingType('draft')
      loadDraft(resumeId)
    }
  }, [searchParams])

  const loadTemplate = async (rankingId: string) => {
    setLoadingTemplate(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}/template`)
      if (!response.ok) {
        throw new Error('Failed to load template')
      }

      const data = await response.json()

      // Group songs by album to reconstruct albums
      const albumsMap = new Map<string, {
        id: string | null
        title: string | null
        artist: string
        coverArtUrl: string | null
      }>()

      // Process songs and group by album
      const processedSongs: any[] = []
      data.songs.forEach((song: any) => {
        // Create album key (use album_title + artist as key)
        const albumKey = song.album_title
          ? `${song.album_title}|${song.artist}`
          : song.artist

        // Extract album info
        // Use album_musicbrainz_id as the key if available, otherwise use albumKey
        const albumMapKey = song.album_musicbrainz_id || albumKey
        if (!albumsMap.has(albumMapKey)) {
          albumsMap.set(albumMapKey, {
            id: song.album_musicbrainz_id || null, // Will be null for old rankings, need to look up
            title: song.album_title || null,
            artist: song.artist,
            coverArtUrl: song.cover_art_url || null,
          })
        }

        // Format song for SongReview component
        // Use album_musicbrainz_id if available, otherwise null (will need to be looked up)
        processedSongs.push({
          id: song.musicbrainz_id,
          title: song.title,
          artist: song.artist,
          albumId: song.album_musicbrainz_id || null, // Use null if not available - will be looked up by title/artist
          albumTitle: song.album_title || null,
          albumArtist: song.artist,
          albumCoverArt: song.cover_art_url || null,
        })
      })

      // Convert albums map to array
      const albums = Array.from(albumsMap.values())

      // Set albums and template songs
      setSelectedAlbums(albums)
      setTemplateSongs(processedSongs)

      // Go directly to review step
      setStep('review')
    } catch (error) {
      console.error('Error loading template:', error)
      alert('Failed to load template. Please try again.')
      // Fall back to normal flow
      setStep('select')
    } finally {
      setLoadingTemplate(false)
    }
  }

  const loadExistingRanking = async (rankingId: string) => {
    setLoadingTemplate(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`)
      if (!response.ok) {
        throw new Error('Failed to load ranking')
      }

      const data = await response.json()
      const ranking = data.list

      // Store the ranking ID for later use when saving
      setExistingRankingId(rankingId)

      // Group songs by album to reconstruct albums
      const albumsMap = new Map<string, {
        id: string | null
        title: string | null
        artist: string
        coverArtUrl: string | null
      }>()

      // Process songs and group by album, preserving rank order
      const processedSongs: any[] = []
      const rankedSongs: any[] = []

      ranking.songs.forEach((song: any, index: number) => {
        // Create album key
        const albumKey = song.album_title
          ? `${song.album_title}|${song.artist}`
          : song.artist

        const albumMapKey = song.album_musicbrainz_id || albumKey
        if (!albumsMap.has(albumMapKey)) {
          albumsMap.set(albumMapKey, {
            id: song.album_musicbrainz_id || null,
            title: song.album_title || null,
            artist: song.artist,
            coverArtUrl: song.cover_art_url || null,
          })
        }

        const songData = {
          id: song.musicbrainz_id,
          title: song.title,
          artist: song.artist,
          albumId: song.album_musicbrainz_id || null,
          albumTitle: song.album_title || null,
          albumArtist: song.artist,
          albumCoverArt: song.cover_art_url || null,
          rank: song.rank || (index + 1), // Preserve rank
        }

        processedSongs.push(songData)
        rankedSongs.push(songData) // Store in ranked order
      })

      // Convert albums map to array
      const albums = Array.from(albumsMap.values())

      // Set albums and pre-selected songs
      setSelectedAlbums(albums)
      setTemplateSongs(processedSongs)
      setExistingRankedSongs(rankedSongs) // Store ranked songs for ranking step

      // Go directly to review step
      setStep('review')
    } catch (error) {
      console.error('Error loading existing ranking:', error)
      alert('Failed to load ranking. Please try again.')
      // Fall back to normal flow
      setStep('select')
    } finally {
      setLoadingTemplate(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    setLoadingTemplate(true)
    try {
      const response = await fetch(`/api/ranked-lists/draft?id=${draftId}`)
      if (!response.ok) {
        throw new Error('Failed to load draft')
      }

      const data = await response.json()
      const draft = data.draft

      if (!draft.ranking_state) {
        throw new Error('Draft is missing ranking state')
      }

      const { state: rankingState, songs: draftSongs, existingRankedSongs: draftExistingRankedSongs } = draft.ranking_state

      // Store the draft ID for later use when saving
      setExistingRankingId(draftId)

      // Reconstruct albums from songs
      const albumsMap = new Map<string, {
        id: string | null
        title: string | null
        artist: string
        coverArtUrl: string | null
      }>()

      // Process all songs (both existing ranked and new)
      const allSongs = [...(draftExistingRankedSongs || []), ...(draftSongs || [])]
      allSongs.forEach((song: any) => {
        const albumKey = song.album_title
          ? `${song.album_title}|${song.artist}`
          : song.artist
        const albumMapKey = song.album_musicbrainz_id || song.albumId || albumKey
        if (!albumsMap.has(albumMapKey)) {
          albumsMap.set(albumMapKey, {
            id: song.album_musicbrainz_id || song.albumId || null,
            title: song.album_title || song.albumTitle || null,
            artist: song.artist,
            coverArtUrl: song.cover_art_url || song.coverArtUrl || song.albumCoverArt || null,
          })
        }
      })

      const albums = Array.from(albumsMap.values())

      // Convert songs to the format expected by SongReview
      // Use remaining songs from rankingState if available, otherwise use all draftSongs
      const remainingSongIds = new Set(
        (rankingState.remaining || []).map((s: Song) => s.id || s.musicbrainzId).filter(Boolean)
      )

      // Filter draftSongs to only include songs that are still remaining (not yet ranked)
      const songsToProcess = remainingSongIds.size > 0
        ? draftSongs.filter((song: any) => {
          const songId = song.musicbrainz_id || song.id
          return songId && remainingSongIds.has(songId)
        })
        : draftSongs

      const processedSongs = songsToProcess.map((song: any) => ({
        id: song.musicbrainz_id || song.id,
        title: song.title,
        artist: song.artist,
        albumId: song.album_musicbrainz_id || song.albumId || null,
        albumTitle: song.album_title || song.albumTitle || null,
        albumArtist: song.artist,
        albumCoverArt: song.cover_art_url || song.coverArtUrl || song.albumCoverArt || null,
      }))

      // Convert existing ranked songs
      const existingRanked = (draftExistingRankedSongs || []).map((song: any) => ({
        id: song.musicbrainz_id || song.id,
        title: song.title,
        artist: song.artist,
        albumId: song.album_musicbrainz_id || song.albumId || null,
        albumTitle: song.album_title || song.albumTitle || null,
        albumArtist: song.artist,
        albumCoverArt: song.cover_art_url || song.coverArtUrl || song.albumCoverArt || null,
        rank: song.rank,
      }))

      // Set state
      setSelectedAlbums(albums)
      setTemplateSongs(processedSongs)
      setExistingRankedSongs(existingRanked)
      // Set selectedSongs to the remaining songs that need to be ranked
      setSelectedSongs(processedSongs)

      // Store the ranking state to restore in SongRanking
      setDraftRankingState(rankingState)

      // Go directly to ranking step to restore the draft
      setStep('ranking')
    } catch (error) {
      console.error('Error loading draft:', error)
      alert('Failed to load draft. Please try again.')
      setStep('select')
    } finally {
      setLoadingTemplate(false)
    }
  }

  if (loadingTemplate) {
    const loadingMessage = loadingType === 'template'
      ? 'Loading template...'
      : loadingType === 'extend'
        ? 'Loading ranking...'
        : 'Loading draft...'

    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">{loadingMessage}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/"
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          {step === 'review' && (
            <button
              onClick={() => setStep('select')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
              title="Add more albums"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Albums</span>
            </button>
          )}
          {step === 'ranking' && (
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
              title="Edit song selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Selection</span>
            </button>
          )}
        </div>

        {/* Title row - below buttons */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            Song Ranker
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Rank your favorite songs with precision</p>
        </div>

        {step === 'select' && (
          <AlbumSelection
            selectedAlbums={selectedAlbums}
            onAlbumsSelected={(albums) => {
              setSelectedAlbums(albums)
              setStep('review')
            }}
          />
        )}

        {step === 'review' && (
          <SongReview
            albums={selectedAlbums}
            onSongsSelected={(songs) => {
              setSelectedSongs(songs)
              setStep('ranking')
            }}
            onBack={() => {
              setStep('select')
            }}
            preSelectedSongs={templateSongs}
            existingRankedSongs={existingRankedSongs}
            isExtending={!!existingRankingId}
          />
        )}

        {step === 'ranking' && (
          <SongRanking
            songs={selectedSongs}
            albums={selectedAlbums}
            onBack={() => {
              setStep('review')
            }}
            existingRankedSongs={existingRankedSongs}
            existingRankingId={existingRankingId}
            draftRankingState={draftRankingState}
            setExistingRankingId={setExistingRankingId}
          />
        )}
      </div>
    </main>
  )
}

// Album Selection Component
function AlbumSelection({
  selectedAlbums,
  onAlbumsSelected,
}: {
  selectedAlbums: any[]
  onAlbumsSelected: (albums: any[]) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [localSelected, setLocalSelected] = useState<any[]>(selectedAlbums)
  const [searchMode, setSearchMode] = useState<'album' | 'artist'>('album')

  // Sync localSelected with selectedAlbums prop when it changes (e.g., when going back from review)
  useEffect(() => {
    setLocalSelected(selectedAlbums)
  }, [selectedAlbums])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const query = searchMode === 'artist'
        ? `artist:"${searchQuery.trim()}"`
        : searchQuery.trim()

      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(query)}&type=release-group&limit=50&filterStudioAlbums=${searchMode === 'artist'}`
      )
      const data = await response.json()

      // If searching by artist, filter to only show albums by that exact artist
      let results = data.results || []
      if (searchMode === 'artist') {
        const searchArtist = searchQuery.trim().toLowerCase()
        // Filter to albums where the artist name matches (case-insensitive)
        // This handles cases like "The Beatles" matching "The Beatles" exactly
        results = results.filter((album: any) => {
          const albumArtist = album.artist.toLowerCase()
          // Check if the artist name starts with the search query (for exact matches)
          // or if it's the primary artist (first in the list if multiple artists)
          return albumArtist === searchArtist ||
            albumArtist.startsWith(searchArtist + ',') ||
            albumArtist.startsWith(searchArtist + ' &') ||
            albumArtist.startsWith(searchArtist + ' and')
        })
      }

      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAlbum = (album: any) => {
    if (localSelected.find((a) => a.id === album.id)) {
      setLocalSelected(localSelected.filter((a) => a.id !== album.id))
    } else {
      setLocalSelected([...localSelected, album])
    }
  }

  const removeAlbum = (albumId: string) => {
    setLocalSelected(localSelected.filter((a) => a.id !== albumId))
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
          Select Albums
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Search for albums and select the ones you want to rank songs from
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSearchMode('album')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${searchMode === 'album'
              ? 'bg-[#4a5d3a] text-white shadow-md'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            Search Albums
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('artist')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${searchMode === 'artist'
              ? 'bg-[#4a5d3a] text-white shadow-md'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            Search by Artist
          </button>
        </div>

        <div className="relative flex items-center">
          <svg className="absolute left-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === 'artist' ? "Search by artist name... (e.g., 'The Beatles')" : "Search for albums... (e.g., 'Revolver The Beatles')"}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-[#6b7d5a] focus:outline-none transition-all text-lg shadow-sm hover:shadow-md"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !searchQuery.trim()}
          className="mt-4 w-full py-4 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            'Search Albums'
          )}
        </button>
      </form>

      {localSelected.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Selected Albums
              <span className="ml-2 px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-sm font-semibold">
                {localSelected.length}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localSelected.map((album) => (
              <div
                key={album.id}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-md hover:shadow-xl transition-all card-hover"
              >
                <button
                  onClick={() => removeAlbum(album.id)}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                  aria-label="Remove album"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <div className="album-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-lg flex items-center justify-center overflow-hidden transition-opacity duration-300">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    {album.coverArtUrl && (
                      <Image
                        src={album.coverArtUrl}
                        alt={album.title}
                        fill
                        className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-lg transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '1'
                        }}
                        onLoad={(e) => {
                          const img = e.currentTarget
                          img.style.opacity = '1'
                          const placeholder = img.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '0'
                        }}
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">{album.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">{album.artist}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning message if albums are missing IDs */}
          {localSelected.some(album => !album.id) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    Please wait for album covers to load
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Some albums are still loading. Waiting ensures your ranking can be used as a template by others.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              // Validate that all selected albums have IDs before proceeding
              const albumsWithoutIds = localSelected.filter(album => !album.id)

              if (albumsWithoutIds.length > 0) {
                alert(
                  `Please wait for album covers to load before continuing. ` +
                  `Some albums are missing required information:\n\n` +
                  `${albumsWithoutIds.map(a => `• ${a.title} by ${a.artist}`).join('\n')}\n\n` +
                  `This ensures your ranking can be used as a template by others.`
                )
                return
              }

              // All albums have IDs, proceed normally
              onAlbumsSelected(localSelected)
            }}
            disabled={localSelected.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
          >
            Continue with {localSelected.length} album{localSelected.length !== 1 ? 's' : ''} →
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Search Results
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({searchResults.length} found)
            </span>
          </h3>

          {/* Mobile: Table View */}
          <div className="md:hidden bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Image column header */}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Album
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Artist
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Select column header */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {searchResults.map((album) => {
                    const isSelected = localSelected.find((a) => a.id === album.id)
                    return (
                      <tr
                        key={album.id}
                        onClick={() => toggleAlbum(album)}
                        className={`group cursor-pointer transition-all hover:bg-[#f0f8e8] dark:hover:bg-[#2a3d1a]/10 ${isSelected ? 'bg-[#f0f8e8] dark:bg-[#2a3d1a]/20' : ''
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div className="relative w-12 h-12">
                            <div className="album-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                              </svg>
                            </div>
                            {album.coverArtUrl && (
                              <Image
                                src={album.coverArtUrl}
                                alt={album.title}
                                fill
                                className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md transition-opacity duration-300 opacity-0"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  target.style.opacity = '0'
                                  const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                                  if (placeholder) placeholder.style.opacity = '1'
                                }}
                                onLoad={(e) => {
                                  const img = e.currentTarget
                                  img.style.opacity = '1'
                                  const placeholder = img.parentElement?.querySelector('.album-placeholder') as HTMLElement
                                  if (placeholder) placeholder.style.opacity = '0'
                                }}
                                unoptimized
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-bold ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {album.title}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-600 dark:text-slate-400">
                            {album.artist}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSelected ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-[#4a5d3a] rounded-full shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 border-2 border-slate-300 dark:border-slate-600 rounded-full group-hover:border-[#6b7d5a] dark:group-hover:border-[#6b7d5a] transition-colors">
                              <div className="w-4 h-4 rounded-full bg-transparent group-hover:bg-[#6b7d5a] dark:group-hover:bg-[#f0f8e8] transition-colors"></div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desktop: Card Grid View */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((album) => {
              const isSelected = localSelected.find((a) => a.id === album.id)
              return (
                <button
                  key={album.id}
                  onClick={() => toggleAlbum(album)}
                  className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 text-left transition-all card-hover ${isSelected
                    ? 'border-[#4a5d3a] bg-[#f0f8e8] dark:bg-[#2a3d1a]/20 shadow-lg'
                    : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-md hover:shadow-xl'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-[#4a5d3a] rounded-full flex items-center justify-center shadow-lg z-10">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="relative w-full aspect-square mb-3">
                    {/* Placeholder - shown by default */}
                    <div className="album-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-12 h-12 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    {/* Image - overlays placeholder when loaded */}
                    {album.coverArtUrl && (
                      <Image
                        src={album.coverArtUrl}
                        alt={album.title}
                        fill
                        className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) {
                            placeholder.style.opacity = '1'
                          }
                        }}
                        onLoad={(e) => {
                          const img = e.currentTarget
                          img.style.opacity = '1'
                          const placeholder = img.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) {
                            placeholder.style.opacity = '0'
                          }
                        }}
                        unoptimized
                      />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold truncate ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                      {album.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                      {album.artist}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Song Review Component
function SongReview({
  albums,
  onSongsSelected,
  onBack,
  preSelectedSongs,
  existingRankedSongs = [],
  isExtending = false,
}: {
  albums: any[]
  onSongsSelected: (songs: any[]) => void
  onBack: () => void
  preSelectedSongs?: any[]
  existingRankedSongs?: any[]
  isExtending?: boolean
}) {
  const [songsByAlbum, setSongsByAlbum] = useState<Record<string, any[]>>({})
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to create a consistent album key
  const getAlbumKey = (album: any): string => {
    // Use musicbrainz_id if available, otherwise use title|artist as fallback
    return album.id || `${album.title || ''}|${album.artist || ''}`
  }

  // Create a stable key based on album IDs to prevent unnecessary re-fetches
  const albumsKey = albums.map(a => getAlbumKey(a)).sort().join(',')
  const previousAlbumsKeyRef = useRef<string>('')
  const previousPreSelectedSongsRef = useRef<any[] | undefined>(undefined)

  useEffect(() => {
    // Only reset selections if albums actually changed (not just array reference)
    const albumsChanged = previousAlbumsKeyRef.current !== albumsKey
    previousAlbumsKeyRef.current = albumsKey

    // Check if preSelectedSongs actually changed (not just reference)
    const preSelectedSongsChanged = previousPreSelectedSongsRef.current !== preSelectedSongs
    previousPreSelectedSongsRef.current = preSelectedSongs

    const fetchSongs = async () => {
      setLoading(true)
      setError(null)
      const songsMap: Record<string, any[]> = {}

      try {
        // Fetch songs for each album sequentially to respect MusicBrainz rate limits
        // MusicBrainz allows max 1 request per second
        for (let i = 0; i < albums.length; i++) {
          const album = albums[i]
          const albumKey = getAlbumKey(album)

          // Skip albums that don't have an ID and don't have a title (can't look them up)
          if (!album.id && !album.title) {
            console.warn(`Skipping album ${albumKey} - missing both ID and title`)
            songsMap[albumKey] = []
            continue
          }

          try {
            // Add delay between requests (except for the first one)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1200)) // 1.2 seconds between requests
            }

            const params = new URLSearchParams({
              releaseGroupId: album.id || '',
              albumTitle: album.title || '',
              artist: album.artist || '',
            })

            // Only make the request if we have either an ID or both title and artist
            if (!album.id && (!album.title || !album.artist)) {
              console.warn(`Skipping album ${albumKey} - insufficient data to fetch songs`)
              songsMap[albumKey] = []
              continue
            }

            const response = await fetch(`/api/music/album-songs?${params}`)

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || `HTTP ${response.status}`)
            }

            const data = await response.json()
            songsMap[albumKey] = (data.songs || []).map((song: any) => ({
              ...song,
              albumId: album.id,
              albumTitle: album.title,
              albumArtist: album.artist,
              albumCoverArt: album.coverArtUrl,
            }))
          } catch (err) {
            console.error(`Error fetching songs for album ${albumKey}:`, err)
            songsMap[albumKey] = []
            // Wait a bit longer after an error before continuing
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        setSongsByAlbum(songsMap)

        // Only reset selections if albums actually changed
        // This prevents losing user's manual selections when parent re-renders
        if (albumsChanged) {
          // If preSelectedSongs provided, match and select only those songs
          // Otherwise, select all songs by default
          const selectedSongIds = new Set<string>()

          if (preSelectedSongs && preSelectedSongs.length > 0) {
            // Match template songs with fetched songs
            // Create a matching function that compares by title, artist, and album
            const normalizeString = (str: string) => str.toLowerCase().trim()

            Object.entries(songsMap).forEach(([albumId, songs]) => {
              songs.forEach((song) => {
                // Try to match with preSelectedSongs
                const matched = preSelectedSongs.find((templateSong) => {
                  // Match by title and artist (case-insensitive)
                  const titleMatch = normalizeString(song.title) === normalizeString(templateSong.title)
                  const artistMatch = normalizeString(song.artist) === normalizeString(templateSong.artist)

                  // Also try to match by album (if available)
                  const albumMatch = !templateSong.albumTitle || !song.albumTitle ||
                    normalizeString(song.albumTitle || '') === normalizeString(templateSong.albumTitle || '')

                  return titleMatch && artistMatch && albumMatch
                })

                if (matched) {
                  const uniqueKey = `${albumId}:${song.id}`
                  selectedSongIds.add(uniqueKey)
                }
              })
            })
          } else {
            // Select all songs by default
            Object.entries(songsMap).forEach(([albumId, songs]) => {
              songs.forEach((song) => {
                const uniqueKey = `${albumId}:${song.id}`
                selectedSongIds.add(uniqueKey)
              })
            })
          }

          setSelectedSongs(selectedSongIds)
        }
        // If albums haven't changed, preserve existing selections
      } catch (err) {
        setError('Failed to load songs. Please try again.')
        console.error('Error fetching songs:', err)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch songs if albums actually changed
    if (albums.length > 0 && albumsChanged) {
      fetchSongs()
    }
  }, [albumsKey, preSelectedSongs, albums])

  const toggleSong = (songId: string, albumId: string) => {
    const uniqueKey = `${albumId}:${songId}`

    // If extending, check if this song is already ranked
    if (isExtending && existingRankedSongs.length > 0) {
      // albumId is already the album key
      const song = (songsByAlbum[albumId] || []).find(s => s.id === songId)
      if (song) {
        const rankedInfo = isSongRanked(song, albumId)
        // Prevent deselection of already-ranked songs
        if (rankedInfo.ranked && selectedSongs.has(uniqueKey)) {
          return // Don't allow deselection
        }
      }
    }

    const newSelected = new Set(selectedSongs)
    if (newSelected.has(uniqueKey)) {
      newSelected.delete(uniqueKey)
    } else {
      newSelected.add(uniqueKey)
    }
    setSelectedSongs(newSelected)
  }

  const toggleAlbumSongs = (albumId: string) => {
    // albumId is already the album key
    const albumSongs = songsByAlbum[albumId] || []
    const albumSongKeys = albumSongs.map((s) => `${albumId}:${s.id}`)
    const allSelected = albumSongKeys.length > 0 && albumSongKeys.every((key) => selectedSongs.has(key))

    const newSelected = new Set(selectedSongs)
    if (allSelected) {
      // Deselect all songs from this album, but preserve already-ranked songs if extending
      if (isExtending && existingRankedSongs.length > 0) {
        albumSongKeys.forEach((key) => {
          // Check if this song is already ranked
          const [albumIdFromKey, songIdFromKey] = key.split(':')
          const song = albumSongs.find(s => s.id === songIdFromKey)
          if (song) {
            const rankedInfo = isSongRanked(song, albumIdFromKey)
            // Only deselect if not already ranked
            if (!rankedInfo.ranked) {
              newSelected.delete(key)
            }
          } else {
            newSelected.delete(key)
          }
        })
      } else {
        // Normal flow - deselect all
        albumSongKeys.forEach((key) => newSelected.delete(key))
      }
    } else {
      // Select all songs from this album
      albumSongKeys.forEach((key) => newSelected.add(key))
    }
    setSelectedSongs(newSelected)
  }

  // Helper function to check if a song is already ranked
  const isSongRanked = (song: any, albumId: string): { ranked: boolean; rank?: number } => {
    if (!isExtending || existingRankedSongs.length === 0) {
      return { ranked: false }
    }

    const normalizeString = (str: string) => str.toLowerCase().trim()
    const rankedSong = existingRankedSongs.find((ranked) => {
      const titleMatch = normalizeString(song.title) === normalizeString(ranked.title)
      const artistMatch = normalizeString(song.artist) === normalizeString(ranked.artist)
      const albumMatch = !ranked.albumTitle || !song.albumTitle ||
        normalizeString(song.albumTitle || '') === normalizeString(ranked.albumTitle || '')
      return titleMatch && artistMatch && albumMatch
    })

    if (rankedSong) {
      return { ranked: true, rank: rankedSong.rank }
    }
    return { ranked: false }
  }

  const handleContinue = () => {
    const allSongs: any[] = []
    Object.entries(songsByAlbum).forEach(([albumKey, songs]) => {
      songs.forEach((song) => {
        const uniqueKey = `${albumKey}:${song.id}`
        if (selectedSongs.has(uniqueKey)) {
          allSongs.push(song)
        }
      })
    })
    onSongsSelected(allSongs)
  }

  const totalSongs = Object.values(songsByAlbum).reduce(
    (sum, songs) => sum + songs.length,
    0
  )

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Loading songs from {albums.length} album{albums.length !== 1 ? 's' : ''}...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 rounded-2xl max-w-md mx-auto mb-6">
          <div className="flex items-center gap-3 justify-center">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">{error}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
          {isExtending ? 'Extend Ranking' : 'Review Songs'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
          {isExtending
            ? 'Select songs to add from your ranking. Songs with rank badges are already ranked.'
            : 'Select which songs to include in your ranking'}
        </p>
        {isExtending && existingRankedSongs.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">{existingRankedSongs.length}</span> songs are already ranked.
            </p>
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-full">
          <span className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a]">
            {selectedSongs.size} / {totalSongs} selected
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {albums.map((album) => {
          const albumKey = getAlbumKey(album)
          const albumSongs = songsByAlbum[albumKey] || []
          const selectedCount = albumSongs.filter((s) =>
            selectedSongs.has(`${albumKey}:${s.id}`)
          ).length
          const allSelected = albumSongs.length > 0 && selectedCount === albumSongs.length

          return (
            <div
              key={albumKey}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <div className="album-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    {album.coverArtUrl && (
                      <Image
                        src={album.coverArtUrl}
                        alt={album.title}
                        fill
                        className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '1'
                        }}
                        onLoad={(e) => {
                          const img = e.currentTarget
                          img.style.opacity = '1'
                          const placeholder = img.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '0'
                        }}
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-1">{album.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">{album.artist}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-xs md:text-sm font-semibold whitespace-nowrap">
                        {selectedCount} of {albumSongs.length} selected
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAlbumSongs(albumKey)}
                  className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-base font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap ${allSelected
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    : 'bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white'
                    }`}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {albumSongs.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No songs found for this album</p>
                    {!album.id && !album.title && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        This album is missing required information. Please use the fix-albums endpoint to update it.
                      </p>
                    )}
                  </div>
                ) : (
                  albumSongs.map((song) => {
                    const uniqueKey = `${albumKey}:${song.id}`
                    const isSelected = selectedSongs.has(uniqueKey)
                    const rankedInfo = isSongRanked(song, albumKey)
                    return (
                      <label
                        key={uniqueKey}
                        className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${isSelected
                          ? rankedInfo.ranked
                            ? 'bg-gradient-to-r from-[#f0f8e8] to-[#e8f5d8] dark:from-[#2a3d1a]/30 dark:to-[#3a4d2a]/30 border-2 border-[#6b7d5a] dark:border-[#6b7d5a]'
                            : 'bg-[#f0f8e8] dark:bg-[#2a3d1a]/20 border-2 border-[#6b7d5a] dark:border-[#6b7d5a]'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSong(song.id, albumKey)}
                            disabled={rankedInfo.ranked && isExtending}
                            className={`w-5 h-5 text-[#4a5d3a] rounded focus:ring-2 focus:ring-[#4a5d3a] ${rankedInfo.ranked && isExtending
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer'
                              }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                              {song.title}
                            </p>
                            {rankedInfo.ranked && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] text-white dark:from-[#6b7d5a] dark:to-[#8a9a7a] flex-shrink-0">
                                #{rankedInfo.rank}
                              </span>
                            )}
                          </div>
                          {song.albumTitle && song.albumTitle !== album.title && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              from {song.albumTitle}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5 text-[#4a5d3a] dark:text-[#6b7d5a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all shadow-md hover:shadow-lg"
        >
          Back
        </button>
        <button
          onClick={() => {
            // Validate that all albums have IDs before proceeding
            const albumsWithoutIds = albums.filter(album => !album.id)

            if (albumsWithoutIds.length > 0) {
              alert(
                `Some albums are missing required information. Please go back and wait for album covers to load.\n\n` +
                `Missing IDs for: ${albumsWithoutIds.map(a => `${a.title} by ${a.artist}`).join(', ')}\n\n` +
                `This ensures your ranking can be used as a template by others.`
              )
              return
            }

            // All albums have IDs, proceed normally
            handleContinue()
          }}
          disabled={selectedSongs.size === 0}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          Start Ranking ({selectedSongs.size} songs) →
        </button>
      </div>
    </div>
  )
}

// Song Ranking Component
function SongRanking({
  songs,
  albums = [],
  onBack,
  existingRankedSongs = [],
  existingRankingId = null,
  draftRankingState = null,
  setExistingRankingId,
}: {
  songs: any[]
  albums?: any[]
  onBack: () => void
  existingRankedSongs?: any[]
  existingRankingId?: string | null
  draftRankingState?: RankingState | null
  setExistingRankingId?: (id: string | null) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [ranker, setRanker] = useState<BinaryInsertionRanker | null>(null)
  const [state, setState] = useState<RankingState | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [listName, setListName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  useEffect(() => {
    // If we have a draft state, restore it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (draftRankingState) {
      // Set draft ID if we're resuming
      if (existingRankingId) {
        setDraftId(existingRankingId)
      }

      // Convert existing ranked songs to Song format for the ranker
      const existingSongs: Song[] = existingRankedSongs.map(s => ({
        id: s.id || s.musicbrainz_id,
        title: s.title,
        artist: s.artist,
        coverArtUrl: s.cover_art_url || s.albumCoverArt,
        albumTitle: s.album_title || s.albumTitle,
        musicbrainzId: s.musicbrainz_id || s.id,
        albumId: s.album_musicbrainz_id || s.albumId,
      } as Song & { albumId?: string }))

      // Convert new songs to Song format
      const newSongs: Song[] = songs.map(s => ({
        id: s.id || s.musicbrainz_id,
        title: s.title,
        artist: s.artist,
        coverArtUrl: s.cover_art_url || s.coverArtUrl || s.albumCoverArt,
        albumTitle: s.album_title || s.albumTitle,
        musicbrainzId: s.musicbrainz_id || s.id,
      }))

      // Create ranker with remaining songs and existing ranked songs
      const restoredRanker = new BinaryInsertionRanker(
        draftRankingState.remaining, // Remaining songs become the "new" songs
        (newState) => {
          setState(newState)
        },
        draftRankingState.ranked // Ranked songs become "existing" ranked songs
      )

      setRanker(restoredRanker)

      // Restore the saved state
      setState(draftRankingState)
      return
    }

    // Normal initialization (no saved progress or user chose to start fresh)
    // Convert existing ranked songs to Song format
    const existingSongs: Song[] = existingRankedSongs.map(s => ({
      id: s.id || s.musicbrainz_id,
      title: s.title,
      artist: s.artist,
      coverArtUrl: s.cover_art_url || s.albumCoverArt,
      albumTitle: s.album_title || s.albumTitle,
      musicbrainzId: s.musicbrainz_id || s.id,
      albumId: s.album_musicbrainz_id || s.albumId, // Preserve album ID
    } as Song & { albumId?: string }))

    // Convert new songs to Song format
    const newSongs: Song[] = songs.map(s => ({
      id: s.id || s.musicbrainz_id,
      title: s.title,
      artist: s.artist,
      coverArtUrl: s.cover_art_url || s.coverArtUrl || s.albumCoverArt,
      albumTitle: s.album_title || s.albumTitle,
      musicbrainzId: s.musicbrainz_id || s.id,
      albumId: s.albumId || (s as any).album_musicbrainz_id || null,
    } as Song & { albumId?: string }))

    if (newSongs.length === 0 && existingSongs.length === 0) {
      setState({
        ranked: [],
        remaining: [],
        currentComparison: null,
        isComplete: true,
        totalComparisons: 0,
        estimatedRemaining: 0,
      })
      return
    }

    const newRanker = new BinaryInsertionRanker(
      newSongs,
      (newState) => {
        setState(newState)
      },
      existingSongs.length > 0 ? existingSongs : undefined
    )
    setRanker(newRanker)
    const initialState = newRanker.initialize()
    setState(initialState)
    // existingRankingId intentionally excluded to prevent re-initialization when saving drafts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, existingRankedSongs, draftRankingState])

  const handleComparison = async (result: ComparisonResult) => {
    if (!ranker || !state) return

    let newState: RankingState

    if (state.currentComparison && state.ranked.length === 0) {
      // Initial comparison
      newState = ranker.handleInitialComparison(result)
    } else {
      // Binary insertion comparison - pass the current comparison from state
      newState = ranker.handleComparison(result, state.currentComparison || undefined)
    }

    setState(newState)
  }

  const handleSaveDraft = async () => {
    if (!state) return

    setSavingDraft(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Please log in to save drafts')
        return
      }

      const response = await fetch('/api/ranked-lists/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankingState: state,
          songs: songs,
          existingRankedSongs: existingRankedSongs,
          name: listName || undefined,
          draftId: draftId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const { draft } = await response.json()
      setDraftId(draft.id)
      // Set existingRankingId so that when user finishes, it updates the draft instead of creating new
      if (!existingRankingId && setExistingRankingId) {
        setExistingRankingId(draft.id)
      }

      alert('Draft saved! You can resume from "My Rankings" later.')
    } catch (error: any) {
      console.error('Error saving draft:', error)
      alert(`Failed to save draft: ${error.message || 'Please try again.'}`)
    } finally {
      setSavingDraft(false)
    }
  }


  const handleSave = async () => {
    if (!state || state.ranked.length === 0) return

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // If extending existing ranking, update it; otherwise create new
      if (existingRankingId) {
        // Convert Song[] to RankedListSong[] format
        // Try to preserve album_musicbrainz_id from existing ranked songs
        const rankedSongs = state.ranked.map((song, index) => {
          // Try to find matching existing song to preserve album_musicbrainz_id
          const existingSong = existingRankedSongs.find((es: any) => {
            const normalizeString = (str: string) => str.toLowerCase().trim()
            return normalizeString(es.title) === normalizeString(song.title) &&
              normalizeString(es.artist) === normalizeString(song.artist)
          })

          return {
            musicbrainz_id: song.musicbrainzId || song.id,
            title: song.title,
            artist: song.artist,
            cover_art_url: song.coverArtUrl || null,
            album_title: song.albumTitle || null,
            album_musicbrainz_id: (song as any).albumId || (song as any).album_musicbrainz_id || existingSong?.album_musicbrainz_id || null,
            rank: index + 1,
          }
        })

        // Check if this is a draft being completed
        const isCompletingDraft = draftId === existingRankingId

        const response = await fetch(`/api/ranked-lists/${existingRankingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songs: rankedSongs,
            name: listName || undefined,
            status: isCompletingDraft ? 'completed' : undefined, // Mark draft as completed
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update ranking')
        }

        // Success - redirect to the updated ranking
        router.push(`/rankings/${existingRankingId}`)
      } else {
        // Convert Song[] to RankedListSong[] format
        const rankedSongs = state.ranked.map((song, index) => ({
          musicbrainz_id: song.musicbrainzId || song.id,
          title: song.title,
          artist: song.artist,
          cover_art_url: song.coverArtUrl || null,
          album_title: song.albumTitle || null,
          album_musicbrainz_id: (song as any).albumId || (song as any).album_musicbrainz_id || null,
          rank: index + 1,
        }))

        const response = await fetch('/api/ranked-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songs: rankedSongs,
            name: listName || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save ranking')
        }

        // Success - redirect to rankings page
        router.push('/rankings')
      }
    } catch (error: any) {
      console.error('Error saving ranking:', error)
      alert(`Failed to save ranking: ${error.message || 'Please try again.'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!state) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Initializing ranking...</p>
      </div>
    )
  }

  // Check if we have any songs to rank (new songs + existing)
  const hasSongsToRank = songs.length > 0 || (existingRankedSongs && existingRankedSongs.length > 0)

  if (!hasSongsToRank || (songs.length === 0 && existingRankedSongs.length < 2)) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
            You need at least 2 songs to rank them.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (state.isComplete) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            {existingRankingId ? 'Ranking Updated!' : 'Ranking Complete!'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {existingRankingId
              ? `Your ranking now has ${state.ranked.length} songs${state.totalComparisons > 0 ? ` (${state.totalComparisons} new comparisons)` : ''}`
              : `You've ranked ${state.ranked.length} songs in ${state.totalComparisons} comparisons`}
          </p>
        </div>

        {!showNameInput ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {state.ranked.map((song, index) => (
                <div
                  key={song.id}
                  className="group flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] transition-all card-hover"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-xl font-bold text-white text-xl shadow-lg flex-shrink-0">
                    #{index + 1}
                  </div>
                  {song.coverArtUrl && (
                    <Image
                      src={song.coverArtUrl}
                      alt={song.title}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-xl shadow-md flex-shrink-0"
                      unoptimized
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {song.artist}
                    </p>
                    {song.albumTitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {song.albumTitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-xl max-w-md mx-auto">
            <label className="block text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">
              Name your ranking (optional)
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., My Top 50 Songs"
              className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#4a5d3a] focus:border-[#6b7d5a] dark:bg-slate-900 text-lg"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-4 pt-4">
          {!showNameInput ? (
            <>
              <button
                onClick={onBack}
                className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Start Over
              </button>
              <button
                onClick={() => setShowNameInput(true)}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                {existingRankingId ? 'Update Ranking' : 'Save Ranking'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowNameInput(false)}
                className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {existingRankingId ? 'Updating...' : 'Saving...'}
                  </span>
                ) : (
                  existingRankingId ? 'Update Ranking' : 'Save Ranking'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Show ranked list preview
  const totalSongs = state.ranked.length + state.remaining.length
  const progress = totalSongs > 0
    ? (state.ranked.length / totalSongs) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Rank Your Songs
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {state.ranked.length} of {state.ranked.length + state.remaining.length} ranked
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || state.isComplete}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Save draft to resume later"
            >
              {savingDraft ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save Draft</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>
        <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comparison Section */}
        <div className="lg:col-span-2">
          {state.currentComparison ? (
            <div className="space-y-8">
              <div className="text-center">
                {state.ranked.length === 0 ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      Which song do you prefer?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Choose your favorite to start building your ranking
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      Where does this song rank?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Comparing with song <span className="font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">#{state.currentComparison.position + 1}</span> of {state.currentComparison.totalRanked}
                    </p>
                  </div>
                )}
              </div>

              {/* Always show side-by-side cards */}
              <div className="grid grid-cols-2 gap-2 md:gap-6">
                <button
                  onClick={() => handleComparison('better')}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl md:rounded-3xl p-3 md:p-8 border-2 md:border-4 border-slate-300 dark:border-slate-600 shadow-lg md:shadow-2xl hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] hover:shadow-[#4a5d3a]/20 hover:scale-[1.02] transition-all text-left"
                >
                  <div className="absolute top-1 right-1 md:top-4 md:right-4 px-1.5 py-0.5 md:px-3 md:py-1 bg-slate-600 text-white rounded-full text-[10px] md:text-xs font-bold z-20">
                    {state.ranked.length === 0 ? 'SONG A' : 'NEW SONG'}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 md:w-48 md:h-48 mx-auto mb-2 md:mb-6">
                      <div className="absolute inset-0 w-20 h-20 md:w-48 md:h-48 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg md:rounded-2xl shadow-md md:shadow-xl flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 3px 3px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#c97d4a]/10 to-transparent"></div>
                        <svg className="w-10 h-10 md:w-24 md:h-24 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      {state.currentComparison.newSong.coverArtUrl && (
                        <Image
                          src={state.currentComparison.newSong.coverArtUrl}
                          alt={state.currentComparison.newSong.title}
                          fill
                          className="w-20 h-20 md:w-48 md:h-48 object-cover rounded-lg md:rounded-2xl shadow-md md:shadow-xl transition-opacity duration-300 opacity-0 absolute inset-0"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={(e) => {
                            const img = e.currentTarget
                            img.style.opacity = '1'
                            const placeholder = img.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '0'
                          }}
                          unoptimized
                        />
                      )}
                    </div>
                    <h4 className="text-sm md:text-2xl font-bold mb-1 md:mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                      {state.currentComparison.newSong.title}
                    </h4>
                    <p className="text-xs md:text-lg text-slate-600 dark:text-slate-400 mb-1 md:mb-2 line-clamp-1">
                      {state.currentComparison.newSong.artist}
                    </p>
                    {state.currentComparison.newSong.albumTitle && (
                      <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mb-2 md:mb-6 line-clamp-1 hidden md:block">
                        {state.currentComparison.newSong.albumTitle}
                      </p>
                    )}
                    <div className="w-full py-1.5 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-lg shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl transition-all">
                      Choose This One
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleComparison('worse')}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl md:rounded-3xl p-3 md:p-8 border-2 md:border-4 border-slate-300 dark:border-slate-600 shadow-lg md:shadow-2xl hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] hover:shadow-[#4a5d3a]/20 hover:scale-[1.02] transition-all text-left"
                >
                  <div className="absolute top-1 right-1 md:top-4 md:right-4 px-1.5 py-0.5 md:px-3 md:py-1 bg-slate-600 text-white rounded-full text-[10px] md:text-xs font-bold z-20">
                    {state.ranked.length === 0 ? 'SONG B' : `SONG #${state.currentComparison.position + 1}`}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 md:w-48 md:h-48 mx-auto mb-2 md:mb-6">
                      <div className="absolute inset-0 w-20 h-20 md:w-48 md:h-48 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-lg md:rounded-2xl shadow-md md:shadow-xl flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 3px 3px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                        <svg className="w-10 h-10 md:w-24 md:h-24 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      {state.currentComparison.comparedSong.coverArtUrl && (
                        <Image
                          src={state.currentComparison.comparedSong.coverArtUrl}
                          alt={state.currentComparison.comparedSong.title}
                          fill
                          className="w-20 h-20 md:w-48 md:h-48 object-cover rounded-lg md:rounded-2xl shadow-md md:shadow-xl transition-opacity duration-300 opacity-0 absolute inset-0"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={(e) => {
                            const img = e.currentTarget
                            img.style.opacity = '1'
                            const placeholder = img.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '0'
                          }}
                          unoptimized
                        />
                      )}
                    </div>
                    <h4 className="text-sm md:text-2xl font-bold mb-1 md:mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                      {state.currentComparison.comparedSong.title}
                    </h4>
                    <p className="text-xs md:text-lg text-slate-600 dark:text-slate-400 mb-1 md:mb-2 line-clamp-1">
                      {state.currentComparison.comparedSong.artist}
                    </p>
                    {state.currentComparison.comparedSong.albumTitle && (
                      <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mb-2 md:mb-6 line-clamp-1 hidden md:block">
                        {state.currentComparison.comparedSong.albumTitle}
                      </p>
                    )}
                    <div className="w-full py-1.5 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-lg shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl transition-all">
                      Choose This One
                    </div>
                  </div>
                </button>
              </div>

              {/* Don't Know Button */}
              <button
                onClick={() => handleComparison('dont_know')}
                className="w-full py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold text-lg transition-all shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Don&apos;t Know This Song
                </span>
              </button>

            </div>
          ) : (
            <div className="text-center py-12">
              <p>Preparing comparison...</p>
            </div>
          )}
        </div>

        {/* Ranked List Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xl sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Current Ranking</h3>
              <span className="px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-sm font-bold">
                {state.ranked.length}
              </span>
            </div>
            {state.ranked.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Start comparing to build your ranking</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {state.ranked.map((song, index) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] transition-all"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-lg font-bold text-white text-sm shadow-md flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default function SongsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <SongsPageContent />
    </Suspense>
  )
}

