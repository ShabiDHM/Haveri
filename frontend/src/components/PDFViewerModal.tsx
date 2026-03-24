// FILE: src/components/PDFViewerModal.tsx
// PHOENIX PROTOCOL - UNIVERSAL DOCUMENT VIEWER V8.0 (DESIGN SYSTEM STANDARDIZED)
// STATUS: VERIFIED - COMPLETE FILE REPLACEMENT

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import { apiService } from '../services/api';
import { Document } from '../data/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Loader, AlertTriangle, ChevronLeft, ChevronRight, 
    Download, ZoomIn, ZoomOut, Maximize, Minus, FileSpreadsheet, Table as TableIcon
} from 'lucide-react';
import { TFunction } from 'i18next';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerModalProps {
  documentData: Document;
  caseId?: string; 
  onClose: () => void;
  onMinimize?: () => void;
  t: TFunction; 
  directUrl?: string | null; 
  isAuth?: boolean;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ documentData, caseId, onClose, onMinimize, t, directUrl, isAuth = false }) => {
  const [pdfSource, setPdfSource] = useState<any>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0); 
  const [containerWidth, setContainerWidth] = useState<number>(0); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualViewerMode, setActualViewerMode] = useState<'PDF' | 'TEXT' | 'IMAGE' | 'DOWNLOAD' | 'DATA'>('PDF');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
      const updateWidth = () => {
          if (containerRef.current) {
              setContainerWidth(containerRef.current.clientWidth - 40); 
          }
      };
      window.addEventListener('resize', updateWidth);
      setTimeout(updateWidth, 200); 
      return () => window.removeEventListener('resize', updateWidth);
  }, [actualViewerMode]);

  const getTargetMode = (mimeType: string, fileName: string) => {
    const m = mimeType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';
    if (m.includes('csv') || m.includes('excel') || name.endsWith('.csv') || name.endsWith('.xlsx')) return 'DATA';
    if (m.startsWith('text/') || m.includes('plain') || name.endsWith('.txt')) return 'TEXT';
    if (m.startsWith('image/')) return 'IMAGE';
    return 'PDF';
  };

  const handleBlobContent = async (blob: Blob, mode: string) => {
      try {
          if (mode === 'TEXT' || mode === 'DATA') {
              const text = await blob.text();
              setTextContent(text);
              setActualViewerMode(mode as any);
          } else {
              const url = URL.createObjectURL(blob);
              setImageSource(url);
              setActualViewerMode('IMAGE');
          }
      } catch (e) {
          setError(t('error.failed_to_process_content'));
          setActualViewerMode('DOWNLOAD');
      } finally {
          setIsLoading(false);
      }
  };

  const fetchDocument = async () => {
    setIsLoading(true);
    setError(null);
    const targetMode = getTargetMode(documentData.mime_type || '', documentData.file_name || '');
    const token = apiService.getToken();

    try {
        if (directUrl) {
            if (targetMode === 'PDF') {
                 setPdfSource(isAuth && token ? { url: directUrl, httpHeaders: { 'Authorization': `Bearer ${token}` }, withCredentials: true } : directUrl);
                 setActualViewerMode('PDF');
                 setIsLoading(false);
            } else {
                 const headers: Record<string, string> = isAuth && token ? { 'Authorization': `Bearer ${token}` } : {};
                 const response = await fetch(directUrl, { headers });
                 if (!response.ok) throw new Error('Fetch failed');
                 const blob = await response.blob();
                 handleBlobContent(blob, targetMode);
            }
            return;
        }

        if (caseId) {
            const blob = await apiService.getOriginalDocument(caseId, documentData.id);
            if (targetMode === 'PDF') {
                setPdfSource(URL.createObjectURL(blob));
                setActualViewerMode('PDF');
                setIsLoading(false);
            } else {
                handleBlobContent(blob, targetMode);
            }
        }
    } catch (err) {
        setError(t('pdfViewer.errorFetch', { defaultValue: 'Dështoi ngarkimi i dokumentit.' }));
        setIsLoading(false);
        setActualViewerMode('DOWNLOAD');
    }
  };
  
  useEffect(() => {
    fetchDocument();
    return () => { 
        if (imageSource) URL.revokeObjectURL(imageSource);
        if (typeof pdfSource === 'string' && pdfSource.startsWith('blob:')) URL.revokeObjectURL(pdfSource);
    };
  }, [documentData.id, directUrl]);

  const handleDownloadOriginal = async () => {
    setIsDownloading(true);
    try {
        await apiService.downloadArchiveItem(documentData.id, documentData.file_name);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsDownloading(false); 
    }
  };

  const renderDataView = () => {
      if (!textContent) return null;
      const rows = textContent.split('\n').filter(r => r.trim()).map(r => r.split(','));
      return (
          <div className="flex justify-center p-4 sm:p-8 min-h-full bg-base">
              <div className="bg-card text-text-primary shadow-xl p-6 sm:p-10 min-h-[800px] w-full max-w-5xl rounded-sm border border-border-main">
                  <div className="border-b-2 border-border-main pb-4 mb-6 flex justify-between">
                      <div><h1 className="text-xl font-black text-primary uppercase">Dokument Verifikimi</h1><p className="text-xs font-mono text-text-muted">{documentData.file_name}</p></div>
                      <div className="text-right text-xs text-text-muted uppercase font-black tracking-widest"><p>Haveri Forensic</p><p>{new Date().toLocaleDateString()}</p></div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-surface">
                                  {rows[0]?.map((h, i) => (
                                      <th key={i} className="px-3 py-2 text-xs font-black uppercase tracking-widest border border-border-main text-text-primary">{h}</th>
                                  ))}
                                </tr>
                          </thead>
                          <tbody>
                              {rows.slice(1).map((row, i) => (
                                  <tr key={i} className="border-b border-border-main">
                                      {row.map((c, j) => (
                                          <td key={j} className="px-3 py-2 text-xs border border-border-main text-text-secondary">{c}</td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex flex-col items-center justify-center h-64"><Loader className="animate-spin h-10 w-10 text-primary mb-4" /><p className="text-text-muted text-sm animate-pulse">{t('general.loading')}</p></div>;
    
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <AlertTriangle className="h-16 w-16 text-danger-start mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-2">{t('error.generic')}</h3>
            <p className="text-text-muted max-w-md">{error}</p>
        </div>
    );

    if (actualViewerMode === 'DOWNLOAD') return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <TableIcon size={64} className="text-text-muted mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-4">{t('pdfViewer.previewNotAvailable')}</h3>
            <button onClick={handleDownloadOriginal} disabled={isDownloading} className="btn-primary flex items-center gap-2 rounded-xl">
                {isDownloading ? <Loader className="animate-spin" size={20}/> : <Download size={20}/>} {t('pdfViewer.downloadOriginal')}
            </button>
        </div>
    );

    switch (actualViewerMode) {
      case 'PDF': return (
          <div className="flex flex-col items-center w-full min-h-full bg-base overflow-auto pt-8 pb-20" ref={containerRef}>
             <PdfDocument file={pdfSource} onLoadSuccess={({numPages}) => setNumPages(numPages)} onLoadError={() => setActualViewerMode('DOWNLOAD')} loading={null}>
                 <Page pageNumber={pageNumber} width={containerWidth > 0 ? containerWidth : 600} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-xl mb-4" />
             </PdfDocument>
          </div>
      );
      case 'DATA': return renderDataView();
      case 'IMAGE': return <div className="flex items-center justify-center h-full p-4"><img src={imageSource!} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-xl" /></div>;
      case 'TEXT': return <div className="flex justify-center p-4 sm:p-8 min-h-full"><div className="bg-card text-text-primary p-8 w-full max-w-3xl rounded-sm shadow-xl font-mono text-xs border border-border-main"><pre className="whitespace-pre-wrap">{textContent}</pre></div></div>;
      default: return null;
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-canvas/50 backdrop-blur-md z-[9999] flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full h-full sm:max-w-6xl sm:max-h-[95vh] rounded-none sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <header className="flex items-center justify-between p-3 sm:p-4 bg-surface border-b border-border-main backdrop-blur-xl z-20 shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {actualViewerMode === 'DATA' ? <FileSpreadsheet className="text-success-start" /> : <TableIcon className="text-primary" />}
                <h2 className="text-sm sm:text-base font-bold text-text-primary truncate">{documentData.file_name}</h2>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {actualViewerMode === 'PDF' && (
                  <div className="hidden sm:flex items-center gap-1 mr-4 bg-surface p-1 rounded-lg border border-border-main">
                      <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-1.5 text-text-muted hover:text-text-primary"><ZoomOut size={16}/></button>
                      <button onClick={() => setScale(1.0)} className="p-1.5 text-text-muted hover:text-text-primary"><Maximize size={16}/></button>
                      <button onClick={() => setScale(s => Math.min(s + 0.1, 3.0))} className="p-1.5 text-text-muted hover:text-text-primary"><ZoomIn size={16}/></button>
                  </div>
              )}
              <button onClick={handleDownloadOriginal} disabled={isDownloading} className="p-2 text-text-muted hover:text-text-primary transition-colors" title={t('general.download')}>
                  {isDownloading ? <Loader className="animate-spin" size={20}/> : <Download size={22} />}
              </button>
              {onMinimize && <button onClick={onMinimize} className="p-2 text-text-muted hover:text-text-primary transition-colors"><Minus size={22} /></button>}
              <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary transition-colors"><X size={24} /></button>
            </div>
          </header>
          <div className="flex-grow relative bg-base/50 overflow-auto custom-scrollbar">{renderContent()}</div>
          {actualViewerMode === 'PDF' && numPages && numPages > 1 && (
            <footer className="flex items-center justify-center p-3 bg-surface border-t border-border-main z-20">
              <div className="flex items-center gap-4 bg-surface px-4 py-2 rounded-full border border-border-main shadow-sm">
                <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1 hover:text-text-primary disabled:opacity-20 text-text-muted"><ChevronLeft size={24} /></button>
                <span className="text-xs font-bold text-text-primary w-16 text-center">{pageNumber} / {numPages}</span>
                <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="p-1 hover:text-text-primary disabled:opacity-20 text-text-muted"><ChevronRight size={24} /></button>
              </div>
            </footer>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default PDFViewerModal;
