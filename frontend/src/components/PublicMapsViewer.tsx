import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search, Navigation } from 'lucide-react';
import { API_BASE } from '../config/api';

export interface PublicMap {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  buildingCount: number;
  floorCount: number;
  uploadedBy: string;
  isPublic: boolean;
}

interface PublicMapsViewerProps {
  onSelectMap: (map: PublicMap) => void;
  onExploreMap?: (map: PublicMap) => void;
}

const seedMaps: PublicMap[] = [
  {
    id: 'gmch-chhatrapati',
    name: 'GMCH Chhatrapati Sambhajinagar',
    description: 'Publicly accessible map',
    buildingCount: 2,
    floorCount: 3,
    uploadedBy: 'Platform',
    isPublic: true,
  },
  {
    id: 'current-hospital-demo',
    name: 'Current Hospital Demo Map',
    description: 'OPD + Casualty multi-building demo map',
    buildingCount: 2,
    floorCount: 3,
    uploadedBy: 'Platform',
    isPublic: true,
  },
];

export default function PublicMapsViewer({ onSelectMap, onExploreMap }: PublicMapsViewerProps) {
  const [apiMaps, setApiMaps] = useState<PublicMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState(seedMaps[0].id);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadPublicMaps = async () => {
      try {
        const response = await fetch(`${API_BASE}/maps/public`);
        if (!response.ok) return;
        const payload = await response.json();
        const normalized: PublicMap[] = (payload || []).map((m: any) => ({
          id: `user-${m.id}`,
          name: m.name,
          description: 'Community uploaded public map',
          thumbnail: m.thumbnail,
          buildingCount: m.buildingCount || 1,
          floorCount: m.floorCount || 1,
          uploadedBy: m.uploadedBy || 'Unknown',
          isPublic: true,
        }));
        setApiMaps(normalized);
      } catch {
        // Keep seed maps if API is unavailable.
      }
    };

    loadPublicMaps();
  }, []);

  const maps = useMemo(() => {
    const byId = new Map<string, PublicMap>();
    [...seedMaps, ...apiMaps].forEach((m) => byId.set(m.id, m));
    return Array.from(byId.values());
  }, [apiMaps]);

  const filteredMaps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) => `${m.name} ${m.description} ${m.uploadedBy}`.toLowerCase().includes(q));
  }, [maps, query]);

  const selectedMap = filteredMaps.find((m) => m.id === selectedMapId)
    || maps.find((m) => m.id === selectedMapId)
    || filteredMaps[0]
    || maps[0]
    || null;

  useEffect(() => {
    if (selectedMap) onSelectMap(selectedMap);
  }, [selectedMap, onSelectMap]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-lg font-semibold text-gray-900">Publicly Accessible Maps</label>
        <p className="mb-4 text-sm text-gray-600">Search maps and choose one to start wayfinding.</p>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by map name, description, or uploader"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {filteredMaps.map((map) => (
            <button
              key={map.id}
              onClick={() => setSelectedMapId(map.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedMap?.id === map.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="font-semibold text-slate-800">{map.name}</p>
              <p className="mt-1 text-xs text-slate-500">{map.description}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedMap && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
            <h2 className="mb-2 text-3xl font-bold">{selectedMap.name}</h2>
            <p className="text-blue-100">{selectedMap.description}</p>
          </div>

          <div className="p-6">
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <p className="text-2xl font-bold text-gray-900">{selectedMap.buildingCount}</p>
                <p className="text-sm text-gray-600">Buildings</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="text-2xl font-bold text-gray-900">{selectedMap.floorCount}</p>
                <p className="text-sm text-gray-600">Floors</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">✓</p>
                <p className="text-sm text-gray-600">By {selectedMap.uploadedBy}</p>
              </div>
            </div>

            {selectedMap.thumbnail ? (
              <div className="mb-6 overflow-hidden rounded-lg">
                <img src={selectedMap.thumbnail} alt={selectedMap.name} className="h-64 w-full object-cover" />
              </div>
            ) : (
              <div className="mb-6 flex h-64 items-center justify-center rounded-lg bg-gray-100">
                <div className="text-center text-gray-500">
                  <Building2 className="mx-auto mb-2 h-16 w-16 opacity-30" />
                  <p>Map preview not available</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (!selectedMap) return;
                if (onExploreMap) {
                  onExploreMap(selectedMap);
                  return;
                }
                onSelectMap(selectedMap);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <Navigation className="h-5 w-5" />
              Explore Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
