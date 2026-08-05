// src/components/shared/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName: string;
  fallback?: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Per-widget error boundary: catches render errors in a single dashboard
 * widget and shows an inline card with a retry button instead of crashing
 * the whole page.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-outline bg-surface p-6 text-center">
          <p className="text-base font-semibold text-on-surface">
            Unable to render {this.props.widgetName}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            A temporary error occurred while rendering this view.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-full bg-primary-container px-4 py-2 text-sm text-primary"
          >
            Retry Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Full-page error boundary for the dashboard shell: shows a centered card
 * with a reload action when an unexpected error crashes the app frame.
 */
export function ShellErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <WidgetErrorBoundary
      widgetName="Dashboard"
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-scaffold p-8">
          <div className="max-w-md rounded-3xl border border-outline bg-surface p-12 text-center">
            <h2 className="text-xl font-bold text-on-surface">Something went wrong</h2>
            <p className="mt-3 text-base text-on-surface-variant">
              An unexpected error occurred while loading the dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-primary px-6 py-3 text-lg font-bold text-white"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      }
    >
      {children}
    </WidgetErrorBoundary>
  );
}
