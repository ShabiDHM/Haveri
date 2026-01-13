// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, Phone, FileText, AlertTriangle } from 'lucide-react';

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
    default: { bg: '#1f2937', border: '#4b5563', text: '#e5e7eb' },
  }
};

const GraphVisualization: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fgRef = useRef<ForceGraphMethods>();
  const { width, height, ref: containerRef } = useResizeDetector({ refreshRate: 100 });

  // --- 1. Data Loading ---
  useEffect(() => {
    const init = async () => {
      try {
        const rawData = await apiService.getGraphData();
        
        // ENRICHMENT: Injecting mock business data for visualization
        const enrichedNodes = rawData.nodes.map(n => ({ 
            ...n, 
            subLabel: (n as any).group === 'Invoice' ? '€ 1,250.00' : 
                      (n as any).group === 'Client' ? '+383 44 000 000' : 'Pending',
            status: (n as any).group === 'Invoice' ? 'Unpaid' : 'Active',
            val: 1 
        }));

        setData({ nodes: enrichedNodes, links: rawData.links });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- 2. Focus Engine ---
  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(800, 100);
      }, 500);
    }
  }, [data, width, height]);

  // --- 3. Physics Tuning ---
  useEffect(() => {
    if (fgRef.current) {
        fgRef.current.d3Force('charge')?.strength(-100);
        fgRef.current.d3Force('link')?.distance(100);
        fgRef.current.d3Force('center')?.strength(0.2);
    }
  }, [data]);

  // --- 4. The "Business Card" Renderer ---
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const group = node.group || 'Default';
    const styleKey = group.toLowerCase() in THEME.node ? group.toLowerCase() : 'default';
    const style = (THEME.node as any)[styleKey];
    
    const x = node.x!;
    const y = node.y!;
    
    // Draw Card Background
    ctx.fillStyle = style.bg;
    ctx.strokeStyle = node === selectedNode ? '#ffffff' : style.border;
    ctx.lineWidth = node === selectedNode ? 2 : 1;
    
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();

    // Draw "Header" (Group Name)
    ctx.font = `600 10px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = style.text;
    ctx.globalAlpha = 0.8;
    
    // SAFE TYPE CASTING FOR TRANSLATION
    const typeLabel = String(t(`graph.${group.toLowerCase()}`, group));
    ctx.fillText(typeLabel.toUpperCase(), x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 8);

    // Draw "Main Label" (Name/ID)
    ctx.globalAlpha = 1;
    ctx.font = `bold 13px Inter, sans-serif`;
    ctx.fillStyle = '#ffffff';
    let label = node.label || node.id;
    if (label.length > 18) label = label.substring(0, 16) + '...';
    ctx.fillText(label, x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 24);

    // Draw "Sub Label" (Money/Phone)
    ctx.font = `500 11px Inter, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.subLabel || '---', x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 42);

    // Draw Status Indicator (Dot)
    ctx.beginPath();
    ctx.arc(x + CARD_WIDTH / 2 - 15, y - CARD_HEIGHT / 2 + 15, 4, 0, 2 * Math.PI);
    ctx.fillStyle = node.status === 'Unpaid' ? '#ef4444' : '#10b981';
    ctx.fill();

  }, [selectedNode, t]);

  if (isLoading) return <div className="h-[600px] flex items-center justify-center text-slate-500 animate-pulse">{t('graph.loading')}</div>;

  return (
    <div 
        ref={containerRef} 
        className="relative w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        
        // Render
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.fillRect(node.x - CARD_WIDTH / 2, node.y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
        }}

        // Links
        linkColor={() => '#334155'}
        linkWidth={1.5}
        
        // Interaction
        onNodeClick={(node) => {
            setSelectedNode(node);
            fgRef.current?.centerAt(node.x, node.y, 600);
            fgRef.current?.zoom(1.5, 600); 
        }}
        onBackgroundClick={() => setSelectedNode(null)}
      />

      {/* --- Actionable Inspector Panel --- */}
      {selectedNode && (
        <div className="absolute right-4 top-4 bottom-4 w-72 bg-slate-900/95 backdrop-blur border-l border-slate-700 shadow-2xl p-5 flex flex-col rounded-xl animate-in slide-in-from-right-10 duration-200">
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {t(`graph.${selectedNode.group?.toLowerCase()}`, 'Entity')}
                    </h3>
                    <h2 className="text-xl font-bold text-white leading-tight">
                        {selectedNode.label}
                    </h2>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                    <X size={18} />
                </button>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4 mb-8">
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-400 block mb-1">Status</span>
                    <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${selectedNode.status === 'Unpaid' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                         <span className="text-white font-medium">{selectedNode.status || 'Active'}</span>
                    </div>
                </div>

                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-400 block mb-1">Value / Info</span>
                    <span className="text-lg font-mono text-white">{selectedNode.subLabel}</span>
                </div>
            </div>

            {/* Actions - The "Business Value" */}
            <div className="mt-auto space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('general.actions')}</h4>
                
                {selectedNode.group === 'Client' ? (
                    <>
                        <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm">
                            <Phone size={16} /> Call Client
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg transition-colors font-medium text-sm border border-slate-700">
                            <FileText size={16} /> View History
                        </button>
                    </>
                ) : selectedNode.group === 'Invoice' ? (
                    <>
                         <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg transition-colors font-medium text-sm">
                            <ExternalLink size={16} /> Open Invoice
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2.5 rounded-lg transition-colors font-medium text-sm border border-red-900/50">
                            <AlertTriangle size={16} /> Send Reminder
                        </button>
                    </>
                ) : (
                    <button className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors font-medium text-sm">
                        {t('graph.inspect')}
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;