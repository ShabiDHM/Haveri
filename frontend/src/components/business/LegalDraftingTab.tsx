// FILE: src/components/business/LegalDraftingTab.tsx
// PHOENIX PROTOCOL - LEGAL DRAFTING TAB WRAPPER

import React from 'react';
import DraftingPage from '../../pages/DraftingPage';

export const LegalDraftingTab: React.FC = () => {
    console.log("LegalDraftingTab rendering - Zyra Ligjore is rendering DraftingPage");
    
    return (
        <div className="w-full h-full">
            <DraftingPage />
        </div>
    );
};

export default LegalDraftingTab;