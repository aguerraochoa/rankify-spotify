'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'

interface Song {
    id: string
    title: string
    artist: string
    coverArtUrl?: string
    spotifyUri?: string
}

interface RankingState {
    rankedList: Song[]
    unrankedList: Song[]
    currentItem: Song | null
    comparisonIndex: number
    low: number
    high: number
}

function getSpotifyUrl(uri: string | null | undefined) {
    if (!uri) return null
    const parts = uri.split(':')
    if (parts.length === 3) {
        return `https://open.spotify.com/${parts[1]}/${parts[2]}`
    }
    return null
}

export default function ReRankPage({
    params
}: {
    params: { id: string }
}) {
    const [originalRanking, setOriginalRanking] = useState<any>(null)
    const [tracks, setTracks] = useState<Song[]>([])
    const [loading, setLoading] = useState(true)
    const [state, setState] = useState<RankingState | null>(null)
    const [isComplete, setIsComplete] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showLiveRanking, setShowLiveRanking] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                const res = await fetch(`/api/ranked-lists/${params.id}`)
                if (!res.ok) {
                    throw new Error('Failed to fetch ranking')
                }

                const data = await res.json()
                const ranking = data.list
                setOriginalRanking(ranking)

                const songs: Song[] = ranking.songs.map((song: any, index: number) => ({
                    id: song.musicbrainz_id || song.spotify_id || `song-${index}`,
                    title: song.title,
                    artist: song.artist,
                    coverArtUrl: song.cover_art_url || song.coverArtUrl,
                    spotifyUri: song.spotify_uri || song.spotifyUri,
                }))

                const shuffled = [...songs].sort(() => Math.random() - 0.5)
                setTracks(shuffled)

                if (shuffled.length > 0) {
                    setState({
                        rankedList: [shuffled[0]],
                        unrankedList: shuffled.slice(2),
                        currentItem: shuffled[1] || null,
                        comparisonIndex: 0,
                        low: 0,
                        high: 0,
                    })

                    if (shuffled.length === 1) {
                        setIsComplete(true)
                    }
                }
            } catch (err: any) {
                console.error('Error fetching ranking:', err)
                setError(err.message || 'Failed to load ranking')
            } finally {
                setLoading(false)
            }
        }

        fetchRanking()
    }, [params.id, router, supabase.auth])

    const handleChoice = useCallback((preferCurrent: boolean) => {
        setState(prev => {
            if (!prev || !prev.currentItem) return prev

            const { rankedList, unrankedList, currentItem, low, high } = prev
            const mid = Math.floor((low + high) / 2)

            if (preferCurrent) {
                if (mid === low) {
                    const newRanked = [...rankedList]
                    newRanked.splice(mid, 0, currentItem)
                    return computeMoveToNext(newRanked, unrankedList)
                } else {
                    return {
                        ...prev,
                        high: mid - 1,
                        comparisonIndex: Math.floor((low + mid - 1) / 2),
                    }
                }
            } else {
                if (mid === high) {
                    const newRanked = [...rankedList]
                    newRanked.splice(mid + 1, 0, currentItem)
                    return computeMoveToNext(newRanked, unrankedList)
                } else {
                    return {
                        ...prev,
                        low: mid + 1,
                        comparisonIndex: Math.floor((mid + 1 + high) / 2),
                    }
                }
            }
        })
    }, [])

    const computeMoveToNext = (newRanked: Song[], remaining: Song[]): RankingState => {
        if (remaining.length === 0) {
            setIsComplete(true)
            return {
                rankedList: newRanked,
                unrankedList: [],
                currentItem: null,
                comparisonIndex: 0,
                low: 0,
                high: 0,
            }
        } else {
            const nextItem = remaining[0]
            const newUnranked = remaining.slice(1)
            return {
                rankedList: newRanked,
                unrankedList: newUnranked,
                currentItem: nextItem,
                comparisonIndex: Math.floor((newRanked.length - 1) / 2),
                low: 0,
                high: newRanked.length - 1,
            }
        }
    }

    const handleSkip = useCallback(() => {
        setState(prev => {
            if (!prev) return null
            const { rankedList, unrankedList } = prev

            // Skip currentItem, move to next from unrankedList
            if (unrankedList.length === 0) {
                setIsComplete(true)
                return {
                    rankedList,
                    unrankedList: [],
                    currentItem: null,
                    comparisonIndex: 0,
                    low: 0,
                    high: 0,
                }
            }

            const nextItem = unrankedList[0]
            const newUnranked = unrankedList.slice(1)
            return {
                rankedList,
                unrankedList: newUnranked,
                currentItem: nextItem,
                comparisonIndex: Math.floor((rankedList.length - 1) / 2),
                low: 0,
                high: rankedList.length - 1,
            }
        })
    }, [])


    const saveReRanking = async () => {
        if (!state || !originalRanking) return
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { error } = await supabase.from('ranked_lists').insert({
                user_id: user.id,
                name: originalRanking.name ? `My ${originalRanking.name} Ranking` : 'My Ranking',
                source_type: originalRanking.source_type,
                source_id: originalRanking.source_id,
                songs: state.rankedList,
                song_count: state.rankedList.length,
                cover_art_url: state.rankedList[0]?.coverArtUrl || '',
                is_public: true,
                status: 'completed',
            })

            if (error) throw error
            router.push('/rankings')
        } catch (error) {
            console.error('Error saving re-ranking:', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <LoadingScreen message="Loading Ranking..." />
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#fffdf5] p-4 flex items-center justify-center">
                <div className="nb-card p-8 text-center max-w-md">
                    <p className="font-bold text-red-600 mb-6">{error}</p>
                    <button onClick={() => router.push('/rankings')} className="nb-button px-6 py-3">
                        Back to Rankings
                    </button>
                </div>
            </div>
        )
    }

    if (isComplete && state) {
        return (
            <div className="min-h-screen bg-[#fffdf5] p-4 md:p-6">
                <div className="max-w-3xl mx-auto pt-4 md:pt-8">
                    <div className="text-center mb-8">
                        <div className="inline-block bg-[#4ade80] border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4 transform rotate-2">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">Ranking Complete!</h1>
                        <div className="nb-tag">{originalRanking?.name} • {state.rankedList.length} SONGS</div>
                    </div>

                    <div className="nb-card overflow-hidden mb-6">
                        <div className="p-4 border-b-4 border-black bg-[#ff90e8]">
                            <h2 className="font-black uppercase">Your New Ranking</h2>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {state.rankedList.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-3 p-3 border-b-2 border-black last:border-0">
                                    <span className={`w-10 h-10 flex items-center justify-center border-2 border-black font-black ${index === 0 ? 'bg-[#ffd700]' :
                                        index === 1 ? 'bg-[#c0c0c0]' :
                                            index === 2 ? 'bg-[#cd7f32]' :
                                                'bg-white'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    {track.coverArtUrl && (
                                        <Image
                                            src={track.coverArtUrl}
                                            alt=""
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 border-2 border-black object-cover"
                                            unoptimized
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black truncate">{track.title}</h3>
                                        <p className="text-sm font-bold text-gray-600 truncate">{track.artist}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => router.push('/rankings')} className="flex-1 py-4 nb-button-outline">
                            Back to Rankings
                        </button>
                        <button onClick={saveReRanking} disabled={saving} className="flex-1 py-4 nb-button disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Ranking'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!state || !state.currentItem) {
        return (
            <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
                <div className="nb-card p-8 text-center">
                    <p className="font-bold">Not enough tracks to rank.</p>
                </div>
            </div>
        )
    }

    const comparisonTrack = state.rankedList[state.comparisonIndex]
    const progress = ((tracks.length - state.unrankedList.length - 1) / tracks.length) * 100
    const songsRanked = state.rankedList.length

    return (
        <div className="min-h-screen bg-[#fffdf5]">
            <div className="flex flex-col lg:flex-row min-h-screen">
                <div className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => router.push('/rankings')} className="nb-button-outline px-3 py-2 text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                                Exit
                            </button>
                            <div className="nb-tag">{songsRanked} / {tracks.length} RANKED</div>
                        </div>

                        <div className="h-4 bg-white border-2 border-black overflow-hidden mb-2">
                            <div className="h-full bg-[#ff90e8] transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="truncate max-w-[150px]">Ranking: {originalRanking?.name}</span>
                            <span>{Math.round(progress)}% complete</span>
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="inline-block bg-[#ff90e8] border-2 border-black px-4 py-2 font-black text-sm uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            RE-RANK_MODE
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black uppercase">Choose Your Fighter</h2>
                    </div>

                    <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3 md:gap-6 mb-4 relative">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-black text-white font-black text-lg md:text-2xl px-2 md:px-4 py-1 md:py-2 rotate-12 border-2 border-white">
                            VS
                        </div>

                        <div className="nb-card p-3 md:p-6 group">
                            <div className="relative aspect-square border-4 border-black mb-4 bg-[#00d4ff] overflow-hidden">
                                {state.currentItem.coverArtUrl ? (
                                    <Image
                                        src={state.currentItem.coverArtUrl}
                                        alt={state.currentItem.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-6xl font-black text-white">A</span>
                                    </div>
                                )}
                                {/* Spotify link */}
                                {getSpotifyUrl(state.currentItem.spotifyUri) && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none group-hover:bg-black/10 transition-colors">
                                        <a
                                            href={getSpotifyUrl(state.currentItem.spotifyUri)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#1DB954] hover:text-white"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                            </svg>
                                            <span>Spotify</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-black text-base md:text-xl uppercase mb-1 truncate leading-tight">{state.currentItem.title}</h3>
                            <p className="font-bold text-[10px] md:text-sm bg-[#00d4ff] inline-block px-1.5 md:px-2 border border-black mb-3 md:mb-4 truncate max-w-full">{state.currentItem.artist}</p>
                            <button onClick={() => handleChoice(true)} className="w-full py-2 md:py-4 nb-button text-xs md:text-base">Vote This</button>
                        </div>

                        <div className="nb-card p-3 md:p-6 group">
                            <div className="relative aspect-square border-4 border-black mb-4 bg-[#ff6b6b] overflow-hidden">
                                {comparisonTrack.coverArtUrl ? (
                                    <Image
                                        src={comparisonTrack.coverArtUrl}
                                        alt={comparisonTrack.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-6xl font-black text-white">B</span>
                                    </div>
                                )}
                                {/* Spotify link */}
                                {getSpotifyUrl(comparisonTrack.spotifyUri) && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none group-hover:bg-black/10 transition-colors">
                                        <a
                                            href={getSpotifyUrl(comparisonTrack.spotifyUri)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#1DB954] hover:text-white"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                            </svg>
                                            <span>Spotify</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-black text-base md:text-xl uppercase mb-1 truncate leading-tight">{comparisonTrack.title}</h3>
                            <p className="font-bold text-[10px] md:text-sm bg-[#ff6b6b] inline-block px-1.5 md:px-2 border border-black mb-3 md:mb-4 truncate max-w-full">{comparisonTrack.artist}</p>
                            <button onClick={() => handleChoice(false)} className="w-full py-2 md:py-4 nb-button text-xs md:text-base">Vote This</button>
                        </div>
                    </div>

                    {/* I Don't Know Button */}
                    <div className="max-w-3xl mx-auto mb-6">
                        <button
                            onClick={handleSkip}
                            className="w-full py-3 bg-[#e0e0e0] border-2 border-black font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            I don&apos;t know this song (Skip)
                        </button>
                    </div>

                    <p className="text-center font-bold text-sm">{state.unrankedList.length + 1} songs remaining</p>

                    <div className="lg:hidden mt-6">
                        <button onClick={() => setShowLiveRanking(!showLiveRanking)} className="w-full py-3 nb-button-outline flex items-center justify-center gap-2">
                            {showLiveRanking ? 'Hide' : 'Show'} Live Ranking ({state.rankedList.length})
                        </button>
                    </div>
                </div>

                <div className={`${showLiveRanking ? 'block' : 'hidden'} lg:block w-full lg:w-80 xl:w-96 bg-white border-t-4 lg:border-t-0 lg:border-l-4 border-black`}>
                    <div className="p-4 border-b-4 border-black bg-[#ff90e8] flex items-center justify-between">
                        <h3 className="font-black uppercase">Live Ranking</h3>
                        <span className="nb-tag text-xs">{state.rankedList.length}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-60px)]">
                        {state.rankedList.map((track, index) => (
                            <div key={track.id} className="flex items-center gap-3 p-3 border-b-2 border-black">
                                <span className={`w-8 h-8 flex items-center justify-center border-2 border-black text-xs font-black ${index === 0 ? 'bg-[#ffd700]' :
                                    index === 1 ? 'bg-[#c0c0c0]' :
                                        index === 2 ? 'bg-[#cd7f32]' :
                                            'bg-white'
                                    }`}>
                                    {index + 1}
                                </span>
                                {track.coverArtUrl && (
                                    <Image
                                        src={track.coverArtUrl}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 border-2 border-black object-cover"
                                        unoptimized
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black truncate">{track.title}</p>
                                    <p className="text-xs font-bold text-gray-600 truncate">{track.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
