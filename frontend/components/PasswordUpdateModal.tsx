'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Button, Input, LoadingSpinner } from '@/components/ui'
import { userAPI } from '@/lib/api'
import PasswordInput from './PasswordInput'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'

interface PasswordUpdateModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PasswordUpdateModal({ isOpen, onClose }: PasswordUpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'verify' | 'update' | 'success'>('verify')
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    return ''
  }

  const validatePasswords = () => {
    const newErrors: {[key: string]: string} = {}

    // Validate old password
    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Current password is required'
    }

    // Validate new password
    const newPasswordError = validatePassword(formData.newPassword)
    if (newPasswordError) {
      newErrors.newPassword = newPasswordError
    }

    // Check if new password is different from old password
    if (formData.newPassword && formData.oldPassword && formData.newPassword === formData.oldPassword) {
      newErrors.newPassword = 'New password must be different from current password'
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.oldPassword) {
      setErrors({ oldPassword: 'Current password is required' })
      return
    }

    setIsLoading(true)

    try {
      // Test the old password by trying to update with the same password
      // This will fail if the old password is wrong
      const result = await userAPI.updatePassword(formData.oldPassword, formData.oldPassword)
      
      if (result.success) {
        // If we reach here, the old password is correct
        setStep('update')
        toast.success('Current password verified!')
      } else {
        setErrors({ oldPassword: 'Incorrect current password' })
      }
    } catch (error: any) {
      console.error('Password verification error:', error)
      if (error.response?.data?.detail) {
        setErrors({ oldPassword: error.response.data.detail })
      } else {
        setErrors({ oldPassword: 'Failed to verify password. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswords()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await userAPI.updatePassword(formData.oldPassword, formData.newPassword)
      
      if (result.success) {
        setStep('success')
        toast.success('Password updated successfully!')
        
        // Reset form and close modal after 2 seconds
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        toast.error(result.message || 'Failed to update password')
      }
    } catch (error: any) {
      console.error('Password update error:', error)
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail)
      } else {
        toast.error('Failed to update password. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('verify')
    setFormData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ overflow: 'hidden' }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'verify' && 'Verify Current Password'}
              {step === 'update' && 'Update Password'}
              {step === 'success' && 'Password Updated!'}
            </h2>
            {step !== 'success' && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Verify Password Step */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600">
                  Enter your current password to continue
                </p>
              </div>

              <div>
                <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <PasswordInput
                  id="oldPassword"
                  name="oldPassword"
                  placeholder="Enter your current password"
                  value={formData.oldPassword}
                  onChange={handleInputChange}
                  required
                />
                {errors.oldPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.oldPassword}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Verifying...</span>
                  </div>
                ) : (
                  'Verify Password'
                )}
              </Button>
            </form>
          )}

          {/* Update Password Step */}
          {step === 'update' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-gray-600">
                  Current password verified! Now enter your new password
                </p>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                />
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                )}
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Password Requirements:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• At least 6 characters long</li>
                    <li>• Different from your current password</li>
                  </ul>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Updating...</span>
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="w-full text-sm text-gray-600 hover:text-gray-700"
                >
                  ← Back to verification
                </button>
              </div>
            </form>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900">
                Password Updated Successfully!
              </h3>
              
              <p className="text-gray-600">
                Your password has been updated. You can now use your new password to log in.
              </p>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  This modal will close automatically in a moment...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
