#!/usr/bin/env node
// check-scoring-receipt.mjs — required-receipt enforcement for the AUC floor.
//
// WHY THIS EXISTS: CLAUDE.md's AUC-24 >= 0.622 structural-degradation ratchet
// (tests/core/real-script-corpus.test.ts, env-gated on REAL_SCRIPT_CORPUS_DIR)
// CANNOT run in CI — the corpus is local-only and copyright-restricted, and
// mounting it via CI secrets was rejected: secrets are not a corpus transport,
// and uploading the screenplay text anywhere is the exact exposure the
// de-identification work (docs/p1-benchmark/CORPUS_IDENTIFICATION.md) exists
// to avoid. CI cannot verify the AUC VALUE. What it CAN do is make it
// impossible to silently ship a scoring change without SOMEONE having run the
// local measurement and recorded it — this script is that trip-wire.
//
// MECHANISM: given a git range, detect whether any file on the "scoring path"
// changed. If one did, the SAME range must also add a well-formed new entry to
// docs/p1-benchmark/MEASUREMENT_RECEIPTS.md — the human step is CHECKED FOR,
// not hoped for. The AUC NUMBER is still never re-verified (CI has no corpus);
// what IS now verified is that the entry is not self-evidently fake.
//
// ---------------------------------------------------------------------------
// TWO HOLES THIS SCRIPT USED TO HAVE (both reproduced before being fixed)
// ---------------------------------------------------------------------------
// 1. THE RANGE WAS EMPTY ON EVERY PUSH-TO-MAIN RUN. `resolveDefaultRange()`
//    returned `origin/main...HEAD` whenever process.env.CI was set. On a
//    push-to-main workflow run those two refs are the SAME COMMIT, so the
//    three-dot range is empty and the script printed "no scoring-path files
//    changed. OK." and exited 0 no matter what the push contained. ~182
//    main-push CI runs were gated by nothing. That is the exact mechanism by
//    which the 2026-08-08 fabricated-receipt incident could recur undetected:
//    the guard is loudest on PRs and was silent on the branch that actually
//    ships. FIXED: on a `push` event the range is the PUSHED range
//    (`<before>..<sha>`), taken from PUSH_BEFORE_SHA (wired in ci.yml) or read
//    straight out of $GITHUB_EVENT_PATH so forgetting to wire the env var
//    cannot silently reopen the hole. Three-dot `origin/main...HEAD` is kept
//    for `pull_request`, where it is the correct shape.
//
// 2. "CONTENT-BEARING UPDATE" WAS A LINE COUNT. The old
//    `receiptWasMeaningfullyUpdated()` returned true when `git diff --numstat`
//    reported insertions > 0. Nothing checked that the added lines were an
//    entry, let alone a plausible one. The known-fabricated 2026-08-08 entry
//    (see MEASUREMENT_RECEIPTS.md's own 2026-08-14 CORRECTION) sails through
//    that test while citing a git SHA that does not exist in this repository
//    and a Command field that literally says "(simulated local execution due
//    to copyright restrictions)". FIXED: entries ADDED IN THE RANGE are now
//    validated — see validateEntry() below. Entries already in history are
//    never re-validated; this guard reports on what a change is adding, and
//    retroactively failing the ledger's own honest correction entries would
//    make the ledger unmaintainable.
//
// The boundary that REMAINS: a careful liar can still write a well-formed
// entry citing a real SHA and an invented AUC. CI has no corpus and cannot
// recompute it. What changed is that the cheap forgeries — no measurement at
// all, a made-up SHA, an entry that admits it was simulated — now fail.
//
// ---------------------------------------------------------------------------
// THE SCORING PATH — defined conservatively, reasoning documented inline.
// ---------------------------------------------------------------------------
// Two tiers:
//
// 1. ALWAYS-SCORING (matched by exact path or directory prefix, no further
//    analysis) — the paths CLAUDE.md and the maintainer named directly as the
//    core scoring surface:
//      - server/nvm/analyze/doctor.ts        (the score/verdict entrypoint)
//      - server/nvm/analyze/emotional-arc.ts (feeds doctor's structural
//                                              deduction directly)
//      - server/nvm/analyze/fountain-analyzer.ts (the base parse everything
//                                              else, including doctor, reads)
//      - server/nvm/analyze/calibration/**   (the reference distribution and
//                                              percentile math the score is
//                                              normalized against; corpus.ts
//                                              and discrimination-pairs.ts
//                                              live here and are NOT always
//                                              statically imported by doctor
//                                              — including the whole
//                                              directory is the "err toward
//                                              inclusion" call, since a
//                                              calibration-corpus edit can
//                                              shift every band's score
//                                              without doctor.ts itself
//                                              changing a line)
//      - server/nvm/revision/passes/**       (the live 14-pass pipeline;
//                                              CLAUDE.md: "the revision
//                                              pipeline's 14-pass execution
//                                              order is still live" — every
//                                              pass here can move health via
//                                              runRevisionPipeline)
//
// 2. REACHABLE-FROM-DOCTOR (everything else, NO DIRECTORY RESTRICTION) — a
//    file here counts as scoring-path if and only if it is statically
//    reachable by following import/export/dynamic-import edges outward from
//    doctor.ts (server/nvm/analyze/doctor.ts), computed fresh against the
//    CURRENT on-disk tree every run (not against git history — a file's
//    wiring is a property of the checkout being tested, not of any one
//    commit). This is what keeps NEW unwired candidate files — the
//    QL-deduction (question-latency-deduction.ts), reversal-detection.ts,
//    truth-extraction.ts pattern CLAUDE.md and the maintainer named
//    explicitly — from tripping the guard: nothing in the scoring path
//    imports them, so they are not in the reachable set, so a change to (or
//    addition of) one of them is invisible to this script, exactly as it is
//    invisible to a real doctor run. The same walk also correctly excludes
//    dozens of other already-unwired analyze/** files (causality-enforcer.ts,
//    disclosure-ledger.ts, epistemic-ledger.ts, custody-ledger.ts,
//    belief-movement.ts, assertion-containment.ts, genre-obligation.ts,
//    integrity-rate.ts, mystery-fairness.ts, scene-economy.ts,
//    scene-value-shift.ts, well-made-surprise.ts, typed-promises.ts,
//    story-spine.ts, voice-delta.ts, inflection-tension.ts,
//    dialogue-info-ratio.ts, excellence-signals.ts, structural-genome.ts,
//    story-graph-ops.ts, fix.ts, canonical-fountain.ts, and more — verified
//    by hand against `grep -rl "from '.*<file>'" server` at the time this
//    script was written) while correctly including everything doctor.ts
//    actually imports transitively (deep-read.ts, anti-slop.ts,
//    theme-extract.ts, interiority.ts, mirror-scene.ts, silence-signal.ts,
//    bonding-signal.ts, cold-open-promise.ts, pattern-establishment.ts,
//    story-graph.ts, temporal-consistency.ts, metrics.ts,
//    calibration/percentile.ts, ../revision/pipeline.ts, ../revision/
//    rewrite.ts, and the pipeline's own imports of screenplay/compile.ts,
//    screenplay/structure.ts, screenplay/memory.ts, etc.).
//
//    UNTIL 2026-09-02 this tier was itself restricted to files under
//    server/nvm/analyze/** or server/nvm/revision/** — the walk followed
//    edges outside those directories to stay correct across re-export
//    chains, but a file outside the two prefixes was never classified as
//    scoring-path even when the walk visited it, on the theory that e.g.
//    src/lib/screenplay-layout.ts is "rendering code, not a scoring-formula
//    change." THAT THEORY WAS FALSE FOR THE ACTUAL FILES INVOLVED (2026-09-02
//    retrospective, finding #3) and the restriction is now removed:
//      - doctor.ts imports `layoutScreenplay` from src/lib/screenplay-layout.ts
//        DIRECTLY (doctor.ts:67) and uses its return value to compute `pages`
//        (doctor.ts:864) — not rendering, an input to a number the report
//        emits.
//      - fountain-analyzer.ts (tier 1, always-scoring) imports
//        src/lib/fountain.ts, which decides what counts as a scene heading —
//        i.e. it produces `sceneCount`, the single highest-AUC term the
//        doctor emits (~0.938, doctor.ts:1892-1898). The old prefix filter
//        discarded it unconditionally.
//      - Proven on commit c9023b8f ("multi-language scene headings"): the old
//        gate named only screenplay-normalizer.ts in that range while the
//        commit also changed fountain.ts, and fountain.ts was invisible to
//        the guard. `node scripts/check-scoring-receipt.mjs c9023b8f^..c9023b8f`
//        now names both files.
//    "Which directory is this file in" was never actually evidence that a
//    file could not move a number; "is this file in doctor.ts's reachable
//    set" is the only evidence the walk was ever computing, and it is now the
//    only thing classification consults for this tier.
//
//    A reachable file CAN still be marked scoring:false — via
//    REACHABLE_BUT_NOT_SCORING below — but only by a per-file entry that
//    documents a specific proof (see that constant's comment), never by
//    directory membership. The set starts EMPTY and stays empty until such a
//    proof exists; err toward inclusion, per the brief this script was built
//    against.
//
// A file this script does NOT catch: anything computing health/verdict
// without being statically reachable from doctor.ts by a plain
// import/export/dynamic-import edge — a dynamically-built import path
// (`import(someVariable)`), a file read directly off disk by path string
// rather than imported, or a second entrypoint that duplicates doctor.ts's
// logic without doctor.ts itself importing it. There is no such file known
// today — doctor.ts is the sole entrypoint and the walk in
// scripts/lib/import-graph.mjs follows both static and dynamic `import(...)`
// forms. If a new scoring computation is ever added that the walk cannot see,
// add its exact path to ALWAYS_SCORING_FILES (or its directory to
// ALWAYS_SCORING_DIR_PREFIXES) — erring toward inclusion, per the brief this
// script was built against.
// ---------------------------------------------------------------------------
//
// THE THIRD ENTRY KIND — PENDING. Two kinds of entry already pass this gate:
// (1) a MEASURED receipt (Measured AUC-24 present, Command is `npm run
//     measure-real` or `measure-auc-split.mjs`), and
// (2) an OUTPUT-IDENTITY receipt (the score provably did not move —
//     `check-doctor-output-identity.mjs` … `OUTPUT IDENTITY: PASS — all 45
//     reports are byte-identical`).
// A PENDING entry is neither: it is an honest ledger row, appended by a
// scoring-change branch, whose own attestation says in the first person that
// the real-corpus measurement was NOT run. The 2026-09-03 LANE R5 entry is
// the worked example — headed `### 2026-09-03 — … PENDING OWNER
// MEASUREMENT …`. Before 2026-09-03 this script accepted such an entry as a
// valid receipt for the range (exit 0): it is well-formed, cites a real
// baseline, and admits no simulation — but it is a promise to measure, not a
// receipt of a measurement, and "the human step is checked-for, not hoped
// for" (this file's own header, above) meant nothing if the checked-for step
// could itself say "not done yet" and still pass. See isPendingEntry() below.
// A pending entry does NOT count as a receipt for the range even when it
// also contains an OUTPUT IDENTITY: PASS line elsewhere in its body — the
// pending marker wins, so a moved score with an unrun measurement cannot be
// laundered by pasting an identity line copied from a different kind of
// change.
// ---------------------------------------------------------------------------
//
// REACHABLE_BUT_NOT_SCORING — the one, documented exit from tier 2.
//
// A file reachable from doctor.ts belongs here ONLY after a specific proof
// that NONE of the exported functions doctor.ts's import graph actually
// reaches from that file feed a number in ScriptDoctorReport (health,
// verdict, sceneCount, or any field a caller reads off the report). "It looks
// like rendering/logging/plumbing code" is not that proof — it is exactly the
// argument this script's header used to make about
// src/lib/screenplay-layout.ts, and it was wrong (see above). The repo's
// instrument for a real proof is the output-identity harness:
//
//   node scripts/check-doctor-output-identity.mjs --tree <baseline> --out /tmp/before
//   node scripts/check-doctor-output-identity.mjs --tree <working-tree-with-file-neutered> --out /tmp/after
//   node scripts/check-doctor-output-identity.mjs --compare /tmp/before /tmp/after
//
// i.e.: stub out (or delete) the candidate file's contribution, confirm the
// project still builds/types, and show every fixture's report snapshot is
// byte-identical. A file that survives that comparison unchanged has proven
// it isn't wired to a number, not merely that it "sounds like" plumbing.
//
// As of 2026-09-02 this set is EMPTY. No file has such a proof on record —
// src/lib/screenplay-layout.ts was investigated and DISQUALIFIED (see above:
// it feeds `pages` directly). Every other file the walk currently reaches
// outside server/nvm/analyze/**+server/nvm/revision/** (server/engine/**,
// server/lib/**, server/nvm/screenplay/**, server/nvm/quality/**, etc. — see
// the 2026-09-02 retrospective's finding #5 on the deterministic/generative
// boundary) is included as scoring-path by the same default, for the same
// reason: nobody has produced the identity proof for any of them yet, and
// "err toward inclusion" is not a suggestion. (The Set itself is declared
// below, alongside the other classification constants.)
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { computeReachableSet } from './lib/import-graph.mjs';

