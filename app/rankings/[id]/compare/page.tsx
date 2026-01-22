'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
    router.replace(`/rankings/compare/${theirRankingId}/${yourRankingId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fffdf5] p-4 flex items-center justify-center">
        <div className="nb-card p-8 text-center">
          <p className="font-bold text-red-600 mb-6">{error}</p>
          <Link href="/rankings" className="nb-button px-6 py-3 inline-block">
            Back to Rankings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader />

      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto pt-4 md:pt-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">Select Your Ranking</h1>
            <p className="font-bold text-gray-600">Choose which ranking to compare</p>
          </div>

          {rankings.length === 0 ? (
            <div className="nb-card p-12 text-center">
              <span className="text-6xl mb-4 block">🎵</span>
              <h2 className="text-2xl font-black uppercase mb-2">No Rankings Yet</h2>
              <p className="font-bold text-gray-600 mb-6">You need at least one ranking to compare</p>
              <Link href="/rank" className="nb-button px-8 py-3 inline-block">
                Create Ranking
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    className="nb-card p-6 text-left group"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-black uppercase mb-1 line-clamp-2">
                        {ranking.name || `Ranking from ${formattedDate}`}
                      </h3>
                      <p className="text-sm font-bold text-gray-600">{formattedDate}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-[#00d4ff] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <span className="font-black text-lg">{ranking.song_count} SONGS</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {ranking.songs.slice(0, 3).map((song, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white border-2 border-black">
                          <span className={`w-6 h-6 flex items-center justify-center border border-black text-xs font-black ${index === 0 ? 'bg-[#ffd700]' : index === 1 ? 'bg-[#c0c0c0]' : 'bg-[#cd7f32]'
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
                        +{ranking.songs.length - 3} more
                      </p>
                    )}

                    <div className="pt-4 border-t-2 border-black">
                      <span className="font-black text-sm uppercase">Select for Comparison →</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
