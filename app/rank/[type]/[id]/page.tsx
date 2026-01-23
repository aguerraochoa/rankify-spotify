'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
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
    const [showLiveRanking, setShowLiveRanking] = useState(false)
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

    const playPreview = (trackId: string, previewUrl: string | null | undefined) => {
        if (!previewUrl) return

        if (playingTrackId === trackId && audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play()
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
        audio.addEventListener('ended', () => setPlayingTrackId(null))
        audio.play()
        setPlayingTrackId(trackId)
    }

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
                ranking_state: state,
            })

            if (error) throw error
            alert('Draft saved!')
        } catch (error) {
            console.error('Error saving draft:', error)
            alert('Failed to save draft.')
        } finally {
            setSavingDraft(false)
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

    // Loading state
    if (loading || !params) {
        return (
            <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mx-auto mb-4"></div>
                    <p className="font-bold uppercase">Loading Tracks...</p>
                </div>
            </div>
        )
    }

    // Completed state
    if (isComplete && state) {
        return (
            <div className="min-h-screen bg-[#fffdf5] p-4 md:p-6">
                <div className="max-w-3xl mx-auto pt-4 md:pt-8">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-block bg-[#4ade80] border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4 transform rotate-2">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase mb-2">Ranking Complete!</h1>
                        <div className="nb-tag">{name} • {state.rankedList.length} SONGS</div>
                    </div>

                    {/* Final ranking list */}
                    <div className="nb-card overflow-hidden mb-6">
                        <div className="p-4 border-b-4 border-black bg-[#ffd700]">
                            <h2 className="font-black uppercase">Your Final Ranking</h2>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {state.rankedList.map((track, index) => (
                                <div
                                    key={track.id}
                                    className="flex items-center gap-3 p-3 border-b-2 border-black last:border-0 hover:bg-[#ffd700]/20"
                                >
                                    <span className={`w-10 h-10 flex items-center justify-center border-2 border-black font-black text-sm ${index === 0 ? 'bg-[#ffd700]' :
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
                        <button
                            onClick={() => router.push('/rank')}
                            className="flex-1 py-4 nb-button-outline"
                        >
                            Rank Another
                        </button>
                        <button
                            onClick={saveRanking}
                            disabled={saving}
                            className="flex-1 py-4 nb-button disabled:opacity-50"
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
                {/* Main comparison area */}
                <div className="flex-1 p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <div className="max-w-3xl mx-auto mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => router.push('/rank')}
                                className="nb-button-outline px-3 py-2 text-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                                Exit
                            </button>
                            <div className="nb-tag">
                                {songsRanked} / {tracks.length} RANKED
                            </div>
                            <button
                                onClick={saveDraft}
                                disabled={savingDraft}
                                className="nb-button-outline px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                {savingDraft ? '...' : 'Save Draft'}
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="h-4 bg-white border-2 border-black overflow-hidden mb-2">
                            <div
                                className="h-full bg-[#4ade80] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="truncate max-w-[150px]">{name}</span>
                            <span>{Math.round(progress)}% complete</span>
                        </div>
                    </div>

                    {/* VS Header */}
                    <div className="text-center mb-6">
                        <div className="inline-block bg-[#ffd700] border-2 border-black px-4 py-2 font-black text-sm uppercase transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            VS_MODE_ACTIVE
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black uppercase">
                            Choose Your Fighter
                        </h2>
                    </div>

                    {/* Comparison cards */}
                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 relative">
                        {/* VS Badge (desktop only) */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-black text-white font-black text-2xl px-4 py-2 rotate-12 hidden md:block border-2 border-white">
                            VS
                        </div>

                        {/* Current item (left/top) */}
                        <div className="nb-card p-4 md:p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer group">
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
                                {/* Play button */}
                                {state.currentItem.previewUrl && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            playPreview(state.currentItem!.id, state.currentItem!.previewUrl)
                                        }}
                                        className="absolute bottom-2 right-2 w-12 h-12 bg-black border-2 border-white flex items-center justify-center hover:bg-[#ff90e8] transition-colors"
                                    >
                                        {playingTrackId === state.currentItem.id ? (
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            <h3 className="font-black text-lg md:text-xl uppercase mb-1 truncate">{state.currentItem.title}</h3>
                            <p className="font-bold text-sm bg-[#00d4ff] inline-block px-2 border border-black mb-4 truncate max-w-full">{state.currentItem.artist}</p>
                            <button
                                onClick={() => handleChoice(true)}
                                className="w-full py-4 nb-button"
                            >
                                Vote This
                            </button>
                        </div>

                        {/* Comparison item (right/bottom) */}
                        <div className="nb-card p-4 md:p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer group">
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
                                {/* Play button */}
                                {comparisonTrack.previewUrl && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            playPreview(comparisonTrack.id, comparisonTrack.previewUrl)
                                        }}
                                        className="absolute bottom-2 right-2 w-12 h-12 bg-black border-2 border-white flex items-center justify-center hover:bg-[#ff90e8] transition-colors"
                                    >
                                        {playingTrackId === comparisonTrack.id ? (
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            <h3 className="font-black text-lg md:text-xl uppercase mb-1 truncate">{comparisonTrack.title}</h3>
                            <p className="font-bold text-sm bg-[#ff6b6b] inline-block px-2 border border-black mb-4 truncate max-w-full">{comparisonTrack.artist}</p>
                            <button
                                onClick={() => handleChoice(false)}
                                className="w-full py-4 nb-button"
                            >
                                Vote This
                            </button>
                        </div>
                    </div>

                    {/* Remaining count */}
                    <p className="text-center font-bold text-sm">
                        {state.unrankedList.length + 1} songs remaining to rank
                    </p>

                    {/* Mobile toggle for live ranking */}
                    <div className="lg:hidden mt-6">
                        <button
                            onClick={() => setShowLiveRanking(!showLiveRanking)}
                            className="w-full py-3 nb-button-outline flex items-center justify-center gap-2"
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
                    bg-white border-t-4 lg:border-t-0 lg:border-l-4 border-black
                `}>
                    <div className="p-4 border-b-4 border-black bg-[#ff90e8] flex items-center justify-between">
                        <h3 className="font-black uppercase">Live Ranking</h3>
                        <span className="nb-tag text-xs">{state.rankedList.length} songs</span>
                    </div>
                    <div className="overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-60px)]">
                        {state.rankedList.map((track, index) => (
                            <div
                                key={track.id}
                                className="flex items-center gap-3 p-3 border-b-2 border-black hover:bg-[#ffd700]/30"
                            >
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
                        {state.rankedList.length === 0 && (
                            <div className="p-8 text-center font-bold text-gray-500">
                                Rankings will appear here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
