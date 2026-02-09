// FILE: src/components/business/modals/ClientImportModal.tsx
// PHOENIX PROTOCOL - CLIENT IMPORT V1.0
// 1. CAPABILITY: Enables bulk import of Clients and Suppliers via CSV.
// 2. UX: Consistent design with Inventory Import for seamless user experience.

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, Loader2, Users, Info, Briefcase } from 'lucide-react';
import { apiService } from '../../../services/api';

interface ClientImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ClientImportModal: React.FC<ClientImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        try {
            // PHOENIX: Assuming apiService has been updated to handle this endpoint.
            // If not, this serves as the frontend contract for the backend developer.
            await apiService.importClients(file);
            alert(t('clients.importSuccess', 'Klientët u importuan me sukses!'));
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Client import failed:", error);
            alert(t('error.generic'));
        } finally {
            setLoading(false);
            setFile(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-emerald-500/20 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-emerald-900/20">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/5 mb-4 shadow-lg">
                        <Users className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t('clients.importTitle', 'Importo Klientët & Furnitorët')}</h3>
                    <p className="text-gray-400 text-sm max-w-[80%] mx-auto leading-relaxed">
                        {t('clients.importDesc', 'Ngarkoni bazën e të dhënave të kontakteve tuaja për faturim të shpejtë.')}
                    </p>
                </div>

                {/* Instructions Box */}
                <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/20 mb-6 text-left">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={14} className="text-blue-400" />
                        <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                            {t('inventory.import.requiredStructure', 'Struktura e Kërkuar (CSV)')}
                        </span>
                    </div>
                    <code className="text-xs font-mono text-blue-200/80 break-words block leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                        Emri, Email, Telefon, Adresa, NIPT, Tipi
                    </code>
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                        * Tipi: "Client" ose "Supplier"
                    </p>
                </div>

                {/* File Upload Zone */}
                <div className="mb-8">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv, .xlsx, .xls" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`w-full py-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 group
                            ${file 
                                ? 'border-emerald-500 bg-emerald-500/5' 
                                : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'
                            }
                        `}
                    >
                        {file ? (
                            <>
                                <CheckCircle size={32} className="text-emerald-400 drop-shadow-lg" />
                                <span className="text-emerald-400 font-bold text-sm px-4 truncate max-w-full">{file.name}</span>
                            </>
                        ) : (
                            <>
                                <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                    <Upload size={24} className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-gray-400 text-sm font-medium group-hover:text-white transition-colors">
                                    {t('inventory.import.clickToSelect', 'Klikoni për të zgjedhur skedarin')}
                                </span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all font-medium text-sm"
                    >
                        {t('general.cancel')}
                    </button>
                    <button 
                        onClick={handleImport} 
                        disabled={!file || loading} 
                        className="flex-[2] px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 transform hover:scale-[1.02]"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Briefcase size={18} />}
                        {t('general.import', 'Importo Kontaktet')}
                    </button>
                </div>
            </div>
        </div>
    );
};