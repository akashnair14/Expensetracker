'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, X, Star, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'upload_limit' | 'ai_reports' | 'analytics' | 'export'
}

const REASONS: Record<string, { title: string; description: string }> = {
  upload_limit: {
    title: "You've used all 5 free uploads",
    description: "Upgrade to Pro for unlimited uploads and AI insights."
  },
  ai_reports: {
    title: "AI Reports is a Pro feature",
    description: "Unlock deep monthly reviews and actionable financial advice."
  },
  analytics: {
    title: "Full Analytics is a Pro feature",
    description: "Unlock advanced charts, trends, and spending heatmaps."
  },
  export: {
    title: "Export is a Pro feature",
    description: "Export your data to CSV or PDF for external accounting."
  }
}

export default function UpgradeModal({ isOpen, onClose, reason = 'upload_limit' }: UpgradeModalProps) {
  const router = useRouter()
  const content = REASONS[reason]
  
  const handleUpgrade = () => {
    router.push('/pricing')
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-[440px] bg-[#141720] border border-[#252A3A] rounded-2xl p-8 shadow-2xl relative pointer-events-auto"
                >
                  <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
 
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20 mb-6">
                      <Lock className="w-6 h-6 text-brand-green" />
                    </div>
 
                    <h2 className="text-xl font-display text-white mb-2">{content.title}</h2>
                    <p className="text-sm font-mono text-text-muted mb-8 leading-relaxed">
                      {content.description}
                    </p>
 
                    <div className="grid grid-cols-1 gap-4 w-full">
                      <button 
                        onClick={() => handleUpgrade()}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border bg-surface hover:border-brand-green/40 hover:bg-surface2 transition-all text-left"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-ui font-bold text-white">Monthly Plan</span>
                          <span className="text-xs font-mono text-text-muted">₹69 / month</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-brand-green text-[#0D0F14] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-ui text-brand-green font-bold group-hover:hidden">Upgrade</span>
                      </button>
 
                      <button 
                        onClick={() => handleUpgrade()}
                        className="group flex items-center justify-between p-4 rounded-xl border-2 border-brand-green/30 bg-brand-green/5 hover:border-brand-green transition-all text-left relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-brand-green text-[#0D0F14] text-[9px] font-bold px-2 py-0.5 rounded-bl">BEST VALUE</div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-ui font-bold text-white">Annual Plan</span>
                            <Star className="w-3 h-3 text-brand-green fill-brand-green" />
                          </div>
                          <span className="text-xs font-mono text-text-muted">₹799 / year (₹66/mo)</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-brand-green mb-1">Save ₹29/mo</span>
                          <span className="text-xs font-ui text-brand-green font-bold">Select</span>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={onClose}
                      className="mt-6 text-xs font-mono text-text-muted hover:text-white transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
