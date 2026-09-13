#!/usr/bin/env node
// scripts/story-bench.mjs — the story-generation bench (2026-09-13).
//
// WHAT THIS IS. An INTERNAL RESEARCH INSTRUMENT that drives this repository's
// EXISTING generation pipeline end to end, over six committed premises, and
// writes down what came out. It measures; it does not tune, and it does not
// judge. NORTH_STAR §1 forbids LLM-as-judge for any verdict a user sees, and
// nothing this script produces reaches a user-visible surface.
//
// WHAT IT IS NOT. It is not a quality gate and it makes no quality claim. The
// doctor's health score on a generated script is a real measurement of that
// script's STRUCTURE — scene count, act balance, causal chains, dialogue
// shape. It is not a measurement of whether the story is interesting, whether
// the dialogue sounds like people, or whether anyone would keep reading. The
// only instrument this repository has for that is a human reader, which is
// what `--packet` exists to feed (docs/DECISION_LOG.md Decision #3: a ~30-case
// human-scored golden set is the condition for promoting generation out of
// Labs).
//
// THE PIPELINE IT DRIVES — and the step that does not exist.
//   premise  ->  (NO STEP EXISTS)  ->  SceneTarget[]
//       Nothing in this repository turns a paragraph of English into a beat
//       sheet. POST /api/nvm/converge and /converge-arc both REQUIRE a
//       SceneTarget[] from the caller (server/nvm/generate/proof-spec.ts); the
//       Story wizard produces a StoryConfig and stops. So the beats come from
//       the fixture, hand-authored, and every run says so.
//   SceneTarget  ->  POST /api/nvm/converge         (LLM: StoryOp IR, not prose)
//   winner       ->  POST /api/nvm/converge/commit  (deterministic)
//   commits      ->  POST /api/nvm/compile          (DETERMINISTIC TEMPLATES)
//       server/nvm/project/index.ts renders each StoryOp through a fixed
//       English sentence. "A dangerous hush falls over the room" is a string
//       constant, not generated prose. The compiled Fountain is a rendering of
//       a state trace.
//   fountain     ->  POST /api/nvm/revise           (LLM: 14 prose rewrites)
//       This is the ONLY step in the whole pipeline that writes prose.
//   fountain     ->  POST /api/scriptide/doctor     (deterministic score)
//
// USAGE
//   npm run story:bench -- --check     # /models reachability, no generation
//   npm run story:bench                # all six premises, one run each
//   npm run story:bench -- --only cold-open
//   npm run story:bench -- --packet    # assemble the reading packet from the
//                                      # most recent run directory
//
// OUTPUT lands in data/story-bench/<date>/ — gitignored (`data/` in
// .gitignore), because these are full screenplays and a call log.
//
// NO KEY, NO RUN. With no usable provider the script prints why and exits 0 in
// --check mode / exits 2 in run mode. It is NOT part of `npm test`; CI has no
// key and never invokes it. tests/scripts/story-bench.test.ts covers the pure
// helpers this file exports.

import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'story-bench-premises.json');

// The converge budget this bench asks for, and the route budget it needs to
// let that finish. Both are the bench's numbers, not the product's: the route
// still ships its own 180 s default and this only overrides the server the
// bench itself boots. See bootServerWithKey for the measurement that set it.
export const BENCH_CONVERGE_BUDGET = { maxIterations: 2, candidatesPerIteration: 2 };
export const BENCH_CONVERGE_TIMEOUT_MS = 300_000;

// ── Pure helpers (exported for tests/scripts/story-bench.test.ts) ────────────

/** Today's run directory name — the date, so repeated runs in a day append. */
export function runDirName(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Turn a fixture premise into the SceneTarget[] the converge routes require.
 * This is the step the product does not have; keeping it here, named, is how
 * the bench avoids implying otherwise.
 */
export function beatsToSceneTargets(premise) {
  return premise.beats.map((b, i) => ({
    sceneIdx: i,
    sceneFunction: b.sceneFunction,
    activeMechanisms: b.activeMechanisms,
    tensionTarget: b.tensionTarget,
    qualityTarget: 60,
    themeHint: b.themeHint,
  }));
}

/**
 * The cast-grounding ops the bench prepends to the FIRST committed scene.
 *
 * WHY. IntentionalProof is a Tier 1 proof, so it BLOCKS a commit: any op
 * referencing a character with no belief in state, and none introduced by the
 * same IR, fails it (`server/nvm/proof/tier1/intentional.ts`). A fresh session
 * has no characters, so the bench's first full run had every scene of every
 * premise rejected at POST /api/nvm/converge/commit with exactly that.
 *
 * The product has no premise-to-cast step any more than it has a
 * premise-to-outline one, so the cast is fixture data, and this is the same
 * kind of disclosed scaffolding the beats are. One UPDATE_BELIEF per member,
 * prepended to scene one only: that grounds them for every later scene AND puts
 * them in buildSystemPreamble's "known characters" line, which is what the
 * generator reads. It is NOT prepended to every scene — the bench must not
 * write the story it is measuring.
 */
export function castGroundingOps(premise) {
  return (premise.cast ?? []).map((c, i) => ({
    op: 'UPDATE_BELIEF',
    charId: c.id,
    belief: {
      id: `${premise.id}-seed-${i}`,
      proposition: c.believes,
      confidence: 0.8,
      source: 'witnessed',
      source_event_id: `${premise.id}-open`,
      acquired_at: 0,
    },
  }));
}

/** Parse one line of the server's structured log stream, or null. */
export function parseLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const o = JSON.parse(trimmed);
    return typeof o === 'object' && o !== null && typeof o.msg === 'string' ? o : null;
  } catch { return null; }
}

