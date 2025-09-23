'use client'

import { motion } from 'framer-motion'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import { formatStipend } from '@/lib/utils'
import { Application } from '@/lib/api'
import { 
  CheckCircle,
  XCircle,
  MapPin,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react'

interface ApplicationCardProps {
  application: Application
  onStatusUpdate: (applicationId: number, status: 'accepted' | 'withdrawn') => void
  index: number
}

export default function ApplicationCard({ application, onStatusUpdate, index }: ApplicationCardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {application.title}
                </h3>
                {getStatusBadge(application.status)}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
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
                onClick={() => onStatusUpdate(application.id, 'accepted')}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Accepted</span>
              </Button>
              
              <Button
                onClick={() => onStatusUpdate(application.id, 'withdrawn')}
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
  )
}
