// FILE: src/pages/CaseViewPage.tsx
// PHOENIX PROTOCOL - CASE VIEW V15.1 (FLEXIBLE HEIGHT)
// 1. LAYOUT: Adjusted panels to 'h-auto min-h-[400px] max-h-[600px]' per specific request.
// 2. LOGIC: Allows panels to grow slightly with content but caps them at 600px.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Case, Document, DeletedDocumentResponse, ChatMessage } from '../data/types';
import { apiService, API_V1_URL } from '../services/api';
import DocumentsPanel from '../components/DocumentsPanel';
import AIStudioPanel from '../components/AIStudioPanel';
import { ChatMode, Jurisdiction, AgentType } from '../components/ChatPanel';
import PDFViewerModal from '../components/PDFViewerModal';
import { useDocumentSocket } from '../hooks/useDocumentSocket';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, X, Save, FileText, Maximize2 } from 'lucide-react';
import { sanitizeDocument } from '../utils/documentUtils';
import { TFunction } from 'i18next';

type CaseData = {
    details: Case | null;
};

const DockedPDFViewer: React.FC<{ document: Document; onExpand: () => void; onClose: () => void; }> = ({ document, onExpand, onClose }) => {
    const { t } = useTranslation();
    return (
        <AnimatePresence>
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-4 right-4 z-[9998] w-80 bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-between p-4" >
                <div className="flex items-center gap-4 min-w-0"> 
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20"> <FileText className="h-6 w-6 text-red-400 flex-shrink-0" /> </div> 
                    <p className="text-base font-medium text-gray-200 truncate">{document.file_name}</p> 
                </div>
                <div className="flex items-center gap-1 flex-shrink-0"> <button onClick={onExpand} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title={t('general.expand', 'Zgjero')}> <Maximize2 size={18} /> </button> <button onClick={onClose} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title={t('general.close', 'Mbyll')}> <X size={18} /> </button> </div>
            </motion.div>
        </AnimatePresence>
    );
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

const RenameDocumentModal: React.FC<{ isOpen: boolean; onClose: () => void; onRename: (newName: string) => Promise<void>; currentName: string; t: TFunction; }> = ({ isOpen, onClose, onRename, currentName, t }) => {
    const [name, setName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { setName(currentName); }, [currentName]);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; setIsSaving(true); try { await onRename(name); onClose(); } finally { setIsSaving(false); } };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[#0f172a] border border-blue-500/20 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-blue-900/20">
                <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-white">{t('documentsPanel.renameTitle')}</h3><button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button></div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6"><label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t('documentsPanel.newName')}</label><input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all" /></div>
                    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-medium">{t('general.cancel')}</button><button type="submit" disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95">{isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save size={18} />}{t('general.save')}</button></div>
                </form>
            </div>
        </div>
    );
};

