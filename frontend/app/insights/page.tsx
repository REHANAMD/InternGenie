'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { insightsAPI, utilityAPI, userAPI } from '@/lib/api'
import { toast } from 'react-hot-toast'
import SkillGapAnalysis from '@/components/insights/SkillGapAnalysis'
import PerformanceMetrics from '@/components/insights/PerformanceMetrics'
import InfoTooltip from '@/components/insights/InfoTooltip'
import PrivacyAgreementModal from '@/components/PrivacyAgreementModal'
import { 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3, 
  Award, 
  BookOpen, 
  MapPin, 
  Building2,
  Star,
  ArrowUpRight,
  Activity,
  Brain,
  Zap,
  Calendar,
  DollarSign,
  X,
  Shield,
  EyeOff,
  Settings
} from 'lucide-react'

interface UserInsights {
  total_interactions: number
  action_breakdown: Record<string, number>
  preferred_skills: Record<string, number>
  preferred_companies: Record<string, number>
  preferred_locations: Record<string, number>
  application_success_rate: number
  learning_recommendations: string[]
}

interface MarketInsights {
  total_applications: number
  success_rate: number
  popular_companies: Record<string, number>
  popular_locations: Record<string, number>
  average_stipend: number
  skill_demand: Record<string, number>
}

interface TrendingSkill {
  skill: string
  count: number
}

export default function InsightsPage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [userInsights, setUserInsights] = useState<UserInsights | null>(null)
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null)
  const [trendingSkills, setTrendingSkills] = useState<TrendingSkill[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingData, setIsGeneratingData] = useState(false)
  const [isResettingData, setIsResettingData] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [dataConsent, setDataConsent] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }
    
    // Load privacy preferences from database
    const loadPrivacyPreferences = async () => {
      try {
        const result = await userAPI.getPrivacyPreferences()
        if (result.success) {
          setDataConsent(result.data_consent)
          if (result.data_consent !== null) {
            localStorage.setItem('dataConsent', result.data_consent.toString())
          } else {
            localStorage.removeItem('dataConsent')
          }
        } else {
          // If API call fails, fallback to localStorage
          const consent = localStorage.getItem('dataConsent')
          if (consent !== null) {
            setDataConsent(consent === 'true')
          } else {
            // Default to null if no preference is set - user needs to make a choice
            setDataConsent(null)
          }
        }
      } catch (error) {
        console.error('Error loading privacy preferences:', error)
        // Fallback to localStorage if API fails
        const consent = localStorage.getItem('dataConsent')
        if (consent !== null) {
          setDataConsent(consent === 'true')
        } else {
          // Default to null if no preference is set - user needs to make a choice
          setDataConsent(null)
        }
      }
    }
    
    // Add a small delay to ensure user is fully authenticated
    const timer = setTimeout(() => {
      loadPrivacyPreferences()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [authenticated, router])

  // Reload privacy preferences every time the component mounts (user navigates to this page)
  useEffect(() => {
    if (authenticated) {
      const loadPrivacyPreferences = async () => {
        try {
          const result = await userAPI.getPrivacyPreferences()
          if (result.success) {
            setDataConsent(result.data_consent)
            if (result.data_consent !== null) {
              localStorage.setItem('dataConsent', result.data_consent.toString())
            } else {
              localStorage.removeItem('dataConsent')
            }
          }
        } catch (error) {
          console.error('Error reloading privacy preferences:', error)
        }
      }
      loadPrivacyPreferences()
    }
  }, [authenticated]) // This will run every time the component mounts

  // Also reload privacy preferences when the page becomes visible (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (authenticated) {
        const loadPrivacyPreferences = async () => {
        try {
          const result = await userAPI.getPrivacyPreferences()
          if (result.success) {
            setDataConsent(result.data_consent)
            if (result.data_consent !== null) {
              localStorage.setItem('dataConsent', result.data_consent.toString())
            } else {
              localStorage.removeItem('dataConsent')
            }
          }
          } catch (error) {
            console.error('Error reloading privacy preferences on focus:', error)
          }
        }
        loadPrivacyPreferences()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [authenticated])

  // Poll for privacy preference changes every 3 seconds as a fallback
  useEffect(() => {
    if (!authenticated) return

    const pollPrivacyPreferences = async () => {
      try {
        const result = await userAPI.getPrivacyPreferences()
        if (result.success) {
          const currentConsent = result.data_consent
          // Only update if the value has changed
          if (currentConsent !== dataConsent) {
            setDataConsent(currentConsent)
            if (currentConsent !== null) {
              localStorage.setItem('dataConsent', currentConsent.toString())
            } else {
              localStorage.removeItem('dataConsent')
            }
          }
        }
      } catch (error) {
        console.error('Error polling privacy preferences:', error)
      }
    }

    // Poll every 3 seconds
    const interval = setInterval(pollPrivacyPreferences, 3000)
    return () => clearInterval(interval)
  }, [authenticated, dataConsent])

  const handlePrivacyPreferences = async (consent: boolean) => {
    try {
      const result = await userAPI.updatePrivacyPreferences(consent)
      if (result.success) {
        setDataConsent(consent)
        if (consent !== null) {
          localStorage.setItem('dataConsent', consent.toString())
        } else {
          localStorage.removeItem('dataConsent')
        }
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('privacyPreferencesUpdated', { 
          detail: { dataConsent: consent } 
        }))
        
        // If user now consents, fetch insights
        if (consent) {
          fetchInsights()
        }
      } else {
        console.error('Failed to update privacy preferences:', result)
        toast.error('Failed to update privacy preferences')
        // Still update local state even if API fails
        setDataConsent(consent)
        if (consent !== null) {
          localStorage.setItem('dataConsent', consent.toString())
        } else {
          localStorage.removeItem('dataConsent')
        }
      }
    } catch (error) {
      console.error('Error updating privacy preferences:', error)
      toast.error('Failed to update privacy preferences')
      // Still update local state even if API fails
      setDataConsent(consent)
      if (consent !== null) {
        localStorage.setItem('dataConsent', consent.toString())
      } else {
        localStorage.removeItem('dataConsent')
      }
    }
  }

  const fetchInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all insights in parallel
      const [userData, marketData, trendingData] = await Promise.all([
        insightsAPI.getUserInsights(),
        insightsAPI.getMarketInsights(),
        insightsAPI.getTrendingSkills(10)
      ])

      setUserInsights(userData)
      setMarketInsights(marketData)
      setTrendingSkills(trendingData.trending_skills || [])
    } catch (err) {
      console.error('Error fetching insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated && dataConsent === true) {
      fetchInsights()
    } else if (authenticated && (dataConsent === false || dataConsent === null)) {
      setIsLoading(false)
    }
  }, [authenticated, dataConsent])

  const generateSampleData = async () => {
    try {
      setIsGeneratingData(true)
      const result = await utilityAPI.generateSampleData()
      
      if (result.success) {
        // Refresh insights after generating data
        const [userData, marketData, trendingData] = await Promise.all([
          insightsAPI.getUserInsights(),
          insightsAPI.getMarketInsights(),
          insightsAPI.getTrendingSkills(10)
        ])

        setUserInsights(userData)
        setMarketInsights(marketData)
        setTrendingSkills(trendingData.trending_skills || [])
        
        alert(`Sample data generated successfully!\n📊 ${result.data.behavior_records} behavior records\n📝 ${result.data.applications} applications`)
      } else {
        alert('Failed to generate sample data')
      }
    } catch (error) {
      console.error('Error generating sample data:', error)
      alert('Failed to generate sample data')
    } finally {
      setIsGeneratingData(false)
    }
  }

  const resetInsightsData = async () => {
    if (!confirm('Are you sure you want to reset all insights data? This will clear all user interactions, applications, and saved internships. This action cannot be undone.')) {
      return
    }

    try {
      setIsResettingData(true)
      const result = await utilityAPI.resetInsightsData()
      
      if (result.success) {
        // Refresh insights after resetting data
        const [userData, marketData, trendingData] = await Promise.all([
          insightsAPI.getUserInsights(),
          insightsAPI.getMarketInsights(),
          insightsAPI.getTrendingSkills(10)
        ])

        setUserInsights(userData)
        setMarketInsights(marketData)
        setTrendingSkills(trendingData.trending_skills || [])
        
        // Clear viewed internships from localStorage
        localStorage.removeItem('viewedInternships')
        
        alert(`All insights data reset successfully!\n🗑️ ${result.data.behaviors_deleted} behavior records deleted\n🗑️ ${result.data.applications_deleted} applications deleted\n🗑️ ${result.data.recommendations_deleted} recommendations cleared\n🗑️ ${result.data.saved_deleted} saved internships cleared`)
      } else {
        alert('Failed to reset insights data')
      }
    } catch (error) {
      console.error('Error resetting insights data:', error)
      alert('Failed to reset insights data')
    } finally {
      setIsResettingData(false)
    }
  }

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }



  // Show privacy notice for non-consenting users or users who haven't made a choice
  if (dataConsent === false || dataConsent === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <EyeOff className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {dataConsent === null ? 'Privacy Settings Required' : 'Insights Not Available'}
              </h1>
              
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                {dataConsent === null 
                  ? 'Please configure your privacy preferences to access personalized insights and recommendations.'
                  : 'We respect your privacy choice and are not collecting any personal data for analytics. As a result, personalized insights are not available at this time.'
                }
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div className="flex items-start">
                  <Shield className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
                  <div className="text-left">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Your Privacy is Protected
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• We don't record your interactions or behavior</li>
                      <li>• No personal data is used for recommendations</li>
                      <li>• Your browsing patterns are not tracked</li>
                      <li>• All data collection has been disabled</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  If you'd like to see personalized insights and recommendations, you can change your privacy preferences:
                </p>
                
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Change Privacy Settings
                </button>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Privacy Agreement Modal */}
        <PrivacyAgreementModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          onSavePreferences={handlePrivacyPreferences}
          initialChoice={dataConsent}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Insights</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Your Insights Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Discover patterns in your behavior and market trends to optimize your internship search
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={generateSampleData}
                disabled={isGeneratingData || isResettingData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200 flex items-center space-x-2"
              >
                {isGeneratingData ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Generate Sample Data</span>
                  </>
                )}
              </button>
              
              <button
                onClick={resetInsightsData}
                disabled={isGeneratingData || isResettingData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors duration-200 flex items-center space-x-2"
              >
                {isResettingData ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    <span>Reset Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-blue-600" />
                Personal Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Activity Overview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                      Activity Overview
                      <InfoTooltip 
                        content="Shows your total interactions with the platform and your application success rate. Interactions include viewing, saving, and applying for internships."
                        className="ml-2"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Interactions</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {userInsights?.total_interactions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="text-lg font-semibold text-green-600">
                          {formatPercentage(userInsights?.application_success_rate || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Target className="h-5 w-5 mr-2 text-purple-600" />
                      Action Breakdown
                      <InfoTooltip 
                        content="Shows the distribution of your actions: views (when you see a recommendation), saves (when you save an internship), and applies (when you submit an application)."
                        className="ml-2"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userInsights?.action_breakdown ? Object.entries(userInsights.action_breakdown).map(([action, count]) => (
                        <div key={action} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 capitalize">{action}s</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500">No activity data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Skills Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Brain className="h-6 w-6 mr-2 text-indigo-600" />
                    Your Skill Preferences
                    <InfoTooltip 
                      content="Shows skills from internships you've interacted with, ranked by frequency. This indicates which skills you're most interested in based on your behavior."
                      className="ml-2"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userInsights?.preferred_skills && Object.keys(userInsights.preferred_skills).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(userInsights.preferred_skills)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 9)
                          .map(([skill, count]) => (
                            <div key={skill} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                              <span className="text-xs text-gray-500">{count}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No skill preferences data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <PerformanceMetrics
                totalInteractions={userInsights?.total_interactions || 0}
                successRate={userInsights?.application_success_rate || 0}
                actionBreakdown={userInsights?.action_breakdown || {}}
                preferredSkills={userInsights?.preferred_skills || {}}
                preferredCompanies={userInsights?.preferred_companies || {}}
                preferredLocations={userInsights?.preferred_locations || {}}
              />
            </motion.div>

            {/* Skill Gap Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <SkillGapAnalysis
                userSkills={user?.skills ? user.skills.split(',').map(s => s.trim()) : []}
                trendingSkills={trendingSkills}
                preferredSkills={userInsights?.preferred_skills || {}}
              />
            </motion.div>
          </div>

          {/* Market Insights & Trending */}
          <div className="space-y-6">
            {/* Market Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
                Market Insights
              </h2>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Platform Overview
                    <InfoTooltip 
                      content="Shows aggregate statistics across all users on the platform: total applications, overall success rate, and average stipend offered."
                      className="ml-2"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Applications</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatNumber(marketInsights?.total_applications || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="text-lg font-semibold text-green-600">
                        {formatPercentage(marketInsights?.success_rate || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Stipend</span>
                      <span className="text-lg font-semibold text-blue-600">
                        ₹{formatNumber(marketInsights?.average_stipend || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Trending Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                    Trending Skills
                    <InfoTooltip 
                      content="Shows the most in-demand skills based on recent user activity (last 7 days). Skills are ranked by how frequently they appear in internships that users interact with."
                      className="ml-2"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trendingSkills.length > 0 ? trendingSkills.slice(0, 8).map((skill, index) => (
                      <div key={skill.skill} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 capitalize">{skill.skill}</span>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-2">{skill.count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${(skill.count / trendingSkills[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500">No trending data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Popular Companies */}
            {marketInsights?.popular_companies && Object.keys(marketInsights.popular_companies).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Building2 className="h-5 w-5 mr-2 text-purple-600" />
                      Popular Companies
                      <InfoTooltip 
                        content="Shows companies with the most applications across all users. This indicates which companies are most sought after on the platform."
                        className="ml-2"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketInsights.popular_companies)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([company, count]) => (
                          <div key={company} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 capitalize">{company}</span>
                            <span className="text-xs text-gray-500">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Popular Locations */}
            {marketInsights?.popular_locations && Object.keys(marketInsights.popular_locations).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <MapPin className="h-5 w-5 mr-2 text-red-600" />
                      Popular Locations
                      <InfoTooltip 
                        content="Shows locations with the most applications across all users. This indicates which cities/regions are most popular for internships."
                        className="ml-2"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketInsights.popular_locations)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([location, count]) => (
                          <div key={location} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 capitalize">{location}</span>
                            <span className="text-xs text-gray-500">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Privacy Agreement Modal */}
      <PrivacyAgreementModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onSavePreferences={handlePrivacyPreferences}
        initialChoice={dataConsent}
      />
    </div>
  )
}
