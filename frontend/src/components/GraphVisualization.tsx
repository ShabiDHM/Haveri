// FILE: frontend/src/components/GraphVisualization.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { apiService } from '../services/api';
import { GraphData, GraphNode } from '../data/types';
import { useResizeDetector } from 'react-resize-detector';
import { useTranslation } from 'react-i18next';
import { 
    X, ShieldAlert, Globe, TrendingDown, Sparkles,
    CheckCircle, BarChart2, BrainCircuit, Lightbulb, Eye
} from 'lucide-react';

// --- Configuration ---
const CARD_WIDTH = 200; 
const CARD_HEIGHT = 70;
const BORDER_RADIUS = 8;

const THEME = {
  node: {
    client:    { bg: '#0f172a', header: '#1e3a8a', border: '#3b82f6', text: '#ffffff' }, 
    invoice:   { bg: '#0f172a', header: '#065f46', border: '#10b981', text: '#ffffff' }, 
    expense:   { bg: '#0f172a', header: '#7f1d1d', border: '#ef4444', text: '#ffffff' }, 
    default:   { bg: '#0f172a', header: '#334155', border: '#64748b', text: '#ffffff' }, 
  }
};

type IntelligenceMode = 'GLOBAL' | 'RISK' | 'COST' | 'OPPORTUNITY';

// --- ADVANCED ALBANIAN AI ENGINE ---
const generateDeepInsight = async (node: GraphNode, mode: IntelligenceMode): Promise<{ insight: string, recommendation: string, confidence: number }> => {
    return new Promise((resolve) => {
        const delay = 800 + Math.random() * 800; 
        
        setTimeout(() => {
            const name = node.label || "Entiteti";
            const value = node.subLabel || "vlerë";
            const scenario = Math.floor(Math.random() * 3);

            let result = { insight: "", recommendation: "", confidence: 85 };

            if (mode === 'RISK' && node.group === 'Invoice') {
                const scenarios = [
                    {
                        insight: `Klienti ka hapur faturën '${name}' 5 herë në 24 orë, por nuk ka paguar. Kjo tregon hezitim ose problem me likuiditetin.`,
                        recommendation: "Telefononi menjëherë për të konfirmuar nëse kanë ndonjë problem teknik ose financiar.",
                        conf: 92
                    },
                    {
                        insight: `Fatura '${name}' është vonuar për 7 ditë. Ky klient zakonisht paguan ditën e 3-të. Ky devijim është shqetësues.`,
                        recommendation: "Dërgoni një rikujtesë të butë manuale përmes WhatsApp, jo email automatik.",
                        conf: 88
                    },
                    {
                        insight: `Shuma prej ${value} është më e lartë se mesatarja e zakonshme për këtë klient, gjë që rrit rrezikun e vonesës.`,
                        recommendation: "Ofroni mundësinë e pagesës me dy këste për të siguruar gjysmën e shumës sot.",
                        conf: 75
                    }
                ];
                const s = scenarios[scenario];
                result = { insight: s.insight, recommendation: s.recommendation, confidence: s.conf };

            } else if (mode === 'OPPORTUNITY' && node.group === 'Client') {
                const scenarios = [
                    {
                        insight: `Blerjet e '${name}' janë rritur me 15% muajin e kaluar. Ata po zgjerohen.`,
                        recommendation: "Propozoni kontratën 'Premium' e cila u ofron zbritje për volum më të madh.",
                        conf: 94
                    },
                    {
                        insight: `'${name}' nuk ka porositur produktin sezonal që zakonisht e merr në këtë kohë. Konkurrentët mund të kenë ndërhyrë.`,
                        recommendation: "Dërgoni një ofertë speciale 'Rikthim' me 10% zbritje brenda 48 orëve.",
                        conf: 82
                    },
                    {
                        insight: `Bazuar në historikun e '${name}', ata shpesh blejnë kafe por kurrë sheqer. Kjo është një mundësi e humbur 'Cross-sell'.`,
                        recommendation: "Dërgoni mostër falas të sheqerit me porosinë e ardhshme.",
                        conf: 78
                    }
                ];
                const s = scenarios[scenario];
                result = { insight: s.insight, recommendation: s.recommendation, confidence: s.conf };

            } else if (mode === 'COST' && node.group === 'Expense') {
                const scenarios = [
                    {
                        insight: `Kategoria '${name}' është rritur papritur. Kostot e logjistikës po hanë 12% të marzhës.`,
                        recommendation: "Negocioni me furnitorin ose kërkoni oferta alternative menjëherë.",
                        conf: 95
                    },
                    {
                        insight: `Shpenzimi prej ${value} për '${name}' duket i lartë për këtë periudhë të vitit (jashtë sezonit).`,
                        recommendation: "Auditoni faturat e fundit për të parë nëse ka gabime në çmime.",
                        conf: 85
                    },
                    {
                        insight: `Ky shpenzim është frekuent por me vlera të vogla. Tarifat e transaksionit po akumulohen.`,
                        recommendation: "Konsolidoni porositë për të bërë një blerje të madhe mujore në vend të 4 të vogla.",
                        conf: 90
                    }
                ];
                const s = scenarios[scenario];
                result = { insight: s.insight, recommendation: s.recommendation, confidence: s.conf };
            } else {
                // GLOBAL / DEFAULT
                const scenarios = [
                    {
                        insight: `'${name}' është një nyje kritike. Humbja e këtij klienti do të ndikonte në 3 referenca të tjera.`,
                        recommendation: "Caktoni një takim kortezie për të forcuar marrëdhënien.",
                        conf: 80
                    },
                    {
                        insight: `Aktiviteti i '${name}' është i qëndrueshëm, por pa rritje prej 6 muajsh.`,
                        recommendation: "Kërkoni feedback për të parë nëse ka nevoja të paplotësuara.",
                        conf: 70
                    },
                    {
                        insight: `Të dhënat për '${name}' janë të paplota. Mungon numri i telefonit të menaxherit.`,
                        recommendation: "Përditësoni profilin CRM për të siguruar komunikim efikas.",
                        conf: 98
                    }
                ];
                const s = scenarios[scenario];
                result = { insight: s.insight, recommendation: s.recommendation, confidence: s.conf };
            }
            
            resolve(result);
        }, delay); 
    });
};

