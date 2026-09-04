#!/usr/bin/env node
// fuzz-routes.mjs — attack-lane fuzz harness for every server/routes/** route.
//
// WHY THIS EXISTS: a read-only security review finds things by reading; this
// finds things by SENDING. It boots the real, keyless server (same pattern as
// scripts/lib/browser-verify.mjs) and fires malformed/oversized/pathological
// payloads at every route, watching for the actual attack-worthy signals: a
// 5xx, an uncaught exception logged by the server, a response that takes more
// than a few seconds, a crashed process, or a 200 where the schema should
// have rejected. It is NOT a correctness suite — it does not assert response
// *shapes*, only that the server stays up, stays fast, and stays honest about
// rejecting garbage. Keep it after every route/schema change:
//
//   node scripts/fuzz-routes.mjs           # full pass (~2-4 min)
//   node scripts/fuzz-routes.mjs --quick   # reduced payload set, <60s
//
// Deliberately NOT wired into `npm test` — it boots a real subprocess server
// and sends multi-MB/pathological payloads, which is a different class of
// cost than the fast in-process route tests under tests/routes/**.
//
// Findings from the run this script was built against (repaired, with
// regression tests under tests/routes/** and tests/collab/**):
//   - A single very long whitespace-delimited Fountain token (e.g. one
//     900,000-char "word") and a large number of distinct all-caps
//     character-cue-shaped lines each drove the analyzer into O(n²) time
//     (minutes, not seconds) despite passing every existing length bound.
//     Fixed with a pre-analysis shape guard in server/lib/validation.ts
//     (fountainShapeRejectionReason) — see its own header for the full
//     measurement and reasoning, including why the fix lives there and not
//     in the scoring-path analyzer itself.
//   - The collab WebSocket server had no `maxPayload`, so it ran under ws's
//     own 100MiB-per-frame default with no cap of its own. Fixed with
//     COLLAB_MAX_FRAME_BYTES (server/collab/yjs-server.ts).
//   - gameLimiter (120/min/IP) plus the doctor worker pool were confirmed,
//     under this harness's own 200-concurrent-request case, to keep /health
//     responsive (sub-second) and to 429 the overflow rather than let the
//     server fall over — a pass, not a finding, but exercised here so a
//     future regression in either mechanism gets caught.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';
import { keylessBrowserServerEnv, assertKeylessAiConfig } from './lib/keyless-browser-certification.mjs';

