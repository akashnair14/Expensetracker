'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload as UploadIcon, X, CheckCircle,
  FileText, FileSpreadsheet, Lock, AlertCircle 
} from 'lucide-react'
import { usePlanGate } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

import { ParsedTransaction } from '@/types/parsers'
import ProcessingSteps from '@/components/upload/ProcessingSteps'

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
  const [bank, setBank] = useState<string>('Auto-detect')
  const [accountId, setAccountId] = useState<string>('auto')
  const [accounts, setAccounts] = useState<{ id: string; bank_name: string; account_label?: string; account_number_last4?: string }[]>([])
  const [user, setUser] = useState<User | null>(null)
  
  // review state
  const [transactions, setTransactions] = useState<TransactionPreview[]>([])
  const [parseWarning, setParseWarning] = useState<string | null>(null)
  
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
      else setBank('Auto-detect')
      
      setAccountId('auto')
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
    if (accountId === 'new') {
      setTimeout(() => {
        router.push('/settings?tab=accounts')
      }, 1200)
    }
  }, [accountId, router])

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
      // ── Step 1 & 2: Upload and parse the PDF ──
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank_name', bank === 'Auto-detect' ? 'Other' : bank)
      formData.append('account_id', accountId === 'auto' ? 'new' : accountId)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const contentType = res.headers.get('content-type')
      const responseData = contentType?.includes('application/json') ? await res.json() : null

      if (!res.ok) {
        if (responseData?.needsAccount) {
           setUploadState('selected')
           setParseWarning('Could not auto-detect the bank account. Please select one manually below.')
           return
        }
        const errorMessage = responseData?.error || `Server Error (${res.status}): Please check the server logs.`
        throw new Error(errorMessage)
      }

      // Load the parsed transactions for display
      const { data: fileData } = await supabase.storage
        .from('statements')
        .download(`${user.id}/temp/${responseData.jobId}.json`)
        
      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text)
        const mapped = parsed.map((t: ParsedTransaction) => ({ ...t, category: 'Uncategorized' } as TransactionPreview))
        setTransactions(mapped)
        if (mapped.length === 0) {
          setParseWarning('The PDF was processed but no transactions could be extracted. The statement format may differ from expected. Please try selecting the correct bank.')
          setUploadState('review')
          return
        }
      }

      // ── Step 3: AI Categorization (auto, no button click needed) ──
      // Small delay so the animation can visually show Step 3 activating
      await new Promise(resolve => setTimeout(resolve, 3500))
      setUploadState('importing')

      const catRes = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId: responseData.jobId, 
          uncachedMerchants: responseData.uncachedMerchants 
        })
      })

      if (!catRes.ok) {
        const catErr = await catRes.json().catch(() => ({}))
        throw new Error(catErr.error || 'AI categorization failed')
      }

      // ── Done: redirect to dashboard ──
      setUploadState('done')
      // Small pause so user sees "Done" state briefly before redirect
      await new Promise(resolve => setTimeout(resolve, 800))
      router.push('/dashboard')

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
        <p className="text-text-muted font-mono text-sm">Upload your bank statement to track expenses automatically. We&apos;ll automatically detect your bank account.</p>
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
            {parseWarning && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-xs text-red-400 font-mono">{parseWarning}</p>
              </div>
            )}

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
              <button onClick={() => { setFile(null); setUploadState('idle'); setParseWarning(null); }} className="p-2 text-text-muted hover:text-red-400 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-mono text-white">Bank Name</h3>
                <select 
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-brand-green/60 rounded-md py-3 px-3 text-white font-mono text-sm outline-none appearance-none"
                >
                  <option value="Auto-detect">Auto-detect Bank</option>
                  {BANKS.filter(b => b !== 'Other').map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other / Unknown</option>
                </select>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-mono text-white">Target Bank Account</h3>
                <select 
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-brand-green/60 rounded-md py-3 px-3 text-white font-mono text-sm outline-none appearance-none"
                >
                  <option value="auto">Auto-detect Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_label || acc.bank_name} {acc.account_number_last4 ? `(**** ${acc.account_number_last4})` : ''}
                    </option>
                  ))}
                  <option value="new">+ Setup new account manually</option>
                </select>
              </div>
            </div>

            <button 
              onClick={startUpload}
              className="w-full bg-brand-green text-[#0D0F14] font-bold font-ui py-4 rounded-md mt-4 hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20 text-lg group"
            >
              <span className="flex items-center justify-center gap-2">
                Start Analysis
                <CheckCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            <p className="text-[10px] text-text-muted font-mono text-center uppercase tracking-widest">
              Spending analysis will begin automatically after parsing
            </p>
          </motion.div>
        )}

        {(uploadState === 'parsing' || uploadState === 'importing' || uploadState === 'done') && (
          <motion.div
            key="stage3"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -32, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-10 max-w-3xl mx-auto w-full"
          >
            <div className="bg-[#0A0C14]/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              {/* Reliable CSS-based noise overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              
              {/* Decorative glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-green/10 blur-[80px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full" />
              
              <ProcessingSteps uploadState={uploadState} />

              {/* Error/Warning UI inside the same container for consistency */}
              {!!parseWarning && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-5 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-yellow-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-yellow-400 font-mono text-[13px] max-w-sm mx-auto leading-relaxed">{parseWarning}</p>
                    <p className="text-[#6B7394] text-[11px] font-mono uppercase tracking-widest">Please verify the file format and try again</p>
                  </div>
                  <button
                    onClick={() => { setUploadState('selected'); setParseWarning(null); setTransactions([]) }}
                    className="bg-white/5 text-white font-ui font-bold px-10 py-3.5 rounded-full hover:bg-white/10 transition-all text-[12px] uppercase tracking-widest border border-white/10"
                  >
                    Return to selection
                  </button>
                </motion.div>
              )}
            </div>

            {/* Importing / Finalizing Status */}
            {uploadState === 'importing' && !parseWarning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-10"
              >
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border border-white/5" />
                  <div className="absolute inset-0 w-24 h-24 rounded-full border-t-2 border-brand-green animate-spin shadow-[0_0_20px_rgba(0,229,160,0.4)]" />
                  <div className="absolute inset-3 w-18 h-18 rounded-full border-r-2 border-brand-green/30 animate-spin-slow opacity-40" />
                  <div className="absolute inset-0 bg-brand-green/5 blur-2xl rounded-full scale-150 animate-pulse" />
                </div>
                
                <div className="flex flex-col items-center gap-4 text-center">
                  <h3 className="text-3xl font-display italic text-white tracking-tight">Almost there</h3>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[#6B7394] text-[11px] font-mono uppercase tracking-[0.4em] font-bold">
                      {transactions.length > 0 
                        ? `Importing ${transactions.length} records` 
                        : 'Finalizing workspace sync'}
                    </p>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/5 border border-brand-green/10">
                      <div className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
                      <p className="text-[9px] text-brand-green/80 font-mono uppercase tracking-widest font-bold">
                        AI Categorization active
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
