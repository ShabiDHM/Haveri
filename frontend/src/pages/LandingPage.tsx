// FILE: src/pages/LandingPage.tsx
// PHOENIX PROTOCOL - LANDING PAGE V17.2 (LINT FIX)
// 1. CLEANUP: Removed unused 'FileText' import.
// 2. STATUS: Build-ready.

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Database, // Replaced FileText use case
    Lock, 
    ChevronRight, 
    BrainCircuit,
    Sun,
    TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductShowcase from '../components/landing/ProductShowcase';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030711] text-white overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        
        {/* --- HERO SECTION --- */}
        <section className="pt-32 pb-24 text-center max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-2 px-4 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wider mb-6 uppercase shadow-lg">
              Sistemi Operativ për Biznesin Kosovar
            </span>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
              Më i zgjuar. Më fitimprurës.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Haveri AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Zëvendësoni hamendjet me të dhëna. Monitoroni ritmin e shitjeve, 
              kostot e stokut dhe detyrimet tatimore në një vend.
              <span className="text-white font-medium block mt-2">
                Stok • Financa • TVSH • Inteligjencë Artificiale
              </span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-blue-600/30 text-white rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95">
                Fillo Tani
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-gray-900/60 hover:bg-gray-800/60 border border-white/10 rounded-2xl font-medium text-lg transition-all backdrop-blur-md text-center">
                Hyni në Platformë
              </Link>
            </div>
          </motion.div>
        </section>

        {/* --- STATS --- */}
        <section className="py-12 border-y border-white/10 bg-gray-900/40 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="p-6">
                    <h3 className="text-5xl font-black text-blue-400 mb-2">06:00</h3>
                    <p className="text-gray-400">Përmbledhja ditore dhe prioritetet.</p>
                </div>
                <div className="p-6 border-y md:border-y-0 md:border-x border-white/10">
                    <h3 className="text-5xl font-black text-amber-400 mb-2">100%</h3>
                    <p className="text-gray-400">Përgatitje për deklarimin e TVSH-së.</p>
                </div>
                <div className="p-6">
                    <h3 className="text-5xl font-black text-emerald-400 mb-2">Dyfish</h3>
                    <p className="text-gray-400">Inteligjencë: Biznes & Ligjore.</p>
                </div>
            </div>
        </section>

        {/* --- SHOWCASE --- */}
        <ProductShowcase />

        {/* --- FEATURES --- */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">Jo Thjesht Softuer</h2>
            <p className="text-lg text-gray-400">Një partner strategjik që njeh tregun lokal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-fr">
            {/* Feature 1: Daily Briefing */}
            <div className="md:col-span-2 rounded-3xl p-8 border border-white/10 bg-gray-900/60 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Sun className="w-48 h-48 text-amber-500" /></div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 text-amber-400 border border-amber-500/20"><Sun className="w-6 h-6" /></div>
                    <h3 className="text-2xl font-bold mb-2">Ritmi i Ditës</h3>
                    <p className="text-gray-400 text-base">
                        Nisni ditën me qartësi. AI analizon shitjet e djeshme, detyrimet e sotme dhe parashikon fluksin bazuar në sezonin (Diaspora, Festa) dhe motin.
                    </p>
                </div>
            </div>

            {/* Feature 2: Security */}
            <div className="rounded-3xl p-8 border border-white/10 bg-gray-900/60 backdrop-blur-md">
                 <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20"><Lock className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold mb-2">Siguri e Plotë</h3>
                <p className="text-gray-400">Të dhënat tuaja janë private. Arkiva juaj është e enkriptuar dhe e aksesueshme vetëm për ju.</p>
            </div>

            {/* Feature 3: Dual Intelligence */}
            <div className="rounded-3xl p-8 border border-white/10 bg-gray-900/60 backdrop-blur-md">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400 border border-blue-500/20"><BrainCircuit className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold mb-2">Dy Agjentë AI</h3>
                <p className="text-gray-400">
                    <strong>Këshilltari i Biznesit</strong> për operacione ditore dhe 
                    <strong> Hartuesi Ligjor</strong> për kontrata profesionale. Secili ekspert në fushën e vet.
                </p>
            </div>

            {/* Feature 4: Finance & Operations */}
            <div className="md:col-span-2 rounded-3xl p-8 border border-white/10 bg-gray-900/60 backdrop-blur-md relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Database className="w-48 h-48" /></div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400 border border-purple-500/20"><TrendingUp className="w-6 h-6" /></div>
                    <h3 className="text-2xl font-bold mb-2">Financa & Inventar</h3>
                    <p className="text-gray-400 text-base">
                        Nga llogaritja e kostos së recetës deri te raporti përfundimtar për TVSH. 
                        Skanoni fatura fizike dhe lërini AI-në t'i indeksojë automatikisht.
                    </p>
                </div>
            </div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="py-24 text-center max-w-7xl mx-auto px-6">
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-12 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl font-black mb-6">Gati për transformim?</h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Bashkohuni me bizneset që përdorin Haveri AI për të rritur fitimin dhe ulur stresin.
                    </p>
                    <Link to="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 hover:bg-gray-200 rounded-2xl font-bold text-lg transition-all w-full sm:w-auto justify-center hover:scale-105 active:scale-95">
                        Provo Falas
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="py-8 border-t border-white/10 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Haveri AI. Të gjitha të drejtat e rezervuara.</p>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;