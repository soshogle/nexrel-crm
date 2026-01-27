
/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other input-based attacks
 */

import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
  });
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return validator.escape(input);
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  const normalized = validator.normalizeEmail(email);
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }
  return normalized;
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!validator.isURL(trimmed, { require_protocol: true })) {
    return null;
  }
  // Only allow http and https protocols
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  return trimmed;
}

/**
 * Validate and sanitize phone numbers
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone) return null;
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }
  return cleaned;
}

/**
 * Sanitize file names to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  // Remove path separators and special characters
  return fileName
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(
  input: string | number,
  options?: { min?: number; max?: number; integer?: boolean }
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (options?.integer && !Number.isInteger(num)) {
    return null;
  }

  if (options?.min !== undefined && num < options.min) {
    return null;
  }

  if (options?.max !== undefined && num > options.max) {
    return null;
  }

  return num;
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson(input: string): Record<string, any> | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(input: string[]): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => typeof item === 'string')
    .map((item) => sanitizeText(item))
    .filter((item) => item.length > 0);
}

/**
 * Validate pagination parameters
 */
export function sanitizePagination(params: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number } {
  const page = sanitizeNumber(params.page || 1, {
    min: 1,
    max: 10000,
    integer: true,
  });

  const limit = sanitizeNumber(params.limit || 20, {
    min: 1,
    max: 100,
    integer: true,
  });

  return {
    page: page || 1,
    limit: limit || 20,
  };
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  // Remove special characters that could be used for injection
  return query
    .trim()
    .replace(/[<>'"`;]/g, '')
    .substring(0, 200);
}

/**
 * Validate boolean input
 */
export function sanitizeBoolean(
  input: string | boolean | number
): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input !== 0;
  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

/**
 * Sanitize date input
 */
export function sanitizeDate(input: string | Date): Date | null {
  if (!input) return null;

  const date = input instanceof Date ? input : new Date(input);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Ensure date is within reasonable range (1900-2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return null;
  }

  return date;
}

/**
 * Comprehensive request body sanitizer
 */
export function sanitizeRequestBody<T extends Record<string, any>>(
  body: T,
  schema: Record<keyof T, 'string' | 'number' | 'email' | 'url' | 'html' | 'boolean' | 'date'>
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const key in schema) {
    const value = body[key];
    const type = schema[key];

    if (value === undefined || value === null) {
      continue;
    }

    switch (type) {
      case 'string':
        sanitized[key] = sanitizeText(String(value)) as T[Extract<keyof T, string>];
        break;
      case 'number':
        const num = sanitizeNumber(value);
        if (num !== null) sanitized[key] = num as T[Extract<keyof T, string>];
        break;
      case 'email':
        const email = sanitizeEmail(String(value));
        if (email) sanitized[key] = email as T[Extract<keyof T, string>];
        break;
      case 'url':
        const url = sanitizeUrl(String(value));
        if (url) sanitized[key] = url as T[Extract<keyof T, string>];
        break;
      case 'html':
        sanitized[key] = sanitizeHtml(String(value)) as T[Extract<keyof T, string>];
        break;
      case 'boolean':
        sanitized[key] = sanitizeBoolean(value) as T[Extract<keyof T, string>];
        break;
      case 'date':
        const date = sanitizeDate(value);
        if (date) sanitized[key] = date as T[Extract<keyof T, string>];
        break;
    }
  }

  return sanitized;
}
