// FILE: frontend/src/components/GraphVisualization.tsx
// PHOENIX PROTOCOL - GRAPH VISUALIZATION V7.0 (DEFINITIVE)
// 1. ARCHITECTURE: Reverted to Server-Side Filtering. The frontend now correctly calls the API for each mode.
// 2. CRITICAL FIX: Restored node click functionality by stabilizing the data flow.
// 3. PHYSICS: Deployed stronger repulsion forces to de-clutter the dense graph.
// 4. I18N: Fully translated the Tactical Control Bar.

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
const BORDER_RADIUS = 8;

const THEME = {
  bg: '#020617',
  node: {
    client: { bg: '#1e3a8a', border: '#3b82f6', text: '#bfdbfe' },
    invoice: { bg: '#064e3b', border: '#10b981', text: '#a7f3d0' },
    expense: { bg: '#7f1d1d', border: '#ef4444', text: '#fecaca' },
    case:    { bg: '#374151', border: '#6b7280', text: '#e5e7eb' },
    inventory: { bg: '#7c2d12', border: '#f97316', text: '#fdba74' },
    product:   { bg: '#581c87', border: '#a855f7', text: '#e9d5ff' },
    default: { bg: '#1f2937', border: '#4b5563', text: '#e5e7eb' },
  }
};

type IntelligenceMode = 'GLOBAL' | 'RISK' | 'COST' | 'OPPORTUNITY';

