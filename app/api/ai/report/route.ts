import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { flashModel } from '@/lib/ai/gemini'
import { detectRecurring } from '@/lib/ai/report'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Subscription Gate
    const { assertPlan } = await import('@/lib/subscription/gate')
    await assertPlan(user.id, 'pro')

    const { month } = await request.json() // "2026-04"

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 })
    }

    // 1. Fetch data for aggregation
    const startDate = `${month}-01`
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0]

    const [txRes, budgetRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month)
    ])

    if (txRes.error) throw txRes.error
    if (budgetRes.error) throw budgetRes.error

    const transactions = txRes.data || []
    const budgets = budgetRes.data || []

    // 2. Pre-aggregate stats
    const totalIncome = transactions.filter(t => !t.is_debit).reduce((acc, t) => acc + Number(t.amount), 0)
    const totalExpense = transactions.filter(t => t.is_debit).reduce((acc, t) => acc + Number(t.amount), 0)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

    const categoryBreakdown: Record<string, { total: number; count: number }> = {}
    transactions.forEach(t => {
      if (!t.is_debit) return
      const cat = t.category || 'Other'
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, count: 0 }
      }
      categoryBreakdown[cat].total += Number(t.amount)
      categoryBreakdown[cat].count += 1
    })

    const topMerchants = Object.entries(
      transactions.filter(t => t.is_debit && t.merchant).reduce((acc: Record<string, number>, t) => {
        acc[t.merchant!] = (acc[t.merchant!] || 0) + Number(t.amount)
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const budgetCompliance = budgets.map(b => ({
      category: b.category,
      limit: Number(b.amount),
      spent: categoryBreakdown[b.category]?.total || 0,
      isOver: (categoryBreakdown[b.category]?.total || 0) > Number(b.amount)
    }))

    const biggestTransaction = transactions.filter(t => t.is_debit).sort((a, b) => Number(b.amount) - Number(a.amount))[0]
    const recurringCharges = detectRecurring(transactions)

    const stats = {
      month,
      totalIncome,
      totalExpense,
      savingsRate: Math.round(savingsRate),
      categoryBreakdown,
      topMerchants,
      budgetCompliance,
      biggestTransaction,
      recurringCharges
    }

    // 3. Call Gemini
    const systemPrompt = `You are a personal finance advisor. Write a monthly financial review 
for an Indian professional. Be specific, use actual numbers, and give actionable advice. 
Tone: friendly but professional. Format: use these exact section headers in markdown:
## Overview, ## What Went Well, ## Areas to Watch, ## Key Insights, ## Recommendations`

    const userPrompt = `Generate ${month} financial review based on this data: ${JSON.stringify(stats)}`

    const result = await flashModel.generateContent([systemPrompt, userPrompt])
    const reportText = result.response.text()

    // 4. Save to reports table
    const { data: savedReport, error: saveError } = await supabase.from('reports').upsert({
      user_id: user.id,
      month,
      content: reportText,
      stats: stats,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,month' }).select().single()

    if (saveError) {
      console.warn('Failed to save report to DB:', saveError)
      return NextResponse.json({ report: reportText, stats })
    }

    return NextResponse.json(savedReport)
  } catch (error: unknown) {
    console.error('AI Report Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('month', { ascending: false })

    if (error) throw error
    return NextResponse.json(reports)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
