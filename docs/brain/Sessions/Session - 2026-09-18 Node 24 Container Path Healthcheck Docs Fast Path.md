---
type: session
updated: 2026-09-19
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-18-node-24/README.md, docs/audits/2026-09-18-edge-image/README.md, docs/audits/2026-09-18-healthcheck-ipv4/README.md, docs/audits/2026-09-18-ci-docs-fast-path/README.md, docs/DECISION_LOG.md]
status: active
---

# Session — 2026-09-18: Node 24, the Container Path, the Healthcheck, and the Docs Fast Path

**Heading:** "2026-09-18 — Node 24, the container path, the healthcheck, and
the docs-only fast path." Four audited lanes, plus four merged PRs fixing
Windows portability and a feature-length UI regression.

**What landed:**

- `lane/node-24` — moved `setup-node` and all three Dockerfile stages from
  Node 22 to 24 LTS, matching the owner's own move off Node 25.2.1 (past end
  of life) to 24.21.0 LTS. See [[Audit - 2026-09-18 Node 24]].
- `lane/edge-image-real` — found the `edge.yml` Docker image had never once
  built since the 2026-09-13 GitHub Actions account-block lift: three real
  runs, three failures, `better-sqlite3`'s `node-gyp rebuild` missing Python
  in the build image. See [[Audit - 2026-09-18 Edge Image]].
- `lane/healthcheck-ipv4` — found the container `HEALTHCHECK` reporting
  `unhealthy` on every probe while the server was up (`server.ts` binds
  `0.0.0.0` only; busybox `wget` resolves `localhost` to `::1` first with no
  fallback), plus a second defect where a non-default `PORT` broke the
  compose deployment; both fixed. See [[Audit - 2026-09-18 Healthcheck IPv4]].
- `lane/ci-docs-fast-path` — measured a markdown-only push running the full
  `test` + `browser` CI job pair, rejected a blanket `paths-ignore`
  (`honesty-audit` and `check-brain` both read parts of `docs/**`), and
  added classify jobs that skip the heavy jobs on a docs-only push instead.
  This is also where the lanes-push-at-checkpoints cadence change was
  decided, later renumbered from "Decision #9" to
  [[Decision 10 - Lanes Push at Checkpoints]] (see that note's own
  renumbering note). See [[Audit - 2026-09-18 CI Docs Fast Path]].
- Four more merged PRs, Windows portability and a feature-length regression:
  #261 (long-path-safe `npm test`, repo-relative and glob-free), #262
  (OS-independent brain graph generation), #263 (Windows test-suite fixes
  plus owner-measure-e2e on pull-request runs), #267 (feature-length round 3
  tab-stop split, `coverageStale`, jump headlines).

## Sources

- `docs/PATH_TO_EXCELLENCE.md` (the eleventh session record)
- `docs/audits/2026-09-18-node-24/README.md`
- `docs/audits/2026-09-18-edge-image/README.md`
- `docs/audits/2026-09-18-healthcheck-ipv4/README.md`
- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
- `docs/DECISION_LOG.md` — Decision #10
