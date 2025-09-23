import axios, { AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';

// API base URL - will proxy through Next.js to FastAPI backend
const API_BASE_URL = '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        toast.error('Session expired. Please login again.');
        window.location.href = '/';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  education?: string;
  skills?: string;
  location?: string;
  experience_years: number;
  phone?: string;
  linkedin?: string;
  github?: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
  education?: string;
  skills?: string;
  location?: string;
  experience_years?: number;
  phone?: string;
  linkedin?: string;
  github?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  detail?: string;
}

export interface Internship {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string;
  preferred_skills?: string;
  duration: string;
  stipend: string;
  min_education?: string;
  experience_required: number;
  is_active: boolean;
}

export interface Recommendation {
  internship_id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string;
  preferred_skills?: string;
  duration: string;
  stipend: string;
  score: number;
  explanation: string;
  matched_skills: string[];
  skill_gaps: string[];
  is_saved?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  detail?: string;
}

export interface RecommendationsResponse {
  success: boolean;
  count: number;
  recommendations: Recommendation[];
}

export interface SavedInternshipsResponse {
  success: boolean;
  count: number;
  internships: Internship[];
}

export interface Application {
  id: number;
  candidate_id: number;
  internship_id: number;
  applied_at: string;
  status: 'pending' | 'accepted' | 'withdrawn' | 'rejected';
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string;
  preferred_skills?: string;
  duration: string;
  stipend: string;
}

export interface ApplicationsResponse {
  success: boolean;
  count: number;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  applications: Application[];
}

// API Functions
export const authAPI = {
  login: async (credentials: UserLogin): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: UserRegistration): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }
};

export const userAPI = {
  getProfile: async (): Promise<{ success: boolean; profile: User }> => {
    const response = await apiClient.get('/candidates/profile');
    return response.data;
  },

  updateProfile: async (profileData: Partial<User> & { current_password: string }): Promise<{ success: boolean; profile: User; message: string }> => {
    const response = await apiClient.put('/candidates/profile', profileData);
    return response.data;
  },

  uploadResume: async (file: File): Promise<{ success: boolean; parsed_data: any; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/candidates/upload_resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export const resumeAPI = {
  parseResume: async (file: File): Promise<{ success: boolean; parsed_data: any; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/parse_resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export const internshipAPI = {
  getAll: async (limit = 20, offset = 0): Promise<{ success: boolean; total: number; internships: Internship[] }> => {
    const response = await apiClient.get(`/internships?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; internship: Internship }> => {
    const response = await apiClient.get(`/internships/${id}`);
    return response.data;
  },

  save: async (internshipId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/internships/${internshipId}/save`);
    return response.data;
  },

  unsave: async (internshipId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/internships/${internshipId}/save`);
    return response.data;
  },

  getSaved: async (): Promise<SavedInternshipsResponse> => {
    const response = await apiClient.get('/saved-internships');
    return response.data;
  }
};

export const recommendationAPI = {
  get: async (limit = 5, useCache = true): Promise<RecommendationsResponse> => {
    const response = await apiClient.get(`/recommendations?limit=${limit}&use_cache=${useCache}`);
    return response.data;
  }
};

export const applicationAPI = {
  apply: async (internshipId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/applications/${internshipId}/apply`);
    return response.data;
  },

  getAll: async (limit = 20, offset = 0, status?: string, search?: string): Promise<ApplicationsResponse> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/applications?${params.toString()}`);
    return response.data;
  },

  updateStatus: async (applicationId: number, status: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put(`/applications/${applicationId}/status`, { status });
    return response.data;
  },

  checkApplied: async (internshipId: number): Promise<{ success: boolean; applied: boolean }> => {
    const response = await apiClient.get(`/internships/${internshipId}/applied`);
    return response.data;
  },

  withdraw: async (applicationId: number): Promise<{ success: boolean; message: string; internship_id?: number }> => {
    const response = await apiClient.delete(`/applications/${applicationId}/withdraw`);
    return response.data;
  },

  getDetails: async (applicationId: number): Promise<{ success: boolean; application?: Application; message?: string }> => {
    const response = await apiClient.get(`/applications/${applicationId}/details`);
    return response.data;
  },

  getStatusByInternship: async (internshipId: number): Promise<{ success: boolean; status: string; application_id?: number }> => {
    const response = await apiClient.get(`/internships/${internshipId}/application-status`);
    return response.data;
  }
};

export const profileAPI = {
  update: async (profileData: any): Promise<{ success: boolean; message: string; profile?: any }> => {
    const response = await apiClient.put('/candidates/profile', profileData);
    return response.data;
  },

  delete: async (password: string, emailVerification: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete('/candidates/profile', {
      data: { password, email_verification: emailVerification }
    });
    return response.data;
  }
};

export const insightsAPI = {
  getUserInsights: async (): Promise<any> => {
    const response = await apiClient.get('/user-insights');
    return response.data;
  },

  getMarketInsights: async (): Promise<any> => {
    const response = await apiClient.get('/market-insights');
    return response.data;
  },

  getTrendingSkills: async (limit: number = 10): Promise<{ trending_skills: any[] }> => {
    const response = await apiClient.get(`/trending-skills?limit=${limit}`);
    return response.data;
  },

  trackBehavior: async (action: string, internshipId: number, metadata: any = {}): Promise<{ message: string }> => {
    const response = await apiClient.post('/track-behavior', {
      action,
      internship_id: internshipId,
      metadata
    });
    return response.data;
  }
};

export const utilityAPI = {
  seedData: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/seed_data');
    return response.data;
  },

  generateSampleData: async (): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await apiClient.post('/generate-sample-data');
    return response.data;
  },

  resetInsightsData: async (): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await apiClient.post('/reset-insights-data');
    return response.data;
  },

  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

export default apiClient;