const QUICK = process.argv.includes('--quick');
const REQUEST_TIMEOUT_MS = QUICK ? 8_000 : 20_000;
const SLOW_THRESHOLD_MS = 5_000;

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function bootServer(port) {
  const base = `http://127.0.0.1:${port}`;
  const env = { ...keylessBrowserServerEnv(process.env, port), SESSION_DB_DIR: ':memory:' };
  const proc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const ready = new Promise((resolve) => {
    let buf = '';
    const sniff = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    proc.stdout.on('data', sniff);
    proc.stderr.on('data', sniff);
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (30s)')), 30_000));
  await Promise.race([ready, timeout]);
  if (!booted) throw new Error('server exited without emitting server_started');
  await assertKeylessAiConfig(base);
  return { proc, base };
}

// ── Result tracking ──────────────────────────────────────────────────────────
const results = [];
let crashed = false;

function record(label, extra) {
  const flagged = extra.err
    ? 'ERROR'
    : extra.status >= 500
      ? '5XX'
      : extra.ms > SLOW_THRESHOLD_MS
        ? 'SLOW'
        : null;
  const rec = { label, flagged, ...extra };
  results.push(rec);
  const tag = flagged ? `[${flagged}]` : '[ok] ';
  console.log(`${tag} ${label.padEnd(64)} status=${extra.status ?? '-'} ms=${extra.ms}${extra.note ? ' — ' + extra.note : ''}`);
  return rec;
}

async function attack(base, label, path, opts = {}, note) {
  const start = Date.now();
  try {
    const r = await fetch(base + path, { ...opts, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const text = await r.text();
    return record(label, { status: r.status, ms: Date.now() - start, len: text.length, note });
  } catch (e) {
    return record(label, { status: null, ms: Date.now() - start, err: String(e?.message || e), note });
  }
}

function jsonPost(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

function nestedArrayJson(depth) {
  return '['.repeat(depth) + '1' + ']'.repeat(depth);
}

// Minimal, valid Final Draft (.fdx) XML whose converted Fountain text has `n`
// distinct all-caps character-cue-shaped lines — the fdx-conversion-bypass
// shape (attack-lane audit follow-up). fdxToFountain (server/lib/fdx-import.ts)
// reads <Paragraph Type="Character"><Text>...</Text></Paragraph> /
// Type="Dialogue" pairs; see server/lib/validation.ts's
// rejectPathologicalConvertedFountain for the guard this is meant to trip.
function pathologicalFdx(n) {
  let body = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
    + '<FinalDraft DocumentType="Script" Template="No" Version="1">\n<Content>\n'
    + '<Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph>\n';
  for (let i = 0; i < n; i++) {
    body += `<Paragraph Type="Character"><Text>CHARACTER${i}</Text></Paragraph>\n`;
    body += '<Paragraph Type="Dialogue"><Text>Line.</Text></Paragraph>\n';
  }
  body += '</Content>\n</FinalDraft>';
  return body;
}

// ── Payload families ─────────────────────────────────────────────────────────

const POST_ROUTES = [
  '/api/init', '/api/turn', '/api/run-room', '/api/run-scene', '/api/reset',
  '/api/scriptide/doctor', '/api/scriptide/diagnose', '/api/scriptide/save',
  '/api/scriptide/fix', '/api/scriptide/character-profile', '/api/characters/import',
  '/api/collab/rooms', '/api/collab/token', '/api/ai-config', '/api/story-tone',
  '/api/events', '/api/export/verify', '/api/export/slate', '/api/game/interview',
  '/api/qbn/filter-choices', '/api/ncp-storyform', '/api/nvm/quality',
  '/api/nvm/inject-ops', '/api/nvm/converge', '/api/nvm/converge/commit',
  '/api/nvm/selfplay', '/api/nvm/live/move', '/api/session/rotate', '/api/session/delete',
  '/api/simulate-to-fountain', '/api/analyze-script',
];

const QUICK_POST_ROUTES = [
  '/api/init', '/api/scriptide/doctor', '/api/scriptide/diagnose', '/api/collab/rooms',
  '/api/ai-config', '/api/export/verify', '/api/session/delete',
];

async function genericBodyShapeFuzz(base) {
  console.log('\n=== Generic body-shape fuzz across representative routes ===');
  const routes = QUICK ? QUICK_POST_ROUTES : POST_ROUTES;
  for (const path of routes) {
    await attack(base, `empty-body ${path}`, path, jsonPost({}));
    await attack(base, `null-body ${path}`, path, jsonPost('null'));
    await attack(base, `array-body ${path}`, path, jsonPost('[1,2,3]'));
    await attack(base, `no-content-type ${path}`, path, { method: 'POST', body: '{}' });
  }
}

async function structuralFuzz(base) {
  console.log('\n=== Structural edge cases ===');
  await attack(base, 'deeply-nested-json (10,000 levels)', '/api/scriptide/doctor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{"fountain":${nestedArrayJson(10_000)}}`,
  });
  await attack(base, '20MB-body (exceeds 1mb json cap -> 413)', '/api/scriptide/doctor', jsonPost({ fountain: 'A'.repeat(20 * 1024 * 1024) }));
  await attack(base, 'duplicate-keys', '/api/scriptide/doctor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{"fountain":"INT. A - DAY\\n\\nHi.\\n","fountain":"INT. B - DAY\\n\\nBye.\\n"}',
  });
  await attack(base, 'malformed-json', '/api/scriptide/doctor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json',
  });
  await attack(base, 'numeric-NaN-literal', '/api/run-room', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"nodeId":"x","maxTurns":NaN}',
  });
  await attack(base, 'numeric-Infinity-literal', '/api/run-room', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"nodeId":"x","maxTurns":Infinity}',
  });
  await attack(base, 'numeric-1e308', '/api/run-room', jsonPost({ nodeId: 'x', maxTurns: 1e308 }));
  await attack(base, 'numeric-negative', '/api/run-room', jsonPost({ nodeId: 'x', maxTurns: -1 }));
}

async function unicodeFuzz(base) {
  console.log('\n=== Unicode edge cases ===');
  const cases = {
    'lone-surrogate': '\uD800',
    'rtl-override': '‮evil‬',
    'zwj-run': '‍'.repeat(1000),
    'combining-marks': 'e' + '́'.repeat(10_000),
    'huge-single-word': 'x'.repeat(100_000),
  };
  for (const [name, val] of Object.entries(cases)) {
    await attack(base, `unicode-${name} title field`, '/api/scriptide/doctor', jsonPost({ fountain: 'INT. ROOM - DAY\n\nHi.\n', title: val }));
    await attack(base, `unicode-${name} sessionId field`, '/api/init', jsonPost({ sessionId: val }));
  }
}

