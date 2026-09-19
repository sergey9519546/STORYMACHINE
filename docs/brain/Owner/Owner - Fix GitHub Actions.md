---
type: owner
updated: 2026-09-18
sources: [docs/PATH_TO_EXCELLENCE.md, CONTRIBUTING.md, docs/audits/2026-09-13-ci-green/README.md]
status: resolved
---

# Owner Item — Fix GitHub Actions (Billing/Runner Block) — RESOLVED 2026-09-13

**Resolved.** The account-level block lifted at **04:19 UTC on 2026-09-13**.
Nothing here is owner-only any more, and nothing needs to be checked or
clicked. Kept rather than deleted so the eleven-day gap in the run record has
an explanation a future reader can find.

**What it was:** between 2026-09-02 and 2026-09-13 every run on this
repository failed in 2-3 seconds with no runner assigned (`runner_id: 0`), no
steps and no downloadable log (HTTP 404). No workflow file changed between
the last green run (`939f7829`, 2026-08-24) and the first red one, and every
gate in `ci.yml` passed locally on each merged commit — which is what
identified it as an account-level billing/spend-limit or runner-availability
issue rather than a code failure.

**What happened when it lifted:** the first real run on `main` since
2026-09-02 immediately found four defects only the runner could show; each
became its own reviewed lane. See [[Audit - 2026-09-13 CI Green]].

**Runs have been continuous since**, including the `edge.yml` publish
workflow, which fired for real as run 34794216577 (triggered by CI run
34793742299 on `main@be2341ac`) and failed in the Docker build — a real,
separate defect being fixed on `lane/edge-image-real`, not a symptom of this
one.

**Stale copies of the old claim** lived in `CONTRIBUTING.md`,
`docs/PATH_TO_EXCELLENCE.md`, this note, and
`docs/audits/2026-09-18-ci-docs-fast-path/README.md` for five days after the
block lifted; all four were corrected on 2026-09-18 in round 2 of
`lane/ci-docs-fast-path`. Leaving a known-false statement in the repository
is exactly what [[Gate - Honesty Audit]] exists to prevent — and note that it
could not have caught these, because `docs/**` is outside its scan.

**Related:** [[Audit - 2026-09-13 CI Green]],
[[Audit - 2026-09-18 CI Docs Fast Path]], [[Gate - Honesty Audit]].

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — the 2026-09-13 session record, and the
  now-resolved "What only the owner can do now" entry
- `docs/audits/2026-09-13-ci-green/README.md`
- `CONTRIBUTING.md` — the "CI" section
