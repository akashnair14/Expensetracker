import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { addDays } from 'date-fns'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, payment_ref } = await request.json()

    if (!plan || !payment_ref) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // TODO: Integrate Razorpay payment verification here before updating subscription
    // 1. Integrate Razorpay: https://razorpay.com/docs/
    //    - npm install razorpay
    //    - Create order on server, verify payment signature before updating subscription
    //    - Use razorpay.orders.create({ amount: 6900, currency: 'INR' }) for monthly
    //    - Use razorpay.orders.create({ amount: 79900, currency: 'INR' }) for annual
    // 2. Store razorpay_order_id and razorpay_payment_id in subscriptions table
    // 3. Add webhook endpoint at /api/subscription/webhook for subscription renewals
    // Note: amounts are in paise (₹69 = 6900 paise, ₹799 = 79900 paise)

    let expires_at = null
    if (plan === 'pro_monthly') {
      expires_at = addDays(new Date(), 30).toISOString()
    } else if (plan === 'pro_annual') {
      expires_at = addDays(new Date(), 365).toISOString()
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at,
        payment_ref,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ 
      success: true, 
      plan: updatedSub.plan, 
      expires_at: updatedSub.expires_at 
    })
  } catch (error) {
    console.error('Subscription Upgrade Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
