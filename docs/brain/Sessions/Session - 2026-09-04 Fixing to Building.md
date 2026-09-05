---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md]
status: active
---

# Session — 2026-09-04, From Fixing What Was Wrong to Building What Was Missing

**Heading:** "2026-09-04 session — from fixing what was wrong to building
what was missing." Four read-only discovery agents walked the product as
its users; 55 commits, 163 files.

- A deterministic **Coverage Letter** shipped — see
  [[Surface - Coverage Letter]].
- Findings gained line anchors: 82% carried no anchor ("document" only);
  now 46%, measured over 814 located issues on five real scripts.
  Root-cause clusters capped at 15, split by scene cohesion.
- Reports gained a provenance block (engine commit, rule count, mechanical
  vs. human ground truth, percentile sample size, structural-reliability
  note past 40 scenes) and stable finding ids for diffing.
- **A script with an accented name was invisible to the engine** — `MARÍA`
  parsed as an action line in both the parser and the doctor's own
  duplicate ASCII-only regex; every character/dialogue signal vanished.
  Both copies now accept Unicode capitals (a new fixture: 0 → 5 characters,
  0 → 16 dialogue lines, health 76.7 → 74.7).
- Exports stopped losing the writer's name: PDF/DOCX had no title page at
  all; the FDX writer ignored the writer's typed title; a PDF encoder
  turned `CAFÉ` into `CAF?`.
- The editor gained find-and-replace (did not exist at all); Tab now
  cycles element types instead of throwing the writer out of the document;
  incremental decoration replaced three full-document reparses per
  keystroke (~100ms → 67-83ms).
- Data loss fixes: clearing the sample and switching tabs used to silently
  restore it; a stale server backup used to win over a newer save without
  a word (now a labelled conflict); oversized saves retried forever
  silently.
- [[Decision 3 - Demote Generative Surface to Labs]] and
  [[Decision 4 - Adopt the Power-Analysis Proposals]] were made and
  recorded this session; [[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]
  landed.
- Self-hoster/contributor items: a real `docker-compose.yml`, an `:edge`
  image, skipped-by-default gates documented, the pre-commit hook wired
  into install.
- **[[Decision 6 - License the Repository]]** was raised this session as
  needing the owner, not an engineering call.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-09-04 session — from fixing what was wrong to building what was missing"
