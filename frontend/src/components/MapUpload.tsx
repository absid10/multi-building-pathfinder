import React, { useEffect, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { API_BASE } from '../config/api';

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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedMaps, setUploadedMaps] = useState<UploadedMap[]>([]);
  const [currentAnalyzing, setCurrentAnalyzing] = useState<string | null>(null);

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
        alert('Only PNG, JPG, and PDF files are supported');
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setCurrentAnalyzing(tempId);
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
      } finally {
        setTimeout(() => setCurrentAnalyzing(null), 400);
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
        prev.map((m) =>
          m.id === mapId
            ? {
                ...m,
                isPublic: Boolean(payload.isPublic),
              }
            : m
        )
      );
    } catch {
      alert('Could not update visibility. Please try again.');
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
      alert('Could not delete map. Please try again.');
    }
  };

  const analyzingMap = uploadedMaps.find((m) => m.id === currentAnalyzing);

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        }`}
      >
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="flex flex-col items-center gap-3 cursor-pointer">
          <Upload className="w-12 h-12 text-blue-600" />
          <div>
            <p className="text-lg font-semibold text-gray-900">Drag and drop your architectural maps here</p>
            <p className="text-sm text-gray-600 mt-1">or click to select PNG, JPG, or PDF files</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">Supported formats: PNG, JPG, PDF (up to 25MB each)</p>
        </label>
      </div>

      {currentAnalyzing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Map</h3>
            <p className="text-gray-600 mb-6">Our AI is analyzing your architectural layout...</p>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3 justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>File uploaded successfully</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                <span>Detecting buildings and floors...</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                <span>Extracting waypoints</span>
              </div>
            </div>
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analyzingMap?.progress || 20}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{(analyzingMap?.progress || 20).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      {uploadedMaps.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Your Uploaded Maps</h3>
          <div className="space-y-3">
            {uploadedMaps.map((map) => (
              <div key={map.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                  {map.thumbnail ? (
                    <img src={map.thumbnail} alt={map.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">PDF</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{map.name}</h4>
                    {map.status === 'analyzed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                    {map.status === 'analyzing' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        <Loader className="w-3 h-3 animate-spin" />
                        Analyzing
                      </span>
                    )}
                    {map.status === 'error' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{map.uploadDate}</p>
                  {map.buildingCount && map.floorCount && (
                    <p className="text-xs text-gray-600 mt-1">{map.buildingCount} building(s), {map.floorCount} floor(s)</p>
                  )}
                  {map.error && <p className="text-xs text-red-600 mt-1">{map.error}</p>}
                </div>

                <div className="flex gap-2">
                  {map.status === 'analyzed' && (
                    <button
                      onClick={() => toggleMapVisibility(map.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                        map.isPublic ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {map.isPublic ? 'Public' : 'Private'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteMap(map.id)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
