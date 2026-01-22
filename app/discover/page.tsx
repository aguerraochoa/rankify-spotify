'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'

interface User {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  public_rankings_count?: number
}

export default function DiscoverPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'search' | 'following'>('following')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [followingUsers, setFollowingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        loadFollowing()
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  const loadFollowing = async () => {
    setLoadingFollowing(true)
    setError(null)

    try {
      const response = await fetch('/api/users/following')
      if (!response.ok) {
        throw new Error('Failed to load following list')
      }

      const data = await response.json()
      setFollowingUsers(data.users || [])
    } catch (err: any) {
      console.error('Error loading following:', err)
      setError(err.message || 'Failed to load following list')
    } finally {
      setLoadingFollowing(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setUsers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`)
      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err: any) {
      console.error('Error searching users:', err)
      setError(err.message || 'Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <NavHeader title="Discover Users" />

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Title row */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Discover Users
            </h1>
            <p className="text-sm text-slate-400 mt-1">Find and follow other users</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-700">
            <button
              onClick={() => {
                setActiveTab('following')
                loadFollowing()
              }}
              className={`px-6 py-3 font-semibold transition-all relative ${activeTab === 'following'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              Following
              {followingUsers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                  {followingUsers.length}
                </span>
              )}
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 font-semibold transition-all relative ${activeTab === 'search'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              Search
              {activeTab === 'search' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
              )}
            </button>
          </div>

          {/* Search Form - only show when search tab is active */}
          {activeTab === 'search' && (
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative flex items-center">
                <svg className="absolute left-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or username..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl focus:border-green-500 focus:outline-none transition-all text-lg shadow-sm hover:shadow-md text-white placeholder-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="mt-4 w-full py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  'Search Users'
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border-2 border-red-800 text-red-400 rounded-2xl">
              {error}
            </div>
          )}

          {/* Users List - Search Results */}
          {activeTab === 'search' && (
            <>
              {users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/users/${user.id}`}
                      className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-green-500 shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-green-600 rounded-full font-bold text-white text-xl md:text-2xl shadow-lg flex-shrink-0">
                          {(user.display_name || user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg md:text-xl text-white mb-1 truncate md:break-words">
                            {user.display_name || user.username || user.email || 'User'}
                          </h3>
                          {user.username && user.username !== user.display_name && (
                            <p className="text-sm md:text-base text-slate-400 mb-2 break-words">@{user.username}</p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-sm md:text-base text-slate-400">
                              {user.public_rankings_count || 0} public {user.public_rankings_count === 1 ? 'ranking' : 'rankings'}
                            </p>
                          </div>
                          {user.bio && (
                            <p className="text-sm md:text-base text-slate-400 line-clamp-2">{user.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <span className="text-sm md:text-base font-semibold text-green-500 group-hover:text-green-400 transition-colors">
                          View Profile →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.trim() && !loading ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-400 text-lg">No users found</p>
                </div>
              ) : null}
            </>
          )}

          {/* Following List */}
          {activeTab === 'following' && (
            <>
              {loadingFollowing ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                  <p className="text-slate-400 text-lg">Loading following list...</p>
                </div>
              ) : followingUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {followingUsers.map((user) => (
                    <Link
                      key={user.id}
                      href={`/users/${user.id}`}
                      className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-green-500 shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-green-600 rounded-full font-bold text-white text-xl md:text-2xl shadow-lg flex-shrink-0">
                          {(user.display_name || user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg md:text-xl text-white mb-1 truncate md:break-words">
                            {user.display_name || user.username || user.email || 'User'}
                          </h3>
                          {user.username && user.username !== user.display_name && (
                            <p className="text-sm md:text-base text-slate-400 mb-2 break-words">@{user.username}</p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-sm md:text-base text-slate-400">
                              {user.public_rankings_count || 0} public {user.public_rankings_count === 1 ? 'ranking' : 'rankings'}
                            </p>
                          </div>
                          {user.bio && (
                            <p className="text-sm md:text-base text-slate-400 line-clamp-2">{user.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <span className="text-sm md:text-base font-semibold text-green-500 group-hover:text-green-400 transition-colors">
                          View Profile →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-400 text-lg mb-2">You&apos;re not following anyone yet</p>
                  <p className="text-sm text-slate-500">Use the Search tab to find and follow users</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
