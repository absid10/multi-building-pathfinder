import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home, Navigation, Edit3, Box, QrCode, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '../config/api';
import { findNearestNode, findPath, Node, POI } from '../utils/pathfinding';
import { detectRoomsFromImage } from '../utils/autoDetectRooms';
import MapEditorToolbar from '../components/MapEditorToolbar';
import type { EditTool } from '../components/MapEditorToolbar';

type GraphEdge = {
  from: string;
  to: string;
  distance_m?: number;
  weight?: number;
  bidirectional?: boolean;
};

type GraphNode = Node & {
  kind?: string;
  polygon?: { x: number; y: number }[];
};

type FloorGraph = {
  id: string;
  name: string;
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  pois: POI[];
};

type BuildingGraph = {
  name: string;
  floors: FloorGraph[];
};

type UploadedGraph = {
  buildings: BuildingGraph[];
};

const CLICK_SUPPRESS_MS = 180;

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function UploadedMapNavigatorPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();

  const [mapName, setMapName] = useState('Uploaded Map');
  const [mapFileName, setMapFileName] = useState<string | null>(null);
  const [graph, setGraph] = useState<UploadedGraph | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState(0);
  
  // Navigation states
  const [currentLocation, setCurrentLocation] = useState<{ x: number; y: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [path, setPath] = useState<Node[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Editor states
  const [editMode, setEditMode] = useState(false);
  const [editTool, setEditTool] = useState<EditTool>('select');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [draftPoiName, setDraftPoiName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0.5);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoDetectOnOpen, setAutoDetectOnOpen] = useState(false);
  const [showRoomOverlays, setShowRoomOverlays] = useState(true);

  // Drag state (refs to avoid re-renders during drag)
  const dragNodeId = useRef<string | null>(null);
  const dragMoved = useRef(false);
  const suppressClickUntil = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const autoDetectedFloorKey = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!mapId) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/maps/${mapId}`, {
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) throw new Error('Could not load uploaded map navigation data');
        const payload = await response.json();
        
        let g = payload?.analysisResult?.graph as UploadedGraph | undefined;
        if (!g || !g.buildings || g.buildings.length === 0) {
          g = {
             buildings: [{
                name: "Building 1",
                floors: [{
                   id: "f1", name: "Floor 1", width: 1000, height: 800, nodes: [], edges: [], pois: []
                }]
             }]
          };
        }
        setMapName(payload?.name || 'Uploaded Map');
        setMapFileName(payload?.fileName || null);
        setGraph(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load map data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mapId]);

  const building = graph?.buildings?.[selectedBuilding] || null;
  const floor = building?.floors?.[selectedFloor] || null;

  const floorEdges = useMemo(() => {
    if (!floor) return [];
    return floor.edges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: Number(e.weight ?? e.distance_m ?? 10),
    }));
  }, [floor]);

  const destinationNode = useMemo(() => {
    if (!floor || !selectedDestination) return null;
    const poi = floor.pois.find((p) => p.id === selectedDestination);
    if (!poi) return null;
    return floor.nodes.find((n) => n.id === poi.node) || null;
  }, [floor, selectedDestination]);

  const computeRoute = (location: { x: number; y: number }, destinationId: string) => {
    if (!floor) return;
    const poi = floor.pois.find((p) => p.id === destinationId);
    if (!poi) return;
    const endNode = floor.nodes.find((n) => n.id === poi.node);
    if (!endNode) return;
    const startNode = findNearestNode(location, floor.nodes);
    if (!startNode || !endNode) return;
    const route = findPath(startNode, endNode, floor.nodes, floorEdges);
    setPath(route);
  };

  // GRAPH MUTATION HELPERS
  const updateCurrentFloor = (updater: (f: FloorGraph) => FloorGraph) => {
    if (!graph || !floor) return;
    const newGraph = JSON.parse(JSON.stringify(graph));
    const b = newGraph.buildings[selectedBuilding];
    b.floors[selectedFloor] = updater(b.floors[selectedFloor]);
    setGraph(newGraph);
  };

  // SVG coordinate helper
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current || !floor) return null;
    const bounds = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(((clientX - bounds.left) / bounds.width) * (floor.width || 1000)),
      y: Math.round(((clientY - bounds.top) / bounds.height) * (floor.height || 800)),
    };
  }, [floor]);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!floor) return;
    if (Date.now() < suppressClickUntil.current) return;
    const pt = toSvgCoords(e.clientX, e.clientY);
    if (!pt) return;

    if (!editMode) {
      if (path.length > 1) return;
      setCurrentLocation(pt);
      if (selectedDestination) computeRoute(pt, selectedDestination);
      return;
    }

    const nodeKindMap: Record<string, string> = { room: 'room', stairs: 'stairs', entrance: 'entrance' };
    const kind = nodeKindMap[editTool];
    if (kind) {
      const newId = `n_${Date.now()}`;
      const label = kind === 'room' ? `Room ${(floor.pois.length || 0) + 1}` :
                    kind === 'stairs' ? `Stairs` : `Entrance`;
      updateCurrentFloor((f) => ({
        ...f,
        nodes: [...f.nodes, { id: newId, x: pt.x, y: pt.y, kind }],
        pois: [...f.pois, { id: `poi_${Date.now()}`, name: label, node: newId, icon: kind === 'stairs' ? 'stairs' : kind === 'entrance' ? 'door' : 'map-pin' }],
      }));
      toast.success(`${label} placed`);
    } else if (editTool === 'select' || editTool === 'path' || editTool === 'delete') {
      setSelectedNode(null);
      setEditingPoi(null);
    }
  };

  // ── Drag handlers ───────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (!editMode || editTool !== 'select') return;
    dragNodeId.current = nodeId;
    dragMoved.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!editMode) return;
    const onMove = (e: PointerEvent) => {
      if (!dragNodeId.current || !floor) return;
      const pt = toSvgCoords(e.clientX, e.clientY);
      if (!pt) return;
      dragMoved.current = true;
      updateCurrentFloor((f) => ({
        ...f,
        nodes: f.nodes.map((n) => n.id === dragNodeId.current ? { ...n, x: pt.x, y: pt.y } : n),
      }));
    };
    const onUp = () => {
      if (!dragNodeId.current) return;
      if (dragMoved.current) {
        suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
        toast.success('Node repositioned');
      }
      dragNodeId.current = null;
      dragMoved.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [editMode, floor, toSvgCoords]);

  // ── Auto-detect ─────────────────────────────────────────────────────
  const handleAutoDetect = useCallback(() => {
    if (!floor || !backgroundImageUrl) return;
    setIsDetecting(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const result = detectRoomsFromImage(img, { width: floor.width || 1000, height: floor.height || 800 });
        if (result.nodes.length < 2) {
          toast.warning('Auto-detect found too few rooms. Try manual mapping instead.');
          setIsDetecting(false);
          return;
        }
        updateCurrentFloor((f) => ({
          ...f,
          nodes: result.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, kind: n.kind, polygon: n.polygon })),
          edges: result.edges.map((e) => ({ from: e.from, to: e.to, distance_m: e.weight, bidirectional: true })),
          pois: result.nodes.filter((n) => n.kind === 'room').map((n) => ({ id: `poi_${n.id}`, name: n.label, node: n.id, icon: 'map-pin' })),
        }));
        toast.success(`Detected ${result.nodes.length} rooms, ${result.edges.length} paths`);
      } catch (err) {
        toast.error('Auto-detect failed. Use manual mapping tools.');
        console.error(err);
      }
      setIsDetecting(false);
    };
    img.onerror = () => { toast.error('Could not load image for detection'); setIsDetecting(false); };
    img.src = backgroundImageUrl;
  }, [floor, backgroundImageUrl]);

  // ── Export / Import graph ───────────────────────────────────────────
  const handleExportGraph = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mapName.replace(/\s+/g, '-').toLowerCase()}-graph.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Graph exported');
  };

  const handleImportGraph = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string);
        if (payload.buildings) {
          setGraph(payload);
          toast.success('Graph imported');
        } else if (payload.nodes) {
          // Simple format — apply to current floor
          updateCurrentFloor((f) => ({
            ...f,
            nodes: payload.nodes || f.nodes,
            edges: payload.edges || f.edges,
            pois: payload.pois || f.pois,
          }));
          toast.success('Floor graph imported');
        }
      } catch { toast.error('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Background image URL
  const backgroundImageUrl = mapFileName 
    ? `${API_BASE}/maps/files/${encodeURIComponent(mapFileName)}` 
    : null;

  useEffect(() => {
    if (!editMode || !autoDetectOnOpen || !backgroundImageUrl || !floor || isDetecting) return;
    if (floor.nodes.length > 0 || floor.edges.length > 0 || floor.pois.length > 0) return;

    const floorKey = `${selectedBuilding}:${selectedFloor}:${backgroundImageUrl}`;
    if (autoDetectedFloorKey.current === floorKey) return;

    autoDetectedFloorKey.current = floorKey;
    handleAutoDetect();
  }, [
    editMode,
    autoDetectOnOpen,
    backgroundImageUrl,
    floor,
    isDetecting,
    selectedBuilding,
    selectedFloor,
    handleAutoDetect,
  ]);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode || !floor) return;
    e.stopPropagation();

    if (editTool === 'select') {
      setSelectedNode(nodeId);
      const poi = floor.pois.find(p => p.node === nodeId);
      if (poi) {
        setEditingPoi(poi.id);
        setDraftPoiName(poi.name);
      } else {
        setEditingPoi(null);
      }
    } else if (editTool === 'path') {
      if (!selectedNode) {
        setSelectedNode(nodeId);
      } else {
        if (selectedNode !== nodeId) {
          const exists = floor.edges.some(eg => 
            (eg.from === selectedNode && eg.to === nodeId) || 
            (eg.to === selectedNode && eg.from === nodeId)
          );
          if (!exists) {
            const fromNode = floor.nodes.find(n => n.id === selectedNode);
            const toNode = floor.nodes.find(n => n.id === nodeId);
            const dist = fromNode && toNode 
              ? Math.round(Math.sqrt(Math.pow(fromNode.x - toNode.x, 2) + Math.pow(fromNode.y - toNode.y, 2)) * 0.25 * 100) / 100
              : 5.0;
            updateCurrentFloor((f) => ({
              ...f,
              edges: [...f.edges, { from: selectedNode!, to: nodeId, distance_m: dist, bidirectional: true }]
            }));
          }
        }
        setSelectedNode(null);
      }
    } else if (editTool === 'delete') {
      updateCurrentFloor((f) => ({
        ...f,
        nodes: f.nodes.filter(n => n.id !== nodeId),
        edges: f.edges.filter(eg => eg.from !== nodeId && eg.to !== nodeId),
        pois: f.pois.filter(p => p.node !== nodeId)
      }));
      if (selectedNode === nodeId) setSelectedNode(null);
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, eIdx: number) => {
    if (!editMode || !floor || editTool !== 'delete') return;
    e.stopPropagation();
    updateCurrentFloor((f) => {
      const newEdges = [...f.edges];
      newEdges.splice(eIdx, 1);
      return { ...f, edges: newEdges };
    });
  };

  const savePoiName = () => {
    if (!editingPoi || !floor) return;
    const trimmed = draftPoiName.trim();
    if (trimmed) {
      updateCurrentFloor((f) => {
        const newPois = [...f.pois];
        const idx = newPois.findIndex(p => p.id === editingPoi);
        if (idx >= 0) {
          newPois[idx] = { ...newPois[idx], name: trimmed };
        } else if (selectedNode) {
          newPois.push({ id: `poi_${Date.now()}`, name: trimmed, node: selectedNode, icon: 'map-pin' });
        }
        return { ...f, pois: newPois };
      });
    }
    setEditingPoi(null);
  };

  const handleCreateRoomFromSelectedNode = () => {
    if (!selectedNode || !floor) return;
    const existing = floor.pois.find(p => p.node === selectedNode);
    if (!existing) {
      const roomNum = floor.pois.length + 1;
      const newPoiId = `poi_${Date.now()}`;
      updateCurrentFloor((f) => ({
        ...f,
        pois: [...f.pois, { id: newPoiId, name: `Room ${roomNum}`, node: selectedNode, icon: 'map-pin' }]
      }));
      setEditingPoi(newPoiId);
      setDraftPoiName(`Room ${roomNum}`);
    }
  };

  const syncGraphToBackend = async () => {
    if (!mapId || !graph) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}/graph`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ graph })
      });
      if (!response.ok) throw new Error('Failed to save the map updates');
      alert("✅ Map graph saved successfully!");
    } catch(err) {
      alert(err instanceof Error ? err.message : "Error saving map");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-slate-600 font-medium">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => navigate('/')} className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition">
            <Home className="h-4 w-4" /> Home
          </button>
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">⚠️ Could not load map</h1>
            <p className="mt-3 text-sm text-slate-600">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!graph || !floor || !building) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No map data available.</p>
          <button onClick={() => navigate('/dashboard')} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 space-y-4">
        
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm cursor-pointer hover:shadow">
              <Home className="h-4 w-4 text-blue-600" /> Home
            </button>
            <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm cursor-pointer hover:shadow">
              <ArrowLeft className="h-4 w-4 text-slate-400" /> Dashboard
            </button>
            {mapId && (
              <button
                onClick={() => navigate(`/navigate/upload/${mapId}/preview-3d`)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm cursor-pointer hover:shadow"
              >
                <Box className="h-4 w-4 text-emerald-600" /> 3D Preview
              </button>
            )}
            {mapId && (
              <button
                onClick={() => {
                  const url = window.location.href;
                  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
                  setQrUrl(qr);
                  setQrOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all shadow-sm cursor-pointer hover:shadow"
              >
                <QrCode className="h-4 w-4 text-slate-700" /> Share (QR)
              </button>
            )}
          </div>
          {!editMode && (
            <button 
              onClick={() => { setEditMode(true); setEditTool('select'); setCurrentLocation(null); setPath([]); }} 
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-5 py-2.5 text-sm font-semibold transition-all shadow-sm">
              <Edit3 className="h-4 w-4" /> Map Editor
            </button>
          )}
        </div>

        {/* Map Info + Building/Floor Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{mapName}</h1>
          {graph.buildings.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {graph.buildings.map((b, bIndex) => (
                <button key={b.name} onClick={() => { setSelectedBuilding(bIndex); setSelectedFloor(0); setCurrentLocation(null); setSelectedDestination(''); setPath([]); }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${bIndex === selectedBuilding ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {building.floors.map((f, fIndex) => (
              <button key={f.id} onClick={() => { setSelectedFloor(fIndex); setCurrentLocation(null); setSelectedDestination(''); setPath([]); setEditingPoi(null); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${fIndex === selectedFloor ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f.name}
              </button>
            ))}
          </div>
          {!editMode && (
            <div className="mt-5 flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                <select value={selectedDestination} onChange={(e) => { const dest = e.target.value; setSelectedDestination(dest); if (currentLocation && dest) computeRoute(currentLocation, dest); }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-white">
                  <option value="">Select a room to navigate to...</option>
                  {floor.pois.map((poi) => (<option key={poi.id} value={poi.id}>{poi.name}</option>))}
                </select>
              </div>
              <div className="flex gap-2 items-end pt-5">
                <button onClick={() => { setCurrentLocation(null); setSelectedDestination(''); setPath([]); }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">Reset</button>
              </div>
              {path.length > 1 && (
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-xl shadow-sm mt-2 sm:mt-0">
                  <Navigation className="h-4 w-4 text-emerald-500" /> Route found!
                </div>
              )}
              {!currentLocation && selectedDestination && (
                <div className="text-xs text-blue-600 font-medium mt-1">👆 Click on the map to set your current position</div>
              )}
            </div>
          )}
        </div>

        {/* Editor Toolbar */}
        {editMode && (
          <MapEditorToolbar
            editTool={editTool}
            onToolChange={setEditTool}
            onAutoDetect={handleAutoDetect}
            autoDetectOnOpen={autoDetectOnOpen}
            onAutoDetectOnOpenChange={setAutoDetectOnOpen}
            showRoomOverlays={showRoomOverlays}
            onShowRoomOverlaysChange={setShowRoomOverlays}
            onExportGraph={handleExportGraph}
            onImportGraph={handleImportGraph}
            onSave={syncGraphToBackend}
            onExit={() => { setEditMode(false); setEditingPoi(null); setSelectedNode(null); setEditTool('select'); }}
            isSaving={isSaving}
            isDetecting={isDetecting}
            imageOpacity={imageOpacity}
            onImageOpacityChange={setImageOpacity}
            hasBackgroundImage={!!backgroundImageUrl}
            nodeCount={floor.nodes.length}
            edgeCount={floor.edges.length}
            poiCount={floor.pois.length}
          />
        )}

        {/* Map Canvas */}
        <div className={`rounded-2xl border-2 ${editMode ? 'border-blue-400 shadow-blue-100 shadow-lg' : 'border-slate-200'} bg-white p-3 transition-all duration-300 relative overflow-hidden`}>
          <svg 
            ref={svgRef}
            viewBox={`0 0 ${floor.width || 1000} ${floor.height || 800}`} 
            className={`w-full rounded-xl bg-slate-50 shadow-inner border border-slate-100 ${
               editMode && ['room','stairs','entrance'].includes(editTool) ? 'cursor-crosshair' : 
               editMode && editTool === 'delete' ? 'cursor-not-allowed' :
               editMode && editTool === 'select' ? 'cursor-default' : 'cursor-default'
            }`} 
            style={{ minHeight: '480px', maxHeight: '640px', touchAction: 'none' }}
            onClick={handleCanvasClick}
          >
            {/* Background floor plan image */}
            {backgroundImageUrl && (
              <image 
                href={backgroundImageUrl} 
                x="0" y="0"
                width={floor.width || 1000} 
                height={floor.height || 800} 
                opacity={imageOpacity}
                preserveAspectRatio="xMidYMid meet"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Grid lines for editor */}
            {editMode && (
              <g opacity="0.08">
                {Array.from({length: 10}, (_, i) => (
                  <React.Fragment key={`grid-${i}`}>
                    <line x1={i * 100} y1={0} x2={i * 100} y2={floor.height || 800} stroke="#6366f1" strokeWidth={1} />
                    <line x1={0} y1={i * 80} x2={floor.width || 1000} y2={i * 80} stroke="#6366f1" strokeWidth={1} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* Draw Path Highlight Preview if drawing edge */}
            {editMode && editTool === 'path' && selectedNode && (() => {
              const n = floor.nodes.find(n => n.id === selectedNode);
              if (!n) return null;
              return <circle cx={n.x} cy={n.y} r={16} fill="none" stroke="#6366f1" strokeWidth={2.5} className="animate-ping" />;
            })()}

            {/* Auto-detected room boundary overlays */}
            {showRoomOverlays && floor.nodes.map((n) => {
              if (!n.polygon || n.polygon.length < 3) return null;
              const points = n.polygon.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
              return (
                <polygon
                  key={`poly-${n.id}`}
                  points={points}
                  fill="rgba(16,185,129,0.08)"
                  stroke="rgba(16,185,129,0.85)"
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
            
            {/* Draw Edges */}
            {floor.edges.map((edge, idx) => {
              const from = floor.nodes.find((n) => n.id === edge.from);
              const to = floor.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const isInPath = !editMode && path.length > 1 && path.some((pn, pi) => pi < path.length - 1 && 
                ((pn.id === edge.from && path[pi+1].id === edge.to) || (pn.id === edge.to && path[pi+1].id === edge.from)));
              return (
                <line 
                  key={`${edge.from}-${edge.to}-${idx}`} 
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y} 
                  stroke={isInPath ? "#6366f1" : (editMode && editTool === 'delete' ? "#e2e8f0" : "#94a3b8")} 
                  strokeWidth={isInPath ? 5 : 3} 
                  strokeLinecap="round" 
                  strokeDasharray={isInPath ? "none" : "none"}
                  className={editMode && editTool === 'delete' ? "hover:stroke-red-400 cursor-pointer transition-colors" : "transition-colors"}
                  onClick={(e) => handleEdgeClick(e, idx)}
                />
              );
            })}

            {/* Draw Standard Nodes */}
            {floor.nodes.map((n) => {
               const isSelected = selectedNode === n.id;
               const isPOI = floor.pois.some(p => p.node === n.id);
               if (isPOI) return null;
               const isStairs = n.kind === 'stairs';
               const isEntrance = n.kind === 'entrance';
               const fillColor = isSelected ? '#6366f1' : isStairs ? '#f59e0b' : isEntrance ? '#06b6d4' : '#64748b';
               
               return (
                  <g key={n.id} onClick={(e) => handleNodeClick(e, n.id)} className={editMode ? 'cursor-pointer' : ''}>
                    <circle 
                       cx={n.x} cy={n.y} 
                       r={isSelected ? 8 : (isStairs || isEntrance ? 7 : 5)} 
                       fill={fillColor}
                       stroke={isSelected ? '#c7d2fe' : 'none'}
                       strokeWidth={isSelected ? 3 : 0}
                       className={editMode && editTool === 'select' ? 'cursor-grab hover:fill-blue-400 transition-all' : editMode ? 'hover:fill-blue-400 transition-all' : ''}
                       onPointerDown={(e) => handlePointerDown(e, n.id)}
                    />
                    {isStairs && !editMode && (
                      <text x={n.x + 10} y={n.y + 4} fontSize={10} fill="#92400e" fontWeight="600">🪜</text>
                    )}
                    {isEntrance && !editMode && (
                      <text x={n.x + 10} y={n.y + 4} fontSize={10} fill="#0891b2" fontWeight="600">🚪</text>
                    )}
                  </g>
               )
            })}

            {/* Draw POIs */}
            {floor.pois.map((poi) => {
              const node = floor.nodes.find((n) => n.id === poi.node);
              if (!node) return null;
              
              const isSelected = selectedNode === node.id;
              const isEditing = editingPoi === poi.id;
              
              return (
                <g 
                  key={poi.id} 
                  onClick={(e) => handleNodeClick(e, node.id)}
                  className={editMode ? 'cursor-pointer group' : ''}
                >
                  <circle cx={node.x} cy={node.y} r={14} fill={isSelected ? '#6366f120' : '#10b98120'} />
                  <circle 
                     cx={node.x} cy={node.y} 
                     r={isSelected ? 10 : 8} 
                     fill={isSelected || isEditing ? '#6366f1' : node?.kind === 'stairs' ? '#f59e0b' : node?.kind === 'entrance' ? '#06b6d4' : '#10b981'} 
                     className={editMode && !isEditing && editTool === 'select' ? 'cursor-grab group-hover:fill-blue-500 transition-colors' : editMode && !isEditing ? 'group-hover:fill-blue-500 transition-colors' : 'transition-colors'} 
                     stroke={isSelected ? '#c7d2fe' : '#ffffff'}
                     strokeWidth={isSelected ? 3 : 2}
                     onPointerDown={(e) => handlePointerDown(e, node.id)}
                  />
                  
                  {isEditing ? (
                    <foreignObject x={node.x + 14} y={node.y - 16} width={220} height={36}>
                       <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                         <input 
                           autoFocus
                           className="px-2.5 py-1 text-xs text-slate-800 bg-white border-2 border-blue-500 rounded-lg outline-none shadow-xl w-36 font-medium"
                           value={draftPoiName}
                           onChange={e => setDraftPoiName(e.target.value)}
                           onKeyDown={e => { 
                             if(e.key === 'Enter') savePoiName(); 
                             if(e.key === 'Escape') setEditingPoi(null); 
                           }}
                           onBlur={savePoiName}
                         />
                       </div>
                    </foreignObject>
                  ) : (
                    <g>
                      {/* Label background for readability */}
                      <rect 
                        x={node.x + 12} 
                        y={node.y - 8} 
                        width={poi.name.length * 7 + 12} 
                        height={18} 
                        rx={5} 
                        fill="white" 
                        fillOpacity={0.9} 
                        stroke={isSelected ? "#6366f1" : "#d1d5db"}
                        strokeWidth={1}
                      />
                      <text 
                        x={node.x + 18} 
                        y={node.y + 5} 
                        fontSize={11} 
                        className={`font-semibold select-none ${editMode ? 'fill-slate-700 group-hover:fill-blue-700 transition-colors' : 'fill-slate-800'}`}
                      >
                        {poi.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Navigation Path Display */}
            {!editMode && path.length > 1 && (
              <polyline
                points={path.map((n) => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="12,6"
                className="animate-[dash_2s_linear_infinite]"
              />
            )}

            {/* Current User Location Marker */}
            {!editMode && currentLocation && (
              <g>
                <circle cx={currentLocation.x} cy={currentLocation.y} r={12} fill="#3b82f620" />
                <circle cx={currentLocation.x} cy={currentLocation.y} r={7} fill="#3b82f6" className="animate-pulse" />
                <circle cx={currentLocation.x} cy={currentLocation.y} r={3} fill="#ffffff" />
              </g>
            )}

            {/* Destination Marker */}
            {!editMode && destinationNode && (
              <g>
                <circle cx={destinationNode.x} cy={destinationNode.y} r={14} fill="#6366f120" />
                <circle cx={destinationNode.x} cy={destinationNode.y} r={10} fill="#6366f1" />
                <circle cx={destinationNode.x} cy={destinationNode.y} r={4} fill="#ffffff" />
              </g>
            )}

            {/* Empty state helper */}
            {floor.nodes.length === 0 && !editMode && (
              <text x={(floor.width || 1000) / 2} y={(floor.height || 800) / 2} textAnchor="middle" fontSize={16} fill="#94a3b8" fontWeight="500">
                No nodes yet. Click "Map Editor" to start building the navigation graph.
              </text>
            )}
          </svg>
        </div>

        {/* Stats Footer */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 px-1 pb-4">
          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            📍 {floor.nodes.length} nodes
          </span>
          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            🔗 {floor.edges.length} paths
          </span>
          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            🏷️ {floor.pois.length} rooms/POIs
          </span>
          {graph.buildings.length > 0 && (
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              🏢 {graph.buildings.length} building{graph.buildings.length > 1 ? 's' : ''}, {building.floors.length} floor{building.floors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      {qrOpen && qrUrl && (
        <QrModal url={qrUrl} onClose={() => { setQrOpen(false); setQrUrl(null); }} />
      )}
    </div>
  );
}

// QR helpers (outside component)
function QrModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null;
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard'); }
    catch { alert('Could not copy'); }
  };
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map-link-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Share this map</h3>
        <div className="flex flex-col items-center gap-3">
          <img src={url} alt="QR code" className="w-56 h-56 bg-white rounded" />
          <div className="flex gap-2 w-full">
            <button onClick={handleCopy} className="flex-1 inline-flex items-center gap-2 justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm"> <Copy className="h-4 w-4"/> Copy link</button>
            <button onClick={handleDownload} className="flex-1 inline-flex items-center gap-2 justify-center rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm"> <Download className="h-4 w-4"/> Download</button>
          </div>
          <button onClick={onClose} className="mt-2 text-xs text-slate-600">Close</button>
        </div>
      </div>
    </div>
  );
}

