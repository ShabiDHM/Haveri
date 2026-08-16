// FILE: src/components/business/InsightsTab.tsx
// HAVERI AI - QENDRA E INTELIGJENCËS (LIGHT & DARK THEME ADAPTIVE)

import React, { useState } from 'react';

interface SinjalTregu {
  id: string;
  category: 'CONSTRUCTION' | 'AUCTION' | 'TENDER';
  title: string;
  location: string;
  metric: string;
  timestamp: string;
  details: string;
  tag: string;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

const SINJALET_FILLUESE: SinjalTregu[] = [
  {
    id: '1',
    category: 'CONSTRUCTION',
    title: 'Banesim Kolektiv me Shërbime (B+P+7)',
    location: 'Prishtinë (Mati 1 - Zona Kadastrale 714)',
    metric: '9,450 m²',
    timestamp: 'Sot, 11:30',
    details: 'Investitori: "Alba Group SH.P.K." - Leje Ndërtimore e aprovuar. Furnizim i hapur për beton, dritare dhe instalime elektrike.',
    tag: 'LEJE NDËRTIMORE',
    urgency: 'HIGH'
  },
  {
    id: '2',
    category: 'AUCTION',
    title: 'Ankand Publik: Depo Industriale & Magazinë',
    location: 'Ferizaj (Zona Industriale)',
    metric: '€68,000 (Vlerësuar: €140,000)',
    timestamp: 'Sot, 09:15',
    details: 'Përmbarues Privat: Likuidim i pasurisë së sekuestruar me 51% zbritje nga çmimi i vlerësuar. Afati i depozitimit: 7 ditë.',
    tag: 'PËRMBARIM & ZBRITJE',
    urgency: 'HIGH'
  },
  {
    id: '3',
    category: 'TENDER',
    title: 'Furnizim me Pajisje & Materiale Infrastrukturore',
    location: 'Komuna e Prizrenit',
    metric: '€185,000',
    timestamp: 'Dje, 16:40',
    details: 'E-Prokurimi: Specifikimet teknike të nxjerra automatikisht. 4 artikuj përputhen me profilin e furnizuesve të regjistruar.',
    tag: 'TENDER PUBLIK',
    urgency: 'MEDIUM'
  },
  {
    id: '4',
    category: 'CONSTRUCTION',
    title: 'Objekt Afarist & Qendër Tregtare',
    location: 'Fushë Kosovë (Pranë Rrethit Kryesor)',
    metric: '4,200 m²',
    timestamp: 'Dje, 14:10',
    details: 'Investitori: "Dardania Invest" - Faza para fillimit të punimeve. Kërkohen nënkontraktues për punë të vrazhda dhe fasadë.',
    tag: 'LEJE NDËRTIMORE',
    urgency: 'NORMAL'
  }
];

export const InsightsTab: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'CONSTRUCTION' | 'AUCTION' | 'TENDER'>('ALL');

  const filteredSignals = filter === 'ALL' 
    ? SINJALET_FILLUESE 
    : SINJALET_FILLUESE.filter(s => s.category === filter);

  return (
    <div className="space-y-6">
      {/* Rreshti i Metrikave Kryesore */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metrika 1: Ndërtimi */}
        <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              🏗️ Radari i Ndërtimit
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              +14 Këtë Javë
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text-primary tracking-tight">38,650 m²</div>
            <p className="text-xs text-text-muted mt-1">Sipërfaqe e re ndërtimore e aprovuar në Kosovë</p>
          </div>
        </div>

        {/* Metrika 2: Ankandet */}
        <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              🔨 Ankandet & Likuidimet
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
              -48% Zbritje Mesatare
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text-primary tracking-tight">€420,000</div>
            <p className="text-xs text-text-muted mt-1">Vlerë e pasurive dhe stokut në shitje përmbarimore</p>
          </div>
        </div>

        {/* Metrika 3: Tenderët */}
        <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-start">
              📑 Radari i Tenderëve
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-start/10 text-primary-start border border-primary-start/20 font-bold">
              Aktive
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text-primary tracking-tight">€1.24M</div>
            <p className="text-xs text-text-muted mt-1">Tenderë publikë me mundësi furnizimi të drejtpërdrejtë</p>
          </div>
        </div>
      </div>

      {/* Paneli Kryesor i Sinjaleve të Tregut */}
      <div className="p-6 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
        {/* Titulli dhe Filtrat */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-main">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sinjalet e Drejtpërdrejta të Tregut në Kosovë
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Të dhëna të filtruara në kohë reale nga Komunat, Përmbaruesit Privatë dhe E-Prokurimi
            </p>
          </div>

          {/* Butonat e Filtrimit */}
          <div className="flex items-center gap-1.5 p-1 bg-surface/80 rounded-xl border border-border-main">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'ALL'
                  ? 'bg-primary-start text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Të Gjitha
            </button>
            <button
              onClick={() => setFilter('CONSTRUCTION')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'CONSTRUCTION'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              🏗️ Ndërtim
            </button>
            <button
              onClick={() => setFilter('AUCTION')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'AUCTION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              🔨 Ankande
            </button>
            <button
              onClick={() => setFilter('TENDER')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'TENDER'
                  ? 'bg-primary-start text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              📑 Tenderë
            </button>
          </div>
        </div>

        {/* Lista e Sinjaleve */}
        <div className="divide-y divide-border-main mt-2">
          {filteredSignals.map((signal) => (
            <div 
              key={signal.id}
              className="py-4 hover:bg-hover/60 px-3 rounded-xl transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                    signal.category === 'CONSTRUCTION'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : signal.category === 'AUCTION'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-primary-start/10 text-primary-start border border-primary-start/20'
                  }`}>
                    {signal.tag}
                  </span>
                  <span className="text-xs text-text-muted">• {signal.timestamp}</span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{signal.title}</h3>
                <p className="text-xs text-text-secondary">{signal.details}</p>
                <div className="text-[11px] text-text-muted font-mono">
                  📍 {signal.location}
                </div>
              </div>

              <div className="flex md:flex-col items-end justify-between w-full md:w-auto gap-2">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                  {signal.metric}
                </span>
                <button className="text-xs font-bold text-primary-start hover:underline">
                  Shiko Detajet & Kontaktin &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};