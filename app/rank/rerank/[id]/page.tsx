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
    const router = useRouter()
    const supabase = createClient()

    // Fetch the original ranking and convert songs
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

                // Convert songs from the ranking to our format
                // Shuffle them so users can rank fresh
                const songs: Song[] = ranking.songs.map((song: any, index: number) => ({
                    id: song.musicbrainz_id || song.spotify_id || `song-${index}`,
                    title: song.title,
                    artist: song.artist,
                    coverArtUrl: song.cover_art_url || song.coverArtUrl,
                }))

                // Shuffle the songs for a fresh ranking experience
                const shuffled = [...songs].sort(() => Math.random() - 0.5)
                setTracks(shuffled)

                // Initialize ranking state
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

    // Binary insertion logic
    const handleChoice = useCallback((preferCurrent: boolean) => {
        setState(prev => {
            if (!prev || !prev.currentItem) return prev

            const { rankedList, unrankedList, currentItem, low, high } = prev
            const mid = Math.floor((low + high) / 2)

            if (preferCurrent) {
                // Current item is better, search upper half
                if (mid === low) {
                    // Insert at this position
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
                // Comparison item is better, search lower half
                if (mid === high) {
                    // Insert after this position
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

    const saveRanking = async () => {
        if (!state || !originalRanking) return
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Format songs for saving
            const songsToSave = state.rankedList.map((song, index) => ({
                title: song.title,
                artist: song.artist,
                cover_art_url: song.coverArtUrl,
                rank: index + 1,
            }))

            const { error } = await supabase.from('ranked_lists').insert({
                user_id: user.id,
                name: `My ${originalRanking.name || 'Re-Ranked List'}`,
                source_type: 'custom',
                songs: songsToSave,
                song_count: songsToSave.length,
                cover_art_url: songsToSave[0]?.cover_art_url || '',
                is_public: true,
                status: 'completed',
            })

            if (error) throw error
            router.push('/rankings')
        } catch (err: any) {
            console.error('Error saving ranking:', err)
            alert('Failed to save ranking. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-3 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading songs...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    if (isComplete && state) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                <div className="max-w-2xl mx-auto pt-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">🎉 Ranking Complete!</h1>
                        <p className="text-slate-400">{originalRanking?.name || 'Your Re-Ranking'}</p>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 mb-6">
                        {state.rankedList.map((track, index) => (
                            <div
                                key={track.id}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-700/30"
                            >
                                <span className="text-2xl font-bold text-green-500 w-8">{index + 1}</span>
                                {track.coverArtUrl && (
                                    <img src={track.coverArtUrl} alt="" className="w-12 h-12 rounded-lg" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{track.title}</h3>
                                    <p className="text-sm text-slate-400 truncate">{track.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/rank')}
                            className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
                        >
                            Rank Another
                        </button>
                        <button
                            onClick={saveRanking}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Ranking'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!state || !state.currentItem) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <p className="text-slate-400">Not enough songs to rank.</p>
            </div>
        )
    }

    const comparisonTrack = state.rankedList[state.comparisonIndex]
    const progress = ((tracks.length - state.unrankedList.length - 1) / tracks.length) * 100

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto pt-4">
                {/* Header with exit button */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Exit</span>
                    </button>
                    <span className="text-sm text-slate-400">
                        {state.rankedList.length} / {tracks.length} ranked
                    </span>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Re-Ranking: {originalRanking?.name || 'Songs'}</span>
                        <span>{Math.round(progress)}% complete</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-8">Which song do you prefer?</h2>

                {/* Comparison cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Current item (left) */}
                    <button
                        onClick={() => handleChoice(true)}
                        className="group p-6 rounded-2xl bg-slate-800/50 border-2 border-slate-700 hover:border-green-500 transition-all hover:scale-[1.02]"
                    >
                        <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-700">
                            {state.currentItem.coverArtUrl && (
                                <img
                                    src={state.currentItem.coverArtUrl}
                                    alt={state.currentItem.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1 truncate">{state.currentItem.title}</h3>
                        <p className="text-slate-400 truncate">{state.currentItem.artist}</p>
                    </button>

                    {/* Comparison item (right) */}
                    <button
                        onClick={() => handleChoice(false)}
                        className="group p-6 rounded-2xl bg-slate-800/50 border-2 border-slate-700 hover:border-green-500 transition-all hover:scale-[1.02]"
                    >
                        <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-700">
                            {comparisonTrack.coverArtUrl && (
                                <img
                                    src={comparisonTrack.coverArtUrl}
                                    alt={comparisonTrack.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1 truncate">{comparisonTrack.title}</h3>
                        <p className="text-slate-400 truncate">{comparisonTrack.artist}</p>
                    </button>
                </div>

                <p className="text-center text-slate-500 text-sm">
                    {state.unrankedList.length + 1} songs remaining
                </p>
            </div>
        </div>
    )
}
