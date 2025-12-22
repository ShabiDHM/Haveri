// FILE: src/pages/AdminDashboardPage.tsx
// PHOENIX PROTOCOL - ADMIN DASHBOARD V2.5 (I18N OPTIMIZATION)
// 1. REFACTOR: Replaced specific 'admin.search/cancel/save' keys with existing 'general.*' keys to immediately show Albanian text.
// 2. I18N: Ensured every text element is wrapped in t() with a clean fallback.
// 3. STATUS: Layout and Types preserved; Translation coverage maximized.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, Edit2, Trash2, CheckCircle, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { User, UpdateUserRequest } from '../data/types';

const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<UpdateUserRequest>({});

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const rawData = await apiService.getAllUsers();
            const normalizedData = rawData.map((u: any) => ({
                ...u,
                id: u.id || u._id,
                role: u.role || 'STANDARD',
                status: u.status || 'inactive',
                subscription_status: u.subscription_status || 'INACTIVE'
            }));
            const validUsers = normalizedData.filter((user: any) => user && typeof user.id === 'string' && user.id.trim() !== '');
            setUsers(validUsers);
        } catch (error) {
            console.error("Failed to load users", error);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setEditForm({
            username: user.username,
            email: user.email,
            role: user.role,
            subscription_status: user.subscription_status,
            status: user.status,
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.id) return;
        
        try {
            const payload: UpdateUserRequest = {
                username: editForm.username,
                email: editForm.email,
                role: editForm.role,
                subscription_status: editForm.subscription_status,
                status: editForm.status,
            };

            await apiService.updateUser(editingUser.id, payload);
            
            setEditingUser(null);
            loadUsers(); 
        } catch (error) {
            console.error("Failed to update user", error);
            alert(t('error.generic', 'Ndodhi një gabim. Ju lutemi provoni përsëri.'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        // Uses 'admin.confirmDelete' which exists in your JSON
        if (!window.confirm(t('admin.confirmDelete', 'A jeni të sigurt që doni të fshini këtë përdorues?'))) return;
        try {
            await apiService.deleteUser(userId);
            loadUsers();
        } catch (error) {
            console.error("Failed to delete user", error);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderStatusBadge = (user: User) => {
        const status = user.status || 'inactive';
        if (status.toLowerCase() === 'active') {
            return <span className="flex items-center text-green-400 bg-green-400/10 px-2 py-1 rounded-full text-xs font-medium w-fit"><CheckCircle className="w-3 h-3 mr-1" /> {t('admin.statuses.ACTIVE', 'Aktive')}</span>;
        }
        return <span className="flex items-center text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full text-xs font-medium w-fit"><Clock className="w-3 h-3 mr-1" /> {t('admin.statuses.INACTIVE', 'Në Pritje')}</span>;
    };

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary-start" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
            <div className="mb-8">
                {/* Existing Keys in your JSON */}
                <h1 className="text-3xl font-bold text-text-primary mb-2">{t('admin.title', 'Paneli i Administratorit')}</h1>
                <p className="text-text-secondary">{t('admin.subtitle', 'Menaxhimi i përdoruesve dhe sistemit.')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-background-light/30 p-6 rounded-2xl border border-glass-edge flex items-center justify-between shadow-lg">
                    <div><p className="text-text-secondary text-sm font-medium">{t('admin.totalUsers', 'Total Përdorues')}</p><h3 className="text-3xl font-bold text-white">{users.length}</h3></div>
                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Users /></div>
                </div>
                <div className="bg-background-light/30 p-6 rounded-2xl border border-glass-edge flex items-center justify-between shadow-lg">
                    <div><p className="text-text-secondary text-sm font-medium">{t('admin.pendingApproval', 'Në Pritje')}</p><h3 className="text-3xl font-bold text-yellow-500">{users.filter(u => u.status !== 'active').length}</h3></div>
                    <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-400"><Clock /></div>
                </div>
            </div>

            <div className="bg-background-light/10 backdrop-blur-md rounded-2xl border border-glass-edge overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 border-b border-glass-edge flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 gap-4">
                    <h3 className="text-lg font-semibold text-white">{t('admin.registeredUsers', 'Përdoruesit e Regjistruar')}</h3>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                        {/* PHOENIX FIX: Used 'general.search' which exists in JSON */}
                        <input type="text" placeholder={t('general.search', 'Kërko...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary-start outline-none" />
                    </div>
                </div>

                <div className="w-full overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left text-sm text-text-secondary min-w-[800px]">
                        <thead className="bg-black/20 text-text-primary uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.user', 'Përdoruesi')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.role', 'Roli')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.status', 'Statusi')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.registered', 'Regjistruar')}</th>
                                <th className="px-6 py-3 text-right font-semibold tracking-wider">{t('general.actions', 'Veprime')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-primary-start/20 flex items-center justify-center text-primary-start font-bold mr-3 border border-primary-start/30 shrink-0">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-white truncate max-w-[120px] sm:max-w-xs">{user.username}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.role.toUpperCase() === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{user.role}</span></td>
                                    <td className="px-6 py-4">{renderStatusBadge(user)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleEditClick(user)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 p-2 rounded-lg transition-colors border border-blue-500/20" title={t('general.edit', 'Ndrysho')}><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 p-2 rounded-lg transition-colors border border-red-500/20" title={t('general.delete', 'Fshi')}><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="bg-[#1f2937] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">{t('admin.editModal.title', 'Ndrysho Përdoruesin')}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.username', 'Emri i Përdoruesit')}</label>
                                <input type="text" value={editForm.username || ''} onChange={e => setEditForm({ ...editForm, username: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.email', 'Email')}</label>
                                <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.role', 'Roli')}</label>
                                    <select value={editForm.role || 'STANDARD'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none">
                                        <option value="STANDARD">{t('admin.roles.STANDARD', 'Përdorues')}</option>
                                        <option value="ADMIN">{t('admin.roles.ADMIN', 'Admin')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.subscriptionStatus', 'Abonimi')}</label>
                                    <select 
                                        value={editForm.subscription_status} 
                                        onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })} 
                                        className={`w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none`}
                                    >
                                        <option value="ACTIVE">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                        <option value="INACTIVE">{t('admin.statuses.INACTIVE', 'Jo Aktive')}</option>
                                        <option value="TRIAL">{t('subscription.TRIAL', 'Provë (Trial)')}</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.accountStatus', 'Llogaria (Gatekeeper)')}</label>
                                <select 
                                    value={editForm.status} 
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })} 
                                    className={`w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:border-primary-start outline-none font-bold ${editForm.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}
                                >
                                    <option value="active">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                    <option value="inactive">{t('admin.statuses.INACTIVE', 'Në Pritje')}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                {/* PHOENIX FIX: Used 'general.cancel' which exists in JSON */}
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">{t('general.cancel', 'Anulo')}</button>
                                {/* PHOENIX FIX: Used 'general.save' which exists in JSON */}
                                <button type="submit" className="px-6 py-2 rounded-lg bg-primary-start hover:bg-primary-end text-white font-semibold shadow-lg shadow-primary-start/20 transition-all">{t('general.save', 'Ruaj')}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;