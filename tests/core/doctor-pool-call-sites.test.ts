// Every route that analyses a script must do it OFF the main thread
// (2026-09-04, security review finding #1).
//
// WHY A SOURCE-LEVEL GREP AND NOT A BEHAVIOURAL TEST: the defect this catches
// is invisible in a response body. A route that calls runScriptDoctor
// in-process returns a byte-identical report to one that goes through the
// pool — the only difference is that, while it runs, every OTHER user's
// request (a save, a keystroke, GET /health) waits behind it. That is a
// property of the whole server under concurrency, and the honest per-route
// version of it is expensive to assert in a unit test.
// tests/routes/export-offthread.test.ts DOES assert the behaviour for the
// export routes by watching the pool itself; this file is the cheap, total
// guard that no NEW route quietly reintroduces the pattern, the same way CI's
// console-grep guards server/** against console.*.
//
// The history is exactly why a convention was not enough: doctor-pool.ts was
// built in August 2026 after a measured 22-minute full-server freeze, and
// server/routes/scriptide.ts adopted it — and then the brand-new
// /api/export/coverage-letter route was written in September by copying the
// UNFIXED in-process pattern out of server/routes/export.ts, which had never
// been migrated. Nothing failed. The review found it by measuring a live
// server (2.6-2.8s of /health stall per unauthenticated request).
//
// WHAT COUNTS AS COMPLIANT: importing runScriptDoctorForRequest
// (server/lib/doctor-request.ts) or runScriptDoctorOffThread
// (server/nvm/analyze/doctor-pool.ts). What fails: pulling the raw
// runScriptDoctor out of doctor.ts inside server/routes/**, in any of the
// three import shapes below, unless the file is in ALLOWED with a reason.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROUTES_DIR = path.join(REPO, 'server', 'routes');

/**
 * Route files allowed to call runScriptDoctor on the main thread. An entry
 * here is a claim that the main-thread call is STRUCTURAL, not an oversight —
 * so each one names the reason, and "we haven't got to it yet" is not one of
 * them: fix the route instead.
 */
const ALLOWED: Record<string, string> = {
  'scriptide.ts':
    'POST /api/scriptide/doctor/deep only. Deep read fans out LLM calls whose budget/abort '
    + 'machinery (withAiBudget\'s AsyncLocalStorage scope) is main-thread state, and it is '
    + 'I/O-bound rather than CPU-bound, so doctor-pool.ts deliberately does NOT carry it — see '
    + 'that file\'s header. Every other doctor call in this file goes through the pool.',
  'nvm/analysis.ts':
    'POST /api/nvm/analyze/compare. Its runScriptDoctor call is only HALF this route\'s '
    + 'main-thread cost: vectorizeScript (server/nvm/analyze/story-vector.ts) runs a SECOND '
    + 'in-process analysis of the same text a few lines later. Pooling only the route\'s own '
    + 'call would satisfy this test while leaving the route just as blocking, so the honest '
    + 'state is to record it as a known remaining main-thread analysis path (research/Labs '
    + 'surface, not a shipped writer route) rather than to half-fix it.',
};

/** Every .ts file under server/routes/**, repo-relative to that directory. */
function routeFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...routeFiles(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.ts')) out.push(rel);
  }
  return out;
}

/** Named-binding imports: `import { a, b } from 'x'` and
 *  `const { a, b } = await import('x')`. */
const NAMED_IMPORT_RE =
  /(?:import\s*\{([^}]*)\}\s*from|const\s*\{([^}]*)\}\s*=\s*await\s+import\s*\()\s*['"]([^'"]+)['"]/g;
/** Namespace imports: `import * as d from 'x'` — reaches runScriptDoctor too. */
const NAMESPACE_IMPORT_RE = /import\s*\*\s*as\s+\w+\s+from\s*['"]([^'"]+)['"]/g;

function importsDoctorDirectly(source: string): boolean {
  for (const m of source.matchAll(NAMED_IMPORT_RE)) {
    const specifier = m[3];
    if (!specifier.endsWith('analyze/doctor.ts')) continue;
    const bindings = (m[1] ?? m[2] ?? '').split(',').map((b) => b.trim().split(/\s+as\s+/)[0].trim());
    if (bindings.includes('runScriptDoctor')) return true;
  }
  for (const m of source.matchAll(NAMESPACE_IMPORT_RE)) {
    if (m[1].endsWith('analyze/doctor.ts')) return true;
  }
  return false;
}

describe('doctor call sites — every route analyses off the main thread', () => {
  it('no server/routes/** file imports runScriptDoctor from doctor.ts outside the allow-list', () => {
    const offenders: string[] = [];
    for (const file of routeFiles(ROUTES_DIR)) {
      if (file in ALLOWED) continue;
      if (importsDoctorDirectly(readFileSync(path.join(ROUTES_DIR, file), 'utf8'))) offenders.push(file);
    }
    assert.deepEqual(
      offenders,
      [],
      `server/routes/${offenders.join(', ')} calls runScriptDoctor on the main thread. `
      + 'One such request holds Node\'s event loop for the whole analysis, so every other user\'s '
      + 'request waits behind it (measured: 2.6-2.8s of GET /health stall per request). Use '
      + 'runScriptDoctorForRequest from server/lib/doctor-request.ts instead — same report, same '
      + 'cache, same errors, off the main thread.',
    );
  });

  it('the export routes and the live-diagnosis route are on the pooled path', () => {
    // Named explicitly, because these are the five that were NOT pooled when
    // the review ran and the ones a careless revert would take back out.
    const expectPooled = ['export.ts', 'coverage-letter.ts', 'scriptide.ts'];
    for (const file of expectPooled) {
      const source = readFileSync(path.join(ROUTES_DIR, file), 'utf8');
      assert.ok(
        /runScriptDoctorForRequest|runScriptDoctorOffThread/.test(source),
        `server/routes/${file} no longer references the pooled doctor path at all`,
      );
    }
  });

  it('every allow-list entry is a real file and carries a reason', () => {
    // A stale allow-list is how an exception outlives the thing it excused.
    const present = new Set(routeFiles(ROUTES_DIR));
    for (const [file, reason] of Object.entries(ALLOWED)) {
      assert.ok(present.has(file), `allow-list names server/routes/${file}, which no longer exists`);
      assert.ok(reason.length > 40, `allow-list entry for ${file} has no real reason`);
      assert.ok(
        importsDoctorDirectly(readFileSync(path.join(ROUTES_DIR, file), 'utf8')),
        `server/routes/${file} no longer calls runScriptDoctor directly — drop it from the allow-list`,
      );
    }
  });
});
