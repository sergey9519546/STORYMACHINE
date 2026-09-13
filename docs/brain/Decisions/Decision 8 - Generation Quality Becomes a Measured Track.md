---
type: decision
updated: 2026-09-13
sources: [docs/DECISION_LOG.md, ROADMAP.md, scripts/story-bench.mjs, tests/fixtures/story-bench-premises.json, server/lib/ai-providers/openai-compat.ts, docs/story-generation/STORY_BENCH_2026-09-13.md]
status: active
---

# Decision #8 — Generation Quality Becomes a Measured Track (2026-09-13)

The owner's direction that day, in their own words: work mainly on "the
storymachine ability to actually generate good and quality stories that people
will value and be entertained by."

**Decided: measure before tuning.** The first lane on that direction builds an
instrument (`npm run story:bench`) and changes no prompt, no craft-spec
directive, no pass order and no convergence budget. The reason is the project's
own record: [[Decision 3 - Demote Generative Surface to Labs]] gated the whole
generative surface because *every LLM-adjacent test in this repository is
plumbing* — nothing asserts a rewrite is good, or even not worse than its
input. Ten days later that was still true, so there was no before to beat.

**What the bench is.** Six committed premises of six shapes (ensemble,
two-hander, comedy, non-linear, animation family, thriller), driven end to end
through the existing routes: converge per beat → commit → compile → the 14-pass
revision → the deterministic doctor. It records every LLM call's model, latency
and tokens, every fallback, both Fountain drafts and the score, under
`data/story-bench/<date>/` (gitignored). `--check` probes `/models` first;
`--packet` assembles the scripts into one Fountain file and one PDF with a
five-question rubric and a blank score grid.

**What it is NOT.** Not a gate, not in `npm test`, not in CI (it needs a key),
and it makes no quality claim. The doctor's health on a generated script is a
real measurement of that script's STRUCTURE and cannot see whether the story is
interesting. The packet is the SEED of Decision #3's ~30-case golden set — six
cases of about thirty, one scorer of at least two — and **the Labs gate does
not move**.

**What building it found first, before any measurement.** Three things the
brief for the lane, and the repository's own docs, had wrong:

- **There is no premise-to-outline step.** `POST /api/nvm/converge` and
  `/converge-arc` both require a `SceneTarget[]` from the caller; the Story
  wizard stops at a `StoryConfig`. The bench's beats are hand-authored in the
  fixture and every run says so.
- **The compiled screenplay is not generated prose.** `server/nvm/project/
  index.ts` renders each StoryOp through a fixed English sentence — "A
  dangerous hush falls over the room" is a string constant. The 14-pass
  revision is the only step in the pipeline that writes prose.
- **That step could not run at all on the configured endpoint.** Both
  generative call sites imported the `geminiProvider` CONSTANT instead of the
  provider seam, so every call threw *Gemini provider not available* and took
  its fallback: fourteen clean passes, a compiled script, a health score, and
  not one word written by a model. Fixed with `getLLMProvider()`, alongside
  four adapter guards (see [[Generation - Story Bench]]).

## Sources

- `docs/DECISION_LOG.md` — "Decision #8"
- `ROADMAP.md` — the P2 and P4 amendments of 2026-09-13
- `scripts/story-bench.mjs`, `tests/fixtures/story-bench-premises.json`
- `docs/story-generation/STORY_BENCH_2026-09-13.md` (method, table, readings)
- `docs/audits/2026-09-13-story/story-bench-lane-report.md`
