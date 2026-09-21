# Pre-tier coverage artifacts — back-compatibility fixtures

`pre-tier-coverage.html` and `pre-tier-letter.md` are BYTE COPIES of artifacts
produced by commit `318493c9` — the last commit before
`server/lib/reader-tier.ts` existed, so neither document renders a producer tier,
neither publishes a tier claim row, and neither carries the verify block's scope
sentence or the tier's stylesheet rules.

They exist because `scripts/verify-report.mjs` refuses a document that renders a
reader summary page whose numbers its verify block does not publish, and that
refusal must never fire on an artifact that legitimately has no such page. A
synthetic stand-in cannot prove that: the 2026-09-12 round-2 review's own
"no-tier" case was the current renderer's HTML with the tier section cut out,
which still carried the tier's CSS and the scope sentence — a TAMPERED document,
correctly refused, and therefore no evidence about a real pre-tier report.

**Never regenerate these from the current tree.** Re-rendering them would make
them post-tier artifacts and the test would stop testing anything. Both were
rendered from the `MULTI_SCENE_FOUNTAIN` fixture in
`tests/scripts/verify-report.test.ts` (health 65.0, CONSIDER, 7 issues as
rendered by 318493c9; health 62.8 under the feature-length scoring candidate —
see "Numeric fields patched on 2026-09-21" below), which is the script the test
verifies them against.

## Known-limit artifacts — these VERIFY, and that is the point

`known-limit-relabelled-coverage.html` and `known-limit-relabelled-letter.md`
are forgeries that **pass** `npm run verify-report` at exit 0, byte copies of the
counterexample the 2026-09-12 round-2 review built. They are committed as a
fail-first target for whoever closes this limit, and as the evidence behind the
sentence the shipped docs now carry.

Both are built from a genuine export of `data/screenplays/chain-of-custody.fountain`
(13 scenes, 824 words, ~4 pages, health 76.3, CONSIDER, one tier finding at p. 2
as exported; health 77.7 and 129 issues under the feature-length scoring
candidate — see "Numeric fields patched on 2026-09-21" below).
The HTML took **14 mechanical edits**, the letter **17**:

- every `reader-tier` / `tier-*` markup class renamed to `rs-*` — AND the matching
  stylesheet selectors renamed with them, so no class is left unstyled and the page
  renders exactly as the genuine one does (the letter instead relabels
  `**Logline.**`→`**Premise.**`, `**Length.**`→`**Size.**`,
  `**Verdict.**`→`**Rating.**` and unspaces the health reading);
- `break-after: page` → `page-break-after: always`;
- the reader-summary caption reworded, the verify block's scope sentence replaced;
- the nine tier claim rows deleted (the letter also deletes its `Verdict:` row).

What the forged page then states, and what the verifier says about it:

| the page says | the engine says | reported |
|---|---|---|
| `9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)` | 13 / 824 / 4 / 4 | nothing |
| `Health percentile: top 5%` | not comparable | nothing |
| `The 9 things to fix first` | 3 | nothing |
| `p. 999` | p. 2 | nothing |

Every signal the verifier keys on is a machine-readable LABEL — a class name, a
stylesheet selector, a heading's wording, the scope sentence — so renaming all of
them costs the forger nothing a reader can see. A reader still sees a reader
summary page; the tool sees the pre-2026-09-11 report it now resembles, and
verifies it on the claims it does publish.

`tests/scripts/verify-report.test.ts` asserts both still exit 0, labelled as the
known limit rather than as a guard. **When a future lane closes this, those two
assertions flip to exit 1 and this section is deleted** — do not "fix" the
fixtures by regenerating them.

## Numeric fields patched on 2026-09-21 — the feature-length scoring candidate

`scripts/verify-report.mjs` re-runs the engine on the script text and compares
three claims the artifact publishes — health, verdict, totalIssues — and checks
that the rendered body agrees with the verify block. The feature-length scoring
candidate (`lane/land-feature-length-defects`: scarcity saturation at 12 scenes,
sub-1 density steepness 50 -> 2, the ORPHAN_CLUE name/title guard) changes what
the engine returns for both scripts, so all four copies stopped verifying at
exit 0 on numbers alone. The README's rule above stands: **none of the four was
re-rendered.** Only the fields the verifier named as mismatched were edited, in
place, at their line, with every structural byte (markup, classes, stylesheet,
captions, scope sentence, claim-row set, the four false statements) untouched.
The verifier's mismatch lines before the patch, and the edits:

| file | field | from | to | where |
|---|---|---|---|---|
| `pre-tier-coverage.html` | health | 65.0 | 62.8 | `.health-number` div, the verify block's `Health` row, and the plain-summary's "overall score 65/100" -> "63/100" (the rounded rendering of the same value) |
| `pre-tier-letter.md` | health | 65.0 | 62.8 | the "Health 65.0/100 (Solid)" line and the summary's "overall score 65/100" -> "63/100"; the grade stays "Solid" because the engine still grades 62.8 as solid |
| `known-limit-relabelled-coverage.html` | health | 76.3 | 77.7 | the header "Health 76.3 / 100", `.health-number`, the verify block's `Health` row, and "overall score 76/100" -> "78/100" |
| `known-limit-relabelled-coverage.html` | totalIssues | 178 | 129 | the verify block's `Total issues` row (the only place the value is printed) |
| `known-limit-relabelled-letter.md` | health | 76.3 | 77.7 | "**Rating.** CONSIDER · Health 76.3/100", the "Health 76.3/100 (Strong)" line (grade unchanged: 77.7 still grades strong), "overall score 76/100" -> "78/100", and the `Health:` block row |
| `known-limit-relabelled-letter.md` | totalIssues | 178 | 129 | the `Total issues:` block row |

Verdict (CONSIDER) did not move on either script, and neither pre-tier copy
claims totalIssues beyond the HTML's 7, which the engine still returns. After
the patch all four copies print `VERIFIED` at exit 0 with the same
`not claimed by this … report, so not checked: … sceneCount …` line as before,
and the two known-limit copies still state `9,999 scenes`,
`Health percentile: top 5%`, `The 9 things to fix first` and `p. 999` — their
exit 0 remains the documented limit, not a guard. If the engine's numbers move
again, patch these same fields again; do not regenerate the files.
