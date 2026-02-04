// FILE: src/components/business/insights/ForensicAccountantModal.tsx
// PHOENIX PROTOCOL - FORENSIC MODAL V1.4 (PDF EXPORT INTEGRATION)
// 1. FEATURE: Added "Download PDF" button for exporting AI audit reports.
// 2. LOGIC: Button is disabled during streaming and enabled upon completion.
// 3. STATUS: Complete, unabridged, and ready for deployment.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, ShieldCheck, Loader2, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';

// --- MARKDOWN COMPONENT (Enhanced Scale) ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="space-y-4 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('###')) return <h3 key={i} className="text-blue-300 font-black mt-6 mb-2 text-xl border-b border-blue-500/20 pb-1 uppercase tracking-tighter">{line.replace('###', '')}</h3>;
                if (line.trim().startsWith('- ') || line.trim().startsWith('■')) return <div key={i} className="flex gap-3 ml-4 my-2"><span className="text-blue-500 font-bold mt-1.5 text-xs">■</span><span className="text-gray-200">{line.trim().substring(2)}</span></div>;
                if (line.includes('**')) {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return <div key={i} className="text-gray-200">{parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-white font-black bg-blue-500/10 px-1 rounded">{part.slice(2, -2)}</strong> : part)}</div>;
                }
                if (!line.trim()) return <div key={i} className="h-2" />;
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
        { role: 'ai', content: t('forensic.welcome_message', "Unë jam Auditori juaj Forenzik...") }
    ]);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

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
            setMessages(prev => [...prev, { role: 'ai', content: `\n\n[${t('error.generic')}]` }]);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleExportPDF = async () => {
        const lastAiMessage = messages.filter(m => m.role === 'ai').pop();
        if (!lastAiMessage || isStreaming) return;
        try {
            await apiService.downloadAuditReport(lastAiMessage.content);
        } catch (error) {
            alert('Failed to generate PDF.');
        }
    };
    
    const clearChat = () => {
        if (!isStreaming) setMessages([{ role: 'ai', content: t('forensic.chat_cleared') }]);
    };

    if (!isOpen) return null;

    const isWaitingForFirstToken = isStreaming && messages[messages.length - 1]?.content === '';
    const lastMessageIsCompleteAI = !isStreaming && messages.length > 1 && messages[messages.length - 1].role === 'ai';

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
                <motion.div initial={{ scale: 0.98, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 20 }} className="bg-[#0B1120] border border-blue-500/30 rounded-none sm:rounded-3xl w-full max-w-3xl h-full sm:h-[800px] shadow-2xl flex flex-col overflow-hidden relative">
                    <div className="p-5 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-[#0B1120] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/30 shadow-xl"><ShieldCheck size={28} /></div>
                            <div>
                                <h3 className="font-black text-white text-xl tracking-tight">{t('forensic.title')}</h3>
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                                    <span className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">PRO AUDIT MODE</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleExportPDF} disabled={!lastMessageIsCompleteAI} className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title={t('forensic.export_pdf', 'Eksporto PDF')}><FileDown size={22} /></button>
                            <button onClick={clearChat} disabled={isStreaming} className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-400 transition-all disabled:opacity-20" title={t('general.clear')}><Trash2 size={22} /></button>
                            <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"><X size={24}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar bg-grid-pattern">
                        {messages.map((msg, idx) => (
                            msg.content !== '' && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-5 sm:p-7 rounded-3xl text-base sm:text-lg shadow-2xl leading-relaxed border ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none border-blue-400/30' : 'bg-[#1E293B] text-gray-100 rounded-tl-none border-white/10'}`}>
                                        {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                                    </div>
                                </motion.div>
                            )
                        ))}
                        
                        {isWaitingForFirstToken && (
                            <div className="flex justify-start">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1E293B] px-6 py-4 rounded-2xl rounded-tl-none border border-blue-500/30 flex items-center gap-4 text-blue-400 text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-500/10">
                                    <Loader2 size={20} className="animate-spin" />
                                    {t('forensic.analyzing', 'Duke analizuar arkivën dhe ligjin...')}
                                </motion.div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-6 border-t border-white/10 bg-[#0B1120] shrink-0">
                        <div className="relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <input type="text" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('forensic.placeholder', "Pyetni p.sh: 'Analizo shpenzimet e këtij muaji...'")} className="w-full bg-[#1E293B] border border-white/20 rounded-2xl pl-5 pr-20 py-5 text-base sm:text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xl transition-all placeholder:text-gray-500" />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2"><span className="text-[11px] text-blue-400 font-black px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">ATK</span></div>
                            </div>
                            <button type="submit" disabled={!input.trim() || isStreaming} className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-xl">
                                <Send size={24} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-500/50" />
                            {t('forensic.privacy_note', 'Auditimi kryhet në kohë reale mbi të dhënat tuaja të arkivuara.')}
                        </p>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};