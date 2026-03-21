// FILE: src/components/ConfirmationModal.tsx
// PHOENIX PROTOCOL - MOBILE OPTIMIZATION V2.0 (DESIGN SYSTEM ALIGNMENT)
// 1. BUTTONS: Stacked vertically (full-width) on mobile for better ergonomics.
// 2. ICON: Replaced HTML entity with Lucide 'X' icon.
// 3. LAYOUT: Responsive flex direction (column on mobile, row on desktop).
// 4. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.

import { motion } from 'framer-motion'; 
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationModal({ title, message, confirmText, onConfirm, onClose }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      <motion.div 
        className="w-full max-w-sm bg-glass backdrop-blur-xl border border-border-main rounded-2xl shadow-xl p-6 space-y-4"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex justify-between items-center border-b border-border-main pb-3">
          <h3 className="text-xl font-bold text-text-primary">{title}</h3>
          <motion.button 
            className="text-text-muted hover:text-danger p-1 transition-colors rounded-full hover:bg-hover" 
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={24} />
          </motion.button>
        </div>
        
        <div className="text-text-secondary text-sm sm:text-base leading-relaxed">
            {message}
        </div>
        
        {/* Stack buttons vertically on mobile, row on desktop */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <motion.button 
            className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-text-secondary hover:text-text-primary bg-surface border border-border-main transition-colors font-medium" 
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          
          <motion.button 
            className="w-full sm:w-auto text-inverse font-semibold py-3 sm:py-2 px-4 rounded-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-danger to-danger/80 hover:from-danger/90 hover:to-danger/70" 
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}