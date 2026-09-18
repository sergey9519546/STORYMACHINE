#!/usr/bin/env node
// classify-docs-only.mjs — computes the docs-only fast-path decision for a
// single CI job run and writes it to $GITHUB_OUTPUT as `docs_only`.
//
// This is the IMPURE half of the classifier: it decides WHICH changed-file
// set to hand to scripts/lib/docs-only.mjs's classifyDocsOnly(), and is
// responsible for every case where that set cannot be trusted. Every branch
// below that cannot positively prove "this push changed only docs files"
// resolves to docsOnly = false — see scripts/lib/docs-only.mjs's header for
// why that direction is the safe one.
//
// Conservative-by-construction cases, each explicit rather than left to fall
// through a generic catch (a caught exception is also `false`, but a case
// that is EXPECTED to happen regularly — a branch's first push, a
// force-push — gets its own named check so the reason is legible in the
// step's own log output, not just "something threw"):
//   - no GITHUB_EVENT_NAME (a local/manual run) -> false
//   - a `push` event whose `before` SHA is the all-zeros sentinel (this push
//     CREATED the branch/ref — there is no prior state to diff against) -> false
//   - a `push` event marked `forced: true` in the event payload -> false
//   - a `before` SHA that does not resolve in this checkout (stale env var,
//     shallow fetch, force-push after a `git gc`) -> false
//   - a `pull_request` event with no resolvable `origin/main` -> false
//   - any git failure computing the diff -> false
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDocsOnly } from './lib/docs-only.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

const ZERO_SHA_RE = /^0{7,40}$/;

/** Reads the raw GitHub event payload, or null if unavailable/unparseable. */
function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Returns the changed-file list for this run, or null when it cannot be
 * computed with confidence (the caller treats null exactly like a non-empty
 * non-docs set: NOT docs-only).
 * @returns {{ files: string[] | null, reason: string }}
 */
function computeChangedFiles() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (!eventName) {
    return { files: null, reason: 'no GITHUB_EVENT_NAME (not running under a recognized CI event)' };
  }

  if (eventName === 'push') {
    const payload = readEventPayload();
    // DOCS_ONLY_BEFORE_SHA is wired explicitly in ci.yml from
    // `${{ github.event.before }}`, mirroring check-scoring-receipt.mjs's
    // PUSH_BEFORE_SHA convention: an explicit env var means a missing/renamed
    // wire in the workflow cannot silently fall back to a payload read that
    // may not exist either, and it never SILENTLY reopens a hole because the
    // fallback below still exists for a local/manual invocation.
    const explicitBefore = (process.env.DOCS_ONLY_BEFORE_SHA ?? '').trim();
    const before = explicitBefore || (typeof payload?.before === 'string' ? payload.before.trim() : '');
    const forced = payload?.forced === true;

    if (forced) {
      return { files: null, reason: 'push event is a force-push (event.forced === true)' };
    }
    if (!before) {
      return { files: null, reason: 'push event has no resolvable `before` SHA' };
    }
    if (ZERO_SHA_RE.test(before)) {
      return { files: null, reason: 'push event `before` is the all-zeros sentinel — this push created the ref (first push of a branch), no prior state to diff' };
    }
    if (!refExists(before)) {
      return { files: null, reason: `push event \`before\` (${before}) does not resolve in this checkout` };
    }
    const head = process.env.GITHUB_SHA && refExists(process.env.GITHUB_SHA)
      ? process.env.GITHUB_SHA
      : 'HEAD';
    try {
      const out = git(['diff', '--name-only', `${before}..${head}`]);
      const files = out.split('\n').map((s) => s.trim()).filter(Boolean);
      return { files, reason: `push range ${before}..${head}` };
    } catch (err) {
      return { files: null, reason: `git diff failed for push range: ${err.message}` };
    }
  }

  if (eventName === 'pull_request') {
    if (!refExists('origin/main')) {
      return { files: null, reason: 'pull_request event but origin/main does not resolve in this checkout' };
    }
    try {
      const out = git(['diff', '--name-only', 'origin/main...HEAD']);
      const files = out.split('\n').map((s) => s.trim()).filter(Boolean);
      return { files, reason: 'pull_request range origin/main...HEAD' };
    } catch (err) {
      return { files: null, reason: `git diff failed for pull_request range: ${err.message}` };
    }
  }

  return { files: null, reason: `unrecognized GITHUB_EVENT_NAME "${eventName}"` };
}

function writeOutput(name, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (!outPath) {
    // Not running under GitHub Actions (e.g. a local invocation to sanity-
    // check the script) — print instead of failing.
    process.stdout.write(`${name}=${value}\n`);
    return;
  }
  appendFileSync(outPath, `${name}=${value}\n`);
}

function main() {
  let docsOnly = false;
  let reason = 'unclassifiable input';
  let changedFiles = [];
  try {
    const result = computeChangedFiles();
    changedFiles = result.files ?? [];
    reason = result.reason;
    docsOnly = result.files !== null && classifyDocsOnly(result.files);
  } catch (err) {
    // Any unexpected exception is exactly the "unclassifiable" case: fail
    // safe to a full run rather than let a bug in this script silently skip
    // gates. docsOnly stays false.
    reason = `unexpected error: ${err && err.message ? err.message : String(err)}`;
  }

  process.stdout.write(
    `docs-only classification: ${docsOnly ? 'DOCS-ONLY' : 'FULL'} (${reason})\n`
    + (changedFiles.length
      ? `changed files (${changedFiles.length}):\n${changedFiles.map((f) => `  ${f}`).join('\n')}\n`
      : 'changed files: (none resolved)\n'),
  );
  writeOutput('docs_only', docsOnly ? 'true' : 'false');
}

main();
