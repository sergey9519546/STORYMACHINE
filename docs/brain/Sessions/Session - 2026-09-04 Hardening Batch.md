---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-04-reverification/REVERIFICATION.md]
status: active
---

# Session — 2026-09-04, Later: The Hardening Batch

**Heading:** "2026-09-04, later — the hardening batch." Three read-only
audits, then four fix lanes; the audits found what passing tests could not
catch, because the tests asserted the behavior written, not the promise
made. Independently re-verified in [[Audit - 2026-09-04 Reverification]]
(7 reproduced, 2 partially reproduced, 1 not reproduced, plus one
unobservable sub-claim).

- **"Delete Everything" did not.** A live marker-string run found four
  stores surviving: a full SQLite reset-backup copy, the collab room/Y.Doc
  (still joinable), the doctor's report cache, and the worker realms. All
  four are cleared now. Two privacy-page promises were corrected rather
  than implemented — see `docs/CLAIMS_REGISTER.md` row 25 (retired) and
  rows 26-27 (supported).
- **One unauthenticated request froze the whole server.** Five export
  routes (including the just-added coverage-letter route) called the
  doctor directly instead of through the worker pool; `/health` p95 under
  load dropped e.g. coverage-letter 1,794 → 15ms, slate 3,939 → 11ms.
  Reports byte-identical across the pooled/unpooled boundary, 45/45.
- **The parser's own error message leaked the script.** A hand-written
  `preview:` field logged a 120-character verbatim excerpt of model output
  (re-attributed from an original over-claim about V8's `JSON.parse`, which
  is actually bounded to 10 characters — corrected in
  [[Audit - 2026-09-04 Reverification]]). 27 sites now log a length and hash
  prefix instead.
- **Some text was invisible, and no one had measured.** The first
  systematic accessibility pass (`verify:a11y`, becoming the seventh
  browser suite at the time) found `design-system.css` loading after
  Tailwind (panel titles ink-on-ink ~1:1 contrast), no dark value for four
  Fountain syntax colours, no `<main>` landmark. A later re-verification
  found the gate itself audited the landing page mid-animation (0
  violations at T0, 4 serious at rest) — a timing artifact in the gate, not
  a passing surface; fixed by waiting for the entrance animation's own
  completion signal.
- Follow-ups: the compare route ran up to 22 analyses, not "one too many"
  (corpus vectoriser re-analyzing every reference screenplay cold); the
  keyboard trap now arms on Tab-arrival, not exit; a `:where()` specificity
  tie was silently deciding dark-mode colours.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-09-04, later — the hardening batch"
- `docs/audits/2026-09-04-reverification/REVERIFICATION.md`
