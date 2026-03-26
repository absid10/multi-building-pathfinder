import React from 'react';
import { Github, Linkedin, Mail, MessageCircle } from 'lucide-react';
import {
  SITE_CONTACT_EMAIL,
  SITE_GITHUB_URL,
  SITE_LINKEDIN_URL,
  SITE_OWNER_NAME,
} from '../config/site';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background py-12 text-foreground">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-card p-8 shadow-sm dark:border-slate-800 md:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Contact Us</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 md:text-4xl">Let us connect</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
            For collaborations, support, deployment help, or project discussions, reach out directly.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Project Owner:</span> {SITE_OWNER_NAME}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Email:</span>{' '}
                <a className="text-emerald-700 hover:underline dark:text-emerald-300" href={`mailto:${SITE_CONTACT_EMAIL}`}>
                  {SITE_CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">GitHub:</span>{' '}
                <a className="text-emerald-700 hover:underline dark:text-emerald-300" href={SITE_GITHUB_URL} target="_blank" rel="noreferrer">
                  {SITE_GITHUB_URL}
                </a>
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">LinkedIn:</span>{' '}
                <a className="text-emerald-700 hover:underline dark:text-emerald-300" href={SITE_LINKEDIN_URL} target="_blank" rel="noreferrer">
                  {SITE_LINKEDIN_URL}
                </a>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${SITE_CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Mail className="h-4 w-4" />
                Email Now
              </a>
              <a
                href={`mailto:${SITE_CONTACT_EMAIL}?subject=Project%20Inquiry`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <MessageCircle className="h-4 w-4" />
                Send Inquiry
              </a>
              <a
                href={SITE_GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a
                href={SITE_LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
