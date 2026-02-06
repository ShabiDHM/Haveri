// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - WORKSPACE HUB V20.0 (SINGLETON ALIGNMENT)
// 1. FEATURE: Integrated with AuthContext 'workspace' singleton.
// 2. REBRAND: Global terminology shift from Case to Workspace.
// 3. OPTIMIZATION: Removed redundant API calls and local loading states.
// 4. STATUS: Fully synchronized.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import { DailyBriefingTab } from '../components/business/DailyBriefingTab';
import { InsightsTab } from '../components/business/InsightsTab';
import { InboxTab } from '../components/business/InboxTab';

type BusinessView = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile' | 'inbox';

interface BusinessPageProps {
    view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'briefing' }) => {
  const { t } = useTranslation();
  const { user, workspace, isLoading: isAuthLoading } = useAuth(); // PHOENIX: Consuming singleton from context

  const capitalize = (s: string | undefined) => {
    if (!s) return t('general.user', 'Përdorues');
    return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderActiveTab = () => {
    // PHOENIX: Ensure we don't render sub-tabs until auth/workspace is ready
    if (isAuthLoading) return null;

    switch (view) {
      case 'briefing': return <DailyBriefingTab />;
      case 'finance': return <FinanceTab />;
      case 'inventory': return <InventoryTab />;
      
      case 'archive': 
        // PHOENIX: Passed workspace.id instead of mainCase.id
        return <ArchiveTab key={workspace?.id || 'root'} workspaceId={workspace?.id} />;
        
      case 'insights': return <InsightsTab />;
      case 'profile': return <ProfileTab />;
      case 'inbox': return <InboxTab />;
      default: return <DailyBriefingTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* PHOENIX: Header restricted to Briefing view only */}
      {view === 'briefing' && (
          <div className="mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                  {t('business.welcome', 'Mirësevini {{name}}', { name: capitalize(user?.username) })}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg font-medium">
                  {t('business.title', 'Hapësira e Punës')}
              </p>
          </div>
      )}

      <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;