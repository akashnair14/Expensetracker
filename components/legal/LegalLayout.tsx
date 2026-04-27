'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { Calendar, Scale, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { User } from '@supabase/supabase-js'

interface LegalLayoutProps {
  title: string
  subtitle: string
  lastUpdated: string
  effectiveDate: string
  children: ReactNode
}

interface TocItem {
  id: string
  text: string
}

export default function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  children
}: LegalLayoutProps) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Reading progress bar logic
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // User session check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  // TOC generation and Intersection Observer
  useEffect(() => {
    if (contentRef.current) {
      const h2Elements = contentRef.current.querySelectorAll('h2')
      const items: TocItem[] = Array.from(h2Elements).map(h2 => ({
        id: h2.id,
        text: h2.innerText
      }))
      setTocItems(items)

      const observerOptions = {
        rootMargin: '-100px 0px -70% 0px',
        threshold: 0
      }

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      }, observerOptions)

      h2Elements.forEach(h2 => observer.observe(h2))
      return () => observer.disconnect()
    }
  }, [children])

  return (
    <div className="min-h-screen bg-[#0D0F14] text-[#ffffff] selection:bg-[#00E5A0]/30">
      {/* 1. READING PROGRESS BAR */}
      <div 
        className="fixed top-0 left-0 h-[2px] bg-[#00E5A0] z-50 transition-all duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* 2. MINIMAL HEADER BAR */}
      <header className="h-[56px] bg-[#0D0F14]/80 backdrop-blur-md border-b border-[#252A3A] sticky top-0 z-40 px-6">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="font-display text-2xl">Spend</span>
            <span className="w-1.5 h-1.5 bg-[#00E5A0] rounded-full mx-0.5 mt-2" />
            <span className="font-ui text-lg tracking-tight">Sense</span>
          </Link>

          <div className="hidden xl:block font-mono text-[11px] text-[#6B7394] uppercase tracking-widest">
            {title}
          </div>

          <div>
            {user ? (
              <Link href="/dashboard" className="flex items-center gap-2 text-xs font-mono text-[#6B7394] hover:text-[#00E5A0] transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to Dashboard
              </Link>
            ) : (
              <Link href="/signup" className="flex items-center gap-2 text-xs font-mono text-[#00E5A0] hover:underline">
                Sign up free
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="pt-16 pb-12 border-b border-[#252A3A]">
        <div className="max-w-[700px] mx-auto px-6">
          <nav className="font-mono text-[11px] text-[#6B7394] mb-4">
            SpendSense / Legal / <span className="text-[#ffffff]">{title}</span>
          </nav>
          <h1 className="font-display text-[52px] leading-[1.1] text-white">
            {title}
          </h1>
          <p className="font-lora italic text-[16px] text-[#6B7394] mt-3 max-w-[480px] leading-relaxed">
            {subtitle}
          </p>
          
          <div className="flex flex-wrap gap-3 mt-8">
            <div className="flex items-center gap-2 bg-[#141720] border border-[#252A3A] rounded px-3 py-1.5 text-[11px] font-mono text-[#6B7394]">
              <Calendar className="w-3.5 h-3.5" />
              Effective: {effectiveDate}
            </div>
            <div className="flex items-center gap-2 bg-[#141720] border border-[#252A3A] rounded px-3 py-1.5 text-[11px] font-mono text-[#6B7394]">
              <Calendar className="w-3.5 h-3.5" />
              Last updated: {lastUpdated}
            </div>
            <div className="flex items-center gap-2 bg-[#141720] border border-[#252A3A] rounded px-3 py-1.5 text-[11px] font-mono text-[#6B7394]">
              <Scale className="w-3.5 h-3.5" />
              Governed by Indian Law
            </div>
          </div>
        </div>
      </section>

      {/* 4. TWO-COLUMN BODY */}
      <div className="max-w-[1200px] mx-auto flex flex-col xl:flex-row gap-12 mt-12 px-6">
        {/* LEFT: TOC */}
        <aside className="hidden xl:block w-[220px] shrink-0 sticky top-[100px] self-start">
          <h4 className="font-mono text-[10px] uppercase text-[#6B7394] tracking-widest mb-4">
            Contents
          </h4>
          <nav className="flex flex-col gap-1">
            {tocItems.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-[12px] font-mono leading-[2.2] transition-all border-l py-0.5 ${
                  activeId === item.id 
                    ? 'text-[#00E5A0] border-[#00E5A0] pl-3' 
                    : 'text-[#6B7394] border-transparent hover:text-white hover:border-[#252A3A] pl-3'
                }`}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </aside>

        {/* RIGHT: CONTENT */}
        <main 
          ref={contentRef} 
          className="flex-1 max-w-[700px] pb-24 prose prose-invert prose-headings:font-display prose-p:font-lora"
        >
          {children}
        </main>
      </div>

      {/* 5. FOOTER */}
      <footer className="border-t border-[#252A3A] py-12 px-8 bg-[#0D0F14]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="font-mono text-[11px] text-[#6B7394]">
            &copy; 2026 SpendSense. All rights reserved.
          </div>
          
          <nav className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/terms" className="text-[#6B7394] hover:text-white transition-colors">Terms of Service</Link>
            <span className="text-[#252A3A]">&middot;</span>
            <Link href="/privacy" className="text-[#6B7394] hover:text-white transition-colors">Privacy Policy</Link>
            <span className="text-[#252A3A]">&middot;</span>
            <a href="mailto:support@spendsense.in" className="text-[#6B7394] hover:text-white transition-colors">Contact</a>
          </nav>

          <div className="font-mono text-[11px] text-[#6B7394]">
            Built with ❤️ in Ahmedabad, India
          </div>
        </div>
      </footer>

      {/* Global Typography Styles for Legal Content */}
      <style jsx global>{`
        .prose h2 {
          font-family: 'Instrument Serif', serif;
          font-size: 28px;
          border-left: 3px solid rgba(0, 229, 160, 0.5);
          padding-left: 1rem;
          margin-top: 3rem;
          margin-bottom: 1.5rem;
          color: white;
          scroll-margin-top: 100px;
        }
        .prose h3 {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #6B7394;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .prose p {
          font-family: 'Lora', serif;
          font-size: 15px;
          line-height: 1.95;
          color: #c8d0e8;
          margin-bottom: 1.5rem;
        }
        .prose .term {
          background-color: rgba(0, 229, 160, 0.08);
          color: #00E5A0;
          border-radius: 4px;
          padding: 0 4px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
        }
        .prose ul {
          list-style: none;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .prose ul li {
          position: relative;
          font-family: 'Lora', serif;
          font-size: 15px;
          line-height: 1.95;
          color: #c8d0e8;
          margin-bottom: 0.75rem;
        }
        .prose ul li::before {
          content: "";
          position: absolute;
          left: -1.25rem;
          top: 0.7rem;
          width: 3px;
          height: 3px;
          background-color: #00E5A0;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          margin: 2rem 0;
          border: 1px solid #252A3A;
        }
        .prose th {
          background-color: #141720;
          color: #6B7394;
          font-weight: 500;
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #252A3A;
        }
        .prose td {
          padding: 12px;
          border-bottom: 1px solid #252A3A;
          color: #c8d0e8;
        }
        .prose tr:nth-child(even) {
          background-color: #1C2030;
        }
        .prose tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </div>
  )
}
