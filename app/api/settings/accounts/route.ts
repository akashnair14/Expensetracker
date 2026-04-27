import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get accounts with transaction counts
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select(`
      *,
      transactions:transactions(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const mapped = accounts.map(acc => ({
    ...acc,
    transaction_count: acc.transactions[0]?.count || 0
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { bank_name, account_label, account_number_last4 } = body

  if (!bank_name) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 })
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      bank_name,
      account_label,
      account_number_last4
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(account)
}
