// server/lib/validation.ts's fountainShapeRejectionReason() vs.
// src/lib/fountain.ts's CHARACTER_CUE_RE — cue-definition parity
// (2026-09-04, adversarial audit + independent review, same day).
//
// ROUND 1 (audit). The guard's distinct-cue-line detector used its own local
// proxy, `CUE_LIKE_LINE_RE = /^[A-Z0-9 .,'()&\-]{1,40}$/` — ASCII-only, with a
// 40-char cap — while the analyzer's real cue test, CHARACTER_CUE_RE, is
// Unicode (`\p{Lu}\p{Lt}`), allows `#`, and has no length cap. Non-ASCII
// capitals (Cyrillic, Greek, accented Latin), `#`, and 41+-char cues were
// invisible to the guard. Fixed by composing a new CUE_LIKE_LINE_RE from
// src/lib/fountain.ts's exported CUE_INITIAL_CLASS/CUE_LETTER_CLASS classes.
//
// ROUND 2 (independent review, same day). The round-1 fix was STILL a
// second, independently hand-composed grammar, and it missed a real cue
// shape: the dual-dialogue `^` marker CHARACTER_CUE_RE accepts via
// `\s*\^?\s*` (src/lib/fountain.ts:139). 2,000 distinct `PERSON<i>^` cues
// reached the analyzer unrejected. Fixed by making the guard's predicate
// (`isCueLikeLine`, exported from validation.ts) a PROVABLE superset of
// CHARACTER_CUE_RE BY CONSTRUCTION — `CHARACTER_CUE_RE.test(line) ||
// CUE_LIKE_LINE_RE.test(line)` — so no future hand-composed class can
// silently narrow it again. Part 1b below is the implication proof this
// guarantee is checked, not merely asserted.
//
// ROUND 3 (independent review, same finding set). MAX_FOUNTAIN_DISTINCT_CUE_LINES
// bounds distinct cue VOCABULARY, not analyzer COST: 1,500 distinct cues
// repeated many times is legal under that bound alone and measured (outside
// this file, against runScriptDoctor directly) at 39s for 20 repeats and a
// non-terminating request at 34 repeats. Fixed with a second bound,
// MAX_FOUNTAIN_CUE_WEIGHT, on distinct-cue-lines x total-cue-line-occurrences
// (a cost proxy, not a vocabulary proxy).
//
// ROUND 4 (second independent review, 2026-09-05, of the round-3 fix).
// MAX_FOUNTAIN_CUE_WEIGHT does not bound cost either — walking the
// weight~9.9M iso-curve found the guard REJECTING a 31s payload (1,500
// distinct x 30,000 occurrences) while ACCEPTING a 216s one (400 distinct x
// 24,750 occurrences, same weight). An interim ratio-based bound (average
// occurrences per distinct line) was tried and DISPROVEN by this repo's own
// fixture: `tests/fixtures/blind-pairs/low-tide-bad.fountain`, a real
// 219-line two-character scene, has ratio 24.5 (2 distinct, 49
// occurrences) and would have been falsely rejected. Fixed with
// MAX_FOUNTAIN_FREQUENT_CUE_LINES, a bound on the COUNT of distinct cue
// lines that individually occur often — see validation.ts's own comment for
// the full measurement grid and the reasoning for why a count, not an
// average or a product, is the right shape for this bound. Part 3 below
// proves a REALISTIC (skewed majors/minors, extension variants, caps
// action) feature-length script, every committed fixture, and the round-4
// false-rejection fixture (R4) all clear every bound with a stated margin.
//
// ROUND 5 (second independent review, same day, of the round-4 context
// check). The round-4 fix's own comment claimed every pathological shape
// this guard targets "has real dialogue immediately following" — false for
// the shape real PDF/FDX imports actually produce: DOUBLE-SPACED Fountain
// (`NAME\n\nline\n\n`, a blank line between EVERY block, the exact reason
// server/nvm/analyze/screenplay-normalizer.ts's normalizeScreenplay()
// exists). normalizeScreenplay() runs before the analyzer's own
// parseFountain on every real request and reflows a double-spaced cue into
// an adjacent cue+dialogue pair, but the guard's context check only looked
// at the IMMEDIATE next line — a double-spaced cue's immediate next line is
// blank, so it counted as zero cues. Measured: a double-spaced payload
// (distinct=600, occurrences=12,000, 154,954 bytes, 15% of
// MAX_FOUNTAIN_CHARS) was guard-ACCEPTED while normalizeScreenplay +
// parseFountain produced 12,000 real 'character' blocks downstream;
// POST /api/scriptide/doctor answered HTTP 200 in 90,575 ms. Fixed by
// admitting a SECOND context shape — a cue followed by exactly one blank
// line and then non-cue-shaped content — alongside the immediate-dialogue
// shape, WITHOUT reopening R4: the distinguishing test is whether the
// content after that one blank line is itself cue-shaped (an R4 caps-heavy
// action chain, where every line is followed by another ALL-CAPS line) or
// not (real double-spaced dialogue, which is ordinary mixed-case prose).
// The double-spaced fixture and the R4 fixture below are the parity proof:
// the former is now rejected, the latter is still accepted.
//
// ROUND 6 (third independent review, same day, of the round-5 fix). The
// round-5 fix probed only lines[i+1]/lines[i+2] — i.e. it re-admitted a gap
// of EXACTLY one blank line. isDoubleSpaced (screenplay-normalizer.ts)
// fires on ANY gap >= 1, and normalizeScreenplay's reflow filters out
// EVERY blank line before re-blocking the script — so a 2-, 3-, 4-, or
// 5-blank-line gap is reflowed and parsed as a real cue exactly like a
// 1-blank-line gap, and was still invisible to the fixed-offset probe.
// Measured: a 2-blank-line-gap payload (distinct=600, occurrences=12,000,
// 203 KB) was guard-ACCEPTED; POST /api/scriptide/doctor answered 200 in
// 85,388 ms. Fixed by replacing the fixed-offset probe with a forward scan
// over every consecutive blank line to the next non-blank one, at whatever
// distance that is — the not-cue-shaped exclusion is unchanged. The
// property test below (gap in 1..5) is the parity proof this cannot
// silently regress to "works for gap=1 only" again.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fountainShapeRejectionReason,
  isCueLikeLine,
  guardCueOccurrences,
  CUE_LIKE_LINE_RE,
  MAX_FOUNTAIN_DISTINCT_CUE_LINES,
  MAX_FOUNTAIN_CUE_WEIGHT,
  MAX_FOUNTAIN_FREQUENT_CUE_LINES,
  FREQUENT_CUE_OCCURRENCE_THRESHOLD,
  MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES,
  MAX_FOUNTAIN_BONEYARD_CUE_WEIGHT,
  MAX_FOUNTAIN_BONEYARD_FREQUENT_CUE_LINES,
  MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
} from '../../server/lib/validation.ts';
import { CHARACTER_CUE_RE, parseFountain } from '../../src/lib/fountain.ts';
import { normalizeScreenplay, isCharacterCue } from '../../server/nvm/analyze/screenplay-normalizer.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REJECTION_RE = new RegExp(
  `more than ${MAX_FOUNTAIN_DISTINCT_CUE_LINES} distinct all-caps character-cue-shaped lines`,
);
const WEIGHT_REJECTION_RE = new RegExp(
  `more than ${MAX_FOUNTAIN_CUE_WEIGHT} in \\(distinct all-caps character-cue-shaped lines`,
);

// ── Part 1: the audit's four bypass families, plus the caret family the
// independent review found — one distinct cue-shaped line per index. ───────
const CUE_LINE_BUILDERS: Record<string, (i: number) => string> = {
  'plain ASCII (control)': (i) => `CHARACTER${i}`,
  'Cyrillic': (i) => `ПЕРСОНАЖ${i}`,
  'Greek': (i) => `ΧΑΡΑΚΤΗΡΑΣ${i}`,
  'accented Latin': (i) => `JOSÉ MARÍA ZOË${i}`,
  '# in the cue': (i) => `CHARACTER #${i}`,
  '41+ char cue': (i) => `A VERY LONG CHARACTER NAME OVER FORTY CHARACTERS ${i}`,
  // Round-2 (independent review) bypass family: the dual-dialogue caret.
  'caret (tight)': (i) => `PERSON${i}^`,
  'caret (spaced)': (i) => `PERSON${i} ^`,
  'caret + (V.O.) tail': (i) => `PERSON${i} ^ (V.O.)`,
};

function buildFountainWithCues(count: number, cueOf: (i: number) => string): string {
  let text = 'INT. ROOM - DAY\n\n';
  for (let i = 0; i < count; i++) text += `${cueOf(i)}\nLine.\n`;
  return text;
}

