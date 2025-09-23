'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RecommendationCard from './RecommendationCard'
import { Recommendation } from '@/lib/api'

interface RecommendationCarouselProps {
  recommendations: Recommendation[]
  onSaveToggle?: (internshipId: number, isSaved: boolean) => void
  onAskDoubts?: (recommendation: Recommendation) => void
  onApplicationSubmitted?: (internshipId: number) => void
}

export default function RecommendationCarousel({
  recommendations,
  onSaveToggle,
  onAskDoubts,
  onApplicationSubmitted
}: RecommendationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious()
      } else if (event.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, recommendations.length])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % recommendations.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + recommendations.length) % recommendations.length)
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)
    
    const threshold = 50
    if (info.offset.x > threshold) {
      goToPrevious()
    } else if (info.offset.x < -threshold) {
      goToNext()
    }
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        disabled={recommendations.length <= 1}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/90 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous recommendation"
      >
        <ChevronLeft className="h-6 w-6 text-gray-700" />
      </button>

      <button
        onClick={goToNext}
        disabled={recommendations.length <= 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/90 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next recommendation"
      >
        <ChevronRight className="h-6 w-6 text-gray-700" />
      </button>

      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="relative h-[700px] overflow-visible"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 300, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -300, opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.5
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing z-20"
            style={{ zIndex: 20 }}
            whileDrag={{ scale: 0.98 }}
          >
            <div className="h-full flex items-center justify-center p-8">
              <div className="w-full max-w-4xl">
                <RecommendationCard
                  recommendation={recommendations[currentIndex]}
                  onSaveToggle={onSaveToggle}
                  onAskDoubts={onAskDoubts}
                  onApplicationSubmitted={onApplicationSubmitted}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Background Cards - Left and Right Sides */}
        {recommendations.length > 1 && (
          <>
            {/* Previous Card - Left Side */}
            {currentIndex > 0 && (
              <motion.div
                initial={{ x: -300, opacity: 0.3, scale: 0.8 }}
                animate={{ x: -200, opacity: 0.3, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none z-10"
                style={{ zIndex: 10 }}
              >
                <div className="h-full flex items-center justify-center p-8">
                  <div className="w-full max-w-4xl">
                    <div className="backdrop-blur-md">
                      <RecommendationCard
                        recommendation={recommendations[(currentIndex - 1 + recommendations.length) % recommendations.length]}
                        onSaveToggle={onSaveToggle}
                        onAskDoubts={onAskDoubts}
                        onApplicationSubmitted={onApplicationSubmitted}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Next Card - Right Side */}
            {currentIndex < recommendations.length - 1 && (
              <motion.div
                initial={{ x: 300, opacity: 0.3, scale: 0.8 }}
                animate={{ x: 200, opacity: 0.3, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none z-10"
                style={{ zIndex: 10 }}
              >
                <div className="h-full flex items-center justify-center p-8">
                  <div className="w-full max-w-4xl">
                    <div className="backdrop-blur-md">
                      <RecommendationCard
                        recommendation={recommendations[(currentIndex + 1) % recommendations.length]}
                        onSaveToggle={onSaveToggle}
                        onAskDoubts={onAskDoubts}
                        onApplicationSubmitted={onApplicationSubmitted}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {recommendations.length > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          {recommendations.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to recommendation ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Card Counter */}
      <div className="text-center mt-4">
        <span className="text-sm text-gray-600 font-medium">
          {currentIndex + 1} of {recommendations.length} recommendations
        </span>
      </div>

      {/* Instructions */}
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500">
          Drag to navigate • Use arrow keys • Click buttons
        </p>
      </div>
    </div>
  )
}
