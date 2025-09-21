'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, CardContent } from '@/components/ui'
import { Filter, X } from 'lucide-react'

interface SavedFiltersProps {
  onApplyFilters: (filters: string[]) => void
  isOpen: boolean
  onToggle: () => void
}

export default function SavedFilters({ onApplyFilters, isOpen, onToggle }: SavedFiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['All'])

  const filterOptions = [
    { id: 'All', label: 'All Internships', count: null },
    { id: 'Accepted', label: 'Accepted', count: null },
    { id: 'Withdrawn', label: 'Withdrawn', count: null }
  ]

  const handleFilterToggle = (filterId: string) => {
    if (filterId === 'All') {
      setSelectedFilters(['All'])
    } else {
      setSelectedFilters(prev => {
        const newFilters = prev.filter(f => f !== 'All')
        if (newFilters.includes(filterId)) {
          const updated = newFilters.filter(f => f !== filterId)
          return updated.length === 0 ? ['All'] : updated
        } else {
          return [...newFilters, filterId]
        }
      })
    }
  }

  const handleApply = () => {
    onApplyFilters(selectedFilters)
    onToggle()
  }

  const handleReset = () => {
    setSelectedFilters(['All'])
    onApplyFilters(['All'])
  }

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="mb-6 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filter Internships
      </Button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filter Internships
            </h3>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {filterOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(option.id)}
                  onChange={() => handleFilterToggle(option.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
                {option.count !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({option.count})
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              onClick={handleApply}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
