'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavHeader } from '@/components/NavHeader'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
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

        try {
          const profileRes = await fetch(`/api/users/${user.id}`)
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            if (profileData.profile?.is_admin) {
              setIsAdmin(true)
            }
          }
        } catch (profileError) {
          console.error('Failed to load profile:', profileError)
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
      <main className="min-h-screen flex items-center justify-center bg-[#fffdf5]">
        <div className="w-12 h-12 border-4 border-black border-t-[#ff90e8] animate-spin"></div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-[#fffdf5]">
      <NavHeader showDiscover />

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-16">
        {/* Hero Section */}
        <div className="text-center py-8 md:py-16">
          {/* Decorative Tag */}
          <div className="inline-block bg-[#ffd700] border-2 border-black px-4 py-2 font-black text-sm uppercase transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            🎵 MUSIC_RANKING_APP
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase mb-6 leading-tight">
            Rank Your
            <span className="block bg-[#ff90e8] border-4 border-black inline-block px-4 py-2 transform rotate-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-2">
              Music
            </span>
          </h1>

          <p className="text-lg md:text-xl font-bold text-black mb-10 max-w-lg mx-auto leading-relaxed">
            Pick a playlist or search for an album, then rank the songs through head-to-head battles.
          </p>

          <Link
            href="/rank"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#ff90e8] border-4 border-black text-black text-lg font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Start Ranking
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-16">
          <div className="nb-card p-6">
            <div className="w-12 h-12 bg-[#00d4ff] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-2xl">🎧</span>
            </div>
            <h3 className="font-black text-lg uppercase mb-2">Pick Your Music</h3>
            <p className="font-bold text-sm text-gray-700">
              Choose from your Spotify playlists or search for any album
            </p>
          </div>

          <div className="nb-card p-6">
            <div className="w-12 h-12 bg-[#ffd700] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-2xl">⚔️</span>
            </div>
            <h3 className="font-black text-lg uppercase mb-2">Head to Head</h3>
            <p className="font-bold text-sm text-gray-700">
              Compare songs one at a time to build your perfect ranking
            </p>
          </div>

          <div className="nb-card p-6">
            <div className="w-12 h-12 bg-[#ff90e8] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-black text-lg uppercase mb-2">Share Results</h3>
            <p className="font-bold text-sm text-gray-700">
              Save your rankings and share them with friends
            </p>
          </div>
        </div>

        {/* User Actions */}
        <div className="border-t-4 border-black py-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/rankings"
            className="nb-button-outline px-6 py-3"
          >
            View My Rankings
          </Link>
          <Link
            href={`/users/${user.id}`}
            className="nb-button-outline px-6 py-3"
          >
            My Profile
          </Link>
          {isAdmin && (
            <Link href="/admin" className="nb-button px-6 py-3">
              Admin Dashboard
            </Link>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="px-6 py-3 bg-white border-2 border-black font-black uppercase hover:bg-[#ff6b6b] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  )
}
