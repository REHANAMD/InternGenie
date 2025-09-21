import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date helper
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

// Format skills helper
export function formatSkillsList(skills: string): string[] {
  if (!skills) return []
  return skills.split(',').map(skill => skill.trim()).filter(Boolean)
}

// Calculate match percentage with color
export function calculateMatchPercentage(score: number): { 
  percentage: number, 
  color: string, 
  emoji: string 
} {
  const percentage = Math.round(score * 100)
  
  if (percentage >= 80) {
    return { percentage, color: 'text-green-600', emoji: '🟢' }
  } else if (percentage >= 60) {
    return { percentage, color: 'text-yellow-600', emoji: '🟡' }
  } else {
    return { percentage, color: 'text-red-600', emoji: '🔴' }
  }
}

// Format stipend
export function formatStipend(stipend: string): string {
  if (!stipend) return "Not specified"
  
  // If already formatted (contains ₹ and /month), return as is
  if (stipend.includes('₹') && stipend.includes('/month')) {
    return stipend
  }
  
  const stipendLower = stipend.toLowerCase()
  if (stipendLower.includes('unpaid') || stipendLower === '0') {
    return "Unpaid"
  } else if (stipendLower.includes('variable') || stipendLower.includes('performance')) {
    return "Performance-based"
  } else {
    const numbers = stipend.match(/\d+/)
    if (numbers) {
      const amount = parseInt(numbers[0])
      return `₹${amount.toLocaleString()}/month`
    }
    return stipend
  }
}

// Generate greeting based on time
export function generateGreeting(name: string): string {
  const hour = new Date().getHours()
  let greeting = "Good morning"
  
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon"
  } else if (hour >= 17) {
    greeting = "Good evening"
  }
  
  return `${greeting}, ${name}! 👋`
}