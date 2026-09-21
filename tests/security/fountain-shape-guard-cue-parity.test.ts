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
  MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT,
  realVoiceWordCountsForMeasurement,
  VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT,
  VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US,
  guardVoiceWordCounts,
  guardEligibleVoiceWordCounts,
  isSceneSegmentHeading,
  resolveGuardLines,
  legacyVoiceEligibleWeightRejectionReason,
} from '../../server/lib/validation.ts';
import { CHARACTER_CUE_RE, parseFountain } from '../../src/lib/fountain.ts';
import { normalizeScreenplay, isCharacterCue } from '../../server/nvm/analyze/screenplay-normalizer.ts';
// 2026-09-05 review round 4 — imported (not replicated) so this test file's
// own oracle truncates its pipeline model at the SAME scene the guard and
// the real analyzer do; see validation.ts's own comment on this same import.
import { ANALYZER_SCENE_CEILING } from '../../server/nvm/analyze/fountain-analyzer.ts';
// The two document shapes MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT is derived
// against, and the rule that turns measured costs into the bound. These used
// to be written out inside the "finding 10" describe block below, which meant
// the calibration that derives the bound could only be reproduced by re-typing
// them — and the 2026-09-13 re-derivation needed them run on a GitHub Actions
// runner, not in this process. One implementation, imported here and by
// scripts/measure-voice-bound-cost.mjs; verified byte-identical to the inline
// versions at every cast this file uses before the move.
import {
  buildUniformMin,
  buildUniformCast,
  buildMaxAdmitted,
  buildProbeCastFeature,
  uniformMinWeight,
  maxAdmittedWordsPerSpeaker,
} from '../../scripts/lib/voice-bound.ts';
import { machineFingerprint, formatMachineFingerprint } from '../../scripts/lib/machine-fingerprint.ts';

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

    // TWO TIERS, NOT ONE FLOOR (round-2 review fix, 2026-09-07).
    //
    // Round 1 of this lane lowered the single corpus-wide floor 1000x -> 100x
    // to admit tests/fixtures/feature-length/assembled-feature.fountain (231
    // scenes, the repository's first stimulus at product length). That was
    // wrong in BOTH directions and the review measured why:
    //
    //   * it SUBTRACTED protection from every row that predates the fixture.
    //     This assertion reads the WORST row, so one floor is one floor for
    //     all of them — and the worst pre-existing row is
    //     tests/fixtures/blind-pairs/the-deposit-excellent.fountain at
    //     weight=357, a 28,011x margin. Those 75 rows cleared the old floor by
    //     28x; under a flat 100x any of them could regress 280-fold and this
    //     gate would stay green.
    //   * and 100x/10x are calibrated to THIS concatenation, whose twenty
    //     disjoint casts keep its cue weight artificially low — not to what a
    //     feature costs. This file's own buildPlausibleFeature() (120 scenes,
    //     44k words, a skewed major/minor cast) measures 6.2x weight / 6.3x
    //     frequent, an order of magnitude BELOW those floors, so the first
    //     genuinely realistic feature-length fixture anyone committed would
    //     have failed here for no real reason.
    //
    // So the corpus is split by class and each class keeps a floor derived
    // from its own measurement:
    //
    //   short-form (75 rows: 54 tracked fixtures + 20 calibration + P0 sample)
    //     measured worst 28,011x weight / 25.0x frequent -> floors 1000x / 10x,
    //     exactly the guarantee that existed before this lane.
    //   feature-scale (tests/fixtures/feature-length/**)
    //     floors derived from buildPlausibleFeature()'s 6.2x / 6.3x with
    //     headroom -> 5x / 3x, and asserted against buildPlausibleFeature()
    //     itself as well as the committed fixture, so the floor cannot drift
    //     away from the thing it was derived from.
    const isFeatureScale = (name: string) => name.replace(/\\/g, '/').includes('tests/fixtures/feature-length/');
    const shortFormRows = rows.filter((r) => !isFeatureScale(r.name));
    const featureRows = rows.filter((r) => isFeatureScale(r.name));
    assert.ok(shortFormRows.length >= 70, `expected the pre-existing short-form corpus, found ${shortFormRows.length} rows`);
    assert.ok(featureRows.length >= 1, 'expected at least one feature-scale fixture row — the tier below would otherwise prove nothing');

    const marginsOf = (subset: typeof rows) => {
      const worstByWeight = subset.reduce((a, b) => (b.weight > a.weight ? b : a));
      const worstByFrequent = subset.reduce((a, b) => (b.frequentCount > a.frequentCount ? b : a));
      return {
        worstByWeight,
        worstByFrequent,
        weightMargin: MAX_FOUNTAIN_CUE_WEIGHT / Math.max(1, worstByWeight.weight),
        frequentMargin: MAX_FOUNTAIN_FREQUENT_CUE_LINES / Math.max(1, worstByFrequent.frequentCount),
      };
    };
    const shortForm = marginsOf(shortFormRows);
    const feature = marginsOf(featureRows);
    const plausible = cueMetricsOf(buildPlausibleFeature().text);
    const plausibleWeightMargin = MAX_FOUNTAIN_CUE_WEIGHT / Math.max(1, plausible.weight);
    const plausibleFrequentMargin = MAX_FOUNTAIN_FREQUENT_CUE_LINES / Math.max(1, plausible.frequentCount);

    for (const [tier, m] of [['short-form', shortForm], ['feature-scale', feature]] as const) {
      console.log(
        `worst ${tier} row by weight: ${m.worstByWeight.name} distinct=${m.worstByWeight.distinct} `
        + `occurrences=${m.worstByWeight.occurrences} weight=${m.worstByWeight.weight} margin=${m.weightMargin.toFixed(0)}x`,
      );
      console.log(
        `worst ${tier} row by frequent-count: ${m.worstByFrequent.name} frequentCount=${m.worstByFrequent.frequentCount} `
        + `margin=${m.frequentMargin.toFixed(1)}x`,
      );
    }
    console.log(
      `buildPlausibleFeature() (the feature tier's derivation): weight=${plausible.weight} `
      + `frequentCount=${plausible.frequentCount} weightMargin=${plausibleWeightMargin.toFixed(1)}x `
      + `frequentMargin=${plausibleFrequentMargin.toFixed(1)}x`,
    );

    // ── Tier 1: the 75 rows that predate the feature fixture. UNCHANGED
    // guarantee — these are the floors this sweep carried before 2026-09-06,
    // and nothing about admitting a feature-length fixture licenses relaxing
    // them for a short-form script.
    assert.ok(
      shortForm.weightMargin >= 1000,
      `expected >=1000x weight margin on the worst SHORT-FORM row, got ${shortForm.weightMargin.toFixed(0)}x (${shortForm.worstByWeight.name})`,
    );
    assert.ok(
      shortForm.frequentMargin >= 10,
      `expected >=10x frequent-line margin on the worst SHORT-FORM row, got ${shortForm.frequentMargin.toFixed(1)}x (${shortForm.worstByFrequent.name})`,
    );

    // ── Tier 2: feature scale. Derived from buildPlausibleFeature(), not from
    // the committed concatenation, and asserted on BOTH so the two can never
    // drift apart silently. Measured when written: plausible feature 6.2x /
    // 6.3x, assembled fixture 236x / 10x.
    assert.ok(
      plausibleWeightMargin >= 5,
      `the feature tier's own derivation regressed: buildPlausibleFeature() weight margin ${plausibleWeightMargin.toFixed(1)}x < 5x`,
    );
    assert.ok(
      plausibleFrequentMargin >= 3,
      `the feature tier's own derivation regressed: buildPlausibleFeature() frequent margin ${plausibleFrequentMargin.toFixed(1)}x < 3x`,
    );
    assert.ok(
      feature.weightMargin >= 5,
      `expected >=5x weight margin on the worst FEATURE-SCALE fixture, got ${feature.weightMargin.toFixed(1)}x (${feature.worstByWeight.name})`,
    );
    assert.ok(
      feature.frequentMargin >= 3,
      `expected >=3x frequent-line margin on the worst FEATURE-SCALE fixture, got ${feature.frequentMargin.toFixed(1)}x (${feature.worstByFrequent.name})`,
    );

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

    // UPDATED 2026-09-07 (branch scoring/feature-length-defects). This block
    // used to report that the bound is ALL-OR-NOTHING and therefore never
    // evaluated for this fixture at all — "a stronger guarantee than any
    // finite margin". That guarantee is gone, deliberately: with
    // voice-delta.ts abstaining PER CHARACTER, a cast of 150 in which 12
    // names are talkative and 138 are one-liners really does run 12 x 11 / 2
    // Burrows's-Delta pairs, so the bound now reads the ELIGIBLE SUBSET and
    // this fixture gets a real, finite margin like everything else. Both
    // numbers are printed below: the eligible-subset weight the guard
    // actually evaluates, and the old hypothetical (every name eligible),
    // which is what the shape would cost if the minors ever grew into
    // speaking parts.
    const wordsByBaseName = new Map<string, number>();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i]!.trim();
      if (/^(PROTAGONIST|EXTRA)\d+$/.test(t) && i + 1 < lines.length) {
        const dialogueWordCount = lines[i + 1]!.trim().split(/\s+/).filter(Boolean).length;
        wordsByBaseName.set(t, (wordsByBaseName.get(t) ?? 0) + dialogueWordCount);
      }
    }
    const eligible = [...wordsByBaseName.values()].filter((w) => w >= 30);
    const eligibleCount = eligible.length;
    const eligibleWeight = eligibleCount * eligible.reduce((a, b) => a + b, 0);
    const totalWordsIfAllEligible = [...wordsByBaseName.values()].reduce((a, b) => a + b, 0);
    const hypotheticalWeight = wordsByBaseName.size * totalWordsIfAllEligible;
    console.log(
      `realistic feature: distinct=${distinct} occurrences=${occurrences} words=${wordCount} `
      + `vocabMargin=${vocabMargin.toFixed(1)}x weightMargin=${weightMargin.toFixed(1)}x frequentMargin=${frequentMargin.toFixed(1)}x | `
      + `voice-eligible-weight: ${eligibleCount} of ${wordsByBaseName.size} base names individually clear MIN_WORDS=30, `
      + `so the guard evaluates ${eligibleCount} x their pooled words = ${eligibleWeight} against a `
      + `${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} bound (${(MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / eligibleWeight).toFixed(1)}x headroom); `
      + `if all ${wordsByBaseName.size} names ever became eligible the weight would be ${hypotheticalWeight}, i.e. rejected`,
    );
    assert.ok(eligibleCount < wordsByBaseName.size, 'sanity: this fixture must have at least one under-threshold minor, or it is not testing the mechanism it claims to');
    assert.ok(
      eligibleWeight <= MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
      `a realistic 150-name feature must clear the eligible-subset bound: ${eligibleWeight} vs ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}`,
    );
    assert.ok(
      hypotheticalWeight > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
      'sanity: the all-eligible hypothetical must be over the bound, or this fixture is not exercising the subset distinction at all',
    );
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
      // (extension-stripped) pooled word count, restricted to the ELIGIBLE
      // SUBSET (names individually clearing 30 words — voice-delta.ts's own
      // VOICE_MIN_WORDS), product of eligible-count x their pooled words.
      // UPDATED 2026-09-07: this used to return null unless EVERY name was
      // eligible, mirroring the retired all-or-nothing model; under
      // per-character abstention that would leave most real scripts
      // unmeasured, which is a gap in the proof rather than a safe default.
      // Returns null only when fewer than two names are eligible — the one
      // case where analyzeVoices genuinely abstains and there is no cost.
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
      let eligibleCount = 0;
      let total = 0;
      for (const w of wordsByName.values()) {
        if (w < 30) continue;                     // excluded from the pair set
        eligibleCount++;
        total += w;
      }
      if (eligibleCount < 2) return null;          // analyzeVoices abstains: no cost
      return eligibleCount * total;
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
        ? 'voice-eligible-weight headroom: no tracked fixture has two voice-eligible characters — infinite margin by construction'
        : `voice-eligible-weight headroom: worst tracked fixture is "${worstName}" at ${worstMargin.toFixed(1)}x`,
    );
    assert.notEqual(
      worstMargin,
      Infinity,
      'this headroom proof is worthless if no tracked fixture reaches the bound at all — under per-character eligibility most of them must',
    );
  });

  // ROUND 2 (2026-09-11), the other half of the re-derivation: a bound and
  // the measurement that justifies it must not drift apart. The bound was
  // raised from 300,000 to 1,500,000 because main's own 2,927-line
  // assembled-feature fixture (eligible weight 443,990) was REJECTED at
  // 300,000 — `does not reject tests/fixtures/feature-length/assembled-
  // feature.fountain` above is the fail-first evidence and it failed on the
  // rebased tree before the change. What keeps the new value honest is this:
  // the worst shape AT the bound is n uniform characters each on the 32-word
  // floor (pairs grow as n²/2 while weight grows as 32n², so maximising the
  // cast maximises cost at fixed weight), and the recorded rate is the
  // SMALL-end, conservative one. The product must stay under the review's
  // ~10 s target, so raising the bound without re-measuring the rate fails
  // here rather than in production. The bound is ALSO bracketed from above by
  // the lightest pinned payload (round-3 bypass B, real-parse weight
  // 1,920,000), which is asserted below: a bound at or past that number would
  // start accepting a payload this file exists to reject.
  /**
   * The runner rates the margin proof is computed on — DERIVED from the
   * committed calibration table, never typed here. Until 2026-09-21 this was a
   * literal (`VOICE_ELIGIBLE_WEIGHT_RUNNER_WORST_US_PER_UNIT = 0.807`, run
   * 35542413222's max-admitted N=50 row); a literal has to be re-typed every
   * time the table is re-locked, which is the drift the table exists to end.
   *
   * SOURCE: `tests/fixtures/voice-bound-derivation.json`, the verbatim
   * `--json=-` line of `.github/workflows/calibrate-voice-bound.yml` run
   * **35553883758** (ubuntu-latest, AMD EPYC 7763 x4, node v24.20.0,
   * workflow_dispatch on lane/land-feature-length-defects @ 263420ac,
   * `uniform_32=97` plus the default sweep, repeats 2, idle+loaded). Every
   * rate below is a `loaded` cpuMsMax over the row's own weight: loaded is the
   * table's primaryCondition and the company the real assertion keeps under
   * `npm test`.
   *
   * Three readings, three assertions:
   *
   *   1. THE SHIPPED CONSTANT IS THE TABLE'S OWN ROW.
   *      `VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT` is, since 2026-09-21,
   *      the loaded rate of the `uniform-32` N=97 row — the shape it was
   *      first fitted on (2026-09-05, developer box, 0.173) — rounded UP at
   *      the fourth decimal. The runner reads 299 ms / 301,088 = 0.9931
   *      us/unit, 5.7x the old figure. Asserted equal here, so a re-lock that
   *      moves the row without moving the constant fails by name.
   *   2. THE DOCUMENT AT THE BOUND, MEASURED DIRECTLY. The max-admitted row
   *      whose weight is exactly MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (N=50,
   *      30,000 pooled words): 1,193 ms loaded (was 1,210 in run
   *      35542413222). No rate arithmetic in between — this is what the
   *      heaviest admitted document costs.
   *   3. THE WORST RATE ANY ADMITTED ROW SHOWS. Rates are not one number
   *      across shapes: the analyzer's per-document baseline dominates a
   *      light document, so the LIGHTEST admitted weight shows the HIGHEST
   *      rate — probe-cast N=20, 663 ms / 303,840 = 2.18 us/unit. A weight x
   *      rate product only bounds cost if the rate is the worst one, so the
   *      proof multiplies by this reading too: 1,500,000 x 2.18 us = 3,273 ms,
   *      3.1x under the 10,000 ms target.
   */
  interface DerivationTableRow { shape: string; n: number; weight: number; guard: string; cpuMsMax: number }
  const derivationTable = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'tests/fixtures/voice-bound-derivation.json'), 'utf8'),
  ) as {
    machine: { ci: string; runId?: string };
    primaryCondition: string;
    conditions: Record<string, DerivationTableRow[]>;
  };
  const loadedRows = derivationTable.conditions[derivationTable.primaryCondition] ?? [];
  const usPerUnit = (row: DerivationTableRow): number => (row.cpuMsMax * 1000) / row.weight;
  const atBoundRow = loadedRows.find((r) => r.shape === 'max-admitted' && r.weight === MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
  const fittedRow = loadedRows.find((r) => r.shape === 'uniform-32' && r.n === 97);
  const acceptedRows = loadedRows.filter((r) => r.guard === 'ACCEPT');

  it('the bound x its measured worst-shape rate stays under the review cost target', () => {
    assert.equal(derivationTable.machine.ci, 'github-actions', 'the margin proof reads rates from a table that was not locked on the runner');
    assert.equal(derivationTable.primaryCondition, 'loaded', 'the margin proof expects the loaded condition to be primary — it is the company the assertion keeps under npm test');
    assert.ok(atBoundRow, 'the committed table has no max-admitted row sitting exactly on the weight bound — the table was swept against a different bound; re-run calibrate-voice-bound.yml');
    assert.ok(
      fittedRow,
      'the committed table has no uniform-32 N=97 row — the shape VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT is fitted on was not swept; '
      + 'dispatch calibrate-voice-bound.yml with uniform_32=97 and lock its table',
    );
    assert.ok(acceptedRows.length >= 10, `the committed table carries only ${acceptedRows.length} accepted rows — a sweep this thin cannot say what the worst admitted rate is`);

    // (1) The shipped constant equals the fitted row's rate, rounded up at the
    // fourth decimal — never below the measurement.
    const fittedRate = usPerUnit(fittedRow!);
    const fittedRateRoundedUp = Math.ceil(fittedRate * 10_000) / 10_000;
    assert.ok(
      Math.abs(VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT - fittedRateRoundedUp) < 1e-9,
      `VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT is ${VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT}, but the committed table `
      + `(run ${derivationTable.machine.runId ?? '?'}) reads uniform-32 N=97 at ${fittedRow!.cpuMsMax} ms loaded / ${fittedRow!.weight} = `
      + `${fittedRate.toFixed(5)} us/unit, i.e. ${fittedRateRoundedUp} rounded up — the constant and the table it names have drifted; `
      + 'set the constant to the row (server/lib/validation.ts) and rewrite its SOURCE line',
    );
    assert.ok(VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT >= fittedRate, 'the shipped rate must never be below the measured one');

    const predictedUs = MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT * VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT;
    assert.ok(
      predictedUs < VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US,
      `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT=${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} x the measured `
      + `${VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT} us/unit predicts ${(predictedUs / 1000).toFixed(0)} ms, `
      + `over the ${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / 1000).toFixed(0)} ms target — re-measure the uniform-32 shape `
      + 'on the runner before raising the bound',
    );

    // (2) The document at the bound, measured directly.
    const atBoundUs = atBoundRow!.cpuMsMax * 1000;
    assert.ok(
      atBoundUs < VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US,
      `the heaviest document the weight bound admits (max-admitted N=${atBoundRow!.n}, weight ${atBoundRow!.weight}) measured `
      + `${atBoundRow!.cpuMsMax} ms loaded on the runner (run ${derivationTable.machine.runId ?? '?'}), over the `
      + `${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / 1000).toFixed(0)} ms target — lower the bound or re-derive`,
    );

    // (3) The worst rate of any accepted row, whichever shape shows it.
    const worstRow = acceptedRows.reduce((a, b) => (usPerUnit(b) > usPerUnit(a) ? b : a));
    const worstRate = usPerUnit(worstRow);
    const worstPredictedUs = MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT * worstRate;
    assert.ok(
      worstPredictedUs < VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US,
      `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT=${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} x the worst admitted rate the runner measured `
      + `(${worstRate.toFixed(3)} us/unit, ${worstRow.shape} N=${worstRow.n}, ${worstRow.cpuMsMax} ms on weight ${worstRow.weight}) `
      + `predicts ${(worstPredictedUs / 1000).toFixed(0)} ms, over the ${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / 1000).toFixed(0)} ms target`,
    );
    console.log(
      `voice-bound margin proof (run ${derivationTable.machine.runId ?? '?'}, loaded): bound ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} -> `
      + `${(predictedUs / 1000).toFixed(0)} ms at the uniform-32 N=97 rate ${VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT} us/unit `
      + `(${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / predictedUs).toFixed(1)}x under target); the document at the bound costs `
      + `${atBoundRow!.cpuMsMax} ms measured (${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / atBoundUs).toFixed(1)}x under); `
      + `${(worstPredictedUs / 1000).toFixed(0)} ms at the worst admitted rate, ${worstRow.shape} N=${worstRow.n} at `
      + `${worstRate.toFixed(3)} us/unit (${(VOICE_ELIGIBLE_WEIGHT_COST_TARGET_US / worstPredictedUs).toFixed(1)}x under) — the last is binding`,
    );
    // And the other direction: a bound so small that the heaviest fixture the
    // repository ships cannot clear it is the defect this round fixed, so pin
    // that fixture's measured weight by name. 443,990 is measured, not
    // guessed; if the fixture changes, this number changes with it.
    const ASSEMBLED_FEATURE_ELIGIBLE_WEIGHT = 443_990;
    assert.ok(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT >= 3 * ASSEMBLED_FEATURE_ELIGIBLE_WEIGHT,
      `main's assembled-feature fixture measures ${ASSEMBLED_FEATURE_ELIGIBLE_WEIGHT} and the bound is `
      + `${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} — under 3x headroom on a legitimate committed feature`,
    );
    // The upper bracket, so the bound can never be raised past a payload this
    // file pins as rejected without this line failing first. Measured
    // real-parse weight of round-3 bypass B (200 uniform names x 4
    // double-spaced hard-wrapped occurrences): 1,920,000 — the lightest of
    // every pinned payload (the round-2 three are 5,400,000 / 18,720,000 /
    // 19,656,000).
    const LIGHTEST_PINNED_PAYLOAD_WEIGHT = 1_920_000;
    assert.ok(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT < LIGHTEST_PINNED_PAYLOAD_WEIGHT,
      `the bound ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT} is at or past the lightest pinned payload `
      + `(${LIGHTEST_PINNED_PAYLOAD_WEIGHT}) — raising it that far starts ACCEPTING round-3 bypass B`,
    );
  });
});

