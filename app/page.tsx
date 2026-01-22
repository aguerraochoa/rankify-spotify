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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Rankify</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/rankings"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              My Rankings
            </Link>
            <Link
              href={`/users/${user.id}`}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
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
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        {/* Main CTA */}
        <div className="text-center py-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Rank your music
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
              with precision
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
            Pick a playlist or search for an album, then rank the songs through simple head-to-head comparisons.
          </p>

          <Link
            href="/rank"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Start Ranking
          </Link>
        </div>


      </div>
    </main>
  )
}
