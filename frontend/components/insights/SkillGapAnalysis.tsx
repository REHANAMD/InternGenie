'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Brain, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface SkillGapAnalysisProps {
  userSkills: string[]
  trendingSkills: Array<{ skill: string; count: number }>
  preferredSkills: Record<string, number>
}

export default function SkillGapAnalysis({ userSkills, trendingSkills, preferredSkills }: SkillGapAnalysisProps) {
  const userSkillsSet = new Set(userSkills.map(skill => skill.toLowerCase().trim()))
  
  // Find skills that are trending but user doesn't have
  const missingTrendingSkills = trendingSkills
    .filter(({ skill }) => !userSkillsSet.has(skill.toLowerCase().trim()))
    .slice(0, 5)

  // Find skills user is interested in but doesn't have
  const missingPreferredSkills = Object.entries(preferredSkills)
    .filter(([skill]) => !userSkillsSet.has(skill.toLowerCase().trim()))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }))

  // Find skills user has that are trending
  const matchingTrendingSkills = trendingSkills
    .filter(({ skill }) => userSkillsSet.has(skill.toLowerCase().trim()))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Missing Skills Alert */}
      {missingTrendingSkills.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg text-orange-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              Skills to Learn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-3">
              These trending skills could boost your profile:
            </p>
            <div className="space-y-2">
              {missingTrendingSkills.map(({ skill, count }) => (
                <div key={skill} className="flex justify-between items-center p-2 bg-white rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-orange-600 mr-1" />
                    <span className="text-xs text-orange-600">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matching Skills */}
      {matchingTrendingSkills.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              Your Trending Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-3">
              Great! You already have these in-demand skills:
            </p>
            <div className="space-y-2">
              {matchingTrendingSkills.map(({ skill, count }) => (
                <div key={skill} className="flex justify-between items-center p-2 bg-white rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Interest Gap */}
      {missingPreferredSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Skills You're Interested In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Based on your interactions, you might want to learn:
            </p>
            <div className="space-y-2">
              {missingPreferredSkills.map(({ skill, count }) => (
                <div key={skill} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                  <span className="text-xs text-gray-500">{count} interactions</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
