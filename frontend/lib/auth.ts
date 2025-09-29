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
  localStorage.removeItem('dataConsent'); // Clear privacy preferences on logout
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
  
  // Load privacy preferences after successful login
  loadPrivacyPreferences();
};

const loadPrivacyPreferences = async () => {
  try {
    const { userAPI } = await import('./api');
    const result = await userAPI.getPrivacyPreferences();
    
    if (result.success) {
      if (result.data_consent !== null) {
        localStorage.setItem('dataConsent', result.data_consent.toString());
      } else {
        localStorage.removeItem('dataConsent');
      }
    } else {
      // If no preferences in database, check localStorage for pending preferences
      const pendingConsent = localStorage.getItem('dataConsent');
      if (pendingConsent !== null) {
        try {
          await userAPI.updatePrivacyPreferences(pendingConsent === 'true');
        } catch (error) {
          console.error('Error saving pending privacy preferences:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error loading privacy preferences:', error);
    // Don't fail login if privacy preferences fail to load
  }
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