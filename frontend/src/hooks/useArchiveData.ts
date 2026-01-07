// FILE: src/hooks/useArchiveData.ts
// PHOENIX PROTOCOL - AGGRESSIVE SYNC V4.1
// 1. FIX: Added specific 'console.log' for every SSE event received to verify network connectivity.
// 2. LOGIC: If 'READY' status is received, we now TRIGGER 'fetchArchiveContent' immediately.
//    - This brute-forces the UI update even if the local state ID matching fails.

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
    
    // Ref to track current items for SSE comparison without triggering re-renders
    const itemsRef = useRef<ArchiveItemOut[]>([]);
    useEffect(() => { itemsRef.current = archiveItems; }, [archiveItems]);

    // Initial Load of Cases
    useEffect(() => {
        const loadCases = async () => { try { const c = await apiService.getCases(); setCases(c); } catch {} };
        loadCases();
    }, []);

    // Content Fetch on Navigation
    const fetchArchiveContent = useCallback(async () => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        // Only set loading on initial nav, not background refreshes
        if (itemsRef.current.length === 0) setLoading(true);
        
        try {
            let rawItems: any[] = [];
            if (active.type === 'ROOT') rawItems = await apiService.getArchiveItems(undefined, undefined, "null");
            else if (active.type === 'CASE') rawItems = await apiService.getArchiveItems(undefined, active.id!, "null");
            else if (active.type === 'FOLDER') rawItems = await apiService.getArchiveItems(undefined, undefined, active.id!);
            
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
        const abortController = new AbortController();
        
        const setupStream = async () => {
            const token = apiService.getToken();
            if (!token) return;

            console.log("🔌 Connecting to Archive Event Stream...");

            try {
                const response = await fetch(`${API_V1_URL}/archive/events`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: abortController.signal
                });

                if (!response.ok || !response.body) {
                    console.warn("SSE Connection Failed", response.status);
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const jsonStr = line.trim().substring(6);
                            try {
                                const eventData = JSON.parse(jsonStr);
                                console.log("📨 SSE RECEIVED:", eventData);
                                
                                if (eventData.type === 'DOCUMENT_STATUS') {
                                    const { document_id, status } = eventData;
                                    
                                    // 1. Optimistic Update (Instant Feedback)
                                    setArchiveItems(prev => prev.map(item => 
                                        item.id === document_id 
                                            ? { ...item, indexing_status: status } 
                                            : item
                                    ));

                                    // 2. Aggressive Sync (Guarantee Correctness)
                                    // If status is READY, fetch from DB to ensure we have the final vector state
                                    if (status === 'READY') {
                                        console.log("✅ Document Ready. Refreshing list to confirm...");
                                        fetchArchiveContent(); 
                                    }
                                }
                            } catch (e) { /* Ignore ping/parse errors */ }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.warn("SSE Stream disconnected:", err);
            }
        };

        setupStream();
        return () => abortController.abort();
    }, [fetchArchiveContent]); 

    // Navigation Helpers
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
            console.log("Starting upload...", file.name);
            await apiService.uploadArchiveItem(
                file, file.name, "GENERAL",
                active.type === 'CASE' ? active.id! : undefined,
                active.type === 'FOLDER' ? active.id! : undefined
            );
            console.log("Upload successful, refreshing...");
            await fetchArchiveContent();
        } catch (error) {
            console.error("Upload Failed:", error);
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

    const currentView = breadcrumbs[breadcrumbs.length - 1];
    const isInsideCase = currentView.type === 'CASE';
    
    const filteredCases = useMemo(() => 
        cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.case_number.toLowerCase().includes(searchTerm.toLowerCase())),
        [cases, searchTerm]
    );

    const filteredItems = useMemo(() => 
        archiveItems.filter(item => {
            if (currentView.type === 'ROOT' && item.case_id) return false; 
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