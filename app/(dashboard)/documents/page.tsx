'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { 
  FileText, Trash2, Calendar, Database, 
  ArrowRight, Search, Filter, AlertCircle, 
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UploadedDocument {
  id: string
  file_name: string
  transaction_count: number
  created_at: string
  account_id: string | null
  storage_path: string | null
  accounts?: {
    bank_name: string
    account_number_last4: string | null
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [orphanCount, setOrphanCount] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch documents
      const { data, error } = await supabase
        .from('upload_usage')
        .select(`
          *,
          accounts (
            bank_name,
            account_number_last4
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])

      // Check for orphans (transactions not linked to any valid upload)
      const validIds = data?.map(d => d.id) || []
      let orphanQuery = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
      
      if (validIds.length > 0) {
        orphanQuery = orphanQuery.not('upload_id', 'in', `(${validIds.join(',')})`)
      }

      const { count, error: countError } = await orphanQuery
      if (!countError) {
        // Also count those with NULL upload_id as orphans for this purpose
        const { count: nullCount } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .is('upload_id', null)
        
        setOrphanCount((count || 0) + (nullCount || 0))
      }

    } catch (error) {
      console.error('Error fetching documents:', error)
      toast('Error', 'Failed to load documents', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/documents/sync', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Sync failed')

      toast('Sync Successful', 'Orphaned transactions have been removed.', 'success')
      fetchDocuments()
    } catch (error) {
      console.error('Sync error:', error)
      toast('Sync Error', 'Failed to clean up orphaned data', 'error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? All associated transactions will be permanently removed.')) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      toast('Document Deleted', 'The file and its transactions have been removed.', 'success')
      
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    } catch (error) {
      console.error('Error deleting document:', error)
      toast('Error', 'Failed to delete document', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredDocuments = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.accounts?.bank_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-brand-green" />
            Uploaded Documents
          </h1>
          <p className="text-text-muted mt-2 font-mono text-sm max-w-xl">
            Manage your imported bank statements. Deleting a document will remove all transactions associated with it.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              orphanCount > 0 
                ? 'bg-brand-green/20 text-brand-green border border-brand-green animate-pulse' 
                : 'bg-surface border border-border text-text-muted hover:text-brand-green hover:border-brand-green/30'
            }`}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {orphanCount > 0 ? `Repair Sync (${orphanCount})` : 'Sync Data'}
          </button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand-green transition-colors" />
            <input 
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-green/50 w-full md:w-[280px] transition-all"
            />
          </div>
          <button className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
          <p className="text-text-muted font-mono animate-pulse">Scanning archive...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="space-y-6">
          {orphanCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h4 className="text-red-500 font-bold">Data Inconsistency Detected</h4>
                  <p className="text-sm text-text-muted font-mono">
                    Found {orphanCount} transactions that are not linked to any document. This often happens if documents were partially deleted or imported via an older version.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Purge Orphaned Data
              </button>
            </div>
          )}
          
          <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <FileText className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
            <p className="text-text-muted mb-6 max-w-sm mx-auto">
              {searchQuery ? "No documents match your search criteria." : "You haven't uploaded any statements yet. Start by importing a file."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => router.push('/upload')}
                className="px-6 py-2 bg-brand-green text-black font-bold rounded-lg hover:bg-brand-green/90 transition-all shadow-[0_0_15px_rgba(0,229,160,0.3)]"
              >
                Upload Statement
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <div 
              key={doc.id}
              className="group bg-surface border border-border hover:border-brand-green/30 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:bg-[#141720] shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface2 border border-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  <FileText className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-green transition-colors leading-tight">
                    {doc.file_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs font-mono text-text-muted">
                    <span className="flex items-center gap-1.5 bg-surface2 px-2 py-0.5 rounded border border-border">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(doc.created_at), 'PPP')}
                    </span>
                    <span className="flex items-center gap-1.5 bg-surface2 px-2 py-0.5 rounded border border-border">
                      <Database className="w-3 h-3" />
                      {doc.transaction_count} transactions
                    </span>
                    {doc.accounts && (
                      <span className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                        {doc.accounts.bank_name} {doc.accounts.account_number_last4 ? `(****${doc.accounts.account_number_last4})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
                <div className="w-px h-8 bg-border hidden md:block" />
                <button 
                  onClick={() => router.push('/transactions')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface2 text-text-muted border border-border hover:text-white hover:border-text-muted transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  View Txns
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information Box */}
      <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-6 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-brand-green" />
        </div>
        <div>
          <h4 className="text-brand-green font-bold mb-1">How deletion works</h4>
          <p className="text-sm text-text-muted font-mono leading-relaxed">
            When you delete a document, we remove the original statement from our secure storage and automatically purge all transactions linked to that specific import. This ensures your data stays clean and consistent if you accidentally upload the same file twice.
          </p>
        </div>
      </div>
    </div>
  )
}
