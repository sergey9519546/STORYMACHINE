// The missing path: rewriting a PENDING receipt entry IN PLACE.
//
// WHY THIS EXISTS: `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-11 addendum
// and `docs/brain/Owner/Owner - R5 Measurement and Merge.md` both document
// that closing the receipt gate after a real corpus run takes a SPECIFIC
// edit — each PENDING entry has to be REWRITTEN IN PLACE into a measured
// one, because `checkReceiptForRange` validates EVERY entry the range adds
// and one surviving PENDING entry fails it regardless of what sits beside
// it. `tests/core/scoring-receipt-guard.test.ts`,
// `tests/core/check-scoring-receipt.test.ts` and
// `tests/scripts/receipt-conversion.test.ts` cover "append a brand-new
// PENDING entry" thoroughly, but none of them drives the actual REWRITE
// path — a range whose diff never re-adds the entry's `###` heading line at
// all, because the heading was left untouched while the fields under it
// changed. That is exactly the shape `extractEntries()` cannot see: its own
// docstring says a line added before the first recognized heading "belongs
// to no entry and is ignored".
//
// This file drives that path through the REAL CLI, exactly as
// `tests/core/scoring-receipt-guard.test.ts` Part 2/3 do, over a repo shaped
// like the owner's actual conversion: a `before` commit that FILES the
// PENDING entry, and an `after` commit — the one range under test — that
// rewrites it.
//
// A REAL BUG WAS FOUND AND FIXED WHILE WRITING THIS FILE (2026-09-19,
// docs/audits/2026-09-19-receipt-gate-inplace/): an entry rewritten in place
// without touching its own heading line was invisible to the gate. Alone,
// that fails safe (no entry is recognized at all, so the generic "gained no
// new entry" error fires) — but the moment a SECOND, genuinely well-formed
// entry sits anywhere else in the same range, `extractEntries()` finds only
// that second entry, validates it clean, and the whole range reports
// `ok: true` — a scoring-path range where an entry still reading PENDING in
// its own heading was never once passed to `validateEntry`. Case C-danger
// below pins that false pass shut. The fix adds a second, line-number-based
// detector (`entriesModifiedInPlace` in scripts/check-scoring-receipt.mjs)
// that finds entries a diff's hunks touch even when their heading line
// itself was not part of the diff.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const guardScript = path.join(repoRoot, 'scripts/check-scoring-receipt.mjs');

const RECEIPT_REL = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';
const DOCTOR_REL = 'server/nvm/analyze/doctor.ts';

function git(dir: string, args: string[]) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function writeFile(root: string, rel: string, contents: string) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
}

function mkRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-inplace-'));
  git(dir, ['init', '--quiet', '--initial-branch=main']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Receipt Inplace Test']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  return dir;
}

function commitAll(dir: string, msg: string): string {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', msg]);
  return git(dir, ['rev-parse', 'HEAD']);
}

// Same env hygiene as scoring-receipt-guard.test.ts: this test itself runs
// inside a CI job, so the outer process.env already carries a real push
// event's GITHUB_* keys pointing at an unrelated commit. Strip them before
// every guard invocation so a test that does not set one of them does not
// silently inherit it.
const PUSH_EVENT_ENV_KEYS = ['PUSH_BEFORE_SHA', 'GITHUB_EVENT_PATH', 'GITHUB_EVENT_NAME', 'GITHUB_SHA'];
function baseGuardEnv(): Record<string, string | undefined> {
  const base = { ...process.env };
  for (const key of PUSH_EVENT_ENV_KEYS) delete base[key];
  return base;
}

function runGuard(dir: string, before: string, after: string, extraArgs: string[] = []) {
  return spawnSync(process.execPath, [guardScript, ...extraArgs], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...baseGuardEnv(), CI: '1', GITHUB_EVENT_NAME: 'push',
      PUSH_BEFORE_SHA: before, GITHUB_SHA: after,
    },
  });
}

// Field bodies shaped after the real 2026-08-21 W1/W2 entry's field set
// (Date, Git SHA, Command, Measured AUC-24, Corpus fingerprint, Runner
// attestation) — copied down to the label choice, per the lane brief.
const fieldsPending = (sha: string) => [
  '- **Date:** 2026-09-19',
  `- **Git SHA:** \`${sha}\``,
  '- **Command:** pending owner measurement',
  '- **Measured AUC-24:** pending owner measurement',
  '- **Corpus fingerprint:** pending owner measurement',
  '- **Runner attestation:** "pending owner measurement — no real-corpus measurement has been run yet."',
  '',
];

