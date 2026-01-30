'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'

interface UserProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  spotify_id: string | null
  following: number
  followers: number
}

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

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string | undefined
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rankings, setRankings] = useState<RankedList[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      setError('Invalid user')
      return
    }
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setCurrentUserId(user?.id || null)

        const [profileResponse, rankingsResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/rankings?page=1&limit=25`),
        ])

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const profileData = await profileResponse.json()
        setProfile(profileData.profile)
        setIsFollowing(user ? (profileData.isFollowing || false) : false)

        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json()
          setRankings(rankingsData.rankings || [])
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err)
        setError(err.message || 'Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId, router, supabase.auth])

  const handleFollowToggle = async () => {
    setIsTogglingFollow(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (isFollowing) {
        const response = await fetch(`/api/users/${userId}/follow`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFollowing(false)
          if (profile) {
            setProfile({ ...profile, followers: Math.max(0, profile.followers - 1) })
          }
        }
      } else {
        const response = await fetch(`/api/users/${userId}/follow`, {
          method: 'POST',
        })
        if (response.ok) {
          setIsFollowing(true)
          if (profile) {
            setProfile({ ...profile, followers: profile.followers + 1 })
          }
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      alert('Failed to update follow status')
    } finally {
      setIsTogglingFollow(false)
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading Profile..." />
  }

  if (error || !profile || !userId) {
    return (
      <div className="min-h-screen bg-[#fffdf5] p-4 flex items-center justify-center">
        <div className="nb-card p-8 text-center">
          <p className="font-bold text-red-600 mb-6">{error || 'User not found'}</p>
          <Link href="/discover" className="nb-button px-6 py-3 inline-block">
            Back to Discover
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
          {/* Profile Header */}
          <div className="nb-card p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || 'User'}
                  width={128}
                  height={128}
                  className="w-24 h-24 md:w-32 md:h-32 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center bg-[#4ade80] border-4 border-black font-black text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                  {(profile.display_name || profile.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="text-2xl md:text-4xl font-black uppercase">{profile.display_name || profile.email || 'User'}</h1>
                  <span className="nb-tag-green text-xs">Connected</span>
                </div>
                {profile.bio && (
                  <p className="font-bold text-gray-600 mb-4">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg">{profile.followers}</span>
                    <span className="font-bold text-gray-600 text-sm">Followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg">{profile.following}</span>
                    <span className="font-bold text-gray-600 text-sm">Following</span>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {currentUserId && currentUserId !== userId && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={isTogglingFollow}
                      className={`px-6 py-3 font-black uppercase border-2 border-black transition-all disabled:opacity-50 ${isFollowing
                        ? 'bg-white hover:bg-[#ff6b6b]'
                        : 'nb-button'
                        }`}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                  {currentUserId === userId && (
                    <Link href={`/users/${userId}/edit`} className="nb-button px-6 py-3">
                      Edit Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rankings Section */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-black uppercase mb-4">Public Rankings</h2>
          </div>

          {rankings.length === 0 ? (
            <div className="nb-card p-12 text-center">
              <span className="text-6xl mb-4 block">🎵</span>
              <h3 className="text-2xl font-black uppercase mb-2">No Rankings Yet</h3>
              <p className="font-bold text-gray-600">
                {currentUserId === userId ? 'Start ranking your music!' : 'This user hasn\'t created any rankings yet.'}
              </p>
              {currentUserId === userId && (
                <Link href="/rank" className="nb-button px-8 py-3 inline-block mt-6">
                  Create Ranking
                </Link>
              )}
            </div>
          ) : (
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
                    className="nb-card p-4 md:p-6 group"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg md:text-xl font-black uppercase mb-1 line-clamp-2">
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

                    {ranking.songs.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {ranking.songs.slice(0, 3).map((song, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-white border-2 border-black">
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
                    )}

                    <div className="pt-4 border-t-2 border-black">
                      <span className="font-black text-sm uppercase">View Ranking →</span>
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
