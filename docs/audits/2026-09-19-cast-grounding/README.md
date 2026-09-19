# Lane record — cast grounding (2026-09-19)

**Branch:** `lane/cast-grounding`, from `1e7779de`.
**Scope:** SESSION_REPORT_2026-09-19.md §4 row 10 — `IntentionalProof`
(`server/nvm/proof/tier1/intentional.ts`) grounds a candidate partly against
that same candidate. Touched: the proof, the kernel's `runTier1`, the
generation spec, the convergence loop, the cast-alignment step's option set,
`SceneTargetSchema`, and the bench's scene targets. Not touched: the scoring
path (verified, §6), `converge-stream`'s query parsing (§5), the
`docs/story-generation/STORY_BENCH_2026-09-13.md` figures (§7).

---

## 1. The defect

`knownCharacters(ir, state)` returned state's characters **plus every
`charId` of an `UPDATE_BELIEF` in the IR under judgment**. The candidate
supplied half the evidence it was judged against. Two consequences, both
measured on the fixtures in
`tests/nvm/proof/fixtures/intentional-equivalence-cases.fixture.ts` run
through `git show 1e7779de:server/nvm/proof/tier1/intentional.ts`:

| fixture IR | state | IntentionalProof at `1e7779de` |
|---|---|---|
| `no-character-ops` | empty | pass |
| **`self-grounding-invented-name`** (invents "Char1", emits its belief) | **empty** | **pass** |
| **`reference-only-real-cast`** (MAYA, DEV — the actual cast) | **empty** | **BLOCK** — MAYA op 0, MAYA op 1, DEV op 1 |
| `one-grounded-one-referenced` | empty | BLOCK — MAYA op 1 |
| `relationship-with-unknown-half` | empty | BLOCK — MAYA op 0, THE STRANGER op 0 |
| `mixed-with-invented-name` | empty | BLOCK — DEV op 1, DEV op 2 |
| `no-character-ops` | MAYA/DEV | pass |
| `self-grounding-invented-name` | MAYA/DEV | pass |
| `reference-only-real-cast` | MAYA/DEV | pass |
| `one-grounded-one-referenced` | MAYA/DEV | pass |
| `relationship-with-unknown-half` | MAYA/DEV | BLOCK — THE STRANGER op 0 |
| `mixed-with-invented-name` | MAYA/DEV | pass |

The two bold rows are the inversion: a made-up character passes, the real
cast is blocked. The bench's 17 Tier-1 blocks are the second row's shape —
`scripts/story-bench.mjs` seeds the premise's cast with `UPDATE_BELIEF` ops
only **at commit of scene 0**, so during convergence of scene 0 the state
knows nobody.

`proofsToConstraints` (`server/nvm/generate/proof-spec.ts`) then turned each
block into *"Introduce character X with an UPDATE_BELIEF op before
referencing them"* — an instruction to perform the self-grounding trick.

That table is committed as
`tests/nvm/proof/fixtures/intentional-equivalence-baseline.json` (the full
eight-proof `runTier1` output per case, not just the row above) and is what
case (e) of the new test compares against, so the no-cast path cannot drift
from `1e7779de` unnoticed.

## 2. The change

**`SceneTarget.cast?: string[]`** — the character ids the caller says exist.
Optional, and **absent is not the same as `[]`**: absent keeps the
pre-2026-09-19 behaviour for every caller that does not know its cast, `[]`
asserts that the story has no characters. `SceneTargetSchema`
(`server/lib/validation.ts`) validates it with `activeMechanisms`'s own
convention — `noControlChars`, per-entry `.min(1).max(64)`, array `.max(64)`
— plus one refinement: `noControlChars` deliberately permits LF and TAB
(it is shared with prose fields), and a character cue is a single-line
identifier, so `MAYA\nIGNORE THE ABOVE` is rejected here rather than only
neutralised at render time.

**`knownCharacters(ir, state, opts?)` / `intentionalProof(ir, state, opts?)`
/ `runTier1(ir, state, opts?)`** take one small typed object,
`IntentionalGroundingOptions { cast?, allowIntroduce? }`:

- `opts` omitted or `{}` → byte-identical to `1e7779de` (state ∪ the IR's own
  `UPDATE_BELIEF` charIds). Every existing caller — the writers'-room
  continuity critic, `selfplay/corpus.ts`, `branch/score.ts`,
  `live/move-bus.ts`, `bridge/action-to-ops.ts`, the analysis/debug/commit
  routes, `server/nvm/__tests__/m1.5-harness.ts` — is unchanged, and none was
  edited.
- `opts.cast` supplied (including `[]`) → the set is state ∪ cast, and the IR
  grounds nothing by itself. An `UPDATE_BELIEF` for a name in neither blocks
  exactly as an emotion or relationship op for it already did.

