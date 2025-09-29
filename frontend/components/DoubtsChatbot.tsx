'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input, LoadingSpinner } from '@/components/ui'
import { Recommendation, api } from '@/lib/api'
import { 
  X, 
  Send, 
  MessageCircle, 
  Bot, 
  User,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
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
  intent?: string
  confidence?: number
  isIntelligent?: boolean
  feedback?: 'thumbs_up' | 'thumbs_down' | null
  canRegenerate?: boolean
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
  
  // Add profile-related questions
  contextualQuestions.push("What are my skills?")
  contextualQuestions.push("How much experience do I have?")
  contextualQuestions.push("Am I qualified for this role?")
  
  return [...baseQuestions, ...contextualQuestions].slice(0, 8)
}

export default function DoubtsChatbot({ isOpen, onClose, recommendation }: DoubtsChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [isRegenerating, setIsRegenerating] = useState(false)
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

  const generateAIResponse = async (question: string): Promise<{ response: string; intent: string; confidence: number; isIntelligent: boolean }> => {
    if (!recommendation) {
      return {
        response: "Sorry, I don't have information about this internship.",
        intent: "error",
        confidence: 0,
        isIntelligent: false
      }
    }

    try {
      // Try to use the intelligent chatbot first
      const intelligentResponse = await api.chatWithBot(question, recommendation.internship_id || 0)
      
      // Format the response with context
      const formattedResponse = formatIntelligentResponse(intelligentResponse.response, recommendation)
      
      return {
        response: formattedResponse,
        intent: intelligentResponse.intent,
        confidence: intelligentResponse.confidence,
        isIntelligent: true
      }
    } catch (error) {
      console.warn('Intelligent chatbot failed, falling back to rule-based:', error)
      
      // Fallback to rule-based responses
      const fallbackResponse = generateFallbackResponse(question, recommendation)
      return {
        response: fallbackResponse,
        intent: 'fallback',
        confidence: 0.5,
        isIntelligent: false
      }
    }
  }

  const formatIntelligentResponse = (response: string, recommendation: Recommendation): string => {
    // Replace placeholders with actual data
    let formatted = response
      .replace('{location}', recommendation.location || 'Not specified')
      .replace('{required_skills}', recommendation.required_skills || 'Not specified')
      .replace('{preferred_skills}', recommendation.preferred_skills || 'None specified')
      .replace('{stipend}', recommendation.stipend || 'Not specified')
      .replace('{duration}', recommendation.duration || 'Not specified')
      .replace('{company}', recommendation.company || 'Not specified')
      .replace('{title}', recommendation.title || 'Not specified')
      .replace('{description}', recommendation.description || 'Not specified')
      .replace('{match_percentage}', Math.round((recommendation.score || 0) * 100).toString())
      .replace('{user_skills}', 'Your skills from profile')
      .replace('{user_experience}', 'Your experience from profile')
      .replace('{user_location}', 'Your location from profile')
      .replace('{user_education}', 'Your education from profile')
    
    // Add contextual information
    const matchPercentage = Math.round((recommendation.score || 0) * 100)
    const skillGaps = recommendation.skill_gaps || []
    
    // Enhance with contextual details
    if (response.includes('location') && recommendation.location) {
      const locationDetails = recommendation.location.includes('Remote') 
        ? 'This is a remote position, so you can work from anywhere!' 
        : `You'll be working from the ${recommendation.location} office.`
      formatted += `\n\n📍 ${locationDetails}`
    }
    
    if (response.includes('skills') && skillGaps.length > 0) {
      formatted += `\n\n📚 Skill Gaps: Focus on developing these skills: ${skillGaps.slice(0, 3).join(', ')}`
    }
    
    // Remove markdown formatting
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/`(.*?)`/g, '$1')       // Remove code
      .replace(/#{1,6}\s*/g, '')       // Remove headers
      .replace(/\n\s*\n/g, '\n')       // Remove extra newlines
      .trim()
    
    return formatted
  }

  const generateFallbackResponse = (question: string, recommendation: Recommendation): string => {
    const questionLower = question.toLowerCase()
    const matchPercentage = Math.round((recommendation.score || 0) * 100)
    const skillGaps = recommendation.skill_gaps || []
    
    // Enhanced keyword detection with better mapping
    if (questionLower.includes('location') || questionLower.includes('where') || questionLower.includes('place')) {
      return `📍 **Location**: This ${recommendation.title} position is located in **${recommendation.location}**. ${recommendation.location?.includes('Remote') ? 'This is a remote position, so you can work from anywhere!' : `You'll be working from the ${recommendation.location} office.`}`
    }
    
    if (questionLower.includes('skill') && (questionLower.includes('required') || questionLower.includes('need'))) {
      return `🛠️ **Required Skills**: For this ${recommendation.title} position, you need: **${recommendation.required_skills}**. ${recommendation.preferred_skills ? `\n\n**Preferred Skills**: ${recommendation.preferred_skills}` : ''}`
    }
    
    if (questionLower.includes('stipend') || questionLower.includes('salary') || questionLower.includes('pay') || questionLower.includes('money')) {
      return `💰 **Stipend**: This internship offers **${recommendation.stipend}** for the ${recommendation.duration} duration. ${recommendation.stipend?.includes('Unpaid') ? 'While unpaid, this internship offers valuable experience and learning opportunities.' : 'This is a paid internship with competitive compensation.'}`
    }
    
    if (questionLower.includes('duration') || questionLower.includes('time') || questionLower.includes('long') || questionLower.includes('period')) {
      return `⏰ **Duration**: This internship runs for **${recommendation.duration}**. ${recommendation.duration?.includes('month') ? 'This gives you enough time to make a meaningful impact and learn valuable skills.' : 'Perfect for gaining hands-on experience in a short timeframe.'}`
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
      return `🏢 **Work Environment**: This ${recommendation.duration} internship at ${recommendation.company} offers hands-on experience in **${recommendation.title}**. The role involves: ${recommendation.description?.substring(0, 150)}... This is a great opportunity to learn and grow professionally.`
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
      
      // Add bot message with typing effect and metadata
      const botMessage = addMessage('', 'bot', true)
      botMessage.intent = response.intent
      botMessage.confidence = response.confidence
      botMessage.isIntelligent = response.isIntelligent
      
      await typewriterEffect(botMessage, response.response)
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

  const handleFeedback = async (messageId: string, feedback: 'thumbs_up' | 'thumbs_down') => {
    const message = messages.find(m => m.id === messageId)
    if (!message || !recommendation) {
      console.error('Message or recommendation not found')
      return
    }

    console.log('Submitting feedback:', { messageId, feedback, sessionId })

    try {
      const result = await api.submitFeedback(
        sessionId,
        recommendation.internship_id || 0,
        messages[messages.indexOf(message) - 1]?.content || '',
        message.content,
        feedback
      )

      console.log('Feedback submitted successfully:', result)

      // Update message with feedback
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback, canRegenerate: feedback === 'thumbs_down' }
            : msg
        )
      )
    } catch (error) {
      console.error('Error submitting feedback:', error)
      // Still update the UI even if API fails
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback, canRegenerate: feedback === 'thumbs_down' }
            : msg
        )
      )
    }
  }

  const handleRegenerate = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message || !recommendation) {
      console.error('Message or recommendation not found for regeneration')
      return
    }

    const questionMessage = messages[messages.indexOf(message) - 1]
    if (!questionMessage) {
      console.error('Question message not found for regeneration')
      return
    }

    console.log('Regenerating response for:', questionMessage.content)
    setIsRegenerating(true)
    
    try {
      const newResponse = await api.regenerateResponse(
        questionMessage.content,
        recommendation.internship_id || 0
      )

      console.log('New response generated:', newResponse)

      // Replace the message with new response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: newResponse.response,
                intent: newResponse.intent,
                confidence: newResponse.confidence,
                feedback: null,
                canRegenerate: true
              }
            : msg
        )
      )
    } catch (error) {
      console.error('Error regenerating response:', error)
      // Show error message to user
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: 'Sorry, I had trouble regenerating that response. Please try again.',
                feedback: null,
                canRegenerate: true
              }
            : msg
        )
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleClose = () => {
    onClose()
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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div>
              <h3 className="font-semibold">
                AI Assistant
              </h3>
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
                onClick={handleClose}
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
                      <div className="flex items-center space-x-1">
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      </div>
                    )}
                    {message.type === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm">{message.content}</p>
                        {message.type === 'bot' && message.intent && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            {message.intent.replace('_', ' ')}
                            {message.confidence && ` (${Math.round(message.confidence * 100)}%)`}
                          </span>
                        )}
                      </div>
                      {message.isTyping && (
                        <div className="flex space-x-1 mt-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      )}
                      
                      {/* Feedback buttons for bot messages */}
                      {message.type === 'bot' && !message.isTyping && (
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleFeedback(message.id, 'thumbs_up')}
                              className={`p-1 rounded-full transition-colors ${
                                message.feedback === 'thumbs_up' 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'hover:bg-gray-100 text-gray-400 hover:text-green-600'
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 'thumbs_down')}
                              className={`p-1 rounded-full transition-colors ${
                                message.feedback === 'thumbs_down' 
                                  ? 'bg-red-100 text-red-600' 
                                  : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* Regenerate button for thumbs down */}
                          {message.canRegenerate && (
                            <button
                              onClick={() => handleRegenerate(message.id)}
                              disabled={isRegenerating}
                              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                            </button>
                          )}
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