const CaseViewPage: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  
  const [caseData, setCaseData] = useState<CaseData>({ details: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [minimizedDocument, setMinimizedDocument] = useState<Document | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [documentToRename, setDocumentToRename] = useState<Document | null>(null);

  const currentCaseId = useMemo(() => caseId || '', [caseId]);
  const { documents: liveDocuments, setDocuments: setLiveDocuments, messages: liveMessages, setMessages, connectionStatus, reconnect, sendChatMessage, isSendingMessage } = useDocumentSocket(currentCaseId);
  const isReadyForData = isAuthenticated && !isAuthLoading && !!caseId;

  useEffect(() => { if (!currentCaseId) return; const cached = localStorage.getItem(`chat_history_${currentCaseId}`); if (cached) { try { const parsed = JSON.parse(cached); if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed); } catch (e) {} } }, [currentCaseId, setMessages]);
  useEffect(() => { if (!currentCaseId) return; if (liveMessages.length > 0) localStorage.setItem(`chat_history_${currentCaseId}`, JSON.stringify(liveMessages)); }, [liveMessages, currentCaseId]);

  const fetchCaseData = useCallback(async (isInitialLoad = false) => {
    if (!caseId) return;
    if(isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const [details, initialDocs] = await Promise.all([apiService.getCaseDetails(caseId), apiService.getDocuments(caseId)]);
      setCaseData({ details });
      if (isInitialLoad) { setLiveDocuments((initialDocs || []).map(sanitizeDocument)); const serverHistory = extractAndNormalizeHistory(details); if (serverHistory.length > 0) setMessages(serverHistory); }
    } catch (err) { setError(t('error.failedToLoadCase')); } finally { if(isInitialLoad) setIsLoading(false); }
  }, [caseId, t, setLiveDocuments, setMessages]);

  useEffect(() => { if (isReadyForData) fetchCaseData(true); }, [isReadyForData, fetchCaseData]);

  const handleDocumentUploaded = (newDoc: Document) => { setLiveDocuments(prev => [sanitizeDocument(newDoc), ...prev]); };
  const handleDocumentDeleted = (response: DeletedDocumentResponse) => { setLiveDocuments(prev => prev.filter(d => String(d.id) !== String(response.documentId))); };
  const handleClearChat = async () => { if (!caseId) return; try { await apiService.clearChatHistory(caseId); setMessages([]); localStorage.removeItem(`chat_history_${currentCaseId}`); } catch (err) { alert(t('error.generic')); } };
  const handleChatSubmit = (text: string, _mode: ChatMode, documentId?: string, jurisdiction?: Jurisdiction, agentType?: AgentType) => { sendChatMessage(text, documentId, jurisdiction, agentType); };
  const handleViewOriginal = (doc: Document) => { const url = `${API_V1_URL}/cases/${caseId}/documents/${doc.id}/preview`; setViewingUrl(url); setViewingDocument(doc); setMinimizedDocument(null); };
  const handleCloseViewer = () => { setViewingDocument(null); setViewingUrl(null); };
  const handleMinimizeViewer = () => { if (viewingDocument) { setMinimizedDocument(viewingDocument); handleCloseViewer(); } };
  const handleExpandViewer = () => { if (minimizedDocument) { handleViewOriginal(minimizedDocument); } };
  const handleRename = async (newName: string) => { if (!caseId || !documentToRename) return; try { await apiService.renameDocument(caseId, documentToRename.id, newName); setLiveDocuments(prev => prev.map(d => d.id === documentToRename.id ? { ...d, file_name: newName } : d)); } catch (error) { alert(t('error.generic')); } };

  if (isAuthLoading || isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;
  if (error || !caseData.details) return <div className="p-8 text-center text-red-400 border border-red-500/20 rounded-2xl bg-red-500/10"><AlertCircle className="mx-auto h-12 w-12 mb-4" /><p>{error}</p></div>;

  return (
    <motion.div className="w-full h-screen bg-background-dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-full flex flex-col">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 py-6 min-h-0 items-center">
            {/* PHOENIX: APPLIED FLEXIBLE HEIGHT (min-400 max-600) */}
            <DocumentsPanel 
                caseId={caseData.details.id} 
                documents={liveDocuments} 
                t={t} 
                connectionStatus={connectionStatus} 
                reconnect={reconnect} 
                onDocumentUploaded={handleDocumentUploaded} 
                onDocumentDeleted={handleDocumentDeleted} 
                onViewOriginal={handleViewOriginal} 
                onRename={(doc) => setDocumentToRename(doc)} 
                className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl h-auto min-h-[400px] max-h-[600px]" 
            />
            {/* PHOENIX: APPLIED FLEXIBLE HEIGHT (min-400 max-600) */}
            <AIStudioPanel 
                messages={liveMessages} 
                connectionStatus={connectionStatus} 
                reconnect={reconnect} 
                onSendMessage={handleChatSubmit} 
                isSendingMessage={isSendingMessage} 
                onClearChat={handleClearChat} 
                activeCaseId={caseData.details.id} 
                activeContextId="general"
                className="w-full bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl h-auto min-h-[400px] max-h-[600px]"
            />
        </div>
      </div>
      
      {viewingDocument && (<PDFViewerModal documentData={viewingDocument} caseId={caseData.details.id} onClose={handleCloseViewer} onMinimize={handleMinimizeViewer} t={t} directUrl={viewingUrl} isAuth={true} />)}
      {minimizedDocument && <DockedPDFViewer document={minimizedDocument} onExpand={handleExpandViewer} onClose={() => setMinimizedDocument(null)} />}
      <RenameDocumentModal isOpen={!!documentToRename} onClose={() => setDocumentToRename(null)} onRename={handleRename} currentName={documentToRename?.file_name || ''} t={t} />
    </motion.div>
  );
};

export default CaseViewPage;