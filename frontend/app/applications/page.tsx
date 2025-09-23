'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import ApplicationFilters from '@/components/ApplicationFilters'
import ApplicationCard from '@/components/ApplicationCard'
import Pagination from '@/components/Pagination'
import SearchBar from '@/components/SearchBar'
import VirtualizedApplicationList from '@/components/VirtualizedApplicationList'
import InfiniteScrollApplicationList from '@/components/InfiniteScrollApplicationList'
import { Button, LoadingSpinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { applicationAPI, Application } from '@/lib/api'
import { 
  ArrowLeft,
  FileText,
  PartyPopper,
  Filter,
  List,
  Grid
} from 'lucide-react'

export default function ApplicationsPage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>(['All'])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined)
  
  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'virtualized' | 'infinite'>('grid')
  
  // Infinite scroll state
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [infiniteLoading, setInfiniteLoading] = useState(false)
  
  const ITEMS_PER_PAGE = 10

  const fetchApplications = useCallback(async (page = 1, status?: string, search?: string) => {
    setIsLoading(true)
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE
      const result = await applicationAPI.getAll(ITEMS_PER_PAGE, offset, status, search)
      
      if (result.success) {
        setApplications(result.applications)
        setTotalItems(result.total)
        setTotalPages(Math.ceil(result.total / ITEMS_PER_PAGE))
        setHasNextPage(result.has_more)
        setHasPrevPage(page > 1)
        setCurrentPage(page)
      } else {
        toast.error('Failed to fetch applications')
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to fetch applications')
    } finally {
      setIsLoading(false)
    }
  }, [ITEMS_PER_PAGE])

  const handlePageChange = useCallback((page: number) => {
    fetchApplications(page, currentStatus, searchQuery)
  }, [fetchApplications, currentStatus, searchQuery])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchApplications(1, currentStatus, query)
  }, [fetchApplications, currentStatus])

  const handleStatusFilter = useCallback((status: string | string[]) => {
    const statusValue = Array.isArray(status) ? status[0] : status
    setCurrentStatus(statusValue === 'All' ? undefined : statusValue)
    setCurrentPage(1)
    if (viewMode === 'infinite') {
      setAllApplications([])
      fetchInfiniteApplications(1, statusValue === 'All' ? undefined : statusValue, searchQuery)
    } else {
      fetchApplications(1, statusValue === 'All' ? undefined : statusValue, searchQuery)
    }
  }, [fetchApplications, searchQuery, viewMode])

  const fetchInfiniteApplications = useCallback(async (page = 1, status?: string, search?: string, append = false) => {
    setInfiniteLoading(true)
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE
      const result = await applicationAPI.getAll(ITEMS_PER_PAGE, offset, status, search)
      
      if (result.success) {
        if (append) {
          setAllApplications(prev => [...prev, ...result.applications])
        } else {
          setAllApplications(result.applications)
        }
        setTotalItems(result.total)
        setHasNextPage(result.has_more)
      } else {
        toast.error('Failed to fetch applications')
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to fetch applications')
    } finally {
      setInfiniteLoading(false)
    }
  }, [ITEMS_PER_PAGE])

  const handleLoadMore = useCallback(() => {
    if (!infiniteLoading && hasNextPage) {
      const nextPage = Math.floor(allApplications.length / ITEMS_PER_PAGE) + 1
      fetchInfiniteApplications(nextPage, currentStatus, searchQuery, true)
    }
  }, [infiniteLoading, hasNextPage, allApplications.length, fetchInfiniteApplications, currentStatus, searchQuery])

  const handleInfiniteSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setAllApplications([])
    fetchInfiniteApplications(1, currentStatus, query)
  }, [fetchInfiniteApplications, currentStatus])

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }

    if (viewMode === 'infinite') {
      fetchInfiniteApplications()
    } else {
      fetchApplications()
    }
  }, [authenticated, router, viewMode, fetchApplications, fetchInfiniteApplications])

  const handleStatusUpdate = async (applicationId: number, status: 'accepted' | 'withdrawn') => {
    try {
      if (status === 'withdrawn') {
        // For withdrawn applications, update status instead of deleting
        const result = await applicationAPI.withdraw(applicationId)
        
        if (result.success) {
          // Refresh the current page to show updated data
          fetchApplications(currentPage, currentStatus, searchQuery)
          
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
          // Refresh the current page to show updated data
          fetchApplications(currentPage, currentStatus, searchQuery)

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

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen)
  }

  const getFilterCounts = () => {
    // Calculate counts from the actual applications data
    const acceptedCount = applications.filter(app => app.status === 'accepted').length
    const withdrawnCount = applications.filter(app => app.status === 'withdrawn').length
    
    return {
      total: totalItems,
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
    <div className="min-h-screen">
      <Navbar />
      
      {/* Sidebar Filter */}
      <ApplicationFilters
        onApplyFilters={handleStatusFilter}
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
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8 ${isFilterOpen ? 'lg:ml-80' : ''}`}>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📋 My Applications
              </h1>
              <p className="text-lg text-gray-600">
                Track your internship applications and their status
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={toggleFilter}
                variant="outline"
                className="bg-white border-gray-300 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
                <Button
                  onClick={() => setViewMode('grid')}
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  className="px-3 py-2"
                  title="Grid View"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('virtualized')}
                  variant={viewMode === 'virtualized' ? 'default' : 'ghost'}
                  className="px-3 py-2"
                  title="Virtualized List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('infinite')}
                  variant={viewMode === 'infinite' ? 'default' : 'ghost'}
                  className="px-3 py-2"
                  title="Infinite Scroll"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-6">
            <SearchBar
              onSearch={viewMode === 'infinite' ? handleInfiniteSearch : handleSearch}
              placeholder="Search applications by title, company, location, or skills..."
              className="max-w-md"
            />
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
          ) : (viewMode === 'infinite' ? allApplications : applications).length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="space-y-6">
                  {applications.map((application, index) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      onStatusUpdate={handleStatusUpdate}
                      index={index}
                    />
                  ))}
                </div>
              ) : viewMode === 'virtualized' ? (
                <VirtualizedApplicationList
                  applications={applications}
                  onStatusUpdate={handleStatusUpdate}
                  height={600}
                />
              ) : (
                <InfiniteScrollApplicationList
                  applications={allApplications}
                  onStatusUpdate={handleStatusUpdate}
                  onLoadMore={handleLoadMore}
                  hasMore={hasNextPage}
                  isLoading={infiniteLoading}
                  height={600}
                />
              )}
              
              {/* Pagination - only show for grid and virtualized views */}
              {viewMode !== 'infinite' && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={hasNextPage}
                  hasPrevPage={hasPrevPage}
                  totalItems={totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || currentStatus 
                    ? 'No applications match your current search or filter criteria.'
                    : 'Start applying to internships from your dashboard to see them here.'
                  }
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
