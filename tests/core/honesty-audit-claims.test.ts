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
        `| 1 | Two runs on the same input are byte-identical. | src/App.tsx:1 | measured-in-repo | ${pointer} | supported |`,
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

  it('every `path:line` evidence pointer in the REAL register carries a resolving anchor', () => {
    // The real-tree half, stated as its own assertion so a reader of this file
    // can see that the 11 anchored rows are checked, not merely permitted. The
    // full audit's pass below subsumes it; this one names the count so a silent
    // drop of the invariant (or of every anchored pointer) is visible.
    const register = readFileSync(path.join(REPO_ROOT, 'docs/CLAIMS_REGISTER.md'), 'utf8');
    const anchored = register.match(/anchor:"[^"]+"/g) ?? [];
    assert.ok(
      anchored.length >= 13,
      `the register carries only ${anchored.length} anchor:"…" pointers. Eleven rows cited a line `
      + 'when invariant 4 landed (two of them needing two anchors each, for comma lists and a '
      + 'two-line comment), so a smaller number means anchors were removed rather than rows.',
    );
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
