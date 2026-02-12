/**
 * Structured logging for message sync operations
 * Enables debugging sync issues and monitoring
 */

export type SyncLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SyncLogEntry {
  timestamp: string;
  level: SyncLogLevel;
  userId: string;
  channelType: string;
  providerType?: string;
  connectionId?: string;
  message: string;
  details?: Record<string, unknown>;
  error?: string;
}

const LOG_LEVELS: Record<SyncLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: SyncLogLevel = (process.env.SYNC_LOG_LEVEL as SyncLogLevel) || 'info';

function shouldLog(level: SyncLogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function logEntry(entry: Omit<SyncLogEntry, 'timestamp'>) {
  if (!shouldLog(entry.level)) return;

  const full: SyncLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const prefix = `[Sync ${entry.channelType}]`;
  const msg = `${prefix} ${entry.message}`;

  switch (entry.level) {
    case 'error':
      console.error(msg, entry.details || '', entry.error || '');
      break;
    case 'warn':
      console.warn(msg, entry.details || '');
      break;
    case 'debug':
      console.debug(msg, entry.details || '');
      break;
    default:
      console.log(msg, entry.details || '');
  }
}

export const syncLogger = {
  info: (userId: string, channelType: string, message: string, details?: Record<string, unknown>) => {
    logEntry({ level: 'info', userId, channelType, message, details });
  },
  warn: (userId: string, channelType: string, message: string, details?: Record<string, unknown>) => {
    logEntry({ level: 'warn', userId, channelType, message, details });
  },
  error: (
    userId: string,
    channelType: string,
    message: string,
    error?: string,
    details?: Record<string, unknown>
  ) => {
    logEntry({ level: 'error', userId, channelType, message, error, details });
  },
  debug: (
    userId: string,
    channelType: string,
    message: string,
    details?: Record<string, unknown>,
    providerType?: string,
    connectionId?: string
  ) => {
    logEntry({ level: 'debug', userId, channelType, providerType, connectionId, message, details });
  },
};
