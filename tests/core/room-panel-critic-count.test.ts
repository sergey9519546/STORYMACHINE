// Pins the Writers' Room critic count in RoomPanel.tsx's user-facing copy
// (and header comment) to the live CRITICS array in server/nvm/room/room.ts,
// so a future critic added/removed there fails this test instead of quietly
// leaving stale prose in the UI (found stale at "six" vs. an actual 12 on
// 2026-09-03 — see docs/audits/2026-09-02-retrospective, RoomPanel discrepancy).
//
// This reads RoomPanel.tsx as text rather than rendering it (no JSX test
// harness in this repo) and spells out the number in English because the
// copy itself is prose, not a template literal — the point is to catch drift
// in the ENGLISH WORD, not to make the component compute it at runtime.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CRITICS } from '../../server/nvm/room/room.ts';

const ROOM_PANEL_PATH = fileURLToPath(
  new URL('../../src/components/RoomPanel.tsx', import.meta.url),
);

const NUMBER_WORDS: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
  7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
  13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
};

describe('RoomPanel critic-count copy', () => {
  it('CRITICS array has the count this test (and the copy below) assumes', () => {
    // Not a tautology on its own — this fails loudly if someone changes
    // CRITICS without updating the word map/copy, rather than silently
    // passing on whatever length happens to be.
    assert.ok(
      NUMBER_WORDS[CRITICS.length],
      `CRITICS.length=${CRITICS.length} has no entry in NUMBER_WORDS — add one and update RoomPanel.tsx's copy`,
    );
  });

  it('RoomPanel.tsx spells out the true critic count everywhere it names one', () => {
    const source = readFileSync(ROOM_PANEL_PATH, 'utf8');
    const trueCount = CRITICS.length;
    const trueWord = NUMBER_WORDS[trueCount];
    assert.ok(trueWord, `no English word mapped for ${trueCount} critics`);

    // The three spots the copy names a critic count: header comment,
    // pre-convene description, and the "no result yet" prompt.
    const critLine = source.match(/convenes the (\w+) standing critics/);
    const descLine = source.match(/^\s*(\w+) critics debate the current story state/m);
    const promptLine = source.match(/where the (\w+) critics stand/);

    assert.ok(critLine, 'header comment no longer names a critic count — update this test to match its new phrasing');
    assert.ok(descLine, 'pre-convene description no longer names a critic count — update this test to match its new phrasing');
    assert.ok(promptLine, '"convene the room" prompt no longer names a critic count — update this test to match its new phrasing');

    assert.equal(critLine![1].toLowerCase(), trueWord, `header comment says "${critLine![1]}" critics, CRITICS.length is ${trueCount} (${trueWord})`);
    assert.equal(descLine![1].toLowerCase(), trueWord, `pre-convene description says "${descLine![1]}" critics, CRITICS.length is ${trueCount} (${trueWord})`);
    assert.equal(promptLine![1].toLowerCase(), trueWord, `"convene the room" prompt says "${promptLine![1]}" critics, CRITICS.length is ${trueCount} (${trueWord})`);
  });
});
