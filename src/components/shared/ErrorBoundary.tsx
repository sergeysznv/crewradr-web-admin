// src/components/shared/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import { useT } from '@/hooks/use-translations';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName: string;
  fallback?: ReactNode;
  t?: TranslateFn;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Per-widget error boundary: catches render errors in a single dashboard
 * widget and shows an inline card with a retry button instead of crashing
 * the whole page.
 */
class WidgetErrorBoundaryClass extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
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
      const { t } = this.props;
      return (
        <div className="rounded-2xl border border-outline bg-surface p-6 text-center">
          <p className="text-base font-semibold text-on-surface">
            {t
              ? t('webErrorBoundaryUnableRender', { widgetName: this.props.widgetName })
              : `Unable to render ${this.props.widgetName}`}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t ? t('webErrorBoundaryTemporaryError') : 'A temporary error occurred while rendering this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-full bg-primary-container px-4 py-2 text-sm text-primary"
          >
            {t ? t('webErrorBoundaryRetryWidget') : 'Retry Widget'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook wrapper so the class-based boundary can consume translations.
 */
export function WidgetErrorBoundary(props: WidgetErrorBoundaryProps) {
  const { t } = useT();
  return <WidgetErrorBoundaryClass {...props} t={t} />;
}

/**
 * Full-page error boundary for the dashboard shell: shows a centered card
 * with a reload action when an unexpected error crashes the app frame.
 */
export function ShellErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <WidgetErrorBoundary
      widgetName="Dashboard"
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-scaffold p-8">
          <div className="max-w-md rounded-3xl border border-outline bg-surface p-12 text-center">
            <h2 className="text-xl font-bold text-on-surface">{t('webErrorBoundaryTitle')}</h2>
            <p className="mt-3 text-base text-on-surface-variant">
              {t('webErrorBoundaryDesc')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-primary px-6 py-3 text-lg font-bold text-on-primary"
            >
              {t('webErrorBoundaryReload')}
            </button>
          </div>
        </div>
      }
    >
      {children}
    </WidgetErrorBoundary>
  );
}
