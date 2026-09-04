// server/lib/validation.ts's fountainShapeRejectionReason() vs.
// src/lib/fountain.ts's CHARACTER_CUE_RE — cue-definition parity
// (2026-09-04, adversarial audit).
//
// WHAT WAS WRONG. The guard's distinct-cue-line detector used its own local
// proxy, `CUE_LIKE_LINE_RE = /^[A-Z0-9 .,'()&\-]{1,40}$/` — ASCII-only, with a
// 40-char cap — while the analyzer's real cue test,
// src/lib/fountain.ts's CHARACTER_CUE_RE, is Unicode (`\p{Lu}\p{Lt}`, the
// 2026-09-03 cue-alphabet widening), allows `#`, and has no length cap. Four
// families of line are ordinary character cues to the analyzer and were
// therefore invisible to the guard's 1,500-distinct-cue budget: non-ASCII
// capitals (Cyrillic, Greek, accented Latin), cues containing `#`, and cues
// over 40 characters. Measured directly against the pre-fix guard: 2,000
// distinct Cyrillic cues produced HTTP 200 in 6.3s through POST
// /api/scriptide/doctor (quadratic cost against the analyzer's tokenizer /
// character-extraction), both submitted as raw fountain and via a converted
// .fdx.
//
// THE FIX. server/lib/validation.ts now composes its own (deliberately
// loose, over-counting) cue-line proxy from src/lib/fountain.ts's exported
// CUE_INITIAL_CLASS / CUE_LETTER_CLASS alphabet classes — the same shared
// definition CHARACTER_CUE_RE itself is built from, and that
// server/nvm/analyze/screenplay-normalizer.ts's own cue test already
// composes the same way — instead of maintaining a second, independently
// hand-picked ASCII alphabet that can drift from it. See that composition's
// own comment in validation.ts. This file is the parity proof: every family
// the audit found blind now trips the guard (Part 1), using CHARACTER_CUE_RE
// itself (imported directly below) only as the ORACLE that proves each
// synthetic line really is a character cue to the analyzer, and the guard
// still lets every fixture the repo ships pass straight through unrejected
// (Part 2) — the fix must not have traded a false negative for a false
// positive on real content.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fountainShapeRejectionReason,
  MAX_FOUNTAIN_DISTINCT_CUE_LINES,
} from '../../server/lib/validation.ts';
import { CHARACTER_CUE_RE } from '../../src/lib/fountain.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REJECTION_RE = new RegExp(
  `more than ${MAX_FOUNTAIN_DISTINCT_CUE_LINES} distinct all-caps character-cue-shaped lines`,
);

// One distinct cue-shaped line per index, for each of the four bypass
// families the audit named plus a plain-ASCII control (proves the harness
// itself, and the pre-existing ASCII path, still work).
const CUE_LINE_BUILDERS: Record<string, (i: number) => string> = {
  'plain ASCII (control)': (i) => `CHARACTER${i}`,
  'Cyrillic': (i) => `ПЕРСОНАЖ${i}`,
  'Greek': (i) => `ΧΑΡΑΚΤΗΡΑΣ${i}`,
  'accented Latin': (i) => `JOSÉ MARÍA ZOË${i}`,
  '# in the cue': (i) => `CHARACTER #${i}`,
  '41+ char cue': (i) => `A VERY LONG CHARACTER NAME OVER FORTY CHARACTERS ${i}`,
};

function buildFountainWithCues(count: number, cueOf: (i: number) => string): string {
  let text = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < count; i++) text += `${cueOf(i)}\nLine.\n`;
  return text;
}

