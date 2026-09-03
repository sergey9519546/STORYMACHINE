// Upgrade item #3 — the unrecognized-format short-circuit. A raw paste with
// zero scene headings used to run the full 14-pass doctor anyway and come
// back as a self-contradicting report (health 0, verdict PASS, five
// "nothing to fix" strengths) instead of the plain truth: this text was
// never recognized as a screenplay. server/routes/scriptide.ts's
// hasSceneHeading() catches it before the doctor ever runs, on both /doctor
// and /doctor/stream.
//
// This file covers two different claims:
//   1. hasSceneHeading() (the route's local mirror of src/lib/fountain.ts's
//      scene_heading detection, duplicated rather than imported because
//      fountain.ts sits on the scoring path) agrees with the REAL parser —
//      on all 20 calibration-corpus samples (real, hand-authored screenplay
//      text, always with headings) and on this file's own positive/negative
//      fixtures.
//   2. The two routes' actual HTTP behavior: the exact 3-line no-heading
//      paste short-circuits with `formatUnrecognized`, and a valid script
//      still runs the doctor normally.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { hasSceneHeading } from '../../server/routes/scriptide.ts';
import { parseFountain } from '../../src/lib/fountain.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import { shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';

/** Ground truth: does the REAL Fountain parser classify at least one block
 *  in `text` as a scene_heading? */
function parserHasSceneHeading(text: string): boolean {
  return parseFountain(text).some(b => b.type === 'scene_heading');
}

// The exact 3-line paste from the discovery report — no INT./EXT. at the
// start of any line (the prose mentions "INT." and "EXT." mid-sentence,
// which must NOT false-positive as a heading).
const THREE_LINE_NO_HEADING =
  'This is just a paragraph of text.\n' +
  'No scene headings anywhere.\n' +
  'Just some prose that a confused user pasted in by mistake, hoping the tool would somehow figure out what ' +
  'to do with it, but there is no INT. or EXT. anywhere in this document, no character cues, nothing that ' +
  'looks like a screenplay at all.\n';

const VALID_SCRIPT = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates.

