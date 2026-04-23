'use client'

import React, { ReactNode, useEffect } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

interface GoalProgressRingProps {
  percent: number
  color: string
  size?: number
  strokeWidth?: number
  children?: ReactNode
}

export default function GoalProgressRing({
  percent,
  color,
  size = 120,
  strokeWidth = 8,
  children
}: GoalProgressRingProps) {
  const controls = useAnimationControls()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  useEffect(() => {
    controls.start({
      strokeDashoffset: (1 - percent / 100) * circumference,
      transition: { duration: 1.2, ease: "easeOut" }
    })
  }, [percent, circumference, controls])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        
        {/* Progress with glow */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={controls}
          strokeLinecap="round"
          fill="none"
          style={{
            filter: `drop-shadow(0 0 4px ${color}66)`
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
