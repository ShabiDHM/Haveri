// FILE: src/components/business/InventoryTab.tsx
// PHOENIX PROTOCOL - BRAND PRIMARY SYNC (INDIGO)
// Active UI elements use primary-start. Green only for stock levels (handled in InventoryList).
// No hardcoded white – uses theme CSS variables.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, Search, X, Loader2 } from 'lucide-react';
import { InventoryList } from './inventory/InventoryList';
import { InventoryItem } from '../../data/types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const InventoryTab: React.FC = () => {
    const { t } = useTranslation();
    const { workspace } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await apiService.getInventoryItems(workspace?.id);
            setItems(data || []);
        } catch (error) {
            console.error('Failed to fetch inventory items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [workspace?.id]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (item: InventoryItem) => {
        console.log('Edit item:', item);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('general.confirmDelete'))) {
            try {
                await apiService.deleteInventoryItem(id);
                await fetchItems();
            } catch (error) {
                console.error('Failed to delete item:', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary-start/10 border border-primary-start/20">
                        <Package className="text-primary-start" size={22} />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] uppercase tracking-widest leading-none">
                        {t('inventory.title', 'Menaxhimi i Stokut')}
                    </h1>
                </div>
                <button
                    onClick={() => console.log('Add item')}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-start/20 transition-all hover-lift"
                >
                    <Plus size={16} />
                    {t('inventory.addItem', 'Shto Artikull')}
                </button>
            </div>

            {/* Search Bar - Brand Primary Focus */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-primary-start transition-colors" />
                <input
                    type="text"
                    placeholder={t('header.searchPlaceholder')}
                    className="w-full pl-11 pr-10 py-3.5 bg-[var(--bg-input)] focus:bg-[var(--bg-card)] transition-all border border-[var(--border-main)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] rounded-2xl focus:outline-none focus:border-primary-start/50 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Inventory List Rendering */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-start" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] animate-pulse">
                        Duke përpunuar të dhënat e stokut...
                    </p>
                </div>
            ) : (
                <InventoryList
                    manualItems={filteredItems}
                    posItems={[]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};