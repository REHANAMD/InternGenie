'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { Button, Input, Select, Textarea, LoadingSpinner } from '@/components/ui'
import { authAPI, resumeAPI } from '@/lib/api'
import { setAuth } from '@/lib/auth'
import { Upload, FileText, X } from 'lucide-react'

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    education: '',
    location: '',
    phone: '',
    skills: '',
    experience_years: 0,
    linkedin: '',
    github: ''
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    setUploadedFile(file)
    toast.success('📄 Resume uploaded successfully! Click "Parse Resume" to extract information.')
  }, [])

  const handleParseResume = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a resume first')
      return
    }

    setIsParsingResume(true)

    try {
      const result = await resumeAPI.parseResume(uploadedFile)
      
      if (result.success && result.parsed_data) {
        const parsed = result.parsed_data
        
        // Auto-fill form with parsed data
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          email: parsed.email || prev.email,
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
        toast.error('❌ Failed to parse resume. Please try again or fill manually.')
      }
    } catch (error) {
      console.error('Resume parsing error:', error)
      toast.error('❌ Failed to parse resume. Please try again or fill manually.')
    } finally {
      setIsParsingResume(false)
    }
  }

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
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)

    try {
      const result = await authAPI.register(formData)

      if (result.success) {
        // Clear the form
        setFormData({
          name: '',
          email: '',
          password: '',
          education: '',
          location: '',
          phone: '',
          skills: '',
          experience_years: 0,
          linkedin: '',
          github: ''
        })
        setUploadedFile(null)
        
        toast.success('User registered successfully! Please login to continue.')
        onSwitchToLogin()
      } else {
        if (result.detail && result.detail.includes('already exists')) {
          toast.error('User already exists. Please login instead.')
          onSwitchToLogin()
        } else {
          toast.error(result.detail || 'Registration failed')
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.response?.data?.detail?.includes('already exists')) {
        toast.error('User already exists. Please login instead.')
        onSwitchToLogin()
      } else {
        toast.error('Connection error. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
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

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Your Account</h3>
      
      {/* Resume Upload Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">📄 Auto-fill with Resume (Optional)</h4>
        
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
                  {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX files only</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
            
            <Button
              type="button"
              onClick={handleParseResume}
              disabled={isParsingResume}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isParsingResume ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Parsing Resume...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Parse Resume
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
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
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
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

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
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

          <div>
            <label htmlFor="experience_years" className="block text-sm font-medium text-gray-700 mb-1">
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
        </div>

        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
            Skills (comma-separated)
          </label>
          <Textarea
            id="skills"
            name="skills"
            placeholder="e.g., Product Management, SQL, Python, JIRA, Analytics"
            rows={3}
            value={formData.skills}
            onChange={handleInputChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Profile (optional)
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
              GitHub Profile (optional)
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

        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Creating account...</span>
            </div>
          ) : (
            'Sign Up'
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  )
}