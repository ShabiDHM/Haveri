// FILE: src/components/business/InsightsTab.tsx
// HAVERI AI - QENDRA E INTELIGJENCËS MOBILE-FIRST (KARTAT E VËMENDJES & VIP)

import React, { useState } from 'react';
import { 
    Phone, MessageSquare, 
    BookmarkPlus, Sparkles,
    MapPin, CheckCircle
} from 'lucide-react';

interface SinjalTregu {
  id: string;
  category: 'CONSTRUCTION' | 'AUCTION' | 'TENDER' | 'RISK';
  title: string;
  location: string;
  metric: string;
  timestamp: string;
  investorName: string;
  investorPhone?: string;
  details: string;
  tag: string;
  isVip?: boolean;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

const SINJALET_FILLUESE: SinjalTregu[] = [
  {
    id: 'vip-1',
    category: 'CONSTRUCTION',
    title: 'Kompleks Rezidencial & Afarist (2B+P+8)',
    location: 'Prishtinë (Arbëri / Dragodan)',
    metric: '14,200 m²',
    timestamp: 'Sapo u publikua',
    investorName: 'Dardania Construction Group',
    investorPhone: '+38349111222',
    details: 'Leje Ndërtimore e vulosur. Faza e tenderimit të brendshëm: Furnizuesi kryesor për beton, pompim dhe dritare alumini ende i papërcaktuar.',
    tag: '💎 EKSKLUZIVE',
    isVip: true,
    urgency: 'HIGH'
  },
  {
    id: 'vip-2',
    category: 'AUCTION',
    title: 'Ankand Urgjent: Depo Industriale 1,800 m²',
    location: 'Ferizaj (Magjistralja Prishtinë-Shkup)',
    metric: '€62,000 (-58% Zbritje)',
    timestamp: 'Afati: 48 Orë',
    investorName: 'Përmbaruesi Privat (Lënda: 412/26)',
    investorPhone: '+38344333444',
    details: 'Likuidim i menjëhershëm nga përmbarimi. Vlera reale në treg mbi €150,000. Mundësi blerjeje me pagesë të menjëhershme.',
    tag: '⚡ 48 ORË AFAT',
    isVip: true,
    urgency: 'HIGH'
  },
  {
    id: 'reg-1',
    category: 'TENDER',
    title: 'Furnizim me Materiale Ndërtimore & Ndriçim Publik',
    location: 'Komuna e Gjilanit',
    metric: '€145,000',
    timestamp: 'Sot, 10:15',
    investorName: 'Drejtoria e Shërbimeve Publike',
    details: 'Specifikimet teknike: Kërkohen 12 artikuj standardë. Nuk kërkohet përvojë e gjatë në tenderë të mëparshëm.',
    tag: 'TENDER PUBLIK',
    urgency: 'MEDIUM'
  },
  {
    id: 'reg-2',
    category: 'CONSTRUCTION',
    title: 'Banesim Kolektiv me Shërbime (B+P+6)',
    location: 'Fushë Kosovë (Zona 2)',
    metric: '6,800 m²',
    timestamp: 'Dje, 15:40',
    investorName: 'Prishtina Real Estate SH.P.K.',
    investorPhone: '+38349555666',
    details: 'Leje e rregullt. Punimet fillojnë brenda 30 ditëve. Kërkohen oferta për armaturë çeliku dhe hidroizolim.',
    tag: 'LEJE NDËRTIMI',
    urgency: 'NORMAL'
  },
  {
    id: 'reg-3',
    category: 'RISK',
    title: 'Paralajmërim Bllokade: Default mbi Pagesat me Afat',
    location: 'Regjioni Prizren',
    metric: 'RREZIK I LARTË',
    timestamp: 'Dje, 12:20',
    investorName: 'Kompani Distribucioni (Informatë Konfidenciale)',
    details: '3 lëndë përmbarimore të hapura këtë javë. Këshillohet ndërprerja e dërgimit të mallit me faturë me afat (me pritje).',
    tag: '⚠️ KUJDES B2B',
    urgency: 'HIGH'
  }
];

export const InsightsTab: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'VIP' | 'CONSTRUCTION' | 'AUCTION' | 'TENDER'>('ALL');
  const [savedDeals, setSavedDeals] = useState<string[]>([]);

  const handleSaveToDeals = (id: string) => {
    if (!savedDeals.includes(id)) {
      setSavedDeals(prev => [...prev, id]);
    }
  };

