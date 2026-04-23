import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

const ALLOWED_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 
  'Income', 'Groceries', 'Healthcare', 'Housing', 'Education', 'Travel', 
  'Personal Care', 'Subscriptions', 'Insurance', 'Debt Repayment', 'Other'
]

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('custom_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { merchant_pattern, category } = await request.json()

    if (!merchant_pattern || merchant_pattern.length < 2) {
      return NextResponse.json({ error: 'Pattern must be at least 2 characters' }, { status: 400 })
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('custom_categories')
      .insert({
        user_id: user.id,
        merchant_pattern,
        category
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
