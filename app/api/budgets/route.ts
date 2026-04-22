import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })

    if (error) throw error

    return NextResponse.json(budgets)
  } catch (error: unknown) {
    console.error('Budgets GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category, amount, month } = await request.json()

    if (!category || !amount || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert budget for the user/category/month
    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category,
        amount,
        month,
      }, {
        onConflict: 'user_id,category,month'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Budgets POST Error:', error)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}
