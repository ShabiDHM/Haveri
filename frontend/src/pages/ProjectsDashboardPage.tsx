// FILE: src/pages/ProjectsDashboardPage.tsx
// PHOENIX PROTOCOL – PROJECTS DASHBOARD V1.3 (VISUAL UNIFICATION)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, FolderOpen, Trash2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import WorkspaceCard from '../components/WorkspaceCard';
import { Workspace } from '../data/types';

const ProjectsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { workspaces, refreshWorkspaces } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceData, setNewWorkspaceData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshWorkspaces();
      setIsLoading(false);
    };
    load();
  }, [refreshWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const workspaceNumber = `WS-${Date.now().toString().slice(-8)}`;
      const payload = {
        workspace_number: workspaceNumber,
        title: newWorkspaceData.title,
        clientName: newWorkspaceData.clientName,
        clientEmail: newWorkspaceData.clientEmail,
        clientPhone: newWorkspaceData.clientPhone,
        status: 'ACTIVE',
      };
      await apiService.createWorkspace(payload);
      await refreshWorkspaces();
      setShowCreateModal(false);
      setNewWorkspaceData({ title: '', clientName: '', clientEmail: '', clientPhone: '' });
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert(t('error.createWorkspace', 'Failed to create project.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    setIsDeleting(true);
    try {
      await apiService.deleteWorkspace(workspaceToDelete);
      await refreshWorkspaces();
      setWorkspaceToDelete(null);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert(t('error.deleteWorkspace', 'Failed to delete project.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClasses = "glass-input w-full px-5 py-3.5 rounded-2xl text-sm transition-all placeholder:text-text-secondary/50 border border-border-main bg-surface focus:border-primary-start focus:ring-1 focus:ring-primary-start/40";
  const labelClasses = "block text-[11px] font-bold text-primary-start uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="glass-panel p-6 sm:p-8 md:p-10 space-y-10 border border-border-main shadow-sm">
        {/* Header Unification */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-border-main pb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase leading-none flex items-center gap-3">
              <Activity className="text-primary-start" size={28} />
              {t('projectsDashboard.title', 'Projektet e Mia')}
            </h2>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1 ml-10">
              {t('projectsDashboard.subtitle', 'Menaxhimi i Projekteve Aktive')}
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] shrink-0 hover-lift shadow-sm"
          >
            <Plus size={18} strokeWidth={4} />
            <span className="hidden sm:inline">{t('projectsDashboard.newProject', 'Projekt i Ri')}</span>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-12 w-12 text-primary-start" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-surface/50 rounded-3xl flex items-center justify-center mb-6 border border-border-main">
              <FolderOpen size={40} className="opacity-20 text-text-secondary" />
            </div>
            <p className="font-black uppercase tracking-widest text-xs italic text-text-secondary">
              {t('projectsDashboard.noProjects', 'Nuk u gjetën projekte aktive.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workspaces.map((workspace: Workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDelete={(id) => setWorkspaceToDelete(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-canvas/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-lg p-8 sm:p-10 rounded-[3rem] shadow-sm border border-border-main"
            >
              <h2 className="text-2xl font-bold text-text-primary mb-8 tracking-tight uppercase">
                {t('projectsDashboard.createProjectTitle', 'Krijo Projekt të Ri')}
              </h2>
              <form onSubmit={handleCreateWorkspace} className="space-y-6">
                <div>
                  <label className={labelClasses}>{t('projectsDashboard.projectName', 'Emri i Projektit')}</label>
                  <input
                    required
                    placeholder={t('projectsDashboard.projectNamePlaceholder', 'Titulli i Projektit')}
                    value={newWorkspaceData.title}
                    onChange={(e) => setNewWorkspaceData(p => ({ ...p, title: e.target.value }))}
                    className={inputClasses}
                  />
                </div>
                <div className="pt-6 border-t border-border-main space-y-5">
                  <p className={labelClasses}>{t('projectsDashboard.clientDetails', 'Detajet e Klientit')}</p>
                  <input
                    required
                    placeholder={t('projectsDashboard.clientName', 'Emri i Klientit')}
                    value={newWorkspaceData.clientName}
                    onChange={(e) => setNewWorkspaceData(p => ({ ...p, clientName: e.target.value }))}
                    className={inputClasses}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      placeholder={t('projectsDashboard.clientEmail', 'Email')}
                      value={newWorkspaceData.clientEmail}
                      onChange={(e) => setNewWorkspaceData(p => ({ ...p, clientEmail: e.target.value }))}
                      className={inputClasses}
                    />
                    <input
                      placeholder={t('projectsDashboard.clientPhone', 'Telefon')}
                      value={newWorkspaceData.clientPhone}
                      onChange={(e) => setNewWorkspaceData(p => ({ ...p, clientPhone: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-4 font-bold text-text-secondary hover:text-text-primary transition-all text-xs uppercase tracking-widest"
                  >
                    {t('general.cancel', 'Anulo')}
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="btn-primary px-10 h-14 rounded-2xl flex items-center justify-center gap-3 active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 hover-lift shadow-sm"
                  >
                    {isCreating ? <Loader2 className="animate-spin h-5 w-5" /> : t('general.create', 'Krijo')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {workspaceToDelete && (
          <div className="fixed inset-0 bg-canvas/60 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel w-full max-w-md p-10 rounded-[3rem] shadow-sm text-center border border-border-main"
            >
              <div className="w-20 h-20 bg-danger-start/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-border-main shadow-inner">
                <Trash2 className="h-10 w-10 text-danger-start" />
              </div>
              <h2 className="text-2xl font-black text-text-primary mb-3 uppercase tracking-tight">
                {t('projectsDashboard.deleteConfirmTitle', 'Fshij Projektin?')}
              </h2>
              <p className="text-text-secondary text-sm mb-10 leading-relaxed italic font-medium">
                {t('projectsDashboard.deleteConfirmMessage', 'Kjo veprim është i pakthyeshëm. Të gjitha dokumentet do të fshihen.')}
              </p>
              <div className="flex justify-center gap-5">
                <button
                  type="button"
                  onClick={() => setWorkspaceToDelete(null)}
                  className="btn-secondary flex-1 h-14 rounded-2xl text-[10px] uppercase tracking-widest hover-lift shadow-sm"
                >
                  {t('general.cancel', 'Anulo')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWorkspace}
                  disabled={isDeleting}
                  className="flex-1 h-14 rounded-2xl bg-danger-start hover:bg-danger-start/80 text-text-primary font-black flex items-center justify-center gap-3 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all hover-lift shadow-sm"
                >
                  {isDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : t('general.delete', 'Fshij')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectsDashboardPage;