import React, { useEffect, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader, Map as MapIcon, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../config/api';
import { useNavigate } from 'react-router-dom';

export interface UploadedMap {
  id: string;
  name: string;
  status: 'analyzing' | 'analyzed' | 'error';
  progress: number;
  buildingCount?: number;
  floorCount?: number;
  isPublic: boolean;
  uploadDate: string;
  thumbnail?: string;
  error?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MapUpload() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedMaps, setUploadedMaps] = useState<UploadedMap[]>([]);
  const [renamingMapId, setRenamingMapId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    const loadMaps = async () => {
      try {
        const response = await fetch(`${API_BASE}/maps/list`, {
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const normalized: UploadedMap[] = (payload || []).map((m: any) => ({
          id: String(m.id),
          name: m.name,
          status: m.status,
          progress: m.status === 'analyzed' ? 100 : 60,
          buildingCount: m.buildingCount,
          floorCount: m.floorCount,
          isPublic: Boolean(m.isPublic),
          uploadDate: new Date(m.uploadDate).toLocaleString(),
          thumbnail: m.thumbnail,
          error: m.error,
        }));
        setUploadedMaps(normalized);
      } catch {
        // Ignore bootstrap load failures.
      }
    };

    loadMaps();
  }, []);

  useEffect(() => {
    const pending = uploadedMaps.filter((m) => m.status === 'analyzing' && !m.id.startsWith('temp-'));
    if (pending.length === 0) return;

    const intervalId = window.setInterval(async () => {
      for (const map of pending) {
        try {
          const response = await fetch(`${API_BASE}/maps/${map.id}/status`, {
            headers: { ...getAuthHeader() },
          });
          if (!response.ok) continue;
          const status = await response.json();
          setUploadedMaps((prev) =>
            prev.map((m) => {
              if (m.id !== map.id) return m;
              const nextStatus = (status.status || 'analyzing') as UploadedMap['status'];
              return {
                ...m,
                status: nextStatus,
                buildingCount: status.buildingCount ?? m.buildingCount,
                floorCount: status.floorCount ?? m.floorCount,
                error: status.error ?? m.error,
                progress: nextStatus === 'analyzed' ? 100 : nextStatus === 'error' ? 0 : 80,
              };
            })
          );
        } catch {
          // Keep polling
        }
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [uploadedMaps]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
        alert('Only PNG, JPG, and PDF architectural layouts are supported.');
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setUploadedMaps((prev) => [
        {
          id: tempId,
          name: file.name,
          status: 'analyzing',
          progress: 25,
          isPublic: false,
          uploadDate: new Date().toLocaleString(),
        },
        ...prev,
      ]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE}/maps/upload`, {
          method: 'POST',
          headers: { ...getAuthHeader() },
          body: formData,
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || 'Upload failed');
        }

        const map = await response.json();
        setUploadedMaps((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: String(map.id),
                  name: map.name,
                  status: map.status,
                  progress: map.status === 'analyzed' ? 100 : 70,
                  buildingCount: map.buildingCount,
                  floorCount: map.floorCount,
                  isPublic: Boolean(map.isPublic),
                  uploadDate: new Date(map.uploadDate).toLocaleString(),
                  thumbnail: map.thumbnail,
                  error: map.error,
                }
              : m
          )
        );

        // Auto-navigate to the map editor after successful analysis
        if (map.status === 'analyzed') {
          navigate(`/navigate/upload/${map.id}`);
        }
      } catch (err) {
        setUploadedMaps((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: 'error',
                  progress: 0,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : m
          )
        );
      }
    }
  };

  const toggleMapVisibility = async (mapId: string) => {
    const map = uploadedMaps.find((m) => m.id === mapId);
    if (!map) return;

    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ isPublic: !map.isPublic }),
      });

      if (!response.ok) throw new Error('Privacy update failed');
      const payload = await response.json();
      setUploadedMaps((prev) =>
        prev.map((m) => (m.id === mapId ? { ...m, isPublic: Boolean(payload.isPublic) } : m))
      );
    } catch {
      alert('Could not update visibility.');
    }
  };

  const deleteMap = async (mapId: string) => {
    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (!response.ok) throw new Error('Delete failed');
      setUploadedMaps((prev) => prev.filter((m) => m.id !== mapId));
    } catch {
      alert('Could not delete map.');
    }
  };

  const startRename = (map: UploadedMap) => {
    setRenamingMapId(map.id);
    setRenameDraft(map.name);
  };

  const saveRename = async (mapId: string) => {
    const name = renameDraft.trim();
    if (!name) return alert('Name cannot be empty.');

    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error('Rename failed');
      const payload = await response.json();
      setUploadedMaps((prev) =>
        prev.map((m) => (m.id === mapId ? { ...m, name: payload.name } : m))
      );
      setRenamingMapId(null);
    } catch (err) {
      alert('Could not rename map');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Upload Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center transition-all duration-200">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-10 transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
              : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title=""
          />
          <div className="pointer-events-none flex flex-col items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/50 dark:text-indigo-400">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Upload Architectural Layout
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Drag and drop your floorplans here to start AI mapping
              </p>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              Supported: PNG, JPG, PDF
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Maps */}
      {uploadedMaps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 px-1">
            Your Scanned Layouts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploadedMaps.map((map) => (
              <div
                key={map.id}
                className="group flex flex-col p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {map.status === 'analyzing' ? (
                      <Loader className="w-6 h-6 text-indigo-500 animate-spin" />
                    ) : map.thumbnail ? (
                      <img src={map.thumbnail} alt={map.name} className="w-full h-full object-cover" />
                    ) : (
                      <MapIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {renamingMapId === map.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(map.id)}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                        <button onClick={() => saveRename(map.id)} className="text-indigo-600 font-medium text-sm">Save</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={map.name}>
                          {map.name}
                        </h4>
                        {map.status === 'analyzing' && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full dark:bg-indigo-500/10 dark:text-indigo-400">
                            Scanning...
                          </span>
                        )}
                        {map.status === 'error' && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                      Uploaded {map.uploadDate.split(',')[0]}
                    </p>

                    {/* Metadata / Error */}
                    {map.error ? (
                      <p className="text-xs text-red-500 truncate" title={map.error}>{map.error}</p>
                    ) : map.buildingCount ? (
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          {map.buildingCount} Building{map.buildingCount !== 1 && 's'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          {map.floorCount} Floor{map.floorCount !== 1 && 's'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-3">
                    <button
                      onClick={() => startRename(map)}
                      className="text-slate-500 hover:text-indigo-600 transition"
                      title="Rename Layout"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {map.status === 'analyzed' && (
                      <button
                        onClick={() => toggleMapVisibility(map.id)}
                        className={`transition ${map.isPublic ? 'text-green-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        title={map.isPublic ? "Currently Public" : "Currently Private"}
                      >
                        {map.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMap(map.id)}
                      className="text-slate-500 hover:text-red-600 transition"
                      title="Delete Map"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {map.status === 'analyzed' && (
                      <button
                        onClick={() => navigate(`/navigate/upload/${map.id}`)}
                        className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shadow-sm"
                      >
                        Explore Graph
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
