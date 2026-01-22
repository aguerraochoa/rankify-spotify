'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SpotifyPlaylist } from '@/lib/spotify/types'
import { NavHeader } from '@/components/NavHeader'

type SourceType = 'playlist' | 'album' | null

export default function RankPage() {
    const [sourceType, setSourceType] = useState<SourceType>(null)
    const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login?next=/rank')
            }
        }
        checkAuth()
    }, [router, supabase.auth])

    // Fetch playlists when playlist source is selected
    useEffect(() => {
        if (sourceType === 'playlist') {
            fetchPlaylists()
        }
    }, [sourceType])

    const fetchPlaylists = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/spotify/playlists')
            if (res.ok) {
                const data = await res.json()
                setPlaylists(data.items || [])
            }
        } catch (error) {
            console.error('Error fetching playlists:', error)
        } finally {
            setLoading(false)
        }
    }

    const searchAlbums = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        try {
            const res = await fetch(`/api/spotify/albums/search?q=${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data)
            }
        } catch (error) {
            console.error('Error searching albums:', error)
        } finally {
            setSearching(false)
        }
    }

    const selectSource = (id: string, name: string) => {
        const type = sourceType === 'playlist' ? 'playlist' : 'album'
        router.push(`/rank/${type}/${id}?name=${encodeURIComponent(name)}`)
    }

    // Source selection view
    if (!sourceType) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <NavHeader />

                <div className="p-6">
                    <div className="max-w-2xl mx-auto pt-12">
                        <h1 className="text-4xl font-bold text-white text-center mb-4">What do you want to rank?</h1>
                        <p className="text-slate-400 text-center mb-12">Choose a source to start ranking your favorite songs</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Playlist option */}
                            <button
                                onClick={() => setSourceType('playlist')}
                                className="group p-8 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 hover:border-green-400 transition-all hover:scale-105"
                            >
                                <div className="text-5xl mb-4">🎵</div>
                                <h2 className="text-2xl font-bold text-white mb-2">Rank a Playlist</h2>
                                <p className="text-slate-400">Pick one of your playlists and rank all its songs</p>
                            </button>

                            {/* Album option */}
                            <button
                                onClick={() => setSourceType('album')}
                                className="group p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 hover:border-purple-400 transition-all hover:scale-105"
                            >
                                <div className="text-5xl mb-4">💿</div>
                                <h2 className="text-2xl font-bold text-white mb-2">Rank an Album</h2>
                                <p className="text-slate-400">Search for any album and rank its tracks</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Playlist selection view
    if (sourceType === 'playlist') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <NavHeader title="Select Playlist" showBack={true} backLabel="Back to Sources" backHref="/rank" />

                <div className="p-6">
                    <div className="max-w-4xl mx-auto pt-4">
                        <div className="mb-6 flex items-center justify-between">
                            <button
                                onClick={() => setSourceType(null)}
                                className="text-slate-400 hover:text-white flex items-center gap-2 md:hidden"
                            >
                                ← Back
                            </button>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-2">Select a Playlist</h1>
                        <p className="text-slate-400 mb-8">Choose a playlist to rank its songs</p>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {playlists.map((playlist) => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => selectSource(playlist.id, playlist.name)}
                                        className="group text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-green-500/50 transition-all"
                                    >
                                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-slate-700">
                                            {playlist.images?.[0]?.url ? (
                                                <img
                                                    src={playlist.images[0].url}
                                                    alt={playlist.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                                        <p className="text-sm text-slate-400">{playlist.tracks?.total || 0} tracks</p>
                                    </button>
                                ))}
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <NavHeader title="Search Album" showBack={true} backLabel="Back to Sources" backHref="/rank" />

                <div className="p-6">
                    <div className="max-w-4xl mx-auto pt-4">
                        <div className="mb-6 flex items-center justify-between">
                            <button
                                onClick={() => setSourceType(null)}
                                className="text-slate-400 hover:text-white flex items-center gap-2 md:hidden"
                            >
                                ← Back
                            </button>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-2">Search for an Album</h1>
                        <p className="text-slate-400 mb-6">Find any album to rank</p>

                        {/* Search bar */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchAlbums()}
                                placeholder="Search albums..."
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                            <button
                                onClick={searchAlbums}
                                disabled={searching}
                                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50 transition-colors"
                            >
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {/* Search results */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {searchResults.map((album) => (
                                <button
                                    key={album.id}
                                    onClick={() => selectSource(album.id, album.title)}
                                    className="group text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-purple-500/50 transition-all"
                                >
                                    <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-slate-700">
                                        {album.coverArtUrl ? (
                                            <img
                                                src={album.coverArtUrl}
                                                alt={album.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">💿</div>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-white truncate">{album.title}</h3>
                                    <p className="text-sm text-slate-400 truncate">{album.artist}</p>
                                </button>
                            ))}
                        </div>

                        {searchResults.length === 0 && searchQuery && !searching && (
                            <p className="text-center text-slate-500 py-12">No albums found. Try a different search.</p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return null
}
