'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, Star } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  duration?: number
}

interface NotificationSystemProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

export default function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    size: number
    color: string
  }>>([])

  const createParticle = (x: number, y: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
    particlesRef.current.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 60,
      maxLife: 60,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life--
        
        const alpha = particle.life / particle.maxLife
        
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        
        if (particle.life <= 0) {
          particlesRef.current.splice(index, 1)
        }
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Star className="h-5 w-5 text-purple-500" />
    }
  }

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200/50'
      case 'error':
        return 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-200/50'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-200/50'
      case 'info':
        return 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-200/50'
      default:
        return 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200/50'
    }
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3">
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
      />
      
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ x: 400, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.8 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200 
            }}
            className={`glass-panel rounded-2xl p-4 max-w-sm ${getBackgroundColor(notification.type)}`}
            onMouseEnter={() => {
              // Create particles on hover
              const canvas = canvasRef.current
              if (canvas) {
                const rect = canvas.getBoundingClientRect()
                for (let i = 0; i < 5; i++) {
                  createParticle(
                    Math.random() * rect.width,
                    Math.random() * rect.height
                  )
                }
              }
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
              </div>
              
              <button
                onClick={() => onRemove(notification.id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, newNotification])
    
    // Auto remove after duration
    const duration = notification.duration || 5000
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  }
}
