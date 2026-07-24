// G0-06 — the "New Story" control returns to the setup wizard with the draft
// preserved (verified: App/ScriptIDE handler clears only view/config state).
// The copy must describe that true action ("Change setup"), not claim a new
// story is being started. Source-level assertions (no React render harness in
// this repo) on the toolbar item + confirm modal.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const toolbar = read('../../src/components/scriptide/Toolbar.tsx');
const scriptIde = read('../../src/components/ScriptIDE.tsx');

describe('G0-06 — "New Story" copy renamed to "Change setup"', () => {
  it('Toolbar overflow item no longer claims "New story" and offers "Change setup"', () => {
    assert.doesNotMatch(toolbar, /new story/i, 'toolbar must not label the action "New story"');
    assert.match(toolbar, /Change setup/, 'toolbar must offer a "Change setup" action');
  });

  it('ScriptIDE confirm modal no longer claims "new story" and uses setup-change copy', () => {
    assert.doesNotMatch(scriptIde, /new story/i, 'modal/button must not claim a new story');
    assert.match(scriptIde, /Change setup/, 'modal must describe changing the setup');
  });

  it('ScriptIDE keeps the honest "draft stays saved" reassurance', () => {
    assert.match(scriptIde, /current draft stays saved/i);
  });
});
