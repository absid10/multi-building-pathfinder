import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
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
    if (!floor || path.length > 1) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * floor.width;
    const y = ((e.clientY - bounds.top) / bounds.height) * floor.height;
    const location = { x, y };
    setCurrentLocation(location);
    if (selectedDestination) {
      computeRoute(location, selectedDestination);
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
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading navigation...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{mapName} Navigation</h1>
          <p className="text-sm text-slate-600">Choose building/floor, set location, then select destination.</p>

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
                className={`rounded-lg px-3 py-1.5 text-sm ${bIndex === selectedBuilding ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
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
                }}
                className={`rounded-lg px-3 py-1.5 text-sm ${fIndex === selectedFloor ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={selectedDestination}
              onChange={(e) => {
                const dest = e.target.value;
                setSelectedDestination(dest);
                if (currentLocation && dest) {
                  computeRoute(currentLocation, dest);
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            {selectedDestination && path.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                <Navigation className="h-3.5 w-3.5" /> Route ready
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <svg viewBox={`0 0 ${floor.width} ${floor.height}`} className="h-[560px] w-full rounded-lg bg-slate-50" onClick={handleCanvasClick}>
            {floor.edges.map((edge, idx) => {
              const from = floor.nodes.find((n) => n.id === edge.from);
              const to = floor.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return <line key={`${edge.from}-${edge.to}-${idx}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#cbd5e1" strokeWidth={2} />;
            })}

            {path.length > 1 && (
              <polyline
                points={path.map((n) => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {floor.nodes.map((n) => (
              <circle key={n.id} cx={n.x} cy={n.y} r={4} fill="#64748b" />
            ))}

            {floor.pois.map((poi) => {
              const node = floor.nodes.find((n) => n.id === poi.node);
              if (!node) return null;
              return (
                <g key={poi.id}>
                  <circle cx={node.x} cy={node.y} r={7} fill="#16a34a" />
                  <text x={node.x + 8} y={node.y - 8} fontSize={12} fill="#0f172a">
                    {poi.name}
                  </text>
                </g>
              );
            })}

            {currentLocation && (
              <g>
                <circle cx={currentLocation.x} cy={currentLocation.y} r={9} fill="#ef4444" />
                <text x={currentLocation.x + 10} y={currentLocation.y + 4} fontSize={12} fill="#7f1d1d">
                  You
                </text>
              </g>
            )}

            {destinationNode && (
              <g>
                <circle cx={destinationNode.x} cy={destinationNode.y} r={9} fill="#2563eb" />
                <text x={destinationNode.x + 10} y={destinationNode.y + 4} fontSize={12} fill="#1e3a8a">
                  Destination
                </text>
              </g>
            )}
          </svg>

          <p className="mt-3 text-xs text-slate-500">
            Click on map to set your current location. Then choose destination to generate route.
          </p>
        </div>
      </div>
    </div>
  );
}
