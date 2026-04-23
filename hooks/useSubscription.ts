import { useQuery } from '@tanstack/react-query'
import { UserSubscription } from '@/lib/subscription/gate'

export function useSubscription() {
  return useQuery<UserSubscription & { nextBillingDate: string | null, daysUntilExpiry: number | null }>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscription/status')
      if (!res.ok) throw new Error('Failed to fetch subscription')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Convenience hook for gating features in components
export function usePlanGate() {
  const { data: subscription, isLoading } = useSubscription()
  
  return {
    isPro: subscription?.isPro ?? false,
    uploadsRemaining: subscription?.uploadsRemaining ?? 0,
    canUpload: subscription?.isPro || (subscription?.uploadsRemaining === 'unlimited' || (typeof subscription?.uploadsRemaining === 'number' && subscription.uploadsRemaining > 0)),
    canUseAIReports: subscription?.isPro ?? false,
    canExport: subscription?.isPro ?? false,
    canUseFullAnalytics: subscription?.isPro ?? false,
    isLoading
  }
}
