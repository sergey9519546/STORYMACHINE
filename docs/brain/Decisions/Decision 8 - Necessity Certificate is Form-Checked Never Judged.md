---
type: decision
updated: 2026-09-13
sources: [docs/DECISION_LOG.md, server/lib/necessity-certificate.ts, NORTH_STAR.md, docs/story-generation/NECESSITY_CERTIFICATE.md, docs/CLAIMS_REGISTER.md, docs/research-archive/_CLEVER_MOVES.md]
status: active
---

# Decision #8 — A Necessity Certificate is Form-Checked, Never Judged (2026-09-13)

Building `docs/research-archive/_CLEVER_MOVES.md` §10's Necessity
Certificate — four questions an author answers about a scene before it is
generated — forces one question that every future quality feature will also
be asked: what does the engine do with the answers?

**Decided:** check the FORM only. Deterministic rules over the TEXT —
present, non-empty, at least 16 characters, at least four DISTINCT words,
not only placeholder phrases, not a restatement of the scene's own heading,
not a copy of a sibling answer — and no opinion whatsoever about the
content.

**Why not an LLM quality pass:** it is NORTH_STAR §1's *no LLM-as-judge*
verbatim. A model grading a stated reason is a verdict a user sees. There is
no version of that which is not the banned thing.

**Why not a deterministic "quality" heuristic — the tempting option:** a
rule demanding a time expression in `whyNow` is not a careful form check, it
is a BAD judge. It passes "at some point soon" and fails "the vault opens
once and it is opening", shipping the judgement of an LLM pass with none of
its ability while looking deterministic enough to trust. The archive's own
field COMMENTS describe exactly this option ("must reference a time-specific
event"); its code implements form-only. The code was right.

**What it gives up, stated rather than hidden:** a writer who fills all four
boxes with fluent nonsense passes. That is the archive's 10% case, and
optimizing for it is precisely how the check becomes a judge. The measured
failure mode is the SKIPPED question.

**What it commits the project to:**

- `checkNecessity()` makes no model call, reads no corpus, and returns the
  same result for the same input forever.
- Every surface showing a necessity verdict also shows what the check does
  NOT do. The sentence is one exported constant
  (`NECESSITY_CHECK_DISCLAIMER`), returned with every route response and
  registered as `docs/CLAIMS_REGISTER.md` row 117, so no surface can render
  the verdict without the limit on it.
- Thresholds are floors on EFFORT. A shallow but well-formed answer passes,
  and a test asserts it, so a future change that starts failing weak answers
  fails a test that says why.
- Raising a threshold is allowed. Adding a rule that reads for MEANING is
  this decision being revisited, not an implementation detail.

**Related:** [[Audit - 2026-09-13 Necessity Certificate]],
[[Decision 3 - Demote Generative Surface to Labs]] (the generative half is
unevaluated and Labs-gated — a quality judge bolted onto it would be a
verdict with no measurement behind it), [[Gate - Receipt Gate]].

## Sources

- `docs/DECISION_LOG.md` — "Decision #8"
- `server/lib/necessity-certificate.ts` (the rules, each with its own
  threshold note), `docs/story-generation/NECESSITY_CERTIFICATE.md`
- `NORTH_STAR.md` §1 — "No LLM-as-judge"
- `docs/CLAIMS_REGISTER.md` rows 117-118
- `docs/research-archive/_CLEVER_MOVES.md` §10
