// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - WORKSPACE HUB V24.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React from 'react';
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
  const { workspace, isLoading: isAuthLoading } = useAuth();

  const renderActiveTab = () => {
    if (isAuthLoading) return null;

    switch (view) {
      case 'briefing': 
        return <DailyBriefingTab />;
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
        return <DailyBriefingTab />;
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