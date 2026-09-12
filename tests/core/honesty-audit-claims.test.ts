// honesty-audit.mjs claims-register lane — behavioral tests (retrospective
// finding #8, docs/CLAIMS_REGISTER.md).
//
// WHY A REAL TEMP CHECKOUT: the script's claims lane walks the filesystem
// under process.cwd() (its ROOT) and, for the "unsupported claim survives
// verbatim" and "curated phrase unregistered" checks, needs a register file
// plus surface files to scan. A plain (non-git) temp directory exercises the
// script's own git-unavailable fallback path (listTrackedFiles()'s catch ->
// walk(ROOT)), which is real behavior worth covering, not a mock.
//
// The second half of this file runs the real script against the real repo
// root and asserts it currently passes — the "does the actual tree pass"
// half the task asked for, no fixture needed since the repo itself is the
// fixture.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/honesty-audit.mjs');

function writeFile(dir: string, relPath: string, content: string): void {
  const abs = path.join(dir, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

function runAudit(cwd: string) {
  return spawnSync('node', [SCRIPT_PATH], { cwd, encoding: 'utf8' });
}

/** A minimal fixture tree: just enough for honesty-audit.mjs's file walk
 *  (collectFiles()) and the claims lane to have something to scan without
 *  errors — an empty src/ dir, a clean claims register, and the individually
 *  named root files it looks for (all optional; omitted here to keep the
 *  fixture small — collectFiles() skips missing optional files silently). */
function makeBaseFixture(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'honesty-audit-claims-'));
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  writeFile(
    dir,
    'docs/CLAIMS_REGISTER.md',
    [
      '# Claims Register (fixture)',
      '',
      '## Register',
      '',
      '| # | Claim (verbatim) | Where it appears | Evidence type | Evidence pointer | Status |',
      '|---|---|---|---|---|---|',
      '| 1 | The tool never misses a beat. | src/App.tsx:1 | human-agreement | NONE | retired |',
      '',
    ].join('\n'),
  );
  return dir;
}

