// FILE: src/components/Header.tsx (First App – unified typography)

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bell, LogOut, User as UserIcon, LayoutDashboard, 
    MessageSquare, Menu, FileText, Package, FolderOpen, 
    Sparkles, X, Shield, Share2, 
    Sun, Moon, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import BrandLogo from './BrandLogo';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated, selectedYear, setSelectedYear } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
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
        } catch (err) { console.warn("Alert check failed."); }
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
  
  const navItems = [
      { label: t('business.finance', 'Financat'), path: '/business/finance', icon: FileText },
      { label: t('inventory.tabItems_short', 'Stoku'), path: '/business/inventory', icon: Package },
      { label: t('business.archive', 'Arkiva'), path: '/business/archive', icon: FolderOpen },
      { label: t('business.insights', 'Inteligjenca'), path: '/business/insights', icon: Sparkles },
      { label: t('sidebar.legal', 'Zyra Ligjore'), path: '/business/briefing', icon: LayoutDashboard, exact: true },
  ];

  if (user?.role?.toUpperCase() === 'ADMIN') {
      navItems.push({ label: t('sidebar.admin', 'Admin'), path: '/admin', icon: Shield, exact: false } as any);
  }

  const handleDropdownNavigate = (path: string) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  const isActive = (item: any) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 bg-canvas/80 backdrop-blur-xl border-b border-border-main">
      
      {/* Left: Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-text-primary lg:hidden hover:bg-surface/20 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/business/briefing" className="flex items-center">
          <BrandLogo />
        </Link>
      </div>

      {/* Center: Segmented Glass Bar */}
      <div className="hidden lg:flex items-center bg-surface/50 p-1 rounded-2xl border border-border-main shadow-inner">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-200
                ${active 
                  ? 'bg-canvas text-primary-start shadow-sm' 
                  : 'text-text-muted hover:text-text-primary'
                }
              `}
            >
              <item.icon size={18} />
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-lg text-text-muted hover:text-text-primary transition-colors hover:bg-surface/20"
          aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link to="/calendar" className="p-2 text-text-muted hover:text-text-primary hover:bg-surface/20 rounded-lg relative">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-danger-start rounded-full animate-pulse"></span>
          )}
        </Link>

        {/* User profile */}
        <div className="relative hidden sm:block">
          <button
            ref={buttonRef}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-full bg-surface/30 border border-border-main hover:bg-surface/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-start text-white flex items-center justify-center text-xs font-black">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 glass-panel border border-border-main rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-border-main mb-1">
                <p className="text-sm font-bold text-primary">{user?.username}</p>
                <p className="text-xs text-text-muted">{user?.email}</p>
              </div>

              {isAuthenticated && (
                <div className="px-4 py-2 flex items-center justify-between hover:bg-hover">
                  <span className="text-xs font-bold text-text-muted">{t('navigation.year', 'Viti Fiskal')}</span>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                    className="bg-transparent text-primary text-sm font-bold outline-none cursor-pointer"
                  >
                    {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y} className="bg-card">{y}</option>)}
                  </select>
                </div>
              )}

              <button onClick={() => handleDropdownNavigate('/account')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <UserIcon size={16} className="mr-3 text-primary" />{t('sidebar.account')}
              </button>
              <button onClick={() => handleDropdownNavigate('/profile')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <Building2 size={16} className="mr-3 text-primary" />{t('business.profile', 'Profili')}
              </button>
              <button onClick={() => handleDropdownNavigate('/integrations')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <Share2 size={16} className="mr-3 text-primary" />{t('navigation.integrations', 'Integrimet')}
              </button>
              <button onClick={() => handleDropdownNavigate('/support')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                <MessageSquare size={16} className="mr-3 text-primary" />{t('sidebar.support')}
              </button>
              <div className="h-px bg-border-main my-1"></div>
              <button 
                onClick={() => { setIsProfileOpen(false); logout(); }} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-danger-start hover:bg-danger-start/10 transition-colors"
              >
                <LogOut size={16} className="mr-3" />{t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
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