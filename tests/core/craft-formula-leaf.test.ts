// craft-formula-leaf.test.ts — the craft formula stays a LEAF, and
// calibration/reference.ts stays off doctor.ts's import graph.
//
// WHY. On 2026-09-21 densityPenalty / scarcityPenalty / craftPenalty /
// computeRawCraftScore moved out of doctor.ts into
// server/nvm/analyze/craft-formula.ts, a module with no imports, and
// calibration/reference.ts switched to importing computeRawCraftScore from
// there. That removed the doctor.ts <-> reference.ts import cycle from the
// corpus-scoring path — the cycle behind two silent failure modes (a
// module-level formula const in its temporal dead zone; esbuild's `__name`
// helper under tsx). Both are structurally impossible only for as long as
// these two graph facts hold, so this test pins them the same way
// pure-core-boundary.test.ts pins the deterministic core: by walking the
// real import graph with the repo's one walker (scripts/lib/import-graph.mjs).
// See docs/audits/2026-09-21-craft-formula-leaf/README.md.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReachableSet } from '../../scripts/lib/import-graph.mjs';
import { computeRawCraftScore as fromLeaf } from '../../server/nvm/analyze/craft-formula.ts';
import { computeRawCraftScore as fromDoctor } from '../../server/nvm/analyze/doctor.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LEAF = 'server/nvm/analyze/craft-formula.ts';
const DOCTOR = 'server/nvm/analyze/doctor.ts';
const REFERENCE = 'server/nvm/analyze/calibration/reference.ts';

describe('craft-formula.ts is a leaf and reference.ts no longer reaches doctor.ts', () => {
  it('the import closure of craft-formula.ts is exactly itself', () => {
    const reachable = computeReachableSet(REPO_ROOT, [LEAF]);
    assert.deepEqual(
      [...reachable],
      [LEAF],
      `craft-formula.ts must import nothing — it reached: ${[...reachable].filter(f => f !== LEAF).join(', ')}. `
      + 'A helper the formula needs goes in this file as a hoisted function declaration, or in another '
      + 'import-free leaf; never an import of doctor.ts or calibration/**.',
    );
    // Belt and braces on the text itself: no import or export-from of any kind.
    const src = readFileSync(path.join(REPO_ROOT, LEAF), 'utf8');
    assert.equal(
      /^\s*(?:import|export)\b[^\n]*\bfrom\s+['"]/m.test(src) || /\bimport\s*\(/.test(src),
      false,
      'craft-formula.ts carries an import/export-from statement',
    );
  });

  it('calibration/reference.ts cannot reach doctor.ts (the corpus-build cycle is gone)', () => {
    const reachable = computeReachableSet(REPO_ROOT, [REFERENCE]);
    assert.equal(
      reachable.has(DOCTOR),
      false,
      'calibration/reference.ts reaches doctor.ts again. Its top-level await would then run '
      + 'doctor.ts code before doctor.ts has evaluated (on every pool worker and a tsx main thread), '
      + 'which is the mechanism behind the TDZ and `__name` failures; import from craft-formula.ts instead.',
    );
    assert.ok(reachable.has(LEAF), 'reference.ts scores the corpus through craft-formula.ts');
  });

  it('doctor.ts still reaches both, one-directionally, and re-exports the same function', () => {
    const reachable = computeReachableSet(REPO_ROOT, [DOCTOR]);
    assert.ok(reachable.has(LEAF), 'doctor.ts imports the leaf');
    assert.ok(reachable.has(REFERENCE), 'doctor.ts imports reference.ts');
    // The re-export is the leaf's binding, not a copy: every import site that
    // still names doctor.ts gets the one formula.
    assert.equal(fromDoctor, fromLeaf, 'doctor.ts must re-export craft-formula.ts\'s computeRawCraftScore by identity');
    assert.equal(fromDoctor({ critical: 1, major: 2, minor: 3 }, 10, 300), fromLeaf({ critical: 1, major: 2, minor: 3 }, 10, 300));
  });
});
