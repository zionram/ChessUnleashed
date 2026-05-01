export interface AppErrorLogEntry {
  id: string;
  timestamp: string;
  summary: string;
  details: string;
  source?: string;
  context?: string;
  session: {
    userAgent: string;
    url: string;
  };
}

const ERROR_LOG_STORAGE_KEY = 'chess-unleashed.error-log.v1';
const MAX_ERROR_LOG_ENTRIES = 100;

let installed = false;

const createErrorId = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return randomUuid;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const safeReadLogs = (): AppErrorLogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(ERROR_LOG_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWriteLogs = (entries: AppErrorLogEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ERROR_LOG_ENTRIES)));
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export const addErrorLogEntry = (entry: Omit<AppErrorLogEntry, 'id' | 'timestamp' | 'session'>) => {
  const nextEntry: AppErrorLogEntry = {
    id: createErrorId(),
    timestamp: new Date().toISOString(),
    session: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    },
    ...entry
  };
  const entries = [nextEntry, ...safeReadLogs()];
  safeWriteLogs(entries);
  window.dispatchEvent(new CustomEvent('chess-unleashed:error-log-updated'));
  return nextEntry;
};

export const getErrorLogEntries = () => safeReadLogs();

export const clearErrorLogEntries = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ERROR_LOG_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('chess-unleashed:error-log-updated'));
};

export const getErrorReportText = (entries: AppErrorLogEntry[]) => JSON.stringify({
  exportedAt: new Date().toISOString(),
  app: 'Chess Unleashed',
  entries
}, null, 2);

export const installGlobalErrorLogging = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', event => {
    addErrorLogEntry({
      summary: event.message || 'Something went wrong while running the app.',
      details: event.error ? getErrorDetails(event.error) : `${event.filename}:${event.lineno}:${event.colno}`,
      source: event.filename,
      context: 'window.error'
    });
  });

  window.addEventListener('unhandledrejection', event => {
    addErrorLogEntry({
      summary: 'Something went wrong while completing an async action.',
      details: getErrorDetails(event.reason),
      context: 'unhandledrejection'
    });
  });
};

export { ERROR_LOG_STORAGE_KEY };