const fieldsMeasured = (sha: string) => [
  '- **Date:** 2026-09-19',
  `- **Git SHA:** \`${sha}\``,
  '- **Command:** `REAL_SCRIPT_CORPUS_DIR=/corpus npm run measure-real`',
  '- **Measured AUC-24:** 0.731',
  '- **Corpus fingerprint:** 71-script manifest',
  '- **Runner attestation:** "maintainer measured this locally on 2026-09-19."',
  '',
];

const PENDING_HEADING = '### 2026-09-19 — LANE RECEIPT-GATE-INPLACE: fixture scoring change — PENDING OWNER MEASUREMENT';
const MEASURED_HEADING = '### 2026-09-19 — LANE RECEIPT-GATE-INPLACE: fixture scoring change — MEASURED 2026-09-19';

function entryBlock(heading: string, fields: string[]): string {
  return ['', heading, '', ...fields].join('\n');
}

/** Case (a)/base: a repo with a scoring-path file and a PENDING entry ALREADY
 *  FILED — the state every other case in this file rewrites `after` from. */
function fileBaseWithPendingEntry(): { dir: string; before: string } {
  const dir = mkRepo();
  writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
  writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
  const initSha = commitAll(dir, 'init, no entry yet');
  writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(PENDING_HEADING, fieldsPending(initSha))}`);
  const before = commitAll(dir, 'file the PENDING entry (this is the state the owner measures from)');
  return { dir, before };
}

describe('receipt gate — rewriting a PENDING entry IN PLACE', () => {
  it('(b) heading edited to drop PENDING + every required field measured — PASSES', () => {
    const { dir, before } = fileBaseWithPendingEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fieldsMeasured(before))}`);
      const after = commitAll(dir, 'in-place rewrite: heading + all fields measured');

      const r = runGuard(dir, before, after);
      assert.equal(r.status, 0, `a fully in-place-converted entry must pass.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /gained a well-formed new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(c) heading left UNCHANGED (still literally says PENDING) even though every field was measured — FAILS', () => {
    const { dir, before } = fileBaseWithPendingEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      // Heading string is byte-identical to the base commit's — git's diff
      // will never emit it as a changed line, which is exactly the gap this
      // lane closes: an in-place rewrite is not "safe" merely because it
      // still fails; it must fail by NAMING the pending entry, not by a
      // generic "no entry found" message that could just as easily describe
      // an unrelated typo.
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(PENDING_HEADING, fieldsMeasured(before))}`);
      const after = commitAll(dir, 'in-place rewrite: fields measured, heading left saying PENDING');

      const r = runGuard(dir, before, after);
      assert.equal(r.status, 1, `a heading still reading PENDING must fail the range.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stderr, /PENDING ENTRY/, 'must name the pending tell, not a generic "no entry" message');
      assert.match(r.stderr, new RegExp(PENDING_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'must quote the offending heading');
      assert.match(r.stderr, /the entry heading contains "PENDING"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(d) heading edited to drop PENDING, but ONE required field still literally says "pending owner measurement" — FAILS naming that field', () => {
    const { dir, before } = fileBaseWithPendingEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      const fields = fieldsMeasured(before).map((line) => (
        line.startsWith('- **Corpus fingerprint:**')
          // Rewritten (so it is part of the diff and reaches the validator
          // through either detector), but the author left the placeholder
          // phrase in instead of a real value — the realistic slip this
          // case exists to catch.
          ? '- **Corpus fingerprint:** pending owner measurement (still finalizing the manifest count)'
          : line
      ));
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fields)}`);
      const after = commitAll(dir, 'in-place rewrite: heading measured, one field still says pending');

      const r = runGuard(dir, before, after);
      assert.equal(r.status, 1, `a leftover pending field value must fail the range.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stderr, /PENDING ENTRY/);
      assert.match(r.stderr, /the \*\*Corpus fingerprint\*\* field contains "PENDING"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(e) entry rewritten in place with NO scoring-path file change in the range — PASSES (nothing to receipt)', () => {
    const { dir, before } = fileBaseWithPendingEntry();
    try {
      // doctor.ts is untouched this time — only the ledger changes.
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fieldsMeasured(before))}`);
      const after = commitAll(dir, 'doc-only in-place rewrite; no scoring-path file touched');

      const r = runGuard(dir, before, after);
      assert.equal(r.status, 0, `a doc-only range must pass regardless of the entry's shape.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stdout, /no scoring-path files changed/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(f) a well-formed entry appended BESIDE a surviving PENDING entry, both new to this range — FAILS (UNIFIED_STATE\'s documented case)', () => {
    // Unlike (a)-(e), the PENDING entry itself is NEW to this range (filed
    // in the same push, not carried over from `before`) — the exact shape
    // docs/UNIFIED_STATE_2026-09-02.md describes: "confirmed by running the
    // gate's own exported extractEntries/validateEntry over the stack's
    // three entries with a well-formed measured entry appended (4 entries,
    // still 3 problems)". checkReceiptForRange validates EVERY entry a range
    // adds, so the surviving PENDING one fails it regardless of what sits
    // beside it — this is the base case that makes "rewrite in place, don't
    // append beside" the only closing move, which is what (b) is.
    const dir = mkRepo();
    writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
    writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
    const before = commitAll(dir, 'init, no entries yet');

    writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
    const pending = entryBlock(PENDING_HEADING, fieldsPending(before));
    const good = entryBlock('### 2026-09-19 — LANE Q: a second, unrelated, well-formed change', fieldsMeasured(before));
    writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${pending}${good}`);
    const after = commitAll(dir, 'file a PENDING entry AND append a well-formed one beside it, same range');

    try {
      const r = runGuard(dir, before, after);
      assert.equal(r.status, 1, `appending beside a surviving PENDING entry must still fail.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
      assert.match(r.stderr, /PENDING ENTRY/);
      assert.match(r.stderr, new RegExp(PENDING_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------
  // The bug found while building the above: an entry rewritten in place
  // WITHOUT touching its own heading is invisible to extractEntries(), and
  // — the dangerous direction — that invisibility becomes a FALSE PASS the
  // moment any other well-formed entry exists in the same range, because
  // checkReceiptForRange only ever validates entries it can see. Fixed in
  // scripts/check-scoring-receipt.mjs by entriesModifiedInPlace(), which
  // finds an entry's span by line-number overlap against the diff's hunks
  // in the target tree, independent of whether the heading itself changed.
  // ---------------------------------------------------------------------
  it('C-DANGER: a still-PENDING entry (heading untouched, body rewritten) sitting beside an unrelated well-formed entry must NOT false-pass the range', () => {
    const { dir, before } = fileBaseWithPendingEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      // P: heading byte-identical to `before` (still PENDING), body fields
      // rewritten to look measured. Q: a genuinely new, unrelated,
      // well-formed entry appended right after P.
      const pRewritten = entryBlock(PENDING_HEADING, fieldsMeasured(before));
      const q = entryBlock('### 2026-09-19 — LANE Q UNRELATED: a second, genuinely well-formed change', fieldsMeasured(before));
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${pRewritten}${q}`);
      const after = commitAll(dir, 'rewrite P body in place (heading untouched) AND append well-formed Q');

      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        1,
        'a still-PENDING entry must not be laundered past the gate by an unrelated well-formed entry in the '
        + `same range (the exact false pass this lane\'s fix closes).\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stderr, /PENDING ENTRY/);
      assert.match(r.stderr, new RegExp(PENDING_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'must name P specifically, not just fail generically');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Regression guard for the fix's own mechanism: a hunk that only inserts a
  // brand-new entry right after an UNTOUCHED, already well-formed one must
  // not be misread as an in-place edit of the entry before it (the false
  // FAIL the naive line-overlap fix produced before the trailing-blank-line
  // trim was added — see entriesWithSpans()'s `contentEnd` in
  // scripts/check-scoring-receipt.mjs).
  it('appending a new entry right after an untouched, already-valid entry does not false-fail on the untouched one', () => {
    const dir = mkRepo();
    writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
    const existingGood = entryBlock(
      '### 2026-09-01 — EARLIER LANE: already-measured, untouched by this range',
      fieldsMeasured('0'.repeat(40)),
    );
    writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${existingGood}`);
    const base = commitAll(dir, 'init with one pre-existing, valid, untouched entry');

    writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
    const newGood = entryBlock('### 2026-09-19 — NEW LANE: freshly appended, well-formed', fieldsMeasured(base));
    writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${existingGood}${newGood}`);
    const after = commitAll(dir, 'append a new valid entry beside an untouched valid one');

    try {
      const r = runGuard(dir, base, after);
      assert.equal(
        r.status,
        0,
        'appending after an untouched, already-valid entry must not drag that entry into re-validation.'
        + `\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** Case base for the existence-test regression below: a repo with a
 *  scoring-path file and a fully MEASURED, well-formed entry ALREADY FILED —
 *  the state each attack edits IN PLACE without adding anything new. */
