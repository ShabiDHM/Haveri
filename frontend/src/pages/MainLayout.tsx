// FILE: src/pages/MainLayout.tsx
// PHOENIX PROTOCOL - LAYOUT V2.1 (IMMUTABLE BRAND CLEANUP)
// 1. REMOVED: No longer fetches 'businessProfile' or passes props to BrandLogo.
// 2. STATUS: Aligned with the new immutable brand identity.

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BrandLogo from '../components/BrandLogo';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background-dark text-text-primary overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 relative transition-all duration-300">
        
        <div className="hidden lg:block">
          <Header toggleSidebar={toggleSidebar} />
        </div>
        
        {/* Mobile-Only Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-glass-edge bg-background-light/10 backdrop-blur-md z-10">
          {/* PHOENIX: BrandLogo is now self-contained and requires no props. */}
          <BrandLogo />
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-0 bg-gradient-to-br from-background-dark to-background-light/5 custom-scrollbar">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default MainLayout;