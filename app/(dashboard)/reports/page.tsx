'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Sparkles, Download, Share2, RefreshCw, 
  ChevronRight, Calendar, TrendingUp, Wallet, ArrowRight,
  Loader2, CheckCircle2, Lock
} from 'lucide-react'
import { usePlanGate } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'

interface MonthlyStats {
  savingsRate: number
  totalIncome: number
  totalExpense: number
}

interface MonthlyReport {
  id: string
  month: string
  content: string
  stats: MonthlyStats
  created_at: string
}

export default function ReportsPage() {
  const queryClient = useQueryClient()
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const { isPro } = usePlanGate()

  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentMonthName = format(new Date(), 'MMMM')

  // Fetch Reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<MonthlyReport[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/ai/report')
      return res.json()
    }
  })

  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0]
  const hasCurrentMonthReport = reports.some(r => r.month === currentMonth)

  const generationSteps = [
    'Collecting transaction data',
    'Analyzing spending patterns',
    'Generating AI insights'
  ]

  const mutation = useMutation({
    mutationFn: async (month: string) => {
      setIsGenerating(true)
      setGenStep(0)
      
      const interval = setInterval(() => {
        setGenStep(prev => (prev < 2 ? prev + 1 : prev))
      }, 1500)

      try {
        const res = await fetch('/api/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month })
        })
        clearInterval(interval)
        return res.json()
      } catch (e) {
        clearInterval(interval)
        throw e
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setIsGenerating(false)
      if (data?.id) setSelectedReportId(data.id)
    },
    onError: () => {
      setIsGenerating(false)
    }
  })

  const handleGenerate = (monthToGenerate?: string | React.MouseEvent) => {
    const targetMonth = typeof monthToGenerate === 'string' ? monthToGenerate : currentMonth
    mutation.mutate(targetMonth)
  }

  const renderContent = (content: string) => {
    return (
      <ReactMarkdown
        components={{
          h2: ({ ...props }) => (
            <h2 className="text-2xl font-display text-white mt-10 mb-6 relative group" {...props}>
              {props.children}
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-brand-green group-hover:w-24 transition-all duration-500" />
            </h2>
          ),
          p: ({ ...props }) => {
            const text = props.children?.toString() || ''
            // Highlight Rupee amounts
            const parts = text.split(/(₹\d+(?:,\d+)*(?:\.\d+)?)/g)
            return (
              <p className="text-sm font-mono text-text-muted leading-relaxed mb-4" {...props}>
                {parts.map((part, i) => (
                  part.startsWith('₹') ? <span key={i} className="text-brand-green font-bold">{part}</span> : part
                ))}
              </p>
            )
          },
          li: ({ ...props }) => (
            <li className="text-sm font-mono text-text-muted mb-2 flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 shrink-0" />
              <span>{props.children}</span>
            </li>
          ),
          ul: ({ ...props }) => <ul className="mb-6 space-y-1" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 pb-12">
      
      {/* Sidebar: Reports List */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-surface border border-border p-6 rounded-2xl">
          <h2 className="text-xl font-display text-white mb-6">Past Reports</h2>
          <div className="flex flex-col gap-3">
            {reports.length === 0 && !reportsLoading && (
              <p className="text-xs font-mono text-text-muted text-center py-8 border border-dashed border-border rounded-xl">
                No reports generated yet.
              </p>
            )}
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  selectedReport?.id === r.id 
                  ? 'bg-brand-green/5 border-brand-green/30' 
                  : 'bg-surface2 border-border hover:border-white/20'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-ui font-medium text-white">
                    {format(new Date(r.month + '-01'), 'MMMM yyyy')}
                  </span>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-mono w-fit ${
                    (r.stats?.savingsRate || 0) > 20 ? 'bg-brand-green/10 text-brand-green' : 'bg-red-400/10 text-red-400'
                  }`}>
                    {r.stats?.savingsRate || 0}% Savings
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-green/5 border border-brand-green/20 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-brand-green" />
            <h3 className="text-sm font-ui text-white font-bold">AI Insight</h3>
          </div>
          <p className="text-xs font-mono text-white/70 leading-relaxed">
            {reportsLoading ? 'Analyzing...' : reports.length === 0 ? (
              'Generate your first report to unlock personalized AI insights and savings recommendations based on your spending patterns.'
            ) : selectedReport ? (
              (selectedReport.stats?.savingsRate || 0) > 20 
                ? `Great job! Your savings rate for ${format(new Date(selectedReport.month + '-01'), 'MMMM')} was ${selectedReport.stats.savingsRate}%. Keep up the excellent financial habits!`
                : `Your savings rate for ${format(new Date(selectedReport.month + '-01'), 'MMMM')} was ${selectedReport.stats?.savingsRate || 0}%. Let's look for ways to optimize your spending this month.`
            ) : ''}
          </p>
        </div>
      </div>

      {/* Main Content: Report Display */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display text-white tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand-blue" /> Monthly Reports
            </h1>
            <p className="text-text-muted font-mono text-sm mt-1">AI-powered analysis of your spending.</p>
          </div>
          
          <button 
            onClick={() => handleGenerate()}
            disabled={isGenerating || reportsLoading}
            className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-xl font-ui font-bold hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : hasCurrentMonthReport ? `Regenerate ${currentMonthName} Report` : `Generate ${currentMonthName} Report`}
          </button>
        </div>

        {isGenerating ? (
          <div className="bg-[#141720] border border-[#252A3A] rounded-3xl p-20 flex flex-col items-center justify-center min-h-[600px]">
             <div className="w-24 h-24 relative mb-8">
               <div className="absolute inset-0 border-4 border-brand-blue/20 rounded-full" />
               <div className="absolute inset-0 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-10 h-10 text-brand-blue" />
               </div>
             </div>
             
             <h3 className="text-2xl font-display text-white mb-8 animate-pulse text-center">
               Analyzing your finances...
             </h3>
             
             <div className="flex flex-col gap-4 w-full max-w-xs">
               {generationSteps.map((step, i) => (
                 <div key={step} className="flex items-center gap-3">
                   {genStep > i ? (
                     <CheckCircle2 className="w-5 h-5 text-brand-green" />
                   ) : genStep === i ? (
                     <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
                   ) : (
                     <div className="w-5 h-5 rounded-full border-2 border-border" />
                   )}
                   <span className={`text-sm font-mono ${genStep >= i ? 'text-white' : 'text-text-muted'}`}>
                     {step}
                   </span>
                 </div>
               ))}
             </div>
          </div>
        ) : selectedReport ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141720] border border-[#252A3A] rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 md:p-12 border-b border-[#252A3A] bg-gradient-to-br from-brand-blue/5 to-transparent">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                  <h2 className="text-4xl font-display text-white">
                    {format(new Date(selectedReport.month + '-01'), 'MMMM yyyy')}
                  </h2>
                  <p className="text-xs font-mono text-text-muted mt-1 uppercase tracking-widest">
                    Generated on {format(new Date(selectedReport.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-3 bg-surface2 border border-border rounded-xl text-white hover:border-brand-blue transition-all" title="Download PDF">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-surface2 border border-border rounded-xl text-white hover:border-brand-blue transition-all" title="Share">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleGenerate(selectedReport.month)}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-white text-[#0D0F14] px-5 py-3 rounded-xl font-ui font-bold hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-brand-blue" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Income', value: `₹${(selectedReport.stats?.totalIncome || 0).toLocaleString()}`, icon: Wallet },
                  { label: 'Spent', value: `₹${(selectedReport.stats?.totalExpense || 0).toLocaleString()}`, icon: ArrowRight },
                  { label: 'Saved', value: `₹${((selectedReport.stats?.totalIncome || 0) - (selectedReport.stats?.totalExpense || 0)).toLocaleString()}`, icon: TrendingUp },
                  { label: 'Savings Rate', value: `${selectedReport.stats?.savingsRate || 0}%`, icon: Calendar },
                ].map((stat, i) => (
                  <div key={i} className="bg-surface2/50 border border-border/50 p-4 rounded-2xl">
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-1">{stat.label}</span>
                    <div className="text-xl font-display text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-12 max-w-4xl mx-auto">
               {renderContent(selectedReport.content)}
            </div>
          </motion.div>
        ) : !isPro ? (
          <div className="bg-[#141720] border border-brand-green/20 rounded-3xl p-12 lg:p-20 flex flex-col items-center justify-center min-h-[500px] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20 mb-8">
                <Lock className="w-10 h-10 text-brand-green" />
              </div>
              <h2 className="text-3xl font-display text-white mb-4">AI Reports is a Pro Feature</h2>
              <p className="text-text-muted font-mono text-sm max-w-md mb-10 leading-relaxed">
                Get a comprehensive monthly analysis of your spending habits, recurring costs, and actionable advice to save more with SpendSense Pro.
              </p>
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-brand-green text-[#0D0F14] px-10 py-4 rounded-xl font-display font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-brand-green/20"
              >
                Unlock AI Reports
              </button>
              <p className="mt-6 text-[11px] font-mono text-text-muted uppercase tracking-widest">Starting at just ₹66/month</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#141720] border border-[#252A3A] border-dashed rounded-3xl p-32 flex flex-col items-center justify-center text-center">
            <FileText className="w-20 h-20 text-text-muted mb-6 opacity-20" />
            <h3 className="text-2xl font-display text-white mb-2">No Report Found</h3>
            <p className="text-text-muted font-mono text-sm max-w-sm mb-8">
              Generate your first AI-powered monthly report to get deep insights into your spending habits.
            </p>
            <button 
              onClick={() => handleGenerate()}
              disabled={isGenerating || reportsLoading}
              className="bg-brand-blue text-white px-8 py-3 rounded-xl font-ui font-bold hover:bg-brand-blue/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : hasCurrentMonthReport ? `Regenerate ${currentMonthName} Report` : `Generate ${currentMonthName} Report`}
            </button>
          </div>
        )}
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        reason="ai_reports"
      />
    </div>
  )
}