function fileBaseWithMeasuredEntry(): { dir: string; before: string } {
  const dir = mkRepo();
  writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
  writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
  const initSha = commitAll(dir, 'init, no entry yet');
  writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fieldsMeasured(initSha))}`);
  const before = commitAll(dir, 'file a well-formed, fully measured entry (the state later edits rewrite in place)');
  return { dir, before };
}

// REGRESSION (2026-09-19, docs/audits/2026-09-19-receipt-gate-inplace/,
// introduced by the in-place detector added earlier the same day): an
// earlier version of checkReceiptForRange() folded `inPlace` into the
// EXISTENCE test (`entries.length === 0 && inPlace.length === 0`).
// `entriesModifiedInPlace` finds an entry by hunk line-number OVERLAP with no
// requirement about what changed inside it, so ANY edit inside ANY old entry
// satisfied "this range added a receipt entry" — even a one-word typo fix or
// an appended Note bullet, the exact move the gate's own error string
// forbids. The branch printed, untruthfully, "gained a well-formed new entry
// in the same range. OK." Fixed: `inPlace` entries contribute VALIDATION,
// never EXISTENCE, and their validation runs BEFORE the existence check in
// BOTH modes (structuralOnly included), so a still-PENDING in-place rewrite
// still fails by name (see C-DANGER above) while a clean in-place edit with
// no new entry correctly fails with "gained no new entry".
// ---------------------------------------------------------------------------
// A separator RULE line (`---`, `***`) after an entry is not part of its
// span — docs/audits/2026-09-20-per-pass-diagnostics/README.md §7.
//
// `entriesWithSpans()`'s `contentEnd` used to trim only trailing BLANK lines
// before the overlap test. A `---` rule between two entries (the ledger's
// own separator convention) is not blank, so it stayed inside the PRECEDING
// entry's span, an honest append's hunk overlapped it, and
// `entriesModifiedInPlace()` re-validated that historical entry against
// TODAY's field rules — failing the real 2026-09-12 entry for writing
// `**Commands (…)**` instead of `**Command**`. Fixed by trimming trailing
// separator lines the same way blank lines are trimmed.
// ---------------------------------------------------------------------------

// A field set shaped after the real 2026-09-12 entry's own convention
// (`**Commands (all run in this worktree…)**`, PLURAL) — the exact phrasing
// that does not match REQUIRED_FIELDS's singular `**Command**` pattern, so
// re-validating this entry today fails it on a field it never claimed to
// have in the first place.
const oldFieldsPluralCommands = (sha: string) => [
  '- **Date:** 2026-09-12',
  `- **Git SHA:** \`${sha}\``,
  '- **Commands (all run in this worktree unless noted):** `npm run measure-real`',
  '- **Measured AUC-24:** 0.700',
  '- **Corpus fingerprint:** 50-script manifest',
  '- **Runner attestation:** "maintainer measured this locally on 2026-09-12."',
  '',
];
const OLD_PLURAL_COMMANDS_HEADING =
  '### 2026-09-12 — LANE OLD: pre-existing entry with a plural Commands field (historical, must never be re-validated)';

