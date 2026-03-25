// FILE: src/pages/MainLayout.tsx
// PHOENIX PROTOCOL - TOP NAVIGATION LAYOUT V4.1 (FIXED HEADER CLIPPING)

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-base text-text-primary overflow-hidden">
      {/* PHOENIX: The sidebar has been completely removed. */}
      
      {/* PHOENIX: The main content area now takes up the full width of the screen. */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* PHOENIX: A single, responsive header is now used for all screen sizes. */}
        <Header />

        <main className="flex-1 overflow-y-auto p-0 pt-16 bg-gradient-to-br from-base to-surface custom-scrollbar">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default MainLayout;