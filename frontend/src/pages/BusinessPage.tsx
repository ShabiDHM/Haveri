// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - BUSINESS PAGE V18.0 (ROUTE DRIVEN)
// 1. STATE REMOVAL: Removed internal 'activeTab' state. Content is now driven by URL 'view' prop.
// 2. LAYOUT: Removed the button grid (moved to Header.tsx).
// 3. CLEANUP: Simplified render logic.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import { DailyBriefingTab } from '../components/business/DailyBriefingTab';
import { InsightsTab } from '../components/business/InsightsTab';

// Define the valid views supported by the Router
type BusinessView = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile';

interface BusinessPageProps {
    view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'briefing' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const capitalize = (s: string | undefined) => {
    if (!s) return 'Përdorues';
    return s
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderActiveTab = () => {
    switch (view) {
      case 'briefing': return <DailyBriefingTab />;
      case 'finance': return <FinanceTab />;
      case 'inventory': return <InventoryTab />;
      case 'archive': return <ArchiveTab />;
      case 'insights': return <InsightsTab />;
      case 'profile': return <ProfileTab />;
      default: return <DailyBriefingTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {t('business.welcome', 'Mirësevini {{name}}', { name: capitalize(user?.username) })}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
              {t('business.title', 'Qendra e Biznesit')}
          </p>
      </div>

      <div className="min-h-[500px]">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;