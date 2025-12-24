// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V4.3 (STATE SYNCHRONIZATION)
// 1. RE-ARCHITECTED: Created a single 'loadUserAndProfile' function to be the single source of truth for fetching session data.
// 2. ENFORCED: This function is now used by both the initial app load and the login process, guaranteeing data consistency.
// 3. FIX: This eliminates the race condition where a stale or incomplete businessProfile could be set, resolving the "Zyra Ligjore" fallback issue permanently.

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
  
  // PHOENIX: This is now the single source of truth for fetching user and profile data.
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
      console.error("Failed to load user and profile:", error);
      // On failure, ensure a clean state by logging out.
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
      
      apiService.setToken(storedToken);

      try {
        const refreshed = await apiService.refreshToken();
        if (refreshed) {
          // Use the single source of truth to load data.
          await loadUserAndProfile();
        } else {
          logout();
        }
      } catch (error) {
        console.error("Session initialization failed:", error);
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
      
      // Use the single source of truth to load data after login.
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