// FILE: src/components/business/insights/ForensicAccountantModal.tsx
// PHOENIX PROTOCOL - FORENSIC MODAL V1.6 (SAVE TO ARCHIVE INTEGRATION)
// 1. CHANGED: 'Download PDF' button logic to 'Save to Archive'.
// 2. ICON: Swapped FileDown for FolderInput to reflect the action.
// 3. UX: Added success state ('Ruajtur!') after successful saving.
// 4. STATUS: Complete replacement.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, ShieldCheck, Loader2, FolderInput, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';

// --- MARKDOWN COMPONENT ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="space-y-3 text-base leading-relaxed whitespace-pre-wrap">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('###')) return <h3 key={i} className="text-blue-300 font-black mt-4 mb-2 text-lg border-b border-blue-500/20 pb-1 uppercase tracking-tighter">{line.replace('###', '')}</h3>;
                if (line.trim().startsWith('- ') || line.trim().startsWith('■')) return <div key={i} className="flex gap-2 ml-4 my-1"><span className="text-blue-500 font-bold mt-1.5 text-xs">■</span><span className="text-gray-200">{line.trim().substring(2)}</span></div>;
                if (line.includes('**')) {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return <div key={i} className="text-gray-200">{parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-white font-black bg-blue-500/10 px-1 rounded">{part.slice(2, -2)}</strong> : part)}</div>;
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <div key={i} className="text-gray-200">{line}</div>;
            })}
        </div>
    );
};

interface ForensicAccountantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ForensicAccountantModal: React.FC<ForensicAccountantModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
        { role: 'ai', content: t('forensic.welcome_message', "Unë jam Auditori juaj Forenzik. Kam qasje në arkivën tuaj dhe në Ligjet Tatimore të Kosovës. Çfarë dëshironi të kontrolloni sot?") }
    ]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    // Reset save status when new messages appear
    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [messages, saveSuccess]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userQuery = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
        setIsStreaming(true);
        setMessages(prev => [...prev, { role: 'ai', content: '' }]);

        try {
            const reader = await apiService.chatWithAccountant(userQuery);
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const newHistory = [...prev];
                    const lastMsg = newHistory[newHistory.length - 1];
                    lastMsg.content += chunk;
                    return newHistory;
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: `\n\n[${t('error.generic', 'Gabim Teknik: Nuk munda të lidhem me serverin.')}]` }]);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleSaveToArchive = async () => {
        const lastAiMessage = messages.filter(m => m.role === 'ai').pop();
        if (!lastAiMessage || isStreaming || isSaving) return;
        
        setIsSaving(true);
        try {
            await apiService.saveAuditReportToArchive(lastAiMessage.content);
            setSaveSuccess(true);
        } catch (error) {
            alert(t('forensic.save_failed', 'Dështoi ruajtja në arkivë.'));
        } finally {
            setIsSaving(false);
        }
    };
    
    const clearChat = () => {
        if (!isStreaming) setMessages([{ role: 'ai', content: t('forensic.chat_cleared', "Biseda u pastrua. Jam gati për analizë të re.") }]);
    };

    if (!isOpen) return null;

    const isWaitingForFirstToken = isStreaming && messages[messages.length - 1]?.content === '';
    const lastMessageIsCompleteAI = !isStreaming && messages.length > 1 && messages[messages.length - 1].role === 'ai';

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <motion.div initial={{ scale: 0.98, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 20 }} className="bg-[#0B1120] border border-blue-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative">
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-[#0B1120] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30 shadow-lg"><ShieldCheck size={24} /></div>
                            <div>
                                <h3 className="font-black text-white text-xl tracking-tight">{t('forensic.title')}</h3>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                                    <span className="text-xs uppercase font-black text-emerald-500 tracking-widest">PRO AUDIT MODE</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSaveToArchive} 
                                disabled={!lastMessageIsCompleteAI || isSaving} 
                                className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${saveSuccess ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                title={t('forensic.save_to_archive', 'Ruaj në Arkivë')}
                            >
                                {isSaving ? <Loader2 size={22} className="animate-spin" /> : saveSuccess ? <CheckCircle size={22} /> : <FolderInput size={22} />}
                            </button>
                            
                            <button onClick={clearChat} disabled={isStreaming} className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-400 transition-all disabled:opacity-20" title={t('general.clear')}><Trash2 size={22} /></button>
                            <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"><X size={24}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-grid-pattern">
                        {messages.map((msg, idx) => (
                            msg.content !== '' && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-4 rounded-2xl text-base shadow-md leading-relaxed border ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none border-blue-400/30' : 'bg-[#1E293B] text-gray-100 rounded-tl-none border-white/10'}`}>
                                        {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                                    </div>
                                </motion.div>
                            )
                        ))}
                        
                        {isWaitingForFirstToken && (
                            <div className="flex justify-start">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1E293B] px-5 py-3 rounded-full border border-blue-500/30 flex items-center gap-3 text-blue-400 text-xs font-bold uppercase tracking-widest shadow-lg">
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('forensic.analyzing', 'Duke analizuar...')}
                                </motion.div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#0B1120] shrink-0">
                        <div className="relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <input type="text" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('forensic.placeholder')} className="w-full bg-[#1E293B] border border-white/20 rounded-xl pl-4 pr-16 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner" />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2"><span className="text-[10px] text-blue-400 font-black px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">ATK</span></div>
                            </div>
                            <button type="submit" disabled={!input.trim() || isStreaming} className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-lg">
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500/50" />
                            {t('forensic.privacy_note', 'Auditimi kryhet në kohë reale mbi të dhënat tuaja të arkivuara.')}
                        </p>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};