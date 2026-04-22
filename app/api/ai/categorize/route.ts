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
      throw new Error('Could not find temporary parsed data')
    }

    const text = await fileData.text()
    const transactions = JSON.parse(text)

    // Call Gemini to categorize uncached merchants
    let aiCategories: Record<string, string> = {}
    if (uncachedMerchants && uncachedMerchants.length > 0) {
      aiCategories = await categorizeMerchants(uncachedMerchants)
      
      // Save new mappings to merchant_categories table
      const mappingsToInsert = Object.entries(aiCategories).map(([merchant, category]) => ({
        merchant_hash: merchant.substring(0, 50), // Hash / shortened
        category
      }))
      
      if (mappingsToInsert.length > 0) {
        // Upsert into merchant_categories
        await supabase.from('merchant_categories').upsert(mappingsToInsert, { onConflict: 'merchant_hash' })
        
        // Cache in redis if available
        if (redis) {
          for (const [merchant, category] of Object.entries(aiCategories)) {
            await redis.set(`merchant:${merchant.substring(0, 50)}`, category)
          }
        }
      }
    }

    // Apply categories
    const transactionsToInsert = transactions.map((tx: Record<string, unknown>) => {
      let finalCategory = tx.category || 'Uncategorized'
      
      if (typeof tx.merchant === 'string' && !tx.category) {
        const merchantStr = tx.merchant
        const hash = merchantStr.substring(0, 50)
        if (aiCategories[hash]) {
          finalCategory = aiCategories[hash]
        } else if (aiCategories[merchantStr]) {
          finalCategory = aiCategories[merchantStr]
        }
      }
      
      return {
        ...tx,
        category: finalCategory,
        // Ensure user_id isn't directly passed if schema is strict, but account_id is there
      }
    })

    // Bulk insert to transactions table
    const { error: insertError } = await supabase
      .from('transactions')
      .upsert(transactionsToInsert, { onConflict: 'id' })

    if (insertError) throw insertError

    // Delete temp JSON
    await supabase.storage.from('statements').remove([`${user.id}/temp/${jobId}.json`])

    return NextResponse.json({ 
      success: true, 
      imported: transactionsToInsert.length,
      categories: aiCategories
    })

  } catch (error: unknown) {
    console.error('Categorize error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to import' }, { status: 400 })
  }
}
