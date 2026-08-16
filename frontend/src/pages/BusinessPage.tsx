// FILE: src/pages/BusinessPage.tsx
// HAVERI AI - BUSINESS WORKSPACE (INTELLIGENCE CORE)

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileTab } from '../components/business/ProfileTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InsightsTab } from '../components/business/InsightsTab';
import { InboxTab } from '../components/business/InboxTab';

type BusinessView = 'insights' | 'archive' | 'profile' | 'inbox' | 'briefing';

interface BusinessPageProps {
  view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'insights' }) => {
  const { workspace, isLoading: isAuthLoading } = useAuth();

  const renderActiveTab = () => {
    if (isAuthLoading) return null;

    switch (view) {
      case 'insights':
      case 'briefing':
        return <InsightsTab />;
      case 'archive':
        return <ArchiveTab key={workspace?.id || 'root'} workspaceId={workspace?.id} />;
      case 'profile':
        return <ProfileTab />;
      case 'inbox':
        return <InboxTab />;
      default:
        return <InsightsTab />;
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