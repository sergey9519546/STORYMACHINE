# Corpus Identification — the SM-\<hash\> id scheme

**Status as of this writing:** the tooling described here (`scripts/migrate-corpus-ids.mjs`,
`scripts/verify-corpus-layout.mjs`) is built and verified end-to-end against
the 6 CC0 reference scripts in `data/screenplays/` plus synthetic fixtures.
It has **not** been run against the real 761-script (`scripts/output/corpus-split.json`)
or 72-script (`tests/fixtures/real-corpus-manifest.json`) corpora — that text
is not present in the container this tooling was built in. Both committed
manifests are unchanged by this work; running the real migration is the
maintainer's next local step (§4 below). See §6 for the precise
verified-by-execution vs. awaits-maintainer split.

## 0. Honesty boundary (read this first)

This is **de-identification and provenance hygiene**, nothing more. Replacing
a filename with an opaque `SM-<hash>` id does **not** change the underlying
screenplay's copyright status and does **not** make the corpus
distributable. A public repo that stops spelling out "The Avengers" in a
committed JSON file is still a repo whose research corpus is private,
copyrighted, and off-limits to redistribute. P1's "legally distributable
benchmark" requirement (`ROADMAP.md`) is a **separate, unresolved sourcing
problem** this work does not touch or claim to solve.

## 1. The problem

`scripts/output/corpus-split.json` and `tests/fixtures/real-corpus-manifest.json`
are committed to this **public** repo. Their entries carry the corpus's
literal file paths and titles — e.g. `crawl/action/the-avengers.fountain`,
`0Meet_the_Robinsons_FULL_SCREENPLAY.fountain.txt` — which means the public
repo currently enumerates the titles of thousands of copyrighted screenplays
that were privately, individually sourced for internal research. That
enumeration is the actual harm, independent of whether the screenplay text
itself is ever exposed.

## 2. The id scheme

```
id = "SM-" + sha256(normalizeScreenplay(rawFileText)).hexdigest.slice(0, N)
```

- **Hashed input is the NORMALIZED text**, not the raw file bytes.
  `normalizeScreenplay` (`server/nvm/analyze/screenplay-normalizer.ts`)
  reconstructs proper Fountain structure from double-spaced/wrapped imports
  (scraped PDFs, OCR) — it is a pure, deterministic function of the raw text
  and idempotent on already-clean input (see that file's own header for the
  full rationale). Hashing the normalized form means two byte-different
  extractions of the *same script* (e.g. a re-OCR'd PDF with different
  whitespace, or a re-wrapped copy) collapse onto the *same* id: the id
  tracks the **script**, not a particular file's bytes.
- **N = 8** by default, the native lowercase hex digits of a sha256
  hexdigest. Widened to **10 for every id in the run** (never mixed widths)
  if any two *different* scripts collide on their 8-char prefix, checked
  across the full set being migrated in one invocation. A collision is
  reported loudly if it happens; see `scripts/migrate-corpus-ids.mjs`'s
  `resolveWidth`.
- The id is therefore always `SM-[0-9a-f]{8}` (or, post-widening,
  `SM-[0-9a-f]{10}`) — matching the format `scripts/deidentify-outputs.mjs`
  (a sibling change targeting the CSVs under `scripts/output/`) already
  expects from this generator.

### Why these three properties (and not, say, a random UUID)

- **Opaque.** A hash carries none of the input's bytes — no title, no
  author initials, no length correlation an attacker could exploit.
- **Stable.** The same script text always yields the same id. Re-running
  the migration against an unchanged corpus is a no-op.
- **Recoverable.** If the private crosswalk (§3) is ever lost, re-running
  `scripts/migrate-corpus-ids.mjs` against the corpus regenerates every id
  byte-for-byte, because the id is a pure function of the script text. Past
  measurements keyed by id therefore never become unattributable — a random
  UUID would not have this property; it would sever the link permanently.

### `id` vs. `contentHash` — two different hashes, deliberately

