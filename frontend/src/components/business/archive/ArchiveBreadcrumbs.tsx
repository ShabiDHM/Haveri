// FILE: src/components/business/archive/ArchiveBreadcrumbs.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V3.0 (UNIFIED ADMIN AESTHETIC)
// Handles breadcrumb navigation.
// UPDATED: Uses unified border styling

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
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${index === breadcrumbs.length - 1 ? 'bg-primary/20 text-primary font-bold border border-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-hover'}`}
                    >
                        {crumb.type === 'ROOT' ? <Home size={14} /> : crumb.type === 'WORKSPACE' ? <Briefcase size={14} /> : <FolderOpen size={14} />}
                        {crumb.name}
                    </button>
                    {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-border-strong flex-shrink-0" />}
                </React.Fragment>
            ))}
        </div>
    );
};