// G0-07 — the "Lore & Knowledge Base" uploader is inert: uploaded files flow
// into config.backstory, which no pipeline ever reads (ScriptIDE reads only
// theme/directorStyle; director.ts sends only scriptText/characters/state).
// The inert uploader UI and every claim that uploaded context feeds the AI
// must be removed. Source-level assertions (no React render harness here).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(__dirname, '../../src/components/startscreen/StoryConfigForm.tsx'),
  'utf8',
);

describe('G0-07 — inert ingest UI and false AI-context claims removed', () => {
  it('no "ingest" language', () => {
    assert.doesNotMatch(src, /ingest/i);
  });

  it('no "Lore & Knowledge Base" upload heading', () => {
    assert.doesNotMatch(src, /Lore\s*&\s*Knowledge Base/i);
  });

  it('no "AI context" token-meter claim', () => {
    assert.doesNotMatch(src, /AI context/i);
  });

  it('no file-upload controls (Upload Documents / file input)', () => {
    assert.doesNotMatch(src, /Upload Documents/i);
    assert.doesNotMatch(src, /Ingested Files/i);
  });
});
