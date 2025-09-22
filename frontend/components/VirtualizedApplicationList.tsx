'use client'

import ApplicationCard from './ApplicationCard'
import { Application } from '@/lib/api'

interface VirtualizedApplicationListProps {
  applications: Application[]
  onStatusUpdate: (applicationId: number, status: 'accepted' | 'withdrawn') => void
  height?: number
}

export default function VirtualizedApplicationList({ 
  applications, 
  onStatusUpdate, 
  height = 600 
}: VirtualizedApplicationListProps) {
  if (applications.length === 0) {
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
    <div className="w-full" style={{ height: `${height}px`, overflowY: 'auto' }}>
      <div className="space-y-6">
        {applications.map((application, index) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onStatusUpdate={onStatusUpdate}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
