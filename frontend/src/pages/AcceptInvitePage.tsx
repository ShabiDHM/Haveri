// FILE: src/pages/AcceptInvitePage.tsx
// PHOENIX PROTOCOL - INVITATION LANDING PAGE V3.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const AcceptInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Ftesa është e pavlefshme ose mungon tokeni.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Fjalëkalimet nuk përputhen.');
            return;
        }

        if (password.length < 8) {
            setError('Fjalëkalimi duhet të jetë së paku 8 karaktere.');
            return;
        }

        setLoading(true);
        try {
            if (!token) throw new Error("Mungon tokeni i ftesës");
            
            await apiService.acceptInvite(token, password);
            setSuccess(true);
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            console.error("Accept invite failed", err);
            setError(err.response?.data?.detail || "Aktivizimi dështoi. Ftesa mund të ketë skaduar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-start/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary-start/10 rounded-full blur-[128px]" />
            </div>

            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <BrandLogo />
                    <h2 className="mt-6 text-3xl font-bold text-text-primary tracking-tight">
                        Mirësevini në Ekip
                    </h2>
                    <p className="mt-2 text-text-secondary">
                        Krijoni fjalëkalimin tuaj për të aktivizuar llogarinë.
                    </p>
                </div>

                <div className="bg-glass backdrop-blur-xl border border-border-strong rounded-3xl p-8 shadow-lg">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-success-start/20 rounded-full flex items-center justify-center mx-auto mb-4 text-success-start">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">Llogaria u Aktivizua!</h3>
                            <p className="text-text-secondary mb-6">Fjalëkalimi juaj u ruajt me sukses. Tani mund të hyni në platformë.</p>
                            <Link to="/login" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-bold">
                                Shko te Hyrja <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-start gap-3 text-sm">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-3.5 text-text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="password" 
                                        required 
                                        placeholder="Fjalëkalimi i Ri"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="glass-input w-full pl-11"
                                    />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-3.5 text-text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="password" 
                                        required 
                                        placeholder="Konfirmo Fjalëkalimin"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="glass-input w-full pl-11"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading || !token}
                                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Aktivizo Llogarinë"}
                            </button>
                        </form>
                    )}
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-text-muted text-sm">
                        &copy; {new Date().getFullYear()} Haveri AI. Të gjitha të drejtat e rezervuara.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvitePage;