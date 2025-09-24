'use client'

import { useState, useEffect } from 'react'

interface AnimatedTypingProps {
  words: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseTime?: number
  className?: string
}

export default function AnimatedTyping({ 
  words, 
  typingSpeed = 100, 
  deletingSpeed = 50, 
  pauseTime = 2000,
  className = ''
}: AnimatedTypingProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[currentWordIndex]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.slice(0, currentText.length + 1))
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), pauseTime)
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1))
        } else {
          // Finished deleting, move to next word
          setIsDeleting(false)
          setCurrentWordIndex((prev) => (prev + 1) % words.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, pauseTime])

  return (
    <span className={`inline-block ${className}`}>
      {currentText}
    </span>
  )
}
