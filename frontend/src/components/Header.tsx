// FILE: src/components/Header.tsx
// HAVERI - ASISTENTI VIRTUAL (MOBILE BOTTOM BAR & MODERN HEADER)

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bell, LogOut, User as UserIcon, 
    MessageSquare, FolderOpen, 
    Activity, Shield, 
    Sun, Moon, Building2, Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import BrandLogo from './BrandLogo';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkAlerts = async () => {
      if (isAuthenticated) {
        try {
          const data = await apiService.getAlertsCount();
          setAlertCount(data.count);
        } catch (err) { console.warn("Dështoi kontrolli i sinjaleve."); }
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);
  
  // Elementet e Navigimit
  const navItems = [
      { label: 'Pulsi i Tregut', shortLabel: 'Pulsi', path: '/business/insights', icon: Activity },
      { label: 'Mundësitë & Projektet', shortLabel: 'Mundësitë', path: '/projects', icon: Briefcase },
      { label: 'Arkiva', shortLabel: 'Arkiva', path: '/business/archive', icon: FolderOpen },
  ];

  if (user?.role?.toUpperCase() === 'ADMIN') {
      navItems.push({ label: 'Administrimi', shortLabel: 'Admin', path: '/admin', icon: Shield });
  }

  const handleDropdownNavigate = (path: string) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 1. KOKA KRYESORE E FAQES (TOP BAR) */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 bg-canvas/90 backdrop-blur-xl border-b border-border-main shadow-xs">
        
        {/* Logo */}
        <Link to="/business/insights" className="flex items-center">
          <BrandLogo />
        </Link>

        {/* Desktop Navigimi (Vetëm për Desktop) */}
        <div className="hidden lg:flex items-center bg-surface/50 p-1 rounded-2xl border border-border-main shadow-inner">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200
                  ${active 
                    ? 'bg-primary-start text-white shadow-md' 
                    : 'text-text-muted hover:text-text-primary'
                  }
                `}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Kontrollet e Djathta */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl text-text-muted hover:text-text-primary transition-colors hover:bg-surface/50"
            title={theme === 'dark' ? 'Ndriço Pamjen' : 'Errëso Pamjen'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={() => navigate('/business/insights')} 
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface/50 rounded-xl relative"
            title="Njoftime"
          >
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Menyja e Profilit */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center p-0.5 rounded-full bg-surface/40 border border-border-main hover:border-primary-start/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary-start text-white flex items-center justify-center text-xs font-black">
                {user?.username?.charAt(0).toUpperCase() || 'P'}
              </div>
            </button>

            {isProfileOpen && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 glass-panel bg-surface/95 border border-border-main rounded-2xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2 border-b border-border-main mb-1">
                  <p className="text-sm font-bold text-text-primary">{user?.username}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>

                <button onClick={() => handleDropdownNavigate('/account')} className="w-full text-left flex items-center px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-hover">
                  <UserIcon size={15} className="mr-3 text-primary-start" />Llogaria Ime
                </button>
                <button onClick={() => handleDropdownNavigate('/profile')} className="w-full text-left flex items-center px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-hover">
                  <Building2 size={15} className="mr-3 text-primary-start" />Profili i Biznesit
                </button>
                <button onClick={() => handleDropdownNavigate('/support')} className="w-full text-left flex items-center px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-hover">
                  <MessageSquare size={15} className="mr-3 text-primary-start" />Ndihma & Mbështetja
                </button>
                <div className="h-px bg-border-main my-1"></div>
                <button 
                  onClick={() => { setIsProfileOpen(false); logout(); }} 
                  className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={15} className="mr-3" />Dil nga Sistemi
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SHIRITI I POSHTËM MODERN NË MOBILE (NATIVE MOBILE BOTTOM TAB BAR) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/90 backdrop-blur-xl border-t border-border-main px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 relative
                  ${active 
                    ? 'text-primary-start font-black' 
                    : 'text-text-muted hover:text-text-primary'
                  }
                `}
              >
                <item.icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                <span className="text-[10px] font-bold mt-1 tracking-tight">
                  {item.shortLabel}
                </span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-start mt-0.5 animate-pulse"></span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Header;