// FILE: frontend/src/pages/MobileUploadPage.tsx
// PHOENIX PROTOCOL - MOBILE UPLOAD V3.0 (UNIFIED ADMIN AESTHETIC)
// UPDATED: Uses unified border styling

import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, FileUp } from 'lucide-react';

const MobileUploadPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
    const [fileName, setFileName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (!token) {
            setErrorMsg("Missing upload token.");
            setStatus('error');
            return;
        }

        setFileName(file.name);
        setStatus('uploading');
        try {
            await apiService.uploadMobileFile(token, file);
            setStatus('complete');
        } catch (error: any) {
            console.error("Mobile Upload Failed:", error);
            setErrorMsg(error.response?.data?.detail || "Ngarkimi dështoi. Provoni përsëri.");
            setStatus('error');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'uploading':
                return (
                    <>
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <h1 className="text-2xl font-bold mt-4 text-text-primary">Duke Ngarkuar...</h1>
                        <p className="text-text-secondary break-all">{fileName}</p>
                    </>
                );
            case 'complete':
                return (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-success-start" />
                        <h1 className="text-2xl font-bold mt-4 text-text-primary">Ngarkimi Përfundoi</h1>
                        <p className="text-text-secondary">Tani mund ta mbyllni këtë faqe.</p>
                    </>
                );
            case 'error':
                return (
                    <>
                        <AlertTriangle className="w-16 h-16 text-danger" />
                        <h1 className="text-2xl font-bold mt-4 text-text-primary">Gabim</h1>
                        <p className="text-danger">{errorMsg}</p>
                    </>
                );
            default: // idle
                return (
                    <>
                        <UploadCloud className="w-16 h-16 text-primary" />
                        <h1 className="text-2xl font-bold mt-4 text-text-primary">Gati për Ngarkim</h1>
                        <p className="text-text-secondary max-w-sm text-center mb-8">Zgjidhni një skedar ose imazh për ta dërguar në kompjuterin tuaj.</p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-primary w-full max-w-xs px-8 py-4 flex items-center justify-center gap-2"
                        >
                            <FileUp size={18} /> Zgjidh Skedarin
                        </button>
                    </>
                );
        }
    };

    return (
        <div className="bg-canvas text-text-primary min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-glass backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-border-strong shadow-lg">
                {renderContent()}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".csv, .xlsx, .xls, .png, .jpg, .jpeg"
            />
        </div>
    );
};

export default MobileUploadPage;