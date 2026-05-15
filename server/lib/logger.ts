// Minimal structured JSON logger. Drop-in replaceable with pino if needed.
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...data });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
  info:  (msg: string, data?: Record<string, unknown>) => emit('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => emit('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
};

// Express request logger middleware — logs method, path, status, duration in ms.
export function requestLogger(): import('express').RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}
