'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, CardContent } from '@/components/ui'
import { Filter, X, Check } from 'lucide-react'

interface ApplicationFiltersProps {
  onApplyFilters: (filters: string[] | string) => void
  isOpen: boolean
  onToggle: () => void
  totalCount: number
  acceptedCount: number
  withdrawnCount: number
}

export default function ApplicationFilters({ 
  onApplyFilters, 
  isOpen, 
  onToggle, 
  totalCount,
  acceptedCount,
  withdrawnCount
}: ApplicationFiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['All'])

  const filterOptions = [
    { id: 'All', label: 'All Applications', count: totalCount },
    { id: 'accepted', label: 'Accepted', count: acceptedCount },
    { id: 'withdrawn', label: 'Withdrawn', count: withdrawnCount }
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
    // For backward compatibility, pass the first selected filter as a string
    // or the array if multiple filters are supported
    if (selectedFilters.length === 1) {
      onApplyFilters(selectedFilters[0])
    } else {
      onApplyFilters(selectedFilters)
    }
    onToggle()
  }

  const handleReset = () => {
    setSelectedFilters(['All'])
    onApplyFilters('All')
  }

  if (!isOpen) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-40 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filter Applications
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

        <div className="space-y-4">
          {filterOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(option.id)}
                  onChange={() => handleFilterToggle(option.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {option.count}
                </span>
                {selectedFilters.includes(option.id) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={handleApply}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Filters
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset All
          </Button>
        </div>

        {/* Filter Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                {filter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
