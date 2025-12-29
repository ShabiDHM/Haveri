// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - BUSINESS PAGE V18.1 (TYPOGRAPHY FIX)
// 1. TYPOGRAPHY: Upgraded H1 to 'text-3xl sm:text-4xl font-black' for clear hierarchy.
// 2. LAYOUT: Adjusted margins to breathe better with larger text.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import { DailyBriefingTab } from '../components/business/DailyBriefingTab';
import { InsightsTab } from '../components/business/InsightsTab';

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
      <div className="mb-8 sm:mb-12">
          {/* PHOENIX: Upgraded Typography for Hierarchy */}
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
              {t('business.welcome', 'Mirësevini {{name}}', { name: capitalize(user?.username) })}
          </h1>
          <p className="text-gray-400 text-base sm:text-lg font-medium">
              {t('business.title', 'Qendra e Biznesit')}
          </p>
      </div>

      <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;