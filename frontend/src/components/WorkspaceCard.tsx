// FILE: src/components/WorkspaceCard.tsx
// PHOENIX PROTOCOL – WORKSPACE CARD V1.9 (COMPACT)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workspace } from '../data/types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trash2, FileText, AlertTriangle, CalendarDays, User, Mail, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete: (workspaceId: string) => void;
}

const toTitleCase = (str: string): string => {
  if (!str) return str;
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onDelete }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCurrentWorkspace } = useAuth();

  const handleCardClick = async () => {
    await setCurrentWorkspace(workspace.id);
    navigate('/business/insights');
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(workspace.id);
  };

  const handleCalendarNav = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/calendar');
  };

  const formattedDate = new Date(workspace.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  const hasTitle = workspace.title && workspace.title.trim() !== '';
  const displayTitle = hasTitle ? toTitleCase(workspace.title) : (t('workspace.unnamedWorkspace') || 'Projekt pa Emër');

  const clientName = workspace.client?.name ? toTitleCase(workspace.client.name) : null;
  const clientEmail = workspace.client?.email || null;
  const clientPhone = workspace.client?.phone || null;
  const hasClient = clientName || clientEmail || clientPhone;

  return (
    <motion.div 
      onClick={handleCardClick}
      className="bg-surface/30 backdrop-blur-sm group relative flex flex-col justify-between h-full p-4 sm:p-5 rounded-2xl hover-lift cursor-pointer border border-border-main shadow-sm transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-start/5 to-secondary-end/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Title and Date */}
        <div className="flex flex-col mb-3 relative z-10">
          <h2 className={`text-lg font-bold line-clamp-2 leading-tight tracking-tight mb-1 ${
            !hasTitle ? 'text-text-secondary italic' : 'text-text-primary group-hover:text-primary-start transition-colors'
          }`}>
            {displayTitle}
          </h2>
          <div className="text-xs text-text-muted">
            {formattedDate}
          </div>
        </div>
        
        {/* Client Details Section */}
        {hasClient && (
          <div className="flex flex-col mb-4 relative z-10">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border-main">
              <User className="w-3.5 h-3.5 text-primary-start" />
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {t('workspace.clientLabel', 'Klienti')}
              </span>
            </div>
            
            <div className="space-y-1 pl-1">
              {clientName && (
                <p className="text-sm font-medium text-text-primary truncate">
                  {clientName}
                </p>
              )}
              {clientEmail && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{clientEmail}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{clientPhone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        {/* Statistics Section */}
        <div className="pt-3 border-t border-border-main flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Documents */}
            <div className="flex items-center gap-1" title={`${workspace.document_count || 0} Dokumente`}>
              <FileText className="h-3.5 w-3.5 text-primary-start" />
              <span className="text-xs font-medium text-text-secondary">{workspace.document_count || 0}</span>
            </div>

            {/* Alerts */}
            <button 
              onClick={handleCalendarNav}
              className="flex items-center gap-1 group/icon hover:bg-hover px-1.5 py-0.5 rounded transition-colors" 
              title={`${workspace.alert_count || 0} Afate`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-status-warning group-hover/icon:text-warning-start/80 transition-colors" />
              <span className="text-xs font-medium text-text-secondary group-hover/icon:text-text-primary">{workspace.alert_count || 0}</span>
            </button>

            {/* Events */}
            <button 
              onClick={handleCalendarNav}
              className="flex items-center gap-1 group/icon hover:bg-hover px-1.5 py-0.5 rounded transition-colors" 
              title={`${workspace.event_count || 0} Ngjarje`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-secondary-start group-hover/icon:text-secondary-start/80 transition-colors" />
              <span className="text-xs font-medium text-text-secondary group-hover/icon:text-text-primary">{workspace.event_count || 0}</span>
            </button>
          </div>
        </div>

        {/* Footer: Actions */}
        <div className="mt-3 pt-3 border-t border-border-main flex items-center justify-between">
          <span className="text-xs font-bold text-primary-start group-hover:text-primary-end transition-colors flex items-center gap-1">
            {t('general.view', 'Shiko')} {t('workspace.details', 'Detajet')}
          </span>
          
          <motion.button
            onClick={handleDeleteClick}
            className="p-1 -mr-1 rounded-lg text-text-secondary hover:text-status-danger hover:bg-danger-start/10 transition-colors z-20 relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={t('general.delete', 'Fshij')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkspaceCard;