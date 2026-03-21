// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - SHELL V1.0 (EMPTY STATE)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';

export const DailyBriefingTab: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Building2 size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
                {t('legal.office.title', 'Zyra Ligjore')}
            </h2>
            <p className="text-text-muted">
                {t('legal.office.empty', 'Ky seksion është aktualisht në zhvillim.')}
            </p>
        </div>
    );
};

export default DailyBriefingTab;