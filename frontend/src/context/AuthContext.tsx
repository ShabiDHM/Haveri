// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V4.2 (ATOMIC INITIALIZATION)
// 1. MODIFIED: Refactored the 'initializeApp' function for more robust, atomic state updates.
// 2. LOGIC: Ensures that user and businessProfile are only set after all data is successfully fetched.
// 3. FIX: On any authentication failure, it now forces a clean logout, preventing the display of stale or fallback data.

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
    apiService.logout(); 
    setUser(null);
    setBusinessProfile(null);
  }, []);

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
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      setIsLoading(true); // Ensure loading state is true at the start of initialization
      try {
        // PHOENIX: This logic remains the same - check for a token and try to refresh it.
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
            apiService.setToken(storedToken);
        }

        const refreshed = await apiService.refreshToken();
        
        // PHOENIX: This is the critical change. We only proceed if refresh is successful.
        if (refreshed && isMounted) {
            // Fetch both user and profile together. If one fails, the whole block fails.
            const [fullUser, profile] = await Promise.all([
                apiService.fetchUserProfile(),
                apiService.getBusinessProfile() 
            ]);

            // Save the new token that was acquired during the refresh
            const newAccessToken = apiService.getToken();
            if (newAccessToken) {
                localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
            }

            // Atomically update the state only after all data is successfully fetched
            if (isMounted) {
                setUser(fullUser);
                setBusinessProfile(profile);
            }
        } else if (isMounted) {
            // If the refresh fails for any reason, perform a clean logout.
            logout();
        }
      } catch (error) {
        // If any part of the process fails (network error, etc.), ensure a clean logout state.
        console.error("Session initialization failed:", error);
        if (isMounted) {
            logout();
        }
      } finally {
        // Always set loading to false at the very end.
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    initializeApp();
    
    return () => { isMounted = false; };
  }, [logout]); 

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loginPayload: LoginRequest = { 
          username: email, 
          password: password 
      };

      const response = await apiService.login(loginPayload);
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      
      const [fullUser, profile] = await Promise.all([
        apiService.fetchUserProfile(),
        apiService.getBusinessProfile()
      ]);

      setUser(fullUser);
      setBusinessProfile(profile);

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