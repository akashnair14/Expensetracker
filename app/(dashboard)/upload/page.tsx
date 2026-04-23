'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload as UploadIcon, X, FileSearch, Table2, Sparkles, 
  CheckCircle, FileText, FileSpreadsheet, Lock, AlertCircle 
} from 'lucide-react'
import { usePlanGate } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

import { ParsedTransaction } from '@/types/parsers'

const BANKS = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Yes Bank", "IndusInd", "Other"]

type UploadState = 'idle' | 'selected' | 'parsing' | 'review' | 'importing' | 'done'

interface TransactionPreview extends ParsedTransaction {
  category: string;
}

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const { canUpload, uploadsRemaining, isPro } = usePlanGate()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [bank, setBank] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')
  const [accounts, setAccounts] = useState<{ id: string; bank_name: string; account_label?: string }[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  // review state
  const [transactions, setTransactions] = useState<TransactionPreview[]>([])
  const [uploadData, setUploadData] = useState<{ jobId: string, uncachedMerchants: string[] } | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (f) {
      setFile(f)
      const nameUpper = f.name.toUpperCase()
      if (nameUpper.includes('HDFC')) setBank('HDFC Bank')
      else if (nameUpper.includes('SBI')) setBank('SBI')
      else if (nameUpper.includes('ICICI')) setBank('ICICI Bank')
      setUploadState('selected')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'], 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false,
    disabled: !canUpload
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        supabase.from('accounts').select('*').eq('user_id', data.user.id).then(({ data: accData }) => {
          if (accData) setAccounts(accData)
        })
      }
    })
  }, [supabase])

  const startUpload = async () => {
    if (!file || !user) return
    setUploadState('parsing')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank_name', bank)
      formData.append('account_id', accountId)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to upload')
      }
      
      const data = await res.json()
      setUploadData(data)
      
      const { data: fileData } = await supabase.storage
        .from('statements')
        .download(`${user.id}/temp/${data.jobId}.json`)
        
      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text)
        setTransactions(parsed.map((t: ParsedTransaction) => ({ ...t, category: 'Uncategorized' } as TransactionPreview)))
      }
      
      setTimeout(() => setUploadState('review'), 1500)
      
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Upload failed')
      setUploadState('selected')
    }
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith('.pdf')) return <FileText className="w-6 h-6 text-red-400" />
    if (name.endsWith('.csv')) return <FileSpreadsheet className="w-6 h-6 text-brand-green" />
    if (name.match(/\.xlsx?$/)) return <FileSpreadsheet className="w-6 h-6 text-[#4D9FFF]" />
    return <FileText className="w-6 h-6 text-text-muted" />
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-8 animate-fadeIn pt-4 pb-20 lg:pb-8">
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} reason="upload_limit" />
      
      <div>
        <h1 className="text-3xl font-display text-white mb-2">Upload Statement</h1>
        <p className="text-text-muted font-mono text-sm">Upload your bank statement to track expenses automatically.</p>
      </div>

      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div
            key="stage1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div 
              {...getRootProps()} 
              className={`w-full min-h-[280px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all relative overflow-hidden group bg-surface ${
                isDragActive ? 'border-brand-green bg-brand-green/5' : 'border-[#252A3A] hover:border-brand-green/50 hover:bg-brand-green/5'
              } ${!canUpload ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
            >
              {!canUpload && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-[#141720] border border-border flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-brand-green" />
                  </div>
                  <h3 className="text-white font-display text-xl mb-2">Upload Limit Reached</h3>
                  <p className="text-text-muted text-sm font-mono mb-6 max-w-[250px] text-center">You&apos;ve used all your free uploads. Upgrade to Pro for unlimited.</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsUpgradeModalOpen(true); }}
                    className="bg-brand-green text-[#0D0F14] px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UploadIcon className="w-8 h-8 text-brand-green animate-[float_2s_ease-in-out_infinite]" />
              </div>
              <h2 className="text-2xl font-display text-white mb-2 text-center">Drop your bank statement here</h2>
              <p className="text-text-muted font-mono text-xs mb-8 text-center">PDF, CSV, or Excel • HDFC, SBI, ICICI, Axis supported</p>
              
              <div className="flex items-center gap-4 w-full max-w-sm">
                <div className="flex-1 bg-brand-green text-[#0D0F14] font-bold font-ui py-3 rounded-md text-center">
                  Browse Files
                </div>
              </div>
            </div>

            {!isPro && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-green" />
                    <span className="text-xs font-mono text-white">Free Plan Usage</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">{5 - (typeof uploadsRemaining === 'number' ? uploadsRemaining : 0)} / 5 uploaded</span>
                </div>
                <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-green transition-all duration-1000" 
                    style={{ width: `${((5 - (typeof uploadsRemaining === 'number' ? uploadsRemaining : 0)) / 5) * 100}%` }}
                  />
                </div>
                {uploadsRemaining === 1 && (
                  <p className="text-[10px] text-brand-orange font-mono mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Last free upload remaining!
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4 flex-wrap">
              {['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Yes Bank'].map(b => (
                <div key={b} className="bg-surface2 border border-border px-4 py-1.5 rounded-full text-xs font-mono text-text-muted flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-green/50" /> {b}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {uploadState === 'selected' && (
          <motion.div
            key="stage2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="p-3 bg-surface2 rounded-lg">
                  {getFileIcon(file?.name || '')}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">{file?.name}</p>
                  <p className="text-xs text-text-muted font-mono mt-0.5">{(file?.size || 0) / 1024 < 1024 ? `${Math.round((file?.size || 0) / 1024)} KB` : `${((file?.size || 0) / (1024 * 1024)).toFixed(1)} MB`}</p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setUploadState('idle'); }} className="p-2 text-text-muted hover:text-red-400 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-mono text-white">Which bank is this from?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BANKS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBank(b)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      bank === b ? 'border-brand-green bg-brand-green/10' : 'border-border bg-surface hover:border-brand-green/40'
                    }`}
                  >
                    <span className="text-xs font-ui font-medium text-white">{b}</span>
                    {bank === b && <CheckCircle className="w-4 h-4 text-brand-green mt-2" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <h3 className="text-sm font-mono text-white">Which account?</h3>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-surface border border-border focus:border-brand-green/60 rounded-md py-3 px-3 text-white font-mono text-sm outline-none appearance-none"
              >
                <option value="" disabled>Select account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_label || acc.bank_name}</option>
                ))}
                <option value="new">+ Add new account</option>
              </select>
            </div>

            <button 
              onClick={startUpload}
              disabled={!bank || !accountId}
              className="w-full bg-brand-green text-[#0D0F14] font-bold font-ui py-3.5 rounded-md mt-4 disabled:opacity-50 hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20"
            >
              Parse Statement
            </button>
          </motion.div>
        )}

        {(uploadState === 'parsing' || uploadState === 'review' || uploadState === 'importing') && (
          <motion.div
            key="stage3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between mb-4 px-2 md:px-8">
                {[
                  { icon: FileSearch, label: "Reading file", active: uploadState === 'parsing', done: uploadState === 'review' },
                  { icon: Table2, label: "Extracting data", active: uploadState === 'parsing', done: uploadState === 'review' },
                  { icon: Sparkles, label: "AI categorization", active: uploadState === 'parsing', done: uploadState === 'review' },
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      step.done ? 'bg-brand-green/20 text-brand-green' : step.active ? 'bg-[#4D9FFF]/20 text-[#4D9FFF] animate-pulse' : 'bg-surface2 text-text-muted'
                    }`}>
                      {step.done ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[11px] font-mono text-center ${step.done || step.active ? 'text-white' : 'text-text-muted'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {(uploadState === 'review' || uploadState === 'importing') && transactions.length > 0 && (
                <div className="animate-fadeIn mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-ui text-white font-medium">Preview Transactions</h3>
                    <span className="text-xs font-mono text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-1 rounded-full">
                      Found {transactions.length}
                    </span>
                  </div>
                  
                  <div className="w-full overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-surface2 border-b border-border">
                        <tr className="text-text-muted text-[11px] uppercase tracking-wider font-mono">
                          <th className="py-3 px-4 font-normal">Date</th>
                          <th className="py-3 px-4 font-normal w-1/3">Description</th>
                          <th className="py-3 px-4 font-normal">Category (AI)</th>
                          <th className="py-3 px-4 font-normal text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 10).map((tx, i) => (
                          <tr key={i} className="border-b border-border/50 bg-surface last:border-0 hover:bg-surface2/30 transition-colors">
                            <td className="py-3 px-4 text-xs font-mono text-text-muted">{tx.date}</td>
                            <td className="py-3 px-4 text-xs font-ui text-white truncate max-w-[200px]" title={tx.description}>{tx.description}</td>
                            <td className="py-3 px-4">
                              <select className="bg-surface2 border border-border text-xs text-white rounded px-2 py-1.5 font-mono outline-none focus:border-brand-green/50">
                                <option>{tx.category}</option>
                                <option>Food & Dining</option>
                                <option>Shopping</option>
                                <option>Transport</option>
                                <option>Entertainment</option>
                                <option>Bills & Utilities</option>
                                <option>Income</option>
                              </select>
                            </td>
                            <td className={`py-3 px-4 text-xs font-mono text-right font-medium ${tx.is_debit ? 'text-white' : 'text-brand-green'}`}>
                              {tx.is_debit ? '-' : '+'}₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {transactions.length > 10 && (
                    <p className="text-center text-xs font-mono text-text-muted mt-3">Showing 10 of {transactions.length} transactions</p>
                  )}

                  <div className="flex items-center gap-4 mt-8">
                    <button 
                      onClick={() => setUploadState('idle')}
                      className="flex-1 bg-surface2 text-white font-ui py-3 rounded-md hover:bg-surface2/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        setUploadState('importing')
                        try {
                          const res = await fetch('/api/ai/categorize', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              jobId: uploadData?.jobId, 
                              uncachedMerchants: uploadData?.uncachedMerchants 
                            })
                          })
                          if (!res.ok) throw new Error('Import failed')
                          setUploadState('done')
                          router.push('/dashboard')
                        } catch {
                          alert('Failed to import transactions')
                          setUploadState('review')
                        }
                      }}
                      disabled={uploadState === 'importing'}
                      className="flex-[2] bg-brand-green text-[#0D0F14] font-bold font-ui py-3 rounded-md hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20 disabled:opacity-50"
                    >
                      {uploadState === 'importing' ? 'Importing...' : `Import All (${transactions.length})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
