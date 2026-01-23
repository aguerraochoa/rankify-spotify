'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compareRankings, type ComparisonResult, type SharedSongComparison } from '@/lib/ranking/compareRankings'
import { NavHeader } from '@/components/NavHeader'

interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  rank?: number
}

interface RankedList {
  id: string
  user_id: string
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

export default function ComparePage() {
  const router = useRouter()
  const params = useParams()
  const theirId = params.theirId as string
  const yourId = params.yourId as string
  const [yourRanking, setYourRanking] = useState<RankedList | null>(null)
  const [theirRanking, setTheirRanking] = useState<RankedList | null>(null)
  const [yourUser, setYourUser] = useState<User | null>(null)
  const [theirUser, setTheirUser] = useState<User | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const [yourResponse, theirResponse] = await Promise.all([
          fetch(`/api/ranked-lists/${yourId}`),
          fetch(`/api/ranked-lists/${theirId}`),
        ])

        if (!yourResponse.ok || !theirResponse.ok) {
          throw new Error('Failed to fetch rankings')
        }

        const yourData = await yourResponse.json()
        const theirData = await theirResponse.json()

        setYourRanking(yourData.list)
        setTheirRanking(theirData.list)

        const [yourUserResponse, theirUserResponse] = await Promise.all([
          fetch(`/api/users/${yourData.list.user_id}`),
          fetch(`/api/users/${theirData.list.user_id}`),
        ])

        if (yourUserResponse.ok) {
          const yourUserData = await yourUserResponse.json()
          setYourUser(yourUserData.profile)
        }

        if (theirUserResponse.ok) {
          const theirUserData = await theirUserResponse.json()
          setTheirUser(theirUserData.profile)
        }

        const comparisonResult = compareRankings(yourData.list.songs, theirData.list.songs)
        setComparison(comparisonResult)
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load comparison')
      } finally {
        setLoading(false)
      }
    }

    if (yourId && theirId) {
      fetchData()
    }
  }, [yourId, theirId, router, supabase.auth])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase">Comparing Rankings...</p>
        </div>
      </div>
    )
  }

  if (error || !yourRanking || !theirRanking || !comparison) {
    return (
      <div className="min-h-screen bg-[#fffdf5] p-4 flex items-center justify-center">
        <div className="nb-card p-8 text-center">
          <p className="font-bold text-red-600 mb-6">{error || 'Failed to load comparison'}</p>
          <button onClick={() => router.back()} className="nb-button px-6 py-3">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 70) return 'bg-[#4ade80]'
    if (score >= 40) return 'bg-[#ffd700]'
    return 'bg-[#ff6b6b]'
  }

  const totalPossibleMatches = Math.max(yourRanking.song_count, theirRanking.song_count)

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader />

      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto pt-4 md:pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="nb-tag mb-4">COMPARISON_RESULT</div>
            <h1 className="text-3xl md:text-4xl font-black uppercase mb-4">Rankings Comparison</h1>
          </div>

          {/* Similarity Score */}
          <div className="nb-card p-6 md:p-8 text-center mb-8">
            <h2 className="text-xl font-black uppercase mb-4">Similarity Score</h2>
            <div className={`inline-block px-8 py-4 border-4 border-black font-black text-5xl ${getSimilarityColor(comparison.similarity)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
              {comparison.similarity}%
            </div>
            <p className="font-bold text-gray-600 mt-4">
              {comparison.sharedSongs.length} common songs found between rankings
            </p>
          </div>

          {/* VS Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="nb-card p-6">
              <div className="nb-tag-cyan text-xs mb-2">YOUR RANKING</div>
              <h3 className="text-xl font-black uppercase mb-1">{yourRanking.name || 'Your Ranking'}</h3>
              <p className="text-sm font-bold text-gray-600">
                by {yourUser?.display_name || yourUser?.email || 'You'}
              </p>
            </div>
            <div className="nb-card p-6">
              <div className="nb-tag-pink text-xs mb-2">THEIR RANKING</div>
              <h3 className="text-xl font-black uppercase mb-1">{theirRanking.name || 'Their Ranking'}</h3>
              <p className="text-sm font-bold text-gray-600">
                by {theirUser?.display_name || theirUser?.email || 'Them'}
              </p>
            </div>
          </div>

          {/* Matched Songs */}
          {comparison.sharedSongs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase mb-4">Common Songs ({comparison.sharedSongs.length})</h2>
              <div className="space-y-3">
                {comparison.sharedSongs.map((shared: SharedSongComparison) => (
                  <div key={`${shared.song.title}-${shared.song.artist}`} className="nb-card-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#00d4ff] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          #{shared.yourRank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black truncate">{shared.song.title}</p>
                          <p className="text-sm font-bold text-gray-600 truncate">{shared.song.artist}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-block bg-white border-2 border-black px-4 py-2 font-black">
                          {shared.diffAmount} {shared.diffAmount === 1 ? 'spot' : 'spots'} {shared.indicator === 'same' ? 'the same' : 'apart'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-end">
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-black truncate">{shared.song.title}</p>
                          <p className="text-sm font-bold text-gray-600 truncate">{shared.song.artist}</p>
                        </div>
                        <div className="w-12 h-12 bg-[#ff90e8] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          #{shared.theirRank}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only In Your Ranking */}
          {comparison.onlyInYourList.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase mb-4">Only In Your Ranking</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparison.onlyInYourList.map((song) => (
                  <div key={`${song.title}-${song.artist}`} className="nb-card-sm p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate">{song.title}</p>
                      <p className="text-xs font-bold text-gray-600 truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only In Their Ranking */}
          {comparison.onlyInTheirList.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase mb-4">Only In Their Ranking</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparison.onlyInTheirList.map((song) => (
                  <div key={`${song.title}-${song.artist}`} className="nb-card-sm p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate">{song.title}</p>
                      <p className="text-xs font-bold text-gray-600 truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
