// FILE: src/components/Header.tsx
// HAVERI AI - KOKA E NAVIGIMIT (100% SHQIP)

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bell, LogOut, User as UserIcon, 
    MessageSquare, Menu, FolderOpen, 
    Sparkles, X, Shield, 
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isMobileMenuOpen) { setIsMobileMenuOpen(false); }
  }, [location.pathname]);

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
  
  // Navigimi i pastër në Shqip
  const navItems = [
      { label: 'Inteligjenca', path: '/business/insights', icon: Sparkles },
      { label: 'Mundësitë & Projektet', path: '/projects', icon: Briefcase },
      { label: 'Arkiva', path: '/business/archive', icon: FolderOpen },
  ];

  if (user?.role?.toUpperCase() === 'ADMIN') {
      navItems.push({ label: 'Administrimi', path: '/admin', icon: Shield });
  }

  const handleDropdownNavigate = (path: string) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  const isActive = (item: any) => {
    return location.pathname.startsWith(item.path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 bg-canvas/95 backdrop-blur-xl border-b border-border-main">
      
      {/* Logo & Menyja Mobile */}
      <div className="flex items-center gap-3 shrink-0">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-text-primary lg:hidden hover:bg-surface/20 rounded-lg"
          title="Hap Menynë"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/business/insights" className="flex items-center">
          <BrandLogo />
        </Link>
      </div>

      {/* Navigimi Kryesor */}
      <div className="hidden lg:flex items-center bg-surface/50 p-1 rounded-2xl border border-border-main shadow-inner">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200
                ${active 
                  ? 'bg-primary-start text-white shadow-md' 
                  : 'text-text-muted hover:text-text-primary'
                }
              `}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Kontrollet e Djathta: Tema, Njoftimet, Profili */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-lg text-text-muted hover:text-text-primary transition-colors hover:bg-surface/20"
          title={theme === 'dark' ? 'Ndriço Pamjen' : 'Errëso Pamjen'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button 
          onClick={() => navigate('/business/insights')} 
          className="p-2 text-text-muted hover:text-text-primary hover:bg-surface/20 rounded-lg relative"
          title="Njoftimet e Tregut"
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-danger-start rounded-full animate-pulse"></span>
          )}
        </button>

        {/* Menyja e Përdoruesit */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-full bg-surface/30 border border-border-main hover:bg-surface/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-start text-white flex items-center justify-center text-xs font-black">
              {user?.username?.charAt(0).toUpperCase() || 'P'}
            </div>
          </button>

          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-60 glass-panel border border-border-main rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-border-main mb-1">
                <p className="text-sm font-bold text-primary">{user?.username}</p>
                <p className="text-xs text-text-muted">{user?.email}</p>
              </div>

              <button onClick={() => handleDropdownNavigate('/account')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <UserIcon size={16} className="mr-3 text-primary" />Llogaria Ime
              </button>
              <button onClick={() => handleDropdownNavigate('/profile')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <Building2 size={16} className="mr-3 text-primary" />Profili i Biznesit
              </button>
              <button onClick={() => handleDropdownNavigate('/support')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <MessageSquare size={16} className="mr-3 text-primary" />Ndihma & Mbështetja
              </button>
              <div className="h-px bg-border-main my-1"></div>
              <button 
                onClick={() => { setIsProfileOpen(false); logout(); }} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-danger-start hover:bg-danger-start/10 transition-colors"
              >
                <LogOut size={16} className="mr-3" />Dil nga Sistemi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Menyja Mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bg-card border-b border-border-main p-4 lg:hidden z-40 shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            {navItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="flex flex-col items-center p-4 rounded-xl bg-surface border border-border-main text-text-secondary hover:text-primary hover:bg-hover transition-all"
              >
                <item.icon size={24} className="mb-2" />
                <span className="text-xs font-bold">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;