/**
 * Structured logging utility for API routes and server-side code.
 * Adds context (requestId, userId, component) for easier debugging.
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

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  const formatted = formatEntry(entry);
  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatted);
      }
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
