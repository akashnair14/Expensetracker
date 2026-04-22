'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-6 text-center">
      <div className="bg-red-400/10 p-6 rounded-full border border-red-400/20">
        <AlertCircle className="w-12 h-12 text-red-400" />
      </div>
      
      <div className="space-y-2 max-w-md">
        <h2 className="text-3xl font-display text-white">Something went wrong</h2>
        <p className="text-sm font-mono text-text-muted">
          We encountered an unexpected error while processing your financial data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-brand-green text-[#0D0F14] px-8 py-3 rounded-xl font-ui font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/10"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-surface border border-border px-8 py-3 rounded-xl font-ui text-white hover:bg-[#1C2030] transition-all"
        >
          <Home className="w-4 h-4" /> Back Home
        </Link>
      </div>
      
      <p className="text-[10px] font-mono text-text-muted opacity-50">
        Error ID: {error.digest || 'unknown'}
      </p>
    </div>
  )
}
