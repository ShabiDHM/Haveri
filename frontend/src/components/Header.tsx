// FILE: src/components/Header.tsx
// PHOENIX PROTOCOL - HEADER V6.2 (FULL FUNCTIONALITY RESTORED)

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bell, LogOut, User as UserIcon, LayoutDashboard, 
    MessageSquare, Menu, FileText, Package, FolderOpen, 
    Sparkles, Building2, X, Shield, Share2, Calendar,
    Sun, Moon
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
      { label: t('sidebar.business', 'Zyra Ime'), path: '/business', icon: LayoutDashboard, exact: true },
      { label: t('business.finance', 'Financat'), path: '/business/finance', icon: FileText },
      { label: t('inventory.tabItems_short', 'Stoku'), path: '/business/inventory', icon: Package },
      { label: t('business.archive', 'Arkiva'), path: '/business/archive', icon: FolderOpen },
      { label: t('business.insights', 'Inteligjenca'), path: '/business/insights', icon: Sparkles },
      { label: t('business.profile', 'Profili'), path: '/business/profile', icon: Building2 },
  ];

  if (user?.role?.toUpperCase() === 'ADMIN') {
      navItems.push({ label: t('sidebar.admin', 'Admin'), path: '/admin', icon: Shield, exact: false } as any);
  }

  const handleDropdownNavigate = (path: string) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  return (
    <header className="glass-panel sticky top-0 z-50 h-16 flex items-center justify-between px-4 transition-all duration-300">
      
      <div className="flex items-center gap-3">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-text-primary lg:hidden hover:bg-hover rounded-lg">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link to="/business" className="flex items-center"><BrandLogo /></Link>
      </div>

      <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => {
              const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                  <NavLink key={item.path} to={item.path} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium transition-all ${
                      isActive ? 'text-primary bg-accent-subtle border border-accent-primary/20' : 'text-text-secondary hover:text-primary hover:bg-hover'
                  }`}>
                      <item.icon size={18} />
                      <span>{item.label}</span>
                  </NavLink>
              )
          })}
      </nav>

      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-hover transition-colors">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-2 bg-hover border border-border-strong px-3 py-1.5 rounded-xl">
                <Calendar size={14} className="text-primary" />
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-text-primary text-sm font-bold outline-none cursor-pointer">
                    {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y} className="bg-card">{y}</option>)}
                </select>
            </div>
        )}

        <Link to="/calendar" className="p-2 text-text-secondary hover:text-primary hover:bg-hover rounded-lg relative">
          <Bell size={20} />
          {alertCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full animate-pulse"></span>)}
        </Link>
        
        <div className="relative">
          <button ref={buttonRef} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-1.5 rounded-xl border border-transparent hover:bg-hover hover:border-border-strong">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-primary">{user?.username || 'Përdorues'}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-inverse font-bold text-xs">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>
          
          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-card border border-border-strong rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-border-strong mb-1">
                  <p className="text-xs text-primary font-bold">{user?.username}</p>
              </div>
              <button onClick={() => handleDropdownNavigate('/account')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                  <UserIcon size={16} className="mr-3 text-primary" />{t('sidebar.account')}
              </button>
              <button onClick={() => handleDropdownNavigate('/integrations')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                  <Share2 size={16} className="mr-3 text-primary" />{t('navigation.integrations', 'Integrimet')}
              </button>
              <button onClick={() => handleDropdownNavigate('/support')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover">
                  <MessageSquare size={16} className="mr-3 text-primary" />{t('sidebar.support')}
              </button>
              <div className="h-px bg-border-strong my-1"></div>
              <button onClick={() => { setIsProfileOpen(false); logout(); }} className="w-full flex items-center px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                  <LogOut size={16} className="mr-3" />{t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bg-card border-b border-border-strong p-4 lg:hidden z-40 shadow-lg">
            <div className="grid grid-cols-2 gap-3">
                {navItems.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center p-4 rounded-xl bg-surface border border-border-strong text-text-secondary hover:text-primary hover:bg-hover transition-all">
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