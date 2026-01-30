'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { SpotifyPlaylist } from '@/lib/spotify/types'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'
import { RetroBouncingDots } from '@/components/RetroBouncingDots'

type SourceType = 'playlist' | 'album' | null

export default function RankPage() {
    const [sourceType, setSourceType] = useState<SourceType>(null)
    const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [playlistFilter, setPlaylistFilter] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedAlbums, setSelectedAlbums] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        let mounted = true
        let authCheckPerformed = false
        
        const performAuthCheck = async () => {
            if (authCheckPerformed || !mounted) return
            authCheckPerformed = true
            
            try {
                // After OAuth callback we land here with ?auth=success; sync session before any API calls
                const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
                const isFreshAuth = urlParams?.get('auth') === 'success'
                if (typeof window !== 'undefined' && isFreshAuth) {
                    urlParams!.delete('auth')
                    const newSearch = urlParams!.toString()
                    const newPath = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
                    window.history.replaceState({}, '', newPath)
                    await supabase.auth.refreshSession()
                }

                // Check for session immediately
                let { data: { session } } = await supabase.auth.getSession()
                
                // If no session, wait for it (important after OAuth callback)
                if (!session) {
                    let attempts = 0
                    while (!session && attempts < 5 && mounted) {
                        await new Promise(resolve => setTimeout(resolve, 300))
                        const { data } = await supabase.auth.getSession()
                        session = data.session
                        attempts++
                    }
                }
                
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    if (mounted) {
                        router.push('/login?next=/rank')
                    }
                    return
                }

                router.refresh()

                // After OAuth, give session cookies time to propagate before Spotify API check
                if (isFreshAuth) {
                    await new Promise(resolve => setTimeout(resolve, 800))
                } else {
                    await new Promise(resolve => setTimeout(resolve, 300))
                }

                // Verify Spotify token; retry once after fresh OAuth (cookies may still be propagating)
                let res = await fetch('/api/spotify/playlists?limit=1')
                if (res.status === 401 && isFreshAuth && mounted) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    res = await fetch('/api/spotify/playlists?limit=1')
                }
                if (res.status === 401) {
                    if (mounted) {
                        router.push('/login?next=/rank&error=spotify_expired')
                    }
                    return
                }

                if (mounted) {
                    setInitializing(false)
                }
            } catch (error) {
                console.error('Initialization error:', error)
                if (mounted) {
                    setInitializing(false)
                }
            }
        }
        
        // Listen for auth state changes (important after OAuth callback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted && !authCheckPerformed) {
                performAuthCheck()
            }
        })
        
        // Perform initial check
        performAuthCheck()
        
        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [router, supabase.auth])

    const fetchPlaylists = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/spotify/playlists')
            if (res.ok) {
                const data = await res.json()
                setPlaylists(data.items || [])
            } else if (res.status === 401) {
                router.push('/login?next=/rank&error=spotify_expired')
            }
        } catch (error) {
            console.error('Error fetching playlists:', error)
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        if (sourceType === 'playlist') {
            fetchPlaylists()
        }
    }, [sourceType, fetchPlaylists])

    const searchAlbums = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        try {
            const res = await fetch(`/api/spotify/albums/search?q=${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data)
            } else if (res.status === 401) {
                router.push('/login?next=/rank&error=spotify_expired')
            }
        } catch (error) {
            console.error('Error searching albums:', error)
        } finally {
            setSearching(false)
            setHasSearched(true)
        }
    }

    const selectSource = (id: string, name: string) => {
        const type = sourceType === 'playlist' ? 'playlist' : 'album'
        router.push(`/rank/${type}/${id}?name=${encodeURIComponent(name)}`)
    }

    const toggleAlbumSelection = (album: any) => {
        setSelectedAlbums(prev => {
            const exists = prev.find(a => a.id === album.id)
            if (exists) {
                return prev.filter(a => a.id !== album.id)
            } else {
                return [...prev, album]
            }
        })
    }

    const startRankingAlbums = () => {
        if (selectedAlbums.length === 0) return
        const ids = selectedAlbums.map(a => a.id).join(',')
        const name = selectedAlbums.length === 1
            ? selectedAlbums[0].title
            : `${selectedAlbums.length} Albums Combined`
        router.push(`/rank/album/${ids}?name=${encodeURIComponent(name)}`)
    }

    // Filter and paginate playlists
    const filteredPlaylists = playlists.filter(p =>
        p.name.toLowerCase().includes(playlistFilter.toLowerCase())
    )
    const totalPages = Math.ceil(filteredPlaylists.length / itemsPerPage)
    const displayedPlaylists = filteredPlaylists.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [playlistFilter])

    // Initial loading gate
    if (initializing) {
        return <LoadingScreen message="Checking session..." />
    }

    // Source selection view
    if (!sourceType) {
        return (
            <div className="min-h-screen bg-[#fffdf5]">
                <NavHeader />

                <div className="p-4 md:p-6">
                    <div className="max-w-2xl mx-auto pt-8 md:pt-12">
                        <div className="text-center mb-8 md:mb-12">
                            <div className="inline-block bg-[#ffd700] border-2 border-black px-4 py-2 font-black text-sm uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                                SELECT_SOURCE
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black uppercase mb-4">What do you want to rank?</h1>
                            <p className="font-bold text-gray-700">Choose a source to start ranking your favorite songs</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Playlist option */}
                            <button
                                onClick={() => setSourceType('playlist')}
                                className="nb-card p-6 md:p-8 text-left group"
                            >
                                <div className="w-16 h-16 bg-[#4ade80] border-4 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <span className="text-3xl">🎵</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase mb-2">Rank a Playlist</h2>
                                <p className="font-bold text-gray-600">Pick one of your playlists and rank all its songs</p>
                            </button>

                            {/* Album option */}
                            <button
                                onClick={() => setSourceType('album')}
                                className="nb-card p-6 md:p-8 text-left group"
                            >
                                <div className="w-16 h-16 bg-[#ff90e8] border-4 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <span className="text-3xl">💿</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase mb-2">Rank Albums</h2>
                                <p className="font-bold text-gray-600">Search for one or more albums and rank their tracks</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Playlist selection view
    if (sourceType === 'playlist') {
        if (loading) {
            return <LoadingScreen message="Loading playlists..." />
        }
        return (
            <div className="min-h-screen bg-[#fffdf5]">
                <NavHeader title="Select Playlist" />

                <div className="p-4 md:p-6">
                    <div className="max-w-4xl mx-auto pt-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Select a Playlist</h1>
                                <p className="font-bold text-gray-600">Choose a playlist to rank its songs</p>
                            </div>

                            {/* Filter input */}
                            <div className="w-full md:w-64">
                                <input
                                    type="text"
                                    value={playlistFilter}
                                    onChange={(e) => setPlaylistFilter(e.target.value)}
                                    placeholder="Filter by name..."
                                    className="w-full px-4 py-2 nb-input text-sm"
                                />
                            </div>
                        </div>

                        {filteredPlaylists.length === 0 ? (
                            <div className="nb-card p-8 text-center">
                                <p className="font-bold">No playlists found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                                {displayedPlaylists.map((playlist) => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => selectSource(playlist.id, playlist.name)}
                                        className="nb-card-sm p-3 text-left group"
                                    >
                                        <div className="aspect-square border-2 border-black overflow-hidden mb-3 bg-[#4ade80]">
                                            {playlist.images?.[0]?.url ? (
                                                <Image
                                                    src={playlist.images[0].url}
                                                    alt={playlist.name}
                                                    width={300}
                                                    height={300}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                                            )}
                                        </div>
                                        <h3 className="font-black text-sm truncate">{playlist.name}</h3>
                                        <p className="text-xs font-bold text-gray-600">{playlist.tracks?.total || 0} tracks</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 py-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="nb-button-outline px-4 py-2 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span className="font-black">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="nb-button-outline px-4 py-2 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Album search view
    if (sourceType === 'album') {
        return (
            <div className="min-h-screen bg-[#fffdf5]">
                <NavHeader
                    title="Search Albums"
                />

                <div className="p-4 md:p-6 pb-32">
                    <div className="max-w-4xl mx-auto pt-4">
                        <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Search for Albums</h1>
                        <p className="font-bold text-gray-600 mb-6">Find and select one or more albums to rank</p>

                        {/* Search bar */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchAlbums()}
                                placeholder="Search albums..."
                                className="flex-1 px-4 py-3 nb-input text-lg"
                            />
                            <button
                                onClick={searchAlbums}
                                disabled={searching}
                                className="w-24 md:w-32 py-3 nb-button disabled:opacity-50 flex items-center justify-center"
                            >
                                {searching ? (
                                    <RetroBouncingDots size="sm" />
                                ) : 'Search'}
                            </button>
                        </div>

                        {/* Search results */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {searchResults.map((album) => {
                                const isSelected = selectedAlbums.some(a => a.id === album.id)
                                return (
                                    <button
                                        key={album.id}
                                        onClick={() => toggleAlbumSelection(album)}
                                        className={`nb-card-sm p-3 text-left group border-4 ${isSelected ? 'border-[#ff90e8] bg-[#ff90e8]/10' : 'border-black'}`}
                                    >
                                        <div className="aspect-square border-2 border-black overflow-hidden mb-3 bg-[#ff90e8] relative">
                                            {album.coverArtUrl ? (
                                                <Image
                                                    src={album.coverArtUrl}
                                                    alt={album.title}
                                                    width={300}
                                                    height={300}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">💿</div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-[#ff90e8] border-2 border-black w-8 h-8 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-black text-sm truncate">{album.title}</h3>
                                        <p className="text-xs font-bold text-gray-600 truncate">{album.artist}</p>
                                    </button>
                                )
                            })}
                        </div>

                        {searchResults.length === 0 && searchQuery && !searching && hasSearched && (
                            <div className="nb-card p-8 text-center">
                                <p className="font-bold">No albums found. Try a different search.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Selection Bar */}
                {selectedAlbums.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 z-50 shadow-[0_-8px_0_0_rgba(0,0,0,0.05)]">
                        <div className="max-w-4xl mx-auto flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-black uppercase text-[10px] md:text-xs mb-2">Selected ({selectedAlbums.length})</p>
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    {selectedAlbums.map(album => (
                                        <div key={album.id} className="relative flex-shrink-0 group pt-2 pr-2">
                                            <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-black overflow-hidden bg-[#ff90e8]">
                                                {album.coverArtUrl ? (
                                                    <Image
                                                        src={album.coverArtUrl}
                                                        alt=""
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : <span className="text-xl flex items-center justify-center h-full">💿</span>}
                                            </div>
                                            <button
                                                onClick={() => toggleAlbumSelection(album)}
                                                className="absolute top-0 right-0 bg-black text-white w-5 h-5 md:w-6 md:h-6 rounded-none flex items-center justify-center text-[10px] md:text-xs hover:bg-[#ff6b6b] border-2 border-white z-10"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={startRankingAlbums}
                                className="nb-button px-4 md:px-6 py-3 whitespace-nowrap flex-shrink-0 text-sm md:text-base"
                            >
                                Start Ranking
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return null
}
