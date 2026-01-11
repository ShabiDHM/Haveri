// FILE: src/components/business/insights/TaxModule.tsx
// PHOENIX PROTOCOL - TAX ADVISOR V4.3 (I18N FIX)
// 1. I18N FIX: Replaced hardcoded "Powered by" text with a dynamic translation key.

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Landmark, TrendingDown, TrendingUp, Calculator, HelpCircle, X, Send, 
    AlertTriangle, CheckCircle, Loader2, MessageSquare, Trash2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, TaxAuditResult } from '../../../services/api';

// --- MARKDOWN & TYPEWRITER COMPONENTS (Reused) ---

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const paragraphs = content.split(/\n\n+/);
    return (
        <div className="space-y-2 text-sm leading-relaxed">
            {paragraphs.map((paragraph, pIdx) => {
                const lines = paragraph.split('\n');
                return (
                    <div key={pIdx}>
                        {lines.map((line, lIdx) => {
                            const isListItem = /^[•-]\s|^\d+\.\s/.test(line);
                            const cleanLine = line.replace(/^[•-]\s|^\d+\.\s/, '');
                            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                            const renderedLine = parts.map((part, k) => {
                                if (part.startsWith('**') && part.endsWith('**')) return <strong key={k} className="font-bold">{part.slice(2, -2)}</strong>;
                                return <span key={k}>{part}</span>;
                            });

                            if (isListItem) {
                                return (
                                    <div key={`${pIdx}-${lIdx}`} className="flex gap-2 ml-1 mb-1">
                                        <span className="opacity-60 mt-1.5 text-[8px]">●</span>
                                        <div className="flex-1">{renderedLine}</div>
                                    </div>
                                );
                            }
                            return <React.Fragment key={`${pIdx}-${lIdx}`}>{renderedLine}{lIdx < lines.length - 1 && <br />}</React.Fragment>;
                        })}
                    </div>
                );
            })}
        </div>
    );
};

const TypewriterMessage: React.FC<{ content: string; onComplete?: () => void }> = ({ content, onComplete }) => {
    const [displayedContent, setDisplayedContent] = useState("");
    useEffect(() => {
        let index = 0;
        const intervalId = setInterval(() => {
            setDisplayedContent(content.slice(0, index + 1));
            index++;
            if (index >= content.length) {
                clearInterval(intervalId);
                if (onComplete) onComplete();
            }
        }, 5);
        return () => clearInterval(intervalId);
    }, [content, onComplete]);
    return <MarkdownRenderer content={displayedContent} />;
};

// --- MAIN COMPONENT ---

interface TaxModuleProps {
    data: {
        vatCollected: number;
        vatDeductible: number;
        estimatedLiability: number;
    };
}

