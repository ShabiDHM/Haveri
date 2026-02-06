// FILE: src/hooks/useArchiveData.ts
// PHOENIX PROTOCOL - UNIFIED ARCHIVE HOOK V5.3 (WORKSPACE REBRAND)
// 1. REBRAND: Renamed 'Case' to 'Workspace' across all state and logic.
// 2. ALIGNMENT: Synchronized with the rebranded apiService.
// 3. LOGIC: Maintained the workspace-hiding filter to prevent recursive folder views.
// 4. STATUS: Fully synchronized.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService, API_V1_URL } from '../services/api';
import { ArchiveItemOut, Workspace } from '../data/types';
import { useTranslation } from 'react-i18next';

export type BreadcrumbType = { id: string | null; name: string; type: 'ROOT' | 'WORKSPACE' | 'FOLDER'; };

export const useArchiveData = (workspaceId?: string) => {
    const { t } = useTranslation();
    
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbType[]>([
        { id: null, name: t('business.archive'), type: 'ROOT' }
    ]);

    const [loading, setLoading] = useState(true);
    const [archiveItems, setArchiveItems] = useState<ArchiveItemOut[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    
    const itemsRef = useRef<ArchiveItemOut[]>([]);
    useEffect(() => { itemsRef.current = archiveItems; }, [archiveItems]);

    useEffect(() => {
        const loadWorkspaces = async () => { 
            try { 
                const results = await apiService.getWorkspaces(); 
                setWorkspaces(results); 
            } catch {} 
        };
        loadWorkspaces();
    }, []);

    const fetchArchiveContent = useCallback(async () => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        if (itemsRef.current.length === 0) setLoading(true);
        
        try {
            let rawItems: any[] = [];
            
            if (active.type === 'ROOT') {
                const globalItems = await apiService.getArchiveItems(undefined, undefined, "null");
                
                let workspaceItems: any[] = [];
                if (workspaceId) {
                    try {
                        workspaceItems = await apiService.getArchiveItems(undefined, workspaceId, "null");
                    } catch (e) {
                        console.warn("Could not fetch workspace items", e);
                    }
                }
                
                rawItems = [...globalItems, ...workspaceItems];
                
                const seen = new Set();
                rawItems = rawItems.filter(item => {
                    const id = item._id || item.id;
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });

            } else if (active.type === 'WORKSPACE') {
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
    }, [breadcrumbs, workspaceId]);

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
    const enterFolder = (id: string, name: string, type: 'FOLDER' | 'WORKSPACE') => setBreadcrumbs(prev => [...prev, { id, name, type }]);

    // CRUD
    const createFolder = async (name: string, category: string) => {
        const active = breadcrumbs[breadcrumbs.length - 1];
        const targetWorkspaceId = active.type === 'WORKSPACE' 
            ? active.id! 
            : (active.type === 'ROOT' ? workspaceId : undefined);

        await apiService.createArchiveFolder(name, active.type === 'FOLDER' ? active.id! : undefined, targetWorkspaceId, category);
        await fetchArchiveContent();
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        const active = breadcrumbs[breadcrumbs.length - 1];
        const targetWorkspaceId = active.type === 'WORKSPACE' 
            ? active.id! 
            : (active.type === 'ROOT' ? workspaceId : undefined);

        try {
            await apiService.uploadArchiveItem(file, file.name, "GENERAL", targetWorkspaceId, active.type === 'FOLDER' ? active.id! : undefined);
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
    const isInsideWorkspace = currentView.type === 'WORKSPACE';
    
    const filteredItems = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        
        // Filter regular files and folders
        const items = archiveItems.filter(item => 
            item.title.toLowerCase().includes(lowerSearch)
        );

        // Filter workspace-folders, but only if we are at the root
        let workspaceFolders: ArchiveItemOut[] = [];
        if (currentView.type === 'ROOT') {
            workspaceFolders = workspaces
                .filter(w => {
                    // PHOENIX FIX: Exclude the current singleton workspace from showing as a folder
                    if (w.id === workspaceId) return false;
                    return w.title.toLowerCase().includes(lowerSearch) || w.workspace_number.toLowerCase().includes(lowerSearch);
                })
                .map(w => ({
                    id: w.id,
                    title: w.title,
                    item_type: 'FOLDER',
                    file_type: 'Workspace Folder',
                    created_at: w.created_at,
                    category: 'Workspace',
                    storage_key: '',
                    file_size: 0,
                    is_shared: false
                } as ArchiveItemOut));
        }
        
        return [...workspaceFolders, ...items];

    }, [archiveItems, workspaces, searchTerm, currentView.type, workspaceId]);

    const filteredWorkspaces = useMemo(() => workspaces.filter(w => w.title.toLowerCase().includes(searchTerm.toLowerCase()) || w.workspace_number.toLowerCase().includes(searchTerm.toLowerCase())), [workspaces, searchTerm]);

    return { loading, archiveItems, breadcrumbs, currentView, filteredWorkspaces, filteredItems, searchTerm, setSearchTerm, isUploading, isInsideWorkspace, fetchArchiveContent, navigateTo, enterFolder, createFolder, uploadFile, deleteItem, renameItem, shareItem };
};