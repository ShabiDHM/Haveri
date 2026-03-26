// FILE: src/components/ business/archive/ArchiveBreadcrumbs.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V4.1 (EXECUTIVE DESIGN SYSTEM)
// UPDATED: Semantic classes (bg-primary-start/20, text-primary-start, border-border-main, hover-lift)
// RETAINED: All logic and functionality.

import React from 'react';
import { Home, Briefcase, FolderOpen, ChevronRight } from 'lucide-react';
import { BreadcrumbType } from '../../../hooks/useArchiveData';

interface ArchiveBreadcrumbsProps {
    breadcrumbs: BreadcrumbType[];
    onNavigate: (index: number) => void;
}

export const ArchiveBreadcrumbs: React.FC<ArchiveBreadcrumbsProps> = ({ breadcrumbs, onNavigate }) => {
    return (
        <div className="flex items-center gap-2 overflow-x-auto text-sm no-scrollbar pb-2">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id || 'root'}>
                    <button 
                        onClick={() => onNavigate(index)} 
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover-lift shadow-sm ${
                            index === breadcrumbs.length - 1 
                                ? 'bg-primary-start/20 text-primary-start font-bold border border-primary-start/30' 
                                : 'text-text-muted hover:text-text-primary hover:bg-hover border border-border-main'
                        }`}
                    >
                        {crumb.type === 'ROOT' ? <Home size={14} /> : crumb.type === 'WORKSPACE' ? <Briefcase size={14} /> : <FolderOpen size={14} />}
                        {crumb.name}
                    </button>
                    {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-text-muted flex-shrink-0" />}
                </React.Fragment>
            ))}
        </div>
    );
};
