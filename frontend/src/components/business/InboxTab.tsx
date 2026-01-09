// FILE: src/components/business/InboxTab.tsx
// PHOENIX PROTOCOL - INBOX V2.3 (SYNTAX & JSX CORRECTION)
// 1. CRITICAL FIX: Corrected typo in 'react-i18next' import.
// 2. JSX FIX: Rebuilt the entire JSX structure to fix all unclosed tags and fragments.
// 3. CLEANUP: Removed all unused variable and import warnings.

import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Mail, Loader2, ArrowRight, MessageSquare, Inbox, Archive, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Corrected import

export interface ClientMessage {
    id: string; client_name: string; sender_email: string; case_title: string;
    content: string; created_at: string; is_read: boolean; status: string;
}
type FolderType = 'INBOX' | 'ARCHIVED' | 'TRASHED';

const FolderButton: React.FC<{ label: string; icon: React.ElementType; isActive: boolean; onClick: () => void; count: number; }> = 
({ label, icon: Icon, isActive, onClick, count }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${ isActive ? 'bg-blue-600/20 text-blue-300' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
        <Icon size={16} className="mr-3"/> <span>{label}</span>
        {count > 0 && <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-200'}`}>{count}</span>}
    </button>
);

export const InboxTab: React.FC = () => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ClientMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ClientMessage | null>(null);
    const [activeFolder, setActiveFolder] = useState<FolderType>('INBOX');

    const loadMessages = useCallback(async (folder: FolderType) => {
        setLoading(true);
        setSelectedMessage(null);
        try {
            const data = await apiService.getInboundMessages(folder);
            setMessages(data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadMessages(activeFolder); }, [activeFolder, loadMessages]);

    const handleAction = async (messageId: string, newStatus: FolderType) => {
        try {
            await apiService.updateMessageStatus(messageId, newStatus);
            loadMessages(activeFolder);
        } catch (error) { alert('Veprimi dështoi'); }
    };
    
    const handleDeletePermanent = async (messageId: string) => {
        if(window.confirm("Jeni i sigurt që doni ta fshini përgjithmonë?")) {
            try {
                await apiService.deleteMessage(messageId);
                loadMessages(activeFolder);
            } catch (error) { alert('Fshirja dështoi'); }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Folder Sidebar - Spans 1 column */}
            <div className="lg:col-span-1 flex flex-col bg-gray-900/60 border border-white/10 rounded-3xl p-4 backdrop-blur-md max-h-[70vh]">
                <h3 className="text-lg font-bold text-white mb-4 px-2 flex-shrink-0">Kutia Postare</h3>
                <div className="space-y-2 flex-shrink-0">
                    <FolderButton label={t('inbox.folder.inbox', 'Të Pritura')} icon={Inbox} isActive={activeFolder === 'INBOX'} onClick={() => setActiveFolder('INBOX')} count={activeFolder === 'INBOX' ? messages.length : 0}/>
                    <FolderButton label={t('inbox.folder.archived', 'Të Arkivuara')} icon={Archive} isActive={activeFolder === 'ARCHIVED'} onClick={() => setActiveFolder('ARCHIVED')} count={activeFolder === 'ARCHIVED' ? messages.length : 0}/>
                    <FolderButton label={t('inbox.folder.trash', 'Shporta')} icon={Trash2} isActive={activeFolder === 'TRASHED'} onClick={() => setActiveFolder('TRASHED')} count={activeFolder === 'TRASHED' ? messages.length : 0}/>
                </div>
            </div>

            {/* Message List & Detail View - Spans 2 columns */}
            <div className="lg:col-span-2 flex flex-col lg:flex-row gap-6 max-h-[70vh]">
                {/* Message List */}
                <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/2 bg-gray-900/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md`}>
                    <div className="p-5 border-b border-white/10 bg-white/5 flex-shrink-0"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Mail size={18} className="text-blue-400"/> {activeFolder}</h3></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 min-h-0">
                        {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-6 h-6"/></div> : 
                        messages.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 flex flex-col items-center"><Mail size={32} className="mb-2 opacity-20"/><p>Asnjë mesazh</p></div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} onClick={() => setSelectedMessage(msg)} className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedMessage?.id === msg.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                    <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-white text-sm truncate">{msg.client_name}</h4><span className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span></div>
                                    <p className="text-xs text-blue-300 font-mono mb-2 truncate">{msg.case_title}</p>
                                    <p className="text-xs text-gray-400 line-clamp-2">{msg.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Message Detail View */}
                <div className={`${selectedMessage ? 'flex' : 'hidden lg:flex'} flex-1 bg-gray-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex-col relative`}>
                    {selectedMessage ? (
                        <>
                            <button onClick={() => setSelectedMessage(null)} className="lg:hidden absolute top-4 left-4 p-2 bg-white/10 rounded-lg text-white"><ArrowRight className="rotate-180" size={20}/></button>
                            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6 mt-8 lg:mt-0 flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">{selectedMessage.client_name.charAt(0)}</div>
                                <div><h2 className="text-xl font-bold text-white">{selectedMessage.client_name}</h2><p className="text-sm text-blue-400">{selectedMessage.sender_email}</p></div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0"><div className="bg-black/20 rounded-2xl p-6 border border-white/5"><p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedMessage.content}</p></div></div>
                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center flex-wrap gap-2 flex-shrink-0">
                                <div className="flex gap-2">
                                    {activeFolder !== 'ARCHIVED' && <button onClick={() => handleAction(selectedMessage.id, 'ARCHIVED')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all"><Archive size={14}/> Arkivo</button>}
                                    {activeFolder !== 'INBOX' && <button onClick={() => handleAction(selectedMessage.id, 'INBOX')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all"><Inbox size={14}/> Kthe në Inbox</button>}
                                    {activeFolder === 'TRASHED' ?
                                        <button onClick={() => handleDeletePermanent(selectedMessage.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium border border-red-500/20 transition-all"><AlertCircle size={14}/> Fshije Përgjithmonë</button> :
                                        <button onClick={() => handleAction(selectedMessage.id, 'TRASHED')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400 rounded-lg text-xs font-medium border border-white/10 hover:border-red-500/20 transition-all"><Trash2 size={14}/> Hidh në Shportë</button>
                                    }
                                </div>
                                <a href={`mailto:${selectedMessage.sender_email}`} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all text-sm"><MessageSquare size={16} /> Përgjigju</a>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50"><Mail size={64} className="mb-4" /><p>Zgjidhni një mesazh për të lexuar</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};