// --- UI Sub-Components ---
const InspectorClientDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( <div className="p-3 bg-slate-800 rounded-lg border border-slate-700"><span className="text-xs text-slate-400 block mb-1">Lifetime Value</span><span className="text-xl font-bold font-mono text-white">{node.subLabel}</span></div> );
const InspectorInvoiceDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( <div className="p-3 bg-slate-800 rounded-lg border border-slate-700"><span className="text-xs text-slate-400 block mb-1">Total Amount</span><span className="text-xl font-bold font-mono text-white">{node.subLabel}</span></div> );
const InspectorInventoryDetails: React.FC = () => ( <div className="p-3 bg-slate-800 rounded-lg border border-slate-700"><span className="text-xs text-slate-400 block mb-1">Used In</span><span className="text-white font-medium">Espresso Macchiato, Cappuccino</span></div> );
const DefaultInspectorDetails: React.FC<{ node: GraphNode }> = ({ node }) => ( <div className="p-3 bg-slate-800 rounded-lg border border-slate-700"><span className="text-xs text-slate-400 block mb-1">Status</span><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${node.status === 'Unpaid' || node.status === 'Overdue' ? 'bg-red-500' : 'bg-emerald-500'}`}></span><span className="text-white font-medium">{node.status || 'Active'}</span></div></div> );

const EmptyState: React.FC<{ mode: IntelligenceMode | 'DEFAULT' }> = ({ mode }) => {
    const content = {
        RISK: { icon: <CheckCircle className="w-16 h-16 text-emerald-500" />, title: "No Financial Risks Detected", text: "All overdue invoices and low-stock items are clear." },
        COST: { icon: <BarChart2 className="w-16 h-16 text-slate-500" />, title: "No Cost Data Available", text: "Create expenses to trace your company's spending." },
        OPPORTUNITY: { icon: <BarChart2 className="w-16 h-16 text-slate-500" />, title: "Not Enough Sales Data", text: "Create more invoices to allow the AI to find hidden opportunities." },
        DEFAULT: { icon: <BarChart2 className="w-16 h-16 text-slate-500" />, title: "No Data to Display", text: "Start by creating clients, invoices, or inventory items." },
        GLOBAL: { icon: <BarChart2 className="w-16 h-16 text-slate-500" />, title: "No Data to Display", text: "Start by creating clients, invoices, or inventory items." }
    };
    const { icon, title, text } = content[mode] || content.DEFAULT;
    return ( <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20"><div className="mb-4">{icon}</div><h3 className="text-lg font-bold text-white">{title}</h3><p className="text-slate-400 max-w-xs">{text}</p></div> );
};

const LoadingOverlay: React.FC = () => ( <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-30"><div className="flex flex-col items-center gap-2"><Sparkles className="w-8 h-8 text-purple-400 animate-pulse" /><span className="text-purple-300 font-mono text-sm">ANALYZING...</span></div></div> );

// --- MAIN COMPONENT ---
const GraphVisualization: React.FC = () => {
  const { t } = useTranslation();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('GLOBAL');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fgRef = useRef<ForceGraphMethods>();
  const { width, height, ref: containerRef } = useResizeDetector({ refreshRate: 100 });

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const mode = activeMode.toLowerCase();
            const rawData = await apiService.getGraphData(mode);
            setData({ nodes: rawData.nodes as GraphNode[], links: rawData.links });
        } catch (e) { console.error("Graph Intelligence Error:", e); } 
        finally { setIsLoading(false); }
    };
    loadData();
  }, [activeMode]);

  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      setTimeout(() => { fgRef.current?.zoomToFit(800, 150); }, 500);
    }
  }, [data]);

  useEffect(() => {
    if (fgRef.current) {
        fgRef.current.d3Force('charge')?.strength(-300);
        fgRef.current.d3Force('link')?.distance(180);
        fgRef.current.d3Force('center')?.strength(0.2);
    }
  }, [data]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const group = node.group || 'Default';
    const styleKey = group.toLowerCase() in THEME.node ? group.toLowerCase() : 'default';
    const style = (THEME.node as any)[styleKey];
    const x = node.x!, y = node.y!;
    const isRisk = node.status === 'Unpaid' || node.status === 'Overdue';
    const isOpportunity = node.status === 'Pending' && group === 'Client';
    
    if (isRisk) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = Math.abs(Math.sin(Date.now() / 500)) * 15;
    } else if (isOpportunity) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = Math.abs(Math.sin(Date.now() / 500)) * 15;
    } else if (node === selectedNode) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 20;
    } else { ctx.shadowBlur = 0; }

    ctx.fillStyle = style.bg;
    ctx.strokeStyle = node === selectedNode ? '#ffffff' : (isRisk ? '#ef4444' : style.border);
    ctx.lineWidth = (node === selectedNode || isRisk || isOpportunity) ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    
    const typeLabel = String(t(`graph.${group.toLowerCase()}`, group));
    ctx.font = `600 10px Inter, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = style.text;
    ctx.globalAlpha = 0.8;
    ctx.fillText(typeLabel.toUpperCase(), x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 8);

    ctx.globalAlpha = 1; ctx.font = `bold 13px Inter, sans-serif`; ctx.fillStyle = '#ffffff';
    ctx.fillText(node.label || String(node.id), x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 24);

    ctx.font = `500 11px Inter, sans-serif`; ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.subLabel || '---', x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 42);

    ctx.beginPath(); ctx.arc(x + CARD_WIDTH / 2 - 15, y - CARD_HEIGHT / 2 + 15, 4, 0, 2 * Math.PI);
    let statusColor = '#94a3b8';
    if (isRisk) statusColor = '#ef4444';
    else if (node.status === 'Active' || node.status === 'Paid') statusColor = '#10b981';
    else if (node.status === 'Pending') statusColor = '#60a5fa';
    ctx.fillStyle = statusColor; ctx.fill();
  }, [selectedNode, t]);

  return (
    <div ref={containerRef} className="relative w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      {isLoading && <LoadingOverlay />}
      {!isLoading && data.nodes.length === 0 && <EmptyState mode={activeMode} />}
      <ForceGraph2D
        ref={fgRef}
        graphData={data} 
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeCanvasObject={nodeCanvasObject}
        linkLineDash={(link: any) => link.type === 'opportunity' ? [4, 4] : []}
        linkColor={(link: any) => link.type === 'opportunity' ? '#60a5fa' : (link.value === 0 ? '#ef4444' : '#334155')}
        linkWidth={(link: any) => link.type === 'opportunity' ? 2 : (link.value === 0 ? 2 : 1.5)}
        linkDirectionalParticles={ (link: any) => link.value === 0 ? 4 : (link.type === 'opportunity' ? 0 : 1) }
        linkDirectionalParticleSpeed={(link: any) => link.value === 0 ? 0.01 : 0.005}
        linkDirectionalParticleWidth={(link: any) => link.value === 0 ? 3 : 2}
        linkDirectionalParticleColor={(link: any) => link.value === 0 ? '#ef4444' : '#94a3b8'}
        onNodeClick={(node) => setSelectedNode(node as unknown as GraphNode)}
        onBackgroundClick={() => setSelectedNode(null)}
        minZoom={0.3} maxZoom={4}
      />
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full p-1.5 flex gap-1 shadow-2xl z-10">
          <button onClick={() => setActiveMode('GLOBAL')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMode === 'GLOBAL' ? 'bg-blue-600' : 'hover:bg-slate-800'} text-white`}><Globe size={14} /> {t('graph.modeGlobal')}</button>
          <div className="w-px bg-slate-700 mx-1 my-2"></div>
          <button onClick={() => setActiveMode('RISK')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMode === 'RISK' ? 'bg-red-600' : 'hover:bg-slate-800'} text-white`}><ShieldAlert size={14} /> {t('graph.modeRisk')}</button>
          <button onClick={() => setActiveMode('COST')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMode === 'COST' ? 'bg-orange-600' : 'hover:bg-slate-800'} text-white`}><TrendingDown size={14} /> {t('graph.modeCost')}</button>
          <div className="w-px bg-slate-700 mx-1 my-2"></div>
          <button onClick={() => setActiveMode('OPPORTUNITY')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMode === 'OPPORTUNITY' ? 'bg-purple-600' : 'hover:bg-slate-800'} text-white`}><Sparkles size={14} /> {t('graph.modeOpportunity')}</button>
      </div>
      {selectedNode && (
        <div className="absolute right-4 top-4 bottom-4 w-72 bg-slate-900/95 backdrop-blur border-l border-slate-700 shadow-2xl p-5 flex flex-col rounded-xl animate-in slide-in-from-right-10 duration-200">
            <div className="flex justify-between items-start mb-6">
                <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t(`graph.${selectedNode.group?.toLowerCase()}`, 'Entity')}</h3><h2 className="text-xl font-bold text-white leading-tight">{selectedNode.label}</h2></div>
                <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400"><X size={18} /></button>
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
            <div className="mt-auto space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('general.actions')}</h4>
                {selectedNode.group === 'Client' && activeMode === 'OPPORTUNITY' && ( <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><FileText size={16} /> Draft Sales Email</button> )}
                {selectedNode.group === 'Client' && activeMode !== 'OPPORTUNITY' && ( <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><Phone size={16} /> Call Client</button> )}
                {(selectedNode.group === 'Invoice' && (selectedNode.status === 'Unpaid' || selectedNode.status === 'Overdue')) && ( <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><MessageCircle size={16} /> Send WhatsApp Reminder</button> )}
                {(selectedNode.group === 'Inventory' && (selectedNode.status === 'Unpaid')) && ( <button className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><ShoppingCart size={16} /> Reorder Stock</button> )}
                {selectedNode.group === 'Case' && ( <button className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><Briefcase size={16} /> Open Case</button> )}
                {selectedNode.group === 'Product' && ( <button className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors font-medium text-sm"><Package size={16} /> View Recipe</button> )}
            </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;