'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'

interface User {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
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
  const [hasSearched, setHasSearched] = useState(false)
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
      setHasSearched(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader />

      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto pt-4 md:pt-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">Discover Users</h1>
            <p className="font-bold text-gray-600">Find and follow other music rankers</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b-4 border-black">
            <button
              onClick={() => {
                setActiveTab('following')
                loadFollowing()
              }}
              className={`px-6 py-3 font-black uppercase transition-all relative ${activeTab === 'following' ? 'bg-[#ff90e8] border-2 border-black border-b-0' : 'border-2 border-transparent'
                }`}
            >
              Following
              {followingUsers.length > 0 && (
                <span className="ml-2 nb-tag text-xs">{followingUsers.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 font-black uppercase transition-all relative ${activeTab === 'search' ? 'bg-[#00d4ff] border-2 border-black border-b-0' : 'border-2 border-transparent'
                }`}
            >
              Search
            </button>
          </div>

          {/* Search Form */}
          {activeTab === 'search' && (
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or username..."
                  className="flex-1 px-4 py-3 nb-input text-lg"
                />
                <button type="submit" disabled={loading || !searchQuery.trim()} className="px-6 py-3 nb-button disabled:opacity-50">
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mb-6 p-4 bg-[#ff6b6b] border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {error}
            </div>
          )}

          {/* Search Results */}
          {activeTab === 'search' && (
            <>
              {users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {users.map((user) => (
                    <Link key={user.id} href={`/users/${user.id}`} className="nb-card p-6 group">
                      <div className="flex items-start gap-4 mb-4">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={64}
                            height={64}
                            className="w-16 h-16 border-2 border-black object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-[#4ade80] border-2 border-black font-black text-2xl">
                            {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg truncate">{user.display_name || user.email || 'User'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-sm font-bold text-gray-600">
                              {user.public_rankings_count || 0} rankings
                            </p>
                          </div>
                        </div>
                      </div>
                      {user.bio && <p className="text-sm font-bold text-gray-600 line-clamp-2 mb-4">{user.bio}</p>}
                      <div className="pt-4 border-t-2 border-black">
                        <span className="font-black text-sm uppercase">View Profile →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.trim() && !loading && hasSearched ? (
                <div className="nb-card p-12 text-center">
                  <span className="text-6xl mb-4 block">🔍</span>
                  <p className="font-bold text-gray-600">No users found</p>
                </div>
              ) : null}
            </>
          )}

          {/* Following List */}
          {activeTab === 'following' && (
            <>
              {loadingFollowing ? (
                <div className="py-16">
                  <LoadingScreen message="Loading..." fullScreen={false} />
                </div>
              ) : followingUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {followingUsers.map((user) => (
                    <Link key={user.id} href={`/users/${user.id}`} className="nb-card p-6 group">
                      <div className="flex items-start gap-4 mb-4">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={64}
                            height={64}
                            className="w-16 h-16 border-2 border-black object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-[#4ade80] border-2 border-black font-black text-2xl">
                            {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg truncate">{user.display_name || user.email || 'User'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-sm font-bold text-gray-600">
                              {user.public_rankings_count || 0} rankings
                            </p>
                          </div>
                        </div>
                      </div>
                      {user.bio && <p className="text-sm font-bold text-gray-600 line-clamp-2 mb-4">{user.bio}</p>}
                      <div className="pt-4 border-t-2 border-black">
                        <span className="font-black text-sm uppercase">View Profile →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="nb-card p-12 text-center">
                  <span className="text-6xl mb-4 block">👥</span>
                  <h2 className="text-2xl font-black uppercase mb-2">No Following Yet</h2>
                  <p className="font-bold text-gray-600 mb-6">Use the Search tab to find users</p>
                  <button onClick={() => setActiveTab('search')} className="nb-button px-6 py-3">
                    Search Users
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div >
  )
}
