// src/drafting/components/SaveModal.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  saving: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, saving }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-canvas/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1d24] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-text-inverse font-semibold text-lg">Ruaj draftin në lëndë</h3>
          <button onClick={onClose} className="p-1 hover:bg-card/10 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulli i draftit (p.sh., 'Padi pronësore - versioni 1')"
            className="w-full bg-card/5 border border-white/10 rounded-lg px-4 py-3 text-text-inverse placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-start/50 mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-card/5 hover:bg-card/10 text-text-inverse font-medium rounded-lg transition-colors"
            >
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-primary-start to-primary-end text-text-inverse font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Duke ruajtur...' : 'Ruaj'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
