// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - LAYOUT LOGIC V19.5
// 1. UI/UX: Restricted the 'Welcome' header to appear ONLY on the 'briefing' view.
// 2. LOGIC: All other tabs (Finance, Inventory, etc.) now use the full vertical space without the main header.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Case } from '../data/types';
import { ProfileTab } from '../components/business/ProfileTab';
import { FinanceTab } from '../components/business/FinanceTab';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { InventoryTab } from '../components/business/InventoryTab';
import { DailyBriefingTab } from '../components/business/DailyBriefingTab';
import { InsightsTab } from '../components/business/InsightsTab';
import { InboxTab } from '../components/business/InboxTab';
import { Loader2 } from 'lucide-react';

type BusinessView = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile' | 'inbox';

interface BusinessPageProps {
    view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'briefing' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [mainCase, setMainCase] = useState<Case | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    const loadBusinessContext = async () => {
        try {
            const cases = await apiService.getCases();
            if (cases && cases.length > 0) {
                setMainCase(cases[0]);
            }
        } catch (error) {
            console.error("Failed to load business context", error);
        } finally {
            setLoadingContext(false);
        }
    };
    loadBusinessContext();
  }, []);

  const capitalize = (s: string | undefined) => {
    if (!s) return 'Përdorues';
    return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderActiveTab = () => {
    switch (view) {
      case 'briefing': return <DailyBriefingTab />;
      case 'finance': return <FinanceTab />;
      case 'inventory': return <InventoryTab />;
      
      case 'archive': 
        if (loadingContext) return <div className="flex justify-center h-96 items-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
        return <ArchiveTab key={mainCase?.id || 'root'} caseId={mainCase?.id} />;
        
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
                  {t('business.title', 'Qendra e Biznesit')}
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