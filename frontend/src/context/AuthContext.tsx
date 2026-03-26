// FILE: src/context/AuthContext.tsx
// PHOENIX PROTOCOL - AUTHENTICATION CONTEXT V6.2 (TYPE SAFE)
// 1. FIXED: TypeScript error in refreshWorkspaces by ensuring only Workspace | null is passed to setWorkspace.
// 2. STATUS: Build-ready.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, BusinessProfile, Workspace, LoginRequest, RegisterRequest } from '../data/types';
import { apiService, AUTH_TOKEN_KEY } from '../services/api';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  businessProfile: BusinessProfile | null;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshBusinessProfile: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SELECTED_WORKSPACE_KEY = 'selected_workspace_id';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
    setBusinessProfile(null);
    localStorage.removeItem(SELECTED_WORKSPACE_KEY);
  }, []);

  const loadWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const allWorkspaces = await apiService.getWorkspaces();
      setWorkspaces(allWorkspaces);
      return allWorkspaces;
    } catch (error) {
      console.error("Failed to load workspaces:", error);
      return [];
    }
  }, []);

  const loadInitialData = useCallback(async (): Promise<boolean> => {
    try {
      const [fullUser, profile, allWorkspaces] = await Promise.all([
        apiService.fetchUserProfile(),
        apiService.getBusinessProfile(),
        loadWorkspaces()
      ]);

      setUser(fullUser);
      setBusinessProfile(profile);
      setWorkspaces(allWorkspaces);

      // Determine which workspace to select:
      let selected: Workspace | null = null;
      const storedId = localStorage.getItem(SELECTED_WORKSPACE_KEY);
      if (storedId && allWorkspaces.some(ws => ws.id === storedId)) {
        selected = allWorkspaces.find(ws => ws.id === storedId) ?? null;
      } else if (allWorkspaces.length > 0) {
        selected = allWorkspaces[0];
        if (selected) localStorage.setItem(SELECTED_WORKSPACE_KEY, selected.id);
      }

      setWorkspace(selected);
      return true;
    } catch (error) {
      console.error("Failed to load initial workspace data:", error);
      logout();
      return false;
    }
  }, [logout, loadWorkspaces]);

  const refreshWorkspaces = useCallback(async () => {
    const newWorkspaces = await loadWorkspaces();
    // If the currently selected workspace is not in the new list, reset selection
    if (workspace && !newWorkspaces.some(ws => ws.id === workspace.id)) {
      const newSelected = newWorkspaces.length > 0 ? newWorkspaces[0] : null;
      setWorkspace(newSelected);
      if (newSelected) localStorage.setItem(SELECTED_WORKSPACE_KEY, newSelected.id);
      else localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
  }, [loadWorkspaces, workspace]);

  const setCurrentWorkspace = useCallback(async (workspaceId: string) => {
    const newWorkspace = workspaces.find(ws => ws.id === workspaceId) ?? null;
    setWorkspace(newWorkspace);
    if (newWorkspace) localStorage.setItem(SELECTED_WORKSPACE_KEY, workspaceId);
    else localStorage.removeItem(SELECTED_WORKSPACE_KEY);
  }, [workspaces]);

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
          <h2 className="text-xl font-bold text-text-inverse">Haveri AI</h2>
          <p className="text-sm text-gray-400 mt-2">Duke u ngarkuar...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        workspaces,
        businessProfile,
        selectedYear,
        setSelectedYear,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        isLoading,
        refreshBusinessProfile,
        setCurrentWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;