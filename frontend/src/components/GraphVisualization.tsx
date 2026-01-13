// FILE: frontend/src/components/GraphVisualization.tsx
// PHOENIX PROTOCOL - GRAPH VISUALIZATION V2.0 (PROFESSIONAL RENDERER)
// 1. FEATURE: Implemented a professional custom node renderer.
// 2. STYLE: Nodes are now drawn with colored backgrounds, borders, and centered text.
// 3. UX: Added automatic resizing to fit the container and improved interactivity.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';

// --- COLOR PALETTE FOR NODE GROUPS ---
const GROUP_COLORS: { [key: string]: { bg: string; border: string } } = {
  'Client': { bg: 'rgba(59, 130, 246, 0.6)', border: '#3B82F6' },
  'Invoice': { bg: 'rgba(16, 185, 129, 0.6)', border: '#10B981' },
  'Expense': { bg: 'rgba(239, 68, 68, 0.6)', border: '#EF4444' },
  'Default': { bg: 'rgba(107, 114, 128, 0.6)', border: '#6B7280' },
};

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();
  
  // --- DYNAMIC RESIZING ---
  const { width, ref: containerRef } = useResizeDetector();
  const height = 600; // Fixed height, dynamic width

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
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 150);
    }
  }, [data]);

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = (node as any).label || '';
    const group = (node as any).group || 'Default';
    const colors = GROUP_COLORS[group] || GROUP_COLORS['Default'];

    // --- Calculate text width for dynamic node size ---
    const textWidth = ctx.measureText(label).width;
    const nodeWidth = textWidth + 20; // Add padding

    // --- Draw the node background ---
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(node.x! - nodeWidth / 2, node.y! - 12, nodeWidth, 24, 8);
    ctx.fill();

    // --- Draw the node border ---
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1 / globalScale;
    ctx.beginPath();
    ctx.roundRect(node.x! - nodeWidth / 2, node.y! - 12, nodeWidth, 24, 8);
    ctx.stroke();
    
    // --- Draw the text label ---
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(label, node.x!, node.y!);

  }, []);


  if (isLoading) {
    return <div className="flex justify-center items-center" style={{ height }}>Duke ngarkuar Inteligjencën Ndërlidhëse...</div>;
  }

  if (data.nodes.length === 0) {
    return <div className="flex justify-center items-center" style={{ height }}>Nuk ka të dhëna për të ndërtuar grafikun. Krijoni disa fatura për të filluar.</div>;
  }

  return (
    <div ref={containerRef} className="graph-container">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        // Use the custom renderer
        nodeCanvasObject={nodeCanvasObject}
        // Disable default node drawing
        nodeVal={() => 0} 
        
        // Link styling
        linkColor={() => 'rgba(255,255,255,0.2)'}
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