// FILE: src/components/ArchiveImportModal.tsx
// PHOENIX PROTOCOL - ARCHIVE SELECTOR MODAL V4.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, FileText, ChevronRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { apiService } from '../services/api';
import { ArchiveItemOut } from '../data/types';

interface ArchiveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onImportComplete: (count: number) => void;
}

const ArchiveImportModal: React.FC<ArchiveImportModalProps> = ({ isOpen, onClose, caseId, onImportComplete }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<ArchiveItemOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string | undefined, title: string}[]>([{id: undefined, title: 'Arkiva'}]);

  useEffect(() => {
    if (isOpen) fetchItems(currentFolderId);
  }, [isOpen, currentFolderId]);

  const fetchItems = async (parentId?: string) => {
    setLoading(true);
    try {
      const data = await apiService.getArchiveItems(undefined, undefined, parentId);
      setItems(data);
    } catch (error) {
      console.error("Failed to load archive items", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: ArchiveItemOut) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, title: folder.title }]);
    setCurrentFolderId(folder.id);
    setSelectedIds(new Set());
  };

  const handleBack = () => {
    if (breadcrumbs.length <= 1) return;
    const newBreadcrumbs = [...breadcrumbs];
    newBreadcrumbs.pop(); 
    const parent = newBreadcrumbs[newBreadcrumbs.length - 1];
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(parent.id);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set<string>();
      if (prev.has(id)) {
          return newSet; 
      } else {
          newSet.add(id);
          return newSet;
      }
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      await apiService.importArchiveDocuments(caseId, Array.from(selectedIds));
      onImportComplete(selectedIds.size);
      onClose();
    } catch (error) {
      alert("Import failed.");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-glass backdrop-blur-xl w-full max-w-2xl rounded-2xl border border-border-strong shadow-xl overflow-hidden flex flex-col h-[600px]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border-strong flex justify-between items-center bg-surface/50">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Folder className="text-warning-start" /> Importo nga Arkiva
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-hover rounded-full text-text-muted hover:text-text-primary transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Breadcrumbs & Nav */}
          <div className="px-4 py-3 bg-surface border-b border-border-strong flex items-center gap-2 text-sm text-text-secondary">
            {breadcrumbs.length > 1 && (
              <button onClick={handleBack} className="p-1 hover:bg-hover rounded mr-2 text-primary">
                <ArrowLeft size={16} />
              </button>
            )}
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={12} className="text-text-muted" />}
                <span className={idx === breadcrumbs.length - 1 ? "text-text-primary font-medium" : "text-text-muted"}>
                  {crumb.title}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-full text-text-muted">
                <Loader2 className="animate-spin mr-2" /> Duke ngarkuar...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-text-muted mt-10">Dosja është e zbrazët.</div>
            ) : (
              items.map(item => {
                const isSelected = selectedIds.has(item.id);
                const isDisabled = selectedIds.size > 0 && !isSelected && item.item_type === 'FILE';
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                        if (item.item_type === 'FOLDER') handleFolderClick(item);
                        else toggleSelection(item.id);
                    }}
                    className={`
                        flex items-center justify-between p-3 rounded-xl border transition-all 
                        ${item.item_type === 'FOLDER' ? 'cursor-pointer hover:bg-hover border-border-strong bg-surface' : ''}
                        ${item.item_type === 'FILE' && isSelected ? 'cursor-pointer bg-primary/20 border-primary/50' : ''}
                        ${item.item_type === 'FILE' && !isSelected && !isDisabled ? 'cursor-pointer bg-surface border-border-strong hover:bg-hover' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed bg-surface/30 border-transparent' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {item.item_type === 'FOLDER' ? (
                        <Folder className="text-warning-start" size={20} />
                      ) : (
                        <FileText className="text-primary" size={20} />
                      )}
                      <span className={`text-sm ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{item.title}</span>
                    </div>
                    {item.item_type === 'FILE' && (
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                        {isSelected && <Check size={12} className="text-inverse" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border-strong bg-surface/30 flex justify-between items-center">
            <span className="text-sm text-text-muted">
                {selectedIds.size === 0 
                    ? "Zgjidhni një dokument" 
                    : "1 dokument i zgjedhur"}
            </span>
            <button 
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importing}
              className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 className="animate-spin" size={16} /> : null}
              {importing ? "Duke importuar..." : "Shto në Rast"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ArchiveImportModal;