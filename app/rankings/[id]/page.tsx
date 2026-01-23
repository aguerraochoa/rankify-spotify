'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import html2canvas from 'html2canvas'

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

export default function RankingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rankingId = params.id as string
  const [ranking, setRanking] = useState<RankedList | null>(null)
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
    if (!rankingRef.current || !ranking) return
    setDownloading(true)
    try {
      // Small delay to ensure images are loaded
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(rankingRef.current, {
        useCORS: true,
        backgroundColor: '#fffdf5',
        scale: 2, // Higher quality
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `${ranking.name?.replace(/\s+/g, '_')}_ranking.png`
      link.click()
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
                <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">
                  {ranking.name || 'Untitled Ranking'}
                </h1>
                <p className="text-sm font-bold text-gray-600">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-[#00d4ff] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="font-black text-xl">{ranking.song_count} SONGS</span>
            </div>

            {isOwner && (
              <div className="flex gap-3 flex-wrap">
                <Link href={`/rank/rerank/${rankingId}`} className="nb-button-outline px-4 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-Rank
                </Link>
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
              </div>
            )}
          </div>

          <div ref={rankingRef} className="bg-[#fffdf5] p-2 md:p-4">
            {/* Songs List */}
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase mb-4">Full Ranking</h2>
            </div>

            <div className="space-y-3 mb-6">
              {ranking.songs.map((song, index) => (
                <div
                  key={index}
                  className="nb-card-sm p-4 flex items-center gap-3 md:gap-4"
                >
                  <span className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center border-2 border-black font-black text-xl flex-shrink-0 ${index === 0 ? 'bg-[#ffd700]' :
                    index === 1 ? 'bg-[#c0c0c0]' :
                      index === 2 ? 'bg-[#cd7f32]' :
                        'bg-white'
                    }`}>
                    {index + 1}
                  </span>
                  {song.cover_art_url && (
                    <Image
                      src={song.cover_art_url}
                      alt={song.title}
                      width={64}
                      height={64}
                      className="w-12 h-12 md:w-14 md:h-14 border-2 border-black object-cover flex-shrink-0"
                      unoptimized
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base md:text-lg truncate">{song.title}</p>
                    <p className="text-sm md:text-base font-bold text-gray-600 truncate">{song.artist}</p>
                    {song.album_title && (
                      <p className="text-xs md:text-sm font-bold text-gray-500 truncate">{song.album_title}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions at bottom */}
            {!isOwner && (
              <div className="nb-card p-8 text-center">
                <h3 className="text-2xl font-black uppercase mb-2">Like This Ranking?</h3>
                <p className="font-bold text-gray-600 mb-6">Create your own version!</p>
                <Link href={`/rank/rerank/${rankingId}`} className="nb-button px-8 py-3 inline-block">
                  Re-Rank These Songs
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
