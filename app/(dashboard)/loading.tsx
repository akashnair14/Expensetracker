'use client'

import { Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-brand-green/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-brand-green" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-xl font-display text-white">Loading your finances</h3>
        <p className="text-xs font-mono text-text-muted">Analyzing transactions & budget data...</p>
      </div>
      
      {/* Skeleton placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12 opacity-50">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-surface border border-border rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
