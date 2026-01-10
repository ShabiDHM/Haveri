// FILE: src/components/landing/ProductShowcase.tsx
// PHOENIX PROTOCOL - SHOWCASE V18.1 (LINT FIX)
// 1. CLEANUP: Removed all unused imports and legacy mockup components.
// 2. STATUS: This file is now clean, error-free, and fully synchronized with the application's latest features.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    LayoutDashboard, 
    Calculator, 
    Package, 
    BrainCircuit, 
    FileQuestion,
    TrendingUp,
    AlertTriangle,
    ChefHat,
    FileSpreadsheet
} from 'lucide-react';

const ProductShowcase = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    // Auto-rotate slides
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % 5);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const features = [
        {
            id: 0,
            title: t('showcase.dashboard_title', 'Dashboard Inteligjent'),
            desc: t('showcase.dashboard_desc', 'Analiza YTD (nga 1 Janari) për të hyrat, shpenzimet, dhe fitimin neto me një klik.'),
            icon: <LayoutDashboard className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-blue-400 to-indigo-600",
            mockup: <DashboardMockup />
        },
        {
            id: 1,
            title: t('showcase.recipe_title', 'Menaxhimi i Recetave & COGS'),
            desc: t('showcase.recipe_desc', 'Importoni receta, lidhni me stokun dhe llogaritni koston e saktë për çdo produkt të shitur.'),
            icon: <ChefHat className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-amber-400 to-orange-500",
            mockup: <RecipeMockup />
        },
        {
            id: 2,
            title: t('showcase.doc_qa_title', 'Analisti i Dokumenteve'),
            desc: t('showcase.doc_qa_desc', 'Bisedoni me çdo dokument në arkivën tuaj. Bëni pyetje, merrni përgjigje të menjëhershme.'),
            icon: <FileQuestion className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-cyan-400 to-sky-600",
            mockup: <DocQAMockup />
        },
        {
            id: 3,
            title: t('showcase.data_analyst_title', 'Analisti i të Dhënave (CSV/Excel)'),
            desc: t('showcase.data_analyst_desc', 'Ngarkoni çdo skedar Excel ose CSV dhe lëreni AI-në të gjejë trende, anomali dhe t\'ju përgjigjet pyetjeve.'),
            icon: <FileSpreadsheet className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-emerald-400 to-green-600",
            mockup: <DataAnalystMockup />
        },
        {
            id: 4,
            title: t('showcase.dual_agent_title', 'Dy Agjentë, Një Platformë'),
            desc: t('showcase.dual_agent_desc', 'Këshilltari i Biznesit për operacione dhe Hartuesi Ligjor për dokumente profesionale.'),
            icon: <BrainCircuit className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-violet-500 to-purple-600",
            mockup: <DualAgentMockup />
        }
    ];

    return (
        <div className="py-16 lg:py-24 bg-background-dark relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"><div className="absolute top-[-20%] left-[-10%] w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-primary-start/10 rounded-full blur-[80px] lg:blur-[100px]" /><div className="absolute bottom-[-20%] right-[-10%] w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-secondary-start/10 rounded-full blur-[80px] lg:blur-[100px]" /></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-10 lg:mb-16"><h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('showcase.title', 'Sistemi Operativ për Biznesin Tuaj')}</h2><p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">{t('showcase.subtitle', 'Nga menaxhimi i stokut tek inteligjenca artificiale – gjithçka në një vend.')}</p></div>
                <div className="lg:hidden flex overflow-x-auto gap-3 mb-8 no-scrollbar pb-2 px-2">{features.map((feature, index) => (<button key={feature.id} onClick={() => setActiveTab(index)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${ activeTab === index ? 'bg-white/10 border-white/30 text-white' : 'bg-transparent border-white/5 text-gray-500'}`}><div className={`p-1 rounded-full bg-gradient-to-br ${feature.color} text-white`}>{feature.icon}</div><span className="text-sm font-bold">{feature.title}</span></button>))}</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="hidden lg:block space-y-3">{features.map((feature, index) => (<button key={feature.id} onClick={() => setActiveTab(index)} className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border group ${ activeTab === index ? 'bg-white/10 border-white/20 shadow-2xl scale-[1.02]' : 'bg-transparent border-transparent hover:bg-white/5'}`}><div className="flex items-center gap-4"><div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>{feature.icon}</div><div><h3 className={`text-base font-bold mb-0.5 transition-colors ${activeTab === index ? 'text-white' : 'text-gray-300'}`}>{feature.title}</h3><p className={`text-sm leading-relaxed transition-colors ${activeTab === index ? 'text-gray-300' : 'text-gray-500'}`}>{feature.desc}</p></div></div></button>))}</div>
                    <div className="relative h-[350px] sm:h-[400px] lg:h-[500px] w-full perspective-1000">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, x: 20, rotateY: 5 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: -20, rotateY: -5 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0">
                                <div className="w-full h-full bg-gray-900 rounded-3xl border border-glass-edge shadow-2xl overflow-hidden relative flex flex-col">
                                    <div className="h-8 lg:h-10 bg-black/40 border-b border-white/5 flex items-center px-4 gap-2 flex-shrink-0"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" /></div>
                                    <div className="p-4 lg:p-6 flex-1 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden flex items-center justify-center">{features[activeTab].mockup}</div>
                                    <div className="lg:hidden p-4 bg-black/40 border-t border-white/5 backdrop-blur-md"><p className="text-sm text-gray-300 text-center">{features[activeTab].desc}</p></div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NEW, UPDATED MOCKUPS ---

const DashboardMockup = () => (
    <div className="w-full max-w-md grid grid-cols-2 gap-3">
        {[{t: 'Të Hyrat', a: '€12,450', i: <TrendingUp/>, c: 'text-emerald-400'}, {t: 'Fitimi Neto', a: '€3,120', i: <Calculator/>, c: 'text-blue-400'}].map(d => (
            <div key={d.t} className="bg-gray-800/80 border border-white/10 rounded-xl p-3"><p className={`text-xs font-bold uppercase flex items-center gap-2 ${d.c}`}>{d.i} {d.t}</p><p className="text-2xl font-mono font-bold text-white mt-1">{d.a}</p></div>
        ))}
        <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400" />
            <div><p className="text-amber-200 text-xs font-bold">SMART ANALYST</p><p className="text-amber-300 text-sm">Kosto e Mallrave (COGS) është rritur për 15% këtë muaj.</p></div>
        </div>
    </div>
);

const RecipeMockup = () => (
    <div className="w-full max-w-sm space-y-3">
        <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-xl"><ChefHat className="text-blue-400" size={18} /></div><h4 className="text-white font-bold">Whiskey Cola</h4></div><div className="text-right"><span className="block text-rose-400 font-mono font-bold">€1.95</span><span className="text-[10px] text-gray-500 uppercase">Kosto</span></div></div>
            <div className="space-y-1 pl-4 border-l border-dashed border-white/10 ml-4">
                <div className="text-xs text-gray-400">Jack Daniels <span className="font-mono text-blue-400">x0.05</span></div>
                <div className="text-xs text-gray-400">Coca Cola (Kanaqe) <span className="font-mono text-blue-400">x1</span></div>
            </div>
        </div>
        <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-4 opacity-70">
            <div className="flex justify-between items-start"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-xl"><ChefHat className="text-blue-400" size={18} /></div><h4 className="text-white font-bold">Macchiato e Madhe</h4></div><div className="text-right"><span className="block text-rose-400 font-mono font-bold">€0.34</span><span className="text-[10px] text-gray-500 uppercase">Kosto</span></div></div>
        </div>
    </div>
);

const DocQAMockup = () => (
    <div className="w-full max-w-sm space-y-3">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-end">
            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-none text-sm">Cilat janë afatet e pagesës në këtë kontratë?</div>
        </motion.div>
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex justify-start">
            <div className="bg-gray-700/80 border border-white/10 p-3 rounded-2xl rounded-bl-none text-sm text-gray-200">
                <p className="font-bold text-xs mb-1 uppercase text-blue-400">Haveri i Dokumenteve</p>
                Afati i pagesës është 15 ditë nga data e faturimit, siç specifikohet në Nenin 4.2.
            </div>
        </motion.div>
    </div>
);

const DataAnalystMockup = () => (
    <div className="w-full max-w-md p-4 bg-gray-800/50 border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl"><FileSpreadsheet className="text-emerald-400" size={20} /></div>
            <h4 className="text-white font-bold">Raporti_Shitjeve_Q4.xlsx</h4>
        </div>
        <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-300">"Përmbledhje: Shitjet u rritën me 25% krahasuar me Q3, të udhëhequra nga produkti 'Espresso Macchiato'."</div>
        <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-300">"Anomali: U vërejt një rënie e papritur e shitjeve më 15 Dhjetor."</div>
    </div>
);

const DualAgentMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3 items-end">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><BrainCircuit size={16} className="text-violet-400" /></div>
            <div className="bg-violet-500/10 border border-violet-500/20 p-3 rounded-2xl rounded-bl-none text-sm text-violet-200">"Bazuar në trendin, parashikoj rritje të kërkesës për kafe takeaway."</div>
        </motion.div>
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-3 items-end flex-row-reverse">
             <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><Package size={16} className="text-amber-400" /></div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl rounded-br-none text-sm text-amber-200 text-right">"Prandaj, kam draftuar një porosi për 'Gota Kartoni' për miratim."</div>
        </motion.div>
    </div>
);

export default ProductShowcase;