import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Database, RefreshCcw } from 'lucide-react';
import { API_BASE } from '../config/api';

interface TrainingMap {
  id: string;
  name: string;
  source: string;
  fileType: string;
  relativePath: string;
  addedAt: string;
}

interface TrainingModel {
  version?: string;
  trainedAt?: string;
  sampleCount?: number;
  avgBuildingCount?: number;
  avgFloorCount?: number;
}

interface TrainingMapsPanelProps {
  isLoggedIn: boolean;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function TrainingMapsPanel({ isLoggedIn }: TrainingMapsPanelProps) {
  const [maps, setMaps] = useState<TrainingMap[]>([]);
  const [model, setModel] = useState<TrainingModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/maps/training`);
      if (!response.ok) return;
      const payload = await response.json();
      setMaps((payload?.maps || []) as TrainingMap[]);
      setModel((payload?.model || null) as TrainingModel | null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const sourceSummary = useMemo(() => {
    return maps.reduce<Record<string, number>>((acc, map) => {
      const key = map.source || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [maps]);

  const retrain = async () => {
    if (!isLoggedIn) return;
    setRetraining(true);
    try {
      const response = await fetch(`${API_BASE}/maps/training/retrain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (!response.ok) return;
      await loadOverview();
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            AI Training Maps
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Map files currently used to train layout-to-graph conversion.
          </p>
        </div>
        <button
          onClick={retrain}
          disabled={!isLoggedIn || retraining}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${retraining ? 'animate-spin' : ''}`} />
          Retrain
        </button>
      </div>

      {model && (
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Samples</p>
            <p className="font-semibold text-slate-900">{model.sampleCount ?? maps.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Model Version</p>
            <p className="font-semibold text-slate-900">{model.version || '1.0'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Avg Buildings</p>
            <p className="font-semibold text-slate-900">{model.avgBuildingCount ?? 1}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Avg Floors</p>
            <p className="font-semibold text-slate-900">{model.avgFloorCount ?? 1}</p>
          </div>
        </div>
      )}

      {Object.keys(sourceSummary).length > 0 && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
          <p className="font-semibold mb-1 flex items-center gap-1">
            <Database className="h-3.5 w-3.5" />
            Sources
          </p>
          <p>
            {Object.entries(sourceSummary)
              .map(([source, count]) => `${source}: ${count}`)
              .join(' | ')}
          </p>
        </div>
      )}

      <div className="max-h-[380px] overflow-auto pr-1 space-y-2">
        {loading && <p className="text-xs text-slate-500">Loading training dataset...</p>}
        {!loading && maps.length === 0 && (
          <p className="text-xs text-slate-500">No training maps indexed yet.</p>
        )}

        {maps.map((map) => (
          <div key={map.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">{map.name}</p>
            <p className="text-xs text-slate-600 mt-1">
              Source: {map.source} | Type: {map.fileType.toUpperCase()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 break-all">{map.relativePath}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
