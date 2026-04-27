import React, { ReactNode } from 'react'

interface LegalCalloutProps {
  children: ReactNode
  label?: string
  variant?: 'english' | 'warning' | 'important'
}

export default function LegalCallout({
  children,
  label,
  variant = 'english'
}: LegalCalloutProps) {
  let borderColor = 'border-[#4D9FFF]/60'
  let defaultLabel = '💬 In plain English:'

  if (variant === 'warning') {
    borderColor = 'border-[#FFD166]/60'
    defaultLabel = '⚠️ Important:'
  } else if (variant === 'important') {
    borderColor = 'border-[#FF5C7A]/60'
    defaultLabel = '🔴 Note:'
  }

  return (
    <div className={`bg-[#1C2030] border-l-[3px] ${borderColor} rounded-r-lg pl-4 pr-4 py-3 my-8`}>
      <div className="font-mono text-[10px] uppercase text-[#6B7394] tracking-widest mb-1">
        {label || defaultLabel}
      </div>
      <div className="font-lora italic text-[14px] text-[#c8d0e8] leading-[1.8]">
        {children}
      </div>
    </div>
  )
}
