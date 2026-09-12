---
type: gate
updated: 2026-09-12
sources: [scripts/generate-rulebook.ts, tests/core/rulebook.test.ts, docs/rulebook/root-causes.md, server/nvm/analyze/cluster.ts]
status: active
---

# Gate — Rulebook Freshness

**What it checks:** that `docs/rulebook/**` — the generated, machine-counted
catalog `docs/rulebook/README.md` calls "the authority" and `CLAUDE.md`,
`NORTH_STAR.md` and this vault cite for the 3,217-rule figure — is a true,
zero-diff regeneration of the live pass files and extension points, not a
stale hand-edit or a silently broken extraction. `README.md` itself claims
regenerating is "idempotent (a no-op diff) until the next wave actually
changes something"; until 2026-09-12 nothing enforced that claim.

**What it found (2026-09-12 adversarial review, finding 14).** A clean
`npm run rulebook` on `main` added 16 lines to `docs/rulebook/root-causes.md`
— four root-cause clusters, three with an empty title, all four with an
empty `Requires:` list. Root cause: `extractRootCauseTemplates()` in
`scripts/generate-rulebook.ts` only recognized the field name
`requiredRules:` (the shape `server/nvm/analyze/cluster.ts`'s original ten
root-cause templates use) and only matched it, and `title:`, line-by-line
within a fixed 6-line lookahead. Eight newer `DuplicateFamily` entries in
`cluster.ts` name the same concept `memberRules:`, and four of those wrap
the array across more than 6 source lines — so the extractor silently
produced an empty member-rule list for all eight (four already wrong in the
COMMITTED doc, masked because the committed doc matched that broken output)
and an empty title for whichever pushed `title:` past the window. Every one
of the four newly-missing clusters has a real, human-authored title and
member-rule list in `cluster.ts` — this was a generator bug, not stale or
untitled content, so the fix is entirely in the generator (collect the
whole `id:`→`title:` field block, terminated at `explanation:`/
`observation:`, and regex the joined text instead of one field name on one
line) — `cluster.ts` itself is unchanged.

**Command:** `node --experimental-strip-types tests/core/rulebook.test.ts`
(part of `npm test`); reproduce by hand with
`node --experimental-strip-types scripts/generate-rulebook.ts` and diff
`docs/rulebook/` against the committed copy.

**Where it lives:** `tests/core/rulebook.test.ts`'s "regenerating into a
temp directory produces a zero diff" case, using the newly-exported
`generateRulebook(outDir)` (refactored out of `main()` so the CLI and the
test share one code path); a second case asserts every live-extracted
root-cause template has a non-empty title and Requires list, and a third
proves the check itself fires (feeds it the exact malformed shape this
finding reproduced). `scripts/generate-rulebook.ts` also now refuses to
write `root-causes.md` at all if any extracted cluster has an empty title
or Requires list (`assertRootCauseTemplatesWellFormed`), naming the
cluster(s), rather than publishing a heading with nothing in it.

**What it cannot catch:** a cluster that is genuinely untitled in
`cluster.ts` itself (as opposed to un-extracted) — the generator assertion
refuses to publish that case too, but a human still has to look at the
thrown error and decide whether the fix belongs in the extractor or in
`cluster.ts`. Also does not check the OTHER 13 generated files' extraction
logic for the same class of bug beyond what `extractAllPasses`'s own
rule-count tests already cover.

See [[Surface - Root Cause Pipeline]] for the DIFFERENT thing `cluster.ts`
also does — applying these same templates to one script's own findings at
analysis time, not documenting the template catalog.

## Sources

- `scripts/generate-rulebook.ts` (`extractRootCauseTemplates`,
  `assertRootCauseTemplatesWellFormed`, `generateRulebook`)
- `tests/core/rulebook.test.ts`
- `docs/audits/2026-09-12-adversarial/engine-logic.md` finding 14
