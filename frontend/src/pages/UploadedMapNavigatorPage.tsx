import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home, Navigation, Edit3, X, Save, MousePointer2, GitCommit, GitPullRequest, Trash2, Plus, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { API_BASE } from '../config/api';
import { findNearestNode, findPath, Node, POI } from '../utils/pathfinding';

type GraphEdge = {
  from: string;
  to: string;
  distance_m?: number;
  weight?: number;
  bidirectional?: boolean;
};

type FloorGraph = {
  id: string;
  name: string;
  width: number;
  height: number;
  nodes: (Node & { kind?: string })[];
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

type EditTool = 'select' | 'node' | 'path' | 'delete';

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

  // Editor states
  const [editMode, setEditMode] = useState(false);
  const [editTool, setEditTool] = useState<EditTool>('select');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [draftPoiName, setDraftPoiName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0.5);

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

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!floor) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - bounds.left) / bounds.width) * (floor.width || 1000));
    const y = Math.round(((e.clientY - bounds.top) / bounds.height) * (floor.height || 800));

    if (!editMode) {
      if (path.length > 1) return;
      const location = { x, y };
      setCurrentLocation(location);
      if (selectedDestination) computeRoute(location, selectedDestination);
      return;
    }

    if (editTool === 'node') {
      const newNodeId = `n_${Date.now()}`;
      updateCurrentFloor((f) => ({
        ...f,
        nodes: [...f.nodes, { id: newNodeId, x, y, kind: 'corridor' }]
      }));
    } else if (editTool === 'select' || editTool === 'path' || editTool === 'delete') {
      setSelectedNode(null);
      setEditingPoi(null);
    }
  };

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

  // Background image URL
  const backgroundImageUrl = mapFileName 
    ? `${API_BASE}/maps/files/${encodeURIComponent(mapFileName)}` 
    : null;

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
          </div>
          
          <div className="flex items-center gap-3">
            {editMode && (
              <button 
                onClick={syncGraphToBackend} 
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4"/> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}

            <button 
              onClick={() => {
                setEditMode(!editMode);
                setEditingPoi(null);
                setSelectedNode(null);
                setCurrentLocation(null);
                setPath([]);
                setEditTool('select');
              }} 
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all shadow-sm ${
                editMode 
                ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' 
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {editMode ? <><X className="h-4 w-4"/> Exit Editor</> : <><Edit3 className="h-4 w-4"/> Map Editor</>}
            </button>
          </div>
        </div>

        {/* Map Info + Building/Floor Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{mapName}</h1>
          
          {/* Building Selector */}
          {graph.buildings.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {graph.buildings.map((b, bIndex) => (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelectedBuilding(bIndex);
                    setSelectedFloor(0);
                    setCurrentLocation(null);
                    setSelectedDestination('');
                    setPath([]);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${bIndex === selectedBuilding ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Floor Selector */}
          <div className="mt-3 flex flex-wrap gap-2">
            {building.floors.map((f, fIndex) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFloor(fIndex);
                  setCurrentLocation(null);
                  setSelectedDestination('');
                  setPath([]);
                  setEditingPoi(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${fIndex === selectedFloor ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Navigation Controls (non-edit mode) */}
          {!editMode && (
            <div className="mt-5 flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                <select
                  value={selectedDestination}
                  onChange={(e) => {
                    const dest = e.target.value;
                    setSelectedDestination(dest);
                    if (currentLocation && dest) computeRoute(currentLocation, dest);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-white"
                >
                  <option value="">Select a room to navigate to...</option>
                  {floor.pois.map((poi) => (
                    <option key={poi.id} value={poi.id}>{poi.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-end pt-5">
                <button
                  onClick={() => { setCurrentLocation(null); setSelectedDestination(''); setPath([]); }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  Reset
                </button>
              </div>
              {path.length > 1 && (
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-xl shadow-sm mt-2 sm:mt-0">
                  <Navigation className="h-4 w-4 text-emerald-500" /> Route found! Click map to set your location.
                </div>
              )}
              {!currentLocation && selectedDestination && (
                <div className="text-xs text-blue-600 font-medium mt-1">
                  👆 Click on the map to set your current position
                </div>
              )}
            </div>
          )}
        </div>

        {/* Editor Toolbar */}
        {editMode && (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-blue-200 rounded-2xl shadow-sm">
            <span className="text-sm font-bold text-blue-900 mr-3 uppercase tracking-wider">Tools:</span>
            
            {[
              { id: 'select' as EditTool, icon: MousePointer2, label: 'Select' },
              { id: 'node' as EditTool, icon: GitCommit, label: 'Add Node' },
              { id: 'path' as EditTool, icon: GitPullRequest, label: 'Link Path' },
              { id: 'delete' as EditTool, icon: Trash2, label: 'Delete' },
            ].map(tool => (
              <button key={tool.id} onClick={() => setEditTool(tool.id)} className={`px-4 py-2.5 flex items-center gap-2 text-sm rounded-xl font-medium transition-all ${editTool === tool.id ? (tool.id === 'delete' ? 'bg-red-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md') : (tool.id === 'delete' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>
                <tool.icon className="h-4 w-4" /> {tool.label}
              </button>  
            ))}

            {editTool === 'select' && selectedNode && !floor.pois.find(p => p.node === selectedNode) && (
              <button onClick={handleCreateRoomFromSelectedNode} className="ml-auto border-2 border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                <Plus className="h-4 w-4" /> Make Room
              </button>
            )}

            {/* Image opacity control */}
            {backgroundImageUrl && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Image:</span>
                <input type="range" min="0" max="100" value={imageOpacity * 100} onChange={(e) => setImageOpacity(Number(e.target.value) / 100)} className="w-24 h-1.5 accent-blue-600" />
                <span className="text-xs text-slate-500 w-8">{Math.round(imageOpacity * 100)}%</span>
              </div>
            )}
            
            <div className="w-full text-xs text-slate-500 mt-2 font-medium bg-blue-50 p-3 rounded-xl border border-blue-100">
              {editTool === 'select' && "Click a node to select it. Click a room label to rename it."}
              {editTool === 'node' && "Click anywhere on the canvas to place a new routing node."}
              {editTool === 'path' && "Click Node A, then Node B to create a walking path between them."}
              {editTool === 'delete' && "Click any node or path line to remove it permanently."}
            </div>
          </div>
        )}

        {/* Map Canvas */}
        <div className={`rounded-2xl border-2 ${editMode ? 'border-blue-400 shadow-blue-100 shadow-lg' : 'border-slate-200'} bg-white p-3 transition-all duration-300 relative overflow-hidden`}>
          <svg 
            viewBox={`0 0 ${floor.width || 1000} ${floor.height || 800}`} 
            className={`w-full rounded-xl bg-slate-50 shadow-inner border border-slate-100 ${
               editMode && editTool === 'node' ? 'cursor-crosshair' : 
               editMode && editTool === 'delete' ? "cursor-not-allowed" : 'cursor-default'
            }`} 
            style={{ minHeight: '480px', maxHeight: '640px' }}
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
               
               return (
                  <g key={n.id} onClick={(e) => handleNodeClick(e, n.id)} className={editMode ? "cursor-pointer" : ""}>
                    <circle 
                       cx={n.x} cy={n.y} 
                       r={isSelected ? 8 : (isStairs ? 6 : 5)} 
                       fill={isSelected ? "#6366f1" : (isStairs ? "#f59e0b" : "#64748b")} 
                       stroke={isSelected ? "#c7d2fe" : "none"}
                       strokeWidth={isSelected ? 3 : 0}
                       className={editMode ? "hover:fill-blue-400 transition-all" : ""}
                    />
                    {isStairs && !editMode && (
                      <text x={n.x + 10} y={n.y + 4} fontSize={10} fill="#92400e" fontWeight="600">🪜</text>
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
                  className={editMode ? "cursor-pointer group" : ""}
                >
                  {/* POI background glow */}
                  <circle cx={node.x} cy={node.y} r={14} fill={isSelected ? "#6366f120" : "#10b98120"} />
                  
                  <circle 
                     cx={node.x} 
                     cy={node.y} 
                     r={isSelected ? 10 : 8} 
                     fill={isSelected || isEditing ? "#6366f1" : "#10b981"} 
                     className={editMode && !isEditing ? "group-hover:fill-blue-500 transition-colors" : "transition-colors"} 
                     stroke={isSelected ? "#c7d2fe" : "#ffffff"}
                     strokeWidth={isSelected ? 3 : 2}
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
    </div>
  );
}
