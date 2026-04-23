export type PlanId = 'free' | 'pro_monthly' | 'pro_annual'

export interface PlanConfig {
  id: PlanId
  label: string
  price: number           // in rupees
  billingCycle: 'lifetime' | 'monthly' | 'yearly'
  badge?: string
  savingsCallout?: string
  features: {
    uploadLimit: number | 'unlimited'
    aiQueriesPerDay: number | 'unlimited'
    aiReports: boolean
    analyticsLevel: 'basic' | 'full'
    maxAccounts: number | 'unlimited'
    exportEnabled: boolean
  }
  ctas: {
    primary: string       // button text
    color: string         // tailwind bg class
  }
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Free',
    price: 0,
    billingCycle: 'lifetime',
    features: {
      uploadLimit: 5,
      aiQueriesPerDay: 3,
      aiReports: false,
      analyticsLevel: 'basic',
      maxAccounts: 1,
      exportEnabled: false,
    },
    ctas: { primary: 'Get Started Free', color: 'bg-[#1C2030] hover:bg-[#252A3A]' }
  },
  pro_monthly: {
    id: 'pro_monthly',
    label: 'Pro',
    price: 69,
    billingCycle: 'monthly',
    badge: 'Most Popular',
    features: {
      uploadLimit: 'unlimited',
      aiQueriesPerDay: 'unlimited',
      aiReports: true,
      analyticsLevel: 'full',
      maxAccounts: 'unlimited',
      exportEnabled: true,
    },
    ctas: { primary: 'Upgrade to Pro', color: 'bg-brand-green hover:bg-brand-green/90 text-[#0D0F14] font-bold' }
  },
  pro_annual: {
    id: 'pro_annual',
    label: 'Pro Annual',
    price: 799,
    billingCycle: 'yearly',
    badge: 'Best Value',
    savingsCallout: 'Save ₹29/month · 2 months free',
    features: {
      uploadLimit: 'unlimited',
      aiQueriesPerDay: 'unlimited',
      aiReports: true,
      analyticsLevel: 'full',
      maxAccounts: 'unlimited',
      exportEnabled: true,
    },
    ctas: { primary: 'Get Annual Plan', color: 'bg-[#FFD166] hover:bg-[#FFD166]/90 text-[#0D0F14] font-bold' }
  }
}

export function isPro(plan: PlanId): boolean {
  return plan === 'pro_monthly' || plan === 'pro_annual'
}

export function getUploadLimit(plan: PlanId): number | 'unlimited' {
  return PLANS[plan].features.uploadLimit
}
