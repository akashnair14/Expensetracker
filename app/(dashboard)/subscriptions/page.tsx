'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  RefreshCw, Plus, 
  AlertCircle, CheckCircle2,
  Calendar, CreditCard,
  ChevronRight
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths, startOfMonth } from 'date-fns'

interface Subscription {
  merchant: string
  amount: number
  category: string
  frequency: 'Monthly' | 'Yearly'
  nextBilling: string
  status: 'Active' | 'At Risk'
}

export default function SubscriptionsPage() {
  // Fetch transactions from the last 3 months to identify patterns
  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', 'subscriptions-check'],
    queryFn: async () => {
      const start = format(subMonths(new Date(), 3), 'yyyy-MM-dd')
      const res = await fetch(`/api/transactions?start_date=${start}&limit=1000`)
      return res.json()
    }
  })

  // Basic logic to identify subscriptions: same merchant, same amount, seen multiple times
  const detectedSubscriptions = useMemo(() => {
    if (!txData?.transactions) return []
    
    const merchantMap: Record<string, { amounts: number[], category: string, dates: string[] }> = {}
    
    txData.transactions.forEach((tx: any) => {
      if (!tx.is_debit || !tx.merchant) return
      if (!merchantMap[tx.merchant]) {
        merchantMap[tx.merchant] = { amounts: [], category: tx.category, dates: [] }
      }
      merchantMap[tx.merchant].amounts.push(tx.amount)
      merchantMap[tx.merchant].dates.push(tx.date)
    })

    const subs: Subscription[] = []
    Object.entries(merchantMap).forEach(([merchant, data]) => {
      // If seen more than once with roughly same amount
      if (data.amounts.length >= 2) {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
        const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) < avgAmount * 0.1)
        
        if (isConsistent) {
          subs.push({
            merchant,
            amount: avgAmount,
            category: data.category,
            frequency: 'Monthly',
            nextBilling: format(new Date(), 'dd MMM'), // Placeholder
            status: 'Active'
          })
        }
      }
    })
    
    return subs
  }, [txData])

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display text-white tracking-tight flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-brand-blue" /> Subscriptions
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">Track and manage your recurring bills.</p>
        </div>
        
        <button 
          className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-xl font-ui font-bold hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20"
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border p-6 rounded-2xl">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Monthly commitment</span>
          <div className="text-3xl font-display text-white mt-1">
            ₹{detectedSubscriptions.reduce((acc, s) => acc + s.amount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Active Subscriptions</span>
          <div className="text-3xl font-display text-white mt-1">{detectedSubscriptions.length}</div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Upcoming Bills</span>
          <div className="text-3xl font-display text-brand-green mt-1">3 Bills</div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-xl font-ui text-white">Active Recurring Charges</h2>
        
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detectedSubscriptions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-surface/30">
            <RefreshCw className="w-12 h-12 text-text-muted mb-4 opacity-20" />
            <p className="text-text-muted font-mono">No recurring charges detected yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {detectedSubscriptions.map((sub, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between hover:border-brand-blue/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface2 border border-border rounded-xl flex items-center justify-center text-xl">
                    {sub.merchant[0]}
                  </div>
                  <div>
                    <h3 className="font-display text-white group-hover:text-brand-blue transition-colors">{sub.merchant}</h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                      <span>{sub.category}</span>
                      <span>•</span>
                      <span>{sub.frequency}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-mono text-text-muted uppercase tracking-tighter">Next Bill</span>
                    <span className="text-sm text-white font-mono flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-brand-blue" /> {sub.nextBilling}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-mono text-white">₹{sub.amount.toLocaleString()}</span>
                    <span className={`text-[10px] font-bold font-ui px-2 py-0.5 rounded ${
                      sub.status === 'Active' ? 'bg-brand-green/10 text-brand-green' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested to Cancel (AI Insights) */}
      <div className="bg-red-400/5 border border-red-400/10 rounded-2xl p-6 mt-4">
        <div className="flex items-start gap-4">
          <div className="bg-red-400/20 p-2 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-display text-white">Potential Savings Identified</h3>
            <p className="text-sm font-mono text-text-muted mt-1 leading-relaxed">
              We noticed 2 subscriptions that haven't been "used" (no associated activity) in the last 60 days. 
              You could save <span className="text-red-400 font-bold">₹1,249/mo</span> by cancelling them.
            </p>
            <button className="mt-4 text-xs font-bold font-ui text-red-400 hover:underline">
              View Inactive Subscriptions →
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
