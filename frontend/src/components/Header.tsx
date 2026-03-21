// FILE: src/components/Header.tsx
// PHOENIX PROTOCOL - HEADER V6.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

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
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="glass-panel sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300">
      
      <div className="flex items-center gap-6">
        <Link to="/business" className="lg:hidden"><BrandLogo /></Link>
        <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
                const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                return (
                    <NavLink key={item.path} to={item.path} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive 
                        ? 'text-primary bg-accent-subtle border border-accent-primary/20' 
                        : 'text-text-secondary hover:text-primary hover:bg-hover'
                    }`}>
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </NavLink>
                )
            })}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-hover transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* Year Selector */}
        {isAuthenticated && (
            <div className="flex items-center gap-2 bg-hover border border-border-strong px-3 py-1.5 rounded-xl">
                <Calendar size={14} className="text-primary" />
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-text-primary text-sm font-bold outline-none cursor-pointer hover:text-primary transition-colors appearance-none"
                >
                    {[2026, 2025, 2024, 2023].map(y => (
                        <option key={y} value={y} className="bg-card">{y}</option>
                    ))}
                </select>
            </div>
        )}

        <Link to="/calendar" className="p-2 text-text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors relative" title="Njoftimet">
          <Bell size={20} />
          {alertCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full animate-pulse"></span>)}
        </Link>

        <div className="h-6 w-px bg-border-strong"></div>
        
        <div className="relative">
          <button ref={buttonRef} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 p-1.5 rounded-xl transition-all border border-transparent hover:bg-hover hover:border-border-strong">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-primary">{user?.username || 'Përdorues'}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-bold">{user?.role || 'USER'}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-start to-primary-end flex items-center justify-center text-inverse font-bold shadow-accent-glow">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>
          
          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-60 bg-glass backdrop-blur-xl border border-border-strong rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-border-strong mb-1 bg-hover/5">
                  <p className="text-sm text-primary font-bold truncate">{user?.username}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.email}</p>
              </div>
              
              <button onClick={() => handleDropdownNavigate('/account')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover transition-colors">
                  <UserIcon size={16} className="mr-3 text-primary" />{t('sidebar.account')}
              </button>
              
              <button onClick={() => handleDropdownNavigate('/integrations')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover transition-colors">
                  <Share2 size={16} className="mr-3 text-primary" />
                  {t('navigation.integrations', 'Integrimet')}
              </button>
              
              <button onClick={() => handleDropdownNavigate('/support')} className="w-full text-left flex items-center px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-hover transition-colors">
                  <MessageSquare size={16} className="mr-3 text-primary" />{t('sidebar.support')}
              </button>
              
              <div className="h-px bg-border-strong my-1"></div>
              <button onClick={() => { setIsProfileOpen(false); logout(); }} className="w-full flex items-center px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                  <LogOut size={16} className="mr-3" />{t('header.logout')}
              </button>
            </div>
          )}
        </div>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-text-secondary hover:text-primary lg:hidden">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div ref={mobileMenuRef} className="fixed inset-x-0 top-16 bg-glass backdrop-blur-xl border-b border-border-strong p-4 lg:hidden z-30 animate-in slide-in-from-top-2 shadow-lg">
            <div className="grid grid-cols-2 gap-3">
                {navItems.map(item => (
                    <Link 
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                            location.pathname === item.path 
                            ? 'bg-accent-subtle border-accent-primary/30 text-primary' 
                            : 'bg-card border-border-strong text-text-secondary hover:text-primary hover:bg-hover'
                        }`}
                    >
                        <item.icon size={28} className="mb-2" />
                        <span className="text-sm font-bold">{item.label}</span>
                    </Link>
                ))}
            </div>
        </div>
      )}
    </header>
  );
};

export default Header;