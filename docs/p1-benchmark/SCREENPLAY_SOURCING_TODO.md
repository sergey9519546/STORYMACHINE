# Screenplay Sourcing TODO — research tasks for other agents

**For:** research/general-purpose agents working online.
**Goal:** find REAL human-written screenplays to fill the gaps that block
`screenplayAIMarkers` (and the wider P1 benchmark) from being validated.
**Hard rule: NO AI-generated text anywhere in any class.** Every script must be
written by a human. The discrimination we need is *weak human craft vs strong
human craft*, never *AI vs human*.

Read first (context, do not duplicate):
- `docs/p1-benchmark/SCREENPLAY_SOURCES_RESEARCH.md` — legality of each repo.
- `docs/p1-benchmark/SPLIT_STRATEGY.md` — train/val/test, blind labeling.
- `docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` — pre-registration rules.
- `docs/p1-benchmark/corpus-manifest-schema.json` — required manifest shape.
- `docs/p1-benchmark/ANTI_SLOP_MARKERS_VALIDATION.md` — what's measured, what's open.

## Where we are

- Negative class exists: **261 produced screenplays** (local-only, copyright),
  mean 3.84 marker-lines/film. Harness: `npm run measure-slop -- --corpus <dir>`.
- **Missing: a weak-craft human contrast class.** Until we have one, we cannot
  show `screenplayAIMarkers` (or the doctor health score) SEPARATES good from bad
  real writing — only that it doesn't over-fire on produced films.

---

## Task 1 — Assemble a weak-craft human contrast class (highest priority)

**Why:** the whole discrimination claim reduces to "do markers/score fire MORE on
weak human writing than strong human writing?" We have the strong side (produced).
We need the weak side, human-written.

**Find:** real, human-authored, LOW-craft or amateur screenplays —
- unproduced amateur specs (clearly labeled amateur, not pro-unproduced),
- early public writing-contest rejects / first-round-out scripts,
- student / classroom drafts published with permission,
- self-published amateur scripts.

**Sources to investigate (verify license per SOURCES_RESEARCH before use):**
- SimplyScripts "unproduced" section (964 scripts) — amateur-heavy.
- Public writing forums / subreddits where authors post OWN drafts (get the
  license/permission; record the URL + author + date).
- University screenwriting course open repositories.
- Public-domain / CC amateur anthologies on Internet Archive.

**Acceptance criteria:**
- [ ] ≥ 40 scripts, each ≥ 50 lines, each confirmed human-authored.
- [ ] Each tagged with a provenance note: source URL, author, license/permission,
      why it's classed "weak" (amateur origin, contest result, etc.).
- [ ] Normalized to `*.fountain.txt` (see Task 4).
- [ ] NO overlap with the produced negative class (dedupe by title + content hash).

**Deliverable:** local dir of `*.fountain.txt` + a `weak-corpus-manifest.json`
(facts only, no text — copyright boundary) matching `corpus-manifest-schema.json`.
Then run and record:
`npm run measure-slop -- --corpus <produced-dir> --ai <weak-dir>`
(the `--ai` slot is the "higher-slop-expected" class; label it "weak" in notes).
Target to report: pairwise AUC on density/1k. AUC ≥ 0.7 = markers separate craft.

---

## Task 2 — Fill genre / era / format gaps in the negative class

**Why:** the 261-script produced corpus skews toward certain decades/genres;
a false-positive ceiling measured on a skewed corpus can hide over-firing on
under-represented styles (e.g. period dialogue inflates "formality" markers).

**Find & report coverage counts for the current corpus, then source to balance:**
- [ ] Decade spread (pre-1970, 70s, 80s, 90s, 2000s, 2010s+).
- [ ] Genre spread (comedy, drama, action, horror, animation, period).
- [ ] Format spread (feature, TV pilot, short) — note: current corpus is features.
- [ ] Flag any bucket with < 15 scripts as a gap; propose legal sources to fill.

**Acceptance criteria:**
- [ ] A coverage table (bucket → count) committed to this dir.
- [ ] Named, license-checked sources for each under-filled bucket.
- [ ] No new script added without a provenance + license note.

---

## Task 3 — Legal / redistribution classification per script

**Why:** produced scripts (IMSDB-class) are HIGH copyright risk — usable LOCAL
ONLY (env-gated tests), never committed. Any script we want in the *distributable*
P1 benchmark must be CC/public-domain (see SOURCES_RESEARCH, SPLIT_STRATEGY §5).

**For every script sourced in Tasks 1–2:**
- [ ] Classify: `public-domain` | `cc-by*` | `permission-granted` | `local-only`.
- [ ] Record source URL, license URL/text, and date checked.
- [ ] Separate the two pools: `distributable/` vs `local-only/`.

**Acceptance criteria:**
- [ ] Zero scripts of unknown license in the distributable pool.
- [ ] A `LICENSE_AUDIT.md` mapping each script → classification + evidence.

---

## Task 4 — Normalize to fountain + manifest (mechanical, no judgment)

**Why:** the harness and tests read `*.fountain.txt`; manifests carry facts only.

- [ ] Convert sourced scripts to `*.fountain.txt` (see `scripts/convert-screenplays.ts`).
- [ ] Strip site boilerplate / headers / ads.
- [ ] Generate manifest entries per `corpus-manifest-schema.json`
      (name, file, contentHash, + any known labels). Text stays out of git.
- [ ] Verify each file ≥ 50 lines and parses (run `npm run measure-slop` over the dir;
      it skips < 50-line fragments — a skipped file is a conversion failure to fix).

---

## Task 5 — Blind-labeling readiness (ties to SPLIT_STRATEGY)

**Why:** SPLIT_STRATEGY requires ≥ 3 independent readers labeling craft quality.
Sourcing should produce material that's actually labelable.

- [ ] For the weak + strong pools, strip identifying metadata (title, author,
      "amateur"/"produced" tags) into a blind-label packet.
- [ ] Produce a shuffled, pre-registered ID → true-source map (kept sealed until
      after labeling — see PRE_REGISTRATION_PROTOCOL).
- [ ] Confirm packet size supports the held-out test split without leakage.

---

## Global rules for every task

- **No AI-generated text. Ever.** If provenance is uncertain, reject the script.
- **No copyrighted text in git.** Facts-only manifests; text lives local-only or
  in the vetted distributable pool.
- **Record provenance at collection time** — URL, author, license, date. A script
  without provenance is unusable regardless of quality.
- **Dedupe across all pools** by title and content hash before reporting counts.
- **Report numbers, not vibes.** Every "done" is a count + a reproducible command.