Every migrated record also carries `contentHash`: the **full** sha256 of
the **raw** (un-normalized) file text, trimmed —
`sha256(rawFileText.trim()).hexdigest`. This is **not** a truncated version
of the id's hash; it hashes a **different input** (raw vs. normalized), on
purpose:

- `id` exists for stable, opaque, recoverable **identity**.
- `contentHash` exists to answer one narrower question: *is the local file
  byte-identical to the one a prior measurement locked its expectations
  against?* That question is already answered by
  `server/nvm/analyze/doctor.ts`'s exported `computeContentHash`, which
  hashes the raw trimmed text — exactly what `report.contentHash` is when
  `tests/core/real-script-corpus.test.ts` compares
  `report.contentHash === entry.contentHash` to decide between its
  byte-identical (exact) and floor-only assertion tiers.

Changing `contentHash`'s basis to the normalized text would have silently
demoted every one of that test's 72 entries from the exact tier to the
floor tier — same pass/fail outcome, much weaker assertions — without a
single test failing to announce it. That is exactly the kind of silent
precision loss this project's `CLAUDE.md` warns about, so the two hashes
are kept on their current, different bases on purpose. `computeContentHash`
is re-implemented (not imported) in the migration/verify scripts — a
one-line function — to avoid pulling `doctor.ts`'s full rule-pass tree into
a migration script just to hash a string.

## 3. What the committed manifests carry after migration

```
id            SM-<hash>, per §2
contentHash   full sha256(rawFileText.trim()), per §2
genre         extracted from the crawl/<genre>/... path segment, or null
              for root-level (non-crawl) files
origin        'crawl' | 'root' — see §5 for why this survives migration
sceneCount    preserved from the pre-migration record (not recomputed)
wordCount     preserved from the pre-migration record (not recomputed)
partition     'train' | 'val' | 'test' | 'excluded'   (corpus-split.json only)
health,
verdict,
sceneCount    preserved (real-corpus-manifest.json only — these are LOCKED
              expectations from a prior scoring run and are never silently
              recomputed by the migration)
file          "<id>.fountain" — the de-identified, flat filename. NOT the
              original filename. Kept as a field (rather than derived
              on-the-fly by every consumer) because scripts/split-corpus.mjs's
              test lock, tests/core/real-script-corpus.test.ts's
              `path.join(CORPUS_DIR, entry.file)`, and other existing
              consumers already key off a `.file` field — this is the
              minimal-blast-radius way to carry the id-based name.
```

No `name`, no original filename's title-bearing basename, no author/studio/
draft-date field survives migration.

## 4. Migration procedure (the maintainer's local steps)

```bash
# 1. Dry run — sanity-check the plan. Writes nothing.
node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus

# 2. Write the migrated manifests + the private crosswalk.
node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus --write

# 3. Verify the new layout resolves and every hash matches.
node scripts/verify-corpus-layout.mjs --corpus-dir=/path/to/corpus \
  --split-file=scripts/output/corpus-split.json

# 4. (Recommended) Flatten + rename the local files so a local `ls`
#    enumerates nothing either. Run AFTER step 2 — --rename automatically
#    recovers original paths from the crosswalk step 2 wrote once it
#    detects the manifests are already migrated.
node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus \
  --rename --rename-out=/path/to/corpus-flat            # dry run, prints the plan
node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus \
  --rename --rename-out=/path/to/corpus-flat --apply-rename   # actually renames

# 5. Re-verify against the flat, renamed directory.
node scripts/verify-corpus-layout.mjs --corpus-dir=/path/to/corpus-flat \
  --split-file=scripts/output/corpus-split.json

# 6. Point REAL_SCRIPT_CORPUS_DIR / measurement scripts at the flat dir and
#    re-run the P1 measurements (see MEASUREMENT_RUNBOOK.md). Commit ONLY
#    the migrated corpus-split.json / real-corpus-manifest.json (and,
#    optionally, this run's stdout as a paper trail). NEVER commit
#    corpus-crosswalk.json — see §3 of MEASUREMENT_RUNBOOK.md and the
#    warning in §5 below.
```