/**
 * Fold the structured log lines emitted during one premise into a call record.
 * `fallbacks` is the number the report must not hide: a run whose every pass
 * fell back produced no generated prose at all.
 */
export function summariseCalls(entries) {
  const calls = entries.filter((e) => e.msg === 'openai_compat_call');
  const byModel = {};
  for (const c of calls) {
    const m = String(c.model ?? '(unset)');
    byModel[m] ??= { calls: 0, ms: 0, promptTokens: 0, completionTokens: 0, empty: 0 };
    byModel[m].calls++;
    byModel[m].ms += Number(c.ms ?? 0);
    byModel[m].promptTokens += Number(c.promptTokens ?? 0);
    byModel[m].completionTokens += Number(c.completionTokens ?? 0);
    if (Number(c.completionChars ?? 0) === 0) byModel[m].empty++;
  }
  const fallbackMsgs = new Set([
    'revision_rewrite_failed',     // no provider / LLM error -> unchanged draft
    'revision_rewrite_rejected',   // output rejected (truncated, too short) -> unchanged draft
    'llm_generator_failed',        // candidate generation failed -> structural stubs
    'llm_generator_unavailable',   // no provider at all -> structural stubs
    'llm_generator_partial_parse', // some candidates degraded to stubs
  ]);
  const fallbacks = entries.filter((e) => fallbackMsgs.has(e.msg));
  const fallbackCounts = {};
  for (const f of fallbacks) fallbackCounts[f.msg] = (fallbackCounts[f.msg] ?? 0) + 1;
  return {
    llmCalls: calls.length,
    emptyCompletions: calls.filter((c) => Number(c.completionChars ?? 0) === 0).length,
    promptTokens: calls.reduce((s, c) => s + Number(c.promptTokens ?? 0), 0),
    completionTokens: calls.reduce((s, c) => s + Number(c.completionTokens ?? 0), 0),
    byModel,
    fallbacks: fallbacks.length,
    fallbackCounts,
    retries: entries.filter((e) => e.msg === 'ai_retry').length,
  };
}

/**
 * What a run produced, as a STRUCTURAL label. No prose judgement is made here
 * and none may be added: NORTH_STAR §1's no-LLM-as-judge rule applies to the
 * bench's own vocabulary as much as to the product's.
 *
 * ORDER MATTERS. The first two clauses are the original rule, unchanged and
 * still first, because `docs/CLAIMS_REGISTER.md` row 117 states exactly that
 * behaviour — "a run in which every revision pass fell back to the unchanged
 * draft is labelled FAILED, not reported as a story" — and it must stay
 * literally true.
 *
 * The three clauses after them were added in round 2 because `status: ok` was
 * the first thing a reader saw on six runs that committed 1 scene of 7 or 8 and
 * shipped 60-to-142-word fragments. `ok` is now what it sounds like:
 *
 *   FAILED    no LLM call reached the provider
 *           | every revision pass fell back to the unchanged draft
 *           | nothing committed, or NO committed scene's IR came from the model
 *   FRAGMENT  fewer than half the requested scenes committed, or fewer than 3
 *   DEGRADED  at least half committed, but not all of them
 *   ok        every requested scene committed, and a pass changed the text
 */
export function classifyRun({
  llmCalls,
  revisionPassesWithChanges,
  revisionPassCount,
  committedScenes,
  requestedScenes,
  committedNonStub,
}) {
  if (llmCalls === 0) return { ok: false, status: 'FAILED', label: 'FAILED — no LLM call reached the provider' };
  if (revisionPassCount > 0 && revisionPassesWithChanges === 0) {
    return { ok: false, status: 'FAILED', label: 'FAILED — every revision pass fell back to the unchanged draft' };
  }
  // Everything below needs the scene accounting; a caller that does not supply
  // it gets the original two-clause behaviour and nothing else, so the rule
  // claim 117 registers is unaffected by the widening.
  if (typeof committedScenes !== 'number' || typeof requestedScenes !== 'number') {
    return { ok: true, status: 'ok', label: 'ok' };
  }
  if (committedScenes === 0) {
    return { ok: false, status: 'FAILED', label: 'FAILED — no scene was committed' };
  }
  if (typeof committedNonStub === 'number' && committedNonStub === 0) {
    return {
      ok: false, status: 'FAILED',
      label: 'FAILED — no committed scene carried a model-authored op (every candidate stubbed)',
    };
  }
  if (committedScenes < 3 || committedScenes * 2 < requestedScenes) {
    return {
      ok: false, status: 'FRAGMENT',
      label: `FRAGMENT — ${committedScenes} of ${requestedScenes} scenes committed`,
    };
  }
  if (committedScenes < requestedScenes) {
    return {
      ok: false, status: 'DEGRADED',
      label: `DEGRADED — ${committedScenes} of ${requestedScenes} scenes committed`,
    };
  }
  return { ok: true, status: 'ok', label: 'ok' };
}

