import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Edit3, X } from 'lucide-react';
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
  const [currentLocation, setCurrentLocation] = useState<{ x: number; y: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [path, setPath] = useState<Node[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [editMode, setEditMode] = useState(false);
  const [editingPoi, setEditingPoi] = useState<string | null>(null);
  const [draftPoiName, setDraftPoiName] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!mapId) return;
      try {
        const response = await fetch(`${API_BASE}/maps/${mapId}`, {
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) {
          throw new Error('Could not load uploaded map navigation data');
        }
        const payload = await response.json();
        const g = payload?.analysisResult?.graph as UploadedGraph | undefined;
        if (!g || !Array.isArray(g.buildings) || g.buildings.length === 0) {
          throw new Error('Navigation graph is not available for this map yet');
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
    const route = findPath(startNode, endNode, floor.nodes, floorEdges);
    setPath(route);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (editMode || !floor || path.length > 1) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * floor.width;
    const y = ((e.clientY - bounds.top) / bounds.height) * floor.height;
    const location = { x, y };
    setCurrentLocation(location);
    if (selectedDestination) {
      computeRoute(location, selectedDestination);
    }
  };

  const savePoiName = async (poiId: string) => {
    if (!draftPoiName.trim() || !mapId || selectedBuilding === null || selectedFloor === null) return;
    
    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}/graph/poi`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          poiId,
          name: draftPoiName.trim(),
          buildingIndex: selectedBuilding,
          floorIndex: selectedFloor
        })
      });

      if (!response.ok) throw new Error('Failed to rename room');
      
      const data = await response.json();
      setGraph(data.graph);
      setEditingPoi(null);
    } catch(e) {
      alert(e instanceof Error ? e.message : 'Error renaming room');
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
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600 flex items-center gap-2"><div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" /> Loading navigation...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        
        {/* Top Controls */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-400" /> Dashboard
          </button>
          
          <button 
            onClick={() => {
              setEditMode(!editMode);
              setEditingPoi(null);
              setCurrentLocation(null);
              setPath([]);
            }} 
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all shadow-sm ${
              editMode 
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-2 ring-indigo-600 ring-offset-1' 
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {editMode ? <><X className="h-4 w-4"/> Done Editing</> : <><Edit3 className="h-4 w-4"/> Rename Rooms</>}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          {editMode && (
             <div className="absolute top-0 right-0 left-0 bg-indigo-600 text-white text-xs font-bold text-center py-1 tracking-wider uppercase">
               Graph Edit Mode Active
             </div>
          )}
          
          <div className={editMode ? "mt-4" : ""}>
            <h1 className="text-2xl font-bold text-slate-900">{mapName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {editMode 
                ? "Click on any green room indicator below to rename it." 
                : "Choose building/floor, set location, then select destination."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
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
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 ${bIndex === selectedBuilding ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 ${fIndex === selectedFloor ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px] shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
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
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                Reset
              </button>
              {selectedDestination && path.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 border border-green-200 rounded-lg shadow-sm">
                  <Navigation className="h-4 w-4 text-green-500" /> Route mapped successfully
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-xl border ${editMode ? 'border-indigo-300 shadow-indigo-100' : 'border-slate-200'} bg-white p-4 shadow-sm transition-all duration-300`}>
          <svg viewBox={`0 0 ${floor.width} ${floor.height}`} className={`h-[560px] w-full rounded-lg bg-slate-50 border border-slate-100 ${editMode ? 'pointer-events-auto' : 'cursor-crosshair'}`} onClick={handleCanvasClick}>
            
            {/* Draw Edges */}
            {floor.edges.map((edge, idx) => {
              const from = floor.nodes.find((n) => n.id === edge.from);
              const to = floor.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return <line key={`${edge.from}-${edge.to}-${idx}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" />;
            })}

            {/* Draw Path */}
            {!editMode && path.length > 1 && (
              <polyline
                points={path.map((n) => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-[dash_1s_linear_infinite]"
              />
            )}

            {/* Draw Nodes */}
            {floor.nodes.map((n) => (
              <circle key={n.id} cx={n.x} cy={n.y} r={4} fill="#64748b" />
            ))}

            {/* Draw POIs */}
            {floor.pois.map((poi) => {
              const node = floor.nodes.find((n) => n.id === poi.node);
              if (!node) return null;
              const isEditing = editingPoi === poi.id;
              
              return (
                <g 
                  key={poi.id} 
                  onClick={(e) => {
                    if (editMode) {
                       e.stopPropagation();
                       setEditingPoi(poi.id);
                       setDraftPoiName(poi.name);
                    }
                  }}
                  className={editMode ? "cursor-pointer group" : ""}
                >
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={8} 
                    fill={isEditing ? "#4f46e5" : "#10b981"} 
                    className={editMode && !isEditing ? "group-hover:fill-indigo-500 transition-colors duration-200" : "transition-colors duration-200"} 
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
                             if(e.key === 'Enter') savePoiName(poi.id); 
                             if(e.key === 'Escape') setEditingPoi(null); 
                           }}
                           onBlur={() => savePoiName(poi.id)}
                         />
                       </div>
                    </foreignObject>
                  ) : (
                    <text 
                      x={node.x + 12} 
                      y={node.y + 4} 
                      fontSize={13} 
                      className={`font-medium ${editMode ? 'fill-slate-600 group-hover:fill-indigo-700 transition-colors duration-200' : 'fill-slate-700'}`}
                    >
                      {poi.name}
                    </text>
                  )}
                </g>
              );
            })}

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
