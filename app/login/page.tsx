'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const urlParams = new URLSearchParams(window.location.search)
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
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const handleSpotifyLogin = async () => {
    setLoading(true)
    setMessage('')

    const urlParams = new URLSearchParams(window.location.search)
    const nextUrl = urlParams.get('next') || '/'
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextUrl)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: 'user-read-email user-read-private playlist-read-private playlist-read-collaborative user-library-read',
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
            Rankify
          </h1>
          <p className="text-slate-400 text-lg">
            Rank your favorite playlists and albums
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {/* Spotify Login Button */}
          <button
            onClick={handleSpotifyLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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
            <div className="p-4 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30">
              {message}
            </div>
          )}

          <p className="text-xs text-center text-slate-500">
            By signing in, you agree to Rankify&apos;s terms of service
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-2 gap-4 text-center">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-2">🎵</div>
            <p className="text-sm text-slate-400">Rank your playlists</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-2">💿</div>
            <p className="text-sm text-slate-400">Rank any album</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-400">Save your rankings</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-2">📤</div>
            <p className="text-sm text-slate-400">Share with friends</p>
          </div>
        </div>
      </div>
    </div>
  )
}
