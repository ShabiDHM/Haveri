// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';

// --- Enterprise Theme Constants ---
const THEME = {
  background: '#020617', // Slate 950 (Deep dark)
  grid: 'rgba(56, 189, 248, 0.05)', // Subtle Cyan grid
  text: { primary: '#F1F5F9', secondary: '#94A3B8' }
};

// --- Professional Icon & Color Mapping ---
const NODE_CONFIG: { [key: string]: { color: string; icon: string; labelColor: string } } = {
  'Client':  { color: '#3B82F6', icon: '👤', labelColor: '#60A5FA' }, // Blue
  'Invoice': { color: '#10B981', icon: '📄', labelColor: '#34D399' }, // Emerald
  'Expense': { color: '#EF4444', icon: '💸', labelColor: '#F87171' }, // Red
  'Default': { color: '#64748B', icon: '📦', labelColor: '#94A3B8' }, // Slate
};

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();
  
  // Responsive sizing
  const { width, height, ref: containerRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
  });

  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setIsLoading(true);
        const graphData = await apiService.getGraphData();
        
        // --- Data Enrichment ---
        const enrichedNodes = graphData.nodes.map(n => ({
            ...n,
            x: Math.random() * 100, 
            y: Math.random() * 100,
            val: 1 
        }));

        setData({ nodes: enrichedNodes, links: graphData.links });
      } catch (error) {
        console.error("Graph load failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGraphData();
  }, []);

  // --- Physics Engine Tuning ---
  useEffect(() => {
    if (fgRef.current) {
      // Access the internal d3 force engine to apply custom settings
      // Increase repulsion (negative strength) to prevent bunching
      fgRef.current.d3Force('charge')?.strength(-200); 
      // Add a centering force that isn't too aggressive
      fgRef.current.d3Force('center')?.strength(0.05);
    }
  }, [data]); // Re-apply when data loads

  // --- The Renderer ---
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const group = (node as any).group || 'Default';
    const config = NODE_CONFIG[group] || NODE_CONFIG['Default'];
    const label = String((node as any).label || 'Unknown');
    
    const radius = 12;
    const x = node.x!;
    const y = node.y!;
    
    // 1. Outer Glow (Halo)
    const glowRadius = radius + (2 * Math.sin(Date.now() / 600)); 
    const gradient = ctx.createRadialGradient(x, y, radius, x, y, glowRadius + 5);
    gradient.addColorStop(0, config.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius + 5, 0, 2 * Math.PI, false);
    ctx.fill();

    // 2. Main Circle Body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#0F172A'; 
    ctx.fill();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Icon (Centered)
    const fontSize = 14;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(config.icon, x, y + 1); 

    // 4. Text Label (Below the node)
    if (globalScale > 0.8) {
        const labelDist = radius + 8;
        const labelSize = 4;
        ctx.font = `600 ${labelSize}px Inter, system-ui, sans-serif`;
        
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.roundRect(x - textWidth/2 - 2, y + labelDist - 3, textWidth + 4, labelSize + 4, 2);
        ctx.fill();

        ctx.fillStyle = config.labelColor;
        ctx.fillText(label, x, y + labelDist + (labelSize/2));
    }
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col justify-center items-center bg-slate-950 border border-slate-900 rounded-xl">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        <span className="text-blue-400 font-mono text-sm tracking-wider animate-pulse">ANALYZING NETWORK TOPOLOGY...</span>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full h-96 flex flex-col justify-center items-center bg-slate-950 border border-slate-900 rounded-xl text-slate-500">
        <div className="text-4xl mb-4 grayscale opacity-30">🕸️</div>
        <p className="font-medium">No Data Nodes Found</p>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef} 
        className="w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900 relative group"
    >
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: `linear-gradient(${THEME.grid} 1px, transparent 1px), linear-gradient(90deg, ${THEME.grid} 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
        </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height || 600}
        
        // --- Physics Engine Configuration ---
        d3AlphaDecay={0.01} 
        d3VelocityDecay={0.4} 
        warmupTicks={50} 
        
        // --- Visuals ---
        backgroundColor="rgba(0,0,0,0)"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, 15, 0, 2 * Math.PI, false);
            ctx.fill();
        }}
        
        // --- Links & Particles ---
        linkColor={() => '#334155'}
        linkWidth={1.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkCurvature={0.2}

        // --- Interaction ---
        onNodeClick={(node) => {
            fgRef.current?.centerAt(node.x, node.y, 1000);
            fgRef.current?.zoom(4, 1000);
        }}
        onBackgroundClick={() => {
            fgRef.current?.zoomToFit(1000, 50);
        }}
      />
      
      {/* HUD / Legend Overlay */}
      <div className="absolute top-4 left-4 flex gap-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">NODES:</span>
            <span className="text-sm text-white font-bold">{data.nodes.length}</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">LINKS:</span>
            <span className="text-sm text-white font-bold">{data.links.length}</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-slate-800 shadow-xl">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Legend</h4>
        <div className="space-y-2">
            {Object.entries(NODE_CONFIG).map(([key, config]) => {
                if (key === 'Default') return null;
                return (
                    <div key={key} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs border" 
                             style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderColor: config.color, color: config.labelColor }}>
                            {config.icon}
                        </div>
                        <span className="text-xs text-slate-300 font-medium">{key}s</span>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;