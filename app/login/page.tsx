'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [authInProgress, setAuthInProgress] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      // CRITICAL: Do NOT auto-redirect if there's an error or if we're specifically here to re-auth
      if (urlParams.has('error')) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const nextUrl = urlParams.get('next') || '/'
        router.push(nextUrl)
        router.refresh()
      }
    }
    checkUser()
  }, [router, supabase.auth])

  // Check for error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const details = urlParams.get('details')

    if (error === 'auth_failed') {
      setMessage(details || 'Authentication failed. Please try again.')
    } else if (error === 'spotify_expired') {
      setMessage('Your Spotify session has expired. Please log in again to continue.')
    }

    // We keep the error in the URL for a bit to ensure checkUser sees it
    // or we just don't clear it at all until the user interacts.
    // Let's at least not clear it immediately if we want to be safe.
  }, [])

  const handleSpotifyLogin = async () => {
    if (authInProgress) return

    setAuthInProgress(true)
    setLoading(true)
    setMessage('')

    const urlParams = new URLSearchParams(window.location.search)
    const nextUrl = urlParams.get('next') || '/'
    const isError = urlParams.has('error')

    // Store nextUrl in a cookie that auth callback can read
    document.cookie = `sb-next-url=${encodeURIComponent(nextUrl)}; path=/; max-age=300; SameSite=Lax`

    const callbackUrl = new URL('/auth/callback', window.location.origin)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: 'user-read-email user-read-private playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private',
        queryParams: {
          // Force the account picker if the user was sent here due to an error
          show_dialog: isError ? 'true' : 'false'
        }
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      setAuthInProgress(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-[#fffdf5]">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="inline-block border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6 transform -rotate-2 overflow-hidden bg-white">
            <Image
              src="/logo.png"
              alt="Rankify Logo"
              width={96}
              height={96}
              className="w-24 h-24 object-cover scale-110"
              priority
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase mb-3">
            Rankify
          </h1>
          <p className="text-lg font-bold text-gray-700">
            Rank your favorite playlists and albums
          </p>
        </div>

        {/* Login Card */}
        <div className="nb-card p-6 md:p-8 space-y-6">
          <div className="nb-tag transform -rotate-1 mb-4">
            LOGIN_REQUIRED
          </div>

          {/* Spotify Login Button */}
          <button
            onClick={handleSpotifyLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#1DB954] border-4 border-black text-white font-black text-lg uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span>Continue with Spotify</span>
              </>
            )}
          </button>

          {message && (
            <div className="p-4 bg-[#ff6b6b] border-2 border-black text-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {message}
            </div>
          )}

          <p className="text-xs text-center font-bold text-gray-600">
            By signing in, you agree to Rankify&apos;s terms of service
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="nb-card-sm p-4 text-center">
            <div className="text-2xl mb-2">🎵</div>
            <p className="text-sm font-bold">Rank Playlists</p>
          </div>
          <div className="nb-card-sm p-4 text-center">
            <div className="text-2xl mb-2">💿</div>
            <p className="text-sm font-bold">Rank Albums</p>
          </div>
          <div className="nb-card-sm p-4 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-bold">Save Rankings</p>
          </div>
          <div className="nb-card-sm p-4 text-center">
            <div className="text-2xl mb-2">📤</div>
            <p className="text-sm font-bold">Share Results</p>
          </div>
        </div>
      </div>
    </div>
  )
}
