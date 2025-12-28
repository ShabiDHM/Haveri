// FILE: src/pages/MainLayout.tsx
// PHOENIX PROTOCOL - TOP NAVIGATION LAYOUT V1.0
// 1. REMOVED: Deleted the <Sidebar /> component and all its state management.
// 2. REFACTOR: The main content area is now full-width.
// 3. CLEANUP: Consolidated mobile and desktop headers into a single responsive <Header />.

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background-dark text-text-primary overflow-hidden">
      {/* PHOENIX: The sidebar has been completely removed. */}
      
      {/* PHOENIX: The main content area now takes up the full width of the screen. */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* PHOENIX: A single, responsive header is now used for all screen sizes. */}
        <Header />

        <main className="flex-1 overflow-y-auto p-0 bg-gradient-to-br from-background-dark to-background-light/5 custom-scrollbar">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default MainLayout;