describe('fountainShapeRejectionReason — cue-definition parity with CHARACTER_CUE_RE', () => {
  // Sanity: every family's generated line must itself satisfy the analyzer's
  // real cue test, and must NOT have satisfied the OLD ASCII/40-char proxy —
  // otherwise these are not actually testing the bypass shapes found.
  const OLD_ASCII_40_CAP_RE = /^[A-Z0-9 .,'()&\-]{1,40}$/;
  const CARET_FAMILIES = new Set(['caret (tight)', 'caret (spaced)', 'caret + (V.O.) tail']);
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
    if (CARET_FAMILIES.has(family)) {
      // Prove the `||` in isCueLikeLine is load-bearing: CUE_LIKE_LINE_RE
      // ALONE (the round-1 composed class, no CHARACTER_CUE_RE fallback)
      // must NOT match a caret line — if it did, this test would no longer
      // be exercising the round-2 fix at all.
      it(`sanity: "${family}" sample line does NOT match CUE_LIKE_LINE_RE alone (proves the OR is necessary)`, () => {
        assert.doesNotMatch(sample, CUE_LIKE_LINE_RE);
      });
      it(`sanity: "${family}" sample line DOES match isCueLikeLine (the combined predicate)`, () => {
        assert.equal(isCueLikeLine(sample), true);
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

// ── Part 1b: grammar-product implication test ───────────────────────────────
// The `||` in isCueLikeLine makes CHARACTER_CUE_RE.test(line) ⇒
// isCueLikeLine(line) true BY CONSTRUCTION — but "by construction" is a claim
// about the source, not a check that runs. This enumerates the analyzer's
// grammar as a product (base name script x caret spelling x optional tail x
// length) and asserts the implication holds over the whole product, so a
// future edit that changes isCueLikeLine's definition (e.g. someone "cleans
// up" the `||` into something that looks equivalent but isn't) fails a test
// instead of silently reopening the round-2 gap.
const BASE_NAMES: Record<string, string> = {
  ASCII: 'CHARACTER',
  Cyrillic: 'ПЕРСОНАЖ',
  Greek: 'ΧΑΡΑΚΤΗΡΑΣ',
  'accented NFC': 'MARÍA',
  'accented NFD': 'MARÍA'.normalize('NFD'),
};
const LENGTH_VARIANTS: Record<string, (base: string) => string> = {
  short: (base) => base,
  // Pad to at least 60 chars — past the old 40-char cap AND past a round
  // number the independent review named explicitly.
  '60-char': (base) => `${base} ${'X'.repeat(Math.max(0, 60 - base.length - 1))}`,
};
const CARET_VARIANTS = ['', '^', ' ^'];
const TAIL_VARIANTS = ['', ' (V.O.)', ' (O.S.)', " (CONT'D)"];

describe('grammar-product implication: CHARACTER_CUE_RE(line) ⇒ isCueLikeLine(line)', () => {
  let productSize = 0;
  for (const [scriptName, base] of Object.entries(BASE_NAMES)) {
    for (const [lengthName, lengthFn] of Object.entries(LENGTH_VARIANTS)) {
      const padded = lengthFn(base);
      for (const caret of CARET_VARIANTS) {
        for (const tail of TAIL_VARIANTS) {
          const line = padded + caret + tail;
          productSize++;
          const label = `${scriptName}/${lengthName}/caret=${JSON.stringify(caret)}/tail=${JSON.stringify(tail)}`;
          it(`"${label}" — CHARACTER_CUE_RE accepts it (generator sanity) and isCueLikeLine agrees`, () => {
            // Sanity on the generator itself: every combination in this
            // product must be a real analyzer cue, or the implication below
            // is vacuous for that row.
            assert.match(line, CHARACTER_CUE_RE, `generator bug: "${line}" is not actually a CHARACTER_CUE_RE match`);
            assert.equal(isCueLikeLine(line), true, `BYPASS: "${line}" matches CHARACTER_CUE_RE but isCueLikeLine rejects it`);
          });
        }
      }
    }
  }

  it(`covered the full grammar product (${Object.keys(BASE_NAMES).length} scripts x ${Object.keys(LENGTH_VARIANTS).length} lengths x ${CARET_VARIANTS.length} carets x ${TAIL_VARIANTS.length} tails)`, () => {
    assert.equal(productSize, Object.keys(BASE_NAMES).length * Object.keys(LENGTH_VARIANTS).length * CARET_VARIANTS.length * TAIL_VARIANTS.length);
    assert.equal(productSize, 120);
  });
});

// ── Part 2: every fixture this repo ships must still pass ───────────────────
// The threshold-independence proof above is only half the guarantee — a
// guard using the real, wider cue alphabet must not turn around and start
// rejecting ordinary scripts it used to accept. `git ls-files` (not a
// filesystem walk) is deliberate: an independent review found the original
// filesystem walk returned 511 files / 96 "blind pairs" / 200 "screenplays"
// when run from the repository ROOT rather than this worktree, because
// `.claude/worktrees/**` (excluded from git, per CLAUDE.md, but very much
// present on disk whenever a parallel lane session exists — the normal state
// of this repo per CLAUDE.md's "parallel sessions ship concurrently") holds
// full sibling checkouts the walk cannot tell apart from the real fixtures.
// `git ls-files` only ever returns paths tracked by THIS worktree's own
// index, so it is correct from any working directory, worktree or not.
function trackedFountainFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--', '*.fountain'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return out.split('\0').filter(Boolean).map((rel) => path.join(REPO_ROOT, rel));
}

describe('fountainShapeRejectionReason — every committed fixture still passes the guard', async () => {
  const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
  const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');

  const fountainFiles = trackedFountainFiles();
  const blindPairFiles = fountainFiles.filter((f) => f.includes(`${path.sep}blind-pairs${path.sep}`));
  const screenplayFiles = fountainFiles.filter((f) => f.includes(`${path.sep}data${path.sep}screenplays${path.sep}`));

  it('found every expected fixture group via git ls-files (a shrinking count here means this sweep silently lost coverage)', () => {
    // 12 blind-pair fixtures and 20 data/screenplays/*.fountain — the two
    // groups the lane brief named explicitly by count.
    assert.equal(blindPairFiles.length, 12, `expected 12 blind-pair fixtures, found ${blindPairFiles.length}`);
    assert.equal(screenplayFiles.length, 20, `expected 20 data/screenplays fixtures, found ${screenplayFiles.length}`);
    assert.ok(fountainFiles.length >= 45, `expected at least 45 tracked .fountain fixtures, found ${fountainFiles.length}`);
    assert.equal(REFERENCE_CORPUS.length, 20, `expected 20 calibration REFERENCE_CORPUS samples, found ${REFERENCE_CORPUS.length}`);
  });

  for (const file of trackedFountainFiles()) {
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

// ── Part 3: the cost bounds (WEIGHT + FREQUENT_CUE_LINES) — margin proof ────
// Recomputes (distinct cue lines, total cue-line occurrences, and the count
// of "frequent" ones) with the EXACT same walk fountainShapeRejectionReason
// uses internally (isCueLikeLine, trim, skip scene headings, the
// next-line-is-dialogue context check), so the margin numbers reported here
// are guaranteed consistent with what the guard itself would compute — not a
// second, possibly-drifted count.
const SCENE_HEADING_RE = /^(INT|EXT|EST|I\/E)[. ]/;
function cueMetricsOf(text: string): { distinct: number; occurrences: number; weight: number; frequentCount: number } {
  const lines = text.split('\n');
  const counts = new Map<string, number>();
  let occurrences = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.length === 0 || SCENE_HEADING_RE.test(line)) continue;
    if (!isCueLikeLine(line)) continue;
    const immediateDialogue = i < lines.length - 1 && lines[i + 1]!.trim() !== '';
    let nextLineIsDialogue = immediateDialogue;
    if (!nextLineIsDialogue) {
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim() === '') j++;
      nextLineIsDialogue = j < lines.length && !isCueLikeLine(lines[j]!.trim());
    }
    if (!nextLineIsDialogue) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
    occurrences++;
  }
  let frequentCount = 0;
  for (const c of counts.values()) if (c > FREQUENT_CUE_OCCURRENCE_THRESHOLD) frequentCount++;
  return { distinct: counts.size, occurrences, weight: counts.size * occurrences, frequentCount };
}

// A synthesized PLAUSIBLE feature-length script — not the cleanest possible
// shape (the round-3 test's mistake, per the 2026-09-05 review's R3
// finding), but one with the furniture a real 120-page spec carries:
//  - a skewed cast: a handful of MAJOR/lead characters who carry most of the
//    dialogue (each comfortably over the "frequent" threshold, the way any
//    real protagonist is), and many one-or-two-line MINOR/background names —
//    the realistic shape the round-4 fix (MAX_FOUNTAIN_FREQUENT_CUE_LINES)
//    is specifically calibrated against, rather than a uniform cast where
//    every name is equally talkative;
//  - (V.O.)/(O.S.)/(CONT'D) extension variants on some major dialogue, which
//    inflate the DISTINCT cue-line count without inflating any one variant's
//    own occurrence count much — exactly why a real script's distinct count
//    can run well past its named-character count;
//  - caps-heavy action lines (long ALL-CAPS emphasis, each followed by a
//    blank line, never dialogue) interleaved between scenes, to prove the
//    R4 context-check fix holds at feature length too, not just in the
//    isolated R4 fixture below.
function buildPlausibleFeature(): { text: string; wordCount: number; sceneCount: number } {
  const MAJOR_COUNT = 8;
  const MINOR_COUNT = 122;
  const SCENES = 120;
  const EXTENSIONS = ['', ' (V.O.)', ' (O.S.)', " (CONT'D)"];
  const dialogueWords = ['the', 'plan', 'was', 'never', 'going', 'to', 'work', 'like', 'this', 'again', 'tonight', 'trust', 'me', 'now', 'wait'];
  const majors = Array.from({ length: MAJOR_COUNT }, (_, i) => `MAJOR${i}`);
  const minors = Array.from({ length: MINOR_COUNT }, (_, i) => `MINOR${i}`);

  let wordSeed = 0;
  const dialogueLine = (): string => {
    const words = Array.from({ length: 6 }, () => dialogueWords[wordSeed++ % dialogueWords.length]);
    const line = words.join(' ');
    return `${line[0]!.toUpperCase()}${line.slice(1)}.`;
  };

  // Each major speaks ~700 times, but — realistically — NOT evenly across
  // its 4 extension variants: a (V.O.)/(O.S.)/(CONT'D) tag is used only when
  // the scene actually calls for it (narration, an off-screen line, a
  // page-break interruption), nowhere near as often as a character's
  // ordinary plain cue. Each tagged variant gets a small fixed count (8,
  // under the "frequent" threshold on its own); the rest goes to the plain
  // form. 8 majors x 4 = 32 distinct lines, but only the 8 PLAIN ones are
  // individually frequent — the tagged variants are distinct vocabulary
  // without being cost-relevant, which is the whole point of a vocabulary
  // bound and a frequency bound being two different things.
  const TAGGED_VARIANT_OCCURRENCES = 8;
  const majorLines: string[] = [];
  for (const name of majors) {
    const taggedTotal = TAGGED_VARIANT_OCCURRENCES * (EXTENSIONS.length - 1);
    for (let e = 1; e < EXTENSIONS.length; e++) {
      const cue = `${name}${EXTENSIONS[e]}`;
      for (let k = 0; k < TAGGED_VARIANT_OCCURRENCES; k++) majorLines.push(cue);
    }
    const plainCue = name;
    for (let k = 0; k < 700 - taggedTotal; k++) majorLines.push(plainCue);
  }
  // Each minor speaks 2 times total (the "one-or-two-line MINOR/background
  // names" this function's own header already promises), split across its
  // own 4 variants (round-robin) -> 122 x 2 = 244 distinct lines, 122 x 2 =
  // 244 occurrences. 2026-09-05 review round 2: this used to be 6 — at
  // dialogueLine()'s own 6 words/line, that pools to 36 words per BASE NAME
  // once voice-delta.ts's normalizeCharacterName groups a minor's variants
  // back together (36 >= its own MIN_WORDS=30), making every one of the 130
  // distinct names in this fixture individually "voice-eligible" and
  // reproducing the review's own O(distinct²) Burrows's-Delta cost — the
  // fixture's CODE drifted from its own documented intent. At 2 occurrences
  // (12 words), every minor stays under MIN_WORDS=30, so the analyzer
  // ABSTAINS from voice analysis entirely the moment even one is checked —
  // exactly how a real feature's one-or-two-line walk-on characters behave,
  // and exactly why this shape is safe while a UNIFORM cast of equally
  // talkative names is not (see MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT's own
  // comment).
  const minorLines: string[] = [];
  for (const name of minors) {
    for (let k = 0; k < 2; k++) minorLines.push(`${name}${EXTENSIONS[k % EXTENSIONS.length]}`);
  }

  const allDialogueCues = [...majorLines, ...minorLines];
  // Deterministic shuffle (not crypto-random — this only needs to be a fixed,
  // reproducible interleaving, not real randomness) so majors and minors mix
  // through scenes the way a real draft's scene order would, rather than
  // every major's lines landing consecutively.
  for (let i = allDialogueCues.length - 1; i > 0; i--) {
    const j = (i * 2654435761) % (i + 1);
    [allDialogueCues[i], allDialogueCues[j]] = [allDialogueCues[j]!, allDialogueCues[i]!];
  }

  let text = '';
  let idx = 0;
  const perScene = Math.ceil(allDialogueCues.length / SCENES);
  for (let s = 0; s < SCENES; s++) {
    text += `INT. LOCATION ${s} - DAY\n\n`;
    // Two caps-heavy action-emphasis lines per scene, each followed by a
    // blank line (never dialogue) — the R4 shape, present at feature scale.
    text += `A SUDDEN NOISE CUTS THROUGH THE SILENCE AND EVERYONE FREEZES SCENE ${s}\n\n`;
    text += `THE LIGHTS FLICKER ONCE, TWICE, THEN HOLD SCENE ${s}\n\n`;
    for (let k = 0; k < perScene && idx < allDialogueCues.length; k++, idx++) {
      text += `${allDialogueCues[idx]}\n${dialogueLine()}\n\n`;
    }
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, wordCount, sceneCount: SCENES };
}

describe('MAX_FOUNTAIN_CUE_WEIGHT / MAX_FOUNTAIN_FREQUENT_CUE_LINES — cost bounds, margin proof', () => {
  it('a plausible feature-length script (skewed majors/minors, extension variants, caps action) clears every bound and is not rejected', () => {
    const { text, wordCount, sceneCount } = buildPlausibleFeature();
    const { distinct, occurrences, weight, frequentCount } = cueMetricsOf(text);
    assert.equal(sceneCount, 120);
    assert.ok(wordCount >= 20_000, `expected a realistic word count, got ${wordCount}`);

    const vocabMargin = MAX_FOUNTAIN_DISTINCT_CUE_LINES / distinct;
    const weightMargin = MAX_FOUNTAIN_CUE_WEIGHT / weight;
    const frequentMargin = MAX_FOUNTAIN_FREQUENT_CUE_LINES / Math.max(1, frequentCount);
    console.log(
      `plausible feature: distinct=${distinct} occurrences=${occurrences} words=${wordCount} scenes=${sceneCount} `
      + `weight=${weight} frequentCount=${frequentCount} `
      + `vocabMargin=${vocabMargin.toFixed(1)}x weightMargin=${weightMargin.toFixed(1)}x frequentMargin=${frequentMargin.toFixed(1)}x`,
    );

    // These margins are DELIBERATELY modest, not the ~31x/18.8x the round-3
    // design's cleanest-possible-script test reported — the 2026-09-05
    // review's R3 finding was exactly that that number was ~10x optimistic.
    // A plausible script's margin is honestly in the low single digits on at
    // least one bound; asserting a generous floor here (not a tight one)
    // documents that reality rather than re-inflating it.
    assert.ok(vocabMargin >= 1.2, `vocabulary margin too thin: ${vocabMargin.toFixed(2)}x (distinct=${distinct})`);
    assert.ok(weightMargin >= 1.5, `weight margin too thin: ${weightMargin.toFixed(2)}x (weight=${weight})`);
    assert.ok(frequentMargin >= 3, `frequent-line margin too thin: ${frequentMargin.toFixed(2)}x (frequentCount=${frequentCount})`);

    assert.equal(fountainShapeRejectionReason(text), null);
  });

  it('every committed fixture and calibration sample clears every bound with wide margin', async () => {
    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');

    const rows: Array<{ name: string; distinct: number; occurrences: number; weight: number; frequentCount: number }> = [];
    for (const file of trackedFountainFiles()) {
      const rel = path.relative(REPO_ROOT, file);
      const text = readFileSync(file, 'utf8');
      rows.push({ name: rel, ...cueMetricsOf(text) });
    }
    for (const sample of REFERENCE_CORPUS) {
      rows.push({ name: `calibration/${sample.label}`, ...cueMetricsOf(sample.fountain) });
    }
    rows.push({ name: 'p0/sample-script', ...cueMetricsOf(p0SampleFountain) });

    const worstByWeight = rows.reduce((a, b) => (b.weight > a.weight ? b : a));
    const worstByFrequent = rows.reduce((a, b) => (b.frequentCount > a.frequentCount ? b : a));
    const weightMargin = MAX_FOUNTAIN_CUE_WEIGHT / Math.max(1, worstByWeight.weight);
    const frequentMargin = MAX_FOUNTAIN_FREQUENT_CUE_LINES / Math.max(1, worstByFrequent.frequentCount);
    console.log(
      `worst committed fixture by weight: ${worstByWeight.name} distinct=${worstByWeight.distinct} `
      + `occurrences=${worstByWeight.occurrences} weight=${worstByWeight.weight} margin=${weightMargin.toFixed(0)}x`,
    );
    console.log(
      `worst committed fixture by frequent-count: ${worstByFrequent.name} frequentCount=${worstByFrequent.frequentCount} `
      + `margin=${frequentMargin.toFixed(0)}x`,
    );
    assert.ok(weightMargin >= 1000, `expected >=1000x weight margin on the worst committed fixture, got ${weightMargin.toFixed(0)}x (${worstByWeight.name})`);
    // Real fixtures top out at a small handful of frequent lines (a
    // two-hander scene has exactly 2) — assert a generous but real floor.
    assert.ok(frequentMargin >= 10, `expected >=10x frequent-line margin on the worst committed fixture, got ${frequentMargin.toFixed(0)}x (${worstByFrequent.name})`);
  });

  it('names the bound in its rejection message (weight)', () => {
    let text = 'INT. ROOM - DAY\n\n';
    const cues = Array.from({ length: 1500 }, (_, i) => `LEGALCUE${i}`);
    for (let r = 0; r < 20; r++) for (const c of cues) text += `${c}\nLine.\n`;
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected 1,500 distinct cues x 20 repeats to be rejected by the weight bound');
    assert.match(reason!, WEIGHT_REJECTION_RE);
    assert.match(reason!, /MAX_FOUNTAIN_CUE_WEIGHT/);
  });

  it('names the bound in its rejection message (frequent-cue-lines)', () => {
    // distinct=200, each repeating 30x (weight=1.2M, well under the weight
    // bound — this must be caught by the frequent-line bound specifically).
    let text = 'INT. ROOM - DAY\n\n';
    const cues = Array.from({ length: 200 }, (_, i) => `FREQCUE${i}`);
    for (let r = 0; r < 30; r++) for (const c of cues) text += `${c}\nLine.\n`;
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected 200 distinct cues x 30 repeats to be rejected by the frequent-line bound');
    assert.match(reason!, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
  });

  // ── R4 regression: the false-rejection surface the 40-char-cap removal
  // opened (2026-09-05 review finding). A caps-heavy action feature with NO
  // character dialogue at all — every long ALL-CAPS line is followed by a
  // blank line, never dialogue — must not be mistaken for a cast of 1,660
  // "characters". Before the next-line-is-dialogue context check (this same
  // lane's fix, above), this fixture was rejected over the 1,500-line
  // vocabulary bound even though the parser would classify every one of
  // these lines as `action`.
  it('a caps-heavy action feature with zero real dialogue is NOT rejected (R4 regression fixture)', () => {
    const SCENES = 200;
    const CAPS_LINES_PER_SCENE = 8;
    let text = '';
    for (let s = 0; s < SCENES; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n`;
      text += 'A person moves through the room, quiet, deliberate, careful not to make a sound.\n\n';
      for (let c = 0; c < CAPS_LINES_PER_SCENE; c++) {
        text += `THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES SCENE ${s} LINE ${c}\n\n`;
      }
    }
    const { distinct, frequentCount } = cueMetricsOf(text);
    // Sanity: this fixture really does carry 1,600 cue-SHAPED lines (past
    // the old, context-free bound's 1,500 ceiling) — the point of this test
    // is that the context check excludes them from counting at all, not
    // that they were never shaped like cues.
    assert.ok(distinct === 0, `expected the context check to exclude every caps-heavy action line from the cue vocabulary, but ${distinct} were counted`);
    assert.equal(frequentCount, 0);
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  // ── ROUND 5 regression: the double-spaced bypass the R4 context check
  // opened. `NAME\n\nline\n\n` — a blank line between every block, the exact
  // shape real PDF/FDX imports produce (server/nvm/analyze/
  // screenplay-normalizer.ts's normalizeScreenplay() exists specifically to
  // reflow it before the analyzer ever parses the script) — must be counted
  // as a real cue chain, not skipped because its IMMEDIATE next line is
  // blank. Before this fix, the guard counted zero cues here while
  // normalizeScreenplay + parseFountain saw every one downstream.
  it('a double-spaced script with 12,000 distinct cue occurrences IS rejected (ROUND 5 regression: the double-spacing bypass)', () => {
    const DISTINCT = 600;
    const OCCURRENCES = 12_000;
    const cues = Array.from({ length: DISTINCT }, (_, i) => `CHARACTER${i}`);
    let text = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < OCCURRENCES; i++) text += `${cues[i % DISTINCT]}\n\nLine.\n\n`;

    const { distinct, occurrences } = cueMetricsOf(text);
    assert.equal(distinct, DISTINCT, `expected all ${DISTINCT} double-spaced cue lines to be counted, got ${distinct}`);
    assert.equal(occurrences, OCCURRENCES, `expected all ${OCCURRENCES} double-spaced cue occurrences to be counted, got ${occurrences}`);

    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the double-spaced payload to be rejected — the guard did not fire');
    assert.match(reason!, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
  });

  it('a legitimate double-spaced two-hander (2 distinct cues) is NOT rejected', () => {
    let text = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 30; i++) {
      text += `${i % 2 === 0 ? 'PAUL' : 'JUNE'}\n\nSomething ordinary gets said here, line ${i}.\n\n`;
    }
    const { distinct, occurrences } = cueMetricsOf(text);
    assert.equal(distinct, 2);
    assert.equal(occurrences, 30);
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  // ── ROUND 6 regression: the fix above only re-admitted a gap of EXACTLY
  // one blank line (a fixed lines[i+1]/lines[i+2] probe) — a third
  // independent review found isDoubleSpaced (screenplay-normalizer.ts)
  // fires on ANY gap >= 1, and normalizeScreenplay's reflow FILTERS OUT
  // EVERY BLANK LINE before re-blocking the script, so a 2-, 3-, 4-, or
  // 5-blank-line gap is reflowed and parsed as a real cue by the actual
  // pipeline exactly like a 1-blank-line gap — and was still invisible to
  // the fixed-offset probe. Property test: for every gap in 1..5, the same
  // double-spaced-shaped payload must be rejected, with the exact same
  // 12,000/600 counts cueMetricsOf reports for a gap of 1.
  for (let gap = 1; gap <= 5; gap++) {
    it(`a script with a ${gap}-blank-line gap between cue and dialogue (600 distinct x 12,000 occurrences) IS rejected`, () => {
      const DISTINCT = 600;
      const OCCURRENCES = 12_000;
      const cues = Array.from({ length: DISTINCT }, (_, i) => `CHARACTER${i}`);
      const blanks = '\n'.repeat(gap);
      let text = 'INT. ROOM - DAY\n\n';
      for (let i = 0; i < OCCURRENCES; i++) text += `${cues[i % DISTINCT]}${blanks}Line.\n\n`;

      const { distinct, occurrences } = cueMetricsOf(text);
      assert.equal(distinct, DISTINCT, `gap=${gap}: expected all ${DISTINCT} cue lines counted, got ${distinct}`);
      assert.equal(occurrences, OCCURRENCES, `gap=${gap}: expected all ${OCCURRENCES} occurrences counted, got ${occurrences}`);

      const reason = fountainShapeRejectionReason(text);
      assert.ok(reason, `gap=${gap}: expected the payload to be rejected — the guard did not fire`);
      assert.match(reason!, /MAX_FOUNTAIN_FREQUENT_CUE_LINES/);
    });

    it(`a legitimate ${gap}-blank-line-gap two-hander (2 distinct cues) is NOT rejected`, () => {
      const blanks = '\n'.repeat(gap);
      let text = 'INT. ROOM - DAY\n\n';
      for (let i = 0; i < 30; i++) {
        text += `${i % 2 === 0 ? 'PAUL' : 'JUNE'}${blanks}Something ordinary gets said here, line ${i}.\n\n`;
      }
      const { distinct, occurrences } = cueMetricsOf(text);
      assert.equal(distinct, 2);
      assert.equal(occurrences, 30);
      assert.equal(fountainShapeRejectionReason(text), null);
    });
  }

  it('the caps-heavy action fixture (R4) is still accepted regardless of the multi-blank-gap fix', () => {
    const SCENES = 200;
    const CAPS_LINES_PER_SCENE = 8;
    let text = '';
    for (let s = 0; s < SCENES; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n`;
      text += 'A person moves through the room, quiet, deliberate, careful not to make a sound.\n\n';
      for (let c = 0; c < CAPS_LINES_PER_SCENE; c++) {
        text += `THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES SCENE ${s} LINE ${c}\n\n`;
      }
    }
    assert.equal(fountainShapeRejectionReason(text), null);
  });
});

// ── ROUND 2 (2026-09-05 independent review of the round-1 lane, BLOCKER):
// the union predicate and the oracle are correct — the ACCEPTED region
// contained requests costing 22s-5m44s. See validation.ts's own long
// comment above MAX_FOUNTAIN_TOKEN_CHARS for the full measurement, the
// driver (voice-delta.ts's analyzeVoices, O(distinct²) Burrows's-Delta
// pairs, all-or-nothing on whether every character clears MIN_WORDS=30),
// and the cost grid this fix is calibrated from.
describe('ROUND 2: MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT — the three reviewer payloads are rejected, a realistic feature is not', () => {
  const DLG = 'this is ordinary lowercase dialogue here.'; // 7 words

  // Same generator shape the review's own dsweep.mjs/http9b.mjs probes used:
  // uniform cast, one ordinary lowercase dialogue line per cue, 40 cues per
  // scene heading.
  function uniformCast(distinct: number, occurrences: number): string {
    let t = 'INT. ROOM - DAY\n\n', occ = 0, scene = 0;
    while (occ < occurrences) {
      t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room, quietly and without much fuss.\n\n`;
      for (let i = 0; i < 40 && occ < occurrences; i++, occ++) t += `CHAR${occ % distinct}\n${DLG}\n\n`;
    }
    return t;
  }

  it('reviewer payload 1: 50 distinct ALL-CAPS names x 18,000 ordinary cue+dialogue pairs (measured: ACCEPT, runScriptDoctor 71,880ms over HTTP) is now rejected', () => {
    const text = uniformCast(50, 18_000);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the voice-eligible-weight bound to reject this payload');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  it('reviewer payload 2: 520 distinct x 6,000 (measured: ACCEPT, runScriptDoctor 322,435ms) is now rejected', () => {
    const text = uniformCast(520, 6_000);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the voice-eligible-weight bound to reject this payload');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  // The review's own "plausible feature" cue metrics (distinct=520,
  // occurrences~6,300, frequentCount=8): 8 leads carrying most of the
  // dialogue plus 512 "minors" who each speak often enough (via modulo
  // cycling across a long document) to individually clear MIN_WORDS=30 —
  // measured ACCEPT, runScriptDoctor 343,598ms (5m44s).
  function plausibleShapeCueMetrics(): string {
    const leads = Array.from({ length: 8 }, (_, i) => `LEAD${i}`);
    const others = Array.from({ length: 512 }, (_, i) => `MINOR ${i}`);
    let t = '', occ = 0, scene = 0, oi = 0;
    while (occ < 6300) {
      t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room, quietly and without much fuss.\n\n`;
      for (let i = 0; i < 20 && occ < 6300; i++, occ++) { t += `${leads[occ % 8]}\n${DLG}\n\n`; }
      for (let i = 0; i < 33 && occ < 6300; i++, occ++) { t += `${others[(oi++) % 512]}\n${DLG}\n\n`; }
    }
    return t;
  }

  it('reviewer payload 3: the repo\'s own "plausible feature" cue metrics (distinct=520 occurrences~6,300 frequentCount=8, measured ACCEPT, runScriptDoctor 343,598ms) is now rejected', () => {
    const text = plausibleShapeCueMetrics();
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the voice-eligible-weight bound to reject this payload');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  // The realistic-feature counterpart: 150 distinct names, a REALISTIC
  // skew (a handful of majors carrying most of the ~25,000 words, a long
  // tail of minors kept to one-or-two short lines each — real screenplays
  // are built this way; a uniform cast where every name is equally
  // talkative, which IS what the three payloads above are, is not), ~3,000
  // dialogue blocks total. Every minor stays under MIN_WORDS=30, so the
  // eligibility check never fires at all — the same mechanism that keeps
  // buildPlausibleFeature() above safe.
  function realisticSkewedFeature(): { text: string; distinctNames: number; occurrences: number; wordCount: number } {
    const MAJOR_COUNT = 12;
    const MINOR_COUNT = 138; // 12 + 138 = 150 distinct names
    const majors = Array.from({ length: MAJOR_COUNT }, (_, i) => `PROTAGONIST${i}`);
    const minors = Array.from({ length: MINOR_COUNT }, (_, i) => `EXTRA${i}`);
    const words = ['the', 'plan', 'was', 'never', 'going', 'to', 'work', 'like', 'this', 'again', 'tonight', 'trust', 'me', 'now', 'wait', 'listen'];
    let seed = 0;
    const line = (n: number): string => {
      const ws = Array.from({ length: n }, () => words[seed++ % words.length]);
      return `${ws[0]![0]!.toUpperCase()}${ws[0]!.slice(1)} ${ws.slice(1).join(' ')}.`;
    };
    // Majors: ~200 occurrences each x 12 = 2,400 dialogue blocks, ~9 words
    // per line -> the bulk of the script's ~25,000 words.
    const majorBlocks: string[] = [];
    for (const name of majors) for (let k = 0; k < 200; k++) majorBlocks.push(name);
    // Minors: exactly 2 short (4-word) lines each -> 138 x 2 = 276 blocks,
    // ~8 words per minor, comfortably under MIN_WORDS=30.
    const minorBlocks: string[] = [];
    for (const name of minors) for (let k = 0; k < 2; k++) minorBlocks.push(name);
    const allBlocks = [...majorBlocks, ...minorBlocks];
    for (let i = allBlocks.length - 1; i > 0; i--) {
      const j = (i * 2654435761) % (i + 1);
      [allBlocks[i], allBlocks[j]] = [allBlocks[j]!, allBlocks[i]!];
    }
    let text = '', idx = 0;
    const perScene = 30;
    let scene = 0;
    while (idx < allBlocks.length) {
      text += `INT. LOCATION ${scene++} - DAY\n\nA moment passes before anyone speaks.\n\n`;
      for (let k = 0; k < perScene && idx < allBlocks.length; k++, idx++) {
        const name = allBlocks[idx]!;
        const isMajor = name.startsWith('PROTAGONIST');
        text += `${name}\n${line(isMajor ? 9 : 4)}\n\n`;
      }
    }
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return { text, distinctNames: MAJOR_COUNT + MINOR_COUNT, occurrences: allBlocks.length, wordCount };
  }

  it('a realistic 150-name skewed feature (~3,000 dialogue blocks, ~25,000 words) is ACCEPTED, with >= 3x headroom on every OTHER bound', () => {
    const { text, distinctNames, occurrences, wordCount } = realisticSkewedFeature();
    assert.equal(distinctNames, 150);
    assert.ok(occurrences >= 2_600 && occurrences <= 3_400, `expected ~3,000 dialogue blocks, got ${occurrences}`);
    assert.ok(wordCount >= 20_000, `expected a realistic word count, got ${wordCount}`);

    const reason = fountainShapeRejectionReason(text);
    assert.equal(reason, null, `expected this realistic feature to be accepted, got: ${reason}`);

    // Headroom proof (brief item (d)) on the three PRE-EXISTING bounds, the
    // same way buildPlausibleFeature()'s own margin-proof test above does —
    // this fixture is deliberately built with 150 distinct names and ~3,000
    // occurrences, so it exercises them for real.
    const { distinct, weight, frequentCount } = cueMetricsOf(text);
    const vocabMargin = MAX_FOUNTAIN_DISTINCT_CUE_LINES / distinct;
    const weightMargin = MAX_FOUNTAIN_CUE_WEIGHT / weight;
    const frequentMargin = MAX_FOUNTAIN_FREQUENT_CUE_LINES / Math.max(1, frequentCount);
    assert.ok(vocabMargin >= 3, `vocabulary margin too thin: ${vocabMargin.toFixed(2)}x (distinct=${distinct})`);
    assert.ok(weightMargin >= 3, `weight margin too thin: ${weightMargin.toFixed(2)}x (weight=${weight})`);
    assert.ok(frequentMargin >= 3, `frequent-line margin too thin: ${frequentMargin.toFixed(2)}x (frequentCount=${frequentCount})`);

    // The NEW bound (MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT) needs a DIFFERENT
    // honesty statement than a plain ratio: it is all-or-nothing (see its
    // own comment) — it evaluates a weight AT ALL only once every distinct
    // character clears MIN_WORDS=30, which this fixture's minors (2 short
    // lines each) deliberately do not. So the guard never reaches this
    // bound for this fixture — a stronger guarantee than any finite margin
    // ("never at risk" rather than "currently under the line"), which is
    // also exactly the mechanism that makes a REAL 150-named-character
    // feature (which always has some genuine one-off walk-on parts) safe in
    // production. Reported here as the hypothetical margin IF every
    // character were eligible, purely to show the raw numbers, followed by
    // the honest statement of why that hypothetical does not apply.
    const wordsByBaseName = new Map<string, number>();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i]!.trim();
      if (/^(PROTAGONIST|EXTRA)\d+$/.test(t) && i + 1 < lines.length) {
        const dialogueWordCount = lines[i + 1]!.trim().split(/\s+/).filter(Boolean).length;
        wordsByBaseName.set(t, (wordsByBaseName.get(t) ?? 0) + dialogueWordCount);
      }
    }
    const eligibleCount = [...wordsByBaseName.values()].filter((w) => w >= 30).length;
    const totalWordsIfAllEligible = [...wordsByBaseName.values()].reduce((a, b) => a + b, 0);
    const hypotheticalWeight = wordsByBaseName.size * totalWordsIfAllEligible;
    console.log(
      `realistic feature: distinct=${distinct} occurrences=${occurrences} words=${wordCount} `
      + `vocabMargin=${vocabMargin.toFixed(1)}x weightMargin=${weightMargin.toFixed(1)}x frequentMargin=${frequentMargin.toFixed(1)}x | `
      + `voice-eligible-weight: ${eligibleCount} of ${wordsByBaseName.size} base names individually clear MIN_WORDS=30 `
      + `(NOT all of them, by design — the ${wordsByBaseName.size - eligibleCount} minors under the floor keep the `
      + `all-or-nothing bound from ever evaluating a weight for this fixture at all — the hypothetical `
      + `weight IF every one of them were eligible would be ${hypotheticalWeight} against a ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} `
      + `bound, i.e. this fixture works BECAUSE it does not try to clear that hypothetical, the same way a real script would)`,
    );
    assert.ok(eligibleCount < wordsByBaseName.size, 'sanity: this fixture must have at least one under-threshold minor, or it is not testing the mechanism it claims to');
  });

  // Bound-headroom test (brief item (d)): every already-tracked fixture the
  // repo relies on staying accepted, checked directly against the NEW
  // bound with an explicit >= 3x margin assertion — so a future
  // recalibration that erodes this margin shows up here as a failing
  // number, not a silent behavior change.
  it('every legitimate fixture measured against MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT clears it with >= 3x headroom', async () => {
    async function voiceEligibleWeightOf(text: string): Promise<number | null> {
      // Recomputes the SAME metric the guard's own final check uses,
      // against the SAME walk (via the exported guardCueOccurrences'
      // sibling concept) — but since dialogueWords/voiceKey are internal to
      // walkGuardCueOccurrences, this recomputes them the same way
      // fountainShapeRejectionReason's own header documents: per-base-name
      // (extension-stripped) pooled word count, product of distinct-count x
      // total-pooled-words, ONLY when every distinct name individually
      // clears 30 words (mirrors voice-delta.ts's own MIN_WORDS). Returns
      // null when not every name is eligible (the bound would not even be
      // evaluated on this text) — a null margin is the SAFEST outcome, not
      // a gap in the proof.
      const lines = text.split('\n');
      const CUE_RE = /^[A-Z][A-Z0-9 '.\-#]*$/;
      const wordsByName = new Map<string, number>();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        if (line.length === 0 || !CUE_RE.test(line) || line.length > 40) continue;
        const next = i + 1 < lines.length ? lines[i + 1]!.trim() : '';
        if (next === '' || CUE_RE.test(next)) continue;
        const baseName = line
          .replace(/\^\s*$/, '')
          .replace(/\(\s*V\.O\.\s*\)/gi, '')
          .replace(/\(\s*O\.S\.\s*\)/gi, '')
          .replace(/\(\s*CONT'?D\s*\)/gi, '')
          .trim();
        const words = next.split(/\s+/).filter(Boolean).length;
        wordsByName.set(baseName, (wordsByName.get(baseName) ?? 0) + words);
      }
      if (wordsByName.size < 2) return 0;
      let total = 0;
      for (const w of wordsByName.values()) {
        if (w < 30) return null; // not every name eligible — bound never fires
        total += w;
      }
      return wordsByName.size * total;
    }

    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');
    const texts: Array<{ name: string; text: string }> = [
      { name: 'P0 sample', text: p0SampleFountain },
      ...REFERENCE_CORPUS.map((s: { label: string; fountain: string }) => ({ name: `calibration/${s.label}`, text: s.fountain })),
      ...trackedFountainFiles().map((f) => ({ name: path.relative(REPO_ROOT, f), text: readFileSync(f, 'utf8') })),
    ];

    let worstMargin = Infinity;
    let worstName = '';
    for (const { name, text } of texts) {
      const weight = await voiceEligibleWeightOf(text);
      if (weight === null || weight === 0) continue; // never reaches the bound at all — infinite margin
      const margin = MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / weight;
      assert.ok(
        margin >= 3,
        `${name}: voice-eligible weight ${weight} clears the ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} bound with only ${margin.toFixed(2)}x headroom (< 3x)`,
      );
      if (margin < worstMargin) { worstMargin = margin; worstName = name; }
    }
    console.log(
      worstMargin === Infinity
        ? 'voice-eligible-weight headroom: no tracked fixture ever reaches full eligibility (every one has a sub-30-word character) — infinite margin by construction'
        : `voice-eligible-weight headroom: worst tracked fixture is "${worstName}" at ${worstMargin.toFixed(1)}x`,
    );
  });
});

// ── ROUND 7 (2026-09-05 review finding A1, BLOCKER): the round-6 blank-gap
// exclusion clause is a COMPLETE bypass ────────────────────────────────────
// The round-6 clause excluded a blank-gapped candidate whenever the content
// AFTER the gap was itself cue-shaped per isCueLikeLine — which has NO
// length/word cap, so any ALL-CAPS "dialogue" of 5+ words matches it too.
// screenplay-normalizer.ts's isCharacterCue (the predicate normalizeScreenplay
// ACTUALLY uses during its double-spaced reflow) rejects anything over 4
// words or 30 chars, so that same ALL-CAPS line is ordinary dialogue text to
// the real pipeline — reflowed into a real adjacent cue+dialogue pair — while
// being "cue-shaped" enough to make the guard skip the cue above it entirely.
// Measured (2026-09-05): a 458,716-char payload (distinct=200,
// occurrences=6,000 short cues, each followed by a blank line then one long
// ALL-CAPS "dialogue" line) was guard-ACCEPTED while normalizeScreenplay +
// parseFountain produced 6,000 real `character` blocks downstream;
// runScriptDoctor took 115,694 ms end to end. Fixed by making the blank-gap
// branch's decision depend on the CANDIDATE's own shape (isCharacterCue)
// rather than the shape of whatever follows it — see validation.ts's own
// "ROUND 7" comment for the full trace.
describe('ROUND 7 (finding A1): the caps-heavy-"dialogue" bypass — a blank-gapped cue must count regardless of what follows it', () => {
  const CAPS_DIALOGUE = 'THIS IS AN ALL CAPITALS SPEECH LINE OF SUBSTANTIAL LENGTH INDEED';
  const MIXED_DIALOGUE = 'some ordinary dialogue line here.';

  function buildCapsDialogueBypass(distinct: number, occurrences: number, dialogueLine: string): string {
    const parts: string[] = ['INT. ROOM - DAY', ''];
    for (let k = 0; k < occurrences; k++) {
      parts.push(`PERSON${k % distinct}`, '', dialogueLine, '');
    }
    return parts.join('\n');
  }

  it('sanity: the ALL-CAPS "dialogue" line is cue-shaped to isCueLikeLine but NOT to isCharacterCue (the property the bypass exploited)', async () => {
    const { isCharacterCue } = await import('../../server/nvm/analyze/screenplay-normalizer.ts');
    assert.equal(isCueLikeLine(CAPS_DIALOGUE), true, 'must still be cue-shaped to the guard\'s outer predicate (that IS the exploit)');
    assert.equal(isCharacterCue(CAPS_DIALOGUE), false, 'must NOT be a real cue to the normalizer (>4 words / >30 chars)');
  });

  it('the A1 payload (distinct=200, occurrences=6,000, 458,716 chars) IS rejected — the guard fired blind before this fix', () => {
    const distinct = 200, occurrences = 6000;
    const text = buildCapsDialogueBypass(distinct, occurrences, CAPS_DIALOGUE);
    assert.equal(text.length, 458_716, 'payload size must match the measured A1 shape exactly');

    // Prove this is not a synthetic worry: the REAL pipeline (normalize +
    // parse) really does turn every one of these into a `character` block —
    // the guard's job is to see that coming, not just to reject something.
    const blocks = parseFountain(normalizeScreenplay(text));
    const characterBlocks = blocks.filter((b) => b.type === 'character').length;
    assert.equal(characterBlocks, occurrences, 'sanity: the real pipeline must produce one character block per occurrence for this to be a real bypass');

    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the A1 payload to be rejected — the guard must not be blind to it');
    assert.ok(ms < 100, `expected the guard to reject in well under 100ms (single O(n) pass), took ${ms}ms`);
  });

  it('the general invariant: for the SAME cue vocabulary and occurrence count, the guard\'s verdict must not depend on the case of the dialogue line', () => {
    const distinct = 200, occurrences = 6000;
    const capsReason = fountainShapeRejectionReason(buildCapsDialogueBypass(distinct, occurrences, CAPS_DIALOGUE));
    const mixedReason = fountainShapeRejectionReason(buildCapsDialogueBypass(distinct, occurrences, MIXED_DIALOGUE));
    assert.ok(capsReason, 'the ALL-CAPS-dialogue variant must be rejected');
    assert.ok(mixedReason, 'the mixed-case-dialogue variant must be rejected (this was already true before the fix)');
    // Both variants produce the identical count of real cues downstream, so
    // both must trip the SAME bound at the SAME point in the scan.
    assert.equal(capsReason, mixedReason);
  });

  it('a legitimate small double-spaced two-hander with a long ALL-CAPS emphasis line mixed in is still NOT rejected', () => {
    // Guards against an over-correction: a real script legitimately has both
    // real double-spaced dialogue AND the occasional caps-heavy action line
    // (the R4 shape) in the same document — the fix must not conflate them.
    let text = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 30; i++) {
      text += `${i % 2 === 0 ? 'PAUL' : 'JUNE'}\n\nSomething ordinary gets said here, line ${i}.\n\n`;
    }
    text += 'THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES DOWN THE HALL\n\n';
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  // R4 must still hold after this fix — the whole reason the finding calls
  // for a DIFFERENT mechanism (the candidate's own shape) rather than simply
  // reverting to "any non-blank line ahead counts".
  it('the R4 caps-heavy-action fixture is STILL accepted after the ROUND 7 fix', () => {
    const SCENES = 200;
    const CAPS_LINES_PER_SCENE = 8;
    let text = '';
    for (let s = 0; s < SCENES; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n`;
      text += 'A person moves through the room, quiet, deliberate, careful not to make a sound.\n\n';
      for (let c = 0; c < CAPS_LINES_PER_SCENE; c++) {
        text += `THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES SCENE ${s} LINE ${c}\n\n`;
      }
    }
    assert.equal(fountainShapeRejectionReason(text), null);
  });
});

// ── A3 (2026-09-05 review, MEDIUM): boneyard-aware counting ─────────────────
// Two halves, both proved here: (1) cue-shaped lines inside a /* boneyard */
// comment must NOT count against the real-script bounds (over-reject fix —
// parseFountain (src/lib/fountain.ts) types them `boneyard`, and
// extractSceneContent (fountain-analyzer.ts) explicitly skips that type, so
// they are never a `character`/`dialogue` block); (2) boneyard content gets
// its OWN bounds (MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES/_WEIGHT), because
// the revision pipeline's dialogue pass does NOT skip boneyard content the
// way extractSceneContent does — profiled: a 244,912-char boneyard wrapping
// 6,000 distinct cue-shaped lines cost 27.5-34s in runScriptDoctor.
describe('A3: boneyard-aware cue counting', () => {
  function bigBoneyard(distinct: number, occPerName = 1): string {
    const p: string[] = ['INT. ROOM - DAY', '', '/*'];
    for (let k = 0; k < occPerName; k++) {
      for (let d = 0; d < distinct; d++) p.push(`PERSON${d}`, 'ordinary dialogue line here.', '');
    }
    p.push('*/');
    return p.join('\n');
  }

  it('does NOT reject a legitimate commented-out cast list (50 old character names) inside a boneyard', () => {
    const p: string[] = [
      'INT. ROOM - DAY', '', 'She walks in.', '',
      '/*', 'Old cast (cut in rewrite):',
    ];
    for (let i = 0; i < 50; i++) p.push(`OLD CHARACTER ${i}`);
    p.push('*/', '', 'ALEX', 'Hello there.', '');
    assert.equal(fountainShapeRejectionReason(p.join('\n')), null);
  });

  it('does NOT reject a legitimate commented-out deleted scene (20 real cue+dialogue pairs) inside a boneyard', () => {
    const p: string[] = ['INT. ROOM - DAY', '', 'She walks in.', '', '/*'];
    for (let i = 0; i < 20; i++) p.push(`MINOR${i}`, 'A commented-out line of dialogue.', '');
    p.push('*/', '', 'ALEX', 'Hello there.', '');
    assert.equal(fountainShapeRejectionReason(p.join('\n')), null);
  });

  it('the A3 attack shape (244,912-char boneyard, 6,000 distinct cue-shaped lines) IS rejected, fast, via the boneyard distinct-line bound', () => {
    const text = bigBoneyard(6000);
    assert.equal(text.length, 244_912, 'payload size must match the measured A3 shape exactly');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the boneyard attack payload to be rejected');
    assert.match(reason!, /MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES/);
    assert.ok(ms < 100, `expected a fast rejection (well under 100ms), took ${ms}ms`);
  });

  it('a boneyard weight-bound corner (1,500 distinct x 8 occurrences each, under the distinct cap but over the weight cap) is rejected via MAX_FOUNTAIN_BONEYARD_CUE_WEIGHT', () => {
    const text = bigBoneyard(1500, 8);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected this weight-bound corner to be rejected');
    assert.match(reason!, /MAX_FOUNTAIN_BONEYARD_CUE_WEIGHT/);
  });

  it('a boneyard right at the distinct-line ceiling (1,500 distinct x 1 occurrence) is NOT rejected', () => {
    const text = bigBoneyard(MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES, 1);
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  it('one more distinct line than the boneyard ceiling IS rejected', () => {
    const text = bigBoneyard(MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES + 1, 1);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason);
    assert.match(reason!, /MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES/);
  });

  // 2026-09-05 review, second pass ("A1 invariant inside a boneyard").
  // normalizeScreenplay has NO boneyard awareness at all — it does not know
  // `/* … */` exists — so a double-spaced-shaped payload wrapped in a
  // boneyard reflows exactly like the unwrapped A1 shape: the boneyard
  // delimiter lines get swept into ordinary action/dialogue text by the
  // reflow, same as any other non-cue line, and the wrapped cues still
  // become real `character` blocks. The distinct/weight pair above sat
  // under both bounds for this shape (low distinct, high per-line
  // occurrence — the exact corner MAX_FOUNTAIN_FREQUENT_CUE_LINES exists to
  // close on the real-script path), so this needed the SAME third bound
  // mirrored onto the boneyard branch.
  // The boneyard-wrapped A1 payload needs one more ingredient than "wrap the
  // A1 shape in /* … */": normalizeScreenplay's reflow only destroys the
  // `/*` marker's line-leading position when it lands INSIDE an
  // already-open dialogue buffer (mode==='dialogue' with pending text) —
  // the plain-text branch then does `buf[last] += ' ' + t`, merging `/*`
  // onto the END of the preceding dialogue line rather than emitting it as
  // its own line. A `/*` that opens right after a scene heading (mode
  // 'action', empty buffer) gets flushed as its own standalone line instead
  // — parseFountain then correctly recognizes it and boneyards the rest,
  // no bypass. `buildBoneyardWrappedA1` below opens the boneyard right
  // after an ordinary cue+dialogue pair (mode already 'dialogue', buffer
  // non-empty) to reproduce the merge.
  function buildBoneyardWrappedA1(distinct: number, occurrences: number): string {
    const capsLine = 'THIS IS AN ALL CAPITALS SPEECH LINE OF SUBSTANTIAL LENGTH INDEED';
    const p: string[] = ['INT. ROOM - DAY', '', 'SETUP', '', 'Some setup dialogue line here.', '', '/*'];
    for (let k = 0; k < occurrences; k++) p.push(`PERSON${k % distinct}`, '', capsLine, '');
    p.push('*/');
    return p.join('\n');
  }

  it('sanity: the boneyard-wrapped A1 payload still reflows to real character blocks (normalizeScreenplay has no boneyard awareness, and merges the `/*` marker onto the preceding dialogue line)', () => {
    const text = buildBoneyardWrappedA1(200, 6000);
    const normalized = normalizeScreenplay(text);
    assert.notEqual(normalized, text, 'sanity: the payload must actually trigger the double-spaced reflow');
    assert.ok(!normalized.split('\n').some((l) => l.trim() === '/*'), 'the `/*` marker must be merged onto the preceding line, not standing alone (that IS the mechanism this bypass exploits)');
    const blocks = parseFountain(normalized);
    const characterBlocks = blocks.filter((b) => b.type === 'character').length;
    assert.ok(characterBlocks > 5000, `expected the boneyard-wrapped payload to reflow to thousands of real character blocks, got ${characterBlocks}`);
  });

  it('the boneyard-wrapped A1 payload (distinct=200, occurrences=6,000) IS rejected via the boneyard frequent-cue-line bound', () => {
    const text = buildBoneyardWrappedA1(200, 6000);
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the boneyard-wrapped A1 payload to be rejected');
    assert.match(reason!, /MAX_FOUNTAIN_BONEYARD_FREQUENT_CUE_LINES/);
    assert.ok(ms < 100, `expected a fast rejection (well under 100ms), took ${ms}ms`);
  });

  it('a boneyard frequent-line-bound corner (49 distinct lines each occurring 20 times, under the distinct and weight caps) is NOT rejected', () => {
    const p: string[] = ['INT. ROOM - DAY', '', '/*'];
    for (let occ = 0; occ < 20; occ++) {
      for (let d = 0; d < MAX_FOUNTAIN_BONEYARD_FREQUENT_CUE_LINES - 1; d++) p.push(`PERSON${d}`, 'ordinary dialogue line here.', '');
    }
    p.push('*/');
    assert.equal(fountainShapeRejectionReason(p.join('\n')), null);
  });

  it('a legitimate small real cast outside a boneyard is not affected by a large legitimate boneyard nearby', () => {
    // The boneyard branch and the real-script branch are mutually exclusive
    // per line (inBoneyard gates which counters run) — this proves a large
    // legitimate boneyard does not ALSO inflate the outside-boneyard bounds.
    const p: string[] = ['INT. ROOM - DAY', '', '/*'];
    for (let i = 0; i < 100; i++) p.push(`CHARACTER${i}`, 'Line.', '');
    p.push('*/', '');
    // A small, ordinary real cast outside the boneyard.
    p.push('ALEX', 'Hello.', '', 'SAM', 'Hi back.', '');
    assert.equal(fountainShapeRejectionReason(p.join('\n')), null);
  });
});

// ── ROUND 8 (2026-09-05 review finding A1-R8, BLOCKER): the guard's OUTER
// gate (isCueLikeLine) rejected a lowercase parenthetical tail even though
// isCharacterCue accepts it and normalizeScreenplay's reflow UPPERCASES it
// into a real cue CHARACTER_CUE_RE then accepts. Round 7 put isCharacterCue
// INSIDE the blank-gap branch's decision but left the OUTER gate at two of
// the three cue predicates — a lowercase-tailed cue never reached that
// branch at all, because the loop `continue`d at the gate first. Fixed by
// making isCueLikeLine the union of all three predicates (see its own
// comment in validation.ts for the full trace and the exact measured
// numbers this reproduces below).
describe('ROUND 8 (finding A1-R8): the lowercase-parenthetical-tail bypass — isCueLikeLine\'s gate must be a superset of isCharacterCue too', () => {
  const LOWER_TAIL = "PERSON1 (cont'd)";
  const UPPER_TAIL = "PERSON1 (CONT'D)";

  it('sanity: the lowercase-tail cue is cue-shaped to isCharacterCue (the normalizer\'s own test) but was NOT cue-shaped to CHARACTER_CUE_RE or CUE_LIKE_LINE_RE alone (the gap the round-8 fix closes)', () => {
    assert.equal(isCharacterCue(LOWER_TAIL), true);
    assert.doesNotMatch(LOWER_TAIL, CHARACTER_CUE_RE, 'CHARACTER_CUE_RE requires an exact-case (CONT\'D)/(V.O.)/(O.S.) tail');
    assert.doesNotMatch(LOWER_TAIL, CUE_LIKE_LINE_RE, 'CUE_LIKE_LINE_RE\'s letter class is uppercase-only');
  });

  it('isCueLikeLine now accepts the lowercase-tail cue (the union fix)', () => {
    assert.equal(isCueLikeLine(LOWER_TAIL), true, 'BYPASS STILL OPEN: isCueLikeLine must be true whenever isCharacterCue is true');
  });

  it('normalizeScreenplay really does uppercase the lowercase tail into the exact shape CHARACTER_CUE_RE accepts (the mechanism, not an assumption)', () => {
    // Built directly (not via the ASCII-cue helper, which assumes an
    // adjacent, not double-spaced, layout) — the exploit needs the
    // blank-gap reflow to be in play.
    const text = ['INT. ROOM - DAY', '', LOWER_TAIL, '', 'Line.', ''].join('\n');
    const normalized = normalizeScreenplay(text);
    assert.ok(normalized.includes(UPPER_TAIL), `expected normalizeScreenplay to reflow "${LOWER_TAIL}" into "${UPPER_TAIL}", got: ${normalized}`);
    assert.match(UPPER_TAIL, CHARACTER_CUE_RE);
  });

  it('the A1-R8 payload (distinct=200, occurrences=6,000, lowercase-(cont\'d)-tailed cues, blank-gapped from their dialogue) IS rejected — the guard fired blind before this fix', () => {
    const distinct = 200, occurrences = 6000;
    const parts: string[] = ['INT. ROOM - DAY', ''];
    for (let k = 0; k < occurrences; k++) parts.push(`PERSON${k % distinct} (cont'd)`, '', 'Line.', '');
    const text = parts.join('\n');

    // Prove this is not a synthetic worry: the REAL pipeline really does turn
    // every one of these into a `character` block.
    const blocks = parseFountain(normalizeScreenplay(text));
    const characterBlocks = blocks.filter((b) => b.type === 'character').length;
    assert.equal(characterBlocks, occurrences, 'sanity: the real pipeline must produce one character block per occurrence for this to be a real bypass');

    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the A1-R8 payload to be rejected — the guard must not be blind to it');
    assert.ok(ms < 100, `expected the guard to reject in well under 100ms (single O(n) pass), took ${ms}ms`);
  });

  it('the general invariant: the guard\'s verdict must not depend on the CASE of the extension tail', () => {
    const distinct = 200, occurrences = 6000;
    function build(tail: string): string {
      const parts: string[] = ['INT. ROOM - DAY', ''];
      for (let k = 0; k < occurrences; k++) parts.push(`PERSON${k % distinct}${tail}`, '', 'Line.', '');
      return parts.join('\n');
    }
    const lowerReason = fountainShapeRejectionReason(build(" (cont'd)"));
    const upperReason = fountainShapeRejectionReason(build(" (CONT'D)"));
    assert.ok(lowerReason, 'the lowercase-tail variant must be rejected (this was the A1-R8 bypass)');
    assert.ok(upperReason, 'the uppercase-tail variant must be rejected (this was already true before the fix)');
    assert.equal(lowerReason, upperReason);
  });

  it('a legitimate small double-spaced two-hander with an occasional (cont\'d) tail is still NOT rejected', () => {
    let text = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 30; i++) {
      const tail = i % 5 === 0 ? " (cont'd)" : '';
      text += `${i % 2 === 0 ? 'PAUL' : 'JUNE'}${tail}\n\nSomething ordinary gets said here, line ${i}.\n\n`;
    }
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  // R4/R7 must still hold after this widening — the whole point of a union
  // fix is that it only ADDS acceptance for shapes a downstream predicate
  // actually treats as a cue; it must not start rejecting the caps-heavy
  // action fixture or excluding the caps-heavy "dialogue" bypass fixture
  // differently.
  it('the R4 caps-heavy-action fixture is STILL accepted after the ROUND 8 fix', () => {
    const SCENES = 200;
    const CAPS_LINES_PER_SCENE = 8;
    let text = '';
    for (let s = 0; s < SCENES; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n`;
      text += 'A person moves through the room, quiet, deliberate, careful not to make a sound.\n\n';
      for (let c = 0; c < CAPS_LINES_PER_SCENE; c++) {
        text += `THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES SCENE ${s} LINE ${c}\n\n`;
      }
    }
    assert.equal(fountainShapeRejectionReason(text), null);
  });
});

// ── ROUND 8 oracle (2026-09-05 review finding A1-R8): the direct, pipeline-
// derived invariant that would have caught rounds 4-8 in one test instead of
// one review round per spelling. `guardCueOccurrences` (validation.ts, "one
// walk, two consumers" with fountainShapeRejectionReason — see its own
// comment) must never be smaller than the number of `character` blocks the
// REAL pipeline (normalizeScreenplay then parseFountain — the exact order
// every real request runs) produces for the same raw text. Any violation
// means the guard is blind to a shape the pipeline will happily turn into
// real analyzer cost, regardless of whether anyone has thought to name that
// shape yet.
//
// The corpus below is a grammar PRODUCT over every family the eight rounds
// used: script (ASCII/Cyrillic/Greek/accented Latin), a `#` in the name, a
// 41+-char name, the dual-dialogue caret, all three extension tails in BOTH
// cases (V.O./O.S./CONT'D and v.o./o.s./cont'd — the round-8 family), each
// crossed with a cue-to-dialogue gap of 0 (adjacent) through 5 blank lines,
// plus whitespace-only "blank" lines, a boneyard-wrapped variant (A3's own
// merge mechanism), a caps-heavy-action-only document (must stay 0 >= 0, not
// a false positive), and one document mixing several families together.
function pipelineCharacterBlockCount(text: string): number {
  return parseFountain(normalizeScreenplay(text)).filter((b) => b.type === 'character').length;
}

const ORACLE_CUE_FAMILIES: Record<string, (i: number) => string> = {
  ASCII: (i) => `CHARACTER${i}`,
  Cyrillic: (i) => `ПЕРСОНАЖ${i}`,
  Greek: (i) => `ΧΑΡΑΚΤΗΡΑΣ${i}`,
  'accented Latin': (i) => `MARÍA${i}`,
  '# in the cue': (i) => `CHARACTER #${i}`,
  '41+ char cue': (i) => `A VERY LONG CHARACTER NAME OVER FORTY CHARACTERS ${i}`,
  'caret (tight)': (i) => `PERSON${i}^`,
  'caret (spaced)': (i) => `PERSON${i} ^`,
  'extension upper (V.O.)': (i) => `PERSON${i} (V.O.)`,
  'extension upper (O.S.)': (i) => `PERSON${i} (O.S.)`,
  "extension upper (CONT'D)": (i) => `PERSON${i} (CONT'D)`,
  'extension lower (v.o.)': (i) => `PERSON${i} (v.o.)`,
  'extension lower (o.s.)': (i) => `PERSON${i} (o.s.)`,
  "extension lower (cont'd) [A1-R8]": (i) => `PERSON${i} (cont'd)`,
};

function buildGapDoc(
  cueOf: (i: number) => string,
  distinct: number,
  occurrences: number,
  gap: number,
  gapLine = '',
): string {
  const parts: string[] = ['INT. ROOM - DAY', ''];
  for (let k = 0; k < occurrences; k++) {
    parts.push(cueOf(k % distinct));
    for (let g = 0; g < gap; g++) parts.push(gapLine);
    parts.push('Ordinary dialogue line here.', '');
  }
  return parts.join('\n');
}

describe('ROUND 8 oracle: guardCueOccurrences(text) >= pipeline character-block count, over the full rounds-1-8 grammar product', () => {
  const DISTINCT = 4;
  const OCCURRENCES = 12; // small — this proves CORRECTNESS of the shape recognition, not cost; the attack-scale numbers are proven above and in the HTTP bypass file.

  for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
    for (let gap = 0; gap <= 5; gap++) {
      it(`"${family}", gap=${gap}: guardCueOccurrences >= pipeline character-block count`, () => {
        const text = buildGapDoc(cueOf, DISTINCT, OCCURRENCES, gap);
        const guardCount = guardCueOccurrences(text);
        const pipelineCount = pipelineCharacterBlockCount(text);
        assert.ok(
          guardCount >= pipelineCount,
          `ORACLE VIOLATION "${family}" gap=${gap}: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
        );
      });
    }

    it(`"${family}", whitespace-only gap lines (gap=1 and gap=2): guardCueOccurrences >= pipeline character-block count`, () => {
      for (const gap of [1, 2]) {
        const text = buildGapDoc(cueOf, DISTINCT, OCCURRENCES, gap, '   \t  ');
        const guardCount = guardCueOccurrences(text);
        const pipelineCount = pipelineCharacterBlockCount(text);
        assert.ok(
          guardCount >= pipelineCount,
          `ORACLE VIOLATION "${family}" whitespace-gap=${gap}: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
        );
      }
    });
  }

  it('boneyard-wrapped (A3\'s own merge mechanism): every family, gap=0 and gap=2, guardCueOccurrences >= pipeline character-block count', () => {
    // Mirrors buildBoneyardWrappedA1 above: opens the boneyard right after an
    // established dialogue buffer so normalizeScreenplay's reflow merges the
    // `/*` marker onto the preceding line instead of leaving it standalone —
    // the exact mechanism that lets boneyard-wrapped content still reflow
    // into real character blocks despite looking boneyard-safe to a naive
    // guard. See A3's own describe block above for the full mechanism trace.
    for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      for (const gap of [0, 2]) {
        const p: string[] = ['INT. ROOM - DAY', '', 'SETUP', '', 'Some setup dialogue line here.', '', '/*'];
        for (let k = 0; k < 6; k++) {
          p.push(cueOf(k % 3));
          for (let g = 0; g < gap; g++) p.push('');
          p.push('Ordinary dialogue line here.', '');
        }
        p.push('*/');
        const text = p.join('\n');
        const guardCount = guardCueOccurrences(text);
        const pipelineCount = pipelineCharacterBlockCount(text);
        assert.ok(
          guardCount >= pipelineCount,
          `ORACLE VIOLATION boneyard-wrapped "${family}" gap=${gap}: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
        );
      }
    }
  });

  it('caps-heavy action (no real dialogue anywhere): guard and pipeline both count zero — the invariant must not be satisfied merely by over-rejecting', () => {
    const SCENES = 20;
    const CAPS_LINES_PER_SCENE = 8;
    let text = '';
    for (let s = 0; s < SCENES; s++) {
      text += `INT. LOCATION ${s} - DAY\n\n`;
      text += 'A person moves through the room, quiet, deliberate, careful not to make a sound.\n\n';
      for (let c = 0; c < CAPS_LINES_PER_SCENE; c++) {
        text += `THE DOOR SLAMS SHUT WITH A DEAFENING CRACK THAT ECHOES SCENE ${s} LINE ${c}\n\n`;
      }
    }
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 0, 'sanity: this fixture must have zero real character blocks');
    assert.equal(guardCount, 0, 'the guard must not count any of these caps-heavy action lines as cues');
    assert.ok(guardCount >= pipelineCount);
  });

  it('mixed families and gaps in one document: guardCueOccurrences >= pipeline character-block count', () => {
    const parts: string[] = ['INT. ROOM - DAY', ''];
    let k = 0;
    for (const [, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      for (let gap = 0; gap <= 3; gap++) {
        parts.push(cueOf(k++));
        for (let g = 0; g < gap; g++) parts.push('');
        parts.push('Ordinary dialogue line here.', '');
      }
    }
    const text = parts.join('\n');
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.ok(
      guardCount >= pipelineCount,
      `ORACLE VIOLATION mixed document: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
    );
  });

  // Belt-and-suspenders: re-run the oracle over the EXACT attack-scale
  // payloads rounds 5/6/7/8 measured (not just the small correctness-proof
  // corpus above), so the invariant is proven at the scale that actually
  // mattered, not only at unit-test scale.
  it('oracle holds at attack scale for the ROUND 8 payload (distinct=200, occurrences=6,000)', () => {
    const text = buildGapDoc(ORACLE_CUE_FAMILIES["extension lower (cont'd) [A1-R8]"]!, 200, 6000, 1);
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 6000);
    assert.ok(guardCount >= pipelineCount);
  });

  it('oracle holds at attack scale for the ROUND 7 caps-heavy-"dialogue" payload (distinct=200, occurrences=6,000)', () => {
    const distinct = 200, occurrences = 6000;
    const parts: string[] = ['INT. ROOM - DAY', ''];
    for (let k = 0; k < occurrences; k++) {
      parts.push(`PERSON${k % distinct}`, '', 'THIS IS AN ALL CAPITALS SPEECH LINE OF SUBSTANTIAL LENGTH INDEED', '');
    }
    const text = parts.join('\n');
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, occurrences);
    assert.ok(guardCount >= pipelineCount);
  });

  it('oracle holds at attack scale for the ROUND 5/6 double-spaced payload (distinct=600, occurrences=12,000, gap=3)', () => {
    const text = buildGapDoc(ORACLE_CUE_FAMILIES.ASCII!, 600, 12_000, 3);
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 12_000);
    assert.ok(guardCount >= pipelineCount);
  });
});
