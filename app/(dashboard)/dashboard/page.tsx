'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ArrowDownRight, Sparkles, ArrowRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { createClient } from '@/lib/db/client'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
// import { Transaction } from '@/types'

interface BarDataPoint {
  month: string;
  Income: number;
  Expense: number;
  rawDate: Date;
}

// Simple count up effect
function CountUp({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [display, setDisplay] = useState("0")
  
  useEffect(() => {
    let startTime: number
    const duration = 1200
    // ease out quad
    const easeOut = (t: number) => t * (2 - t)
    
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const current = easeOut(progress) * value
      setDisplay(`${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`)
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplay(`${prefix}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`)
      }
    }
    window.requestAnimationFrame(step)
  }, [value, prefix, suffix, decimals])
  
  return <span>{display}</span>
}

const CATEGORY_COLORS = ['#00E5A0', '#4D9FFF', '#FF8C42', '#A78BFA', '#F472B6', '#FCD34D']

export default function DashboardPage() {
  const supabase = createClient()
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [mounted, setMounted] = useState(false)
  const now = new Date()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])
  const [dateRange, setDateRange] = useState<'month' | '3months' | '6months' | 'all'>('all')

  const getDateRange = () => {
    if (dateRange === 'month') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      }
    } else if (dateRange === '3months') {
      const start = new Date(now); start.setMonth(start.getMonth() - 3)
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    } else if (dateRange === '6months') {
      const start = new Date(now); start.setMonth(start.getMonth() - 6)
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    }
    return { start: null, end: null } // All time
  }

  const { start: startDate, end: endDate } = getDateRange()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase.auth])

  // Fetch from APIs as specified
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', user?.id, startDate, endDate, dateRange],
    queryFn: async () => {
      if (!user?.id) return null
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.id
  })

  const { data: budgets, isLoading: bdLoading } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await fetch('/api/budgets')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!user?.id
  })

  const isLoading = txLoading || bdLoading

  // Aggregate stats from API
  const totalSpent = txData?.totalDebit || 0
  const totalIncome = txData?.totalCredit || 0
  const netSavings = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0
  
  // Budget logic
  const currentMonthBudgets = budgets?.filter((b: { month: string }) => b.month === now.toISOString().slice(0, 7)) || []
  const totalBudgetLimit = currentMonthBudgets.reduce((acc: number, b: { amount: number | string }) => acc + Number(b.amount), 0) || 60000
  const budgetRemainingPercent = totalBudgetLimit > 0 ? Math.max(0, Math.round(((totalBudgetLimit - totalSpent) / totalBudgetLimit) * 100)) : 0

  const pieData = txData?.categoryBreakdown 
    ? Object.entries(txData.categoryBreakdown).map(([name, value]) => ({ name, value: Number(value) }))
    : []

  const recentTransactions = txData?.transactions?.slice(0, 5).map((tx: { id: string, date: string, merchant: string, description: string, category: string, amount: number | string, is_debit: boolean }) => ({
    id: tx.id,
    date: format(new Date(tx.date), 'MMM dd'),
    merchant: tx.merchant || tx.description.split(' ')[0],
    category: tx.category,
    amount: Number(tx.amount),
    isDebit: tx.is_debit
  })) || []

  // Add empty bar data placeholder if not enough data
  // Group daily stats into monthly bars
  const barData = txData?.dailyStats ? Object.entries(txData.dailyStats as Record<string, { income: number, expense: number }>)
    .reduce((acc: BarDataPoint[], [date, stats]) => {
      const monthYear = format(new Date(date), 'MMM yyyy')
      const existing = acc.find(b => b.month === monthYear)
      if (existing) {
        existing.Income += stats.income
        existing.Expense += stats.expense
      } else {
        acc.push({ month: monthYear, Income: stats.income, Expense: stats.expense, rawDate: new Date(date) })
      }
      return acc
    }, [])
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
    .map(({ month, Income, Expense }) => ({ month, Income, Expense }))
    : []


  return (
    <div className="w-full flex flex-col gap-8 animate-fadeIn">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drawCircle {
          from { stroke-dasharray: 0, 100; }
          to { stroke-dasharray: ${budgetRemainingPercent}, 100; }
        }
      `}} />

      {/* SECTION 1 — Top greeting bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-white">
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-text-muted font-mono mt-1">Here&apos;s your financial snapshot</p>
        </div>
        <div className="flex items-center gap-2">
          {(['month', '3months', '6months', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
                dateRange === r
                  ? 'bg-brand-green text-[#0D0F14] font-bold'
                  : 'bg-surface2 border border-border text-text-muted hover:border-brand-green/50'
              }`}
            >
              {r === 'month' ? 'This Month' : r === '3months' ? '3 Months' : r === '6months' ? '6 Months' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2 — 4 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Spent", value: totalSpent, prefix: "₹", color: "text-white", sub: "+12% vs last month", up: true },
          { title: "Total Income", value: totalIncome, prefix: "₹", color: "text-brand-green", sub: "+5% vs last month", up: true },
          { title: "Net Savings", value: netSavings, prefix: "₹", color: netSavings >= 0 ? "text-brand-green" : "text-red-400", sub: `${savingsRate}% savings rate`, badge: true },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
            <h3 className="text-text-muted font-mono text-sm">{stat.title}</h3>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-3xl font-display ${stat.color}`}>
                <CountUp value={stat.value} prefix={stat.prefix} />
              </div>
            )}
            <div className="flex items-center gap-1 mt-auto pt-2">
              {stat.badge ? (
                <span className="bg-brand-green/10 text-brand-green text-[10px] px-2 py-0.5 rounded-full font-bold">{stat.sub}</span>
              ) : (
                <>
                  {stat.up ? <ArrowUpRight className="w-3 h-3 text-red-400" /> : <ArrowDownRight className="w-3 h-3 text-brand-green" />}
                  <span className="text-xs text-text-muted font-mono">{stat.sub}</span>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Budget Remaining Card */}
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-2 z-10">
            <h3 className="text-text-muted font-mono text-sm">Budget Remaining</h3>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-display text-white">
                <CountUp value={budgetRemainingPercent} suffix="%" />
              </div>
            )}
            <span className="text-xs text-text-muted font-mono mt-auto pt-2">of ₹60,000 limit</span>
          </div>
          {/* Circular Progress SVG */}
          <div className="relative w-16 h-16 mr-2 z-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${budgetRemainingPercent}, 100`} className="text-brand-green animate-[drawCircle_1.5s_ease-out]" />
            </svg>
          </div>
        </div>
      </div>

      {/* SECTION 5 — AI Insight Card */}
      <div className="bg-gradient-to-r from-surface to-surface2 border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="bg-brand-green/10 p-2 rounded-lg shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-brand-green" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand-green text-xs font-bold uppercase tracking-wider font-ui">AI Insight</span>
          </div>
          {isLoading ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <p className="text-white text-sm font-mono leading-relaxed">
              Your transport spending is 15% higher this month compared to March. Consider taking the metro for your daily commute to stay under the ₹8,000 budget.
            </p>
          )}
        </div>
      </div>

      {/* Main Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 3 — Spending by Category */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-ui text-white mb-6">Where your money went</h2>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-40 h-40 rounded-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="h-[200px] w-full min-h-[200px] relative">
                {mounted && (
                  <ResponsiveContainer id="dashboard-pie-chart" width="100%" height="100%" debounce={1}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141720', borderColor: '#252A3A', borderRadius: '8px', color: '#fff', fontFamily: 'DM Mono' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: unknown) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                      <span className="text-text-muted font-mono">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-mono">₹{item.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6 — Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-ui text-white mb-6">Cash Flow Trend</h2>
          {isLoading ? (
            <div className="flex-1 w-full h-[300px]">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <div className="h-[300px] w-full mt-auto min-h-[300px] relative">
              {mounted && (
                <ResponsiveContainer id="dashboard-bar-chart" width="100%" height="100%" debounce={1}>
                  <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#252A3A" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7394', fontSize: 12, fontFamily: 'DM Mono' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7394', fontSize: 12, fontFamily: 'DM Mono' }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#1C2030' }}
                      contentStyle={{ backgroundColor: '#141720', borderColor: '#252A3A', borderRadius: '8px', color: '#fff', fontFamily: 'DM Mono' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontFamily: 'DM Mono', fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="Income" fill="rgba(0, 229, 160, 0.6)" radius={[4, 4, 0, 0]} animationBegin={0} animationDuration={1200} />
                    <Bar dataKey="Expense" fill="#4D9FFF" radius={[4, 4, 0, 0]} animationBegin={0} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        {/* SECTION 4 — Recent Transactions */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-ui text-white mb-4">Recent Transactions</h2>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs font-mono">
                    <th className="pb-3 font-normal font-mono">Date</th>
                    <th className="pb-3 font-normal font-mono">Merchant</th>
                    <th className="pb-3 font-normal font-mono">Category</th>
                    <th className="pb-3 font-normal font-mono text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-border">
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                            <path d="m3.3 7 8.7 5 8.7-5"/>
                            <path d="M12 22V12"/>
                          </svg>
                          <p className="text-text-muted font-mono text-sm">Upload a bank statement to get started</p>
                          <Link href="/upload" className="bg-brand-green text-[#0D0F14] font-bold font-ui px-4 py-2 rounded-md hover:bg-brand-green/90 transition-colors mt-2">
                            Upload Statement
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : recentTransactions.map((tx: { id: string, date: string, merchant: string, category: string, isDebit: boolean, amount: number }) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                      <td className="py-4 text-sm text-text-muted font-mono">{tx.date}</td>
                      <td className="py-4 text-sm text-white font-ui">{tx.merchant}</td>
                      <td className="py-4">
                        <span className="bg-surface2 border border-border px-2.5 py-1 rounded-full text-xs text-text-muted font-mono">
                          {tx.category}
                        </span>
                      </td>
                      <td className={`py-4 text-sm text-right font-mono ${tx.isDebit ? 'text-white' : 'text-brand-green'}`}>
                        {tx.isDebit ? '-' : '+'}₹{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentTransactions.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Link href="/transactions" className="text-brand-green text-sm hover:underline font-mono flex items-center gap-1">
                    View all transactions <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
