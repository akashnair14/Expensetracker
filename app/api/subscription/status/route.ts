import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getUserSubscription } from '@/lib/subscription/gate'
import { differenceInDays } from 'date-fns'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(user.id, supabase)
    
    let daysUntilExpiry = null
    if (subscription.expires_at) {
      daysUntilExpiry = differenceInDays(new Date(subscription.expires_at), new Date())
    }

    return NextResponse.json({
      ...subscription,
      nextBillingDate: subscription.expires_at,
      daysUntilExpiry
    })
  } catch (error) {
    console.error('Subscription Status Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
