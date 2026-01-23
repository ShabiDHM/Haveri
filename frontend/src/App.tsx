// FILE: src/App.tsx
// PHOENIX PROTOCOL - ROUTING V3.5 (MOBILE UPLOAD)
// 1. IMPORT: Imported the new MobileUploadPage component.
// 2. ROUTING: Added '/mobile-upload/:token' as a new public, standalone route.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './pages/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import CaseViewPage from './pages/CaseViewPage';
import CalendarPage from './pages/CalendarPage';
import SupportPage from './pages/SupportPage';
import LandingPage from './pages/LandingPage';
import BusinessPage from './pages/BusinessPage';
import AccountPage from './pages/AccountPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import FinanceWizardPage from './pages/FinanceWizardPage';
import ClientPortalPage from './pages/ClientPortalPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import MobileUploadPage from './pages/MobileUploadPage'; // <-- IMPORT MOBILE PAGE

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-background-dark"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-start"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-background-dark"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-start"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/business" />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/business" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/business" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/business" /> : <RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/portal/:caseId" element={<ClientPortalPage />} />

      {/* Standalone Protected Routes (No Sidebar) */}
      <Route path="/finance/wizard" element={<ProtectedRoute><FinanceWizardPage /></ProtectedRoute>} />

      {/* PHOENIX: Mobile Handoff Route (Public, No Layout) */}
      <Route path="/mobile-upload/:token" element={<MobileUploadPage />} />

      {/* Standard Protected Routes (With Sidebar) */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/cases/:caseId" element={<CaseViewPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<AccountPage />} />
        
        <Route path="/integrations" element={<IntegrationsPage />} />

        {/* Business Sub-Routes */}
        <Route path="/business" element={<BusinessPage view="briefing" />} />
        <Route path="/business/finance" element={<BusinessPage view="finance" />} />
        <Route path="/business/inventory" element={<BusinessPage view="inventory" />} />
        <Route path="/business/archive" element={<BusinessPage view="archive" />} />
        <Route path="/business/insights" element={<BusinessPage view="insights" />} />
        <Route path="/business/profile" element={<BusinessPage view="profile" />} />
        <Route path="/business/inbox" element={<BusinessPage view="inbox" />} />
      </Route>

      {/* Admin Protected Route */}
      <Route element={<AdminRoute><MainLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;