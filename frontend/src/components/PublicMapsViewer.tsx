import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin } from 'lucide-react';
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

  const selectedMap = maps.find((m) => m.id === selectedMapId) || maps[0] || null;

  useEffect(() => {
    if (selectedMap) onSelectMap(selectedMap);
  }, [selectedMap, onSelectMap]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-lg font-semibold text-gray-900 mb-2">
          Publicly Accessible Maps
        </label>
        <p className="text-sm text-gray-600 mb-3">Select a map</p>
        <select
          value={selectedMap?.id || ''}
          onChange={(e) => setSelectedMapId(e.target.value)}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
        >
          <option value="">-- Select a map --</option>
          {maps.map((map) => (
            <option key={map.id} value={map.id}>
              {map.name}
            </option>
          ))}
        </select>
      </div>

      {selectedMap && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h2 className="text-3xl font-bold mb-2">{selectedMap.name}</h2>
            <p className="text-blue-100">{selectedMap.description}</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{selectedMap.buildingCount}</p>
                <p className="text-sm text-gray-600">Buildings</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{selectedMap.floorCount}</p>
                <p className="text-sm text-gray-600">Floors</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">✓</p>
                <p className="text-sm text-gray-600">By {selectedMap.uploadedBy}</p>
              </div>
            </div>

            {selectedMap.thumbnail ? (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img src={selectedMap.thumbnail} alt={selectedMap.name} className="w-full h-64 object-cover" />
              </div>
            ) : (
              <div className="mb-6 bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Building2 className="w-16 h-16 mx-auto mb-2 opacity-30" />
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
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Explore Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
