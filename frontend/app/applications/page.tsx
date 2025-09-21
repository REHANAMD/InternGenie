'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import ApplicationFilters from '@/components/ApplicationFilters'
import { Button, Card, CardContent, LoadingSpinner, Badge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { applicationAPI, Application } from '@/lib/api'
import { formatStipend } from '@/lib/utils'
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  FileText,
  PartyPopper,
  Filter
} from 'lucide-react'

export default function ApplicationsPage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>(['All'])

  const formatApplicationDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
  }

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }

    fetchApplications()
  }, [authenticated, router])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const result = await applicationAPI.getAll()
      
      if (result.success) {
        setApplications(result.applications)
        setFilteredApplications(result.applications)
      } else {
        toast.error('Failed to fetch applications')
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to fetch applications')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (applicationId: number, status: 'accepted' | 'withdrawn') => {
    try {
      if (status === 'withdrawn') {
        // For withdrawn applications, update status instead of deleting
        const result = await applicationAPI.withdraw(applicationId)
        
        if (result.success) {
          // Update local state to show withdrawn status
          const updatedApplications = applications.map(app => 
            app.id === applicationId 
              ? { ...app, status: 'withdrawn' as const }
              : app
          )
          setApplications(updatedApplications)
          
          // Also update filtered applications to reflect the change immediately
          setFilteredApplications(prev => 
            prev.map(app => 
              app.id === applicationId 
                ? { ...app, status: 'withdrawn' as const }
                : app
            )
          )
          
          toast.success('Application withdrawn successfully! It will appear in recommendations again.')
          
          // Refresh recommendations on dashboard
          if (result.internship_id) {
            window.dispatchEvent(new CustomEvent('applicationWithdrawn', { 
              detail: { internshipId: result.internship_id } 
            }))
          }
        } else {
          toast.error(result.message || 'Failed to withdraw application')
        }
      } else {
        // For accepted applications, update status
        const result = await applicationAPI.updateStatus(applicationId, status)
        
        if (result.success) {
          // Update local state
          const updatedApplications = applications.map(app => 
            app.id === applicationId 
              ? { ...app, status: status as 'accepted' | 'rejected' }
              : app
          )
          setApplications(updatedApplications)
          
          // Also update filtered applications to reflect the change immediately
          setFilteredApplications(prev => 
            prev.map(app => 
              app.id === applicationId 
                ? { ...app, status: status as 'accepted' | 'rejected' }
                : app
            )
          )

          setShowCelebration(true)
          toast.success('Congratulations! We wish you a great and prosperous career ahead! 🎉')
          
          // Hide celebration after 5 seconds
          setTimeout(() => setShowCelebration(false), 5000)
          
          // Refresh recommendations on dashboard
          window.dispatchEvent(new CustomEvent('applicationAccepted', { 
            detail: { applicationId } 
          }))
        } else {
          toast.error(result.message || 'Failed to update application status')
        }
      }
    } catch (error) {
      console.error('Error updating application status:', error)
      toast.error('Failed to update application status')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>
      case 'withdrawn':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Withdrawn</Badge>
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Rejected</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
    }
  }

  const handleApplyFilters = (filters: string[]) => {
    setActiveFilters(filters)
    
    if (filters.includes('All')) {
      setFilteredApplications(applications)
    } else {
      const filtered = applications.filter(application => {
        return filters.includes(application.status)
      })
      setFilteredApplications(filtered)
    }
  }

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen)
  }

  const getFilterCounts = () => {
    const acceptedCount = applications.filter(app => app.status === 'accepted').length
    const withdrawnCount = applications.filter(app => app.status === 'withdrawn').length
    return {
      total: applications.length,
      accepted: acceptedCount,
      withdrawn: withdrawnCount
    }
  }

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const counts = getFilterCounts()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      {/* Sidebar Filter */}
      <ApplicationFilters
        onApplyFilters={handleApplyFilters}
        isOpen={isFilterOpen}
        onToggle={toggleFilter}
        totalCount={counts.total}
        acceptedCount={counts.accepted}
        withdrawnCount={counts.withdrawn}
      />

      {/* Overlay for mobile */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleFilter}
        />
      )}
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isFilterOpen ? 'lg:ml-80' : ''}`}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                📋 My Applications
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Track your internship applications and their status
              </p>
            </div>
            <Button
              onClick={toggleFilter}
              variant="outline"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </motion.div>

        {/* Applications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Loading your applications...</p>
            </div>
          ) : filteredApplications.length > 0 ? (
            <div className="space-y-6">
              {filteredApplications.map((application, index) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {application.title}
                            </h3>
                            {getStatusBadge(application.status)}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-1">
                              <Building className="h-4 w-4" />
                              <span className="font-medium">{application.company}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{application.location}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{application.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stipend */}
                      <div className="flex items-center space-x-1 mb-4 p-3 bg-green-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          {formatStipend(application.stipend)}
                        </span>
                      </div>

                      {/* Application Details */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Applied On</h4>
                          <p className="text-sm text-gray-600">
                            {formatApplicationDate(application.applied_at)}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h4>
                          <p className="text-sm text-gray-600">
                            {application.required_skills}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                        <p className="text-sm text-gray-600">
                          {application.description}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      {application.status === 'pending' && (
                        <div className="flex space-x-3 pt-4 border-t border-gray-200">
                          <Button
                            onClick={() => handleStatusUpdate(application.id, 'accepted')}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Accepted</span>
                          </Button>
                          
                          <Button
                            onClick={() => handleStatusUpdate(application.id, 'withdrawn')}
                            variant="outline"
                            className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Withdrawn</span>
                          </Button>
                        </div>
                      )}

                      {application.status === 'accepted' && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Congratulations! You accepted this offer.</span>
                          </div>
                        </div>
                      )}

                      {application.status === 'withdrawn' && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-orange-600">
                            <XCircle className="h-5 w-5" />
                            <span className="font-medium">You withdrew from this application. It's now available in recommendations again.</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No applications yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start applying to internships from your dashboard to see them here.
                </p>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3">
              <PartyPopper className="h-6 w-6 animate-bounce" />
              <div>
                <h3 className="font-bold text-lg">Congratulations! 🎉</h3>
                <p className="text-sm opacity-90">We wish you a great and prosperous career ahead!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
