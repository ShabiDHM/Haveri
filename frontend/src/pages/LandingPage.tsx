// FILE: src/pages/LandingPage.tsx
// PHOENIX PROTOCOL - LANDING PAGE V21.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Database, 
    ChevronRight, 
    ShieldCheck,
    TrendingUp,
    Zap,
    Users,
    ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductShowcase from '../components/landing/ProductShowcase';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base text-text-primary overflow-hidden font-sans selection:bg-success-start/30 selection:text-inverse">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-success-start/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        
        {/* --- NAVIGATION --- */}
        <nav className="fixed top-0 w-full z-[100] border-b border-border-main bg-glass backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-success-start rounded-lg flex items-center justify-center shadow-lg shadow-success-start/20">
                        <Zap size={18} className="text-inverse fill-inverse" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-text-primary">HAVERI<span className="text-success-start">AI</span></span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">{t('navigation.product', 'Produkti')}</a>
                    <a href="#intelligence" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">{t('navigation.intelligence', 'Inteligjenca')}</a>
                    <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">{t('general.login')}</Link>
                    <Link to="/register" className="btn-primary px-5 py-2 text-sm">{t('general.getStarted')}</Link>
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
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tighter text-text-primary">
              {t('landing.heroTitle')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-success-start via-primary to-primary">
                {t('landing.heroHighlight')}
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              {t('landing.heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto group relative px-10 py-5 btn-primary text-lg flex items-center justify-center gap-3">
                {t('landing.getStarted')}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 glass-input !bg-surface hover:bg-hover transition-colors rounded-2xl font-bold text-lg text-center text-text-primary border border-border-main">
                Demo Live
              </Link>
            </div>

            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                className="mt-20 flex flex-col items-center gap-3 text-text-muted"
            >
                <span className="text-xs font-black uppercase tracking-[0.3em]">Mësoni më shumë</span>
                <ChevronDown className="animate-bounce" />
            </motion.div>
          </motion.div>
        </section>

        {/* --- CORE PILLARS BENTO --- */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-6 space-y-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Forensic Audit */}
                <div className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-primary/10 border border-border-main p-10 h-[450px] flex flex-col justify-between">
                    <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all duration-700" />
                    <ShieldCheck className="text-primary mb-6" size={48} strokeWidth={1} />
                    <div>
                        <h3 className="text-4xl font-black mb-4 tracking-tighter italic text-text-primary">{t('landing.feature1Title')}</h3>
                        <p className="text-text-secondary text-lg max-w-md leading-relaxed">
                            {t('landing.feature1Desc')}
                        </p>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest text-primary">Neni 9 TVSH</span>
                        <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest text-primary">Auditimi Pro</span>
                    </div>
                </div>

                {/* 2. Secure Portal */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-surface border border-border-main p-10 flex flex-col justify-between h-[450px]">
                    <Users className="text-success-start" size={40} strokeWidth={1} />
                    <div>
                        <h3 className="text-3xl font-bold mb-3 tracking-tight text-text-primary">{t('landing.feature2Title')}</h3>
                        <p className="text-text-secondary text-base leading-relaxed">
                            {t('landing.feature2Desc')}
                        </p>
                    </div>
                    <div className="p-4 bg-card rounded-2xl border border-border-main text-xs font-mono text-success-start/70">
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
                    <h2 className="text-5xl font-black tracking-tighter text-text-primary">Inteligjencë që<br/>vepron vetë.</h2>
                    <p className="text-xl text-text-secondary font-light">Haveri AI nuk ju tregon vetëm çfarë ka ndodhur, por çfarë duhet të bëni tani.</p>
                </div>
                
                <div className="space-y-8">
                    {[
                        { 
                          t: t('landing.auditTitle', 'Auditori Forenzik'), 
                          d: t('landing.auditDesc', 'AI që lidh faturat tuaja direkt me ligjet e ATK-së dhe gjen parregullsi ligjore automatikisht.'), 
                          i: <ShieldCheck className="text-primary" /> 
                        },
                        { 
                          t: t('landing.predictiveRestockTitle', 'Rimbushje Parashikuese'), 
                          d: t('landing.predictiveRestockDesc', 'AI parashikon kur po ju mbaron stoku dhe drafton porosinë e rradhës gati për miratim.'), 
                          i: <TrendingUp className="text-success-start" /> 
                        },
                        { 
                          t: t('landing.digitalArchiveTitle', 'Arkiva Digjitale'), 
                          d: t('landing.digitalArchiveDesc', 'Skanoni me telefon. AI lexon përmbajtjen, nxjerr totalet dhe e arkivon dokumentin në dhomën e sigurt.'), 
                          i: <Database className="text-primary" /> 
                        }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-6 group">
                            <div className="w-14 h-14 rounded-2xl bg-surface border border-border-main flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-hover transition-all duration-500">
                                {item.i}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-1 text-text-primary">{item.t}</h4>
                                <p className="text-text-secondary leading-relaxed">{item.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="absolute -inset-10 bg-success-start/10 rounded-full blur-[120px] animate-pulse" />
                <div className="relative rounded-[3rem] border border-border-main bg-card p-8 shadow-xl">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-border-main pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-success-start/20 flex items-center justify-center text-success-start font-bold italic">H</div>
                                <span className="text-sm font-bold uppercase tracking-widest text-text-muted">Smart Advice</span>
                            </div>
                            <div className="text-xs text-text-muted font-mono">NOW LIVE</div>
                        </div>
                        <p className="text-xl text-text-secondary font-medium leading-relaxed italic">
                            "Shitjet e Espresso Macchiato u rritën me 40% gjatë vizitës së diasporës. Sugjeroj rritjen e porosisë për qumësht me 15 litra për javën e ardhshme."
                        </p>
                        <div className="pt-4 flex gap-3">
                            <button className="flex-1 py-3 btn-primary text-xs font-black uppercase tracking-tighter">Aprovo Porosinë</button>
                            <button className="flex-1 py-3 glass-input !bg-surface hover:bg-hover rounded-xl text-xs font-black uppercase tracking-tighter border border-border-main text-text-muted">Refuzo</button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="py-24 text-center max-w-7xl mx-auto px-6">
            <div className="bg-gradient-to-br from-success-start/20 via-primary/20 to-primary/20 border border-border-main rounded-[3rem] p-16 relative overflow-hidden group">
                <div className="relative z-10">
                    <h2 className="text-5xl md:text-6xl font-black mb-8 tracking-tighter text-text-primary">Transformoni mënyrën<br/>si punoni.</h2>
                    <Link to="/register" className="inline-flex items-center gap-4 px-12 py-6 btn-primary text-xl">
                        {t('landing.getStarted')}
                        <ChevronRight className="w-6 h-6" />
                    </Link>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-grid-white/[0.02] pointer-events-none" />
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="py-12 border-t border-border-main text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-6 h-6 bg-success-start rounded flex items-center justify-center">
                    <Zap size={14} className="text-inverse fill-inverse" />
                </div>
                <span className="font-bold tracking-tighter uppercase text-sm text-text-primary">Haveri AI</span>
            </div>
            <p className="text-text-muted text-xs font-black uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Data And Human Management. Të gjitha të drejtat e rezervuara.
            </p>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
