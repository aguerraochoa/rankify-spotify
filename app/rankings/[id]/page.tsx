'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { generateRankingImage } from '@/lib/image/generateRankingImage'

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
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading ranking...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !ranking) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Ranking not found'}</p>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Back to Rankings
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-white to-[#f5f1e8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-1 md:gap-2 relative">
            {!isEditing ? (
              <>
                {/* Only show owner actions if current user owns the ranking */}
                {currentUserId && ranking && currentUserId === ranking.user_id && (
                  <>
                    {/* Public/Private Toggle - Icon only on mobile */}
                    <button
                      onClick={handleToggleVisibility}
                      disabled={isTogglingVisibility}
                      className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2.5 text-sm font-semibold transition-all rounded-xl shadow-sm hover:shadow-md border disabled:opacity-50 disabled:cursor-not-allowed ${ranking?.is_public
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      title={ranking?.is_public ? 'Make private' : 'Make public'}
                    >
                      {isTogglingVisibility ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : ranking?.is_public ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden sm:inline">Public</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          <span className="hidden sm:inline">Private</span>
                        </>
                      )}
                    </button>

                    {/* Edit - Icon only on mobile */}
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
                      title="Edit ranking"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete - Icon only on mobile */}
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all rounded-xl shadow-sm hover:shadow-md border border-red-200 dark:border-red-800"
                      title="Delete ranking"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </>
                )}

                {/* More Menu Button - Shown on all screen sizes, but only with owner actions if owned */}
                <div className="relative more-menu-container">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`w-10 h-10 flex items-center justify-center text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40 ${showMoreMenu ? 'bg-[#dce8d0] dark:bg-[#3a4d2a]/40' : ''
                      }`}
                    aria-label="More options"
                    aria-expanded={showMoreMenu}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>

                  {/* More Menu Dropdown */}
                  {showMoreMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMoreMenu(false)}
                      ></div>
                      {/* Menu */}
                      <div className="absolute right-0 top-12 z-50 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Share - Only available to owner */}
                        {currentUserId && ranking && currentUserId === ranking.user_id && (
                          <button
                            onClick={() => {
                              handleShare()
                              setShowMoreMenu(false)
                            }}
                            disabled={isGeneratingShare}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingShare ? (
                              <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            )}
                            <span>{isGeneratingShare ? 'Sharing...' : 'Share'}</span>
                          </button>
                        )}
                        {/* Download - Available for public rankings or if user owns it */}
                        {ranking && (ranking.is_public || (currentUserId && currentUserId === ranking.user_id)) && (
                          <button
                            onClick={() => {
                              handleDownloadImage()
                              setShowMoreMenu(false)
                            }}
                            disabled={isGeneratingImage}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingImage ? (
                              <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <span>{isGeneratingImage ? 'Downloading...' : 'Download'}</span>
                          </button>
                        )}
                        {/* Re-Rank These Songs - Available for all public rankings */}
                        {ranking && ranking.is_public && (
                          <button
                            onClick={() => {
                              handleReRank()
                              setShowMoreMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Re-Rank These Songs
                          </button>
                        )}
                        {/* Compare - Only available when viewing someone else's ranking */}
                        {ranking && currentUserId && currentUserId !== ranking.user_id && (
                          <button
                            onClick={() => {
                              router.push(`/rankings/${rankingId}/compare`)
                              setShowMoreMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Compare
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] transition-all rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title row - below buttons */}
        <div className="mb-8">
          {isEditing ? (
            <input
              type="text"
              value={editableName || ''}
              onChange={(e) => setEditableName(e.target.value || null)}
              placeholder="Enter ranking name..."
              className="text-3xl md:text-4xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a] mb-2 w-full border-2 border-[#6b7d5a] dark:border-[#6b7d5a] rounded-xl px-4 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b7d5a] focus:border-transparent"
            />
          ) : (
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent mb-2">
              {ranking.name || 'My Ranking'}
            </h1>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-600 dark:text-slate-400">{formattedDate}</p>
            {/* Show owner username if viewing someone else's ranking */}
            {owner && currentUserId && currentUserId !== ranking.user_id && (
              <>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <Link
                  href={`/users/${owner.id}`}
                  className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:text-[#5a6d4a] dark:hover:text-[#7b8d6a] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {owner.display_name || owner.username || owner.email || 'User'}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="inline-flex px-4 py-2 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-xl">
            <span className="text-base md:text-lg font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">
              {ranking.song_count} songs
            </span>
          </div>
        </div>

        {isEditing && (
          <div className="mb-6 p-4 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-2xl border-2 border-[#6b7d5a] dark:border-[#6b7d5a]">
            <p className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Edit Mode: Drag songs to reorder, use the up/down arrows, or click the trash icon to remove songs
            </p>
          </div>
        )}

        <div className="space-y-3">
          {(isEditing ? editableSongs : ranking.songs).map((song, index) => (
            <div
              key={index}
              draggable={isEditing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all ${isEditing
                ? draggedIndex === index
                  ? 'border-[#c97d4a] dark:border-[#d98d5a] shadow-2xl scale-[1.02] cursor-grabbing'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] cursor-grab shadow-lg hover:shadow-xl'
                : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-lg hover:shadow-xl card-hover'
                }`}
            >
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-xl font-bold text-white text-base md:text-xl shadow-lg">
                  #{index + 1}
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-[#6b7d5a] hover:text-white dark:hover:bg-[#6b7d5a] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === editableSongs.length - 1}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-[#6b7d5a] hover:text-white dark:hover:bg-[#6b7d5a] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}
              <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0" data-song-container={song.musicbrainz_id || song.title}>
                {/* Placeholder - shown by default */}
                <div className="song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                {/* Image - overlays placeholder when loaded */}
                {song.cover_art_url && (
                  <Image
                    src={song.cover_art_url}
                    alt={song.title}
                    fill
                    className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.opacity = '0'
                      const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                      if (placeholder) placeholder.style.opacity = '1'
                    }}
                    onLoad={() => {
                      const container = document.querySelector(`[data-song-container="${song.musicbrainz_id || song.title}"]`)
                      if (container) {
                        const img = container.querySelector('img') as HTMLElement
                        const placeholder = container.querySelector('.song-placeholder') as HTMLElement
                        if (img) img.style.opacity = '1'
                        if (placeholder) placeholder.style.opacity = '0'
                      }
                    }}
                    unoptimized
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base md:text-lg text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 truncate">{song.artist}</p>
                {song.album_title && (
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5 md:mt-1">
                    {song.album_title}
                  </p>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => handleDeleteSong(index)}
                  disabled={editableSongs.length <= 1}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Delete song"
                  title="Remove song from ranking"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Share Ranking</h2>
              <button
                onClick={() => {
                  setShowShareModal(false)
                  setWasPrivateBeforeShare(false) // Reset when closing modal
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {wasPrivateBeforeShare && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-sm text-green-800 dark:text-green-400 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This ranking was private and is now public. It will be visible to everyone.
                </p>
              </div>
            )}

            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Copy this link to share your ranking:
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-[#4a5d3a] hover:bg-[#5a6d4a] text-white rounded-xl font-semibold transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="flex gap-3 justify-center">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my ranking: ${ranking?.name || 'My Ranking'} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 flex items-center justify-center bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl transition-colors shadow-md hover:shadow-lg"
                title="Share on WhatsApp"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-90 text-white rounded-xl transition-colors shadow-md hover:shadow-lg"
                title="Share on Instagram"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

