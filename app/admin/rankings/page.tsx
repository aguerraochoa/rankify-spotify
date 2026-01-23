'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/NavHeader'

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
          router.push('/login?next=/admin/rankings')
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
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin Rankings" />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-8 border-black border-t-[#ff90e8] animate-spin mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
          <p className="font-black uppercase text-xl">Loading Rankings...</p>
        </div>
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
      <NavHeader title="Manage Rankings" />

      <div className="p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:flex md:items-end md:justify-between">
            <div>
              <div className="inline-block bg-[#ff90e8] border-2 border-black px-4 py-1 font-black text-xs uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                RANKING_DATABASE
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Manage Rankings
              </h1>
            </div>

            <Link href="/admin" className="nb-button-sm mt-4 md:mt-0">← Dashboard</Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="font-black uppercase text-xs">Filter Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 font-black uppercase text-xs border-2 border-black transition-all ${statusFilter === 'all' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-100'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 font-black uppercase text-xs border-2 border-black transition-all ${statusFilter === 'completed' ? 'bg-[#4ade80] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-100'
                }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 font-black uppercase text-xs border-2 border-black transition-all ${statusFilter === 'draft' ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-100'
                }`}
            >
              Drafts
            </button>
          </div>

          {/* Rankings List */}
          <div className="nb-card p-0 bg-white overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-black text-white border-b-4 border-black font-black uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Ranking Name</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Songs</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-black font-bold">
                {rankings.map((ranking) => (
                  <tr key={ranking.id} className="hover:bg-[#fffdf5] transition-colors">
                    <td className="px-6 py-4">
                      <div className="uppercase font-black truncate max-w-[200px]" title={ranking.name || 'Unnamed'}>
                        {ranking.name || 'Unnamed'}
                      </div>
                      {ranking.is_public && (
                        <span className="text-[10px] bg-[#4ade80] border border-black px-1 py-0.5 mt-1 inline-block uppercase font-black">Public</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="truncate max-w-[150px]">{ranking.owner_username || ranking.owner_display_name || 'Anonymous'}</div>
                      <div className="text-[10px] text-gray-400 lowercase truncate max-w-[150px]">{ranking.owner_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black">{ranking.song_count}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] border border-black px-2 py-1 uppercase font-black ${ranking.status === 'draft' ? 'bg-[#ffd700]' : 'bg-white'
                        }`}>
                        {ranking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] uppercase">{new Date(ranking.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRanking(ranking)
                            router.push(`/admin/rankings?rankingId=${ranking.id}`, { scroll: false })
                          }}
                          className="nb-button-sm text-[10px] px-2 py-1 bg-white hover:bg-black hover:text-white"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(ranking.id)}
                          disabled={deleting === ranking.id}
                          className="nb-button-sm text-[10px] px-2 py-1 bg-[#ff6b6b] disabled:opacity-50"
                        >
                          {deleting === ranking.id ? '...' : 'Del'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankings.length === 0 && (
              <div className="p-20 text-center font-black uppercase text-gray-400">No rankings found</div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRanking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div
            className="nb-card p-0 bg-white max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b-4 border-black bg-black text-white flex justify-between items-start">
              <div className="min-w-0">
                <div className="mb-2">
                  <span className={`text-[10px] border border-white px-2 py-0.5 uppercase font-black mr-2 ${selectedRanking.status === 'draft' ? 'bg-[#ffd700] text-black border-black' : 'bg-transparent text-white'
                    }`}>
                    {selectedRanking.status}
                  </span>
                  {selectedRanking.is_public && (
                    <span className="text-[10px] bg-[#4ade80] text-black px-2 py-0.5 uppercase font-black">Public</span>
                  )}
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight truncate leading-tight">
                  {selectedRanking.name || 'Unnamed Ranking'}
                </h2>
                <div className="text-xs font-bold text-gray-400 mt-1">
                  ID: {selectedRanking.id}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRanking(null)
                  router.push('/admin/rankings', { scroll: false })
                }}
                className="nb-button-sm bg-[#ff6b6b] p-2 hover:translate-x-0 hover:translate-y-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#fffdf5]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="nb-card p-4 bg-white">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Owner Info</span>
                  <div className="font-black uppercase text-sm truncate">{selectedRanking.owner_display_name || selectedRanking.owner_username || 'Anonymous'}</div>
                  <div className="text-xs font-bold text-gray-500 lowercase truncate">{selectedRanking.owner_email}</div>
                </div>
                <div className="nb-card p-4 bg-white">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Song Stats</span>
                  <div className="text-2xl font-black uppercase">{selectedRanking.song_count} Songs</div>
                </div>
                <div className="nb-card p-4 bg-white">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Metadata</span>
                  <div className="text-[10px] font-black uppercase">Created: {new Date(selectedRanking.created_at).toLocaleString()}</div>
                  <div className="text-[10px] font-black uppercase">Updated: {new Date(selectedRanking.updated_at).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center">#</span>
                  Ranked List
                </h3>
                <div className="space-y-3">
                  {selectedRanking.songs.map((song, index) => (
                    <div key={index} className="nb-card p-3 bg-white flex items-center gap-4 hover:translate-x-1 transition-transform">
                      <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-black bg-black text-white shrink-0">
                        {song.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-sm uppercase truncate">{song.title}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase truncate">{song.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t-4 border-black bg-white flex gap-4">
              <Link
                href={`/rankings/${selectedRanking.id}`}
                target="_blank"
                className="flex-1 nb-button text-center bg-[#4ade80]"
              >
                View Live
              </Link>
              <button
                onClick={() => handleDelete(selectedRanking.id)}
                disabled={deleting === selectedRanking.id}
                className="flex-1 nb-button bg-[#ff6b6b] disabled:opacity-50"
              >
                {deleting === selectedRanking.id ? 'Deleting...' : 'Delete Ranking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminRankingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fffdf5]">
        <NavHeader title="Admin Rankings" />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-8 border-black border-t-[#ff90e8] animate-spin mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
          <p className="font-black uppercase text-xl">Loading Rankings...</p>
        </div>
      </div>
    }>
      <AdminRankingsPageContent />
    </Suspense>
  )
}

