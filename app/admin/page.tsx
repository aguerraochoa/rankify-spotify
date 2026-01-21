'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AdminStats {
  totalUsers: number
  totalRankings: number
  totalPublicRankings: number
  totalDrafts: number
  recentUsers: Array<{
    id: string
    email: string | null
    username: string | null
    display_name: string | null
    created_at: string
  }>
  recentRankings: Array<{
    id: string
    name: string | null
    user_id: string
    song_count: number
    is_public: boolean
    status: string
    created_at: string
    owner_email: string | null
    owner_username: string | null
  }>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const response = await fetch('/api/admin/stats')
        if (!response.ok) {
          if (response.status === 403) {
            setError('You do not have admin access')
          } else {
            setError('Failed to load admin stats')
          }
          return
        }

        const data = await response.json()
        setStats(data)
      } catch (err: any) {
        console.error('Error fetching stats:', err)
        setError(err.message || 'Failed to load admin stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router, supabase.auth])

  if (loading) {
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

  if (!stats) return null

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Overview of Rankify</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="inline md:hidden">Home</span>
            <span className="hidden md:inline">Back to Home</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-lg border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#4a5d3a] dark:hover:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 rounded-lg transition-all"
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {stats.totalUsers}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {stats.totalRankings}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Rankings</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {stats.totalPublicRankings}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Public Rankings</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {stats.totalDrafts}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Drafts</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Users</h2>
            <div className="space-y-3">
              {stats.recentUsers.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users?userId=${user.id}`}
                    className="block p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {user.display_name || user.username || user.email || 'User'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {user.email}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400">No users yet</p>
              )}
            </div>
          </div>

          {/* Recent Rankings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Rankings</h2>
            <div className="space-y-3">
              {stats.recentRankings.length > 0 ? (
                stats.recentRankings.map((ranking) => (
                  <Link
                    key={ranking.id}
                    href={`/admin/rankings?rankingId=${ranking.id}`}
                    className="block p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {ranking.name || 'Unnamed Ranking'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {ranking.song_count} songs • {ranking.owner_email || ranking.owner_username || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ranking.status === 'draft'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                        {ranking.status}
                      </span>
                      {ranking.is_public && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          Public
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400">No rankings yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

