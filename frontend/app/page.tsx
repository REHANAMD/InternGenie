'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import LoginForm from '@/components/LoginForm'
import SignupForm from '@/components/SignupForm'
import { useAuth, clearAllData } from '@/lib/auth'
import { LoadingSpinner } from '@/components/ui'
import AnimatedTyping from '@/components/AnimatedTyping'

export default function HomePage() {
  const router = useRouter()
  const { authenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Clear all data on app startup to force fresh login
    clearAllData()
    
    // Check if user is already authenticated
    if (authenticated) {
      router.push('/dashboard')
    } else {
      setIsCheckingAuth(false)
    }
  }, [authenticated, router])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex">
      {/* Left Side - Fixed Position */}
      <div className="w-1/2 h-screen fixed left-0 top-0 flex items-center justify-center p-8 pl-16 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <div className="text-2xl font-medium text-gray-600 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Welcome to,
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 relative inline-block" style={{ fontFamily: 'Georgia, serif' }}>
            <span className="text-blue-600">Intern</span>Genie
            <span className="text-xs absolute -top-1 -right-1 font-bold">TM</span>
          </h1>
          <h2 className="text-3xl font-semibold text-gray-700 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
            where Ambitions meet Intelligence
          </h2>
          <div className="text-gray-600 text-2xl leading-relaxed min-h-[4rem] flex items-center">
            <p className="text-left">
              <span className="font-medium text-gray-700">Finding the best Internship match for you, eliminating</span>{' '}
              <span className="font-semibold text-blue-600">distraction</span>{' '}
              <span className="font-medium text-gray-700">and navigating through</span>{' '}
              <span className="inline-block min-w-[200px]">
                <AnimatedTyping 
                  words={['chaos', 'hyperactivity', 'impulsivity']}
                  typingSpeed={150}
                  deletingSpeed={100}
                  pauseTime={2000}
                  className="font-bold text-red-600 italic"
                />
              </span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Scrollable */}
      <div className="w-1/2 ml-auto h-screen overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-8 pr-16">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-lg bg-white rounded-lg shadow-2xl p-8"
          >
            {/* Tab Navigation */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'login' ? (
                <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
              ) : (
                <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}