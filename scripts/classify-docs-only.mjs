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
// TESTED, not asserted: tests/scripts/classify-docs-only.test.ts drives THIS
// FILE (copied verbatim into a throwaway git repository, so `__dirname`
// resolves inside the fixture) against real histories — renames in both
// directions, a cancelled-run branch, a shallow clone, unrelated histories,
// garbage/zero/unresolvable `before`, a missing event name, and a stub
// Actions API served over loopback. Round 1 shipped with NO test on this
// file at all, which is precisely why the rename hole below survived review
// of the pure half's 21 green cases.
//
// Conservative-by-construction cases, each explicit rather than left to fall
// through a generic catch (a caught exception is also `false`, but a case
// that is EXPECTED to happen regularly — a branch's first push, a
// force-push — gets its own named check so the reason is legible in the
// step's own log output, not just "something threw"):
//   - no GITHUB_EVENT_NAME (a local/manual run) -> false
//   - a `push` event whose `before` SHA is the all-zeros sentinel (this push
//     CREATED the branch/ref — there is no prior state to diff against) -> false
//   - a `push` event marked `forced: true` (force-push) -> false
//   - a `before` SHA that does not resolve in this checkout (stale env var,
//     shallow fetch, force-push after a `git gc`) -> false
//   - no resolvable LAST-SUCCESSFUL-RUN tip for this ref (see
//     scripts/lib/validated-base.mjs) -> false
//   - an unresolvable merge base between that tip and `before` -> false
//   - a `pull_request` event with no resolvable `origin/main` -> false
//   - any git failure computing the diff -> false
//
// ─────────────────────────────────────────────────────────────────────────
// GIT INVOCATION HARDENING (round-2 review blocker 1). `git diff --name-only`
// is NOT a neutral listing of the paths a range touched. Git rewrites the
// changed-file set according to several defaults, and each one of them is a
// way for a non-docs file to vanish from the list this script classifies:
//
//   * RENAME DETECTION. `diff.renames` defaults to true, and for a detected
//     rename `--name-only` prints ONLY THE DESTINATION. `git mv server/big.ts
//     docs/big.md` therefore printed exactly `docs/big.md` — a changed-file
//     set that classifies DOCS-ONLY while a TypeScript module is deleted out
//     of server/**, skipping the type check, no-console, reachability, the
//     whole `npm test`, the receipt guard, metamorphic, build, and the entire
//     `browser` job. `--no-renames` below makes git emit BOTH paths
//     (`docs/big.md` and `server/big.ts`), and the set classifies FULL.
//   * COPY DETECTION. `diff.renames` may be set to `copies`/`copy`, which
//     also collapses a detected COPY to its destination. Verified: with
//     `diff.renames=copies` configured, `--no-renames` still emits both paths
//     for a rename. (A pure copy — source left in place — is genuinely
//     docs-only, and both spellings agree on that; it is the RENAME that
//     deletes a file while showing one path.)
//   * SIMILARITY THRESHOLDS. `diff.renameLimit`, `-M`/`-C` percentages and
//     `merge.renameLimit` all tune WHEN the collapse happens, which means the
//     hole's reachability depends on repo config and file size. `--no-renames`
//     removes the entire class rather than tuning one threshold, which is the
//     point: this is not "one flag for one bug".
//   * PATH QUOTING. `core.quotePath` is pinned to `true` on the command line
//     rather than inherited. With quoting on, any path containing a control
//     character, a quote, or a non-ASCII byte is emitted C-quoted with a
//     LEADING `"` — which matches neither `docs/` nor `*.md`, so it fails
//     CLOSED. Verified: a path containing a literal newline is quoted
//     (`"docs/a\nserver-evil.md"`) REGARDLESS of `core.quotePath`, so the
//     classic "split on newline, smuggle a second path" attack is not
//     reachable either way; pinning the flag additionally stops a repo-level
//     `core.quotePath=false` from changing the recorded behavior for
//     non-ASCII names under a future editor's feet.
//   * `-z` IS DELIBERATELY NOT USED. NUL-separation would be the usual answer
//     to path quoting, but it turns quoting OFF, which would pass a raw
//     newline-bearing path through to the allowlist instead of failing it
//     closed. Line-splitting plus guaranteed quoting is the conservative pair.
//   * `--diff-filter` IS DELIBERATELY NOT USED. The default includes deletions
//     and type changes; filtering to (say) `ACMR` would silently drop a
//     deletion of a `server/**` file from the set — the same hole in a
//     different spelling.
//   * SUBMODULES. `--name-only` prints a changed submodule's PATH (a gitlink
//     entry), which is not under `docs/` and does not end in `.md`, so a
//     submodule pointer bump fails the allowlist like any other non-docs
//     path. `diff.submodule` only affects textual diff rendering, which this
//     invocation never produces.
//
// The two `git diff` invocations below are the ONLY places the changed-file
// set is produced, and both go through `gitDiffNames()` so the hardening
// cannot be applied to one arm and forgotten on the other.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDocsOnly } from './lib/docs-only.mjs';
import { pickValidatedBase, workflowFileFromRef } from './lib/validated-base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/**
 * The one way this script is allowed to ask git which files a range touched.
 * See the GIT INVOCATION HARDENING block above for what each flag defends.
 * @param {string} range a two-dot or three-dot revision range
 * @returns {string[]}
 */
