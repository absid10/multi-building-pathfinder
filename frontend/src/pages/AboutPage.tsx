import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SITE_CONTACT_EMAIL, SITE_OWNER_NAME } from '../config/site';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">About This Project</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Multi-Building Indoor Wayfinder</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            This platform helps visitors and staff navigate across complex indoor spaces such as hospitals,
            colleges, and multi-block campuses. It combines map upload, AI-assisted structure detection,
            and route guidance in a single workflow.
          </p>

          <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-sky-800">Project by:</span> {SITE_OWNER_NAME}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold text-sky-800">Website by:</span> {SITE_OWNER_NAME}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold text-sky-800">Contact:</span>{' '}
              <a className="text-sky-700 hover:underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>
                {SITE_CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/future-enhancements')}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Sparkles className="h-4 w-4" />
              See Future Enhancements
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
