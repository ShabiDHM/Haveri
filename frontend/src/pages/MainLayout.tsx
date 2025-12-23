// FILE: src/pages/MainLayout.tsx
// PHOENIX PROTOCOL - LAYOUT V2.0 (DYNAMIC BRANDING FIX)
// 1. FIX: The component now consumes the AuthContext to get the user's businessProfile.
// 2. LOGIC: The firm_name and logo_url from the businessProfile are now passed as props to the BrandLogo component in the mobile header.
// 3. STATUS: This resolves the static branding issue on mobile devices, ensuring brand consistency across the application.

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext'; // PHOENIX: Import useAuth

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { businessProfile } = useAuth(); // PHOENIX: Consume the AuthContext

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
          {/* PHOENIX: Pass dynamic props to BrandLogo */}
          <BrandLogo 
            firmName={businessProfile?.firm_name}
            logoUrl={businessProfile?.logo_url}
          />
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