function gitDiffNames(range) {
  const out = git([
    '-c', 'core.quotePath=true',
    'diff', '--name-only', '--no-renames', range,
  ]);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** True if `ancestor` is an ancestor of (or identical to) `descendant`. */
function isAncestor(ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: ROOT, stdio: 'ignore' });
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
 * The tip of the most recent run of THIS workflow, on THIS ref, that
 * completed successfully — the only commit this script is willing to treat as
 * already validated. See scripts/lib/validated-base.mjs for the full
 * argument; the short version is that `github.event.before` is not it,
 * because `cancel-in-progress` can leave the previous push's run with no
 * conclusion at all.
 *
 * Every input comes from Actions' own environment (GITHUB_API_URL,
 * GITHUB_REPOSITORY, GITHUB_REF_NAME, GITHUB_WORKFLOW_REF, GITHUB_RUN_ID,
 * GITHUB_TOKEN) — there is no test-only hook here. The tests point
 * GITHUB_API_URL at a loopback stub, which is exactly what those variables
 * are for.
 *
 * @param {string} head the commit being classified
 * @returns {Promise<{ sha: string | null, reason: string }>}
 */
async function lastSuccessfulRunTip(head) {
  const apiBase = (process.env.GITHUB_API_URL ?? '').trim();
  const repo = (process.env.GITHUB_REPOSITORY ?? '').trim();
  const refName = (process.env.GITHUB_REF_NAME ?? '').trim();
  const workflowFile = workflowFileFromRef(process.env.GITHUB_WORKFLOW_REF);
  if (!apiBase) return { sha: null, reason: 'GITHUB_API_URL is not set' };
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { sha: null, reason: 'GITHUB_REPOSITORY is missing or malformed' };
  if (!refName) return { sha: null, reason: 'GITHUB_REF_NAME is not set' };
  if (!workflowFile) return { sha: null, reason: 'GITHUB_WORKFLOW_REF did not yield a workflow file name' };

  const url = `${apiBase.replace(/\/+$/, '')}/repos/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}`
    + `/runs?branch=${encodeURIComponent(refName)}&status=success&per_page=20`;
  const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  const token = (process.env.GITHUB_TOKEN ?? '').trim();
  if (token) headers.authorization = `Bearer ${token}`;

  let payload;
  // A hung API call must not hold a CI job open: the whole point of this job
  // is that it costs seconds. On timeout/abort the catch below returns null,
  // i.e. a full run.
  //
  // Deliberately NOT `AbortSignal.timeout()`: that helper's internal timer is
  // REF'D and is not cancelled when the fetch resolves, so the process stayed
  // alive for the whole timeout after a perfectly successful request —
  // measured at 15,072 ms per invocation against a loopback stub that
  // answered instantly, versus 54 ms on the path that makes no request at
  // all. An explicit controller with an unref'd timer, cleared in `finally`,
  // gives the same abort semantics and lets the job exit as soon as it has
  // its answer.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('runs API timed out after 15s')), 15_000);
  timer.unref?.();
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return { sha: null, reason: `runs API returned HTTP ${res.status}` };
    payload = await res.json();
  } catch (err) {
    return { sha: null, reason: `runs API request failed: ${err && err.message ? err.message : String(err)}` };
  } finally {
    clearTimeout(timer);
  }

  const sha = pickValidatedBase(payload?.workflow_runs, {
    currentRunId: process.env.GITHUB_RUN_ID ?? null,
    // Resolves in THIS checkout and is an ancestor of the commit under
    // classification. A tip that is neither (a force-push, a rebase, a
    // shallow fetch that does not contain it) is not evidence about this
    // commit's history and is skipped.
    isUsableSha: (candidate) => refExists(candidate) && isAncestor(candidate, head),
  });
  if (!sha) {
    const n = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs.length : 0;
    return { sha: null, reason: `no successful prior run of this workflow on this ref is usable as a base (${n} candidate run(s) considered)` };
  }
  return { sha, reason: `last successful run tip ${sha}` };
}

/**
 * Returns the changed-file list for this run, or null when it cannot be
 * computed with confidence (the caller treats null exactly like a non-empty
 * non-docs set: NOT docs-only).
 * @returns {Promise<{ files: string[] | null, reason: string }>}
 */
