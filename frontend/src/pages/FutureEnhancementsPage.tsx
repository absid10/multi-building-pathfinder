import React from 'react';
import { LifeBuoy, Sparkles } from 'lucide-react';
import { SITE_CONTACT_EMAIL } from '../config/site';

const enhancements = [
  'Augmented reality arrows for camera-based indoor navigation overlays.',
  'Indoor positioning with BLE beacons / Wi-Fi RTT for real-time blue-dot tracking.',
  '3D digital twin floor models with vertical route previews across stairs/lifts.',
  'Voice-guided multilingual accessibility navigation for visually impaired users.',
  'Emergency evacuation mode with live hazard-aware route rerouting.',
  'Auto-map extraction from CAD / BIM sources for faster onboarding.',
  'Analytics dashboard for footfall, route heatmaps, and congestion prediction.',
  'Facility ticketing integration for maintenance requests directly from map POIs.',
  'Smart parking-to-destination routing from entry gates to indoor rooms.',
  'Kiosk and wearable companion apps for reception and on-ground staff.',
];

export default function FutureEnhancementsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-violet-700">Roadmap</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Future Enhancements</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            Planned capabilities to evolve this project into a production-grade indoor intelligence platform.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {enhancements.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="mr-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                  Next
                </span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}?subject=Support%20Request%20-%20Indoor%20Wayfinder`}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <LifeBuoy className="h-4 w-4" />
              Support
            </a>
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Want a custom feature? Reach out and we can prioritize it in roadmap.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
