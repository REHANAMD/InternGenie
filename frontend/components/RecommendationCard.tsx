'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Button, Badge, Card, CardContent, LoadingSpinner } from '@/components/ui'
import { Recommendation, internshipAPI, applicationAPI } from '@/lib/api'
import { calculateMatchPercentage, formatStipend } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Building, 
  Heart, 
  HeartOff, 
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

  const matchData = calculateMatchPercentage(recommendation.score)

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
        }
      } else {
        const result = await internshipAPI.save(recommendation.internship_id)
        if (result.success) {
          setIsSaved(true)
          toast.success('Added to saved internships')
          onSaveToggle?.(recommendation.internship_id, true)
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
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Match Score Box - Left Side */}
          <div className="flex flex-col items-center justify-center w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl shadow-sm flex-shrink-0">
            <div className={`text-xl font-bold ${matchData.color}`}>
              {matchData.percentage}%
            </div>
            <div className="text-xs text-gray-500">match</div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {recommendation.title}
            </h3>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex items-center space-x-1">
                <Building className="h-4 w-4" />
                <span className="font-medium">{recommendation.company}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{recommendation.location}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{recommendation.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stipend */}
        <div className="flex items-center space-x-1 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-800 dark:text-green-300">
            {formatStipend(recommendation.stipend)}
          </span>
        </div>

        {/* Skills Section */}
        <div className="mb-4">
          <div className="grid md:grid-cols-2 gap-4">
            {recommendation.matched_skills && recommendation.matched_skills.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Matching Skills</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recommendation.matched_skills.slice(0, 4).map((skill, index) => (
                    <Badge key={index} variant="default" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {recommendation.matched_skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{recommendation.matched_skills.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {recommendation.skill_gaps && recommendation.skill_gaps.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills to Learn</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recommendation.skill_gaps.slice(0, 4).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-orange-700 border-orange-300">
                      {skill}
                    </Badge>
                  ))}
                  {recommendation.skill_gaps.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{recommendation.skill_gaps.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Why it matches */}
        {recommendation.explanation && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Why this matches:</strong> {recommendation.explanation}
            </p>
          </div>
        )}

        {/* Expandable Description */}
        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <span>📋 Description</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.description}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={handleApply}
            disabled={isApplied || isApplying || isCheckingStatus}
            className={`flex-1 ${
              isApplied 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
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
            className="flex items-center space-x-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Ask Doubts</span>
          </Button>
          
          <Button
            onClick={handleSaveToggle}
            variant={isSaved ? "destructive" : "outline"}
            disabled={isLoading}
            className="flex items-center space-x-1"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : isSaved ? (
              <>
                <HeartOff className="h-4 w-4" />
                <span className="hidden sm:inline">Remove</span>
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}