'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Button, Badge, Card, CardContent, LoadingSpinner } from '@/components/ui'
import { Recommendation, internshipAPI, applicationAPI, insightsAPI } from '@/lib/api'
import { calculateMatchPercentage, formatStipend } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import AnimatedMatchScore from './AnimatedMatchScore'
import HeartIcon from './HeartIcon'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Building, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  MessageCircle
} from 'lucide-react'

interface RecommendationCardProps {
  recommendation: Recommendation
  onSaveToggle?: (internshipId: number, isSaved: boolean) => void
  onAskDoubts?: (recommendation: Recommendation) => void
  onApplicationSubmitted?: (internshipId: number) => void
}

export default function RecommendationCard({ 
  recommendation, 
  onSaveToggle,
  onAskDoubts,
  onApplicationSubmitted
}: RecommendationCardProps) {
  const { authenticated, user } = useAuth()
  const [isSaved, setIsSaved] = useState(recommendation.is_saved || false)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const hasCheckedRef = useRef(false)

  // Calculate match percentage with fallback for zero scores
  const score = recommendation.score || 0
  const matchData = calculateMatchPercentage(score)

  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id, [user?.id])

  // Check application status when component mounts or recommendation changes
  useEffect(() => {
    const checkApplicationStatus = async () => {
      // Only check if user is authenticated and we haven't checked this internship yet
      if (!authenticated || !userId || hasCheckedRef.current) {
        setIsCheckingStatus(false)
        return
      }

      hasCheckedRef.current = true
      setIsCheckingStatus(true)
      
      try {
        const result = await applicationAPI.checkApplied(recommendation.internship_id)
        if (result.success) {
          setIsApplied(result.applied)
        }
      } catch (error) {
        console.error('Error checking application status:', error)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkApplicationStatus()
  }, [recommendation.internship_id, authenticated, userId])

  // Track view behavior when component mounts (only once per internship per session)
  useEffect(() => {
    const trackView = async () => {
      if (authenticated && userId) {
        // Check if we've already tracked this internship in this session
        const viewedInternships = JSON.parse(localStorage.getItem('viewedInternships') || '[]')
        const internshipId = recommendation.internship_id
        
        if (!viewedInternships.includes(internshipId)) {
          // Mark as viewed
          viewedInternships.push(internshipId)
          localStorage.setItem('viewedInternships', JSON.stringify(viewedInternships))
          
          try {
            await insightsAPI.trackBehavior('view', internshipId, {
              source: 'recommendations',
              match_score: recommendation.score,
              company: recommendation.company,
              location: recommendation.location
            })
          } catch (error) {
            console.error('Error tracking view behavior:', error)
          }
        }
      }
    }

    trackView()
  }, [authenticated, userId, recommendation.internship_id])

  // Reset the checked flag when internship ID changes
  useEffect(() => {
    hasCheckedRef.current = false
  }, [recommendation.internship_id])

  const handleSaveToggle = async () => {
    setIsLoading(true)

    try {
      if (isSaved) {
        const result = await internshipAPI.unsave(recommendation.internship_id)
        if (result.success) {
          setIsSaved(false)
          toast.success('Removed from saved internships')
          onSaveToggle?.(recommendation.internship_id, false)
          
          // Track unsave behavior
          try {
            await insightsAPI.trackBehavior('unsave', recommendation.internship_id, {
              company: recommendation.company,
              location: recommendation.location
            })
          } catch (error) {
            console.error('Error tracking unsave behavior:', error)
          }
        }
      } else {
        const result = await internshipAPI.save(recommendation.internship_id)
        if (result.success) {
          setIsSaved(true)
          toast.success('Added to saved internships')
          onSaveToggle?.(recommendation.internship_id, true)
          
          // Track save behavior
          try {
            await insightsAPI.trackBehavior('save', recommendation.internship_id, {
              company: recommendation.company,
              location: recommendation.location,
              match_score: recommendation.score
            })
          } catch (error) {
            console.error('Error tracking save behavior:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      toast.error('Failed to update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    if (isApplied || isApplying) return

    setIsApplying(true)
    try {
      const result = await applicationAPI.apply(recommendation.internship_id)
      
      if (result.success) {
        setIsApplied(true)
        toast.success('Application submitted successfully! 🎉')
        onApplicationSubmitted?.(recommendation.internship_id)
        
        // Track apply behavior
        try {
          await insightsAPI.trackBehavior('apply', recommendation.internship_id, {
            company: recommendation.company,
            location: recommendation.location,
            match_score: recommendation.score,
            required_skills: recommendation.required_skills
          })
        } catch (error) {
          console.error('Error tracking apply behavior:', error)
        }
      } else {
        toast.error(result.message || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Error applying for internship:', error)
      toast.error('Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }

  const handleAskDoubts = () => {
    onAskDoubts?.(recommendation)
  }

  return (
    <div className="glass-card rounded-3xl p-8 hover:scale-105 transition-all duration-300 border-l-4 border-l-blue-500 h-full flex flex-col shadow-2xl hover:shadow-3xl">
      <div className="flex items-start gap-4 mb-4">
        {/* Match Score Box - Left Side */}
        <div className="flex-shrink-0">
            <AnimatedMatchScore 
              percentage={matchData.percentage}
              color={matchData.color}
              size={100}
            />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
            {recommendation.title}
          </h3>
          
          <div className="flex flex-wrap gap-3 text-base text-gray-600 mb-4">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Building className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-700">{recommendation.company}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-700">{recommendation.location}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <Clock className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-700">{recommendation.duration}</span>
            </div>
          </div>
        </div>
      </div>

        {/* Stipend */}
        <div className="flex items-center space-x-3 mb-6 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-200/50">
          <DollarSign className="h-6 w-6 text-green-600" />
          <span className="font-bold text-green-800 text-xl">
            {formatStipend(recommendation.stipend)}
          </span>
        </div>

        {/* Skills Section */}
        <div className="mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {recommendation.matched_skills && recommendation.matched_skills.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-base font-semibold text-gray-700">Your Matching Skills</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {recommendation.matched_skills.slice(0, 4).map((skill, index) => (
                    <span key={index} className="skill-badge">
                      {skill}
                    </span>
                  ))}
                  {recommendation.matched_skills.length > 4 && (
                    <span className="skill-badge bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-700 border-gray-300/50">
                      +{recommendation.matched_skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {recommendation.skill_gaps && recommendation.skill_gaps.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-base font-semibold text-gray-700">Skills to Learn</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {recommendation.skill_gaps.slice(0, 4).map((skill, index) => (
                    <span key={index} className="skill-gap-badge">
                      {skill}
                    </span>
                  ))}
                  {recommendation.skill_gaps.length > 4 && (
                    <span className="skill-gap-badge bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-700 border-gray-300/50">
                      +{recommendation.skill_gaps.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Why it matches */}
        {recommendation.explanation && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-200/50">
            <p className="text-base text-blue-800">
              💡 <strong>Why this matches:</strong> {recommendation.explanation}
            </p>
          </div>
        )}

        {/* Expandable Description */}
        <div className="mb-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-base font-semibold text-gray-700 hover:text-gray-900"
          >
            <span>📋 Description</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-3 p-5 bg-gradient-to-r from-gray-50/80 to-gray-100/80 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
              <p className="text-base text-gray-700">{recommendation.description}</p>
            </div>
          )}
        </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="mt-auto pt-6">
        <div className="flex space-x-4">
          <Button
            onClick={handleApply}
            disabled={isApplied || isApplying || isCheckingStatus}
            className={`flex-1 rounded-2xl font-bold text-lg py-4 transition-all duration-200 hover:scale-105 ${
              isApplied 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl hover:shadow-2xl'
            }`}
          >
            {isCheckingStatus ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Checking...</span>
              </>
            ) : isApplying ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Applying...</span>
              </>
            ) : isApplied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Already Applied
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply Now
              </>
            )}
          </Button>
          
          <Button
            onClick={handleAskDoubts}
            variant="outline"
            className="flex items-center space-x-2 px-6 py-4 rounded-2xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-200 hover:scale-105 font-semibold"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Ask Doubts</span>
          </Button>
          
          <Button
            onClick={handleSaveToggle}
            variant={isSaved ? "destructive" : "outline"}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-6 py-4 rounded-2xl transition-all duration-200 hover:scale-105 font-semibold ${
              isSaved 
                ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-600' 
                : 'hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600'
            }`}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <HeartIcon isFilled={isSaved} />
                <span className="hidden sm:inline">{isSaved ? 'Remove' : 'Save'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}