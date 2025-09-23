'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface AnimatedMatchScoreProps {
  percentage: number
  color: string
  size?: number
}

export default function AnimatedMatchScore({ 
  percentage, 
  color, 
  size = 100 
}: AnimatedMatchScoreProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0)
  const progress = useMotionValue(0)
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    // Animate the progress value
    const animation = animate(progress, percentage, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (value) => {
        setDisplayPercentage(Math.round(value))
      }
    })

    return animation.stop
  }, [percentage, progress])

  const strokeDashoffset = useTransform(
    progress,
    (value) => circumference - (value / 100) * circumference
  )

  return (
    <div className="relative flex items-center justify-center bg-gradient-to-br from-white/90 to-white/70 border border-white/30 rounded-2xl shadow-lg flex-shrink-0 backdrop-blur-sm"
         style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress circle on perimeter */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color === 'text-green-600' ? '#16a34a' : color === 'text-yellow-600' ? '#ca8a04' : color === 'text-red-600' ? '#dc2626' : '#3b82f6'}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset,
            rotate: 270,
            transformOrigin: 'center',
          }}
          strokeLinecap="round"
        />
      </svg>
      <motion.span 
        className={`text-xl font-bold ${color}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {displayPercentage}%
      </motion.span>
    </div>
  )
}
