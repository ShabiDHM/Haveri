// FILE: src/pages/BusinessPage.tsx
// Original – no law tab

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import LegalDraftingTab from '../components/business/LegalDraftingTab';
import { InsightsTab } from '../components/business/InsightsTab';
import { InboxTab } from '../components/business/InboxTab';

type BusinessView = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile' | 'inbox';

interface BusinessPageProps {
    view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'briefing' }) => {
  const { workspace, isLoading: isAuthLoading } = useAuth();

  const renderActiveTab = () => {
    if (isAuthLoading) return null;

    switch (view) {
      case 'briefing': 
        return <LegalDraftingTab />;
      case 'finance': 
        return <FinanceTab />;
      case 'inventory': 
        return <InventoryTab />;
      case 'archive': 
        return <ArchiveTab key={workspace?.id || 'root'} workspaceId={workspace?.id} />;
      case 'insights': 
        return <InsightsTab />;
      case 'profile': 
        return <ProfileTab />;
      case 'inbox': 
        return <InboxTab />;
      default: 
        return <LegalDraftingTab />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="min-h-[500px]">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;