# Lane record — TypeSafe cast alignment (2026-09-19)

**Branch:** `claude/fable-5-1-orchestrator-yil0xr`, from `5ec6a1db`.
**Flag:** `TYPESAFE_CAST_ALIGNMENT` — **off by default**, and off is a genuine
no-op (proved by test, not by inspection).

---

## 1. What this is

An opt-in step in the story-generation convergence loop that resolves
**model-invented character names to the cast the model was actually given**,
using TypeSafe's System One API — an API that does not write text, it *selects*
from options the caller supplies.

It exists for one measured finding. `docs/story-generation/STORY_BENCH_2026-09-13.md`
§4b: on the v2 bench run the candidate generator invented `PROTAGONIST`, `Alex`,
`Antagonist`, `Rila`, `Char1` instead of using the supplied cast, and
`IntentionalProof` — correctly — blocked **17 of 29** scenes. That is the first
bench finding that is about the MODEL rather than about the plumbing. Nothing in
the loop ever asked the cheap question: *is "PROTAGONIST" here just ILKA?*

That question has a closed answer set, which is exactly what System One is for:
this code hands it the cast, and the only answers it can give back are a cast
member this code already knew about, or `none`.

## 2. What it does NOT do

- **No quality judgment, ever.** No answer from this API reaches a health score,
  a verdict, or any user-visible number. NORTH_STAR.md §1 holds unchanged.
- **Nothing on the scoring path.** `node scripts/check-scoring-receipt.mjs
  5ec6a1db..HEAD` reports *no scoring-path files changed*. Neither
  `server/nvm/converge/**` nor `server/nvm/proof/tier1/intentional.ts` is
  reachable from `doctor.ts` (verified with the same walker
  `tests/core/pure-core-boundary.test.ts` uses).
- **No change to IntentionalProof's decision.** Its logic is byte-for-byte what
  it was; the only edit is a pure extraction of the `known`-set computation into
  an exported `knownCharacters()` (plus `charsReferenced`) so the alignment step
  and the proof share ONE definition of "grounded" instead of two that can drift.
- **No new character, no dropped op.** It rewrites a `charId` in place, in every
  op that references it, or it does nothing.
- **No new dependency.** Global `fetch`.
- **Decision #3's Labs gate is untouched**, as is every route schema.
- **Off by default**, and with the flag unset the loop's output is byte-identical
  to what it was before this lane (see §5).

## 3. Design decisions, and why

**Where the step sits.** In `server/nvm/converge/loop.ts`, immediately before
`runTier1(candidate, state)` for each candidate — not inside the generator. That
is the last point at which the candidate is still just an IR and the first at
which the thing that would reject it is about to look. Putting it in the
generator would have meant aligning candidates that the loop may never prove,
and would have coupled name resolution to one generation path.

**One request per candidate, not one per name.** Every unknown name in the
candidate travels in a single request carrying, per name, a Score
(`<name>_relation`) and a Choice (`<name>_which`). Question ids are the
sanitised name plus a disambiguating index where two names would collide — a
`charId` is model-authored text and can contain anything, so the index → name
mapping is kept in code rather than parsed back out of an id.

**Two gates, decided in code, not in the prompt.** System One reads instructions
literally and cannot count, so this code — not the model — decides what
"resolved" means. A rename happens only when **both** hold:

- the relation score **rounds to 2** ("clearly one of the cast members"), and
- the choice is a real cast member (one this code offered) at **confidence ≥ 0.6**.

Anything else leaves the op untouched and the name in `unresolved`, so
IntentionalProof blocks it exactly as it does today. The live probe in §4 is why
both gates exist: on an invented `PROTAGONIST` with no evidence, the ladder said
"possibly" and the choice was still willing to name someone. Either gate alone
would have been wrong.

**A small state.** `{cast, names, scene:{function,tension,theme?}, candidate}`,
where `candidate` is a short plain-text rendering of only the ops that name a
character (capped, control-stripped through `sanitizeForPrompt`). System One is
jagged: irrelevant state degrades the answer. `themeHint` is read here because
it is already on `SceneTarget` and already unread; wiring it into GENERATION is a
different lane and was not touched.

