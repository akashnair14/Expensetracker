import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') throw profileError

    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') throw prefsError

    return NextResponse.json({
      profile: profile || null,
      notifications: prefs || null,
      email: user.email
    })
  } catch (error: any) {
    console.error('Settings profile GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { full_name, currency, locale, monthly_income_estimate, financial_goal_type } = body

    const updates: any = {
      updated_at: new Date().toISOString()
    }
    if (full_name !== undefined) updates.full_name = full_name
    if (currency !== undefined) updates.currency = currency
    if (locale !== undefined) updates.locale = locale
    if (monthly_income_estimate !== undefined) updates.monthly_income_estimate = monthly_income_estimate
    if (financial_goal_type !== undefined) updates.financial_goal_type = financial_goal_type

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Settings profile PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
