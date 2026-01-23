'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login?next=/rank')
            }
        }
        checkAuth()
    }, [router, supabase.auth])

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
                                <h2 className="text-xl md:text-2xl font-black uppercase mb-2">Rank an Album</h2>
                                <p className="font-bold text-gray-600">Search for any album and rank its tracks</p>
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
            <div className="min-h-screen bg-[#fffdf5]">
                <NavHeader title="Select Playlist" showBack={true} backLabel="Back" backHref="/rank" />

                <div className="p-4 md:p-6">
                    <div className="max-w-4xl mx-auto pt-4">
                        <div className="mb-6">
                            <button
                                onClick={() => setSourceType(null)}
                                className="nb-button-outline px-3 py-2 text-sm md:hidden"
                            >
                                ← Back
                            </button>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Select a Playlist</h1>
                        <p className="font-bold text-gray-600 mb-6">Choose a playlist to rank its songs</p>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-12 h-12 border-4 border-black border-t-[#4ade80] animate-spin"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {playlists.map((playlist) => (
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

                        {playlists.length === 0 && !loading && (
                            <div className="nb-card p-8 text-center">
                                <p className="font-bold">No playlists found.</p>
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
                <NavHeader title="Search Album" showBack={true} backLabel="Back" backHref="/rank" />

                <div className="p-4 md:p-6">
                    <div className="max-w-4xl mx-auto pt-4">
                        <div className="mb-6">
                            <button
                                onClick={() => setSourceType(null)}
                                className="nb-button-outline px-3 py-2 text-sm md:hidden"
                            >
                                ← Back
                            </button>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Search for an Album</h1>
                        <p className="font-bold text-gray-600 mb-6">Find any album to rank</p>

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
                                className="px-6 py-3 nb-button disabled:opacity-50"
                            >
                                {searching ? '...' : 'Search'}
                            </button>
                        </div>

                        {/* Search results */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {searchResults.map((album) => (
                                <button
                                    key={album.id}
                                    onClick={() => selectSource(album.id, album.title)}
                                    className="nb-card-sm p-3 text-left group"
                                >
                                    <div className="aspect-square border-2 border-black overflow-hidden mb-3 bg-[#ff90e8]">
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
                                    </div>
                                    <h3 className="font-black text-sm truncate">{album.title}</h3>
                                    <p className="text-xs font-bold text-gray-600 truncate">{album.artist}</p>
                                </button>
                            ))}
                        </div>

                        {searchResults.length === 0 && searchQuery && !searching && (
                            <div className="nb-card p-8 text-center">
                                <p className="font-bold">No albums found. Try a different search.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return null
}
