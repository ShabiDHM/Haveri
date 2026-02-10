// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V5.1 (GLOBAL YEAR SYNC)
// 1. FEATURE: Added 'selectedYear' to global state to drive multi-year intelligence.
// 2. SYNC: All hooks and components now share a unified Fiscal Year context.
// 3. STATUS: Fully synchronized.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, BusinessProfile, Workspace, LoginRequest, RegisterRequest } from '../data/types';
import { apiService, AUTH_TOKEN_KEY } from '../services/api';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  businessProfile: BusinessProfile | null;
  selectedYear: number; // PHOENIX: Global Year State
  setSelectedYear: (year: number) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshBusinessProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // PHOENIX: Defaults to current year, used by AI and Finance engines
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
    setWorkspace(null);
    setBusinessProfile(null);
  }, []);
  
  const loadInitialData = useCallback(async (): Promise<boolean> => {
    try {
      const [fullUser, profile, primaryWorkspace] = await Promise.all([
        apiService.fetchUserProfile(),
        apiService.getBusinessProfile(),
        apiService.getPrimaryWorkspace()
      ]);
      
      setUser(fullUser);
      setBusinessProfile(profile);
      setWorkspace(primaryWorkspace);
      return true;
    } catch (error) {
      console.error("Failed to load initial workspace data:", error);
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
        await loadInitialData();
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [logout, loadInitialData]); 

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loginPayload: LoginRequest = { username: email, password: password };
      await apiService.login(loginPayload);
      await loadInitialData();
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
    <AuthContext.Provider value={{ 
        user, 
        workspace, 
        businessProfile, 
        selectedYear,
        setSelectedYear,
        isAuthenticated: !!user, 
        login, 
        register, 
        logout, 
        isLoading, 
        refreshBusinessProfile 
    }}>
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