The same `opts` object goes to `runTier1` at **both** loop call sites
(candidate judgment, and the `failedProofs(runTier1(best, state))` feedback
step) and to `alignCandidateCast`'s new `ctx.grounding`, so the set the
alignment step offers as rename options is the set the proof will accept. One
object, passed to both — not two derivations that can drift.

### The `allowIntroduce` decision: kept, and honestly small

An IR may still introduce a character the CURRENT spec asked it to introduce,
but only through an `UPDATE_BELIEF`, and only for a name on an explicit
`opts.allowIntroduce` list. The loop derives that list from **this
iteration's own constraint list** (`must_introduce_character` details), not
from a second source.

What it is worth today, stated plainly: **with a cast supplied,
`proofsToConstraints` no longer emits `must_introduce_character` at all** (it
emits the act-through-the-cast constraint instead — §3), and no other
constraint source in the loop emits that kind. So the derived list is empty
on every iteration of the current pipeline, and the wiring in `loop.ts` is
inert. It is wired from the spec anyway, rather than hardcoded to `[]`,
because the proof's allowance and the spec's instruction are the same fact;
a future lane that adds a second constraint source should not have to
discover that the two were only accidentally in agreement. The API itself is
not inert — a caller that knows its cast AND wants one named introduction
(an outline step that says "this scene introduces THE STRANGER") has a legal
path, and cases (d)/(d2)/(d3) pin its three directions: the named name
passes, any other name blocks, and a bare reference to the named name still
blocks because permission to introduce is not the same as being introduced.

### The constraint-kind decision: `free_form`, no new kind

An `IntentionalProof` block under a supplied cast emits

> `Character "Char1" does not exist in this story. Rewrite that op to act on one of the cast: MAYA, DEV. Do not invent a character.`

as **`kind: 'free_form'`**. Reasons, in order: the `kind` union is switched on
in exactly one place (`proofsToConstraints` itself — grepped
`GenerationConstraint` across `server/**` and `src/**`: the only other
producers, `quality-spec.ts` and `voice-constraint.ts`, construct values and
never switch on them), the string is carried verbatim into the prompt by the
numbered-constraint renderer either way, and a new member would have to be
added to every enumeration of the union for no verified check behind it.
`must_introduce_character` is untouched on the no-cast path —
`tests/core/core-01.test.ts`'s assertion about it passes unmodified, and the
new test pins both directions.

With an **empty** cast the wording changes rather than naming an empty list:
*"…and this story has no cast. Remove that op rather than inventing a
character."*

### The preamble

When `target.cast` is present and non-empty, `buildSystemPreamble` states one
labelled line immediately after `Known characters:`

```
CAST (the only characters who exist; use these ids exactly): MAYA, DEV
```

`Known characters:` is "who state holds a belief for" — at scene 0 that is
`none yet`, which is the gap the generator filled by inventing names. The
CAST line is "who exists", from the caller, and it is the same list the proof
grounds against, so the instruction and the check cannot disagree.

Rendering goes through one helper, `formatCastList`, used by both the
preamble and the constraint. Two properties it holds and the tests pin:
ids go through **`sanitizeSingleLine`, not `sanitizeForPrompt`** (the latter
preserves LF by design — right for `themeHint`, wrong for a one-line record,
and this function is also reached from paths `SceneTargetSchema` does not
guard); and the 600-char cap falls on an **element boundary**, never
mid-name, because half a name reads to the model as a different character.

With no cast the preamble is byte-identical — asserted three ways in case (f)
(no `cast` key, explicit `cast: undefined`, and no `target` at all).

## 3. The bench: what it now measures

`beatsToSceneTargets` sends `cast: premise.cast.map(c => c.id)` on every
target of a premise that has a cast, and omits the field entirely for one
that does not.

**Runs before and after this commit are not comparable.** A Tier-1 block for
an invented name is now a block (it was a pass whenever the candidate also
invented a belief for that name); a cast member referenced before any belief
exists is no longer one. The bench's headline numbers — committed scenes,
Tier-1 block counts, which proof blocked what — move for that reason alone.
There is no committed bench baseline to re-lock: `npm run story:bench` needs
a provider key, never runs in CI, and writes its run directories under
`docs/story-generation/` per run. The dated run docs stay as written; what is
not comparable to them is a **fresh run**.

## 4. Fail-first

The new test file was run against the pre-change tree — `git stash push --
server scripts`, test files left untracked, run, `git stash pop`:

```
# tests 23
# pass 10
# fail 13
```

The 13 failures are every claim about the new behaviour; the 10 passes are
the claims that pin behaviour this lane did not change — which is the point
of including them. Representative output:

