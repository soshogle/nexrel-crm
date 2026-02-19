/**
 * Sentry client-side instrumentation.
 * Next.js loads this for client bundles when using @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
      }),
    ],
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
  });
}
