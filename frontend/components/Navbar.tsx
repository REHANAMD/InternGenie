'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { authAPI } from '@/lib/api'
import { generateGreeting } from '@/lib/utils'
import { User, LogOut, Home, Heart, Settings, Menu, X, FileText } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      authAPI.logout()
      logout()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  if (!user) return null

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 glass-navbar rounded-full px-6 py-3 shadow-xl">
      <div className="flex justify-between items-center">
        {/* Logo and Brand */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-gray-900">InternGenie</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          <Link 
            href="/dashboard"
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/50 transition-all duration-200 hover:scale-105"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            href="/saved"
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/50 transition-all duration-200 hover:scale-105"
          >
            <Heart className="h-4 w-4" />
            <span>Saved</span>
          </Link>
          
          <Link 
            href="/applications"
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/50 transition-all duration-200 hover:scale-105"
          >
            <FileText className="h-4 w-4" />
            <span>Applications</span>
          </Link>
          
          <Link 
            href="/profile"
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/50 transition-all duration-200 hover:scale-105"
          >
            <Settings className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </div>

        {/* User Menu */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/30">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 hover:scale-105"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2">
          <div className="px-4 pt-4 pb-4 space-y-2 glass-panel rounded-2xl mx-2">
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{generateGreeting(user.name)}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              href="/saved"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Heart className="h-5 w-5" />
              <span>Saved Internships</span>
            </Link>
            
            <Link
              href="/applications"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FileText className="h-5 w-5" />
              <span>Applications</span>
            </Link>
            
            <Link
              href="/profile"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Settings className="h-5 w-5" />
              <span>Profile Settings</span>
            </Link>
            
            <button
              onClick={() => {
                handleLogout()
                setIsMobileMenuOpen(false)
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}