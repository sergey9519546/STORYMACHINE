// server/nvm/analyze/fix-delta.ts's buildVerifyReceipt has shipped
// `identicalAnalysis` since the 2026-09-05 review round-1 lane (finding
// D4), but nothing in src/ read it — the receipt still showed two
// different contentHashes for a whitespace-only edit with no sentence
// explaining they measure the same thing. No React render harness exists in
// this repo (see tests/core/shape-rhythm-panel-copy.test.ts's own header),
// so — matching that file's own convention — this asserts on the component
// source directly.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(resolve(__dirname, '../../src/components/scriptide/ScriptDoctorPanel.tsx'), 'utf8');

describe('ScriptDoctorPanel — the fix-and-verify receipt renders identicalAnalysis (2026-09-05 review round 2, finding D4)', () => {
  it('the client FixVerifyReceipt type carries identicalAnalysis', () => {
    assert.match(panel, /identicalAnalysis\?:\s*boolean/);
  });

  it('renders the "no measured difference" sentence', () => {
    assert.match(panel, /No measured difference/);
  });

  it('is gated on identicalAnalysis being true', () => {
    // The exact JSX condition, not just the surrounding prose — a future
    // edit that keeps the sentence but drops the gate would still match a
    // looser regex.
    assert.match(panel, /result\.identicalAnalysis\s*&&/);
  });

  it('is gated on the hashes actually disagreeing — never rendered alongside an already-identical-hash receipt, which would be redundant noise next to the health/verdict readout already saying nothing changed', () => {
    assert.match(panel, /result\.identicalAnalysis\s*&&\s*before\.contentHash\s*!==\s*after\.contentHash/);
  });
});
