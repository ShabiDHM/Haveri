// FILE: src/pages/FinanceWizardPage.tsx
// PHOENIX PROTOCOL - FINANCE WIZARD V16.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Semantic Tailwind classes (glass-panel, border-border-main, text-text-*, etc.)
// ADDED: shadow-sm, hover-lift, consistent backdrop blur.
// RETAINED: All logic and functionality.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, CheckCircle, Calculator, FileText, ChevronRight, ArrowLeft,
    ShieldAlert, Download, Loader2, Copy, Check, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService, WizardState, AuditIssue, TaxCalculation } from '../services/api';
import { format } from 'date-fns';
import { sq, enUS } from 'date-fns/locale';

// --- TACTICAL COMPONENTS ---

const ATKBox = ({ number, label, value, currency }: { number: string, label: string, value: number, currency: string }) => {
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

    const handleCopy = () => {
        navigator.clipboard.writeText(value.toFixed(2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-surface/30 backdrop-blur-sm border border-border-main p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between group hover:border-primary-start/30 transition-all gap-4 hover-lift shadow-sm">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <span className="bg-canvas text-text-primary text-sm font-bold px-2.5 py-1 rounded-md border border-border-main">
                        [{number}]
                    </span>
                    <span className="text-text-muted text-sm font-medium truncate" title={label}>{label}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-text-primary pl-1">
                    {value.toFixed(2)} <span className="text-xs text-text-muted font-sans">{currency}</span>
                </div>
            </div>
            <button 
                onClick={handleCopy}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border hover-lift ${
                    copied ? 'bg-success-start/20 text-success-start border-success-start/30' : 'bg-surface/30 text-text-secondary hover:text-text-primary border-border-main'
                }`}
            >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span className="sm:hidden text-sm font-medium">{copied ? t('finance.wizard.atk.copied') : t('finance.wizard.atk.copy')}</span>
            </button>
        </div>
    );
};

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const { t } = useTranslation();
    const steps = [
        { id: 1, label: t('finance.wizard.stepAudit'), icon: ShieldAlert },
        { id: 2, label: t('finance.wizard.stepTax'), icon: Calculator },
        { id: 3, label: t('finance.wizard.stepFinalize'), icon: FileText },
    ];

    return (
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-12">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shadow-sm ${currentStep >= step.id ? 'bg-primary-start text-text-inverse border-primary-start shadow-primary-start/30' : 'bg-surface/30 backdrop-blur-sm border-border-main text-text-muted'}`}>
                        <step.icon size={20} />
                    </div>
                    <span className={`ml-3 text-sm font-bold hidden md:block ${currentStep >= step.id ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</span>
                    {index < steps.length - 1 && <div className={`w-16 h-1 mx-4 rounded-full ${currentStep > step.id ? 'bg-primary-start' : 'bg-border-main'}`} />}
                </div>
            ))}
        </div>
    );
};

const AuditStep = ({ issues }: { issues: AuditIssue[] }) => {
    const { t } = useTranslation();
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    const warnings = issues.filter(i => i.severity === 'WARNING');

    if (issues.length === 0) {
        return (
            <div className="bg-success-start/10 border border-success-start/30 rounded-3xl p-8 text-center shadow-sm">
                <div className="w-20 h-20 bg-success-start/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-success-start/20">
                    <CheckCircle className="text-success-start" size={40} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{t('finance.wizard.cleanRecordTitle')}</h3>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            {critical.length > 0 && (
                <div className="bg-danger-start/10 border border-danger-start/30 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center text-danger-start font-bold mb-4 text-base"><ShieldAlert className="mr-3" size={24} />{t('finance.wizard.criticalIssues')} ({critical.length})</h3>
                    <div className="space-y-3">{critical.map(issue => <div key={issue.id} className="bg-surface/30 backdrop-blur-sm p-3 rounded-lg flex items-start gap-3 border border-border-main"><span className="w-2 h-2 bg-danger-start rounded-full mt-1.5" /><p className="text-sm text-text-secondary">{issue.message}</p></div>)}</div>
                </div>
            )}
            {warnings.length > 0 && (
                <div className="bg-warning-start/10 border border-warning-start/30 rounded-2xl p-6 shadow-sm">
                    <h3 className="flex items-center text-warning-start font-bold mb-4 text-base"><AlertTriangle className="mr-3" size={24} />{t('finance.wizard.warnings')} ({warnings.length})</h3>
                    <div className="space-y-3">{warnings.map(issue => <div key={issue.id} className="bg-surface/30 backdrop-blur-sm p-3 rounded-lg flex items-start gap-3 border border-border-main"><span className="w-2 h-2 bg-warning-start rounded-full mt-1.5" /><p className="text-sm text-text-secondary">{issue.message}</p></div>)}</div>
                </div>
            )}
        </div>
    );
};

const TaxStep = ({ data }: { data: TaxCalculation }) => {
    const { t } = useTranslation();
    const isPayable = data.net_obligation > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-primary-start/10 border border-primary-start/30 p-4 rounded-2xl shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-primary-start">
                        {data.regime === 'SMALL_BUSINESS' ? t('finance.wizard.regimeSmall') : t('finance.wizard.regimeVat')}
                    </p>
                </div>
                <div className="bg-surface/30 backdrop-blur-sm border border-border-main p-5 rounded-2xl shadow-sm">
                    <p className="text-sm text-text-muted mb-2">{t('finance.wizard.totalSales')}</p>
                    <p className="text-3xl font-bold text-text-primary">€{data.total_sales_gross.toFixed(2)}</p>
                    {data.regime !== 'SMALL_BUSINESS' && (
                        <p className="text-xs text-success-start mt-2">TVSH Mbledhur: €{data.vat_collected.toFixed(2)}</p>
                    )}
                </div>
                <div className="bg-surface/30 backdrop-blur-sm border border-border-main p-5 rounded-2xl shadow-sm">
                    <p className="text-sm text-text-muted mb-2">{t('finance.wizard.totalPurchases')}</p>
                    <p className="text-3xl font-bold text-text-primary">€{data.total_purchases_gross.toFixed(2)}</p>
                    {data.regime !== 'SMALL_BUSINESS' && (
                        <p className="text-xs text-danger-start mt-2">TVSH Zbritshme: €{data.vat_deductible.toFixed(2)}</p>
                    )}
                </div>
            </div>
            <div className={`p-8 rounded-3xl border-2 flex flex-col justify-center items-center text-center shadow-sm bg-surface/30 backdrop-blur-sm ${
                isPayable ? 'border-danger-start/30' : 'border-success-start/30'
            }`}>
                <h3 className="text-lg font-medium text-text-secondary mb-2">{data.description}</h3>
                <span className={`text-5xl font-black ${isPayable ? 'text-danger-start' : 'text-success-start'}`}>
                    €{Math.abs(data.net_obligation).toFixed(2)}
                </span>
            </div>
        </div>
    );
};

const FinanceWizardPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [state, setState] = useState<WizardState | null>(null);
    
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
    const currentLocale = localeMap[i18n.language] || enUS;

    useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

    const fetchData = async () => { 
        setLoading(true); 
        setErrorMsg(null); 
        try { 
            const data = await apiService.getWizardState(selectedMonth, selectedYear); 
            setState(data); 
        } catch (e) { 
            setErrorMsg(t('error.generic')); 
        } finally { 
            setLoading(false); 
        } 
    };

    const handleDownloadReport = async () => { 
        setDownloading(true); 
        try { await apiService.downloadMonthlyReport(selectedMonth, selectedYear); } 
        finally { setDownloading(false); } 
    };

    const handleOpenATK = () => { window.open('https://edeklarimi.atk-ks.org/', '_blank'); };

    return (
        <div className="flex h-screen bg-canvas text-text-primary overflow-hidden font-sans">
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-border-main flex items-center justify-between bg-glass backdrop-blur-md z-10 shadow-sm">
                    <button 
                        onClick={() => navigate('/business')} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/30 backdrop-blur-sm text-text-secondary hover:text-text-primary transition-colors hover-lift shadow-sm border border-border-main"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-text-primary">{t('finance.monthlyClose')}</h1>
                    <div className="w-24" />
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-center mb-10 gap-4">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(Number(e.target.value))} 
                                className="glass-input capitalize border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all bg-surface/30 backdrop-blur-sm"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>
                                        {format(new Date(2024, m - 1, 1), 'MMMM', { locale: currentLocale })}
                                    </option>
                                ))}
                            </select>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))} 
                                className="glass-input border border-border-main focus:border-primary-start focus:ring-1 focus:ring-primary-start/40 transition-all bg-surface/30 backdrop-blur-sm"
                            >
                                {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        
                        {errorMsg && (
                            <div className="bg-danger-start/10 border border-danger-start/30 text-danger-start p-4 rounded-xl mb-6 text-center shadow-sm">
                                {errorMsg}
                            </div>
                        )}

                        <StepIndicator currentStep={step} />
                        {loading ? 
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-start w-16 h-16" /></div> 
                            : state && (
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={step} 
                                    className="glass-panel border border-border-main rounded-3xl p-10 shadow-sm bg-surface/30 backdrop-blur-sm"
                                >
                                    {step === 1 && <AuditStep issues={state.issues} />}
                                    {step === 2 && <TaxStep data={state.calculation} />}
                                    {step === 3 && (
                                        <div>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-bold text-text-primary">{t('finance.wizard.readyToFile')}</h2>
                                                <button 
                                                    onClick={handleOpenATK} 
                                                    className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 hover-lift shadow-sm"
                                                >
                                                    <ExternalLink size={16} />
                                                    {t('finance.wizard.atk.openEdi')}
                                                </button>
                                            </div>
                                            <div className="space-y-4 mb-8">
                                                {state.calculation.regime === 'SMALL_BUSINESS' ? (
                                                    <>
                                                        <ATKBox number="9" label={t('finance.wizard.atk.box9')} value={state.calculation.total_sales_gross} currency={state.calculation.currency} />
                                                        <ATKBox number="11" label={t('finance.wizard.atk.box11')} value={state.calculation.net_obligation} currency={state.calculation.currency} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <ATKBox number="10" label={t('finance.wizard.atk.box10')} value={state.calculation.total_sales_gross} currency={state.calculation.currency} />
                                                        <ATKBox number="23" label={t('finance.wizard.atk.box23')} value={state.calculation.total_purchases_gross} currency={state.calculation.currency} />
                                                        <ATKBox number="48" label={t('finance.wizard.atk.box48')} value={state.calculation.net_obligation} currency={state.calculation.currency} />
                                                    </>
                                                )}
                                            </div>
                                            <button 
                                                onClick={handleDownloadReport} 
                                                disabled={downloading} 
                                                className="w-full glass-input !bg-surface/30 backdrop-blur-sm hover:bg-surface/50 transition-colors py-4 rounded-xl flex items-center justify-center gap-2 border border-border-main hover:border-primary-start/50 hover-lift shadow-sm"
                                            >
                                                {downloading ? <Loader2 className="animate-spin" /> : <><Download size={20} />{t('finance.wizard.downloadReport')}</>}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-12 pt-8 border-t border-border-main">
                                        <button 
                                            onClick={() => setStep(Math.max(1, step - 1))} 
                                            disabled={step === 1} 
                                            className={`px-8 py-3 rounded-xl transition-colors hover-lift shadow-sm ${
                                                step === 1 
                                                    ? 'text-text-muted cursor-not-allowed' 
                                                    : 'bg-surface/30 backdrop-blur-sm text-text-secondary hover:text-text-primary border border-border-main hover:border-primary-start/50'
                                            }`}
                                        >
                                            Kthehu
                                        </button>
                                        {step < 3 && (
                                            <button 
                                                onClick={() => setStep(Math.min(3, step + 1))} 
                                                className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2 hover-lift shadow-sm"
                                            >
                                                Vazhdo <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceWizardPage;
