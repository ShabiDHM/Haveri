// FILE: src/components/business/DailyBriefingTab.tsx
// PHOENIX PROTOCOL - LEGAL DRAFTING INTEGRATION

import React from 'react';
import DraftingPage from '../../pages/DraftingPage';

export const DailyBriefingTab: React.FC = () => {
    console.log("DailyBriefingTab rendering - Zyra Ligjore is rendering DraftingPage");
    
    return (
        <div className="w-full h-full">
            <DraftingPage />
        </div>
    );
};

export default DailyBriefingTab;
