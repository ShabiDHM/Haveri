// FILE: src/components/Header.tsx
// PHOENIX PROTOCOL - HEADER V6.1 (TYPOGRAPHY BOOST)
// 1. TYPOGRAPHY: Upgraded Navigation text to 'text-base' (was text-sm).
// 2. ICONS: Increased Navigation icons to size={18} (was 16).
// 3. PROFILE: Matched username text size to navigation.

import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, User as UserIcon, Brain, LayoutDashboard, MessageSquare, Menu, FileText, Package, FolderOpen, Sparkles, Building2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import LanguageSwitcher from './LanguageSwitcher';
import BrandLogo from './BrandLogo';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPrimaryWorkspace = async () => {
      try {
        const projects = await apiService.getCases();
        if (projects && projects.length > 0) {
          setWorkspaceId(projects[0].id);
        }
      } catch (error) { console.error("Could not fetch primary workspace:", error); }
    };
    fetchPrimaryWorkspace();
  }, []);

  useEffect(() => {
    const checkAlerts = async () => {
      if (!user) return;
      try {
        const data = await apiService.getAlertsCount();
        setAlertCount(data.count);
      } catch (err) { console.warn("Alert check skipped"); }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (isMobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
          // Handled by onclick usually
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, isMobileMenuOpen]);
  
  const navItems = [
      { label: t('sidebar.business', 'Zyra Ime'), path: '/business', icon: LayoutDashboard, exact: true },
      { label: t('business.finance', 'Financat'), path: '/business/finance', icon: FileText },
      { label: t('inventory.tabItems_short', 'Stoku'), path: '/business/inventory', icon: Package },
      { label: t('business.archive', 'Arkiva'), path: '/business/archive', icon: FolderOpen },
      { label: t('business.insights', 'Inteligjenca'), path: '/business/insights', icon: Sparkles },
      { label: t('business.profile', 'Profili'), path: '/business/profile', icon: Building2 },
      { label: t('sidebar.haveri_ai', 'Haveri AI'), path: workspaceId ? `/cases/${workspaceId}` : '/business', icon: Brain },
  ];

  return (
    <header className="h-16 bg-background-dark/80 backdrop-blur-md border-b border-glass-edge flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0">
      
      {/* Left side: Desktop Nav & Mobile Brand */}
      <div className="flex items-center gap-6">
        <Link to="/business" className="lg:hidden">
            <BrandLogo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
                const isActive = item.exact 
                    ? location.pathname === item.path 
                    : location.pathname.startsWith(item.path);

                const isHaveriActive = item.path.startsWith('/cases') && location.pathname.startsWith('/cases');

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        // PHOENIX: Upgraded to text-base and icon size 18
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                            (isActive || isHaveriActive) 
                                ? 'text-white bg-primary-start/20 border border-primary-start/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </NavLink>
                )
            })}
        </nav>
      </div>

      {/* Right side: Actions & Mobile Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden"><LanguageSwitcher /></div>
        <Link to="/calendar" className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors relative" title="Njoftimet">
          <Bell size={20} />
          {alertCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>)}
        </Link>
        <div className="h-6 w-px bg-glass-edge/50"></div>
        
        {/* Profile Dropdown */}
        <div className="relative">
          <button ref={buttonRef} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 hover:bg-white/5 p-1.5 rounded-xl transition-colors border border-transparent hover:border-glass-edge">
            <div className="text-right hidden sm:block">
              {/* PHOENIX: Upgraded to text-base */}
              <p className="text-base font-medium text-white">{user?.username || 'User'}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider">{user?.role || 'USER'}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-secondary-start to-secondary-end flex items-center justify-center text-white font-bold shadow-lg shadow-secondary-start/20">{user?.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
          </button>
          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-background-dark border border-glass-edge rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-glass-edge mb-1"><p className="text-base text-white font-medium truncate">{user?.username}</p><p className="text-xs text-text-secondary truncate">{user?.email}</p></div>
              {/* PHOENIX: Upgraded dropdown items to text-base and icon size 18 */}
              <Link to="/account" className="flex items-center px-4 py-2 text-base text-text-secondary hover:text-white hover:bg-white/5 transition-colors" onClick={() => setIsProfileOpen(false)}><UserIcon size={18} className="mr-3 text-blue-400" />{t('sidebar.account')}</Link>
              <Link to="/support" className="flex items-center px-4 py-2 text-base text-text-secondary hover:text-white hover:bg-white/5 transition-colors" onClick={() => setIsProfileOpen(false)}><MessageSquare size={18} className="mr-3 text-emerald-400" />{t('sidebar.support')}</Link>
              <div className="h-px bg-glass-edge my-1"></div>
              <button onClick={() => { setIsProfileOpen(false); logout(); }} className="w-full flex items-center px-4 py-2 text-base text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={18} className="mr-3" />{t('header.logout')}</button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white lg:hidden hover:bg-white/10 rounded-lg transition-colors"
        >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bg-background-dark/95 backdrop-blur-xl border-b border-glass-edge p-4 lg:hidden z-30 animate-in slide-in-from-top-2 shadow-2xl">
            <div className="grid grid-cols-2 gap-3" ref={mobileMenuRef}>
                {navItems.map(item => (
                    <Link 
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                            location.pathname === item.path 
                            ? 'bg-primary-start/20 border-primary-start/30 text-white' 
                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <item.icon size={28} className="mb-2" />
                        {/* Mobile text stays slightly smaller for grid fit, but bold */}
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