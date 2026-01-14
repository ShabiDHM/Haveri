// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData, GraphNode } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';
import { useTranslation } from 'react-i18next';
import { 
    X, Phone, ShieldAlert, Globe, TrendingDown, Sparkles,
    Briefcase, Package, ShoppingCart, MessageCircle, FileText, CheckCircle, BarChart2
} from 'lucide-react';

// --- Configuration ---
const CARD_WIDTH = 160;
const CARD_HEIGHT = 60;
const BORDER_RADIUS = 6;

// Refined Professional Palette
const THEME = {
  node: {
    client:    { bg: '#172554', border: '#3b82f6', text: '#dbeafe' }, // Blue
    invoice:   { bg: '#064e3b', border: '#10b981', text: '#d1fae5' }, // Emerald
    expense:   { bg: '#450a0a', border: '#ef4444', text: '#fee2e2' }, // Red
    case:      { bg: '#1f2937', border: '#6b7280', text: '#f3f4f6' }, // Gray
    inventory: { bg: '#431407', border: '#f97316', text: '#ffedd5' }, // Orange
    product:   { bg: '#3b0764', border: '#a855f7', text: '#f3e8ff' }, // Purple
    default:   { bg: '#111827', border: '#374151', text: '#e5e7eb' }, // Slate
  }
};

type IntelligenceMode = 'GLOBAL' | 'RISK' | 'COST' | 'OPPORTUNITY';

// --- UI Sub-Components ---
const InspectorClientDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( 
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Lifetime Value</span>
        <span className="text-xl font-bold font-mono text-white">{node.subLabel}</span>
    </div> 
);
const InspectorInvoiceDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( 
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Total Amount</span>
        <span className="text-xl font-bold font-mono text-white">{node.subLabel}</span>
    </div> 
);
const InspectorInventoryDetails: React.FC = () => ( 
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Used In</span>
        <span className="text-white font-medium text-sm">Espresso Macchiato, Cappuccino</span>
    </div> 
);
const DefaultInspectorDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( 
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Status</span>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${['Unpaid', 'Overdue'].includes(node.status || '') ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            <span className="text-white font-medium text-sm">{node.status || 'Active'}</span>
        </div>
    </div> 
);

const EmptyState: React.FC<{ mode: IntelligenceMode }> = ({ mode }) => {
    const content: Record<IntelligenceMode, { icon: JSX.Element; title: string; text: string }> = {
        RISK: { icon: <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />, title: "No Risks Detected", text: "Outstanding invoices and inventory look healthy." },
        COST: { icon: <BarChart2 className="w-12 h-12 text-slate-600 mb-4" />, title: "No Cost Data", text: "Track expenses to visualize cost centers." },
        OPPORTUNITY: { icon: <Sparkles className="w-12 h-12 text-purple-500 mb-4" />, title: "Awaiting Data", text: "More sales data needed to generate opportunities." },
        GLOBAL: { icon: <Globe className="w-12 h-12 text-slate-600 mb-4" />, title: "Topology Empty", text: "Add clients or items to populate the Nexus." }
    };
    const { icon, title, text } = content[mode] || content.GLOBAL;
    return ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-none">
            {icon}
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">{text}</p>
        </div> 
    );
};

const LoadingOverlay: React.FC = () => ( 
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-30">
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <div className="w-10 h-10 border-4 border-slate-700 rounded-full"></div>
                <div className="w-10 h-10 border-4 border-t-purple-500 rounded-full animate-spin absolute inset-0"></div>
            </div>
            <span className="text-purple-300 font-mono text-xs tracking-widest">ANALYZING TOPOLOGY...</span>
        </div>
    </div> 
);

