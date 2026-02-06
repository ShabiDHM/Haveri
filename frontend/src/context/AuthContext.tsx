// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V4.5 (STORAGE ALIGNMENT)
// 1. FIXED: Imported AUTH_TOKEN_KEY from api.ts to ensure identical storage keys.
// 2. STATUS: Fully synchronized.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, BusinessProfile, LoginRequest, RegisterRequest } from '../data/types';
import { apiService, AUTH_TOKEN_KEY } from '../services/api';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    // PHOENIX: apiService.logout() now clears the TokenManager AND localStorage
    apiService.logout();
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
      // PHOENIX: Rely on centralized Key from API service
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      
      // PHOENIX: Set the token. TokenManager will handle persistence checks.
      apiService.setToken(storedToken);

      try {
        await loadUserAndProfile();
      } catch (error) {
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
      // PHOENIX: apiService.login internally calls tokenManager.set(), which saves to localStorage
      await apiService.login(loginPayload);
      
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