const ROOT = process.cwd();
const RECEIPT_PATH = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';

const ALWAYS_SCORING_FILES = new Set([
  'server/nvm/analyze/doctor.ts',
  'server/nvm/analyze/emotional-arc.ts',
  'server/nvm/analyze/fountain-analyzer.ts',
]);
const ALWAYS_SCORING_DIR_PREFIXES = [
  'server/nvm/analyze/calibration/',
  'server/nvm/revision/passes/',
];
// Files reachable from doctor.ts's import graph that are PROVEN not to feed
// any ScriptDoctorReport field. Empty by design — see the header comment's
// "REACHABLE_BUT_NOT_SCORING" section for what a proof has to show and the
// harness that produces one. Do not add an entry here on the strength of a
// file's directory or its apparent purpose; that reasoning is exactly what
// let src/lib/screenplay-layout.ts slip through before 2026-09-02.
const REACHABLE_BUT_NOT_SCORING = new Set([]);
const REACHABILITY_ROOTS = ['server/nvm/analyze/doctor.ts'];

// ---------------------------------------------------------------------------
// Git plumbing
// ---------------------------------------------------------------------------

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

/** True for a bare/single-ref range ("origin/main"), false for a two-point
 *  range ("A..B" or "A...B"). Single-ref ranges diff against the working
 *  tree, so they get untracked files unioned in; two-point ranges are a pure
 *  historical comparison and should not pick up unrelated working-tree noise. */
