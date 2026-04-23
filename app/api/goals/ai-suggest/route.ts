import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { flashModel } from '@/lib/ai/gemini'
import { suggestMonthlyContribution } from '@/lib/goals/calculations'
import { Goal } from '@/types/goals'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { goals } = await request.json()

    // Fetch last 3 months of transactions to compute average monthly savings
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const startDate = threeMonthsAgo.toISOString().split('T')[0]

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, is_debit, date')
      .eq('user_id', user.id)
      .gte('date', startDate)

    if (txError) throw txError

    // Group by month
    const monthlyTotals: Record<string, { income: number; expense: number }> = {}
    transactions?.forEach(tx => {
      const month = tx.date.slice(0, 7)
      if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 }
      if (tx.is_debit) monthlyTotals[month].expense += Number(tx.amount)
      else monthlyTotals[month].income += Number(tx.amount)
    })

    const months = Object.keys(monthlyTotals)
    const numMonths = months.length || 1
    const totalIncome = Object.values(monthlyTotals).reduce((acc, m) => acc + m.income, 0)
    const totalExpense = Object.values(monthlyTotals).reduce((acc, m) => acc + m.expense, 0)

    const avgIncome = Math.round(totalIncome / numMonths)
    const avgExpense = Math.round(totalExpense / numMonths)
    const monthlySavingsAvailable = Math.max(0, avgIncome - avgExpense)

    const systemPrompt = "You are a personal finance advisor. Suggest realistic monthly savings contributions for each goal based on the user's actual savings capacity. Be specific, practical, and consider goal priority. Respond ONLY with valid JSON."

    const userPrompt = `
User's average monthly income: ₹${avgIncome}
User's average monthly expenses: ₹${avgExpense}
Available monthly savings: ₹${monthlySavingsAvailable}

Goals to allocate savings across:
${(goals as Goal[]).map(g => `- ${g.name}: needs ₹${g.target_amount - g.saved_amount} more, deadline: ${g.deadline || 'none'}, priority: ${g.priority}`).join('\n')}

Return ONLY this JSON format:
{
  "allocations": [
    { "goal_id": "...", "suggested_amount": 0000, "reasoning": "one sentence" }
  ],
  "total_allocated": 0000,
  "monthly_savings_available": 0000,
  "advice": "one paragraph of honest, specific financial advice"
}
`

    try {
      const result = await flashModel.generateContent([systemPrompt, userPrompt])
      const text = result.response.text()
      const jsonStr = text.replace(/```json|```/g, '').trim()
      const suggestions = JSON.parse(jsonStr)
      return NextResponse.json(suggestions)
    } catch (aiError) {
      console.error('Gemini AI Suggest error:', aiError)
      // Fallback
      const allocations = (goals as Goal[]).map(g => ({
        goal_id: g.id,
        suggested_amount: suggestMonthlyContribution(g, monthlySavingsAvailable),
        reasoning: "Based on a standard 12-month timeline or your deadline."
      }))
      
      return NextResponse.json({
        allocations,
        total_allocated: allocations.reduce((acc, a) => acc + a.suggested_amount, 0),
        monthly_savings_available: monthlySavingsAvailable,
        advice: "We're using a standard calculation because the AI advisor is currently unavailable. Try to save consistently to reach your goals faster."
      })
    }
  } catch (error: any) {
    console.error('AI Suggest route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
