'use client'

import { useState } from 'react'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // Calculate password strength
  const getPasswordStrength = () => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1
    return score
  }
  
  const strength = getPasswordStrength()
  const strengthColors = ['bg-border', 'bg-red-500', 'bg-yellow-500', 'bg-brand-green']

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    if (!termsAccepted) {
      setError("You must accept the terms and conditions")
      return
    }

    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: `${window.location.origin}/callback`
        }
      })

      if (signUpError) throw signUpError

      router.push('/onboarding')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
  }

  return (
    <div className="w-full animate-fadeIn flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-[32px] font-display text-white mb-2">Create account</h1>
        <p className="text-text-muted font-mono text-sm">Join SpendSense to track smarter.</p>
      </div>

      <button 
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-md border border-border hover:border-brand-green/50 hover:bg-surface2 transition-all font-ui font-medium text-white"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border"></div>
        <span className="text-text-muted font-mono text-xs">or continue with email</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-mono text-text-muted">Full Name</label>
          <input 
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-surface2 border border-border focus:border-brand-green/60 focus:ring-1 focus:ring-brand-green/20 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none transition-all"
            placeholder="John Doe"
            required
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-mono text-text-muted">Email</label>
          <input 
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-surface2 border border-border focus:border-brand-green/60 focus:ring-1 focus:ring-brand-green/20 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none transition-all"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-mono text-text-muted">Password</label>
          <input 
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-surface2 border border-border focus:border-brand-green/60 focus:ring-1 focus:ring-brand-green/20 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none transition-all"
            placeholder="••••••••"
            required
            minLength={6}
          />
          {/* Password strength indicator */}
          <div className="flex gap-1 mt-1">
            <div className={`h-1 w-1/3 rounded-full transition-colors ${password.length > 0 ? strengthColors[strength >= 1 ? 1 : 0] : 'bg-border'}`} />
            <div className={`h-1 w-1/3 rounded-full transition-colors ${password.length > 0 ? strengthColors[strength >= 2 ? 2 : 0] : 'bg-border'}`} />
            <div className={`h-1 w-1/3 rounded-full transition-colors ${password.length > 0 ? strengthColors[strength >= 3 ? 3 : 0] : 'bg-border'}`} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-mono text-text-muted">Confirm Password</label>
          <input 
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full bg-surface2 border border-border focus:border-brand-green/60 focus:ring-1 focus:ring-brand-green/20 rounded-md py-2.5 px-3 text-white font-mono text-sm outline-none transition-all"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="flex items-start gap-3 mt-4 bg-white/[0.02] border border-white/5 rounded-lg p-3">
          <input 
            type="checkbox"
            id="terms"
            required
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 bg-[#1a1d24] border-white/10 rounded text-brand-green focus:ring-brand-green/30 cursor-pointer"
          />
          <label htmlFor="terms" className="text-[11px] font-mono text-[#6B7394] leading-relaxed cursor-pointer select-none">
            I have read and agree to the <Link href="/terms" className="text-brand-green hover:text-brand-green/80 transition-colors">Terms of Service</Link> and <Link href="/privacy" className="text-brand-green hover:text-brand-green/80 transition-colors">Privacy Policy</Link>, including the AI processing of my transaction data.
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm font-mono bg-red-400/10 p-3 rounded-md border border-red-400/20">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-brand-green hover:bg-brand-green/90 text-[#0D0F14] font-bold font-ui py-3 rounded-md transition-colors flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm font-mono text-text-muted mt-2">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
