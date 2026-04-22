'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-brand-green/20 blur-[100px] rounded-full" />
        <SearchX className="w-40 h-40 text-brand-green relative z-10 opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-9xl font-display text-white opacity-10">404</span>
        </div>
      </motion.div>
      
      <div className="space-y-4 max-w-md relative z-10">
        <h1 className="text-5xl font-display text-white tracking-tighter">Lost in the numbers?</h1>
        <p className="text-text-muted font-mono leading-relaxed">
          The page you&apos;re looking for has been moved or doesn&apos;t exist. 
          Don&apos;t worry, your transactions are safe.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-12"
      >
        <Link 
          href="/dashboard"
          className="flex items-center gap-3 bg-brand-green text-[#0D0F14] px-10 py-4 rounded-2xl font-ui font-bold hover:bg-brand-green/90 transition-all shadow-xl shadow-brand-green/20"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </Link>
      </motion.div>
      
      <div className="mt-20 grid grid-cols-3 gap-8 opacity-20 grayscale">
         <div className="w-24 h-2 bg-border rounded-full" />
         <div className="w-24 h-2 bg-border rounded-full" />
         <div className="w-24 h-2 bg-border rounded-full" />
      </div>
    </div>
  )
}
