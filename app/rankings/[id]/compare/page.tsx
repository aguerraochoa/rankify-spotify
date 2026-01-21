'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface RankedList {
  id: string
  name: string | null
  songs: Array<{
    title: string
    artist: string
    cover_art_url?: string
  }>
  song_count: number
  created_at: string
}

export default function CompareSelectionPage() {
  const router = useRouter()
  const params = useParams()
  const theirRankingId = params.id as string
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

        const response = await fetch('/api/ranked-lists')
        if (!response.ok) {
          throw new Error('Failed to fetch rankings')
        }

        const data = await response.json()
        setRankings(data.lists || [])
      } catch (err: any) {
        console.error('Error fetching rankings:', err)
        setError(err.message || 'Failed to load rankings')
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [router, supabase.auth])

  const handleSelectRanking = (yourRankingId: string) => {
    // Use replace instead of push to prevent navigation loop
    // This removes the compare selection page from the history stack
    router.replace(`/rankings/compare/${theirRankingId}/${yourRankingId}`)
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-white to-[#f5f1e8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent mb-2">
            Select Your Ranking
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Choose which of your rankings to compare
          </p>
        </div>

        {rankings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">No Rankings Yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
              You need at least one ranking to compare
            </p>
            <Link
              href="/songs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Ranking
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rankings.map((ranking) => {
              const date = new Date(ranking.created_at)
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <button
                  key={ranking.id}
                  onClick={() => handleSelectRanking(ranking.id)}
                  className="group text-left bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-lg hover:shadow-xl transition-all card-hover"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                      {ranking.name || `Ranking from ${formattedDate}`}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formattedDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-[#4a5d3a] dark:text-[#6b7d5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {ranking.song_count} songs
                    </span>
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
                      Compare →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

