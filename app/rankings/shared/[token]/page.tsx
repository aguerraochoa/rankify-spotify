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
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [supabase.auth])

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
        <div className="nb-card p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-[#ff6b6b] border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase mb-2">{error || 'Not Found'}</h2>
          <p className="font-bold text-gray-600 mb-6">This ranking may have been deleted or the link is invalid.</p>
          <Link href="/" className="nb-button px-8 py-3 inline-block">
            Go to Home
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

  return (
    <div className="min-h-screen bg-[#fffdf5] p-4 md:p-6">
      <div className="max-w-4xl mx-auto pt-4 md:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="nb-button-outline px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <Link href={`/login`} className="nb-button px-4 py-2 text-sm">
                Sign In
              </Link>
            )}
            {isLoggedIn && ranking && (
              <button
                onClick={() => router.push(`/rank/rerank/${ranking.id}`)}
                className="nb-button-outline px-4 py-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rank These Songs
              </button>
            )}
          </div>
        </div>

        {/* Title Section */}
        <div className="nb-card p-6 md:p-8 mb-6">
          <div className="nb-tag mb-4">SHARED_RANKING</div>
          <h1 className="text-3xl md:text-4xl font-black uppercase mb-2 truncate">
            {ranking.name || 'Shared Ranking'}
          </h1>
          {user && (
            <p className="font-bold text-gray-600 mb-2">
              by {user.display_name || user.username || user.email || 'User'}
            </p>
          )}
          <p className="text-sm font-bold text-gray-600">{formattedDate}</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-10 h-10 bg-[#00d4ff] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="font-black text-lg">{ranking.song_count} SONGS</span>
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-3">
          {ranking.songs.map((song, index) => (
            <div
              key={index}
              className="nb-card-sm p-3 md:p-4 flex items-center gap-3"
            >
              <span className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center border-2 border-black font-black text-lg md:text-xl flex-shrink-0 ${index === 0 ? 'bg-[#ffd700]' :
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
                <p className="font-black truncate text-base md:text-lg">{song.title}</p>
                <p className="text-sm md:text-base font-bold text-gray-600 truncate">{song.artist}</p>
                {song.album_title && (
                  <p className="text-xs md:text-sm font-bold text-gray-500 truncate">{song.album_title}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA at bottom */}
        {!isLoggedIn && (
          <div className="nb-card p-8 text-center mt-8">
            <h3 className="text-2xl font-black uppercase mb-2">Like This Ranking?</h3>
            <p className="font-bold text-gray-600 mb-6">Sign in to create your own or re-rank these songs!</p>
            <Link href="/login" className="nb-button px-8 py-3 inline-block">
              Sign In with Spotify
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
