'use client'

import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Info } from 'lucide-react'
import { useCreateGoal, useUpdateGoal } from '@/hooks/useGoals'
import { Goal } from '@/types/goals'

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  existingGoal?: Goal
}

const PRESET_EMOJIS = ['💻', '📱', '✈️', '🏠', '🚗', '💍', '🎓', '🛡️', '🏖️', '🎸', '💪', '🐶', '🌍', '🎉', '💰', '🎯']
const PRESET_COLORS = ['#00E5A0', '#4D9FFF', '#FFD166', '#FF5C7A', '#B48EFF', '#FF8C42', '#00D4FF', '#FF6EC7']

export default function CreateGoalModal({ isOpen, onClose, existingGoal }: CreateGoalModalProps) {
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    emoji: '🎯',
    color: '#00E5A0',
    monthly_contribution: '',
    deadline: '',
    priority: 2 as 1 | 2 | 3
  })

  useEffect(() => {
    if (existingGoal) {
      setFormData({
        name: existingGoal.name,
        target_amount: existingGoal.target_amount.toString(),
        emoji: existingGoal.emoji,
        color: existingGoal.color,
        monthly_contribution: existingGoal.monthly_contribution?.toString() || '',
        deadline: existingGoal.deadline || '',
        priority: existingGoal.priority
      })
    } else {
      setFormData({
        name: '',
        target_amount: '',
        emoji: '🎯',
        color: '#00E5A0',
        monthly_contribution: '',
        deadline: '',
        priority: 2
      })
    }
  }, [existingGoal, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.target_amount) return

    const data = {
      ...formData,
      target_amount: Number(formData.target_amount),
      monthly_contribution: formData.monthly_contribution ? Number(formData.monthly_contribution) : null,
      id: existingGoal?.id
    }

    if (existingGoal) {
      await updateMutation.mutateAsync(data)
    } else {
      await createMutation.mutateAsync(data)
    }
    onClose()
  }

  // Live calculation
  const monthsRemaining = (formData.target_amount && formData.monthly_contribution) 
    ? Math.ceil(Number(formData.target_amount) / Number(formData.monthly_contribution))
    : null

  const projectedDate = monthsRemaining 
    ? new Date(Date.now() + monthsRemaining * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[500px] bg-[#141720] border border-[#252A3A] rounded-3xl shadow-2xl p-0 overflow-hidden z-[101]"
              >
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <Dialog.Title className="text-xl font-display text-white">
                    {existingGoal ? 'Edit Goal' : 'Create New Goal'}
                  </Dialog.Title>
                  <Dialog.Close className="p-2 hover:bg-surface2 rounded-full text-text-muted">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                  {/* Emoji Picker */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-widest">Pick an icon for your goal</label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, emoji: e }))}
                          className={`text-2xl p-2 rounded-xl transition-all ${
                            formData.emoji === e ? 'bg-brand-green/10 border border-brand-green scale-110 shadow-lg shadow-brand-green/10' : 'bg-surface2 border border-transparent hover:border-white/10'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-widest">What are you saving for?</label>
                    <div className="relative">
                       <input
                        autoFocus
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. New MacBook, Goa Trip, Emergency Fund"
                        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white focus:border-brand-green focus:outline-none font-ui transition-all"
                        maxLength={40}
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono ${formData.name.length > 30 ? 'text-brand-green' : 'text-text-muted'}`}>
                        {formData.name.length}/40
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-widest">How much do you need?</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
                      <input
                        type="number"
                        value={formData.target_amount}
                        onChange={e => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-surface2 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:border-brand-green focus:outline-none font-mono transition-all"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['10000', '25000', '50000', '100000'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, target_amount: val }))}
                          className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-surface2 border border-border text-text-muted hover:border-brand-green hover:text-brand-green transition-all"
                        >
                          ₹{Number(val).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-widest">Choose a colour</label>
                    <div className="flex gap-3">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                          className={`w-7 h-7 rounded-full transition-all ring-offset-[#141720] ${
                            formData.color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Monthly Contribution */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-text-muted uppercase tracking-widest">Monthly contribution</label>
                      <span className="text-[10px] text-text-muted font-mono italic">Optional</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
                      <input
                        type="number"
                        value={formData.monthly_contribution}
                        onChange={e => setFormData(prev => ({ ...prev, monthly_contribution: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-surface2 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:border-brand-green focus:outline-none font-mono transition-all"
                      />
                    </div>
                    {projectedDate && (
                      <p className="text-[11px] font-mono text-brand-green flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        At ₹{Number(formData.monthly_contribution).toLocaleString()}/mo → goal in {monthsRemaining} months (by {projectedDate})
                      </p>
                    )}
                  </div>

                  {/* Deadline & Priority */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-text-muted uppercase tracking-widest">Deadline</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.deadline}
                        onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                        className="w-full bg-[#1C2030] border border-[#252A3A] rounded-xl px-4 py-2.5 text-[#E2E6F0] focus:border-brand-green focus:outline-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-text-muted uppercase tracking-widest">Priority</label>
                      <div className="flex bg-surface2 rounded-xl p-1 border border-border">
                        {[
                          { val: 1, label: '🔴', title: 'High' },
                          { val: 2, label: '🟡', title: 'Med' },
                          { val: 3, label: '🟢', title: 'Low' }
                        ].map(p => (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, priority: p.val as 1 | 2 | 3 }))}
                            className={`flex-1 flex flex-col items-center py-1 rounded-lg transition-all ${
                              formData.priority === p.val ? 'bg-[#141720] shadow-lg border border-border/50' : 'opacity-40 hover:opacity-100'
                            }`}
                          >
                            <span className="text-sm">{p.label}</span>
                            <span className="text-[8px] font-mono uppercase font-bold text-white">{p.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </form>

                <div className="p-6 bg-surface2/30 flex items-center justify-between border-t border-border">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner bg-surface2 border border-border">
                        {formData.emoji}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-xs text-white font-ui font-bold truncate max-w-[120px]">{formData.name || 'Untitled Goal'}</span>
                        <span className="text-[10px] text-text-muted font-mono">₹{Number(formData.target_amount || 0).toLocaleString()}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-ui text-text-muted hover:text-white transition-all">Cancel</button>
                    <button 
                      onClick={handleSubmit}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-brand-green text-[#0D0F14] px-6 py-2.5 rounded-xl text-sm font-display font-bold hover:scale-105 transition-all shadow-lg shadow-brand-green/20 flex items-center gap-2"
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <div className="w-4 h-4 border-2 border-[#0D0F14] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {existingGoal ? 'Save Changes' : 'Create Goal'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
