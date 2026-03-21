// FILE: src/pages/AdminDashboardPage.tsx
// PHOENIX PROTOCOL - ADMIN DASHBOARD V3.2 (DESIGN SYSTEM ALIGNMENT)
// 1. UPDATED: Uses new design system CSS variables for light/dark theme compatibility.
// 2. PRESERVED: All admin functionality (user management, plan tiers, expiry dates, etc.)
// 3. STATUS: Fully aligned with TypeScript definitions.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, Edit2, Trash2, CheckCircle, Loader2, Clock, Shield, Briefcase, Crown, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { User, UpdateUserRequest } from '../data/types';

// Extend the type locally to include the new fields if they aren't in the global type yet
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
            return <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1" /> {t('admin.statuses.ACTIVE', 'Aktive')}</span>;
        }
        return <span className="badge badge-warning"><Clock className="w-3 h-3 mr-1" /> {t('admin.statuses.INACTIVE', 'Në Pritje')}</span>;
    };

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">{t('admin.title', 'Paneli i Administratorit')}</h1>
                <p className="text-text-secondary">{t('admin.subtitle', 'Menaxhimi i përdoruesve dhe sistemit.')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card-panel p-6 flex items-center justify-between">
                    <div><p className="text-text-secondary text-sm font-medium">{t('admin.totalUsers', 'Total Përdorues')}</p><h3 className="text-3xl font-bold text-text-primary">{users.length}</h3></div>
                    <div className="p-3 rounded-xl bg-primary/20 text-primary"><Users /></div>
                </div>
                <div className="card-panel p-6 flex items-center justify-between">
                    <div><p className="text-text-secondary text-sm font-medium">{t('admin.pendingApproval', 'Në Pritje')}</p><h3 className="text-3xl font-bold text-warning-start">{users.filter(u => u.status !== 'active').length}</h3></div>
                    <div className="p-3 rounded-xl bg-warning-start/20 text-warning-start"><Clock /></div>
                </div>
            </div>

            <div className="card-panel overflow-hidden">
                <div className="p-4 border-b border-border-main flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-semibold text-text-primary">{t('admin.registeredUsers', 'Përdoruesit e Regjistruar')}</h3>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input type="text" placeholder={t('general.search', 'Kërko...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="glass-input w-full sm:w-64 pl-9" />
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-secondary min-w-[1000px]">
                        <thead className="bg-surface text-text-primary uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.user', 'Përdoruesi')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">Organizata</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">Plani</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-text-muted" />
                                        <span>Skadimi</span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.role', 'Roli')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.status', 'Statusi')}</th>
                                <th className="px-6 py-3 font-semibold tracking-wider">{t('admin.table.registered', 'Regjistruar')}</th>
                                <th className="px-6 py-3 text-right font-semibold tracking-wider">{t('general.actions', 'Veprime')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-hover transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-3 border border-primary/30 shrink-0">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-text-primary truncate max-w-[120px] sm:max-w-xs">{user.username}</div>
                                                <div className="text-xs text-text-muted truncate max-w-[120px] sm:max-w-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.organization_role === 'OWNER' ? (
                                                <Shield className="w-4 h-4 text-success-start" />
                                            ) : (
                                                <Briefcase className="w-4 h-4 text-primary" />
                                            )}
                                            <span className="text-xs font-medium text-text-secondary">{user.organization_role || 'OWNER'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.plan_tier !== 'SOLO' && <Crown className="w-3 h-3 text-warning-start" />}
                                            <span className="text-xs font-mono uppercase text-text-muted">{user.plan_tier || 'SOLO'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.subscription_expiry_date ? (
                                            <span className="text-xs font-mono text-text-secondary bg-surface px-2 py-1 rounded">
                                                {new Date(user.subscription_expiry_date).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-text-muted">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4"><span className={`badge ${user.role.toUpperCase() === 'ADMIN' ? 'badge-danger' : 'badge-neutral'}`}>{user.role}</span></td>
                                    <td className="px-6 py-4">{renderStatusBadge(user)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleEditClick(user)} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20" title={t('general.edit', 'Ndrysho')}><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger transition-colors border border-danger/20" title={t('general.delete', 'Fshi')}><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="bg-glass backdrop-blur-xl border border-border-main p-6 rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
                    >
                        <h3 className="text-xl font-bold text-text-primary mb-6 border-b border-border-main pb-4">{t('admin.editModal.title', 'Ndrysho Përdoruesin')}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-muted uppercase mb-1">{t('admin.editModal.username', 'Emri i Përdoruesit')}</label>
                                <input type="text" value={editForm.username || ''} onChange={e => setEditForm({ ...editForm, username: e.target.value })} className="glass-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-muted uppercase mb-1">{t('admin.editModal.email', 'Email')}</label>
                                <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="glass-input w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase mb-1">{t('admin.editModal.role', 'Roli')}</label>
                                    <select value={editForm.role || 'STANDARD'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="glass-input w-full">
                                        <option value="STANDARD">{t('admin.roles.STANDARD', 'Përdorues')}</option>
                                        <option value="ADMIN">{t('admin.roles.ADMIN', 'Admin')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase mb-1">{t('admin.editModal.subscriptionStatus', 'Abonimi')}</label>
                                    <select 
                                        value={editForm.subscription_status} 
                                        onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })} 
                                        className="glass-input w-full"
                                    >
                                        <option value="ACTIVE">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                        <option value="INACTIVE">{t('admin.statuses.INACTIVE', 'Jo Aktive')}</option>
                                        <option value="TRIAL">{t('subscription.TRIAL', 'Provë (Trial)')}</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase mb-1">Paketa</label>
                                    <select 
                                        value={editForm.plan_tier || 'SOLO'} 
                                        onChange={e => setEditForm({ ...editForm, plan_tier: e.target.value })} 
                                        className="glass-input w-full font-mono"
                                    >
                                        <option value="SOLO">SOLO</option>
                                        <option value="STARTUP">STARTUP</option>
                                        <option value="GROWTH">GROWTH</option>
                                        <option value="ENTERPRISE">ENT.</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-text-muted uppercase mb-1">
                                        <Calendar className="w-3 h-3" />
                                        Skadimi
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={editForm.subscription_expiry_date || ''} 
                                            onChange={e => setEditForm({ ...editForm, subscription_expiry_date: e.target.value })} 
                                            className="glass-input w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-text-muted uppercase mb-1">{t('admin.editModal.accountStatus', 'Llogaria (Gatekeeper)')}</label>
                                <select 
                                    value={editForm.status} 
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })} 
                                    className={`glass-input w-full font-bold ${editForm.status === 'active' ? 'text-success-start' : 'text-warning-start'}`}
                                >
                                    <option value="active">{t('admin.statuses.ACTIVE', 'Aktive')}</option>
                                    <option value="inactive">{t('admin.statuses.INACTIVE', 'Në Pritje')}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border-main">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg hover:bg-hover text-text-secondary hover:text-text-primary transition-colors">{t('general.cancel', 'Anulo')}</button>
                                <button type="submit" className="btn-primary">{t('general.save', 'Ruaj')}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;