describe('honesty-audit.mjs — claims-register lane', () => {
  it('fails when a retired claim reappears verbatim in the tree', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const tagline = "The tool never misses a beat.";\n');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'audit must fail when a retired claim is reintroduced');
      assert.match(
        res.stderr + res.stdout,
        /claims-register-row-1-retired/,
        'failure must name the offending register row',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when an unregistered curated empirical-claim phrase lands in src/**', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(
        dir,
        'src/components/Fake.tsx',
        'export const copy = "Reads it as accurately as a professional reader would.";\n',
      );
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'audit must fail on an unregistered empirical-claim phrase');
      assert.match(
        res.stderr + res.stdout,
        /unregistered-empirical-claim-phrase/,
        'failure must name the phrase-lane violation',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when a supported row points at evidence that does not exist on disk', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(
        dir,
        'docs/CLAIMS_REGISTER.md',
        [
          '# Claims Register (fixture)',
          '',
          '## Register',
          '',
          '| # | Claim (verbatim) | Where it appears | Evidence type | Evidence pointer | Status |',
          '|---|---|---|---|---|---|',
          '| 1 | Two runs on the same input are byte-identical. | src/App.tsx:1 | measured-in-repo | tests/core/does-not-exist.test.ts | supported |',
          '',
        ].join('\n'),
      );
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'audit must fail when supported evidence does not resolve');
      assert.match(
        res.stderr + res.stdout,
        /claims-register-evidence-missing/,
        'failure must name the missing-evidence violation',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes a clean fixture tree with no claim violations', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const tagline = "Deterministic coverage, no LLM judge.";\n');
      const res = runAudit(dir);
      assert.equal(res.status, 0, `clean fixture must pass:\n${res.stdout}\n${res.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ── Invariant 4: line anchors (2026-09-12, adversarial finding 11) ───────
  // The register's enforcement used to check only that an evidence PATH exists.
  // A `path:line` pointing at the wrong code passed, and did: three files cited
  // server/nvm/analyze/doctor.ts:1892-1898 for the project's central negative
  // finding about its own score while that comment had moved to 2092-2093, and a
  // prior audit had already recorded the same anchor "FIXED in both places" — in
  // the two places it looked at. These four cases are the mechanism that can see
  // it, each driven through the real script in a temp tree.

  /** A register fixture whose one row cites `pointer` as its evidence. */
  function fixtureWithPointer(dir: string, pointer: string): void {
    writeFile(
      dir,
      'docs/CLAIMS_REGISTER.md',
      [
        '# Claims Register (fixture)',
        '',
        '## Register',
        '',
        '| # | Claim (verbatim) | Where it appears | Evidence type | Evidence pointer | Status |',
        '|---|---|---|---|---|---|',
        // The appears cell names NO line on purpose: since round 2 that column
        // is anchored too, and these cases are about the evidence column.
        `| 1 | Two runs on the same input are byte-identical. | src/App.tsx | measured-in-repo | ${pointer} | supported |`,
        '',
      ].join('\n'),
    );
  }

  /** Eight lines, with the quotable one at line 4. */
  const EVIDENCE_FILE = [
    'line one',
    'line two',
    'line three',
    'assert.equal(a.contentHash, b.contentHash); // THE ANCHORED ASSERTION',
    'line five',
    'line six',
    'line seven',
    'line eight',
    '',
  ].join('\n');

  it('A MOVED LINE FAILS THE LANE — the case the path-only check could not see', () => {
    // The whole point. The anchored text is at line 4; the pointer says line 20,
    // which exists in the file but is seven lines past the anchor's window.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', `${EVIDENCE_FILE}${'filler\n'.repeat(20)}`);
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:20 anchor:"THE ANCHORED ASSERTION"');
      const res = runAudit(dir);
      assert.notEqual(
        res.status,
        0,
        'a pointer whose line moved must FAIL the lane — this is finding 11 and the only case '
        + `the pre-2026-09-12 existence check could not detect:\n${res.stdout}\n${res.stderr}`,
      );
      const out = res.stderr + res.stdout;
      assert.match(out, /claims-register-line-anchor-mismatch/);
      // And it must say WHICH failure this is: the code moved, so the fix is the
      // line number, not the quoted text.
      assert.match(out, /is at line 4, outside the \+\/-3 window around 20 — the code MOVED/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the SAME pointer passes once the line number is right, and within +/-3 of it', () => {
    // The other direction: without this, "fails on a moved line" is satisfied by
    // a lane that fails on everything.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', EVIDENCE_FILE);
      for (const line of [1, 4, 7]) {
        fixtureWithPointer(dir, `tests/core/evidence.test.ts:${line} anchor:"THE ANCHORED ASSERTION"`);
        const res = runAudit(dir);
        assert.equal(
          res.status,
          0,
          `line ${line} is within +/-3 of the anchor at line 4 and must pass:\n${res.stdout}\n${res.stderr}`,
        );
      }
      // One line outside the window on either side, and it fails.
      for (const line of [8]) {
        fixtureWithPointer(dir, `tests/core/evidence.test.ts:${line} anchor:"THE ANCHORED ASSERTION"`);
        assert.notEqual(runAudit(dir).status, 0, `line ${line} is outside the window and must fail`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a line pointer with NO anchor fails — an unanchored line number is unverifiable', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', EVIDENCE_FILE);
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:4');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'a bare path:line must now fail');
      assert.match(res.stderr + res.stdout, /claims-register-line-pointer-without-anchor/);
      // A pointer with NO line is still fine — invariant 4 applies only to lines.
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts');
      assert.equal(runAudit(dir).status, 0, 'a path-only pointer must still pass');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a comma list needs ONE ANCHOR PER LINE, not one anchor for a 400-line span', () => {
    // The design trap this avoids. `1133,1528` treated as a single span would
    // make the window 400 lines wide, so a single anchor anywhere in between
    // would "verify" both — which checks nothing.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(
        dir,
        'tests/core/evidence.test.ts',
        [...Array(40)].map((_, i) => (i === 3 ? 'FIRST ANCHOR' : i === 29 ? 'SECOND ANCHOR' : `filler ${i}`)).join('\n'),
      );
      // One anchor, two cited lines: the second location is unverified -> FAIL.
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:4,30 anchor:"FIRST ANCHOR"');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'one anchor cannot cover two separate cited lines');
      assert.match(res.stderr + res.stdout, /evidence\.test\.ts:30/);
      // Both anchors present -> PASS.
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:4,30 anchor:"FIRST ANCHOR" anchor:"SECOND ANCHOR"');
      assert.equal(
        runAudit(dir).status,
        0,
        'one anchor per cited line must pass',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('A VACUOUS ANCHOR FAILS — "e" is not an anchor (round-2 review item 3)', () => {
    // The round-1 rule imposed no minimum: `anchor:"e"` satisfied
    // `String.includes` on almost any line, so a future row could satisfy the
    // invariant with a single character. The reviewer planted exactly that on
    // row 22 and the lane stayed green. Twelve characters is the floor; the
    // register's real anchors run 12-49.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', EVIDENCE_FILE);
      for (const weak of ['e', 'THE', 'ANCHORED AS']) {
        fixtureWithPointer(dir, `tests/core/evidence.test.ts:4 anchor:"${weak}"`);
        const res = runAudit(dir);
        assert.notEqual(res.status, 0, `anchor:"${weak}" must be rejected as too weak`);
        assert.match(res.stderr + res.stdout, /claims-register-anchor-not-distinctive/);
        assert.match(res.stderr + res.stdout, /at least 12/);
      }
      // Twelve characters exactly is accepted — the boundary is stated, not
      // approximate.
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:4 anchor:"THE ANCHORED"');
      assert.equal(runAudit(dir).status, 0, 'a 12-character anchor is at the floor and must pass');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('AN AMBIGUOUS ANCHOR FAILS — it must match exactly one line in its own window', () => {
    // The other half of distinctiveness. A 12-character anchor that appears on
    // three lines of the +/-3 window pins nothing; length alone is not enough.
    // This is not hypothetical — it caught `anchor:"report.plainSummary"` in
    // this repository's own register on the rule's first run.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(
        dir,
        'tests/core/evidence.test.ts',
        [
          'line one',
          'assert.match(report.plainSummary, /a/);',
          'assert.match(report.plainSummary, /b/);',
          'assert.match(report.plainSummary, /c/);',
          'line five',
        ].join('\n'),
      );
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:3 anchor:"report.plainSummary"');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'an anchor matching three lines of its window must be rejected');
      assert.match(res.stderr + res.stdout, /matches 3 lines in the \+\/-3 window/);
      // Quoting more of the line makes it unique again.
      fixtureWithPointer(dir, 'tests/core/evidence.test.ts:3 anchor:"report.plainSummary, /b/"');
      assert.equal(runAudit(dir).status, 0, 'a distinctive anchor in the same window must pass');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ── Both columns (round-2 review item 2) ──────────────────────────────────
  // Round 1 checked the evidence column only and exempted "Where it appears"
  // as "historical by design". That was true of the three retired rows and
  // false of the fifteen live ones, which were stale by 6 to 1550 lines.

  /** A register fixture whose one row cites `appears` in the location column. */
  function fixtureWithAppears(dir: string, appears: string, status = 'supported'): void {
    writeFile(
      dir,
      'docs/CLAIMS_REGISTER.md',
      [
        '# Claims Register (fixture)',
        '',
        '## Register',
        '',
        '| # | Claim (verbatim) | Where it appears | Evidence type | Evidence pointer | Status |',
        '|---|---|---|---|---|---|',
        `| 1 | Two runs on the same input are byte-identical. | ${appears} | measured-in-repo | tests/core/evidence.test.ts | ${status} |`,
        '',
      ].join('\n'),
    );
  }

  it('A STALE "Where it appears" LINE NOW FAILS — the column is no longer exempt', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', `${EVIDENCE_FILE}${'filler\n'.repeat(20)}`);
      // Anchored, but at the wrong line — the exact shape of all 15 real cases.
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts:20 anchor:"THE ANCHORED ASSERTION"');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0, 'a stale appears-column line must now fail');
      const out = res.stderr + res.stdout;
      assert.match(out, /row 1 \(where it appears\)/, 'the message must name the COLUMN, not just the row');
      assert.match(out, /the code MOVED/);
      // Right line, same anchor: clean.
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts:4 anchor:"THE ANCHORED ASSERTION"');
      assert.equal(runAudit(dir).status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an UNANCHORED appears pointer fails, and a path-only one still passes', () => {
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', EVIDENCE_FILE);
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts:4');
      const res = runAudit(dir);
      assert.notEqual(res.status, 0);
      assert.match(res.stderr + res.stdout, /row 1 \(where it appears\).*carries no anchor/s);
      // The overwhelming majority of appears cells name no line at all (114 of
      // them in the real register). Those are untouched by this invariant.
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts (the DraftRankLine block)');
      assert.equal(runAudit(dir).status, 0, 'an appears pointer with no line must still pass');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a RETIRED row\'s appears line is exempt — and its evidence column is not', () => {
    // The carve-out, asserted so it stays exactly as narrow as its stated
    // reason. A retired row records where wording USED to be, so its location
    // is expected not to resolve; that says nothing about its evidence cell.
    const dir = makeBaseFixture();
    try {
      writeFile(dir, 'src/App.tsx', 'export const x = 1;\n');
      writeFile(dir, 'tests/core/evidence.test.ts', `${EVIDENCE_FILE}${'filler\n'.repeat(20)}`);
      // Same stale, unanchored pointer that fails above — exempt when retired.
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts:20', 'retired');
      assert.equal(
        runAudit(dir).status,
        0,
        'a retired row\'s location is historical by design and must stay exempt',
      );
      // `supported (qualified)` is NOT retired, so it is checked.
      fixtureWithAppears(dir, 'tests/core/evidence.test.ts:20', 'supported (qualified)');
      assert.notEqual(
        runAudit(dir).status,
        0,
        'only retired/unsupported rows are exempt — a qualified row is still a live claim',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('every `path:line` pointer in the REAL register, in BOTH columns, carries a resolving anchor', () => {
    // The real-tree half, stated as its own assertion so a reader of this file
    // can see that the 11 anchored rows are checked, not merely permitted. The
    // full audit's pass below subsumes it; this one names the count so a silent
    // drop of the invariant (or of every anchored pointer) is visible.
    const register = readFileSync(path.join(REPO_ROOT, 'docs/CLAIMS_REGISTER.md'), 'utf8');
    // TABLE ROWS ONLY. The rules section above the table quotes `anchor:"e"` and
    // `anchor:"…"` as examples of what the invariant rejects; counting those
    // would make this assertion pass on prose and fail on anchors.
    const rowLines = register
      .split('\n')
      .filter((line) => /^\|\s*\d+\s*\|/.test(line.trim()));
    const anchored = rowLines.join('\n').match(/anchor:"[^"]+"/g) ?? [];
    assert.ok(
      anchored.length >= 31,
      `the register carries only ${anchored.length} anchor:"…" pointers. Eleven evidence pointers `
      + 'cited a line when invariant 4 landed (two needing two anchors each) and 18 appears-column '
      + 'pointers joined them the same day, so a smaller number means anchors were removed rather '
      + 'than rows.',
    );
    // And none of them is a token short enough to match anything.
    for (const a of anchored) {
      const text = a.slice('anchor:"'.length, -1);
      assert.ok(text.trim().length >= 12, `the register carries a ${text.length}-character anchor: ${a}`);
    }
  });

  it('the current repo tree passes the full audit, including the claims lane', () => {
    const res = runAudit(REPO_ROOT);
    assert.equal(
      res.status,
      0,
      `honesty-audit must pass on the real tree:\n${res.stdout}\n${res.stderr}`,
    );
    assert.match(res.stdout, /claims register/, 'clean-run banner must mention the claims register');
  });
});
