// pure-core-boundary.test.ts — the deterministic/generative boundary, enforced.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// ARCHITECTURE.md §1 has always said the analysis core is pure and keyless.
// Until 2026-09-03 that was PROSE, not a module boundary. The 2026-09-02
// retrospective's finding #5 measured what the import graph actually said:
//
//   server/nvm/analyze/doctor.ts
//     -> analyze/deep-read.ts -> engine/ai.ts -> engine/ai-provider.ts
//        -> lib/ai-providers/openai-compat.ts  (an HTTP client)
//        -> lib/validation.ts -> lib/runtime-limits.ts, nvm/ops/StoryOp.ts
//   server/nvm/analyze/doctor.ts
//     -> screenplay/compile.ts -> state/NarrativeState.ts -> engine/Stage.ts
//        (better-sqlite3) -> monitoring/v5-metrics.ts, nvm/kernel/**, …
//
// i.e. every doctor worker thread loaded a native database binding and an AI
// transport in order to compute a DETERMINISTIC score. That is not only an
// architectural lie, it has a daily cost: commit 305bb4ab made
// scripts/check-scoring-receipt.mjs classify EVERY file reachable from
// doctor.ts as scoring-path, so a routine edit to server/lib/validation.ts had
// to carry an output-identity measurement receipt.
//
// The fix was to cut the edges, not to loosen the gate. This test is what
// stops them growing back. It is deliberately structural — it reads the import
// graph, exactly as scripts/check-scoring-receipt.mjs does, using the same
// walker (scripts/lib/import-graph.mjs) so the two can never disagree about
// what "reachable" means.
//
// ── WHY AN ALLOWLIST AND NOT A RULE ──────────────────────────────────────────
// A pattern ("nothing outside server/nvm/analyze and server/nvm/revision")
// would be false: the core legitimately needs a Fountain parser, a screenplay
// layout engine, a word counter and a shared type vocabulary. A pattern loose
// enough to admit those would also admit the next engine/ai.ts. So the
// allowlist is enumerated, each entry carries the reason it is allowed to be
// there, and ANY addition — including one that looks obviously harmless —
// fails this test until someone writes that reason down.
//
// ── HOW TO RESPOND WHEN THIS TEST FAILS ──────────────────────────────────────
// It failed because a new import edge pulled a file into the deterministic
// core's graph. Two honest outcomes:
//   1. The file genuinely computes part of the report → add it to
//      CORE_ALLOWLIST with a one-line justification, and expect the reviewer to
//      read that line.
//   2. It does not (an AI transport, persistence, metrics, an Express handler,
//      prompt text) → cut the edge. A lazy `await import()` DOES NOT cut it:
//      scripts/lib/import-graph.mjs matches dynamic imports as edges on
//      purpose, because the receipt gate depends on seeing them. Split the
//      module (see server/nvm/screenplay/compile-types.ts,
//      server/nvm/state/from-stage.ts, server/lib/request-logger.ts) or invert
//      the dependency behind a registry (server/lib/llm-port.ts,
//      server/nvm/revision/rewrite-llm.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { computeReachableSet } from '../../scripts/lib/import-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DOCTOR_ROOT = 'server/nvm/analyze/doctor.ts';

/** The two directories that ARE the deterministic core. Everything the walk
 *  reaches outside them has to be justified below, one line each. */
const CORE_DIRS = ['server/nvm/analyze/', 'server/nvm/revision/'];

/**
 * Every file outside CORE_DIRS that server/nvm/analyze/doctor.ts is allowed to
 * reach, and why. Keep it sorted; keep every justification true.
 */
