'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'

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
      <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase">Loading Your Rankings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fffdf5] p-4 md:p-6 flex items-center justify-center">
        <div className="nb-card p-8 text-center max-w-md">
          <p className="font-bold text-red-600 mb-6">{error}</p>
          <Link href="/rank" className="nb-button px-6 py-3 inline-block">
            Start Ranking
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader />

      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto pt-4 md:pt-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">My Rankings</h1>
                <p className="font-bold text-gray-600">All your saved music rankings</p>
              </div>
              <Link href="/rank" className="nb-button px-6 py-3">
                Create New Ranking
              </Link>
            </div>
          </div>

          {/* Empty state */}
          {rankings.length === 0 && (
            <div className="nb-card p-12 text-center">
              <div className="w-20 h-20 bg-[#ffd700] border-4 border-black flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-4xl">🎵</span>
              </div>
              <h2 className="text-2xl font-black uppercase mb-2">No Rankings Yet</h2>
              <p className="font-bold text-gray-600 mb-6">Start by creating your first ranking!</p>
              <Link href="/rank" className="nb-button px-8 py-3 inline-block">
                Create Ranking
              </Link>
            </div>
          )}

          {/* Rankings grid */}
          {rankings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {rankings.map((ranking) => {
                const date = new Date(ranking.created_at)
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <Link
                    key={ranking.id}
                    href={`/rankings/${ranking.id}`}
                    className="nb-card p-4 md:p-6 group block"
                  >
                    {/* Top section */}
                    <div className="mb-4">
                      {ranking.status === 'draft' && (
                        <div className="nb-tag text-xs mb-2">DRAFT</div>
                      )}
                      <h3 className="text-lg md:text-xl font-black uppercase mb-1 line-clamp-2">
                        {ranking.name || `Ranking from ${formattedDate}`}
                      </h3>
                      <p className="text-sm font-bold text-gray-600">{formattedDate}</p>
                    </div>

                    {/* Song count badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-[#00d4ff] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <span className="font-black text-lg">{ranking.song_count} SONGS</span>
                    </div>

                    {/* Preview of top 3 songs */}
                    <div className="space-y-2 mb-4">
                      {ranking.songs.slice(0, 3).map((song, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-white border-2 border-black"
                        >
                          <span className={`w-6 h-6 flex items-center justify-center border border-black text-xs font-black ${index === 0 ? 'bg-[#ffd700]' :
                              index === 1 ? 'bg-[#c0c0c0]' :
                                'bg-[#cd7f32]'
                            }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{song.title}</p>
                            <p className="text-xs font-bold text-gray-600 truncate">{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ranking.songs.length > 3 && (
                      <p className="text-xs font-bold text-gray-600 text-center mb-4">
                        +{ranking.songs.length - 3} more songs
                      </p>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t-2 border-black flex items-center justify-between">
                      <span className="font-black text-sm uppercase">
                        {ranking.is_public ? '🌐 Public' : '🔒 Private'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(ranking.id)
                        }}
                        className="px-3 py-1 bg-[#ff6b6b] border-2 border-black font-black text-xs uppercase hover:bg-[#ff4b4b] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