// --- MAIN COMPONENT ---
const GraphVisualization: React.FC = () => {
  const { t } = useTranslation();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('GLOBAL');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fgRef = useRef<ForceGraphMethods>();
  const { width, height, ref: containerRef } = useResizeDetector({ refreshRate: 100 });

  // 1. Data Fetching
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
        } catch (e) { 
            console.error("Nexus Graph Error:", e); 
        } finally { 
            if (isMounted) setIsLoading(false); 
        }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeMode]);

  // 2. Physics Engine Tuning
  useEffect(() => {
    const graph = fgRef.current;
    if (graph) {
        graph.d3Force('charge')?.strength(-2500); 
        graph.d3Force('link')?.distance(250);
        graph.d3Force('center')?.strength(0.05);
        
        if (data.nodes.length > 0) {
            setTimeout(() => { graph.zoomToFit(800, 100); }, 600);
        }
    }
  }, [data]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    fgRef.current?.centerAt(node.x, node.y, 800);
    fgRef.current?.zoom(1.2, 800);
  }, []);

  // 3. Visual Rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const group = node.group || 'Default';
    const styleKey = (group.toLowerCase() in THEME.node) ? group.toLowerCase() : 'default';
    const style = (THEME.node as any)[styleKey];
    
    const x = node.x!;
    const y = node.y!;
    
    // Explicit string conversion/fallback for comparisons
    const status = node.status || '';
    const isRisk = ['Unpaid', 'Overdue'].includes(status);
    const isOpportunity = status === 'Pending' && group === 'Client';
    const isSelected = node.id === selectedNode?.id;

    if (isSelected) {
        ctx.shadowColor = '#60a5fa'; 
        ctx.shadowBlur = 25;
    } else if (isRisk) {
        ctx.shadowColor = '#ef4444'; 
        ctx.shadowBlur = 15;
    } else if (isOpportunity) {
        ctx.shadowColor = '#a855f7'; 
        ctx.shadowBlur = 15;
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
    }

    ctx.fillStyle = style.bg;
    ctx.strokeStyle = isSelected ? '#ffffff' : (isRisk ? '#ef4444' : style.border);
    ctx.lineWidth = isSelected ? 2.5 : (isRisk ? 2 : 1);
    
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    // Text Rendering
    const typeLabel = group.toUpperCase();
    ctx.font = `600 9px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = style.text;
    ctx.globalAlpha = 0.7;
    ctx.fillText(typeLabel, x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 10);

    ctx.globalAlpha = 1;
    ctx.font = `bold 12px "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    let title = node.label || String(node.id);
    if (title.length > 18) title = title.substring(0, 17) + '...';
    ctx.fillText(title, x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 24);

    ctx.font = `400 10px "Inter", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.subLabel || '---', x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 40);

    ctx.beginPath();
    ctx.arc(x + CARD_WIDTH / 2 - 12, y - CARD_HEIGHT / 2 + 12, 3, 0, 2 * Math.PI);
    let statusColor = '#94a3b8'; 
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

  return (
    <div ref={containerRef} className="relative w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900 flex flex-col">
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {isLoading && <LoadingOverlay />}
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
            
            linkLineDash={(link: any) => link.type === 'opportunity' ? [4, 4] : []}
            linkColor={(link: any) => link.type === 'opportunity' ? '#a855f7' : '#334155'}
            linkWidth={1.5}
            
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#64748b'}

            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            
            minZoom={0.2} 
            maxZoom={2.5}
            enableNodeDrag={true} 
        />
      )}

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-full p-1 flex gap-1 shadow-2xl z-10">
          <ModeButton 
             active={activeMode === 'GLOBAL'} 
             onClick={() => setActiveMode('GLOBAL')} 
             icon={<Globe size={14} />} 
             label={t('graph.modeGlobal', 'Global')} 
             color="bg-blue-600" 
          />
          <div className="w-px bg-slate-700 mx-1 my-2 opacity-50"></div>
          <ModeButton 
             active={activeMode === 'RISK'} 
             onClick={() => setActiveMode('RISK')} 
             icon={<ShieldAlert size={14} />} 
             label={t('graph.modeRisk', 'Risk')} 
             color="bg-red-600" 
          />
          <ModeButton 
             active={activeMode === 'COST'} 
             onClick={() => setActiveMode('COST')} 
             icon={<TrendingDown size={14} />} 
             label={t('graph.modeCost', 'Cost')} 
             color="bg-orange-600" 
          />
          <div className="w-px bg-slate-700 mx-1 my-2 opacity-50"></div>
          <ModeButton 
             active={activeMode === 'OPPORTUNITY'} 
             onClick={() => setActiveMode('OPPORTUNITY')} 
             icon={<Sparkles size={14} />} 
             label={t('graph.modeOpportunity', 'Oppty')} 
             color="bg-purple-600" 
          />
      </div>

      {selectedNode && (
        <div className="absolute right-4 top-4 bottom-4 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl p-6 flex flex-col rounded-2xl animate-in slide-in-from-right-10 duration-200 z-20">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {selectedNode.group}
                    </h3>
                    <h2 className="text-xl font-bold text-white leading-tight break-words">
                        {selectedNode.label}
                    </h2>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <X size={18} />
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
            
            <div className="mt-auto pt-6 border-t border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t('general.actions', 'Quick Actions')}</h4>
                <div className="space-y-2">
                    <ActionButton 
                        node={selectedNode} 
                        activeMode={activeMode} 
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// Extracted for cleanliness
const ModeButton: React.FC<{ active: boolean; onClick: () => void; icon: JSX.Element; label: string; color: string }> = ({ active, onClick, icon, label, color }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${active ? `${color} shadow-lg shadow-${color}/20` : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
    >
        {icon} <span>{label}</span>
    </button>
);

const ActionButton: React.FC<{ node: GraphNode, activeMode: IntelligenceMode }> = ({ node, activeMode }) => {
    // FIX: Fallback to empty string if status is undefined to satisfy stricter TS rules
    const status = node.status || '';

    if (node.group === 'Client' && activeMode === 'OPPORTUNITY') {
        return <ButtonBase icon={<FileText size={16} />} text="Draft Sales Email" color="bg-purple-600 hover:bg-purple-500" />;
    }
    if (node.group === 'Client') {
        return <ButtonBase icon={<Phone size={16} />} text="Call Client" color="bg-blue-600 hover:bg-blue-500" />;
    }
    if (node.group === 'Invoice' && ['Unpaid', 'Overdue'].includes(status)) {
        return <ButtonBase icon={<MessageCircle size={16} />} text="Send Reminder" color="bg-emerald-600 hover:bg-emerald-500" />;
    }
    if (node.group === 'Inventory' && status === 'Unpaid') {
        return <ButtonBase icon={<ShoppingCart size={16} />} text="Reorder Stock" color="bg-orange-600 hover:bg-orange-500" />;
    }
    if (node.group === 'Case') {
        return <ButtonBase icon={<Briefcase size={16} />} text="View Case Files" color="bg-slate-700 hover:bg-slate-600" />;
    }
    if (node.group === 'Product') {
        return <ButtonBase icon={<Package size={16} />} text="View Recipe" color="bg-slate-700 hover:bg-slate-600" />;
    }
    return <div className="text-center text-xs text-slate-600 italic py-2">No actions available</div>;
};

const ButtonBase: React.FC<{ icon: JSX.Element, text: string, color: string }> = ({ icon, text, color }) => (
    <button className={`w-full flex items-center justify-center gap-2 ${color} text-white py-2.5 rounded-lg transition-all font-medium text-sm shadow-lg shadow-black/20`}>
        {icon} {text}
    </button>
);

export default GraphVisualization;