const CORE_ALLOWLIST: Record<string, string> = {
  'server/engine/types.ts':
    'Shared narrative type vocabulary (StoryGenre, EmotionalArc, Belief) plus one ACTION_TYPES constant; declarations only — it reaches no engine runtime.',
  'server/lib/build-info.ts':
    'commit (aliased engineCommit) — feeds ScriptDoctorReport.provenance.engineCommit; a build-time env read at module load, no imports, no I/O per call.',
  'server/lib/genre-router.ts':
    'GENRE_RULE_MODIFIERS / TONE_REGISTERS / composeThresholds — genre- and tone-conditioned rule thresholds four revision passes read to pick a number.',
  'server/lib/llm-port.ts':
    'The core-side declaration of the LLM seam: interface + registry, zero dependencies. The adapter (server/engine/ai.ts) plugs in from OUTSIDE this set — that inversion is the point.',
  'server/lib/logger.ts':
    'Structured JSON sink used by revision/pipeline.ts; a dependency-free leaf since requestLogger() moved to server/lib/request-logger.ts.',
  'server/lib/prompt-utils.ts':
    'sanitizeForPrompt — pure clamp + control-character strip, applied by deep-read.ts to validated model output; no imports.',
  'server/lib/rulebook-count.ts':
    'rulebookCount — feeds ScriptDoctorReport.provenance.rulebookCount; reads docs/rulebook/coverage.json ONCE at module load (never per report), no imports.',
  'server/lib/string-utils.ts':
    'fastWordCount — the word counter behind pages/word-count figures in the report; pure, no imports.',
  'server/lib/structural-reliability.ts':
    'computeStructuralReliabilityNote — feeds ScriptDoctorReport.provenance.structuralReliabilityNote; pure function of sceneCount, no imports.',
  'server/lib/structure-presets.ts':
    'expectedTensionAt and the structure/arc preset tables analyze/metrics.ts scores the emotional arc against; pure data + pure functions.',
  'server/nvm/ops/StoryOp.ts':
    'StoryOp / AtomicFact / ClueCarrier type vocabulary the screenplay memory records are shaped by; one STORY_OP_KINDS table, no runtime dependencies.',
  'server/nvm/screenplay/suspense-dip.ts':
    'isSuspenseDip / countSuspenseDips — the one definition of the suspense-dip reversal predicate behind structure.reversalCount and reversalDensity, which NO_REVERSALS and NO_REVERSALS_LONG_STORY (4x weight) turn into ScriptDoctorReport.health; a constant plus two pure predicates, no imports.',
  'server/nvm/proof/surfacing.ts':
    'SupportState and the surfacing thresholds the disclosure/epistemics analysis grades evidence with; pure.',
  'server/nvm/quality/arc-tracker.ts':
    'ArcCompletionReport + promise/payoff accounting consumed by quality/character-function.ts.',
  'server/nvm/quality/character-function.ts':
    'classifyCharacterFunctions — feeds ScriptDoctorReport.characterFunctions.',
  'server/nvm/quality/disclosure-analysis.ts':
    'analyzeDisclosureAndEpistemics — feeds ScriptDoctorReport.disclosureAnalysis.',
  'server/nvm/quality/graph-health.ts':
    'graphHealthFromReport — feeds ScriptDoctorReport.graphHealth, a scored contribution.',
  'server/nvm/quality/rule-breaking.ts':
    'analyzeRuleBreaking — feeds ScriptDoctorReport.ruleBreaking.',
  'server/nvm/quality/subplot-tracker.ts':
    'analyzeSubplots — feeds ScriptDoctorReport.subplots.',
  'server/nvm/screenplay/compile-types.ts':
    'CompiledScreenplay / SceneAnnotation only — the leaf the compiler`s data shapes were split into so compile.ts`s projector subgraph stays out of this set.',
  'server/nvm/screenplay/memory.ts':
    'ScreenplaySceneRecord / ScenePurpose — the per-scene signal schema every rule in the core judges; reached type-only from here.',
  'server/nvm/screenplay/structure.ts':
    'analyzeStructure — computes StructureState (act position, escalation, open clues), read directly by the report and by the passes.',
  'server/nvm/state/StoryCommit.ts':
    'StoryCommit type + summarizeOps, the commit shape screenplay memory records are annotated from.',
  'src/lib/fountain.ts':
    'parseFountain — the Fountain parser the analyzer and deep-read both segment scenes with; pure, browser-safe.',
  'src/lib/screenplay-layout.ts':
    'layoutScreenplay — produces ScriptDoctorReport.pages (investigated and DISQUALIFIED from any not-scoring exemption on 2026-09-02; it feeds a number directly).',
};

/**
 * Files that must NEVER be reachable from doctor.ts, and why each one is the
 * canonical example of a boundary violation rather than an arbitrary ban.
 */
const FORBIDDEN_FILES: Record<string, string> = {
  'server/engine/ai.ts':
    'the AI transport: provider selection, retries, timeouts, metrics — and, transitively, an HTTP client',
  'server/engine/Stage.ts':
    'the better-sqlite3 session store: a native binding no deterministic score needs',
};

/** Prefixes that must never appear in the reachable set. */
const FORBIDDEN_PREFIXES: Array<{ prefix: string; why: string }> = [
  { prefix: 'server/lib/ai-providers/', why: 'concrete LLM provider clients (OpenAI-compatible HTTP, schema translation)' },
  { prefix: 'server/monitoring/', why: 'process-level metrics collection — an observability concern, not a scoring one' },
  { prefix: 'server/routes/', why: 'Express request handling' },
];

/** Bare module specifiers no file in the reachable set may import, statically
 *  or dynamically. These are the runtime capabilities the boundary exists to
 *  keep out: a native DB binding, a web framework, raw sockets. */
