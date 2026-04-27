'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileSearch, Table2, Sparkles, Check } from 'lucide-react'

type StepStatus = 'idle' | 'active' | 'done'

interface Step {
  icon: React.ElementType
  label: string
  sublabel: string
  color: string
  glow: string
}

const STEPS: Step[] = [
  {
    icon: FileSearch,
    label: 'Reading File',
    sublabel: 'Decoding PDF structure',
    color: '#4D9FFF',
    glow: 'rgba(77,159,255,0.35)',
  },
  {
    icon: Table2,
    label: 'Extracting Data',
    sublabel: 'Parsing transactions',
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.35)',
  },
  {
    icon: Sparkles,
    label: 'AI Categorization',
    sublabel: 'Labelling merchants',
    color: '#00E5A0',
    glow: 'rgba(0,229,160,0.35)',
  },
]

// How long each animated "active" phase lasts before moving to done
const ACTIVE_DURATION = [1200, 1200] // steps 0 and 1 only (during parsing)

function SpinningRing({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        border: '2px solid transparent',
        borderTopColor: color,
        borderRightColor: `${color}55`,
      }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
    />
  )
}

function PulsingGlow({ glow }: { glow: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ boxShadow: `0 0 22px 7px ${glow}` }}
      animate={{ opacity: [0.35, 1, 0.35] }}
      transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
    />
  )
}

interface ProcessingStepsProps {
  /** The current uploadState from the parent page */
  uploadState: 'idle' | 'selected' | 'parsing' | 'review' | 'importing' | 'done'
}

