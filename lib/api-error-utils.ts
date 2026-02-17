/**
 * Safe API response parsing and user-friendly error messages
 * Prevents "unexpected token... is not valid json" when APIs return non-JSON errors
 */

/**
 * Safely parse a fetch response as JSON.
 * If parsing fails (e.g. HTML error page, plain text), returns a user-friendly error object.
 */
export async function safeParseJsonResponse<T = Record<string, unknown>>(
  response: Response,
  fallbackError = 'Something went wrong. Please try again.'
): Promise<{ data: T | null; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return {
      data: null,
      error: text?.trim() && text.length < 200 ? text : fallbackError,
    };
  }
  try {
    const data = (await response.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: fallbackError };
  }
}

/**
 * Get a user-friendly error message from an API error response.
 * Replaces technical messages like "unexpected token" with plain language.
 */
export function getUserFriendlyError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;
  const msg = typeof error === 'string' ? error : (error as Error)?.message || '';
  if (!msg) return fallback;
  // Replace technical JSON parse errors
  if (msg.includes('unexpected token') || msg.includes('is not valid json') || msg.includes('JSON')) {
    return 'We received an unexpected response. Please try again.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Unable to connect. Please check your internet and try again.';
  }
  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Your session may have expired. Please sign in again.';
  }
  if (msg.includes('403') || msg.includes('Forbidden')) {
    return "You don't have permission to do that.";
  }
  if (msg.includes('404')) {
    return "We couldn't find what you're looking for.";
  }
  if (msg.includes('500') || msg.includes('Internal Server')) {
    return 'Our servers are having a moment. Please try again in a few seconds.';
  }
  // Keep user-friendly messages as-is, truncate very long technical ones
  if (msg.length > 150 && (msg.includes('Error:') || msg.includes('at '))) {
    return fallback;
  }
  return msg;
}
