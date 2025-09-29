'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import Navbar from '@/components/Navbar'
import { Button, Input, Select, Textarea, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui'
import { useAuth, clearAllData } from '@/lib/auth'
import { userAPI, resumeAPI, profileAPI, User } from '@/lib/api'
import { formatSkillsList } from '@/lib/utils'
import { 
  ArrowLeft,
  Upload, 
  FileText, 
  X, 
  Save,
  User as UserIcon,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Phone,
  Linkedin,
  Github,
  Key,
  Shield
} from 'lucide-react'
import PasswordUpdateModal from '@/components/PasswordUpdateModal'
import PrivacyAgreementModal from '@/components/PrivacyAgreementModal'

export default function ProfilePage() {
  const router = useRouter()
  const { user, authenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [dataConsent, setDataConsent] = useState<boolean | null>(null)
  const [deleteData, setDeleteData] = useState({
    password: '',
    emailVerification: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    education: '',
    location: '',
    phone: '',
    experience_years: 0,
    skills: '',
    linkedin: '',
    github: '',
    current_password: ''
  })

  useEffect(() => {
    if (!authenticated) {
      router.push('/')
      return
    }
  }, [authenticated, router])

  // Initialize form data only once when user is available
  useEffect(() => {
    if (user && !formData.name) { // Only set if form is empty
      setFormData({
        name: user.name || '',
        education: user.education || '',
        location: user.location || '',
        phone: user.phone || '',
        experience_years: user.experience_years || 0,
        skills: user.skills || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        current_password: ''
      })
    }
  }, [user])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    setUploadedFile(file)
    setIsParsingResume(true)

    try {
      const result = await userAPI.uploadResume(file)
      
      if (result.success && result.parsed_data) {
        const parsed = result.parsed_data
        
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          education: parsed.education || prev.education,
          location: parsed.location || prev.location,
          phone: parsed.phone || prev.phone,
          skills: parsed.skills || prev.skills,
          linkedin: parsed.linkedin || prev.linkedin,
          github: parsed.github || prev.github,
          experience_years: parsed.experience_years || prev.experience_years
        }))
        
        toast.success('✅ Resume parsed successfully! Form has been auto-filled.')
      } else {
        toast.error('❌ Failed to parse resume. Please try again.')
      }
    } catch (error) {
      console.error('Resume parsing error:', error)
      toast.error('❌ Failed to parse resume. Please try again.')
    } finally {
      setIsParsingResume(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    maxFiles: 1,
    disabled: isParsingResume
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.current_password) {
      toast.error('Current password is required to update profile')
      return
    }

    setIsLoading(true)

    try {
      const result = await userAPI.updateProfile(formData)

      if (result.success) {
        // Update auth context with new user data
        localStorage.setItem('user_data', JSON.stringify(result.profile))
        
        toast.success('Profile updated successfully! Redirecting to dashboard...')
        setFormData(prev => ({ ...prev, current_password: '' }))
        
        // Set flag for dashboard to show special message
        sessionStorage.setItem('profileUpdated', 'true')
        
        // Redirect to dashboard after successful update
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        toast.error(result.message || 'Failed to update profile')
      }
    } catch (error: any) {
      console.error('Profile update error:', error)
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail)
      } else {
        toast.error('Failed to update profile. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!deleteData.password || !deleteData.emailVerification) {
      toast.error('Please fill in all fields')
      return
    }

    setIsDeleting(true)

    try {
      const result = await profileAPI.delete(deleteData.password, deleteData.emailVerification)

      if (result.success) {
        toast.success('Profile deleted successfully!')
        
        // Clear all data and redirect to login
        clearAllData()
        
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        toast.error(result.message || 'Failed to delete profile')
      }
    } catch (error: any) {
      console.error('Profile deletion error:', error)
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail)
      } else {
        toast.error('Failed to delete profile. Please try again.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getEmailVerificationHint = () => {
    if (!user?.email) return ''
    const emailPrefix = user.email.split('@')[0]
    return emailPrefix.length >= 5 ? emailPrefix.slice(-5) : emailPrefix
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience_years' ? parseInt(value) || 0 : value
    }))
  }


  const removeFile = () => {
    setUploadedFile(null)
  }

  const handlePrivacyPreferences = async (consent: boolean) => {
    try {
      const result = await userAPI.updatePrivacyPreferences(consent)
      
      if (result.success) {
        setDataConsent(consent)
        if (consent !== null) {
          localStorage.setItem('dataConsent', consent.toString())
        } else {
          localStorage.removeItem('dataConsent')
        }
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('privacyPreferencesUpdated', { 
          detail: { dataConsent: consent } 
        }))
        
        toast.success(consent ? 'Data sharing enabled' : 'Data sharing disabled')
      } else {
        toast.error('Failed to update privacy preferences')
      }
    } catch (error) {
      console.error('Error updating privacy preferences:', error)
      toast.error('Failed to update privacy preferences')
    }
  }

  // Load consent status on component mount
  useEffect(() => {
    const loadPrivacyPreferences = async () => {
      try {
        const result = await userAPI.getPrivacyPreferences()
        
        if (result.success) {
          setDataConsent(result.data_consent)
          if (result.data_consent !== null) {
            localStorage.setItem('dataConsent', result.data_consent.toString())
          } else {
            localStorage.removeItem('dataConsent')
          }
        }
      } catch (error) {
        console.error('Error loading privacy preferences:', error)
        // Fallback to localStorage if API fails
        const consent = localStorage.getItem('dataConsent')
        if (consent !== null) {
          setDataConsent(consent === 'true')
        }
      }
    }
    
    loadPrivacyPreferences()
  }, [])

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const userSkills = formatSkillsList(formData.skills)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
        {/* Fixed Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 p-0 h-auto font-normal text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📝 Update Your Profile
          </h1>
          <p className="text-gray-600">
            Keep your information up to date for better internship recommendations
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Scrollable Form */}
          <div className="lg:col-span-2">
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-4">
              {/* Main Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Resume Upload Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      📄 Auto-fill with Resume (Optional)
                    </h4>
                    
                    {!uploadedFile ? (
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          isDragActive 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        } ${isParsingResume ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input {...getInputProps()} />
                        {isParsingResume ? (
                          <div className="flex flex-col items-center">
                            <LoadingSpinner />
                            <p className="mt-2 text-sm text-gray-600">Parsing your resume...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              {isDragActive ? 'Drop your resume here' : 'Upload resume to auto-fill form'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX files only</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">{uploadedFile.name}</span>
                        </div>
                        <button
                          onClick={removeFile}
                          className="text-red-500 hover:text-red-700"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Profile Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          <UserIcon className="h-4 w-4 inline mr-1" />
                          Full Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                          <GraduationCap className="h-4 w-4 inline mr-1" />
                          Education
                        </label>
                        <Select
                          id="education"
                          name="education"
                          value={formData.education}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Education</option>
                          <option value="High School">High School</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Bachelor's">Bachelor's</option>
                          <option value="Master's">Master's</option>
                          <option value="PhD">PhD</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          Location
                        </label>
                        <Input
                          id="location"
                          name="location"
                          placeholder="e.g., Bangalore"
                          value={formData.location}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          <Phone className="h-4 w-4 inline mr-1" />
                          Phone
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="experience_years" className="block text-sm font-medium text-gray-700 mb-1">
                        <Briefcase className="h-4 w-4 inline mr-1" />
                        Years of Experience
                      </label>
                      <Input
                        id="experience_years"
                        name="experience_years"
                        type="number"
                        min="0"
                        max="50"
                        value={formData.experience_years}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                        Skills (comma-separated)
                      </label>
                      <Textarea
                        id="skills"
                        name="skills"
                        placeholder="e.g., Product Management, SQL, Python, JIRA, Analytics"
                        rows={4}
                        value={formData.skills}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your skills separated by commas for better recommendations
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                          <Linkedin className="h-4 w-4 inline mr-1" />
                          LinkedIn Profile
                        </label>
                        <Input
                          id="linkedin"
                          name="linkedin"
                          placeholder="linkedin.com/in/yourprofile"
                          value={formData.linkedin}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-1">
                          <Github className="h-4 w-4 inline mr-1" />
                          GitHub Profile
                        </label>
                        <Input
                          id="github"
                          name="github"
                          placeholder="github.com/yourprofile"
                          value={formData.github}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password (required to save changes)
                        </label>
                        <Input
                          id="current_password"
                          name="current_password"
                          type="password"
                          placeholder="Enter your current password"
                          value={formData.current_password}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Saving...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Save className="h-4 w-4 mr-2" />
                            Save Profile
                          </div>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Delete Profile
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
            </div>
          </div>

          {/* Right Sidebar - Fixed */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Security Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Password Update Section */}
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Keep your account secure by updating your password regularly
                    </p>
                    <Button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>
                  
                  {/* Privacy Preferences Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-600">
                        Manage your data sharing preferences for personalized insights
                      </p>
                      {dataConsent !== null && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          dataConsent 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dataConsent ? 'Data Sharing: ON' : 'Data Sharing: OFF'}
                        </span>
                      )}
                      {dataConsent === null && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          Privacy Settings Required
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => setShowPrivacyModal(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Change Privacy Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Preview Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{formData.name || 'Not set'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Education</p>
                    <p className="font-medium">{formData.education || 'Not set'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{formData.location || 'Not set'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Experience</p>
                    <p className="font-medium">{formData.experience_years} years</p>
                  </div>

                  {userSkills.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Skills ({userSkills.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {userSkills.slice(0, 8).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {userSkills.length > 8 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{userSkills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>© 2025 Tech-o-Vation Solutions, pvt. ltd., All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Delete Profile Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Profile
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Warning: This action cannot be undone
                    </h4>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      This will permanently delete your profile and all associated data including:
                    </p>
                    <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                      <li>All applications</li>
                      <li>Saved internships</li>
                      <li>Recommendation history</li>
                      <li>Profile information</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={deleteData.password}
                    onChange={(e) => setDeleteData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Verification
                  </label>
                  <Input
                    type="text"
                    value={deleteData.emailVerification}
                    onChange={(e) => setDeleteData(prev => ({ ...prev, emailVerification: e.target.value }))}
                    placeholder="Enter last 5 letters of email before @"
                    className="w-full"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter the last 5 letters before @ in your email address
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteProfile}
                  disabled={isDeleting || !deleteData.password || !deleteData.emailVerification}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400"
                >
                  {isDeleting ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Deleting...</span>
                    </div>
                  ) : (
                    'Delete Profile'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Update Modal */}
      <PasswordUpdateModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      
      {/* Privacy Agreement Modal */}
      <PrivacyAgreementModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onSavePreferences={handlePrivacyPreferences}
        initialChoice={dataConsent}
      />
    </div>
  )
}