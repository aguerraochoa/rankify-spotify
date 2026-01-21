'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

interface AdminRanking {
  id: string
  user_id: string
  name: string | null
  songs: Array<{
    title: string
    artist: string
    rank: number
  }>
  song_count: number
  is_public: boolean
  status: 'draft' | 'completed'
  share_token: string | null
  created_at: string
  updated_at: string
  owner_email: string | null
  owner_username: string | null
  owner_display_name: string | null
}

function AdminRankingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rankings, setRankings] = useState<AdminRanking[]>([])
  const [selectedRanking, setSelectedRanking] = useState<AdminRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'completed'>('all')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const rankingId = searchParams.get('rankingId')
        if (rankingId) {
          const response = await fetch(`/api/admin/rankings/${rankingId}`)
          if (response.ok) {
            const data = await response.json()
            setSelectedRanking(data.ranking)
          }
        }

        await loadRankings()
      } catch (err: any) {
        console.error('Error fetching rankings:', err)
        setError(err.message || 'Failed to load rankings')
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase.auth, searchParams])

  const loadRankings = useCallback(async () => {
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/rankings'
        : `/api/admin/rankings?status=${statusFilter}`
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have admin access')
        } else {
          setError('Failed to load rankings')
        }
        return
      }

      const data = await response.json()
      setRankings(data.rankings || [])
    } catch (err: any) {
      console.error('Error loading rankings:', err)
      setError(err.message || 'Failed to load rankings')
    }
  }, [statusFilter])

  useEffect(() => {
    if (!loading) {
      loadRankings()
    }
  }, [statusFilter, loading, loadRankings])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedRanking) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedRanking])

  const handleDelete = async (rankingId: string) => {
    if (!confirm('Are you sure you want to delete this ranking? This action cannot be undone.')) {
      return
    }

    setDeleting(rankingId)
    try {
      const response = await fetch(`/api/admin/rankings/${rankingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete ranking')
      }

      // Remove from list
      setRankings(rankings.filter(r => r.id !== rankingId))
      if (selectedRanking?.id === rankingId) {
        setSelectedRanking(null)
        router.push('/admin/rankings')
      }
    } catch (err: any) {
      console.error('Error deleting ranking:', err)
      alert('Failed to delete ranking. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading && rankings.length === 0) {
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
              Rankings
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage all rankings</p>
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
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#4a5d3a] dark:hover:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 rounded-lg transition-all"
          >
            Users
          </Link>
          <Link
            href="/admin/rankings"
            className="px-4 py-2 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-lg border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            Rankings
          </Link>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${statusFilter === 'all'
              ? 'bg-[#4a5d3a] text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${statusFilter === 'completed'
              ? 'bg-[#4a5d3a] text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${statusFilter === 'draft'
              ? 'bg-[#4a5d3a] text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            Drafts
          </button>
        </div>

        {/* Ranking Details Modal */}
        {selectedRanking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedRanking.name || 'Unnamed Ranking'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedRanking(null)
                    router.push('/admin/rankings')
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Owner</div>
                    <div
                      className="text-lg font-medium text-slate-900 dark:text-slate-100 truncate"
                      title={selectedRanking.owner_display_name || selectedRanking.owner_username || selectedRanking.owner_email || 'Unknown'}
                    >
                      {selectedRanking.owner_display_name || selectedRanking.owner_username || selectedRanking.owner_email || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Songs</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedRanking.song_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Status</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      <span className={`px-2 py-1 rounded-full text-sm ${selectedRanking.status === 'draft'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                        {selectedRanking.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Visibility</div>
                    <div className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      {selectedRanking.is_public ? 'Public' : 'Private'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Created</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">{new Date(selectedRanking.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Updated</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">{new Date(selectedRanking.updated_at).toLocaleString()}</div>
                  </div>
                </div>
                {selectedRanking.share_token && (
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Share Token</div>
                    <div className="text-sm font-mono text-slate-900 dark:text-slate-100">{selectedRanking.share_token}</div>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Songs</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedRanking.songs.map((song, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-lg font-bold text-white text-xs">
                        #{song.rank}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{song.title}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{song.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/rankings/${selectedRanking.id}`}
                  className="flex-1 text-center px-4 py-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-xl transition-all"
                >
                  View Ranking
                </Link>
                <button
                  onClick={() => handleDelete(selectedRanking.id)}
                  disabled={deleting === selectedRanking.id}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {deleting === selectedRanking.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rankings List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Songs</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {rankings.map((ranking) => (
                  <tr key={ranking.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {ranking.name || 'Unnamed Ranking'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {ranking.is_public && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            Public
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {ranking.owner_display_name || ranking.owner_username || ranking.owner_email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{ranking.song_count}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ranking.status === 'draft'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                        {ranking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(ranking.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedRanking(ranking)
                            router.push(`/admin/rankings?rankingId=${ranking.id}`)
                          }}
                          className="text-[#4a5d3a] dark:text-[#6b7d5a] hover:text-[#5a6d4a] dark:hover:text-[#7b8d6a] font-medium text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(ranking.id)}
                          disabled={deleting === ranking.id}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm disabled:opacity-50"
                        >
                          {deleting === ranking.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rankings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No rankings found</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function AdminRankingsPage() {
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
      <AdminRankingsPageContent />
    </Suspense>
  )
}

