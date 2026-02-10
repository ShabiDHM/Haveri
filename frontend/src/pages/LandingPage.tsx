// FILE: src/pages/LandingPage.tsx
// PHOENIX PROTOCOL - LANDING PAGE V18.1 (I18N & UI CLEANUP)
// 1. REMOVED: V4.0 technical badge as requested.
// 2. FIXED: Replaced hardcoded English feature titles with translation keys.
// 3. ADDED: Included 'Auditori Forenzik' in the operational capabilities list.
// 4. STATUS: 100% synchronized with Pro features.

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Database, 
    ChevronRight, 
    ShieldCheck,
    TrendingUp,
    Zap,
    Users,
    ChevronDown} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductShowcase from '../components/landing/ProductShowcase';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-white">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        
        {/* --- NAVIGATION --- */}
        <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Zap size={18} className="text-white fill-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">HAVERI<span className="text-emerald-500">AI</span></span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">{t('navigation.product', 'Produkti')}</a>
                    <a href="#intelligence" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">{t('navigation.intelligence', 'Inteligjenca')}</a>
                    <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">{t('general.login')}</Link>
                    <Link to="/register" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20">{t('general.getStarted')}</Link>
                </div>
            </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <section className="relative pt-40 pb-24 text-center max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* PHOENIX: Badge removed here */}
            
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tighter">
              {t('landing.heroTitle')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400">
                {t('landing.heroHighlight')}
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              {t('landing.heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto group relative px-10 py-5 bg-white text-black hover:bg-emerald-400 hover:text-black rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                {t('landing.getStarted')}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg transition-all backdrop-blur-md text-center">
                Demo Live
              </Link>
            </div>

            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                className="mt-20 flex flex-col items-center gap-3 text-gray-500"
            >
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Mësoni më shumë</span>
                <ChevronDown className="animate-bounce" />
            </motion.div>
          </motion.div>
        </section>

        {/* --- CORE PILLARS BENTO --- */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-6 space-y-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Forensic Audit */}
                <div className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600/20 to-indigo-900/10 border border-white/5 p-10 h-[450px] flex flex-col justify-between">
                    <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-500/20 blur-[100px] rounded-full group-hover:bg-blue-500/30 transition-all duration-700" />
                    <ShieldCheck className="text-blue-400 mb-6" size={48} strokeWidth={1} />
                    <div>
                        <h3 className="text-4xl font-black mb-4 tracking-tighter italic">{t('landing.feature1Title')}</h3>
                        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                            {t('landing.feature1Desc')}
                        </p>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">Neni 9 TVSH</span>
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">Auditimi Pro</span>
                    </div>
                </div>

                {/* 2. Secure Portal */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/5 p-10 flex flex-col justify-between h-[450px]">
                    <Users className="text-emerald-400" size={40} strokeWidth={1} />
                    <div>
                        <h3 className="text-3xl font-bold mb-3 tracking-tight">{t('landing.feature2Title')}</h3>
                        <p className="text-gray-500 text-base leading-relaxed">
                            {t('landing.feature2Desc')}
                        </p>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-mono text-emerald-500/70">
                        GET /portal/secure_auth_v4
                    </div>
                </div>

            </div>
        </section>

        {/* --- SHOWCASE --- */}
        <section id="intelligence">
            <ProductShowcase />
        </section>

        {/* --- OPERATIONAL CAPABILITIES --- */}
        <section className="py-32 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
                <div className="space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter">Inteligjencë që<br/>vepron vetë.</h2>
                    <p className="text-xl text-gray-400 font-light">Haveri AI nuk ju tregon vetëm çfarë ka ndodhur, por çfarë duhet të bëni tani.</p>
                </div>
                
                <div className="space-y-8">
                    {[
                        { 
                          t: t('landing.auditTitle', 'Auditori Forenzik'), 
                          d: t('landing.auditDesc', 'AI që lidh faturat tuaja direkt me ligjet e ATK-së dhe gjen parregullsi ligjore automatikisht.'), 
                          i: <ShieldCheck className="text-blue-400" /> 
                        },
                        { 
                          t: t('landing.predictiveRestockTitle', 'Rimbushje Parashikuese'), 
                          d: t('landing.predictiveRestockDesc', 'AI parashikon kur po ju mbaron stoku dhe drafton porosinë e rradhës gati për miratim.'), 
                          i: <TrendingUp className="text-emerald-400" /> 
                        },
                        { 
                          t: t('landing.digitalArchiveTitle', 'Arkiva Digjitale'), 
                          d: t('landing.digitalArchiveDesc', 'Skanoni me telefon. AI lexon përmbajtjen, nxjerr totalet dhe e arkivon dokumentin në dhomën e sigurt.'), 
                          i: <Database className="text-purple-400" /> 
                        }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-6 group">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
                                {item.i}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-1 text-white">{item.t}</h4>
                                <p className="text-gray-500 leading-relaxed">{item.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="absolute -inset-10 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="relative rounded-[3rem] border border-white/10 bg-slate-900 p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold italic">H</div>
                                <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Smart Advice</span>
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono">NOW LIVE</div>
                        </div>
                        <p className="text-xl text-gray-300 font-medium leading-relaxed italic">
                            "Shitjet e Espresso Macchiato u rritën me 40% gjatë vizitës së diasporës. Sugjeroj rritjen e porosisë për qumësht me 15 litra për javën e ardhshme."
                        </p>
                        <div className="pt-4 flex gap-3">
                            <button className="flex-1 py-3 bg-emerald-600 rounded-xl text-xs font-black uppercase tracking-tighter">Aprovo Porosinë</button>
                            <button className="flex-1 py-3 bg-white/5 rounded-xl text-xs font-black uppercase tracking-tighter border border-white/10 text-gray-400">Refuzo</button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="py-24 text-center max-w-7xl mx-auto px-6">
            <div className="bg-gradient-to-br from-emerald-600/20 via-blue-600/20 to-indigo-600/20 border border-white/10 rounded-[3rem] p-16 relative overflow-hidden group">
                <div className="relative z-10">
                    <h2 className="text-5xl md:text-6xl font-black mb-8 tracking-tighter">Transformoni mënyrën<br/>si punoni.</h2>
                    <Link to="/register" className="inline-flex items-center gap-4 px-12 py-6 bg-white text-black hover:bg-emerald-400 hover:text-black rounded-2xl font-black text-xl transition-all shadow-2xl hover:scale-105 active:scale-95">
                        {t('landing.getStarted')}
                        <ChevronRight className="w-6 h-6" />
                    </Link>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-grid-white/[0.02] pointer-events-none" />
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="py-12 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                    <Zap size={14} className="text-white fill-white" />
                </div>
                <span className="font-bold tracking-tighter uppercase text-sm">Haveri AI</span>
            </div>
            <p className="text-gray-600 text-xs uppercase tracking-widest font-bold">
                &copy; {new Date().getFullYear()} Data And Human Management. Të gjitha të drejtat e rezervuara.
            </p>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;