**The failure contract, split in two.** The adapter
(`server/lib/ai-providers/typesafe.ts`) **throws** `TypeSafeUnavailableError` for
every failure — missing key, HTTP error, timeout, caller abort, malformed body —
and never returns a default answer. The caller
(`server/nvm/converge/cast-alignment.ts`) turns that into an explicit
`{applied:false, reason, error}` record and returns the IR **unchanged**. This
codebase's documented failure mode is fallbacks that look like success (STORY_BENCH
§1; the 2026-09-19 session report §4 rows 1–3), so the honest record is
mandatory and the skip is logged (`typesafe_cast_alignment_skipped`).

**Where the record lives.** `ConvergeStep.castAlignment`, beside `tier1Results`,
because the two are read together: the alignment is what the proof saw before it
ran. It is present whenever the feature ran — **including when it failed** — and
absent only when the flag is unset, which is a configuration state rather than an
event (recording it would put one line of noise on every candidate of every
converge on every deployment that never opted in, and would change the
`POST /api/nvm/converge` response body for everyone). *`ir.provenance` was the
other candidate home and was rejected: its type is `{origin, createdAt, model?}`
and widening it changes a shape that is hashed into commits and the ghost ledger.
So the alignment is **not** recorded in provenance — stated here rather than done
quietly.*

**Reproducibility.** The adapter caches by sha256 of the canonical JSON of
`{model, state, questions}` (LRU, 256 entries), so an identical request returns
the identical answer without a second call. The model id is **pinned**
(`jev-1.13.0`) rather than an alias, for the same reason. The API key is not part
of the cache key.

**Secrets.** `TYPESAFE_API_KEY` is read from the environment at call time, sent
only in the `Authorization` header, and appears in no log line, no error message
and no cache key. `redactSecrets()` scrubs it out of upstream text before it can
reach a thrown message — tested against an upstream that echoes the key back. One
structured log line per call (`typesafe_system_one_call`: model, ms, input/output
tokens, cacheHit) and never the state text; a test spies the logger and asserts
both absences.

**Injectable transport.** `setTypeSafeTransport()` / `resetTypeSafeTransport()`,
the same shape of seam as `setLLMProvider` in `server/engine/ai.ts`. No test in
this lane opens a socket.

## 4. The live smoke (one call, synthetic state only)

Run once through the adapter itself, on the synthetic reference state — **no
repository screenplay text was sent**:

```
node --env-file=.env --experimental-strip-types <probe>     # probe kept out of the repo
```

state: `{"cast":["ILKA","DESMOND"],"name_in_candidate":"PROTAGONIST","scene_note":"Ilka argues the bridge is safe; Desmond wants it stopped."}`

The structured log line the adapter emitted (verbatim; note that it carries no
state text and no key):

```
{"time":"2026-09-19T08:52:41.081Z","level":"info","msg":"typesafe_system_one_call","model":"jev-1.13.0","ms":368,"inputTokens":453,"outputTokens":54,"cacheHit":false}
```

The answer:

```json
{
  "requestedModel": "jev-1.13.0",
  "ms": 370,
  "model": "jev-1.13.0",
  "answers": {
    "relation": { "type": "score", "score": 0.97, "confidence": 0.87,
      "probabilities": { "0": 0.06, "1": 0.91, "2": 0.03 },
      "legend": { "0": "a different character not in the cast",
                  "1": "possibly one of the cast, unclear which",
                  "2": "clearly one of the cast members" } },
    "which": { "type": "choice", "choice": "none", "confidence": 0.73,
      "probabilities": { "ILKA": 0.16, "DESMOND": 0.02, "none": 0.82 } }
  },
  "usage": { "input_tokens": 453, "output_tokens": 54 },
  "cacheHit": false
}
```

**Read it as the conservative case working.** `0.97` rounds to 1 — "possibly one
of the cast, unclear which" — and the choice is `none`. Both gates fail, so this
lane's code leaves `PROTAGONIST` exactly where it is and the proof blocks the
candidate as it does today. The brief's earlier hand-run of the same state (with
differently worded instructions) got `relation` 1.03 and `which` = ILKA at
confidence **0.15**; either wording lands in the same place — **unresolved** —
which is the point: on evidence this thin the API declines, and the thresholds
are set so that declining is what happens.

This is one call on synthetic text. It demonstrates the transport, the pinned
model, the answer shape and the redacted log line. **It is not evidence that
alignment improves anything**, and no such claim is made anywhere in this lane —
measuring that would take a bench run with the flag on, which is a separate
piece of work.

## 5. Gates

All run on this lane's HEAD.

