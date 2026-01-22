'use client'

import { useState } from 'react'

// Sample data for mockups
const mockSong1 = { title: "Blinding Lights", artist: "The Weeknd", coverUrl: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36" }
const mockSong2 = { title: "Shape of You", artist: "Ed Sheeran", coverUrl: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96" }

export default function DesignChangePage() {
    const [activeDesign, setActiveDesign] = useState(0)

    const designs = [
        { name: "Spotify Dark", id: "spotify-dark" },
        { name: "Sage Green (Current)", id: "sage-green" },
        { name: "Modern Minimal", id: "modern-minimal" },
        { name: "Vibrant Gradient", id: "vibrant-gradient" },
    ]

    return (
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Choose Your Design</h1>
                <p className="text-slate-400 mb-8">Click on a theme to see how it looks across all components</p>

                {/* Theme Selector */}
                <div className="flex gap-4 mb-12">
                    {designs.map((design, idx) => (
                        <button
                            key={design.id}
                            onClick={() => setActiveDesign(idx)}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeDesign === idx
                                    ? 'bg-green-500 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {design.name}
                        </button>
                    ))}
                </div>

                {/* Design Preview Area */}
                <div className="space-y-12">
                    {/* Design 0: Spotify Dark */}
                    {activeDesign === 0 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold text-green-500">Spotify Dark Theme</h2>
                            <p className="text-slate-400">Deep blacks with Spotify green accents. Premium feel, great for dark mode lovers.</p>

                            {/* Comparison Cards */}
                            <div className="bg-black rounded-2xl p-8">
                                <h3 className="text-lg font-semibold text-white mb-6 text-center">Which song do you prefer?</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    {[mockSong1, mockSong2].map((song, idx) => (
                                        <div key={idx} className="group bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-green-500 transition-all cursor-pointer">
                                            <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-800">
                                                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-xl">
                                                        <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-white text-lg truncate">{song.title}</h4>
                                            <p className="text-zinc-400 truncate mb-4">{song.artist}</p>
                                            <button className="w-full py-3 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold transition-colors">
                                                Choose This
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ranking Card */}
                            <div className="bg-black rounded-2xl p-6 border border-zinc-800">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={mockSong1.coverUrl} alt="" className="w-20 h-20 rounded-lg" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">My Top 10 Songs</h3>
                                        <p className="text-zinc-400">10 songs • Created today</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex-1 py-2.5 rounded-full bg-green-500 text-black font-bold hover:bg-green-400 transition-colors">
                                        View Ranking
                                    </button>
                                    <button className="px-6 py-2.5 rounded-full border border-zinc-700 text-white font-semibold hover:border-zinc-500 transition-colors">
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Design 1: Sage Green (Current) */}
                    {activeDesign === 1 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold text-[#6b7d5a]">Sage Green Theme (Current)</h2>
                            <p className="text-slate-400">Warm, organic feels with cream backgrounds. Current app design.</p>

                            {/* Comparison Cards */}
                            <div className="bg-[#f5f1e8] rounded-2xl p-8">
                                <h3 className="text-lg font-semibold text-slate-900 mb-6 text-center">Which song do you prefer?</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    {[mockSong1, mockSong2].map((song, idx) => (
                                        <div key={idx} className="group bg-white rounded-xl p-6 border-2 border-[#dce8d0] hover:border-[#6b7d5a] shadow-lg transition-all cursor-pointer">
                                            <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-slate-100">
                                                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-14 h-14 rounded-full bg-[#4a5d3a] flex items-center justify-center shadow-xl">
                                                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-lg truncate">{song.title}</h4>
                                            <p className="text-slate-500 truncate mb-4">{song.artist}</p>
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold transition-all shadow-md">
                                                Choose This
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ranking Card */}
                            <div className="bg-white rounded-2xl p-6 border-2 border-[#dce8d0] shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={mockSong1.coverUrl} alt="" className="w-20 h-20 rounded-lg shadow-md" />
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">My Top 10 Songs</h3>
                                        <p className="text-slate-500">10 songs • Created today</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] text-white font-semibold shadow-md hover:shadow-lg transition-all">
                                        View Ranking
                                    </button>
                                    <button className="px-6 py-2.5 rounded-xl border-2 border-[#dce8d0] text-[#4a5d3a] font-semibold hover:bg-[#e8f0e0] transition-colors">
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Design 2: Modern Minimal */}
                    {activeDesign === 2 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold text-slate-200">Modern Minimal Theme</h2>
                            <p className="text-slate-400">Clean lines, subtle shadows, monochromatic with blue accents.</p>

                            {/* Comparison Cards */}
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-8">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-6 text-center">Which song do you prefer?</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    {[mockSong1, mockSong2].map((song, idx) => (
                                        <div key={idx} className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                                            <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
                                                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                                                        <svg className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{song.title}</h4>
                                            <p className="text-slate-500 text-sm truncate mb-4">{song.artist}</p>
                                            <button className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium transition-colors">
                                                Select
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ranking Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={mockSong1.coverUrl} alt="" className="w-16 h-16 rounded-xl" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">My Top 10 Songs</h3>
                                        <p className="text-slate-500 text-sm">10 songs • Today</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium transition-colors">
                                        View
                                    </button>
                                    <button className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors">
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Design 3: Vibrant Gradient */}
                    {activeDesign === 3 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Vibrant Gradient Theme</h2>
                            <p className="text-slate-400">Bold gradients, glowing effects, energetic vibes.</p>

                            {/* Comparison Cards */}
                            <div className="bg-gradient-to-br from-purple-900/50 via-slate-900 to-pink-900/50 rounded-3xl p-8 border border-purple-500/30">
                                <h3 className="text-lg font-bold text-white mb-6 text-center">Which song do you prefer?</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    {[mockSong1, mockSong2].map((song, idx) => (
                                        <div key={idx} className="group bg-slate-900/80 backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                            <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
                                                <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-xl">
                                                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-white text-lg truncate">{song.title}</h4>
                                            <p className="text-slate-400 truncate mb-4">{song.artist}</p>
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/25">
                                                Choose This
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ranking Card */}
                            <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 border border-white/10">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={mockSong1.coverUrl} alt="" className="w-20 h-20 rounded-xl ring-2 ring-purple-500/50" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">My Top 10 Songs</h3>
                                        <p className="text-slate-400">10 songs • Created today</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                        View Ranking
                                    </button>
                                    <button className="px-6 py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors">
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Back button */}
                <div className="mt-12">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to App
                    </a>
                </div>
            </div>
        </div>
    )
}
