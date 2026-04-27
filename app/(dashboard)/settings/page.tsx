'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pencil, Check, Download, Trash2, Plus, Lightbulb, 
  ChevronRight, Target as TargetIcon,
  ShieldCheck, Lock,
  User, Bell, Tag, Building2, Zap, Shield, AlertTriangle
} from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import * as Select from '@radix-ui/react-select'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Avatar from '@radix-ui/react-avatar'
import { 
  useProfile, useUpdateProfile, 
  useNotificationPrefs, useUpdateNotifications, 
  useCustomCategories, useCreateCategory, useDeleteCategory,
  useAccounts, useUpdateAccount, useDeleteAccount
} from '@/hooks/useSettings'
import { useSubscription } from '@/hooks/useSubscription'
import { useToast } from '@/components/ui/toast'
import PlanBadge from '@/components/subscription/PlanBadge'
import { useRouter } from 'next/navigation'

type SettingsTab = 'profile' | 'notifications' | 'categories' | 'accounts' | 'subscription' | 'data' | 'danger'

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }>; color?: string }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'accounts', label: 'Bank Accounts', icon: Building2 },
  { id: 'subscription', label: 'Subscription', icon: Zap },
  { id: 'data', label: 'Data & Privacy', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, color: 'text-red-400' },
]

const CATEGORIES = [
  'Food & Dining', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 
  'Income', 'Groceries', 'Healthcare', 'Housing', 'Education', 'Travel', 
  'Personal Care', 'Subscriptions', 'Insurance', 'Debt Repayment', 'Other'
]

// --- UI Components ---

const SettingRow = ({ label, description, children, border = true }: { label: string, description?: string, children: React.ReactNode, border?: boolean }) => (
  <div className={`flex items-center justify-between py-6 ${border ? 'border-b border-border/50' : ''}`}>
    <div className="flex flex-col gap-1.5 max-w-[65% ]">
      <h4 className="font-ui text-sm text-white font-semibold tracking-tight">{label}</h4>
      {description && <p className="font-mono text-[12px] text-white/50 leading-relaxed">{description}</p>}
    </div>
    <div className="flex items-center gap-3">
      {children}
    </div>
  </div>
)

const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <h5 className="font-mono text-[10px] uppercase text-brand-green/80 tracking-[0.2em] mt-12 mb-6 font-bold">{children}</h5>
)

