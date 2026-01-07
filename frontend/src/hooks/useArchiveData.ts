// FILE: src/hooks/useArchiveData.ts
// PHOENIX PROTOCOL - DEFENSIVE DATA SANITIZATION V3.1 (REAL-TIME SSE)
// 1. FIX: Added 'useEffect' to listen for Server-Sent Events (SSE) from '/api/v1/archive/events'.
// 2. LOGIC: Uses 'fetch' with Auth headers instead of EventSource to ensure security context.
// 3. RESULT: Instantly updates document status (PROCESSING -> READY) without page refresh.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService, API_V1_URL } from '../services/api';
import { ArchiveItemOut, Case } from '../data/types';
import { useTranslation } from 'react-i18next';

export type BreadcrumbType = { id: string | null; name: string; type: 'ROOT' | 'CASE' | 'FOLDER'; };

export const useArchiveData = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [archiveItems, setArchiveItems] = useState<ArchiveItemOut[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbType[]>([{ id: null, name: t('business.archive'), type: 'ROOT' }]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    
    // To prevent duplicate connections or memory leaks
    const abortControllerRef = useRef<AbortController | null>(null);

    // Initial Load
    useEffect(() => {
        const loadCases = async () => { try { const c = await apiService.getCases(); setCases(c); } catch {} };
        loadCases();
    }, []);

    // Content Fetch on Navigation
    const fetchArchiveContent = useCallback(async () => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        setLoading(true);
        try {
            let rawItems: any[] = [];
            if (active.type === 'ROOT') rawItems = await apiService.getArchiveItems(undefined, undefined, "null");
            else if (active.type === 'CASE') rawItems = await apiService.getArchiveItems(undefined, active.id!, "null");
            else if (active.type === 'FOLDER') rawItems = await apiService.getArchiveItems(undefined, undefined, active.id!);
            
            // PHOENIX FIX: Sanitize the data from the backend.
            const items: ArchiveItemOut[] = rawItems
                .filter(item => item && (item._id || item.id))
                .map(item => ({ ...item, id: item._id || item.id }));
            
            setArchiveItems(items);
        } catch (e) {
            console.error("Failed to load archive content", e);
        } finally {
            setLoading(false);
        }
    }, [breadcrumbs]);

    useEffect(() => { fetchArchiveContent(); }, [fetchArchiveContent]);

    // PHOENIX PROTOCOL: Real-Time SSE Listener
    useEffect(() => {
        const setupStream = async () => {
            const token = apiService.getToken();
            if (!token) return;

            // Cleanup previous connection if exists
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            const ac = new AbortController();
            abortControllerRef.current = ac;

            try {
                const response = await fetch(`${API_V1_URL}/archive/events`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: ac.signal
                });

                if (!response.ok || !response.body) return;

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep incomplete data in buffer

                    for (const line of lines) {
                        const dataPrefix = 'data: ';
                        if (line.trim().startsWith(dataPrefix)) {
                            const jsonStr = line.trim().substring(dataPrefix.length);
                            try {
                                const eventData = JSON.parse(jsonStr);
                                
                                // Handle Document Status Updates
                                if (eventData.type === 'DOCUMENT_STATUS') {
                                    const { document_id, status } = eventData;
                                    setArchiveItems(prev => prev.map(item => 
                                        item.id === document_id 
                                            ? { ...item, indexing_status: status } 
                                            : item
                                    ));
                                }
                            } catch (e) {
                                // Ignore parse errors (ping, etc)
                            }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn("SSE Connection lost", err);
                }
            }
        };

        setupStream();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []); // Run once on mount (or could depend on location, but global is safer here)

    // Navigation
    const navigateTo = (index: number) => setBreadcrumbs(prev => prev.slice(0, index + 1));
    const enterFolder = (id: string, name: string, type: 'FOLDER' | 'CASE') => setBreadcrumbs(prev => [...prev, { id, name, type }]);

    // CRUD Operations
    const createFolder = async (name: string, category: string) => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        await apiService.createArchiveFolder(
            name,
            active.type === 'FOLDER' ? active.id! : undefined,
            active.type === 'CASE' ? active.id! : undefined,
            category
        );
        await fetchArchiveContent();
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        const active = breadcrumbs[breadcrumbs.length - 1];
        try {
            await apiService.uploadArchiveItem(
                file, file.name, "GENERAL",
                active.type === 'CASE' ? active.id! : undefined,
                active.type === 'FOLDER' ? active.id! : undefined
            );
            await fetchArchiveContent();
        } finally {
            setIsUploading(false);
        }
    };

    const deleteItem = async (id: string) => {
        await apiService.deleteArchiveItem(id);
        await fetchArchiveContent();
    };

    const renameItem = async (id: string, newName: string) => {
        await apiService.renameArchiveItem(id, newName);
        setArchiveItems(prev => prev.map(i => i.id === id ? { ...i, title: newName } : i));
    };

    const shareItem = async (item: ArchiveItemOut) => {
        const newStatus = !item.is_shared;
        await apiService.shareArchiveItem(item.id, newStatus);
        setArchiveItems(prev => prev.map(i => i.id === item.id ? { ...i, is_shared: newStatus } : i));
    };

    // Derived State
    const currentView = breadcrumbs[breadcrumbs.length - 1];
    const isInsideCase = currentView.type === 'CASE';
    
    const filteredCases = useMemo(() => 
        cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.case_number.toLowerCase().includes(searchTerm.toLowerCase())),
        [cases, searchTerm]
    );

    const filteredItems = useMemo(() => 
        archiveItems.filter(item => {
            if (currentView.type === 'ROOT' && item.case_id) return false; // Don't show case items in root
            return item.title.toLowerCase().includes(searchTerm.toLowerCase());
        }),
        [archiveItems, searchTerm, currentView]
    );

    return {
        loading,
        archiveItems,
        cases,
        breadcrumbs,
        currentView,
        filteredCases,
        filteredItems,
        searchTerm,
        setSearchTerm,
        isUploading,
        isInsideCase,
        fetchArchiveContent,
        navigateTo,
        enterFolder,
        createFolder,
        uploadFile,
        deleteItem,
        renameItem,
        shareItem
    };
};