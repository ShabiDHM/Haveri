// FILE: frontend/src/components/GraphVisualization.tsx

import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { apiService } from '../services/api'; // Use the central apiService
import { GraphData } from '../data/types'; // Use the central types file

const GraphVisualization: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();

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
    // Zoom to fit all nodes after data loads
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 100);
    }
  }, [data]);

  if (isLoading) {
    return <div className="text-center p-8 text-gray-400">Duke ngarkuar Inteligjencën Ndërlidhëse...</div>;
  }

  if (data.nodes.length === 0) {
    return <div className="text-center p-8 text-gray-400">Nuk ka të dhëna për të ndërtuar grafikun. Krijoni disa fatura për të filluar.</div>;
  }

  return (
    <div className="bg-gray-800/20 border border-gray-700 rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeLabel="label"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.1}
        width={800} // This can be made responsive later
        height={600}
        nodeCanvasObject={(node, ctx, globalScale) => {
            const label = (node as any).label;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(label, node.x!, node.y! + 10);
        }}
      />
    </div>
  );
};

export default GraphVisualization;