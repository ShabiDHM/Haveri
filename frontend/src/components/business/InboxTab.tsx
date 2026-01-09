// FILE: src/components/business/InboxTab.tsx
// PHOENIX PROTOCOL - INBOX TAB V1.1 (CLEANUP)
// 1. CLEANUP: Removed unused imports (Calendar, User, AlertCircle, motion) to resolve warnings.
// 2. STATUS: Fully optimized for message viewing.

import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Mail, Loader2, ArrowRight, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Define localized type here to ensure stability
export interface ClientMessage {
    id: string;
    client_name: string;
    sender_email: string;
    case_title: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

export const InboxTab: React.FC = () => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ClientMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ClientMessage | null>(null);

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        try {
            const data = await apiService.getInboundMessages();
            setMessages(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8"/></div>;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
            {/* Message List */}
            <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/3 bg-gray-900/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md`}>
                <div className="p-5 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Mail size={18} className="text-blue-400"/> {t('inbox.title', 'Mesazhet')}
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full ml-auto">{messages.length}</span>
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {messages.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                            <Mail size={32} className="mb-2 opacity-20"/>
                            <p>{t('inbox.empty', 'Asnjë mesazh')}</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                onClick={() => setSelectedMessage(msg)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedMessage?.id === msg.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-white text-sm truncate">{msg.client_name}</h4>
                                    <span className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
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
                        <button onClick={() => setSelectedMessage(null)} className="lg:hidden absolute top-4 left-4 p-2 bg-white/10 rounded-lg text-white">
                            <ArrowRight className="rotate-180" size={20}/>
                        </button>
                        
                        <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6 mt-8 lg:mt-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                {selectedMessage.client_name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedMessage.client_name}</h2>
                                <p className="text-sm text-blue-400">{selectedMessage.sender_email}</p>
                            </div>
                            <div className="ml-auto text-right hidden sm:block">
                                <div className="text-xs text-gray-500 font-mono mb-1">PROJEKTI</div>
                                <div className="text-sm text-white font-medium bg-white/5 px-3 py-1 rounded-lg">{selectedMessage.case_title}</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedMessage.content}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                            <a href={`mailto:${selectedMessage.sender_email}`} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">
                                <MessageSquare size={18} /> Përgjigju me Email
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                        <Mail size={64} className="mb-4" />
                        <p>Zgjidhni një mesazh për të lexuar</p>
                    </div>
                )}
            </div>
        </div>
    );
};