function isSingleRefRange(range) {
  return !range.includes('..');
}

const ZERO_SHA_RE = /^0{7,40}$/;

/** The `before` SHA of a GitHub `push` event: the commit the branch pointed at
 *  before this push. Preferred source is PUSH_BEFORE_SHA (wired explicitly in
 *  ci.yml from `${{ github.event.before }}`); the $GITHUB_EVENT_PATH payload is
 *  read as a fallback so that forgetting to wire the env var in a workflow does
 *  NOT silently restore the empty-range hole this function exists to close. */
function pushEventBeforeSha() {
  const explicit = (process.env.PUSH_BEFORE_SHA ?? '').trim();
  if (explicit) return explicit;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && existsSync(eventPath)) {
    try {
      const payload = JSON.parse(readFileSync(eventPath, 'utf8'));
      if (typeof payload?.before === 'string' && payload.before.trim()) return payload.before.trim();
    } catch {
      // Unparseable payload is not worth crashing the job over; fall through.
    }
  }
  return null;
}

/** CI, `push` event: the PUSHED range, `<before>..<sha>`. This is the fix for
 *  the hole described at the top of this file — on a push to main,
 *  `origin/main...HEAD` names the same commit twice and diffs nothing, so the
 *  guard passed unconditionally on the branch that actually ships.
 *
 *  CI, `pull_request` event: `origin/main...HEAD` (three-dot, PR-shaped: only
 *  what HEAD added since it diverged from origin/main).
 *
 *  Local: diff against whichever of origin/main / main exists, so uncommitted
 *  work is included (a dev wants to know before committing, not after). Last
 *  resort: the previous commit. Returns null only when nothing resolves — a
 *  brand-new repo, or a first push that creates a branch with the all-zeros
 *  `before` sentinel AND no origin/main to fall back on. Callers treat null as
 *  "no base to compare against"; it is announced loudly rather than passed off
 *  as a clean result. */
