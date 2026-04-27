import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { account_label, bank_name } = body

  const { data: account, error } = await supabase
    .from('accounts')
    .update({ account_label, bank_name })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(account)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // First delete all transactions associated with this account
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('account_id', params.id)
    .eq('user_id', user.id)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
