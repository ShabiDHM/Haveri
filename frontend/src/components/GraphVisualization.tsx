// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData, GraphNode } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    X, Phone, ShieldAlert, Globe, TrendingDown, Sparkles,
    Briefcase, ShoppingCart, MessageCircle, CheckCircle, BarChart2, Mail
} from 'lucide-react';

// --- Configuration ---
const CARD_WIDTH = 180;
const CARD_HEIGHT = 65;
const BORDER_RADIUS = 4;

// --- THEME: High-Contrast Corporate ---
const THEME = {
  node: {
    client:    { bg: '#0b1120', border: '#3b82f6', text: '#bfdbfe' }, // Dark Navy
    invoice:   { bg: '#022c22', border: '#10b981', text: '#a7f3d0' }, // Dark Emerald
    expense:   { bg: '#450a0a', border: '#ef4444', text: '#fecaca' }, // Dark Red
    case:      { bg: '#18181b', border: '#71717a', text: '#e4e4e7' }, // Zinc
    inventory: { bg: '#431407', border: '#f97316', text: '#fed7aa' }, // Dark Orange
    product:   { bg: '#3b0764', border: '#a855f7', text: '#e9d5ff' }, // Dark Purple
    default:   { bg: '#0f172a', border: '#475569', text: '#e2e8f0' }, // Slate
  }
};

type IntelligenceMode = 'GLOBAL' | 'RISK' | 'COST' | 'OPPORTUNITY';

// --- UI Sub-Components ---
const InspectorClientDetails: React.FC<{ node: GraphNode }> = ({ node }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 bg-slate-900 rounded border border-slate-800">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">
                {t('graph.inspector.lifetimeValue', 'LIFETIME VALUE')}
            </span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {node.subLabel}
            </span>
        </div>
    );
};

const InspectorInvoiceDetails: React.FC<{ node: GraphNode }> = ({ node }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 bg-slate-900 rounded border border-slate-800">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">
                {t('graph.inspector.amount', 'TOTAL AMOUNT')}
            </span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {node.subLabel}
            </span>
        </div>
    );
};

const InspectorInventoryDetails: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="p-4 bg-slate-900 rounded border border-slate-800">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">
                {t('graph.inspector.allocations', 'ALLOCATIONS')}
            </span>
            <span className="text-white font-medium text-sm">
                Espresso Macchiato, Cappuccino
            </span>
        </div>
    );
};

