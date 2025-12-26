// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - BUSINESS PAGE V17.1 (LABEL STANDARDIZATION)
// 1. UI: Unified "Briefing" label to "Sot" (Today).
// 2. UI: Unified "Inventory" label to "Stoku".
// 3. STATUS: Production Ready.

import React, { useState } from 'react';
import { Building2, FileText, FolderOpen, Package, LayoutDashboard, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import { DailyBriefingTab } from '../components/business/DailyBriefingTab';
import { InsightsTab } from '../components/business/InsightsTab';

type ActiveTab = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile';

const BusinessPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
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
      case 'insights':
        return <InsightsTab />;
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t('business.welcome', 'Mirësevini {{name}}', { name: capitalize(user?.username) })}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
                {t('business.title', 'Qendra e Biznesit')}
            </p>
        </div>
        
        <div className="w-full sm:w-auto grid grid-cols-3 sm:flex bg-background-light/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md gap-1 sm:gap-0">
            
            {/* 1. TODAY (Formerly Briefing) */}
            <button 
                onClick={() => setActiveTab('briefing')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'briefing' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutDashboard size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('calendar.today', 'Sot')}</span>
            </button>

            {/* 2. FINANCES */}
            <button 
                onClick={() => setActiveTab('finance')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'finance' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('business.finance', 'Financat')}</span>
            </button>
            
            {/* 3. INVENTORY (Stoku) */}
            <button 
                onClick={() => setActiveTab('inventory')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'inventory' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('inventory.tabItems_short', 'Stoku')}</span>
            </button>

            {/* 4. ARCHIVE */}
            <button 
                onClick={() => setActiveTab('archive')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'archive' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FolderOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('business.archive', 'Arkiva')}</span>
            </button>

            {/* 5. INTELLIGENCE */}
            <button 
                onClick={() => setActiveTab('insights')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'insights' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('business.insights', 'Inteligjenca')}</span>
            </button>

            {/* 6. PROFILE */}
            <button 
                onClick={() => setActiveTab('profile')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'profile' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Building2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{t('business.profile', 'Profili')}</span>
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