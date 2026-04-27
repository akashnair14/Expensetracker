import React from 'react'

export default function LegalLayoutGroup({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0D0F14] text-[#ffffff]">
      {children}
    </div>
  )
}
