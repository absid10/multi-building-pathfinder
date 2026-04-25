import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Building2,
  ChevronRight,
  Navigation,
  MonitorSmartphone,
  ScanQrCode,
} from 'lucide-react';
import PublicMapsViewer, { PublicMap } from '../components/PublicMapsViewer';
import { useAuth } from '../contexts/AuthContext';
import { SITE_CONTACT_EMAIL } from '../config/site';

export default function LandingPage() {
  const [selectedMap, setSelectedMap] = useState<PublicMap | null>(null);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleExploreMap = () => {
    const id = selectedMap?.id || 'gmch-chhatrapati';
    // If id starts with user-, use the uploaded navigator route
    if (id.startsWith('user-')) {
      navigate(`/navigate/upload/${id.replace('user-', '')}`);
    } else {
      navigate(`/navigate/${id}`);
    }
  };

  const goToDashboardOrPrompt = () => {
    if (!isLoggedIn) {
      alert('Please sign up or login to upload maps!');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-600 via-blue-700 to-cyan-700 p-10 text-white shadow-2xl">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold tracking-wide">
              Indoor Navigation Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">Find Your Way Indoors</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-blue-100 md:text-xl">
              Interactive maps, turn-by-turn wayfinding, and live layout updates for hospitals and complex campuses.
            </p>
          </div>

          <div className="relative mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-bold">Real-Time</p>
              <p className="text-sm text-blue-100">Live map updates for visitors and staff</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-bold">Multi-Floor</p>
              <p className="text-sm text-blue-100">Seamless navigation across buildings</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-2xl font-bold">Multi-Channel</p>
              <p className="text-sm text-blue-100">Web, kiosk, QR, and mobile-ready experience</p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-100/70 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-sky-900/40">
            <MapPin className="mb-4 h-12 w-12 text-sky-600" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Precise Navigation</h3>
            <p className="text-sm text-muted-foreground">Get turn-by-turn directions with distance and time estimates</p>
          </div>
          <div className="rounded-2xl border border-sky-100/70 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-sky-900/40">
            <Building2 className="mb-4 h-12 w-12 text-sky-600" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Multi-Building Support</h3>
            <p className="text-sm text-muted-foreground">Navigate across multiple buildings and floors seamlessly</p>
          </div>
          <div className="rounded-2xl border border-sky-100/70 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-sky-900/40">
            <Users className="mb-4 h-12 w-12 text-sky-600" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Share Maps Publicly</h3>
            <p className="text-sm text-muted-foreground">Upload your layouts and make them available for everyone</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => window.scrollTo({ top: document.getElementById('explore')?.offsetTop || 0, behavior: 'smooth' })}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Explore Maps
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={goToDashboardOrPrompt}
            className="rounded-xl border-2 border-blue-600 px-8 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            Get Started
          </button>
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-slate-200 bg-card p-8 text-left shadow-sm dark:border-slate-800">
          <h2 className="text-2xl font-bold text-foreground">How it works in 3 steps</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-sm font-semibold text-sky-700">1. Upload map</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Add floor plan files and define basic building metadata.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-sm font-semibold text-sky-700">2. Auto-process</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">AI-assisted parsing creates searchable paths, nodes, and POIs.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-sm font-semibold text-sky-700">3. Share everywhere</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Publish maps for web, kiosk, and QR-linked visitor journeys.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="explore" className="border-t border-slate-200 bg-card py-16 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-foreground">Publicly Available Maps</h2>
            <p className="text-muted-foreground">Browse and explore hospital layouts from our community</p>
          </div>

          <PublicMapsViewer onSelectMap={setSelectedMap} onExploreMap={(map) => navigate(`/navigate/${map.id}`)} />

          <div className="mt-12 text-center">
            <button
              onClick={handleExploreMap}
              className="mx-auto flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Start Navigating
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 py-14 text-slate-100">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <Navigation className="h-10 w-10 text-cyan-300" />
            <h3 className="mt-3 text-lg font-semibold">Wayfinding at Scale</h3>
            <p className="mt-2 text-sm text-slate-300">Point-to-point routes with floor-aware transitions and POI discovery.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <MonitorSmartphone className="h-10 w-10 text-cyan-300" />
            <h3 className="mt-3 text-lg font-semibold">Multi-Channel Access</h3>
            <p className="mt-2 text-sm text-slate-300">Designed for mobile web, kiosk panels, and embedded map surfaces.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <ScanQrCode className="h-10 w-10 text-cyan-300" />
            <h3 className="mt-3 text-lg font-semibold">QR-Linked Journeys</h3>
            <p className="mt-2 text-sm text-slate-300">Launch navigation instantly from printed QR waypoints inside facilities.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Have an Architectural Layout?</h2>
          <p className="mb-8 text-lg text-blue-100">
            Upload your building's floor plans and let our AI analyze them. Share with your community or keep them private.
          </p>
          <button
            onClick={goToDashboardOrPrompt}
            className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            Upload Your Map
          </button>
        </div>
      </div>

      <div className="bg-gray-900 py-8 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <button
              onClick={() => navigate('/about')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:bg-slate-800"
            >
              About
            </button>
            <button
              onClick={() => navigate('/future-enhancements')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:bg-slate-800"
            >
              Future Enhancements
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:bg-slate-800"
            >
              Contact Us
            </button>
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}?subject=Support%20Request%20-%20Indoor%20Wayfinder`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:bg-slate-800"
            >
              Support
            </a>
          </div>
          <p>© 2026 Multi-Building Indoor Wayfinder. All Rights Reserved.</p>
          <p className="mt-2 text-xs text-gray-500">
            Copying, using, modifying, or distributing this project requires prior written permission.
            Contact:{" "}
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}?subject=Permission%20Request%20-%20Indoor%20Wayfinder`}
              className="underline decoration-dotted underline-offset-2 hover:text-gray-300"
            >
              {SITE_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
