'use client'

import { useEffect, useRef } from 'react'
import ApplicationCard from './ApplicationCard'
import { Application } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui'

interface InfiniteScrollApplicationListProps {
  applications: Application[]
  onStatusUpdate: (applicationId: number, status: 'accepted' | 'withdrawn') => void
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  height?: number
}

export default function InfiniteScrollApplicationList({ 
  applications, 
  onStatusUpdate, 
  onLoadMore,
  hasMore,
  isLoading,
  height = 600 
}: InfiniteScrollApplicationListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !hasMore || isLoading) return

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const threshold = 100 // Load more when 100px from bottom

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        onLoadMore()
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore, isLoading, onLoadMore])

  if (applications.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No applications found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="w-full space-y-6" 
      style={{ height: `${height}px`, overflowY: 'auto' }}
    >
      {applications.map((application, index) => (
        <ApplicationCard
          key={application.id}
          application={application}
          onStatusUpdate={onStatusUpdate}
          index={index}
        />
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-gray-600">Loading more applications...</span>
          </div>
        </div>
      )}
      
      {/* Load more button */}
      {!isLoading && hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={onLoadMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Load More Applications
          </button>
        </div>
      )}
      
      {/* No more data indicator */}
      {!hasMore && applications.length > 0 && (
        <div className="flex justify-center py-8">
          <span className="text-gray-500">No more applications to load</span>
        </div>
      )}
    </div>
  )
}
