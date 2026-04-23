import React from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-12 flex items-baseline gap-1 text-3xl font-display text-white">
        Spend<span className="font-ui font-bold">Sense</span>
        <span className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_12px_rgba(0,229,160,0.8)]" />
      </div>

      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-brand-green opacity-40" />
        </div>
        
        <h1 className="font-display text-4xl text-white tracking-tight">
          Your account has been deleted.
        </h1>
        
        <p className="font-mono text-sm text-text-muted leading-relaxed">
          All your data has been permanently removed from our servers. 
          Your subscription has been cancelled and you will not be charged again. 
          Thank you for using SpendSense.
        </p>

        <div className="pt-10">
          <Link 
            href="/"
            className="inline-block bg-surface2 border border-border px-8 py-4 rounded-xl font-display font-bold text-white hover:bg-[#1C2030] transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <p className="absolute bottom-10 font-mono text-[10px] text-text-muted uppercase tracking-widest opacity-40">
        SpendSense © 2024 • Privacy first finance
      </p>
    </div>
  )
}
