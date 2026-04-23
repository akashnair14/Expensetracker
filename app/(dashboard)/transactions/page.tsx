'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, MoreHorizontal, X, AlertCircle, CheckSquare, Square, ChevronDown, FileSearch, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

const CATEGORIES = [
  'Food & Dining', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 
  'Income', 'Groceries', 'Healthcare', 'Housing', 'Education', 'Travel', 
  'Personal Care', 'Subscriptions', 'Insurance', 'Debt Repayment', 'Other'
]

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Shopping': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Transport': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Entertainment': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Bills & Utilities': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Income': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Groceries': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Healthcare': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Housing': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Education': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Travel': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Personal Care': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Subscriptions': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Insurance': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Debt Repayment': 'bg-red-600/10 text-red-500 border-red-600/20',
  'Other': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'Uncategorized': 'bg-surface2 text-text-muted border-border',
}

interface Transaction {
  id: string;
  date: string;
  merchant: string;
  description: string;
  category: string;
  accounts: { account_number_last4: string };
  is_debit: boolean;
  amount: number;
  flagged?: boolean;
  notes?: string;
}

function TransactionsContent() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [pullProgress, setPullProgress] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const qc = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchTransactions = async (pageParam = 1) => {
    const params = new URLSearchParams()
    params.set('page', pageParam.toString())
    params.set('limit', '50')
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (category !== 'all') params.set('category', category)
    if (type !== 'all') params.set('type', type)

    const res = await fetch(`/api/transactions?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', debouncedSearch, category, type, page],
    queryFn: () => fetchTransactions(page),
    placeholderData: (prev) => prev,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { ids: string[], category?: string, notes?: string, flagged?: boolean }) => {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
    }
  })

  const handleCategoryChange = (id: string, newCategory: string) => {
    updateMutation.mutate({ ids: [id], category: newCategory })
  }

  const handleBulkCategory = (newCategory: string) => {
    if (selectedIds.size === 0) return
    updateMutation.mutate({ ids: Array.from(selectedIds), category: newCategory })
    setSelectedIds(new Set())
  }

  const toggleSelectAll = () => {
    if (!data?.transactions) return
    if (selectedIds.size === data.transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.transactions.map((t: { id: string }) => t.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (window.navigator.vibrate) window.navigator.vibrate(10)
    await qc.invalidateQueries({ queryKey: ['transactions'] })
    setIsRefreshing(false)
    setPullProgress(0)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = e.currentTarget
    if (scrollContainer.scrollTop === 0) {
      const startY = e.touches[0].pageY
      const handleTouchMove = (moveEvent: TouchEvent) => {
        const diff = moveEvent.touches[0].pageY - startY
        if (diff > 0) {
          setPullProgress(Math.min(diff / 2, 80))
        }
      }
      const handleTouchEnd = () => {
        if (pullProgress > 60) handleRefresh()
        else setPullProgress(0)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10])
    deleteMutation.mutate(id)
  }

  const formatDate = (isoStr: string) => {
    try {
      const d = parseISO(isoStr)
      const isCurrentYear = d.getFullYear() === new Date().getFullYear()
      return format(d, isCurrentYear ? 'dd MMM' : 'dd MMM yyyy')
    } catch {
      return isoStr
    }
  }

  const filtersActive = debouncedSearch !== '' || category !== 'all' || type !== 'all'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden lg:h-full relative pb-20 lg:pb-0">
      
      {/* FILTER BAR */}
      <div className="sticky top-0 z-10 bg-[#0D0F14]/90 backdrop-blur-md border-b border-border p-4 flex flex-col md:flex-row md:items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white font-ui focus:border-brand-green/50 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-surface border border-border text-white text-sm rounded-lg px-3 py-2.5 font-ui outline-none appearance-none cursor-pointer hover:border-brand-green/30"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex bg-surface border border-border rounded-lg p-1 shrink-0">
            {['all', 'debits', 'credits'].map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${type === t ? 'bg-surface2 text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {filtersActive && (
            <button 
              onClick={() => { setSearch(''); setCategory('all'); setType('all'); setPage(1); }}
              className="text-xs font-mono text-text-muted hover:text-white underline shrink-0 px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="md:ml-auto">
          <button className="flex items-center gap-2 bg-surface2 border border-border hover:border-brand-green/30 text-white px-4 py-2.5 rounded-lg text-sm font-ui transition-colors shrink-0">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY ROW */}
      <div className="px-6 py-3 border-b border-border bg-surface/50 flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted shrink-0">
        <span className="bg-surface2 px-3 py-1 rounded-full border border-border/50">
          Showing {data?.transactions?.length || 0} of {data?.total || 0} transactions
        </span>
        <span className="bg-surface2 px-3 py-1 rounded-full border border-border/50">
          Total Debit: <span className="text-white">₹{(data?.totalDebit || 0).toLocaleString()}</span>
        </span>
        <span className="bg-surface2 px-3 py-1 rounded-full border border-border/50">
          Total Credit: <span className="text-brand-green">₹{(data?.totalCredit || 0).toLocaleString()}</span>
        </span>
      </div>

      {/* PULL TO REFRESH INDICATOR */}
      <motion.div 
        style={{ height: pullProgress, opacity: pullProgress / 60 }}
        className="flex items-center justify-center bg-surface overflow-hidden shrink-0"
      >
        <RefreshCw className={`w-5 h-5 text-brand-green ${isRefreshing ? 'animate-spin' : ''}`} />
      </motion.div>

      {/* TABLE AREA */}
      <div 
        className="flex-1 overflow-y-auto p-4 lg:p-6 relative no-scrollbar"
        onTouchStart={handleTouchStart}
      >
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted gap-4">
            <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
            <p className="font-mono text-sm">Loading transactions...</p>
          </div>
        ) : data?.transactions?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center max-w-sm mx-auto">
            <div className="w-24 h-24 mb-6 text-border flex items-center justify-center">
              <FileSearch className="w-16 h-16" />
            </div>
            <h3 className="text-2xl font-display text-white mb-2">
              {filtersActive ? 'No transactions match your filters' : 'No transactions found'}
            </h3>
            <p className="text-sm font-mono text-text-muted mb-8">
              {filtersActive ? 'Try adjusting your search or category filters.' : 'Upload your first bank statement to start tracking.'}
            </p>
            {filtersActive ? (
               <button onClick={() => { setSearch(''); setCategory('all'); setType('all'); }} className="bg-surface2 border border-border text-white px-6 py-3 rounded-lg font-ui hover:bg-surface2/80">
                 Clear Filters
               </button>
            ) : (
              <button className="bg-brand-green text-[#0D0F14] font-bold px-6 py-3 rounded-lg font-ui hover:bg-brand-green/90 shadow-[0_0_20px_rgba(0,229,160,0.2)]">
                Upload Statement
              </button>
            )}
          </div>
        ) : (
          <div className="w-full bg-surface border border-border rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#141720] border-b border-border sticky top-0 z-10">
                <tr className="text-[11px] uppercase tracking-wider font-mono text-text-muted">
                  <th className="py-4 px-4 w-12">
                    <button onClick={toggleSelectAll} className="text-text-muted hover:text-white transition-colors">
                      {selectedIds.size > 0 && selectedIds.size === data.transactions.length ? <CheckSquare className="w-4 h-4 text-brand-green" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="py-4 px-4 font-normal">Date</th>
                  <th className="py-4 px-4 font-normal w-1/3">Merchant / Description</th>
                  <th className="py-4 px-4 font-normal">Category</th>
                  <th className="py-4 px-4 font-normal">Account</th>
                  <th className="py-4 px-4 font-normal text-right">Amount</th>
                  <th className="py-4 px-4 font-normal w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data?.transactions?.map((tx: Transaction) => {
                  const isSelected = selectedIds.has(tx.id)
                  const catColor = CATEGORY_COLORS[tx.category || 'Uncategorized'] || CATEGORY_COLORS['Uncategorized']
                  
                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        drag="x"
                        dragConstraints={{ left: -100, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -80) handleDelete(tx.id)
                        }}
                        className="relative"
                      >
                        {/* Background Delete Action */}
                        <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>

                        <motion.tr 
                          key={tx.id} 
                          onClick={() => {
                            if (window.navigator.vibrate) window.navigator.vibrate(5)
                            setSelectedTx(tx)
                          }}
                          className={`group cursor-pointer transition-colors relative z-10 ${isSelected ? 'bg-brand-green/5' : 'hover:bg-[#1C2030] bg-surface'}`}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(tx.id)} className="text-text-muted hover:text-white transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-brand-green" /> : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-text-muted">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="flex flex-col">
                              <span className="text-sm font-ui text-white font-medium truncate" title={tx.merchant || tx.description}>
                                {tx.merchant || tx.description}
                              </span>
                              {tx.merchant && (
                                <span className="text-[11px] font-mono text-text-muted truncate mt-0.5" title={tx.description}>
                                  {tx.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <select 
                                value={tx.category || 'Uncategorized'}
                                onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                                className={`appearance-none text-xs font-mono px-3 py-1.5 pr-8 rounded-full border outline-none cursor-pointer transition-colors ${catColor}`}
                              >
                                <option value="Uncategorized">Uncategorized</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 bg-surface2 border border-border/50 px-2.5 py-1 rounded-md inline-flex">
                              <div className="w-2 h-2 rounded-full bg-brand-green/50" />
                              <span className="text-[11px] font-mono text-text-muted">
                                •••{tx.accounts?.account_number_last4 || '0000'}
                              </span>
                            </div>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono text-sm font-medium ${tx.is_debit ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.is_debit ? '−' : '+'}₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="p-1 text-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      </motion.div>
                    )
                })}
              </tbody>
            </table>
            
            {data?.page < data?.totalPages && (
              <div className="p-4 border-t border-border bg-surface2 flex justify-center">
                <button 
                  onClick={() => setPage(p => p + 1)}
                  className="bg-surface border border-border hover:border-brand-green/30 text-white text-xs font-mono px-6 py-2.5 rounded-full transition-colors shadow-sm"
                >
                  Load 50 more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BULK ACTION BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#252A3A]/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-30"
          >
            <div className="flex items-center gap-3 border-r border-border/50 pr-6">
              <div className="bg-brand-green text-[#0D0F14] w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
                {selectedIds.size}
              </div>
              <span className="text-sm font-ui text-white">selected</span>
            </div>
            
            <div className="flex items-center gap-4">
              <select 
                onChange={(e) => handleBulkCategory(e.target.value)}
                className="bg-surface border border-border focus:border-brand-green text-xs text-white rounded-lg px-3 py-2 font-mono outline-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Recategorize selected...</option>
                <option value="Uncategorized">Uncategorized</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <button className="flex items-center gap-2 text-text-muted hover:text-white text-xs font-ui transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            
            <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1 text-text-muted hover:text-white bg-surface2 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLIDE IN DETAILS PANEL */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-[#0D0F14]/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface2/50">
                <h3 className="font-ui text-lg text-white">Transaction Details</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'SpendSense Transaction',
                          text: `Check out this transaction: ${selectedTx.merchant || selectedTx.description} for ₹${selectedTx.amount}`,
                          url: window.location.href
                        })
                      }
                    }}
                    className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedTx(null)} className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
                <div className="flex flex-col items-center justify-center py-6 bg-surface2/30 rounded-2xl border border-border/50">
                  <span className={`text-4xl font-display mb-2 ${selectedTx.is_debit ? 'text-white' : 'text-brand-green'}`}>
                    {selectedTx.is_debit ? '−' : '+'}₹{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-mono text-text-muted">{formatDate(selectedTx.date)}</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider">Merchant / Description</label>
                    <p className="text-base font-ui text-white">{selectedTx.merchant || selectedTx.description}</p>
                    {selectedTx.merchant && <p className="text-xs font-mono text-text-muted mt-1">{selectedTx.description}</p>}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Category</label>
                    <select 
                      value={selectedTx.category || 'Uncategorized'}
                      onChange={(e) => {
                        handleCategoryChange(selectedTx.id, e.target.value)
                        setSelectedTx({ ...selectedTx, category: e.target.value })
                      }}
                      className="bg-surface border border-border text-sm text-white rounded-lg px-3 py-2.5 font-mono outline-none focus:border-brand-green/50 appearance-none cursor-pointer w-full"
                    >
                      <option value="Uncategorized">Uncategorized</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-4">
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Notes</label>
                    <textarea 
                      defaultValue={selectedTx.notes || ''}
                      placeholder="Add a note..."
                      onBlur={(e) => {
                        if (e.target.value !== selectedTx.notes) {
                          updateMutation.mutate({ ids: [selectedTx.id], notes: e.target.value })
                          setSelectedTx({ ...selectedTx, notes: e.target.value })
                        }
                      }}
                      className="bg-surface border border-border text-sm text-white rounded-lg px-4 py-3 font-mono outline-none focus:border-brand-green/50 w-full min-h-[100px] resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 p-4 bg-surface2/50 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <div className="flex flex-col">
                        <span className="text-sm font-ui text-white">Flag as suspicious</span>
                        <span className="text-xs font-mono text-text-muted">Mark for review later</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const newFlag = !selectedTx.flagged
                        updateMutation.mutate({ ids: [selectedTx.id], flagged: newFlag })
                        setSelectedTx({ ...selectedTx, flagged: newFlag })
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${selectedTx.flagged ? 'bg-red-500/20 border-red-500/50' : 'bg-surface border-border'} border`}
                    >
                      <motion.div 
                        animate={{ x: selectedTx.flagged ? 24 : 2 }}
                        className={`w-4 h-4 rounded-full ${selectedTx.flagged ? 'bg-red-400' : 'bg-text-muted'}`}
                      />
                    </button>
                  </div>
                  
                  {selectedTx.merchant && (
                    <button className="mt-4 text-xs font-mono text-brand-green hover:underline text-left flex items-center gap-1">
                      <Search className="w-3 h-3" /> Find similar transactions
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}

export default function TransactionsPage() {
  return <TransactionsContent />
}
