'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface NavHeaderProps {
    showBack?: boolean
    backHref?: string
    backLabel?: string
    title?: string
    onBack?: () => void
}

export function NavHeader({
    showBack = false,
    backHref = '/',
    backLabel = 'Back',
    title,
    onBack
}: NavHeaderProps) {
    const pathname = usePathname()

    const isActive = (path: string) => pathname === path

    return (
        <nav className="border-b-4 border-black bg-[#fffdf5] sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {showBack ? (
                        onBack ? (
                            <button
                                onClick={onBack}
                                className="nb-button-outline px-3 py-2 text-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">{backLabel}</span>
                            </button>
                        ) : (
                            <Link
                                href={backHref}
                                className="nb-button-outline px-3 py-2 text-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">{backLabel}</span>
                            </Link>
                        )
                    ) : (
                        <Link href="/" className="flex items-center gap-2 group">
                            {/* Neubrutalism Logo */}
                            <div className="w-10 h-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden bg-white">
                                <Image
                                    src="/logo.png"
                                    alt="Rankify Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover scale-110"
                                    priority
                                />
                            </div>
                            <span className="font-black text-xl uppercase hidden sm:inline tracking-tight">Rankify</span>
                        </Link>
                    )}
                    {title && (
                        <span className="nb-tag text-xs hidden md:inline">{title}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <Link
                        href="/rank"
                        className={`px-3 py-2 text-sm font-black uppercase border-2 border-black transition-all ${isActive('/rank')
                            ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white hover:bg-[#ffd700] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                    >
                        Rank
                    </Link>
                    <Link
                        href="/rankings"
                        className={`px-3 py-2 text-sm font-black uppercase border-2 border-black transition-all ${isActive('/rankings')
                            ? 'bg-[#ff90e8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white hover:bg-[#ff90e8] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                    >
                        <span className="hidden sm:inline">My </span>Rankings
                    </Link>
                    <Link
                        href="/discover"
                        className={`px-3 py-2 text-sm font-black uppercase border-2 border-black transition-all ${isActive('/discover')
                            ? 'bg-[#00d4ff] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white hover:bg-[#00d4ff] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                    >
                        Discover
                    </Link>
                </div>
            </div>
        </nav>
    )
}