// ── ROUND 3 (2026-09-05 independent review round 2 of the round-1/2 lane,
// BLOCKER, reopened): the voice-eligible-weight bound's diagnosis was right,
// but the guard's per-base-name word map disagreed with the analyzer's own
// in two ways, both letting a payload the bound should have caught slip
// through by making the guard believe a real, eligible character was
// ineligible (or did not exist):
//
//   (a) a parenthetical-only walk-on (`WALKON\n(beat)\n`) — the OLD guard
//       credited the cue with the next line's word count whatever that line
//       was, so a lone parenthetical registered as a 1-word (therefore
//       "ineligible") character and knocked the whole bound out, while
//       fountain-analyzer.ts's extractSceneContent skips parenthetical
//       blocks entirely — that name never enters dialogueByCharacter at
//       all, so analyzeVoices never abstains on it and runs the real
//       O(distinct²) pass regardless. Measured (pre-fix): 103,722 chars →
//       HTTP 200 in 42,749ms.
//   (b) double-spaced, hard-wrapped dialogue (the ordinary imported-PDF
//       shape screenplay-normalizer.ts's own header names) — the OLD guard
//       counted only the FIRST line found after a cue's blank-line gap,
//       while normalizeScreenplay's reflow JOINS every wrapped fragment
//       into ONE pooled dialogue block before parseFountain ever runs.
//       Measured (pre-fix): guard-words 20 < analyzer-words 60 for the same
//       occurrence; 63,070 chars → HTTP 200 in 33,193ms.
//
// FIXED (see accumulateDialogueWords/isDoubleSpacedForVoiceGrouping's own
// comments in validation.ts): the guard now (1) walks forward from a cue
// joining every subsequent non-blank, non-parenthetical, non-heading,
// non-cue line into one pooled total WHEN the document is double-spaced
// (matching normalizeScreenplay's own document-wide reflow decision,
// replicated not imported), and only the first such line otherwise
// (matching parseFountain's own single-spaced rule); and (2) a base name
// whose ACCUMULATED total across every occurrence is exactly zero is
// excluded from the eligibility check entirely, rather than counted as a
// 1-word (or 0-word) "ineligible" character — mirroring that such a name
// never enters dialogueByCharacter at all.
//
// The oracle below is round 1's oracle pattern applied to this SECOND
// hand-built model (round 1's own oracle only covers "what is a cue" — this
// one covers "what counts as a character's dialogue", which is the model
// both round-3 bypasses broke): for every base character name over a
// generated corpus, `guardVoiceWordCounts(text).get(name) ?? 0` must be
// `>=` the real pipeline's word total for that name
// (`parseFountain(normalizeScreenplay(text))`'s own `dialogue` blocks,
// pooled by base name the same way fountain-analyzer.ts's
// normalizeCharacterName does), and the guard's "ineligible" set (absent,
// i.e. zero, OR under VOICE_ELIGIBLE_MIN_WORDS) must be a SUBSET of the
// pipeline's own ineligible set (same two conditions, computed for real).
// Any violation of either property is exactly the shape of bypass A or B.
/** Mirrors fountain-analyzer.ts's extractSceneContent + normalizeCharacterName
 *  closely enough to be a faithful oracle reference: walks the REAL parsed
 *  blocks, tracks the current speaker across character/dual_dialogue
 *  blocks (extension tags stripped, matching normalizeCharacterName), and
 *  pools every `dialogue` block's word count under that speaker.
 *  Deliberately resets on `scene_heading`/`action` (the reviewer's own
 *  independent verification script used the same reset, and it is the
 *  conservative direction for an oracle: it can only make a name's
 *  pipeline total SMALLER, which makes the `guardWords >= pipelineWords`
 *  inequality easier to satisfy, never harder — so it cannot hide a real
 *  under-count). Module-scoped (2026-09-05 review round 5) rather than
 *  nested inside the "ROUND 3 oracle" describe block below, since the
 *  round-5 decision-set property needs it too. */
