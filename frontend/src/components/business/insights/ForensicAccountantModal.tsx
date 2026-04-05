// FILE: src/components/business/insights/ForensicAccountantModal.tsx
// PHOENIX PROTOCOL - FORENSIC MODAL V5.6 (REMOVED PRO AUDIT MODE, IMPROVED AI)

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, ShieldCheck, Loader2, FolderInput, CheckCircle, Sparkles, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// --- MARKDOWN COMPONENT ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('###')) return (
                    <h3 key={i} className="text-xs font-black text-primary-start uppercase tracking-widest mt-6 mb-2 pb-2 border-b border-border-main">
                        {line.replace('###', '')}
                    </h3>
                );
                if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('■')) return (
                    <div key={i} className="flex gap-3 ml-2 my-1.5">
                        <span className="text-primary-start font-black mt-1 text-xs">•</span>
                        <span className="text-text-secondary">{line.trim().substring(2)}</span>
                    </div>
                );
                if (line.includes('**')) {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                        <div key={i} className="text-text-secondary">
                            {parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? (
                                <strong key={j} className="text-text-primary font-bold">
                                    {part.slice(2, -2)}
                               </strong>
                            ) : part)}
                        </div>
                    );
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <div key={i} className="text-text-secondary">{line}</div>;
            })}
        </div>
    );
};

// Suggested questions for users
const SUGGESTED_QUESTIONS = [
    { icon: "📊", text: "Cilat janë produktet më fitimprurëse?" },
    { icon: "⚠️", text: "Ku po humbas më shumë para?" },
    { icon: "📈", text: "Si mund të rris likuiditetin?" },
    { icon: "🏷️", text: "A janë çmimet e mia konkurruese?" },
    { icon: "📅", text: "Krahaso performancën me muajin e kaluar" },
    { icon: "💡", text: "Sugjero optimizime tatimore" },
];

interface ForensicAccountantModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId?: string;
}

