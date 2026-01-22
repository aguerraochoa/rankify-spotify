'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface RankedList {
  id: string
  name: string | null
  songs: Array<{
    title: string
    artist: string
    cover_art_url?: string
    album_title?: string
  }>
  song_count: number
  is_public: boolean
  status?: 'draft' | 'completed'
  created_at: string
  updated_at?: string
}

export default function RankingsPage() {
  const router = useRouter()
  const [rankings, setRankings] = useState<RankedList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Fetch completed rankings
        const rankingsResponse = await fetch('/api/ranked-lists')
        if (!rankingsResponse.ok) {
          throw new Error('Failed to fetch rankings')
        }
        const rankingsData = await rankingsResponse.json()
        setRankings(rankingsData.lists || [])
      } catch (err: any) {
        console.error('Error fetching rankings:', err)
        setError(err.message || 'Failed to load rankings')
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [router, supabase.auth])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ranking?')) {
      return
    }

    try {
      const response = await fetch(`/api/ranked-lists/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete ranking')
      }

      setRankings(rankings.filter((r) => r.id !== id))
    } catch (err: any) {
      console.error('Error deleting ranking:', err)
      alert('Failed to delete ranking. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading your rankings...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-white to-[#f5f1e8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/"
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        {/* Title row - below buttons */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            My Rankings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">View and manage your saved song rankings</p>
        </div>

        {/* Rankings Section */}
        {rankings.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-full mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">No Rankings Yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
              Start ranking your favorite songs to see them here!
            </p>
            <Link
              href="/rank"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Ranking
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rankings.map((ranking) => {
                const date = new Date(ranking.created_at)
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <div
                    key={ranking.id}
                    className="group relative bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-xl hover:shadow-2xl transition-all card-hover"
                  >
                    <Link href={`/rankings/${ranking.id}`} className="block">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">
                          {ranking.name || `Ranking from ${formattedDate}`}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {formattedDate}
                          </p>
                          {ranking.is_public ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800" title="Public ranking">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600" title="Private ranking">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              Private
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-[#4a5d3a] dark:text-[#6b7d5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {ranking.song_count} songs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Preview of top 3 songs */}
                      <div className="space-y-2 mb-4">
                        {ranking.songs.slice(0, 3).map((song, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl"
                          >
                            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-lg font-bold text-white text-xs shadow-md flex-shrink-0">
                              #{index + 1}
                            </div>
                            <div className="relative w-8 h-8 flex-shrink-0">
                              {/* Placeholder - shown by default */}
                              <div className="song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                                <svg className="w-4 h-4 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                              </div>
                              {/* Image - overlays placeholder when loaded */}
                              {song.cover_art_url && (
                                <Image
                                  src={song.cover_art_url}
                                  alt={song.title}
                                  fill
                                  className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md transition-opacity duration-300 opacity-0"
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
                              <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{song.title}</p>
                              <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {ranking.songs.length > 3 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                          +{ranking.songs.length - 3} more songs
                        </p>
                      )}

                      <div className="flex items-center justify-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] group-hover:text-[#5a6d4a] dark:group-hover:text-[#7b8d6a] transition-colors">
                          View Full Ranking →
                        </span>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(ranking.id)
                      }}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                      aria-label="Delete ranking"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

