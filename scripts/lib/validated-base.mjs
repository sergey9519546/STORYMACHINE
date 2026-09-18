// scripts/lib/validated-base.mjs — picking the base commit a docs-only
// classification is allowed to be RELATIVE TO.
//
// WHY THIS EXISTS (round-2 review item 5). The classifier used to diff
// `github.event.before..github.sha` — the range of the PUSH. That range is
// only a safe basis for skipping gates if `before` was itself validated, and
// on a lane branch it frequently was not. `.github/workflows/ci.yml`'s
// concurrency group sets `cancel-in-progress` for every ref except `main`, so:
//
//   push 1: A -> B touches server/**   -> docs_only=false, full run STARTS
//   push 2: B -> C touches only docs/  -> CANCELS push 1's run; its own
//                                         range B..C is docs-only, so the
//                                         type check, `npm test`, metamorphic,
//                                         build and the whole browser job skip
//
// Net: the branch's only COMPLETED run is green, and the `server/**` change
// that arrived at B was never type-checked, tested or built by any completed
// run. Reproduced mechanically in a fixture repo by the round-1 reviewer, and
// again by `tests/scripts/classify-docs-only.test.ts`'s cancellation case.
// `main` is insulated (its per-SHA concurrency group means nothing about main
// is ever cancelled, and an `--ff-only` merge presents the full range to
// main's own run) but a lane branch is exactly where review evidence comes
// from, so a green-over-untested-code branch signal is not acceptable.
//
// THE HONEST BASE is "the tip of the last run of this workflow, on this ref,
// that actually COMPLETED SUCCESSFULLY" — not "whatever the previous push
// happened to leave behind". Call it L. The classification range becomes
// `merge-base(L, before)..head` rather than `before..head`:
//
//   - In the ordinary case (the previous push's run completed green) L IS
//     `before`, merge-base(L, before) == before, and the range is unchanged
//     from the pre-fix behavior. The fast path costs nothing in the common
//     case.
//   - When a run was cancelled, L is OLDER than `before`, merge-base is L,
//     and the range widens to cover everything no completed run has proved.
//     The `server/**` change above is back inside the range -> full run.
//   - When a run FAILED (rather than being cancelled), L is likewise older
//     than `before`, so a docs-only push landing on top of a red commit also
//     re-runs everything. That shape was never named in the review, and the
//     same rule closes it for free.
//   - `merge-base` rather than "just use L" because L is not guaranteed to be
//     an ancestor of `before` (a rebase, a branch re-point). The merge base
//     of the two is an ancestor of BOTH, so the resulting range is a superset
//     of the push range in every topology. A wider range can only ever turn a
//     `true` into a `false`, i.e. cost a full run — never open a hole.
//
// INDUCTION, stated because it is the whole safety argument: if every
// completed-green run on a ref either ran all the gates, or skipped them
// under a docs-only classification relative to the previous completed-green
// run, then by induction the code at the last green tip has been fully
// validated by some completed run. Chaining from `before` breaks that
// induction the moment one link is cancelled; chaining from L cannot.
//
// FAILURE DIRECTION, same as everything else in this pair of modules: any
// input this module cannot positively resolve returns null, and the caller
// treats null exactly like "not docs-only". No API access, an empty run list,
// a malformed payload, a SHA that does not resolve in the checkout, a SHA
// that is not an ancestor of HEAD (force-push, rebase), an unresolvable merge
// base -> run everything.

/** A 40-hex object name, the only shape accepted from an API payload. */
const FULL_SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Picks the newest usable run tip from a GitHub Actions
 * `GET /repos/{o}/{r}/actions/workflows/{wf}/runs` payload's `workflow_runs`
 * array (already filtered to `status=success` by the query, re-checked here
 * because a query parameter is not a guarantee).
 *
 * Pure: every filesystem/git question is asked through `isUsableSha`, which
 * the caller supplies. That is what makes this table-testable without a repo.
 *
 * @param {unknown} runs `workflow_runs` from the API payload.
 * @param {{ currentRunId?: string | number | null, isUsableSha: (sha: string) => boolean }} opts
 *   `currentRunId` is excluded from consideration (a re-run of THIS run would
 *   otherwise be able to nominate its own tip as the validated base, making
 *   the range empty and the classification meaningless). `isUsableSha` must
 *   return true only for a SHA that resolves in this checkout AND is an
 *   ancestor of HEAD.
 * @returns {string | null} the chosen SHA, or null when none qualifies.
 */
export function pickValidatedBase(runs, opts) {
  if (!Array.isArray(runs)) return null;
  const isUsableSha = opts && typeof opts.isUsableSha === 'function' ? opts.isUsableSha : null;
  if (!isUsableSha) return null;
  const currentRunId = opts.currentRunId == null ? null : String(opts.currentRunId);

  // The API returns newest-first, but that is documented behavior rather than
  // a guarantee this module is willing to lean on: sort explicitly by
  // `run_started_at`/`created_at` descending, falling back to input order for
  // entries with no usable timestamp. Picking an OLDER run than necessary is
  // merely conservative (a wider range); picking a NEWER one than the data
  // supports would be a hole, so the ordering is made explicit rather than
  // assumed.
  const withOrder = runs
    .map((run, index) => ({ run, index }))
    .filter(({ run }) => run && typeof run === 'object');
  withOrder.sort((a, b) => {
    const ta = Date.parse(a.run.run_started_at ?? a.run.created_at ?? '');
    const tb = Date.parse(b.run.run_started_at ?? b.run.created_at ?? '');
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
    return a.index - b.index;
  });

  for (const { run } of withOrder) {
    if (run.status !== 'completed') continue;
    if (run.conclusion !== 'success') continue;
    if (currentRunId !== null && run.id != null && String(run.id) === currentRunId) continue;
    const sha = typeof run.head_sha === 'string' ? run.head_sha.trim().toLowerCase() : '';
    if (!FULL_SHA_RE.test(sha)) continue;
    if (!isUsableSha(sha)) continue;
    return sha;
  }
  return null;
}

/**
 * Derives the workflow FILE NAME (`ci.yml`) from Actions' `GITHUB_WORKFLOW_REF`
 * (`owner/repo/.github/workflows/ci.yml@refs/heads/main`). The runs endpoint
 * accepts the file name or the numeric id; the file name is what this
 * environment can produce without a second API call.
 *
 * Returns null for anything that is not recognizably that shape, including an
 * empty string, a missing `@`, a path escape (`..`), or a name that is not a
 * plain `*.yml`/`*.yaml` basename — all of which would otherwise be pasted
 * into a URL path.
 *
 * @param {unknown} workflowRef
 * @returns {string | null}
 */
export function workflowFileFromRef(workflowRef) {
  if (typeof workflowRef !== 'string') return null;
  const beforeAt = workflowRef.split('@')[0].trim();
  if (beforeAt === '') return null;
  const base = beforeAt.split('/').pop() ?? '';
  if (!/^[A-Za-z0-9._-]+\.(ya?ml)$/.test(base)) return null;
  if (base.startsWith('.') || base.includes('..')) return null;
  return base;
}