/** Word count of Fountain body text, excluding the title page block. */
export function scriptWordCount(fountain) {
  const body = fountain.replace(/^(?:[A-Za-z ]+:.*\n)+\n?/, '');
  return body.split(/\s+/).filter(Boolean).length;
}

/**
 * The directory this run writes to. `<date>/` for the first run of a day, then
 * `<date>-run2/`, `-run3/` ... `--out <name>` names one explicitly. Never
 * returns a directory that already holds a summary.json, so no run can destroy
 * another run's record. `--packet` reads the NEWEST such directory.
 */
export function nextRunDir(root, date, exists, explicit) {
  if (explicit) return path.join(root, explicit);
  const base = path.join(root, date);
  if (!exists(path.join(base, 'summary.json'))) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = path.join(root, `${date}-run${n}`);
    if (!exists(path.join(candidate, 'summary.json'))) return candidate;
  }
  throw new Error(`more than 999 runs under ${root} for ${date}`);
}

function allocateRunDir(argv) {
  const root = path.join(REPO, 'data', 'story-bench');
  const explicit = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
  return nextRunDir(root, runDirName(), (f) => existsSync(f), explicit);
}

/** Every run directory under data/story-bench, oldest first. */
export function listRunDirs(names) {
  return names
    .filter((d) => /^\d{4}-\d{2}-\d{2}(-run\d+)?$/.test(d))
    .sort((a, b) => {
      const key = (d) => {
        const m = /^(\d{4}-\d{2}-\d{2})(?:-run(\d+))?$/.exec(d);
        return [m[1], Number(m[2] ?? 1)];
      };
      const [da, na] = key(a); const [db, nb] = key(b);
      return da === db ? na - nb : (da < db ? -1 : 1);
    });
}

/** Fixed-width table renderer — the one artefact the lane report quotes. */
export function renderTable(rows) {
  const cols = [
    ['premise', (r) => r.id],
    ['shape', (r) => r.shape],
    ['scenes', (r) => `${r.committedScenes ?? r.scenes}/${r.requestedScenes ?? r.scenes}`],
    // model scenes = committed scenes whose IR is NOT a stub. 0/N here means
    // the run measured the stub generator, whatever the other columns say.
    ['model scenes', (r) => `${r.committedNonStub ?? 0}/${r.committedScenes ?? 0}`],
    ['words', (r) => String(r.words)],
    ['health', (r) => (r.health === null ? '—' : String(r.health))],
    ['verdict', (r) => r.verdict ?? '—'],
    ['llm calls', (r) => String(r.llmCalls)],
    ['fallbacks', (r) => String(r.fallbacks)],
    ['passes changed', (r) => `${r.revisionPassesWithChanges ?? 0}/${r.revisionPassCount ?? 0}`],
    ['wall s', (r) => (r.wallMs / 1000).toFixed(1)],
    ['tokens', (r) => String(r.promptTokens + r.completionTokens)],
    ['status', (r) => r.status],
  ];
  const header = cols.map(([h]) => h);
  const body = rows.map((r) => cols.map(([, f]) => f(r)));
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  return [
    line(header),
    '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|',
    ...body.map(line),
  ].join('\n');
}

// ── Everything below runs only as a script ──────────────────────────────────

// The CLI entry point is at the BOTTOM of this file, not here. It used to sit
// at this line, which put main() on the module's top-level await BEFORE the
// consts below were initialised: `npm run story:bench -- --packet` died with
// `Cannot access 'RUBRIC' before initialization`, while --check and a full run
// (which never reach that const) worked. Keep it last.

