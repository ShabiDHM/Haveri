// FILE: src/components/DockedPDFViewer.tsx
// PHOENIX PROTOCOL - REUSABLE DOCKED VIEWER COMPONENT V3.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Maximize2, X } from 'lucide-react';
import { Document } from '../data/types';

interface DockedPDFViewerProps {
    document: Document;
    onExpand: () => void;
    onClose: () => void;
}

const DockedPDFViewer: React.FC<DockedPDFViewerProps> = ({ document, onExpand, onClose }) => {
    if (!document) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-4 right-4 z-[9998] w-72 bg-glass backdrop-blur-xl border border-border-strong rounded-xl shadow-xl flex items-center justify-between p-3"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="text-xs font-medium text-text-primary truncate">{document.file_name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={onExpand} className="p-1.5 hover:bg-hover rounded-md text-text-muted hover:text-text-primary transition-colors" title="Expand">
                        <Maximize2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-danger/10 rounded-md text-text-muted hover:text-danger transition-colors" title="Close">
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DockedPDFViewer;