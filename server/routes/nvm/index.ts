// server/routes/nvm/index.ts — composes the NVM engine's route modules into
// one router with the same export shape the old monolithic
// server/routes/nvm.ts had (a single `express.Router()` default export
// mounted once in server/app.ts via `app.use(nvmRouter)`).
//
// server/routes/nvm.ts (~1,900 lines, 50+ routes) was the #1 agent-collision
// hazard across eight build runs — nearly every NVM feature touched the same
// file. This directory splits it into cohesive modules so parallel work
// lands in different files. The split is BEHAVIOR-PRESERVING: every route's
// path, method, middleware order, and handler body is unchanged — only the
// file each lives in moved.
//
// Module map (file → routes):
//   commits.ts      — GET  /api/nvm/commits, /api/nvm/commits/:commitId
//                      GET  /api/nvm/ghost-commits
//                      POST /api/nvm/ghost-commits/branch
//                      GET  /api/nvm/manifest
//                      POST /api/nvm/inject-ops
//                      POST /api/nvm/converge/commit
//   debug.ts        — GET  /api/debug/explain/:eventId
//                      GET  /api/debug/explain-scene/:locationId
//                      GET  /api/nvm/project/:target
//                      GET  /api/nvm/proof/:commitId
//                      POST /api/nvm/repair
//   analysis.ts     — GET  /api/nvm/tension, /two-reader, /topology
//                      POST /api/nvm/quality
//                      GET  /api/nvm/momentum, /sidecar
//                      GET  /api/nvm/quality/scene/:commitId
//                      GET  /api/nvm/epistemic, /health
//                      GET  /api/nvm/character-arc
//                      GET  /api/nvm/arc-timeline, /arc-completion
//                      GET  /api/nvm/regression, /momentum-dashboard
//                      GET  /api/nvm/voice-dna, /conflicts
//   twin-whatif.ts  — POST /api/nvm/redteam
//                      GET  /api/nvm/twin/scm
//                      POST /api/nvm/twin/do
//                      POST /api/nvm/whatif/explore
//                      POST /api/nvm/author/fixed-points, /author/backchain
//                      GET  /api/nvm/branch/field
//   selfplay.ts     — GET  /api/nvm/corpus
//                      POST /api/nvm/selfplay
//                      GET  /api/nvm/genome/current
//                      POST /api/nvm/genome/diff, /genome/breed
//   converge.ts     — POST /api/nvm/converge
//                      GET  /api/nvm/converge-stream
//                      POST /api/nvm/converge-arc
//   live.ts         — POST /api/nvm/room/critique
//                      POST /api/nvm/live/move
//                      GET  /api/nvm/live/feed
//                      POST /api/nvm/live/advance
//   revision.ts     — GET  /api/nvm/screenplay/memory
//                      POST /api/nvm/compile, /revise
//                      GET  /api/nvm/revise-stream
//
// No server/routes/nvm/shared.ts: the original nvm.ts defined zero local
// helper functions or module-level mutable state (all cross-request state
// lives per-session inside `stage`, looked up fresh via getOrCreateSession()
// in every handler) — there was nothing to extract. Each module below
// imports directly from the same server/lib/** and server/nvm/** modules the
// monolith did.
//
// Registration order: audited every one of the 51 routes' path patterns for
// overlapping prefixes (e.g. a literal segment vs. a `:param` at the same
// depth) that could make Express's first-match-wins semantics order-
// sensitive. None exist — every route's path+method is uniquely matched by
// exactly one pattern in the whole set — so the module mount order below is
// free; it is *chosen* to mirror the monolith's rough top-to-bottom grouping
// for readability, not because correctness depends on it.
import express from 'express';
import commitsRouter from './commits.ts';
import debugRouter from './debug.ts';
import analysisRouter from './analysis.ts';
import twinWhatifRouter from './twin-whatif.ts';
import selfplayRouter from './selfplay.ts';
import convergeRouter from './converge.ts';
import liveRouter from './live.ts';
import revisionRouter from './revision.ts';

const router = express.Router();
export default router;

router.use(commitsRouter);
router.use(debugRouter);
router.use(analysisRouter);
router.use(twinWhatifRouter);
router.use(selfplayRouter);
router.use(convergeRouter);
router.use(liveRouter);
router.use(revisionRouter);
