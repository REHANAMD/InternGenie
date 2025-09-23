'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Button, Card, CardContent, LoadingSpinner, Badge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { internshipAPI, Internship, applicationAPI } from '@/lib/api'
import { formatStipend, formatDate } from '@/lib/utils'
import { 
  ArrowLeft,
  Heart,
  HeartOff,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Bookmark
} from 'lucide-react'

export default function SavedInternshipsPage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const [savedInternships, setSavedInternships] = useState<Internship[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [applicationStatuses, setApplicationStatuses] = useState<Map<number, { status: string; applicationId?: number; isChecking: boolean }>>(new Map())

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }

    fetchSavedInternships()
  }, [authenticated, router])

  const fetchSavedInternships = async () => {
    setIsLoading(true)
    try {
      const result = await internshipAPI.getSaved()
      
      if (result.success) {
        setSavedInternships(result.internships)
        // Check application status for each saved internship
        checkApplicationStatuses(result.internships)
      } else {
        toast.error('Failed to fetch saved internships')
      }
    } catch (error) {
      console.error('Error fetching saved internships:', error)
      toast.error('Failed to fetch saved internships')
    } finally {
      setIsLoading(false)
    }
  }

  const checkApplicationStatuses = async (internships: Internship[]) => {
    const statusMap = new Map<number, { status: string; applicationId?: number; isChecking: boolean }>()
    
    // Initialize all as checking
    internships.forEach(internship => {
      statusMap.set(internship.id, { status: 'unknown', isChecking: true })
    })
    setApplicationStatuses(statusMap)

    // Check each internship's application status
    for (const internship of internships) {
      try {
        const result = await applicationAPI.getStatusByInternship(internship.id)
        if (result.success) {
          statusMap.set(internship.id, { 
            status: result.status, 
            applicationId: result.application_id,
            isChecking: false 
          })
        } else {
          statusMap.set(internship.id, { 
            status: 'not_applied', 
            isChecking: false 
          })
        }
      } catch (error) {
        console.error(`Error checking application status for internship ${internship.id}:`, error)
        statusMap.set(internship.id, { 
          status: 'not_applied', 
          isChecking: false 
        })
      }
    }
    
    setApplicationStatuses(new Map(statusMap))
  }

  const handleUnsave = async (internshipId: number) => {
    try {
      const result = await internshipAPI.unsave(internshipId)
      
      if (result.success) {
        setSavedInternships(prev => prev.filter(internship => internship.id !== internshipId))
        toast.success('Removed from saved internships')
      } else {
        toast.error('Failed to remove internship')
      }
    } catch (error) {
      console.error('Error removing internship:', error)
      toast.error('Failed to remove internship')
    }
  }

  const toggleExpanded = (internshipId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(internshipId)) {
        newSet.delete(internshipId)
      } else {
        newSet.add(internshipId)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      case 'withdrawn':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Withdrawn</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
      case 'applied':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Applied</Badge>
      default:
        return null
    }
  }

  const getActionButton = (internshipId: number, status: string, isChecking: boolean) => {
    if (isChecking) {
      return (
        <Button disabled className="w-full">
          <LoadingSpinner size="sm" />
          Checking...
        </Button>
      )
    }

    switch (status) {
      case 'not_applied':
        return (
          <Button 
            onClick={() => handleApply(internshipId)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Now
          </Button>
        )
      case 'withdrawn':
        return (
          <Button 
            onClick={() => handleApply(internshipId)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Re-apply
          </Button>
        )
      case 'accepted':
      case 'pending':
      case 'rejected':
      case 'applied':
        return (
          <Button disabled className="w-full bg-gray-300 text-gray-500">
            Already Applied
          </Button>
        )
      default:
        return (
          <Button 
            onClick={() => handleApply(internshipId)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Now
          </Button>
        )
    }
  }

  const handleApply = async (internshipId: number) => {
    try {
      const result = await applicationAPI.apply(internshipId)
      
      if (result.success) {
        toast.success('🎉 Application submitted successfully!')
        
        // Update the application status for this internship
        setApplicationStatuses(prev => {
          const newMap = new Map(prev)
          newMap.set(internshipId, { 
            status: 'pending', 
            isChecking: false 
          })
          return newMap
        })
        
        // Dispatch event to refresh dashboard if user navigates there
        window.dispatchEvent(new CustomEvent('applicationSubmitted', { 
          detail: { internshipId } 
        }))
      } else {
        toast.error(result.message || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Error applying for internship:', error)
      toast.error('Failed to submit application')
    }
  }


  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 p-0 h-auto font-normal text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              Your Saved Internships
            </h1>
          </div>
          <p className="text-gray-600">
            {savedInternships.length} internship{savedInternships.length !== 1 ? 's' : ''} saved for later
          </p>
        </motion.div>


        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading your saved internships...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && savedInternships.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center py-12"
          >
            <div className="max-w-md mx-auto">
              <Bookmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No saved internships yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start exploring internships and save the ones you're interested in to keep track of them.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Heart className="h-4 w-4 mr-2" />
                Find Internships
              </Button>
            </div>
          </motion.div>
        )}

        {/* Saved Internships List */}
        {!isLoading && savedInternships.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {savedInternships.map((internship, index) => {
              const isExpanded = expandedCards.has(internship.id)
              
              return (
                <motion.div
                  key={internship.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {internship.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(applicationStatuses.get(internship.id)?.status || 'not_applied')}
                              <Button
                                onClick={() => handleUnsave(internship.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
                              >
                                <HeartOff className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Remove</span>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-1">
                              <Building className="h-4 w-4" />
                              <span className="font-medium">{internship.company}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{internship.location}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{internship.duration}</span>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Stipend */}
                      <div className="flex items-center space-x-1 mb-4 p-3 bg-green-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          Stipend: {formatStipend(internship.stipend)}
                        </span>
                      </div>

                      {/* Required Skills */}
                      {internship.required_skills && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills:</h4>
                          <div className="flex flex-wrap gap-2">
                            {internship.required_skills.split(',').slice(0, 5).map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="default" className="text-xs">
                                {skill.trim()}
                              </Badge>
                            ))}
                            {internship.required_skills.split(',').length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{internship.required_skills.split(',').length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expandable Description */}
                      <div className="mb-4">
                        <button
                          onClick={() => toggleExpanded(internship.id)}
                          className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <span>📋 Description</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-2 p-3 bg-gray-50 rounded-lg"
                          >
                            <p className="text-sm text-gray-700">{internship.description}</p>
                            
                            {/* Additional Details */}
                            <div className="mt-3 space-y-2 text-xs text-gray-600">
                              {internship.min_education && (
                                <p><strong>Minimum Education:</strong> {internship.min_education}</p>
                              )}
                              {internship.experience_required > 0 && (
                                <p><strong>Experience Required:</strong> {internship.experience_required} years</p>
                              )}
                              {internship.preferred_skills && (
                                <div>
                                  <strong>Preferred Skills:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {internship.preferred_skills.split(',').map((skill, skillIndex) => (
                                      <Badge key={skillIndex} variant="outline" className="text-xs">
                                        {skill.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        {getActionButton(
                          internship.id, 
                          applicationStatuses.get(internship.id)?.status || 'not_applied',
                          applicationStatuses.get(internship.id)?.isChecking || false
                        )}
                        
                        <Button
                          onClick={() => router.push('/dashboard')}
                          variant="outline"
                          className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Find Similar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Quick Actions */}
        {!isLoading && savedInternships.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to find more opportunities?
                </h3>
                <p className="text-gray-600 mb-4">
                  Discover more internships that match your skills and interests
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Get New Recommendations
                  </Button>
                  <Button
                    onClick={() => router.push('/profile')}
                    variant="outline"
                  >
                    Update Profile
                  </Button>
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
    </div>
  )
}