JAX
She said midnight. It's already past that.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot.
`;

describe('hasSceneHeading — mirror agrees with the real Fountain parser', () => {
  it('agrees with parseFountain on all 20 calibration-corpus samples', () => {
    assert.equal(REFERENCE_CORPUS.length, 20, 'sanity: calibration corpus is expected to hold 20 samples');
    for (const sample of REFERENCE_CORPUS) {
      const mirror = hasSceneHeading(sample.fountain);
      const real = parserHasSceneHeading(sample.fountain);
      assert.equal(
        mirror, real,
        `mismatch on calibration sample "${sample.label}" (band: ${sample.band}): ` +
        `hasSceneHeading()=${mirror}, real parser=${real}`,
      );
      // Every calibration sample is a real screenplay excerpt — both should
      // agree it HAS a heading, not merely agree with each other.
      assert.equal(real, true, `calibration sample "${sample.label}" unexpectedly has no scene heading`);
    }
  });

  it('agrees with the real parser on the exact 3-line no-heading paste (both false)', () => {
    assert.equal(hasSceneHeading(THREE_LINE_NO_HEADING), false);
    assert.equal(parserHasSceneHeading(THREE_LINE_NO_HEADING), false);
  });

  it('agrees with the real parser on whitespace-only input (both false)', () => {
    assert.equal(hasSceneHeading('   \n  '), false);
    assert.equal(parserHasSceneHeading('   \n  '), false);
  });

  it('agrees with the real parser on a valid multi-scene script (both true)', () => {
    assert.equal(hasSceneHeading(VALID_SCRIPT), true);
    assert.equal(parserHasSceneHeading(VALID_SCRIPT), true);
  });

  it('agrees with the real parser on international heading vocabulary', () => {
    for (const heading of [
      'EST. STATION - DAY', 'I/E. CAR - NIGHT', 'INTERIOR HOUSE - DAY',
      'INTÉRIEUR MAISON - JOUR', 'INNEN WOHNUNG - TAG', 'ESTABLECIENDO CASA - DÍA',
    ]) {
      const text = `${heading}\n\nSomething happens.\n`;
      assert.equal(hasSceneHeading(text), true, `expected heading match: ${heading}`);
      assert.equal(parserHasSceneHeading(text), true, `real parser disagreed on: ${heading}`);
    }
  });

  it('agrees with the real parser on a forced (".") heading with no other slugline', () => {
    const text = '.MIDNIGHT\n\nA lone figure crosses the square.\n';
    assert.equal(hasSceneHeading(text), true);
    assert.equal(parserHasSceneHeading(text), true);
  });

  it('does not false-positive on mid-sentence "INT."/"EXT." mentions', () => {
    const text = 'He walked into the INT. of the building, then EXT. toward the car, all in one long paragraph.\n';
    assert.equal(hasSceneHeading(text), false);
    assert.equal(parserHasSceneHeading(text), false);
  });
});

describe('routes/scriptide/doctor and /doctor/stream — unrecognized-format short-circuit', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); await shutdownDoctorPool(); });

  it('POST /doctor with the exact 3-line no-heading paste returns formatUnrecognized instead of running the doctor', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: THREE_LINE_NO_HEADING }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.formatUnrecognized, true);
    assert.equal(typeof body.reason, 'string');
    assert.match(body.reason, /INT\.|EXT\./);
    assert.equal(typeof body.hint, 'string');

    // The doctor never ran: none of the report's shape should be present —
    // no self-contradicting health:0/verdict:PASS/five-strengths report.
    assert.equal('health' in body, false);
    assert.equal('passes' in body, false);
    assert.equal('verdict' in body, false);
    assert.equal('strengths' in body, false);
  });

  it('POST /doctor with whitespace-only input is NOT caught by the short-circuit (pre-existing honest zero-scene path)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: '   \n  ' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // NOT formatUnrecognized — this stays on doctor.ts's own zero-scene
    // degenerate-report path (see tests/routes/scriptide-doctor.test.ts's
    // "POST a whitespace-only fountain..." test for the full contract).
    assert.equal(body.formatUnrecognized, undefined);
    assert.equal(body.analysisComplete, false);
    assert.equal(body.sceneCount, 0);
  });

  it('POST /doctor with a valid multi-scene script still runs the doctor normally', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: VALID_SCRIPT }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.formatUnrecognized, undefined);
    assert.equal(typeof body.health, 'number');
    assert.equal(body.passes.length, 14);
  });

  it('POST /doctor/stream with the exact 3-line no-heading paste emits ONLY doctor_format_unrecognized', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: THREE_LINE_NO_HEADING }),
    });
    assert.equal(res.status, 200);

    const frames: Array<Record<string, unknown>> = [];
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = frame.split('\n').find(l => l.startsWith('data: '));
        if (line) frames.push(JSON.parse(line.slice(6)));
      }
    }

    assert.equal(frames.length, 1, `expected exactly one SSE frame, got ${JSON.stringify(frames)}`);
    assert.equal(frames[0]!.type, 'doctor_format_unrecognized');
    assert.equal(typeof frames[0]!.reason, 'string');
    assert.equal(typeof frames[0]!.hint, 'string');
  });

  it('POST /doctor/stream with a valid multi-scene script still streams a normal doctor_result', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: VALID_SCRIPT }),
    });
    assert.equal(res.status, 200);

    const frames: Array<Record<string, unknown>> = [];
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = frame.split('\n').find(l => l.startsWith('data: '));
        if (line) frames.push(JSON.parse(line.slice(6)));
      }
    }

    assert.equal(frames.some(f => f.type === 'doctor_format_unrecognized'), false);
    const resultFrame = frames.find(f => f.type === 'doctor_result');
    assert.ok(resultFrame, 'expected a doctor_result frame');
  });
});
