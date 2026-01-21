'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compareRankings, getSongId, type ComparisonResult } from '@/lib/ranking/compareRankings'
import { generateComparisonImage } from '@/lib/image/generateRankingImage'

interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  rank?: number
}

interface RankedList {
  id: string
  user_id: string
  name: string | null
  songs: RankedSong[]
  song_count: number
  is_public: boolean
  created_at: string
}

interface User {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
}

export default function ComparePage() {
  const router = useRouter()
  const params = useParams()
  const theirId = params.theirId as string
  const yourId = params.yourId as string
  const [yourRanking, setYourRanking] = useState<RankedList | null>(null)
  const [theirRanking, setTheirRanking] = useState<RankedList | null>(null)
  const [yourUser, setYourUser] = useState<User | null>(null)
  const [theirUser, setTheirUser] = useState<User | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [mobileSideBySide, setMobileSideBySide] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Fetch both rankings
        const [yourResponse, theirResponse] = await Promise.all([
          fetch(`/api/ranked-lists/${yourId}`),
          fetch(`/api/ranked-lists/${theirId}`),
        ])

        if (!yourResponse.ok || !theirResponse.ok) {
          throw new Error('Failed to fetch rankings')
        }

        const yourData = await yourResponse.json()
        const theirData = await theirResponse.json()

        setYourRanking(yourData.list)
        setTheirRanking(theirData.list)

        // Fetch user info
        const [yourUserResponse, theirUserResponse] = await Promise.all([
          fetch(`/api/users/${yourData.list.user_id}`),
          fetch(`/api/users/${theirData.list.user_id}`),
        ])

        if (yourUserResponse.ok) {
          const yourUserData = await yourUserResponse.json()
          setYourUser(yourUserData.profile)
        }

        if (theirUserResponse.ok) {
          const theirUserData = await theirUserResponse.json()
          setTheirUser(theirUserData.profile)
        }

        // Calculate comparison
        const comparisonResult = compareRankings(yourData.list.songs, theirData.list.songs)
        setComparison(comparisonResult)
      } catch (err: any) {
        console.error('Error fetching comparison data:', err)
        setError(err.message || 'Failed to load comparison')
      } finally {
        setLoading(false)
      }
    }

    if (yourId && theirId) {
      fetchData()
    }
  }, [yourId, theirId, router, supabase.auth])

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading comparison...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !yourRanking || !theirRanking || !comparison) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Failed to load comparison'}</p>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Back to Rankings
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const getYourDisplayName = () => {
    return yourUser?.display_name || yourUser?.username || yourUser?.email || 'You'
  }

  const getTheirDisplayName = () => {
    return theirUser?.display_name || theirUser?.username || theirUser?.email || 'User'
  }

  const handleDownloadImage = async () => {
    if (!yourRanking || !theirRanking || !comparison) return

    setIsGeneratingImage(true)

    const timeoutId = setTimeout(() => {
      setIsGeneratingImage(false)
      alert('The download is taking longer than expected. Please try again.')
    }, 30000)

    try {
      await generateComparisonImage({
        yourRankingName: yourRanking.name,
        theirRankingName: theirRanking.name,
        yourDisplayName: getYourDisplayName(),
        theirDisplayName: getTheirDisplayName(),
        similarity: comparison.similarity,
        sharedSongs: comparison.sharedSongs,
        onlyInYourList: comparison.onlyInYourList,
        onlyInTheirList: comparison.onlyInTheirList,
        created_at: yourRanking.created_at,
      })
      clearTimeout(timeoutId)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Error generating image:', err)

      let errorMessage = 'Failed to generate image. '
      if (err.message?.includes('timeout')) {
        errorMessage += 'The operation timed out. Please try again.'
      } else if (err.message?.includes('blob')) {
        errorMessage += 'Could not create the image file. Please try again.'
      } else {
        errorMessage += err.message || 'Please try again.'
      }

      alert(errorMessage)
    } finally {
      setIsGeneratingImage(false)
    }
  }


  // Create a map of position differences for their songs
  const theirSongIndicators = new Map<string, { indicator: 'up' | 'down' | 'same' | 'unique', diffAmount: number }>()
  const yourSongIds = new Set(yourRanking.songs.map(getSongId))

  comparison.sharedSongs.forEach(item => {
    const id = getSongId(item.song)
    theirSongIndicators.set(id, {
      indicator: item.indicator,
      diffAmount: item.diffAmount,
    })
  })

  // Mark unique songs
  theirRanking.songs.forEach(song => {
    const id = getSongId(song)
    if (!yourSongIds.has(id)) {
      theirSongIndicators.set(id, { indicator: 'unique', diffAmount: 0 })
    }
  })

  // Mark your unique songs
  const theirSongIds = new Set(theirRanking.songs.map(getSongId))
  const yourUniqueSongs = yourRanking.songs.filter(song => !theirSongIds.has(getSongId(song)))

  // Filter to only shared songs, maintaining original order
  const yourSharedSongs = yourRanking.songs.filter(song => theirSongIds.has(getSongId(song)))
  const theirSharedSongs = theirRanking.songs.filter(song => yourSongIds.has(getSongId(song)))

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-white to-[#f5f1e8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        {/* Clean Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Comparison
            </h1>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile View Toggle - Only visible on mobile */}
              <button
                onClick={() => setMobileSideBySide(!mobileSideBySide)}
                className="lg:hidden flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-lg shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
                title={mobileSideBySide ? "Switch to stacked view" : "Switch to side-by-side view"}
              >
                {mobileSideBySide ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="hidden xs:inline">Stacked</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <span className="hidden xs:inline">Side-by-side</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={isGeneratingImage}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">{isGeneratingImage ? 'Downloading...' : 'Download'}</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Similarity</p>
                <p className="text-2xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{comparison.similarity}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Lists - Only Shared Songs */}
        <div className={`grid ${mobileSideBySide ? 'grid-cols-2' : 'grid-cols-1'} lg:grid-cols-2 ${mobileSideBySide ? 'gap-2' : 'gap-6'} lg:gap-6 mb-8`}>
          {/* Your Ranking - Shared Songs Only */}
          <div className="min-w-0">
            <div className={`${mobileSideBySide ? 'mb-2' : 'mb-4'} lg:mb-4 flex items-center ${mobileSideBySide ? 'gap-1.5' : 'gap-3'} lg:gap-3`}>
              <div className={`${mobileSideBySide ? 'w-6 h-6' : 'w-10 h-10'} lg:w-10 lg:h-10 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-full font-bold text-white ${mobileSideBySide ? 'text-xs' : 'text-base'} lg:text-base shadow-lg flex-shrink-0`}>
                {(getYourDisplayName().charAt(0).toUpperCase())}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`${mobileSideBySide ? 'text-xs' : 'text-xl'} lg:text-xl font-bold text-slate-900 dark:text-slate-100 truncate`}>
                  {yourRanking.name || 'Your Ranking'}
                </h2>
                <p className={`${mobileSideBySide ? 'text-[9px]' : 'text-sm'} lg:text-sm text-slate-500 dark:text-slate-400 truncate`}>{getYourDisplayName()}</p>
              </div>
            </div>
            <div className={mobileSideBySide ? 'space-y-1.5 lg:space-y-3' : 'space-y-3'}>
              {yourSharedSongs.map((song, index) => {
                return (
                  <div
                    key={index}
                    className={`flex items-center ${mobileSideBySide ? 'gap-1.5 lg:gap-4 p-1.5 lg:p-4 rounded-lg lg:rounded-2xl border lg:border-2 shadow-sm lg:shadow-lg hover:shadow-md lg:hover:shadow-xl' : 'gap-4 p-4 rounded-2xl border-2 shadow-lg hover:shadow-xl'} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all`}
                  >
                    <div className={`${mobileSideBySide ? 'w-6 h-6' : 'w-16 h-16'} lg:w-16 lg:h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] ${mobileSideBySide ? 'rounded' : 'rounded-xl'} lg:rounded-xl font-bold text-white ${mobileSideBySide ? 'text-[10px]' : 'text-xl'} lg:text-xl ${mobileSideBySide ? 'shadow-md' : 'shadow-lg'} lg:shadow-lg flex-shrink-0`}>
                      #{index + 1}
                    </div>
                    <div className={`relative ${mobileSideBySide ? 'w-6 h-6' : 'w-16 h-16'} lg:w-16 lg:h-16 flex-shrink-0 ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>
                      <div className={`song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] ${mobileSideBySide ? 'rounded-lg' : 'rounded-xl'} lg:rounded-xl ${mobileSideBySide ? 'shadow-sm' : 'shadow-md'} lg:shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300`}>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                        <svg className={`${mobileSideBySide ? 'w-4 h-4' : 'w-8 h-8'} lg:w-8 lg:h-8 text-white relative z-10`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      {song.cover_art_url && (
                        <Image
                          src={song.cover_art_url}
                          alt={song.title}
                          fill
                          className={`absolute inset-0 w-full h-full object-cover ${mobileSideBySide ? 'rounded-lg' : 'rounded-xl'} lg:rounded-xl ${mobileSideBySide ? 'shadow-sm' : 'shadow-md'} lg:shadow-md transition-opacity duration-300 opacity-0`}
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={() => {
                            const container = document.querySelector(`[data-song-container="${song.musicbrainz_id || song.title}"]`)
                            if (container) {
                              const img = container.querySelector('img') as HTMLElement
                              const placeholder = container.querySelector('.song-placeholder') as HTMLElement
                              if (img) img.style.opacity = '1'
                              if (placeholder) placeholder.style.opacity = '0'
                            }
                          }}
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold ${mobileSideBySide ? 'text-[10px]' : 'text-lg'} lg:text-lg text-slate-900 dark:text-slate-100 truncate`}>{song.title}</p>
                      <p className={`${mobileSideBySide ? 'text-[9px]' : 'text-base'} lg:text-base text-slate-600 dark:text-slate-400 truncate ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>{song.artist}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Only in Your List - Below Your Ranking */}
            {comparison.onlyInYourList.length > 0 && (
              <div className={mobileSideBySide ? 'mt-3 lg:mt-4' : 'mt-4'}>
                <h2 className={`${mobileSideBySide ? 'text-[10px] lg:text-xl mb-1.5 lg:mb-4' : 'text-xl mb-4'} font-bold text-slate-900 dark:text-slate-100`}>
                  Only in Your Ranking
                </h2>
                <div className={mobileSideBySide ? 'space-y-1 lg:space-y-3' : 'space-y-3'}>
                  {comparison.onlyInYourList.map((song, index) => {
                    return (
                      <div
                        key={index}
                        className={`flex items-center ${mobileSideBySide ? 'gap-1.5 lg:gap-4 p-1.5 lg:p-4 rounded lg:rounded-2xl border lg:border-2 shadow-sm lg:shadow-md' : 'gap-4 p-4 rounded-2xl border-2 shadow-md'} bg-white dark:bg-slate-800 border-orange-300 dark:border-orange-700`}
                      >
                        <div className={`relative ${mobileSideBySide ? 'w-4 h-4 lg:w-16 lg:h-16 hidden lg:block' : 'w-16 h-16'} flex-shrink-0`}>
                          <div className={`song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] ${mobileSideBySide ? 'rounded-lg lg:rounded-xl shadow-sm lg:shadow-md' : 'rounded-xl shadow-md'} flex items-center justify-center overflow-hidden`}>
                            <svg className={mobileSideBySide ? 'w-3 h-3 lg:w-8 lg:h-8' : 'w-8 h-8'} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                          {song.cover_art_url && (
                            <Image
                              src={song.cover_art_url}
                              alt={song.title}
                              fill
                              className={`absolute inset-0 w-full h-full object-cover ${mobileSideBySide ? 'rounded-lg lg:rounded-xl shadow-sm lg:shadow-md' : 'rounded-xl shadow-md'} transition-opacity duration-300 opacity-0`}
                              onError={(e) => {
                                const target = e.currentTarget
                                target.style.opacity = '0'
                                const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                                if (placeholder) placeholder.style.opacity = '1'
                              }}
                              onLoad={(e) => {
                                const img = e.currentTarget
                                img.style.opacity = '1'
                                const placeholder = img.parentElement?.querySelector('.song-placeholder') as HTMLElement
                                if (placeholder) placeholder.style.opacity = '0'
                              }}
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold ${mobileSideBySide ? 'text-[9px]' : 'text-lg'} lg:text-lg text-slate-900 dark:text-slate-100 truncate`}>{song.title}</p>
                          <p className={`${mobileSideBySide ? 'text-[8px]' : 'text-base'} lg:text-base text-slate-600 dark:text-slate-400 truncate ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>{song.artist}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Their Ranking - Shared Songs Only */}
          <div className="min-w-0">
            <div className={`${mobileSideBySide ? 'mb-2' : 'mb-4'} lg:mb-4 flex items-center ${mobileSideBySide ? 'gap-1.5' : 'gap-3'} lg:gap-3`}>
              <div className={`${mobileSideBySide ? 'w-6 h-6' : 'w-10 h-10'} lg:w-10 lg:h-10 flex items-center justify-center bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-full font-bold text-white ${mobileSideBySide ? 'text-xs' : 'text-base'} lg:text-base shadow-lg flex-shrink-0`}>
                {(getTheirDisplayName().charAt(0).toUpperCase())}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`${mobileSideBySide ? 'text-xs' : 'text-xl'} lg:text-xl font-bold text-slate-900 dark:text-slate-100 truncate`}>
                  {theirRanking.name || 'Their Ranking'}
                </h2>
                <p className={`${mobileSideBySide ? 'text-[9px]' : 'text-sm'} lg:text-sm text-slate-500 dark:text-slate-400 truncate`}>{getTheirDisplayName()}</p>
              </div>
            </div>
            <div className={mobileSideBySide ? 'space-y-1.5 lg:space-y-3' : 'space-y-3'}>
              {theirSharedSongs.map((song, index) => {
                const songId = getSongId(song)
                const indicator = theirSongIndicators.get(songId)

                return (
                  <div
                    key={index}
                    className={`flex items-center ${mobileSideBySide ? 'gap-1.5 lg:gap-4 p-1.5 lg:p-4 rounded-lg lg:rounded-2xl border lg:border-2 shadow-sm lg:shadow-lg hover:shadow-md lg:hover:shadow-xl' : 'gap-4 p-4 rounded-2xl border-2 shadow-lg hover:shadow-xl'} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all`}
                  >
                    <div className={`${mobileSideBySide ? 'w-6 h-6' : 'w-16 h-16'} lg:w-16 lg:h-16 flex items-center justify-center bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] ${mobileSideBySide ? 'rounded' : 'rounded-xl'} lg:rounded-xl font-bold text-white ${mobileSideBySide ? 'text-[10px]' : 'text-xl'} lg:text-xl ${mobileSideBySide ? 'shadow-md' : 'shadow-lg'} lg:shadow-lg flex-shrink-0`}>
                      #{index + 1}
                    </div>
                    <div className={`relative ${mobileSideBySide ? 'w-6 h-6' : 'w-16 h-16'} lg:w-16 lg:h-16 flex-shrink-0 ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>
                      <div className="song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg lg:rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                        <svg className="w-4 h-4 lg:w-8 lg:h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      {song.cover_art_url && (
                        <Image
                          src={song.cover_art_url}
                          alt={song.title}
                          fill
                          className="absolute inset-0 w-full h-full object-cover rounded-lg lg:rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={() => {
                            const container = document.querySelector(`[data-song-container="${song.musicbrainz_id || song.title}"]`)
                            if (container) {
                              const img = container.querySelector('img') as HTMLElement
                              const placeholder = container.querySelector('.song-placeholder') as HTMLElement
                              if (img) img.style.opacity = '1'
                              if (placeholder) placeholder.style.opacity = '0'
                            }
                          }}
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold ${mobileSideBySide ? 'text-[10px]' : 'text-lg'} lg:text-lg text-slate-900 dark:text-slate-100 truncate`}>{song.title}</p>
                      <p className={`${mobileSideBySide ? 'text-[9px]' : 'text-base'} lg:text-base text-slate-600 dark:text-slate-400 truncate ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>{song.artist}</p>
                    </div>
                    {/* Position Indicator */}
                    {indicator && (
                      <div className="flex-shrink-0">
                        {indicator.indicator === 'up' && (
                          <div className={`flex items-center ${mobileSideBySide ? 'gap-0.5 lg:gap-1 text-xs lg:text-lg' : 'gap-1 text-lg'} text-green-600 dark:text-green-400 font-bold`}>
                            <svg className={`${mobileSideBySide ? 'w-3 h-3 lg:w-6 lg:h-6' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                            <span className={`${mobileSideBySide ? 'text-[10px] lg:text-base' : 'text-base'}`}>{indicator.diffAmount}</span>
                          </div>
                        )}
                        {indicator.indicator === 'down' && (
                          <div className={`flex items-center ${mobileSideBySide ? 'gap-0.5 lg:gap-1 text-xs lg:text-lg' : 'gap-1 text-lg'} text-red-600 dark:text-red-400 font-bold`}>
                            <svg className={`${mobileSideBySide ? 'w-3 h-3 lg:w-6 lg:h-6' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className={`${mobileSideBySide ? 'text-[10px] lg:text-base' : 'text-base'}`}>{indicator.diffAmount}</span>
                          </div>
                        )}
                        {indicator.indicator === 'same' && (
                          <div className={`text-slate-500 dark:text-slate-400 font-bold ${mobileSideBySide ? 'text-sm lg:text-xl' : 'text-xl'}`}>
                            =
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Only in Their List - Below Their Ranking */}
            {comparison.onlyInTheirList.length > 0 && (
              <div className={mobileSideBySide ? 'mt-3 lg:mt-4' : 'mt-4'}>
                <h2 className={`${mobileSideBySide ? 'text-[10px] lg:text-xl mb-1.5 lg:mb-4' : 'text-xl mb-4'} font-bold text-slate-900 dark:text-slate-100`}>
                  Only in Their Ranking
                </h2>
                <div className={mobileSideBySide ? 'space-y-1 lg:space-y-3' : 'space-y-3'}>
                  {comparison.onlyInTheirList.map((song, index) => {
                    return (
                      <div
                        key={index}
                        className={`flex items-center ${mobileSideBySide ? 'gap-1.5 lg:gap-4 p-1.5 lg:p-4 rounded lg:rounded-2xl border lg:border-2 shadow-sm lg:shadow-md' : 'gap-4 p-4 rounded-2xl border-2 shadow-md'} bg-white dark:bg-slate-800 border-orange-300 dark:border-orange-700`}
                      >
                        <div className={`relative ${mobileSideBySide ? 'w-4 h-4 lg:w-16 lg:h-16 hidden lg:block' : 'w-16 h-16'} flex-shrink-0`}>
                          <div className={`song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] ${mobileSideBySide ? 'rounded-lg lg:rounded-xl shadow-sm lg:shadow-md' : 'rounded-xl shadow-md'} flex items-center justify-center overflow-hidden`}>
                            <svg className={mobileSideBySide ? 'w-3 h-3 lg:w-8 lg:h-8' : 'w-8 h-8'} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                          {song.cover_art_url && (
                            <Image
                              src={song.cover_art_url}
                              alt={song.title}
                              fill
                              className={`absolute inset-0 w-full h-full object-cover ${mobileSideBySide ? 'rounded-lg lg:rounded-xl shadow-sm lg:shadow-md' : 'rounded-xl shadow-md'} transition-opacity duration-300 opacity-0`}
                              onError={(e) => {
                                const target = e.currentTarget
                                target.style.opacity = '0'
                                const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                                if (placeholder) placeholder.style.opacity = '1'
                              }}
                              onLoad={(e) => {
                                const img = e.currentTarget
                                img.style.opacity = '1'
                                const placeholder = img.parentElement?.querySelector('.song-placeholder') as HTMLElement
                                if (placeholder) placeholder.style.opacity = '0'
                              }}
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold ${mobileSideBySide ? 'text-[9px]' : 'text-lg'} lg:text-lg text-slate-900 dark:text-slate-100 truncate`}>{song.title}</p>
                          <p className={`${mobileSideBySide ? 'text-[8px]' : 'text-base'} lg:text-base text-slate-600 dark:text-slate-400 truncate ${mobileSideBySide ? 'hidden lg:block' : 'block'}`}>{song.artist}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

