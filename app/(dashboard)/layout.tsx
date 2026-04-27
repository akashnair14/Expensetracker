'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { 
  LayoutDashboard, ArrowLeftRight, BarChart3, Target, 
  Upload, FileText, RefreshCw, Star, Settings, Menu, X, LogOut, ChevronDown, Zap, Database
} from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import PlanBadge from '@/components/subscription/PlanBadge'

const navLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Upload Statement', href: '/upload', icon: Upload },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Documents', href: '/documents', icon: Database },
  { name: 'Subscriptions', href: '/subscriptions', icon: RefreshCw },
  { name: 'Goals', href: '/goals', icon: Star },
  { name: 'Pricing', href: '/pricing', icon: Zap, color: 'text-brand-green' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  
  const { data: subscription } = useSubscription()
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const Logo = () => (
    <div className="text-2xl font-display text-white flex items-baseline tracking-wide">
      Spend<span className="font-ui font-bold">Sense</span>
      <span className="w-1.5 h-1.5 rounded-full bg-brand-green ml-1 mb-0.5 shadow-[0_0_8px_rgba(0,229,160,0.8)]" />
    </div>
  )

  return (
    <div className="flex min-h-screen w-full bg-[#0D0F14] text-white font-mono">
      {/* Desktop Sidebar (≥1024px) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[240px] bg-[#0D0F14] border-r border-border z-50">
        <div className="p-6">
          <Logo />
        </div>
        
        {/* Account Selector */}
        <div className="px-4 mb-6">
          <button className="w-full flex items-center justify-between bg-surface2 border border-border rounded-md px-3 py-2 text-sm hover:border-brand-green/50 transition-colors">
            <span className="truncate">All Accounts</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive 
                        ? 'bg-brand-green/10 text-brand-green border-l-2 border-brand-green rounded-l-none' 
                        : `${(link as { color?: string }).color || 'text-text-muted'} hover:bg-[#1C2030] hover:text-white`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              )
          })}
        </nav>

        {/* Settings pinned above logout */}
        <div className="px-3 py-2 border-t border-border/50">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === '/settings'
                ? 'bg-brand-green/10 text-brand-green border-l-2 border-brand-green rounded-l-none'
                : 'text-text-muted hover:bg-[#1C2030] hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-ui font-bold shrink-0">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="truncate flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'User'}</p>
                <PlanBadge plan={subscription?.plan} />
              </div>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
              {subscription?.plan === 'free' && (
                <div className="mt-1">
                  <div className="h-1 w-full bg-surface2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-green transition-all duration-1000" 
                      style={{ width: `${(subscription.uploadsUsed / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted mt-0.5">{subscription.uploadsUsed}/5 free uploads used</p>
                </div>
              )}
            </div>
          <button onClick={handleLogout} className="text-text-muted hover:text-red-400 p-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Header (<1024px) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[#141720] border-b border-border z-40 flex items-center justify-between px-4">
        <Logo />
        <button onClick={() => setDrawerOpen(true)} className="p-2 text-white">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="w-[280px] bg-[#0D0F14] border-r border-border h-full flex flex-col relative z-10 animate-slideIn">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <Logo />
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {navLinks.map(link => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-brand-green/10 text-brand-green border-l-2 border-brand-green rounded-l-none' 
                        : 'text-text-muted hover:bg-[#1C2030] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[240px] pt-[60px] lg:pt-0 pb-[70px] lg:pb-0 min-h-screen bg-[#0D0F14] p-4 lg:p-8">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-[#141720] border-t border-border z-40 flex justify-around items-center px-2 pb-2">
        {[
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
          { name: 'Upload', href: '/upload', icon: Upload },
          { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = pathname === tab.href
          return (
            <Link key={tab.name} href={tab.href} className={`flex flex-col items-center gap-1 p-2 ${isActive ? 'text-brand-green' : 'text-text-muted'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{tab.name}</span>
            </Link>
          )
        })}
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-1 p-2 text-text-muted">
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </div>
  )
}
