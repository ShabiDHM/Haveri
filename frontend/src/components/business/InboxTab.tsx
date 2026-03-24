// FILE: src/components/business/InboxTab.tsx
// PHOENIX PROTOCOL - INBOX V5.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Mail, Loader2, ArrowRight, Inbox, Archive, Trash2, AlertCircle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Panel } from '../ui/Panel';

export interface ClientMessage {
    id: string; client_name: string; sender_email: string; sender_phone?: string; case_title: string;
    content: string; created_at: string; is_read: boolean; status: string;
}
type FolderType = 'INBOX' | 'ARCHIVED' | 'TRASHED';

const FolderButton: React.FC<{ label: string; icon: React.ElementType; isActive: boolean; onClick: () => void; count: number; }> = 
({ label, icon: Icon, isActive, onClick, count }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${ isActive ? 'bg-primary/20 text-primary border border-primary-start/30' : 'text-text-muted hover:bg-hover hover:text-text-primary border border-transparent hover:border-border-main'}`}>
        <Icon size={16} className="mr-3"/> <span>{label}</span>
        {count > 0 && <span className={`ml-auto text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isActive ? 'bg-primary text-inverse' : 'bg-surface text-text-secondary'}`}>{count}</span>}
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
            if (data.length > 0) {
                setSelectedMessage(data[0]);
            }
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
        <div className="glass-panel p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Folder Panel */}
                <div className="lg:col-span-1 flex flex-col max-h-[70vh]">
                    <Panel className="p-4 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-text-primary mb-4 px-2 flex-shrink-0">{t('inbox.folder.title', 'Kutia Postare')}</h3>
                        <div className="space-y-2 flex-shrink-0">
                            <FolderButton label={t('inbox.folder.inbox', 'Të Pritura')} icon={Inbox} isActive={activeFolder === 'INBOX'} onClick={() => setActiveFolder('INBOX')} count={activeFolder === 'INBOX' ? messages.length : 0}/>
                            <FolderButton label={t('inbox.folder.archived', 'Të Arkivuara')} icon={Archive} isActive={activeFolder === 'ARCHIVED'} onClick={() => setActiveFolder('ARCHIVED')} count={0}/>
                            <FolderButton label={t('inbox.folder.trash', 'Shporta')} icon={Trash2} isActive={activeFolder === 'TRASHED'} onClick={() => setActiveFolder('TRASHED')} count={0}/>
                        </div>
                    </Panel>
                </div>
                
                {/* Message List and Detail Panel */}
                <div className="lg:col-span-2 flex flex-col lg:flex-row gap-6 max-h-[70vh]">
                    {/* Message List Panel */}
                    <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/2`}>
                        <Panel className="p-0 overflow-hidden flex flex-col h-full">
                            <div className="p-5 border-b border-border-main bg-surface flex-shrink-0">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <Mail size={18} className="text-primary"/> {activeFolder === 'INBOX' ? t('inbox.folder.inbox', 'Të Pritura') : activeFolder === 'ARCHIVED' ? t('inbox.folder.archived', 'Të Arkivuara') : t('inbox.folder.trash', 'Shporta')}
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 min-h-0">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-6 h-6"/></div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-10 text-text-muted flex flex-col items-center">
                                        <Mail size={32} className="mb-2 opacity-20"/>
                                        <p>{t('inbox.noMessages', 'Asnjë mesazh')}</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div 
                                            key={msg.id} 
                                            onClick={() => setSelectedMessage(msg)} 
                                            className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedMessage?.id === msg.id ? 'bg-primary/20 border border-primary-start/30' : 'border border-border-main hover:bg-hover'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-text-primary text-sm truncate">{msg.client_name}</h4>
                                                <span className="text-xs font-black uppercase tracking-widest text-text-muted">{new Date(msg.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-primary font-mono mb-2 truncate">{msg.case_title}</p>
                                            <p className="text-xs text-text-muted line-clamp-2">{msg.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Panel>
                    </div>
                    
                    {/* Message Detail Panel */}
                    <div className={`${selectedMessage ? 'flex' : 'hidden lg:flex'} flex-1`}>
                        <Panel className="p-6 flex flex-col h-full w-full relative">
                            {selectedMessage ? (
                                <>
                                    <button onClick={() => setSelectedMessage(null)} className="lg:hidden absolute top-4 left-4 p-2 bg-surface rounded-lg text-text-primary border border-border-main">
                                        <ArrowRight className="rotate-180" size={20}/>
                                    </button>
                                    <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-6 mt-8 lg:mt-0 flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-inverse font-bold text-lg">
                                            {selectedMessage.client_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-text-primary">{selectedMessage.client_name}</h2>
                                            <p className="text-sm text-primary">{selectedMessage.sender_email}</p>
                                            {selectedMessage.sender_phone && (
                                                <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                                                    <Phone size={12}/> {selectedMessage.sender_phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                        <div className="bg-surface rounded-2xl p-6 border border-border-main">
                                            <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{selectedMessage.content}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-border-main flex justify-start items-center flex-wrap gap-2 flex-shrink-0">
                                        {activeFolder !== 'ARCHIVED' && (
                                            <button onClick={() => handleAction(selectedMessage.id, 'ARCHIVED')} 
                                                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-hover text-text-secondary hover:text-text-primary rounded-xl text-xs font-medium border border-border-main transition-all">
                                                <Archive size={14}/> {t('inbox.action.archive', 'Arkivo')}
                                            </button>
                                        )}
                                        {activeFolder !== 'INBOX' && (
                                            <button onClick={() => handleAction(selectedMessage.id, 'INBOX')} 
                                                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-hover text-text-secondary hover:text-text-primary rounded-xl text-xs font-medium border border-border-main transition-all">
                                                <Inbox size={14}/> {t('inbox.action.restore', 'Kthe në Inbox')}
                                            </button>
                                        )}
                                        {activeFolder === 'TRASHED' ? (
                                            <button onClick={() => handleDeletePermanent(selectedMessage.id)} 
                                                className="flex items-center gap-2 px-4 py-2 bg-danger-start/10 hover:bg-danger-start/20 text-danger-start rounded-xl text-xs font-medium border border-danger-start/30 transition-all">
                                                <AlertCircle size={14}/> {t('inbox.action.deletePermanent', 'Fshije Përgjithmonë')}
                                            </button>
                                        ) : (
                                            <button onClick={() => handleAction(selectedMessage.id, 'TRASHED')} 
                                                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-danger-start/10 text-text-secondary hover:text-danger-start rounded-xl text-xs font-medium border border-border-main hover:border-danger-start/30 transition-all">
                                                <Trash2 size={14}/> {t('inbox.action.trash', 'Hidh në Shportë')}
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50">
                                    <Mail size={64} className="mb-4" />
                                    <p>{t('inbox.selectMessage', 'Zgjidhni një mesazh për të lexuar')}</p>
                                </div>
                            )}
                        </Panel>
                    </div>
                </div>
            </div>
        </div>
    );
};
