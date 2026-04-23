import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const account_id = searchParams.get('account_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const type = searchParams.get('type') // 'debits' | 'credits' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase.from('transactions').select('*, accounts(bank_name, account_number_last4)', { count: 'exact' })
    
    query = query.eq('user_id', user.id)

    if (account_id && account_id !== 'all') {
      query = query.eq('account_id', account_id)
    }
    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }
    if (category && category !== 'all') {
      query = query.in('category', category.split(','))
    }
    if (type === 'debits') {
      query = query.eq('is_debit', true)
    } else if (type === 'credits') {
      query = query.eq('is_debit', false)
    }
    if (search) {
      query = query.or(`description.ilike.%${search}%,merchant.ilike.%${search}%`)
    }

    // Aggregate stats query
    let statsQuery = supabase.from('transactions').select('amount, is_debit, category')
    statsQuery = statsQuery.eq('user_id', user.id)
    
    if (account_id && account_id !== 'all') statsQuery = statsQuery.eq('account_id', account_id)
    if (start_date) statsQuery = statsQuery.gte('date', start_date)
    if (end_date) statsQuery = statsQuery.lte('date', end_date)
    if (category && category !== 'all') statsQuery = statsQuery.in('category', category.split(','))
    if (type === 'debits') statsQuery = statsQuery.eq('is_debit', true)
    else if (type === 'credits') statsQuery = statsQuery.eq('is_debit', false)
    if (search) statsQuery = statsQuery.or(`description.ilike.%${search}%,merchant.ilike.%${search}%`)

    query = query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    const [transactionsResult, statsResult] = await Promise.all([
      query,
      statsQuery
    ])
    
    const { data: transactions, count, error: transactionsError } = transactionsResult
    const { data: statsData, error: statsError } = statsResult

    if (transactionsError) throw transactionsError

    let totalDebit = 0
    let totalCredit = 0
    const categoryBreakdown: Record<string, number> = {}

    if (!statsError && statsData) {
      statsData.forEach(tx => {
        const amountNum = Number(tx.amount)
        if (tx.is_debit) {
          totalDebit += amountNum
          const cat = tx.category || 'Uncategorized'
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amountNum
        } else {
          totalCredit += amountNum
        }
      })
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      totalDebit,
      totalCredit,
      categoryBreakdown
    })

  } catch (error: unknown) {
    console.error('Fetch transactions error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { ids, category, notes, flagged } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Transaction IDs are required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (category !== undefined) updates.category = category
    if (notes !== undefined) updates.notes = notes
    if (flagged !== undefined) updates.is_flagged = flagged

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .in('id', ids)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, updated: data?.length || 0 })
  } catch (error: unknown) {
    console.error('Update transaction error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update transaction' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids')?.split(',')

    if (!id && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'ID or IDs are required' }, { status: 400 })
    }

    const query = supabase.from('transactions').delete().eq('user_id', user.id)
    
    if (id) {
      query.eq('id', id)
    } else {
      query.in('id', ids!)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete transaction error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete transaction' }, { status: 400 })
  }
}
