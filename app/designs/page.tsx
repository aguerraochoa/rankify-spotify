'use client'

import Link from 'next/link'
import Image from 'next/image'

// --- Mock Data ---
const mockRanking = {
    name: "Top 5 '80s Classics",
    owner: "RetroFan85",
    date: "January 14, 2026",
    status: "Public",
    song_count: 5,
    songs: [
        { rank: 1, title: "Billie Jean", artist: "Michael Jackson", album: "Thriller" },
        { rank: 2, title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: "Appetite for Destruction" },
        { rank: 3, title: "Take On Me", artist: "a-ha", album: "Hunting High and Low" },
        { rank: 4, title: "Purple Rain", artist: "Prince", album: "Purple Rain" },
        { rank: 5, title: "Africa", artist: "Toto", album: "Toto IV" },
    ]
}

const mockComparison = {
    songA: { title: "Billie Jean", artist: "Michael Jackson", album: "Thriller" },
    songB: { title: "Purple Rain", artist: "Prince", album: "Purple Rain" }
}

export default function DesignShowcase() {
    return (
        <main className="min-h-screen p-4 md:p-12 space-y-32 bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="max-w-7xl mx-auto text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Design Direction Showcase</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    Five potential aesthetic directions for Rankify. Each section below reimagines the <strong>Ranking Interface</strong> (Comparison View) using a different design system.
                </p>
                <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">
                    &larr; Back to App
                </Link>
            </div>

            {/* 1. Modern Minimalist */}
            <section className="max-w-5xl mx-auto">
                <div className="mb-6 border-b border-slate-200 pb-4">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Option 1: Modern Minimalist</h2>
                    <p className="text-xs text-slate-400 mt-1">Focus on typography, whitespace, and content.</p>
                </div>

                {/* APP VIEW - COMPARISON */}
                <div className="bg-white min-h-[600px] border border-slate-100 shadow-sm p-8 md:p-12 flex flex-col items-center justify-center">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-light text-slate-900 mb-2">Which song is better?</h3>
                        <p className="text-slate-400 text-sm">Comparison 1 of 10</p>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                        {/* Card A */}
                        <div className="group border border-slate-200 hover:border-slate-800 transition-all cursor-pointer p-8 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-slate-100 mb-6"></div>
                            <h4 className="text-xl font-medium text-slate-900 mb-2">{mockComparison.songA.title}</h4>
                            <p className="text-sm text-slate-500 mb-8">{mockComparison.songA.artist}</p>
                            <button className="px-8 py-3 bg-slate-900 text-white text-sm hover:bg-black transition-colors">
                                Select
                            </button>
                        </div>

                        {/* Card B */}
                        <div className="group border border-slate-200 hover:border-slate-800 transition-all cursor-pointer p-8 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-slate-100 mb-6"></div>
                            <h4 className="text-xl font-medium text-slate-900 mb-2">{mockComparison.songB.title}</h4>
                            <p className="text-sm text-slate-500 mb-8">{mockComparison.songB.artist}</p>
                            <button className="px-8 py-3 bg-slate-900 text-white text-sm hover:bg-black transition-colors">
                                Select
                            </button>
                        </div>
                    </div>

                    <button className="mt-12 text-slate-400 hover:text-slate-600 text-sm underline underline-offset-4">
                        I haven&apos;t heard one of these
                    </button>
                </div>
            </section>

            {/* 2. Neubrutalism */}
            <section className="max-w-5xl mx-auto font-mono">
                <div className="mb-6 border-b-4 border-black pb-4">
                    <h2 className="text-xl font-bold uppercase">Option 2: Neubrutalism</h2>
                    <p className="text-xs font-bold mt-1">High contrast, raw, trendy.</p>
                </div>

                {/* APP VIEW - COMPARISON */}
                <div className="bg-[#fffdf5] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 min-h-[600px] flex flex-col justify-center">
                    <div className="text-center mb-12">
                        <div className="inline-block bg-yellow-300 border-2 border-black px-4 py-2 font-bold text-lg transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            VS_MODE_ACTIVE
                        </div>
                        <h3 className="text-4xl font-black uppercase">CHOOSE YOUR FIGHTER</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-black text-white font-black text-2xl px-4 py-2 rotate-12 md:block hidden">
                            VS
                        </div>

                        {/* Card A */}
                        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                            <div className="w-full aspect-square bg-blue-500 border-4 border-black mb-4 flex items-center justify-center">
                                <span className="text-6xl font-black text-white">A</span>
                            </div>
                            <h4 className="text-2xl font-black uppercase mb-1">{mockComparison.songA.title}</h4>
                            <p className="font-bold bg-blue-200 inline-block px-1 border border-black text-sm">{mockComparison.songA.artist}</p>
                            <button className="w-full mt-6 py-4 bg-[#ff90e8] border-2 border-black font-black hover:bg-[#ff70e0] transition-colors">
                                VOTE THIS
                            </button>
                        </div>

                        {/* Card B */}
                        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                            <div className="w-full aspect-square bg-red-500 border-4 border-black mb-4 flex items-center justify-center">
                                <span className="text-6xl font-black text-white">B</span>
                            </div>
                            <h4 className="text-2xl font-black uppercase mb-1">{mockComparison.songB.title}</h4>
                            <p className="font-bold bg-red-200 inline-block px-1 border border-black text-sm">{mockComparison.songB.artist}</p>
                            <button className="w-full mt-6 py-4 bg-[#ff90e8] border-2 border-black font-black hover:bg-[#ff70e0] transition-colors">
                                VOTE THIS
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Glassmorphism */}
            <section className="max-w-5xl mx-auto">
                <div className="mb-6 pb-4">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Option 3: Glassmorphism</h2>
                    <p className="text-xs text-slate-500 mt-1">Depth, blurs, and modern aesthetics.</p>
                </div>

                {/* APP VIEW - COMPARISON */}
                <div className="relative rounded-3xl overflow-hidden min-h-[700px] p-8 md:p-12 flex flex-col justify-center">
                    {/* Background Blobs */}
                    <div className="absolute inset-0 bg-slate-100">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 to-purple-50"></div>
                        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000"></div>
                    </div>

                    <div className="relative z-10 w-full max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <h3 className="text-3xl font-bold text-slate-800 mb-2">Build Your Ranking</h3>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 text-sm font-medium text-slate-600">
                                <span>Comparison 3 of 15</span>
                                <div className="w-20 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                    <div className="w-1/3 h-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card A */}
                            <div className="group relative bg-white/40 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl hover:bg-white/50 hover:scale-[1.02] transition-all cursor-pointer">
                                <div className="absolute -top-6 left-8 w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg group-hover:-translate-y-2 transition-transform duration-300"></div>
                                <div className="mt-16 text-center">
                                    <h4 className="text-2xl font-bold text-slate-800 mb-1">{mockComparison.songA.title}</h4>
                                    <p className="text-slate-600 font-medium mb-6">{mockComparison.songA.artist}</p>
                                    <div className="w-12 h-12 mx-auto rounded-full bg-white/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card B */}
                            <div className="group relative bg-white/40 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl hover:bg-white/50 hover:scale-[1.02] transition-all cursor-pointer">
                                <div className="absolute -top-6 left-8 w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg group-hover:-translate-y-2 transition-transform duration-300"></div>
                                <div className="mt-16 text-center">
                                    <h4 className="text-2xl font-bold text-slate-800 mb-1">{mockComparison.songB.title}</h4>
                                    <p className="text-slate-600 font-medium mb-6">{mockComparison.songB.artist}</p>
                                    <div className="w-12 h-12 mx-auto rounded-full bg-white/50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Cyber / Dark Neon */}
            <section className="max-w-5xl mx-auto font-sans">
                <div className="mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white flex gap-2 items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Option 4: Cyber Aesthetics
                    </h2>
                </div>

                {/* APP VIEW - COMPARISON */}
                <div className="bg-[#050505] min-h-[600px] border border-slate-800 relative overflow-hidden p-8 md:p-12 flex flex-col justify-center">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-grid-slate-800/[0.2] [mask-image:linear-gradient(0deg,rgba(0,0,0,0.5),rgba(0,0,0,0))]"></div>

                    <div className="relative z-10 w-full max-w-4xl mx-auto">
                        <div className="flex justify-between items-end mb-8 border-b border-cyan-900/30 pb-4">
                            <div>
                                <div className="text-cyan-500 font-mono text-xs mb-1 tracking-widest">
                                    {`>>> INITIATING_COMPARISON_PROTOCOL`}
                                </div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">
                                    Analyze & Select
                                </h3>
                            </div>
                            <div className="font-mono text-cyan-400 text-xl">
                                03<span className="text-slate-600">/10</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card A */}
                            <div className="group relative border border-slate-800 bg-slate-900/50 p-6 hover:bg-cyan-950/10 hover:border-cyan-500/50 transition-all cursor-pointer overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-slate-800 border border-slate-700 group-hover:border-cyan-500/50 transition-colors relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">IMG_NULL</div>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{mockComparison.songA.title}</h4>
                                        <div className="text-sm font-mono text-slate-500 group-hover:text-cyan-200/70">{mockComparison.songA.artist}</div>
                                    </div>
                                </div>
                                <button className="mt-6 w-full py-2 border border-slate-700 text-slate-500 font-mono text-xs uppercase tracking-widest group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-500 transition-all">
                                    Confirm_Selection_A
                                </button>
                            </div>

                            {/* Card B */}
                            <div className="group relative border border-slate-800 bg-slate-900/50 p-6 hover:bg-purple-950/10 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_#c084fc]"></div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-slate-800 border border-slate-700 group-hover:border-purple-500/50 transition-colors relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">IMG_NULL</div>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{mockComparison.songB.title}</h4>
                                        <div className="text-sm font-mono text-slate-500 group-hover:text-purple-200/70">{mockComparison.songB.artist}</div>
                                    </div>
                                </div>
                                <button className="mt-6 w-full py-2 border border-slate-700 text-slate-500 font-mono text-xs uppercase tracking-widest group-hover:bg-purple-500 group-hover:text-black group-hover:border-purple-500 transition-all">
                                    Confirm_Selection_B
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Soft UI (Pastel) */}
            <section className="max-w-5xl mx-auto">
                <div className="mb-6 pb-4">
                    <h2 className="text-2xl font-bold text-slate-600">Option 5: Soft UI</h2>
                    <p className="text-xs text-slate-400 mt-1">Friendly, rounded, and welcoming.</p>
                </div>

                {/* APP VIEW - COMPARISON */}
                <div className="bg-[#faf9f6] p-8 md:p-12 rounded-[3rem] shadow-sm min-h-[600px] flex flex-col justify-center">
                    <div className="text-center mb-10">
                        <h3 className="text-3xl font-bold text-slate-800 mb-3 font-serif">Pick Your Favorite</h3>
                        <div className="inline-block h-2 bg-[#ffe4e1] rounded-full w-48 overflow-hidden">
                            <div className="h-full bg-[#ffb7b2] w-1/3 rounded-full"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
                        {/* Card A */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-transform cursor-pointer border-4 border-transparent hover:border-[#a8e6cf]">
                            <div className="w-full aspect-[4/3] bg-[#e0f7fa] rounded-[1.5rem] mb-6 flex items-center justify-center text-4xl">
                                🎵
                            </div>
                            <h4 className="text-2xl font-bold text-slate-700 text-center mb-1">{mockComparison.songA.title}</h4>
                            <p className="text-slate-400 text-center font-medium mb-6">{mockComparison.songA.artist}</p>
                            <button className="w-full py-3 rounded-full bg-[#f0f4f8] text-slate-600 font-bold hover:bg-[#a8e6cf] hover:text-[#1a5c42] transition-colors">
                                I Like This One
                            </button>
                        </div>

                        {/* Card B */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-transform cursor-pointer border-4 border-transparent hover:border-[#ffb7b2]">
                            <div className="w-full aspect-[4/3] bg-[#fff0f5] rounded-[1.5rem] mb-6 flex items-center justify-center text-4xl">
                                🎸
                            </div>
                            <h4 className="text-2xl font-bold text-slate-700 text-center mb-1">{mockComparison.songB.title}</h4>
                            <p className="text-slate-400 text-center font-medium mb-6">{mockComparison.songB.artist}</p>
                            <button className="w-full py-3 rounded-full bg-[#f0f4f8] text-slate-600 font-bold hover:bg-[#ffb7b2] hover:text-[#5c1a1a] transition-colors">
                                I Like This One
                            </button>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    )
}