function resolveDefaultRange() {
  if (process.env.CI) {
    if (process.env.GITHUB_EVENT_NAME === 'push') {
      const before = pushEventBeforeSha();
      if (before && !ZERO_SHA_RE.test(before) && refExists(before)) {
        const head = process.env.GITHUB_SHA && refExists(process.env.GITHUB_SHA)
          ? process.env.GITHUB_SHA
          : 'HEAD';
        return `${before}..${head}`;
      }
      // All-zeros `before` = this push CREATED the ref, so there is no prior
      // state on it. Everything the new branch adds relative to main is the
      // honest range; fall through to it. (A first push that creates `main`
      // itself has no base at all and lands on the null return below.)
    }
    if (refExists('origin/main')) return 'origin/main...HEAD';
    // CI without a resolvable origin/main is a checkout misconfiguration
    // (shallow fetch, wrong ref) — fall through to the same local-style
    // fallback rather than crashing the whole job over it.
  }
  for (const base of ['origin/main', 'main']) {
    if (refExists(base)) return base;
  }
  if (refExists('HEAD~1')) return 'HEAD~1';
  return null;
}

function getChangedFiles(range) {
  let out;
  try {
    out = git(['diff', '--name-only', range]);
  } catch (err) {
    throw new Error(`git diff failed for range "${range}": ${err.message}`);
  }
  const files = out.split('\n').map((s) => s.trim()).filter(Boolean);
  if (isSingleRefRange(range)) {
    const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
    for (const line of status.split('\n')) {
      if (line.startsWith('??')) files.push(line.slice(3).trim());
    }
  }
  return [...new Set(files)];
}

/** Lines this range ADDS to the receipt file, '+' stripped. Handles a tracked
 *  modification (unified=0 diff) and a brand-new untracked receipt in
 *  single-ref/local mode (the whole file counts as added). */
