// FILE: src/components/business/LawLibraryTab.tsx
// PHOENIX PROTOCOL - LAW LIBRARY TAB V1.0

import React from 'react';
import LawSearchPage from '../../pages/LawSearchPage';

export const LawLibraryTab: React.FC = () => {
    return (
        <div className="w-full h-full">
            <LawSearchPage />
        </div>
    );
};

export default LawLibraryTab;