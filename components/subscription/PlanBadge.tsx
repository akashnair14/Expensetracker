import { PlanId } from '@/lib/subscription/plans'
import { Star } from 'lucide-react'

interface PlanBadgeProps {
  plan?: PlanId
  className?: string
}

export default function PlanBadge({ plan = 'free', className = '' }: PlanBadgeProps) {
  const isPro = plan === 'pro_monthly' || plan === 'pro_annual'

  if (isPro) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green text-[10px] font-bold ${className}`}>
        <Star className="w-2.5 h-2.5 fill-brand-green" />
        PRO
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded-full bg-surface2 border border-border text-text-muted text-[10px] font-mono ${className}`}>
      FREE
    </div>
  )
}
