'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { 
  X, 
  Filter, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building,
  Star,
  Check
} from 'lucide-react'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: FilterState) => void
}

interface FilterState {
  location: string[]
  duration: string[]
  stipendRange: string[]
  company: string[]
  skills: string[]
}

const LOCATIONS = ['Remote', 'Hybrid', 'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai']
const DURATIONS = ['1-3 months', '3-6 months', '6+ months', 'Flexible']
const STIPEND_RANGES = ['Unpaid', '0-5k', '5k-15k', '15k-30k', '30k+']
const COMPANIES = ['Startup', 'MNC', 'Unicorn', 'Government', 'NGO']

export default function FilterPanel({ isOpen, onClose, onApplyFilters }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    location: [],
    duration: [],
    stipendRange: [],
    company: [],
    skills: []
  })

  const handleFilterChange = (category: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }))
  }

  const handleApply = () => {
    onApplyFilters(filters)
    onClose()
  }

  const handleClear = () => {
    setFilters({
      location: [],
      duration: [],
      stipendRange: [],
      company: [],
      skills: []
    })
  }

  const FilterSection = ({ 
    title, 
    icon: Icon, 
    category, 
    options 
  }: { 
    title: string
    icon: any
    category: keyof FilterState
    options: string[]
  }) => (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <Icon className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => handleFilterChange(category, option)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filters[category].includes(option)
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <span>{option}</span>
            {filters[category].includes(option) && (
              <Check className="h-4 w-4" />
            )}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 glass-panel z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Filter className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                </div>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Sections */}
              <div className="space-y-6">
                <FilterSection
                  title="Location"
                  icon={MapPin}
                  category="location"
                  options={LOCATIONS}
                />
                
                <FilterSection
                  title="Duration"
                  icon={Clock}
                  category="duration"
                  options={DURATIONS}
                />
                
                <FilterSection
                  title="Stipend Range"
                  icon={DollarSign}
                  category="stipendRange"
                  options={STIPEND_RANGES}
                />
                
                <FilterSection
                  title="Company Type"
                  icon={Building}
                  category="company"
                  options={COMPANIES}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-8">
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