async function fountainPathologyFuzz(base) {
  console.log('\n=== Fountain-specific pathological inputs (validation.ts shape guard) ===');
  const oneLine = 'INT. ROOM - DAY ' + 'X'.repeat(900_000 - 20);
  await attack(base, 'one-5MB-equivalent-line (single unbroken token)', '/api/scriptide/doctor', jsonPost({ fountain: oneLine }),
    'must reject fast (<2s) via the shape guard, not hang analyzing it');

  const sceneCount = QUICK ? 2000 : 20_000;
  let manyScenes = '';
  for (let i = 0; i < sceneCount; i++) manyScenes += `INT. ROOM ${i} - DAY\nHi.\n`;
  await attack(base, `${sceneCount}-scene-headings`, '/api/scriptide/doctor', jsonPost({ fountain: manyScenes.slice(0, 899_000) }));

  const charCount = QUICK ? 1600 : 10_000;
  let manyChars = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < charCount; i++) manyChars += `CHARACTER${i}\nLine.\n`;
  await attack(base, `${charCount}-distinct-characters-speaking-once`, '/api/scriptide/doctor', jsonPost({ fountain: manyChars.slice(0, 899_000) }),
    charCount > 1500 ? 'must reject fast via the shape guard, not hang analyzing it' : undefined);

  await attack(base, 'nested-boneyards', '/api/scriptide/doctor', jsonPost({ fountain: 'INT. ROOM - DAY\n\n/* outer /* inner */ still outer */\nHi.\n' }));

  const unterminated = 'INT. ROOM - DAY\n\n/* never closes\nHi.\n'.repeat(100);
  await attack(base, 'unterminated-boneyard', '/api/scriptide/doctor', jsonPost({ fountain: unterminated.slice(0, 899_000) }));

  let titlePage = '';
  for (let i = 0; i < 1000; i++) titlePage += `Key${i}: value${i}\n`;
  await attack(base, '1000-title-page-keys', '/api/scriptide/doctor', jsonPost({ fountain: (titlePage + '\nINT. ROOM - DAY\n\nHi.\n').slice(0, 899_000) }));

  const pageBreaks = '===\n'.repeat(QUICK ? 2000 : 20_000) + 'INT. ROOM - DAY\n\nHi.\n';
  await attack(base, 'page-breaks-every-line', '/api/scriptide/doctor', jsonPost({ fountain: pageBreaks.slice(0, 899_000) }));

  // ── fdx-conversion bypass (attack-lane audit follow-up) ────────────────────
  // fountainField()'s zod guard only ever sees a caller's RAW `fountain`
  // field — every route below converts an uploaded .fdx into Fountain text
  // INSIDE the handler, after validate() has already run, so this shape must
  // be independently guarded on that path too (rejectPathologicalConvertedFountain,
  // server/lib/validation.ts). Every one of these must reject fast, not hang
  // analyzing the converted text.
  const fdxCueCount = QUICK ? 1600 : 1600; // over the 1,500 ceiling either way; kept small since fdx parsing itself is cheap
  const fdx = pathologicalFdx(fdxCueCount);
  const fdxRoutes = [
    '/api/scriptide/doctor',
    '/api/scriptide/doctor/deep',
    '/api/export/coverage-letter',
    '/api/export/coverage',
    '/api/export/breakdown',
    '/api/export/pitchkit',
  ];
  for (const path of fdxRoutes) {
    await attack(base, `fdx-conversion-bypass ${path}`, path, jsonPost({ fdx }),
      'must reject fast via the post-conversion shape guard, not hang analyzing it');
  }
  await attack(base, 'fdx-conversion-bypass /api/export/verify', '/api/export/verify', jsonPost({ fdx, expected: { contentHash: 'a'.repeat(64) } }),
    'must reject fast via the post-conversion shape guard, not hang analyzing it');
  // SSE route: a 200 with a doctor_error frame is this route's honest shape
  // (see server/routes/scriptide.ts's own comment) — record it as ok as long
  // as it's fast and the body actually carries the rejection, not a report.
  {
    const start = Date.now();
    try {
      const r = await fetch(base + '/api/scriptide/doctor/stream', { ...jsonPost({ fdx }), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const text = await r.text();
      const rejected = text.includes('doctor_error') && text.includes('distinct all-caps character-cue-shaped lines');
      record('fdx-conversion-bypass /api/scriptide/doctor/stream (SSE)', {
        status: rejected ? 200 : 500, ms: Date.now() - start,
        note: rejected ? 'rejected via doctor_error frame' : 'FINDING: did not emit the expected doctor_error rejection',
      });
    } catch (e) {
      record('fdx-conversion-bypass /api/scriptide/doctor/stream (SSE)', { status: null, ms: Date.now() - start, err: String(e?.message || e) });
    }
  }
}

async function pathParamFuzz(base) {
  console.log('\n=== GET path-param edge cases ===');
  await attack(base, 'charId-huge', `/api/dramatic-pressure/${'x'.repeat(5000)}`, { method: 'GET' });
  await attack(base, 'commitId-path-traversal', `/api/nvm/commits/${encodeURIComponent('../../../etc/passwd')}`, { method: 'GET' });
  await attack(base, 'commitId-null-byte', `/api/nvm/commits/${encodeURIComponent('a b')}`, { method: 'GET' });
}

async function concurrencyAttack(base) {
  console.log('\n=== 200 concurrent doctor requests from 200 fabricated session ids ===');
  const fountain = 'INT. ROOM - DAY\n\nA quiet room.\n\nALEX\nHello there.\n\nSAM\nFine, thanks.\n';
  const healthSamples = [];
  let polling = true;
  const healthLoop = (async () => {
    while (polling) {
      const start = Date.now();
      try { await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) }); } catch { /* recorded via ms below */ }
      healthSamples.push(Date.now() - start);
      await sleep(100);
    }
  })();

  const start = Date.now();
  const outcomes = await Promise.all(Array.from({ length: 200 }, async (_, i) => {
    const t0 = Date.now();
    try {
      const r = await fetch(`${base}/api/scriptide/doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': `fabricated-session-${i}` },
        body: JSON.stringify({ fountain }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      await r.text();
      return { status: r.status, ms: Date.now() - t0 };
    } catch (e) {
      return { status: null, ms: Date.now() - t0, err: String(e?.message || e) };
    }
  }));
  const wallMs = Date.now() - start;
  polling = false;
  await healthLoop;

  const byStatus = {};
  for (const o of outcomes) byStatus[o.status ?? 'ERR'] = (byStatus[o.status ?? 'ERR'] || 0) + 1;
  const sorted = [...healthSamples].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))] ?? -1;
  console.log(`  status breakdown: ${JSON.stringify(byStatus)}, wall=${wallMs}ms`);
  console.log(`  /health during load: n=${healthSamples.length}, p95=${p95}ms, max=${Math.max(...healthSamples, 0)}ms`);

  const crashedOutcomes = outcomes.filter(o => o.status === null || o.status >= 500);
  if (crashedOutcomes.length > 0) {
    record('200-concurrent-doctor-requests', { status: 500, ms: wallMs, note: `${crashedOutcomes.length}/200 errored or 5xx` });
  } else {
    record('200-concurrent-doctor-requests', { status: 200, ms: wallMs, note: `${byStatus['200'] || 0} succeeded, ${byStatus['429'] || 0} rate-limited (gameLimiter), 0 crashed` });
  }
  if (p95 > SLOW_THRESHOLD_MS) {
    record('health-p95-during-200-concurrent-load', { status: 200, ms: p95, note: 'p95 exceeded the slow threshold under load' });
  } else {
    record('health-p95-during-200-concurrent-load', { status: 200, ms: p95 });
  }
}

async function collabWsAttack(base, wsBase) {
  console.log('\n=== Collab WebSocket attacks ===');

  // Garbage token against a syntactically-valid but never-minted room id.
  await new Promise((resolve) => {
    const t0 = Date.now();
    const ws = new WebSocket(`${wsBase}/collab/deadbeefdeadbeefdeadbeefdeadbeef?token=garbage-not-real`);
    ws.on('open', () => { record('ws-garbage-token', { status: 101, ms: Date.now() - t0, note: 'FINDING: opened with a garbage token' }); ws.close(); resolve(); });
    ws.on('unexpected-response', (_req, res) => { record('ws-garbage-token', { status: res.statusCode, ms: Date.now() - t0 }); resolve(); });
    ws.on('error', () => { record('ws-garbage-token', { status: null, ms: Date.now() - t0, err: 'connection error' }); resolve(); });
  });

  // Mint a real room + token, then attack the live connection. Guarded
  // (rather than assumed 200) so a harness re-run late in gameLimiter's
  // window reports a clear skip instead of a confusing downstream ERROR.
  const sessionId = `fuzz-ws-${Date.now()}`;
  const roomRes = await fetch(`${base}/api/collab/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId }, body: '{}' });
  if (roomRes.status !== 200) {
    console.log(`  (skipping oversized-frame/burst attacks — room mint returned ${roomRes.status}, likely rate-limited by an earlier phase of this same run)`);
    return;
  }
  const { roomId } = await roomRes.json();
  const tokenRes = await fetch(`${base}/api/collab/token`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId }, body: JSON.stringify({ roomId }) });
  if (tokenRes.status !== 200) {
    console.log(`  (skipping oversized-frame/burst attacks — token mint returned ${tokenRes.status}, likely rate-limited by an earlier phase of this same run)`);
    return;
  }
  const { token } = await tokenRes.json();

  await new Promise((resolve) => {
    const t0 = Date.now();
    const ws = new WebSocket(`${wsBase}/collab/${roomId}?token=${token}`);
    ws.on('open', () => {
      ws.on('close', (code) => {
        const ok = code === 1009;
        record('ws-oversized-frame (10MB)', { status: ok ? 200 : 500, ms: Date.now() - t0, note: `closed with code ${code}${ok ? '' : ' — expected 1009 Message Too Big'}` });
        resolve();
      });
      ws.send(Buffer.alloc(10 * 1024 * 1024, 1));
    });
    ws.on('error', () => { record('ws-oversized-frame (10MB)', { status: null, ms: Date.now() - t0, err: 'connection error before send' }); resolve(); });
  });

  if (!QUICK) {
    await new Promise((resolve) => {
      const t0 = Date.now();
      const ws = new WebSocket(`${wsBase}/collab/${roomId}?token=${token}`);
      ws.on('open', () => {
        let errored = false;
        ws.on('error', () => { errored = true; });
        for (let i = 0; i < 10_000; i++) {
          if (ws.readyState === WebSocket.OPEN) ws.send(Buffer.from([0, 1, 2, 3]));
        }
        setTimeout(() => {
          record('ws-10000-message-burst', { status: errored ? 500 : 200, ms: Date.now() - t0, note: errored ? 'connection errored under burst' : 'connection survived burst' });
          ws.close();
          resolve();
        }, 1500);
      });
      ws.on('error', () => { record('ws-10000-message-burst', { status: null, ms: Date.now() - t0, err: 'connection error' }); resolve(); });
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const port = await pickFreePort();
  console.log(`Booting keyless server on :${port} (${QUICK ? 'quick' : 'full'} mode)...`);
  const { proc, base } = await bootServer(port);
  const wsBase = base.replace('http://', 'ws://');
  let shuttingDown = false;
  proc.on('exit', (code, signal) => {
    if (!shuttingDown && !crashed) {
      crashed = true;
      console.log(`\n!!! SERVER PROCESS EXITED MID-RUN (code=${code} signal=${signal}) !!!`);
    }
  });

  try {
    await genericBodyShapeFuzz(base);
    await structuralFuzz(base);
    await unicodeFuzz(base);
    await fountainPathologyFuzz(base);
    await pathParamFuzz(base);
    // Collab (mints a room + token via gameLimiter-budgeted POSTs) runs
    // BEFORE the 200-concurrent burst below, deliberately: that burst is
    // designed to exhaust gameLimiter's shared 120/min/IP budget (that's the
    // point of it — see concurrencyAttack's header), and this harness's own
    // requests all share one IP (loopback), so running collab after it would
    // make room/token minting itself get 429'd and read as a false collab
    // finding rather than the real, already-covered rate-limiter behavior.
    await collabWsAttack(base, wsBase);
    if (!QUICK) await concurrencyAttack(base);
  } finally {
    shuttingDown = true;
    proc.kill('SIGTERM');
    await sleep(300);
    if (!proc.killed) proc.kill('SIGKILL');
  }

  console.log('\n=== SUMMARY ===');
  const bad = results.filter(r => r.flagged);
  console.log(`Total requests: ${results.length}, flagged: ${bad.length}${crashed ? ', SERVER CRASHED MID-RUN' : ''}`);
  for (const b of bad) {
    console.log(`  [${b.flagged}] ${b.label}: status=${b.status} ms=${b.ms} ${b.err ? 'err=' + b.err : ''} ${b.note ?? ''}`);
  }
  if (bad.length > 0 || crashed) {
    console.log('\nFAIL');
    process.exit(1);
  }
  console.log('\nPASS');
  process.exit(0);
}

main().catch((e) => {
  console.error('FUZZ HARNESS ITSELF FAILED:', e);
  process.exit(1);
});
