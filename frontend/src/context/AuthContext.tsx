// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V4.4 (INTERCEPTOR RELIANCE)
// 1. ARCHITECTURAL FIX: Removed the proactive `refreshToken()` call from the initial application load sequence.
// 2. REASON: The previous logic created a race condition where a failed refresh on startup would de-authenticate the application, causing subsequent API calls to fail with a 401 error.
// 3. CORRECTED LOGIC: The app now correctly trusts the access token from localStorage first. It immediately attempts to load user data, relying on the robust Axios interceptor to automatically handle token refreshing only when necessary (i.e., when an API call fails with a 401). This permanently resolves the regression.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, BusinessProfile, LoginRequest, RegisterRequest } from '../data/types';
import { apiService } from '../services/api';
import { Loader2 } from 'lucide-react';

type AuthUser = User;

interface AuthContextType {
  user: AuthUser | null;
  businessProfile: BusinessProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshBusinessProfile: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'haveri_access_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    apiService.setToken(null); // PHOENIX: Ensure apiService token is also cleared
    setUser(null);
    setBusinessProfile(null);
  }, []);
  
  const loadUserAndProfile = useCallback(async (): Promise<boolean> => {
    try {
      const [fullUser, profile] = await Promise.all([
        apiService.fetchUserProfile(),
        apiService.getBusinessProfile()
      ]);
      setUser(fullUser);
      setBusinessProfile(profile);
      return true;
    } catch (error) {
      console.error("Failed to load user and profile (likely an invalid token):", error);
      logout();
      return false;
    }
  }, [logout]);

  const refreshBusinessProfile = useCallback(async () => {
    try {
        const profile = await apiService.getBusinessProfile();
        setBusinessProfile(profile);
    } catch (error) {
        console.error("Failed to refresh business profile:", error);
    }
  }, []);

  useEffect(() => {
    apiService.setLogoutHandler(logout);

    const initializeApp = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      
      // PHOENIX: Set the token and immediately try to use it.
      // Let the Axios interceptor handle refreshing automatically if the token is expired.
      apiService.setToken(storedToken);

      try {
        await loadUserAndProfile();
      } catch (error) {
        // This catch is for unexpected errors during load, as token errors are handled inside loadUserAndProfile
        console.error("Critical error during app initialization:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [logout, loadUserAndProfile]); 

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loginPayload: LoginRequest = { username: email, password: password };
      const response = await apiService.login(loginPayload);
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      apiService.setToken(response.access_token); // Ensure the service has the new token immediately
      
      await loadUserAndProfile();

    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    await apiService.register(data);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white">Haveri AI</h2>
                <p className="text-sm text-gray-400 mt-2">Duke u ngarkuar...</p>
            </div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, businessProfile, isAuthenticated: !!user, login, register, logout, isLoading, refreshBusinessProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};

export default AuthContext;