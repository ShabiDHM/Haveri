// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V4.0 (BRANDING AWARE)
// 1. MODIFIED: Context now fetches and stores BusinessProfile alongside the User object.
// 2. MODIFIED: The AuthContextType interface is updated to expose 'businessProfile'.
// 3. LOGIC: On login or refresh, both user and business profiles are fetched and provided to the app.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, BusinessProfile, LoginRequest, RegisterRequest } from '../data/types';
import { apiService } from '../services/api';
import { Loader2 } from 'lucide-react';

type AuthUser = User;

interface AuthContextType {
  user: AuthUser | null;
  businessProfile: BusinessProfile | null; // PHOENIX: Added businessProfile
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AUTH_TOKEN_KEY = 'haveri_access_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null); // PHOENIX: Added state for profile
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    apiService.logout(); 
    setUser(null);
    setBusinessProfile(null); // PHOENIX: Clear business profile on logout
  }, []);

  useEffect(() => {
    apiService.setLogoutHandler(logout);
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
            apiService.setToken(storedToken);
        }

        const refreshed = await apiService.refreshToken();
        
        if (refreshed) {
            // PHOENIX: Fetch both user and business profile
            const [fullUser, profile] = await Promise.all([
                apiService.fetchUserProfile(),
                apiService.getBusinessProfile() 
            ]);

            const newAccessToken = apiService.getToken();
            if (newAccessToken) {
                localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
            }
            if (isMounted) {
                setUser(fullUser);
                setBusinessProfile(profile);
            }
        } else {
            logout();
        }
      } catch (error) {
        console.error("Session initialization failed:", error);
        if (isMounted) logout();
      } finally {
        if (isMounted) setIsLoading(false);
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
      
      // PHOENIX: Fetch both user and business profile after login
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
    <AuthContext.Provider value={{ user, businessProfile, isAuthenticated: !!user, login, register, logout, isLoading }}>
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