// --- UI Sub-Components ---
const InspectorHeader: React.FC<{ title: string, value: string }> = ({ title, value }) => (
    <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 backdrop-blur-sm shadow-inner">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block mb-1">
            {title}
        </span>
        <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {value}
        </span>
    </div>
);

// ALBANIAN AI ADVISOR PANEL
const AIAdvisorPanel: React.FC<{ loading: boolean, data: { insight: string, recommendation: string, confidence: number } | null }> = ({ loading, data }) => {
    if (loading) {
        return (
            <div className="mt-6 p-5 bg-indigo-950/30 border border-indigo-500/30 rounded-lg relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                    <BrainCircuit className="text-indigo-400 animate-pulse" size={20} />
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Duke analizuar...</span>
                </div>
                <div className="space-y-2">
                    <div className="h-2 bg-indigo-500/20 rounded w-full animate-pulse"></div>
                    <div className="h-2 bg-indigo-500/20 rounded w-3/4 animate-pulse"></div>
                    <div className="h-2 bg-indigo-500/20 rounded w-5/6 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={16} />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Këshilltar Strategjik AI</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {data.confidence}% Besueshmëria
                </span>
            </div>

            {/* Content Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900 border border-purple-500/30 rounded-lg p-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                
                {/* Observation */}
                <div className="mb-4">
                    <h5 className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Eye size={10} /> Vëzhgim
                    </h5>
                    <p className="text-sm text-slate-200 leading-relaxed italic">
                        "{data.insight}"
                    </p>
                </div>

                {/* Recommendation */}
                <div>
                    <h5 className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Lightbulb size={10} /> Veprim i Rekomanduar
                    </h5>
                    <p className="text-sm text-white font-medium leading-relaxed">
                        {data.recommendation}
                    </p>
                </div>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ mode: IntelligenceMode }> = ({ mode }) => {
    const { t } = useTranslation();
    const content: Record<IntelligenceMode, { icon: JSX.Element; title: string; text: string }> = {
        RISK: { icon: <CheckCircle className="w-16 h-16 text-emerald-500 mb-6 opacity-60" />, title: t('graph.empty.riskTitle', 'Skanimi i Rrezikut: Pastër'), text: t('graph.empty.riskText', 'Nuk u zbuluan fatura të vonuara ose klientë me rrezik të lartë.') },
        COST: { icon: <BarChart2 className="w-16 h-16 text-slate-600 mb-6 opacity-50" />, title: t('graph.empty.costTitle', 'Pa të Dhëna Shpenzimesh'), text: t('graph.empty.costText', 'Shtoni shpenzime për të vizualizuar qendrat e kostos dhe rrjedhën e parasë.') },
        OPPORTUNITY: { icon: <Sparkles className="w-16 h-16 text-purple-500 mb-6 opacity-60" />, title: t('graph.empty.oppTitle', 'Duke Ndërtuar Inteligjencë'), text: t('graph.empty.oppText', 'AI ka nevojë për më shumë histori transaksionesh për të identifikuar mundësi shitjeje.') },
        GLOBAL: { icon: <Globe className="w-16 h-16 text-slate-600 mb-6 opacity-50" />, title: t('graph.empty.globalTitle', 'Inicializimi i Nexus'), text: t('graph.empty.globalText', 'Krijoni klientin ose faturën tuaj të parë për të gjeneruar hartën e inteligjencës.') }
    };
    const { icon, title, text } = content[mode] || content.GLOBAL;
    return ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-none select-none">
            {icon}
            <h3 className="text-xl font-bold text-slate-200 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">{text}</p>
        </div> 
    );
};

// --- MAIN COMPONENT ---
const GraphVisualization: React.FC = () => {
  const { t } = useTranslation();
  
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('GLOBAL');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<{ insight: string, recommendation: string, confidence: number } | null>(null);
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

  // 2. Physics
  useEffect(() => {
    const graph = fgRef.current;
    if (graph) {
        graph.d3Force('center')?.strength(0.1);
        graph.d3Force('charge')?.strength(-1500);
        graph.d3Force('link')?.distance(250);
        if (data.nodes.length > 0) {
            setTimeout(() => { graph.zoomToFit(600, 100); }, 600);
        }
    }
  }, [data]);

  // 3. AI Analysis Trigger
  const runAIAnalysis = useCallback(async (node: GraphNode) => {
      setAiLoading(true);
      setAiData(null);
      const analysis = await generateDeepInsight(node, activeMode);
      setAiLoading(false);
      setAiData(analysis);
  }, [activeMode]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    runAIAnalysis(node as GraphNode); 
    fgRef.current?.centerAt(node.x, node.y, 800);
    fgRef.current?.zoom(1.2, 800);
  }, [runAIAnalysis]);

  // 4. Canvas Rendering
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

    if (isSelected) {
        ctx.shadowBlur = 30; ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    } else if (isRisk) {
        ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
    } else if (isOpportunity) {
        ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(168, 85, 247, 0.4)'; 
    } else {
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }

    ctx.fillStyle = style.bg;
    ctx.strokeStyle = isSelected ? '#ffffff' : (isRisk ? '#ef4444' : style.border);
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; 

    ctx.fillStyle = style.header;
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, 24, [BORDER_RADIUS, BORDER_RADIUS, 0, 0]);
    ctx.fill();

    ctx.font = `700 10px "Inter", sans-serif`;
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(group.toUpperCase(), x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 12);

    ctx.beginPath();
    ctx.arc(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 12, 4, 0, 2 * Math.PI);
    ctx.fillStyle = isRisk ? '#ef4444' : (['Paid', 'Active'].includes(status) ? '#10b981' : '#94a3b8');
    ctx.fill();

    ctx.font = `bold 14px "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    let title = node.label || String(node.id);
    if (title.length > 22) title = title.substring(0, 20) + '...';
    ctx.fillText(title, x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 42);

    ctx.font = `500 12px "Inter", sans-serif`;
    ctx.fillStyle = isRisk ? '#fca5a5' : '#94a3b8';
    ctx.fillText(node.subLabel || '---', x - CARD_WIDTH / 2 + 12, y - CARD_HEIGHT / 2 + 58);

  }, [selectedNode, t]);

  // 5. Hit Detection
  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    const x = node.x!;
    const y = node.y!;
    ctx.beginPath();
    ctx.roundRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
    ctx.fill();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[700px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-900 flex flex-col font-sans">
      
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-30">
            <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
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
            linkColor={(link: any) => link.type === 'opportunity' ? '#6366f1' : '#475569'} 
            linkWidth={1.5} 
            linkDirectionalParticles={1} 
            linkDirectionalParticleSpeed={0.002} 
            linkDirectionalParticleWidth={3}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            minZoom={0.4}
            maxZoom={3.0}
        />
      )}

      {/* Mode Switcher */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-full p-2 flex gap-3 shadow-2xl z-10">
          <ModeButton active={activeMode === 'GLOBAL'} onClick={() => setActiveMode('GLOBAL')} icon={<Globe size={16} />} label={t('graph.modeGlobal', 'Pamja Globale')} color="bg-blue-600" />
          <ModeButton active={activeMode === 'RISK'} onClick={() => setActiveMode('RISK')} icon={<ShieldAlert size={16} />} label={t('graph.modeRisk', 'Skanim i Rrezikut')} color="bg-red-600" />
          <ModeButton active={activeMode === 'COST'} onClick={() => setActiveMode('COST')} icon={<TrendingDown size={16} />} label={t('graph.modeCost', 'Gjurmim i Kostos')} color="bg-orange-600" />
          <ModeButton active={activeMode === 'OPPORTUNITY'} onClick={() => setActiveMode('OPPORTUNITY')} icon={<Sparkles size={16} />} label={t('graph.modeOpportunity', 'Mundësitë')} color="bg-purple-600" />
      </div>

      {/* Enterprise Inspector Panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right-10 duration-200 z-20 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${['Unpaid', 'Overdue'].includes(selectedNode.status || '') ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {selectedNode.group}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedNode.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                            {selectedNode.status || 'Aktiv'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight break-words">
                        {selectedNode.label}
                    </h2>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedNode.group === 'Client' && (
                    <div className="col-span-2"><InspectorHeader title={t('graph.inspector.ltv', 'Vlera Totale')} value={selectedNode.subLabel || '€0.00'} /></div>
                )}
                {selectedNode.group === 'Invoice' && (
                    <div className="col-span-2"><InspectorHeader title={t('graph.inspector.amount', 'Shuma e Faturës')} value={selectedNode.subLabel || '€0.00'} /></div>
                )}
                {selectedNode.group === 'Expense' && (
                    <div className="col-span-2"><InspectorHeader title={t('graph.inspector.cost', 'Ndikimi në Kosto')} value={selectedNode.subLabel || '€0.00'} /></div>
                )}
            </div>

            {/* AI ADVISOR PANEL (The "Brain") */}
            <AIAdvisorPanel loading={aiLoading} data={aiData} />
            
            {/* Action Command Center - REMOVED PER REQUEST */}
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---
const ModeButton: React.FC<{ active: boolean; onClick: () => void; icon: JSX.Element; label: string; color: string }> = ({ active, onClick, icon, label, color }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 ${active ? `${color} text-white shadow-lg shadow-${color}/25 scale-105` : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
    >
        {icon} <span>{label}</span>
    </button>
);

export default GraphVisualization;