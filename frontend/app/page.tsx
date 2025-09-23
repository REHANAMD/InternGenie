'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import LoginForm from '@/components/LoginForm'
import SignupForm from '@/components/SignupForm'
import { useAuth, clearAllData } from '@/lib/auth'
import { LoadingSpinner } from '@/components/ui'

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 InternGenie
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Recommendation Engine
          </h2>
          <p className="text-gray-600">
            Find your perfect Product Management internship with AI-powered recommendations!
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'login' ? (
              <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
            ) : (
              <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 grid grid-cols-2 gap-4 text-center"
        >
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-gray-800">AI-Powered</h3>
            <p className="text-sm text-gray-600">Smart matching algorithm</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-semibold text-gray-800">Resume Parser</h3>
            <p className="text-sm text-gray-600">Auto-fill your profile</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <div className="text-2xl mb-2">💼</div>
            <h3 className="font-semibold text-gray-800">PM Focus</h3>
            <p className="text-sm text-gray-600">Product Management roles</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-800">Real-time</h3>
            <p className="text-sm text-gray-600">Live recommendations</p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8 text-gray-500 text-sm"
        >
          <p>© 2025 Tech-o-Vation Solutions, pvt. ltd., All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  )
}