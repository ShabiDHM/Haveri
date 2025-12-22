// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - BUSINESS PAGE V10.0 (INVENTORY ENABLED)
// 1. ADDED: 'InventoryTab' integration.
// 2. UPDATED: Navigation grid changed from 3 to 4 columns to fit the new tab.
// 3. STATUS: Production Ready.

import React, { useState } from 'react';
import { Building2, FileText, FolderOpen, Package } from 'lucide-react'; // Added Package icon
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab'; // New Import

type ActiveTab = 'profile' | 'finance' | 'archive' | 'inventory';

const BusinessPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  // PHOENIX FIX: Capitalize the first letter of EVERY word (Title Case)
  const capitalize = (s: string | undefined) => {
    if (!s) return 'Përdorues';
    return s
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // PHOENIX FIX: Component mapping for conditional rendering
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'finance':
        return <FinanceTab />;
      case 'archive':
        return <ArchiveTab />;
      case 'inventory': // New Case
        return <InventoryTab />;
      default:
        return null;
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
        
        {/* FIX: Grid layout updated to 4 columns for mobile to fit Inventory */}
        <div className="w-full sm:w-auto grid grid-cols-4 sm:flex bg-background-light/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md gap-1 sm:gap-0">
            <button 
                onClick={() => setActiveTab('profile')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'profile' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Building2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.profile')}</span>
                <span className="xs:hidden">Profili</span>
            </button>
            <button 
                onClick={() => setActiveTab('finance')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'finance' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.finance')}</span>
                <span className="xs:hidden">Financat</span>
            </button>
            
            {/* NEW INVENTORY TAB */}
            <button 
                onClick={() => setActiveTab('inventory')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'inventory' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('inventory.title').split(' ')[0]}</span>
                <span className="xs:hidden">Inventari</span>
            </button>

            <button 
                onClick={() => setActiveTab('archive')} 
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-1 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 w-full sm:w-auto ${activeTab === 'archive' ? 'bg-primary-start text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <FolderOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline truncate">{t('business.archive')}</span>
                <span className="xs:hidden">Arkiva</span>
            </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {/* PHOENIX FIX: Render ONLY the active tab component */}
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;