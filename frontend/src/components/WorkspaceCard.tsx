// FILE: src/components/WorkspaceCard.tsx
// PHOENIX PROTOCOL – WORKSPACE CARD V1.1 (FIXED UNUSED IMPORT)

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

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onDelete }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCurrentWorkspace } = useAuth();

  const handleCardClick = async () => {
    await setCurrentWorkspace(workspace.id);
    navigate('/business');
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
  const displayTitle = hasTitle ? workspace.title : (t('workspace.unnamedWorkspace') || 'Projekt pa Emër');

  return (
    <motion.div 
      onClick={handleCardClick}
      className="glass-panel group relative flex flex-col justify-between h-full p-6 rounded-2xl hover-lift cursor-pointer border-border-main"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-start/5 to-secondary-end/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Title and Date */}
        <div className="flex flex-col mb-4 relative z-10">
          <h2 className={`text-xl font-bold line-clamp-2 leading-tight tracking-tight mb-2 ${
            !hasTitle ? 'text-text-secondary italic' : 'text-text-primary group-hover:text-primary-start transition-colors'
          }`}>
            {displayTitle}
          </h2>
          <div className="text-sm text-text-muted">
            {formattedDate}
          </div>
        </div>
        
        {/* Client Details Section */}
        {workspace.client && (
          <div className="flex flex-col mb-6 relative z-10">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-main">
              <User className="w-3.5 h-3.5 text-primary-start" />
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {t('workspace.clientLabel', 'Klienti')}
              </span>
            </div>
            
            <div className="space-y-1.5 pl-1">
              <p className="text-base font-medium text-text-primary truncate">
                {workspace.client.name || t('general.notAvailable', 'N/A')}
              </p>
              
              {workspace.client.email && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{workspace.client.email}</span>
                </div>
              )}
              {workspace.client.phone && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="truncate">{workspace.client.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        {/* Statistics Section */}
        <div className="pt-4 border-t border-border-main flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            {/* Documents */}
            <div className="flex items-center gap-1.5" title={`${workspace.document_count || 0} Dokumente`}>
              <FileText className="h-4 w-4 text-primary-start" />
              <span className="text-sm font-medium text-text-secondary">{workspace.document_count || 0}</span>
            </div>

            {/* Alerts */}
            <button 
              onClick={handleCalendarNav}
              className="flex items-center gap-1.5 group/icon hover:bg-hover px-1.5 py-0.5 rounded transition-colors" 
              title={`${workspace.alert_count || 0} Afate`}
            >
              <AlertTriangle className="h-4 w-4 text-status-warning group-hover/icon:text-warning-start/80 transition-colors" />
              <span className="text-sm font-medium text-text-secondary group-hover/icon:text-text-primary">{workspace.alert_count || 0}</span>
            </button>

            {/* Events */}
            <button 
              onClick={handleCalendarNav}
              className="flex items-center gap-1.5 group/icon hover:bg-hover px-1.5 py-0.5 rounded transition-colors" 
              title={`${workspace.event_count || 0} Ngjarje`}
            >
              <CalendarDays className="h-4 w-4 text-secondary-start group-hover/icon:text-secondary-start/80 transition-colors" />
              <span className="text-sm font-medium text-text-secondary group-hover/icon:text-text-primary">{workspace.event_count || 0}</span>
            </button>
          </div>
        </div>

        {/* Footer: Actions */}
        <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
          <span className="text-sm font-bold text-primary-start group-hover:text-primary-end transition-colors flex items-center gap-1">
            {t('general.view', 'Shiko')} {t('workspace.details', 'Detajet')}
          </span>
          
          <motion.button
            onClick={handleDeleteClick}
            className="p-2 -mr-2 rounded-lg text-text-secondary hover:text-status-danger hover:bg-danger-start/10 transition-colors z-20 relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={t('general.delete', 'Fshij')}
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkspaceCard;