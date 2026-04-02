import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Navigation, Edit3, X, Save, MousePointer2, GitCommit, GitPullRequest, Trash2 } from 'lucide-react';
import { API_BASE } from '../config/api';
import { findNearestNode, findPath, Node, POI } from '../utils/pathfinding';

type GraphEdge = {
  from: string;
  to: string;
  distance_m?: number;
  weight?: number;
};

type FloorGraph = {
  id: string;
  name: string;
  width: number;
  height: number;
  nodes: Node[];
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
  const [graph, setGraph] = useState<UploadedGraph | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState(0);
  
  // Navigation states
  const [currentLocation, setCurrentLocation] = useState<{ x: number; y: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [path, setPath] = useState<Node[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [editMode, setEditMode] = useState(false);
  const [editTool, setEditTool] = useState<EditTool>('select');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [draftPoiName, setDraftPoiName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!mapId) return;
      try {
        const response = await fetch(`${API_BASE}/maps/${mapId}`, {
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) throw new Error('Could not load uploaded map navigation data');
        const payload = await response.json();
        
        // If graph is entirely missing, let's inject a blank one!
        let g = payload?.analysisResult?.graph as UploadedGraph | undefined;
        if (!g) {
          g = {
             buildings: [{
                name: "Building A",
                floors: [{
                   id: "f1", name: "Floor 1", width: 1000, height: 800, nodes: [], edges: [], pois: []
                }]
             }]
          };
        }
        setMapName(payload?.name || 'Uploaded Map');
        setGraph(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load map data');
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

  // -------------------------------------------------------------
  // GRAPH MUTATION HELPERS
  // -------------------------------------------------------------
  const updateCurrentFloor = (updater: (f: FloorGraph) => FloorGraph) => {
    if (!graph || !floor) return;
    const newGraph = { ...graph };
    const b = newGraph.buildings[selectedBuilding];
    b.floors[selectedFloor] = updater({ ...b.floors[selectedFloor] });
    setGraph(newGraph);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!floor || path.length > 1) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * floor.width;
    const y = ((e.clientY - bounds.top) / bounds.height) * floor.height;

    if (!editMode) {
      const location = { x, y };
      setCurrentLocation(location);
      if (selectedDestination) computeRoute(location, selectedDestination);
      return;
    }

    // Editor Behaviors on Empty Canvas Click
    if (editTool === 'node') {
      const newNodeId = `n_${Date.now()}`;
      updateCurrentFloor((f) => ({
        ...f,
        nodes: [...f.nodes, { id: newNodeId, x, y, kind: 'corridor' }]
      }));
    } else if (editTool === 'select' || editTool === 'path' || editTool === 'delete') {
      // Clear selection if clicking empty space
      setSelectedNode(null);
      setEditingPoi(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode || !floor) return;
    e.stopPropagation();

    if (editTool === 'select') {
      setSelectedNode(nodeId);
      // If the node is a POI, trigger rename input automatically
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
          // Check if edge exists
          const exists = floor.edges.some(eg => 
            (eg.from === selectedNode && eg.to === nodeId) || 
            (eg.to === selectedNode && eg.from === nodeId)
          );
          if (!exists) {
            updateCurrentFloor((f) => ({
              ...f,
              edges: [...f.edges, { from: selectedNode, to: nodeId, distance_m: 5.0 }]
            }));
          }
        }
        setSelectedNode(null); // Finish path segment
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
          newPois[idx].name = trimmed;
        } else if (selectedNode) {
          // Turn node into POI if it isn't one
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
      const newPoiId = `poi_${Date.now()}`;
      updateCurrentFloor((f) => ({
        ...f,
        pois: [...f.pois, { id: newPoiId, name: "New Room", node: selectedNode, icon: 'map-pin' }]
      }));
      setEditingPoi(newPoiId);
      setDraftPoiName("New Room");
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
      alert("Map graph updated successfully!");
    } catch(err) {
      alert(err instanceof Error ? err.message : "Error saving map");
    } finally {
      setIsSaving(false);
    }
  };


  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <button onClick={() => navigate('/dashboard')} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-slate-900">Navigation not available</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!graph || !floor || !building) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600 flex items-center gap-2"><div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" /> Loading map structure...</div>;
  }

  return (
    <div className="min-h-screen items-start bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        
        {/* Top Controls */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4 text-slate-400" /> Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            {editMode && (
              <button 
                onClick={syncGraphToBackend} 
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4"/> {isSaving ? "Saving..." : "Save Graph"}
              </button>
            )}

            <button 
              onClick={() => {
                setEditMode(!editMode);
                setEditingPoi(null);
                setSelectedNode(null);
                setCurrentLocation(null);
                setPath([]);
              }} 
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all shadow-sm ${
                editMode 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-2 ring-indigo-600 ring-offset-1' 
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {editMode ? <><X className="h-4 w-4"/> Done Editing</> : <><Edit3 className="h-4 w-4"/> Enter Map Builder</>}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-indigo-200 rounded-xl shadow-sm mb-4">
            <span className="text-sm font-semibold text-indigo-900 mr-2 uppercase tracking-wide">Builder Tools:</span>
            
            <button onClick={() => setEditTool('select')} className={`px-4 py-2 flex items-center gap-2 text-sm rounded-lg font-medium transition-colors ${editTool === 'select' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <MousePointer2 className="h-4 w-4" /> Select / Rename
            </button>
            
            <button onClick={() => setEditTool('node')} className={`px-4 py-2 flex items-center gap-2 text-sm rounded-lg font-medium transition-colors ${editTool === 'node' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <GitCommit className="h-4 w-4" /> Drop Node
            </button>
            
            <button onClick={() => setEditTool('path')} className={`px-4 py-2 flex items-center gap-2 text-sm rounded-lg font-medium transition-colors ${editTool === 'path' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <GitPullRequest className="h-4 w-4" /> Link Path
            </button>

            <button onClick={() => setEditTool('delete')} className={`px-4 py-2 flex items-center gap-2 text-sm rounded-lg font-medium transition-colors ${editTool === 'delete' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
              <Trash2 className="h-4 w-4" /> Delete Tool
            </button>
            
            {editTool === 'select' && selectedNode && (
              <div className="ml-auto flex items-center">
                <button onClick={handleCreateRoomFromSelectedNode} className="border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
                  + Convert to Room
                </button>
              </div>
            )}
            
            <div className="w-full text-xs text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded">
              {editTool === 'select' && "Click a node or existing room to select/rename it."}
              {editTool === 'node' && "Click anywhere on the blank canvas to drop a routing node constraint."}
              {editTool === 'path' && "Click Node A, then click Node B to tie them together as a valid walking path."}
              {editTool === 'delete' && "Click any node or path line to permanently erase it."}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className={editMode ? "mt-1" : ""}>
            <h1 className="text-2xl font-bold text-slate-900">{mapName}</h1>
          </div>

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
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 ${bIndex === selectedBuilding ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'}`}
              >
                {b.name}
              </button>
            ))}
          </div>

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
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 ${fIndex === selectedFloor ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {!editMode && (
            <div className="mt-6 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <select
                value={selectedDestination}
                onChange={(e) => {
                  const dest = e.target.value;
                  setSelectedDestination(dest);
                  if (currentLocation && dest) {
                    computeRoute(currentLocation, dest);
                  }
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px] shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer"
              >
                <option value="">Select destination...</option>
                {floor.pois.map((poi) => (
                  <option key={poi.id} value={poi.id}>
                    {poi.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setCurrentLocation(null);
                  setSelectedDestination('');
                  setPath([]);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
              >
                Reset Route
              </button>
              {selectedDestination && path.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 border border-green-200 rounded-lg shadow-sm">
                  <Navigation className="h-4 w-4 text-green-500" /> Route mapped successfully
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-xl border ${editMode ? 'border-indigo-400 shadow-indigo-100 outline-indigo-50 outline-4 outline' : 'border-slate-200'} bg-white p-4 shadow-sm transition-all duration-300 relative`}>
          <svg 
            viewBox={`0 0 ${floor.width || 1000} ${floor.height || 800}`} 
            className={`h-[560px] w-full rounded-lg bg-slate-50 shadow-inner border border-slate-100 ${
               editMode && editTool === 'node' ? 'cursor-crosshair' : 
               editMode && editTool === 'delete' ? "cursor-no-drop" : 'cursor-default'
            }`} 
            onClick={handleCanvasClick}
          >
            {/* Background Map Image */}
            {graph.buildings?.[selectedBuilding]?.floors?.[selectedFloor] && (
               <image 
                  href={`${API_BASE}/maps/files/${(graph as any).original_file || (graph as any).file_path || ''}`} 
                  width={floor.width} 
                  height={floor.height} 
                  opacity={0.65}
                  style={{ pointerEvents: 'none' }}
               />
            )}
            {/* Draw Path Highlight Preview if drawing edge */}
            {editMode && editTool === 'path' && selectedNode && (
               // Simple UI cue for "connecting" could go here if we tracked mouse.
               <circle cx={floor.nodes.find(n => n.id === selectedNode)?.x} cy={floor.nodes.find(n => n.id === selectedNode)?.y} r={14} fill="none" stroke="#4f46e5" strokeWidth={2} className="animate-ping" />
            )}
            
            {/* Draw Edges */}
            {floor.edges.map((edge, idx) => {
              const from = floor.nodes.find((n) => n.id === edge.from);
              const to = floor.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <line 
                  key={`${edge.from}-${edge.to}-${idx}`} 
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y} 
                  stroke={editMode && editTool === 'delete' ? "transparent" : "#cbd5e1"} 
                  strokeWidth={4} 
                  strokeLinecap="round" 
                  className={editMode && editTool === 'delete' ? "hover:stroke-red-400 cursor-pointer stroke-slate-300 transition-colors" : ""}
                  onClick={(e) => handleEdgeClick(e, idx)}
                />
              );
            })}

            {/* Draw Standard Nodes */}
            {floor.nodes.map((n) => {
               const isSelected = selectedNode === n.id;
               const isPOI = floor.pois.some(p => p.node === n.id);
               if (isPOI) return null; // Drawn below
               
               return (
                  <circle 
                     key={n.id} 
                     cx={n.x} cy={n.y} 
                     r={isSelected ? 6 : 4} 
                     fill={isSelected ? "#4f46e5" : "#64748b"} 
                     className={editMode ? "cursor-pointer hover:fill-indigo-400 transition-all" : ""}
                     onClick={(e) => handleNodeClick(e, n.id)}
                  />
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
                  <circle 
                     cx={node.x} 
                     cy={node.y} 
                     r={isSelected ? 10 : 8} 
                     fill={isSelected || isEditing ? "#4f46e5" : "#10b981"} 
                     className={editMode && !isEditing ? "group-hover:fill-indigo-500 transition-colors duration-200" : "transition-colors duration-200"} 
                     stroke={isSelected ? "#c7d2fe" : "none"}
                     strokeWidth={isSelected ? 4 : 0}
                  />
                  
                  {isEditing ? (
                    <foreignObject x={node.x + 12} y={node.y - 14} width={200} height={40}>
                       <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                         <input 
                           autoFocus
                           className="px-2 py-1 text-xs text-slate-800 bg-white border-2 border-indigo-500 rounded-md outline-none shadow-lg w-32 font-medium"
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
                    <text 
                      x={node.x + 12} 
                      y={node.y + 4} 
                      fontSize={13} 
                      className={`font-medium select-none ${editMode ? 'fill-slate-600 group-hover:fill-indigo-700 transition-colors duration-200' : 'fill-slate-700'}`}
                    >
                      {poi.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compute Navigation Path Display */}
            {!editMode && path.length > 1 && (
              <polyline
                points={path.map((n) => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-[dash_1s_linear_infinite]"
              />
            )}

            {/* Current Selected User Location */}
            {!editMode && currentLocation && (
              <g>
                <circle cx={currentLocation.x} cy={currentLocation.y} r={8} fill="#ef4444" className="animate-pulse" />
                <rect x={currentLocation.x + 12} y={currentLocation.y - 12} width={36} height={20} rx={4} fill="#fef2f2" stroke="#fca5a5" />
                <text x={currentLocation.x + 16} y={currentLocation.y + 2} fontSize={10} fill="#b91c1c" fontWeight="bold">
                  You
                </text>
              </g>
            )}

            {/* Current Route Destination */}
            {!editMode && destinationNode && (
              <g>
                <circle cx={destinationNode.x} cy={destinationNode.y} r={10} fill="#4f46e5" />
                <circle cx={destinationNode.x} cy={destinationNode.y} r={4} fill="#ffffff" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
