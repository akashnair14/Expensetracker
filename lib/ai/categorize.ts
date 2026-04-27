import { flashModel } from './gemini'
import { createClient } from '@/lib/db/server'

export interface MerchantContext {
  merchant: string;
  description: string;
  amount?: number;
}

export async function categorizeMerchants(
  merchants: MerchantContext[],
  userId?: string
): Promise<{ 
  categories: Record<string, string>, 
  cleanedMerchants: Record<string, string>,
  aiGeneratedMerchants: string[] 
}> {
  if (merchants.length === 0) return { categories: {}, cleanedMerchants: {}, aiGeneratedMerchants: [] }
  
  const results: Record<string, string> = {}
  const cleanedNames: Record<string, string> = {}
  let merchantsToAi = [...merchants]
  
  // const merchantKeys = merchants.map(m => m.merchant)

  // Check custom categories if userId is provided
  if (userId) {
    const supabase = createClient()
    const { data: customRules } = await supabase
      .from('custom_categories')
      .select('merchant_pattern, category')
      .eq('user_id', userId)

    if (customRules && customRules.length > 0) {
      const remaining: MerchantContext[] = []
      
      merchantsToAi.forEach(ctx => {
        const rule = customRules.find(r => 
          ctx.merchant.toLowerCase().includes(r.merchant_pattern.toLowerCase()) ||
          ctx.description.toLowerCase().includes(r.merchant_pattern.toLowerCase())
        )
        if (rule) {
          results[ctx.merchant] = rule.category
        } else {
          remaining.push(ctx)
        }
      })
      
      merchantsToAi = remaining
    }
  }

  if (merchantsToAi.length === 0) return { categories: results, cleanedMerchants: {}, aiGeneratedMerchants: [] }

  const prompt = `You are a financial expert specializing in Indian bank transactions.
Your task is to categorize transactions and extract clean merchant names.

Categories:
Food & Dining, Groceries, Transport, Entertainment, Bills & Utilities, Housing, Debt Repayment, 
Investment, Healthcare, Shopping, Travel, Education, Income, Transfer, Subscriptions, Personal Care, Insurance, Other

Transactions to process:
${merchantsToAi.map(m => `- Merchant: "${m.merchant}", Description: "${m.description}", Amount: ${m.amount || 'unknown'}`).join('\n')}

Rules:
1. "Cleaned Merchant": Extract the real business name. Remove UPI IDs (e.g., xxx@okaxis), transaction IDs, and bank prefixes (UPI/IMPS/NEFT).
2. "Category": Choose from the list above.
3. For individual UPI transfers (e.g., "UPI/Payment to Rajesh..."), use "Transfer" category and "Personal Transfer" as the cleaned merchant.
4. For Zomato/Swiggy/Blinkit/BigBasket, use the specific brand name.

Respond with ONLY valid JSON array of objects:
[
  {"original_merchant": "...", "cleaned_merchant": "...", "category": "..."},
  ...
]`

function getFallbackCategory(merchant: string, description: string): string {
  const m = (merchant + ' ' + description).toUpperCase();
  if (m.includes('ZOMATO') || m.includes('SWIGGY') || m.includes('RESTAURANT') || m.includes('CAFE') || m.includes('FOOD') || m.includes('HOTEL')) return 'Food & Dining';
  if (m.includes('UBER') || m.includes('OLA') || m.includes('METRO') || m.includes('FUEL') || m.includes('PETROL') || m.includes('BPCL') || m.includes('HPCL') || m.includes('FASTAG')) return 'Transport';
  if (m.includes('AMAZON') || m.includes('FLIPKART') || m.includes('MYNTRA') || m.includes('SHOP') || m.includes('RETAIL')) return 'Shopping';
  if (m.includes('BIGBASKET') || m.includes('BLINKIT') || m.includes('DMART') || m.includes('GROCER')) return 'Groceries';
  if (m.includes('BILL') || m.includes('RECHARGE') || m.includes('ELECTRICITY') || m.includes('WATER') || m.includes('GAS') || m.includes('AIRTEL') || m.includes('JIO') || m.includes('VI ')) return 'Bills & Utilities';
  if (m.includes('SALARY') || m.includes('DIVIDEND') || m.includes('INTEREST')) return 'Income';
  if (m.includes('EMI') || m.includes('LOAN') || m.includes('FINANCE')) return 'Debt Repayment';
  if (m.includes('NETFLIX') || m.includes('SPOTIFY') || m.includes('PRIME') || m.includes('YOUTUBE') || m.includes('DISNEY')) return 'Subscriptions';
  if (m.includes('HOSPITAL') || m.includes('PHARMACY') || m.includes('MEDICINE') || m.includes('DOCTOR') || m.includes('APOLLO')) return 'Healthcare';
  if (m.includes('INSURANCE') || m.includes('LIC ') || m.includes('HDFC ERGO')) return 'Insurance';
  if (m.includes('INVEST') || m.includes('ZERODHA') || m.includes('GROWW') || m.includes('STOCK') || m.includes('MUTUAL')) return 'Investment';
  return 'Other';
}

  try {
    const result = await flashModel.generateContent(prompt)
    const text = result.response.text().trim()
    
    interface AICategoryResult {
      original_merchant: string;
      cleaned_merchant: string;
      category: string;
    }
    let aiResults: AICategoryResult[] = []
    try {
      aiResults = JSON.parse(text)
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) aiResults = JSON.parse(match[0])
    }
    
    const finalCategories = { ...results }
    const finalCleaned = { ...cleanedNames }
    const generatedKeys: string[] = []

    aiResults.forEach(res => {
      finalCategories[res.original_merchant] = res.category
      finalCleaned[res.original_merchant] = res.cleaned_merchant
      generatedKeys.push(res.original_merchant)
    })

    return { 
      categories: finalCategories, 
      cleanedMerchants: finalCleaned,
      aiGeneratedMerchants: generatedKeys
    }
  } catch (error) {
    console.error("Gemini API Error:", error)
    const fallbackResults: Record<string, string> = {}
    merchantsToAi.forEach(m => {
      fallbackResults[m.merchant] = getFallbackCategory(m.merchant, m.description)
    })
    return { 
      categories: { ...results, ...fallbackResults }, 
      cleanedMerchants: {},
      aiGeneratedMerchants: [] 
    }
  }
}
