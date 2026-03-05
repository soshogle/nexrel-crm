/**
 * Structured logging utility for API routes and server-side code.
 * - Respects LOG_LEVEL env var (debug | info | warn | error). Default: warn in prod, info in dev.
 * - Automatically redacts PII fields (phone, email, tokens) from context objects.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${base} ${JSON.stringify(entry.context)}`;
  }
  return base;
}

/** PII field names to redact from all log context */
const PII_KEYS = new Set([
  'phone', 'phoneNumber', 'to', 'from', 'email', 'customerPhone',
  'customerEmail', 'patientName', 'contactPerson', 'password',
  'token', 'secret', 'apiKey', 'authToken', 'accessToken', 'body',
]);

function redactContext(obj: LogContext, depth = 0): LogContext {
  if (depth > 3) return obj;
  const out: LogContext = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactContext(v as LogContext, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function getMinLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? '').toLowerCase();
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') return env;
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
}

function log(level: LogLevel, message: string, context?: LogContext) {
  // Honour LOG_LEVEL — skip levels below threshold
  if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[getMinLevel()]) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: context ? redactContext(context) : undefined,
  };
  const formatted = formatEntry(entry);
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Create a logger with pre-bound context (e.g. requestId, userId).
 */
export function createLogger(context?: LogContext) {
  return {
    debug: (message: string, extra?: LogContext) =>
      log('debug', message, { ...context, ...extra }),
    info: (message: string, extra?: LogContext) =>
      log('info', message, { ...context, ...extra }),
    warn: (message: string, extra?: LogContext) =>
      log('warn', message, { ...context, ...extra }),
    error: (message: string, extra?: LogContext) =>
      log('error', message, { ...context, ...extra }),
  };
}

/** Default logger without context */
export const logger = createLogger();