const CustomSwitch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
  <Switch.Root
    checked={checked}
    onCheckedChange={onCheckedChange}
    className={`w-10 h-5 rounded-full relative transition-colors duration-200 outline-none cursor-pointer ${checked ? 'bg-brand-green' : 'bg-surface2'}`}
  >
    <Switch.Thumb className={`block w-4 h-4 bg-white rounded-full transition-transform duration-200 translate-x-0.5 will-change-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
  </Switch.Root>
)

const CustomSelect = ({ value, onValueChange, options, placeholder }: { value: string, onValueChange: (v: string) => void, options: { value: string, label: string }[], placeholder?: string }) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className="flex items-center justify-between w-48 px-3 py-2 text-xs font-mono bg-surface2 border border-border rounded-md hover:border-brand-green/40 transition-colors outline-none text-white">
      <Select.Value placeholder={placeholder} />
      <Select.Icon>
        <ChevronRight className="w-3 h-3 rotate-90 opacity-50" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="z-[100] bg-[#141720] border border-border rounded-md shadow-2xl overflow-hidden min-w-48">
        <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-[#141720] text-white cursor-default">
          <ChevronRight className="w-3 h-3 -rotate-90" />
        </Select.ScrollUpButton>
        <Select.Viewport className="p-1">
          {options.map(opt => (
            <Select.Item key={opt.value} value={opt.value} className="relative flex items-center px-8 py-2 text-[11px] font-mono text-text-muted hover:text-white hover:bg-[#1C2030] outline-none cursor-pointer data-[state=checked]:text-brand-green data-[state=checked]:bg-brand-green/5">
              <Select.ItemText>{opt.label}</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
                <Check className="w-3 h-3 text-brand-green" />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
)

// --- Sections ---

const ProfileSection = () => {
  const { data, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const { toast } = useToast()
  
  const [name, setName] = useState('')
  const [income, setIncome] = useState('')

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.full_name || '')
      setIncome(data.profile.monthly_income_estimate || '')
    }
  }, [data])

  const handleSave = async (updates: Partial<{ full_name: string; monthly_income_estimate: string | number; currency: string; financial_goal_type: string }>) => {
    try {
      await updateProfile.mutateAsync(updates)
      toast('✓ Settings saved', undefined, 'success')
    } catch {
      toast('Error saving settings', undefined, 'error')
    }
  }

  if (isLoading) return <div className="animate-pulse space-y-6">
    {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface2 rounded-xl" />)}
  </div>

  const profile = data?.profile || {}

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <div className="flex items-center gap-6 mb-10 pb-10 border-b border-border/50">
        <Avatar.Root className="w-16 h-16 rounded-full overflow-hidden bg-brand-green/20 flex items-center justify-center border-2 border-brand-green/30">
          <Avatar.Image src={profile.avatar_url} className="w-full h-full object-cover" />
          <Avatar.Fallback className="text-xl font-display font-bold text-brand-green">
            {profile.full_name?.[0] || data?.email?.[0]?.toUpperCase()}
          </Avatar.Fallback>
        </Avatar.Root>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button className="text-xs font-mono text-brand-green hover:underline">Change Photo</button>
            <span className="text-text-muted opacity-30">|</span>
            <button className="text-xs font-mono text-text-muted hover:text-white transition-colors">Remove</button>
          </div>
          <p className="text-[10px] text-text-muted font-mono">Profile photos sync from Google</p>
        </div>
      </div>

      <GroupHeading>Personal Information</GroupHeading>
      
      <SettingRow label="Full Name" description="Shown in your reports and greetings">
        <div className="flex items-center gap-3 bg-surface2 border border-border rounded-md px-3 py-1.5 focus-within:border-brand-green/40 transition-colors">
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== profile.full_name && handleSave({ full_name: name })}
            className="bg-transparent outline-none font-mono text-xs text-white w-48"
            placeholder="Your name"
          />
          <Pencil className="w-3 h-3 text-text-muted" />
        </div>
      </SettingRow>

      <SettingRow label="Email" description="Your login email address">
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-green/10 border border-brand-green/20 rounded-full">
          <span className="text-[11px] font-mono text-brand-green">{data?.email}</span>
          <Check className="w-3 h-3 text-brand-green" />
        </div>
      </SettingRow>

      <SettingRow label="Monthly Income" description="Used to calculate your savings rate and progress">
        <div className="flex items-center gap-2 bg-surface2 border border-border rounded-md px-3 py-1.5">
          <span className="text-text-muted font-mono text-xs">₹</span>
          <input 
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            onBlur={() => income !== String(profile.monthly_income_estimate || '') && handleSave({ monthly_income_estimate: Number(income) })}
            className="bg-transparent outline-none font-mono text-xs text-white w-32"
          />
        </div>
      </SettingRow>
      <p className="text-[10px] text-text-muted font-mono mt-2 opacity-60">This is never shared. Used only for your personal insights.</p>

      <GroupHeading>App Preferences</GroupHeading>

      <SettingRow label="Currency" description="Select your preferred currency for display">
        <CustomSelect 
          value={profile.currency || 'INR'}
          onValueChange={(v) => handleSave({ currency: v })}
          options={[
            { value: 'INR', label: 'INR ₹ (Rupee)' },
            { value: 'USD', label: 'USD $ (Dollar)' },
            { value: 'EUR', label: 'EUR € (Euro)' },
            { value: 'GBP', label: 'GBP £ (Pound)' },
            { value: 'AED', label: 'AED د.إ (Dirham)' },
          ]}
        />
      </SettingRow>

      <SettingRow label="Financial Style" description="How the AI suggests savings and budget adjustments">
        <CustomSelect 
          value={profile.financial_goal_type || 'balanced'}
          onValueChange={(v) => handleSave({ financial_goal_type: v })}
          options={[
            { value: 'frugal', label: 'Frugal - Prioritise Saving' },
            { value: 'balanced', label: 'Balanced - Sustainable' },
            { value: 'relaxed', label: 'Relaxed - High Spending' },
          ]}
        />
      </SettingRow>
      <p className="text-[10px] text-text-muted font-mono mt-4 leading-relaxed">
        Currently only INR statements are supported for AI parsing. Currency affects display only.
      </p>
    </motion.div>
  )
}

const NotificationsSection = () => {
  const { data: prefs, isLoading } = useNotificationPrefs()
  const updateNotifications = useUpdateNotifications()

  if (isLoading) return <div className="space-y-6 animate-pulse">
    {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface2 rounded-lg" />)}
  </div>

  const toggle = (field: string) => {
    updateNotifications.mutate({ [field]: !prefs[field] })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-10">
      <GroupHeading>Budget Alerts</GroupHeading>
      <SettingRow label="Budget at 70%" description="Get a heads-up when spending reaches 70% of a category">
        <CustomSwitch checked={!!prefs.budget_alert_70} onCheckedChange={() => toggle('budget_alert_70')} />
      </SettingRow>
      <SettingRow label="Budget Exceeded" description="Alert when you go over a category budget">
        <CustomSwitch checked={!!prefs.budget_alert_100} onCheckedChange={() => toggle('budget_alert_100')} />
      </SettingRow>

      <GroupHeading>AI & Reports</GroupHeading>
      <SettingRow label="Monthly Report Ready" description="Notify when your AI financial report is generated">
        <CustomSwitch checked={!!prefs.monthly_report_ready} onCheckedChange={() => toggle('monthly_report_ready')} />
      </SettingRow>
      <SettingRow label="Anomaly Detected" description="Alert for unusual or suspicious transactions">
        <CustomSwitch checked={!!prefs.anomaly_detected} onCheckedChange={() => toggle('anomaly_detected')} />
      </SettingRow>

      <GroupHeading>Goals</GroupHeading>
      <SettingRow label="Goal Milestone Reached" description="Celebrate when a savings goal hits 25%, 50%, 75%, 100%">
        <CustomSwitch checked={!!prefs.goal_milestone} onCheckedChange={() => toggle('goal_milestone')} />
      </SettingRow>

      <GroupHeading>Subscriptions</GroupHeading>
      <SettingRow label="Renewal Reminder" description="Remind 3 days before a detected subscription renews">
        <CustomSwitch checked={!!prefs.subscription_renewal} onCheckedChange={() => toggle('subscription_renewal')} />
      </SettingRow>
      <SettingRow label="Weekly Summary" description="A brief Sunday summary of the week's spending">
        <CustomSwitch checked={!!prefs.weekly_summary} onCheckedChange={() => toggle('weekly_summary')} />
      </SettingRow>

      <GroupHeading>Delivery</GroupHeading>
      <SettingRow label="Email Notifications" description={prefs.email_enabled ? `Sending to ${prefs.user_email || 'your email'}` : "Currently disabled"}>
        <CustomSwitch checked={!!prefs.email_enabled} onCheckedChange={() => toggle('email_enabled')} />
      </SettingRow>
      <SettingRow label="Push Notifications" description="Browser push notifications (requires permission)">
        <div className="flex flex-col items-end gap-2">
          <CustomSwitch checked={!!prefs.push_enabled} onCheckedChange={() => toggle('push_enabled')} />
          {typeof window !== 'undefined' && Notification.permission !== 'granted' && (
            <button 
              onClick={() => Notification.requestPermission()}
              className="text-[10px] text-brand-green hover:underline font-mono"
            >
              Enable in browser ↗
            </button>
          )}
        </div>
      </SettingRow>
    </motion.div>
  )
}

const CategoriesSection = () => {
  const { data: rules } = useCustomCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const { toast } = useToast()

  const [pattern, setPattern] = useState('')
  const [category, setCategory] = useState('')

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pattern || !category) return
    
    try {
      await createCategory.mutateAsync({ merchant_pattern: pattern, category })
      setPattern('')
      setCategory('')
      toast('✓ Rule added', undefined, 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error adding rule', undefined, 'error')
    }
  }

  const handleSuggest = (p: string, c: string) => {
    setPattern(p)
    setCategory(c)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-10">
      <div className="bg-brand-green/5 rounded-xl p-5 border border-brand-green/10 flex gap-4 mb-10">
        <Lightbulb className="w-5 h-5 text-brand-green shrink-0 mt-1" />
        <p className="text-[11px] font-mono text-text-muted leading-relaxed">
          When a transaction description contains your merchant pattern, it&apos;s always assigned to your chosen category — no AI needed. <br/>
          <span className="text-brand-green opacity-70 italic mt-2 block">Example: &apos;CANTEEN&apos; → Food & Dining.</span>
        </p>
      </div>

      <form onSubmit={handleAddRule} className="flex gap-3 mb-10 bg-surface2 p-4 rounded-xl border border-border/50">
        <input 
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="Merchant contains..."
          className="flex-1 bg-[#0D0F14] border border-border rounded-md px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-green/40"
        />
        <CustomSelect 
          value={category}
          onValueChange={setCategory}
          placeholder="Select Category"
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
        />
        <button 
          disabled={createCategory.isPending || !pattern || !category}
          className="bg-brand-green text-black font-display font-bold px-4 rounded-md text-xs hover:bg-brand-green/90 transition-colors disabled:opacity-50"
        >
          {createCategory.isPending ? 'Adding...' : 'Add Rule'}
        </button>
      </form>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {rules?.map((rule: { id: string; merchant_pattern: string; category: string }) => (
            <motion.div 
              key={rule.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface2/50 border border-border/40 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-surface2 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-brand-green bg-brand-green/10 px-2 py-0.5 rounded">&quot;{rule.merchant_pattern}&quot;</span>
                <ChevronRight className="w-3 h-3 text-text-muted" />
                <span className="font-mono text-xs text-white">{rule.category}</span>
              </div>
              <button 
                onClick={() => deleteCategory.mutate(rule.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {rules?.length === 0 && (
          <p className="text-center font-mono text-[11px] text-text-muted py-10 italic">No custom rules yet. Add one above to get started.</p>
        )}
      </div>

      <div className="mt-12">
        <h5 className="font-mono text-[10px] uppercase text-text-muted tracking-widest mb-4">Suggested Rules</h5>
        <div className="flex flex-wrap gap-2">
          {[
            { p: 'CANTEEN', c: 'Food & Dining' },
            { p: 'PETROL', c: 'Transport' },
            { p: 'MEDICAL', c: 'Healthcare' },
            { p: 'RENT', c: 'Housing' },
            { p: 'SALARY', c: 'Income' },
            { p: 'SCHOOL', c: 'Education' },
          ].map(s => (
            <button 
              key={s.p}
              onClick={() => handleSuggest(s.p, s.c)}
              className="border border-dashed border-border hover:border-brand-green/40 hover:bg-brand-green/5 px-3 py-1.5 rounded font-mono text-[10px] text-text-muted hover:text-brand-green transition-all"
            >
              {s.p} → {s.c}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

interface Account {
  id: string;
  bank_name: string;
  account_label?: string;
  account_number_last4: string;
  transaction_count?: number;
}

const AccountsSection = () => {
  const { toast } = useToast()
  const { data: accounts, isLoading } = useAccounts()
  const deleteAccount = useDeleteAccount()
  const updateAccount = useUpdateAccount()

  const [editingAccount, setEditingAccount] = useState<{ id: string, label: string } | null>(null)

  if (isLoading) return <div className="space-y-4 animate-pulse">
    {[1,2,3].map(i => <div key={i} className="h-24 bg-surface2 rounded-xl" />)}
  </div>

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id)
      toast('✓ Bank account removed', undefined, 'success')
    } catch {
      toast('Error removing account', undefined, 'error')
    }
  }

  const handleRename = async () => {
    if (!editingAccount) return
    try {
      await updateAccount.mutateAsync({ id: editingAccount.id, account_label: editingAccount.label })
      setEditingAccount(null)
      toast('✓ Account renamed', undefined, 'success')
    } catch {
      toast('Error renaming account', undefined, 'error')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-10">
      <div className="grid grid-cols-1 gap-4 mb-8">
        <AnimatePresence mode="popLayout">
          {accounts?.map((acc: Account) => (
            <motion.div 
              key={acc.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface2/40 border border-border rounded-xl p-5 hover:border-brand-green/20 transition-all flex items-start justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center font-display font-bold text-brand-green text-lg">
                  {acc.bank_name?.[0]}
                </div>
                <div>
                  {editingAccount?.id === acc.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        value={editingAccount.label}
                        onChange={e => setEditingAccount({ ...editingAccount, label: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        className="bg-[#0D0F14] border border-brand-green/30 rounded px-2 py-1 text-xs font-mono text-white outline-none"
                      />
                      <button onClick={handleRename} className="p-1 text-brand-green"><Check className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <h4 className="font-display text-white text-base">{acc.bank_name}</h4>
                  )}
                  <p className="font-mono text-xs text-text-muted">
                    {acc.account_label || 'Primary Account'} (•••• {acc.account_number_last4 || '????'})
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-2">
                   <button 
                     onClick={() => setEditingAccount({ id: acc.id, label: acc.account_label || '' })}
                     className="p-2 text-text-muted hover:text-white transition-colors"
                   >
                     <Pencil className="w-4 h-4" />
                   </button>
                   
                   <AlertDialog.Root>
                     <AlertDialog.Trigger asChild>
                       <button className="p-2 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </AlertDialog.Trigger>
                     <AlertDialog.Portal>
                       <AlertDialog.Overlay className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" />
                       <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[#141720] border border-border p-6 rounded-2xl z-[101] shadow-2xl">
                         <AlertDialog.Title className="font-display text-xl text-white mb-2">Remove {acc.bank_name}?</AlertDialog.Title>
                         <AlertDialog.Description className="font-mono text-xs text-text-muted mb-6 leading-relaxed">
                           This will permanently remove this bank account and all associated transactions. This action cannot be undone.
                         </AlertDialog.Description>
                         <div className="flex justify-end gap-3">
                           <AlertDialog.Cancel className="px-4 py-2 text-xs font-mono text-text-muted hover:text-white">Cancel</AlertDialog.Cancel>
                           <AlertDialog.Action 
                             onClick={() => handleDelete(acc.id)}
                             className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono rounded-md hover:bg-red-500/20"
                           >
                             Remove Account
                           </AlertDialog.Action>
                         </div>
                       </AlertDialog.Content>
                     </AlertDialog.Portal>
                   </AlertDialog.Root>
                </div>
                <span className="text-[10px] font-mono text-brand-green/60 uppercase tracking-widest">{acc.transaction_count || 0} transactions</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button 
          onClick={() => window.location.href = '/upload'}
          className="border-2 border-dashed border-border/40 rounded-xl p-8 hover:border-brand-green/30 hover:bg-brand-green/5 transition-all flex flex-col items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full border border-dashed border-border group-hover:border-brand-green/50 flex items-center justify-center text-text-muted group-hover:text-brand-green transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-center">
            <span className="font-display text-sm text-text-muted group-hover:text-white block">Add Bank Account</span>
            <span className="text-[10px] font-mono text-text-muted/50 mt-1 block">Automatically detected when you upload a statement</span>
          </div>
        </button>
      </div>

      <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-5 flex gap-4">
        <Lightbulb className="w-5 h-5 text-brand-green shrink-0 mt-1" />
        <p className="text-[11px] font-mono text-text-muted leading-relaxed">
          SpendSense automatically detects your bank and account number when you upload a statement. 
          You can manage your discovered accounts here.
        </p>
      </div>
    </motion.div>
  )
}

const SubscriptionSection = () => {
  const { data: sub, isLoading } = useSubscription()

  if (isLoading) return <div className="h-48 bg-surface2 rounded-2xl animate-pulse" />

  const isPro = sub?.plan?.startsWith('pro')
  const isCancelled = sub?.status === 'cancelled'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-10">
      <div className={`bg-surface2/40 rounded-2xl p-8 border ${isPro ? 'border-brand-green/40 shadow-[0_0_40px_rgba(0,229,160,0.05)]' : 'border-border'} flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden`}>
        {isPro && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />}
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <PlanBadge plan={sub?.plan || 'free'} />
            <h3 className="font-display text-2xl text-white">{isPro ? 'Pro Member' : 'Free Plan'}</h3>
          </div>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${sub?.status === 'active' ? 'bg-brand-green' : 'bg-red-400'} animate-pulse`} />
             <span className="text-xs font-mono text-text-muted capitalize">{sub?.status || 'Active'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between min-h-[80px]">
          {isPro ? (
            <div className="text-right">
              <p className="text-xl font-display text-white">{sub?.plan?.includes('annual') ? '₹799/yr' : '₹69/mo'}</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">Renews on {sub?.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[10px] font-mono text-text-muted mb-2 uppercase tracking-tighter">{sub?.uploadsUsed}/5 Free Uploads used</p>
              <div className="w-32 h-1 bg-[#0D0F14] rounded-full overflow-hidden">
                <div className="h-full bg-brand-green" style={{ width: `${(sub?.uploadsUsed || 0) / 5 * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {!isPro ? (
        <div className="mt-8 space-y-4">
           <button onClick={() => window.location.href = '/pricing'} className="w-full py-4 bg-brand-green text-black font-display font-bold rounded-xl hover:bg-brand-green/90 transition-all shadow-xl shadow-brand-green/10">
             Upgrade to Pro
           </button>
           <p className="text-center text-[11px] font-mono text-text-muted hover:text-white cursor-pointer transition-colors">See what Pro includes →</p>
        </div>
      ) : (
        <div className="mt-10 pt-10 border-t border-border/50">
           <GroupHeading>Billing</GroupHeading>
           <div className="border border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-xs font-mono text-text-muted italic">Payment history will appear here once integrated with Razorpay.</p>
           </div>
           
           {!isCancelled && (
             <button className="mt-10 text-xs font-mono text-red-400 hover:text-red-300 transition-colors flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Cancel Subscription
             </button>
           )}
        </div>
      )}
    </motion.div>
  )
}

const DataSection = () => {
  const { toast } = useToast()
  const { data: sub } = useSubscription()
  const [exportingJson, setExportingJson] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const handleExport = async (format: 'json' | 'csv') => {
    if (format === 'csv' && !sub?.plan?.startsWith('pro')) {
       toast('Pro plan required', 'CSV export is a Pro feature.', 'error')
       return
    }

    if (format === 'json') {
      setExportingJson(true)
    } else {
      setExportingCsv(true)
    }
    
    try {
      const res = await fetch(`/api/settings/export?format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spendsense-export-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast('Export failed', undefined, 'error')
    } finally {
      setExportingJson(false)
      setExportingCsv(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-10">
      <GroupHeading>Export Your Data</GroupHeading>
      
      <SettingRow label="Export All Data (JSON)" description="Complete export of all your transactions, goals, budgets and reports">
        <button 
          onClick={() => handleExport('json')}
          disabled={exportingJson}
          className="flex items-center gap-2 bg-surface2 border border-border px-4 py-2 rounded-md text-xs font-mono text-white hover:border-brand-green/40 transition-colors"
        >
          {exportingJson ? <div className="w-3 h-3 border border-white border-t-transparent animate-spin rounded-full" /> : <Download className="w-3 h-3" />}
          Download JSON
        </button>
      </SettingRow>

      <SettingRow label="Export Transactions (CSV)" description="All transactions in spreadsheet format — Pro only">
        <div className="flex items-center gap-3">
          {!sub?.plan?.startsWith('pro') && <Lock className="w-3 h-3 text-text-muted" />}
          <button 
            onClick={() => handleExport('csv')}
            disabled={exportingCsv}
            className={`flex items-center gap-2 bg-surface2 border border-border px-4 py-2 rounded-md text-xs font-mono transition-colors ${sub?.plan?.startsWith('pro') ? 'text-white hover:border-brand-green/40' : 'text-text-muted opacity-50'}`}
          >
            {exportingCsv ? <div className="w-3 h-3 border border-text-muted border-t-transparent animate-spin rounded-full" /> : <Download className="w-3 h-3" />}
            Download CSV
          </button>
        </div>
      </SettingRow>

      <GroupHeading>Privacy</GroupHeading>
      <SettingRow label="How your data is stored" description="Your bank statements are parsed on our servers and immediately deleted. We store only the extracted transaction records, encrypted at rest in Supabase." border={true}>
         <ShieldCheck className="w-5 h-5 text-brand-green/40" />
      </SettingRow>
      <SettingRow label="AI Data Usage" description="Transaction descriptions are sent to Google Gemini to determine categories. Raw statement files are never sent to any AI service." border={true}>
         <Zap className="w-5 h-5 text-brand-green/40" />
      </SettingRow>
      <SettingRow label="Data Retention" description="Your data is retained as long as your account is active. Deleting your account removes all data immediately and permanently." border={false}>
         <TargetIcon className="w-5 h-5 text-brand-green/40" />
      </SettingRow>

      <GroupHeading>Sessions</GroupHeading>
      <SettingRow label="Current Session" description="Signed in as chrome on windows">
        <button onClick={() => window.location.href = '/login'} className="text-[11px] font-mono text-text-muted hover:text-white transition-colors">Sign Out</button>
      </SettingRow>
      <SettingRow label="Sign Out All Devices" description="Revokes all active sessions across all devices" border={false}>
        <button className="text-[11px] font-mono text-red-400 hover:text-red-300 transition-colors">Sign Out Everywhere</button>
      </SettingRow>
    </motion.div>
  )
}

const DangerSection = () => {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') return
    setLoading(true)
    try {
      const res = await fetch('/api/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText })
      })
      if (!res.ok) throw new Error('Deletion failed')
      router.push('/goodbye')
    } catch {
      toast('Deletion failed', undefined, 'error')
      setLoading(false)
    }
  }

  const handleClearTransactions = async () => {
    try {
      const res = await fetch('/api/settings/clear-transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: 'CLEAR' })
      })
      if (!res.ok) throw new Error('Clear failed')
      toast('All transactions cleared', undefined, 'success')
    } catch {
      toast('Failed to clear transactions', undefined, 'error')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl border-t-2 border-red-500/20 pt-8">
      <GroupHeading>Sensitive Actions</GroupHeading>
      
      <SettingRow label="Clear All Transactions" description="Permanently delete all imported transactions. Accounts and budgets remain.">
         <AlertDialog.Root>
           <AlertDialog.Trigger asChild>
             <button className="px-4 py-2 border border-red-500/30 text-red-400 text-[11px] font-mono rounded-md hover:bg-red-500/5 transition-colors">Clear Transactions</button>
           </AlertDialog.Trigger>
           <AlertDialog.Portal>
             <AlertDialog.Overlay className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" />
             <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[#141720] border border-red-500/20 p-6 rounded-2xl z-[101] shadow-2xl">
               <AlertDialog.Title className="font-display text-xl text-red-400 mb-2">Clear all transactions?</AlertDialog.Title>
               <div className="space-y-4">
                 <p className="font-mono text-xs text-text-muted leading-relaxed">
                   This will remove all transaction history permanently. Accounts and budgets will remain, but spending data will be gone.
                 </p>
                 <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                   <p className="text-[10px] font-mono text-red-300 uppercase mb-2 tracking-widest">Confirmation required</p>
                   <p className="text-[11px] font-mono text-text-muted mb-3">Type <span className="text-white font-bold">CLEAR</span> to proceed:</p>
                   <input 
                     className="w-full bg-[#0D0F14] border border-border px-3 py-2 text-white font-mono text-xs rounded-md outline-none focus:border-red-500/50"
                     onChange={e => setConfirmText(e.target.value)}
                   />
                 </div>
               </div>
               <div className="flex justify-end gap-3 mt-8">
                 <AlertDialog.Cancel className="px-4 py-2 text-xs font-mono text-text-muted hover:text-white">Cancel</AlertDialog.Cancel>
                 <AlertDialog.Action 
                   disabled={confirmText !== 'CLEAR'}
                   onClick={handleClearTransactions}
                   className="px-4 py-2 bg-red-500 text-white text-xs font-mono rounded-md hover:bg-red-600 disabled:opacity-50"
                 >
                   Yes, delete everything
                 </AlertDialog.Action>
               </div>
             </AlertDialog.Content>
           </AlertDialog.Portal>
         </AlertDialog.Root>
      </SettingRow>

      <div className="mt-12">
        <GroupHeading>Critical Actions</GroupHeading>
        {step === 1 ? (
          <div className="flex items-center justify-between py-6">
            <div className="flex flex-col gap-1 max-w-[60%]">
              <h4 className="font-display text-[13px] text-red-400 tracking-wide uppercase">Delete Account</h4>
              <p className="font-mono text-[11px] text-text-muted leading-relaxed">Permanently delete your SpendSense account and all associated data. Irreversible.</p>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-2 rounded-md text-[11px] font-mono hover:bg-red-500/20 transition-all"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-950/20 border border-red-500/30 rounded-2xl p-8 my-6"
          >
            <div className="flex items-start gap-4 mb-6">
               <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
               <div className="space-y-4">
                  <h4 className="font-display text-xl text-white">Are you absolutely sure?</h4>
                  <ul className="list-disc list-inside font-mono text-[11px] text-red-200/70 space-y-2">
                    <li>All transactions and account data will be wiped</li>
                    <li>Savings goals and reports will be deleted</li>
                    <li>Subscription will be cancelled immediately</li>
                    <li>This action cannot be undone or recovered</li>
                  </ul>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-red-500/20">
               <p className="font-mono text-[11px] text-white">Type <span className="font-bold">DELETE MY ACCOUNT</span> to confirm:</p>
               <input 
                 value={confirmText}
                 onChange={e => setConfirmText(e.target.value)}
                 className="w-full bg-[#0D0F14] border border-red-500/30 rounded-xl px-4 py-3 font-mono text-sm text-white outline-none focus:border-red-500 transition-all"
                 placeholder="DELETE MY ACCOUNT"
               />
               
               <div className="flex gap-4 pt-4">
                  <button 
                    disabled={confirmText !== 'DELETE MY ACCOUNT' || loading}
                    onClick={handleDeleteAccount}
                    className={`flex-1 py-4 rounded-xl font-display font-bold transition-all ${confirmText === 'DELETE MY ACCOUNT' ? 'bg-red-500 text-white shadow-2xl shadow-red-500/20 animate-pulse' : 'bg-red-500/10 text-red-500/50'}`}
                  >
                    {loading ? 'Deleting Account...' : 'Permanently Delete My Account'}
                  </button>
                  <button 
                    onClick={() => { setStep(1); setConfirmText(''); }}
                    className="px-6 py-4 border border-border rounded-xl font-mono text-xs text-text-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// --- Main Page ---

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileSection />
      case 'notifications': return <NotificationsSection />
      case 'categories': return <CategoriesSection />
      case 'accounts': return <AccountsSection />
      case 'subscription': return <SubscriptionSection />
      case 'data': return <DataSection />
      case 'danger': return <DangerSection />
      default: return null
    }
  }

  const activeTabData = TABS.find(t => t.id === activeTab)!

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Nav - Sticky Desktop */}
        <nav className="hidden lg:flex flex-col w-64 shrink-0 sticky top-10 self-start">
          <h1 className="font-display text-3xl text-white mb-10 tracking-tight italic">Settings</h1>
          <div className="space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-display transition-all ${
                    isActive 
                      ? `bg-[#1C2030] ${tab.color || 'text-brand-green'} shadow-lg shadow-black/20 border border-border/40` 
                      : `text-text-muted hover:bg-[#1C2030]/60 ${tab.id === 'danger' ? 'hover:text-red-400' : 'hover:text-white'}`
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? (tab.color || 'text-brand-green') : ''}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Mobile Horizontal Tabs */}
        <div className="lg:hidden flex overflow-x-auto gap-2 pb-6 scrollbar-hide -mx-4 px-4 sticky top-14 bg-[#0D0F14] z-30 py-4 border-b border-border/50">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-display text-[13px] border transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-green/10 text-brand-green border-brand-green/30 shadow-lg shadow-brand-green/5' 
                  : 'bg-surface2 border-border text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <main className="flex-1 min-w-0 pt-2 lg:pt-0 pb-20">
          <div className="mb-12">
            <motion.h2 
              key={activeTab + 'title'}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`font-display text-4xl mb-3 ${activeTab === 'danger' ? 'text-red-400' : 'text-white'}`}
            >
              {activeTabData.label}
            </motion.h2>
            <motion.p 
              key={activeTab + 'desc'}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="font-mono text-sm text-text-muted"
            >
              {activeTab === 'profile' && "Manage your personal information and financial preferences."}
              {activeTab === 'notifications' && "Control when and how SpendSense reaches out to you."}
              {activeTab === 'categories' && "Teach SpendSense how to categorise your specific merchants."}
              {activeTab === 'accounts' && "Manage all your linked bank accounts and import status."}
              {activeTab === 'subscription' && "Your current plan, billing details and usage metrics."}
              {activeTab === 'data' && "Your financial data belongs to you. Export or understand privacy."}
              {activeTab === 'danger' && "Irreversible actions. Read carefully before proceeding."}
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
