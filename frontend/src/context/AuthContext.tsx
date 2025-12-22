// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V3.0 (STATE PERSISTENCE)
// 1. FIX: The login function now explicitly saves the access token to localStorage.
// 2. LOGIC: The initialization logic will now try to load from localStorage first. This prevents the mobile redirect race condition by making the session synchronous after a reload.
// 3. BRANDING: Updated loading screen text from "Juristi AI" to "Haveri AI".

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, LoginRequest, RegisterRequest } from '../data/types';
import { apiService } from '../services/api';
import { Loader2 } from 'lucide-react';

type AuthUser = User;

interface AuthContextType {
  user: AuthUser | null;
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
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    apiService.logout(); 
    setUser(null);
  }, []);

  useEffect(() => {
    apiService.setLogoutHandler(logout);
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // PHOENIX FIX: Synchronous Check First
        // Attempt to load token from localStorage immediately.
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
            apiService.setToken(storedToken); // Immediately arm the apiService
        }

        // Proactively try to refresh the token using the HttpOnly cookie.
        const refreshed = await apiService.refreshToken();
        
        if (refreshed) {
            // If refresh succeeded, we have a valid token. Fetch user.
            const fullUser = await apiService.fetchUserProfile();
            // Persist the new token from the refresh
            const newAccessToken = apiService.getToken();
            if (newAccessToken) {
                localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
            }
            if (isMounted) setUser(fullUser);
        } else {
            // If refresh failed, we are logged out.
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
      
      // PHOENIX FIX: Persist the token immediately after login
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      
      const fullUser = await apiService.fetchUserProfile();
      setUser(fullUser);

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, isLoading }}>
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