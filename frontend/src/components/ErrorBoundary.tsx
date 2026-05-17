import React from 'react';
import { Home } from 'lucide-react';

type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen p-8 bg-slate-50 flex items-center justify-center">
          <div className="max-w-2xl w-full rounded-2xl bg-white border border-red-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600">An unexpected error occurred while rendering this view.</p>
            <details className="mt-3 p-3 bg-slate-50 rounded text-xs text-slate-700">
              {this.state.error?.message}
            </details>
            <div className="mt-4 flex gap-2">
              <a href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">
                <Home className="h-4 w-4" /> Home
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
