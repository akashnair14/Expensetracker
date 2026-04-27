import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { categorizeMerchants } from '@/lib/ai/categorize'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, uncachedMerchants } = body

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    // Load temp JSON
    const { data: fileData, error: fileError } = await supabase.storage
      .from('statements')
      .download(`${user.id}/temp/${jobId}.json`)

    if (fileError || !fileData) {
      console.error('Categorize storage error:', fileError)
      throw new Error(`Could not find temporary parsed data: ${fileError?.message || 'File is empty'}`)
    }

    const text = await fileData.text()
    const transactions = JSON.parse(text)

    // Call Gemini to categorize uncached merchants
    let allCategories: Record<string, string> = {}
    let cleanedMerchants: Record<string, string> = {}

    if (uncachedMerchants && uncachedMerchants.length > 0) {
      const result = await categorizeMerchants(uncachedMerchants, user.id)
      allCategories = result.categories
      cleanedMerchants = result.cleanedMerchants
      
      // Only cache mappings that were AI-generated (not from user's custom rules)
      const aiGeneratedMappings = result.aiGeneratedMerchants.map(merchant => ({
        merchant_hash: merchant.substring(0, 50),
        category: result.categories[merchant]
      }))
      
      if (aiGeneratedMappings.length > 0) {
        // Upsert into global merchant_categories cache
        await supabase.from('merchant_categories').upsert(aiGeneratedMappings, { onConflict: 'merchant_hash' })
        
        // Cache in redis if available
        if (redis) {
          for (const mapping of aiGeneratedMappings) {
            await redis.set(`merchant:${mapping.merchant_hash}`, mapping.category)
          }
        }
      }
    }

    interface TempTransaction {
      id: string;
      account_id: string;
      user_id: string;
      date: string;
      amount: number | string;
      description: string;
      is_debit: boolean;
      merchant?: string;
    }

    interface FinalTransaction extends TempTransaction {
      merchant: string;
      category: string;
    }

    // Apply categories and filter to valid DB columns
    const transactionsToInsert = transactions.map((tx: TempTransaction): FinalTransaction => {
      let finalCategory = 'Other'
      let finalMerchant = tx.merchant || 'UNKNOWN'
      
      const merchantStr = tx.merchant || 'UNKNOWN'
      const hash = merchantStr.substring(0, 50)
      
      if (allCategories[merchantStr]) {
        finalCategory = allCategories[merchantStr]
      } else if (allCategories[hash]) {
        finalCategory = allCategories[hash]
      }

      // Use cleaned merchant name if available
      if (cleanedMerchants[merchantStr]) {
        finalMerchant = cleanedMerchants[merchantStr]
      } else if (cleanedMerchants[hash]) {
        finalMerchant = cleanedMerchants[hash]
      }
      
      return {
        id: tx.id,
        account_id: tx.account_id,
        user_id: tx.user_id,
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        is_debit: tx.is_debit,
        merchant: finalMerchant,
        category: finalCategory
      }
    })

    // 7. Deduplication Check
    // Get date range of new transactions to minimize the fetch from DB
    const dates = transactionsToInsert.map((tx: FinalTransaction) => tx.date).sort()
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('date, amount, description, account_id')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)

    const existingMap = new Set(
      existingTxs?.map(tx => `${tx.date}_${Number(tx.amount)}_${tx.description}_${tx.account_id}`) || []
    )

    const finalTransactions = transactionsToInsert.filter((tx: FinalTransaction) => {
      const key = `${tx.date}_${Number(tx.amount)}_${tx.description}_${tx.account_id}`
      return !existingMap.has(key)
    })

    if (finalTransactions.length > 0) {
      // Bulk insert to transactions table
      const { error: insertError } = await supabase
        .from('transactions')
        .upsert(finalTransactions, { onConflict: 'id' })

      if (insertError) throw insertError
    }

    // Delete temp JSON
    await supabase.storage.from('statements').remove([`${user.id}/temp/${jobId}.json`])

    return NextResponse.json({ 
      success: true, 
      imported: finalTransactions.length,
      skipped: transactionsToInsert.length - finalTransactions.length,
      categories: allCategories
    })

  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; details?: string; stack?: string };
    console.error('Categorize error details:', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      stack: err?.stack
    })
    
    // Return a more descriptive error message if available
    const errorMessage = err?.message || (typeof error === 'string' ? error : 'Failed to import transactions');
    return NextResponse.json({ 
      error: errorMessage,
      code: err?.code
    }, { status: 400 })
  }
}
