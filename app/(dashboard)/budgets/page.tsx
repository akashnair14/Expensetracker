'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Plus, Edit2, 
  Copy, Zap
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfMonth } from 'date-fns'

const EMOJI_MAP: Record<string, string> = {
  'Food & Dining': '🍔',
  'Transport': '🚗',
  'Housing': '🏠',
  'Shopping': '🛒',
  'Bills & Utilities': '⚡',
  'Entertainment': '🎬',
  'Health': '🏥',
  'Investment': '📈',
  'Other': '📦',
}

const BUDGET_TEMPLATES = [
  {
    name: 'Frugal Mode',
    desc: 'Conservative spending for high savings.',
    budgets: [
      { category: 'Food & Dining', amount: 8000 },
      { category: 'Transport', amount: 3000 },
      { category: 'Shopping', amount: 2000 },
      { category: 'Bills & Utilities', amount: 5000 },
    ]
  },
  {
    name: 'Balanced Life',
    desc: 'Standard limits for a comfortable lifestyle.',
    budgets: [
      { category: 'Food & Dining', amount: 15000 },
      { category: 'Transport', amount: 6000 },
      { category: 'Shopping', amount: 8000 },
      { category: 'Bills & Utilities', amount: 8000 },
    ]
  },
  {
    name: 'Save Aggressively',
    desc: 'Tight limits to reach goals faster.',
    budgets: [
      { category: 'Food & Dining', amount: 6000 },
      { category: 'Transport', amount: 2000 },
      { category: 'Shopping', amount: 1000 },
      { category: 'Bills & Utilities', amount: 4000 },
    ]
  }
]

export interface Budget {
  id: string
  category: string
  amount: number
  month: string
}

