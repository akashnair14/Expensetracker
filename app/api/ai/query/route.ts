import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { queryTransactions } from '@/lib/ai/query'
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

    // Rate Limiting Logic (max 20 queries per user per day)
    if (redis) {
      const today = new Date().toISOString().split('T')[0]
      const rateLimitKey = `rate_limit:${user.id}:${today}`
      const currentCount = await redis.get<number>(rateLimitKey) || 0
      
      if (currentCount >= 20) {
        return NextResponse.json({ error: 'Daily query limit reached (20/20). Please try again tomorrow.' }, { status: 429 })
      }
      
      await redis.incr(rateLimitKey)
      // Set TTL to expire at the end of the day (24 hours for simplicity)
      if (currentCount === 0) {
        await redis.expire(rateLimitKey, 86400)
      }
    }

    const { question } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const result = await queryTransactions(question, user.id, supabase)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('AI Query Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process query' }, { status: 500 })
  }
}
