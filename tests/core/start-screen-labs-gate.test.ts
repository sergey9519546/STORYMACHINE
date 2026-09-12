// Nothing on the default start screen may be permanently inert.
//
// ── The defect (2026-09-12 adversarial audit, finding #10) ──────────────────
//
// Labs defaults to OFF (`src/lib/feature-flags.ts`), so `src/App.tsx` passes
// `onOpenStoryMachine` as `undefined`. StartScreen's "Advanced: Simulation"
// control has always been gated on that — `{onOpenStoryMachine && (…)}`. Two
// other controls instead called `onOpenStoryMachine?.()`, which with Labs off is
// an optional call on undefined: a no-op. "Open simulation" and "Simulate"
// therefore shipped as normal, enabled, focusable buttons that did nothing on a
// fresh keyless profile (the audit clicked both: url unchanged, content
// identical, zero page errors).
//
// Around them the default screen rendered the whole OASIS section — a full-width
// dark hero reading "WHEN YOU NEED PRESSURE / STORY MACHINE SIMULATE", a
// four-cell feature grid, and a numbered workflow whose steps 3 and 4 are
// "Simulate if needed" and "Export / return" — i.e. the product described a
// Labs-only feature as part of its core four-step loop. The "Where you are" rail
// did the same: step 4 read "Export · simulate".
//
// NORTH_STAR §1: "a Labs-gated feature degrades by not rendering at all — hide,
// don't disable. A permanently-inert control … is a worse answer than its
// absence." A disabled-with-a-reason control is NOT the alternative available
// here, because the reason would have to name the simulation feature and P2's
// exit gate is a first coverage report with zero exposure to simulation jargon.
// So: one gate, nothing deleted — with Labs ON every byte renders and behaves
// exactly as before, which the Labs-ON half of
// scripts/verify-p2-p3-surfaces.mjs already drives.
//
// Source-level assertions (no jsdom — CLAUDE.md). The DRIVEN half is that
// script's P2-deadcontrols phase, which opens `/` with no `sm_labs_enabled` and
// clicks every visible button on the start screen.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const startScreenRaw = readFileSync(path.join(REPO, 'src/components/StartScreen.tsx'), 'utf8');
/** JSX comments are stripped before the "no optional call" assertion: the fix's
 *  own comments QUOTE the handler they removed (`onOpenStoryMachine?.()`), and a
 *  substring search over the raw source would read the explanation as the
 *  code. */
const startScreen = startScreenRaw.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const app = readFileSync(path.join(REPO, 'src/App.tsx'), 'utf8');
const featureFlags = readFileSync(path.join(REPO, 'src/lib/feature-flags.ts'), 'utf8');

describe('the premise still holds — onOpenStoryMachine IS the Labs gate', () => {
  it('Labs defaults to OFF', () => {
    assert.match(featureFlags, /sm_labs_enabled/);
    assert.match(featureFlags, /export function getLabsEnabled/);
  });

  it('App.tsx passes onOpenStoryMachine only when Labs is on', () => {
    assert.match(app, /effectiveShowStoryMachine/);
    assert.match(app, /labsEnabled && showStoryMachine/);
  });
});

describe('StartScreen — no simulation control renders with Labs off', () => {
  it('never calls onOpenStoryMachine optionally (the no-op that made a button dead)', () => {
    const optionalCalls = startScreen.match(/onOpenStoryMachine\?\.\(\)/g) ?? [];
    assert.deepEqual(
      optionalCalls,
      [],
      'an `onOpenStoryMachine?.()` handler is a button that silently does nothing '
        + 'whenever Labs is off — gate the control instead',
    );
  });

  it('each of the three simulation entry points sits behind the gate', () => {
    // Every `onOpenStoryMachine()` call site must be inside an
    // `{onOpenStoryMachine && (…)}` region. Counted rather than located: three
    // call sites, three gates, and the count is what a future fourth control
    // trips.
    const callSites = (startScreen.match(/onOpenStoryMachine\(\)/g) ?? []).length;
    const gates = (startScreen.match(/\{onOpenStoryMachine && \(/g) ?? []).length;
    assert.equal(callSites, 3, `expected 3 simulation call sites, found ${callSites}`);
    assert.equal(gates, 3, `expected 3 Labs gates, found ${gates}`);
  });

  it('the OASIS section itself is gated, not deleted', () => {
    const gateIdx = startScreen.indexOf('{onOpenStoryMachine && (\n                <section aria-labelledby="oasis-heading"');
    assert.ok(gateIdx > -1, 'the OASIS section is not wrapped in a Labs gate');
    // Nothing is removed: the hero copy, the four-cell grid and the numbered
    // workflow are all still in the file, ready the moment Labs is on.
    assert.match(startScreen, /Story Machine Simulate/);
    assert.match(startScreen, /When you need pressure/);
    assert.match(startScreen, /Simulate if needed/);
    for (const cell of ['Stage', 'Agents', 'Ledger', 'Return']) {
      assert.ok(startScreen.includes(`["${cell}"`) || startScreen.includes(`"${cell}",`), `the ${cell} cell was removed`);
    }
  });

  it('the "Where you are" rail stops promising a step the default surface cannot reach', () => {
    assert.match(
      startScreen,
      /d: onOpenStoryMachine \? "Export · simulate" : "Export · verify",/,
    );
  });
});