function pipelineWordsByBaseName(text: string): Map<string, number> {
  const blocks = parseFountain(normalizeScreenplay(text));
  const counts = new Map<string, number>();
  let cur: string | null = null;
  // 2026-09-05 review round 4, BLOCKER — fountain-analyzer.ts's own
  // dialogueByCharacter is built ONLY from the document's first
  // ANALYZER_SCENE_CEILING scene groups (allRawScenes.slice(0,
  // ANALYZER_SCENE_CEILING)), with sceneIndex 0 being every block AHEAD of
  // the first scene heading (the "preamble" slice element). Without this
  // truncation the oracle's pipeline model saw a walk-on placed past the
  // ceiling as a real (if ineligible) character, which the real analyzer
  // never sees at all — exactly the R4-2 bypass this round's review found.
  // Mirrors validation.ts's own sceneIndex tracking on GuardCueOccurrence.
  let sceneIndex = 0;
  for (const b of blocks) {
    if (b.type === 'scene_heading') {
      sceneIndex++;
      cur = null;
      continue;
    }
    if (sceneIndex > ANALYZER_SCENE_CEILING) continue;
    if (b.type === 'character' || b.type === 'dual_dialogue') {
      cur = b.text.trim().replace(/\^\s*$/, '').replace(/\(\s*(V\.O\.|O\.S\.|CONT'?D)\s*\)/gi, '').trim();
      continue;
    }
    if (b.type === 'dialogue' && cur) {
      const words = b.text.trim().split(/\s+/).filter(Boolean).length;
      counts.set(cur, (counts.get(cur) ?? 0) + words);
      continue;
    }
    if (b.type === 'action') cur = null;
  }
  return counts;
}

const VOICE_ELIGIBLE_MIN_WORDS = 30; // mirrors validation.ts's own (private) constant — see that file's comment

/** Runs the guardWords >= pipelineWords and ineligible-subset checks for
 *  one generated document, over the UNION of every base name either side
 *  recognizes (a name absent from one side reads as 0 for that side).
 *  Module-scoped (2026-09-05 review round 6) rather than nested inside the
 *  "ROUND 3 oracle" describe block below, since the round-6 corpus needs
 *  it too. */
function assertWordOracle(label: string, text: string): void {
  const guardCounts = guardVoiceWordCounts(text);
  const pipelineCounts = pipelineWordsByBaseName(text);
  const allNames = new Set<string>([...guardCounts.keys(), ...pipelineCounts.keys()]);
  for (const name of allNames) {
    const g = guardCounts.get(name) ?? 0;
    const p = pipelineCounts.get(name) ?? 0;
    assert.ok(
      g >= p,
      `ORACLE VIOLATION "${label}" name="${name}": guardWords=${g} < pipelineWords=${p}`,
    );
    const guardIneligible = g < VOICE_ELIGIBLE_MIN_WORDS;
    const pipelineIneligible = p < VOICE_ELIGIBLE_MIN_WORDS;
    assert.ok(
      !guardIneligible || pipelineIneligible,
      `ORACLE VIOLATION "${label}" name="${name}": guard treats it ineligible (${g} words) but the pipeline finds it ELIGIBLE (${p} words) — this is bypass A/B's exact shape`,
    );
  }
}

// 2026-09-05 review round 6, oracle gap — the two properties above
// (guardWords >= pipelineWords; ineligible-subset) and the round-5
// decision-set-subset property both compare against, or derive from, either
// the RAW `guardVoiceWordCounts` or a set-membership check — neither one
// evaluates the actual VALUES the bound's decision is built from. R6-1's
// guard-eligible map was EMPTY (every real cue pushed past the ceiling by
// the stray-\r bug), so `guardWords >= pipelineWords` compared the raw
// (unbounded) 60 against the pipeline's 60 and passed, and the decision-set
// subset (`∅ ⊆ anything`) passed too — both hold while the bound's actual
// input is empty. This property closes that gap directly: for every name
// the CEILING-AWARE pipeline finds eligible (> 0 words), the guard's own
// ceiling-aware accumulation (`guardEligibleVoiceWordCounts`) must report
// AT LEAST that many words — AND, separately, if the pipeline has any
// eligible name at all, the guard's eligible set must be non-empty (a
// dedicated non-vacuity check, since an inequality over an empty map holds
// vacuously and would not have caught R6-1 on its own). Together with the
// round-5 decision-set-subset property (which catches a GHOST entering the
// guard's set) this is now two-sided: one direction catches a name
// wrongly ADDED to the guard's decision, the other catches every name
// wrongly REMOVED from it — the round-4 and round-6 bypasses, respectively,
// in one pair of properties.
function assertEligibleWordsAtLeastPipeline(label: string, text: string): void {
  const guardEligible = guardEligibleVoiceWordCounts(text);
  const pipelineEligible = pipelineWordsByBaseName(text); // already ceiling-aware
  let pipelineHasEligible = false;
  for (const [name, pWords] of pipelineEligible) {
    if (pWords <= 0) continue;
    pipelineHasEligible = true;
    const gWords = guardEligible.get(name) ?? 0;
    assert.ok(
      gWords >= pWords,
      `ORACLE VIOLATION "${label}" name="${name}": guardEligibleVoiceWordCounts=${gWords} < ceiling-aware pipeline=${pWords} — this is R6-1's exact shape (the guard's real decision input undercounts a name the analyzer scores for real)`,
    );
  }
  if (pipelineHasEligible) {
    const guardHasEligible = [...guardEligible.values()].some((w) => w > 0);
    assert.ok(
      guardHasEligible,
      `ORACLE VIOLATION "${label}": the ceiling-aware pipeline has at least one eligible name, but the guard's ceiling-aware decision set is EMPTY — the bound would never even evaluate, exactly R6-1's shape`,
    );
  }
}

describe('ROUND 3 oracle: guardVoiceWordCounts(name) >= pipeline dialogue-word count(name), and guard-ineligible ⊆ pipeline-ineligible', () => {
  const DLG = 'this is ordinary lowercase dialogue here.'; // 6 words

  it('plain adjacent cue+dialogue, every cue-oracle family, gaps 0-3 — sanity that the word oracle holds on round-1\'s own corpus too', () => {
    for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      for (let gap = 0; gap <= 3; gap++) {
        const text = buildGapDoc(cueOf, 4, 12, gap);
        assertWordOracle(`${family} gap=${gap}`, text);
      }
    }
  });

  // 2026-09-05 review round 4, BLOCKER — this whole oracle (like the ROUND 8
  // cue oracle below) was LF-only. walkGuardCueOccurrences split on '\n'
  // BEFORE normalizing \r\n? -> \n, so a CR-only document was one line to the
  // entire guard walk while normalizeScreenplay (which DOES normalize first)
  // reflowed and parsed it in full — the same oracle-holds-on-LF-only gap
  // that let both round-3 bypasses (parenthetical-only, double-spaced-wrap)
  // hide from THIS oracle's own LF-only corpus, applied to a third axis (line
  // ending) instead of cue shape or spacing. Re-runs the plain-adjacent
  // corpus under CR-only and CRLF line endings.
  it('plain adjacent cue+dialogue under CR-only and CRLF line endings — the word oracle must hold regardless of line-ending style', () => {
    for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      for (const gap of [0, 1, 3]) {
        const lf = buildGapDoc(cueOf, 4, 12, gap);
        assertWordOracle(`${family} gap=${gap} CR-only`, lf.replace(/\n/g, '\r'));
        assertWordOracle(`${family} gap=${gap} CRLF`, lf.replace(/\n/g, '\r\n'));
      }
    }
  });

  it('parenthetical-only walk-ons (bypass A\'s exact shape) — a cue followed by nothing but a parenthetical must read as 0 words on both sides, and one placed among an otherwise-uniform eligible cast must not defeat the oracle', () => {
    // Bare: a single parenthetical-only cue, nothing else in the document.
    assertWordOracle('bare parenthetical-only', 'INT. HALL - DAY\n\nWALKON\n(beat)\n\n');
    // Two consecutive parentheticals, still nothing real.
    assertWordOracle('double parenthetical-only', 'INT. HALL - DAY\n\nWALKON\n(beat)\n(a pause)\n\n');
    // The exact bypass-A payload: 200 uniform eligible names, plus one
    // parenthetical-only walk-on appended.
    let t = 'INT. ROOM - DAY\n\n';
    for (let occ = 0; occ < 2000; occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
    t += 'INT. HALL - DAY\n\nWALKON\n(beat)\n\n';
    assertWordOracle('bypass-A payload (200x2000 + parenthetical walk-on)', t);
  });

  // 2026-09-05 review round 4, BLOCKER — a walk-on placed past
  // ANALYZER_SCENE_CEILING scene headings is exactly as invisible to the
  // real analyzer's dialogueByCharacter as a parenthetical-only walk-on is
  // (bypass A above): both never enter the map at all. Note this is a
  // property of the PIPELINE model (pipelineWordsByBaseName, fixed above to
  // truncate at the same ceiling) and of fountainShapeRejectionReason's own
  // internal accumulation (see its sceneIndex filter and the dedicated
  // "ROUND 4 regressions" describe block below for the end-to-end REJECT
  // proof) — NOT of guardVoiceWordCounts itself, which is documented to
  // return the RAW, unbounded per-name sum regardless of scene position (so
  // that its `>=` oracle property holds trivially against ANY truncated
  // pipeline view, never less safely). The 411th-scene placement, and the
  // scene-1 control, are the exact shapes this round's review found
  // (R4-2/R4-2b).
  it('a walk-on placed past ANALYZER_SCENE_CEILING scene headings reads as absent (0 words) in the pipeline model, matching the real analyzer, even though the guard\'s own raw total (safely) does not truncate', () => {
    let t = '';
    for (let s = 0; s <= ANALYZER_SCENE_CEILING + 20; s++) {
      t += `INT. LOCATION ${s} - DAY\n\nSomething happens.\n\n`;
    }
    t += 'WALKON\nhi\n\n';
    assertWordOracle('walk-on past the scene ceiling', t);
    assert.equal(pipelineWordsByBaseName(t).get('WALKON') ?? 0, 0, 'sanity: the pipeline model must truncate this walk-on away entirely, matching the real analyzer\'s ANALYZER_SCENE_CEILING');
  });

  it('the SAME walk-on placed in scene 1 (control, well inside the ceiling) reads as its true word count on both sides', () => {
    const t = 'WALKON\nhi\n\n' + (() => {
      let s2 = '';
      for (let s = 1; s <= ANALYZER_SCENE_CEILING + 20; s++) s2 += `INT. LOCATION ${s} - DAY\n\nSomething happens.\n\n`;
      return s2;
    })();
    assertWordOracle('walk-on in scene 1 (control)', t);
    assert.equal(pipelineWordsByBaseName(t).get('WALKON') ?? 0, 1, 'sanity: a scene-1 walk-on must still be credited its one real word in the pipeline model');
    assert.equal(guardVoiceWordCounts(t).get('WALKON') ?? 0, 1, 'sanity: a scene-1 walk-on must still be credited its one real word by the guard too');
  });

  it('a parenthetical THEN real dialogue for the SAME cue — the parenthetical itself must not be credited, but the dialogue after it must still be', () => {
    const text = 'INT. ROOM - DAY\n\nJUDGE\n(sternly)\nOrder in this court, or I will clear the room myself.\n\n';
    assertWordOracle('parenthetical then real dialogue', text);
    // Sanity: the guard must still count the REAL dialogue words, not
    // silently zero the whole occurrence because a parenthetical came first.
    const g = guardVoiceWordCounts(text).get('JUDGE') ?? 0;
    assert.ok(g >= 9, `expected the guard to credit the real dialogue after the parenthetical, got ${g} words`);
  });

  it('double-spaced hard-wrapped dialogue, wrap lengths 2-6 (bypass B\'s exact shape and its neighbors)', () => {
    function dsWrapped(distinct: number, occPerChar: number, wrapLines: number): string {
      let t = '', scene = 0, occ = 0;
      const total = distinct * occPerChar;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % distinct}\n\n`;
          for (let w = 0; w < wrapLines; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    }
    for (const wrapLines of [2, 3, 4, 5, 6]) {
      const text = dsWrapped(30, 4, wrapLines);
      assertWordOracle(`double-spaced wrap=${wrapLines}`, text);
      // Sanity the guard actually JOINS across the gaps here, not just
      // "happens to pass" by both sides reading 0 — a real per-occurrence
      // total of wrapLines*5 words must show up pooled across occ/char=4.
      const g = guardVoiceWordCounts(text).get('CHAR0') ?? 0;
      assert.ok(g >= wrapLines * 5 * 4 - 5, `expected the guard to pool ~${wrapLines * 5 * 4} words for CHAR0, got ${g}`);
    }
  });

  // 2026-09-05 review round 4, BLOCKER — the EXACT shape r3cr.mjs's payload
  // used (a double-spaced, hard-wrapped, uniform-cast document), replayed
  // under CR-only and CRLF line endings. Before the fix this was invisible
  // to the whole walk (guardVoiceWordCounts read every name as absent, 0
  // words, since the document was one giant "line"), not merely mis-counted
  // — the strongest form of the oracle violation this file checks for.
  it('double-spaced hard-wrapped dialogue under CR-only and CRLF line endings, wrap lengths 2-6', () => {
    function dsWrapped(distinct: number, occPerChar: number, wrapLines: number): string {
      let t = '', scene = 0, occ = 0;
      const total = distinct * occPerChar;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % distinct}\n\n`;
          for (let w = 0; w < wrapLines; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    }
    for (const wrapLines of [2, 3, 4, 5, 6]) {
      const lf = dsWrapped(30, 4, wrapLines);
      assertWordOracle(`double-spaced wrap=${wrapLines} CR-only`, lf.replace(/\n/g, '\r'));
      assertWordOracle(`double-spaced wrap=${wrapLines} CRLF`, lf.replace(/\n/g, '\r\n'));
    }
  });

  it('single-spaced wrapped dialogue — only the FIRST line counts on both sides (parseFountain\'s own rule for non-double-spaced text), so the oracle holds without the guard over-joining', () => {
    const P = 'line one has five words\nline two has five words\nline three has five words';
    let t = 'INT. ROOM - DAY\n\n';
    for (let occ = 0; occ < 800; occ++) t += `CHAR${occ % 200}\n${P}\n\n`;
    assertWordOracle('single-spaced wrapped 200x4', t);
    // The guard must not join here — normalizeScreenplay returns single-
    // spaced text UNCHANGED, so only "line one has five words" (5 words) is
    // real dialogue; the guard reading more per occurrence would still
    // satisfy `guardWords >= pipelineWords` (safe direction) but a huge
    // over-read would be worth flagging as a design regression, not just a
    // silent pass — assert it stays close to the true 5-word single line
    // per occurrence (4 occurrences => ~20, generous upper bound 40).
    const g = guardVoiceWordCounts(t).get('CHAR0') ?? 0;
    assert.ok(g <= 40, `expected the guard to read only the first wrapped line per occurrence here (~20 words for 4 occurrences), got ${g} — an unbounded over-join would defeat legitimate large-cast scripts`);
  });

  it('(V.O.)/(O.S.)/(CONT\'D) suffix variants pool into the SAME base name on both sides', () => {
    let t = 'INT. ROOM - DAY\n\n';
    t += `LEAD (V.O.)\n${DLG}\n\n`;
    t += `LEAD\n${DLG}\n\n`;
    t += `LEAD (CONT'D)\n${DLG}\n\n`;
    t += `LEAD (O.S.)\n${DLG}\n\n`;
    assertWordOracle('extension-suffix pooling', t);
    const g = guardVoiceWordCounts(t).get('LEAD') ?? 0;
    const p = pipelineWordsByBaseName(t).get('LEAD') ?? 0;
    assert.equal(p, 24, `sanity: the pipeline must pool all four variants (4 x DLG's 6 words) into one 24-word LEAD entry, got ${p}`);
    assert.ok(g >= p, `guard must pool at least as many words as the pipeline for the extension-suffix case, got guard=${g} pipeline=${p}`);
  });

  it('a boneyard wrapping a parenthetical-only walk-on and a double-spaced wrapped shape — neither reaches dialogueByCharacter on either side', () => {
    const text = [
      'INT. ROOM - DAY', '', 'SETUP', '', 'Some setup dialogue line here.', '', '/*',
      'WALKON', '(beat)', '',
      'CHAR0', '', 'line 0 has five words', '', 'line 1 has five words', '',
      '*/',
    ].join('\n');
    assertWordOracle('boneyard-wrapped parenthetical + double-spaced-shaped', text);
  });

  it('mixed: every family above combined into one document', () => {
    let t = 'INT. ROOM - DAY\n\n';
    for (let occ = 0; occ < 600; occ++) t += `UNIFORM${occ % 60}\n${DLG}\n\n`;
    t += 'INT. HALL - DAY\n\nWALKON1\n(beat)\n\n';
    t += 'INT. HALL - DAY\n\nWALKON2\n(a pause)\n(still nothing)\n\n';
    t += `INT. COURT - DAY\n\nJUDGE (V.O.)\n(sternly)\nOrder in this court, or I will clear the room myself.\n\n`;
    t += `INT. COURT - DAY\n\nJUDGE\n${DLG}\n\n`;
    {
      let scene = 0, occ = 0;
      while (occ < 4 * 3) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < 4 * 3; i++, occ++) {
          t += `WRAPPED0\n\n`;
          for (let w = 0; w < 3; w++) t += `line ${w} has five words\n\n`;
        }
      }
    }
    const P = 'line one has five words\nline two has five words';
    for (let occ = 0; occ < 4; occ++) t += `SINGLESPACED0\n${P}\n\n`;
    assertWordOracle('mixed document', t);
  });
});

// ── ROUND 5 (2026-09-05 review round 5, BLOCKER, of the round-4 fix
// `f25e4cd3`): the guard's sceneIndex counter incremented on
// SCENE_HEADING_PREFIX_RE (four ASCII prefixes, case-sensitive) while the
// real analyzer segments scenes on parseFountain's own, much wider heading
// test (src/lib/fountain.ts:127 — nine more prefixes, case-insensitive,
// plus the Fountain `.`-forced form). The guard's scene count was therefore
// <= the analyzer's for any document using a heading spelling the narrow
// regex does not recognize, letting a past-ANALYZER_SCENE_CEILING walk-on
// back into the eligibility set — the round-3/round-4 bypass reopened one
// prefix spelling later. Fixed with a dedicated, wider predicate
// (isSceneSegmentHeading, validation.ts) that mirrors fountain.ts:127
// exactly, used ONLY for the sceneIndex counter — SCENE_HEADING_PREFIX_RE
// itself is untouched and still governs cue-line skipping, per the review's
// own instruction not to widen it in place.
describe('ROUND 5 (finding 1, BLOCKER): scene-segmentation predicate parity with parseFountain\'s own scene_heading test', () => {
  const PREFIXES = ['INT', 'EXT', 'EST', 'I/E', 'INTERIOR', 'EXTERIOR', 'ESTABLECIENDO', 'INT/EXT', 'INTÉRIEUR', 'EXTÉRIEUR', 'INTERIEUR', 'EXTERIEUR', 'INNEN', 'AUSSEN'];
  const CASE_FNS: Record<string, (s: string) => string> = {
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    mixed: (s) => s.split('').map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase())).join(''),
  };
  const SEPARATORS = ['.', ' '];

  function realIsSceneHeading(line: string): boolean {
    const blocks = parseFountain(line);
    return blocks.length > 0 && blocks[0]!.type === 'scene_heading';
  }

  let productSize = 0;
  for (const prefix of PREFIXES) {
    for (const [caseName, toCase] of Object.entries(CASE_FNS)) {
      for (const sep of SEPARATORS) {
        const line = `${toCase(prefix)}${sep}LOCATION - DAY`;
        productSize++;
        it(`"${line}" (${caseName}, sep=${JSON.stringify(sep)}): isSceneSegmentHeading agrees with parseFountain`, () => {
          const real = realIsSceneHeading(line);
          const guard = isSceneSegmentHeading(line);
          assert.equal(real, true, `generator sanity: "${line}" must actually be a real scene heading, or this row proves nothing`);
          assert.equal(guard, real, `PARITY VIOLATION: "${line}" — guard=${guard} real=${real}`);
        });
      }
    }
  }

  it(`covered the full heading-spelling product (${PREFIXES.length} prefixes x ${Object.keys(CASE_FNS).length} cases x ${SEPARATORS.length} separators)`, () => {
    assert.equal(productSize, PREFIXES.length * Object.keys(CASE_FNS).length * SEPARATORS.length);
    assert.equal(productSize, 84);
  });

  // Non-prefix edge cases: the Fountain forced '.' heading form, forced '!'
  // action (must NOT be a heading on either side), a prefix-shaped word with
  // no `[. ]` boundary (must NOT match either — "INTERPOL" starts with
  // "INT" but is not followed by '.'/' ', and is not itself one of the
  // full-word alternatives), trailing spaces, and ordinary action.
  const EDGE_CASES: Array<[string, string, boolean]> = [
    ['.FORCED SCENE HEADING', 'Fountain forced-heading form', true],
    // 2026-09-20 (scene-grammar lane, row 6 of SESSION_REPORT_2026-09-19.md):
    // this case used to expect `true` and pinned the defect. Fountain forces a
    // heading with `.` + an alphanumeric; a bare `.`, `..` and `...` are prose,
    // which is the whole point of reserving the leading dot. Both sides now say
    // false, and the parity property this suite exists for is unaffected —
    // the guard is no longer a mirror of parseFountain's predicate, it is that
    // predicate (validation.ts's isSceneSegmentHeading calls it directly).
    ['.', 'a bare period alone is NOT a Fountain forced heading', false],
    ['..', 'two periods are not a forced heading', false],
    ['...and then nothing.', 'an ellipsis opening a dialogue continuation is prose, not a heading', false],
    ['.2 HOURS LATER', 'a forced heading may start with a digit', true],
    // 2026-09-20 (Unicode forced-heading decision): FORCED_SCENE_HEADING_RE
    // widened from `[A-Za-z0-9]` to `\p{L}\p{N}` (any Unicode letter or
    // number) — a forced heading in Cyrillic, Armenian or CJK now counts, and
    // the ellipsis exclusion above is unaffected (none of those bytes is
    // `\p{L}`/`\p{N}` either).
    ['.МОСКВА - ДЕНЬ', 'a forced heading in Cyrillic', true],
    ['.ԵՐԵՎԱՆ', 'a forced heading in Armenian', true],
    ['.東京', 'a forced heading in CJK', true],
    ['. МОСКВА', 'a space after the dot is still not a forced heading', false],
    ['!This is forced action, not a heading.', 'forced action (!) must NOT be a heading', false],
    ['INTERPOL AGENTS STORM THE ROOM', 'a prefix-shaped word with no [. ] boundary must NOT match', false],
    ['INT.LOCATION - DAY', 'no space after the period — the period alone satisfies [. ]', true],
    ['int.    location, trailing spaces   ', 'lowercase with trailing spaces (trimmed first, same as both real sides)', true],
    ['Some ordinary action line.', 'ordinary action must NOT be a heading', false],
  ];
  for (const [line, label, expected] of EDGE_CASES) {
    it(`"${line}" (${label}): isSceneSegmentHeading agrees with parseFountain (expected=${expected})`, () => {
      const trimmed = line.trim();
      const real = realIsSceneHeading(trimmed);
      const guard = isSceneSegmentHeading(trimmed);
      assert.equal(real, expected, `generator sanity: "${line}" — expected parseFountain to say ${expected}, got ${real}`);
      assert.equal(guard, real, `PARITY VIOLATION: "${line}" — guard=${guard} real=${real}`);
    });
  }

  // CR-only / CRLF: isSceneSegmentHeading itself operates on an
  // already-trimmed, already-normalized single line, so this proves the
  // DOCUMENT-LEVEL plumbing (line-ending resolution feeding it the same
  // scene count the real pipeline computes) holds for every recognized
  // heading style, not only the round-4 INT.-only sweep.
  //
  // 2026-09-05 review round 6, oracle gap — `guardSceneSegmentCount` used to
  // be a REPLICA of validation.ts's own line-resolution logic (its own
  // comment said so explicitly). That replica hard-coded the round-4 shape
  // (`text.replace(/\r\n?/g, '\n').split('\n')` unconditionally) and had
  // already silently drifted from the real walk by the time round 6 changed
  // that logic to be conditional on `docIsDoubleSpaced` — which is exactly
  // why this "document-level parity" test could not see the round-6 bug:
  // it was proving the replica agreed with itself, not that the guard
  // agreed with the real pipeline. Fixed by calling `resolveGuardLines`
  // (validation.ts, exported test-only for this reason) directly — the
  // SAME function walkGuardCueOccurrences itself now calls — so this test
  // exercises the real wiring and can never drift from it again.
  function guardSceneSegmentCount(text: string): number {
    const { lines } = resolveGuardLines(text);
    let inBoneyard = false;
    let count = 0;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.length === 0) continue;
      if (line.startsWith('/*')) inBoneyard = true;
      if (inBoneyard) {
        if (line.includes('*/') && !(line.startsWith('/*') && !line.includes('*/'))) inBoneyard = false;
        continue;
      }
      if (isSceneSegmentHeading(line)) count++;
    }
    return count;
  }
  function realSceneSegmentCount(text: string): number {
    return parseFountain(normalizeScreenplay(text)).filter((b) => b.type === 'scene_heading').length;
  }
  const mixedHeadingDoc = '.FORCED ONE\n\nAction line one.\n\nint. two - day\n\nAction line two.\n\nINTERIOR THREE - NIGHT\n\nAction line three.\n\nINT/EXT FOUR - DAY\n\nAction line four.\n\n';
  const EOL_VARIANTS: Record<string, (s: string) => string> = {
    LF: (s) => s,
    'CR-only': (s) => s.replace(/\n/g, '\r'),
    CRLF: (s) => s.replace(/\n/g, '\r\n'),
  };
  for (const [eolName, toEol] of Object.entries(EOL_VARIANTS)) {
    it(`a document mixing forced/lowercase/INTERIOR/INT-EXT-style headings under ${eolName} line endings: guard and real pipeline both count 4 scenes`, () => {
      const text = toEol(mixedHeadingDoc);
      const real = realSceneSegmentCount(text);
      const guard = guardSceneSegmentCount(text);
      assert.equal(real, 4, `sanity: expected 4 real scene_heading blocks under ${eolName}`);
      assert.equal(guard, real, `PARITY VIOLATION under ${eolName}: guard counted ${guard} scenes, real pipeline counted ${real}`);
    });
  }
});

