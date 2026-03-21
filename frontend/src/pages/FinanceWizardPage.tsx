// FILE: src/pages/FinanceWizardPage.tsx
// PHOENIX PROTOCOL - REVISION 14 (DESIGN SYSTEM ALIGNMENT)
// 1. STYLE: Applied Phoenix Glassmorphism to all UI elements using design system variables.
// 2. CONSISTENCY: Aligned layout, components, and spacing with the new UI standard.
// 3. UX: Enhanced all interactive states for a premium, tactical feel.
// 4. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, 
    CheckCircle, 
    Calculator, 
    FileText, 
    ChevronRight, 
    ArrowLeft,
    ShieldAlert,
    Download,
    Loader2,
    Copy,
    Check,
    ExternalLink
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
        <div className="bg-surface border border-border-main p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between group hover:border-primary/30 transition-all gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <span className="bg-card text-text-primary text-sm font-bold px-2.5 py-1 rounded-md border border-border-main">
                        [{number}]
                    </span>
                    <span className="text-text-muted text-sm font-medium truncate" title={label}>
                        {label}
                    </span>
                </div>
                <div className="text-2xl font-mono font-bold text-text-primary pl-1">
                    {value.toFixed(2)} <span className="text-xs text-text-muted font-sans">{currency}</span>
                </div>
            </div>
            <button 
                onClick={handleCopy}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border ${
                    copied 
                        ? 'bg-success-start/20 text-success-start border-success-start/30' 
                        : 'bg-hover text-text-secondary hover:text-text-primary border-border-main'
                }`}
                title={t('finance.wizard.atk.copy')}
            >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span className="sm:hidden text-sm font-medium">
                    {copied ? t('finance.wizard.atk.copied') : t('finance.wizard.atk.copy')}
                </span>
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
                    <div 
                        className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                            currentStep >= step.id 
                                ? 'bg-primary text-inverse border-primary shadow-lg shadow-primary/30' 
                                : 'bg-surface border-border-main text-text-muted'
                        }`}
                    >
                        <step.icon size={20} />
                    </div>
                    <span className={`ml-3 text-sm font-bold hidden md:block ${
                        currentStep >= step.id ? 'text-text-primary' : 'text-text-muted'
                    }`}>
                        {step.label}
                    </span>
                    {index < steps.length - 1 && (
                        <div className={`w-16 h-1 mx-4 rounded-full ${
                            currentStep > step.id ? 'bg-primary' : 'bg-border-main'
                        }`} />
                    )}
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
            <div className="bg-success-start/10 border border-success-start/30 rounded-3xl p-8 text-center">
                <div className="w-20 h-20 bg-success-start/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-success-start/20">
                    <CheckCircle className="text-success-start" size={40} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{t('finance.wizard.cleanRecordTitle')}</h3>
                <p className="text-base text-text-secondary">{t('finance.wizard.cleanRecordDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {critical.length > 0 && (
                <div className="bg-danger/10 border border-danger/30 rounded-2xl p-6">
                    <h3 className="flex items-center text-danger font-bold mb-4 text-base">
                        <ShieldAlert className="mr-3" size={24} />
                        {t('finance.wizard.criticalIssues')} ({critical.length})
                        <span className="ml-auto text-xs bg-danger/20 px-3 py-1 rounded-lg text-danger border border-danger/30">{t('finance.wizard.mustFix')}</span>
                    </h3>
                    <div className="space-y-3">
                        {critical.map(issue => (
                            <div key={issue.id} className="bg-surface p-3 rounded-lg flex items-start gap-3 border border-border-main">
                                <span className="w-2 h-2 bg-danger rounded-full mt-1.5 flex-shrink-0" />
                                <p className="text-sm text-text-secondary break-words">{issue.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="bg-warning-start/10 border border-warning-start/30 rounded-2xl p-6">
                    <h3 className="flex items-center text-warning-start font-bold mb-4 text-base">
                        <AlertTriangle className="mr-3" size={24} />
                        {t('finance.wizard.warnings')} ({warnings.length})
                        <span className="ml-auto text-xs bg-warning-start/20 px-3 py-1 rounded-lg text-warning-start border border-warning-start/30">{t('finance.wizard.recommended')}</span>
                    </h3>
                    <div className="space-y-3">
                        {warnings.map(issue => (
                            <div key={issue.id} className="bg-surface p-3 rounded-lg flex items-start gap-3 border border-border-main">
                                <span className="w-2 h-2 bg-warning-start rounded-full mt-1.5 flex-shrink-0" />
                                <p className="text-sm text-text-secondary break-words">{issue.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TaxStep = ({ data }: { data: TaxCalculation }) => {
    const { t } = useTranslation();
    const isPayable = data.net_obligation > 0;
    const isSmallBusiness = data.regime === 'SMALL_BUSINESS';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl">
                    <p className="text-xs text-primary font-bold uppercase tracking-wide">{isSmallBusiness ? t('finance.wizard.regimeSmall') : t('finance.wizard.regimeVat')}</p>
                    <p className="text-sm text-text-secondary mt-1">{isSmallBusiness ? t('finance.wizard.rate9') : t('finance.wizard.rate18')}</p>
                </div>

                <div className="bg-surface border border-border-main p-5 rounded-2xl">
                    <p className="text-sm text-text-muted mb-1">{t('finance.wizard.totalSales')}</p>
                    <p className="text-3xl font-bold text-text-primary">€{data.total_sales_gross.toFixed(2)}</p>
                    {!isSmallBusiness && (
                        <div className="mt-3 text-sm text-success-start flex items-center font-medium"><span className="bg-success-start/20 px-2 py-1 rounded-md mr-2 text-xs">{t('finance.wizard.vatCollected')}</span>€{data.vat_collected.toFixed(2)}</div>
                    )}
                </div>

                <div className={`bg-surface border border-border-main p-5 rounded-2xl ${isSmallBusiness ? 'opacity-60' : ''}`}>
                    <p className="text-sm text-text-muted mb-1">{isSmallBusiness ? t('finance.wizard.operationalExpenses') : t('finance.wizard.totalPurchases')}</p>
                    <p className="text-3xl font-bold text-text-primary">€{data.total_purchases_gross.toFixed(2)}</p>
                    {isSmallBusiness ? (
                        <div className="mt-3 text-xs text-text-muted flex items-center"><span className="bg-border-main px-2 py-1 rounded-md mr-2">{t('finance.wizard.noTaxEffect')}</span></div>
                    ) : (
                        <div className="mt-3 text-sm text-danger flex items-center font-medium"><span className="bg-danger/20 px-2 py-1 rounded-md mr-2 text-xs">{t('finance.wizard.vatDeductible')}</span>€{data.vat_deductible.toFixed(2)}</div>
                    )}
                </div>
            </div>

            <div className={`p-8 rounded-3xl border-2 flex flex-col justify-center items-center text-center shadow-xl ${
                isPayable ? 'bg-danger/10 border-danger/30' : 'bg-success-start/10 border-success-start/30'
            }`}>
                <h3 className="text-lg font-medium text-text-secondary mb-2">{data.description}</h3>
                <span className={`text-5xl font-black ${isPayable ? 'text-danger' : 'text-success-start'}`}>€{Math.abs(data.net_obligation).toFixed(2)}</span>
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
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() === 0 ? 12 : today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear());

    const localeMap: { [key: string]: any } = { sq, al: sq, en: enUS };
    const currentLocale = localeMap[i18n.language] || enUS;

    useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

    const fetchData = async () => { setLoading(true); setErrorMsg(null); try { const data = await apiService.getWizardState(selectedMonth, selectedYear); setState(data); } catch (error: any) { console.error("Failed to fetch wizard state", error); setErrorMsg(t('error.generic')); } finally { setLoading(false); } };
    const handleDownloadReport = async () => { setDownloading(true); try { await apiService.downloadMonthlyReport(selectedMonth, selectedYear); } catch (error) { alert(t('error.generic')); } finally { setDownloading(false); } };
    const handleOpenATK = () => { window.open('https://edeklarimi.atk-ks.org/', '_blank'); };
    const handleNext = () => { if (step < 3) setStep(step + 1); };
    const handlePrev = () => { if (step > 1) setStep(step - 1); };

    return (
        <div className="flex h-screen bg-canvas text-text-primary overflow-hidden font-sans">
             <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 pointer-events-none" />
                
                <div className="p-6 border-b border-border-main flex items-center justify-between bg-glass backdrop-blur-md z-10 flex-shrink-0">
                    <button onClick={() => navigate('/business')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hover text-text-secondary hover:text-text-primary transition-colors"><ArrowLeft size={20} /> <span className="hidden sm:inline">{t('finance.wizard.back')}</span></button>
                    <h1 className="text-xl font-bold text-text-primary">{t('finance.monthlyClose')}</h1>
                    <div className="w-24" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-center mb-10 gap-4">
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="glass-input capitalize text-base appearance-none cursor-pointer">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{format(new Date(2024, m - 1, 1), 'MMMM', { locale: currentLocale })}</option>))}
                            </select>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="glass-input text-base appearance-none cursor-pointer">
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                            </select>
                        </div>

                        <StepIndicator currentStep={step} />

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-16 h-16" /></div>
                        ) : errorMsg ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center"><div className="bg-danger/10 p-4 rounded-full mb-4"><AlertTriangle className="text-danger w-10 h-10" /></div><p className="text-danger text-lg mb-4">{errorMsg}</p><button onClick={fetchData} className="btn-secondary">{t('documentsPanel.reconnect')}</button></div>
                        ) : state ? (
                            <AnimatePresence mode="wait">
                                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="bg-glass backdrop-blur-md border border-border-main rounded-3xl p-6 sm:p-10 shadow-xl">
                                    {step === 1 && (<div><h2 className="text-2xl font-bold mb-8 text-text-primary">{t('finance.wizard.stepAudit')}</h2><AuditStep issues={state.issues} /></div>)}
                                    {step === 2 && (<div><h2 className="text-2xl font-bold mb-8 text-text-primary">{t('finance.wizard.stepTax')}</h2><TaxStep data={state.calculation} /></div>)}
                                    {step === 3 && (
                                        <div>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                                                <h2 className="text-2xl font-bold text-text-primary">{t('finance.wizard.readyToFile')}</h2>
                                                <button onClick={handleOpenATK} className="btn-primary flex items-center gap-2"><ExternalLink size={16} />{t('finance.wizard.atk.openEdi')}</button>
                                            </div>
                                            <div className="bg-surface rounded-2xl p-6 border border-border-main mb-8">
                                                <p className="text-text-muted mb-6 text-sm">{t('finance.wizard.atk.copyInstruction')}</p>
                                                <div className="space-y-4">
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
                                            </div>
                                            <div className="flex justify-center">
                                                <button onClick={handleDownloadReport} disabled={downloading} className="btn-secondary flex items-center gap-3 disabled:opacity-50"><Download size={20} />{t('finance.wizard.downloadReport')}</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-12 pt-8 border-t border-border-main">
                                        <button onClick={handlePrev} disabled={step === 1} className={`px-8 py-3 rounded-xl transition-colors font-bold ${step === 1 ? 'text-text-muted cursor-not-allowed' : 'text-text-secondary bg-hover hover:bg-hover'}`}>{t('general.cancel')}</button>
                                        {step < 3 && (<button onClick={handleNext} disabled={step === 1 && !state.ready_to_close} className={`flex items-center gap-3 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${step === 1 && !state.ready_to_close ? 'bg-surface text-text-muted cursor-not-allowed' : 'btn-primary'}`}>{step === 1 && !state.ready_to_close ? t('finance.wizard.fixIssues') : t('finance.wizard.next')}<ChevronRight size={20} /></button>)}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        ) : null}
                    </div>
                </div>
             </div>
        </div>
    );
};

export default FinanceWizardPage;