/** A repo with a scoring-path file and one historical entry ALREADY FILED
 *  whose field set would fail today's REQUIRED_FIELDS check if re-validated
 *  (plural "Commands" instead of "Command") — the exact shape of the real
 *  2026-09-12 ledger entry. `oldBlock` is the entry's rendered text, needed
 *  verbatim by callers that append after it without re-touching it. */
function fileBaseWithOldPluralCommandsEntry(): { dir: string; before: string; oldBlock: string } {
  const dir = mkRepo();
  writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
  writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
  const initSha = commitAll(dir, 'init, no entry yet');
  const oldBlock = entryBlock(OLD_PLURAL_COMMANDS_HEADING, oldFieldsPluralCommands(initSha));
  writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${oldBlock}`);
  const before = commitAll(dir, 'file the historical entry with a plural Commands field (pre-existing convention)');
  return { dir, before, oldBlock };
}

describe('receipt gate — a separator rule after an entry is not part of its span', () => {
  it('(g) a well-formed new entry appended after a `---` rule following an older entry that would fail today\'s validation — PASSES', () => {
    const { dir, before, oldBlock } = fileBaseWithOldPluralCommandsEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      const newBlock = entryBlock(MEASURED_HEADING, fieldsMeasured(before));
      // The old entry is byte-identical to `before` — untouched. Only the
      // rule and the new entry are added.
      const content = `# Measurement Receipts Ledger\n${oldBlock}---\n${newBlock}`;
      writeFile(dir, RECEIPT_REL, content);
      const after = commitAll(dir, 'append a well-formed new entry after a --- rule; old entry untouched');

      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        0,
        'an honest append separated by a --- rule must not re-fail an untouched historical entry.'
        + `\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stdout, /gained a well-formed new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(h) the same, separated by a `***` rule instead — PASSES', () => {
    const { dir, before, oldBlock } = fileBaseWithOldPluralCommandsEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      const newBlock = entryBlock(MEASURED_HEADING, fieldsMeasured(before));
      const content = `# Measurement Receipts Ledger\n${oldBlock}***\n${newBlock}`;
      writeFile(dir, RECEIPT_REL, content);
      const after = commitAll(dir, 'append a well-formed new entry after a *** rule; old entry untouched');

      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        0,
        'an honest append separated by a *** rule must not re-fail an untouched historical entry.'
        + `\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stdout, /gained a well-formed new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(i) a GENUINE in-place edit to that older entry\'s field line, beside the same rule, no new entry — still FAILS (the detector still sees real edits)', () => {
    const dir = mkRepo();
    writeFile(dir, DOCTOR_REL, 'export const health = 1;\n');
    writeFile(dir, RECEIPT_REL, '# Measurement Receipts Ledger\n');
    const initSha = commitAll(dir, 'init, no entry yet');
    const oldBlockBefore = entryBlock(OLD_PLURAL_COMMANDS_HEADING, oldFieldsPluralCommands(initSha));
    writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${oldBlockBefore}---\n`);
    const before = commitAll(dir, 'file the historical entry, already followed by a --- rule');

    writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
    const editedFields = oldFieldsPluralCommands(initSha).map((line) => (
      line.startsWith('- **Corpus fingerprint:**')
        ? '- **Corpus fingerprint:** 51-script manifest (recount)'
        : line
    ));
    const oldBlockAfter = entryBlock(OLD_PLURAL_COMMANDS_HEADING, editedFields);
    writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${oldBlockAfter}---\n`);
    const after = commitAll(dir, 'genuine in-place edit to the old entry\'s field line, no new entry added, rule kept');

    try {
      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        1,
        'a genuine field-line edit inside an entry must still fail the range even when a --- rule sits '
        + `right after it — the separator trim must not swallow real content changes.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('receipt gate — REGRESSION: an in-place edit must never count as a NEW entry (existence test)', () => {
  it('ATTACK A: a one-word typo fix inside a previous, valid, measured entry\'s Corpus fingerprint line, no new entry — must FAIL', () => {
    const { dir, before } = fileBaseWithMeasuredEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      // Only the corpus fingerprint text changes (one-word typo fix); the
      // heading and every other field are byte-identical to `before`. No new
      // entry is added anywhere in this range.
      const fixedFields = fieldsMeasured(before).map((line) => (
        line.startsWith('- **Corpus fingerprint:**')
          ? '- **Corpus fingerprint:** 71-script manifest (typo fixed)'
          : line
      ));
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fixedFields)}`);
      const after = commitAll(dir, 'typo fix inside a previous valid entry, plus an unrelated scoring change');

      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        1,
        'a typo fix inside an existing entry must not be read as a receipt for a NEW scoring change '
        + `(the 2026-09-19 false-pass regression).\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stderr, /gained no new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ATTACK B: one appended "- **Note:** …" bullet on a previous valid entry, no new entry — must FAIL', () => {
    const { dir, before } = fileBaseWithMeasuredEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      const fields = [...fieldsMeasured(before)];
      fields.splice(fields.length - 1, 0, '- **Note:** clarifying an already-measured entry, not a new measurement.');
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fields)}`);
      const after = commitAll(dir, 'append a Note bullet to a previous valid entry, plus an unrelated scoring change');

      const r = runGuard(dir, before, after);
      assert.equal(
        r.status,
        1,
        'appending a bullet to an existing entry must not be read as a receipt for a NEW scoring change '
        + `(the exact move the gate's own error string forbids).\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stderr, /gained no new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ATTACK B, --structural-only mode (release.yml\'s whole-window check): the same append must still FAIL', () => {
    const { dir, before } = fileBaseWithMeasuredEntry();
    try {
      writeFile(dir, DOCTOR_REL, 'export const health = 2;\n');
      const fields = [...fieldsMeasured(before)];
      fields.splice(fields.length - 1, 0, '- **Note:** clarifying an already-measured entry, not a new measurement.');
      writeFile(dir, RECEIPT_REL, `# Measurement Receipts Ledger\n${entryBlock(MEASURED_HEADING, fields)}`);
      const after = commitAll(dir, 'append a Note bullet to a previous valid entry (structural-only range)');

      const r = runGuard(dir, before, after, ['--structural-only']);
      assert.equal(
        r.status,
        1,
        'structural-only mode (release.yml) must not be fooled by an in-place append either — it still '
        + `requires a NEW entry.\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
      assert.match(r.stderr, /gained no new entry/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
