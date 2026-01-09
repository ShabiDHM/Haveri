// FILE: src/pages/BusinessPage.tsx
// PHOENIX PROTOCOL - CONTEXT AWARE V19.2
// 1. DATA: Added auto-detection of the 'Main Business Case' to support the Single-Business model.
// 2. LOGIC: Passes 'caseId' to ArchiveTab, enabling the 'PORTAL' button in the global view.
// 3. UX: Added graceful loading state for the archive view.

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
import { Loader2 } from 'lucide-react';

type BusinessView = 'briefing' | 'finance' | 'inventory' | 'archive' | 'insights' | 'profile';

interface BusinessPageProps {
    view?: BusinessView;
}

const BusinessPage: React.FC<BusinessPageProps> = ({ view = 'briefing' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // PHOENIX: State to track the main business context
  const [mainCase, setMainCase] = useState<Case | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // PHOENIX: Fetch the default business case on mount
  useEffect(() => {
    const loadBusinessContext = async () => {
        try {
            const cases = await apiService.getCases();
            // In the Single-Business model, the first active case is the Main Context
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
      
      // PHOENIX: Inject context into ArchiveTab
      case 'archive': 
        if (loadingContext) {
            return (
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            );
        }
        // Key ensures component remounts if ID changes, though loading state usually handles this
        return (
            <ArchiveTab 
                key={mainCase?.id || 'root'} 
                caseId={mainCase?.id} 
                caseTitle={mainCase?.title} 
            />
        );
        
      case 'insights': return <InsightsTab />;
      case 'profile': return <ProfileTab />;
      default: return <DailyBriefingTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8 sm:mb-12">
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