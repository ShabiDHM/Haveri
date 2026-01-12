// FILE: src/components/business/briefing/BusinessRhythmCard.tsx
// PHOENIX PROTOCOL - RHYTHM CARD V4.2 (LINT FREE)
// 1. FIX: Removed unused 'TrendingUp' import.
// 2. LOGIC: Month-to-Date visual density adjustments retained.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react'; // Removed TrendingUp
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

export interface DailySalesData {
    labels: string[]; 
    data: number[];
}

interface BusinessRhythmCardProps {
    currentSales?: number;
    dailyTarget?: number;
    salesHistory?: DailySalesData;
}

export const BusinessRhythmCard: React.FC<BusinessRhythmCardProps> = ({ 
    currentSales = 0, 
    dailyTarget = 1000,
    salesHistory = { labels: [], data: [] }
}) => {
    const { t } = useTranslation();
    
    const progress = Math.min((currentSales / dailyTarget) * 100, 100);

    // Dynamic bar width based on number of days (thinner later in the month)
    const isLateInMonth = salesHistory.labels.length > 15;

    const chartData = {
        labels: salesHistory.labels,
        datasets: [
          {
            label: t('dashboard.dailySales', 'Shitjet Ditore'),
            data: salesHistory.data,
            backgroundColor: (context: any) => {
                const index = context.dataIndex;
                const count = context.dataset.data.length;
                // Highlight Today (last bar)
                return index === count - 1 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(16, 185, 129, 0.3)';
            },
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
            borderRadius: isLateInMonth ? 3 : 5,
            barPercentage: isLateInMonth ? 0.7 : 0.6,
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
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
                label: (context: any) => `€${Number(context.raw).toFixed(2)}`
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
            ticks: { 
                color: '#9ca3af', 
                font: { size: 10 },
                maxRotation: 0,
                autoSkip: true, 
                maxTicksLimit: 10 
            },
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
                        <CalendarDays className="w-4 h-4 text-emerald-400" /> {t('dashboard.monthlyTrend', 'Trendi Mujor')}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-white">€{currentSales.toFixed(2)}</span>
                        <span className="text-sm text-emerald-400 font-medium">{t('common.today', 'Sot')}</span>
                    </div>
                </div>
            </div>

            {/* PHOENIX: DAILY TREND CHART */}
            <div className="h-48 w-full relative z-10">
                <Bar options={chartOptions} data={chartData} />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 relative z-10">
                <span>{t('dashboard.monthToDate', 'Muaji deri më sot')}</span>
                <span className={progress >= 100 ? "text-emerald-400 font-bold" : "text-gray-400"}>
                    {progress >= 100 ? "Target Achieved" : `${progress.toFixed(0)}% e targetit`}
                </span>
            </div>
        </div>
    );
};