'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Filter, ArrowUpRight, 
  TrendingUp, ChevronDown, 
  Info, Sparkles, RefreshCw, Lock
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, 
  Bar, ReferenceLine 
} from 'recharts'
import { usePlanGate } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/db/client'
import { Skeleton } from '@/components/ui/skeleton'
import { User } from '@supabase/supabase-js'

// --- Types ---
interface AnalyticsMetric {
  totalSpentLast30Days: number;
  periodIncome: number;
  periodExpense: number;
  biggestExpense: { amount: number; description: string; date: string } | null;
  avgDailySpend: number;
  daysOverBudget: number;
  currentStreak: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface CashFlowData {
  month: string;
  Income: number;
  Expense: number;
}

interface MerchantData {
  name: string;
  value: number;
}

interface DailySpendData {
  day: string;
  amount: number;
}

interface AnalyticsData {
  metrics: AnalyticsMetric;
  categories: CategoryData[];
  cashFlow: CashFlowData[];
  topMerchants: MerchantData[];
  heatmapData: number[];
  dailySpend: DailySpendData[];
}

// --- Constants ---
const CATEGORY_COLORS = ['#4D9FFF', '#00E5A0', '#FF8C42', '#A78BFA', '#F472B6', '#FCD34D', '#34D399', '#60A5FA']

// --- Components ---

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-ui text-white mb-6 flex items-center gap-2">
    {children}
  </h2>
)

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`bg-surface border border-border rounded-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
  if (active && payload && payload.length) {
    const income = payload.find((p) => p.name === 'Income')?.value || 0
    const expense = payload.find((p) => p.name === 'Expense')?.value || 0
    const savings = income - expense
    return (
      <div className="bg-[#141720] border border-[#252A3A] p-4 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-text-muted font-mono text-xs mb-2 uppercase tracking-wider">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-8">
            <span className="text-white text-sm font-ui flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-green" /> Income
            </span>
            <span className="text-white font-mono text-sm">₹{income.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-white text-sm font-ui flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-blue" /> Expense
            </span>
            <span className="text-white font-mono text-sm">₹{expense.toLocaleString()}</span>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between gap-8">
            <span className="text-text-muted text-sm font-ui">Net Savings</span>
            <span className={`font-mono text-sm ${savings >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
              ₹{savings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const SavingsGauge = ({ rate }: { rate: number | null }) => {
  const radius = 80
  const stroke = 12
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  
  return (
    <div className="flex flex-col items-center justify-center relative pt-4">
      <svg height={radius * 1.2} width={radius * 2} className="transform rotate-0">
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
          fill="none"
          stroke="#252A3A"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 0.5} ${radius - normalizedRadius * 0.7}`}
          fill="none"
          stroke="#f87171"
          strokeWidth={stroke}
        />
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
          fill="none"
          stroke="var(--brand-green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, rate || 0) / 100) * (circumference / 2)} ${circumference}`}
          strokeDashoffset={0}
          className="transition-all duration-1000 ease-out"
        />
        <line
          x1={radius}
          y1={radius}
          x2={radius + (normalizedRadius - 10) * Math.cos((Math.max(0, Math.min(100, rate || 0)) * 1.8 - 180) * Math.PI / 180)}
          y2={radius + (normalizedRadius - 10) * Math.sin((Math.max(0, Math.min(100, rate || 0)) * 1.8 - 180) * Math.PI / 180)}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <circle cx={radius} cy={radius} r="5" fill="white" />
      </svg>
      <div className="absolute top-[65%] text-center">
        <span className="text-3xl font-display text-white">{rate !== null ? `${rate}%` : 'N/A'}</span>
        <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-tighter">Savings Rate</p>
      </div>
    </div>
  )
}