describe('fountainShapeRejectionReason — cue-definition parity with CHARACTER_CUE_RE', () => {
  // Sanity: every family's generated line must itself satisfy the analyzer's
  // real cue test, and must NOT have satisfied the OLD ASCII/40-char proxy —
  // otherwise these are not actually testing the four blind spots the audit
  // found. (41+ char cue" is intentionally checked with `<` since the old
  // regex's cap was inclusive of 40.)
  const OLD_ASCII_40_CAP_RE = /^[A-Z0-9 .,'()&\-]{1,40}$/;
  for (const [family, cueOf] of Object.entries(CUE_LINE_BUILDERS)) {
    const sample = cueOf(0);
    it(`sanity: "${family}" sample line ("${sample}") matches CHARACTER_CUE_RE`, () => {
      assert.match(sample, CHARACTER_CUE_RE);
    });
    if (family !== 'plain ASCII (control)') {
      it(`sanity: "${family}" sample line did NOT match the old ASCII/40-char proxy`, () => {
        assert.doesNotMatch(sample, OLD_ASCII_40_CAP_RE);
      });
    }
  }

  for (const [family, cueOf] of Object.entries(CUE_LINE_BUILDERS)) {
    it(`rejects ${MAX_FOUNTAIN_DISTINCT_CUE_LINES + 500} distinct "${family}" cues`, () => {
      const text = buildFountainWithCues(MAX_FOUNTAIN_DISTINCT_CUE_LINES + 500, cueOf);
      const reason = fountainShapeRejectionReason(text);
      assert.ok(reason, `expected "${family}" family to be rejected — the guard did not fire`);
      assert.match(reason!, REJECTION_RE);
    });

    it(`does NOT reject a legitimate small cast (5) of "${family}" cues`, () => {
      const text = buildFountainWithCues(5, cueOf);
      assert.equal(fountainShapeRejectionReason(text), null);
    });
  }

  it('the guard budget is a cue COUNT, not a byte count: a 2,000-cue Cyrillic script (far more total bytes than a 2,000-cue ASCII script) is rejected by the SAME message', () => {
    const cyrillicReason = fountainShapeRejectionReason(
      buildFountainWithCues(2000, CUE_LINE_BUILDERS['Cyrillic']!),
    );
    const asciiReason = fountainShapeRejectionReason(
      buildFountainWithCues(2000, CUE_LINE_BUILDERS['plain ASCII (control)']!),
    );
    assert.equal(cyrillicReason, asciiReason);
  });
});

// ── Part 2: every fixture this repo ships must still pass ───────────────────
// The threshold-independence proof above is only half the guarantee — a
// guard using the real, wider cue alphabet must not turn around and start
// rejecting ordinary scripts it used to accept. Sweep every *.fountain file
// tracked in the repo (excluding node_modules/build/dist/coverage, which are
// gitignored and never fixtures) plus the two in-code fixture sets the
// output-identity harness (scripts/check-doctor-output-identity.mjs) also
// treats as "the deterministic fixture set": the 20 calibration
// REFERENCE_CORPUS samples and the P0 sample script.
const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'build', 'dist', 'coverage', '.git']);

function findFountainFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findFountainFiles(full));
    } else if (entry.endsWith('.fountain')) {
      out.push(full);
    }
  }
  return out;
}

describe('fountainShapeRejectionReason — every committed fixture still passes the guard', async () => {
  const { readFileSync } = await import('node:fs');
  const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
  const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');

  const fountainFiles = findFountainFiles(REPO_ROOT);
  const blindPairFiles = fountainFiles.filter((f) => f.includes(`${path.sep}blind-pairs${path.sep}`));
  const screenplayFiles = fountainFiles.filter((f) => f.includes(`${path.sep}data${path.sep}screenplays${path.sep}`));

  it('found every expected fixture group on disk (a shrinking count here means this sweep silently lost coverage)', () => {
    // 12 blind-pair fixtures and 20 data/screenplays/*.fountain — the two
    // groups the lane brief named explicitly by count.
    assert.equal(blindPairFiles.length, 12, `expected 12 blind-pair fixtures, found ${blindPairFiles.length}`);
    assert.equal(screenplayFiles.length, 20, `expected 20 data/screenplays fixtures, found ${screenplayFiles.length}`);
    assert.ok(fountainFiles.length >= 45, `expected at least 45 tracked .fountain fixtures, found ${fountainFiles.length}`);
    assert.equal(REFERENCE_CORPUS.length, 20, `expected 20 calibration REFERENCE_CORPUS samples, found ${REFERENCE_CORPUS.length}`);
  });

  for (const file of findFountainFiles(REPO_ROOT)) {
    const rel = path.relative(REPO_ROOT, file);
    it(`does not reject ${rel}`, () => {
      const text = readFileSync(file, 'utf8');
      const reason = fountainShapeRejectionReason(text);
      assert.equal(reason, null, `${rel} was rejected by the shape guard: ${reason}`);
    });
  }

  for (const sample of REFERENCE_CORPUS) {
    it(`does not reject calibration sample "${sample.label}"`, () => {
      assert.equal(fountainShapeRejectionReason(sample.fountain), null);
    });
  }

  it('does not reject the P0 sample script', () => {
    assert.equal(fountainShapeRejectionReason(p0SampleFountain), null);
  });
});