export default function BudgetsPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  
  const currentMonthStr = format(new Date(), 'yyyy-MM')
  
  const [formData, setFormData] = useState({
    category: 'Food & Dining',
    amount: '',
    month: currentMonthStr
  })

  // Fetch Budgets
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: async () => {
      const res = await fetch('/api/budgets')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
  })

  // Fetch Transactions for current month
  const { data: txData } = useQuery({
    queryKey: ['transactions', 'current-month'],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const res = await fetch(`/api/transactions?start_date=${start}`)
      if (!res.ok) return { transactions: [] }
      return res.json()
    }
  })

  const mutation = useMutation({
    mutationFn: async (newBudget: Partial<Budget>) => {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setIsModalOpen(false)
      setEditingBudget(null)
      setFormData({ category: 'Food & Dining', amount: '', month: currentMonthStr })
    }
  })

  const categorySpent = useMemo(() => {
    const spent: Record<string, number> = {}
    txData?.transactions?.forEach((tx: { category: string; amount: number; is_debit: boolean }) => {
      if (tx.is_debit) {
        spent[tx.category] = (spent[tx.category] || 0) + tx.amount
      }
    })
    return spent
  }, [txData])

  // Sparkline data for last 7 days
  const categorySparklines = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
    const sparklines: Record<string, { date: string; amount: number }[]> = {}

    txData?.transactions?.forEach((tx: { category: string; amount: number; date: string; is_debit: boolean }) => {
      if (!tx.is_debit) return
      if (!sparklines[tx.category]) {
        sparklines[tx.category] = last7Days.map(date => ({ date, amount: 0 }))
      }
      const dayIndex = last7Days.indexOf(tx.date)
      if (dayIndex !== -1) {
        sparklines[tx.category][dayIndex].amount += tx.amount
      }
    })
    return sparklines
  }, [txData])

  const safeBudgets = Array.isArray(budgets) ? budgets : []
  const totalBudgeted = safeBudgets.reduce((acc, b) => acc + b.amount, 0)
  const totalSpent = Object.values(categorySpent).reduce((acc, s) => acc + s, 0)
  const totalPercent = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0
  
  const healthScore = totalPercent > 100 ? '🔴 Over Budget' : totalPercent > 85 ? '🟡 Watch Out' : totalPercent > 0 ? '🟢 On Track' : '⚪ No Budget'

  const handleApplyTemplate = (template: typeof BUDGET_TEMPLATES[0]) => {
    template.budgets.forEach(b => {
      mutation.mutate({ ...b, month: currentMonthStr })
    })
  }

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display text-white tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-brand-green" /> Budgets
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-surface2 border border-border text-[10px] font-mono text-brand-green uppercase tracking-wider">
              {format(new Date(), 'MMMM yyyy')}
            </span>
            <p className="text-text-muted font-mono text-sm">Set limits, save more.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-green text-[#0D0F14] px-6 py-3 rounded-xl font-ui font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20"
        >
          <Plus className="w-4 h-4" /> Set Budgets
        </button>
      </div>

      {/* TOTAL BUDGET SUMMARY */}
      <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target className="w-32 h-32 text-white" />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-8">
          <div className="space-y-1">
            <span className="text-xs font-mono text-text-muted uppercase tracking-widest">Total Monthly Status</span>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-display text-white">₹{totalSpent.toLocaleString()}</div>
              <div className="text-xl font-mono text-text-muted">/ ₹{totalBudgeted.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold font-ui ${
              totalPercent > 100 ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 
              totalPercent > 85 ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
              'bg-brand-green/10 text-brand-green border border-brand-green/20'
            }`}>
              {healthScore}
            </span>
            <span className="text-sm font-mono text-text-muted">₹{(totalBudgeted - totalSpent).toLocaleString()} remaining</span>
          </div>
        </div>

        <div className="relative h-4 w-full bg-border rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${totalPercent}%` }}
            className={`h-full transition-all duration-1000 ${
              totalPercent > 100 ? 'bg-red-400' : 
              totalPercent > 85 ? 'bg-[#FFD166]' : 
              'bg-brand-green'
            }`}
          />
          {totalPercent > 100 && (
            <div className="absolute inset-0 bg-red-400 animate-pulse opacity-20" />
          )}
        </div>
      </div>

      {/* BUDGET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {budgets.map((budget) => {
            const spent = categorySpent[budget.category] || 0
            const percent = Math.min((spent / budget.amount) * 100, 100)
            const isOver = spent > budget.amount
            const emoji = EMOJI_MAP[budget.category] || '📦'
            const sparklineData = categorySparklines[budget.category] || []

            return (
              <motion.div 
                key={budget.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#141720] border border-[#252A3A] rounded-2xl p-6 hover:border-brand-green/30 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl bg-surface2 w-12 h-12 flex items-center justify-center rounded-2xl border border-border">
                      {emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-display text-white group-hover:text-brand-green transition-colors">{budget.category}</h3>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-mono text-white">₹{spent.toLocaleString()}</span>
                         <span className="text-xs font-mono text-text-muted">/ ₹{budget.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setEditingBudget(budget); setFormData({ category: budget.category, amount: budget.amount.toString(), month: budget.month }); setIsModalOpen(true); }}
                    className="p-2 text-text-muted hover:text-white transition-colors bg-surface2 rounded-lg opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold font-ui px-2 py-0.5 rounded ${
                      isOver ? 'bg-red-400/10 text-red-400' : 'text-text-muted'
                    }`}>
                      {isOver ? 'OVER BUDGET' : `${Math.round(percent)}% used`}
                    </span>
                    
                    {/* Tiny Sparkline */}
                    <div className="h-[30px] w-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                          <Line type="monotone" dataKey="amount" stroke={isOver ? '#FF5C7A' : 'var(--brand-green)'} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="relative h-2 w-full bg-border rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className={`h-full ${
                        isOver ? 'bg-[#FF5C7A]' : 
                        percent > 90 ? 'bg-[#FF5C7A]' :
                        percent > 70 ? 'bg-[#FFD166]' : 
                        'bg-brand-green'
                      }`}
                    />
                    {isOver && (
                      <div className="absolute inset-0 bg-[#FF5C7A] animate-pulse opacity-30 shadow-[0_0_10px_#FF5C7A]" />
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Empty State / Templates */}
        {budgets.length === 0 && !budgetsLoading && (
          <div className="col-span-full space-y-8">
            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-surface/30">
              <Target className="w-20 h-20 text-text-muted mb-6 opacity-20" />
              <h3 className="text-2xl font-display text-white mb-2">No budgets set for {format(new Date(), 'MMMM')}</h3>
              <p className="text-text-muted font-mono text-sm mb-12 text-center max-w-sm">
                Pick a template below or create your own custom limits.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {BUDGET_TEMPLATES.map((tpl) => (
                <div key={tpl.name} className="bg-surface border border-border p-6 rounded-2xl hover:border-brand-green/50 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-display text-white">{tpl.name}</h4>
                      <Zap className="w-5 h-5 text-brand-green opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs font-mono text-text-muted mb-6 leading-relaxed">{tpl.desc}</p>
                    <div className="space-y-2 mb-8">
                      {tpl.budgets.map(b => (
                        <div key={b.category} className="flex justify-between text-[11px] font-mono text-white/60">
                          <span>{EMOJI_MAP[b.category]} {b.category}</span>
                          <span>₹{b.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full py-2.5 bg-surface2 border border-border rounded-xl text-xs font-bold text-white hover:bg-brand-green hover:text-[#0D0F14] hover:border-brand-green transition-all"
                  >
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-fadeIn" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0D0F14] border border-[#252A3A] p-10 rounded-3xl shadow-2xl z-[70] animate-scaleIn">
            <Dialog.Title className="text-3xl font-display text-white mb-2">
              {editingBudget ? 'Edit Budget' : 'Set Budget'}
            </Dialog.Title>
            <Dialog.Description className="text-sm font-mono text-text-muted mb-8">
              Target your spending for a better future.
            </Dialog.Description>

            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...formData, amount: parseFloat(formData.amount) }); }} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Category</label>
                <select 
                  className="bg-[#141720] border border-[#252A3A] rounded-xl px-5 py-4 text-white outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all appearance-none cursor-pointer text-sm"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.keys(EMOJI_MAP).map(cat => (
                    <option key={cat} value={cat}>{EMOJI_MAP[cat]} {cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
                  <input 
                    type="number"
                    placeholder="5000"
                    className="w-full bg-[#141720] border border-[#252A3A] rounded-xl pl-10 pr-5 py-4 text-white outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all text-sm font-mono"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Month</label>
                <input 
                  type="month"
                  className="bg-[#141720] border border-[#252A3A] rounded-xl px-5 py-4 text-white outline-none focus:border-brand-green transition-all text-sm font-mono"
                  value={formData.month}
                  onChange={e => setFormData({ ...formData, month: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button 
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-brand-green text-[#0D0F14] py-4 rounded-xl font-ui font-bold hover:bg-brand-green/90 transition-colors flex items-center justify-center disabled:opacity-50 text-base"
                >
                  {mutation.isPending ? 'Saving...' : editingBudget ? 'Update Budget' : 'Set Budget'}
                </button>
                {!editingBudget && (
                  <button 
                    type="button"
                    onClick={() => { /* Logic to copy last month would go here */ }}
                    className="w-full py-4 bg-surface2 border border-border rounded-xl text-sm font-ui text-white hover:bg-[#1C2030] transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copy from last month
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2 text-xs font-mono text-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}