function loadEnvFile() {
  const envPath = path.join(REPO, '.env');
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function freePort() {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Boot the app server with the .env provider config LOADED — deliberately
 * unlike scripts/lib/browser-verify.mjs's bootKeylessServer, whose whole point
 * is to prove the keyless front door. This bench needs the opposite: a server
 * that can actually reach a model. Everything else (the server_started sniff,
 * the boot deadline) follows that helper's shape.
 */
async function bootServerWithKey({ port, logSink }) {
  const proc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      // MEASURED, NOT GUESSED. POST /api/nvm/converge defaults to a 180 s
      // budget (AI_BUDGET_CONVERGE_TIMEOUT_MS, server/routes/nvm/converge.ts).
      // One candidate-generation call against the configured reasoning model
      // measured 15-78 s (n = 5, median ~26 s), and this budget calls
      // generate() maxIterations times — so the first run of this bench lost
      // EVERY beat of its first premise to `converge failed (181s)`. The
      // default is right for a writer's request; it is not right for a bench
      // that must let the loop finish. Raised for the bench's own boot only,
      // never in the product, and only when the caller has not already set it.
      AI_BUDGET_CONVERGE_TIMEOUT_MS:
        process.env.AI_BUDGET_CONVERGE_TIMEOUT_MS ?? String(BENCH_CONVERGE_TIMEOUT_MS),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const ready = new Promise((resolve) => {
    let buf = '';
    const sniff = (d) => {
      const s = String(d);
      buf += s;
      for (const line of s.split('\n')) if (line.trim()) logSink(line);
      if (!booted && buf.includes('server_started')) { booted = true; resolve(); }
    };
    proc.stdout.on('data', sniff);
    proc.stderr.on('data', sniff);
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (40s)')), 40_000));
  await Promise.race([ready, timeout]);
  return proc;
}

async function post(base, route, body, timeoutMs = 2_400_000) {
  const res = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  if (!res.ok) {
    const err = new Error(`${route} -> HTTP ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}


// ── Loopback egress relay (sandbox only) ────────────────────────────────
// WHY THIS EXISTS, AND WHAT IT DOES NOT CHANGE.
//
// server/lib/ai-providers/openai-compat.ts deliberately supplies its OWN
// undici dispatcher, which pins the TCP connect to a DNS-resolved,
// re-validated IP (its "DNS rebinding — CLOSED at this fetch site" block).
// That pin is the point of the guard, and it also means the adapter does not
// honour an ambient HTTPS_PROXY: it dials the address it resolved. In an
// environment whose ONLY egress is a proxy, every adapter call therefore fails
// with `fetch failed` before a byte leaves the box — which is exactly what
// `npm run story:bench -- --check` reported here first.
//
// The fix is a harness fix, never a product one: weakening the pin to make a
// bench run would be trading a real SSRF guard for a measurement. Instead the
// bench starts a plain HTTP relay on 127.0.0.1, points AI_BASE_URL at it, and
// forwards each request upstream with the ambient global fetch (which the
// environment does proxy). The adapter still builds the request, still sets
// max_tokens, still reads the response — everything this lane hardened is
// exercised unchanged. What the relay replaces is one TCP hop.
//
// It engages ONLY when an outbound proxy is configured AND the direct probe
// failed, it binds loopback, and it never logs or stores the Authorization
// header it forwards.
async function startEgressRelay(upstreamBase) {
  const upstream = new URL(upstreamBase);
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', async () => {
      const target = `${upstream.origin}${upstream.pathname.replace(/\/$/, '')}${req.url}`;
      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (['host', 'connection', 'content-length'].includes(k)) continue;
        headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
      }
      try {
        const upRes = await fetch(target, {
          method: req.method,
          headers,
          body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
          signal: AbortSignal.timeout(600_000),
        });
        const body = Buffer.from(await upRes.arrayBuffer());
        res.writeHead(upRes.status, { 'content-type': upRes.headers.get('content-type') ?? 'application/json' });
        res.end(body);
      } catch (err) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'relay_failed', detail: String(err?.message ?? err).slice(0, 200) }));
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

/**
 * Probe the endpoint through the adapter exactly as the server will. When that
 * fails and a proxy is configured, stand up the relay and return its base URL
 * instead. Returns { baseUrl, relay, probe, relayed }.
 */
async function resolveReachableBaseUrl() {
  const configured = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY ?? 'not-needed';
  const { probeOpenAICompatModels } = await import(
    path.join(REPO, 'server', 'lib', 'ai-providers', 'openai-compat.ts')
  );
  const direct = await probeOpenAICompatModels({ baseURL: configured, apiKey });
  if (direct.ok) return { baseUrl: configured, relay: null, probe: direct, relayed: false };
  const proxied = Boolean(process.env.HTTPS_PROXY || process.env.https_proxy);
  if (!proxied) return { baseUrl: configured, relay: null, probe: direct, relayed: false };
  const relay = await startEgressRelay(configured);
  const viaRelay = await probeOpenAICompatModels({ baseURL: relay.base, apiKey });
  return { baseUrl: relay.base, relay, probe: viaRelay, relayed: true };
}

async function runCheck() {
  loadEnvFile();
  const baseURL = process.env.AI_BASE_URL;
  const provider = process.env.AI_PROVIDER;
  console.log(`[story-bench] AI_PROVIDER=${provider ?? '(unset)'}  AI_BASE_URL=${baseURL ?? '(unset)'}`);
  console.log(`[story-bench] key present: ${Boolean(process.env.AI_API_KEY)}`);
  if (provider !== 'openai-compat' || !baseURL) {
    console.log('[story-bench] --check only probes an openai-compat endpoint. Nothing to probe.');
    return 0;
  }
  const { probe, relay, relayed } = await resolveReachableBaseUrl();
  if (relay) relay.server.close();
  if (relayed) {
    console.log('[story-bench] direct adapter egress failed; probed through the loopback relay instead');
    console.log('[story-bench] (the adapter pins its own dispatcher and so does not use HTTPS_PROXY — see startEgressRelay)');
  }
  if (!probe.ok) {
    console.log(`[story-bench] /models probe FAILED (HTTP ${probe.status}): ${probe.error ?? ''}`);
    return 1;
  }
  console.log(`[story-bench] /models answered with ${probe.ids.length} model ids.`);
  const configured = [
    ['AI_MODEL (pro tier)', process.env.AI_MODEL],
    ['AI_FAST_MODEL (fast tier)', process.env.AI_FAST_MODEL],
  ];
  let missing = 0;
  for (const [label, id] of configured) {
    if (!id) { console.log(`  ${label}: (unset)`); continue; }
    const served = probe.ids.includes(id);
    if (!served) missing++;
    console.log(`  ${label}: ${id} — ${served ? 'SERVED' : 'NOT LISTED by this endpoint'}`);
  }
  console.log('[story-bench] (the key is never printed, logged or written to any file)');
  return missing > 0 ? 1 : 0;
}

async function runOnePremise({ base, premise, outDir, logBuffer }) {
  const sessionId = `story-bench-${premise.id}-${Date.now()}`;
  const startIdx = logBuffer.length;
  const t0 = Date.now();
  const targets = beatsToSceneTargets(premise);

  // 1. Per-beat convergence, then commit the winner so the compiler has a
  //    commit path to render. /converge-arc cannot be used here: it folds a
  //    rolling state but never writes a StoryCommit, so nothing reaches
  //    /api/nvm/compile.
  let committed = 0;
  const convergeNotes = [];
  // Which Tier 1 proof blocked each rejected scene, counted rather than left
  // inside a truncated error string. On the first working run of this bench 6
  // of 7 scenes of one premise were lost to a single proof, and the report
  // could not say which without this.
  const blockingProofs = {};
  let scenesWithoutTier1Winner = 0;
  let committedNonStub = 0;
  let modelAuthoredOps = 0;
  for (const target of targets) {
    // Progress is printed per beat on purpose. One converge call against a
    // reasoning model measured 15-78 s here (n=6, median ~26 s), so a premise
    // is minutes of silence otherwise and a stalled run is indistinguishable
    // from a slow one.
    process.stdout.write(`[story-bench]   beat ${target.sceneIdx + 1}/${targets.length} (${target.sceneFunction})... `);
    const beatStarted = Date.now();
    let result;
    try {
      result = await post(base, '/api/nvm/converge', {
        sessionId, target, seed: 20260913 + target.sceneIdx,
        budget: { ...BENCH_CONVERGE_BUDGET },
      });
    } catch (err) {
      console.log(`converge failed (${((Date.now() - beatStarted) / 1000).toFixed(0)}s)`);
      convergeNotes.push(`scene ${target.sceneIdx}: converge failed — ${String(err.message).slice(0, 200)}`);
      continue;
    }
    // WHICH IR GETS COMMITTED, and why it is not always `winner`.
    // convergeScene returns `winner: null` whenever NO candidate passed Tier 1
    // in the whole run (loop.ts's budget-exhausted return), while `ir` is
    // always populated — the argmax, or a synthesised pass-through. The route
    // hands back both, and POST /api/nvm/converge/commit RE-RUNS Tier 1 before
    // committing, so offering `ir` when there is no winner is not smuggling a
    // rejected candidate past a gate: the gate runs again, and a rejection is
    // recorded as one. Taking only `winner` would have thrown away every scene
    // of the first run for a reason the bench never wrote down.
    const winner = result?.winner;
    const ir = winner?.ir ?? result?.ir;
    const source = winner?.ir ? 'winner' : 'best-of-run (no Tier-1-passing candidate)';
    if (!ir?.ops?.length) {
      console.log(`no committable IR (${((Date.now() - beatStarted) / 1000).toFixed(0)}s)`);
      convergeNotes.push(
        `scene ${target.sceneIdx}: converge returned no committable IR `
        + `(converged=${result?.converged} composite=${result?.finalComposite} candidates=${result?.candidates?.length ?? 0})`,
      );
      continue;
    }
    if (!winner?.ir) {
      scenesWithoutTier1Winner++;
      convergeNotes.push(
        `scene ${target.sceneIdx}: no Tier-1-passing candidate in ${result?.iterations} iteration(s) `
        + `— committing the best-of-run IR instead (composite=${result?.finalComposite})`,
      );
    }
    try {
      // Scene one carries the cast grounding ahead of the generated ops (see
      // castGroundingOps). Every later scene commits exactly what converge
      // produced.
      const opsToCommit = committed === 0 ? [...castGroundingOps(premise), ...ir.ops] : ir.ops;
      await post(base, '/api/nvm/converge/commit', {
        sessionId,
        ops: opsToCommit,
        sceneIdx: target.sceneIdx,
        activeMechanisms: target.activeMechanisms,
        preconditions: ir.preconditions?.length ? ir.preconditions : ['prior scene'],
        summary: (target.themeHint ?? '').slice(0, 200),
      });
      committed++;
      // THE NUMBER THAT DECIDES WHAT A RUN MEASURED. Every IR carries
      // provenance.model, and parseIR sets it to 'stub' when the candidate
      // degraded. A committed scene whose IR is a stub contains no
      // model-authored op at all — it is the fixed template rendering of
      // stubIR's own ops — so a run in which every committed scene is a stub
      // measured the transport and the stub generator, not generation. The
      // first run of this bench was exactly that, in all six premises, and the
      // table could not show it.
      const fromModel = ir?.provenance?.model !== undefined && ir.provenance.model !== 'stub';
      if (fromModel) committedNonStub++;
      modelAuthoredOps += fromModel ? ir.ops.length : 0;
      console.log(
        `committed ${opsToCommit.length} ops from ${source}`
        + `${fromModel ? '' : ' [STUB IR — no model-authored op]'}`
        + ` (${((Date.now() - beatStarted) / 1000).toFixed(0)}s)`,
      );
    } catch (err) {
      const failures = Array.isArray(err?.body?.failures) ? err.body.failures : [];
      for (const f of failures) {
        const name = String(f?.proof ?? 'unknown');
        blockingProofs[name] = (blockingProofs[name] ?? 0) + 1;
      }
      const named = failures.map((f) => f?.proof).filter(Boolean).join(', ') || 'unknown';
      console.log(`commit rejected by ${named} (${((Date.now() - beatStarted) / 1000).toFixed(0)}s)`);
      convergeNotes.push(
        `scene ${target.sceneIdx}: commit rejected by ${named} — `
        + failures.map((f) => `${f.proof}: ${f.reason}`).join(' | ').slice(0, 400),
      );
    }
  }

  // 2. Deterministic compile (StoryOps -> Fountain via fixed templates).
  const compiled = await post(base, '/api/nvm/compile', { sessionId, title: premise.title });
  const compiledFountain = compiled?.compiled?.fountain ?? '';

  // 3. The 14-pass revision pipeline — the only prose-writing step.
  process.stdout.write(`[story-bench]   compiled ${compiledFountain.length} chars; running the 14-pass revision... `);
  const revStarted = Date.now();
  let revision = null;
  try {
    revision = await post(base, '/api/nvm/revise', { sessionId, title: premise.title });
  } catch (err) {
    convergeNotes.push(`revise failed — ${String(err.message).slice(0, 240)}`);
  }
  console.log(
    `${revision ? `${revision.passesWithChanges ?? 0}/${(revision.passResults ?? []).length} passes changed text` : 'FAILED'} `
    + `(${((Date.now() - revStarted) / 1000).toFixed(0)}s)`,
  );
  const finalFountain = revision?.finalFountain || compiledFountain;

  // 4. The deterministic score, on the final text.
  let doctor = null;
  try {
    doctor = await post(base, '/api/scriptide/doctor', { fountain: finalFountain, title: premise.title });
  } catch (err) {
    convergeNotes.push(`doctor failed — ${String(err.message).slice(0, 240)}`);
  }

  const wallMs = Date.now() - t0;
  const entries = logBuffer.slice(startIdx).map(parseLogLine).filter(Boolean);
  const calls = summariseCalls(entries);
  const passResults = revision?.passResults ?? [];
  const classification = classifyRun({
    llmCalls: calls.llmCalls,
    revisionPassesWithChanges: revision?.passesWithChanges ?? 0,
    revisionPassCount: passResults.length,
    committedScenes: committed,
    requestedScenes: targets.length,
    committedNonStub,
  });

  const report = doctor?.report ?? doctor ?? null;
  const row = {
    id: premise.id,
    title: premise.title,
    shape: premise.shape,
    scenes: report?.sceneCount ?? 0,
    words: scriptWordCount(finalFountain),
    health: typeof report?.health === 'number' ? Math.round(report.health * 10) / 10 : null,
    verdict: report?.verdict ?? null,
    llmCalls: calls.llmCalls,
    fallbacks: calls.fallbacks,
    wallMs,
    promptTokens: calls.promptTokens,
    completionTokens: calls.completionTokens,
    status: classification.status,
    committedScenes: committed,
    committedNonStub,
    modelAuthoredOps,
    requestedScenes: targets.length,
    blockingProofs,
    scenesWithoutTier1Winner,
    revisionPassesWithChanges: revision?.passesWithChanges ?? 0,
    revisionPassCount: passResults.length,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `${premise.id}.compiled.fountain`), compiledFountain);
  writeFileSync(path.join(outDir, `${premise.id}.final.fountain`), finalFountain);
  writeFileSync(path.join(outDir, `${premise.id}.doctor.json`), JSON.stringify({
    health: report?.health ?? null,
    // PASS is the REJECTION verdict, not an endorsement: verdictFor
    // (server/nvm/analyze/doctor.ts:860) is `health >= 85 && sceneCount >= 8 ->
    // RECOMMEND; health < 60 -> PASS; else CONSIDER`, and PASS is a reader
    // passing ON the script. Recorded here so nobody reads this file the way
    // this bench's own first report read it.
    verdict: report?.verdict ?? null,
    verdictMeaning: 'PASS = the doctor rejects it (health < 60); CONSIDER = middle; RECOMMEND = health >= 85 AND >= 8 scenes',
    sceneCount: report?.sceneCount ?? null,
    contentHash: report?.contentHash ?? null,
    // excerptNote and pageEstimate are the two things the doctor DOES say about
    // a thin document, and this writer used to drop both — so an instrument
    // built to report what the doctor can and cannot see discarded the doctor's
    // own disclosure, and the first run's readings then reported its absence as
    // a finding. Kept.
    excerptNote: report?.excerptNote ?? null,
    pageEstimate: report?.pageEstimate ?? null,
    topFindings: (report?.topPriorities ?? report?.issues ?? []).slice(0, 10),
  }, null, 2));
  writeFileSync(path.join(outDir, `${premise.id}.calls.json`), JSON.stringify({
    classification, committedScenes: committed, requestedScenes: targets.length,
    blockingProofs, scenesWithoutTier1Winner, committedNonStub, modelAuthoredOps,
    notes: convergeNotes,
    revision: {
      passCount: passResults.length,
      passesWithChanges: revision?.passesWithChanges ?? 0,
      totalIssuesFound: revision?.totalIssuesFound ?? 0,
      failedPasses: revision?.failedPasses ?? [],
      perPass: passResults.map((p) => ({ pass: p.pass, changed: p.changed, issues: p.issues?.length ?? 0 })),
    },
    calls, entries,
  }, null, 2));

  return { row, classification, convergeNotes, committed, requested: targets.length };
}

async function runBench(argv) {
  loadEnvFile();
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const premises = only ? fixture.premises.filter((p) => p.id === only) : fixture.premises;
  if (premises.length === 0) throw new Error(`no premise matched --only ${only}`);

  if (process.env.AI_PROVIDER === 'openai-compat' && !process.env.AI_BASE_URL) {
    console.error('[story-bench] AI_PROVIDER=openai-compat with no AI_BASE_URL — nothing to generate with.');
    return 2;
  }
  if (process.env.AI_PROVIDER !== 'openai-compat' && !process.env.GEMINI_API_KEY) {
    console.error('[story-bench] No usable LLM provider configured (.env). This bench generates; it cannot run keyless.');
    console.error('[story-bench] Nothing was measured. This is not a result.');
    return 2;
  }

  // NON-DESTRUCTIVE RUN DIRECTORIES (round 2, review MEDIUM 6). This used to
  // write table.md and summary.json into `<date>/` unconditionally, so
  // `--only <id>` after a six-premise run replaced the six-row table and
  // summary with a ONE-row one, overwrote that premise's four artifacts, and
  // turned --packet into a one-script packet — no warning, no backup. The
  // reviewer hit it reproducing a single row and had to restore 29 files by
  // hand. A run now gets its own directory and never touches an earlier one.
  const outDir = allocateRunDir(argv);
  mkdirSync(outDir, { recursive: true });
  console.log(`[story-bench] writing this run to ${path.relative(REPO, outDir)}`);

  // Reachability first: a run that discovers a dead endpoint 40 LLM calls in
  // has spent the budget and measured nothing.
  const reach = await resolveReachableBaseUrl();
  if (!reach.probe.ok) {
    console.error(`[story-bench] the configured endpoint is unreachable (HTTP ${reach.probe.status}): ${reach.probe.error ?? ''}`);
    console.error('[story-bench] Nothing was measured. This is not a result.');
    reach.relay?.server.close();
    return 2;
  }
  if (reach.relayed) {
    // Documented in startEgressRelay: a harness hop, not a product change.
    console.log('[story-bench] routing provider traffic through the loopback egress relay (see startEgressRelay).');
    process.env.AI_BASE_URL = reach.baseUrl;
  }
  for (const [label, id] of [['pro', process.env.AI_MODEL], ['fast', process.env.AI_FAST_MODEL]]) {
    if (id && !reach.probe.ids.includes(id)) {
      console.warn(`[story-bench] WARNING: the ${label}-tier model ${id} is NOT listed by this endpoint.`);
    }
  }

  const logBuffer = [];
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  console.log(`[story-bench] booting server on ${base} with the configured provider...`);
  const proc = await bootServerWithKey({ port, logSink: (l) => logBuffer.push(l) });

  const rows = [];
  const details = [];
  try {
    for (const premise of premises) {
      console.log(`[story-bench] ${premise.id} (${premise.shape}) — ${premise.beats.length} beats...`);
      const out = await runOnePremise({ base, premise, outDir, logBuffer });
      rows.push(out.row);
      details.push(out);
      console.log(
        `[story-bench]   ${out.row.status}  scenes=${out.row.scenes} words=${out.row.words} `
        + `health=${out.row.health ?? '—'} calls=${out.row.llmCalls} fallbacks=${out.row.fallbacks} `
        + `${(out.row.wallMs / 1000).toFixed(1)}s`,
      );
      for (const n of out.convergeNotes.slice(0, 3)) console.log(`[story-bench]     note: ${n}`);
    }
  } finally {
    proc.kill('SIGTERM');
    reach.relay?.server.close();
  }

  const table = renderTable(rows);
  console.log('\n' + table + '\n');
  const failed = rows.filter((r) => r.status === 'FAILED').length;
  console.log(`[story-bench] ${rows.length - failed}/${rows.length} runs produced generated prose; ${failed} FAILED (labelled, not reported as stories).`);
  console.log('[story-bench] The health column measures STRUCTURE. It does not measure whether the story is interesting.');
  writeFileSync(path.join(outDir, 'table.md'), table + '\n');
  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
    ranAt: new Date().toISOString(),
    beatSource: 'hand-authored in tests/fixtures/story-bench-premises.json — this repository has no premise-to-outline step',
    rows,
    details: details.map((d) => ({ id: d.row.id, classification: d.classification, committed: d.committed, requested: d.requested, notes: d.convergeNotes })),
  }, null, 2));
  writeFileSync(path.join(outDir, 'server.log'), logBuffer.join('\n') + '\n');
  console.log(`[story-bench] wrote ${outDir} (gitignored)`);
  return 0;
}

