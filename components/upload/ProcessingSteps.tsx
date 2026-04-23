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
    <div className="flex flex-col gap-10">
      <div className="relative flex items-start justify-between px-2 md:px-14 pt-6">
        {/* Connector lines */}
        {[0, 1].map(i => (
          <div
            key={i}
            className="absolute top-[39px] h-[2px] rounded-full overflow-hidden"
            style={{
              backgroundColor: '#1C2030',
              left: `calc(${i === 0 ? '33.3%' : '66.6%'} - 16px)`,
              width: 'calc(33.3% - 20px)',
            }}
          >
            <div
              className="h-full rounded-full transition-none"
              style={{
                background: `linear-gradient(90deg, ${STEPS[i].color}, ${STEPS[i + 1].color})`,
                width: `${lineProgress[i] * 100}%`,
                transition: 'width 0.08s linear',
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
            <div key={i} className="flex flex-col items-center gap-3 z-10">
              {/* Icon circle */}
              <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                {/* Static background */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: isDoneStep
                      ? `${step.color}1A`
                      : isActive
                      ? `${step.color}12`
                      : '#161924',
                    border: `1.5px solid ${
                      isDoneStep || isActive ? `${step.color}66` : '#1E2438'
                    }`,
                    transition: 'background-color 0.4s, border-color 0.4s',
                  }}
                />

                {/* Spinning ring + glow — active only */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key="ring"
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <SpinningRing color={step.color} />
                      <PulsingGlow glow={step.glow} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Burst ring on done */}
                <AnimatePresence>
                  {isDoneStep && (
                    <motion.div
                      key={`burst-${i}`}
                      className="absolute inset-0 rounded-full pointer-events-none"
                      initial={{ opacity: 0.9, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.7 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ border: `2px solid ${step.color}` }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon / checkmark */}
                <AnimatePresence mode="wait">
                  {isDoneStep ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -20, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    >
                      <Check
                        className="w-6 h-6"
                        strokeWidth={2.5}
                        style={{ color: step.color }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      animate={isActive ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                      transition={
                        isActive
                          ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                          : { duration: 0.2 }
                      }
                    >
                      <step.icon
                        className="w-6 h-6"
                        style={{
                          color: isActive ? step.color : '#374151',
                          transition: 'color 0.3s',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <div className="flex flex-col items-center gap-1 text-center min-w-[90px]">
                <span
                  className="text-[12px] font-ui font-semibold"
                  style={{
                    color: isDoneStep || isActive ? '#fff' : '#374151',
                    transition: 'color 0.3s',
                  }}
                >
                  {step.label}
                </span>
                <motion.span
                  className="text-[10px] font-mono whitespace-nowrap"
                  animate={{ opacity: isActive ? 1 : isDoneStep ? 0.7 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  style={{ color: step.color }}
                >
                  {isDoneStep ? 'Complete ✓' : isActive ? step.sublabel : 'Waiting'}
                </motion.span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Global Status Message */}
      <div className="flex flex-col items-center justify-center pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={uploadState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-surface2/30 border border-white/5"
          >
            {uploadState === 'done' ? (
              <div className="flex items-center gap-2 text-brand-green">
                <Check className="w-4 h-4" />
                <span className="text-sm font-ui font-medium uppercase tracking-wider">All Done! Redirecting...</span>
              </div>
            ) : (
              <>
                <motion.div
                  className="w-2 h-2 rounded-full bg-brand-green"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <span className="text-sm font-ui text-text-muted uppercase tracking-widest">
                  {uploadState === 'parsing' ? 'System is processing your file' : 'AI is categorizing transactions'}
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
