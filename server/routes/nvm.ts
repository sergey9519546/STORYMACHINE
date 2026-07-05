// server/routes/nvm.ts — thin re-export. The NVM engine's ~50 routes used to
// live in this single ~1,900-line file (the #1 agent-collision hazard across
// eight build runs); they now live in server/routes/nvm/ as cohesive modules
// — see server/routes/nvm/index.ts for the full module map. This file is
// kept in place (rather than updating server/app.ts's import path) so the
// app-mount diff stays a single line moved, not touched.
export { default } from './nvm/index.ts';
