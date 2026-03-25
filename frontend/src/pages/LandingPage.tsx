import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Building2, ChevronRight } from 'lucide-react';
import PublicMapsViewer, { PublicMap } from '../components/PublicMapsViewer';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const [selectedMap, setSelectedMap] = useState<PublicMap | null>(null);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleExploreMap = () => {
    navigate(`/navigate/${selectedMap?.id || 'gmch-chhatrapati'}`);
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Find Your Way Indoors
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Navigate complex buildings with precision. Explore public hospital maps,
            or upload your own and make it available to others.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Precise Navigation
            </h3>
            <p className="text-gray-600 text-sm">
              Get turn-by-turn directions with distance and time estimates
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Multi-Building Support
            </h3>
            <p className="text-gray-600 text-sm">
              Navigate across multiple buildings and floors seamlessly
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Share Maps Publicly
            </h3>
            <p className="text-gray-600 text-sm">
              Upload your layouts and make them available for everyone
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.scrollTo({ top: document.getElementById('explore')?.offsetTop || 0, behavior: 'smooth' })}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            Explore Maps
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (!isLoggedIn) {
                alert('Please sign up or login to upload maps!');
              } else {
                navigate('/dashboard');
              }
            }}
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Public Maps Section */}
      <div id="explore" className="bg-white border-t py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Publicly Available Maps
            </h2>
            <p className="text-gray-600">
              Browse and explore hospital layouts from our community
            </p>
          </div>

          <PublicMapsViewer
            onSelectMap={setSelectedMap}
            onExploreMap={(map) => navigate(`/navigate/${map.id}`)}
          />

          {/* CTA after maps */}
          <div className="mt-12 text-center">
            <button
              onClick={handleExploreMap}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
            >
              Start Navigating
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Have an Architectural Layout?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Upload your building's floor plans and let our AI analyze them.
            Share with your community or keep them private.
          </p>
          <button
            onClick={() => {
              if (!isLoggedIn) {
                alert('Please login to upload maps!');
              } else {
                navigate('/dashboard');
              }
            }}
            className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Upload Your Map
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>
            © 2024 Multi-Building Indoor Wayfinder. Built for hospitals and large complexes.
          </p>
        </div>
      </div>
    </div>
  );
}
