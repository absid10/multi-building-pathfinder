import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Globe, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MapUpload from '../components/MapUpload';
import PublicMapsViewer from '../components/PublicMapsViewer';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'public' | 'your-maps'>('public');
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Dashboard</h1>
          <p className="text-gray-600">
            Manage your maps and explore public hospital layouts
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-2 ${
              activeTab === 'public'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="w-5 h-5" />
            Public Maps
          </button>
          <button
            onClick={() => setActiveTab('your-maps')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-2 ${
              activeTab === 'your-maps'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="w-5 h-5" />
            Your Maps
          </button>
        </div>

        {/* Public Maps Tab */}
        {activeTab === 'public' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <PublicMapsViewer
              onSelectMap={(map) => {
                console.log('Selected map:', map);
              }}
              onExploreMap={(map) => navigate(`/navigate/${map.id}`)}
            />
          </div>
        )}

        {/* Your Maps Tab */}
        {activeTab === 'your-maps' && (
          <div className="space-y-6">
            {!isLoggedIn ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h2>
                <p className="text-gray-600 mb-6">
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
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex items-center gap-3 mb-6">
                  <UploadCloud className="w-8 h-8 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Upload New Map</h2>
                </div>
                <MapUpload />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
