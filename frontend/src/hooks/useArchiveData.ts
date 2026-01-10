// FILE: src/hooks/useArchiveData.ts
// PHOENIX PROTOCOL - UNIFIED SEARCH V5.1
// 1. CRITICAL FIX: The 'filteredItems' now correctly merges filtered files and filtered case-folders.
// 2. LOGIC: This ensures that when a user searches, both documents AND relevant case folders appear in the results.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService, API_V1_URL } from '../services/api';
import { ArchiveItemOut, Case } from '../data/types';
import { useTranslation } from 'react-i18next';

export type BreadcrumbType = { id: string | null; name: string; type: 'ROOT' | 'CASE' | 'FOLDER'; };

export const useArchiveData = (initialCaseId?: string) => {
    const { t } = useTranslation();
    
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbType[]>([
        { id: null, name: t('business.archive'), type: 'ROOT' }
    ]);

    const [loading, setLoading] = useState(true);
    const [archiveItems, setArchiveItems] = useState<ArchiveItemOut[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    
    const itemsRef = useRef<ArchiveItemOut[]>([]);
    useEffect(() => { itemsRef.current = archiveItems; }, [archiveItems]);

    useEffect(() => {
        const loadCases = async () => { try { const c = await apiService.getCases(); setCases(c); } catch {} };
        loadCases();
    }, []);

    const fetchArchiveContent = useCallback(async () => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        if (itemsRef.current.length === 0) setLoading(true);
        
        try {
            let rawItems: any[] = [];
            
            if (active.type === 'ROOT') {
                const globalItems = await apiService.getArchiveItems(undefined, undefined, "null");
                
                let caseItems: any[] = [];
                if (initialCaseId) {
                    try {
                        caseItems = await apiService.getArchiveItems(undefined, initialCaseId, "null");
                    } catch (e) {
                        console.warn("Could not fetch case items", e);
                    }
                }
                
                rawItems = [...globalItems, ...caseItems];
                
                const seen = new Set();
                rawItems = rawItems.filter(item => {
                    const id = item._id || item.id;
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });

            } else if (active.type === 'CASE') {
                rawItems = await apiService.getArchiveItems(undefined, active.id!, "null");
            } else if (active.type === 'FOLDER') {
                rawItems = await apiService.getArchiveItems(undefined, undefined, active.id!);
            }
            
            const items: ArchiveItemOut[] = rawItems
                .filter(item => item && (item._id || item.id))
                .map(item => ({ ...item, id: item._id || item.id }));
            
            setArchiveItems(items);
        } catch (e) {
            console.error("Failed to load archive content", e);
        } finally {
            setLoading(false);
        }
    }, [breadcrumbs, initialCaseId]);

    useEffect(() => { fetchArchiveContent(); }, [fetchArchiveContent]);

    useEffect(() => {
        const abortController = new AbortController();
        const setupStream = async () => {
            const token = apiService.getToken();
            if (!token) return;

            try {
                const response = await fetch(`${API_V1_URL}/archive/events`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: abortController.signal
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
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            try {
                                const eventData = JSON.parse(line.trim().substring(6));
                                if (eventData.type === 'DOCUMENT_STATUS') {
                                    setArchiveItems(prev => prev.map(item => 
                                        item.id === eventData.document_id ? { ...item, indexing_status: eventData.status } : item
                                    ));
                                    if (eventData.status === 'READY') fetchArchiveContent(); 
                                }
                            } catch (e) {}
                        }
                    }
                }
            } catch (err) {}
        };
        setupStream();
        return () => abortController.abort();
    }, [fetchArchiveContent]); 

    // Navigation
    const navigateTo = (index: number) => setBreadcrumbs(prev => prev.slice(0, index + 1));
    const enterFolder = (id: string, name: string, type: 'FOLDER' | 'CASE') => setBreadcrumbs(prev => [...prev, { id, name, type }]);

    // CRUD
    const createFolder = async (name: string, category: string) => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        const targetCaseId = active.type === 'CASE' 
            ? active.id! 
            : (active.type === 'ROOT' ? initialCaseId : undefined);

        await apiService.createArchiveFolder(name, active.type === 'FOLDER' ? active.id! : undefined, targetCaseId, category);
        await fetchArchiveContent();
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        const active = breadcrumbs[breadcrumbs.length - 1];
        const targetCaseId = active.type === 'CASE' 
            ? active.id! 
            : (active.type === 'ROOT' ? initialCaseId : undefined);

        try {
            await apiService.uploadArchiveItem(file, file.name, "GENERAL", targetCaseId, active.type === 'FOLDER' ? active.id! : undefined);
            await fetchArchiveContent();
        } catch (error) {
            console.error("Upload Failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const deleteItem = async (id: string) => { await apiService.deleteArchiveItem(id); await fetchArchiveContent(); };
    const renameItem = async (id: string, newName: string) => { await apiService.renameArchiveItem(id, newName); setArchiveItems(prev => prev.map(i => i.id === id ? { ...i, title: newName } : i)); };
    const shareItem = async (item: ArchiveItemOut) => { const newStatus = !item.is_shared; await apiService.shareArchiveItem(item.id, newStatus); setArchiveItems(prev => prev.map(i => i.id === item.id ? { ...i, is_shared: newStatus } : i)); };

    const currentView = breadcrumbs[breadcrumbs.length - 1];
    const isInsideCase = currentView.type === 'CASE';
    
    // PHOENIX: UNIFIED FILTERING LOGIC
    const filteredItems = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        
        // Filter regular files and folders
        const items = archiveItems.filter(item => 
            item.title.toLowerCase().includes(lowerSearch)
        );

        // Filter case-folders, but only if we are at the root
        let caseFolders: ArchiveItemOut[] = [];
        if (currentView.type === 'ROOT') {
            caseFolders = cases
                .filter(c => c.title.toLowerCase().includes(lowerSearch) || c.case_number.toLowerCase().includes(lowerSearch))
                .map(c => ({
                    id: c.id,
                    title: c.title,
                    item_type: 'FOLDER',
                    file_type: 'Case Folder',
                    created_at: c.created_at,
                    // Mock the rest of the fields to match the type
                    category: 'Cases',
                    storage_key: '',
                    file_size: 0
                } as ArchiveItemOut));
        }
        
        // Combine and return
        return [...caseFolders, ...items];

    }, [archiveItems, cases, searchTerm, currentView.type]);

    // This is now redundant as it's handled in filteredItems
    const filteredCases = useMemo(() => cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.case_number.toLowerCase().includes(searchTerm.toLowerCase())), [cases, searchTerm]);

    return { loading, archiveItems, breadcrumbs, currentView, filteredCases, filteredItems, searchTerm, setSearchTerm, isUploading, isInsideCase, fetchArchiveContent, navigateTo, enterFolder, createFolder, uploadFile, deleteItem, renameItem, shareItem };
};