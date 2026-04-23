import { flashModel } from './gemini'
import { createClient } from '@/lib/db/server'

export async function categorizeMerchants(
  merchants: string[],
  userId?: string
): Promise<{ categories: Record<string, string>, aiGeneratedMerchants: string[] }> {
  if (merchants.length === 0) return { categories: {}, aiGeneratedMerchants: [] }
  
  const results: Record<string, string> = {}
  let merchantsToAi = [...merchants]

  // Check custom categories if userId is provided
  if (userId) {
    const supabase = createClient()
    const { data: customRules } = await supabase
      .from('custom_categories')
      .select('merchant_pattern, category')
      .eq('user_id', userId)

    if (customRules && customRules.length > 0) {
      const remaining: string[] = []
      
      merchantsToAi.forEach(merchant => {
        const rule = customRules.find(r => 
          merchant.toLowerCase().includes(r.merchant_pattern.toLowerCase())
        )
        if (rule) {
          results[merchant] = rule.category
        } else {
          remaining.push(merchant)
        }
      })
      
      merchantsToAi = remaining
    }
  }

  if (merchantsToAi.length === 0) return { categories: results, aiGeneratedMerchants: [] }

  const prompt = `You are a financial transaction categorizer for Indian bank statements.
Categorize each merchant/description into EXACTLY one of these categories:
Food & Dining, Groceries, Transport, Entertainment, Bills & Utilities, Housing, Debt Repayment, 
Investment, Healthcare, Shopping, Travel, Education, Income, Transfer, Subscriptions, Personal Care, Insurance, Other

Rules:
- "ZOMATO", "SWIGGY", "BLINKIT" → Food & Dining
- "BIGBASKET", "DMART", "RELIANCE FRESH" → Groceries  
- "OLA", "UBER", "METRO", "FASTAG", "PETROL" → Transport
- "NETFLIX", "SPOTIFY", "PRIME", "HOTSTAR" → Subscriptions
- "AMAZON", "FLIPKART", "MYNTRA" → Shopping
- "HDFC EMI", "SBI LOAN", "BAJAJ FIN" → Debt Repayment
- "ZERODHA", "GROWW", "MUTUAL FUND" → Investment
- "SALARY", "NEFT CR" → Income
- UPI transfers to individuals → Transfer
- Default fallback if unsure → Other

Merchants to categorize: ${JSON.stringify(merchantsToAi)}

Respond with ONLY valid JSON, no markdown, no explanation:
{"merchant_name": "Category", ...}`

  try {
    const result = await flashModel.generateContent(prompt)
    const text = result.response.text().trim()
    
    let aiResults: Record<string, string> = {}
    try {
      aiResults = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) aiResults = JSON.parse(match[0])
    }
    
    return { 
      categories: { ...results, ...aiResults }, 
      aiGeneratedMerchants: Object.keys(aiResults) 
    }
  } catch (error) {
    console.error("Gemini API Error:", error)
    return { categories: results, aiGeneratedMerchants: [] }
  }
}
