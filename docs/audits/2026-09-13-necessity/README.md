# The Necessity Certificate — 2026-09-13

The first lane of the story-generation track that the owner opened on
2026-09-13 ("work on STORYMACHINE's ability to actually generate good and
quality stories that people will value"). It builds the one design the
research archive calls the cheapest quality lever available and that was
never built: `docs/research-archive/_CLEVER_MOVES.md` §"Necessity
Certificate", whose standing instruction is *"Don't try to LLM-judge 'is
this a good reason?'"*

## The lane

| lane | what it is | rounds | landed |
|---|---|---|---|
| `necessity-certificate` — four questions on every outline beat (why now, why here, why them, what forces it), form-checked by a pure deterministic function that never judges whether an answer is good; carried inside the beat's own JSON rather than on a scoring-path type; the four answers reach the scene-generation prompt through the preamble the generator already sends; a keyless check route and a writer-facing surface whose copy says plainly that it checks you answered, not whether the answer is good | REVISE 5 (the placeholder rule rejected 3 of 10 real writer answers; no must-pass fixtures; a reason sentence that asserted something false in exactly the over-firing case; a context-restatement rule that could not be defended; the surface and the generator checking one certificate two ways) → MERGE | this merge (see `git log`) |

## What a writer gets today, in one sentence

Four labelled questions on each outline beat, a deterministic check that they
are answered with a per-field reason, answers that survive save and reload —
and no scene any shipped client generates reads them yet, which the surface
copy and `docs/CLAIMS_REGISTER.md` row 118 both say in those words.

`necessity-lane-report.md` and `necessity-review.md` are the full record,
with every reproduction's command and number.