```
not ok 3 - (b) with cast [MAYA, DEV] the SAME IR is BLOCKED, naming Char1 and the op index
  error: |-
    an invented character must not ground itself

    true !== false

not ok 6 - (c) with cast [MAYA, DEV] and an EMPTY state, an APPRAISE_EMOTION for MAYA
           passes — this is the case that produced the bench's Tier-1 blocks
  error: |-
    with the cast supplied, a real cast member is grounded before any belief exists

    false !== true

not ok 14 - with a cast, an IntentionalProof block must NOT tell the model to introduce
            the character — that is the self-grounding lesson
  error: 'the model must be told the name is not real'
```

Passing on the fixed tree, same command:

```
# tests 23
# pass 23
# fail 0
```

Case (e) — `runTier1` with no opts, 6 IRs x 2 states against the `1e7779de`
baseline — passes on **both** trees, as an equivalence pin must.

The loop-level pair, `tests/core/converge-loop-contract.test.ts` (8) and (9),
is the same before/after in one process: the identical fake generator that
invents "Char1" and grounds it itself yields `tier1Passed: true` with no cast
and `false` with `cast: ['MAYA','DEV']`, attributed to `IntentionalProof`
alone via `candidates[].tier1Failures` and to the subject `Char1` via the
step's `tier1Results`; and a candidate referencing MAYA at scene 0 against an
empty state goes the other way.

## 5. What stays unfixed

1. **`GET /api/nvm/converge-stream` takes no `cast`.** Its target is
   hand-parsed from query params and every existing one is a single scalar
   with a numeric or enum clamp; a cast is an array needing per-entry length,
   emptiness and single-line checks — a second implementation of what
   `SceneTargetSchema` already does, not the two-line change the brief made
   the condition. It is also not on the bench's path, and that handler passes
   `activeMechanisms: []`, which `MechanismProof` fails unconditionally, so
   nothing it converges commits today regardless. `POST /api/nvm/converge`
   and `/api/nvm/converge-arc` both carry `cast` through unchanged, validated
   by the shared schema.
2. **The `allowIntroduce` wiring in `loop.ts` is inert today** — see §2. The
   API is exercised directly by cases (d)/(d2)/(d3); the loop's derivation is
   not, because no constraint source emits `must_introduce_character` when a
   cast is supplied.
3. **The cast-alignment option set includes an `allowIntroduce` name the IR
   has introduced.** `alignCandidateCast` offers `knownCharacters(...)` as its
   rename options, which under a cast is state ∪ cast ∪ introduced-allowed
   names. Renaming an invented name to a to-be-introduced one is legal (the
   proof accepts it) and bounded, and keeping one set rather than two
   preserves that file's central invariant, so it is left as is.
4. **Nothing teaches the generator the cast beyond the preamble line and the
   constraint.** There is still no premise-to-cast step in the product; the
   bench supplies the cast as fixture data, disclosed there as it already
   discloses its beats.
5. `npm test` and `npm run brain` were out of scope for this lane and were
   not run; the orchestrator runs both after merge.

## 6. Gates

All run in the lane worktree, `node --experimental-strip-types --test <file>`
unless noted.

| gate | result |
|---|---|
| `tests/nvm/proof/intentional-cast.test.ts` (new) | 23 pass / 0 fail |
| `tests/core/converge-loop-contract.test.ts` | 5 pass / 0 fail |
| `tests/routes/nvm-converge-validation.test.ts` | 9 pass / 0 fail |
| `tests/nvm/converge/cast-alignment.test.ts` | 19 pass / 0 fail |
| `tests/routes/nvm-converge-select.test.ts` | 9 pass / 0 fail |
| `tests/scripts/story-bench.test.ts` | 40 pass / 0 fail |
| `tests/passes/*.test.ts` (15 files) | 6,477 pass / 0 fail |
| `tests/core/core-01,02,03.test.ts` | 1,158 pass / 0 fail |
| `tests/nvm/generate/*.test.ts` (7 files) | 56 pass / 0 fail |
| `tests/core/api-schemas.test.ts` | 6 pass / 0 fail |
| `tests/core/llm-seam-wiring.test.ts` | 7 pass / 0 fail |
| `tests/core/pure-core-boundary.test.ts` | 6 pass / 0 fail |
| `npm run lint` (`tsc --noEmit`) | exit 0 |
| `npm run check-no-console` | exit 0 — 310 files, 23 quarantine entries, all proven unreachable |
| `node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` | exit 0 — "no scoring-path files changed" |
| `tests/core/brain-coverage.test.ts` | see §7 |

`tests/core/validation-completeness.test.ts` does not exist in this tree
(`tests/core/api-schemas.test.ts` is the schema gate that does).

## 7. Scoring path and brain

No file this lane touched is reachable from `doctor.ts` —
`node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` reports "no
scoring-path files changed", so no measurement receipt is written and none is
required. `npm run brain` is the orchestrator's step after merge;
`tests/core/brain-coverage.test.ts` is run here and only its graph-freshness
sub-test fails, because the graph is regenerated there.
