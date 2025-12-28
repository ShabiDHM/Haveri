// FILE: src/components/AIStudioPanel.tsx
// PHOENIX PROTOCOL - UNIFIED AI STUDIO
// 1. FEATURE: Provides tabs to switch between 'Business Chat' and 'Drafting'.
// 2. LAYOUT: Matches the dimensions and style of the replaced ChatPanel.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, PenTool } from 'lucide-react';
import ChatPanel, { ChatMode, Jurisdiction, AgentType } from './ChatPanel';
import DraftingPanel from './DraftingPanel';
import { ChatMessage, ConnectionStatus } from '../data/types';

interface AIStudioPanelProps {
    messages: ChatMessage[];
    connectionStatus: ConnectionStatus;
    reconnect: () => void;
    onSendMessage: (text: string, mode: ChatMode, documentId?: string, jurisdiction?: Jurisdiction, agentType?: AgentType) => void;
    isSendingMessage: boolean;
    onClearChat: () => void;
    activeCaseId: string;
    className?: string;
    activeContextId: string; 
}

const AIStudioPanel: React.FC<AIStudioPanelProps> = (props) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'chat' | 'draft'>('chat');

    return (
        <div className={`flex flex-col h-full w-full ${props.className}`}>
            <div className="flex bg-black/40 p-1 rounded-t-2xl border-b border-white/10 gap-1 flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'chat' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                    <BrainCircuit size={16} />
                    {t('chatPanel.title', 'Bisedo')}
                </button>
                <button 
                    onClick={() => setActiveTab('draft')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'draft' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                    <PenTool size={16} />
                    {t('drafting.title', 'Harto')}
                </button>
            </div>

            <div className="flex-1 min-h-0 relative">
                {activeTab === 'chat' ? (
                    <ChatPanel 
                        agentType="business" 
                        messages={props.messages} 
                        connectionStatus={props.connectionStatus} 
                        reconnect={props.reconnect} 
                        onSendMessage={props.onSendMessage} 
                        isSendingMessage={props.isSendingMessage} 
                        onClearChat={props.onClearChat} 
                        t={t} 
                        className="rounded-t-none border-t-0 h-full" 
                        activeContextId={props.activeContextId} 
                    />
                ) : (
                    <DraftingPanel 
                        activeCaseId={props.activeCaseId} 
                        className="rounded-t-none border-t-0 h-full"
                    />
                )}
            </div>
        </div>
    );
};

export default AIStudioPanel;