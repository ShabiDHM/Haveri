// FILE: src/App.tsx
// HAVERI AI - ROUTER V3.0 (CLEAN INTELLIGENCE SUITE)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './pages/MainLayout';

// Core Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import SupportPage from './pages/SupportPage';
import LandingPage from './pages/LandingPage';
import BusinessPage from './pages/BusinessPage';
import AccountPage from './pages/AccountPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ClientPortalPage from './pages/ClientPortalPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import MobileUploadPage from './pages/MobileUploadPage';
import { ProfileTab } from './components/business/ProfileTab';
import ProjectsDashboardPage from './pages/ProjectsDashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-start"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-start"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role?.toUpperCase() !== 'ADMIN') return <Navigate to="/business/insights" />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/business/insights" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/business/insights" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/business/insights" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/portal/:workspaceId" element={<ClientPortalPage />} />

      {/* Standalone Protected Routes */}
      <Route path="/mobile-upload/:token" element={<MobileUploadPage />} />

      {/* Protected Routes with MainLayout */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Core Intelligence Command Center */}
        <Route path="/business/insights" element={<BusinessPage view="insights" />} />
        <Route path="/business/briefing" element={<BusinessPage view="briefing" />} />
        <Route path="/business/archive" element={<BusinessPage view="archive" />} />
        <Route path="/business/inbox" element={<BusinessPage view="inbox" />} />
        <Route path="/business" element={<Navigate to="/business/insights" replace />} />

        {/* Standard Workspace Routes */}
        <Route path="/projects" element={<ProjectsDashboardPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/profile" element={<ProfileTab />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
      </Route>

      {/* Admin Protected Route */}
      <Route element={<AdminRoute><MainLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/business/insights" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;