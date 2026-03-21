// FILE: src/components/landing/ProductShowcase.tsx
// PHOENIX PROTOCOL - SHOWCASE V20.0 (DESIGN SYSTEM ALIGNMENT)
// 1. ADDED: Forensic Auditor AI and Client Portal slides.
// 2. UI: Updated mockups to reflect real-world Haveri UI (ATK labels, legal citations).
// 3. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 4. STATUS: 100% synchronized with Pro features.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    LayoutDashboard, 
    Calculator, 
    ShieldCheck, 
    BrainCircuit, 
    FileQuestion,
    TrendingUp,
    AlertTriangle,
    ChefHat,
    FileSpreadsheet,
    Globe,
    Search
} from 'lucide-react';

const ProductShowcase = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % 6);
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const features = [
        {
            id: 0,
            title: t('showcase.forensic_title', 'Auditori Forenzik AI'),
            desc: t('showcase.forensic_desc', 'AI që lidh faturat tuaja direkt me ligjet e ATK-së dhe gjen parregullsi ligjore automatikisht.'),
            icon: <ShieldCheck className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-primary to-primary/80",
            mockup: <ForensicMockup />
        },
        {
            id: 1,
            title: t('showcase.portal_title', 'Portal i Sigurt për Klientë'),
            desc: t('showcase.portal_desc', 'Hapni një dritare transparente për klientët tuaj. Ndani dokumente dhe komunikoni në kohë reale.'),
            icon: <Globe className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-success-start to-success-start/80",
            mockup: <PortalMockup />
        },
        {
            id: 2,
            title: t('showcase.recipe_title', 'Recetat & Analiza COGS'),
            desc: t('showcase.recipe_desc', 'Lidhni çdo shitje me koston e përbërësve. Fitimi Neto llogaritet automatikisht për çdo macchiato.'),
            icon: <ChefHat className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-warning-start to-warning-start/80",
            mockup: <RecipeMockup />
        },
        {
            id: 3,
            title: t('showcase.data_analyst_title', 'Analisti i të Dhënave'),
            desc: t('showcase.data_analyst_desc', 'Skanoni imazhe ose ngarkoni Excel. AI strukturon të dhënat dhe gjen trendet e fshehura.'),
            icon: <FileSpreadsheet className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-primary to-primary/80",
            mockup: <DataAnalystMockup />
        },
        {
            id: 4,
            title: t('showcase.dashboard_title', 'Dashboard i Performancës'),
            desc: t('showcase.dashboard_desc', 'Monitoroni ritmin e biznesit, borxhet e klientëve dhe parashikimet e rimbushjes së stokut.'),
            icon: <LayoutDashboard className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-danger to-danger/80",
            mockup: <DashboardMockup />
        },
        {
            id: 5,
            title: t('showcase.dual_agent_title', 'Agjentët Inteligjentë'),
            desc: t('showcase.dual_agent_desc', 'Këshilltari i Biznesit dhe Hartuesi Ligjor bashkëpunojnë për të rritur efiçiencën tuaj.'),
            icon: <BrainCircuit className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-primary to-primary/80",
            mockup: <DualAgentMockup />
        }
    ];

    return (
        <div className="py-16 lg:py-24 bg-canvas relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-10 lg:mb-16">
                    <h2 className="text-3xl sm:text-4xl font-black text-text-primary mb-4 uppercase tracking-tight">Eksploro Kapacitetet</h2>
                    <p className="text-lg lg:text-xl text-text-secondary max-w-2xl mx-auto">Një ekosistem i plotë për automatizimin e biznesit tuaj.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="space-y-3">
                        {features.map((feature, index) => (
                            <button key={feature.id} onClick={() => setActiveTab(index)} className={`w-full text-left p-5 rounded-2xl transition-all duration-300 border group ${ activeTab === index ? 'bg-surface/50 border-border-main shadow-lg scale-[1.02]' : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} text-inverse shadow-sm`}>{feature.icon}</div>
                                    <div>
                                        <h3 className={`text-base font-bold mb-0.5 ${activeTab === index ? 'text-text-primary' : 'text-text-secondary'}`}>{feature.title}</h3>
                                        <p className="text-sm leading-relaxed text-text-muted">{feature.desc}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="relative h-[400px] lg:h-[550px] w-full">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="absolute inset-0">
                                <div className="w-full h-full bg-card rounded-3xl border border-border-main shadow-xl overflow-hidden relative flex flex-col">
                                    <div className="h-10 bg-surface border-b border-border-main flex items-center px-4 gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-danger/40" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-warning-start/40" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-success-start/40" />
                                    </div>
                                    <div className="p-6 flex-1 bg-gradient-to-b from-surface to-canvas relative overflow-hidden flex items-center justify-center">
                                        {features[activeTab].mockup}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MOCKUPS ---

const ForensicMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="text-primary" size={20} />
                <span className="text-xs font-bold text-text-primary uppercase">Gjetje e Auditorit</span>
            </div>
            <p className="text-sm text-text-secondary italic mb-3">"Fatura #2024-001 përmban TVSH 18% për qira banimi."</p>
            <div className="bg-surface p-2.5 rounded-lg border border-border-main">
                <p className="text-[10px] text-primary font-bold mb-1">REFERENCA LIGJORE:</p>
                <p className="text-[11px] text-text-muted">Ligji për TVSH, Neni 9, p. 1(p). Lirimi nga tatimi për qiratë e banimit.</p>
            </div>
        </div>
        <div className="flex justify-center"><div className="px-4 py-2 btn-primary text-xs font-bold shadow-sm">Gjenero Raportin Forenzik</div></div>
    </div>
);

const PortalMockup = () => (
    <div className="w-full max-w-sm bg-card border border-border-main rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-success-start/10 border-b border-border-main flex items-center gap-3">
            <Globe className="text-success-start" size={18} />
            <span className="text-xs font-bold text-text-primary uppercase">Client Portal Hub</span>
        </div>
        <div className="p-4 space-y-3">
            <div className="h-12 bg-surface rounded-xl border border-border-main flex items-center px-3 justify-between">
                <div className="flex items-center gap-2"><div className="w-6 h-6 bg-danger/20 rounded flex items-center justify-center"><FileQuestion size={12} className="text-danger"/></div><span className="text-xs text-text-secondary">Fatura_Janar.pdf</span></div>
                <div className="text-[10px] font-bold text-success-start uppercase">Shared</div>
            </div>
            <div className="h-20 bg-surface rounded-xl border border-border-main p-3">
                 <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Dërgo Mesazh</p>
                 <div className="flex gap-2"><div className="flex-1 h-6 bg-surface rounded border border-border-main" /><div className="w-6 h-6 bg-primary rounded" /></div>
            </div>
        </div>
    </div>
);

const RecipeMockup = () => (
    <div className="w-full max-w-sm space-y-3">
        <div className="bg-surface border border-border-main rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2"><div className="bg-success-start/20 text-success-start text-[9px] px-2 py-0.5 rounded-full font-bold">SMART COGS</div></div>
            <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-3"><div className="p-2 bg-warning-start/20 rounded-xl"><ChefHat className="text-warning-start" size={18} /></div><h4 className="text-text-primary font-bold text-sm">Macchiato e Madhe</h4></div><div className="text-right"><span className="block text-danger font-mono font-bold">€0.34</span><span className="text-[10px] text-text-muted uppercase">Kosto</span></div></div>
            <div className="space-y-1.5 pl-4 border-l border-dashed border-border-main ml-4">
                <div className="text-[11px] text-text-muted flex justify-between"><span>Kafe Antica</span> <span className="text-primary">€0.22</span></div>
                <div className="text-[11px] text-text-muted flex justify-between"><span>Qumësht Vita</span> <span className="text-primary">€0.12</span></div>
            </div>
        </div>
    </div>
);

const DashboardMockup = () => (
    <div className="w-full max-w-md grid grid-cols-2 gap-3">
        {[{t: 'Të Hyrat', a: '€12,450', i: <TrendingUp/>, c: 'text-success-start'}, {t: 'Fitimi Neto', a: '€3,120', i: <Calculator/>, c: 'text-primary'}].map(d => (
            <div key={d.t} className="bg-surface/50 border border-border-main rounded-2xl p-4"><p className={`text-[10px] font-bold uppercase flex items-center gap-2 ${d.c}`}>{d.i} {d.t}</p><p className="text-2xl font-black text-text-primary mt-1">{d.a}</p></div>
        ))}
        <div className="col-span-2 bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-2 bg-danger/20 rounded-lg text-danger"><AlertTriangle size={20} /></div>
            <div><p className="text-danger text-xs font-bold uppercase tracking-widest">Stoku Kritik</p><p className="text-text-muted text-sm">3 artikuj duhet të rimbushen sot.</p></div>
        </div>
    </div>
);

const DataAnalystMockup = () => (
    <div className="w-full max-w-sm p-5 bg-card border border-border-main rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/20"><FileSpreadsheet className="text-primary" size={20} /></div>
            <h4 className="text-text-primary font-bold text-sm">analiza_q4.csv</h4>
        </div>
        <div className="space-y-2">
            <div className="h-2 w-full bg-border-main rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-primary" /></div>
            <p className="text-[10px] text-primary font-mono text-center">AI IS IDENTIFYING TRENDS...</p>
        </div>
    </div>
);

const DualAgentMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-border-main flex items-center justify-center shrink-0"><BrainCircuit size={16} className="text-primary" /></div>
            <div className="bg-surface border border-border-main p-3 rounded-2xl rounded-tl-none text-xs text-text-secondary leading-relaxed">"Sipas analizës, ky shpenzim nuk është i zbritshëm."</div>
        </div>
        <div className="flex gap-3 items-start flex-row-reverse">
             <div className="w-8 h-8 rounded-full bg-success-start/20 border border-border-main flex items-center justify-center shrink-0"><Search size={16} className="text-success-start" /></div>
            <div className="bg-success-start/10 border border-success-start/20 p-3 rounded-2xl rounded-tr-none text-xs text-success-start leading-relaxed">"Saktë. Neni 12 i ligjit për rregullat e shpenzimeve e konfirmon këtë."</div>
        </div>
    </div>
);

export default ProductShowcase;