export function addedReceiptLines(range) {
  const lines = [];
  try {
    const out = git(['diff', '--unified=0', range, '--', RECEIPT_PATH]);
    for (const line of out.split('\n')) {
      if (line.startsWith('+++')) continue;
      if (line.startsWith('+')) lines.push(line.slice(1));
    }
  } catch {
    // fall through to the untracked check below
  }
  if (lines.length === 0 && isSingleRefRange(range)) {
    const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
    for (const line of status.split('\n')) {
      if (line.startsWith('??') && line.slice(3).trim() === RECEIPT_PATH) {
        const abs = path.join(ROOT, RECEIPT_PATH);
        if (existsSync(abs)) lines.push(...readFileSync(abs, 'utf8').split('\n'));
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Receipt entry validation
// ---------------------------------------------------------------------------
//
// SCOPE, DELIBERATELY: only entries whose `### <date> …` heading appears among
// the lines ADDED in this range are validated. History is never re-validated.
// The ledger's own convention is that a bad entry is superseded by a dated
// correction entry rather than edited away, so the file permanently contains
// the 2026-08-08 fabrication AND the 2026-08-14 correction that dissects it —
// quoting its simulated Command field and its nonexistent SHA. A validator
// that re-scanned history would fail the build on the honesty work.

/** `### 2026-08-21 — …`, `### 2026-08-08 Receipt: …` — an entry heading is a
 *  level-3 heading that starts with an ISO date. The §3 template placeholder
 *  (`### <YYYY-MM-DD> — …`) deliberately does not match. */
const ENTRY_HEADING_RE = /^###\s+(\d{4}-\d{2}-\d{2})\b(.*)$/;

/** Fields required by §3's template. Matched on the bolded label, tolerating
 *  both `**Command:**` and `**Command**:` (the ledger contains both). */
const REQUIRED_FIELDS = [
  { label: 'Command', patterns: [/\*\*\s*Command\s*:?\s*\*\*/i] },
  { label: 'Corpus fingerprint', patterns: [/\*\*\s*Corpus\s+fingerprint\s*:?\s*\*\*/i] },
  { label: 'Runner attestation', patterns: [/\*\*\s*Runner\s+attestation\s*:?\s*\*\*/i] },
  {
    // A commit anchor: what tree was this measured against. `Git SHA` per the
    // template, or `Baseline used` as the two 2026-08-21 output-identity
    // entries write it (they compare against a `git archive origin/main` tree
    // rather than measuring at HEAD).
    label: 'Git SHA (or Baseline used)',
    patterns: [/\*\*\s*Git\s+SHA\s*:?\s*\*\*/i, /\*\*\s*Baseline\s+used\s*:?\s*\*\*/i],
  },
];

/** Fields that assert what was actually EXECUTED. Simulation language here is
 *  not prose, it is the claim itself contradicting itself — the 2026-08-08
 *  fabrication's Command field reads "(simulated local execution due to
 *  copyright restrictions)". Prose fields elsewhere in an entry are NOT
 *  scanned with this list, because honest entries legitimately reason about
 *  what a weaker instrument "would be" (the 2026-08-21 W1/W2 entry argues
 *  exactly that about AUC) — those get the narrower whole-entry list below. */
const CLAIM_FIELD_LABELS = ['Command', 'Git SHA', 'Baseline used', 'Runner attestation', 'Attestation'];
const CLAIM_FIELD_SIMULATION_RE = /\b(?:simulated|simulation|hypothetical(?:ly)?|estimated|approximated|extrapolated|would\s+be|not\s+actually\s+run|mocked)\b/i;

/** Phrasings that cannot occur in an honest receipt anywhere in the entry.
 *  Each is deliberately specific: `would be` alone is ordinary English, but
 *  "would be 0.73" is a number nobody measured. */
const ENTRY_SIMULATION_PATTERNS = [
  { re: /simulated\s+(?:local\s+)?(?:execution|run|measurement)/i, why: 'the entry says the run was simulated' },
  { re: /\bnot\s+actually\s+run\b/i, why: 'the entry says the measurement was not actually run' },
  { re: /\bhypothetical(?:ly)?\s+(?:run|measurement|result|value|number|AUC)/i, why: 'the entry describes a hypothetical measurement' },
  { re: /\bwould\s+(?:be|have\s+been)\s+(?:roughly\s+|approximately\s+|about\s+|~)?[0-9]/i, why: 'the entry states a number that was projected, not measured' },
  { re: /\bestimated\s+(?:AUC|value|number|result)/i, why: 'the entry reports an estimate in place of a measurement' },
];

/** A whole-backtick span that is nothing but a git object id. Whole-span
 *  matching (rather than scanning for hex substrings) is what keeps this from
 *  firing on `--partition=test`, `1.0.0-rc.1`, or a hex-looking fragment of a
 *  longer command. Requiring at least one digit drops English words that
 *  happen to be spellable in a–f. */
const BACKTICKED_SHA_RE = /`([0-9a-f]{7,40})`/g;
const BARE_SHA_RE = /(?<![\w`])([0-9a-f]{7,40})(?![\w`])/g;
const HAS_DIGIT_RE = /[0-9]/;

/** A correction entry documents a bad SHA on purpose — the ledger's 2026-08-14
 *  entry exists precisely to say "this SHA does not exist". Honor that within
 *  a two-line window (the disclaimer routinely wraps onto the next line). */
const SHA_DISCLAIMED_RE = /does\s+not\s+exist|nonexistent|non-existent|no\s+longer\s+exists|not\s+resolvable|unresolvable|could\s+not\s+get\s+object/i;

/** A field's full text (its labeled line plus any continuation lines, up to
 *  the next bolded bullet at any indent), located by a caller-supplied regex
 *  rather than a label string — shared by fieldValue() (label-based lookup)
 *  and the PENDING required-field scan (which needs each REQUIRED_FIELDS
 *  pattern, including the "Git SHA (or Baseline used)" alternation, tried in
 *  turn against the same line-matching logic). */
function fieldValueByPattern(entryLines, pattern) {
  const start = entryLines.findIndex((l) => pattern.test(l));
  if (start === -1) return null;
  const out = [entryLines[start]];
  for (let i = start + 1; i < entryLines.length; i++) {
    if (/^\s*[-*]\s+\*\*/.test(entryLines[i])) break;
    out.push(entryLines[i]);
  }
  return out.join('\n');
}

function fieldValue(entryLines, label) {
  return fieldValueByPattern(entryLines, new RegExp(`\\*\\*\\s*${label.replace(/\s+/g, '\\s+')}\\s*:?\\s*\\*\\*`, 'i'));
}

/** PENDING detection — see the header's "THE THIRD ENTRY KIND" section.
 *
 * Whole-word `PENDING` (case-insensitive) in the heading, or in the text of
 * any §3 REQUIRED_FIELDS field, is how the ledger's own convention marks a
 * filed-but-incomplete entry (the real LANE R5 entry's heading ends "…
 * PENDING OWNER MEASUREMENT"). `\bPENDING\b` deliberately does not fire on
 * "appending" or similar — both neighboring characters have to be non-word
 * for the boundary to match.
 *
 * Separately, a short, deliberately tight phrase list catches an entry that
 * states in plain prose that the measurement was not run without using the
 * word PENDING anywhere a field-scan would see it. This list is intentionally
 * NOT a general "not"/"no" scan — that would misfire on the honest
 * 2026-08-21/2026-09-02/2026-09-03 output-identity entries, which correctly
 * say "no scoring measurement, because no score moved". Each phrase below
 * names the absence of a *run*, not the absence of a *score change*. */
const PENDING_WORD_RE = /\bPENDING\b/i;
const PENDING_PHRASES = [
  'has not been run',
  'was not run',
  'not yet measured',
  'pending owner measurement',
];
const PENDING_PHRASE_RES = PENDING_PHRASES.map(
  (phrase) => new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i'),
);

/** Returns a short human-readable reason if `entry` is a PENDING entry, or
 *  null if it is not. A pending entry fails validation regardless of what
 *  else it contains (see validateEntry) — the pending marker wins over an
 *  incidental OUTPUT IDENTITY: PASS line elsewhere in the same body. */
function pendingReason(entry) {
  if (PENDING_WORD_RE.test(entry.heading)) {
    return `the entry heading contains "PENDING"`;
  }
  for (const field of REQUIRED_FIELDS) {
    for (const pattern of field.patterns) {
      const value = fieldValueByPattern(entry.lines, pattern);
      if (value && PENDING_WORD_RE.test(value)) {
        return `the **${field.label}** field contains "PENDING"`;
      }
    }
  }
  const body = `${entry.heading}\n${entry.lines.join('\n')}`;
  for (let i = 0; i < PENDING_PHRASE_RES.length; i++) {
    const hit = PENDING_PHRASE_RES[i].exec(body);
    if (hit) return `the entry states "${hit[0]}"`;
  }
  return null;
}

function collectCitedShas(entryLines) {
  const found = [];
  for (let i = 0; i < entryLines.length; i++) {
    const line = entryLines[i];
    const window = `${line}\n${entryLines[i + 1] ?? ''}`;
    const disclaimed = SHA_DISCLAIMED_RE.test(window);
    for (const m of line.matchAll(BACKTICKED_SHA_RE)) {
      if (HAS_DIGIT_RE.test(m[1])) found.push({ sha: m[1], line: i, disclaimed });
    }
    // A Git SHA field may write the id unquoted; scan that field's lines too.
    if (/\*\*\s*Git\s+SHA\s*:?\s*\*\*/i.test(line)) {
      for (const m of line.matchAll(BARE_SHA_RE)) {
        if (HAS_DIGIT_RE.test(m[1])) found.push({ sha: m[1], line: i, disclaimed });
      }
    }
  }
  const seen = new Set();
  return found.filter((f) => (seen.has(f.sha) ? false : (seen.add(f.sha), true)));
}

function shaResolves(sha) {
  try {
    // stdio pinned to pipe: git writes "Not a valid object name" to stderr,
    // which execFileSync would otherwise inherit straight into the CI log and
    // make a passing run look broken.
    execFileSync('git', ['cat-file', '-e', `${sha}^{object}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate one receipt entry. Returns a list of human-readable problems;
 * empty means the entry is well-formed. `objectExists` is injectable so tests
 * can exercise the SHA rule without depending on repository history.
 */
export function validateEntry(entry, { objectExists = shaResolves } = {}) {
  const problems = [];
  const body = entry.lines.join('\n');

  const pending = pendingReason(entry);
  if (pending) {
    problems.push(
      `PENDING ENTRY (${entry.heading}) — this receipt records that no measurement happened `
      + `(${pending}). A pending entry is a promise to measure, not a receipt of a measurement, `
      + 'and it does not satisfy this range\'s requirement — even if the same entry also contains '
      + 'an OUTPUT IDENTITY: PASS line elsewhere, the pending marker wins. To close this: run '
      + '`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` and append a superseding measured '
      + 'entry.',
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (!field.patterns.some((re) => re.test(body))) {
      problems.push(`missing required field **${field.label}** (see §3's entry template)`);
    }
  }

  for (const label of CLAIM_FIELD_LABELS) {
    const value = fieldValue(entry.lines, label);
    if (!value) continue;
    const hit = CLAIM_FIELD_SIMULATION_RE.exec(value);
    if (hit) {
      problems.push(
        `the **${label}** field contains "${hit[0]}" — a receipt records what was RUN. `
        + 'If no measurement was run, say so plainly and explain what evidence stands in its place; '
        + 'do not describe a simulated run as a measurement.',
      );
    }
  }

  for (const { re, why } of ENTRY_SIMULATION_PATTERNS) {
    const hit = re.exec(body);
    if (hit) problems.push(`${why} ("${hit[0].trim()}")`);
  }

  for (const { sha, disclaimed } of collectCitedShas([entry.heading, ...entry.lines])) {
    if (disclaimed) continue;
    if (!objectExists(sha)) {
      problems.push(
        `cites git object \`${sha}\`, which does not exist in this repository. `
        + 'A receipt must name a commit a reviewer can check out. (This is the tell that '
        + 'exposed the 2026-08-08 fabrication.)',
      );
    }
  }

  return problems;
}

/** Group added lines into entries. Only a `### <ISO date>` line starts one;
 *  anything added before the first such line belongs to no entry and is
 *  ignored (it is prose, a §-header, or a template edit). */
export function extractEntries(lines) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    const m = ENTRY_HEADING_RE.exec(line.trim());
    if (m) {
      current = { date: m[1], heading: line.trim(), lines: [] };
      entries.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return entries;
}

/**
 * The receipt requirement for a range: at least one new, well-formed entry.
 * Returns { ok, problems }.
 *
 * `structuralOnly: true` keeps the "a new dated entry must exist" requirement
 * but skips per-entry content validation. That mode exists for ONE caller:
 * release.yml, which checks a whole release window (previous v* tag → this
 * tag) rather than a single change. Content validation is a property of the
 * moment an entry is written — an honest entry cites the branch SHA it was
 * measured at, and after that branch is squash-merged the SHA is no longer in
 * the repository at all (verified: the 2026-08-04 craft-spec and 2026-08-07
 * pilot entries both cite SHAs that no longer resolve, and both are honest).
 * Re-validating them months later manufactures failures on exactly the
 * carefully-written receipts this guard is meant to encourage. Entry content
 * is validated where it can be validated: in CI, on the range that adds it.
 */
export function checkReceiptForRange(range, opts = {}) {
  const { structuralOnly = false, ...entryOpts } = opts;
  const added = addedReceiptLines(range).filter((l) => l.trim() !== '');
  if (added.length === 0) {
    return { ok: false, problems: [`${RECEIPT_PATH} gained no content in this range.`] };
  }
  const entries = extractEntries(addedReceiptLines(range));
  if (entries.length === 0) {
    return {
      ok: false,
      problems: [
        `${RECEIPT_PATH} changed in this range but gained no new entry. An entry starts with `
        + 'a level-3 heading naming its date, e.g. `### 2026-08-21 — <reason>`. Appending lines '
        + 'to an existing entry is not a receipt for a new scoring change.',
      ],
    };
  }
  if (structuralOnly) return { ok: true, problems: [] };
  const problems = [];
  for (const entry of entries) {
    for (const p of validateEntry(entry, entryOpts)) problems.push(`${entry.heading}\n      ${p}`);
  }
  return { ok: problems.length === 0, problems };
}

// Reachability (the static import walk rooted at doctor.ts) lives in
// scripts/lib/import-graph.mjs — shared with scripts/check-no-console.mjs so
// the two gates cannot drift into disagreeing about what "wired in" means.

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classify(relPathRaw, reachable) {
  const p = relPathRaw.replace(/\\/g, '/');
  if (ALWAYS_SCORING_FILES.has(p)) {
    return { scoring: true, reason: 'core scoring entrypoint (always in scope)' };
  }
  const alwaysDir = ALWAYS_SCORING_DIR_PREFIXES.find((pre) => p.startsWith(pre));
  if (alwaysDir) {
    return { scoring: true, reason: `under ${alwaysDir} (always in scope, conservative)` };
  }
  // Tier 2: reachability decides membership for EVERY remaining file, with no
  // directory restriction (2026-09-02 fix — see the header's "REACHABLE-FROM-
  // DOCTOR" section for why the old server/nvm/analyze|revision restriction
  // was itself the bug this rewrite closes).
  if (!reachable.has(p)) {
    return {
      scoring: false,
      reason: "not reachable from doctor.ts's import graph — unwired candidate, excluded",
    };
  }
  if (REACHABLE_BUT_NOT_SCORING.has(p)) {
    return {
      scoring: false,
      reason: 'reachable from doctor.ts, but excluded by a documented proof — see REACHABLE_BUT_NOT_SCORING in this script',
    };
  }
  return { scoring: true, reason: "reachable from doctor.ts's import graph" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const structuralOnly = args.includes('--structural-only');
  const explicitRange = args.find((a) => !a.startsWith('--'));
  const range = explicitRange || resolveDefaultRange();

  if (!range) {
    // Loud, not casual: "nothing to check" is what the old empty-range bug
    // printed on every push to main. If this line appears in a CI log on a
    // normal run, the checkout is misconfigured, not clean.
    const message =
      'check-scoring-receipt: NO BASE REF to diff against (no push range, no origin/main, no main, '
      + 'no prior commit) — nothing could be checked. This is not a pass; it is an absent check. '
      + 'On CI this means the checkout lacks history (needs fetch-depth: 0) or the event payload '
      + 'was unavailable.';
    if (process.env.CI) {
      // 2026-09-02: on CI this used to print the sentence above and exit 0 —
      // an absent check that renders as a green build, which is precisely the
      // shape of every failure this guard exists to prevent. Both workflows
      // check out with fetch-depth: 0 for exactly this reason, and
      // tests/core/ci-gates-intact.test.ts asserts they keep doing so; if the
      // range still cannot be resolved, the checkout is broken and the build
      // must say so rather than certifying a range it never read.
      //
      // Local runs stay lenient (below): a developer in a fresh repo with no
      // base ref is not shipping anything, and failing there teaches people to
      // route around the guard.
      console.error(message);
      console.error(
        'check-scoring-receipt: FAILING because CI is set. A misconfigured or shallow checkout must '
        + 'not produce a green build — fix the checkout (fetch-depth: 0) or pass an explicit range.',
      );
      process.exit(1);
    }
    console.log(message);
    process.exit(0);
  }

  const changed = getChangedFiles(range);
  const reachable = computeReachableSet(ROOT, REACHABILITY_ROOTS);

  const scoringHits = [];
  for (const f of changed) {
    const c = classify(f, reachable);
    if (c.scoring) scoringHits.push({ file: f, reason: c.reason });
  }

  if (scoringHits.length === 0) {
    console.log(`check-scoring-receipt: range "${range}" — no scoring-path files changed. OK.`);
    process.exit(0);
  }

  const receipt = checkReceiptForRange(range, { structuralOnly });

  console.log(
    `check-scoring-receipt: range "${range}"${structuralOnly ? ' [--structural-only: entry content not re-validated]' : ''}`
    + ` — ${scoringHits.length} scoring-path file(s) changed:`,
  );
  for (const h of scoringHits) console.log(`  - ${h.file}  (${h.reason})`);

  if (receipt.ok) {
    console.log(
      structuralOnly
        ? `\n${RECEIPT_PATH} gained a new entry in the same range. OK (content was validated by CI on the range that added it).`
        : `\n${RECEIPT_PATH} gained a well-formed new entry in the same range. OK.`,
    );
    process.exit(0);
  }

  console.error(
    [
      '',
      '='.repeat(72),
      'SCORING-PATH CHANGE WITHOUT A VALID MEASUREMENT RECEIPT',
      '='.repeat(72),
      '',
      'A file on the scoring path changed in this range, but',
      `${RECEIPT_PATH} did not gain a valid new entry in the same range.`,
      '',
      'What is wrong with the receipt:',
      ...receipt.problems.map((p) => `  - ${p}`),
      '',
      'The CI corpus cannot verify the AUC value — it never has the corpus text',
      '(local-only, copyright-restricted). What it CAN verify is that a human ran',
      'the local measurement and recorded it. That step is missing here.',
      '',
      'Fix:',
      '  1. Run the local measurement against your corpus, e.g.:',
      '       REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run measure-real',
      '     (or, for the full P1 partition sweep:',
      '       CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=test)',
      `  2. Append a new entry to ${RECEIPT_PATH} using its §3 template —`,
      '     a `### <YYYY-MM-DD> — <reason>` heading, then date, git SHA (or the',
      '     baseline tree compared against), exact command, measured AUC-24 (and',
      '     any flag-run AUCs), corpus fingerprint, and a Runner attestation line.',
      '  3. Commit the receipt alongside the scoring change (same range).',
      '',
      'The entry must describe a run that HAPPENED: the SHA it cites has to exist',
      'in this repository, and its Command/attestation fields must not describe a',
      'simulated, hypothetical, or estimated measurement. If your change genuinely',
      'moves no score, say that plainly and cite the evidence that shows it (the',
      'two 2026-08-21 output-identity entries are the worked example) — an honest',
      '"no measurement, here is why" entry passes; a fabricated measurement does not.',
      '',
      'If this change does not actually affect scoring (a comment, a type-only',
      'refactor, a doc string), consider whether the touched file truly belongs',
      'on the scoring path — see the reasoning documented at the top of',
      'scripts/check-scoring-receipt.mjs before assuming this is a false positive.',
      '='.repeat(72),
      '',
    ].join('\n'),
  );
  process.exit(1);
}

// Run only when invoked as a script — tests/core/scoring-receipt-guard.test.ts
// imports validateEntry/extractEntries/resolveDefaultRange from this file.
const invokedDirectly = Boolean(process.argv[1])
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) main();

export { resolveDefaultRange, classify, getChangedFiles, RECEIPT_PATH };
