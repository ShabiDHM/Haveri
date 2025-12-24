// FILE: src/App.tsx
// PHOENIX PROTOCOL - ROUTING V2.5 (DASHBOARD REMOVAL)
// 1. REMOVED: The '/dashboard' route has been completely removed from the router.
// 2. REASON: The DashboardPage is now fully deprecated and has been replaced by the '/business' home base.
// 3. STATUS: The application's routing is now clean, consistent, and aligned with the Singleton Workspace model.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './pages/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
// PHOENIX: DashboardPage is no longer a primary route. It can be removed or kept for future development.
// import DashboardPage from './pages/DashboardPage'; 
import CaseViewPage from './pages/CaseViewPage';
import CalendarPage from './pages/CalendarPage';
import DraftingPage from './pages/DraftingPage';
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
      {/* Public Routes - All redirects point to the new '/business' home base */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/business" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/business" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/business" /> : <RegisterPage />} />
      
      {/* Client Portal Route (Public Access via Link) */}
      <Route path="/portal/:caseId" element={<ClientPortalPage />} />

      {/* Standalone Protected Routes (No Sidebar) */}
      <Route path="/finance/wizard" element={<ProtectedRoute><FinanceWizardPage /></ProtectedRoute>} />

      {/* Standard Protected Routes (With Sidebar) */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* PHOENIX: The /dashboard route has been completely removed. */}
        <Route path="/cases/:caseId" element={<CaseViewPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/drafting" element={<DraftingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/account" element={<AccountPage />} />
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