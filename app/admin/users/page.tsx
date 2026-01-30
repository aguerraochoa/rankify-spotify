'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'

interface AdminUser {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
  rankings_count: number
  public_rankings_count: number
  drafts_count: number
  followers_count: number
  following_count: number
}

function AdminUsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login?next=/admin/users')
          return
        }

        const userId = searchParams?.get('userId')
        if (userId) {
          const response = await fetch(`/api/admin/users/${userId}`)
          if (response.ok) {
            const data = await response.json()
            setSelectedUser(data.user)
          }
        }

        const usersResponse = await fetch('/api/admin/users')
        if (!usersResponse.ok) {
          if (usersResponse.status === 403) {
            setError('You do not have admin access')
          } else {
            setError('Failed to load users')
          }
          return
        }

        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      } catch (err: any) {
        console.error('Error fetching users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [router, supabase.auth, searchParams])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = searchQuery.trim()
        ? `/api/admin/users?search=${encodeURIComponent(searchQuery.trim())}`
        : '/api/admin/users'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (err: any) {
      console.error('Error searching users:', err)
      setError(err.message || 'Failed to search users')
    } finally {
      setLoading(false)
      setHasSearched(true)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin Users" />
        <LoadingScreen message="Loading Users..." fullScreen={false} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin Error" />
        <div className="max-w-2xl mx-auto p-4 md:p-8 pt-12">
          <div className="nb-card p-8 text-center bg-[#ff6b6b]">
            <div className="nb-tag bg-black text-white mb-4">ERROR</div>
            <h1 className="text-3xl font-black uppercase mb-4">{error}</h1>
            <p className="font-bold mb-8 text-black/80">You need admin privileges to view this page.</p>
            <Link href="/admin" className="nb-button inline-block">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader title="Manage Users" />

      <div className="p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:flex md:items-end md:justify-between">
            <div>
              <div className="inline-block bg-[#ffd700] border-2 border-black px-4 py-1 font-black text-xs uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                USER_REGISTRY
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Manage Users
              </h1>
            </div>

            <Link href="/admin" className="nb-button-sm mt-4 md:mt-0">← Dashboard</Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-10 max-w-2xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, username, or display name..."
              className="w-full nb-card p-4 pl-12 font-bold focus:outline-none focus:ring-0"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button type="submit" className="hidden">Search</button>
          </form>

          {/* Users List */}
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="nb-card flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-4 py-4 md:px-6 md:py-5 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#4ade80] border-2 border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {user.display_name?.[0] || user.username?.[0] || user.email?.[0] || '?'}
                  </div>
                  <div>
                    <div className="uppercase font-black text-base tracking-wide flex items-center gap-2">
                      {user.display_name || user.username || 'Anonymous'}
                      {user.is_admin && (
                        <span className="text-[9px] bg-black text-white px-2 py-0.5 tracking-wider">ADMIN</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-600 lowercase">{user.email}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] uppercase tracking-widest">
                  <div>
                    <p className="text-2xl font-black">{user.rankings_count}</p>
                    <p className="text-gray-500">rankings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{user.public_rankings_count}</p>
                    <p className="text-gray-500">public</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{user.drafts_count}</p>
                    <p className="text-gray-500">drafts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{user.followers_count}</p>
                    <p className="text-gray-500">followers</p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className="text-[10px] uppercase italic text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <Link
                      href={`/users/${user.id}`}
                      className="px-4 py-2 nb-button-sm bg-[#ffd700]"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        router.push(`/admin/users?userId=${user.id}`, { scroll: false })
                      }}
                      className="px-4 py-2 nb-button-sm bg-[#00d4ff] text-black"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-12 text-center font-black uppercase text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                {hasSearched ? 'No users found matching your search.' : 'No users registered yet.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div
            className="nb-card p-0 bg-white max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b-4 border-black bg-black text-white flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#4ade80] border-4 border-white flex items-center justify-center font-black text-2xl text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                  {selectedUser.display_name?.[0] || selectedUser.username?.[0] || selectedUser.email?.[0] || '?'}
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight truncate leading-tight">
                    {selectedUser.display_name || selectedUser.username || 'Anonymous'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">{selectedUser.email}</span>
                    {selectedUser.is_admin && (
                      <span className="text-[10px] bg-white text-black px-1.5 py-0.5 font-black">ADMIN</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  router.push('/admin/users', { scroll: false })
                }}
                className="nb-button-sm bg-[#ff6b6b] p-2 hover:translate-x-0 hover:translate-y-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fffdf5]">
              <div className="mb-8 p-6 nb-card bg-white italic font-bold text-gray-600">
                {selectedUser.bio || 'This user hasn\'t written a bio yet.'}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="nb-card p-4 bg-white text-center">
                  <div className="text-3xl font-black">{selectedUser.rankings_count}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400">Total</div>
                </div>
                <div className="nb-card p-4 bg-[#4ade80] text-center">
                  <div className="text-3xl font-black">{selectedUser.public_rankings_count}</div>
                  <div className="text-[10px] font-black uppercase">Public</div>
                </div>
                <div className="nb-card p-4 bg-[#ffd700] text-center">
                  <div className="text-3xl font-black">{selectedUser.drafts_count}</div>
                  <div className="text-[10px] font-black uppercase">Drafts</div>
                </div>
                <div className="nb-card p-4 bg-white text-center">
                  <div className="text-3xl font-black">{selectedUser.followers_count}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400">Followers</div>
                </div>
                <div className="nb-card p-4 bg-white text-center">
                  <div className="text-3xl font-black">{selectedUser.following_count}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400">Following</div>
                </div>
                <div className="nb-card p-4 bg-black text-white text-center">
                  <div className="text-3xl font-black truncate">{new Date(selectedUser.created_at).getFullYear()}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400">Join Year</div>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase text-gray-400 text-center">
                User ID: {selectedUser.id}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t-4 border-black bg-white">
              <Link
                href={`/users/${selectedUser.id}`}
                target="_blank"
                className="nb-button block text-center bg-[#ffd700]"
              >
                View Public Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin Users" />
        <LoadingScreen message="Loading Users..." fullScreen={false} />
      </div>
    }>
      <AdminUsersPageContent />
    </Suspense>
  )
}

