'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { Shield, X, Database, Brain, Lock, Users } from 'lucide-react'

interface TermsOfUsageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TermsOfUsageModal({ 
  isOpen, 
  onClose 
}: TermsOfUsageModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ overflow: 'hidden' }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">
                Terms of Usage & Data Sharing
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Introduction */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Brain className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    How We Use Your Data to Help You
                  </h3>
                  <p className="text-sm text-blue-800">
                    InternGenie uses advanced machine learning to provide personalized internship recommendations. 
                    Your data helps us understand your preferences and match you with the best opportunities.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Collection Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="h-5 w-5 text-gray-600 mr-2" />
                Data We Collect
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Profile Information</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Name, email, and contact details</li>
                    <li>• Education background and skills</li>
                    <li>• Work experience and location</li>
                    <li>• LinkedIn and GitHub profiles</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Usage Analytics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Internship views and applications</li>
                    <li>• Search queries and filters used</li>
                    <li>• Time spent on different pages</li>
                    <li>• Recommendation interactions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Why We Collect Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Brain className="h-5 w-5 text-gray-600 mr-2" />
                Why We Collect This Data
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Personalized Recommendations</p>
                    <p className="text-sm text-gray-600">Match you with internships that align with your skills, interests, and career goals</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Improved User Experience</p>
                    <p className="text-sm text-gray-600">Customize the platform interface and features based on your usage patterns</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Platform Analytics</p>
                    <p className="text-sm text-gray-600">Understand how users interact with our platform to make continuous improvements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Guarantees */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">
                    Your Privacy is Protected
                  </h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• We never sell your data to third parties</li>
                    <li>• All data is encrypted and securely stored</li>
                    <li>• You can change your preferences anytime</li>
                    <li>• We comply with all data protection regulations</li>
                    <li>• Your personal information is never shared without consent</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Sharing Options */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Data Sharing Options
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900">Accept Data Sharing</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow InternGenie to use your data for personalized recommendations and platform improvements. 
                      This enables the best possible experience with accurate internship matches.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-600 mr-2" />
                      <span className="font-medium text-gray-900">Reject Data Sharing</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Use InternGenie with limited functionality. No personal data will be used for recommendations, 
                      and you'll see generic content instead of personalized insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={onClose}
                className="px-8 bg-blue-600 hover:bg-blue-700"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
