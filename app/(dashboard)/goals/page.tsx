'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Plus, Target, Calendar, Clock, Edit3, 
  Trash2, MoreVertical, CheckCircle2, Pause, Play,
  ChevronDown, ChevronUp, ArrowRight, Loader2, Info,
  MessageSquare
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useGoals, useContribute, useDeleteGoal, useUpdateGoal, useAISuggestions } from '@/hooks/useGoals'
import GoalProgressRing from '@/components/goals/GoalProgressRing'
import CreateGoalModal from '@/components/goals/CreateGoalModal'
import { GoalWithStats } from '@/types/goals'
import { format } from 'date-fns'

export default function GoalsPage() {
  const { data, isLoading } = useGoals()
  const { mutate: contribute } = useContribute()
  const { mutate: deleteGoal } = useDeleteGoal()
  const { mutate: updateGoal } = useUpdateGoal()
  const { mutate: getAISuggestions, isPending: aiLoading } = useAISuggestions()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithStats | undefined>(undefined)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)

  const [isDemoMode, setIsDemoMode] = useState(false)

  const activeGoals = isDemoMode ? DEMO_GOALS : (data?.goals.filter(g => g.status !== 'completed') || [])
  const completedGoals = isDemoMode ? [] : (data?.goals.filter(g => g.status === 'completed') || [])

  const handleAISuggest = () => {
    setIsAIPanelOpen(true)
    getAISuggestions(activeGoals, {
      onSuccess: (res) => setAiResult(res)
    })
  }

  const handleApplyAllocation = (goalId: string, amount: number) => {
    updateGoal({ id: goalId, monthly_contribution: amount })
    // Remove from AI result list locally
    setAiResult((prev: any) => ({
      ...prev,
      allocations: prev.allocations.filter((a: any) => a.goal_id !== goalId)
    }))
  }

  const handleApplyAll = () => {
    aiResult.allocations.forEach((a: any) => {
      updateGoal({ id: a.goal_id, monthly_contribution: a.suggested_amount })
    })
    setIsAIPanelOpen(false)
    setAiResult(null)
  }

  return (
    <div className="w-full flex flex-col gap-10 pb-20 relative min-h-screen">
      
      {/* SECTION 1: HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-[32px] font-display text-white tracking-tight">Goals</h1>
          <p className="text-sm font-mono text-text-muted mt-1">Track what you&apos;re saving towards</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAISuggest}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-400 font-ui font-bold hover:bg-purple-500/10 transition-all group shadow-lg shadow-purple-500/5"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Get AI Suggestions
          </button>
          <button 
            onClick={() => { setEditingGoal(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brand-green text-[#0D0F14] px-6 py-2.5 rounded-full font-ui font-bold hover:scale-105 transition-all shadow-lg shadow-brand-green/20"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>
      </div>

      {/* SECTION 2: SUMMARY STRIP */}
      {data && data.goals.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border">
            <Target className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-mono text-white">{activeGoals.length} active goals</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs font-mono text-white">₹{data.totalSaved.toLocaleString()} total saved</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border">
            <span className="text-xs font-mono text-text-muted">₹{(data.totalTarget - data.totalSaved).toLocaleString()} to go</span>
          </div>
        </div>
      )}

      {/* SECTION 3: GOALS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-[380px] bg-surface/50 animate-pulse rounded-2xl border border-border" />)}
        </div>
      ) : activeGoals.length === 0 ? (
        <EmptyState onCreate={() => setIsModalOpen(true)} onSeeExample={() => setIsDemoMode(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeGoals.map(goal => (
            <div key={goal.id} className="relative">
              {isDemoMode && (
                <div className="absolute -top-2 -right-2 z-20 bg-brand-blue text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-lg">
                  Demo
                </div>
              )}
              <GoalCard 
                goal={goal} 
                onEdit={(g) => { setEditingGoal(g); setIsModalOpen(true); }}
                onContribute={(goalId, amount) => contribute({ goalId, amount })}
                onDelete={(id) => deleteGoal(id)}
                onStatusChange={(id, status) => updateGoal({ id, status })}
              />
            </div>
          ))}
        </div>
      )}

      {/* SECTION 6: COMPLETED GOALS */}
      {completedGoals.length > 0 && (
        <div className="mt-12">
          <button 
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            className="flex items-center gap-3 text-text-muted hover:text-white transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center border border-border">
              {isCompletedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <span className="font-display text-lg">Completed Goals ({completedGoals.length})</span>
          </button>
          
          <AnimatePresence>
            {isCompletedExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8 opacity-70">
                   {completedGoals.map(goal => (
                      <GoalCard key={goal.id} goal={goal} isCompleted />
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* SECTION 4: AI SUGGESTIONS PANEL */}
      <AnimatePresence>
        {isAIPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAIPanelOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-[#141720] border-l border-[#252A3A] z-[201] overflow-y-auto flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-[#252A3A] flex items-center justify-between bg-surface2/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-display text-white">AI Savings Plan</h2>
                </div>
                <button onClick={() => setIsAIPanelOpen(false)} className="p-2 hover:bg-surface2 rounded-full text-text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col gap-8">
                {aiLoading ? (
                  <AISkeleton />
                ) : aiResult ? (
                  <>
                    <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-6">
                      <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2">Available Capacity</span>
                      <div className="text-3xl font-display text-brand-green">₹{aiResult.monthly_savings_available.toLocaleString()}<span className="text-sm font-mono text-brand-green/50 ml-1">/mo</span></div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs font-mono text-text-muted uppercase tracking-widest px-1">Goal Allocations</h3>
                      {aiResult.allocations.map((a: any) => {
                        const goal = activeGoals.find(g => g.id === a.goal_id)
                        if (!goal) return null
                        return (
                          <div key={a.goal_id} className="bg-surface2/50 border border-border rounded-2xl p-5 flex flex-col gap-4 group hover:border-purple-500/30 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{goal.emoji}</span>
                                <span className="text-sm font-ui font-bold text-white">{goal.name}</span>
                              </div>
                              <span className="text-lg font-display text-white">₹{a.suggested_amount.toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] font-mono text-text-muted italic leading-relaxed bg-[#141720] p-3 rounded-xl border border-border/50">
                              &quot;{a.reasoning}&quot;
                            </p>
                            <button 
                              onClick={() => handleApplyAllocation(a.goal_id, a.suggested_amount)}
                              className="text-[10px] font-ui font-bold uppercase tracking-widest text-brand-green hover:text-white flex items-center justify-center py-2 border border-brand-green/20 rounded-lg bg-brand-green/5 hover:bg-brand-green transition-all"
                            >
                              Apply Suggestion
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {aiResult.advice && (
                      <div className="bg-[#1C2030] border border-[#252A3A] rounded-2xl p-6 border-l-4 border-l-brand-green">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-3 h-3 text-brand-green" />
                          <span className="text-[10px] font-mono text-brand-green uppercase font-bold tracking-widest">AI Advisor</span>
                        </div>
                        <p className="text-xs font-mono text-white/70 leading-relaxed italic">
                          &quot;{aiResult.advice}&quot;
                        </p>
                      </div>
                    )}
                    
                    <button 
                      onClick={handleApplyAll}
                      className="w-full bg-brand-green text-[#0D0F14] py-4 rounded-2xl font-display font-bold text-lg hover:scale-[1.02] transition-all shadow-xl shadow-brand-green/10 mb-8"
                    >
                      Apply All Suggestions
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-50">
                    <Sparkles className="w-12 h-12 text-purple-400 mb-4" />
                    <p className="text-sm font-mono text-text-muted">Click the analyze button above to generate your plan.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreateGoalModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingGoal(undefined); }} 
        existingGoal={editingGoal}
      />
    </div>
  )
}

function GoalCard({ 
  goal, 
  onEdit, 
  onContribute, 
  onDelete, 
  onStatusChange,
  isCompleted = false 
}: { 
  goal: GoalWithStats
  onEdit?: (g: GoalWithStats) => void
  onContribute?: (id: string, amount: number) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
  isCompleted?: boolean
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleContribute = () => {
    if (!amount || Number(amount) <= 0) return
    onContribute?.(goal.id, Number(amount))
    setIsSuccess(true)
    setTimeout(() => {
      setIsSuccess(false)
      setIsAdding(false)
      setAmount('')
    }, 2000)
  }

  const priorityColor = goal.priority === 1 ? 'border-red-500 text-red-400' : goal.priority === 2 ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
  const priorityLabel = goal.priority === 1 ? 'High' : goal.priority === 2 ? 'Medium' : 'Low'

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group bg-[#141720] border border-[#252A3A] rounded-2xl p-6 flex flex-col gap-6 overflow-hidden transition-all hover:border-white/10 ${goal.status === 'completed' ? 'border-brand-green/30' : ''}`}
      style={{ borderTop: `3px solid ${goal.color}` }}
    >
      {/* Corner Glow */}
      <div 
        className="absolute -top-10 -left-10 w-32 h-32 blur-[40px] rounded-full pointer-events-none" 
        style={{ backgroundColor: `${goal.color}08` }}
      />

      {/* Completed Overlay */}
      {goal.status === 'completed' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ 
          backgroundImage: `repeating-linear-gradient(45deg, ${goal.color}, ${goal.color} 10px, transparent 10px, transparent 20px)` 
        }} />
      )}

      {/* TOP ROW */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{goal.emoji}</div>
          <div className="flex flex-col">
            <span className="font-ui font-bold text-white leading-tight">{goal.name}</span>
            {goal.status === 'completed' && <span className="text-[10px] text-brand-green font-mono uppercase font-bold mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>}
          </div>
        </div>
        
        {!isCompleted && (
          <div className="flex items-center gap-2">
            <span className={`text-[8px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border bg-black/20 ${priorityColor}`}>
              {priorityLabel}
            </span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1.5 hover:bg-surface2 rounded-lg text-text-muted transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="bg-[#141720] border border-[#252A3A] rounded-xl p-1 min-w-[140px] shadow-2xl z-[50]" align="end">
                  <DropdownMenu.Item onClick={() => onEdit?.(goal)} className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-white hover:bg-surface2 rounded-lg cursor-pointer outline-none">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onStatusChange?.(goal.id, goal.status === 'paused' ? 'active' : 'paused')} className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-white hover:bg-surface2 rounded-lg cursor-pointer outline-none">
                    {goal.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />} {goal.status === 'paused' ? 'Resume' : 'Pause'}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-[#252A3A] my-1" />
                  <DropdownMenu.Item onClick={() => onDelete?.(goal.id)} className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-400/10 rounded-lg cursor-pointer outline-none">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>

      {/* MIDDLE: RING + STATS */}
      <div className="flex items-center justify-between gap-6 relative z-10">
        <GoalProgressRing percent={goal.progressPercent} color={goal.color} size={96} strokeWidth={7}>
          <div className="flex flex-col items-center">
            <span className="text-xl font-display text-white leading-none">{Math.round(goal.progressPercent)}%</span>
          </div>
        </GoalProgressRing>
        
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Saved</span>
            <span className="text-lg font-display" style={{ color: goal.color }}>₹{Number(goal.saved_amount).toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Remaining</span>
            <span className="text-sm font-mono text-white/70">₹{goal.remainingAmount.toLocaleString()}</span>
          </div>
          {goal.monthly_contribution && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
              <Calendar className="w-3 h-3" /> ₹{Number(goal.monthly_contribution).toLocaleString()}/mo
            </div>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full h-1.5 bg-surface2 rounded-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${goal.progressPercent}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: goal.color }}
        />
      </div>

      {/* FOOTER INFO */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/50 relative z-10">
        <div className="flex items-center justify-between">
          {goal.deadline ? (
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <Calendar className="w-3 h-3" />
              {format(new Date(goal.deadline), 'MMM dd, yyyy')}
            </div>
          ) : (
            <span className="text-[10px] font-mono text-text-muted/40 italic">No deadline set</span>
          )}
          
          {goal.deadline && (
            <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${goal.isOnTrack ? 'text-brand-green' : 'text-yellow-400'}`}>
              {goal.isOnTrack ? '✓ On track' : '⚠ Behind'}
            </span>
          )}
        </div>

        {goal.monthsToGoal && goal.status === 'active' && (
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/70">
              <Clock className="w-3 h-3" />
              {goal.monthsToGoal <= 1 ? <span className="text-brand-green">Almost there! 🎉</span> : <span>{goal.monthsToGoal} months away</span>}
            </div>
            {goal.projectedCompletionDate && (
              <span className="text-[10px] font-mono text-text-muted">Est: {format(new Date(goal.projectedCompletionDate), 'MMM yyyy')}</span>
            )}
          </div>
        )}
      </div>

      {/* QUICK CONTRIBUTE */}
      {!isCompleted && goal.status === 'active' && (
        <div className="mt-auto pt-4">
          <AnimatePresence mode="wait">
            {!isAdding ? (
              <motion.button 
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm font-ui font-bold transition-all hover:bg-surface2"
                style={{ borderColor: `${goal.color}40`, color: goal.color }}
              >
                <Plus className="w-4 h-4" /> Add Money
              </motion.button>
            ) : (
              <motion.div 
                key="add-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-3 overflow-hidden"
              >
                <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-sm">₹</span>
                   <input
                    autoFocus
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-surface2 border border-border rounded-xl pl-8 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleContribute}
                    disabled={isSuccess || !amount}
                    className="flex-1 py-2.5 rounded-xl font-display font-bold text-sm text-[#0D0F14] transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: isSuccess ? '#00E5A0' : goal.color }}
                  >
                    {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {isSuccess ? 'Saved!' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2.5 rounded-xl text-text-muted text-xs font-mono hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Completed State Footer */}
      {goal.status === 'completed' && goal.completed_at && (
        <div className="mt-auto pt-4 flex flex-col items-center gap-3">
           <div className="w-full h-px bg-brand-green/20" />
           <p className="text-brand-green font-display text-lg animate-pulse">Goal Achieved! 🎉</p>
           <span className="text-[10px] font-mono text-text-muted uppercase">On {format(new Date(goal.completed_at), 'MMMM d, yyyy')}</span>
           <Confetti color={goal.color} />
        </div>
      )}
    </motion.div>
  )
}

function Confetti({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '100%', x: `${Math.random() * 100}%`, scale: 0 }}
          animate={{ 
            y: '-10%', 
            x: `${Math.random() * 100}%`, 
            scale: [0, 1, 0.5],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 2 + Math.random() * 2, 
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut"
          }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ backgroundColor: color, opacity: 0.6 }}
        />
      ))}
    </div>
  )
}

function EmptyState({ onCreate, onSeeExample }: { onCreate: () => void, onSeeExample: () => void }) {
  return (
    <div className="w-full py-24 flex flex-col items-center justify-center text-center">
      <div className="relative w-48 h-48 mb-10">
        {/* SVG Piggy Bank Illustration */}
        <div className="absolute inset-0 bg-brand-green/5 rounded-full blur-[60px]" />
        <svg viewBox="0 0 24 24" className="w-full h-full text-brand-green relative z-10 opacity-80" fill="none" stroke="currentColor" strokeWidth="0.5">
          <path d="M19 5c-1.5 0-2.8 1.4-3 3.5c0 0-4.5 0-4.5 0c-0.2-2.1-1.5-3.5-3-3.5c-2.3 0-4.1 3.2-4.1 7.1c0 3.9 1.8 7.1 4.1 7.1c1.5 0 2.8-1.4 3-3.5c0 0 4.5 0 4.5 0c0.2 2.1 1.5 3.5 3 3.5c2.3 0 4.1-3.2 4.1-7.1C23.1 8.2 21.3 5 19 5z" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </svg>
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-4 right-0 w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center shadow-xl"
        >
          <span className="text-brand-green font-bold text-xs">₹</span>
        </motion.div>
        <motion.div 
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/2 -left-6 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center shadow-xl"
        >
          <span className="text-brand-blue font-bold text-xs">₹</span>
        </motion.div>
      </div>

      <h2 className="text-3xl font-display text-white mb-4">Start saving for what matters</h2>
      <p className="text-text-muted font-mono text-sm max-w-[400px] mb-10 leading-relaxed">
        Set a goal, track your progress, and let AI tell you exactly how to get there. Whether it&apos;s a vacation or a new laptop.
      </p>

      <div className="flex items-center gap-4">
        <button 
          onClick={onCreate}
          className="bg-brand-green text-[#0D0F14] px-8 py-4 rounded-2xl font-display font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-brand-green/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Your First Goal
        </button>
        <button 
          onClick={onSeeExample}
          className="px-8 py-4 rounded-2xl border border-border text-text-muted font-display font-bold text-lg hover:bg-surface2 transition-all"
        >
          See an Example
        </button>
      </div>
    </div>
  )
}

const DEMO_GOALS: any[] = [
  {
    id: 'demo-1',
    name: 'MacBook Pro M3',
    emoji: '💻',
    target_amount: 180000,
    saved_amount: 120000,
    progressPercent: 66,
    remainingAmount: 60000,
    monthly_contribution: 15000,
    monthsToGoal: 4,
    deadline: '2026-08-15',
    projectedCompletionDate: '2026-08-15',
    isOnTrack: true,
    priority: 1,
    color: '#4D9FFF',
    status: 'active',
    contributionHistory: []
  },
  {
    id: 'demo-2',
    name: 'Emergency Fund',
    emoji: '🛡️',
    target_amount: 300000,
    saved_amount: 250000,
    progressPercent: 83,
    remainingAmount: 50000,
    monthly_contribution: 10000,
    monthsToGoal: 5,
    deadline: null,
    projectedCompletionDate: '2026-09-01',
    isOnTrack: true,
    priority: 2,
    color: '#00E5A0',
    status: 'active',
    contributionHistory: []
  },
  {
    id: 'demo-3',
    name: 'Goa Trip',
    emoji: '🏖️',
    target_amount: 40000,
    saved_amount: 5000,
    progressPercent: 12.5,
    remainingAmount: 35000,
    monthly_contribution: 5000,
    monthsToGoal: 7,
    deadline: '2026-11-20',
    projectedCompletionDate: '2026-11-20',
    isOnTrack: true,
    priority: 3,
    color: '#FF8C42',
    status: 'active',
    contributionHistory: []
  }
]

function AISkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-24 bg-surface2/50 rounded-2xl animate-pulse" />
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-surface2/30 border border-border rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between">
               <div className="flex gap-3">
                 <div className="w-6 h-6 bg-surface2 rounded-md animate-pulse" />
                 <div className="w-24 h-4 bg-surface2 rounded animate-pulse" />
               </div>
               <div className="w-16 h-6 bg-surface2 rounded animate-pulse" />
            </div>
            <div className="h-12 bg-surface2/50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-32 bg-surface2/30 rounded-2xl animate-pulse" />
    </div>
  )
}

function X({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