`scripts/migrate-corpus-ids.mjs --help` prints the full option reference;
its own header comment carries the same command sequence plus the exact
rationale for each step's ordering.

## 5. The private crosswalk

`scripts/migrate-corpus-ids.mjs --write` also writes `corpus-crosswalk.json`
(default path: `scripts/output/corpus-crosswalk.json`) — a plain JSON array
of `{ id, path, title, contentHash, partition? }` records mapping each id
back to the corpus's original path/title, for the maintainer's own local
audit. This is the same array-of-records shape
`scripts/deidentify-outputs.mjs` already documents and parses, so the two
tools compose without a translation step.

**This file must never be committed.** It re-enumerates exactly the titles
the id scheme exists to hide. Three independent layers enforce this:

1. `.gitignore` carries `corpus-crosswalk.json` / `corpus-crosswalk*.json` /
   `corpus-crosswalk*` rules.
2. The generator itself calls `git check-ignore` on its target path before
   writing anything and **refuses to write** if the path isn't covered —
   this fires even if someone deletes the `.gitignore` rule, or passes
   `--crosswalk-out` to a path outside the default. The refusal happens
   *before* the migrated manifests are written, specifically so a refused
   crosswalk write can never leave the committed manifests overwritten
   without the crosswalk that explains them.
3. A sibling marker file (`<crosswalk>.DO-NOT-COMMIT.txt`) is written next
   to it as a human-readable reminder, matched by the same gitignore rule.

If `git check-ignore` itself fails to run (git missing, path outside any
repo, etc.), the script fails **closed** — it refuses to write rather than
assuming the path is safe.

## 6. What's verified by execution vs. what awaits the maintainer

**Verified by execution, in this session, against real screenplay text**
(the 6 CC0 files in `data/screenplays/`, restructured into a synthetic
`crawl/<genre>/...` + root-level corpus layout, plus a synthetic
`real-corpus-manifest`-shaped fixture with one deliberately corrupted
`contentHash` to exercise drift detection):

- `migrate-corpus-ids.mjs --target=both` (dry run and `--write`) correctly
  computes `id`/`contentHash`/`genre`/`origin` for every entry, preserves
  `sceneCount`/`wordCount`/`health`/`verdict`, preserves array order and
  train/val/test/excluded membership exactly, and reports the deliberately
  corrupted `contentHash` as drift without silently overwriting it with
  something else.
- The test-set **relock proof**: the *old* lock recomputed from disk
  matched the committed value; the *new* (post-rename) lock differs from
  the old one (expected — see §7); the content-hash **multiset** of the
  test partition was independently computed before and after and shown
  identical, member-for-member.
- `--rename` (dry run and `--apply-rename`): correctly sources original
  paths from the manifest when it's pre-migration, and correctly falls
  back to the crosswalk once the manifest is already migrated (this
  fallback exists *because* a real bug was caught here during verification
  — see the inline comment above `planRename` in the script). The applied
  rename copies, **verifies the copy's content hash before deleting the
  source**, and refuses to overwrite a same-named file with different
  content.
- `verify-corpus-layout.mjs`: fails clearly (non-zero exit, per-check
  ✗ lines) against the pre-rename layout (files not yet at their id-based
  paths), and passes cleanly (all ✓, exit 0) against the post-rename flat
  layout — for both `corpus-split.json`-shaped and
  `real-corpus-manifest.json`-shaped inputs.
- The collision-widening logic (`resolveWidth`): a real 8-hex sha256
  collision cannot be manufactured from real content in reasonable time, so
  this was verified by extracting the exact function body and driving it
  with contrived colliding/non-colliding/duplicate-content/forced-width
  inputs (four cases, all passing) — see this migration's own report for
  the byte-for-byte diff confirming the tested copy matches the shipped
  function.

**Awaits the maintainer's local run** (cannot be done in this container —
the 761-script and 72-script corpora' text is not present here, and
fabricating ids/hashes for them would violate this project's honesty
requirement):

