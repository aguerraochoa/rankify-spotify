'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { SearchResult } from '@/lib/spotify/types'
import LoadingScreen from '@/components/LoadingScreen'

interface RankingState {
    rankedList: SearchResult[]
    unrankedList: SearchResult[]
    currentItem: SearchResult | null
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
                const ids = params.id.split(',')
                let allTracks: SearchResult[] = []
                let hasError = false

                for (const id of ids) {
                    const endpoint = params.type === 'playlist'
                        ? `/api/spotify/playlists/${id}/tracks`
                        : `/api/spotify/albums/${id}/tracks`

                    const res = await fetch(endpoint)
                    if (res.ok) {
                        const data = await res.json()
                        // Ensure data is an array
                        if (Array.isArray(data)) {
                            allTracks = [...allTracks, ...data]
                        }
                    } else if (res.status === 401) {
                        router.push(`/login?next=/rank/${params.type}/${params.id}&error=spotify_expired`)
                        return
                    } else {
                        // Log error but continue with other albums
                        console.error(`Failed to fetch tracks for ${params.type} ${id}:`, res.status)
                        hasError = true
                    }
                }

                // Remove duplicates if any
                const uniqueTracks = Array.from(new Map(allTracks.map(item => [item.id, item])).values())

                // Always shuffle tracks using Fisher-Yates algorithm for better randomization
                if (uniqueTracks.length > 1) {
                    for (let i = uniqueTracks.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [uniqueTracks[i], uniqueTracks[j]] = [uniqueTracks[j], uniqueTracks[i]];
                    }
                }

                setTracks(uniqueTracks)

                if (uniqueTracks.length > 0) {
                    if (uniqueTracks.length === 1) {
                        // Special case: only one track - mark as complete immediately
                        setState({
                            rankedList: [uniqueTracks[0]],
                            unrankedList: [],
                            currentItem: null,
                            comparisonIndex: 0,
                            low: 0,
                            high: 0,
                        })
                        setIsComplete(true)
                    } else {
                        // Normal case: 2+ tracks
                        setState({
                            rankedList: [uniqueTracks[0]],
                            unrankedList: uniqueTracks.slice(2),
                            currentItem: uniqueTracks[1] || null,
                            comparisonIndex: 0,
                            low: 0,
                            high: 0,
                        })
                    }
                } else {
                    // No tracks found - set empty state so error message shows
                    setState(null)
                }
            } catch (error) {
                console.error('Error fetching tracks:', error)
                setState(null)
            } finally {
                setLoading(false)
            }
        }

        fetchTracks()
    }, [params, router])

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

    const handleSkip = useCallback(() => {
        if (!state?.currentItem) return

        if (audioRef.current) {
            audioRef.current.pause()
            setPlayingTrackId(null)
        }

        const skippedTrackId = state.currentItem.id

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

        // Remove from total tracks count
        setTracks(prev => prev.filter(t => t.id !== skippedTrackId))
    }, [state])


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

    const [savingSpotify, setSavingSpotify] = useState(false)

    const saveToSpotify = async () => {
        if (!state) return
        setSavingSpotify(true)
        try {
            const uris = state.rankedList.map(t => t.spotifyUri).filter(Boolean) as string[]
            const res = await fetch('/api/spotify/create-playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Ranked: ${name}`,
                    uris,
                    description: `Ranked with Rankify on ${new Date().toLocaleDateString()}`
                })
            })

            if (res.ok) {
                const data = await res.json()
                window.open(data.playlistUrl, '_blank')
            } else {
                alert('Failed to save to Spotify')
            }
        } catch (e) {
            console.error(e)
            alert('Error saving to Spotify')
        } finally {
            setSavingSpotify(false)
        }
    }

    // Loading state
    if (loading || !params) {
        return <LoadingScreen message="Loading Tracks..." />
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

                    <div className="flex flex-col gap-3">
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
                        <button
                            onClick={saveToSpotify}
                            disabled={savingSpotify}
                            className="w-full py-4 text-white font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 bg-[#1DB954]"
                        >
                            {savingSpotify ? 'Creating Playlist...' : 'Save to Spotify'}
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!state || (!state.currentItem && !isComplete)) {
        return (
            <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center p-4">
                <div className="nb-card p-8 text-center max-w-md">
                    <p className="font-bold mb-6">Not enough tracks to rank.</p>
                    <p className="text-sm font-bold text-gray-600 mb-6">
                        The selected albums don't have enough tracks to create a ranking. Please try selecting different albums.
                    </p>
                    <button
                        onClick={() => router.push('/rank')}
                        className="nb-button px-6 py-3"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    // Type guard: ensure currentItem exists (should always be true at this point)
    if (!state.currentItem) {
        return null
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
                            Choose Your Song
                        </h2>
                    </div>

                    {/* Comparison cards */}
                    <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3 md:gap-6 mb-4 relative">
                        {/* VS Badge */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-black text-white font-black text-lg md:text-2xl px-2 md:px-4 py-1 md:py-2 rotate-12 border-2 border-white">
                            VS
                        </div>

                        {/* Current item (left/top) */}
                        <div className="nb-card p-3 md:p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer group">
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
                            <h3 className="font-black text-base md:text-xl uppercase mb-1 truncate leading-tight w-full">{state.currentItem.title}</h3>
                            <div className="min-w-0 max-w-full">
                                <p className="font-bold text-[10px] md:text-sm bg-[#00d4ff] inline-block px-1.5 md:px-2 border border-black mb-3 md:mb-4 truncate max-w-full">{state.currentItem.artist}</p>
                            </div>
                            <button
                                onClick={() => handleChoice(true)}
                                className="w-full py-2 md:py-4 nb-button text-xs md:text-base"
                            >
                                Vote This
                            </button>
                        </div>

                        {/* Comparison item (right/bottom) */}
                        <div className="nb-card p-3 md:p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer group">
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
                            <h3 className="font-black text-base md:text-xl uppercase mb-1 truncate leading-tight w-full">{comparisonTrack.title}</h3>
                            <div className="min-w-0 max-w-full">
                                <p className="font-bold text-[10px] md:text-sm bg-[#ff6b6b] inline-block px-1.5 md:px-2 border border-black mb-3 md:mb-4 truncate max-w-full">{comparisonTrack.artist}</p>
                            </div>
                            <button
                                onClick={() => handleChoice(false)}
                                className="w-full py-2 md:py-4 nb-button text-xs md:text-base"
                            >
                                Vote This
                            </button>
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
