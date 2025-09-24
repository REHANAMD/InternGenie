'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Star, Zap, Check } from 'lucide-react'
import { utilityAPI } from '@/lib/api'

// Generate meaningful fallback insights based on internship characteristics
const generateFallbackInsight = (title: string, company: string, requiredSkills?: string) => {
  const insightTypes = []
  
  // 1. Skill-based insights
  if (requiredSkills) {
    const skills = requiredSkills.toLowerCase().split(',').map(s => s.trim())
    
    // Tech skills trending
    if (skills.some(skill => ['python', 'javascript', 'react', 'node.js', 'aws', 'docker'].includes(skill))) {
      insightTypes.push({
        type: "trending_skills",
        title: "🔥 Hot Tech Skills in Demand",
        description: `Skills like ${skills.filter(s => ['python', 'javascript', 'react', 'node.js', 'aws', 'docker'].includes(s)).slice(0, 2).join(', ')} are highly sought after`,
        icon: "trending_up"
      })
    }
    // Data skills trending
    else if (skills.some(skill => ['sql', 'python', 'analytics', 'machine learning', 'statistics'].includes(skill))) {
      insightTypes.push({
        type: "trending_skills",
        title: "📊 Data Skills on the Rise",
        description: `Data skills like ${skills.filter(s => ['sql', 'python', 'analytics', 'machine learning', 'statistics'].includes(s)).slice(0, 2).join(', ')} are in high demand`,
        icon: "trending_up"
      })
    }
    // Design skills trending
    else if (skills.some(skill => ['figma', 'sketch', 'adobe', 'ui', 'ux', 'design'].includes(skill))) {
      insightTypes.push({
        type: "trending_skills",
        title: "🎨 Creative Skills Trending",
        description: `Design skills like ${skills.filter(s => ['figma', 'sketch', 'adobe', 'ui', 'ux', 'design'].includes(s)).slice(0, 2).join(', ')} are highly valued`,
        icon: "trending_up"
      })
    }
  }
  
  // 2. Company-based insights
  if (company.toLowerCase().includes('tech') || company.toLowerCase().includes('ai') || company.toLowerCase().includes('data')) {
    insightTypes.push({
      type: "popular_company",
      title: "🚀 Tech Company Alert",
      description: `${company} is a growing tech company with great opportunities`,
      icon: "star"
    })
  } else if (company.toLowerCase().includes('startup') || company.toLowerCase().includes('hub')) {
    insightTypes.push({
      type: "popular_company",
      title: "💡 Startup Environment",
      description: `${company} offers fast-paced startup experience and growth`,
      icon: "star"
    })
  } else if (company.toLowerCase().includes('corp') || company.toLowerCase().includes('solutions')) {
    insightTypes.push({
      type: "popular_company",
      title: "🏢 Established Company",
      description: `${company} provides stable corporate experience and mentorship`,
      icon: "star"
    })
  }
  
  // 3. Role-specific insights
  if (title.toLowerCase().includes('product') || title.toLowerCase().includes('manager')) {
    insightTypes.push({
      type: "role_specific",
      title: "📈 Product Management Path",
      description: "Product roles offer strategic thinking and leadership experience",
      icon: "trending_up"
    })
  } else if (title.toLowerCase().includes('data') || title.toLowerCase().includes('analyst')) {
    insightTypes.push({
      type: "role_specific",
      title: "📊 Data-Driven Role",
      description: "Data roles are essential in today's data-driven world",
      icon: "trending_up"
    })
  } else if (title.toLowerCase().includes('design') || title.toLowerCase().includes('ui') || title.toLowerCase().includes('ux')) {
    insightTypes.push({
      type: "role_specific",
      title: "🎨 Creative Design Role",
      description: "Design roles combine creativity with technical skills",
      icon: "trending_up"
    })
  } else if (title.toLowerCase().includes('marketing') || title.toLowerCase().includes('growth')) {
    insightTypes.push({
      type: "role_specific",
      title: "📢 Marketing & Growth",
      description: "Marketing roles offer diverse skills and creative opportunities",
      icon: "trending_up"
    })
  } else if (title.toLowerCase().includes('devops') || title.toLowerCase().includes('cloud')) {
    insightTypes.push({
      type: "role_specific",
      title: "☁️ Cloud & DevOps",
      description: "DevOps roles are crucial for modern software development",
      icon: "trending_up"
    })
  }
  
  // 4. Experience level insights
  if (title.toLowerCase().includes('senior') || title.toLowerCase().includes('lead')) {
    insightTypes.push({
      type: "experience_level",
      title: "👑 Senior Level Role",
      description: "Senior roles offer leadership opportunities and higher impact",
      icon: "star"
    })
  } else if (title.toLowerCase().includes('junior') || title.toLowerCase().includes('entry')) {
    insightTypes.push({
      type: "experience_level",
      title: "🌱 Entry Level Opportunity",
      description: "Perfect for building foundational skills and experience",
      icon: "zap"
    })
  }
  
  // 5. Industry insights
  if (company.toLowerCase().includes('fintech') || company.toLowerCase().includes('finance')) {
    insightTypes.push({
      type: "industry",
      title: "💰 FinTech Industry",
      description: "FinTech is one of the fastest-growing sectors with high demand",
      icon: "trending_up"
    })
  } else if (company.toLowerCase().includes('healthcare') || company.toLowerCase().includes('medical')) {
    insightTypes.push({
      type: "industry",
      title: "🏥 Healthcare Tech",
      description: "Healthcare tech is growing rapidly with meaningful impact",
      icon: "trending_up"
    })
  }
  
  // Return the first available insight or a meaningful fallback
  if (insightTypes.length > 0) {
    return insightTypes[0]
  } else {
    return {
      type: "default",
      title: "🎯 Great Learning Opportunity",
      description: `This ${title} role at ${company} offers valuable experience`,
      icon: "check"
    }
  }
}

interface CollaborativeInsightsProps {
  internshipId: number
  company: string
  title: string
  requiredSkills?: string
}

export default function CollaborativeInsights({ 
  internshipId, 
  company, 
  title, 
  requiredSkills 
}: CollaborativeInsightsProps) {
  const [insight, setInsight] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        setIsLoading(true)
        const response = await utilityAPI.getCollaborativeInsightsForInternship(internshipId)
        
        if (response.success && response.insight) {
          setInsight(response.insight)
        } else {
          // Generate meaningful fallback insight based on internship characteristics
          const fallbackInsight = generateFallbackInsight(title, company, requiredSkills)
          setInsight(fallbackInsight)
        }
      } catch (error) {
        console.error('Error fetching collaborative insight:', error)
        // Generate meaningful fallback insight based on internship characteristics
        const fallbackInsight = generateFallbackInsight(title, company, requiredSkills)
        setInsight(fallbackInsight)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsight()
  }, [internshipId])

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'trending_up':
        return TrendingUp
      case 'users':
        return Users
      case 'star':
        return Star
      case 'zap':
        return Zap
      default:
        return Check
    }
  }

  if (isLoading) {
    return (
      <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          <div className="w-32 h-4 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!insight) return null

  const IconComponent = getIconComponent(insight.icon)

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
      <div className="flex items-center space-x-2 mb-2">
        <IconComponent className="h-4 w-4 text-red-600" />
        <span className="font-semibold text-red-800">{insight.title}</span>
      </div>
      <div className="text-sm text-red-700">
        {insight.description}
      </div>
    </div>
  )
}