export const ForensicAccountantModal: React.FC<ForensicAccountantModalProps> = ({ isOpen, onClose, workspaceId }) => {
    const { t } = useTranslation();
    const { selectedYear } = useAuth();
    
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; timestamp?: Date }[]>([
        { 
            role: 'ai', 
            content: "Përshëndetje! Unë jam Auditori juaj i Inteligjencës Artificiale. Kam akses në të gjitha të dhënat tuaja financiare - faturat, shpenzimet, inventarin dhe analizat. Si mund t'ju ndihmoj sot?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveSuccess]);

    const buildConversationContext = (): string => {
        const recentMessages = messages.slice(-8);
        let context = "KONTEKSTI I BISEDËS:\n\n";
        for (const msg of recentMessages) {
            const prefix = msg.role === 'user' ? 'Përdoruesi: ' : 'Auditori: ';
            context += prefix + msg.content + '\n\n';
        }
        return context;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userQuery = input.trim();
        setInput('');
        
        const userMessage: { role: 'user'; content: string; timestamp?: Date } = { role: 'user', content: userQuery, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        
        setIsStreaming(true);
        
        const aiPlaceholder: { role: 'ai'; content: string; timestamp?: Date } = { role: 'ai', content: '', timestamp: new Date() };
        setMessages(prev => [...prev, aiPlaceholder]);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const conversationContext = buildConversationContext();
            const enhancedQuery = `${conversationContext}\nPYETJA AKTUALE: ${userQuery}\n\nVITI I ZGJEDHUR: ${selectedYear}`;
            
            const reader = await apiService.chatWithAccountant(enhancedQuery, workspaceId, selectedYear);
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;
                
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex] && updated[lastIndex].role === 'ai') {
                        updated[lastIndex] = { ...updated[lastIndex], content: accumulatedContent };
                    }
                    return updated;
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (updated[lastIndex] && updated[lastIndex].role === 'ai') {
                    updated[lastIndex] = { 
                        ...updated[lastIndex], 
                        content: `Më vjen keq, pati një problem teknik. Ju lutem provoni përsëri.` 
                    };
                }
                return updated;
            });
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleSuggestedQuestion = (question: string) => {
        if (isStreaming) return;
        setInput(question);
        // Auto-submit after a short delay
        setTimeout(() => {
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSend(fakeEvent);
        }, 100);
    };

    const handleSaveToArchive = async () => {
        const lastAiMessage = messages.filter(m => m.role === 'ai').pop();
        if (!lastAiMessage || !lastAiMessage.content || isStreaming || isSaving) return;
        
        setIsSaving(true);
        try {
            await apiService.saveAuditReportToArchive(lastAiMessage.content, workspaceId);
            setSaveSuccess(true);
        } catch (error) {
            alert(t('forensic.save_failed', 'Dështoi ruajtja në arkivë.'));
        } finally {
            setIsSaving(false);
        }
    };
    
    const clearChat = () => {
        if (isStreaming) return;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setMessages([
            { 
                role: 'ai', 
                content: "Biseda u pastrua. Jam gati për analizë të re. Si mund t'ju ndihmoj?",
                timestamp: new Date()
            }
        ]);
        setIsStreaming(false);
    };

    if (!isOpen) return null;

    const lastMessageIsCompleteAI = !isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'ai' && messages[messages.length - 1].content !== '';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-canvas/80 backdrop-blur-sm"
                >
                    <motion.div 
                        initial={{ scale: 0.98, y: 20 }} 
                        animate={{ scale: 1, y: 0 }} 
                        exit={{ scale: 0.98, y: 20 }} 
                        className="glass-panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-sm border border-border-main"
                    >
                        
                        {/* Header - Removed PRO AUDIT MODE badge */}
                        <div className="flex items-center justify-between border-b border-border-main p-6 sm:p-8 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="text-primary-start shrink-0">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none mb-2">
                                        Auditori Forenzik AI
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-1.5 w-1.5 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-success-start"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-start"></span>
                                        </span>
                                        <span className="text-[10px] uppercase font-black text-success-start tracking-widest leading-none">
                                        </span>
                                        <span className="text-[10px] uppercase font-black text-text-muted tracking-widest leading-none ml-2 px-2 py-0.5 rounded-full bg-surface/50 border border-border-main">
                                            Viti: {selectedYear}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleSaveToArchive} 
                                    disabled={!lastMessageIsCompleteAI || isSaving} 
                                    className={`p-2 rounded-lg transition-all flex items-center justify-center hover-lift shadow-sm ${saveSuccess ? 'text-success-start' : 'text-text-muted hover:text-text-primary hover:bg-hover'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                    title={t('forensic.save_to_archive', 'Ruaj në Arkivë')}
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle size={18} /> : <FolderInput size={18} />}
                                </button>
                                
                                <button 
                                    onClick={clearChat} 
                                    disabled={isStreaming} 
                                    className="p-2 rounded-lg text-text-muted hover:text-danger-start hover:bg-hover transition-all hover-lift shadow-sm disabled:opacity-30" 
                                    title={t('general.clear')}
                                >
                                    <Trash2 size={18} />
                                </button>
                                
                                <div className="w-px h-4 bg-border-main mx-1" />
                                
                                <button 
                                    onClick={onClose} 
                                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-all hover-lift shadow-sm"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                msg.content !== '' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        key={idx} 
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-5 sm:p-6 text-sm shadow-sm border border-border-main ${
                                            msg.role === 'user' 
                                            ? 'glass-input border-primary-start/30 rounded-2xl rounded-tr-sm text-text-primary' 
                                            : 'glass-input rounded-2xl rounded-tl-sm text-text-secondary'
                                        }`}>
                                            {msg.role === 'ai' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                                        </div>
                                    </motion.div>
                                )
                            ))}
                            
                            {isStreaming && messages[messages.length - 1]?.content === '' && (
                                <div className="flex justify-start">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-input px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-3 border border-border-main">
                                        <Loader2 size={14} className="animate-spin text-primary-start" />
                                        <span className="text-xs font-black text-text-muted uppercase tracking-widest">
                                            Duke analizuar...
                                        </span>
                                    </motion.div>
                                </div>
                            )}
                            
                            {/* Suggested Questions - Only show when there are few messages */}
                            {messages.length <= 2 && !isStreaming && (
                                <div className="mt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <HelpCircle size={14} className="text-text-muted" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                            Pyetje të sugjeruara
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_QUESTIONS.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSuggestedQuestion(q.text)}
                                                className="text-xs px-3 py-2 rounded-full bg-surface/50 border border-border-main text-text-secondary hover:text-text-primary hover:border-primary-start/50 transition-all hover-lift"
                                            >
                                                <span className="mr-1">{q.icon}</span>
                                                {q.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-6 sm:p-8 border-t border-border-main shrink-0">
                            <div className="relative flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        autoFocus 
                                        value={input} 
                                        onChange={(e) => setInput(e.target.value)} 
                                        placeholder={isStreaming ? "Duke analizuar... Ju lutem prisni" : "Bëni pyetjen tuaj për financat, taksat, ose inventarin..."}
                                        className="glass-input w-full pr-16 py-4 text-sm placeholder:text-text-muted border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all disabled:opacity-50" 
                                        disabled={isStreaming}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Sparkles size={14} className="text-primary-start/50" />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isStreaming} 
                                    className="btn-primary h-[54px] w-[54px] flex items-center justify-center shrink-0 disabled:opacity-40 hover-lift shadow-sm"
                                >
                                    <Send size={18} className="ml-1" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <ShieldCheck size={12} className="text-primary-start/30" />
                                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">
                                    Ky auditim bazohet në të dhënat reale të biznesit tuaj për vitin {selectedYear}
                                </p>
                            </div>
                        </form>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};