// ── The reading packet ──────────────────────────────────────────────────────

export const RUBRIC = [
  'Would I keep reading after page 2?',
  'Do I know what the protagonist wants?',
  'Did a scene surprise me?',
  'Does the dialogue sound like people?',
  'Would I be entertained if a friend made this?',
];

/**
 * The packet's front matter, as Fountain. Deliberately says what this is FOR:
 * Decision #3 names a ~30-case human-scored golden set, with a rubric and >=2
 * scorers, as the condition for promoting generation out of Labs. Six scored
 * scripts is the seed of that set, not the set.
 */
export function packetFrontMatter(rows, runDate) {
  const lines = [
    `Title: STORY BENCH — READING PACKET`,
    `Credit: STORYMACHINE story-bench`,
    `Draft date: ${runDate}`,
    '',
    '====',
    '',
    'HOW TO USE THIS PACKET',
    '',
    'Six scripts follow, each produced end to end by this repository\'s own',
    'generation pipeline on 2026-09-13. Nothing in them was edited by hand.',
    '',
    'Score each script 1-5 on the five questions below. There is no right',
    'answer and no aggregate to hit. A 1 is as useful as a 5.',
    '',
  ];
  RUBRIC.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
  lines.push(
    '',
    'WHY YOUR SCORES MATTER MORE THAN THE HEALTH NUMBERS',
    '',
    'The health score printed beside each script is a real, deterministic',
    'measurement of its STRUCTURE - scene count, act balance, causal chains,',
    'dialogue shape. It cannot see whether a story is interesting, whether a',
    'line sounds like a person, or whether a scene ends on a turn. Nothing in',
    'this repository can. That is what this packet is asking you for.',
    '',
    'docs/DECISION_LOG.md Decision #3 demoted the whole generative surface to',
    'Labs and named the condition for bringing it back: a roughly 30-case,',
    'human-scored golden set with a rubric, at least two scorers and a pinned',
    'model, running in CI. THIS PACKET IS THE SEED OF THAT SET - six cases of',
    'about thirty, one scorer of at least two. It does not satisfy the',
    'condition and does not promote anything out of Labs.',
    '',
    'SCORE GRID',
    '',
  );
  const idw = Math.max(8, ...rows.map((r) => r.id.length));
  lines.push('  ' + 'script'.padEnd(idw) + '  Q1  Q2  Q3  Q4  Q5   notes');
  lines.push('  ' + '-'.repeat(idw) + '  --  --  --  --  --   ' + '-'.repeat(24));
  for (const r of rows) {
    lines.push('  ' + r.id.padEnd(idw) + '  __  __  __  __  __   ' + '_'.repeat(24));
  }
  lines.push('', '====', '');
  return lines.join('\n');
}

