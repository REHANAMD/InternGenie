'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Target, TrendingUp, Clock, Award, Activity, BarChart3 } from 'lucide-react'
import InfoTooltip from './InfoTooltip'

interface PerformanceMetricsProps {
  totalInteractions: number
  successRate: number
  actionBreakdown: Record<string, number>
  preferredSkills: Record<string, number>
  preferredCompanies: Record<string, number>
  preferredLocations: Record<string, number>
}

export default function PerformanceMetrics({
  totalInteractions,
  successRate,
  actionBreakdown,
  preferredSkills,
  preferredCompanies,
  preferredLocations
}: PerformanceMetricsProps) {
  
  const calculateEngagementScore = () => {
    const viewCount = actionBreakdown.view || 0
    const applyCount = actionBreakdown.apply || 0
    const saveCount = actionBreakdown.save || 0
    
    if (totalInteractions === 0) return 0
    
    // Weighted engagement score: views (1x), saves (3x), applications (5x)
    const weightedScore = (viewCount * 1) + (saveCount * 3) + (applyCount * 5)
    const maxPossibleScore = totalInteractions * 5
    
    return Math.round((weightedScore / maxPossibleScore) * 100)
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { level: 'High', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'Low', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getSuccessLevel = (rate: number) => {
    if (rate >= 0.7) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' }
    if (rate >= 0.4) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (rate >= 0.2) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const engagementScore = calculateEngagementScore()
  const engagementLevel = getEngagementLevel(engagementScore)
  const successLevel = getSuccessLevel(successRate)

  const topSkills = Object.entries(preferredSkills)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  const topCompanies = Object.entries(preferredCompanies)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  const topLocations = Object.entries(preferredLocations)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  Engagement Score
                  <InfoTooltip 
                    content="Calculated using weighted scoring: Views (1x), Saves (3x), Applications (5x). Higher scores indicate more meaningful engagement with internships."
                    className="ml-2"
                  />
                </p>
                <p className="text-2xl font-bold text-gray-900">{engagementScore}%</p>
              </div>
              <div className={`p-2 rounded-full ${engagementLevel.bg}`}>
                <Activity className={`h-6 w-6 ${engagementLevel.color}`} />
              </div>
            </div>
            <p className={`text-xs mt-1 ${engagementLevel.color}`}>
              {engagementLevel.level} engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(successRate * 100)}%
                </p>
              </div>
              <div className={`p-2 rounded-full ${successLevel.bg}`}>
                <Award className={`h-6 w-6 ${successLevel.color}`} />
              </div>
            </div>
            <p className={`text-xs mt-1 ${successLevel.color}`}>
              {successLevel.level}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activity</p>
                <p className="text-2xl font-bold text-gray-900">{totalInteractions}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500">
              Platform interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Target className="h-5 w-5 mr-2 text-indigo-600" />
            Activity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(actionBreakdown).map(([action, count]) => {
              const percentage = totalInteractions > 0 ? (count / totalInteractions) * 100 : 0
              return (
                <div key={action} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 capitalize">{action}s</span>
                    <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topSkills.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Top Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topSkills.map(([skill, count]) => (
                  <div key={skill} className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 capitalize">{skill}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {topCompanies.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Top Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topCompanies.map(([company, count]) => (
                  <div key={company} className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 capitalize">{company}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {topLocations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topLocations.map(([location, count]) => (
                  <div key={location} className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 capitalize">{location}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
