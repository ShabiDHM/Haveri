// FILE: src/components/landing/ProductShowcase.tsx
// PHOENIX PROTOCOL - PRODUCT SHOWCASE V16.1 (LINT FIX)
// 1. FIX: Removed unused 'BrainCircuit' import.
// 2. STATUS: Production Ready. Clean.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    FileText, ScanEye, 
    CheckCircle, PenTool, FolderOpen, 
    Sparkles, Calculator, TrendingUp, Package, ChefHat, Layers, Sun, Coffee
} from 'lucide-react';

const ProductShowcase = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    // Auto-rotate slides
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % 6);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const features = [
        {
            id: 0,
            title: t('showcase.daily_title', 'Inteligjenca Ditore'),
            desc: t('showcase.daily_desc', 'Raporti i mëngjesit që parashikon ditën tuaj.'),
            icon: <Sun className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-amber-400 to-orange-500",
            mockup: <BriefingMockup />
        },
        {
            id: 1,
            title: t('showcase.inventory_title', 'Inventari & Recetat'),
            desc: t('showcase.inventory_desc', 'Llogaritje kostoje automatike për çdo produkt.'),
            icon: <Package className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-emerald-500 to-teal-600",
            mockup: <InventoryMockup />
        },
        {
            id: 2,
            title: t('showcase.finance_title', 'Financa & POS'),
            desc: t('showcase.finance_desc', 'Sinkronizim me pikat e shitjes dhe raporte tatimore.'),
            icon: <Calculator className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-blue-500 to-indigo-600",
            mockup: <FinanceMockup />
        },
        {
            id: 3,
            title: t('showcase.scan_title', 'Deep Scan OCR'),
            desc: t('showcase.scan_desc', 'Lexon dhe indekson faturat fizike në sekonda.'),
            icon: <ScanEye className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-purple-500 to-fuchsia-600",
            mockup: <DeepScanMockup />
        },
        {
            id: 4,
            title: t('showcase.draft_title', 'Draftim Ligjor AI'),
            desc: t('showcase.draft_desc', 'Kontrata komplekse të gjeneruara nga AI.'),
            icon: <PenTool className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-rose-500 to-pink-600",
            mockup: <DraftingMockup />
        },
        {
            id: 5,
            title: t('showcase.archive_title', 'Arkiva e Gjallë'),
            desc: t('showcase.archive_desc', 'Të gjitha dokumentet në një vend të sigurt.'),
            icon: <FolderOpen className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-cyan-500 to-blue-500",
            mockup: <ArchiveMockup />
        }
    ];

    return (
        <div className="py-16 lg:py-24 bg-background-dark relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-primary-start/10 rounded-full blur-[80px] lg:blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-secondary-start/10 rounded-full blur-[80px] lg:blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-10 lg:mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        {t('showcase.title', 'Jo Thjesht Softuer. Partneri Juaj.')}
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
                        {t('showcase.subtitle', 'Sistem operativ komplet për biznesin modern.')}
                    </p>
                </div>

                {/* --- MOBILE NAVIGATION (Horizontal Scroll) --- */}
                <div className="lg:hidden flex overflow-x-auto gap-3 mb-8 no-scrollbar pb-2 px-2">
                    {features.map((feature, index) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveTab(index)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                                activeTab === index 
                                ? 'bg-white/10 border-white/30 text-white' 
                                : 'bg-transparent border-white/5 text-gray-500'
                            }`}
                        >
                            <div className={`p-1 rounded-full bg-gradient-to-br ${feature.color} text-white`}>
                                {feature.icon}
                            </div>
                            <span className="text-sm font-bold">{feature.title}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    
                    {/* --- DESKTOP CONTROLS --- */}
                    <div className="hidden lg:block space-y-3">
                        {features.map((feature, index) => (
                            <button
                                key={feature.id}
                                onClick={() => setActiveTab(index)}
                                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border group ${
                                    activeTab === index 
                                    ? 'bg-white/10 border-white/20 shadow-2xl scale-[1.02]' 
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className={`text-base font-bold mb-0.5 transition-colors ${activeTab === index ? 'text-white' : 'text-gray-300'}`}>
                                            {feature.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed transition-colors ${activeTab === index ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* --- VISUAL STAGE --- */}
                    <div className="relative h-[350px] sm:h-[400px] lg:h-[500px] w-full perspective-1000">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20, rotateY: 5 }}
                                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                                exit={{ opacity: 0, x: -20, rotateY: -5 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute inset-0"
                            >
                                <div className="w-full h-full bg-gray-900 rounded-3xl border border-glass-edge shadow-2xl overflow-hidden relative flex flex-col">
                                    {/* Mockup Header */}
                                    <div className="h-8 lg:h-10 bg-black/40 border-b border-white/5 flex items-center px-4 gap-2 flex-shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                    </div>
                                    
                                    {/* Mockup Body */}
                                    <div className="p-4 lg:p-6 flex-1 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
                                        {features[activeTab].mockup}
                                    </div>

                                    {/* Mobile Footer Desc */}
                                    <div className="lg:hidden p-4 bg-black/40 border-t border-white/5 backdrop-blur-md">
                                        <p className="text-sm text-gray-300 text-center">
                                            {features[activeTab].desc}
                                        </p>
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

const BriefingMockup = () => (
    <div className="flex flex-col h-full justify-center space-y-4">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
                <Sun className="text-amber-400" size={24} />
                <div>
                    <h4 className="text-white font-bold text-sm">Raporti i Mëngjesit</h4>
                    <p className="text-gray-400 text-xs">E Enjte, 24 Tetor • 06:00</p>
                </div>
            </div>
            <p className="text-gray-300 text-sm italic">"Mirëmëngjes. Sot keni 3 fatura të prapambetura dhe stoku i 'Kafe Espresso' është kritik."</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Të Hyrat Dje</p>
                <p className="text-emerald-400 font-mono text-lg font-bold">+€1,240.50</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Evente Sot</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <p className="text-white text-sm font-bold">2 Takime</p>
                </div>
            </div>
        </div>
    </div>
);

const InventoryMockup = () => (
    <div className="flex flex-col h-full gap-4">
        {/* Recipe Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/20 rounded-lg"><ChefHat className="text-teal-400" size={20} /></div>
                    <div>
                        <h4 className="text-white font-bold">Espresso Macchiato</h4>
                        <span className="text-xs text-gray-400">Recipe #104</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-emerald-400 font-mono font-bold text-lg">€0.18</span>
                    <span className="text-[10px] text-gray-500 uppercase">Kosto për njësi</span>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs p-2 bg-black/20 rounded">
                    <span className="text-gray-300">Kafe Kokërr (18g)</span>
                    <span className="text-gray-500">€0.12</span>
                </div>
                <div className="flex justify-between text-xs p-2 bg-black/20 rounded">
                    <span className="text-gray-300">Qumësht (30ml)</span>
                    <span className="text-gray-500">€0.06</span>
                </div>
            </div>
        </div>
        
        {/* Low Stock Alert */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3"
        >
            <div className="p-1.5 bg-rose-500/20 rounded-full"><TrendingUp size={16} className="text-rose-400 rotate-180" /></div>
            <div>
                <p className="text-rose-200 text-xs font-bold">STOKU KRITIK</p>
                <p className="text-rose-400 text-sm">Qumësht: Mbetur 2.5 Litra</p>
            </div>
        </motion.div>
    </div>
);

const FinanceMockup = () => (
    <div className="h-full flex flex-col gap-4 justify-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex gap-3">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-[10px] uppercase"><Layers size={12} /> POS Batch</div>
                <div className="text-lg lg:text-xl font-mono text-white">45 Trans.</div>
            </div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-[10px] uppercase"><TrendingUp size={12} /> Profit</div>
                <div className="text-lg lg:text-xl font-mono text-white">€ 340.50</div>
            </div>
        </div>
        
        <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Top Produkti</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">Sot</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Coffee size={16} className="text-orange-400" />
                    <span className="text-white font-medium">Cappuccino</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">+€120</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
                <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} transition={{ duration: 1.5 }} className="bg-orange-400 h-1.5 rounded-full"></motion.div>
            </div>
        </div>
    </div>
);

const DeepScanMockup = () => (
    <div className="space-y-2 lg:space-y-3 h-full flex flex-col justify-center">
        {[1, 2, 3].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }} className="flex items-center justify-between p-2 lg:p-3 bg-white/5 border border-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 lg:p-2 bg-purple-500/10 rounded"><FileText className="w-3 h-3 lg:w-4 lg:h-4 text-purple-400" /></div>
                    <div className="space-y-1"><div className="h-1.5 lg:h-2 w-16 lg:w-24 bg-gray-700 rounded" /><div className="h-1 lg:h-1.5 w-10 lg:w-16 bg-gray-800 rounded" /></div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-16 lg:w-24 h-1 lg:h-1.5 bg-gray-800 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.5, delay: i * 0.2 }} className="h-full bg-green-500" /></div>
                    <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-green-500" />
                </div>
            </motion.div>
        ))}
    </div>
);

const DraftingMockup = () => (
    <div className="relative h-full flex flex-col justify-center p-2">
        <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden">
            <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="absolute top-0 left-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
            <div className="flex gap-2">
                <div className="w-2/3 h-2 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
                <div className="w-full h-1.5 bg-gray-800 rounded" />
                <div className="w-5/6 h-1.5 bg-gray-800 rounded" />
                <div className="w-4/6 h-1.5 bg-gray-800 rounded" />
            </div>
        </div>
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 1 }}
            className="absolute -bottom-2 -right-2 bg-rose-600 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
        >
            <Sparkles size={12} /> AI Generated
        </motion.div>
    </div>
);

const ArchiveMockup = () => (
    <div className="grid grid-cols-2 gap-3 lg:gap-4 h-full content-center">
        {[1, 2, 3, 4].map(i => (
            <motion.div key={i} whileHover={{ scale: 1.05 }} className="aspect-square bg-gray-800/50 border border-white/5 rounded-xl p-3 lg:p-4 flex flex-col items-center justify-center gap-2 lg:gap-3 cursor-pointer">
                <FolderOpen className={`w-8 h-8 lg:w-10 lg:h-10 ${i === 1 ? 'text-cyan-500' : 'text-blue-500'}`} />
                <div className="h-1.5 lg:h-2 w-12 lg:w-16 bg-gray-700 rounded" />
            </motion.div>
        ))}
    </div>
);

export default ProductShowcase;