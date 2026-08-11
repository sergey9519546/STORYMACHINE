// Canonical P3 telemetry language must preserve the operational/privacy limits
// that determine what the counters can and cannot evidence.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROADMAP = path.resolve(import.meta.dirname, '../../ROADMAP.md');

describe('ROADMAP P3 telemetry truth', () => {
  const roadmap = fs.readFileSync(ROADMAP, 'utf8');
  const p3Start = roadmap.indexOf('### P3 —');
  const p4Start = roadmap.indexOf('### P4 —', p3Start);
  assert.ok(p3Start >= 0 && p4Start > p3Start, 'expected bounded P3 section');
  const p3 = roadmap.slice(p3Start, p4Start);

  it('states the sink scope, evidence limits, and qualified privacy claim together', () => {
    assert.match(p3, /session-unlinked/i);
    assert.match(p3, /client-reported/i);
    assert.match(p3, /unauthenticated/i);
    assert.match(p3, /in-memory/i);
    assert.match(p3, /process-local|per-process/i);
    assert.match(p3, /reset(?:s)? on restart/i);
    assert.match(p3, /not durable/i);
    assert.match(p3, /not\s+deployment-wide/i);
    assert.match(p3, /not authoritative P0 evidence/i);
    assert.match(p3, /not (?:proof|a count) of unique users/i);
    assert.match(p3, /not (?:absolute|a claim of absolute) anonymity/i);
    assert.match(p3, /HTTP|network metadata/i);
  });
});