async function computeChangedFiles() {
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
    // DOCS_ONLY_FORCED closes the asymmetry the round-1 review found at this
    // line: `before` had an env fallback and `forced` did not, so with
    // DOCS_ONLY_BEFORE_SHA set and GITHUB_EVENT_PATH unreadable a FORCE-PUSH
    // silently read as a normal push. The payload is still consulted, so
    // neither wire alone is load-bearing, and either one saying "forced" is
    // enough — the OR is deliberate, being wrong in the conservative
    // direction costs one full run.
    const explicitForced = (process.env.DOCS_ONLY_FORCED ?? '').trim().toLowerCase();
    const forced = payload?.forced === true || explicitForced === 'true';

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

    // Round-2 review item 5: `before..head` is only a safe range if `before`
    // was validated, and `cancel-in-progress` on every non-main ref means it
    // frequently was not. Widen to merge-base(last successful run tip,
    // before)..head. See scripts/lib/validated-base.mjs's header.
    const validated = await lastSuccessfulRunTip(head);
    if (!validated.sha) {
      return { files: null, reason: `cannot establish a validated base: ${validated.reason}` };
    }
    let base;
    try {
      base = git(['merge-base', validated.sha, before]);
    } catch (err) {
      return { files: null, reason: `no merge base between the last successful run tip (${validated.sha}) and \`before\` (${before}): ${err.message}` };
    }
    if (!base || !refExists(base)) {
      return { files: null, reason: `merge base of the last successful run tip and \`before\` did not resolve` };
    }

    try {
      const files = gitDiffNames(`${base}..${head}`);
      const widened = base !== before ? ` (widened from \`before\` ${before}: ${validated.reason})` : '';
      return { files, reason: `validated range ${base}..${head}${widened}` };
    } catch (err) {
      return { files: null, reason: `git diff failed for push range: ${err.message}` };
    }
  }

  if (eventName === 'pull_request') {
    if (!refExists('origin/main')) {
      return { files: null, reason: 'pull_request event but origin/main does not resolve in this checkout' };
    }
    try {
      // Three-dot: everything on the PR head since it diverged from main. No
      // validated-base widening here — a PR run is not cancelled by a push to
      // a DIFFERENT ref, and the three-dot range already covers the whole
      // branch rather than one push, so the cancellation shape that motivates
      // the widening above cannot leave a PR's code outside its own range.
      const files = gitDiffNames('origin/main...HEAD');
      return { files, reason: 'pull_request range origin/main...HEAD' };
    } catch (err) {
      return { files: null, reason: `git diff failed for pull_request range: ${err.message}` };
    }
  }

  return { files: null, reason: `unrecognized GITHUB_EVENT_NAME "${eventName}"` };
}

/**
 * Emits the classification and then ENDS THE PROCESS, deterministically.
 *
 * The exit is explicit rather than left to the event loop draining, because
 * after a successful `fetch` Node's global dispatcher holds the HTTP
 * connection open for keep-alive reuse that will never come, and the process
 * lingers. Measured against a loopback stub that answered instantly: 15,091 ms
 * per invocation waiting for that socket, versus 51 ms on the path that makes
 * no request at all. A classify job whose entire justification is that it
 * costs seconds cannot afford to sit on a dead socket — in CI it would have
 * turned a measured 8-second job into a ~23-second one, on every push.
 *
 * `process.exit()` truncates pending async stdout writes, so the exit is
 * deferred into the write's own completion callback: everything this script
 * prints is flushed first, and `$GITHUB_OUTPUT` (appended synchronously
 * above) is already durable by then.
 *
 * Always exit 0. The conservative answer is the answer; a non-zero exit would
 * fail the `classify` job, and a failed `classify` fails the whole run rather
 * than degrading to a full test pass.
 */
function emitAndExit(log, name, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  const line = `${name}=${value}\n`;
  if (outPath) {
    appendFileSync(outPath, line);
    process.stdout.write(log, () => process.exit(0));
    return;
  }
  // Not running under GitHub Actions (e.g. a local invocation to sanity-check
  // the script) — print the assignment instead of failing.
  process.stdout.write(log + line, () => process.exit(0));
}

async function main() {
  let docsOnly = false;
  let reason = 'unclassifiable input';
  let changedFiles = [];
  try {
    const result = await computeChangedFiles();
    changedFiles = result.files ?? [];
    reason = result.reason;
    docsOnly = result.files !== null && classifyDocsOnly(result.files);
  } catch (err) {
    // Any unexpected exception is exactly the "unclassifiable" case: fail
    // safe to a full run rather than let a bug in this script silently skip
    // gates. docsOnly stays false.
    reason = `unexpected error: ${err && err.message ? err.message : String(err)}`;
  }

  emitAndExit(
    `docs-only classification: ${docsOnly ? 'DOCS-ONLY' : 'FULL'} (${reason})\n`
    + (changedFiles.length
      ? `changed files (${changedFiles.length}):\n${changedFiles.map((f) => `  ${f}`).join('\n')}\n`
      : 'changed files: (none resolved)\n'),
    'docs_only',
    docsOnly ? 'true' : 'false',
  );
}

// A rejected promise here must not become an unhandled rejection that exits
// non-zero with no `docs_only` written: an output-less `classify` job makes
// every `needs.classify.outputs.docs_only != 'true'` gate TRUE (an unset
// output is the empty string), which is the safe direction, but the job
// itself would go red and fail the run. Catch, print, and write the
// conservative answer.
main().catch((err) => {
  emitAndExit(
    `docs-only classification: FULL (top-level failure: ${err && err.message ? err.message : String(err)})\n`,
    'docs_only',
    'false',
  );
});
