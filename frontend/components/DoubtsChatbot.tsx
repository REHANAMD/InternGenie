'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input, LoadingSpinner } from '@/components/ui'
import { Recommendation } from '@/lib/api'
import { 
  X, 
  Send, 
  MessageCircle, 
  Bot, 
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface DoubtsChatbotProps {
  isOpen: boolean
  onClose: () => void
  recommendation: Recommendation | null
}

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  isTyping?: boolean
}

const getSuggestedQuestions = (recommendation: Recommendation) => {
  const matchPercentage = Math.round((recommendation.score || 0) * 100)
  
  const baseQuestions = [
    "What are the required skills?",
    "What's the location?",
    "What's the stipend?",
    "How long is the duration?"
  ]
  
  const contextualQuestions = []
  
  // Add contextual questions based on match percentage
  if (matchPercentage >= 70) {
    contextualQuestions.push("Am I a perfect match?")
  } else if (matchPercentage >= 40) {
    contextualQuestions.push("What skills do I lack?")
  } else {
    contextualQuestions.push("How can I improve my chances?")
  }
  
  // Add company-specific questions
  contextualQuestions.push("Tell me about the company")
  
  // Add application-related questions
  contextualQuestions.push("How do I apply?")
  
  return [...baseQuestions, ...contextualQuestions].slice(0, 6)
}

