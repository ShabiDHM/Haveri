// FILE: src/components/Sidebar.tsx
// PHOENIX PROTOCOL - SIDEBAR V3.0 (NAVIGATION MERGE)
// 1. REMOVED: Deleted the 'Hartimi' (Drafting) navigation item.
// 2. REASON: Drafting is now integrated directly into the Workspace/Case View via the AI Studio.
// 3. STATUS: Streamlined navigation menu.

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    MessageSquare, 
    Building2, Shield, LogOut, User as UserIcon, Brain 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import BrandLogo from './BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrimaryWorkspace = async () => {
      try {
        const projects = await apiService.getCases();
        if (projects && projects.length > 0) {
          setWorkspaceId(projects[0].id);
        }
      } catch (error) {
        console.error("Could not fetch primary workspace:", error);
      }
    };
    fetchPrimaryWorkspace();
  }, []);

  const getNavItems = () => {
    const haveriAIPath = workspaceId ? `/cases/${workspaceId}` : '/business';

    const baseItems = [
      { 
        icon: Building2, 
        label: t('sidebar.business', 'Zyra Ime'), 
        path: '/business' 
      },
      { 
        icon: Brain,
        label: t('sidebar.haveri_ai', 'Haveri AI'), 
        path: haveriAIPath
      },
      // PHOENIX: Removed Drafting (Hartimi) - Now merged into Haveri AI
      { 
        icon: MessageSquare, 
        label: t('sidebar.support', 'Ndihma'), 
        path: '/support' 
      },
    ];

    if (user?.role?.toUpperCase() === 'ADMIN') {
      baseItems.splice(1, 0, {
        icon: Shield,
        label: t('sidebar.admin', 'Admin Panel'),
        path: '/admin',
      });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-background-dark border-r border-glass-edge shadow-2xl
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          
          <div className="h-16 flex items-center px-6 border-b border-glass-edge bg-background-light/10 flex-shrink-0">
            <BrandLogo />
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = (location.pathname.startsWith('/cases') && item.path.startsWith('/cases')) || location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${isActive 
                      ? 'bg-secondary-start/10 text-secondary-start shadow-lg shadow-secondary-start/5' 
                      : 'text-text-secondary hover:text-white hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-center">
                      {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-start rounded-r-full" />
                      )}
                      <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-secondary-start' : 'group-hover:text-white'}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-3 border-t border-glass-edge bg-[#0a0a0a] lg:hidden mt-auto flex-shrink-0 pb-safe">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-secondary-start to-secondary-end flex items-center justify-center text-white font-bold shadow-md shrink-0 text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{user?.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <NavLink 
                    to="/account"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-[11px] font-bold border border-white/5"
                >
                    <UserIcon className="h-3.5 w-3.5 mr-1.5" />
                    {t('sidebar.account', 'Profili')}
                </NavLink>
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-[11px] font-bold border border-red-500/20"
                >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    {t('header.logout', 'Dilni')}
                </button>
            </div>
          </div>
          
      </aside>
    </>
  );
};

export default Sidebar;