const FORBIDDEN_MODULES = [
  'better-sqlite3',
  'express',
  'node:http',
  'node:https',
  'http',
  'https',
  'ws',
];

function reachableFromDoctor(): Set<string> {
  return computeReachableSet(REPO_ROOT, [DOCTOR_ROOT]);
}

function outsideCore(reachable: Set<string>): string[] {
  return [...reachable].filter(f => !CORE_DIRS.some(d => f.startsWith(d))).sort();
}

describe('deterministic core boundary (retrospective #5)', () => {
  it('doctor.ts can reach neither the AI transport nor the SQLite Stage', () => {
    const reachable = reachableFromDoctor();
    for (const [file, why] of Object.entries(FORBIDDEN_FILES)) {
      assert.equal(
        reachable.has(file),
        false,
        `${file} is reachable from ${DOCTOR_ROOT}. It is ${why}. A deterministic score must not `
        + 'require it to load. Cut the edge (split the module, or invert it behind a registry like '
        + 'server/lib/llm-port.ts) — a lazy await import() does NOT cut it, because '
        + 'scripts/lib/import-graph.mjs follows dynamic imports on purpose.',
      );
    }
  });

  it('doctor.ts can reach no provider client, no monitoring, and no route', () => {
    const reachable = reachableFromDoctor();
    for (const { prefix, why } of FORBIDDEN_PREFIXES) {
      const hits = [...reachable].filter(f => f.startsWith(prefix)).sort();
      assert.deepEqual(
        hits,
        [],
        `${hits.join(', ')} — under ${prefix} (${why}) — became reachable from ${DOCTOR_ROOT}.`,
      );
    }
  });

  it('no file in the reachable set imports a native binding, a web framework, or a socket', () => {
    const reachable = reachableFromDoctor();
    const offenders: string[] = [];
    for (const rel of [...reachable].sort()) {
      const src = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      for (const mod of FORBIDDEN_MODULES) {
        // Matches `from 'mod'`, `import 'mod'` and `import('mod')` for a bare
        // specifier — the three ways a module actually gets loaded here.
        const re = new RegExp(`(?:from|import)\\s*\\(?\\s*['"]${mod.replace('/', '\\/')}['"]`);
        if (re.test(src)) offenders.push(`${rel} imports ${mod}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'The deterministic core reached a module with a runtime capability it must not need:\n  '
      + offenders.join('\n  '),
    );
  });

  it('the set of reachable files outside the core directories equals the committed allowlist', () => {
    const outside = outsideCore(reachableFromDoctor());
    const allowed = Object.keys(CORE_ALLOWLIST).sort();

    const added = outside.filter(f => !(f in CORE_ALLOWLIST));
    assert.deepEqual(
      added,
      [],
      'New file(s) entered the deterministic core\'s import graph without a justification:\n  '
      + added.join('\n  ')
      + '\n\nEither cut the edge, or add each file to CORE_ALLOWLIST in this test with one line '
      + 'saying which number in ScriptDoctorReport it helps compute. Every entry there is also a '
      + 'file that scripts/check-scoring-receipt.mjs will require a measurement receipt for, so '
      + 'the list is not free.',
    );

    const stale = allowed.filter(f => !outside.includes(f));
    assert.deepEqual(
      stale,
      [],
      'CORE_ALLOWLIST names file(s) the doctor no longer reaches:\n  '
      + stale.join('\n  ')
      + '\n\nThat is good news — delete the entries so the list keeps meaning something.',
    );
  });

  it('every allowlist entry carries a non-trivial justification', () => {
    for (const [file, why] of Object.entries(CORE_ALLOWLIST)) {
      assert.ok(
        why.trim().length >= 40,
        `CORE_ALLOWLIST['${file}'] needs a real justification, not "${why}".`,
      );
    }
  });

  // ── Worker-level proof ─────────────────────────────────────────────────────
  // The assertions above describe the import GRAPH. This one observes what the
  // doctor's own thread actually loads, which is a different question with a
  // different failure mode:
  //
  //   * A type-only edge (compile.ts -> NarrativeState.ts -> engine/Stage.ts)
  //     is erased by runtime type-stripping, so it never loaded better-sqlite3
  //     at run time even while it made the whole SQLite subgraph part of the
  //     compiled surface and of the receipt gate's scoring path. Only the graph
  //     assertions catch that.
  //   * A VALUE edge (deep-read.ts -> engine/ai.ts) did load, every time. On
  //     the pre-2026-09-03 tree this probe recorded server/engine/ai.ts,
  //     server/engine/ai-provider.ts, server/lib/ai-providers/openai-compat.ts,
  //     server/lib/ai-providers/schema.ts, server/lib/metrics.ts and
  //     server/lib/validation.ts being instantiated on the thread that computes
  //     a deterministic score — 60 repo modules and 92 node_modules entries,
  //     against 53 and 79 now. Only this test catches that.
  //
  // server/nvm/analyze/doctor-worker.ts's entire body is `await
  // import('./doctor.ts')` followed by runScriptDoctor(...) — no logger, no
  // session, no DB, by design (see its header) — so a worker that performs
  // exactly those two steps loads exactly what a pooled doctor run loads.
  //
  // Two instruments, because they see different things: a module `load` hook
  // (node:module register(), talking back over a MessageChannel) records every
  // ES module instantiated on the thread, and a patched process.dlopen records
  // every native addon, including one arriving by a route the module hook or
  // the static walker cannot see (a computed specifier, a transitive require
  // deep inside node_modules).
  it('a doctor worker thread loads no AI transport, no Stage, and no native addon', async () => {
    const doctorUrl = new URL('../../server/nvm/analyze/doctor.ts', import.meta.url).href;
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'Ana counts the money twice. It is short.',
      '',
      'ANA',
      'Someone took it.',
      '',
      'EXT. STREET - NIGHT',
      '',
      'Ana follows a man who does not look back.',
      '',
      'ANA',
      'I know what you did.',
    ].join('\n');

    // The hooks module runs on Node's loader thread, so it has to be
    // addressable as a module of its own; a data: URL keeps it inline instead
    // of adding a fixture file whose only reader is this test.
    const hooksUrl = 'data:text/javascript,' + encodeURIComponent(
      'let port;'
      + 'export function initialize(data) { port = data.port; }'
      + 'export async function load(url, context, next) { if (port) port.postMessage(url); return next(url, context); }',
    );

    const bootstrap = `
      const { parentPort, MessageChannel } = require('node:worker_threads');
      const { register } = require('node:module');
      const { pathToFileURL } = require('node:url');

      const dlopened = [];
      const realDlopen = process.dlopen.bind(process);
      process.dlopen = function (mod, filename, ...rest) {
        dlopened.push(String(filename));
        return realDlopen(mod, filename, ...rest);
      };

      const loaded = [];
      const { port1, port2 } = new MessageChannel();
      port1.on('message', url => loaded.push(url));
      port1.unref();
      register(${JSON.stringify(hooksUrl)}, {
        parentURL: pathToFileURL(process.cwd() + '/'),
        data: { port: port2 },
        transferList: [port2],
      });

      (async () => {
        try {
          const mod = await import(${JSON.stringify(doctorUrl)});
          const report = await mod.runScriptDoctor(${JSON.stringify(fountain)});
          // The load hook reports from another thread; give its last messages
          // a turn to arrive before the snapshot is posted back.
          await new Promise(r => setTimeout(r, 250));
          parentPort.postMessage({ ok: true, dlopened, loaded, sceneCount: report.sceneCount });
        } catch (err) {
          parentPort.postMessage({ ok: false, dlopened, loaded, message: String((err && err.message) || err) });
        }
      })();
    `;

    const worker = new Worker(bootstrap, { eval: true });
    const result = await new Promise<{
      ok: boolean; dlopened: string[]; loaded: string[]; sceneCount?: number; message?: string;
    }>((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => reject(new Error(`worker exited before reporting (code ${code})`)));
    });
    await worker.terminate();

    assert.equal(result.ok, true, `the doctor failed inside the worker: ${result.message}`);
    assert.equal(result.sceneCount, 2, 'the worker did not actually analyze the fixture');

    assert.deepEqual(
      result.dlopened,
      [],
      'A native addon was loaded on the thread that computed a deterministic score:\n  '
      + result.dlopened.join('\n  '),
    );

    const repoFiles = result.loaded
      .filter(u => u.startsWith('file:'))
      .map(u => path.relative(REPO_ROOT, new URL(u).pathname).replace(/\\/g, '/'))
      .filter(f => !f.startsWith('..') && !f.startsWith('node_modules/'));
    assert.ok(repoFiles.length > 20, 'the load hook recorded nothing — the probe is broken, not passing');

    const banned = repoFiles.filter(f =>
      f in FORBIDDEN_FILES || FORBIDDEN_PREFIXES.some(({ prefix }) => f.startsWith(prefix)));
    assert.deepEqual(
      banned.sort(),
      [],
      'These modules were instantiated on the doctor\'s own thread:\n  '
      + banned.join('\n  ')
      + '\nA deterministic score must not require an AI transport, a session store, a provider '
      + 'client, a metrics collector or an Express route to be loaded at all.',
    );
  });
});
