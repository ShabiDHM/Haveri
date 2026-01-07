// FILE: src/pages/CaseViewPage.tsx
// PHOENIX PROTOCOL - SYMMETRY & MOBILE V17.0
// 1. LAYOUT: Removed redundant panel wrappers and headers for true component symmetry.
// 2. RESPONSIVE: Grid now stacks vertically on mobile (lg:grid-cols-2).
// 3. STYLE: Panels now use h-full to dynamically fill available screen space.

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
  if (error || !caseData.details) return <div className="p-8 text-center text-red-400 border border-red-500/20 rounded-2xl bg-red-500/10"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p>{error}</p></div>;

  return (
    <motion.div 
        className="w-full h-screen bg-background-dark p-4 sm:p-6"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
    >
      <div className="max-w-[1800px] w-full mx-auto h-full">
        {/* PHOENIX: Mobile-first grid, stacks on small screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* LEFT COLUMN: CHAT PANEL */}
            {/* PHOENIX: Removed wrapper, using direct component with symmetrical shell */}
            <ChatPanel 
                agentType="business" 
                messages={liveMessages} 
                connectionStatus={connectionStatus} 
                reconnect={reconnect} 
                onSendMessage={handleChatSubmit} 
                isSendingMessage={isSendingMessage} 
                onClearChat={handleClearChat} 
                t={t} 
                className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-blue-900/10" 
                activeContextId="general" 
            />

            {/* RIGHT COLUMN: DRAFTING PANEL */}
            {/* PHOENIX: Removed wrapper, using direct component with symmetrical shell */}
            <DraftingPanel 
                activeCaseId={caseData.details.id} 
                className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-purple-900/10"
            />

        </div>
      </div>
    </motion.div>
  );
};

export default CaseViewPage;