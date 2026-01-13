// FILE: frontend/src/components/GraphVisualization.tsx
// PHOENIX PROTOCOL - GRAPH VISUALIZATION V2.1 (PROFESSIONAL RENDERER)
// 1. FIX: Implemented a professional custom node renderer with styled boxes and clean text.
// 2. UX: Added automatic resizing, better zooming, and click-to-center functionality.
// 3. ROBUSTNESS: Improved label handling to prevent ugly text rendering.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';

// --- Professional Color Palette for Node Groups ---
const GROUP_COLORS: { [key: string]: { bg: string; border: string; text: string } } = {
  'Client':  { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', text: '#BFDBFE' },
  'Invoice': { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#A7F3D0' },
  'Expense': { bg: 'rgba(239, 68, 68, 0.2)',  border: '#EF4444', text: '#FECACA' },
  'Default': { bg: 'rgba(107, 114, 128, 0.2)', border: '#6B7280', text: '#D1D5DB' },
};

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();
  
  // --- Dynamic Resizing ---
  const { width, ref: containerRef } = useResizeDetector();
  const height = 600; // Fixed height, dynamic width for responsiveness

  useEffect(() => {
    const loadGraphData = async () => {
      setIsLoading(true);
      const graphData = await apiService.getGraphData();
      setData(graphData);
      setIsLoading(false);
    };
    loadGraphData();
  }, []);

  useEffect(() => {
    // Zoom to fit all nodes after data is loaded
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 100);
    }
  }, [data]);

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = String((node as any).label || '');
    const group = (node as any).group || 'Default';
    const colors = GROUP_COLORS[group] || GROUP_COLORS['Default'];

    // --- Dynamic node size based on text length ---
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const nodeWidth = textWidth + 24; // Horizontal padding
    const nodeHeight = 28; // Vertical padding

    // --- Draw the node body (a rounded rectangle) ---
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2 / globalScale;
    
    ctx.beginPath();
    ctx.roundRect(node.x! - nodeWidth / 2, node.y! - nodeHeight / 2, nodeWidth, nodeHeight, 8);
    ctx.fill();
    ctx.stroke();
    
    // --- Draw the text label ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    ctx.fillText(label, node.x!, node.y!);

  }, []);


  if (isLoading) {
    return <div className="flex justify-center items-center text-gray-400" style={{ height }}>Duke ngarkuar Inteligjencën Ndërlidhëse...</div>;
  }

  if (!data || data.nodes.length === 0) {
    return <div className="flex justify-center items-center text-gray-400" style={{ height }}>Nuk ka të dhëna për të ndërtuar grafikun. Krijoni disa fatura për të filluar.</div>;
  }

  return (
    <div ref={containerRef} className="graph-container w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        // Use our professional custom renderer
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
          // Makes the clickable area larger for better UX
          const label = String((node as any).label || '');
          const textWidth = ctx.measureText(label).width;
          const nodeWidth = textWidth + 24;
          const nodeHeight = 28;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(node.x! - nodeWidth / 2, node.y! - nodeHeight / 2, nodeWidth, nodeHeight, 8);
          ctx.fill();
        }}
        
        // Link styling
        linkColor={() => 'rgba(107, 114, 128, 0.4)'}
        linkWidth={1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.1}

        // Interaction
        onNodeClick={(node) => {
            fgRef.current?.centerAt(node.x, node.y, 1000);
            fgRef.current?.zoom(2.5, 1000);
        }}
      />
    </div>
  );
};

export default GraphVisualization;