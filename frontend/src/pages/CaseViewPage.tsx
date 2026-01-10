// FILE: src/pages/CaseViewPage.tsx
// PHOENIX PROTOCOL - DUAL PANEL LAYOUT V21.1 (MOBILE RESPONSIVE)
// 1. RESPONSIVE FIX: Applied height constraints (min/max) ONLY on medium screens and up (md:).
// 2. MOBILE: On mobile, panels now have natural height to prevent overflow and ensure usability.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Case } from '../data/types';
import { apiService } from '../services/api';
import ChatPanel, { ChatMode, Jurisdiction, AgentType } from '../components/ChatPanel';
import DraftingPanel from '../components/DraftingPanel';
import { ArchiveTab } from '../components/business/ArchiveTab';
import { useDocumentSocket } from '../hooks/useDocumentSocket';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, FileText, PenTool } from 'lucide-react';

type CaseData = { details: Case | null; };
type RightPanelTab = 'drafting' | 'documents';

const CaseViewPage: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  
  const [caseData, setCaseData] = useState<CaseData>({ details: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RightPanelTab>('documents');
  
  const currentCaseId = useMemo(() => caseId || '', [caseId]);
  
  const { 
      messages: liveMessages, 
      setMessages, 
      connectionStatus, 
      reconnect, 
      sendChatMessage, 
      isSendingMessage 
  } = useDocumentSocket(currentCaseId);

  const isReadyForData = isAuthenticated && !isAuthLoading && !!caseId;

  useEffect(() => { 
      if (!currentCaseId) return; 
      const cached = localStorage.getItem(`chat_history_${currentCaseId}`); 
      if (cached) { 
          try { 
              const parsed = JSON.parse(cached); 
              if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed); 
          } catch (e) {} 
      } 
  }, [currentCaseId, setMessages]);

  useEffect(() => { 
      if (!currentCaseId) return; 
      if (liveMessages.length > 0) localStorage.setItem(`chat_history_${currentCaseId}`, JSON.stringify(liveMessages)); 
  }, [liveMessages, currentCaseId]);

  const fetchCaseData = useCallback(async (isInitialLoad = false) => {
    if (!caseId) return;
    if(isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const details = await apiService.getCaseDetails(caseId);
      setCaseData({ details });
    } catch (err) { 
        setError(t('error.failedToLoadCase')); 
    } finally { 
        if(isInitialLoad) setIsLoading(false); 
    }
  }, [caseId, t]);

  useEffect(() => { if (isReadyForData) fetchCaseData(true); }, [isReadyForData, fetchCaseData]);

  const handleClearChat = async () => { 
      if (!caseId) return; 
      if(window.confirm(t('chatPanel.confirmClear', 'Jeni i sigurt që doni të fshini bisedën?'))) {
        try { 
            await apiService.clearChatHistory(caseId); 
            setMessages([]); 
            localStorage.removeItem(`chat_history_${currentCaseId}`); 
        } catch (err) { 
            alert(t('error.generic')); 
        }
      }
  };

  const handleChatSubmit = (text: string, _mode: ChatMode, documentId?: string, jurisdiction?: Jurisdiction, agentType?: AgentType) => { 
      sendChatMessage(text, documentId, jurisdiction, agentType); 
  };

  if (isAuthLoading || isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;
  if (error) return <div className="p-8 text-center text-red-400 border border-red-500/20 rounded-2xl bg-red-500/10"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p>{error}</p></div>;
  if (!caseData.details) return <div className="p-8 text-center text-yellow-400 border border-yellow-500/20 rounded-2xl bg-yellow-500/10"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p>{t('error.caseNotFound', 'Çështja nuk u gjet.')}</p></div>;

  return (
    <motion.div className="w-full min-h-screen bg-background-dark p-2 sm:p-4 lg:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-[1800px] w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* PHOENIX: Responsive Height for COLUMN 1: CHAT PANEL */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-blue-900/10 flex flex-col h-[85vh] md:min-h-[500px] md:max-h-[700px]">
                <ChatPanel 
                    agentType="business" messages={liveMessages} connectionStatus={connectionStatus} 
                    reconnect={reconnect} onSendMessage={handleChatSubmit} isSendingMessage={isSendingMessage} 
                    onClearChat={handleClearChat} t={t}
                    className="h-full"
                />
            </div>

            {/* PHOENIX: Responsive Height for COLUMN 2: DRAFTING / DOCUMENTS */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-purple-900/10 flex flex-col p-4 sm:p-6 h-[85vh] md:min-h-[500px] md:max-h-[700px]">
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit mb-4">
                    <button onClick={() => setActiveTab('drafting')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'drafting' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <PenTool size={16} /> <span>{t('case.drafting', 'Drafting')}</span>
                    </button>
                    <button onClick={() => setActiveTab('documents')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'documents' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <FileText size={16} /> <span>{t('case.documents', 'Dokumentet')}</span>
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    {activeTab === 'drafting' ? (
                        <DraftingPanel activeCaseId={caseData.details.id} className="h-full" />
                    ) : (
                        <ArchiveTab caseId={caseData.details.id} />
                    )}
                </div>
            </div>

        </div>
      </div>
    </motion.div>
  );
};

export default CaseViewPage;