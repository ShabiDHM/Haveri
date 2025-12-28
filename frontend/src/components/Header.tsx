// FILE: src/components/Header.tsx
// PHOENIX PROTOCOL - TOP NAVIGATION V1.0
// 1. INTEGRATION: Main navigation links ('Zyra Ime', 'Haveri AI') are now part of the header.
// 2. REMOVED: Deleted the mobile 'toggleSidebar' button.
// 3. RESPONSIVE: The new navigation is hidden on mobile for a clean look.

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, LogOut, User as UserIcon, Brain, Building2, MessageSquare } from 'lucide-react';
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
  const [alertCount, setAlertCount] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);
  
  const navItems = [
      { label: t('sidebar.business', 'Zyra Ime'), path: '/business', icon: Building2 },
      { label: t('sidebar.haveri_ai', 'Haveri AI'), path: workspaceId ? `/cases/${workspaceId}` : '/business', icon: Brain },
      { label: t('sidebar.support', 'Ndihma'), path: '/support', icon: MessageSquare },
  ];

  return (
    <header className="h-16 bg-background-dark/80 backdrop-blur-md border-b border-glass-edge flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0">
      
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
            <BrandLogo />
        </div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary h-4 w-4" />
          <input type="text" placeholder={t('header.searchPlaceholder')} className="bg-background-light/10 border border-glass-edge rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary-start outline-none w-64 transition-all focus:w-80" />
        </div>
      </div>

      {/* PHOENIX: Centered Navigation for Desktop */}
      <nav className="hidden lg:flex items-center gap-2 p-1 bg-black/30 border border-glass-edge rounded-full">
        {navItems.map(item => {
            const isActive = location.pathname.startsWith('/cases') && item.path.startsWith('/cases') || location.pathname === item.path;
            return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                        isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                </NavLink>
            )
        })}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden"><LanguageSwitcher /></div>

        <Link to="/calendar" className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors relative" title="Njoftimet">
          <Bell size={20} />
          {alertCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>)}
        </Link>
        
        <div className="h-6 w-px bg-glass-edge/50"></div>

        <div className="relative">
          <button ref={buttonRef} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 hover:bg-white/5 p-1.5 rounded-xl transition-colors border border-transparent hover:border-glass-edge">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider">{user?.role || 'USER'}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-secondary-start to-secondary-end flex items-center justify-center text-white font-bold shadow-lg shadow-secondary-start/20">{user?.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
          </button>
          {isProfileOpen && (
            <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-background-dark border border-glass-edge rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-glass-edge mb-1"><p className="text-sm text-white font-medium truncate">{user?.username}</p><p className="text-xs text-text-secondary truncate">{user?.email}</p></div>
              <Link to="/account" className="flex items-center px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors" onClick={() => setIsProfileOpen(false)}><UserIcon size={16} className="mr-3 text-blue-400" />{t('sidebar.account')}</Link>
              <div className="h-px bg-glass-edge my-1"></div>
              <button onClick={() => { setIsProfileOpen(false); logout(); }} className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={16} className="mr-3" />{t('header.logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;