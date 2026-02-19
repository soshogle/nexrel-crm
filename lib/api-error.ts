/**
 * Consistent API error shape across all routes.
 * Format: { code, message, details }
 */

import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  /** @deprecated Use message. Kept for backwards compatibility with clients that expect error key. */
  error?: string;
  details?: unknown;
}

/**
 * Create a consistent error response for API routes.
 * Includes `error` key for backwards compatibility with existing clients.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: { status?: number; details?: unknown }
): NextResponse<ApiErrorResponse> {
  const status = options?.status ?? statusForCode(code);
  const body: ApiErrorResponse = { code, message, error: message };
  if (options?.details !== undefined) {
    body.details = options.details;
  }
  return NextResponse.json(body, { status });
}

function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'BAD_REQUEST':
    case 'VALIDATION_ERROR':
      return 400;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

/** Convenience helpers */
export const apiErrors = {
  unauthorized: (message = 'Unauthorized') =>
    apiError('UNAUTHORIZED', message, { status: 401 }),
  forbidden: (message = 'Forbidden') =>
    apiError('FORBIDDEN', message, { status: 403 }),
  notFound: (message = 'Not found') =>
    apiError('NOT_FOUND', message, { status: 404 }),
  badRequest: (message: string, details?: unknown) =>
    apiError('BAD_REQUEST', message, { status: 400, details }),
  validationError: (message: string, details?: unknown) =>
    apiError('VALIDATION_ERROR', message, { status: 400, details }),
  conflict: (message: string) =>
    apiError('CONFLICT', message, { status: 409 }),
  rateLimited: (message = 'Too many requests') =>
    apiError('RATE_LIMITED', message, { status: 429 }),
  internal: (message = 'Internal server error', details?: unknown) =>
    apiError('INTERNAL_ERROR', message, { status: 500, details }),
};
