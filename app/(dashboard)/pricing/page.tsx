'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Star, Zap, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react'
import { PLANS, PlanId } from '@/lib/subscription/plans'
import { useSubscription } from '@/hooks/useSubscription'
import { useQueryClient } from '@tanstack/react-query'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const { data: subscription, isLoading } = useSubscription()
  const queryClient = useQueryClient()
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)

  const handleUpgrade = async (planId: PlanId) => {
    setIsUpgrading(planId)
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: planId, 
          payment_ref: `MANUAL_${Date.now()}` // Mock payment ref
        })
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['subscription'] })
        alert('Upgrade successful! (Manual simulation)')
      }
    } finally {
      setIsUpgrading(null)
    }
  }

  const proPlan = billingCycle === 'monthly' ? PLANS.pro_monthly : PLANS.pro_annual

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white pt-16 pb-24 px-4 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl aspect-square bg-brand-green/5 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-[860px] mx-auto flex flex-col items-center">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-green/30 bg-brand-green/10 text-brand-green text-[10px] font-mono uppercase tracking-widest mb-6">
            <Star className="w-3 h-3" />
            Simple Pricing
          </div>
          
          <h1 className="text-4xl md:text-[52px] font-display leading-[1.1] mb-4">
            Understand your money.<br />
            <span className="italic text-brand-green">Pay almost nothing.</span>
          </h1>
          
          <p className="text-sm font-mono text-text-muted max-w-md mx-auto mb-10">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-xs font-mono transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-text-muted'}`}>Monthly</span>
            <button 
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-6 rounded-full bg-surface2 border border-border p-1 relative transition-colors hover:border-brand-green/50"
            >
              <motion.div 
                animate={{ x: billingCycle === 'monthly' ? 0 : 24 }}
                className="w-4 h-4 rounded-full bg-brand-green shadow-[0_0_10px_rgba(0,229,160,0.4)]"
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-text-muted'}`}>Yearly</span>
              <span className="bg-brand-green/20 text-brand-green text-[10px] px-2 py-0.5 rounded font-bold border border-brand-green/30">SAVE 15%</span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-20">
          {/* Free Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-[#141720] border rounded-2xl p-8 flex flex-col relative ${
              subscription?.plan === 'free' ? 'border-brand-green/50 ring-1 ring-brand-green/30' : 'border-[#252A3A]'
            }`}
          >
            {subscription?.plan === 'free' && (
              <div className="absolute -top-3 left-8 bg-[#252A3A] border border-border text-[10px] font-mono px-3 py-1 rounded-full text-white">
                YOUR CURRENT PLAN
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-[12px] font-display uppercase tracking-widest text-text-muted mb-4">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-display">₹0</span>
                <span className="text-sm font-mono text-text-muted">/forever</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 mb-8">
              <FeatureItem icon={Check} text="5 statement uploads (lifetime)" />
              <FeatureItem icon={Check} text="AI auto-categorization" />
              <FeatureItem icon={Check} text="Basic dashboard & charts" />
              <FeatureItem icon={Check} text="1 bank account" />
              <FeatureItem icon={Check} text="3 AI queries per day" />
              <FeatureItem icon={X} text="AI monthly reports" muted />
              <FeatureItem icon={X} text="Advanced analytics" muted />
              <FeatureItem icon={X} text="CSV & PDF export" muted />
              <FeatureItem icon={X} text="Multiple accounts" muted />
            </div>

            <button 
              disabled={subscription?.plan === 'free'}
              className={`w-full py-3.5 rounded-xl font-ui text-sm transition-all border ${
                subscription?.plan === 'free' 
                  ? 'bg-transparent border-border text-text-muted cursor-default' 
                  : 'bg-[#1C2030] border-border hover:border-brand-green/40 text-white'
              }`}
            >
              {subscription?.plan === 'free' ? 'Current Plan' : 'Get Started Free'}
            </button>
            <p className="text-center text-[10px] font-mono text-text-muted mt-4">No credit card required</p>
          </motion.div>

          {/* Pro Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-[#141720] border-2 rounded-2xl p-8 flex flex-col relative shadow-[0_0_40px_rgba(0,229,160,0.08)] ${
              isProPlan(subscription?.plan) ? 'border-brand-green' : 'border-brand-green'
            }`}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-green text-[#0D0F14] text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap">
              {billingCycle === 'monthly' ? 'MOST POPULAR' : 'BEST VALUE'}
            </div>

            <div className="mb-8">
              <h3 className="text-[12px] font-display uppercase tracking-widest text-brand-green mb-4">Pro</h3>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={billingCycle}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-5xl font-display"
                    >
                      ₹{billingCycle === 'monthly' ? '69' : '799'}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm font-mono text-text-muted">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-xs font-mono text-brand-green">₹66/mo equivalent</span>
                    <span className="inline-block bg-brand-green/10 border border-brand-green/20 text-[10px] text-brand-green px-2 py-1 rounded w-fit font-bold">
                      2 months free · Save ₹29/mo
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 mb-8">
              <FeatureItem icon={Check} text="Unlimited statement uploads" color="text-brand-green" />
              <FeatureItem icon={Check} text="AI auto-categorization" color="text-brand-green" />
              <FeatureItem icon={Check} text="Full analytics suite (8 charts)" color="text-brand-green" />
              <FeatureItem icon={Check} text="Unlimited bank accounts" color="text-brand-green" />
              <FeatureItem icon={Check} text="Unlimited AI queries" color="text-brand-green" />
              <FeatureItem icon={Check} text="AI monthly reports & insights" color="text-brand-green" />
              <FeatureItem icon={Check} text="CSV & PDF export" color="text-brand-green" />
              <FeatureItem icon={Check} text="Anomaly detection & alerts" color="text-brand-green" />
              <FeatureItem icon={Check} text="Subscription tracker" color="text-brand-green" />
              <FeatureItem icon={Check} text="Priority support" color="text-brand-green" />
            </div>

            <button 
              onClick={() => handleUpgrade(proPlan.id)}
              disabled={subscription?.plan === proPlan.id || isUpgrading === proPlan.id}
              className={`w-full py-4 rounded-xl font-ui font-bold text-sm transition-all shadow-lg shadow-brand-green/20 ${
                subscription?.plan === proPlan.id
                  ? 'bg-transparent border border-brand-green text-brand-green cursor-default'
                  : 'bg-brand-green text-[#0D0F14] hover:bg-brand-green/90 active:scale-[0.98]'
              }`}
            >
              {subscription?.plan === proPlan.id ? 'Current Plan' : isUpgrading === proPlan.id ? 'Processing...' : `Upgrade to Pro`}
            </button>
            <p className="text-center text-[10px] font-mono text-text-muted mt-4">Cancel anytime · Instant activation</p>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-2xl mt-12">
          <h2 className="text-2xl font-display text-center mb-8">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-4">
            <FAQItem 
              question="Is the free plan really free forever?"
              answer="Yes. No credit card required, no expiry. You get 5 statement uploads to try everything. Upgrade only if you want more."
            />
            <FAQItem 
              question="How does the annual plan work?"
              answer="Pay ₹799 once and your Pro access lasts a full year — that's ₹66.58/month. You save ₹29/month compared to the monthly plan, which is 2 months free."
            />
            <FAQItem 
              question="How do I upgrade? Is it instant?"
              answer="Yes, instant. After payment confirmation (simulated for now), your account upgrades immediately with no waiting."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon: Icon, text, muted, color = "text-white/90" }: { icon: any, text: string, muted?: boolean, color?: string }) {
  return (
    <div className={`flex items-start gap-3 ${muted ? 'opacity-40 line-through' : ''}`}>
      <div className={`mt-0.5 shrink-0 ${muted ? 'text-text-muted' : 'text-brand-green'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={`text-[13px] font-ui ${color}`}>{text}</span>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-surface2 transition-colors"
      >
        <span className="text-sm font-ui font-medium text-white">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 text-sm font-mono text-text-muted border-t border-border/50">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function isProPlan(plan?: string) {
  return plan === 'pro_monthly' || plan === 'pro_annual'
}
