'use client'

import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Left Panel - Hidden on mobile, 60% on desktop */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-[#0a0c10] flex-col justify-between p-12">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-green/20 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-brand-blue/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        </div>

        {/* Logo & Tagline */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="text-4xl font-display text-white flex items-baseline tracking-wide">
            Spend<span className="font-ui font-bold">Sense</span>
            <span className="w-2 h-2 rounded-full bg-brand-green ml-1 mb-1 shadow-[0_0_8px_rgba(0,229,160,0.8)]" />
          </div>
        </div>

        {/* Floating Stat Cards */}
        <div className="relative z-10 grid grid-cols-1 gap-6 max-w-md mt-20">
          {[
            { title: "₹0 hidden fees", desc: "Completely free core features" },
            { title: "28 AI features", desc: "Powered by Gemini Flash 2.0" },
            { title: "100% private", desc: "Your data never leaves your vault" }
          ].map((stat, i) => (
            <div 
              key={i}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transform transition-transform hover:-translate-y-1 hover:bg-white/10"
              style={{ animation: `slideIn 0.5s ease-out ${i * 0.15}s backwards` }}
            >
              <h3 className="text-xl font-display text-brand-green mb-1">{stat.title}</h3>
              <p className="text-text-muted font-mono text-sm">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-text-muted font-mono text-sm">
            © {new Date().getFullYear()} SpendSense. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
