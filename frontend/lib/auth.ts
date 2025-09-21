import { User } from './api';

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = (): boolean => {
  return !!(getStoredToken() && getStoredUser());
};

export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('dashboardState');
  sessionStorage.removeItem('freshLogin');
  sessionStorage.removeItem('profileUpdated');
};

export const clearAllData = (): void => {
  if (typeof window === 'undefined') return;
  
  // Clear all auth data
  clearAuth();
  
  // Clear any other app data
  localStorage.clear();
  sessionStorage.clear();
};

export const setAuth = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_data', JSON.stringify(user));
};

// Custom hook for authentication state
export const useAuth = () => {
  const user = getStoredUser();
  const token = getStoredToken();
  const authenticated = isAuthenticated();

  return {
    user,
    token,
    authenticated,
    login: setAuth,
    logout: clearAuth
  };
};