// ── ROUND 5 (finding 2, oracle gap): the round-3/round-4 oracle properties
// (guardWords >= pipelineWords; guard-ineligible ⊆ pipeline-ineligible)
// cannot see this bypass class — a ghost past-ceiling walk-on's guard total
// (1 word, raw) still satisfies `1 >= 0` and `1 < 30 ⇒ 0 < 30` against the
// ceiling-aware pipeline's total (0 words) even when the guard's OWN
// internal scene-counting is wrong. The property that actually catches it
// is the guard's ceiling-aware DECISION SET (base names with > 0 counted
// words, from guardEligibleVoiceWordCounts — the ceiling-aware mirror of
// fountainShapeRejectionReason's own accumulation, not the raw
// guardVoiceWordCounts) must be a SUBSET of the ceiling-aware pipeline's own
// decision set. Verified (manually, via a temporary revert of validation.ts
// to the round-4 commit `f25e4cd3`) that this exact property FAILS on the
// round-4 tree for the `.FORCED`/lowercase/INTERIOR heading documents below
// — WALKON appeared in the round-4 guard's decision set while absent from
// the ceiling-aware pipeline's — and PASSES on this round's fix.
describe('ROUND 5 (finding 2, oracle gap): the guard\'s ceiling-aware decision set must be a subset of the ceiling-aware pipeline\'s', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';

  // 200 uniform eligible names spread across `scenes` scene groups (5 cues
  // each), then a 1-word walk-on in one more scene headed by `tailHeading`.
  // Mirrors r4attack.mjs's own `build()` generator exactly (byte-for-byte,
  // per the R5-1 length sanity check in the regressions block below) rather
  // than approximating it, so this corpus is the reviewer's own repro
  // shape, committed.
  function buildCeilingCrossingDoc(headingOf: (s: number) => string, scenes: number, tailHeading: string): string {
    let t = '', occ = 0;
    for (let s = 0; s < scenes; s++) {
      t += `${headingOf(s)}\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
    }
    return t + `${tailHeading}\n\nWALKON\nhi\n\n`;
  }

  function assertDecisionSetSubset(label: string, text: string): void {
    const guardEligible = guardEligibleVoiceWordCounts(text);
    const pipelineEligible = pipelineWordsByBaseName(text);
    for (const [name, words] of guardEligible) {
      if (words <= 0) continue;
      const p = pipelineEligible.get(name) ?? 0;
      assert.ok(
        p > 0,
        `ORACLE VIOLATION "${label}" name="${name}": the guard's ceiling-aware decision set includes it (${words} words) but the ceiling-aware pipeline's does not (${p} words) — this is the round-5 heading-spelling bypass's exact shape`,
      );
    }
  }

  // `.`-forced, lowercase, and INTERIOR-style heading documents — the corpus
  // this property was missing before round 5 (it was INT.-only).
  const HEADING_STYLES: Record<string, (s: number) => string> = {
    '.FORCED': (s) => `.SCENE ${s}`,
    'lowercase int.': (s) => `int. location ${s} - day`,
    'INTERIOR': (s) => `INTERIOR LOCATION ${s} - DAY`,
    'INT. control': (s) => `INT. LOCATION ${s} - DAY`,
  };
  for (const [styleName, headingOf] of Object.entries(HEADING_STYLES)) {
    it(`${styleName} headings, walk-on past the scene ceiling: decision-set subset property holds`, () => {
      const text = buildCeilingCrossingDoc(headingOf, 410, styleName === 'INT. control' ? 'INT. HALL - DAY' : headingOf(410));
      assertDecisionSetSubset(`${styleName} past ceiling`, text);
      // Sanity: WALKON must genuinely be excluded from the ceiling-aware
      // pipeline's decision set for this to be testing the real mechanism,
      // not passing vacuously.
      assert.equal(pipelineWordsByBaseName(text).get('WALKON') ?? 0, 0, `sanity: WALKON must be truncated away by the real pipeline under ${styleName} headings`);
    });
  }

  it('the scene-1 control (walk-on well inside the ceiling) still satisfies the decision-set property, with WALKON genuinely present on both sides', () => {
    const text = 'INT. HALL - DAY\n\nWALKON\nhi\n\n' + (() => {
      let t = '', occ = 0;
      for (let s = 1; s <= 410; s++) {
        t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
      }
      return t;
    })();
    assertDecisionSetSubset('scene-1 control', text);
    assert.equal(pipelineWordsByBaseName(text).get('WALKON') ?? 0, 1, 'sanity: WALKON must be present (1 word) in the pipeline model for scene 1');
  });
});

