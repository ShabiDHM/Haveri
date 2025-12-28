// FILE: src/components/landing/ProductShowcase.tsx
// PHOENIX PROTOCOL - SHOWCASE V17.0 (BUSINESS ALIGNMENT)
// 1. REFACTOR: Updated mockups to reflect the new "Business Consultant" features (Rhythm, Inventory, Dual-Agent).
// 2. VISUALS: Aligned colors and icons with the new Dashboard styling.
// 3. CONTENT: Features now pitch "Profit", "Velocity", and "Compliance" rather than just "Legal Tech".

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    LayoutDashboard, 
    Calculator, 
    Package, 
    BrainCircuit, 
    Calendar, 
    FolderSearch,
    TrendingUp,
    AlertTriangle,
    CheckSquare,
    ChefHat,
    Scale,
    MessageSquare
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
            title: t('showcase.daily_title', 'Ritmi i Ditës'),
            desc: t('showcase.daily_desc', 'Monitoroni shitjet live krahasuar me targetin ditor.'),
            icon: <LayoutDashboard className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-emerald-400 to-green-600",
            mockup: <RhythmMockup />
        },
        {
            id: 1,
            title: t('showcase.inventory_title', 'Kosto & Receta'),
            desc: t('showcase.inventory_desc', 'Llogaritje automatike e profitit për çdo artikull.'),
            icon: <Package className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-blue-500 to-indigo-600",
            mockup: <InventoryMockup />
        },
        {
            id: 2,
            title: t('showcase.ai_title', 'Konsulenti AI'),
            desc: t('showcase.ai_desc', 'Dy agjentë: Një për biznes, një për çështje ligjore.'),
            icon: <BrainCircuit className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-violet-500 to-purple-600",
            mockup: <DualAgentMockup />
        },
        {
            id: 3,
            title: t('showcase.finance_title', 'Financa & TVSH'),
            desc: t('showcase.finance_desc', 'Përgatitje automatike për deklarimin tatimor.'),
            icon: <Calculator className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-amber-400 to-orange-500",
            mockup: <FinanceMockup />
        },
        {
            id: 4,
            title: t('showcase.calendar_title', 'Kalendari Smart'),
            desc: t('showcase.calendar_desc', 'Njoftime për pagesa faturash dhe afate tatimore.'),
            icon: <Calendar className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-rose-500 to-red-600",
            mockup: <CalendarMockup />
        },
        {
            id: 5,
            title: t('showcase.archive_title', 'Arkiva Inteligjente'),
            desc: t('showcase.archive_desc', 'Gjen çdo dokument në sekonda me kërkim semantik.'),
            icon: <FolderSearch className="w-5 h-5 lg:w-6 lg:h-6" />,
            color: "from-cyan-500 to-sky-600",
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
                        {t('showcase.title', 'Sistemi Operativ për Biznesin Tuaj')}
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
                        {t('showcase.subtitle', 'Nga menaxhimi i stokut tek inteligjenca artificiale – gjithçka në një vend.')}
                    </p>
                </div>

                {/* --- MOBILE NAVIGATION --- */}
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
                                    <div className="p-4 lg:p-6 flex-1 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden flex items-center justify-center">
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

const RhythmMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full" />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> Ritmi i Ditës
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-white">€850.00</span>
                        <span className="text-xs text-gray-500">/ €1,200.00</span>
                    </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    🔥 +15% vs Avg
                </div>
            </div>
            <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs text-gray-400">
                    <span>Progresi (71%)</span>
                    <span>16:30 PM</span>
                </div>
                <div className="h-3 w-full bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "71%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                </div>
            </div>
        </div>

        <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">#1</div>
                <div>
                    <p className="text-sm text-white font-bold">Espresso Macchiato</p>
                    <p className="text-xs text-gray-400">142 të shitura</p>
                </div>
            </div>
            <TrendingUp size={16} className="text-emerald-500" />
        </div>
    </div>
);

const InventoryMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl"><ChefHat className="text-indigo-400" size={20} /></div>
                    <div>
                        <h4 className="text-white font-bold">Mish Viçi (Biftek)</h4>
                        <span className="text-xs text-gray-400">Receta #104</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-emerald-400 font-mono font-bold text-lg">€3.50</span>
                    <span className="text-[10px] text-gray-500 uppercase">Kosto</span>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-300">Furnizimi (1kg)</span>
                    <span className="text-gray-500">€12.00</span>
                </div>
                <div className="flex justify-between text-xs p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-300">Pocioni (250g)</span>
                    <span className="text-gray-500">€3.00</span>
                </div>
            </div>
        </div>
        
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3"
        >
            <AlertTriangle size={18} className="text-rose-400" />
            <div>
                <p className="text-rose-200 text-xs font-bold">NJOFTIM STOKU</p>
                <p className="text-rose-400 text-sm">Coca Cola 0.33l: Mbetur 1 arkë</p>
            </div>
        </motion.div>
    </div>
);

const DualAgentMockup = () => (
    <div className="w-full max-w-sm space-y-4">
        {/* Business Agent */}
        <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3 items-end"
        >
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <BrainCircuit size={16} className="text-violet-400" />
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 p-3 rounded-2xl rounded-bl-none text-sm text-violet-200">
                <p className="font-bold text-xs mb-1 uppercase text-violet-400">Këshilltari i Biznesit</p>
                "Sugjeroj të rrisim stokun për vikend bazuar në motin me shi."
            </div>
        </motion.div>

        {/* Legal Agent */}
        <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3 items-end flex-row-reverse"
        >
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Scale size={16} className="text-amber-400" />
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl rounded-br-none text-sm text-amber-200 text-right">
                <p className="font-bold text-xs mb-1 uppercase text-amber-400">Hartuesi Ligjor</p>
                "Kontrata e punës u gjenerua sipas Ligjit të Punës Nr. 03/L-212."
            </div>
        </motion.div>
    </div>
);

const FinanceMockup = () => (
    <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        <div className="col-span-2 bg-gray-800/80 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase">Fitimi Neto (Sot)</p>
                <p className="text-2xl font-mono font-bold text-white">€420.50</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={20} />
            </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <p className="text-blue-300 text-xs font-bold mb-1">POS Transaksione</p>
            <p className="text-xl font-mono text-white">45</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-amber-300 text-xs font-bold mb-1">TVSH e Mbledhur</p>
            <p className="text-xl font-mono text-white">€75.60</p>
        </div>
        <div className="col-span-2 bg-gray-900/50 border border-dashed border-gray-600 rounded-xl p-3 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Calculator size={16} />
            <span>Llogaritja automatike aktive</span>
        </div>
    </div>
);

const CalendarMockup = () => (
    <div className="w-full max-w-sm space-y-3">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
                <p className="text-white font-bold text-sm">Deklarimi i TVSH</p>
                <p className="text-rose-300 text-xs">Afati: 15 Janar (3 ditë)</p>
            </div>
            <div className="px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded uppercase">
                Urgjente
            </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                <LayoutDashboard size={20} />
            </div>
            <div className="flex-1">
                <p className="text-white font-bold text-sm">Pagesa e Qirasë</p>
                <p className="text-amber-300 text-xs">Afati: 01 Shkurt</p>
            </div>
            <div className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded uppercase">
                Vjen së shpejti
            </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 opacity-60">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <MessageSquare size={20} />
            </div>
            <div className="flex-1">
                <p className="text-white font-bold text-sm">Takim me Furnitorin</p>
                <p className="text-blue-300 text-xs">Sot, 14:00</p>
            </div>
        </div>
    </div>
);

const ArchiveMockup = () => (
    <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {['Faturat', 'Kontratat', 'Oferta', 'Raporte'].map((label, i) => (
            <motion.div 
                key={i} 
                whileHover={{ scale: 1.05 }} 
                className="bg-gray-800/60 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-700/60 transition-colors"
            >
                <FolderSearch className={`w-8 h-8 ${i % 2 === 0 ? 'text-cyan-400' : 'text-sky-500'}`} />
                <span className="text-gray-300 text-sm font-medium">{label}</span>
            </motion.div>
        ))}
    </div>
);

export default ProductShowcase;