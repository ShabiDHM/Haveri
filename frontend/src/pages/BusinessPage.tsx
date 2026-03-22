// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - WORKSPACE HUB V23.1 (DEBUG LOGGING ADDED)

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
  
  // DEBUG: Log which view is being rendered
  console.log("BusinessPage rendering with view:", view);

  const renderActiveTab = () => {
    if (isAuthLoading) return null;

    console.log("Rendering tab for view:", view);

    switch (view) {
      case 'briefing': 
        console.log("Rendering DailyBriefingTab (Zyra Ligjore)");
        return <DailyBriefingTab />;
      case 'finance': 
        console.log("Rendering FinanceTab");
        return <FinanceTab />;
      case 'inventory': 
        console.log("Rendering InventoryTab");
        return <InventoryTab />;
      case 'archive': 
        console.log("Rendering ArchiveTab");
        return <ArchiveTab key={workspace?.id || 'root'} workspaceId={workspace?.id} />;
      case 'insights': 
        console.log("Rendering InsightsTab");
        return <InsightsTab />;
      case 'profile': 
        console.log("Rendering ProfileTab");
        return <ProfileTab />;
      case 'inbox': 
        console.log("Rendering InboxTab");
        return <InboxTab />;
      default: 
        console.log("Default - Rendering DailyBriefingTab");
        return <DailyBriefingTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default BusinessPage;