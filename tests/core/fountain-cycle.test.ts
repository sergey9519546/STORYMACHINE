// Tests for src/components/editor/fountain-cycle.ts — the pure decision
// logic behind the Tab element-cycling keybinding in fountain-keymap.ts
// (see that file's header for the CodeMirror-integration half, which cannot
// be unit tested directly under this repo's test runner — see this file's
// import-failure check below, matching tests/core/editor-decorations.test.ts
// and tests/core/incremental-reparse.test.ts's precedent).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CYCLE_ORDER, planCycleStep, syntheticTextFor, type CycleElementType } from '../../src/components/editor/fountain-cycle.ts';

describe('fountain-keymap.ts cannot be imported directly under the type-stripped runner', () => {
  it('fails on its KeyBinding/EditorView type imports from @codemirror/view', async () => {
    await assert.rejects(
      () => import('../../src/components/editor/fountain-keymap.ts'),
      /does not provide an export named/,
    );
  });
});

describe('CYCLE_ORDER', () => {
  it('matches the design brief exactly: action → character → parenthetical → dialogue → transition', () => {
    assert.deepEqual(CYCLE_ORDER, ['action', 'character', 'parenthetical', 'dialogue', 'transition']);
  });
});

describe('planCycleStep — forward (Tab)', () => {
  it('the first Tab on an untouched line (current=null) lands on "action"', () => {
    assert.equal(planCycleStep(null, 1).nextType, 'action');
  });

  it('walks the full forward order from a fresh line', () => {
    let current: CycleElementType | null = null;
    const seen: CycleElementType[] = [];
    for (let i = 0; i < CYCLE_ORDER.length; i++) {
      const plan = planCycleStep(current, 1);
      seen.push(plan.nextType);
      current = plan.nextType;
    }
    assert.deepEqual(seen, CYCLE_ORDER.slice());
  });

  it('wraps from "transition" back to "action"', () => {
    assert.equal(planCycleStep('transition', 1).nextType, 'action');
  });
});

describe('planCycleStep — backward (Shift-Tab)', () => {
  it('the first Shift-Tab on an untouched line (current=null) lands on "transition"', () => {
    assert.equal(planCycleStep(null, -1).nextType, 'transition');
  });

  it('walks the full backward order from a fresh line', () => {
    let current: CycleElementType | null = null;
    const seen: CycleElementType[] = [];
    for (let i = 0; i < CYCLE_ORDER.length; i++) {
      const plan = planCycleStep(current, -1);
      seen.push(plan.nextType);
      current = plan.nextType;
    }
    assert.deepEqual(seen, CYCLE_ORDER.slice().reverse());
  });

  it('wraps from "action" back to "transition"', () => {
    assert.equal(planCycleStep('action', -1).nextType, 'transition');
  });

  it('is the exact inverse of a forward step for every real (non-null) starting type', () => {
    // null is excluded deliberately: it is a sentinel ("nothing pending
    // yet"), not a member of the cycle ring, so there is no single type a
    // round trip through it should return to — planCycleStep(null, 1) and
    // planCycleStep(null, -1) intentionally land on DIFFERENT ends of the
    // ring ('action' and 'transition' respectively; see the two "first
    // press" tests above), which a forward/back round trip cannot recover.
    for (const type of CYCLE_ORDER) {
      const forward = planCycleStep(type, 1);
      const back = planCycleStep(forward.nextType, -1);
      assert.equal(back.nextType, type, `forward+back from ${type} should return to where it started`);

      const backward = planCycleStep(type, -1);
      const forth = planCycleStep(backward.nextType, 1);
      assert.equal(forth.nextType, type, `backward+forward from ${type} should return to where it started`);
    }
  });
});

describe('planCycleStep — inserted text and cursor placement', () => {
  it('every type except parenthetical inserts nothing, cursor at line start', () => {
    for (const type of CYCLE_ORDER) {
      if (type === 'parenthetical') continue;
      const idx = CYCLE_ORDER.indexOf(type);
      const plan = planCycleStep(idx === 0 ? null : CYCLE_ORDER[idx - 1], 1);
      assert.equal(plan.nextType, type);
      assert.equal(plan.insertText, '');
      assert.equal(plan.cursorOffset, 0);
    }
  });

  it('parenthetical inserts "()" with the cursor between the parens', () => {
    const plan = planCycleStep('character', 1);
    assert.equal(plan.nextType, 'parenthetical');
    assert.equal(plan.insertText, '()');
    assert.equal(plan.cursorOffset, 1);
  });
});

describe('syntheticTextFor', () => {
  it('returns "()" for parenthetical and "" for everything else', () => {
    for (const type of CYCLE_ORDER) {
      assert.equal(syntheticTextFor(type), type === 'parenthetical' ? '()' : '');
    }
  });
});
