// G0-10 — Demo corpus immutability guard.
//
// The moderator demo corpus (demo/corpus/) is a frozen, versioned copy of the
// built-in sample screenplay. This test pins the LIVE sample
// (src/lib/sample-script.ts — what the app actually runs in the demo) to the
// frozen file byte-for-byte via the manifest's sha256. Any edit to the live
// sample fails here, forcing an explicit new manifest version instead of a
// silent drift between "what was demoed" and "what ships".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fountain } from '../../src/lib/sample-script.ts';

const corpusDir = path.resolve(import.meta.dirname, '../../demo/corpus');

describe('G0-10 — frozen demo corpus matches the live sample', () => {
  const manifest = JSON.parse(readFileSync(path.join(corpusDir, 'MANIFEST.json'), 'utf8'));

  it('manifest names the frozen file and a version', () => {
    assert.equal(typeof manifest.version, 'number');
    assert.equal(typeof manifest.sha256, 'string');
    assert.equal(manifest.file, 'sample-script.fountain');
  });

  it('frozen file bytes match the manifest sha256', () => {
    const frozen = readFileSync(path.join(corpusDir, manifest.file), 'utf8');
    const hash = createHash('sha256').update(frozen, 'utf8').digest('hex');
    assert.equal(hash, manifest.sha256, 'frozen corpus file was altered without a manifest version bump');
  });

  it('LIVE sample (src/lib/sample-script.ts) is byte-identical to the frozen corpus', () => {
    const hash = createHash('sha256').update(fountain, 'utf8').digest('hex');
    assert.equal(
      hash,
      manifest.sha256,
      'live sample drifted from the frozen demo corpus — bump demo/corpus/MANIFEST.json version deliberately',
    );
  });
});