export default function DoubtsChatbot({ isOpen, onClose, recommendation }: DoubtsChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && recommendation) {
      // Add welcome message
      setMessages([{
        id: '1',
        type: 'bot',
        content: `Hi! I'm here to help you with questions about the ${recommendation.title} position at ${recommendation.company}. What would you like to know?`
      }])
    }
  }, [isOpen, recommendation])

  const generateAIResponse = async (question: string): Promise<string> => {
    if (!recommendation) return "Sorry, I don't have information about this internship."

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const questionLower = question.toLowerCase()
    const matchPercentage = Math.round((recommendation.score || 0) * 100)
    const skillGaps = recommendation.skill_gaps || []
    
    // Enhanced keyword detection with better mapping
    if (questionLower.includes('location') || questionLower.includes('where') || questionLower.includes('place')) {
      return `📍 **Location**: This ${recommendation.title} position is located in **${recommendation.location}**. ${recommendation.location.includes('Remote') ? 'This is a remote position, so you can work from anywhere!' : `You'll be working from the ${recommendation.location} office.`}`
    }
    
    if (questionLower.includes('skill') && (questionLower.includes('required') || questionLower.includes('need'))) {
      return `🛠️ **Required Skills**: For this ${recommendation.title} position, you need: **${recommendation.required_skills}**. ${recommendation.preferred_skills ? `\n\n**Preferred Skills**: ${recommendation.preferred_skills}` : ''}`
    }
    
    if (questionLower.includes('stipend') || questionLower.includes('salary') || questionLower.includes('pay') || questionLower.includes('money')) {
      return `💰 **Stipend**: This internship offers **${recommendation.stipend}** for the ${recommendation.duration} duration. ${recommendation.stipend.includes('Unpaid') ? 'While unpaid, this internship offers valuable experience and learning opportunities.' : 'This is a paid internship with competitive compensation.'}`
    }
    
    if (questionLower.includes('duration') || questionLower.includes('time') || questionLower.includes('long') || questionLower.includes('period')) {
      return `⏰ **Duration**: This internship runs for **${recommendation.duration}**. ${recommendation.duration.includes('month') ? 'This gives you enough time to make a meaningful impact and learn valuable skills.' : 'Perfect for gaining hands-on experience in a short timeframe.'}`
    }
    
    if (questionLower.includes('perfect match') || questionLower.includes('am i') || questionLower.includes('fit')) {
      return `🎯 **Your Match**: You have a **${matchPercentage}%** compatibility with this role! ${matchPercentage >= 80 ? '🌟 Excellent match! You\'re highly qualified for this position.' : matchPercentage >= 60 ? '👍 Good match! You\'re well-suited with some areas to strengthen.' : matchPercentage >= 40 ? '📈 Decent match! This could be a great learning opportunity.' : '🌱 Learning opportunity! This role will help you grow in new areas.'}`
    }
    
    if (questionLower.includes('skill') && (questionLower.includes('lack') || questionLower.includes('missing') || questionLower.includes('gap'))) {
      if (skillGaps.length > 0) {
        return `📚 **Skill Gaps**: Focus on developing these skills: **${skillGaps.slice(0, 3).join(', ')}**. These would significantly strengthen your application and make you more competitive.`
      }
      return `✅ **Skills Assessment**: Your skills are well-aligned! Consider focusing on the preferred skills: **${recommendation.preferred_skills || 'None specified'}** to make your application even stronger.`
    }
    
    if (questionLower.includes('company') || questionLower.includes('about')) {
      return `🏢 **About ${recommendation.company}**: ${recommendation.company} is hiring for a **${recommendation.title}** position in **${recommendation.location}**. \n\n**Details**: ${recommendation.description}\n\n**Compensation**: ${recommendation.stipend}\n**Duration**: ${recommendation.duration}`
    }
    
    if (questionLower.includes('culture') || questionLower.includes('work') || questionLower.includes('environment')) {
      return `🏢 **Work Environment**: This ${recommendation.duration} internship at ${recommendation.company} offers hands-on experience in **${recommendation.title}**. The role involves: ${recommendation.description.substring(0, 150)}... This is a great opportunity to learn and grow professionally.`
    }
    
    if (questionLower.includes('improve') || questionLower.includes('chance') || questionLower.includes('better')) {
      return `🚀 **Improve Your Chances**: \n1️⃣ **Focus on**: ${skillGaps.slice(0, 3).join(', ')}\n2️⃣ **Highlight**: Relevant experience in your application\n3️⃣ **Customize**: Tailor your application for this specific role\n\n**Current Match**: ${matchPercentage}% - You're on the right track!`
    }
    
    if (questionLower.includes('recommendation') || questionLower.includes('no of recommendation') || questionLower.includes('why')) {
      return `🎯 **Why This Recommendation**: This is a personalized match based on your profile! The system analyzed your skills, location preferences, and experience to find this ${matchPercentage}% match. It's tailored specifically for you and your career goals.`
    }
    
    if (questionLower.includes('apply') || questionLower.includes('application')) {
      return `📝 **Application Process**: To apply for this ${recommendation.title} position at ${recommendation.company}:\n1️⃣ Click "Apply Now" on the internship card\n2️⃣ Your application will be submitted immediately\n3️⃣ Track your application status in the "Applications" section\n\n**Match Score**: ${matchPercentage}% - You're well-qualified!`
    }
    
    if (questionLower.includes('save') || questionLower.includes('bookmark')) {
      return `💾 **Save This Internship**: You can save this ${recommendation.title} position by clicking the heart icon on the internship card. Saved internships appear in your "Saved" section for easy access later.`
    }
    
    // Default response with more context
    return `🤔 **I understand you're asking about "${question}"**. For the **${recommendation.title}** position at **${recommendation.company}**, here's what I can tell you:\n\n**Key Details**:\n• **Location**: ${recommendation.location}\n• **Duration**: ${recommendation.duration}\n• **Stipend**: ${recommendation.stipend}\n• **Required Skills**: ${recommendation.required_skills}\n• **Your Match**: ${matchPercentage}%\n\nWould you like more specific information about any of these aspects?`
  }

  const addMessage = (content: string, type: 'user' | 'bot', isTyping = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      isTyping
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }

  const typewriterEffect = async (message: Message, fullText: string) => {
    const words = fullText.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, content: currentText, isTyping: i < words.length - 1 }
            : msg
        )
      )
      
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message
    addMessage(content, 'user')
    setInputValue('')
    setIsLoading(true)

    try {
      // Generate AI response
      const response = await generateAIResponse(content)
      
      // Add bot message with typing effect
      const botMessage = addMessage('', 'bot', true)
      await typewriterEffect(botMessage, response)
    } catch (error) {
      console.error('Error generating response:', error)
      addMessage('Sorry, I encountered an error. Please try again.', 'bot')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  if (!isOpen || !recommendation) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-2xl">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Ask Doubts</h3>
                <p className="text-xs opacity-90">{recommendation.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/20 rounded"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isExpanded ? 'max-h-96' : 'max-h-64'}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'bot' && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.type === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      {message.isTyping && (
                        <div className="flex space-x-1 mt-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && recommendation && (
            <div className="px-4 py-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-1">
                {getSuggestedQuestions(recommendation).slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask your question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
