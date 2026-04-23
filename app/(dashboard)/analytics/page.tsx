'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Filter, ArrowUpRight, 
  TrendingUp, TrendingDown, ChevronDown, 
  Info, Sparkles 
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, 
  Bar, LineChart, Line, ReferenceLine 
} from 'recharts'
import { format, subDays } from 'date-fns'
import { usePlanGate } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { Lock } from 'lucide-react'

// --- Mock Data ---
const MOCK_CASHFLOW = [
  { month: 'Nov', Income: 85000, Expense: 72000 },
  { month: 'Dec', Income: 92000, Expense: 88000 },
  { month: 'Jan', Income: 95000, Expense: 65000 },
  { month: 'Feb', Income: 98000, Expense: 71000 },
  { month: 'Mar', Income: 110000, Expense: 82000 },
  { month: 'Apr', Income: 105000, Expense: 75000 },
]

const MOCK_CATEGORIES = [
  { name: 'Housing', value: 25000, color: '#4D9FFF' },
  { name: 'Food', value: 12500, color: '#00E5A0' },
  { name: 'Transport', value: 8000, color: '#FF8C42' },
  { name: 'Shopping', value: 15000, color: '#A78BFA' },
  { name: 'Bills', value: 9200, color: '#F472B6' },
  { name: 'Other', value: 5300, color: '#FCD34D' },
]

const MOCK_MERCHANTS = [
  { name: 'Amazon', value: 12500 },
  { name: 'Zomato', value: 8400 },
  { name: 'Uber', value: 4200 },
  { name: 'Reliance Fresh', value: 6800 },
  { name: 'Airtel', value: 2100 },
  { name: 'HDFC EMI', value: 25000 },
  { name: 'Netflix', value: 649 },
  { name: 'Swiggy', value: 3200 },
]

const MOCK_DAILY_SPEND = Array.from({ length: 30 }, (_, i) => ({
  day: format(subDays(new Date(), 29 - i), 'd MMM'),
  amount: Math.floor(Math.random() * 5000) + 500,
}))

const MOCK_CATEGORY_TREND = [
  { month: 'Nov', amount: 12000 },
  { month: 'Dec', amount: 15000 },
  { month: 'Jan', amount: 11000 },
  { month: 'Feb', amount: 13500 },
  { month: 'Mar', amount: 18000 },
  { month: 'Apr', amount: 12500 },
]

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

const SavingsGauge = ({ rate }: { rate: number }) => {
  const radius = 80
  const stroke = 12
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  
  return (
    <div className="flex flex-col items-center justify-center relative pt-4">
      <svg height={radius * 1.2} width={radius * 2} className="transform rotate-0">
        {/* Background arc */}
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
          fill="none"
          stroke="#252A3A"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Color zones */}
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 0.5} ${radius - normalizedRadius * 0.7}`}
          fill="none"
          stroke="#f87171" // Red
          strokeWidth={stroke}
        />
        {/* Active arc */}
        <path
          d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
          fill="none"
          stroke="var(--brand-green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(rate / 100) * (circumference / 2)} ${circumference}`}
          strokeDashoffset={0}
          className="transition-all duration-1000 ease-out"
        />
        {/* Needle */}
        <line
          x1={radius}
          y1={radius}
          x2={radius + (normalizedRadius - 10) * Math.cos((rate * 1.8 - 180) * Math.PI / 180)}
          y2={radius + (normalizedRadius - 10) * Math.sin((rate * 1.8 - 180) * Math.PI / 180)}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <circle cx={radius} cy={radius} r="5" fill="white" />
      </svg>
      <div className="absolute top-[65%] text-center">
        <span className="text-3xl font-display text-white">{rate}%</span>
        <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-tighter">Savings Rate</p>
      </div>
    </div>
  )
}

