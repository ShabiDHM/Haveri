// FILE: src/pages/ProjectsDashboardPage.tsx
// HAVERI AI - MENAXHIMI I MUNDËSIVE & KONTRATAVE B2B (100% SHQIP)

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
    estimatedValue: '',
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
      setNewDealData({ title: '', clientName: '', clientEmail: '', clientPhone: '', estimatedValue: '' });
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

  const inputClasses = "glass-input w-full px-5 py-3.5 rounded-2xl text-sm transition-all placeholder:text-slate-500 border border-slate-800 bg-slate-900/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-white";
  const labelClasses = "block text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 pb-24 space-y-6">
        
        {/* Metrikat Kryesore të Shitjeve & Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              💼 Vlera në Negocim
            </span>
            <div className="mt-2 text-2xl font-bold text-white">€185,000</div>
            <p className="text-xs text-slate-400 mt-1">Oferta aktive në shqyrtim nga investitorët</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              📊 Marrëveshje Aktive
            </span>
            <div className="mt-2 text-2xl font-bold text-white">{filteredWorkspaces.length} Projekte</div>
            <p className="text-xs text-slate-400 mt-1">Marrëveshje në ndjekje e sipër</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              ✅ Kontrata të Mbyllura
            </span>
            <div className="mt-2 text-2xl font-bold text-white">€92,400</div>
            <p className="text-xs text-slate-400 mt-1">Furnizime të konfirmuara këtë muaj</p>
          </div>
        </div>

        {/* Paneli Kryesor i Marrëveshjeve */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shadow-2xl space-y-6">
          
          {/* Header & Butoni Shto */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Briefcase className="text-blue-400" size={22} />
                Mundësitë & Marrëveshjet B2B
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Menaxhimi i marrëveshjeve të zbuluara nga Inteligjenca e Tregut
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all duration-200"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Shto Marrëveshje</span>
            </button>
          </div>

          {/* Shiriti i Kërkimit dhe Filtrat */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Kërko marrëveshje, investitorë ose kompani..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500 text-white placeholder:text-slate-500 rounded-xl text-sm focus:outline-none transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Të Gjitha
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Në Bisedime
              </button>
              <button
                onClick={() => setStatusFilter('WON')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'WON'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
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
                <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen size={48} className="text-slate-600 mb-3" />
                <p className="font-bold text-sm text-slate-300">Nuk u gjet asnjë marrëveshje</p>
                <p className="text-xs text-slate-500 mt-1">
                  Krijoni një marrëveshje të re ose shtoni leje ndërtimi nga tab-i "Inteligjenca".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkspaces.map((workspace: Workspace) => (
                  <div
                    key={workspace.id}
                    className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                          {workspace.workspace_number || 'MARRËVESHJE'}
                        </span>
                        <button
                          onClick={() => setDealToDelete(workspace.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Fshij Marrëveshjen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white mt-3 line-clamp-1">
                        {workspace.title}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-500 shrink-0" />
                          <span className="text-slate-300 font-medium">{workspace.client?.name || 'Investitor i Paemërtuar'}</span>
                        </div>
                        {workspace.client?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-slate-500 shrink-0" />
                            <span>{workspace.client.phone}</span>
                          </div>
                        )}
                        {workspace.client?.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-slate-500 shrink-0" />
                            <span className="truncate">{workspace.client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <Wallet size={14} />
                        Faza e Negocimit
                      </span>
                      <button
                        onClick={() => navigate('/business/insights')}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
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

      {/* Modali i Krijimit të Marrëveshjes */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl w-full max-w-lg space-y-6"
            >
              <h2 className="text-xl font-bold text-white tracking-tight">
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

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
                    className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Anulo
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating} 
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
                  >
                    {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : 'Krijo Marrëveshje'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modali i Konfirmimit të Fshirjes */}
      <AnimatePresence>
        {dealToDelete && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl w-full max-w-md text-center space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="h-8 w-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Fshij këtë Marrëveshje?
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Ky veprim do ta fshijë marrëveshjen nga pipeline-i juaj i shitjeve.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setDealToDelete(null)} 
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider"
                >
                  Anulo
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteDeal} 
                  disabled={isDeleting} 
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-all"
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