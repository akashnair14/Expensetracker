import { flashModel } from './gemini'
import { SupabaseClient } from '@supabase/supabase-js'

export async function queryTransactions(
  userQuestion: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ answer: string; data?: Record<string, unknown>[] }> {
  
  // Step 1: Parse user intent with Gemini
  const intentPrompt = `User is asking about their personal bank transactions.
Convert this question into a structured query intent. 
Question: "${userQuestion}"
Return ONLY JSON:
{
  "queryType": "aggregate|list|comparison",
  "filters": {
    "category": string | null,
    "merchant": string | null,
    "dateRange": "current_month|last_month|last_3_months|custom" | null,
    "transactionType": "debit|credit|all"
  },
  "aggregation": "sum|count|average|max|min" | null,
  "limit": number | null
}`

  let intent;
  try {
    const intentResult = await flashModel.generateContent(intentPrompt)
    const text = intentResult.response.text().trim()
    const match = text.match(/\{[\s\S]*\}/)
    intent = JSON.parse(match ? match[0] : text)
  } catch (error) {
    console.error("Failed to parse intent:", error)
    return { answer: "I couldn't understand your question. Try asking 'How much did I spend on Food this month?'" }
  }
  
  // Step 2: Execute query against Supabase based on intent
  // We need to join accounts to filter by user_id
  let query = supabase.from('transactions').select('*, accounts!inner(user_id)')
  query = query.eq('accounts.user_id', userId)

  if (intent.filters?.category) {
    query = query.ilike('category', `%${intent.filters.category}%`)
  }
  if (intent.filters?.merchant) {
    query = query.or(`merchant.ilike.%${intent.filters.merchant}%,description.ilike.%${intent.filters.merchant}%`)
  }
  if (intent.filters?.transactionType === 'debit') {
    query = query.eq('is_debit', true)
  } else if (intent.filters?.transactionType === 'credit') {
    query = query.eq('is_debit', false)
  }

  if (intent.filters?.dateRange) {
    const now = new Date()
    if (intent.filters.dateRange === 'current_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      query = query.gte('date', firstDay.toISOString().split('T')[0])
    } else if (intent.filters.dateRange === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
      query = query.gte('date', firstDay.toISOString().split('T')[0])
      query = query.lte('date', lastDay.toISOString().split('T')[0])
    } else if (intent.filters.dateRange === 'last_3_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      query = query.gte('date', start.toISOString().split('T')[0])
    }
  }
  
  const { data: transactions, error } = await query.order('date', { ascending: false }).limit(intent.limit || 100)
  
  if (error) {
    console.error("Supabase query error:", error)
    return { answer: "Sorry, I ran into an issue fetching your transactions." }
  }

  // Step 3: Generate natural language answer
  const totalDebit = transactions?.filter(t => t.is_debit).reduce((s, t) => s + t.amount, 0) || 0
  const totalCredit = transactions?.filter(t => !t.is_debit).reduce((s, t) => s + t.amount, 0) || 0

  const stats = {
    count: transactions?.length || 0,
    totalDebit,
    totalCredit,
    total: intent.filters?.transactionType === 'credit' ? totalCredit : totalDebit,
    average: transactions?.length ? ((intent.filters?.transactionType === 'credit' ? totalCredit : totalDebit) / transactions.length) : 0
  }
  
  const answerPrompt = `User asked: "${userQuestion}"
Query results: ${JSON.stringify(stats)}
Transactions found: ${transactions?.length || 0}
Write a conversational, specific answer in 1-2 sentences. Use ₹ for amounts. Be precise. No fluff.`
  
  try {
    const answerResult = await flashModel.generateContent(answerPrompt)
    return { answer: answerResult.response.text(), data: transactions }
  } catch {
    return { answer: "I found the data, but had trouble formulating the answer.", data: transactions }
  }
}