- Actually running `migrate-corpus-ids.mjs --write` against the real
  corpora, which would rewrite `scripts/output/corpus-split.json` and
  `tests/fixtures/real-corpus-manifest.json` with real ids. **Both files are
  unchanged by this work.**
- The real rename of the maintainer's local corpus files.
- Recording the *real* before/after test-set-lock values (§7) — the values
  in this doc's examples come from the synthetic run above, not the real
  761-script corpus.

## 7. The test lock is protocol-sensitive — re-lock is a one-time, evidenced event

`scripts/split-corpus.mjs` (lines ~120-132) computes the test-set lock as
`sha256(sorted("${file}:${byteSize}" for each test-set file))`. That hash
depends on **both** the filename and the byte size. A rename **necessarily**
changes the filename half of that string, so **the old and new lock values
are not comparable** — a different lock value is not, by itself, evidence
that the test set changed.

The actual guarantee the pre-registration protocol needs — *the test
partition is the same set of scripts, untouched, never tuned against* — is
proven instead by the **multiset of `contentHash` values**, which is
independent of filename. `migrate-corpus-ids.mjs` computes this proof
automatically on every `--target=split` run (see `testSetRelockProof` in
its output and in the migrated `corpus-split.json`) by:

1. Reading the **original** test-set file list and independently hashing
   each file from disk (a pass that does not reuse anything from the main
   migration loop, so it's a real cross-check, not an identity).
2. Comparing that "before" multiset, sorted, against the "after" multiset
   built from the migrated records' `contentHash` fields, sorted.
3. Recording both the recomputed **old** lock (proving the corpus dir used
   for migration is the same one that produced the committed lock) and the
   **new** lock (computed against the id-based flat filenames, valid once
   the rename in §4 step 4 has run) alongside the proof.

**Report the real before/after lock values from your own run** when you
commit the migrated `corpus-split.json` — treat the re-lock as the
deliberate, evidenced, one-time event it is, not a silent drift. The values
already embedded in a freshly migrated `corpus-split.json`'s
`testSetRelockProof` field are exactly that evidence; there is nothing
further to compute by hand.

## 8. Genre and origin — the field names, for the sibling probe fix

Genre existed only as a path segment (`crawl/<genre>/...`) before this
work; it's now an explicit `genre` field (string, or `null` for root-level
files with no genre segment).

`scripts/probe-animation-vs-live.mjs` derives a live-action/animation split
purely from whether a path starts with `crawl/`. That signal is preserved
under the field name **`origin`**, with values **`'crawl'`** and
**`'root'`** — chosen to match that probe's existing boolean check
(`relFile.startsWith('crawl/')`) one-to-one. The probe itself is out of this
change's ownership (a sibling change owns `scripts/probe-*.mjs`); this is
the field name it should read once it's updated to use ids instead of
paths.

## 9. What the id scheme does *and does not* protect

- It removes titles, original filenames, and any other author/studio/
  draft-date metadata from the committed manifests.
- **It does not hide the corpus's existence or its scale.** Anyone can see
  there are 761 (or however many) entries.
- **`contentHash` is one-way and reveals no title** — but it is a
  *provenance feature, not a leak*: anyone holding a candidate screenplay
  can hash it (raw text, trimmed, sha256) and compare against a committed
  `contentHash` to confirm — or refute — that a specific script is a member
  of this corpus. That's by design; it's how a third party could ever
  audit a specific membership claim without the maintainer disclosing
  anything.
- **`health` + `sceneCount` together are weakly semi-identifying.** A
  screenplay's scene count and this project's specific health score are not
  secret facts about it; someone who already suspects a particular script
  is in the corpus, and who can run this project's own scoring pipeline
  against their candidate copy, could corroborate that suspicion from the
  committed numbers alone (independent of `contentHash`). This is a real,
  acknowledged residual — de-identifying the *field names* does not
  de-identify every *number* those fields carry. It does not, on its own,
  let someone enumerate the corpus's titles from a cold start, which is the
  problem this scheme was built to solve (§1).
