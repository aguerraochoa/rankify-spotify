'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface User {
    id: string
    username: string | null
    display_name: string | null
    email: string | null
}

interface UserListModalProps {
    userId: string
    type: 'followers' | 'following'
    title: string
    onClose: () => void
}

export default function UserListModal({ userId, type, title, onClose }: UserListModalProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    const fetchUsers = useCallback(async (pageNum: number, isLoadMore: boolean) => {
        if (isLoadMore) setLoadingMore(true)
        else setLoading(true)

        try {
            const response = await fetch(`/api/users/${userId}/${type}?page=${pageNum}&limit=25`)
            if (!response.ok) throw new Error('Failed to fetch users')
            const data = await response.json()

            if (isLoadMore) {
                setUsers((prev) => [...prev, ...data.users])
            } else {
                setUsers(data.users)
            }
            setHasMore(data.hasMore)
            setPage(pageNum)
        } catch (err) {
            console.error(`Error fetching ${type}:`, err)
            setError(`Failed to load ${type}`)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [userId, type])

    useEffect(() => {
        fetchUsers(1, false)
        // Lock body scroll
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [fetchUsers])

    const handleLoadMore = () => {
        fetchUsers(page + 1, true)
    }

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border-2 border-slate-200 dark:border-slate-700"
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading && page === 1 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4a5d3a] border-t-transparent mb-2"></div>
                            <p className="text-slate-500 text-sm">Loading...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">{error}</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">No {type} yet</div>
                    ) : (
                        <div className="space-y-1">
                            {users.map((user) => (
                                <Link
                                    key={user.id}
                                    href={`/users/${user.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors group"
                                >
                                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-full font-bold text-white text-sm shadow-sm group-hover:shadow-md transition-shadow">
                                        {(user.display_name || user.username || user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {user.display_name || user.username || 'User'}
                                        </p>
                                        {user.username && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}

                            {hasMore && (
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="w-full py-4 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] hover:text-[#5a6d4a] dark:hover:text-white transition-colors disabled:opacity-50"
                                >
                                    {loadingMore ? 'Loading more...' : 'Load more'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
