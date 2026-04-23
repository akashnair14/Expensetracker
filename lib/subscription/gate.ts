import { SupabaseClient } from '@supabase/supabase-js'
import { PlanId, isPro } from './plans'

export interface UserSubscription {
  plan: PlanId
  status: string
  expires_at: string | null
  isActive: boolean
  isPro: boolean
  uploadsUsed: number
  uploadsRemaining: number | 'unlimited'
}

export async function getUserSubscription(
  userId: string,
  supabase: SupabaseClient
): Promise<UserSubscription> {
  // Get subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  const plan: PlanId = sub?.plan ?? 'free'
  
  // Check if pro plan is still active (not expired)
  const isActive = sub?.status === 'active' &&
    (!sub?.expires_at || new Date(sub.expires_at) > new Date())

  // If pro plan expired, treat as free
  const effectivePlan: PlanId = (isPro(plan) && !isActive) ? 'free' : plan

  // Count lifetime uploads for free users
  let uploadsUsed = 0
  if (effectivePlan === 'free') {
    const { count } = await supabase
      .from('upload_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    uploadsUsed = count ?? 0
  }

  const uploadsRemaining = effectivePlan === 'free'
    ? Math.max(0, 5 - uploadsUsed)
    : 'unlimited'

  return {
    plan: effectivePlan,
    status: sub?.status ?? 'active',
    expires_at: sub?.expires_at ?? null,
    isActive,
    isPro: isPro(effectivePlan),
    uploadsUsed,
    uploadsRemaining,
  }
}

// Throws an error with a structured payload if user cannot perform action
export async function assertCanUpload(userId: string, supabase: SupabaseClient) {
  const subscription = await getUserSubscription(userId, supabase)
  if (!subscription.isPro && subscription.uploadsUsed >= 5) {
    throw new SubscriptionLimitError(
      'upload_limit_reached',
      `You've used all 5 free uploads. Upgrade to Pro for unlimited uploads.`,
      subscription
    )
  }
}

export async function assertCanUseAI(userId: string, supabase: SupabaseClient) {
  const subscription = await getUserSubscription(userId, supabase)
  if (!subscription.isPro) {
    // Check today's AI query count via upload_usage or a separate counter
    // (simplified: just check plan for now)
    // TODO: implement daily AI query counter in Redis
  }
}

// Throws an error if user does not have the required plan
export async function assertPlan(userId: string, requiredPlan: 'pro', supabase?: SupabaseClient) {
  // If no supabase client provided, create one (server side)
  let client = supabase
  if (!client) {
    const { createClient } = await import('@/lib/db/server')
    client = createClient()
  }

  const subscription = await getUserSubscription(userId, client)
  if (requiredPlan === 'pro' && !subscription.isPro) {
    throw new SubscriptionLimitError(
      'pro_required',
      'This feature requires a Pro subscription.',
      subscription
    )
  }
}

export class SubscriptionLimitError extends Error {
  code: string
  subscription: UserSubscription
  constructor(code: string, message: string, subscription: UserSubscription) {
    super(message)
    this.name = 'SubscriptionLimitError'
    this.code = code
    this.subscription = subscription
  }
}
