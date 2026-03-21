// FILE: src/pages/AccountPage.tsx
// PHOENIX PROTOCOL - I18N ALIGNMENT V3.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling and Panel component

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">{t('account.title')}</h1>
        
        <div className="grid gap-8">
            {/* Profile Info */}
            <Panel className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
                    <User className="text-primary" /> {t('account.profileInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-text-secondary mb-1">{t('account.username')}</label>
                        <div className="px-4 py-2 bg-surface rounded-lg text-text-primary border border-border-strong">
                            {user.username}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-text-secondary mb-1">{t('account.email')}</label>
                        <div className="px-4 py-2 bg-surface rounded-lg text-text-primary border border-border-strong">
                            {user.email}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-text-secondary mb-1">{t('account.role')}</label>
                        <div className="px-4 py-2 bg-surface rounded-lg text-text-primary border border-border-strong capitalize">
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
                    <input 
                        type="password" 
                        placeholder={t('account.currentPassword')}
                        required
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                        className="glass-input w-full"
                    />
                    <input 
                        type="password" 
                        placeholder={t('account.newPassword')}
                        required
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className="glass-input w-full"
                    />
                    <input 
                        type="password" 
                        placeholder={t('account.confirmPassword')}
                        required
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className="glass-input w-full"
                    />
                    <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {t('general.save')}
                    </button>
                </form>
            </Panel>

            {/* Danger Zone */}
            <div className="bg-danger/10 p-6 rounded-2xl border border-danger/20">
                <h3 className="text-xl font-semibold text-danger mb-4 flex items-center gap-2">
                    <Trash2 /> {t('account.dangerZone')}
                </h3>
                <p className="text-sm text-danger/70 mb-4">{t('account.deleteWarning')}</p>
                <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-lg border border-danger text-danger hover:bg-danger hover:text-inverse transition-all">
                    {t('account.deleteAccount')}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AccountPage;