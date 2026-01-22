'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Song {
    id: string
    title: string
    artist: string
    coverArtUrl?: string
}

interface RankingState {
    rankedList: Song[]
    unrankedList: Song[]
    currentItem: Song | null
    comparisonIndex: number
    low: number
    high: number
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
                name: `${originalRanking.name} (Re-Ranked)`,
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
        return (
            <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
                    <p className="font-bold uppercase">Loading Ranking...</p>
                </div>
            </div>
        )
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
                        <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">Re-Ranking Complete!</h1>
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
                                        <img src={track.coverArtUrl} alt="" className="w-12 h-12 border-2 border-black" />
                                    )}
                                    <div className="flex-1">
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
                            {saving ? 'Saving...' : 'Save Re-Ranking'}
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
                            <span className="truncate max-w-[150px]">Re-Ranking: {originalRanking?.name}</span>
                            <span>{Math.round(progress)}% complete</span>
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="inline-block bg-[#ff90e8] border-2 border-black px-4 py-2 font-black text-sm uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            RE-RANK_MODE
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black uppercase">Choose Your Fighter</h2>
                    </div>

                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 relative">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-black text-white font-black text-2xl px-4 py-2 rotate-12 hidden md:block border-2 border-white">
                            VS
                        </div>

                        <div className="nb-card p-4 md:p-6 group">
                            <div className="relative aspect-square border-4 border-black mb-4 bg-[#00d4ff] overflow-hidden">
                                {state.currentItem.coverArtUrl ? (
                                    <img src={state.currentItem.coverArtUrl} alt={state.currentItem.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-6xl font-black text-white">A</span>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-black text-lg md:text-xl uppercase mb-1 truncate">{state.currentItem.title}</h3>
                            <p className="font-bold text-sm bg-[#00d4ff] inline-block px-2 border border-black mb-4 truncate max-w-full">{state.currentItem.artist}</p>
                            <button onClick={() => handleChoice(true)} className="w-full py-4 nb-button">Vote This</button>
                        </div>

                        <div className="nb-card p-4 md:p-6 group">
                            <div className="relative aspect-square border-4 border-black mb-4 bg-[#ff6b6b] overflow-hidden">
                                {comparisonTrack.coverArtUrl ? (
                                    <img src={comparisonTrack.coverArtUrl} alt={comparisonTrack.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-6xl font-black text-white">B</span>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-black text-lg md:text-xl uppercase mb-1 truncate">{comparisonTrack.title}</h3>
                            <p className="font-bold text-sm bg-[#ff6b6b] inline-block px-2 border border-black mb-4 truncate max-w-full">{comparisonTrack.artist}</p>
                            <button onClick={() => handleChoice(false)} className="w-full py-4 nb-button">Vote This</button>
                        </div>
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
                                    <img src={track.coverArtUrl} alt="" className="w-10 h-10 border-2 border-black" />
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
