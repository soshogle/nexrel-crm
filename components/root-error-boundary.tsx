'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
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
 * Root-level error boundary to catch React render errors (e.g. #185 Maximum update depth)
 * and prevent full app crashes on client browsers.
 * Automatically retries once for benign DOM reconciliation errors caused by
 * browser extensions or hydration mismatches.
 */
export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDomReconciliationError(error) && this.state.retryCount < MAX_AUTO_RETRIES) {
      console.warn('[RootErrorBoundary] DOM reconciliation error, auto-retrying render…', error.message);
      this.setState((prev) => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
      return;
    }

    console.error('[RootErrorBoundary] Caught error:', error.message, errorInfo.componentStack);
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, { extra: errorInfo as any });
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const isMaxUpdateDepth = this.state.error.message?.includes('Maximum update depth') ||
        this.state.error.message?.includes('185');
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-gray-50">
          <AlertCircle className="h-12 w-12 text-amber-600" />
          <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-600 max-w-md text-center">
            {isMaxUpdateDepth
              ? 'A display error occurred. Please go back to the dashboard or refresh the page.'
              : this.state.error.message}
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
