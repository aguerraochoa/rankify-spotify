'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-[#fffdf5]">
          <div style={{ background: 'white', border: '4px solid black', boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }} className="p-8 md:p-12 text-center max-w-md">
            <div style={{ width: '80px', height: '80px', background: '#ff6b6b', border: '4px solid black', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} className="flex items-center justify-center mx-auto mb-6">
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>!</span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Critical Error!</h2>
            <p style={{ fontWeight: 700, color: '#4b5563', marginBottom: '1.5rem' }}>
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#ff90e8',
                border: '2px solid black',
                fontWeight: 900,
                textTransform: 'uppercase',
                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
