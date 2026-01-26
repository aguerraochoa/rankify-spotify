'use client'

import React, { useState } from 'react'

const LoadingScreens = () => {
    const [activeScreen, setActiveScreen] = useState<number | null>(null)

    const designs = [
        {
            id: 1,
            name: "The Classic (Current)",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#fffdf5] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="w-16 h-16 border-4 border-black border-t-[#ff90e8] animate-spin mb-4"></div>
                    <p className="font-bold uppercase tracking-tighter">Loading Tracks...</p>
                </div>
            )
        },
        {
            id: 2,
            name: "The Spinning Vinyl",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#00d4ff] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-black rounded-full animate-[spin_3s_linear_infinite]">
                            {/* Record Grooves */}
                            <div className="absolute inset-2 border-2 border-gray-800 rounded-full"></div>
                            <div className="absolute inset-4 border-2 border-gray-800 rounded-full"></div>
                            <div className="absolute inset-6 border-2 border-gray-800 rounded-full"></div>
                            {/* Label */}
                            <div className="absolute inset-[30%] bg-[#ff90e8] border-2 border-black rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-black rounded-full"></div>
                            </div>
                        </div>
                        {/* Needle */}
                        <div className="absolute -right-2 top-0 w-12 h-2 bg-black origin-right rotate-45 transform"></div>
                    </div>
                    <p className="font-black uppercase text-xl italic bg-white px-4 border-2 border-black">Spinning the hits...</p>
                </div>
            )
        },
        {
            id: 3,
            name: "The Ranking Podium",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#ff6b6b] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-end gap-2 h-24 mb-6">
                        {/* 2nd Place */}
                        <div className="w-12 bg-[#c0c0c0] border-4 border-black animate-[bounce_1s_infinite_0.1s]" style={{ height: '60%' }}>
                            <div className="flex items-center justify-center h-full font-black text-2xl">2</div>
                        </div>
                        {/* 1st Place */}
                        <div className="w-12 bg-[#ffd700] border-4 border-black animate-[bounce_1s_infinite_0s]" style={{ height: '90%' }}>
                            <div className="flex items-center justify-center h-full font-black text-2xl">1</div>
                        </div>
                        {/* 3rd Place */}
                        <div className="w-12 bg-[#cd7f32] border-4 border-black animate-[bounce_1s_infinite_0.2s]" style={{ height: '40%' }}>
                            <div className="flex items-center justify-center h-full font-black text-2xl">3</div>
                        </div>
                    </div>
                    <p className="font-black uppercase text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Calculating Ranks...</p>
                </div>
            )
        },
        {
            id: 4,
            name: "The Neon Waveform",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-black border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)]">
                    <div className="flex gap-1 items-center h-16 mb-6">
                        {[0, 1, 2, 3, 4, 3, 2, 1, 0].map((h, i) => (
                            <div
                                key={i}
                                className="w-2 bg-[#4ade80] border border-white"
                                style={{
                                    height: `${20 + Math.random() * 80}%`,
                                    animation: `loading-wave 0.8s ease-in-out infinite ${i * 0.1}s`
                                }}
                            ></div>
                        ))}
                    </div>
                    <style jsx>{`
                        @keyframes loading-wave {
                            0%, 100% { height: 20%; }
                            50% { height: 100%; }
                        }
                    `}</style>
                    <p className="text-[#4ade80] font-mono uppercase tracking-[0.2em] animate-pulse">Analyzing Frequencies</p>
                </div>
            )
        },
        {
            id: 5,
            name: "The VS Duel",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#ffd700] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-4 mb-6">
                        {/* Fighter A */}
                        <div className="w-16 h-16 bg-[#00d4ff] border-4 border-black animate-[ping_1.5s_infinite] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                            <span className="font-black text-2xl">A</span>
                        </div>
                        {/* VS Badge */}
                        <div className="bg-black text-white font-black px-3 py-1 rotate-12 border-2 border-white text-xl">VS</div>
                        {/* Fighter B */}
                        <div className="w-16 h-16 bg-[#ff6b6b] border-4 border-black animate-[ping_1.5s_infinite_0.75s] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                            <span className="font-black text-2xl">B</span>
                        </div>
                    </div>
                    <p className="font-black uppercase italic text-2xl tracking-tighter">Preparing Duel...</p>
                </div>
            )
        },
        {
            id: 6,
            name: "The Cassette Tape",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#ff90e8] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="w-32 h-20 bg-black border-4 border-black rounded-lg relative overflow-hidden">
                        {/* Tape Windows */}
                        <div className="absolute top-4 left-4 w-8 h-8 bg-[#fffdf5] border-2 border-black rounded-full flex items-center justify-center">
                            <div className="w-1 h-4 bg-black animate-[spin_1s_linear_infinite]"></div>
                        </div>
                        <div className="absolute top-4 right-4 w-8 h-8 bg-[#fffdf5] border-2 border-black rounded-full flex items-center justify-center">
                            <div className="w-1 h-4 bg-black animate-[spin_1s_linear_infinite]"></div>
                        </div>
                        {/* Bottom Bar */}
                        <div className="absolute bottom-0 inset-x-0 h-4 bg-gray-800 border-t-2 border-black"></div>
                    </div>
                    <p className="font-black uppercase mt-4 text-black italic">Winding the tape...</p>
                </div>
            )
        },
        {
            id: 7,
            name: "The Bass Pulse",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#4ade80] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 bg-black border-4 border-black rounded-full animate-[ping_1s_infinite]"></div>
                        <div className="relative w-full h-full bg-black border-4 border-black rounded-full flex items-center justify-center">
                            <div className="w-12 h-12 bg-[#ffd700] rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <p className="font-black uppercase mt-6 tracking-widest text-black">Feeling the beat</p>
                </div>
            )
        },
        {
            id: 8,
            name: "The 8-Bit Runner",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#00d4ff] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-48 h-12 bg-white border-4 border-black mb-4 overflow-hidden">
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-8 bg-black animate-[loading-run_1.5s_linear_infinite]"></div>
                    </div>
                    <style jsx>{`
                        @keyframes loading-run {
                            0% { left: -10%; transform: translateY(-50%) rotate(0deg); }
                            100% { left: 110%; transform: translateY(-50%) rotate(360deg); }
                        }
                    `}</style>
                    <p className="font-black uppercase italic text-black">Chasing the rhythm</p>
                </div>
            )
        },
        {
            id: 9,
            name: "The Equalizer",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-end gap-1 h-20 mb-4">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((_, i) => (
                            <div
                                key={i}
                                className="w-3 bg-[#ff90e8] border-x border-black"
                                style={{
                                    height: `${Math.random() * 100}%`,
                                    animation: `eq-jump 0.5s ease-in-out infinite ${i * 0.05}s`
                                }}
                            ></div>
                        ))}
                    </div>
                    <style jsx>{`
                        @keyframes eq-jump {
                            0%, 100% { height: 20%; }
                            50% { height: 90%; }
                        }
                    `}</style>
                    <p className="font-black uppercase text-[#ff90e8]">Mastering Audio...</p>
                </div>
            )
        },
        {
            id: 10,
            name: "The Volume Knob",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#fffdf5] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-24 h-24 border-8 border-black rounded-full bg-gray-200 animate-[knob-turn_2s_ease-in-out_infinite]">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-6 bg-black rounded-full"></div>
                    </div>
                    <style jsx>{`
                        @keyframes knob-turn {
                            0% { transform: rotate(-120deg); }
                            50% { transform: rotate(120deg); }
                            100% { transform: rotate(-120deg); }
                        }
                    `}</style>
                    <p className="font-black uppercase mt-6 text-black">Turning it up</p>
                </div>
            )
        },
        {
            id: 11,
            name: "The Card Shuffle",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#ff6b6b] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-20 h-28">
                        <div className="absolute inset-0 bg-white border-4 border-black transform -rotate-6 animate-[shuffle-1_1s_infinite]"></div>
                        <div className="absolute inset-0 bg-[#00d4ff] border-4 border-black transform rotate-3 animate-[shuffle-2_1s_infinite]"></div>
                        <div className="absolute inset-0 bg-[#ffd700] border-4 border-black flex items-center justify-center font-black text-4xl">?</div>
                    </div>
                    <style jsx>{`
                        @keyframes shuffle-1 {
                            0%, 100% { transform: rotate(-6deg) translateX(0); }
                            50% { transform: rotate(-12deg) translateX(-20px); }
                        }
                        @keyframes shuffle-2 {
                            0%, 100% { transform: rotate(3deg) translateX(0); }
                            50% { transform: rotate(8deg) translateX(20px); }
                        }
                    `}</style>
                    <p className="font-black uppercase mt-6 text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Shuffling Cards</p>
                </div>
            )
        },
        {
            id: 12,
            name: "The Bouncing Play",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#ffd700] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="w-20 h-20 bg-black border-4 border-black rounded-full flex items-center justify-center animate-bounce">
                        <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2"></div>
                    </div>
                    <p className="font-black uppercase mt-6 italic text-2xl">Drop the beat</p>
                </div>
            )
        },
        {
            id: 13,
            name: "The Laser Scan",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#333] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="relative w-48 h-32 bg-black border-4 border-black">
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,212,255,0.1)_50%)] bg-[length:100%_4px]"></div>
                        <div className="absolute top-0 inset-x-0 h-1 bg-[#00d4ff] shadow-[0_0_15px_#00d4ff] animate-[scan-line_2s_linear_infinite]"></div>
                        <div className="flex flex-col gap-2 p-4">
                            <div className="h-2 bg-gray-800 w-3/4 animate-pulse"></div>
                            <div className="h-2 bg-gray-800 w-1/2 animate-pulse"></div>
                            <div className="h-2 bg-gray-800 w-2/3 animate-pulse"></div>
                        </div>
                    </div>
                    <style jsx>{`
                        @keyframes scan-line {
                            0% { top: 0%; }
                            100% { top: 100%; }
                        }
                    `}</style>
                    <p className="font-mono uppercase mt-4 text-[#00d4ff] tracking-[0.3em] font-bold">Scanning Library</p>
                </div>
            )
        },
        {
            id: 14,
            name: "The Disco Shine",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative w-24 h-24 bg-gray-400 border-4 border-black rounded-full overflow-hidden">
                        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                            <div className="grid grid-cols-4 grid-rows-4 h-full w-full">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className={`border border-black/20 ${i % 2 === 0 ? 'bg-white/10' : 'bg-white/30'} animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent"></div>
                    </div>
                    <p className="font-black uppercase mt-6 text-[#ffd700] text-xl">Party mode loading</p>
                </div>
            )
        },
        {
            id: 15,
            name: "The Growing Stack",
            component: (
                <div className="flex flex-col items-center justify-center p-12 bg-[#fffdf5] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col gap-1 w-32">
                        {[50, 70, 90, 100].map((w, i) => (
                            <div
                                key={i}
                                className="h-4 bg-black border-2 border-black"
                                style={{
                                    width: `${w}%`,
                                    animation: `stack-grow 1s ease-in-out infinite ${i * 0.1}s`
                                }}
                            ></div>
                        ))}
                    </div>
                    <style jsx>{`
                        @keyframes stack-grow {
                            0%, 100% { transform: scaleX(1); opacity: 1; }
                            50% { transform: scaleX(0.8); opacity: 0.5; }
                        }
                    `}</style>
                    <p className="font-black uppercase mt-6 text-black tracking-tighter">Ranking Layers...</p>
                </div>
            )
        }
    ]

    return (
        <div className="min-h-screen bg-[#fffdf5] p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-6">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter">Loading Labs</h1>
                    <p className="font-bold text-xl uppercase bg-[#ff90e8] inline-block px-4 border-4 border-black">Testing new visual experiences</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {designs.map((design) => (
                        <div key={design.id} className="flex flex-col">
                            <div className="mb-4">
                                <span className="nb-tag text-lg">DESIGN #{design.id}</span>
                                <h3 className="text-2xl font-black uppercase mt-2">{design.name}</h3>
                            </div>

                            <div className="flex-1 min-h-[350px] flex items-center justify-center relative group">
                                {design.component}

                                <button
                                    onClick={() => setActiveScreen(design.id)}
                                    className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <div className="bg-white border-4 border-black p-4 font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-2">
                                        View Fullscreen
                                    </div>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Fullscreen Overlay */}
                {activeScreen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveScreen(null)}
                            className="absolute top-8 right-8 nb-button px-6 py-3"
                        >
                            Close Preview
                        </button>
                        <div className="transform scale-150">
                            {designs.find(d => d.id === activeScreen)?.component}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LoadingScreens
