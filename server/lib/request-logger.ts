// request-logger.ts — the Express request-logging middleware, split out of
// ./logger.ts (retrospective #5, 2026-09-03).
//
// WHY THE SPLIT. logger.ts is imported all over the deterministic analysis
// path (server/nvm/revision/pipeline.ts, among others), so it sits inside the
// reachable set rooted at server/nvm/analyze/doctor.ts. That is acceptable
// only while it stays a leaf: a structured JSON sink with no dependencies.
// requestLogger() referenced Express's RequestHandler type, which made the web
// framework part of the core's type graph for a function no analysis code has
// ever called. Moving it here keeps logger.ts genuinely dependency-free, which
// is the condition tests/core/pure-core-boundary.test.ts allowlists it under.

import { logger } from './logger.ts';

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