| command | exit | summary |
|---|---|---|
| `node --experimental-strip-types tests/core/typesafe-adapter.test.ts` | 0 | tests 16, pass 16, fail 0 |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | 0 | tests 8, pass 8, fail 0 (the new audit directory has its note) |
| `node --experimental-strip-types tests/nvm/converge/cast-alignment.test.ts` | 0 | tests 19, pass 19, fail 0 |
| `node --experimental-strip-types tests/core/llm-seam-wiring.test.ts` | 0 | tests 7, pass 7, fail 0 |
| `node --experimental-strip-types tests/core/pure-core-boundary.test.ts` | 0 | tests 6, pass 6, fail 0 |
| `node --experimental-strip-types tests/routes/route-capabilities.test.ts` | 0 | tests 6, pass 6, fail 0 |
| `node --experimental-strip-types tests/routes/nvm-converge-select.test.ts` | 0 | tests 9, pass 9, fail 0 |
| `npm run lint` | 0 | `tsc --noEmit`, clean |
| `npm run check-no-console` | 0 | 310 files under `server/` checked, 24 quarantine entries applied, OK |
| `node scripts/check-scoring-receipt.mjs 5ec6a1db..HEAD` | 0 | **no scoring-path files changed** |
| `npm run check-server-reachability` | 0 | every unreachable file is a documented known-dead entry |
| `npm run brain` / `npm run check-brain` | 0 | graph regenerated, every wikilink resolves |
| `RUN_E2E=1 npm test` | 0 | tests 14380, suites 2488, **pass 14286, fail 0**, skipped 93, todo 1 (332.8 s) |

**The two fail-first assertions.** `tests/nvm/converge/cast-alignment.test.ts`
contains case (c) — the only case that rewrites anything — as a pair:
`intentionalProof(ir, state).pass` is asserted **false** on the unaligned IR
*before* the alignment runs, and **true** on the aligned one after. The "before"
half fails first, so a rewrite that quietly did nothing cannot pass the test.
`tests/core/typesafe-adapter.test.ts` tests the adapter only (missing key, HTTP
error, malformed body, timeout, cache, log-line redaction) and never calls
intentionalProof. *(Corrected 2026-09-19 by the independent verifier.)*

**The flag-off property, tested rather than asserted in prose.**
`tests/nvm/converge/cast-alignment.test.ts` runs `convergeScene` with the flag
unset and checks (1) the transport is never called, (2) `alignCandidateCast`
returns the *same object reference*, and (3) the serialised history step has no
`castAlignment` key at all.

## 6. Files

- `server/lib/ai-providers/typesafe.ts` (new) — the System One adapter.
- `server/nvm/converge/cast-alignment.ts` (new) — the step and its decision.
- `server/nvm/converge/loop.ts` — the hook, plus `ConvergeStep.castAlignment`.
- `server/nvm/proof/tier1/intentional.ts` — extraction only (`knownCharacters`,
  `charsReferenced` exported; decision logic untouched).
- `tests/core/typesafe-adapter.test.ts`, `tests/nvm/converge/cast-alignment.test.ts` (new).
- `.env.example`, `README.md` — the three env vars.

## 7. Known limits, stated rather than discovered later

- **Adversarial text in the state can steer the answer.** The state contains
  model-generated op renderings. That is acceptable HERE and only here: the blast
  radius of a steered answer is "an op is renamed to a cast member who was
  already in the cast", after which the deterministic Tier-1 proof runs normally.
  It would not be acceptable for anything that scores.
- **No AbortSignal is forwarded from the loop**, because `convergeScene` carries
  none — the route races the whole operation against its own budget
  (`server/routes/nvm/converge.ts`). The adapter's 10 s timeout is the deadline,
  and `alignCandidateCast` accepts a `signal` for the day the loop has one.
- **Cost is one extra API call per candidate that has an unresolved name** (the
  adapter's cache collapses identical requests, which the loop does produce when
  a mutation leaves the named ops alone). It is bounded by `MAX_UNKNOWN_NAMES`
  (12 names per request) and by the flag being off.
- **The fallback IR path is not aligned.** When no candidate ever passes Tier 1,
  the loop's last-resort `finalIR` comes from `lastCandidates`, which holds the
  pre-alignment objects. That is deliberate — that path is already "return
  something rather than nothing" — but it means an aligned IR is only ever what
  was actually proved.
