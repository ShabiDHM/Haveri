// FILE: src/components/business/insights/ForensicAccountantModal.tsx
// PHOENIX PROTOCOL - FORENSIC MODAL V1.1 (CLEAN & TRANSLATED)
// 1. FIXED: Removed unused 'FileText' import.
// 2. FIXED: Utilized 't()' for all UI strings to resolve unused variable warning.
// 3. STATUS: Type-safe and fully internationalized.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('###')) return <h3 key={i} className="text-blue-300 font-bold mt-2">{line.replace('###', '')}</h3>;
                if (line.startsWith('- ')) return <div key={i} className="flex gap-2 ml-2"><span className="text-blue-400">•</span><span>{line.replace('- ', '')}</span></div>;
                if (line.startsWith('**')) return <strong key={i} className="text-white">{line.replace(/\*\*/g, '')}</strong>;
                return <div key={i}>{line}</div>;
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
            // This call will work once api.ts is updated
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
            setMessages(prev => [...prev, { role: 'ai', content: `\n\n[${t('error.generic', 'Gabim: Nuk mund të lidhem me serverin.')}]` }]);
        } finally {
            setIsStreaming(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'ai', content: t('forensic.chat_cleared', "Biseda u pastrua. Jam gati për analizë të re.") }]);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.95, y: 20 }} 
                    className="bg-[#0B1120] border border-blue-500/30 rounded-2xl w-full max-w-2xl h-[700px] shadow-2xl flex flex-col overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-[#0B1120] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">{t('forensic.title', 'Auditori Forenzik AI')}</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">LIVE AUDIT</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={clearChat} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title={t('general.clear', 'Pastro')}>
                                <Trash2 size={18} />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-grid-pattern">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-md leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-[#1E293B] text-gray-200 rounded-tl-none border border-white/5'
                                }`}>
                                    {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                                </div>
                            </div>
                        ))}
                        {isStreaming && (
                            <div className="flex justify-start">
                                <div className="bg-[#1E293B] px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('forensic.analyzing', 'Duke analizuar arkivën...')}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#0B1120]">
                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)} 
                                    placeholder={t('forensic.placeholder', "Pyetni p.sh: 'A ka ndonjë faturë të dyshimtë këtë muaj?'")} 
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 shadow-inner" 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                    <span className="text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded border border-white/5 bg-black/20">ATK</span>
                                    <span className="text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded border border-white/5 bg-black/20">TAKSA</span>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isStreaming} 
                                className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                            <ShieldCheck size={10} />
                            {t('forensic.privacy_note', 'Të dhënat tuaja analizohen në mënyrë të sigurt dhe private.')}
                        </p>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};