export default function ProcessingSteps({ uploadState }: ProcessingStepsProps) {
  const [statuses, setStatuses] = useState<StepStatus[]>(['idle', 'idle', 'idle'])
  const [lineProgress, setLineProgress] = useState([0, 0])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const rafRef = useRef<number | null>(null)

  // Animate a connector line filling from 0→1
  const animateLine = (idx: number) => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / 500, 1)
      setLineProgress(prev => {
        const next = [...prev]
        next[idx] = p
        return next
      })
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const clearAll = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  useEffect(() => {
    clearAll()

    if (uploadState === 'parsing') {
      // Steps 1 & 2 animate sequentially. Step 3 stays idle until 'importing'.
      setStatuses(['active', 'idle', 'idle'])
      setLineProgress([0, 0])

      const t1 = setTimeout(() => {
        setStatuses(['done', 'idle', 'idle'])
        animateLine(0)
        const t2 = setTimeout(() => {
          setStatuses(['done', 'active', 'idle'])
          const t3 = setTimeout(() => {
            setStatuses(['done', 'done', 'idle'])
            animateLine(1)
          }, ACTIVE_DURATION[1])
          timersRef.current.push(t3)
        }, 550) // wait for line animation to mostly finish
        timersRef.current.push(t2)
      }, ACTIVE_DURATION[0])
      timersRef.current.push(t1)
    }

    if (uploadState === 'importing') {
      // Steps 1 & 2 are done, Step 3 is now active (AI running)
      setStatuses(['done', 'done', 'active'])
      setLineProgress([1, 1])
    }

    if (uploadState === 'done') {
      // All steps done, flash checkmarks
      setStatuses(['done', 'done', 'done'])
      setLineProgress([1, 1])
    }

    if (uploadState === 'idle' || uploadState === 'selected') {
      setStatuses(['idle', 'idle', 'idle'])
      setLineProgress([0, 0])
    }

    return clearAll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState])

  return (
    <div className="flex flex-col gap-12">
      <div className="relative flex items-start justify-between px-4 md:px-16 pt-8">
        {/* Connector lines - Enhanced with glow and smoother transitions */}
        {[0, 1].map(i => (
          <div
            key={i}
            className="absolute top-[43px] h-[3px] rounded-full overflow-hidden"
            style={{
              backgroundColor: '#161924',
              left: `calc(${i === 0 ? '33.3%' : '66.6%'} - 24px)`,
              width: 'calc(33.3% - 24px)',
              boxShadow: lineProgress[i] > 0 ? `0 0 10px ${STEPS[i].glow}` : 'none',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${STEPS[i].color}, ${STEPS[i + 1].color})`,
                width: `${lineProgress[i] * 100}%`,
                transition: 'width 0.15s ease-out',
                boxShadow: lineProgress[i] > 0 ? `0 0 15px ${STEPS[i].color}` : 'none',
              }}
            />
          </div>
        ))}

        {/* Step nodes */}
        {STEPS.map((step, i) => {
          const status = statuses[i]
          const isActive = status === 'active'
          const isDoneStep = status === 'done'

          return (
            <div key={i} className="flex flex-col items-center gap-4 z-10 group">
              {/* Icon circle - Glassmorphism + Glow */}
              <div className="relative w-[82px] h-[82px] flex items-center justify-center transition-transform duration-500 hover:scale-105">
                {/* Outer Glow for done/active */}
                {(isDoneStep || isActive) && (
                  <div 
                    className="absolute inset-0 rounded-full blur-[20px] opacity-20"
                    style={{ backgroundColor: step.color }}
                  />
                )}

                {/* Main Circle */}
                <div
                  className="absolute inset-0 rounded-full backdrop-blur-xl transition-all duration-500"
                  style={{
                    backgroundColor: isDoneStep
                      ? `${step.color}1A`
                      : isActive
                      ? `${step.color}12`
                      : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${
                      isDoneStep || isActive ? `${step.color}80` : 'rgba(255,255,255,0.08)'
                    }`,
                    boxShadow: isActive ? `0 0 25px ${step.glow}` : isDoneStep ? `0 0 15px ${step.glow}44` : 'none',
                  }}
                />

                {/* Spinning ring + glow — active only */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key="active-elements"
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SpinningRing color={step.color} />
                      <PulsingGlow glow={step.glow} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Burst ring on transition to done */}
                <AnimatePresence>
                  {isDoneStep && (
                    <motion.div
                      key={`burst-${i}`}
                      className="absolute inset-0 rounded-full pointer-events-none"
                      initial={{ opacity: 1, scale: 1, borderWidth: '2px' }}
                      animate={{ opacity: 0, scale: 1.8, borderWidth: '0px' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ border: `2.5px solid ${step.color}` }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon / checkmark */}
                <div className="relative z-20">
                  <AnimatePresence mode="wait">
                    {isDoneStep ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Check
                          className="w-7 h-7"
                          strokeWidth={3}
                          style={{ color: step.color }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        animate={isActive ? { 
                          scale: [1, 1.15, 1],
                          filter: [`drop-shadow(0 0 0px ${step.color}00)`, `drop-shadow(0 0 8px ${step.color}66)`, `drop-shadow(0 0 0px ${step.color}00)`]
                        } : { scale: 1 }}
                        transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                      >
                        <step.icon
                          className="w-7 h-7"
                          style={{
                            color: isActive ? step.color : '#4B5563',
                            transition: 'color 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Labels - Better typography and spacing */}
              <div className="flex flex-col items-center gap-1.5 text-center px-1">
                <span
                  className="text-[13px] font-ui font-bold tracking-tight"
                  style={{
                    color: isDoneStep || isActive ? '#FFFFFF' : '#6B7394',
                    transition: 'color 0.5s',
                  }}
                >
                  {step.label}
                </span>
                <motion.span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider"
                  animate={{ opacity: isActive ? 1 : isDoneStep ? 0.9 : 0.4 }}
                  style={{ color: step.color }}
                >
                  {isDoneStep ? 'Complete ✓' : isActive ? step.sublabel : 'Waiting'}
                </motion.span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Global Status Message - Premium Badge */}
      <div className="flex flex-col items-center justify-center pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={uploadState}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative flex items-center gap-3 px-8 py-3.5 rounded-full overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1.5px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Subtle moving light effect across the badge */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            />

            {uploadState === 'done' ? (
              <div className="flex items-center gap-3 text-brand-green relative z-10">
                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_12px_#00E5A0]" />
                <span className="text-[12px] font-ui font-bold uppercase tracking-[0.15em]">Processing Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 relative z-10">
                <motion.div
                  className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_12px_#00E5A0]"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span className="text-[12px] font-ui font-bold text-[#6B7394] uppercase tracking-[0.2em]">
                  {uploadState === 'parsing' ? 'System is processing your file' : 'AI is categorizing transactions'}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
