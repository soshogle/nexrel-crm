'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 1;

function isDomReconciliationError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('removeChild') ||
    msg.includes('insertBefore') ||
    msg.includes('appendChild') ||
    msg.includes('The node to be removed is not a child')
  );
}

/**
 * Error boundary to catch React render errors and prevent full app crashes.
 * Automatically retries once for benign DOM reconciliation errors caused by
 * browser extensions or hydration mismatches before showing the error UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDomReconciliationError(error) && this.state.retryCount < MAX_AUTO_RETRIES) {
      console.warn('[ErrorBoundary] DOM reconciliation error, auto-retrying render…', error.message);
      this.setState((prev) => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
      return;
    }

    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, { extra: errorInfo } as any);
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="h-10 w-10 text-amber-600" />
          <p className="text-sm text-amber-800 font-medium">Something went wrong</p>
          <p className="text-xs text-amber-700 max-w-md text-center">
            {this.state.error.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null, retryCount: 0 })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
