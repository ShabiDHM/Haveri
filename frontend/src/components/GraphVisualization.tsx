// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';

// --- Professional Color Palette & Styling Constants ---
const THEME = {
  background: '#0f172a', // Slate 900
  grid: 'rgba(255, 255, 255, 0.05)',
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8'
  }
};

const GROUP_STYLES: { [key: string]: { bg: string; border: string; glow: string } } = {
  'Client':  { bg: '#1E3A8A', border: '#60A5FA', glow: 'rgba(96, 165, 250, 0.4)' }, // Blue
  'Invoice': { bg: '#064E3B', border: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' }, // Emerald
  'Expense': { bg: '#7F1D1D', border: '#F87171', glow: 'rgba(248, 113, 113, 0.4)' }, // Red
  'Default': { bg: '#374151', border: '#9CA3AF', glow: 'rgba(156, 163, 175, 0.4)' }, // Gray
};

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();
  
  // Detect both width and height to fill the parent container perfectly
  const { width, height, ref: containerRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
  });

  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setIsLoading(true);
        const graphData = await apiService.getGraphData();
        // Add minimal initial jitter to prevent 0,0 stacking
        const processedData = {
            ...graphData,
            nodes: graphData.nodes.map(n => ({ ...n, x: Math.random(), y: Math.random() }))
        };
        setData(processedData);
      } catch (error) {
        console.error("Graph load failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGraphData();
  }, []);

  // Helper to draw rounded rectangles compatibly
  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = String((node as any).label || 'Unknown');
    const group = (node as any).group || 'Default';
    const styles = GROUP_STYLES[group] || GROUP_STYLES['Default'];
    
    // Determine visibility based on zoom level to declutter
    const isFocused = globalScale >= 1.5; 
    
    // Font sizing
    const fontSize = 14 / globalScale;
    ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui`;
    
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const paddingX = 16 / globalScale;
    const paddingY = 10 / globalScale;
    
    const nodeWidth = textWidth + (paddingX * 2);
    const nodeHeight = fontSize + (paddingY * 2);
    const r = 4 / globalScale; // Corner radius

    const x = node.x! - nodeWidth / 2;
    const y = node.y! - nodeHeight / 2;

    // 1. Draw Glow/Shadow
    if (isFocused) {
        ctx.shadowColor = styles.glow;
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowBlur = 0;
    }

    // 2. Draw Background
    ctx.fillStyle = styles.bg;
    drawRoundRect(ctx, x, y, nodeWidth, nodeHeight, r);
    ctx.fill();

    // 3. Draw Border
    ctx.shadowBlur = 0; // Reset shadow for border
    ctx.strokeStyle = styles.border;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    // 4. Draw Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = THEME.text.primary;
    ctx.fillText(label, node.x!, node.y!);

  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col justify-center items-center bg-slate-900 rounded-lg border border-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <span className="text-slate-400 font-medium">Duke inicializuar rrjetin neuronal...</span>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full h-96 flex flex-col justify-center items-center bg-slate-900 rounded-lg border border-slate-800 text-slate-400">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p>Nuk u gjetën të dhëna për vizualizim.</p>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full min-h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height || 600}
        
        // --- Physics Engine Configuration ---
        // High negative charge to separate nodes, weak gravity to keep them centered
        d3AlphaDecay={0.02} // Slower decay = more time to settle
        d3VelocityDecay={0.3} // Friction
        cooldownTicks={100} // Pre-calculate 100 frames before first render
        onEngineStop={() => {
            // Only zoom to fit once the physics have settled
            fgRef.current?.zoomToFit(400, 50);
        }}

        // --- Rendering ---
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
            const size = 20; // Hitbox size
            ctx.fillStyle = color;
            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
        }}
        
        // --- Links ---
        linkColor={() => '#475569'}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        
        // --- Interaction ---
        backgroundColor="rgba(0,0,0,0)" // Transparent to show CSS grid
        onNodeClick={(node) => {
            fgRef.current?.centerAt(node.x, node.y, 800);
            fgRef.current?.zoom(3, 800);
        }}
        onBackgroundClick={() => {
            fgRef.current?.zoomToFit(800, 50);
        }}
      />
      
      {/* Overlay Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-slate-300">Klientë</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Fatura</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-slate-300">Shpenzime</span>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;