export const TaxModule: React.FC<TaxModuleProps> = ({ data }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { vatCollected, vatDeductible, estimatedLiability } = data;

    // --- STATE MANAGEMENT ---
    const [showChat, setShowChat] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditResult, setAuditResult] = useState<TaxAuditResult | null>(null);

    // Chat State
    const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string, isNew?: boolean}[]>([
        { role: 'bot', text: t('tax.chatWelcome', 'Përshëndetje! Unë jam asistenti juaj tatimor. Keni ndonjë pyetje për zbritshmërinë e shpenzimeve?'), isNew: true }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

    // --- HANDLERS ---

    const handleMonthlyCloseClick = async () => {
        setShowAudit(true);
        setAuditLoading(true);
        try {
            const today = new Date();
            const result = await apiService.analyzeTaxAnomalies(today.getMonth() + 1, today.getFullYear());
            setAuditResult(result);
        } catch (error) {
            console.error("Audit failed", error);
            navigate('/finance/wizard');
        } finally {
            setAuditLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        
        setMessages(prev => prev.map(m => ({...m, isNew: false})));
        setMessages(prev => [...prev, { role: 'user', text: userMsg, isNew: false }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const response = await apiService.chatWithTaxBot(userMsg);
            setMessages(prev => [...prev, { role: 'bot', text: response, isNew: true }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: t('error.generic', 'Dicka shkoi keq. Ju lutem provoni përsëri.'), isNew: true }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleClearChat = () => {
        if (window.confirm(t('general.confirmClearChat', 'A jeni i sigurt që doni të fshini bisedën?'))) {
            setMessages([
                { role: 'bot', text: t('tax.chatWelcome', 'Përshëndetje! Unë jam asistenti juaj tatimor. Keni ndonjë pyetje për zbritshmërinë e shpenzimeve?'), isNew: true }
            ]);
        }
    };

    return (
        <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-auto lg:h-[540px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Landmark className="text-blue-400" /> {t('insights.tax.estimator', 'Vlerësimi i TVSH-së')}
                    </h3>
                    <button onClick={() => setShowChat(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-blue-300 transition-colors" title={t('tax.askAdvisor', 'Pyet Asistentin Tatimor')}>
                        <HelpCircle size={20} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col justify-center relative z-10">
                    <div className="relative pt-4 pb-8 text-center">
                        <p className="text-gray-400 text-sm mb-1">{t('insights.tax.toPay', 'Për të paguar (Vlerësim)')}</p>
                        <h2 className={`text-4xl font-bold tracking-tight ${estimatedLiability > 0 ? 'text-white' : 'text-emerald-400'}`}>
                            €{Math.abs(estimatedLiability).toFixed(2)}
                        </h2>
                        {estimatedLiability < 0 && <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 mt-2 inline-block">Kredi Tatimore</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2"><TrendingUp size={14} /> TVSH e Mbledhur</div>
                            <p className="text-xl font-mono text-white">€{vatCollected.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-2"><TrendingDown size={14} /> TVSH e Zbritshme</div>
                            <p className="text-xl font-mono text-white">€{vatDeductible.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="px-4">
                        <button onClick={handleMonthlyCloseClick} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 group">
                            <Calculator size={18} className="group-hover:rotate-12 transition-transform"/>{t('finance.monthlyClose', 'Mbyllja Mujore')}
                        </button>
                    </div>
                </div>
                
                <p className="text-[10px] text-gray-500 mt-auto text-center italic border-t border-white/5 pt-3 flex-shrink-0">
                    * {t('insights.tax.disclaimer', 'Ky është vetëm një vlerësim. Konsultohuni me kontabilistin tuaj.')}
                </p>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            </div>

            {/* --- MODAL: CONVERSATIONAL TAX BOT --- */}
            <AnimatePresence>
                {showChat && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f172a] border border-blue-500/30 rounded-2xl w-full max-w-md h-[600px] shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-blue-900/20 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><MessageSquare size={20} /></div>
                                    <div><h3 className="font-bold text-white text-sm">Asistenti Tatimor</h3>
                                        {/* PHOENIX FIX: Hardcoded string replaced */}
                                        <p className="text-xs text-blue-300">{t('tax.poweredBy', 'Powered by Kosovo Tax Laws')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleClearChat} className="text-gray-400 hover:text-red-400 p-2 hover:bg-white/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg"><X size={20}/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                            : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                                        }`}>
                                            {msg.role === 'bot' && msg.isNew ? (
                                                <TypewriterMessage content={msg.text} />
                                            ) : (
                                                msg.role === 'bot' ? <MarkdownRenderer content={msg.text} /> : msg.text
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5">
                                            <Loader2 size={16} className="animate-spin text-blue-400" />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/20">
                                <div className="relative">
                                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Pyetni p.sh: A mund ta zbres TVSH-në për dreka?" className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                                    <button type="submit" disabled={!chatInput.trim() || chatLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"><Send size={16} /></button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MODAL: AI AUDIT --- */}
            <AnimatePresence>
                {showAudit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
                            <div className="p-6">
                                {auditLoading ? (
                                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                                        <Loader2 size={48} className="animate-spin text-blue-500" />
                                        <div><h3 className="text-xl font-bold text-white">Duke analizuar transaksionet...</h3><p className="text-gray-400 text-sm">AI po kontrollon faturat për anomali ligjore.</p></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${auditResult?.status === 'CLEAR' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{auditResult?.status === 'CLEAR' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}</div>
                                            <div><h3 className="text-xl font-bold text-white">{auditResult?.status === 'CLEAR' ? 'Gjithçka Duket Mirë' : 'U Zbuluan Anomali'}</h3><p className="text-sm text-gray-400">Raporti i Inteligjencës Artificiale</p></div>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                            {auditResult?.anomalies.map((note, idx) => (<div key={idx} className="flex gap-3 mb-3 last:mb-0 text-sm text-gray-300"><div className="min-w-[6px] w-[6px] h-[6px] rounded-full bg-amber-500 mt-1.5" /><p>{note}</p></div>))}
                                            {auditResult?.anomalies.length === 0 && (<p className="text-gray-500 italic text-center text-sm">Nuk u gjet asnjë problem. Jeni gati për mbyllje.</p>)}
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setShowAudit(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors">Rishiko sërish</button>
                                            <button onClick={() => navigate('/finance/wizard')} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all">{auditResult?.status === 'CLEAR' ? 'Vazhdo te Mbyllja' : 'Injoro & Vazhdo'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};