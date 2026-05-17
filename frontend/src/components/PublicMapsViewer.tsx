import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search, Navigation, QrCode, Copy, Download } from 'lucide-react';
import { API_BASE } from '../config/api';
import CampusPreview from './CampusPreview';

const SEEDED_UPLOADER_NAME = 'Abdullah';

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
    description: 'Government Hospital Map Chh. Sambhajinagar',
    buildingCount: 2,
    floorCount: 3,
    uploadedBy: SEEDED_UPLOADER_NAME,
    isPublic: true,
    thumbnail: '/maps/gmch-campus.jpg',
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

  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const openQrFor = (map: PublicMap) => {
    const url = `${window.location.origin}/navigate/${map.id}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
    setQrUrl(qr);
    setQrOpen(true);
  };

  useEffect(() => {
    if (selectedMap) onSelectMap(selectedMap);
  }, [selectedMap, onSelectMap]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm dark:border-slate-800">
        <label className="mb-2 block text-lg font-semibold text-foreground">Publicly Accessible Maps</label>
        <p className="mb-4 text-sm text-muted-foreground">Search maps and choose one to start wayfinding.</p>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400 dark:text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by map name, description, or uploader"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {filteredMaps.map((map) => (
            <div key={map.id} className={`relative rounded-xl border p-3 transition ${
              selectedMap?.id === map.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700'
            }`}>
              <button onClick={() => setSelectedMapId(map.id)} className="text-left w-full">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{map.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{map.description} - Uploaded by {map.uploadedBy}</p>
              </button>
              <button onClick={() => openQrFor(map)} title="Share (QR)" className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50">
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!selectedMap) return;
                  if (onExploreMap) {
                    onExploreMap(selectedMap);
                    return;
                  }
                  onSelectMap(selectedMap);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Navigation className="h-5 w-5" />
                Explore Map
              </button>
              <button
                onClick={() => { if (selectedMap) openQrFor(selectedMap); }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                title="Share (QR)"
              >
                <QrCode className="h-5 w-5" />
                QR
              </button>
            </div>
                <p className="text-sm text-gray-600 dark:text-slate-300">Buildings</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950/40">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
    {qrOpen && qrUrl && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Share this map</h3>
          <div className="flex flex-col items-center gap-3">
            <img src={qrUrl} alt="QR code" className="w-56 h-56 bg-white rounded" />
            <div className="flex gap-2 w-full">
              <button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard'); } catch { alert('Could not copy'); } }} className="flex-1 inline-flex items-center gap-2 justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm"> <Copy className="h-4 w-4"/> Copy link</button>
              <button onClick={() => { const a = document.createElement('a'); a.href = qrUrl; a.download = 'map-link-qr.png'; document.body.appendChild(a); a.click(); a.remove(); }} className="flex-1 inline-flex items-center gap-2 justify-center rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm"> <Download className="h-4 w-4"/> Download</button>
            </div>
            <button onClick={() => { setQrOpen(false); setQrUrl(null); }} className="mt-2 text-xs text-slate-600">Close</button>
          </div>
        </div>
      </div>
    )}
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{selectedMap.floorCount}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Floors</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-950/40">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">✓</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">By {selectedMap.uploadedBy}</p>
              </div>
            </div>

            <div className="mb-6">
              {selectedMap.thumbnail ? (
                <div className="overflow-hidden rounded-lg">
                  <img src={selectedMap.thumbnail} alt={selectedMap.name} className="h-64 w-full object-cover" />
                </div>
              ) : (
                <CampusPreview
                  mapName={selectedMap.name}
                  buildingCount={selectedMap.buildingCount}
                  floorCount={selectedMap.floorCount}
                />
              )}
            </div>

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
