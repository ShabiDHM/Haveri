// FILE: src/components/business/insights/ForensicAccountantModal.tsx
// PHOENIX PROTOCOL - FORENSIC MODAL V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. CHANGED: 'Download PDF' button logic to 'Save to Archive'.
// 2. ICON: Swapped FileDown for FolderInput to reflect the action.
// 3. UX: Added success state ('Ruajtur!') after successful saving.
// 4. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 5. STATUS: Complete replacement.

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
                if (line.startsWith('###')) return <h3 key={i} className="text-primary font-black mt-4 mb-2 text-lg border-b border-primary/20 pb-1 uppercase tracking-tighter">{line.replace('###', '')}</h3>;
                if (line.trim().startsWith('- ') || line.trim().startsWith('■')) return <div key={i} className="flex gap-2 ml-4 my-1"><span className="text-primary font-bold mt-1.5 text-xs">■</span><span className="text-text-secondary">{line.trim().substring(2)}</span></div>;
                if (line.includes('**')) {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return <div key={i} className="text-text-secondary">{parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-text-primary font-black bg-primary/10 px-1 rounded">{part.slice(2, -2)}</strong> : part)}</div>;
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <div key={i} className="text-text-secondary">{line}</div>;
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                <motion.div initial={{ scale: 0.98, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 20 }} className="bg-glass backdrop-blur-xl border border-primary/30 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden relative">
                    <div className="p-4 border-b border-border-main bg-gradient-to-r from-primary/40 to-surface flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/20 rounded-xl text-primary border border-primary/30 shadow-sm"><ShieldCheck size={24} /></div>
                            <div>
                                <h3 className="font-black text-text-primary text-xl tracking-tight">{t('forensic.title')}</h3>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success-start animate-pulse"/>
                                    <span className="text-xs uppercase font-black text-success-start tracking-widest">PRO AUDIT MODE</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSaveToArchive} 
                                disabled={!lastMessageIsCompleteAI || isSaving} 
                                className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${saveSuccess ? 'text-success-start bg-success-start/10 border border-success-start/30' : 'text-text-muted hover:text-text-primary hover:bg-hover'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                title={t('forensic.save_to_archive', 'Ruaj në Arkivë')}
                            >
                                {isSaving ? <Loader2 size={22} className="animate-spin" /> : saveSuccess ? <CheckCircle size={22} /> : <FolderInput size={22} />}
                            </button>
                            
                            <button onClick={clearChat} disabled={isStreaming} className="p-2.5 hover:bg-hover rounded-xl text-text-muted hover:text-danger transition-all disabled:opacity-20" title={t('general.clear')}><Trash2 size={22} /></button>
                            <button onClick={onClose} className="p-2.5 hover:bg-hover rounded-xl text-text-muted hover:text-text-primary transition-all"><X size={24}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-grid-pattern">
                        {messages.map((msg, idx) => (
                            msg.content !== '' && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-4 rounded-2xl text-base shadow-sm leading-relaxed border ${msg.role === 'user' ? 'bg-primary text-inverse rounded-tr-none border-primary/30' : 'bg-surface text-text-secondary rounded-tl-none border-border-main'}`}>
                                        {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                                    </div>
                                </motion.div>
                            )
                        ))}
                        
                        {isWaitingForFirstToken && (
                            <div className="flex justify-start">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface px-5 py-3 rounded-full border border-primary/30 flex items-center gap-3 text-primary text-xs font-bold uppercase tracking-widest shadow-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('forensic.analyzing', 'Duke analizuar...')}
                                </motion.div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t border-border-main bg-surface shrink-0">
                        <div className="relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <input type="text" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('forensic.placeholder')} className="glass-input w-full pr-16 py-3.5 text-base" />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2"><span className="text-[10px] text-primary font-black px-2 py-1 rounded bg-primary/10 border border-primary/20">ATK</span></div>
                            </div>
                            <button type="submit" disabled={!input.trim() || isStreaming} className="btn-primary p-3.5 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-text-muted text-center mt-3 flex items-center justify-center gap-2">
                            <ShieldCheck size={14} className="text-success-start/50" />
                            {t('forensic.privacy_note', 'Auditimi kryhet në kohë reale mbi të dhënat tuaja të arkivuara.')}
                        </p>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};