'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Button, Input, LoadingSpinner } from '@/components/ui'
import { authAPI } from '@/lib/api'
import { setAuth } from '@/lib/auth'
import PasswordInput from './PasswordInput'

interface LoginFormProps {
  onSwitchToSignup: () => void
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)

    try {
      const result = await authAPI.login(formData)

      if (result.success && result.token && result.user) {
        setAuth(result.token, result.user)
        sessionStorage.setItem('freshLogin', 'true') // Mark as fresh login
        toast.success('Login successful!')
        router.push('/dashboard')
      } else {
        toast.error(result.detail || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail)
      } else {
        toast.error('Connection error. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Welcome Back!</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Signing in...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  )
}