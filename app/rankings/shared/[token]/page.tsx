'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

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
  name: string | null
  songs: RankedSong[]
  song_count: number
  created_at: string
}

interface User {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
}

export default function SharedRankingPage() {
  const params = useParams()
  const router = useRouter()
  const shareToken = params.token as string
  const [ranking, setRanking] = useState<RankedList | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const supabase = createClient()

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [supabase.auth])

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

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetch(`/api/ranked-lists/shared/${shareToken}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ranking not found')
          }
          throw new Error('Failed to fetch ranking')
        }

        const data = await response.json()
        setRanking(data.ranking)
        setUser(data.user)
      } catch (err: any) {
        console.error('Error fetching shared ranking:', err)
        setError(err.message || 'Failed to load ranking')
      } finally {
        setLoading(false)
      }
    }

    if (shareToken) {
      fetchRanking()
    }
  }, [shareToken])

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
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 dark:text-red-400 mb-4 text-lg">{error || 'Ranking not found'}</p>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This ranking may have been deleted or the link is invalid.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Go to Home
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <div className="flex items-center gap-2">
              {!isLoggedIn && (
                <Link
                  href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/rankings/shared/' + shareToken)}`}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] transition-all rounded-xl shadow-sm hover:shadow-md"
                >
                  Sign In
                </Link>
              )}
              {/* When Sign In is present, show more menu; otherwise show Use as Template button */}
              {!isLoggedIn ? (
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
                        <button
                          onClick={() => {
                            setShowMoreMenu(false)
                            router.push(`/rank/rerank/${ranking?.id}`)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Re-Rank These Songs
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/rank/rerank/${ranking.id}`)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-Rank These Songs
                  </span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent mb-2">
            {ranking.name || 'Shared Ranking'}
          </h1>
          {user && (
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              by {user.display_name || user.username || user.email || 'User'}
            </p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">{formattedDate}</p>
        </div>

        <div className="mb-6">
          <div className="inline-flex px-4 py-2 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-xl">
            <span className="text-base md:text-lg font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">
              {ranking.song_count} songs
            </span>
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-3">
          {ranking.songs.map((song, index) => (
            <div
              key={index}
              className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-xl font-bold text-white text-base md:text-xl shadow-lg flex-shrink-0">
                #{index + 1}
              </div>
              <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                {/* Placeholder */}
                <div className="song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                {/* Image */}
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
                    onLoad={(e) => {
                      const img = e.currentTarget
                      img.style.opacity = '1'
                      const placeholder = img.parentElement?.querySelector('.song-placeholder') as HTMLElement
                      if (placeholder) placeholder.style.opacity = '0'
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
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

