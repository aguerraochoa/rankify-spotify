'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-[#fffdf5]">
      <div className="nb-card p-8 md:p-12 text-center max-w-md">
        <div className="w-20 h-20 bg-[#ff6b6b] border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase mb-4">Something Went Wrong!</h2>
        <p className="font-bold text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3">
          <button onClick={() => reset()} className="flex-1 nb-button px-6 py-3">
            Try Again
          </button>
          <button onClick={() => window.location.href = '/'} className="flex-1 nb-button-outline px-6 py-3">
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