// ── ROUND 5 regressions: the three heading-spelling bypass payloads reject,
// and both controls (the INT.-only round-3/4 shape, and the exactly-at-the-
// ceiling boundary) keep their current, unchanged verdicts. Timed with
// `fountainShapeRejectionReason` directly, the same way every prior round's
// regression block is.
describe('ROUND 5 regressions: three heading-spelling bypass payloads reject fast, both controls are unchanged', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';
  function buildCeilingCrossingDoc(headingOf: (s: number) => string, scenes: number, tailHeading: string): string {
    let t = '', occ = 0;
    for (let s = 0; s < scenes; s++) {
      t += `${headingOf(s)}\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
    }
    return t + `${tailHeading}\n\nWALKON\nhi\n\n`;
  }

  it('R5-1: all 410 headings ".SCENE n" (Fountain forced form), plus a past-ceiling walk-on (measured pre-fix: ACCEPT, runScriptDoctor 42,697ms; HTTP 200 in 42,575ms) now rejects fast', () => {
    const text = buildCeilingCrossingDoc((s) => `.SCENE ${s}`, 410, '.SCENE FINAL');
    assert.equal(text.length, 121_345, 'payload size must match the measured R5-1 shape exactly');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the .FORCED-heading past-ceiling walk-on to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('R5-3: all 410 headings lowercase "int. location n - day", plus a past-ceiling walk-on (measured pre-fix: ACCEPT, runScriptDoctor 43,646ms) now rejects fast', () => {
    const text = buildCeilingCrossingDoc((s) => `int. location ${s} - day`, 410, 'int. hall - day');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the lowercase-heading past-ceiling walk-on to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('R5-4: all 410 headings "INTERIOR LOCATION n - DAY", plus a past-ceiling walk-on (measured pre-fix: ACCEPT, runScriptDoctor 42,364ms) now rejects fast', () => {
    const text = buildCeilingCrossingDoc((s) => `INTERIOR LOCATION ${s} - DAY`, 410, 'INTERIOR HALL - DAY');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the INTERIOR-heading past-ceiling walk-on to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('R5-5 control: plain "INT." headings, past-ceiling walk-on (the round-3/round-4 R4-2 shape) is unchanged — still rejects', () => {
    const text = buildCeilingCrossingDoc((s) => `INT. LOCATION ${s} - DAY`, 410, 'INT. HALL - DAY');
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the INT.-only control to keep rejecting (unchanged from round 4)');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  // RE-ANCHORED 2026-09-07 (branch scoring/feature-length-defects), per this
  // suite's own rule that a moved anchor is re-measured and stated, never
  // widened. This control USED to assert ACCEPT, and it was right to: under
  // the old all-or-nothing eligibility model the single one-word walk-on
  // made `allEligible` false, the weight bound was never evaluated, and the
  // document was accepted. That acceptance was only ever safe because
  // voice-delta.ts's analyzeVoices ALSO abstained for the whole script on
  // that same walk-on. It no longer does — abstention is per character as of
  // the same branch — so the 200 uniformly talkative names in this payload
  // are now scored as 19,900 Burrows's-Delta pairs. Measured directly on
  // this exact shape: analyzeVoices ALONE takes 42,062 ms. The verdict that
  // changed is the guard catching up to the analyzer, not the guard getting
  // stricter for its own sake.
  it('R5-6: a walk-on placed exactly at scene 400 (the ceiling boundary, still eligible) now REJECTS — its 200 eligible names cost 42,062ms in analyzeVoices alone once per-character abstention landed', () => {
    const text = buildCeilingCrossingDoc((s) => `INT. LOCATION ${s} - DAY`, 399, 'INT. HALL - DAY');
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the at-the-ceiling walk-on to be rejected now that one walk-on no longer abstains the whole voice analysis');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });
});

// ── ROUND 6 (2026-09-05 review round 6, BLOCKER, of the round-5 fix
// `81ff69fe`): the guard's line array was STILL not what the real pipeline
// reads. Round 4 normalized `\r\n?` -> `\n` unconditionally before
// splitting; round 6 found normalizeScreenplay only keeps that
// normalization PERMANENTLY when it actually reflows (`isDoubleSpaced`) —
// for an ordinary single-spaced script it returns the raw string, `\r`s and
// all, which parseFountain then splits on `'\n'` ALONE, so a lone `\r`
// embedded inside one line is ordinary text to the real pipeline but an
// extra line break to the (round-4-shaped) guard. A single stray `\r`
// inside one action paragraph, repeated enough times, pushed `sceneIndex`
// past `ANALYZER_SCENE_CEILING` for EVERY real cue, emptying
// `voiceWordCounts` and skipping the bound entirely — 200 real, fully
// eligible characters (60 words each) guard-ACCEPTED with ZERO eligible
// names, HTTP 200 in 51,437ms (measured pre-fix), for a document identical
// to a REJECTing control except for that one stray `\r`. FIXED (see
// `resolveGuardLines`'s own comment in validation.ts): the walk now
// resolves the SAME line array normalizeScreenplay would hand to
// parseFountain — the `\r`-normalized array only when the document actually
// reflows, the untouched `'\n'`-split-only text otherwise.
describe('ROUND 6 oracle: lone \\r embedded inside a single-spaced line — both the cue-count and word-map oracles must hold', () => {
  const DLG6 = 'this is ordinary lowercase dialogue here.';

  function pipelineCharacterBlockCount(text: string): number {
    return parseFountain(normalizeScreenplay(text)).filter((b) => b.type === 'character').length;
  }

  // Mirrors r5attack.mjs's own `base()` generator BYTE-FOR-BYTE (same blank
  // -line spacing after each block — the attack-scale test below pins the
  // exact measured length against this): 5 cues per real INT. scene, one
  // lone stray `\r` (repeated `crRepeat` times) embedded inside the FIRST
  // scene's action line only — everything else single-spaced, ordinary
  // Fountain.
  function docWithLoneCrInAction(distinct: number, scenes: number, cuesPerScene: number, crRepeat: number): string {
    let t = '', occ = 0;
    for (let s = 0; s < scenes; s++) {
      t += `INT. LOCATION ${s} - DAY\n\n`;
      t += s === 0 && crRepeat > 0
        ? `Something happens${'\rINT. GHOST - DAY'.repeat(crRepeat)}\n\n`
        : 'Something happens in the room.\n\n';
      for (let i = 0; i < cuesPerScene; i++, occ++) t += `CHAR${occ % distinct}\n${DLG6}\n\n`;
    }
    return t;
  }

  // A second placement: the stray `\r` sits inside a DIALOGUE line rather
  // than an action line — a different real-world shape (a copy-pasted
  // classic-Mac fragment landing mid-sentence in what a writer typed),
  // proving the fix is not narrowly tied to where in the document the `\r`
  // appears.
  function docWithLoneCrInDialogue(distinct: number, occurrences: number, crRepeat: number): string {
    let t = 'INT. ROOM - DAY\n';
    for (let occ = 0; occ < occurrences; occ++) {
      const dlg = occ === 0 && crRepeat > 0
        ? `this is dialogue${'\rINT. GHOST - DAY'.repeat(crRepeat)} with a stray cr`
        : DLG6;
      t += `CHAR${occ % distinct}\n${dlg}\n`;
    }
    return t;
  }

  it('a lone \\r inside an action line (small scale, crRepeat 1-5): cue-count and word-map oracles both hold', () => {
    for (const crRepeat of [1, 2, 3, 5]) {
      const text = docWithLoneCrInAction(4, 6, 2, crRepeat);
      const guardCount = guardCueOccurrences(text);
      const pipelineCount = pipelineCharacterBlockCount(text);
      assert.ok(
        guardCount >= pipelineCount,
        `ORACLE VIOLATION crRepeat=${crRepeat}: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
      );
      assertWordOracle(`lone-cr-in-action crRepeat=${crRepeat}`, text);
      assertEligibleWordsAtLeastPipeline(`lone-cr-in-action crRepeat=${crRepeat}`, text);
    }
  });

  it('a lone \\r inside a dialogue line: cue-count and word-map oracles both hold', () => {
    const text = docWithLoneCrInDialogue(10, 20, 3);
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.ok(
      guardCount >= pipelineCount,
      `ORACLE VIOLATION: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
    );
    assertWordOracle('lone-cr-in-dialogue', text);
    assertEligibleWordsAtLeastPipeline('lone-cr-in-dialogue', text);
  });

  it('a document with NO stray \\r (control) still satisfies every property', () => {
    const text = docWithLoneCrInAction(4, 6, 2, 0);
    assertWordOracle('no-cr control', text);
    assertEligibleWordsAtLeastPipeline('no-cr control', text);
  });

  // Belt-and-suspenders: the exact r5attack.mjs/R6-1 attack-scale shape —
  // 200 names over 400 real scenes (5 cues/scene, under the frequent-cue
  // bound), one action line carrying 500 embedded stray `\r`s.
  it('oracle holds at attack scale for R6-1\'s exact shape (200 names x 5/scene over 400 scenes, one action line with 500 embedded \\r fake headings)', () => {
    const text = docWithLoneCrInAction(200, 400, 5, 500);
    assert.equal(text.length, 132_077, 'payload size must match the measured R6-1 shape exactly');
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 2000, 'sanity: the real pipeline must still produce 2,000 character blocks for this document');
    assert.ok(guardCount >= pipelineCount, `guard=${guardCount} pipeline=${pipelineCount}`);
    assertEligibleWordsAtLeastPipeline('R6-1 attack scale', text);
  });
});

// ── ROUND 6 regressions: R6-1 (the stray-\r bypass) rejects fast, and both
// controls (no \r at all, and a partial 50-\r inflation still short of the
// ceiling) keep their existing, correct verdicts. Timed with
// `fountainShapeRejectionReason` directly, the same way every prior round's
// regression block is.
describe('ROUND 6 regressions: the stray-\\r bypass rejects fast, both controls are unchanged', () => {
  const DLG6 = 'this is ordinary lowercase dialogue here.';

  function buildR6Doc(inflate: number): string {
    let t = '', occ = 0;
    for (let s = 0; s < 400; s++) {
      t += `INT. LOCATION ${s} - DAY\n\n`;
      t += s === 0 && inflate > 0
        ? `Something happens${'\rINT. GHOST - DAY'.repeat(inflate)}\n\n`
        : 'Something happens in the room.\n\n';
      for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG6}\n\n`;
    }
    return t;
  }

  it('R6-0 control (no \\r inflation) is unchanged — still rejects (200 fully eligible names over 400 scenes trips MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT on its own)', () => {
    const text = buildR6Doc(0);
    assert.equal(text.length, 123_590, 'payload size must match the measured R6-0 control shape exactly');
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the R6-0 control to keep rejecting');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  it('R6-1: one action line with 500 \\r-embedded fake headings (measured pre-fix: ACCEPT with 0 eligible names vs. 200 real ones, runScriptDoctor 49,234ms; HTTP 200 in 51,437ms) now rejects fast', () => {
    const text = buildR6Doc(500);
    assert.equal(text.length, 132_077, 'payload size must match the measured R6-1 shape exactly');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the stray-\\r bypass to no longer empty the eligibility map and skip the bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('R6-2 control: the same shape with only 50 \\r-embedded fake headings (partial inflation, not enough to empty the map) is unchanged — still rejects', () => {
    const text = buildR6Doc(50);
    assert.equal(text.length, 124_427, 'payload size must match the measured R6-2 shape exactly');
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the R6-2 partial-inflation control to keep rejecting');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });
});

// ── ROUND 3 regressions: the reviewer's two exact payloads reject, and the
// legit set (54 fixtures, 20 calibration samples, P0 sample, the round-2
// skewed feature, a real-shaped script with genuine parenthetical-only bit
// parts, and a normal-length double-spaced imported-PDF-shaped script) still
// accepts. Timed with `fountainShapeRejectionReason` directly (not
// `runScriptDoctor` — the whole point is that a rejected payload never pays
// for the analysis at all; the review's own `runScriptDoctor` numbers, cited
// in each test's comment, are what these reject-fast timings replace).
describe('ROUND 3 regressions: bypass A/B payloads reject, the legit set still accepts', () => {
  it('bypass A: 200 uniform eligible names x 2,000 occurrences + one parenthetical-only walk-on (measured pre-fix: HTTP 200 in 42,749ms, runScriptDoctor 43,600ms) now rejects fast', () => {
    const DLG = 'this is ordinary lowercase dialogue here.';
    let t = 'INT. ROOM - DAY\n\n';
    for (let occ = 0; occ < 2000; occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
    t += 'INT. HALL - DAY\n\nWALKON\n(beat)\n\n';
    const start = Date.now();
    const reason = fountainShapeRejectionReason(t);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the parenthetical-only walk-on to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('bypass B: double-spaced hard-wrapped dialogue, D=200 occ/char=4 wrap=3 (measured pre-fix: HTTP 200 in 33,193ms, runScriptDoctor 33,869ms) now rejects fast', () => {
    function dsWrapped(distinct: number, occPerChar: number, wrapLines: number): string {
      let t = '', scene = 0, occ = 0;
      const total = distinct * occPerChar;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % distinct}\n\n`;
          for (let w = 0; w < wrapLines; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    }
    const t = dsWrapped(200, 4, 3);
    const start = Date.now();
    const reason = fountainShapeRejectionReason(t);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the double-spaced wrapped-dialogue shape to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('the legit set still accepts: 54 tracked .fountain fixtures, 20 calibration samples, the P0 sample, and the round-2 skewed feature', async () => {
    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');
    for (const file of trackedFountainFiles()) {
      const rel = path.relative(REPO_ROOT, file);
      const reason = fountainShapeRejectionReason(readFileSync(file, 'utf8'));
      assert.equal(reason, null, `${rel} was rejected: ${reason}`);
    }
    for (const sample of REFERENCE_CORPUS) {
      assert.equal(fountainShapeRejectionReason(sample.fountain), null, `calibration sample "${sample.label}" was rejected`);
    }
    assert.equal(fountainShapeRejectionReason(p0SampleFountain), null, 'P0 sample was rejected');
  });

  it('a real-shaped script with genuine parenthetical-only bit parts stays accepted — the fix must not merely reject bypass A\'s exact shape while still under-serving an ordinary script that happens to have walk-ons', () => {
    const DLG = 'this is ordinary lowercase dialogue here.';
    let t = 'INT. ROOM - DAY\n\n';
    // A small cast of real, talkative speaking characters...
    for (let occ = 0; occ < 300; occ++) t += `LEAD${occ % 5}\n${DLG}\n\n`;
    // ...plus several genuine one-scene walk-ons whose only line is a
    // parenthetical stage direction (a bartender's nod, a cop's shrug) —
    // an entirely ordinary shape in a real screenplay.
    const walkOns = ['BARTENDER', 'COP', 'WAITER', 'NURSE', 'CLERK'];
    for (const w of walkOns) t += `INT. LOCATION - DAY\n\n${w}\n(a small gesture)\n\n`;
    const reason = fountainShapeRejectionReason(t);
    assert.equal(reason, null, `expected a real-shaped script with parenthetical-only bit parts to be accepted, got: ${reason}`);
  });

  it('a normal-length double-spaced imported-PDF-shaped script (a real two-hander, not an attack scale) stays accepted', () => {
    const DLG_LINES = ['Where were you last night?', 'I already told the others, I was at the docks the whole time.', 'That is not what I heard.'];
    let t = 'INT. WAREHOUSE - NIGHT\n\n';
    for (let i = 0; i < 40; i++) {
      const speaker = i % 2 === 0 ? 'DETECTIVE' : 'SUSPECT';
      t += `${speaker}\n\n${DLG_LINES[i % DLG_LINES.length]}\n\n`;
    }
    const reason = fountainShapeRejectionReason(t);
    assert.equal(reason, null, `expected an ordinary double-spaced two-hander to be accepted, got: ${reason}`);
  });
});

// ── ROUND 4 regressions (2026-09-05 review round 4, both BLOCKER, of the
// round-3 fix `e074328f`): two more ways the guard's model of the real
// analyzer disagreed with it — see validation.ts's own comments on
// walkGuardCueOccurrences's line-ending normalization and the
// ANALYZER_SCENE_CEILING import for the full mechanism. Timed with
// fountainShapeRejectionReason directly, the same way the ROUND 3
// regressions above are — the point is that a rejected payload never pays
// for analysis at all.
describe('ROUND 4 regressions: CR-only line endings and the 400-scene eligibility ceiling both reject fast', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';

  it('CR-only line endings: a double-spaced 200x2,000 payload converted to CR-only (\\r, no \\n at all) (measured pre-fix: guardCueOccurrences=0, HTTP 200 in 43,148ms) now rejects fast', () => {
    // Deliberately no leading scene heading before the loop — this pins
    // r3cr.mjs's own `ds()` generator byte-for-byte (it has none either),
    // which is what the payload size below is measured against.
    let lf = '';
    let occ = 0, scene = 0;
    while (occ < 2000) {
      lf += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 40 && occ < 2000; i++, occ++) lf += `CHAR${occ % 200}\n\n${DLG}\n\n`;
    }
    const crOnly = lf.replace(/\n/g, '\r');
    assert.equal(crOnly.length, 105_690, 'payload size must match the measured r3cr.mjs shape exactly');
    assert.equal(guardCueOccurrences(crOnly), 2000, 'the guard must see all 2,000 cue occurrences under CR-only line endings, not treat the whole document as one line');

    const start = Date.now();
    const reason = fountainShapeRejectionReason(crOnly);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the CR-only double-spaced payload to be rejected — it was silently accepted before this fix');
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  it('CRLF line endings: the same payload with CRLF endings still rejects (sanity — CRLF was never the broken shape, but must not regress alongside the CR-only fix)', () => {
    let lf = '';
    let occ = 0, scene = 0;
    while (occ < 2000) {
      lf += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 40 && occ < 2000; i++, occ++) lf += `CHAR${occ % 200}\n\n${DLG}\n\n`;
    }
    const crlf = lf.replace(/\n/g, '\r\n');
    assert.equal(guardCueOccurrences(crlf), 2000);
    const reason = fountainShapeRejectionReason(crlf);
    assert.ok(reason, 'expected the CRLF double-spaced payload to be rejected');
  });

  it('a walk-on past the ANALYZER_SCENE_CEILING-th scene (R4-2: 200 uniform eligible names x 2,050 occurrences at 5/scene, plus a 1-word walk-on past scene 400) now rejects (measured pre-fix: ACCEPT, HTTP 200 in 43,485ms)', () => {
    function uniform(distinct: number, occurrences: number, perScene: number, tail: string): string {
      let t = '', occ = 0, scene = 0;
      while (occ < occurrences) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < perScene && occ < occurrences; i++, occ++) t += `CHAR${occ % distinct}\n${DLG}\n\n`;
      }
      return t + tail;
    }
    const text = uniform(200, 2050, 5, 'INT. HALL - DAY\n\nWALKON\nhi\n\n');
    assert.equal(text.length, 126_678, 'payload size must match the measured R4-2 shape exactly');

    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the past-ceiling walk-on to no longer defeat the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });

  // RE-ANCHORED 2026-09-07 (branch scoring/feature-length-defects). The
  // original rationale — "it genuinely IS a one-word walk-on to both the
  // guard and the real analyzer", i.e. the analyzer abstains too, so the
  // document is free — stopped being true when voice-delta.ts moved to
  // per-character abstention. MEASURED on this exact payload after that
  // change: 200 of 201 base names clear the 30-word floor, pooled 11,970
  // words, weight 200 x 11,970 = 2,394,000 against the 300,000 bound (8.0x
  // over), and analyzeVoices ALONE takes 42,062 ms to compute the resulting
  // 19,900 pairs. So the verdict flips to REJECT, and this test now pins the
  // number that justifies it rather than the acceptance that no longer does.
  it('R4-2b: the SAME walk-on moved to scene 1 now REJECTS too — weight 2,394,000 vs the 300,000 bound, 19,900 pairs, 42,062ms in analyzeVoices alone', () => {
    function uniform(distinct: number, occurrences: number, perScene: number): string {
      let t = '', occ = 0, scene = 0;
      while (occ < occurrences) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < perScene && occ < occurrences; i++, occ++) t += `CHAR${occ % distinct}\n${DLG}\n\n`;
      }
      return t;
    }
    const text = 'INT. HALL - DAY\n\nWALKON\nhi\n\n' + uniform(200, 2050, 5);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the scene-1 walk-on payload to reject: its 200 talkative names are now all voice-eligible');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);

    // FAIL-FIRST for the OTHER direction: a payload whose cast really is too
    // small to be expensive must still be accepted, or this bound has simply
    // become "reject everything".
    const small = 'INT. HALL - DAY\n\nWALKON\nhi\n\n' + uniform(4, 40, 5);
    assert.equal(fountainShapeRejectionReason(small), null, 'a genuinely small cast must still be accepted');
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

// ── ROUND 4 oracle (2026-09-05 review round 4, BLOCKER, second finding of
// that round): CR-only and CRLF line endings. walkGuardCueOccurrences split
// on '\n' alone, BEFORE normalizeScreenplay's own \r\n? -> \n normalization
// ever ran — so a CR-only document was ONE line to the entire guard walk
// (every bound in this file, including the ROUND 8 cue-count oracle above)
// while the real pipeline reflowed and parsed it in full. Measured: a
// 105,690-char double-spaced CR-only payload was guard-ACCEPTED with
// guardCueOccurrences reading 0 against 2,000 real pipeline character
// blocks; HTTP 200 in 43,148ms. Fixed by normalizing \r\n? -> \n once, at
// the top of the walk (validation.ts), before it is ever split on '\n' —
// this re-runs the SAME ROUND 8 grammar product under CR-only and CRLF line
// endings so a future regression on either line-ending style fails here,
// not only on LF.
describe('ROUND 4 oracle: CR-only and CRLF line endings — guardCueOccurrences(text) >= pipeline character-block count', () => {
  const DISTINCT = 4;
  const OCCURRENCES = 12;
  const EOL_VARIANTS: Record<string, (s: string) => string> = {
    'CR-only': (s) => s.replace(/\n/g, '\r'),
    'CRLF': (s) => s.replace(/\n/g, '\r\n'),
  };

  for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
    for (const [eolName, toEol] of Object.entries(EOL_VARIANTS)) {
      for (const gap of [0, 1, 3, 5]) {
        it(`"${family}", ${eolName}, gap=${gap}: guardCueOccurrences >= pipeline character-block count`, () => {
          const text = toEol(buildGapDoc(cueOf, DISTINCT, OCCURRENCES, gap));
          const guardCount = guardCueOccurrences(text);
          const pipelineCount = pipelineCharacterBlockCount(text);
          assert.ok(
            guardCount >= pipelineCount,
            `ORACLE VIOLATION "${family}" ${eolName} gap=${gap}: guard counted ${guardCount} but the pipeline produced ${pipelineCount} character blocks`,
          );
        });
      }
    }
  }

  it('caps-heavy action (no real dialogue anywhere) under CR-only line endings: guard and pipeline both still count zero', () => {
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
    const crOnly = text.replace(/\n/g, '\r');
    const guardCount = guardCueOccurrences(crOnly);
    const pipelineCount = pipelineCharacterBlockCount(crOnly);
    assert.equal(pipelineCount, 0, 'sanity: this fixture must have zero real character blocks under CR-only endings too');
    assert.equal(guardCount, 0, 'the guard must not count any of these caps-heavy action lines as cues under CR-only endings');
  });

  // Belt-and-suspenders: the exact r3cr.mjs attack-scale shape (200 distinct
  // uniform names, 2,000 double-spaced occurrences), at both line endings.
  it('oracle holds at attack scale for CR-only line endings (distinct=200, occurrences=2,000, gap=1 — pins r3cr.mjs\'s exact shape)', () => {
    const text = buildGapDoc(ORACLE_CUE_FAMILIES.ASCII!, 200, 2000, 1).replace(/\n/g, '\r');
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 2000);
    assert.ok(guardCount >= pipelineCount, `guard=${guardCount} pipeline=${pipelineCount}`);
  });

  it('oracle holds at attack scale for CRLF line endings (distinct=600, occurrences=12,000, gap=3)', () => {
    const text = buildGapDoc(ORACLE_CUE_FAMILIES.ASCII!, 600, 12_000, 3).replace(/\n/g, '\r\n');
    const guardCount = guardCueOccurrences(text);
    const pipelineCount = pipelineCharacterBlockCount(text);
    assert.equal(pipelineCount, 12_000);
    assert.ok(guardCount >= pipelineCount, `guard=${guardCount} pipeline=${pipelineCount}`);
  });
});

// ── ROUND 7 (2026-09-06 review round 7, BLOCKER + STRUCTURAL): a
// parenthetical-only cue demotes the NEXT cue to `action` in parseFountain
// (src/lib/fountain.ts:139-140 — a cue is typed `character` ONLY when
// `!prevBlock || prevBlock.type === 'empty'`; screenplay-normalizer.ts's
// reflow emits a parenthetical with no trailing blank line, so the cue right
// after one has `prevBlock.type === 'parenthetical'` and falls through to
// `action`, along with its own dialogue). The hand-modelled legacy walk had
// no model of that rule and credited a ghost character the analyzer never
// pools — one ghost under 30 words was enough to switch `allEligible` off
// and skip the whole bound (125,627 chars, legacy-ACCEPT, guard-eligible 201
// vs. analyzer 200, `runScriptDoctor` 50,666ms; a 37-char-different control
// rejects in 13ms). STRUCTURAL fix: the voice-eligible-weight bound now
// reads the REAL parsed blocks directly (realVoiceEligibleWeightRejectionReason,
// validation.ts) instead of hand-modelling them, so this ghost — and every
// prior round's divergence — cannot recur by construction: a demoted cue is
// simply `action` in the blocks this function reads too.
describe('ROUND 7 corpus: parenthetical-only-cue-then-cue demotion, one variant per cue family', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';

  // Mirrors r6attack.mjs's own `base()`/POISON shape exactly: 200 uniform
  // eligible names over 400 double-spaced scenes (5 cues/scene), plus a
  // parenthetical-only cue immediately followed by another cue — using the
  // FAMILY's own naming convention for both the poisoning cue and the
  // walk-on it demotes, so this is round 3's parenthetical-only-walk-on
  // shape AND round 7's demotion shape combined, per family.
  function buildParenDemotionDoc(cueOf: (i: number) => string): string {
    let t = '', occ = 0;
    for (let s = 0; s < 400; s++) {
      t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 5; i++, occ++) t += `${cueOf(occ % 200)}\n\n${DLG}\n\n`;
    }
    t += `PARENONLY\n\n(beat)\n\n${cueOf(9999)}\n\nhi there\n\n`;
    return t;
  }

  // Independently computed per family, rather than assuming a uniform
  // REJECT: some cue-naming conventions (the 41+ char cue and caret
  // families) do not survive normalizeScreenplay's OWN isCharacterCue gate
  // during double-spaced reflow at all (isCharacterCue itself caps at 4
  // words / 30 chars — a 41+ char name or a bare caret suffix never becomes
  // a real reflowed cue, independent of this test's poison), so their real
  // pipeline never assembles anything close to a 200-fully-eligible cast.
  // The property that must hold for EVERY family is not "always rejects" —
  // it is "the production decision matches what an independent, ceiling-
  // aware read of the REAL pipeline says", which is exactly what would be
  // violated by a ghost the hand model invents but the pipeline does not.
  it('the real production function\'s decision matches an independent real-pipeline computation, per family (the ghost cannot survive a real parse)', () => {
    for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      const text = buildParenDemotionDoc(cueOf);
      const pipelineCounts = pipelineWordsByBaseName(text);
      // UPDATED 2026-09-07: the oracle models the ELIGIBLE SUBSET, because
      // that is what the guard reads now — see voiceEligibleWeightReason.
      // The retired all-or-nothing oracle would agree with the guard on
      // these particular families by coincidence and disagree the moment a
      // family's poison name carries a nonzero-but-sub-30 word count, which
      // is exactly the shape this corpus is built from.
      const eligible = [...pipelineCounts.values()].filter((w) => w >= VOICE_ELIGIBLE_MIN_WORDS);
      const expectedWeight = eligible.length >= 2 ? eligible.length * eligible.reduce((a, b) => a + b, 0) : 0;
      const expectReject = eligible.length >= 2 && expectedWeight > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT;
      const reason = fountainShapeRejectionReason(text);
      assert.equal(!!reason, expectReject, `"${family}": expected reject=${expectReject} (independently computed from the real ceiling-aware pipeline: ${eligible.length} eligible names), got reject=${!!reason}${reason ? ` (${reason})` : ''}`);
      if (expectReject) assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/, `"${family}"`);
    }
  });

  // RE-ANCHORED 2026-09-07 (branch scoring/feature-length-defects), with the
  // corpus's bite preserved rather than dropped.
  //
  // This test used to prove non-vacuity by showing the RETIRED legacy
  // function BYPASSED on at least five families. It no longer can, and the
  // reason is the point: the bypass it demonstrated was always "make one
  // name ineligible and the all-or-nothing gate never evaluates a weight at
  // all". With eligibility read per character (voiceEligibleWeightReason,
  // mirroring voice-delta.ts's own per-character abstention), that entire
  // CLASS of bypass is structurally closed — poisoning one name now removes
  // one name from the eligible set instead of removing the whole bound.
  //
  // So the corpus's bite is re-stated as the property that is still true and
  // still falsifiable: the legacy WALK still miscounts the cast on these
  // documents (the demotion ghost is a walk defect, not a bound defect), and
  // the bound is nonetheless no longer defeatable by it. If the walk ever
  // stopped miscounting, the first assertion fails and this corpus really
  // would be vacuous; if the bound ever became defeatable again, the second
  // does.
  it('fail-first: the demotion ghost still miscounts the cast on at least five families, and NO family can defeat the bound with it any more', () => {
    const miscounted: string[] = [];
    const bypassed: string[] = [];
    let familiesWithARealCast = 0;
    for (const [family, cueOf] of Object.entries(ORACLE_CUE_FAMILIES)) {
      const text = buildParenDemotionDoc(cueOf);
      const guardNames = guardEligibleVoiceWordCounts(text).size;
      const pipelineNames = pipelineWordsByBaseName(text).size;
      if (guardNames !== pipelineNames) miscounted.push(`${family}(${guardNames}/${pipelineNames})`);

      // Only families whose cue convention survives normalizeScreenplay's own
      // isCharacterCue gate ever assemble an over-bound cast — the 41+ char
      // and caret families do not, and a walk that accepts THEM is correct,
      // not bypassed. So the expectation is the same real-pipeline oracle
      // subtest 1 uses, never a blanket "everything rejects".
      const eligible = [...pipelineWordsByBaseName(text).values()].filter((w) => w >= VOICE_ELIGIBLE_MIN_WORDS);
      const oracleRejects = eligible.length >= 2
        && eligible.length * eligible.reduce((a, b) => a + b, 0) > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT;
      if (!oracleRejects) continue;
      familiesWithARealCast++;
      if (!legacyVoiceEligibleWeightRejectionReason(text)) bypassed.push(family);
    }
    assert.ok(
      miscounted.length >= 5,
      `expected the demotion ghost to still miscount broadly, or this corpus no longer exercises the walk defect it targets; got ${miscounted.length}/${Object.keys(ORACLE_CUE_FAMILIES).length}: ${miscounted.join(', ')}`,
    );
    assert.ok(
      familiesWithARealCast >= 5,
      `expected at least five families to assemble a real over-bound cast, or the bypass claim below is vacuous; got ${familiesWithARealCast}`,
    );
    assert.deepEqual(
      bypassed,
      [],
      `per-character eligibility must close the whole one-poisoned-name bypass class; these families still defeat the bound: ${bypassed.join(', ')}`,
    );
  });
});

// ── ROUND 7 regressions: R7-1 (the exact reviewer payload) rejects fast,
// and its control (R7-0, no poison) keeps rejecting on its own merits (200
// fully-eligible characters alone already crosses the bound).
describe('ROUND 7 regressions: the parenthetical-demotion ghost rejects fast, the control is unchanged', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';
  function base(poison: string): string {
    let t = '', occ = 0;
    for (let s = 0; s < 400; s++) {
      t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n\n${DLG}\n\n`;
    }
    return t + poison;
  }
  const POISON = 'PARENONLY\n\n(beat)\n\nWALKON\n\nhi there\n\n';

  it('R7-0 control (double-spaced, no poison) rejects — 200 fully eligible characters cross the bound on their own', () => {
    const text = base('');
    assert.equal(text.length, 125_590, 'payload size must match the measured R7-0 shape exactly');
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason);
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  it('R7-1: a parenthetical-only cue demoting the next cue (measured pre-fix: legacy-ACCEPT, guard-eligible 201 vs analyzer 200, runScriptDoctor 50,666ms; HTTP 200 in 49,799ms) now rejects fast', () => {
    const text = base(POISON);
    assert.equal(text.length, 125_627, 'payload size must match the measured R7-1 shape exactly');
    // RE-ANCHORED 2026-09-07: this used to pin the BEFORE state as
    // "the legacy function bypasses on this exact payload". Under
    // per-character eligibility it no longer does, and that is the fix —
    // the poison removes one name from the eligible set instead of removing
    // the bound. What is pinned now is the property that survives: both the
    // retired walk and the real one reject this payload, so the demotion
    // ghost cannot be used to get under the bound by either route.
    assert.ok(legacyVoiceEligibleWeightRejectionReason(text), 'the one-poisoned-name bypass must be closed on the retired walk too, not only on the real one');
    const start = Date.now();
    const reason = fountainShapeRejectionReason(text);
    const ms = Date.now() - start;
    assert.ok(reason, 'expected the parenthetical-demotion ghost to no longer bypass the voice-eligible-weight bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
    assert.ok(ms < 500, `expected a fast rejection (<500ms), took ${ms}ms`);
  });
});

// ── ROUND 7 follow-up (2026-09-06 review, non-blocking item 1): the
// `w > 0` filter in realVoiceEligibleWeightRejectionReason is a DELIBERATE
// divergence from analyzeVoices, not a mirror — voice-delta.ts keeps a
// zero-token (pure-punctuation) character as a `dialogueByCharacter` key
// and its own `< MIN_WORDS` check then makes it ABSTAIN, while the guard
// filters such a character out and can still evaluate (and reject) the
// same document. That is the SAFE direction: mirroring analyzeVoices
// faithfully here was measured to cost the bound entirely (a 12,407ms
// accepted document). Pinned here so a later round does not "restore
// fidelity" and reopen that exact regression.
describe('ROUND 7 follow-up: the guard\'s w > 0 filter deliberately diverges from analyzeVoices — pinned so it is never "fixed" toward fidelity', () => {
  const DLG = 'this is ordinary lowercase dialogue here.';
  function base(poison: string): string {
    let t = '', occ = 0;
    for (let s = 0; s < 400; s++) {
      t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
      for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n\n${DLG}\n\n`;
    }
    return t + poison;
  }

  it('a zero-token (pure-punctuation) character appended to the R7-0 control: the REAL analyzer would abstain, but the guard still rejects — both facts, verified directly', () => {
    const text = base('SILENT\n\n?!\n\n');
    assert.equal(text.length, 125_602, 'payload size must match the measured shape exactly');

    // Fact 1: a FAITHFUL (unfiltered) reading of the real parsed blocks
    // shows SILENT as a genuine 0-word dialogueByCharacter entry — exactly
    // the state that makes the real analyzeVoices abstain (it iterates
    // every character and abstains the moment ANY one is under
    // VOICE_ELIGIBLE_MIN_WORDS, including a literal 0). Built independently
    // here (not via buildRealVoiceWordCounts, which already applies the
    // guard's own filter) so this is a check against the real pipeline's
    // OWN blocks, not a restatement of the guard's logic.
    const blocks = parseFountain(normalizeScreenplay(text));
    const unfiltered = new Map<string, number>();
    let currentSpeaker: string | null = null;
    for (const b of blocks) {
      const t = b.text.trim();
      if (!t) continue;
      if (b.type === 'scene_heading') { currentSpeaker = null; continue; }
      if (b.type === 'character' || b.type === 'dual_dialogue') {
        currentSpeaker = t.trim().replace(/\^\s*$/, '').replace(/\(\s*(V\.O\.|O\.S\.|CONT'?D)\s*\)/gi, '').trim();
        if (!unfiltered.has(currentSpeaker)) unfiltered.set(currentSpeaker, 0);
        continue;
      }
      if (b.type === 'dialogue' && currentSpeaker) {
        const words = (t.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => /[a-z]/.test(w)).length;
        unfiltered.set(currentSpeaker, (unfiltered.get(currentSpeaker) ?? 0) + words);
      }
    }
    assert.equal(unfiltered.get('SILENT'), 0, 'sanity: SILENT must be a genuine 0-word dialogueByCharacter entry in the real (unfiltered) pipeline reading');
    const wouldAbstain = [...unfiltered.values()].some((w) => w < 30);
    assert.equal(wouldAbstain, true, 'sanity: a faithful (unfiltered) reading must show the real analyzer would abstain on this document');

    // Fact 2: the guard, with its deliberate w > 0 filter, still rejects.
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the guard to still reject despite the zero-token character — this is the documented, deliberate safe-direction divergence');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });
});

// ── ROUND 7, item 3: fail-closed when the real parse and the cue-shape
// signal radically disagree (2026-09-06 review round 7). CUE_LIKE_LINE_RE
// (the guard's own cue-shape test) is DELIBERATELY wider than CHARACTER_CUE_RE
// (the real parser's cue test) in punctuation — it admits `,` `(` `)` `&`
// `/`, which CHARACTER_CUE_RE's continuation class does not (see
// CUE_LIKE_LINE_RE's own comment). A document built entirely from cue-shaped
// lines using ONLY that wider punctuation (e.g. "NAME, 0") is cue-like to
// the guard's own counting (so cueLineOccurrences climbs normally) but NEVER
// matches CHARACTER_CUE_RE, so parseFountain never types ANY of them
// `character` — a genuine, naturally-occurring zero-character-block parse
// for a document dense with cue-shaped lines, exactly the shape
// realVoiceEligibleWeightRejectionReason's fail-closed branch exists for.
describe('ROUND 7, item 3: fail-closed on a real zero-character-block parse with a high cue-shaped-line count', () => {
  it('a document built from CUE_LIKE_LINE_RE-but-not-CHARACTER_CUE_RE cues (comma-punctuated names) parses to ZERO character blocks and is rejected fail-closed', () => {
    const DISTINCT = 50;
    let text = '';
    for (let i = 0; i < 7000; i++) text += `NAME, ${i % DISTINCT}\nHello there.\n\n`;

    // Sanity: this really is the shape the fail-closed branch targets — cue-
    // like to the guard, but not to the real parser at all.
    assert.equal(isCueLikeLine('NAME, 0'), true, 'sanity: "NAME, 0" must be cue-shaped to the guard\'s own predicate');
    const blocks = parseFountain(normalizeScreenplay(text));
    const hasAnyCharacterBlock = blocks.some((b) => b.type === 'character' || b.type === 'dual_dialogue');
    assert.equal(hasAnyCharacterBlock, false, 'sanity: the real parser must produce ZERO character/dual_dialogue blocks for this shape, or this is not exercising the fail-closed branch');
    const cueCount = guardCueOccurrences(text);
    assert.ok(cueCount > 6_000, `sanity: expected the guard\'s own cue count to exceed the fail-closed threshold, got ${cueCount}`);

    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected the fail-closed branch to reject a document this dense with cue-shaped lines yet parsing to zero real characters');
    assert.match(reason!, /FAIL_CLOSED_CUE_OCCURRENCE_THRESHOLD/);
  });

  it('an ordinary legitimate document with the SAME comma-punctuated cue shape, but few of them, is NOT rejected (the fail-closed branch does not fire on ordinary low-volume cue shapes)', () => {
    let text = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 5; i++) text += `NAME, ${i}\nHello there.\n\n`;
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  it('the realistic-feature fixture (buildPlausibleFeature-shaped, real characters throughout) is NOT rejected by the fail-closed branch', () => {
    // A real document with real character blocks throughout must never trip
    // the fail-closed branch, regardless of its cue-shaped-line volume —
    // confirms the branch is gated on hasAnyCharacterBlock, not merely on a
    // high occurrence count.
    let text = '';
    for (let s = 0; s < 200; s++) {
      text += `INT. LOCATION ${s} - DAY\n\nSomething happens.\n\n`;
      for (let i = 0; i < 40; i++) text += `CHAR${i % 50}\nOrdinary dialogue line here today.\n\n`;
    }
    const blocks = parseFountain(normalizeScreenplay(text));
    assert.ok(blocks.some((b) => b.type === 'character'), 'sanity: this fixture must have real character blocks');
    // This fixture may or may not cross the voice-eligible-weight bound on
    // its own merits — the point here is only that it is never rejected FOR
    // THE FAIL-CLOSED REASON specifically.
    const reason = fountainShapeRejectionReason(text);
    if (reason) assert.doesNotMatch(reason, /FAIL_CLOSED_CUE_OCCURRENCE_THRESHOLD/);
  });
});

// ── ROUND 7 equivalence proof (2026-09-06 review round 7, STRUCTURAL):
// retiring legacyWalkGuardCueOccurrences / legacyVoiceEligibleWeightRejectionReason
// from production is safe ONLY if every fixture and every reviewer payload
// this file has ever been checked against gives the SAME accept/reject
// decision under the real-map implementation. This test runs the WHOLE set
// through both `legacyFountainShapeRejectionReason` (below — the retired
// combined decision: identical, unchanged cue-count/boneyard bounds, then
// the legacy voice-eligible-weight function) and the real
// `fountainShapeRejectionReason`, asserting the accept/reject VERDICT
// agrees for every one (message text may differ; the decision may not).
describe('ROUND 7 equivalence: retiring the legacy voice-eligible-weight walk changes no fixture\'s or payload\'s accept/reject decision', () => {
  // The cue-count/boneyard bounds are UNCHANGED code (see validation.ts's
  // own history — only the voice bound's DATA SOURCE moved) — so whenever
  // fountainShapeRejectionReason(text) rejects for a reason that does NOT
  // name the voice bound or the fail-closed bound, that rejection came from
  // one of those unchanged bounds, and the legacy pipeline would have
  // rejected identically (same code, unmoved) — trivially equivalent. The
  // legacy combined decision is therefore: defer to the CURRENT function's
  // own cue-count verdict when it is one, and to the LEGACY voice function
  // only when the cue-count bounds all pass — exactly reconstructing what
  // the pre-round-7 combined function computed, from parts that still exist.
  function legacyFountainShapeRejectionReason(text: string): string | null {
    const newReason = fountainShapeRejectionReason(text);
    if (newReason && !/MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT|FAIL_CLOSED_CUE_OCCURRENCE_THRESHOLD/.test(newReason)) {
      return newReason;
    }
    return legacyVoiceEligibleWeightRejectionReason(text);
  }

  function assertSameDecision(label: string, text: string): void {
    const legacyAccepts = legacyFountainShapeRejectionReason(text) === null;
    const newAccepts = fountainShapeRejectionReason(text) === null;
    assert.equal(newAccepts, legacyAccepts, `EQUIVALENCE VIOLATION "${label}": legacy accepts=${legacyAccepts}, real-parse accepts=${newAccepts} — retiring the legacy walk changed this fixture's decision`);
  }

  it('every tracked .fountain fixture, every calibration sample, and the P0 sample give the same decision', async () => {
    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { fountain: p0SampleFountain } = await import('../../src/lib/sample-script.ts');
    for (const file of trackedFountainFiles()) {
      assertSameDecision(path.relative(REPO_ROOT, file), readFileSync(file, 'utf8'));
    }
    for (const sample of REFERENCE_CORPUS) {
      assertSameDecision(`calibration/${sample.label}`, sample.fountain);
    }
    assertSameDecision('P0 sample', p0SampleFountain);
  });

  it('every round 1-7 reviewer payload and control gives the same decision', () => {
    const DLG = 'this is ordinary lowercase dialogue here.';
    function uniformCast(distinct: number, occurrences: number): string {
      let t = 'INT. ROOM - DAY\n\n', occ = 0, scene = 0;
      while (occ < occurrences) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room, quietly and without much fuss.\n\n`;
        for (let i = 0; i < 40 && occ < occurrences; i++, occ++) t += `CHAR${occ % distinct}\n${DLG}\n\n`;
      }
      return t;
    }
    function dsWrapped(distinct: number, occPerChar: number, wrapLines: number): string {
      let t = '', scene = 0, occ = 0;
      const total = distinct * occPerChar;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % distinct}\n\n`;
          for (let w = 0; w < wrapLines; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    }
    function buildCeilingCrossingDoc(headingOf: (s: number) => string, scenes: number, tailHeading: string): string {
      let t = '', occ = 0;
      for (let s = 0; s < scenes; s++) {
        t += `${headingOf(s)}\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
      }
      return t + `${tailHeading}\n\nWALKON\nhi\n\n`;
    }
    function buildR6Doc(inflate: number): string {
      let t = '', occ = 0;
      for (let s = 0; s < 400; s++) {
        t += `INT. LOCATION ${s} - DAY\n\n`;
        t += s === 0 && inflate > 0
          ? `Something happens${'\rINT. GHOST - DAY'.repeat(inflate)}\n\n`
          : 'Something happens in the room.\n\n';
        for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
      }
      return t;
    }
    const payloads: Record<string, string> = {
      'round-2 reviewer payload 1 (50x18,000)': uniformCast(50, 18_000),
      'round-2 reviewer payload 2 (520x6,000)': uniformCast(520, 6_000),
      'round-3 bypass A (parenthetical-only walk-on)': (() => {
        let t = 'INT. ROOM - DAY\n\n';
        for (let occ = 0; occ < 2000; occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
        return t + 'INT. HALL - DAY\n\nWALKON\n(beat)\n\n';
      })(),
      'round-3 bypass B (double-spaced wrapped, D=200 occ/char=4 wrap=3)': dsWrapped(200, 4, 3),
      'round-4 CR-only double-spaced': (() => {
        let t = '', occ = 0, scene = 0;
        while (occ < 2000) {
          t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
          for (let i = 0; i < 40 && occ < 2000; i++, occ++) t += `CHAR${occ % 200}\n\n${DLG}\n\n`;
        }
        return t.replace(/\n/g, '\r');
      })(),
      'round-4 walk-on past the 400-scene ceiling': (() => {
        let t = '', occ = 0;
        for (let s = 0; s < 410; s++) {
          t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
          for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG}\n\n`;
        }
        return t + 'INT. HALL - DAY\n\nWALKON\nhi\n\n';
      })(),
      'round-5 .FORCED headings past ceiling': buildCeilingCrossingDoc((s) => `.SCENE ${s}`, 410, '.SCENE FINAL'),
      'round-5 lowercase int. headings past ceiling': buildCeilingCrossingDoc((s) => `int. location ${s} - day`, 410, 'int. hall - day'),
      'round-5 INTERIOR headings past ceiling': buildCeilingCrossingDoc((s) => `INTERIOR LOCATION ${s} - DAY`, 410, 'INTERIOR HALL - DAY'),
      'round-5 control: INT. headings past ceiling': buildCeilingCrossingDoc((s) => `INT. LOCATION ${s} - DAY`, 410, 'INT. HALL - DAY'),
      'round-5 control: walk-on at scene 400 (boundary)': buildCeilingCrossingDoc((s) => `INT. LOCATION ${s} - DAY`, 399, 'INT. HALL - DAY'),
      'round-6 control (no stray \\r)': buildR6Doc(0),
      'round-6 stray-\\r bypass (500 embedded)': buildR6Doc(500),
      'round-6 partial inflation (50 embedded)': buildR6Doc(50),
    };
    // Round 7's own payloads (base7 control + the parenthetical-demotion
    // ghost) are DELIBERATELY excluded here: the ghost is the ONE payload
    // this whole equivalence test predicts will DISAGREE (legacy accepts,
    // real-parse rejects) — that disagreement is the fix working, not a
    // regression, and is already pinned by its own dedicated "ROUND 7
    // regressions" describe block above rather than asserted equal here.
    for (const [label, text] of Object.entries(payloads)) {
      assertSameDecision(label, text);
    }
  });

  it('the round-2 realistic 150-name skewed feature and the round-3/plausible-feature fixtures still give the same decision', () => {
    // Reuses this file's own realisticSkewedFeature-shaped generator (round
    // 2's own fixture) inline, since that function is scoped to its own
    // describe block above.
    const words = ['the', 'plan', 'was', 'never', 'going', 'to', 'work', 'like', 'this', 'again', 'tonight', 'trust', 'me', 'now', 'wait', 'listen'];
    const MAJOR_COUNT = 12, MINOR_COUNT = 138;
    const majors = Array.from({ length: MAJOR_COUNT }, (_, i) => `PROTAGONIST${i}`);
    const minors = Array.from({ length: MINOR_COUNT }, (_, i) => `EXTRA${i}`);
    let seed = 0;
    const line = (n: number): string => {
      const ws = Array.from({ length: n }, () => words[seed++ % words.length]);
      return `${ws[0]![0]!.toUpperCase()}${ws[0]!.slice(1)} ${ws.slice(1).join(' ')}.`;
    };
    const majorBlocks: string[] = [];
    for (const name of majors) for (let k = 0; k < 200; k++) majorBlocks.push(name);
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
    assertSameDecision('round-2 realistic 150-name skewed feature', text);
  });
});

// ── FINDING 10 (2026-09-12 adversarial review, engine-logic.md): the
// voice-eligible-weight bound bound at a cast of 300,000 / 15,000 ≈ 20 on
// an ORDINARY ~15,000-dialogue-word feature — an entirely ordinary
// 20-character ensemble (heist, courtroom drama, war film, TV pilot) got no
// score and no report.
//
// ROUND 1 (2026-09-12) re-derived the bound to 1,500,000 from fixture
// WEIGHTS, and the round-1 review (docs/audits/2026-09-12-adversarial/
// rulebook-review.md, BLOCKER item 1) found that under-derived: because
// every eligible character must also clear VOICE_ELIGIBLE_MIN_WORDS=30, a
// weight ceiling of W admits up to sqrt(W/30) distinct characters at the
// eligibility floor — the "uniform-min" shape below — and at 1,500,000 that
// is 223 speakers, a 50 KB document costing 27.3-27.6s in runScriptDoctor,
// 91% of the 30s analysis budget (Decision #7). Weight alone is not a safe
// cross-shape cost proxy: the round-1 header measured only the cheap
// few-big shape (cast up to 60) and never measured this one.
//
// ROUND 2 re-derives the bound from COST on the worst-admitted (uniform-min)
// shape directly — see MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT's own comment in
// validation.ts for the full sweep, the rate fit, and the half-budget
// (15s) target — landing on 675,000 (the largest N whose measured cost on
// this box stays safely under that target is N=150). This block proves:
// (1) the N=150/N=151 uniform-min boundary directly (150 ACCEPTED with its
// measured cost under the margin, 151 REJECTED); (2) realistic 20/30/40-cast
// features are still ACCEPTED (the brief's explicit targets), and a 60-cast
// fully-eligible ensemble is now correctly REJECTED (a real narrowing from
// round 1, disclosed rather than hidden — unlocking it safely is the
// analyzer-side pair-cap, the scoring lane's item, not this bound); (3) the
// new bound is still STRICTLY BELOW the lightest payload this file's own
// DoS/bypass regressions pin as REJECTED, with a much wider margin than
// round 1 (2.84x, not 1.28x) — computed here from that fixture's own
// generator, not restated as a literal; and (4) every one of this file's
// existing 654 pinned decisions is unchanged (verified by running this
// whole suite after the bound change: 654/654 pass, none flipped).
describe('finding 10: MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT re-derivation — realistic casts accept, DoS fixtures still reject', () => {
  const DLG6 = 'this is ordinary lowercase dialogue here.';

  // buildProbeCastFeature — the realistic shape (Zipf-with-a-floor: every
  // character clears VOICE_ELIGIBLE_MIN_WORDS with margin, which is the worst
  // case for this bound among real scripts, since a real script's minors
  // usually fall under the floor and skip the check entirely) — and
  // buildUniformMin — the worst case the bound admits at any weight — both
  // live in scripts/lib/voice-bound.ts now, so the calibration run and these
  // assertions measure the same bytes. See that file's header.

  for (const cast of [20, 30, 40]) {
    it(`a realistic ${cast}-cast fully-eligible feature (Zipf-distributed speech, 35-word floor, ~15,150 pooled dialogue words) is ACCEPTED`, () => {
      const text = buildProbeCastFeature(cast);
      const reason = fountainShapeRejectionReason(text);
      assert.equal(reason, null, `expected a realistic ${cast}-cast feature to be accepted, got: ${reason}`);
    });
  }

  it('a realistic 15-cast feature is ACCEPTED too (sanity: the pre-existing floor case still works)', () => {
    const text = buildProbeCastFeature(15);
    assert.equal(fountainShapeRejectionReason(text), null);
  });

  // Round-2 disclosure, RE-ANCHORED 2026-09-20 to the bounds this tree ships
  // (weight 1,500,000; cast MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT, derived from
  // the runner table locked at tests/fixtures/voice-bound-derivation.json, run
  // 35542413222, re-locked 2026-09-21 from run 35553883758).
  //
  // WHAT STOOD HERE AND WHY IT COULD NOT BE PATCHED. The previous version of
  // this test pinned a 60-cast fully-eligible ensemble as REJECTED and carried
  // the old boundary's arithmetic in its own title ("weight 909,000 >
  // 675,000"). Under the bounds now shipped that document is ACCEPTED — the
  // PREMISE was stale, not merely the literal — so swapping numbers into it
  // would have produced a test that asserts something untrue about the guard.
  // It is replaced by the boundary itself, asserted from both sides on the
  // realistic few-big shape this bound exists to keep serving, with the
  // rejecting bound named.
  //
  // MEASURED, not restated: over the committed probe-cast generator the
  // largest cast the pair of bounds admits is 97 (eligible weight 1,491,084)
  // and the smallest it refuses is 98 (1,507,632) — and what refuses it is the
  // WEIGHT bound, because on this shape ~15,380 pooled words times the cast
  // crosses 1,500,000 at 98, two casts BELOW the cast bound of 100. So on a
  // realistic ensemble the cast bound never fires first; that is a property of
  // this pair of bounds worth failing on if it changes.
  it('the realistic few-big shape\'s accept/reject boundary is cast 97/98, and the WEIGHT bound is what fires there (the cast bound never fires first on this shape)', () => {
    const verdicts = new Map<number, string | null>();
    for (let cast = 90; cast <= 105; cast++) verdicts.set(cast, fountainShapeRejectionReason(buildProbeCastFeature(cast)));
    const accepted = [...verdicts.entries()].filter(([, r]) => r === null).map(([c]) => c);
    const rejected = [...verdicts.entries()].filter(([, r]) => r !== null).map(([c]) => c);
    assert.ok(accepted.length > 0 && rejected.length > 0, 'the 90-105 sweep must bracket the boundary from both sides');
    const largestAccepted = Math.max(...accepted);
    const smallestRejected = Math.min(...rejected);
    assert.equal(
      smallestRejected,
      largestAccepted + 1,
      `the guard's verdict on this shape must be monotone in cast — accepted ${JSON.stringify(accepted)}, rejected ${JSON.stringify(rejected)}`,
    );
    assert.equal(
      largestAccepted,
      97,
      `the largest realistic few-big cast the bounds admit is ${largestAccepted}, not the 97 this boundary was re-anchored to on 2026-09-20 — `
      + 'a bound moved without this test moving with it',
    );
    assert.match(
      verdicts.get(smallestRejected)!,
      /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/,
      `cast ${smallestRejected} must be refused by the WEIGHT bound: on this shape the weight product crosses first, `
      + `two casts below the cast bound of ${MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT}. If the CAST bound now fires here, it has been lowered into the realistic range`,
    );
    // And the honest statement of what the re-derivation bought, in the same
    // place the old narrowing was disclosed: the 60-cast ensemble the 675,000
    // bound refused is served now.
    assert.equal(
      fountainShapeRejectionReason(buildProbeCastFeature(60)),
      null,
      'a 60-cast fully-eligible ensemble (eligible weight 916,200) was REJECTED under the 675,000 bound and is ACCEPTED under this one — '
      + 'if it is rejected again, the re-derivation has been undone',
    );
  });

  // ── The worst shape the guard admits, and the cast bound derived from it ──
  //
  // 2026-09-12 derived MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT from the uniform-min
  // shape (every speaker at the 30-word floor, maximizing the O(distinct²) pair
  // count for a given weight) and pinned the boundary at N=150/151. 2026-09-13
  // found two things wrong with that, neither of them the value:
  //
  //  1. The cost assertion below is enforced on a GitHub Actions runner, and
  //     the derivation was measured on an unnamed developer box about 1.7x
  //     faster under load. The runner measured the N=150 shape at 19,713 ms and
  //     21,133 ms of CPU against the 15,000 ms half-budget target (runs
  //     34736306670 / 34739080950, both ubuntu-latest).
  //  2. Fixing the cast at d, a weight bound of W admits up to W / d² words per
  //     speaker — 186 at d=60, not 30 — so uniform-min is not the heaviest
  //     document the bound admits at any cast below the top. The heaviest is
  //     scripts/lib/voice-bound.ts's `max-admitted` shape.
  //
  // The fix is NOT a smaller weight bound: the realistic ensembles this bound
  // exists to serve weigh 457,200 (30-cast) and 609,600 (40-cast) here, so any
  // weight bound the runner can carry rejects an ordinary 40-character feature
  // and reopens adversarial finding 10. It is a SECOND bound,
  // MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT, on the quantity that actually drives
  // the cost — the eligible cast count — derived on the runner itself
  // (.github/workflows/calibrate-voice-bound.yml) against the max-admitted
  // shape, and tied to that measurement by
  // tests/core/voice-bound-derivation.test.ts. It removes nothing: the weight
  // bound is untouched and evaluated first, so every payload it rejected is
  // still rejected with the same message.
  const BOUNDARY_CAST = MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT;

  it(`the cast bound (${MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT}) is the binding constraint on the expensive shape — the weight bound alone would admit a cast of ${Math.floor(Math.sqrt(MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / 30))}`, () => {
    const castTheWeightBoundAdmits = Math.floor(Math.sqrt(MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / 30));
    assert.ok(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT < castTheWeightBoundAdmits,
      `the cast bound (${MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT}) must sit BELOW the cast the weight bound admits on its own (${castTheWeightBoundAdmits}) — otherwise it is decorative and the 2026-09-13 runner regression is back`,
    );
  });

  it(`the max-admitted N=${BOUNDARY_CAST} boundary — the worst shape on the ELIGIBLE-SPEAKER dimension these two bounds govern — is ACCEPTED, and its measured runScriptDoctor cost stays inside the budget`, async (t) => {
    const { runScriptDoctor } = await import('../../server/nvm/analyze/doctor.ts');
    const { DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS } = await import('../../server/lib/doctor-budget.ts');
    const text = buildMaxAdmitted(BOUNDARY_CAST, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    const reason = fountainShapeRejectionReason(text);
    assert.equal(reason, null, `expected the max-admitted N=${BOUNDARY_CAST} boundary to be accepted, got: ${reason}`);
    // This is the actual analysis, not just the guard — the whole point of
    // these bounds is that the guard's ACCEPT decisions stay cheap. Round-2
    // review round 2, item 9: a plain wall-clock ceiling is the EXACT form
    // tests/core/doctor-analysis-budget.test.ts already retired for flaking
    // (its own header: 18,512ms / 21,624ms under a parallel `npm test` on an
    // 8.5s-standalone fixture). Use that file's two-part form verbatim, derived
    // from DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS instead of a bare literal: CPU
    // against HALF the budget — the exact quantity the 2x-headroom design
    // target is about — and wall clock against the FULL budget, the literal
    // product guarantee.
    //
    // 2026-09-13: the form is unchanged and deliberately NOT loosened — no
    // larger fraction, no wall-only check, no CI skip, no flaky marker. What
    // changed is the machine the bound is derived on. CPU is not as load-immune
    // as round 2 assumed (`npm test` runs each file in its own process, but
    // those processes share a memory system and, on a 4-vCPU runner, SMT
    // siblings), so the derivation now measures under that same company. Both
    // messages name the machine, and the measurement is emitted as a TAP
    // diagnostic on PASS too, so every CI log carries the number.
    //
    // WHAT THIS DOES NOT CLAIM, corrected 2026-09-13 (review finding 4). An
    // earlier version of this test's title called this shape "the heaviest
    // document BOTH bounds admit". It is not, and the gap is 1.84x: neither
    // bound constrains document size or scene count, and buildMaxAdmitted emits
    // one scene heading per 40 speakers, so this document has TWO. The same
    // eligible body padded with action-only scenes to the analyzer's 400-scene
    // ceiling is ACCEPTED by both bounds and measured 14,334 ms of CPU on the
    // lane's sandbox against this shape's 7,800 ms in the same harness — and
    // analyzeVoices does NOT abstain there, so the "RESIDUAL accepted worst
    // case" note beside MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (an INELIGIBLE
    // walk-on document at ~12-14s on a developer box) does not cover it either.
    //
    // What these two bounds bound is the ELIGIBLE-SPEAKER dimension of the
    // cost, not the cost. Document size is bounded elsewhere
    // (MAX_FOUNTAIN_CHARS, MAX_FOUNTAIN_CUE_WEIGHT, the analyzer's own
    // 400-scene ceiling) and ultimately by DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS's
    // hard stop, which is the guarantee a writer actually gets. This test is
    // the eligible-speaker half, and its title now says so.
    const cpuStart = process.cpuUsage();
    const wallStart = Date.now();
    await runScriptDoctor(text);
    const wallMs = Date.now() - wallStart;
    const cpu = process.cpuUsage(cpuStart);
    const cpuMs = (cpu.user + cpu.system) / 1000;
    const machine = formatMachineFingerprint(machineFingerprint());
    t.diagnostic(
      `voice-bound worst-case cost: max-admitted N=${BOUNDARY_CAST} `
      + `(${maxAdmittedWordsPerSpeaker(BOUNDARY_CAST, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)} words/speaker) `
      + `cpu ${Math.round(cpuMs)}ms (${((cpuMs / (DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2)) * 100).toFixed(0)}% of the `
      + `${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2}ms half-budget target), wall ${wallMs}ms — ${machine}`,
    );
    assert.ok(
      cpuMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2,
      `expected the max-admitted N=${BOUNDARY_CAST} worst-case accepted shape to cost under half the ${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS}ms analysis budget of CPU, used ${Math.round(cpuMs)}ms — the bound's 2x-headroom derivation no longer holds on this machine: ${machine}. BEFORE re-deriving, read MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT's "CAN THE ASSERTION STILL GO RED?" note in server/lib/validation.ts: on the slowest fleet member under a saturating load no cast this bound can take clears the ceiling (cast 40 already costs 12,442ms there), so a red on such a machine is a machine report, not a guard regression, and re-deriving cannot fix it. If this machine is not in that class, re-derive with \`npm run measure-voice-bound\` on THIS machine (and .github/workflows/calibrate-voice-bound.yml for the runner), then re-lock tests/fixtures/voice-bound-derivation.json — either way, do not raise the fraction`,
    );
    assert.ok(
      wallMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
      `expected the max-admitted N=${BOUNDARY_CAST} worst-case accepted shape to finish under the ${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS}ms analysis budget, took ${Math.round(wallMs)}ms wall on ${machine}`,
    );
  });

  it(`the max-admitted N=${BOUNDARY_CAST + 1} boundary (one speaker over) is REJECTED by the cast bound`, () => {
    const text = buildMaxAdmitted(BOUNDARY_CAST + 1, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, `expected max-admitted N=${BOUNDARY_CAST + 1} (one speaker past the cast bound) to be rejected`);
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
  });

  // WHAT SITS EXACTLY ON THE WEIGHT BOUND NOW (re-anchored 2026-09-20).
  //
  // The test that stood here opened with `assert.equal(uniformMinWeight(150),
  // MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)` — "sanity: this document still sits
  // exactly on the weight bound" — which was true of 675,000 (150 x 150 x 30)
  // and is not true of any uniform-min cast at 1,500,000: 30N² = 1,500,000 has
  // no integer solution (N = 223.6). The document that sits exactly on the
  // bound is now the MAX-ADMITTED shape at the cast bound —
  // maxAdmittedWordsPerSpeaker(100, 1,500,000) = 150 words each, weight
  // 100 x 15,000 = 1,500,000 exactly — which is simultaneously ON both bounds,
  // and is ACCEPTED. One paragraph more per speaker (156 words) crosses the
  // weight bound and is refused by name.
  //
  // This is ±1 sensitive in the weight bound by construction: at 1,499,999 the
  // per-speaker ceiling drops to 144 words and the equality below fails.
  it('the document that sits EXACTLY on the weight bound is the max-admitted shape at the cast bound, it is ACCEPTED, and one paragraph more per speaker is REJECTED by the WEIGHT bound', () => {
    const cast = MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT;
    const wordsPerSpeaker = maxAdmittedWordsPerSpeaker(cast, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    assert.equal(
      cast * (cast * wordsPerSpeaker),
      MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
      `sanity: ${cast} speakers at ${wordsPerSpeaker} words each must land exactly ON the weight bound `
      + `(${cast * cast * wordsPerSpeaker} vs ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}) — if it does not, one of the two bounds moved and this boundary has to be recomputed`,
    );
    assert.equal(
      fountainShapeRejectionReason(buildUniformCast(cast, wordsPerSpeaker)),
      null,
      'the document sitting exactly on BOTH bounds must be accepted — a bound that rejects its own boundary is off by one',
    );
    const overWeight = fountainShapeRejectionReason(buildUniformCast(cast, wordsPerSpeaker + 6));
    assert.ok(overWeight, `expected ${cast} speakers at ${wordsPerSpeaker + 6} words each (weight ${cast * cast * (wordsPerSpeaker + 6)}) to be rejected`);
    assert.match(overWeight!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  // The 2026-09-12 narrowing, still stated rather than hidden — and now
  // unambiguous about WHICH bound makes it. uniform-min N=150 sat exactly on
  // the old 675,000 weight bound and was ACCEPTED under it; it cost 21,133 ms
  // of CPU on the machine that gates this repository, and it is REJECTED here.
  // Under the 1,500,000 bound its weight (675,000) is 2.2x under the weight
  // bound, so the CAST bound is the only thing that can be rejecting it, which
  // the assertion checks both ways.
  it('the uniform-min N=150 shape the 2026-09-12 derivation admitted is still REJECTED — now unambiguously by the CAST bound, with its weight well under the weight bound', () => {
    assert.ok(
      uniformMinWeight(150) < MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
      `sanity: N=150 must be a document the WEIGHT bound would admit (${uniformMinWeight(150)} vs ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}), or this says nothing about the cast bound`,
    );
    const reason = fountainShapeRejectionReason(buildUniformMin(150));
    assert.ok(reason, 'expected the old N=150 boundary document to be rejected under the cast bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
  });

  // The old N=151 test asserted this document was rejected by the WEIGHT bound
  // — true at 675,000, where 151 speakers at the floor weighed 684,030. At
  // 1,500,000 that weight is admitted and the CAST bound is what refuses it, so
  // the assertion follows the guard rather than the other way round. The
  // ORDERING property the old test's title was really about (weight is checked
  // FIRST, so no payload the weight bound already rejected changed its message)
  // is not dropped — it is asserted directly below, on a document that violates
  // BOTH bounds and must still report the weight one.
  it('the uniform-min N=151 shape is still REJECTED — by the CAST bound now, since its weight clears the raised weight bound', () => {
    assert.equal(uniformMinWeight(151), 684_030);
    assert.ok(uniformMinWeight(151) < MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, 'sanity: N=151 no longer crosses the weight bound');
    const reason = fountainShapeRejectionReason(buildUniformMin(151));
    assert.ok(reason, 'expected N=151 to be rejected');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
  });

  it('a document that violates BOTH bounds still reports the WEIGHT bound — weight is evaluated first, so no pinned rejection ever changed its message', () => {
    const cast = 250;
    assert.ok(uniformMinWeight(cast) > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, `sanity: uniform-min N=${cast} (weight ${uniformMinWeight(cast)}) must cross the weight bound`);
    assert.ok(cast > MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT, `sanity: uniform-min N=${cast} must cross the cast bound too`);
    const reason = fountainShapeRejectionReason(buildUniformMin(cast));
    assert.ok(reason, `expected uniform-min N=${cast} to be rejected`);
    assert.match(
      reason!,
      /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/,
      'a document over BOTH bounds must keep the weight bound\'s wording — the cast bound is checked second precisely so that every DoS payload this file pins keeps the message it was pinned with',
    );
  });

  // The band the cast bound newly rejects, CHECKED rather than restated. The
  // constant's comment said "121-150" for a day; prose is how that happened, so
  // the range is asserted against the guard here: every one of these documents
  // weighs under MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (so the weight bound alone
  // would admit it) and is rejected by the cast bound.
  //
  // RE-ANCHORED 2026-09-20 with the derived bounds: the band was 81-150 when
  // the pair read (675,000, 80); it is 101-223 now. Both ends are arithmetic,
  // not choices — it opens one past the cast bound, and it closes at the
  // largest cast the weight bound admits at the 30-word eligibility floor,
  // floor(sqrt(1,500,000 / 30)) = 223, because N=224 weighs 1,505,280 and is
  // taken by the weight bound instead. That closing end is asserted below so
  // the band cannot silently run off the end of the weight bound.
  for (const cast of [101, 110, 150, 223]) {
    it(`uniform-min N=${cast} weighs ${uniformMinWeight(cast)} — under the weight bound — and is rejected by the CAST bound (the 101-223 band)`, () => {
      assert.ok(
        uniformMinWeight(cast) <= MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT,
        `sanity: N=${cast} must be a document the WEIGHT bound would admit, or it says nothing about the cast bound`,
      );
      const reason = fountainShapeRejectionReason(buildUniformMin(cast));
      assert.ok(reason, `expected uniform-min N=${cast} to be rejected`);
      assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT/);
    });
  }

  it('the band ENDS at 223: uniform-min N=224 crosses the weight bound and is taken by it, not by the cast bound', () => {
    const lastCastBandMember = Math.floor(Math.sqrt(MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT / 30));
    assert.equal(lastCastBandMember, 223, `the largest uniform-min cast the weight bound admits is ${lastCastBandMember}, not 223 — the weight bound moved`);
    assert.ok(uniformMinWeight(lastCastBandMember + 1) > MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
    const reason = fountainShapeRejectionReason(buildUniformMin(lastCastBandMember + 1));
    assert.ok(reason, `expected uniform-min N=${lastCastBandMember + 1} to be rejected`);
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  it(`the band starts at ${BOUNDARY_CAST + 1}: uniform-min N=${BOUNDARY_CAST} is still ACCEPTED`, () => {
    assert.equal(fountainShapeRejectionReason(buildUniformMin(BOUNDARY_CAST)), null);
  });

  // The cast bound must stay ABOVE every realistic ensemble this file pins as
  // accepted, computed from those fixtures' own eligible cast counts rather
  // than from the literal 40 — so a future re-derivation that would start
  // rejecting an ordinary feature fails here instead of in a writer's browser.
  it('the cast bound stays above the largest realistic ensemble this file pins as ACCEPTED', () => {
    const counts = [15, 20, 30, 40].map((cast) => {
      const eligible = [...realVoiceWordCountsForMeasurement(buildProbeCastFeature(cast)).values()].filter((w) => w > 0);
      return { cast, distinct: eligible.length };
    });
    const largest = Math.max(...counts.map((c) => c.distinct));
    assert.ok(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT > largest,
      `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT (${MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT}) must stay strictly above the largest realistic ensemble pinned as accepted here (${largest} eligible speakers, from ${JSON.stringify(counts)}) — a bound at or below it rejects an ordinary feature, which is adversarial finding 10 all over again`,
    );
  });

  // Brief item (b)/(c)/(d): the lightest payload this file's own DoS/bypass
  // regressions pin as REJECTED via this bound is ROUND 3's "bypass B"
  // (200 uniform names, 4 occurrences each, 3 hard-wrapped 4-real-word
  // lines per occurrence — the "line ${w} has five words" digit token drops
  // out of voiceTokenCount's letter-only regex, leaving 4 real words per
  // wrap line). Recomputed HERE from that exact generator (not restated as
  // a literal weight) so this inequality is re-checked against the real
  // fixture shape, not a number that could silently drift out of sync with
  // it.
  function bypassBWeight(): number {
    function dsWrapped(distinct: number, occPerChar: number, wrapLines: number): string {
      let t = '', scene = 0, occ = 0;
      const total = distinct * occPerChar;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % distinct}\n\n`;
          for (let w = 0; w < wrapLines; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    }
    const text = dsWrapped(200, 4, 3);
    const blocks = parseFountain(normalizeScreenplay(text));
    const counts = new Map<string, number>();
    let currentSpeaker = '';
    for (const b of blocks) {
      const t = b.text.trim();
      if (!t) continue;
      if (b.type === 'character' || b.type === 'dual_dialogue') {
        currentSpeaker = t.replace(/\^\s*$/, '').trim();
      } else if (b.type === 'dialogue' && currentSpeaker) {
        const words = (t.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => /[a-z]/.test(w)).length;
        counts.set(currentSpeaker, (counts.get(currentSpeaker) ?? 0) + words);
      }
    }
    const nonZero = [...counts.values()].filter((w) => w > 0);
    const total = nonZero.reduce((a, b) => a + b, 0);
    return nonZero.length * total;
  }

  it('the bound is strictly below the lightest payload this file pins as REJECTED (bypass B, weight computed from its own generator — not a literal)', () => {
    const weight = bypassBWeight();
    assert.equal(weight, 1_920_000, 'sanity: bypass B\'s own weight must match what the constant\'s header comment cites, or the derivation is stale');
    assert.ok(
      MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT < weight,
      `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}) must stay strictly below bypass B's weight (${weight}), or that DoS fixture would stop being rejected by this bound`,
    );
    // And bypass B itself must still actually be rejected under the new
    // bound — the inequality above is necessary but not sufficient proof by
    // itself (a bound above the OLD weight formula's rounding, say, could
    // still satisfy `<` while the real guard disagreed for an unrelated
    // reason); this closes that gap directly against the production path.
    const text = (() => {
      let t = '', scene = 0, occ = 0;
      const total = 200 * 4;
      while (occ < total) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 40 && occ < total; i++, occ++) {
          t += `CHAR${occ % 200}\n\n`;
          for (let w = 0; w < 3; w++) t += `line ${w} has five words\n\n`;
        }
      }
      return t;
    })();
    const reason = fountainShapeRejectionReason(text);
    assert.ok(reason, 'expected bypass B to still be rejected under the new bound');
    assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/);
  });

  it('every one of this file\'s existing rejection fixtures is still REJECTED under the new bound — verified by this whole suite (648 tests, all 23 describe blocks above) passing unchanged after the MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT edit; nothing in ROUNDS 2-7 above flipped from reject to accept', () => {
    // Spot-check the three heaviest-cited reviewer/attack payloads directly,
    // as a fast, self-contained proof alongside the full-suite evidence
    // this test's title cites (every ROUND 2-7 describe block above already
    // asserts its own fixtures independently; this is not a substitute for
    // those, just a same-file confirmation that does not depend on test
    // execution order).
    const DLG = 'this is ordinary lowercase dialogue here.';
    function uniformCast(distinct: number, occurrences: number): string {
      let t = 'INT. ROOM - DAY\n\n', occ = 0, scene = 0;
      while (occ < occurrences) {
        t += `INT. LOCATION ${scene++} - DAY\n\nSomething happens in the room, quietly and without much fuss.\n\n`;
        for (let i = 0; i < 40 && occ < occurrences; i++, occ++) t += `CHAR${occ % distinct}\n${DLG}\n\n`;
      }
      return t;
    }
    function r6Doc(): string {
      let t = '', occ = 0;
      for (let s = 0; s < 400; s++) {
        t += `INT. LOCATION ${s} - DAY\n\nSomething happens in the room.\n\n`;
        for (let i = 0; i < 5; i++, occ++) t += `CHAR${occ % 200}\n${DLG6}\n\n`;
      }
      return t;
    }
    for (const [label, text] of [
      ['reviewer payload 1 (50x18,000, weight 4,788,000)', uniformCast(50, 18_000)],
      ['reviewer payload 2 (520x6,000, weight 18,720,000)', uniformCast(520, 6_000)],
      ['R6-0 (200x2,000 over 400 scenes, weight 2,400,000)', r6Doc()],
    ] as const) {
      const reason = fountainShapeRejectionReason(text);
      assert.ok(reason, `expected "${label}" to still be rejected`);
      assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/, `"${label}"`);
    }
  });
});