const Heatmap = ({ data }: { data?: number[] }) => {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  
  // Normalize data for display (max opacity at 5+ transactions per week)
  const spots = data || Array.from({ length: 12 * 4 }, () => Math.floor(Math.random() * 40))
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-1 mb-2">
        {months.map((m, i) => (
          <span key={i} className="text-[10px] font-mono text-text-muted text-center">{m}</span>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-2">
        {Array.from({ length: 12 }).map((_, mIdx) => (
          <div key={mIdx} className="grid grid-rows-4 gap-2">
            {Array.from({ length: 4 }).map((_, wIdx) => {
              const val = spots[mIdx * 4 + wIdx]
              return (
                <div 
                  key={wIdx}
                  className="aspect-square rounded-sm transition-all hover:ring-1 hover:ring-white/20"
                  style={{ 
                    backgroundColor: `rgba(0, 229, 160, ${Math.max(0.05, Math.min(1, val / 5))})`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const { isPro } = usePlanGate()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'analytics' | 'upload_limit'>('analytics')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const qc = useQueryClient()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
    enabled: !!user?.id
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['analytics'] })
    setIsRefreshing(false)
  }

  // Set default selected category once data loads
  useEffect(() => {
    if (analytics?.categories?.[0] && !selectedCategory) {
      setSelectedCategory(analytics.categories[0].name)
    }
  }, [analytics, selectedCategory])

  const savingsRate = analytics?.metrics?.periodIncome && analytics?.metrics?.periodIncome > 0
    ? Math.round(((analytics.metrics.periodIncome - analytics.metrics.periodExpense) / analytics.metrics.periodIncome) * 100)
    : null

  const GateOverlay = ({ reason = 'analytics' as const }) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[6px] rounded-2xl p-6 text-center animate-fadeIn">
      <div className="w-12 h-12 rounded-full bg-[#141720] border border-border flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-brand-green" />
      </div>
      <h3 className="text-white font-display text-lg mb-2">Pro Feature</h3>
      <p className="text-text-muted text-xs font-mono mb-6 max-w-[200px]">Unlock deep trends, heatmaps, and multi-account analytics.</p>
      <button 
        onClick={() => { setUpgradeReason(reason); setIsUpgradeModalOpen(true); }}
        className="bg-brand-green text-[#0D0F14] px-6 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform"
      >
        Upgrade Now
      </button>
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col gap-8 pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display text-white tracking-tight">Analytics</h1>
          <p className="text-text-muted font-mono text-sm mt-1">Deep dive into your financial behavior</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="flex items-center gap-2 bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-ui hover:border-brand-green/50 transition-all text-white min-w-[160px]">
              <Calendar className="w-4 h-4 text-brand-green" />
              <span>Last 6 months</span>
              <ChevronDown className="w-4 h-4 ml-auto text-text-muted" />
            </button>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-ui hover:border-brand-green/50 transition-all text-white min-w-[160px]">
              <Filter className="w-4 h-4 text-brand-blue" />
              <span>All Accounts</span>
              <ChevronDown className="w-4 h-4 ml-auto text-text-muted" />
            </button>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-ui hover:border-brand-green/50 transition-all text-white disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-green' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: "Biggest Single Expense", 
            value: analytics?.metrics?.biggestExpense ? `₹${analytics.metrics.biggestExpense.amount.toLocaleString()}` : "₹0", 
            sub: analytics?.metrics?.biggestExpense ? `${analytics.metrics.biggestExpense.description} • ${analytics.metrics.biggestExpense.date}` : "No data", 
            icon: ArrowUpRight, 
            iconColor: "text-red-400" 
          },
          { 
            title: "Average Daily Spend", 
            value: `₹${analytics?.metrics?.avgDailySpend?.toLocaleString() || '0'}`, 
            sub: "Based on last 30 days", 
            icon: TrendingUp, 
            iconColor: "text-brand-blue" 
          },
          { 
            title: "Days Over Budget", 
            value: `${analytics?.metrics?.daysOverBudget || 0} Days`, 
            sub: "Based on active budgets", 
            icon: Info, 
            iconColor: "text-brand-orange" 
          },
          { 
            title: "Current Streak", 
            value: `${analytics?.metrics?.currentStreak || 0} Days`, 
            sub: "Active tracking streak", 
            icon: Sparkles, 
            iconColor: "text-brand-green" 
          },
        ].map((metric, i) => (
          <Card key={i} className="flex flex-col gap-1.5 relative overflow-hidden group">
            {!isPro && i > 1 && <GateOverlay />}
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${!isPro && i > 1 ? 'blur-sm' : ''}`}>
              <metric.icon className={`w-12 h-12 ${metric.iconColor}`} />
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className={!isPro && i > 1 ? 'blur-md select-none opacity-50' : ''}>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{metric.title}</span>
                <div className="text-3xl font-display text-white">{metric.value}</div>
                <span className="text-xs font-mono text-text-muted">{metric.sub}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: Cash Flow Over Time */}
        <Card className="lg:col-span-12 h-[450px] relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Cash Flow Over Time (Last 6 Months)</SectionTitle>
            {isLoading ? <Skeleton className="h-[340px] w-full" /> : (
              <div className="h-[340px] w-full min-h-[340px]">
                {mounted && (
                  <ResponsiveContainer id="analytics-cashflow-chart" width="100%" height="100%" debounce={1}>
                    <AreaChart data={analytics?.cashFlow || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--brand-green)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--brand-green)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--brand-blue)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--brand-blue)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#252A3A" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7394', fontSize: 12, fontFamily: 'DM Mono' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7394', fontSize: 12, fontFamily: 'DM Mono' }} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Income" stroke="var(--brand-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="Expense" stroke="var(--brand-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* CHART 2: Spending by Category */}
        <Card className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full text-left">
            <SectionTitle>Spending by Category</SectionTitle>
          </div>
          {isLoading ? <Skeleton className="w-full h-[400px]" /> : (
            <>
              <div className="h-[300px] w-full relative min-h-[300px]">
                {mounted && (
                  <ResponsiveContainer id="analytics-pie-chart" width="100%" height="100%" debounce={1}>
                    <PieChart>
                      <Pie
                        data={analytics?.categories || []}
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {analytics?.categories?.map((_entry: CategoryData, index: number) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141720', border: '1px solid #252A3A', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontFamily: 'DM Mono' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(val: any) => [`₹${Number(val || 0).toLocaleString()}`, 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-display text-white">₹{analytics?.categories?.reduce((acc: number, c: CategoryData) => acc + c.value, 0).toLocaleString() || '0'}</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Total Period Spend</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full mt-6">
                {analytics?.categories?.slice(0, 8).map((cat: CategoryData, i: number) => {
                  const total = analytics.categories.reduce((acc: number, c: CategoryData) => acc + c.value, 0)
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="text-sm font-ui text-text-muted max-w-[80px] truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-mono text-white">₹{cat.value.toLocaleString()}</span>
                        <span className="text-[10px] font-mono text-text-muted">{Math.round((cat.value / total) * 100)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        {/* CHART 3: Top Merchants */}
        <Card className="lg:col-span-6 h-[460px] relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Where you spend the most</SectionTitle>
            {isLoading ? <Skeleton className="h-[340px] w-full" /> : (
              <div className="h-[340px] w-full min-h-[340px]">
                {mounted && (
                  <ResponsiveContainer id="analytics-merchants-chart" width="100%" height="100%" debounce={1}>
                    <BarChart
                      layout="vertical"
                      data={analytics?.topMerchants || []}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#252A3A" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#fff', fontSize: 11, fontFamily: 'Syne' }}
                        width={100}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#141720', border: '1px solid #252A3A', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontFamily: 'DM Mono' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                      >
                        {analytics?.topMerchants?.map((_entry: MerchantData, i: number) => (
                          <Cell key={i} fill={`url(#barGradient)`} />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--brand-green)" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* CHART 4: Spending Activity (Heatmap) */}
        <Card className="lg:col-span-12 relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Spending Activity</SectionTitle>
            <div className="flex flex-col md:flex-row items-center gap-8 py-4">
              <div className="flex-1 w-full">
                <Heatmap data={analytics?.heatmapData} />
              </div>
              <div className="w-px h-24 bg-border hidden md:block" />
              <div className="flex flex-col gap-4 min-w-[200px]">
                <div className="flex flex-col">
                  <span className="text-3xl font-display text-white">{analytics?.categories?.length || 0}</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase">Active Categories</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-display text-brand-green">₹{analytics?.metrics?.avgDailySpend?.toLocaleString() || '0'}</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase">Average Daily Spend</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CHART 5: Daily Spend Pattern */}
        <Card className="lg:col-span-7">
          <SectionTitle>Daily Spending (Last 30 Days)</SectionTitle>
          {isLoading ? <Skeleton className="h-[280px] w-full" /> : (
            <div className="h-[280px] w-full min-h-[280px]">
              {mounted && (
                <ResponsiveContainer id="analytics-daily-chart" width="100%" height="100%" debounce={1}>
                  <BarChart data={analytics?.dailySpend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#252A3A" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7394', fontSize: 10, fontFamily: 'DM Mono' }}
                      interval={4}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141720', border: '1px solid #252A3A', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontFamily: 'DM Mono' }}
                    />
                    <ReferenceLine y={analytics?.metrics?.avgDailySpend || 0} stroke="#6B7394" strokeDasharray="5 5" label={{ position: 'right', value: 'Avg', fill: '#6B7394', fontSize: 10 }} />
                    <Bar dataKey="amount">
                      {analytics?.dailySpend?.map((entry: DailySpendData, i: number) => (
                        <Cell key={i} fill={entry.amount > (analytics?.metrics?.avgDailySpend || 0) ? '#f87171' : 'var(--brand-green)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </Card>

        {/* CHART 6 & 7: Category Trend & Savings Gauge */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <SectionTitle>Category Check</SectionTitle>
              {analytics?.categories && (
                <select 
                  value={selectedCategory || ''}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs font-mono outline-none text-white max-w-[120px]"
                >
                  {analytics.categories.map((c: CategoryData) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-6">
              <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex items-center gap-4">
                <div className="bg-brand-blue/20 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-brand-blue" />
                </div>
                <p className="text-xs font-mono text-white/90">
                  {selectedCategory ? (
                    <>You&apos;ve spent <span className="text-brand-blue font-bold">₹{analytics?.categories?.find((c: CategoryData) => c.name === selectedCategory)?.value.toLocaleString()}</span> on {selectedCategory} in the last 6 months.</>
                  ) : 'Select a category to see trends.'}
                </p>
              </div>
              <div className="p-4 bg-brand-green/5 border border-brand-green/10 rounded-xl flex items-center gap-4">
                <div className="bg-brand-green/20 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-brand-green" />
                </div>
                <p className="text-xs font-mono text-white/90">
                  Your top merchant is <span className="text-brand-green font-bold">{analytics?.topMerchants?.[0]?.name || 'Unknown'}</span>.
                </p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col items-center">
            <div className="w-full text-left">
              <SectionTitle>Savings Rate</SectionTitle>
            </div>
            <SavingsGauge rate={savingsRate} />
            <p className="text-[10px] font-mono text-text-muted mt-6 text-center italic">
              Financial advisors recommend 20% or more.
            </p>
          </Card>
        </div>

      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        reason={upgradeReason}
      />
    </div>
  )
}
