'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
    const [savingDraft, setSavingDraft] = useState(false)
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
    const [showLiveRanking, setShowLiveRanking] = useState(true)
    const audioRef = useRef<HTMLAudioElement | null>(null)
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
                            unrankedList: data.slice(2),
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
        // Stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause()
            setPlayingTrackId(null)
        }

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

    const computeMoveToNext = (newRanked: SearchResult[], remaining: SearchResult[]): RankingState => {
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


    // Playback preview function
    const playPreview = (trackId: string, previewUrl: string | null | undefined) => {
        if (!previewUrl) return

        if (playingTrackId === trackId && audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play()
                setPlayingTrackId(trackId)
            } else {
                audioRef.current.pause()
                setPlayingTrackId(null)
            }
            return
        }

        if (audioRef.current) {
            audioRef.current.pause()
        }

        const audio = new Audio(previewUrl)
        audioRef.current = audio

        audio.addEventListener('ended', () => {
            setPlayingTrackId(null)
        })

        audio.play()
        setPlayingTrackId(trackId)
    }

    // Save as draft
    const saveDraft = async () => {
        if (!state || !params) return
        setSavingDraft(true)

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
                song_count: tracks.length,
                cover_art_url: state.rankedList[0]?.coverArtUrl || '',
                is_public: false,
                status: 'draft',
                ranking_state: {
                    rankedList: state.rankedList,
                    unrankedList: state.unrankedList,
                    currentItem: state.currentItem,
                    comparisonIndex: state.comparisonIndex,
                    low: state.low,
                    high: state.high,
                },
            })

            if (error) throw error
            alert('Draft saved! You can resume from My Rankings.')
        } catch (error) {
            console.error('Error saving draft:', error)
            alert('Failed to save draft.')
        } finally {
            setSavingDraft(false)
        }
    }

    // Save completed ranking
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
                status: 'completed',
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
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading tracks...</p>
                </div>
            </div>
        )
    }

    // Completed state
    if (isComplete && state) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
                <div className="max-w-4xl mx-auto pt-4 md:pt-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Ranking Complete!</h1>
                        <p className="text-slate-400">{name} • {state.rankedList.length} songs ranked</p>
                    </div>

                    {/* Final ranking list */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden mb-6">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="font-semibold text-white">Your Final Ranking</h2>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {state.rankedList.map((track, index) => (
                                <div
                                    key={track.id}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-700/30 border-b border-slate-700/50 last:border-0"
                                >
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                        index === 1 ? 'bg-slate-300 text-black' :
                                            index === 2 ? 'bg-amber-600 text-white' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    {track.coverArtUrl && (
                                        <img src={track.coverArtUrl} alt="" className="w-10 h-10 rounded-lg" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-white truncate">{track.title}</h3>
                                        <p className="text-sm text-slate-400 truncate">{track.artist}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
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
    const songsRanked = state.rankedList.length
    const totalSongs = tracks.length

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Main comparison area */}
                <div className="flex-1 p-4 md:p-6 lg:p-8">
                    {/* Header with progress */}
                    <div className="max-w-3xl mx-auto mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => router.push('/rank')}
                                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">Exit</span>
                            </button>
                            <div className="text-sm text-slate-400">
                                <span className="text-green-500 font-semibold">{songsRanked}</span>
                                <span> / {totalSongs} ranked</span>
                            </div>
                            <button
                                onClick={saveDraft}
                                disabled={savingDraft}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                {savingDraft ? 'Saving...' : 'Save Draft'}
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>{name}</span>
                            <span>{Math.round(progress)}% complete</span>
                        </div>
                    </div>

                    {/* Question */}
                    <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
                        Which song do you prefer?
                    </h2>

                    {/* Comparison cards */}
                    <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4 md:gap-6 mb-6">
                        {/* Current item (left) */}
                        <div className="group">
                            <div className="p-4 md:p-6 rounded-2xl bg-slate-800/50 border-2 border-slate-700 hover:border-green-500 transition-all">
                                <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-slate-700">
                                    {state.currentItem.coverArtUrl && (
                                        <img
                                            src={state.currentItem.coverArtUrl}
                                            alt={state.currentItem.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Play button overlay */}
                                    {state.currentItem.previewUrl && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                playPreview(state.currentItem!.id, state.currentItem!.previewUrl)
                                            }}
                                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <div className={`w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg ${playingTrackId === state.currentItem.id ? 'animate-pulse' : ''}`}>
                                                {playingTrackId === state.currentItem.id ? (
                                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </div>
                                <h3 className="font-bold text-white text-base md:text-lg mb-1 truncate">{state.currentItem.title}</h3>
                                <p className="text-slate-400 text-sm truncate mb-4">{state.currentItem.artist}</p>
                                <button
                                    onClick={() => handleChoice(true)}
                                    className="w-full py-2.5 md:py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
                                >
                                    Choose
                                </button>
                            </div>
                        </div>

                        {/* Comparison item (right) */}
                        <div className="group">
                            <div className="p-4 md:p-6 rounded-2xl bg-slate-800/50 border-2 border-slate-700 hover:border-green-500 transition-all">
                                <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-slate-700">
                                    {comparisonTrack.coverArtUrl && (
                                        <img
                                            src={comparisonTrack.coverArtUrl}
                                            alt={comparisonTrack.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Play button overlay */}
                                    {comparisonTrack.previewUrl && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                playPreview(comparisonTrack.id, comparisonTrack.previewUrl)
                                            }}
                                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <div className={`w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg ${playingTrackId === comparisonTrack.id ? 'animate-pulse' : ''}`}>
                                                {playingTrackId === comparisonTrack.id ? (
                                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </div>
                                <h3 className="font-bold text-white text-base md:text-lg mb-1 truncate">{comparisonTrack.title}</h3>
                                <p className="text-slate-400 text-sm truncate mb-4">{comparisonTrack.artist}</p>
                                <button
                                    onClick={() => handleChoice(false)}
                                    className="w-full py-2.5 md:py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
                                >
                                    Choose
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Remaining count */}
                    <p className="text-center text-slate-500 text-sm">
                        {state.unrankedList.length + 1} songs remaining to rank
                    </p>

                    {/* Mobile toggle for live ranking */}
                    <div className="lg:hidden mt-6">
                        <button
                            onClick={() => setShowLiveRanking(!showLiveRanking)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            {showLiveRanking ? 'Hide' : 'Show'} Live Ranking ({state.rankedList.length})
                        </button>
                    </div>
                </div>

                {/* Live ranking sidebar */}
                <div className={`
                    ${showLiveRanking ? 'block' : 'hidden'} lg:block
                    w-full lg:w-80 xl:w-96
                    bg-slate-800/50 border-t lg:border-t-0 lg:border-l border-slate-700
                    lg:max-h-screen lg:overflow-hidden
                `}>
                    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Live Ranking</h3>
                        <span className="text-sm text-slate-400">{state.rankedList.length} songs</span>
                    </div>
                    <div className="overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-60px)]">
                        {state.rankedList.map((track, index) => (
                            <div
                                key={track.id}
                                className="flex items-center gap-3 p-3 hover:bg-slate-700/30 border-b border-slate-700/50"
                            >
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                    index === 1 ? 'bg-slate-300 text-black' :
                                        index === 2 ? 'bg-amber-600 text-white' :
                                            'bg-slate-700 text-slate-300'
                                    }`}>
                                    {index + 1}
                                </span>
                                {track.coverArtUrl && (
                                    <img src={track.coverArtUrl} alt="" className="w-8 h-8 rounded" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                                    <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                                </div>
                            </div>
                        ))}
                        {state.rankedList.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                <p>Rankings will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
