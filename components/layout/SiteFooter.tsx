import React from 'react'
import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#252A3A] py-6 px-8 bg-[#0D0F14]">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-mono text-[11px] text-[#6B7394]">
          &copy; 2026 SpendSense. All rights reserved.
        </div>
        
        <nav className="flex items-center gap-4 font-mono text-[11px]">
          <Link href="/terms" className="text-[#6B7394] hover:text-[#ffffff] no-underline transition-colors">
            Terms of Service
          </Link>
          <span className="text-[#252A3A] select-none">&middot;</span>
          <Link href="/privacy" className="text-[#6B7394] hover:text-[#ffffff] no-underline transition-colors">
            Privacy Policy
          </Link>
          <span className="text-[#252A3A] select-none">&middot;</span>
          <a href="mailto:support@spendsense.in" className="text-[#6B7394] hover:text-[#ffffff] no-underline transition-colors">
            support@spendsense.in
          </a>
        </nav>

        <div className="font-mono text-[11px] text-[#6B7394]">
          Built with ❤️ in Ahmedabad, India
        </div>
      </div>
    </footer>
  )
}
