// FILE: src/hooks/useArchiveData.ts
// PHOENIX PROTOCOL - HOOK EXTRACTION V1.0
// Centralizes Archive navigation, data fetching, and file operations.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
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
            let items: ArchiveItemOut[] = [];
            if (active.type === 'ROOT') items = await apiService.getArchiveItems(undefined, undefined, "null");
            else if (active.type === 'CASE') items = await apiService.getArchiveItems(undefined, active.id!, "null");
            else if (active.type === 'FOLDER') items = await apiService.getArchiveItems(undefined, undefined, active.id!);
            setArchiveItems(items);
        } catch (e) {
            console.error("Failed to load archive content", e);
        } finally {
            setLoading(false);
        }
    }, [breadcrumbs]);

    useEffect(() => { fetchArchiveContent(); }, [fetchArchiveContent]);

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
        fetchArchiveContent, // Exposed for refresh if needed
        navigateTo,
        enterFolder,
        createFolder,
        uploadFile,
        deleteItem,
        renameItem,
        shareItem
    };
};