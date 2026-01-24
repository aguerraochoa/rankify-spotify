'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import { generateRankingImage } from '@/lib/image/generateRankingImage'

interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  coverArtUrl?: string // Handle legacy/camelCase data
  album_title?: string
  album_musicbrainz_id?: string
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

export default function RankingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rankingId = params.id as string
  const [ranking, setRanking] = useState<RankedList | null>(null)
  const [editableSongs, setEditableSongs] = useState<RankedSong[]>([])
  const [editableName, setEditableName] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const rankingRef = useRef<HTMLDivElement>(null)
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
        setEditableSongs([...data.list.songs])
        setEditableName(data.list.name)
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

  const handleEdit = () => {
    if (!ranking) return
    setIsEditing(true)
    setEditableSongs([...ranking.songs])
    setEditableName(ranking.name)
  }

  const handleCancelEdit = () => {
    if (!ranking) return
    setIsEditing(false)
    setEditableSongs([...ranking.songs])
    setEditableName(ranking.name)
    setDraggedIndex(null)
  }

  const hasChanges = () => {
    if (!ranking || !isEditing) return false

    if (ranking.name !== editableName) return true

    if (ranking.songs.length !== editableSongs.length) return true

    for (let i = 0; i < ranking.songs.length; i++) {
      const original = ranking.songs[i]
      const edited = editableSongs[i]
      const originalId = original.musicbrainz_id || `${original.title}|${original.artist}`
      const editedId = edited.musicbrainz_id || `${edited.title}|${edited.artist}`
      if (originalId !== editedId) return true
    }

    return false
  }

  const handleSaveEdit = async () => {
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

      if (!response.ok) throw new Error('Failed to save changes')

      const data = await response.json()
      setRanking(data.list)
      setEditableSongs([...data.list.songs])
      setEditableName(data.list.name)
      setIsEditing(false)
      setDraggedIndex(null)
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
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
    if (index > 0) moveSong(index, index - 1)
  }

  const moveDown = (index: number) => {
    if (index < editableSongs.length - 1) moveSong(index, index + 1)
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

    setPendingDeleteIndex(index)
  }

  const confirmDeleteSong = () => {
    if (pendingDeleteIndex === null) return

    const newSongs = [...editableSongs]
    newSongs.splice(pendingDeleteIndex, 1)
    setEditableSongs(newSongs)
    setPendingDeleteIndex(null)
  }

  const cancelDelete = () => {
    setPendingDeleteIndex(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ranking?')) return

    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      router.push('/rankings')
    } catch (err) {
      alert('Failed to delete ranking')
    }
  }

  const toggleVisibility = async () => {
    if (!ranking) return

    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !ranking.is_public }),
      })

      if (response.ok) {
        setRanking({ ...ranking, is_public: !ranking.is_public })
      }
    } catch (err) {
      alert('Failed to update visibility')
    }
  }

  const handleShare = async () => {
    if (!ranking) return
    setSharing(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}/share`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to generate share link')
      const { shareUrl } = await response.json()

      if (navigator.share) {
        await navigator.share({
          title: `My ${ranking.name} Ranking`,
          text: `Check out my ${ranking.name} ranking on Rankify!`,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert('Share link copied to clipboard!')
      }
    } catch (err) {
      console.error('Error sharing:', err)
      alert('Failed to share ranking')
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = async () => {
    if (!ranking) return
    setDownloading(true)
    try {
      await generateRankingImage(ranking)
    } catch (err) {
      console.error('Error downloading:', err)
      alert('Failed to download ranking image')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase">Loading Ranking...</p>
        </div>
      </div>
    )
  }

  if (error || !ranking) {
    return (
      <div className="min-h-screen bg-[#fffdf5] p-4 flex items-center justify-center">
        <div className="nb-card p-8 text-center">
          <p className="font-bold text-red-600 mb-6">{error || 'Ranking not found'}</p>
          <Link href="/rankings" className="nb-button px-6 py-3 inline-block">
            Back to Rankings
          </Link>
        </div>
      </div>
    )
  }

  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const isOwner = currentUserId === ranking.user_id
  const displayedSongs = isEditing ? editableSongs : ranking.songs
  const displayedSongCount = isEditing ? editableSongs.length : ranking.song_count

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader />

      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto pt-4 md:pt-8">
          {/* Header */}
          <div className="nb-card p-6 md:p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`nb-tag text-xs ${ranking.is_public ? 'nb-tag-green' : ''}`}>
                    {ranking.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'}
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editableName || ''}
                    onChange={(e) => setEditableName(e.target.value || null)}
                    placeholder="Ranking name"
                    className="w-full text-3xl md:text-4xl font-black uppercase mb-2 px-4 py-3 nb-input"
                  />
                ) : (
                  <h1 className="text-3xl md:text-4xl font-black uppercase mb-2 truncate">
                    {ranking.name || 'Untitled Ranking'}
                  </h1>
                )}
                <p className="text-sm font-bold text-gray-600">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-[#00d4ff] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="font-black text-xl">{displayedSongCount} SONGS</span>
            </div>

            {isOwner && (
              <div className="flex gap-3 flex-wrap">
                {!isEditing ? (
                  <>
                    <button onClick={handleEdit} className="nb-button-outline px-4 py-2 text-sm md:text-base">
                      Edit
                    </button>
                    <button onClick={toggleVisibility} className="nb-button-outline px-4 py-2 text-sm md:text-base">
                      {ranking.is_public ? 'Make Private' : 'Make Public'}
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className="nb-button px-4 py-2 flex items-center gap-2 text-sm md:text-base border-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 101.32-3.32m0 1.32a3 3 0 110 2.684m0 0l-6.632 3.316m6.632-6l-6.632-3.316" />
                      </svg>
                      {sharing ? 'Sharing...' : 'Share'}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="bg-black text-white px-4 py-2 flex items-center gap-2 text-sm md:text-base border-2 border-black hover:bg-gray-800 transition-colors uppercase font-black"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {downloading ? '...' : 'Download'}
                    </button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-[#ff6b6b] border-2 border-black font-black uppercase hover:bg-[#ff4b4b] transition-colors text-sm md:text-base">
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="nb-button-outline px-4 py-2 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving || !hasChanges()}
                      className="nb-button px-4 py-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            )}

            {!isOwner && (
              <div className="flex gap-3 flex-wrap">
                <Link href={`/rank/rerank/${rankingId}`} className="nb-button px-4 py-2">
                  Rank These Songs
                </Link>
              </div>
            )}
          </div>

          <div ref={rankingRef} className="bg-[#fffdf5] p-2 md:p-4">
            {/* Songs List */}
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase mb-4">Full Ranking</h2>
            </div>

            {isEditing && (
              <div className="nb-card p-4 mb-6">
                <p className="font-bold text-sm text-gray-700">
                  Edit mode: drag to reorder, use arrows to move, or remove songs.
                </p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {displayedSongs.map((song, index) => (
                <div
                  key={index}
                  draggable={isEditing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`nb-card-sm p-4 flex items-center gap-3 md:gap-4 ${isEditing ? 'cursor-move' : ''} ${draggedIndex === index ? 'opacity-70' : ''}`}
                >
                  {isEditing && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white font-black disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === displayedSongs.length - 1}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white font-black disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center border-2 border-black font-black text-xl ${index === 0 ? 'bg-[#ffd700]' :
                      index === 1 ? 'bg-[#c0c0c0]' :
                        index === 2 ? 'bg-[#cd7f32]' :
                          'bg-white'
                      }`}>
                      {index + 1}
                    </div>
                    {(song.cover_art_url || song.coverArtUrl) && (
                      <Image
                        src={song.cover_art_url || song.coverArtUrl || ''}
                        alt={song.title}
                        width={64}
                        height={64}
                        className="w-12 h-12 md:w-14 md:h-14 border-2 border-black object-cover flex-shrink-0"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base md:text-lg truncate">{song.title}</p>
                    <p className="text-sm md:text-base font-bold text-gray-600 truncate">{song.artist}</p>
                    {song.album_title && (
                      <p className="text-xs md:text-sm font-bold text-gray-500 truncate">{song.album_title}</p>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleDeleteSong(index)}
                      disabled={displayedSongs.length <= 1}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#ff6b6b] border-2 border-black font-black disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Delete song"
                      title="Remove song"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Delete confirmation overlay */}
            {pendingDeleteIndex !== null && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="nb-card p-6 max-w-sm w-full bg-white border-2 border-black text-center">
                  <h3 className="text-xl font-black uppercase mb-2">Remove Song?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to remove <span className="font-bold">{displayedSongs[pendingDeleteIndex].title}</span> from the ranking?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 nb-button-outline"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteSong}
                      className="px-4 py-2 nb-button bg-[#ff6b6b] text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions at bottom - marked class for removal during download */}
            {!isOwner && (
              <div className="nb-card p-8 text-center actions-section">
                <h3 className="text-2xl font-black uppercase mb-2">Like This Ranking?</h3>
                <p className="font-bold text-gray-600 mb-6">Create your own version!</p>
                <Link href={`/rank/rerank/${rankingId}`} className="nb-button px-8 py-3 inline-block">
                  Rank These Songs
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
