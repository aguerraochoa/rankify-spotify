'use client'

export function RetroBouncingDots({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'

  return (
    <div className="flex items-center justify-center gap-1.5" aria-label="Loading" role="status">
      <div
        className={`${dotSize} bg-white border-2 border-black rounded-full animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
        style={{ animationDelay: '0s' }}
      />
      <div
        className={`${dotSize} bg-white border-2 border-black rounded-full animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
        style={{ animationDelay: '0.2s' }}
      />
      <div
        className={`${dotSize} bg-white border-2 border-black rounded-full animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
        style={{ animationDelay: '0.4s' }}
      />
    </div>
  )
}
