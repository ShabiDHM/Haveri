// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - BUSINESS PAGE V10.1 (DAILY BRIEFING + REORDER)
// 1. MOVED: 'Profile' tab to the far right (after Archive).
// 2. ADDED: 'Daily Briefing' tab as the new default landing view.
// 3. UPDATED: Navigation grid changed from 4 to 5 columns.
// 4. INTEGRITY: Inline 'DailyBriefingTab' added to prevent build errors.

import React, { useState } from 'react';
import { Building2, FileText, FolderOpen, Package, LayoutDashboard } from 'lucide-react'; // Added LayoutDashboard
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';

// --- PLACEHOLDER COMPONENT (Move to src/components/business/DailyBriefingTab.tsx later) ---
const DailyBriefingTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xl font-bold text-white mb-4">The Daily Briefing</h3>
            <p className="text-gray-400">Përmbledhja ditore do të shfaqet këtu.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xl font-bold text-white mb-4">Aktiviteti i fundit</h3>
            <p className="text-gray-400">Nuk ka aktivitet të fundit për të shfaqur.</p>
        </div>
    </div>
  );
};
// ------------------------------------------------------------------------------------------

type ActiveTab = 'briefing' | 'finance' | 'inventory' | 'archive' | 'profile';

const BusinessPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Default to 'briefing' as the landing view
  const [activeTab, setActiveTab] = useState<ActiveTab>('briefing');

  const capitalize = (s: string | undefined) => {
    if (!s) return 'Përdorues';
    return s
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'briefing':
        return <DailyBriefingTab />;
      case 'finance':
        return <FinanceTab />;
      case 'inventory':
        return <InventoryTab />;
      case 'archive':
        return <ArchiveTab />;
      case 'profile':
        return <ProfileTab />;
      default:
        return <DailyBriefingTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4 sm:gap-6">
        <div>
            {/* Dynamic Welcome Message */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t('dashboard.welcome', { name: capitalize(user?.username) })}
            </h1>
            {/* Context Label */}
            <p className="text-gray-400 text-sm sm:text-base">
                {t('business.title', 'Qendra e Biznesit')}
            </p>
        </div>
        
        {/* FIX: Grid layout updated to 5 columns for mobile to fit all tabs */}
        <div className="w-full sm:w-auto grid grid-cols-5 sm:flex bg-background-light/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md gap-1 sm:gap-0">
            
            {/* 1. THE DAILY BRIEFING (New Default) */}
            <button 
                onClick={() => setActiveTab('briefing')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'briefing' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutDashboard size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">Briefing</span>
                <span className="xs:hidden">Ditor</span>
            </button>

            {/* 2. FINANCES */}
            <button 
                onClick={() => setActiveTab('finance')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'finance' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.finance')}</span>
                <span className="xs:hidden">Financat</span>
            </button>
            
            {/* 3. INVENTORY */}
            <button 
                onClick={() => setActiveTab('inventory')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'inventory' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('inventory.title', 'Inventari').split(' ')[0]}</span>
                <span className="xs:hidden">Inventari</span>
            </button>

            {/* 4. ARCHIVE */}
            <button 
                onClick={() => setActiveTab('archive')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'archive' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FolderOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.archive')}</span>
                <span className="xs:hidden">Arkiva</span>
            </button>

            {/* 5. PROFILE (Moved to End) */}
            <button 
                onClick={() => setActiveTab('profile')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'profile' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Building2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.profile')}</span>
                <span className="xs:hidden">Profili</span>
            </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;