const DefaultInspectorDetails: React.FC<{ node: GraphNode }> = ({ node }) => {
    const { t } = useTranslation();
    const status = node.status || 'Active';
    const isRisk = ['Unpaid', 'Overdue'].includes(status);
    
    return (
        <div className="p-4 bg-slate-900 rounded border border-slate-800">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">
                {t('graph.inspector.status', 'CURRENT STATUS')}
            </span>
            <div className="flex items-center gap-3 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${isRisk ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`}></span>
                <span className="text-white font-bold text-sm tracking-wide">
                    {status.toUpperCase()}
                </span>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ mode: IntelligenceMode }> = ({ mode }) => {
    const { t } = useTranslation();
    const content: Record<IntelligenceMode, { icon: JSX.Element; title: string; text: string }> = {
        RISK: { icon: <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 opacity-80" />, title: t('graph.empty.riskTitle', 'Safe and Secure'), text: t('graph.empty.riskText', 'No financial risks or overdue items detected.') },
        COST: { icon: <BarChart2 className="w-12 h-12 text-slate-600 mb-4 opacity-50" />, title: t('graph.empty.costTitle', 'No Cost Data'), text: t('graph.empty.costText', 'Add expenses to start tracking costs.') },
        OPPORTUNITY: { icon: <Sparkles className="w-12 h-12 text-purple-500 mb-4 opacity-80" />, title: t('graph.empty.oppTitle', 'Analyzing Patterns'), text: t('graph.empty.oppText', 'More data required to generate AI leads.') },
        GLOBAL: { icon: <Globe className="w-12 h-12 text-slate-600 mb-4 opacity-50" />, title: t('graph.empty.globalTitle', 'Canvas Empty'), text: t('graph.empty.globalText', 'System is ready. Add your first client.') }
    };
    const { icon, title, text } = content[mode] || content.GLOBAL;
    return ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-none select-none">
            {icon}
            <h3 className="text-lg font-bold text-slate-200 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">{text}</p>
        </div> 
    );
};

// --- MAIN COMPONENT ---
const GraphVisualization: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('GLOBAL');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fgRef = useRef<ForceGraphMethods>();
  const { width, height, ref: containerRef } = useResizeDetector({ refreshRate: 100 });

  // 1. Fetch Data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
        setIsLoading(true);
        setSelectedNode(null);
        try {
            const mode = activeMode.toLowerCase();
            const rawData = await apiService.getGraphData(mode);
            if (isMounted) {
                setData({ 
                    nodes: rawData.nodes.map((n: any) => ({ ...n })), 
                    links: rawData.links.map((l: any) => ({ ...l })) 
                });
            }
        } catch (e) { console.error("Graph Error:", e); } 
        finally { if (isMounted) setIsLoading(false); }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeMode]);

  // 2. Physics & Engine Settings
  useEffect(() => {
    const graph = fgRef.current;
    if (graph) {
        graph.d3Force('charge')?.strength(-3000); 
        graph.d3Force('link')?.distance(300);
        graph.d3Force('center')?.strength(0.08);
        
        if (data.nodes.length > 0) {
            setTimeout(() => { graph.zoomToFit(600, 100); }, 500);
        }
    }
  }, [data]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    fgRef.current?.centerAt(node.x, node.y, 800);
    fgRef.current?.zoom(1.1, 800);
  }, []);

  // 3. High-Fidelity Rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const group = node.group || 'Default';
    const styleKey = (group.toLowerCase() in THEME.node) ? group.toLowerCase() : 'default';
    const style = (THEME.node as any)[styleKey];
    
    const x = node.x!;
    const y = node.y!;
    const status = node.status || '';
    
    const isRisk = ['Unpaid', 'Overdue'].includes(status);
    const isOpportunity = status === 'Pending' && group === 'Client';
    const isSelected = node.id === selectedNode?.id;

    // -- SHADOWS --
    ctx.shadowBlur = 0; 
    if (isSelected) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.2)'; 
        ctx.shadowBlur = 30;
    } else if (isRisk) {
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'; 
        ctx.shadowBlur = 20;
    } else if (isOpportunity) {
        ctx.shadowColor = 'rgba(168, 85, 247, 0.4)'; 
        ctx.shadowBlur = 20;
    }

    // -- CARD BODY --
    ctx.fillStyle = style.bg;
    ctx.strokeStyle = isSelected ? '#ffffff' : style.border;
    ctx.lineWidth = isSelected ? 2 : 1;
    
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // -- HEADER --
    const typeLabel = group.toUpperCase();
    ctx.font = `600 9px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = style.text;
    ctx.globalAlpha = 0.8;
    ctx.fillText(typeLabel, x - CARD_WIDTH / 2 + 14, y - CARD_HEIGHT / 2 + 12);

    // -- TITLE --
    ctx.globalAlpha = 1;
    ctx.font = `bold 13px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    let title = node.label || String(node.id);
    if (title.length > 22) title = title.substring(0, 20) + '...';
    ctx.fillText(title, x - CARD_WIDTH / 2 + 14, y - CARD_HEIGHT / 2 + 26);

    // -- SUBTITLE --
    ctx.font = `400 11px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.subLabel || '---', x - CARD_WIDTH / 2 + 14, y - CARD_HEIGHT / 2 + 44);

    // -- STATUS INDICATOR --
    ctx.beginPath();
    ctx.arc(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 14, 3, 0, 2 * Math.PI);
    let statusColor = '#475569'; 
    if (isRisk) statusColor = '#ef4444';
    else if (['Active', 'Paid'].includes(status)) statusColor = '#10b981';
    else if (status === 'Pending') statusColor = '#f59e0b';
    ctx.fillStyle = statusColor;
    ctx.fill();

  }, [selectedNode, t]);

  // 4. Hit Detection
  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    const x = node.x!;
    const y = node.y!;
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill();
  }, []);

  // 5. Action Logic
  const handleAction = (actionType: string, node: GraphNode) => {
      switch (actionType) {
          case 'DRAFT_EMAIL':
              navigate(`/communications/compose?recipient=${node.id}`);
              break;
          case 'CALL_CLIENT':
              // Fallback to alert for system actions without routes yet
              alert(t('messages.callingClient', `Initiating call with ${node.label}...`));
              break;
          case 'SEND_REMINDER':
              alert(t('messages.sendingReminder', `Reminder queued for Invoice #${node.label}`));
              break;
          case 'OPEN_CASE':
              navigate(`/cases/${node.id}`);
              break;
          default:
              break;
      }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[650px] bg-slate-950 rounded-lg overflow-hidden shadow-xl border border-slate-900 flex flex-col font-sans">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-30">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
        </div>
      )}

      {!isLoading && data.nodes.length === 0 && <EmptyState mode={activeMode} />}
      
      {!isLoading && data.nodes.length > 0 && (
        <ForceGraph2D
            key={activeMode} 
            ref={fgRef}
            graphData={data} 
            width={width}
            height={height}
            backgroundColor="rgba(0,0,0,0)" 
            
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            
            linkLineDash={(link: any) => link.type === 'opportunity' ? [5, 5] : []}
            linkColor={(link: any) => link.type === 'opportunity' ? '#6366f1' : '#1e293b'} 
            linkWidth={1} 
            
            linkDirectionalParticles={1} 
            linkDirectionalParticleSpeed={0.003} 
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#475569'}

            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            
            minZoom={0.2} 
            maxZoom={2.0}
        />
      )}

      {/* Mode Switcher */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-full p-1.5 flex gap-2 shadow-2xl z-10">
          <ModeButton active={activeMode === 'GLOBAL'} onClick={() => setActiveMode('GLOBAL')} icon={<Globe size={14} />} label={t('graph.modeGlobal', 'Global')} color="bg-blue-600" />
          <ModeButton active={activeMode === 'RISK'} onClick={() => setActiveMode('RISK')} icon={<ShieldAlert size={14} />} label={t('graph.modeRisk', 'Risk')} color="bg-red-600" />
          <ModeButton active={activeMode === 'COST'} onClick={() => setActiveMode('COST')} icon={<TrendingDown size={14} />} label={t('graph.modeCost', 'Cost')} color="bg-orange-600" />
          <ModeButton active={activeMode === 'OPPORTUNITY'} onClick={() => setActiveMode('OPPORTUNITY')} icon={<Sparkles size={14} />} label={t('graph.modeOpportunity', 'Oppty')} color="bg-purple-600" />
      </div>

      {/* Inspector Panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right-10 duration-200 z-20">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        {t(`graph.entity.${selectedNode.group?.toLowerCase()}`, selectedNode.group)}
                    </h3>
                    <h2 className="text-xl font-bold text-white leading-snug break-words">
                        {selectedNode.label}
                    </h2>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="space-y-4 mb-8">
                {(() => {
                    switch (selectedNode.group) {
                        case 'Client': return <InspectorClientDetails node={selectedNode} />;
                        case 'Invoice': return <InspectorInvoiceDetails node={selectedNode} />;
                        case 'Inventory': return <InspectorInventoryDetails />;
                        default: return <DefaultInspectorDetails node={selectedNode} />;
                    }
                })()}
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-900">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">{t('general.actions', 'AVAILABLE ACTIONS')}</h4>
                <div className="space-y-3">
                    <ActionButton 
                        node={selectedNode} 
                        activeMode={activeMode} 
                        onAction={handleAction}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---
const ModeButton: React.FC<{ active: boolean; onClick: () => void; icon: JSX.Element; label: string; color: string }> = ({ active, onClick, icon, label, color }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${active ? `${color} text-white shadow-lg` : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
    >
        {icon} <span>{label}</span>
    </button>
);

const ActionButton: React.FC<{ node: GraphNode, activeMode: IntelligenceMode, onAction: (type: string, node: GraphNode) => void }> = ({ node, activeMode, onAction }) => {
    const { t } = useTranslation();
    const status = node.status || '';

    if (node.group === 'Client' && activeMode === 'OPPORTUNITY') {
        return <ButtonBase onClick={() => onAction('DRAFT_EMAIL', node)} icon={<Mail size={16} />} text={t('actions.draftEmail', 'Draft Sales Email')} color="bg-purple-600 hover:bg-purple-500" />;
    }
    if (node.group === 'Client') {
        return <ButtonBase onClick={() => onAction('CALL_CLIENT', node)} icon={<Phone size={16} />} text={t('actions.callClient', 'Call Client')} color="bg-blue-600 hover:bg-blue-500" />;
    }
    if (node.group === 'Invoice' && ['Unpaid', 'Overdue'].includes(status)) {
        return <ButtonBase onClick={() => onAction('SEND_REMINDER', node)} icon={<MessageCircle size={16} />} text={t('actions.sendReminder', 'Send Reminder')} color="bg-emerald-600 hover:bg-emerald-500" />;
    }
    if (node.group === 'Inventory' && status === 'Unpaid') {
        return <ButtonBase onClick={() => onAction('REORDER', node)} icon={<ShoppingCart size={16} />} text={t('actions.reorder', 'Reorder Stock')} color="bg-orange-600 hover:bg-orange-500" />;
    }
    if (node.group === 'Case') {
        return <ButtonBase onClick={() => onAction('OPEN_CASE', node)} icon={<Briefcase size={16} />} text={t('actions.viewCase', 'View Case Files')} color="bg-slate-700 hover:bg-slate-600" />;
    }
    
    return <div className="text-center text-xs text-slate-600 italic py-2 border-t border-dashed border-slate-800">{t('actions.none', 'No specific actions available')}</div>;
};

const ButtonBase: React.FC<{ icon: JSX.Element, text: string, color: string, onClick: () => void }> = ({ icon, text, color, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-center gap-3 ${color} text-white py-3 rounded-md transition-all font-semibold text-sm shadow-md hover:shadow-lg active:scale-95`}>
        {icon} {text}
    </button>
);

export default GraphVisualization;