'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/db/client'
import { ArrowRight, Loader2 } from 'lucide-react'

const BANKS = [
  "HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", 
  "Kotak Mahindra", "Yes Bank", "IndusInd", "Other"
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [fullName, setFullName] = useState('')
  const [income, setIncome] = useState('')
  const [goal, setGoal] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [accountLabel, setAccountLabel] = useState('')

  useEffect(() => {
    // Load initial user data
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name)
      }
    })
  }, [supabase.auth])

  const nextStep = () => {
    setDirection(1)
    setStep(s => s + 1)
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Save user meta if changed
      await supabase.auth.updateUser({
        data: { full_name: fullName, income, goal, onboarded: true }
      })

      // Create account if selected
      if (selectedBank) {
        await supabase.from('accounts').insert({
          user_id: user.id,
          bank_name: selectedBank,
          account_label: accountLabel || `${selectedBank} Account`
        })
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      setLoading(false)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  }

  return (
    <div className="w-full flex flex-col">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`h-2 rounded-full transition-all duration-300 ${
              step >= i ? 'w-8 bg-brand-green' : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence custom={direction} mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="text-2xl font-display text-white mb-2">Tell us about your finances</h1>
                <p className="text-text-muted font-mono text-sm">Let&apos;s personalize your experience.</p>
              </div>

              {/* Pure CSS Wallet Illustration */}
              <div className="w-full h-32 flex items-center justify-center bg-surface2/50 rounded-xl border border-border mb-2 relative overflow-hidden">
                <div className="w-16 h-12 bg-[#FF8C42] rounded-md relative z-10 border border-black/20 shadow-lg">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-6 bg-brand-orange brightness-75 rounded-l-sm"></div>
                </div>
                <div className="absolute top-0 animate-[bounce_2s_ease-in-out_infinite]">
                  <div className="w-6 h-6 rounded-full bg-brand-green border-2 border-[#0D0F14] shadow-[0_0_15px_rgba(0,229,160,0.5)] flex items-center justify-center">
                    <span className="text-[#0D0F14] text-[10px] font-bold">₹</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-mono text-text-muted">Full Name</label>
                <input 
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-surface2 border border-border focus:border-brand-green/60 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-mono text-text-muted">Monthly Income Range</label>
                <select 
                  value={income}
                  onChange={e => setIncome(e.target.value)}
                  className="w-full bg-surface2 border border-border focus:border-brand-green/60 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none appearance-none"
                >
                  <option value="" disabled>Select range...</option>
                  <option value="0-25k">₹0 - 25k</option>
                  <option value="25k-50k">₹25k - 50k</option>
                  <option value="50k-1L">₹50k - 1L</option>
                  <option value="1L+">₹1L+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-mono text-text-muted">Primary Savings Goal</label>
                <select 
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  className="w-full bg-surface2 border border-border focus:border-brand-green/60 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none appearance-none"
                >
                  <option value="" disabled>Select goal...</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Big Purchase">Big Purchase</option>
                  <option value="Investment">Investment</option>
                  <option value="Debt Freedom">Debt Freedom</option>
                </select>
              </div>

              <button 
                onClick={nextStep}
                disabled={!fullName || !income || !goal}
                className="w-full bg-brand-green text-[#0D0F14] font-bold font-ui py-3 rounded-md mt-4 disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="text-2xl font-display text-white mb-2">Add your first bank account</h1>
                <p className="text-text-muted font-mono text-sm">Select your primary bank to get started.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {BANKS.map(bank => (
                  <button
                    key={bank}
                    onClick={() => setSelectedBank(bank)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                      selectedBank === bank 
                        ? 'border-brand-green bg-brand-green/10' 
                        : 'border-border bg-surface2 hover:border-brand-green/40'
                    }`}
                  >
                    <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center mb-2 text-xs font-bold text-text-muted">
                      {bank[0]}
                    </div>
                    <span className="text-sm font-ui text-white">{bank}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedBank && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <label className="text-sm font-mono text-text-muted">Account Label (Optional)</label>
                    <input 
                      type="text"
                      value={accountLabel}
                      onChange={e => setAccountLabel(e.target.value)}
                      placeholder="e.g. Salary Account"
                      className="w-full bg-surface2 border border-border focus:border-brand-green/60 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 mt-4">
                <button 
                  onClick={nextStep}
                  disabled={!selectedBank}
                  className="w-full bg-brand-green text-[#0D0F14] font-bold font-ui py-3 rounded-md disabled:opacity-50"
                >
                  Continue
                </button>
                <button 
                  onClick={() => { setSelectedBank(''); nextStep(); }}
                  className="w-full text-text-muted font-mono text-sm py-2 hover:text-white transition-colors"
                >
                  I&apos;ll add this later
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center gap-8 py-12 relative"
            >
              {/* Confetti CSS effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-2 h-2 rounded-sm"
                    style={{
                      left: '50%', top: '50%',
                      backgroundColor: ['#00E5A0', '#4D9FFF', '#FF8C42'][i % 3],
                      animation: `confetti-explode 1s ease-out forwards`,
                      animationDelay: `${Math.random() * 0.2}s`,
                      '--tx': `${(Math.random() - 0.5) * 200}px`,
                      '--ty': `${(Math.random() - 0.5) * 200 - 100}px`,
                      '--rot': `${Math.random() * 360}deg`
                    } as React.CSSProperties}
                  />
                ))}
              </div>

              <style dangerouslySetInnerHTML={{__html: `
                @keyframes confetti-explode {
                  0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
                  100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0); opacity: 0; }
                }
              `}} />

              {/* Checkmark Animation */}
              <div className="w-24 h-24 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/30 shadow-[0_0_30px_rgba(0,229,160,0.2)]">
                <svg className="w-12 h-12 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    d="M20 6L9 17l-5-5" 
                  />
                </svg>
              </div>

              <div className="text-center">
                <h1 className="text-3xl font-display text-white mb-2">You&apos;re all set!</h1>
                <p className="text-text-muted font-mono">
                  {fullName ? `${fullName}, your` : 'Your'} vault is ready.
                  {selectedBank && <><br/>Linked to <strong>{selectedBank}</strong>.</>}
                </p>
              </div>

              <button 
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-brand-green text-[#0D0F14] font-bold font-ui py-3 rounded-md flex items-center justify-center gap-2 hover:bg-brand-green/90 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Go to Dashboard <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