const Heatmap = () => {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const data = Array.from({ length: 12 * 4 }, () => Math.floor(Math.random() * 100))
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-1 mb-2">
        {months.map(m => (
          <span key={m} className="text-[10px] font-mono text-text-muted text-center">{m}</span>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-2">
        {Array.from({ length: 12 }).map((_, mIdx) => (
          <div key={mIdx} className="grid grid-rows-4 gap-2">
            {Array.from({ length: 4 }).map((_, wIdx) => {
              const val = data[mIdx * 4 + wIdx]
              const opacity = val / 100
              return (
                <div 
                  key={wIdx}
                  className="aspect-square rounded-sm transition-all hover:ring-1 hover:ring-white/20"
                  style={{ 
                    backgroundColor: `rgba(0, 229, 160, ${Math.max(0.05, opacity)})`,
                  }}
                  title={`Week ${wIdx + 1}: ₹${(val * 500).toLocaleString()}`}
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
  const dateRange = 'Last 3 months'
  const account = 'All Accounts'
  const [selectedCategory, setSelectedCategory] = useState('Food')

  const totalSpent = MOCK_CATEGORIES.reduce((acc, cat) => acc + cat.value, 0)
  const savingsRate = 32
  const { isPro } = usePlanGate()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'analytics' | 'upload_limit'>('analytics')

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
              <span>{dateRange}</span>
              <ChevronDown className="w-4 h-4 ml-auto text-text-muted" />
            </button>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-ui hover:border-brand-green/50 transition-all text-white min-w-[160px]">
              <Filter className="w-4 h-4 text-brand-blue" />
              <span>{account}</span>
              <ChevronDown className="w-4 h-4 ml-auto text-text-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Biggest Single Expense", value: "₹45,200", sub: "Rent • 01 Apr", icon: ArrowUpRight, iconColor: "text-red-400" },
          { title: "Average Daily Spend", value: "₹2,450", sub: "Based on last 30 days", icon: TrendingUp, iconColor: "text-brand-blue" },
          { title: "Days Over Budget", value: "4 Days", sub: "This month", icon: Info, iconColor: "text-brand-orange" },
          { title: "Current Streak", value: "12 Days", sub: "No impulse purchases", icon: Sparkles, iconColor: "text-brand-green" },
        ].map((metric, i) => (
          <Card key={i} className="flex flex-col gap-1.5 relative overflow-hidden group">
            {!isPro && i > 0 && <GateOverlay />}
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${!isPro && i > 0 ? 'blur-sm' : ''}`}>
              <metric.icon className={`w-12 h-12 ${metric.iconColor}`} />
            </div>
            <div className={!isPro && i > 0 ? 'blur-md select-none opacity-50' : ''}>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{metric.title}</span>
              <div className="text-3xl font-display text-white">{metric.value}</div>
              <span className="text-xs font-mono text-text-muted">{metric.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: Cash Flow Over Time */}
        <Card className="lg:col-span-12 h-[450px] relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Cash Flow Over Time</SectionTitle>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CASHFLOW} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            </div>
          </div>
        </Card>

        {/* CHART 2: Spending by Category */}
        <Card className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full text-left">
            <SectionTitle>Spending by Category</SectionTitle>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_CATEGORIES}
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {MOCK_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-display text-white">₹{totalSpent.toLocaleString()}</span>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Total Spent</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full mt-6">
            {MOCK_CATEGORIES.map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-ui text-text-muted">{cat.name}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-mono text-white">₹{cat.value.toLocaleString()}</span>
                  <span className="text-[10px] font-mono text-text-muted">{Math.round((cat.value / totalSpent) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CHART 3: Top Merchants */}
        <Card className="lg:col-span-6 h-[460px] relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Where you spend the most</SectionTitle>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={MOCK_MERCHANTS.sort((a,b) => b.value - a.value).slice(0, 8)}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#252A3A" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#fff', fontSize: 12, fontFamily: 'Syne' }}
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
                    {MOCK_MERCHANTS.map((_, i) => (
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
            </div>
          </div>
        </Card>

        {/* CHART 4: Spending Activity (Heatmap) */}
        <Card className="lg:col-span-12 relative">
          {!isPro && <GateOverlay />}
          <div className={!isPro ? 'blur-md select-none' : ''}>
            <SectionTitle>Spending Activity</SectionTitle>
            <div className="flex flex-col md:flex-row items-center gap-8 py-4">
              <div className="flex-1 w-full">
                <Heatmap />
              </div>
              <div className="w-px h-24 bg-border hidden md:block" />
              <div className="flex flex-col gap-4 min-w-[200px]">
                <div className="flex flex-col">
                  <span className="text-3xl font-display text-white">48</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase">Transactions this month</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-display text-brand-green">₹1,850</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase">Avg. weekend spend</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CHART 5: Daily Spend Pattern */}
        <Card className="lg:col-span-7">
          <SectionTitle>Daily Spending (Last 30 Days)</SectionTitle>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DAILY_SPEND}>
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
                <ReferenceLine y={2450} stroke="#6B7394" strokeDasharray="5 5" label={{ position: 'right', value: 'Avg', fill: '#6B7394', fontSize: 10 }} />
                <Bar dataKey="amount">
                  {MOCK_DAILY_SPEND.map((entry, i) => (
                    <Cell key={i} fill={entry.amount > 2450 ? '#f87171' : 'var(--brand-green)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CHART 6 & 7: Category Trend & Savings Gauge */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <SectionTitle>Category Trend</SectionTitle>
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs font-mono outline-none text-white"
              >
                {MOCK_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_CATEGORY_TREND}>
                  <XAxis dataKey="month" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141720', border: '1px solid #252A3A', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontFamily: 'DM Mono' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="var(--brand-blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--brand-blue)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex items-center gap-4">
              <div className="bg-brand-blue/20 p-2 rounded-lg">
                <TrendingDown className="w-5 h-5 text-brand-blue" />
              </div>
              <p className="text-xs font-mono text-white/90">
                You spent <span className="text-brand-blue font-bold">12% less</span> on {selectedCategory} vs 3-month average.
              </p>
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
