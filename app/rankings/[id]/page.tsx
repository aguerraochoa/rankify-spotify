'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { generateRankingImage } from '@/lib/image/generateRankingImage'
import { NavHeader } from '@/components/NavHeader'

interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  rank?: number
}

interface RankedList {
  id: string
  user_id: string
  name: string | null
  songs: RankedSong[]
  song_count: number
  is_public: boolean
  created_at: string
}

interface OwnerProfile {
  id: string
  username: string | null
  display_name: string | null
  email: string | null
}

export default function RankingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rankingId = params.id as string
  const [ranking, setRanking] = useState<RankedList | null>(null)
  const [editableSongs, setEditableSongs] = useState<RankedSong[]>([])
  const [editableName, setEditableName] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isGeneratingShare, setIsGeneratingShare] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false)
  const [wasPrivateBeforeShare, setWasPrivateBeforeShare] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [owner, setOwner] = useState<OwnerProfile | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)

        const response = await fetch(`/api/ranked-lists/${rankingId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ranking not found')
          }
          throw new Error('Failed to fetch ranking')
        }

        const data = await response.json()
        setRanking(data.list)
        setEditableSongs([...data.list.songs]) // Initialize editable copy
        setEditableName(data.list.name) // Initialize editable name
        setOwner(data.owner || null) // Set owner profile if available
      } catch (err: any) {
        setError(err.message || 'Failed to load ranking')
      } finally {
        setLoading(false)
      }
    }

    if (rankingId) {
      fetchRanking()
    }
  }, [rankingId, router, supabase.auth])

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu) {
        const target = event.target as HTMLElement
        if (!target.closest('.more-menu-container')) {
          setShowMoreMenu(false)
        }
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  const handleEdit = () => {
    setIsEditing(true)
    setEditableSongs([...ranking!.songs]) // Reset to original when entering edit mode
    setEditableName(ranking!.name) // Reset to original name
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditableSongs([...ranking!.songs]) // Reset to original
    setEditableName(ranking!.name) // Reset to original name
    setDraggedIndex(null)
  }

  // Check if changes have been made
  const hasChanges = () => {
    if (!ranking || !isEditing) return false

    // Check if name changed
    if (ranking.name !== editableName) return true

    // Compare lengths
    if (ranking.songs.length !== editableSongs.length) return true

    // Compare each song's position - if order changed, there are changes
    for (let i = 0; i < ranking.songs.length; i++) {
      const original = ranking.songs[i]
      const edited = editableSongs[i]

      // Create unique identifiers for comparison
      // Use musicbrainz_id if available, otherwise use title + artist
      const originalId = original.musicbrainz_id || `${original.title}|${original.artist}`
      const editedId = edited.musicbrainz_id || `${edited.title}|${edited.artist}`

      // If the song at this position is different, order changed
      if (originalId !== editedId) {
        return true
      }
    }

    return false
  }

  const handleSave = async () => {
    if (!ranking) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: editableSongs,
          name: editableName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save changes')
      }

      const data = await response.json()
      setRanking(data.list)
      setEditableSongs([...data.list.songs])
      setEditableName(data.list.name)
      setOwner(data.owner || null) // Update owner profile if available
      setIsEditing(false)
      setDraggedIndex(null)
    } catch (err: any) {
      alert(`Failed to save changes: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const moveSong = (fromIndex: number, toIndex: number) => {
    const newSongs = [...editableSongs]
    const [movedSong] = newSongs.splice(fromIndex, 1)
    newSongs.splice(toIndex, 0, movedSong)
    setEditableSongs(newSongs)
  }

  const moveUp = (index: number) => {
    if (index > 0) {
      moveSong(index, index - 1)
    }
  }

  const moveDown = (index: number) => {
    if (index < editableSongs.length - 1) {
      moveSong(index, index + 1)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newSongs = [...editableSongs]
    const draggedSong = newSongs[draggedIndex]
    newSongs.splice(draggedIndex, 1)
    newSongs.splice(index, 0, draggedSong)
    setEditableSongs(newSongs)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleDeleteSong = (index: number) => {
    if (editableSongs.length <= 1) {
      alert('You must have at least one song in your ranking.')
      return
    }

    if (!confirm(`Remove "${editableSongs[index].title}" from this ranking?`)) {
      return
    }

    const newSongs = [...editableSongs]
    newSongs.splice(index, 1)
    setEditableSongs(newSongs)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ranking? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete ranking')
      }

      router.push('/rankings')
    } catch (err: any) {
      console.error('Error deleting ranking:', err)
      alert('Failed to delete ranking. Please try again.')
    }
  }

  const handleReRank = () => {
    if (!ranking) return
    // Navigate to re-rank page with the ranking ID
    router.push(`/rank/rerank/${rankingId}`)
  }

  const handleCreatePlaylist = async () => {
    if (!ranking || !ranking.songs) return

    setIsCreatingPlaylist(true)
    try {
      const trackIds = ranking.songs.map((song: any) => song.musicbrainz_id || song.id).filter(Boolean)

      if (trackIds.length === 0) {
        alert('No valid track IDs found in this ranking')
        return
      }

      const response = await fetch('/api/spotify/playlists/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ranking.name || 'My Rankify Playlist',
          trackIds,
          description: `Ranked with Rankify • ${trackIds.length} songs`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create playlist')
      }

      const { playlistUrl } = await response.json()
      setCreatedPlaylistUrl(playlistUrl)
      setShowMoreMenu(false)
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('Failed to create playlist. Make sure you have a valid Spotify session.')
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleToggleVisibility = async () => {
    if (!ranking) return

    setIsTogglingVisibility(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_public: !ranking.is_public,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update visibility')
      }

      const data = await response.json()
      setRanking({ ...ranking, is_public: data.list.is_public })
    } catch (err: any) {
      console.error('Error updating visibility:', err)
      alert('Failed to update visibility. Please try again.')
    } finally {
      setIsTogglingVisibility(false)
    }
  }

  const handleShare = async () => {
    if (!ranking) return

    // If ranking is private, warn user that it will become public
    const wasPrivate = !ranking.is_public
    if (wasPrivate) {
      const confirmed = confirm(
        'This ranking is currently private. Sharing it will make it public and visible to everyone. Do you want to continue?'
      )
      if (!confirmed) {
        return
      }
      setWasPrivateBeforeShare(true)
    }

    setIsGeneratingShare(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}/share`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate share link')
      }

      const data = await response.json()
      setShareUrl(data.shareUrl)
      // Update ranking to reflect it's now public
      setRanking({ ...ranking, is_public: true })
      setShowShareModal(true)
    } catch (err: any) {
      console.error('Error generating share link:', err)
      alert('Failed to generate share link. Please try again.')
      setWasPrivateBeforeShare(false)
    } finally {
      setIsGeneratingShare(false)
    }
  }

  const copyShareLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    } catch (err) {
      console.error('Error copying to clipboard:', err)
      alert('Failed to copy link. Please copy it manually.')
    }
  }

  const handleDownloadImage = async () => {
    if (!ranking) return

    setIsGeneratingImage(true)

    // Add timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      setIsGeneratingImage(false)
      alert('The download is taking longer than expected. Please try again.')
    }, 30000) // 30 second timeout

    try {
      await generateRankingImage({
        name: ranking.name,
        songs: ranking.songs,
        created_at: ranking.created_at,
      })
      clearTimeout(timeoutId)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Error generating image:', err)

      // Provide more helpful error messages
      let errorMessage = 'Failed to generate image. '
      if (err.message?.includes('timeout')) {
        errorMessage += 'The operation timed out. Please try again.'
      } else if (err.message?.includes('blob')) {
        errorMessage += 'Could not create the image file. Please try again.'
      } else {
        errorMessage += err.message || 'Please try again.'
      }

      alert(errorMessage)
    } finally {
      clearTimeout(timeoutId)
      setIsGeneratingImage(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !ranking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4 text-center">{error || 'Ranking not found'}</p>
        <Link
          href="/rankings"
          className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-semibold"
        >
          Back to Rankings
        </Link>
      </div>
    )
  }

  const formattedDate = new Date(ranking.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <NavHeader title={ranking.name || 'Ranking Detail'} showBack={true} backLabel="My Rankings" backHref="/rankings" />

      {/* Success toast for playlist creation */}
      {createdPlaylistUrl && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-4 max-w-md border border-green-500">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Playlist Created!</p>
              <p className="text-sm opacity-90">Your ranking is now on Spotify</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={createdPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Open
              </a>
              <button
                onClick={() => setCreatedPlaylistUrl(null)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Controls Row */}
          <div className="flex items-center justify-end gap-2 md:gap-4 mb-8">
            {/* Only show owner actions if current user owns the ranking */}
            {!isEditing && currentUserId && ranking && currentUserId === ranking.user_id && (
              <>
                <button
                  onClick={handleToggleVisibility}
                  disabled={isTogglingVisibility}
                  className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all border ${ranking.is_public
                    ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                >
                  {ranking.is_public ? 'Public' : 'Private'}
                </button>
                <button
                  onClick={handleEdit}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:border-slate-600"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </>
            )}

            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  className="px-6 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-12 z-50 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden text-sm font-medium text-slate-300">
                    {currentUserId && ranking && currentUserId === ranking.user_id && (
                      <>
                        <button
                          onClick={() => { handleEdit(); setShowMoreMenu(false); }}
                          className="md:hidden w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          Edit Ranking
                        </button>
                        <button
                          onClick={() => { handleToggleVisibility(); setShowMoreMenu(false); }}
                          className="md:hidden w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          {ranking.is_public ? 'Make Private' : 'Make Public'}
                        </button>
                        <button
                          onClick={() => { handleShare(); setShowMoreMenu(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                        >
                          Share Ranking
                        </button>
                        <button
                          onClick={() => { handleCreatePlaylist(); setShowMoreMenu(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 text-green-400 hover:text-green-300"
                        >
                          Export to Spotify
                        </button>
                        <button
                          onClick={() => { handleDelete(); setShowMoreMenu(false); }}
                          className="md:hidden w-full text-left px-4 py-3 hover:bg-red-900/30 text-red-400 transition-colors"
                        >
                          Delete Ranking
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { handleReRank(); setShowMoreMenu(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Re-Rank These Songs
                    </button>
                    <button
                      onClick={() => { handleDownloadImage(); setShowMoreMenu(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Download Image
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Info */}
          <div className="mb-8">
            {isEditing ? (
              <input
                type="text"
                value={editableName || ''}
                onChange={(e) => setEditableName(e.target.value)}
                className="w-full bg-slate-800 text-3xl font-bold text-white border-2 border-slate-700 rounded-xl px-4 py-2 focus:border-green-500 focus:outline-none"
                placeholder="Ranking Name"
              />
            ) : (
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{ranking.name || 'Untitled Ranking'}</h1>
            )}
            <div className="flex items-center gap-2 text-slate-400 mt-2">
              <span>{formattedDate}</span>
              <span>•</span>
              <span>{ranking.song_count} songs</span>
              {owner && currentUserId !== ranking.user_id && (
                <>
                  <span>•</span>
                  <Link href={`/users/${owner.id}`} className="text-green-400 hover:text-green-300">
                    By {owner.display_name || 'User'}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {(isEditing ? editableSongs : ranking.songs).map((song, index) => (
              <div
                key={index}
                draggable={isEditing}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${isEditing && draggedIndex === index
                  ? 'bg-slate-700 border-green-500 shadow-lg scale-[1.02] z-10'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                  }`}
              >
                <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-xl ${index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
                  index === 1 ? 'bg-slate-300 text-black shadow-lg shadow-slate-300/20' :
                    index === 2 ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/20' :
                      'bg-slate-700 text-slate-400'
                  }`}>
                  #{index + 1}
                </div>

                <div className="relative w-16 h-16 flex-shrink-0 bg-slate-700 rounded-lg overflow-hidden">
                  {(song.cover_art_url || (song as any).coverArtUrl) ? (
                    <Image src={song.cover_art_url || (song as any).coverArtUrl} alt={song.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate text-lg">{song.title}</h3>
                  <p className="text-slate-400 truncate">{song.artist}</p>
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === editableSongs.length - 1}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSong(index)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Share Ranking</h2>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-400 mb-2">Copy this link to share:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl || ''}
                  readOnly
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none"
                />
                <button
                  onClick={copyShareLink}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-semibold transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
