// FILE: src/components/business/briefing/BusinessRhythmCard.tsx
// PHOENIX PROTOCOL - RHYTHM CARD V3.0 (VELOCITY CHART)
// 1. INNOVATION: Replaced the static progress bar with a dynamic 'Hourly Velocity Chart'.
// 2. UI: Provides a live, visual heartbeat of the day's sales performance hour-by-hour.
// 3. DEPENDENCY: Requires 'chart.js' and 'react-chartjs-2'.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BusinessRhythmCardProps {
    currentSales?: number;
    dailyTarget?: number;
    // PHOENIX: Add hourly data prop
    hourlySales?: number[]; 
}

export const BusinessRhythmCard: React.FC<BusinessRhythmCardProps> = ({ 
    currentSales = 0, 
    dailyTarget = 1000,
    // PHOENIX: Mock data for visual testing, in production this would come from an API
    hourlySales = [50, 80, 120, 90, 250, 400, 350, 280, 150, 0, 0, 0, 0, 0] 
}) => {
    const { t } = useTranslation();
    
    const progress = Math.min((currentSales / dailyTarget) * 100, 100);

    // --- PHOENIX: CHART CONFIGURATION ---
    const chartData = {
        labels: ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
        datasets: [
          {
            label: t('dashboard.hourlySales', 'Shitjet Orë pas Ore'),
            data: hourlySales,
            backgroundColor: 'rgba(16, 185, 129, 0.4)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.9,
          },
        ],
      };
    
      const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
                label: (context: any) => `€${context.raw.toFixed(2)}`
            }
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
                color: '#9ca3af', 
                font: { size: 10 },
                callback: (value: any) => `€${value}`
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { size: 10 } },
          },
        },
      };

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-between group hover:border-emerald-500/30 transition-colors duration-500">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-all" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> {t('dashboard.dailyRhythm', 'Ritmi i Ditës')}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-white">€{currentSales.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">/ €{dailyTarget}</span>
                    </div>
                </div>
            </div>

            {/* PHOENIX: HOURLY VELOCITY CHART */}
            <div className="h-48 w-full relative z-10">
                <Bar options={chartOptions} data={chartData} />
            </div>

            <p className="text-xs text-gray-500 mt-2 relative z-10 text-center">
                {progress >= 100 
                    ? t('general.allGood', 'Gjithçka në rregull!') 
                    : t('dashboard.onTrackMessage', 'Jeni në rrugë të mbarë për të tejkaluar objektivin.')}
            </p>
        </div>
    );
};