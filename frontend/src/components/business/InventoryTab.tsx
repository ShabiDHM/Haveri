// FILE: src/components/business/InventoryTab.tsx
// CLEANED: Removed unused modal states

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
            setItems(data);
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
        // TODO: Implement edit modal
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

    const handleAddItem = () => {
        // TODO: Implement add item modal
        console.log('Add item clicked');
    };

    return (
        <div className="space-y-6">
            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Package className="text-primary-start" />
                    {t('inventory.title', 'Inventari')}
                </h1>
                <button
                    onClick={handleAddItem}
                    className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl"
                >
                    <Plus size={18} />
                    {t('inventory.addItem', 'Shto Artikull')}
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary-start transition-colors" />
                <input
                    type="text"
                    placeholder={t('header.searchPlaceholder')}
                    className="w-full pl-10 pr-10 py-3 bg-white/5 backdrop-blur-sm focus:bg-white/10 transition-all border border-white/10 text-white placeholder:text-white/40 rounded-xl focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Inventory List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-start" />
                </div>
            ) : (
                <InventoryList
                    manualItems={filteredItems}
                    posItems={[]}  // No separate POS items in this simplified version
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};