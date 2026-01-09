// FILE: src/App.tsx
// PHOENIX PROTOCOL - ROUTING V3.2 (INBOX ADDED)
// 1. ROUTING: Added the missing route '/business/inbox'.
// 2. LOGIC: This connects the Dashboard button to the actual Inbox view.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './pages/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CaseViewPage from './pages/CaseViewPage';
import CalendarPage from './pages/CalendarPage';
import SupportPage from './pages/SupportPage';
import LandingPage from './pages/LandingPage';
import BusinessPage from './pages/BusinessPage';
import AccountPage from './pages/AccountPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import FinanceWizardPage from './pages/FinanceWizardPage';
import ClientPortalPage from './pages/ClientPortalPage';

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
      
      {/* Client Portal Route (Public Access via Link) */}
      <Route path="/portal/:caseId" element={<ClientPortalPage />} />

      {/* Standalone Protected Routes (No Sidebar) */}
      <Route path="/finance/wizard" element={<ProtectedRoute><FinanceWizardPage /></ProtectedRoute>} />

      {/* Standard Protected Routes (With Sidebar) */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/cases/:caseId" element={<CaseViewPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<AccountPage />} />

        {/* Business Sub-Routes (Mapped to Global Header) */}
        <Route path="/business" element={<BusinessPage view="briefing" />} />
        <Route path="/business/finance" element={<BusinessPage view="finance" />} />
        <Route path="/business/inventory" element={<BusinessPage view="inventory" />} />
        <Route path="/business/archive" element={<BusinessPage view="archive" />} />
        <Route path="/business/insights" element={<BusinessPage view="insights" />} />
        <Route path="/business/profile" element={<BusinessPage view="profile" />} />
        
        {/* PHOENIX: The Missing Link */}
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