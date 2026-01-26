'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'

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
          router.push('/login?next=/admin')
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
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin" />
        <LoadingScreen message="Loading Dashboard..." fullScreen={false} />
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
            <Link
              href="/"
              className="nb-button inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="min-h-screen bg-[#fffdf5]">
      <NavHeader title="Admin Dashboard" />

      <div className="p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-10 md:flex md:items-end md:justify-between">
            <div>
              <div className="inline-block bg-[#4ade80] border-2 border-black px-4 py-1 font-black text-xs uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                SYSTEM_OVERVIEW
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Admin Dashboard
              </h1>
            </div>

            <div className="mt-6 md:mt-0 flex gap-2">
              <Link href="/admin/users" className="nb-button-sm bg-[#ffd700]">Manage Users</Link>
              <Link href="/admin/rankings" className="nb-button-sm bg-[#ff90e8]">Manage Rankings</Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
            <div className="nb-card p-6 bg-white flex flex-col justify-between">
              <span className="text-sm font-black uppercase text-gray-500">Total Users</span>
              <span className="text-5xl font-black mt-2">{stats.totalUsers}</span>
            </div>
            <div className="nb-card p-6 bg-[#ffd700] flex flex-col justify-between">
              <span className="text-sm font-black uppercase text-black">Total Rankings</span>
              <span className="text-5xl font-black mt-2">{stats.totalRankings}</span>
            </div>
            <div className="nb-card p-6 bg-[#4ade80] flex flex-col justify-between">
              <span className="text-sm font-black uppercase text-black">Public Lists</span>
              <span className="text-5xl font-black mt-2">{stats.totalPublicRankings}</span>
            </div>
            <div className="nb-card p-6 bg-[#ff90e8] flex flex-col justify-between">
              <span className="text-sm font-black uppercase text-black">Drafts</span>
              <span className="text-5xl font-black mt-2">{stats.totalDrafts}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Users */}
            <div className="nb-card p-0 bg-white overflow-hidden">
              <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center">
                <h2 className="font-black uppercase tracking-wider">Recent Users</h2>
                <Link href="/admin/users" className="text-xs font-bold hover:underline">View All →</Link>
              </div>
              <div className="divide-y-2 divide-black">
                {stats.recentUsers.length > 0 ? (
                  stats.recentUsers.map((user) => (
                    <Link
                      key={user.id}
                      href={`/admin/users?userId=${user.id}`}
                      className="flex items-center p-4 hover:bg-[#fffdf5] transition-colors group"
                    >
                      <div className="w-10 h-10 bg-[#4ade80] border-2 border-black flex items-center justify-center font-black mr-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {user.display_name?.[0] || user.username?.[0] || user.email?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate uppercase group-hover:text-[#4ade80] transition-colors">
                          {user.display_name || user.username || 'Anonymous'}
                        </div>
                        <div className="text-xs font-bold text-gray-500 truncate lowercase">
                          {user.email}
                        </div>
                      </div>
                      <div className="text-[10px] font-black uppercase text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center font-bold text-gray-500 uppercase">No users found</div>
                )}
              </div>
            </div>

            {/* Recent Rankings */}
            <div className="nb-card p-0 bg-white overflow-hidden">
              <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center">
                <h2 className="font-black uppercase tracking-wider">Recent Rankings</h2>
                <Link href="/admin/rankings" className="text-xs font-bold hover:underline">View All →</Link>
              </div>
              <div className="divide-y-2 divide-black">
                {stats.recentRankings.length > 0 ? (
                  stats.recentRankings.map((ranking) => (
                    <Link
                      key={ranking.id}
                      href={`/admin/rankings?rankingId=${ranking.id}`}
                      className="flex items-center p-4 hover:bg-[#fffdf5] transition-colors group"
                    >
                      <div className="w-10 h-10 bg-[#ff90e8] border-2 border-black flex items-center justify-center text-lg mr-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        📊
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate uppercase group-hover:text-[#ff90e8] transition-colors">
                          {ranking.name || 'Unnamed Ranking'}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">
                          {ranking.song_count} songs • {ranking.owner_username || ranking.owner_email || 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ranking.is_public && (
                          <span className="text-[10px] bg-[#4ade80] border border-black px-1.5 py-0.5 font-black uppercase">Public</span>
                        )}
                        <span className={`text-[10px] border border-black px-1.5 py-0.5 font-black uppercase ${ranking.status === 'draft' ? 'bg-[#ffd700]' : 'bg-white'
                          }`}>
                          {ranking.status}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center font-bold text-gray-500 uppercase">No rankings found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

