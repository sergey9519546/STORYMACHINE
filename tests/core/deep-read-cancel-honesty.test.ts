// Deep read must not claim capabilities it does not have.
//
// Two of them, both real:
//   1. /doctor/deep does not stream. The quick path reports each of the 14
//      passes as it lands; deep read fans LLM calls out inside one request and
//      answers once. The loading copy has to say what is happening and stop
//      there, rather than borrowing the streamed path's language.
//   2. Cancel on deep read does not cancel anything on the server. On the
//      streamed and pdf routes an abort closes the socket, which fires the
//      route's res 'close' handler, which aborts the signal the doctor pool
//      holds, which terminates the worker. /doctor/deep has no such seam —
//      runScriptDoctor's LLM fan-out is in-process with nothing to abort — so
//      the button stops this page waiting and nothing else, and it has to say
//      so.
//
// This file is a copy contract, checked at the source level (no jsdom harness
// — see tests/core/command-palette-wiring.test.ts). It is deliberately picky
// about the deep-read branch existing at all: the failure mode being guarded
// against is someone simplifying the three-way copy back down to one string
// that happens to be true for only one of the routes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const panel = fs.readFileSync(
  path.join(ROOT, 'src/components/scriptide/ScriptDoctorPanel.tsx'),
  'utf8',
);
const routes = fs.readFileSync(path.join(ROOT, 'server/routes/scriptide.ts'), 'utf8');

describe('ScriptDoctorPanel — the in-flight route is tracked, not guessed', () => {
  it('records which of the three routes the run went to', () => {
    assert.match(panel, /const \[lastRunRoute, setLastRunRoute\] = useState<"stream" \| "deep" \| "pdf">\("stream"\);/);
    assert.match(panel, /setLastRunRoute\(isPdf \? "pdf" : useDeepRead \? "deep" : "stream"\);/);
  });
});

describe('ScriptDoctorPanel — deep-read loading copy', () => {
  it('names what is actually happening while a deep read is in flight', () => {
    assert.match(panel, /lastRunRoute === "deep"\s*\?\s*"Deep read — contacting your AI provider…"/);
  });

  it('says out loud that this route has no progress to report', () => {
    assert.match(panel, /This route answers once, at the\s*\n?\s*end — there are no progress updates to show along the way\./);
  });

  it('keeps the per-pass progress bar on the streamed path only', () => {
    // The bar renders from streamProgress, which only the streamed route
    // ever sets — a deep run must not grow an invented bar.
    assert.match(panel, /\{streamProgress && streamProgress\.stage === "passes" && \(/);
    assert.match(panel, /role="progressbar"/);
  });
});

describe('ScriptDoctorPanel — the Cancel affordance tells the truth', () => {
  it('relabels itself for deep read rather than claiming a cancel it cannot do', () => {
    assert.match(panel, /\{lastRunRoute === "deep" \? "Stop waiting" : "Cancel"\}/);
    assert.match(panel, /"Stop waiting for this deep read"/);
  });

  it('says the provider calls keep running', () => {
    assert.match(
      panel,
      /Stops this page waiting for the deep read\. The scene reads already sent to your AI provider run to completion on the server/,
    );
  });

  it('keeps the honest server-cancel claim for the routes that really do it', () => {
    assert.match(panel, /Stop the analysis running on the server right now and free it up for the next request/);
    assert.match(panel, /Stops the analysis on the server and frees it for the next request\./);
  });

  it('does not tell a deep-read user their run was stopped on the server', () => {
    // The deep branch's copy must contain no "stops it on the server" claim.
    const deepTitle = panel.slice(
      panel.indexOf('Stops this page waiting for the deep read.'),
    ).split('"')[0];
    assert.ok(deepTitle.length > 0);
    assert.ok(
      !/stops the analysis on the server/i.test(deepTitle),
      'the deep-read tooltip must not claim a server-side stop',
    );
  });
});

describe('the route really is the way the copy describes it', () => {
  it('/doctor/deep runs in-process with no abort signal', () => {
    const deepRoute = routes.slice(
      routes.indexOf("router.post('/api/scriptide/doctor/deep'"),
      routes.indexOf("// POST /api/scriptide/doctor/pdf"),
    );
    assert.ok(deepRoute.length > 0, '/doctor/deep route not found');
    assert.match(deepRoute, /runScriptDoctor\(fountain, undefined, \{ deepRead: true \}\)/);
    assert.ok(
      !/requestAbortSignal/.test(deepRoute),
      'the deep route grew a cancellation seam — the panel copy must be updated to match',
    );
  });

  it('/doctor/stream and /doctor/pdf both thread the client abort through', () => {
    const streamRoute = routes.slice(
      routes.indexOf("router.post('/api/scriptide/doctor/stream'"),
      routes.indexOf("// POST /api/scriptide/doctor/deep"),
    );
    assert.match(streamRoute, /const signal = requestAbortSignal\(res\);/);

    const pdfRoute = routes.slice(routes.indexOf("'/api/scriptide/doctor/pdf',"));
    assert.match(pdfRoute, /runScriptDoctorOffThread\(converted\.fountain, undefined, \{\s*signal: requestAbortSignal\(res\),/);
  });
});
