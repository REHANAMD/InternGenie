'use client'

import { motion } from 'framer-motion'

interface HeartIconProps {
  isFilled: boolean
  className?: string
  onClick?: () => void
}

export default function HeartIcon({ isFilled, className = "", onClick }: HeartIconProps) {
  return (
    <motion.div
      className={`cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d={isFilled 
            ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            : "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          }
          fill={isFilled ? "#ef4444" : "none"}
          stroke={isFilled ? "#ef4444" : "#6b7280"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            scale: isFilled ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut"
          }}
        />
        
        {/* Sparkle effect when filled */}
        {isFilled && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 0.6,
              delay: 0.1
            }}
          >
            <motion.circle
              cx="8"
              cy="8"
              r="1"
              fill="#fbbf24"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.4,
                delay: 0.2
              }}
            />
            <motion.circle
              cx="16"
              cy="6"
              r="0.8"
              fill="#fbbf24"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.4,
                delay: 0.3
              }}
            />
            <motion.circle
              cx="18"
              cy="12"
              r="0.6"
              fill="#fbbf24"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.4,
                delay: 0.4
              }}
            />
          </motion.g>
        )}
      </svg>
    </motion.div>
  )
}
