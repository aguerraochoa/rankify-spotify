'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import UserListModal from '@/components/UserListModal'

interface UserProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
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
  const userId = params.id as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rankings, setRankings] = useState<RankedList[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMoreRankings, setLoadingMoreRankings] = useState(false)
  const [rankingsPage, setRankingsPage] = useState(1)
  const [hasMoreRankings, setHasMoreRankings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [userListConfig, setUserListConfig] = useState<{ type: 'followers' | 'following'; title: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Don't redirect - allow viewing profiles without auth
        setCurrentUserId(user?.id || null)

        // Fetch user profile and rankings (API allows public access)
        const [profileResponse, rankingsResponse, followResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/rankings?page=1&limit=25`),
          user ? fetch(`/api/users/${userId}/follow`) : Promise.resolve({ ok: false }),
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
          setHasMoreRankings(rankingsData.hasMore || false)
          setRankingsPage(1)
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err)
        setError(err.message || 'Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId, router, supabase.auth])

  const handleLoadMoreRankings = async () => {
    setLoadingMoreRankings(true)
    try {
      const nextPage = rankingsPage + 1
      const response = await fetch(`/api/users/${userId}/rankings?page=${nextPage}&limit=25`)
      if (response.ok) {
        const data = await response.json()
        setRankings((prev) => [...prev, ...data.rankings])
        setHasMoreRankings(data.hasMore || false)
        setRankingsPage(nextPage)
      }
    } catch (err) {
      console.error('Error loading more rankings:', err)
    } finally {
      setLoadingMoreRankings(false)
    }
  }

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
        // Unfollow
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
        // Follow
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
      alert('Failed to update follow status. Please try again.')
    } finally {
      setIsTogglingFollow(false)
    }
  }

  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/users/${userId}` : ''
  const shareText = currentUserId === userId
    ? `Check out my music rankings on Rankify! Join me and create your own rankings: ${profileUrl}`
    : `Check out ${profile?.display_name || profile?.username || 'this user'}'s music rankings on Rankify! Join and create your own: ${profileUrl}`

  const copyProfileLink = () => {
    if (profileUrl) {
      navigator.clipboard.writeText(profileUrl)
      alert('Profile link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading profile...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'User not found'}</p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href={currentUserId === userId ? "/" : "/discover"}
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          {!currentUserId && (
            <Link
              href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/users/' + userId)}`}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] transition-all rounded-xl shadow-sm hover:shadow-md"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-8 border-2 border-slate-200 dark:border-slate-700 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-full font-bold text-white text-2xl md:text-3xl shadow-lg flex-shrink-0">
              {(profile.display_name || profile.username || profile.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 w-full md:w-auto">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 break-words overflow-wrap-anywhere">
                {profile.display_name || profile.username || profile.email || 'User'}
              </h1>
              {profile.username && profile.username !== profile.display_name && (
                <p className="text-slate-500 dark:text-slate-400 mb-2 break-words">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-slate-600 dark:text-slate-400 mb-4 break-words">{profile.bio}</p>
              )}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setUserListConfig({ type: 'following', title: 'Following' })}
                  className="text-left hover:opacity-70 transition-opacity"
                >
                  <span className="text-xl md:text-2xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{profile.following}</span>
                  <span className="text-slate-600 dark:text-slate-400 ml-2">Following</span>
                </button>
                <button
                  onClick={() => setUserListConfig({ type: 'followers', title: 'Followers' })}
                  className="text-left hover:opacity-70 transition-opacity"
                >
                  <span className="text-xl md:text-2xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{profile.followers}</span>
                  <span className="text-slate-600 dark:text-slate-400 ml-2">Followers</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {currentUserId === userId ? (
                <>
                  <Link
                    href={`/users/${userId}/edit`}
                    className="w-full sm:w-auto px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full sm:w-auto px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg bg-white dark:bg-slate-700 text-[#4a5d3a] dark:text-[#6b7d5a] border-2 border-[#4a5d3a] dark:border-[#6b7d5a] hover:bg-[#f5f1e8] dark:hover:bg-slate-600 inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={isTogglingFollow}
                    className={`w-full sm:w-auto px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 ${isFollowing
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      : 'bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white'
                      }`}
                  >
                    {isTogglingFollow ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ...
                      </span>
                    ) : isFollowing ? (
                      'Unfollow'
                    ) : (
                      'Follow'
                    )}
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full sm:w-auto px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg bg-white dark:bg-slate-700 text-[#4a5d3a] dark:text-[#6b7d5a] border-2 border-[#4a5d3a] dark:border-[#6b7d5a] hover:bg-[#f5f1e8] dark:hover:bg-slate-600 inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Public Rankings */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Public Rankings
          </h2>
          {rankings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-slate-600 dark:text-slate-400 text-lg">No public rankings yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-lg hover:shadow-xl transition-all card-hover"
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
                        View Full Ranking →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {hasMoreRankings && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMoreRankings}
                disabled={loadingMoreRankings}
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg bg-white dark:bg-slate-800 text-[#4a5d3a] dark:text-[#6b7d5a] border-2 border-[#4a5d3a] dark:border-[#6b7d5a] hover:bg-[#f5f1e8] dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {loadingMoreRankings ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load More Rankings'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Profile Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Share Profile</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {currentUserId === userId
                ? "Share your profile and invite others to join Rankify! Create your own music rankings and discover new favorites."
                : `Share ${profile?.display_name || profile?.username || 'this profile'} and invite others to join Rankify!`}
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Copy this link to share:
            </p>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                value={profileUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
              />
              <button
                onClick={copyProfileLink}
                className="px-4 py-2 bg-[#4a5d3a] hover:bg-[#5a6d4a] text-white rounded-xl font-semibold transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="flex gap-3 justify-center">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 flex items-center justify-center bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl transition-colors shadow-md hover:shadow-lg"
                title="Share on WhatsApp"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-90 text-white rounded-xl transition-colors shadow-md hover:shadow-lg"
                title="Share on Instagram"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* User List Modal (Followers/Following) */}
      {userListConfig && (
        <UserListModal
          userId={userId}
          type={userListConfig.type}
          title={userListConfig.title}
          onClose={() => setUserListConfig(null)}
        />
      )}
    </main>
  )
}

