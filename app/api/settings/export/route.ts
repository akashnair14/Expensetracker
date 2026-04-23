import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { format } from 'date-fns'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get('format') || 'json'

    // Check subscription for CSV
    if (exportFormat === 'csv') {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!sub || sub.plan === 'free') {
        return NextResponse.json({ error: 'CSV export requires a Pro plan', code: 'export_requires_pro' }, { status: 403 })
      }
    }

    const dateStr = format(new Date(), 'yyyy-MM-dd')

    if (exportFormat === 'json') {
      const [profile, accounts, transactions, budgets, goals, reports] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('reports').select('*').eq('user_id', user.id),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile.data,
        accounts: accounts.data || [],
        transactions: transactions.data || [],
        budgets: budgets.data || [],
        goals: goals.data || [],
        reports: reports.data || [],
      }

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="spendsense-export-${dateStr}.json"`,
        },
      })
    }

    if (exportFormat === 'csv') {
      const { data: txs } = await supabase
        .from('transactions')
        .select(`
          date, 
          description, 
          merchant, 
          category, 
          amount, 
          is_debit,
          accounts(bank_name, account_number_last4),
          notes
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const headers = ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Type', 'Account', 'Notes']
      const rows = (txs || []).map(tx => [
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        `"${(tx.merchant || '').replace(/"/g, '""')}"`,
        tx.category,
        tx.amount,
        tx.is_debit ? 'Debit' : 'Credit',
        `"${(tx as any).accounts?.bank_name} - ${(tx as any).accounts?.account_number_last4}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="spendsense-transactions-${dateStr}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
