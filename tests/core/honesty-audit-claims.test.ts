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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
