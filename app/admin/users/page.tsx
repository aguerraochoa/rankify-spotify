'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const userId = searchParams.get('userId')
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
    }
  }

  if (loading && users.length === 0) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading...</p>
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
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Users
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage all users</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#4a5d3a] dark:hover:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 rounded-lg transition-all"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-lg border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            Users
          </Link>
          <Link
            href="/admin/rankings"
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#4a5d3a] dark:hover:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 rounded-lg transition-all"
          >
            Rankings
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative flex items-center">
            <svg className="absolute left-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, username, or display name..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-[#6b7d5a] focus:outline-none transition-all"
            />
          </div>
        </form>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Details</h2>
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    router.push('/admin/users')
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Email</div>
                  <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Username</div>
                  <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.username || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Display Name</div>
                  <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.display_name || 'N/A'}</div>
                </div>
                {selectedUser.bio && (
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Bio</div>
                    <div className="text-lg text-slate-900 dark:text-slate-100">{selectedUser.bio}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Rankings</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.rankings_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Public Rankings</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.public_rankings_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Drafts</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.drafts_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Followers</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.followers_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Following</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.following_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Admin</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedUser.is_admin ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Created</div>
                  <div className="text-lg text-slate-900 dark:text-slate-100">{new Date(selectedUser.created_at).toLocaleString()}</div>
                </div>
                <Link
                  href={`/users/${selectedUser.id}`}
                  className="block w-full text-center px-4 py-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-xl transition-all"
                >
                  View Public Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Rankings</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {user.display_name || user.username || user.email || 'User'}
                      </div>
                      {user.username && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                      )}
                      {user.is_admin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 mt-1">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{user.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {user.rankings_count} ({user.public_rankings_count} public, {user.drafts_count} drafts)
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          router.push(`/admin/users?userId=${user.id}`)
                        }}
                        className="text-[#4a5d3a] dark:text-[#6b7d5a] hover:text-[#5a6d4a] dark:hover:text-[#7b8d6a] font-medium text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No users found</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <AdminUsersPageContent />
    </Suspense>
  )
}

