import { flashModel } from './gemini'

export async function categorizeMerchants(
  merchants: string[]
): Promise<Record<string, string>> {
  if (merchants.length === 0) return {}
  
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

Merchants to categorize: ${JSON.stringify(merchants)}

Respond with ONLY valid JSON, no markdown, no explanation:
{"merchant_name": "Category", ...}`

  try {
    const result = await flashModel.generateContent(prompt)
    const text = result.response.text().trim()
    
    try {
      return JSON.parse(text)
    } catch {
      // Attempt to extract JSON if wrapped in markdown
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      throw new Error("Failed to parse AI categorization response")
    }
  } catch (error) {
    console.error("Gemini API Error:", error)
    return {}
  }
}
