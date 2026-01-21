'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Check if we just came from auth callback
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('auth') === 'success') {
          // Clear the query param
          window.history.replaceState({}, '', '/')
          // Refresh the session
          await supabase.auth.refreshSession()
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error('Error getting user:', error)
          setLoading(false)
          router.push('/login')
          return
        }

        setUser(user)

        // Check if user is admin
        if (user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', user.id)
              .single()

            setIsAdmin(profile?.is_admin === true)
          } catch (err) {
            console.error('Error checking admin status:', err)
          }
        }

        setLoading(false)
        if (!user) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setLoading(false)
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu) {
        const target = event.target as HTMLElement
        if (!target.closest('.more-menu-container')) {
          setShowMoreMenu(false)
        }
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

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

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center justify-end gap-3 mb-4 relative">
          {/* Desktop: Show all buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/discover"
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Discover
            </Link>
            <Link
              href="/rankings"
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              My Rankings
            </Link>
            <Link
              href={`/users/${user.id}`}
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-5 py-2.5 text-sm font-semibold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-purple-200 dark:border-purple-800/40"
              >
                Admin
              </Link>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
                router.refresh()
              }}
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all shadow-md hover:shadow-lg border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50 rounded-xl"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile: Show More menu */}
          <div className="md:hidden relative more-menu-container">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-10 h-10 flex items-center justify-center text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40 ${showMoreMenu ? 'bg-[#dce8d0] dark:bg-[#3a4d2a]/40' : ''
                }`}
              aria-label="More options"
              aria-expanded={showMoreMenu}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreMenu(false)}
                ></div>
                {/* Menu */}
                <div className="absolute right-0 top-12 z-50 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Link
                    href="/discover"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Discover
                  </Link>
                  <Link
                    href="/rankings"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    My Rankings
                  </Link>
                  <Link
                    href={`/users/${user.id}`}
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] hover:bg-[#e8f0e0] dark:hover:bg-[#2a3d1a]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      setShowMoreMenu(false)
                      await supabase.auth.signOut()
                      router.push('/login')
                      router.refresh()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title row - below buttons */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            Rankify
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
            Rank your music with precision
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <Link
            href="/songs"
            className="group relative bg-white dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 rounded-3xl hover:border-[#6b7d5a] dark:hover:border-[#8a9a7a] shadow-xl hover:shadow-2xl transition-all card-hover"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">Song Ranker</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              Rank your favorite songs using binary insertion comparisons
            </p>
          </Link>

          <div className="group relative bg-white dark:bg-slate-800 p-8 border-2 border-slate-300 dark:border-slate-600 rounded-3xl shadow-lg opacity-75 cursor-not-allowed">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-gradient-to-r from-[#c97d4a] to-[#d98d5a] text-white text-xs font-bold rounded-full shadow-md uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-[#c97d4a] to-[#d98d5a] rounded-2xl flex items-center justify-center mb-6 shadow-lg opacity-60">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-slate-700 dark:text-slate-300">Album Ranker</h2>
            <p className="text-slate-500 dark:text-slate-500 text-lg leading-relaxed">
              Rank albums with Beli-style preference system
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This feature is under development</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

