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

    if (uncachedMerchants && uncachedMerchants.length > 0) {
      const result = await categorizeMerchants(uncachedMerchants, user.id)
      allCategories = result.categories
      
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

    // Apply categories
    const transactionsToInsert = transactions.map((tx: { merchant?: string; [key: string]: unknown }) => {
      let finalCategory = 'Other'
      
      const merchantStr = tx.merchant || 'UNKNOWN'
      const hash = merchantStr.substring(0, 50)
      
      if (allCategories[merchantStr]) {
        finalCategory = allCategories[merchantStr]
      } else if (allCategories[hash]) {
        finalCategory = allCategories[hash]
      }
      
      return {
        ...tx,
        category: finalCategory,
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
      categories: allCategories
    })

  } catch (error: unknown) {
    console.error('Categorize error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to import' }, { status: 400 })
  }
}
