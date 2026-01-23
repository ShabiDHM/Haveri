// FILE: src/pages/AdminDashboardPage.tsx
// PHOENIX PROTOCOL - ADMIN DASHBOARD V3.1 (UI POLISH)
// 1. FIX: Used 'Calendar' icon in Table Header and Modal Label to resolve unused variable warning.
// 2. STATUS: Fully aligned with TypeScript definitions.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, Edit2, Trash2, CheckCircle, Loader2, Clock, Shield, Briefcase, Crown, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { User, UpdateUserRequest } from '../data/types';

// Extend the type locally to include the new fields if they aren't in the global type yet
// (Note: Since we updated types.ts, this is strictly a safety fallback, but good practice)
interface ExtendedUpdateUserRequest extends UpdateUserRequest {
    plan_tier?: string;
    subscription_expiry_date?: string;
}

const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    // PHOENIX: State now supports expiry date string
    const [editForm, setEditForm] = useState<ExtendedUpdateUserRequest>({});

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
                subscription_status: u.subscription_status || 'INACTIVE',
                plan_tier: u.plan_tier || 'SOLO',
                organization_role: u.organization_role || 'OWNER',
                // Ensure date is kept if present
                subscription_expiry_date: u.subscription_expiry_date
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
        
        // PHOENIX: Format date for HTML input (YYYY-MM-DD)
        let formattedDate = '';
        if (user.subscription_expiry_date) {
            try {
                formattedDate = new Date(user.subscription_expiry_date).toISOString().split('T')[0];
            } catch (e) {
                console.warn("Invalid date format", user.subscription_expiry_date);
            }
        }

        setEditForm({
            username: user.username,
            email: user.email,
            role: user.role,
            subscription_status: user.subscription_status,
            status: user.status,
            plan_tier: user.plan_tier || 'SOLO',
            subscription_expiry_date: formattedDate
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.id) return;
        
        try {
            const payload: any = {
                username: editForm.username,
                email: editForm.email,
                role: editForm.role,
                subscription_status: editForm.subscription_status,
                status: editForm.status,
                plan_tier: editForm.plan_tier,
                // Only send date if it has a value
                subscription_expiry_date: editForm.subscription_expiry_date || null
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
            <style>{`
                .dark-select {
                    color-scheme: dark;
                }
                /* Calendar icon inside date input */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}</style>

            <div className="mb-8">
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
                        <input type="text" placeholder={t('general.search', 'Kërko...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-primary-start outline-none" />
                    </div>
                </div>

                <div className="w-full overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left text-sm text-text-secondary min-w-[1000px]">
                        <thead className="bg-black/20 text-text-primary uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.user', 'Përdoruesi')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">Organizata</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">Plani</th>
                                {/* PHOENIX FIX: Added Calendar Icon to Header */}
                                <th className="px-6 py-3 font-semibold tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>Skadimi</span>
                                    </div>
                                </th>
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.organization_role === 'OWNER' ? (
                                                <Shield className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Briefcase className="w-4 h-4 text-blue-400" />
                                            )}
                                            <span className="text-xs font-medium text-gray-300">{user.organization_role || 'OWNER'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.plan_tier !== 'SOLO' && <Crown className="w-3 h-3 text-amber-400" />}
                                            <span className="text-xs font-mono uppercase text-gray-400">{user.plan_tier || 'SOLO'}</span>
                                        </div>
                                    </td>
                                    {/* PHOENIX: Expiration Date Column */}
                                    <td className="px-6 py-4">
                                        {user.subscription_expiry_date ? (
                                            <span className="text-xs font-mono text-gray-300 bg-white/5 px-2 py-1 rounded">
                                                {new Date(user.subscription_expiry_date).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-600">-</span>
                                        )}
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
                                    <select value={editForm.role || 'STANDARD'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none dark-select">
                                        <option value="STANDARD">{t('admin.roles.STANDARD', 'Përdorues')}</option>
                                        <option value="ADMIN">{t('admin.roles.ADMIN', 'Admin')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.subscriptionStatus', 'Abonimi')}</label>
                                    <select 
                                        value={editForm.subscription_status} 
                                        onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })} 
                                        className={`w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none dark-select`}
                                    >
                                        <option value="ACTIVE">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                        <option value="INACTIVE">{t('admin.statuses.INACTIVE', 'Jo Aktive')}</option>
                                        <option value="TRIAL">{t('subscription.TRIAL', 'Provë (Trial)')}</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Paketa</label>
                                    <select 
                                        value={editForm.plan_tier || 'SOLO'} 
                                        onChange={e => setEditForm({ ...editForm, plan_tier: e.target.value })} 
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 outline-none font-mono dark-select"
                                    >
                                        <option value="SOLO">SOLO</option>
                                        <option value="STARTUP">STARTUP</option>
                                        <option value="GROWTH">GROWTH</option>
                                        <option value="ENTERPRISE">ENT.</option>
                                    </select>
                                </div>
                                {/* PHOENIX: Expiry Date Picker */}
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase mb-1">
                                        <Calendar className="w-3 h-3" />
                                        Skadimi
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={editForm.subscription_expiry_date || ''} 
                                            onChange={e => setEditForm({ ...editForm, subscription_expiry_date: e.target.value })} 
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary-start outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">{t('admin.editModal.accountStatus', 'Llogaria (Gatekeeper)')}</label>
                                <select 
                                    value={editForm.status} 
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })} 
                                    className={`w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:border-primary-start outline-none font-bold dark-select ${editForm.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}
                                >
                                    <option value="active">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                    <option value="inactive">{t('admin.statuses.INACTIVE', 'Në Pritje')}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">{t('general.cancel', 'Anulo')}</button>
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