import Link from 'next/link'

interface NavHeaderProps {
    showBack?: boolean
    backHref?: string
    backLabel?: string
    title?: string
}

export function NavHeader({
    showBack = false,
    backHref = '/',
    backLabel = 'Back',
    title
}: NavHeaderProps) {
    return (
        <nav className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {showBack ? (
                        <Link
                            href={backHref}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden sm:inline">{backLabel}</span>
                        </Link>
                    ) : (
                        <Link href="/" className="flex items-center gap-2 text-white hover:text-green-400 transition-colors">
                            {/* Custom Rankify Logo - Music note with ranking bars */}
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg hidden sm:inline">Rankify</span>
                        </Link>
                    )}
                    {title && (
                        <span className="text-slate-400 text-sm hidden md:inline">/ {title}</span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/rank"
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Rank
                    </Link>
                    <Link
                        href="/rankings"
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        My Rankings
                    </Link>
                    <Link
                        href="/discover"
                        className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:inline"
                    >
                        Discover
                    </Link>
                </div>
            </div>
        </nav>
    )
}
