'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SearchResult } from '@/lib/spotify/types'

interface RankingState {
    rankedList: SearchResult[]
    unrankedList: SearchResult[]
    currentItem: SearchResult | null
    comparisonIndex: number
    low: number
    high: number
}

export default function RankingFlowPage({
    params
}: {
    params: { type: string; id: string }
}) {
    const [tracks, setTracks] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(true)
    const [state, setState] = useState<RankingState | null>(null)
    const [isComplete, setIsComplete] = useState(false)
    const [saving, setSaving] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const name = searchParams.get('name') || 'Untitled'

    // Fetch tracks
    useEffect(() => {
        if (!params) return

        const fetchTracks = async () => {
            setLoading(true)
            try {
                const endpoint = params.type === 'playlist'
                    ? `/api/spotify/playlists/${params.id}/tracks`
                    : `/api/spotify/albums/${params.id}/tracks`

                const res = await fetch(endpoint)
                if (res.ok) {
                    const data = await res.json()
                    setTracks(data)

                    // Initialize ranking state
                    if (data.length > 0) {
                        setState({
                            rankedList: [data[0]],
                            unrankedList: data.slice(1),
                            currentItem: data[1] || null,
                            comparisonIndex: 0,
                            low: 0,
                            high: 0,
                        })

                        if (data.length === 1) {
                            setIsComplete(true)
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching tracks:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchTracks()
    }, [params])

    // Binary insertion logic
    const handleChoice = useCallback((preferCurrent: boolean) => {
        if (!state || !state.currentItem) return

        const { rankedList, unrankedList, currentItem, low, high } = state
        const mid = Math.floor((low + high) / 2)

        if (preferCurrent) {
            // Current item is better, search upper half
            if (mid === low) {
                // Insert at this position
                const newRanked = [...rankedList]
                newRanked.splice(mid, 0, currentItem)
                moveToNext(newRanked, unrankedList)
            } else {
                setState({
                    ...state,
                    high: mid - 1,
                    comparisonIndex: Math.floor((low + mid - 1) / 2),
                })
            }
        } else {
            // Comparison item is better, search lower half
            if (mid === high) {
                // Insert after this position
                const newRanked = [...rankedList]
                newRanked.splice(mid + 1, 0, currentItem)
                moveToNext(newRanked, unrankedList)
            } else {
                setState({
                    ...state,
                    low: mid + 1,
                    comparisonIndex: Math.floor((mid + 1 + high) / 2),
                })
            }
        }
    }, [state])

    const moveToNext = (newRanked: SearchResult[], remaining: SearchResult[]) => {
        if (remaining.length === 0) {
            setState({
                rankedList: newRanked,
                unrankedList: [],
                currentItem: null,
                comparisonIndex: 0,
                low: 0,
                high: 0,
            })
            setIsComplete(true)
        } else {
            const nextItem = remaining[0]
            const newUnranked = remaining.slice(1)
            setState({
                rankedList: newRanked,
                unrankedList: newUnranked,
                currentItem: nextItem,
                comparisonIndex: Math.floor((newRanked.length - 1) / 2),
                low: 0,
                high: newRanked.length - 1,
            })
        }
    }

    const saveRanking = async () => {
        if (!state || !params) return
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { error } = await supabase.from('ranked_lists').insert({
                user_id: user.id,
                name: name,
                source_type: params.type,
                source_id: params.id,
                songs: state.rankedList,
                song_count: state.rankedList.length,
                cover_art_url: state.rankedList[0]?.coverArtUrl || '',
                is_public: true,
            })

            if (error) throw error
            router.push('/rankings')
        } catch (error) {
            console.error('Error saving ranking:', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading || !params) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-3 border-green-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (isComplete && state) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                <div className="max-w-2xl mx-auto pt-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">🎉 Ranking Complete!</h1>
                        <p className="text-slate-400">{name}</p>
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
                <p className="text-slate-400">Not enough tracks to rank.</p>
            </div>
        )
    }

    const comparisonTrack = state.rankedList[state.comparisonIndex]
    const progress = ((tracks.length - state.unrankedList.length - 1) / tracks.length) * 100

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto pt-8">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Ranking: {name}</span>
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