  const openWhatsApp = (phone: string, title: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Përshëndetje! Po ju kontaktoj lidhur me projektin "${title}". A keni mundësi të bisedojmë për ofertën e furnizimit?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const filteredSignals = filter === 'ALL' 
    ? SINJALET_FILLUESE 
    : filter === 'VIP'
    ? SINJALET_FILLUESE.filter(s => s.isVip)
    : SINJALET_FILLUESE.filter(s => s.category === filter);

  const vipSignals = SINJALET_FILLUESE.filter(s => s.isVip);

  return (
    <div className="space-y-5 pb-12">
      
      {/* 1. SEKSIONI I KARTAVE TË VËMENDJES (VIP ATTENTION CARDS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h2 className="text-xs font-black uppercase tracking-widest text-text-primary">
              Sinjalet me Vëmendje të Lartë (VIP)
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-start/10 text-primary-start">
            Vetëm për Administratorët
          </span>
        </div>

        {/* Kartat VIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {vipSignals.map(vip => (
            <div 
              key={vip.id}
              className="p-4 sm:p-5 rounded-2xl glass-panel bg-surface/80 border-2 border-primary-start/40 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-primary-start text-white tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles size={12} />
                  {vip.tag}
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {vip.metric}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-text-primary leading-snug">
                  {vip.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 font-medium">
                  <MapPin size={13} className="text-primary-start shrink-0" />
                  <span>{vip.location}</span>
                </div>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-2">
                  {vip.details}
                </p>
              </div>

              {/* Butonat e Veprimit të Shpejtë në Mobile */}
              <div className="pt-2 border-t border-border-main flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {vip.investorPhone && (
                    <button
                      onClick={() => openWhatsApp(vip.investorPhone!, vip.title)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                  {vip.investorPhone && (
                    <a
                      href={`tel:${vip.investorPhone}`}
                      className="p-2 rounded-xl bg-surface border border-border-main text-text-primary hover:bg-hover transition-colors"
                      title="Telefono"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => handleSaveToDeals(vip.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
                    savedDeals.includes(vip.id)
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-primary-start hover:bg-primary-start/10'
                  }`}
                >
                  {savedDeals.includes(vip.id) ? (
                    <>
                      <CheckCircle size={14} /> E Ruajtur
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={14} /> Ruaj te Mundësitë
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SHIRITI I FILTRAVE TË SHPEJTË NË MOBILE */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { key: 'ALL', label: 'Të Gjitha' },
          { key: 'VIP', label: '🔥 VIP / Urgjente' },
          { key: 'CONSTRUCTION', label: '🏗️ Ndërtim' },
          { key: 'AUCTION', label: '🔨 Ankande' },
          { key: 'TENDER', label: '📑 Tenderë' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-4 py-2 text-xs font-black rounded-xl whitespace-nowrap transition-all active:scale-95 ${
              filter === item.key
                ? 'bg-primary-start text-white shadow-sm'
                : 'glass-panel bg-surface/70 text-text-muted hover:text-text-primary border border-border-main'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. FLUKSI I SINJALEVE TË TREGUT (FEED-I KRYESOR) */}
      <div className="space-y-3">
        {filteredSignals.map((signal) => (
          <div 
            key={signal.id}
            className="p-4 sm:p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main hover:border-primary-start/40 shadow-sm transition-all duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    signal.category === 'CONSTRUCTION'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : signal.category === 'AUCTION'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : signal.category === 'RISK'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-primary-start/10 text-primary-start border border-primary-start/20'
                  }`}>
                    {signal.tag}
                  </span>
                  <span className="text-[11px] text-text-muted font-medium">• {signal.timestamp}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary leading-snug pt-0.5">
                  {signal.title}
                </h3>
              </div>

              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                {signal.metric}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {signal.details}
            </p>

            <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
              <MapPin size={13} className="text-primary-start shrink-0" />
              <span>{signal.location}</span>
            </div>

            {/* Veprimet në Fund të Kartës */}
            <div className="pt-3 border-t border-border-main flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {signal.investorPhone && (
                  <button
                    onClick={() => openWhatsApp(signal.investorPhone!, signal.title)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </button>
                )}
                {signal.investorPhone && (
                  <a
                    href={`tel:${signal.investorPhone}`}
                    className="p-1.5 rounded-lg bg-surface border border-border-main text-text-primary"
                    title="Telefono"
                  >
                    <Phone size={13} />
                  </a>
                )}
              </div>

              <button
                onClick={() => handleSaveToDeals(signal.id)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  savedDeals.includes(signal.id)
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-primary-start hover:underline'
                }`}
              >
                {savedDeals.includes(signal.id) ? (
                  <>
                    <CheckCircle size={13} /> Ruajtur
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={13} /> Ruaj Marrëveshjen
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};