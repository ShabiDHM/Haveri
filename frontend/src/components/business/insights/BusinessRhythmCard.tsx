// FILE: src/components/business/briefing/BusinessRhythmCard.tsx 
// (or src/components/business/insights/BusinessRhythmCard.tsx depending on your exact folder structure)
// PHOENIX PROTOCOL - RHYTHM CARD V12.0 (GLASSMORPHISM ALIGNED)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
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
                return index === count - 1 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(16, 185, 129, 0.3)';
            },
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
            borderRadius: isLateInMonth ? 2 : 4,
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
                backgroundColor: 'rgba(19, 23, 34, 0.95)', // Matched to glass-panel dark theme
                titleColor: '#ffffff',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                titleFont: { family: 'monospace', size: 10, weight: 'bold' },
                bodyFont: { family: 'monospace', size: 12, weight: 'bold' },
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
                    color: '#6b7280', // text-text-muted
                    font: { size: 10, weight: 'bold', family: 'monospace' },
                    callback: (value: any) => `€${value}`
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { 
                    color: '#6b7280', 
                    font: { size: 9, weight: 'bold' },
                    maxRotation: 0,
                    autoSkip: true, 
                    maxTicksLimit: 10 
                },
                border: { display: false }
            },
        },
    };

    return (
        <div className="glass-panel flex flex-col h-full min-h-[480px] p-6 sm:p-8 hover-lift relative overflow-hidden group">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-success-start/5 rounded-full blur-[60px] group-hover:bg-success-start/10 transition-colors pointer-events-none" />

            {/* Executive Header */}
            <div className="flex items-center gap-3 border-b border-border-main pb-5 mb-6 flex-shrink-0 relative z-10">
                <CalendarDays className="text-success-start" size={20} />
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                    {t('dashboard.monthlyTrend', 'Trendi Mujor')}
                </h2>
            </div>

            <div className="flex flex-col flex-1 min-h-0 relative z-10">
                {/* Main Value */}
                <div className="mb-2 flex items-end gap-3 flex-shrink-0">
                    <h2 className="text-3xl font-mono font-black text-text-primary tracking-tight leading-none">
                        €{currentSales.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                </div>

                {/* Chart Area */}
                <div className="flex-1 w-full min-h-[200px] mt-4">
                    {salesHistory.labels.length > 0 && <Bar options={chartOptions} data={chartData} />}
                </div>

                {/* Footer Metrics */}
                <div className="mt-6 pt-5 border-t border-border-main flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">
                        {t('dashboard.monthToDate', 'Muaji deri më sot')}
                    </span>
                    <span className={`text-[10px] uppercase font-black tracking-widest ${progress >= 100 ? "text-success-start" : "text-text-muted"}`}>
                        {progress >= 100 
                            ? t('dashboard.targetAchieved', 'Objektivi u arrit!') 
                            : `${progress.toFixed(0)}% ${t('dashboard.ofTarget', 'e targetit')}`
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};