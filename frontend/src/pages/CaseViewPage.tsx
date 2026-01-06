// FILE: src/pages/CaseViewPage.tsx
// PHOENIX PROTOCOL - CASE VIEW V16.0 (SPLIT VIEW)
// 1. LAYOUT: Replaced Document/AI Tabs with permanent 50/50 Chat/Draft split.
// 2. LOGIC: Removed obsolete document management handlers.
// 3. STYLE: Consistent glassmorphism for both panels.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Case, ChatMessage } from '../data/types';
import { apiService } from '../services/api';
import ChatPanel, { ChatMode, Jurisdiction, AgentType } from '../components/ChatPanel';
import DraftingPanel from '../components/DraftingPanel';
import { useDocumentSocket } from '../hooks/useDocumentSocket';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

type CaseData = {
    details: Case | null;
};

const extractAndNormalizeHistory = (data: any): ChatMessage[] => {
    if (!data) return [];
    const rawArray = data.chat_history || [];
    if (!Array.isArray(rawArray)) return [];
    return rawArray.map((item: any): ChatMessage => {
        const rawRole = (item.role || 'user').toString().toLowerCase();
        const role: 'user' | 'ai' = (rawRole.includes('ai') || rawRole.includes('assistant')) ? 'ai' : 'user';
        const content = item.content || '';
        const timestamp = item.timestamp || new Date().toISOString();
        return { role, content, timestamp };
    }).filter(msg => msg.content.trim() !== '');
};

const CaseViewPage: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  
  const [caseData, setCaseData] = useState<CaseData>({ details: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentCaseId = useMemo(() => caseId || '', [caseId]);
  
  // Socket connection for Chat functionality
  const { 
      messages: liveMessages, 
      setMessages, 
      connectionStatus, 
      reconnect, 
      sendChatMessage, 
      isSendingMessage 
  } = useDocumentSocket(currentCaseId);

  const isReadyForData = isAuthenticated && !isAuthLoading && !!caseId;

  // Load/Save Chat History from LocalStorage/API
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
      
      if (isInitialLoad) { 
          const serverHistory = extractAndNormalizeHistory(details); 
          if (serverHistory.length > 0) setMessages(serverHistory); 
      }
    } catch (err) { 
        setError(t('error.failedToLoadCase')); 
    } finally { 
        if(isInitialLoad) setIsLoading(false); 
    }
  }, [caseId, t, setMessages]);

  useEffect(() => { 
      if (isReadyForData) fetchCaseData(true); 
  }, [isReadyForData, fetchCaseData]);

  const handleClearChat = async () => { 
      if (!caseId) return; 
      try { 
          await apiService.clearChatHistory(caseId); 
          setMessages([]); 
          localStorage.removeItem(`chat_history_${currentCaseId}`); 
      } catch (err) { 
          alert(t('error.generic')); 
      } 
  };

  const handleChatSubmit = (text: string, _mode: ChatMode, documentId?: string, jurisdiction?: Jurisdiction, agentType?: AgentType) => { 
      sendChatMessage(text, documentId, jurisdiction, agentType); 
  };

  if (isAuthLoading || isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;
  if (error || !caseData.details) return <div className="p-8 text-center text-red-400 border border-red-500/20 rounded-2xl bg-red-500/10"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p>{error}</p></div>;

  return (
    <motion.div className="w-full h-screen bg-background-dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 h-full flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 min-h-0 items-center">
            
            {/* LEFT COLUMN: CHAT PANEL (Replaces Documents) */}
            <div className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl h-full min-h-[500px] overflow-hidden shadow-2xl shadow-blue-900/10 flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                     <h2 className="font-bold text-gray-100 flex items-center gap-2">
                        {t('chatPanel.title', 'Bisedo')}
                     </h2>
                </div>
                <div className="flex-1 min-h-0">
                    <ChatPanel 
                        agentType="business" 
                        messages={liveMessages} 
                        connectionStatus={connectionStatus} 
                        reconnect={reconnect} 
                        onSendMessage={handleChatSubmit} 
                        isSendingMessage={isSendingMessage} 
                        onClearChat={handleClearChat} 
                        t={t} 
                        className="h-full border-none rounded-none bg-transparent" 
                        activeContextId="general" 
                    />
                </div>
            </div>

            {/* RIGHT COLUMN: DRAFTING PANEL (Previously Tabbed) */}
            <div className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl h-full min-h-[500px] overflow-hidden shadow-2xl shadow-purple-900/10 flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                     <h2 className="font-bold text-gray-100 flex items-center gap-2">
                        {t('drafting.title', 'Harto')}
                     </h2>
                </div>
                <div className="flex-1 min-h-0">
                    <DraftingPanel 
                        activeCaseId={caseData.details.id} 
                        className="h-full border-none rounded-none bg-transparent"
                    />
                </div>
            </div>

        </div>
      </div>
    </motion.div>
  );
};

export default CaseViewPage;