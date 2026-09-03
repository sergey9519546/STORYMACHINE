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

// requestLogger() moved to ./request-logger.ts on 2026-09-03 (retrospective
// #5). This module is reachable from the deterministic doctor's import graph,
// and it is allowed to stay there only because it is a leaf — a JSON sink with
// no dependencies. Referencing Express's RequestHandler type here made the web
// framework part of the analysis core's type graph for a function no analysis
// code calls. Keep this file import-free.
