import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-[#fffdf5]">
      <div className="nb-card p-8 md:p-12 text-center max-w-md">
        <div className="w-20 h-20 bg-[#ff6b6b] border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-4xl font-black">404</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">Page Not Found</h2>
        <p className="font-bold text-gray-600 mb-6">This page doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="nb-button px-8 py-3 inline-block">
          Return Home
        </Link>
      </div>
    </div>
  )
}
