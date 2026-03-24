// FILE: src/pages/AccountPage.tsx
// PHOENIX PROTOCOL - I18N ALIGNMENT V4.0 (ORIGINAL, NO BUSINESS TAB)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { User, Lock, Trash2, Save, Loader2 } from 'lucide-react';
import { Panel } from '../components/ui/Panel';

const AccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        alert(t('account.passwordMismatch'));
        return;
    }
    setIsSaving(true);
    try {
        await apiService.changePassword({
            current_password: passwords.current,
            new_password: passwords.new
        });
        alert(t('account.passwordUpdated'));
        setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
        console.error(error);
        alert(t('error.generic'));
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm(t('account.confirmDelete'))) return;
      try {
          await apiService.deleteAccount();
          logout();
      } catch (error) {
          console.error(error);
          alert(t('error.generic'));
      }
  };

  if (!user) return null;

  return (
    <div className="glass-panel p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('account.title')}</h1>
        
        <div className="space-y-6">
            {/* Profile Info */}
            <Panel className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
                    <User className="text-primary" /> {t('account.profileInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.username')}</label>
                        <div className="px-4 py-2 bg-surface rounded-xl text-text-primary border border-border-main">
                            {user.username}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.email')}</label>
                        <div className="px-4 py-2 bg-surface rounded-xl text-text-primary border border-border-main">
                            {user.email}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.role')}</label>
                        <div className="px-4 py-2 bg-surface rounded-xl text-text-primary border border-border-main capitalize">
                            {user.role.toLowerCase()}
                        </div>
                    </div>
                </div>
            </Panel>

            {/* Password Change */}
            <Panel className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
                    <Lock className="text-primary" /> {t('account.security')}
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.currentPassword')}</label>
                        <input 
                            type="password" 
                            required
                            value={passwords.current}
                            onChange={e => setPasswords({...passwords, current: e.target.value})}
                            className="glass-input w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.newPassword')}</label>
                        <input 
                            type="password" 
                            required
                            value={passwords.new}
                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                            className="glass-input w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('account.confirmPassword')}</label>
                        <input 
                            type="password" 
                            required
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            className="glass-input w-full"
                        />
                    </div>
                    <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2 disabled:opacity-50 rounded-xl px-6 py-3">
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {t('general.save')}
                    </button>
                </form>
            </Panel>

            {/* Danger Zone */}
            <div className="bg-danger-start/10 p-6 rounded-2xl border border-danger-start/30">
                <h3 className="text-xl font-semibold text-danger-start mb-4 flex items-center gap-2">
                    <Trash2 /> {t('account.dangerZone')}
                </h3>
                <p className="text-sm text-danger-start/70 mb-4">{t('account.deleteWarning')}</p>
                <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-xl border border-danger-start/30 text-danger-start hover:bg-danger-start/20 transition-all font-medium">
                    {t('account.deleteAccount')}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AccountPage;