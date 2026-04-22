'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FileSearch, Target, Sparkles, Plus } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  type: 'transactions' | 'budgets' | 'reports'
}

export function EmptyState({ title, description, actionLabel, onAction, type }: EmptyStateProps) {
  const icons = {
    transactions: (
      <div className="relative">
        <div className="absolute inset-0 bg-brand-blue/20 blur-2xl rounded-full" />
        <FileSearch className="w-16 h-16 text-brand-blue relative z-10" />
      </div>
    ),
    budgets: (
      <div className="relative">
        <div className="absolute inset-0 bg-brand-green/20 blur-2xl rounded-full" />
        <Target className="w-16 h-16 text-brand-green relative z-10" />
      </div>
    ),
    reports: (
      <div className="relative">
        <div className="absolute inset-0 bg-brand-orange/20 blur-2xl rounded-full" />
        <Sparkles className="w-16 h-16 text-brand-orange relative z-10" />
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl bg-surface/30"
    >
      <div className="mb-6">{icons[type]}</div>
      <h3 className="text-xl font-display text-white mb-2">{title}</h3>
      <p className="text-sm font-mono text-text-muted max-w-xs mb-8">{description}</p>
      
      {actionLabel && (
        <button 
          onClick={onAction}
          className="flex items-center gap-2 bg-surface2 border border-border px-6 py-2.5 rounded-xl text-white font-ui hover:border-brand-green/50 transition-all text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </motion.div>
  )
}
