import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Globe, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MapUpload from '../components/MapUpload';
import PublicMapsViewer from '../components/PublicMapsViewer';
import TrainingMapsPanel from '../components/TrainingMapsPanel';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'public' | 'your-maps'>('public');
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-slate-100">Navigation Control Center</h1>
          <p className="text-gray-600 dark:text-slate-300">Manage public map discovery and your upload workspace from one place.</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/40">
              <p className="text-xs uppercase tracking-wide text-sky-700">Map Operations</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Upload, review, and publish map assets.</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Wayfinding</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Run floor-aware navigation for selected maps.</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/40">
              <p className="text-xs uppercase tracking-wide text-violet-700">Sharing</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Control visibility for public map access.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-8 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition ${
              activeTab === 'public'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <Globe className="w-5 h-5" />
            Public Maps
          </button>
          <button
            onClick={() => setActiveTab('your-maps')}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition ${
              activeTab === 'your-maps'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <Lock className="w-5 h-5" />
            Your Maps
          </button>
        </div>

        {/* Public Maps Tab */}
        {activeTab === 'public' && (
          <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm dark:border-slate-800">
            <PublicMapsViewer
              onSelectMap={(map) => {
                console.log('Selected map:', map);
              }}
              onExploreMap={(map) => {
                if (map.id.startsWith('user-')) {
                  navigate(`/navigate/upload/${map.id.replace('user-', '')}`);
                  return;
                }
                navigate(`/navigate/${map.id}`);
              }}
            />
          </div>
        )}

        {/* Your Maps Tab */}
        {activeTab === 'your-maps' && (
          <div className="space-y-6">
            {!isLoggedIn ? (
              <div className="rounded-2xl border border-slate-200 bg-card p-8 text-center shadow-sm dark:border-slate-800">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 dark:text-slate-100">Login Required</h2>
                <p className="text-gray-600 mb-6 dark:text-slate-300">
                  Sign in to upload maps and manage your private/public map list.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Home and Login
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm dark:border-slate-800 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-6">
                    <UploadCloud className="w-8 h-8 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Upload New Map</h2>
                  </div>
                  <MapUpload />
                </div>
                <TrainingMapsPanel isLoggedIn={isLoggedIn} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