async function runPacket() {
  const root = path.join(REPO, 'data', 'story-bench');
  if (!existsSync(root)) throw new Error('no data/story-bench — run `npm run story:bench` first');
  const dirs = listRunDirs(readdirSync(root));
  if (dirs.length === 0) throw new Error('no dated run directory under data/story-bench');
  const runName = dirs[dirs.length - 1];
  const runDate = runName.slice(0, 10);
  const outDir = path.join(root, runName);
  console.log(`[story-bench] packet from ${runName} (the newest run directory of ${dirs.length})`);
  const summary = JSON.parse(readFileSync(path.join(outDir, 'summary.json'), 'utf8'));

  const parts = [packetFrontMatter(summary.rows, runDate)];
  for (const row of summary.rows) {
    const scriptPath = path.join(outDir, `${row.id}.final.fountain`);
    if (!existsSync(scriptPath)) continue;
    const body = readFileSync(scriptPath, 'utf8').replace(/^(?:[A-Za-z ]+:.*\n)+\n?/, '');
    parts.push(
      [
        `.${row.title}`,
        '',
        `[[ ${row.shape} · ${row.scenes} scenes · ${row.words} words · structural health ${row.health ?? '—'} (${row.verdict ?? 'no verdict'}) · run status ${row.status} ]]`,
        '',
        body.trim(),
        '',
        '====',
        '',
      ].join('\n'),
    );
  }
  const fountain = parts.join('\n');
  const fountainPath = path.join(outDir, 'packet.fountain');
  writeFileSync(fountainPath, fountain);

  // The repo's OWN exporter. There is no POST /api/export/pdf — server-side
  // export offers fdx / docx / print-html / coverage; the PDF writer is
  // src/lib/pdf.ts's fountainToPdf(), which is dependency-free and runs in
  // Node exactly as it runs in the browser. Using it here means the packet is
  // laid out by the same paginator the product ships.
  const { fountainToPdf } = await import(path.join(REPO, 'src', 'lib', 'pdf.ts'));
  const bytes = fountainToPdf(fountain, {
    title: 'STORY BENCH \u2014 READING PACKET',
    author: 'STORYMACHINE story-bench',
    draftDate: runDate,
  });
  const pdfPath = path.join(outDir, 'packet.pdf');
  writeFileSync(pdfPath, Buffer.from(bytes));
  console.log(`[story-bench] packet.fountain  ${fountain.length} chars`);
  console.log(`[story-bench] packet.pdf       ${bytes.length} bytes`);
  console.log(`[story-bench] both under ${outDir} (gitignored)`);
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) { process.exit(await runCheck()); }
  if (argv.includes('--packet')) { process.exit(await runPacket()); }
  process.exit(await runBench(argv));
}

// ── CLI entry point — last, so every const above it is initialised ─────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((err) => {
    console.error(`[story-bench] ${err?.stack ?? err}`);
    process.exit(2);
  });
}
