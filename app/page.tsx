'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('auth') === 'success') {
          window.history.replaceState({}, '', '/')
          await supabase.auth.refreshSession()
        }

        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }

        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Error getting user:', error)
        router.push('/login')
      }
    }
    getUser()
  }, [router, supabase.auth])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              Rankify
            </h1>
            <p className="text-slate-400">Rank your music with precision</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/rankings"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              My Rankings
            </Link>
            <Link
              href={`/users/${user.id}`}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main CTA */}
        <div className="text-center py-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Ready to rank?
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-lg mx-auto">
            Pick a playlist or search for an album, then rank the songs through head-to-head comparisons.
          </p>

          <Link
            href="/rank"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Start Ranking
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <div className="text-3xl mb-3">🎵</div>
            <h3 className="text-xl font-bold text-white mb-2">Rank Playlists</h3>
            <p className="text-slate-400">
              Choose any of your Spotify playlists and rank all its songs from best to worst.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <div className="text-3xl mb-3">💿</div>
            <h3 className="text-xl font-bold text-white mb-2">Rank Albums</h3>
            <p className="text-slate-400">
              Search for any album on Spotify and create your definitive track ranking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Comparisons</h3>
            <p className="text-slate-400">
              Binary insertion algorithm means fewer comparisons for accurate rankings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <div className="text-3xl mb-3">📤</div>
            <h3 className="text-xl font-bold text-white mb-2">Share Results</h3>
            <p className="text-slate-400">
              Save your rankings and share them with friends or the community.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
