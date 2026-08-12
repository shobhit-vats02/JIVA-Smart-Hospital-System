'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

/**
 * Client error boundary. Catches rendering errors and shows a graceful fallback
 * instead of a white screen, with a retry action.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'Something went wrong' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[50vh] place-items-center p-6">
          <div className="glass max-w-md p-8 text-center shadow-glass-lg">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-danger to-rose-600 text-white">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="mt-2 text-sm text-ink-2">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
