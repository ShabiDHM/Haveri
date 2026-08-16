// FILE: src/pages/ProjectsDashboardPage.tsx
// HAVERI AI - MENAXHIMI I MUNDËSIVE (LIGHT & DARK THEME ADAPTIVE)

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Loader2, FolderOpen, Search, Trash2, 
    Briefcase, ArrowUpRight, 
    Phone, Mail, Building2, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Workspace } from '../data/types';
import { useNavigate } from 'react-router-dom';

export const ProjectsDashboardPage: React.FC = () => {
  const { workspaces, refreshWorkspaces } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WON'>('ALL');

  const [newDealData, setNewDealData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });

  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshWorkspaces();
      setIsLoading(false);
    };
    load();
  }, [refreshWorkspaces]);

  const filteredWorkspaces = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return workspaces.filter(ws => {
      const matchesSearch = !term || 
        ws.title?.toLowerCase().includes(term) ||
        ws.client?.name?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'ALL' || ws.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workspaces, searchTerm, statusFilter]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const workspaceNumber = `MARR-${Date.now().toString().slice(-6)}`;
      const payload = {
        workspace_number: workspaceNumber,
        title: newDealData.title,
        clientName: newDealData.clientName,
        clientEmail: newDealData.clientEmail,
        clientPhone: newDealData.clientPhone,
        status: 'ACTIVE',
      };
      await apiService.createWorkspace(payload);
      await refreshWorkspaces();
      setShowCreateModal(false);
      setNewDealData({ title: '', clientName: '', clientEmail: '', clientPhone: '' });
    } catch (error) {
      console.error('Dështoi krijimi i marrëveshjes:', error);
      alert('Dështoi ruajtja e marrëveshjes.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    setIsDeleting(true);
    try {
      await apiService.deleteWorkspace(dealToDelete);
      await refreshWorkspaces();
      setDealToDelete(null);
    } catch (error) {
      console.error('Dështoi fshirja:', error);
      alert('Nuk mund të fshihet marrëveshja.');
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClasses = "glass-input w-full px-5 py-3.5 rounded-2xl text-sm transition-all placeholder:text-text-muted border border-border-main bg-surface text-text-primary focus:border-primary-start focus:ring-1 focus:ring-primary-start/40";
  const labelClasses = "block text-[11px] font-bold text-primary-start uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-text-primary">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 pb-24 space-y-6">
        
        {/* Metrikat Kryesore të Shitjeve & Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              💼 Vlera në Negocim
            </span>
            <div className="mt-2 text-2xl font-bold text-text-primary">€185,000</div>
            <p className="text-xs text-text-muted mt-1">Oferta aktive në shqyrtim nga investitorët</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-start">
              📊 Marrëveshje Aktive
            </span>
            <div className="mt-2 text-2xl font-bold text-text-primary">{filteredWorkspaces.length} Projekte</div>
            <p className="text-xs text-text-muted mt-1">Marrëveshje në ndjekje e sipër</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ✅ Kontrata të Mbyllura
            </span>
            <div className="mt-2 text-2xl font-bold text-text-primary">€92,400</div>
            <p className="text-xs text-text-muted mt-1">Furnizime të konfirmuara këtë muaj</p>
          </div>
        </div>

        {/* Paneli Kryesor i Marrëveshjeve */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel bg-surface/50 border border-border-main shadow-sm space-y-6">
          
          {/* Header & Butoni Shto */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-main">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <Briefcase className="text-primary-start" size={22} />
                Mundësitë & Marrëveshjet B2B
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Menaxhimi i marrëveshjeve të zbuluara nga Inteligjenca e Tregut
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover-lift"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Shto Marrëveshje</span>
            </button>
          </div>

          {/* Shiriti i Kërkimit dhe Filtrat */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary-start transition-colors" />
              <input 
                type="text" 
                placeholder="Kërko marrëveshje, investitorë ose kompani..." 
                className="glass-input w-full pl-11 pr-4 py-3 border border-border-main focus:border-primary-start text-text-primary placeholder:text-text-muted rounded-xl text-sm focus:outline-none transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-surface/80 rounded-xl border border-border-main self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-primary-start text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Të Gjitha
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Në Bisedime
              </button>
              <button
                onClick={() => setStatusFilter('WON')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'WON'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Të Fituara
              </button>
            </div>
          </div>

          {/* Lista e Marrëveshjeve */}
          <div className="pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin h-10 w-10 text-primary-start" />
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen size={48} className="text-text-muted mb-3 opacity-60" />
                <p className="font-bold text-sm text-text-primary">Nuk u gjet asnjë marrëveshje</p>
                <p className="text-xs text-text-muted mt-1">
                  Krijoni një marrëveshje të re ose shtoni leje ndërtimi nga tab-i "Inteligjenca".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkspaces.map((workspace: Workspace) => (
                  <div
                    key={workspace.id}
                    className="p-5 rounded-xl glass-panel bg-surface/70 border border-border-main hover:border-primary-start/50 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-start/10 text-primary-start border border-primary-start/20 uppercase tracking-wide">
                          {workspace.workspace_number || 'MARRËVESHJE'}
                        </span>
                        <button
                          onClick={() => setDealToDelete(workspace.id)}
                          className="text-text-muted hover:text-danger-start transition-colors p-1"
                          title="Fshij Marrëveshjen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-text-primary mt-3 line-clamp-1">
                        {workspace.title}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-text-muted shrink-0" />
                          <span className="text-text-primary font-medium">{workspace.client?.name || 'Investitor i Paemërtuar'}</span>
                        </div>
                        {workspace.client?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-text-muted shrink-0" />
                            <span>{workspace.client.phone}</span>
                          </div>
                        )}
                        {workspace.client?.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-text-muted shrink-0" />
                            <span className="truncate">{workspace.client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-main flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Wallet size={14} />
                        Faza e Negocimit
                      </span>
                      <button
                        onClick={() => navigate('/business/insights')}
                        className="text-xs font-bold text-primary-start hover:underline flex items-center gap-1"
                      >
                        Shiko Inteligjencën <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modali i Krijimit */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 sm:p-8 rounded-3xl glass-panel bg-canvas border border-border-main shadow-2xl w-full max-w-lg space-y-6"
            >
              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                Regjistro Marrëveshje / Mundësi të Re
              </h2>
              <form onSubmit={handleCreateDeal} className="space-y-4">
                <div>
                  <label className={labelClasses}>Titulli i Marrëveshjes</label>
                  <input
                    required
                    placeholder="p.sh. Furnizim me Beton - Mati 1 (Kompleksi Alba)"
                    value={newDealData.title}
                    onChange={(e) => setNewDealData(p => ({ ...p, title: e.target.value }))}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Emri i Investitorit / Klientit</label>
                  <input
                    required
                    placeholder="p.sh. Alba Group SH.P.K."
                    value={newDealData.clientName}
                    onChange={(e) => setNewDealData(p => ({ ...p, clientName: e.target.value }))}
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Numri i Telefonit</label>
                    <input
                      placeholder="p.sh. 049 123 456"
                      value={newDealData.clientPhone}
                      onChange={(e) => setNewDealData(p => ({ ...p, clientPhone: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Email i Kontaktit</label>
                    <input
                      placeholder="p.sh. info@kompania.com"
                      value={newDealData.clientEmail}
                      onChange={(e) => setNewDealData(p => ({ ...p, clientEmail: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-border-main">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
                    className="px-5 py-2.5 rounded-xl border border-border-main text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Anulo
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating} 
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm hover-lift"
                  >
                    {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : 'Krijo Marrëveshje'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modali i Fshirjes */}
      <AnimatePresence>
        {dealToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-8 rounded-3xl glass-panel bg-canvas border border-border-main shadow-2xl w-full max-w-md text-center space-y-4">
              <div className="w-16 h-16 bg-danger-start/10 rounded-2xl flex items-center justify-center mx-auto border border-danger-start/20">
                <Trash2 className="h-8 w-8 text-danger-start" />
              </div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                Fshij këtë Marrëveshje?
              </h2>
              <p className="text-text-secondary text-xs leading-relaxed">
                Ky veprim do ta fshijë marrëveshjen nga pipeline-i juaj i shitjeve.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setDealToDelete(null)} 
                  className="flex-1 py-2.5 rounded-xl border border-border-main text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider"
                >
                  Anulo
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteDeal} 
                  disabled={isDeleting} 
                  className="flex-1 py-2.5 rounded-xl bg-danger-start hover:bg-danger-start/80 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm"
                >
                  {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Fshij'}
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