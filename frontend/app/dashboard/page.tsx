'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import RecommendationCarousel from '@/components/RecommendationCarousel'
import DoubtsChatbot from '@/components/DoubtsChatbot'
import NotificationSystem, { useNotifications } from '@/components/NotificationSystem'
import { Button, LoadingSpinner, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { recommendationAPI, utilityAPI, Recommendation } from '@/lib/api'
import { generateGreeting, formatSkillsList } from '@/lib/utils'
import { 
  Search, 
  RefreshCw, 
  TrendingUp, 
  MapPin, 
  Award, 
  Clock,
  Users,
  Briefcase
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const { notifications, addNotification, removeNotification } = useNotifications()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [appliedInternships, setAppliedInternships] = useState<Set<number>>(new Set())
  const [loadingText, setLoadingText] = useState('')
  const [showCards, setShowCards] = useState(false)
  const [visibleCards, setVisibleCards] = useState<number>(0)

  // Loading text animation
  const animateLoadingText = () => {
    const messages = [
      'Calculating scores...',
      'Finding best matches...',
      'Ranking internships...',
      'Finalizing recommendations...'
    ]
    
    // Set initial message immediately
    setLoadingText(messages[0])
    
    let messageIndex = 1
    const interval = setInterval(() => {
      if (messageIndex < messages.length) {
        setLoadingText(messages[messageIndex])
        messageIndex++
      } else {
        clearInterval(interval)
      }
    }, 600)
    
    return interval
  }

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }

    // Initialize data seeding only once
    const initializeApp = async () => {
      const hasSeeded = sessionStorage.getItem('hasSeededData')
      if (!hasSeeded) {
        try {
          await utilityAPI.seedData()
          sessionStorage.setItem('hasSeededData', 'true')
        } catch (error) {
          console.error('Failed to seed data:', error)
        }
      }
    }

    initializeApp()

    // Show welcome notification only once
    const hasShownWelcome = sessionStorage.getItem('hasShownWelcome')
    if (!hasShownWelcome) {
      setTimeout(() => {
        addNotification({
          type: 'success',
          title: 'Welcome to InternGenie!',
          message: 'Discover your perfect internship matches with AI-powered recommendations.',
          duration: 4000
        })
        sessionStorage.setItem('hasShownWelcome', 'true')
      }, 1000)
    }
  }, [authenticated, router, addNotification])

  // Initialize state from localStorage on mount
  useEffect(() => {
    if (authenticated && user) {
      // Check if this is a fresh login by checking session storage
      const isFreshLogin = sessionStorage.getItem('freshLogin') === 'true'
      
      if (isFreshLogin) {
        // This is a fresh login - reset to show initial state
        setHasLoadedOnce(false)
        setRecommendations([])
        setShowCards(false)
        setVisibleCards(0)
        sessionStorage.removeItem('freshLogin')
        // Clear any stored state
        localStorage.removeItem('dashboardState')
      } else {
        // Try to restore state from localStorage
        const storedState = localStorage.getItem('dashboardState')
        if (storedState) {
          try {
            const parsed = JSON.parse(storedState)
            setHasLoadedOnce(parsed.hasLoadedOnce || false)
            setRecommendations(parsed.recommendations || [])
            setShowCards(parsed.showCards || false)
          } catch (error) {
            console.error('Error parsing stored state:', error)
          }
        }
      }
    }
  }, [authenticated, user?.id]) // Only run when auth state changes

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (authenticated && user && (hasLoadedOnce || recommendations.length > 0)) {
      const stateToSave = {
        hasLoadedOnce,
        recommendations,
        showCards
      }
      localStorage.setItem('dashboardState', JSON.stringify(stateToSave))
    }
  }, [hasLoadedOnce, recommendations, showCards, authenticated, user])

  // Gradually reveal cards one by one
  useEffect(() => {
    if (showCards && recommendations.length > 0) {
      setVisibleCards(0) // Reset visible cards
      
      const revealInterval = setInterval(() => {
        setVisibleCards(prev => {
          if (prev < recommendations.length) {
            return prev + 1
          } else {
            clearInterval(revealInterval)
            return prev
          }
        })
      }, 400) // Show one card every 400ms
      
      return () => clearInterval(revealInterval)
    }
  }, [showCards, recommendations.length])

  // Check if coming from profile update
  useEffect(() => {
    const profileUpdated = sessionStorage.getItem('profileUpdated')
    if (profileUpdated === 'true') {
      sessionStorage.removeItem('profileUpdated')
      addNotification({
        type: 'info',
        title: 'Profile Updated',
        message: 'Your profile was recently updated, get fresh recommendations!',
        duration: 5000
      })
    }
  }, [addNotification])

  // Listen for application events from other pages
  useEffect(() => {
  const handleApplicationAccepted = (event: Event) => {
    // Handle accepted application
    const customEvent = event as CustomEvent
    const applicationId = customEvent.detail?.applicationId
    
    // Refresh recommendations when an application is accepted
    fetchRecommendations(false) // Force refresh without cache
    toast.success('Recommendations refreshed after accepting application!')
  }

    const handleApplicationWithdrawnEvent = (event: Event) => {
      // Handle withdrawn application
      const customEvent = event as CustomEvent
      const internshipId = customEvent.detail?.internshipId
      if (internshipId) {
        handleApplicationWithdrawn(internshipId)
        toast.success('Recommendations refreshed after withdrawing application!')
      }
    }

    // Handle page focus (when user returns from applications page)
    const handlePageFocus = () => {
      // Check if we need to refresh recommendations
      const lastRefresh = sessionStorage.getItem('lastRecommendationRefresh')
      const now = Date.now()
      
      // If it's been more than 30 seconds since last refresh, refresh recommendations
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 30000) {
        fetchRecommendations(false)
        sessionStorage.setItem('lastRecommendationRefresh', now.toString())
      }
    }

    window.addEventListener('applicationAccepted', handleApplicationAccepted)
    window.addEventListener('applicationWithdrawn', handleApplicationWithdrawnEvent)
    window.addEventListener('focus', handlePageFocus)

    return () => {
      window.removeEventListener('applicationAccepted', handleApplicationAccepted)
      window.removeEventListener('applicationWithdrawn', handleApplicationWithdrawnEvent)
      window.removeEventListener('focus', handlePageFocus)
    }
  }, [])

  const fetchRecommendations = async (useCache = true) => {
    if (!user || !authenticated) {
      console.log('User not ready for recommendations:', { user, authenticated })
      return
    }

    setIsLoading(true)
    setShowCards(false)
    
    // Start loading text animation
    const textInterval = animateLoadingText()
    
    try {
      // Always request 5 recommendations
      const result = await recommendationAPI.get(5, useCache)
      
      if (result.success) {
        setRecommendations(result.recommendations)
        setHasLoadedOnce(true)
        
        // Clear loading text animation
        clearInterval(textInterval)
        
        // Wait for minimum loading time (2-3 seconds)
        setTimeout(() => {
          setShowCards(true)
          setVisibleCards(0) // Reset visible cards for new animation
          setIsLoading(false)
          
          // If we got fewer than 5 recommendations, show a message
          if (result.recommendations.length < 5) {
            toast.success(`Showing ${result.recommendations.length} available recommendations`)
          } else if (!useCache) {
            toast.success(`Found ${result.recommendations.length} fresh recommendations!`)
          }
        }, 2500) // 2.5 seconds minimum loading time
        
      } else {
        clearInterval(textInterval)
        setIsLoading(false)
        toast.error('Failed to fetch recommendations')
      }
    } catch (error) {
      clearInterval(textInterval)
      console.error('Error fetching recommendations:', error)
      setIsLoading(false)
      toast.error('Failed to fetch recommendations')
    }
  }

  const handleSaveToggle = (internshipId: number, isSaved: boolean) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.internship_id === internshipId 
          ? { ...rec, is_saved: isSaved }
          : rec
      )
    )
  }

  const handleAskDoubts = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation)
    setIsChatbotOpen(true)
  }

  const handleCloseChatbot = () => {
    setIsChatbotOpen(false)
    setSelectedRecommendation(null)
  }

  const handleApplicationSubmitted = (internshipId: number) => {
    setAppliedInternships(prev => new Set(Array.from(prev).concat(internshipId)))
    
    // Remove the applied internship from recommendations with fade animation
    setTimeout(() => {
      setRecommendations(prev => 
        prev.filter(rec => rec.internship_id !== internshipId)
      )
      
      // Immediately fetch new recommendations to maintain 5
      fetchRecommendations(false) // Force refresh without cache
    }, 1000) // 1 second delay for fade animation
  }

  const handleApplicationWithdrawn = (internshipId: number) => {
    // Remove from applied internships set so it can be re-recommended
    setAppliedInternships(prev => {
      const newSet = new Set(Array.from(prev))
      newSet.delete(internshipId)
      return newSet
    })
    
    // Refresh recommendations to include the withdrawn internship
    fetchRecommendations(false)
  }

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const userSkills = formatSkillsList(user.skills || '')

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Your Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            {generateGreeting(user.name)}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Education</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.education || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Location</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.location || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Skills</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userSkills.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Experience</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.experience_years} years
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                📋 Your Personalized Recommendations
              </h2>
              <p className="text-gray-600">
                AI-powered matches based on your skills and preferences
              </p>
            </div>
            
            <div className="flex gap-3">
              {!hasLoadedOnce && (
                <Button
                  onClick={() => fetchRecommendations(true)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Search className="h-4 w-4" />
                  <span>Get Recommendations</span>
                </Button>
              )}
              
              {hasLoadedOnce && (
                <Button
                  onClick={() => fetchRecommendations(false)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recommendations Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <LoadingSpinner size="lg" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              </div>
              <motion.p 
                key={loadingText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 text-lg font-medium text-gray-700 text-center"
              >
                {loadingText || 'Analyzing your profile and finding perfect matches...'}
              </motion.p>
              <div className="mt-2 flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {!isLoading && showCards && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <RecommendationCarousel
                recommendations={recommendations}
                onSaveToggle={handleSaveToggle}
                onAskDoubts={handleAskDoubts}
                onApplicationSubmitted={handleApplicationSubmitted}
              />
            </motion.div>
          )}

          {!isLoading && !hasLoadedOnce && (
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mb-8"
                >
                  <div className="relative inline-block">
                    <TrendingUp className="h-20 w-20 text-blue-600 mx-auto mb-6 animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">↑</span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Launch Your Career Journey
                  </h2>
                  <p className="text-lg text-gray-600 mb-2">
                    Discover personalized internship opportunities that match your skills and career aspirations.
                  </p>
                  <p className="text-gray-500 mb-8">
                    Our AI-powered recommendation engine analyzes your profile to find the perfect matches for your professional growth.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Button
                    onClick={() => fetchRecommendations(false)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <Search className="h-5 w-5 mr-3" />
                    Get My Recommendations
                    <TrendingUp className="h-5 w-5 ml-3" />
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="mt-8 text-sm text-gray-400"
                >
                  ✨ Powered by AI • 🎯 Personalized Matches • 🚀 Career Growth
                </motion.div>
              </div>
            </div>
          )}

          {!isLoading && showCards && hasLoadedOnce && recommendations.length === 0 && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No recommendations found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try updating your profile with more skills or different preferences to get better matches.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => router.push('/profile')}
                    variant="outline"
                  >
                    Update Profile
                  </Button>
                  <Button
                    onClick={() => fetchRecommendations(false)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Profile Completion Prompt */}
        {(!user.skills || !user.location || !user.education) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8"
          >
            <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-yellow-800">
                      Complete your profile for better recommendations
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Adding more details like skills, location, and education will help us find more relevant internships for you.
                      </p>
                      <div className="mt-3 flex">
                        <Button
                          onClick={() => router.push('/profile')}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          Complete Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2025 Tech-o-Vation Solutions, pvt. ltd., All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Doubts Chatbot */}
      <DoubtsChatbot
        isOpen={isChatbotOpen}
        onClose={handleCloseChatbot}
        recommendation={selectedRecommendation}
      />


      {/* Notification System */}
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  )
}