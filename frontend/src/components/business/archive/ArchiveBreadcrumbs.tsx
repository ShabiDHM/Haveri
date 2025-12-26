// FILE: src/components/business/archive/ArchiveBreadcrumbs.tsx
// PHOENIX PROTOCOL - COMPONENT EXTRACTION V1.0
// Handles breadcrumb navigation.

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
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${index === breadcrumbs.length - 1 ? 'bg-primary-start/20 text-primary-start font-bold border border-primary-start/20 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    >
                        {crumb.type === 'ROOT' ? <Home size={14} /> : crumb.type === 'CASE' ? <Briefcase size={14} /> : <FolderOpen size={14} />}
                        {crumb.name}
                    </button>
                    {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />}
                </React.Fragment>
            ))}
        </div>
    );
};