// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';

// --- Nexus Theme Configuration ---
const THEME = {
  bg: '#020617', // Ultra-dark Slate
  dimmedOpacity: 0.1, // How much to fade out irrelevant nodes
  highlightColor: '#F8FAFC',
};

// --- Node Taxonomy & Visuals ---
const NODE_TYPES: { [key: string]: { color: string; glow: string; icon: string } } = {
  'Client':  { color: '#3B82F6', glow: '#60A5FA', icon: '👤' }, // Electric Blue
  'Invoice': { color: '#10B981', glow: '#34D399', icon: '🧾' }, // Neon Emerald
  'Expense': { color: '#F43F5E', glow: '#FB7185', icon: '📉' }, // Hot Rose
  'Default': { color: '#94A3B8', glow: '#CBD5E1', icon: '📦' }, // Cool Gray
};

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoverNode, setHoverNode] = useState<NodeObject | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fgRef = useRef<ForceGraphMethods>();
  const { width, height, ref: containerRef } = useResizeDetector({ refreshRate: 100 });

  // --- 1. Smart Data Loading ---
  useEffect(() => {
    const init = async () => {
      try {
        const rawData = await apiService.getGraphData();
        // Add random scatter to prevent initial layout explosion
        const nodes = rawData.nodes.map(n => ({ 
            ...n, 
            x: Math.random() * 50, 
            y: Math.random() * 50 
        }));
        setData({ nodes, links: rawData.links });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- 2. Physics Tuning ---
  useEffect(() => {
    if (fgRef.current) {
        // Strong repulsion to create space, but gentle center gravity
        // We safely access d3Force internal methods without external d3 types
        fgRef.current.d3Force('charge')?.strength(-300);
        fgRef.current.d3Force('link')?.distance(70);
        fgRef.current.d3Force('center')?.strength(0.08);
    }
  }, [data]);

  // --- 3. The "Focus Mode" Engine (Type-Safe) ---
  
  // Helper to safely get ID from a link source/target which might be an object or string
  const getLinkId = (item: string | number | NodeObject | undefined): string | number | undefined => {
    if (!item) return undefined;
    if (typeof item === 'object') return (item as any).id;
    return item as string | number;
  };

  const highlightLinks = useMemo(() => {
    const links = new Set();
    if (hoverNode) {
      data.links.forEach(link => {
        const sourceId = getLinkId(link.source);
        const targetId = getLinkId(link.target);
        if (sourceId === hoverNode.id || targetId === hoverNode.id) {
          links.add(link);
        }
      });
    }
    return links;
  }, [hoverNode, data.links]);

  const highlightNodes = useMemo(() => {
    const nodes = new Set();
    if (hoverNode) {
      nodes.add(hoverNode.id);
      data.links.forEach(link => {
        const sourceId = getLinkId(link.source);
        const targetId = getLinkId(link.target);
        
        if (sourceId === hoverNode.id && targetId) nodes.add(targetId);
        if (targetId === hoverNode.id && sourceId) nodes.add(sourceId);
      });
    }
    return nodes;
  }, [hoverNode, data.links]);

  // --- 4. High-Fidelity Canvas Renderer ---
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = node === hoverNode;
    const isSelected = node === selectedNode;
    const isNeighbor = highlightNodes.has(node.id);
    const isDimmed = hoverNode && !isHovered && !isNeighbor;

    // Taxonomy Styles
    const type = (node as any).group || 'Default';
    const style = NODE_TYPES[type] || NODE_TYPES['Default'];

    const x = node.x!;
    const y = node.y!;
    const radius = 14; 
    
    // --- LAYER 1: Visibility Check ---
    ctx.globalAlpha = isDimmed ? THEME.dimmedOpacity : 1;

    // --- LAYER 2: Selection Orbital (If Selected) ---
    if (isSelected) {
        const time = Date.now() / 1000;
        ctx.beginPath();
        ctx.strokeStyle = style.glow;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.arc(x, y, radius + 8, time % (Math.PI*2), (time % (Math.PI*2)) + Math.PI);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    }

    // --- LAYER 3: The "Glass" Body ---
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F172A'; // Dark Core
    ctx.fill();
    
    // Gradient Glow (Inner)
    const grad = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, isHovered ? style.glow : style.color);
    ctx.fillStyle = grad;
    ctx.globalAlpha = isDimmed ? 0.1 : 0.4; // Glassy transparency
    ctx.fill();
    ctx.globalAlpha = isDimmed ? THEME.dimmedOpacity : 1; // Restore alpha

    // Border
    ctx.strokeStyle = isHovered ? '#FFFFFF' : style.color;
    ctx.lineWidth = isHovered ? 2 : 1.5;
    ctx.stroke();

    // --- LAYER 4: Iconography ---
    ctx.font = `${14}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDimmed ? '#475569' : '#F8FAFC';
    ctx.fillText(style.icon, x, y + 1);

    // --- LAYER 5: Smart Labels (Adaptive) ---
    // Show labels if: Node is hovered OR selected OR zoom is high OR it's a neighbor of hovered
    const shouldShowLabel = globalScale > 1.2 || isHovered || isSelected || (isNeighbor && globalScale > 0.8);
    
    if (shouldShowLabel) {
      const label = (node as any).label || node.id;
      const fontSize = 10;
      const labelDist = radius + 10;
      
      ctx.font = `600 ${fontSize}px Inter, system-ui`;
      const textWidth = ctx.measureText(label as string).width;
      
      // Label Background (Pill)
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(x - textWidth/2 - 4, y + labelDist - 4, textWidth + 8, fontSize + 8, 4);
      ctx.fill();
      
      // Label Text
      ctx.fillStyle = isHovered ? style.glow : '#94A3B8';
      ctx.fillText(label as string, x, y + labelDist + fontSize/2 - 1);
    }
  }, [hoverNode, selectedNode, highlightNodes]);

  // --- Render ---
  if (isLoading) return <div className="h-[600px] w-full bg-slate-950 flex items-center justify-center text-blue-500 animate-pulse">INITIALIZING NEXUS...</div>;

  return (
    <div 
        ref={containerRef} 
        className="relative w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900"
    >
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        
        // Interaction Settings
        onNodeHover={(node) => {
            setHoverNode(node || null);
            // Change cursor
            if (containerRef.current) {
                containerRef.current.style.cursor = node ? 'pointer' : 'default';
            }
        }}
        onNodeClick={(node) => {
            setSelectedNode(node);
            fgRef.current?.centerAt(node.x, node.y, 800);
            fgRef.current?.zoom(3, 800);
        }}
        onBackgroundClick={() => {
            setSelectedNode(null);
            fgRef.current?.zoomToFit(800, 50);
        }}

        // Custom Renderer
        nodeCanvasObject={nodeCanvasObject}
        
        // Link Styling
        linkColor={(link) => highlightLinks.has(link) ? '#F8FAFC' : '#334155'}
        linkWidth={(link) => highlightLinks.has(link) ? 2 : 1}
        linkDirectionalParticles={(link) => highlightLinks.has(link) ? 4 : 0} // Only show flow on highlighted paths
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.008}
        
        // Engine Config
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
      />

      {/* Control Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
         {/* Simple Legend */}
         <div className="bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-800 shadow-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">System Entities</span>
            {Object.entries(NODE_TYPES).map(([type, style]) => (
                 type !== 'Default' && (
                    <div key={type} className="flex items-center gap-2 mb-1 last:mb-0">
                        <span style={{ color: style.color }}>{style.icon}</span>
                        <span className="text-xs text-slate-400 font-medium">{type}</span>
                    </div>
                 )
            ))}
         </div>
      </div>
      
      {/* Context info if selected */}
      {selectedNode && (
          <div className="absolute top-6 left-6 bg-slate-900/95 backdrop-blur border-l-4 border-blue-500 p-4 rounded-r-lg shadow-2xl max-w-xs animate-in slide-in-from-left-4 fade-in duration-300">
              <h3 className="text-sm font-bold text-slate-200">{(selectedNode as any).group} Details</h3>
              <div className="text-2xl font-bold text-white mt-1 mb-1">{(selectedNode as any).label}</div>
              <p className="text-xs text-slate-400">ID: {selectedNode.id}</p>
              <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors">Inspect</button>
                  <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors">Trace</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default GraphVisualization;