---
type: audit
updated: 2026-09-13
sources: [docs/audits/2026-09-13-story/story-bench-lane-report.md]
status: active
---

# Audit — 2026-09-13 Story Bench Lane

**Directory:** `docs/audits/2026-09-13-story/` (the lane report for
`lane/story-bench`, which built `npm run story:bench`).

**What it is:** the record of the first lane on the owner's 2026-09-13
direction — "the storymachine ability to actually generate good and quality
stories" — which deliberately measures rather than tunes. It carries the model
of what the generation pipeline IS, the six-premise run table, two honest
first-person readings of generated scripts, every gate's exit code, and each
adapter guard's recorded failure on its unfixed input.

**What it found in the code, before spending a single generation:**

- **No premise-to-outline step exists.** Both converge routes require a
  `SceneTarget[]` from the caller. The brief assumed one; it does not exist,
  and that is finding #1.
- **The compiled screenplay is template output, not prose.**
  `server/nvm/project/index.ts`'s `renderFountainOp` maps each StoryOp to a
  constant English sentence. The 14-pass revision is the only prose step.
- **That step was inert on the configured endpoint.** Both generative call
  sites used the `geminiProvider` constant rather than the provider seam, so
  every call took its no-key fallback — fourteen clean passes and no generated
  writing.
- **Neither generative call site uses `generateContent()`**, so neither is
  bounded by its 30 s timeout or its retry. The brief assumed both.
- **`POST /api/export/pdf` does not exist.** Server-side export offers fdx,
  docx, print-html, coverage and slate; the PDF writer is `src/lib/pdf.ts`'s
  dependency-free `fountainToPdf()`, which the packet uses directly.
- **The adapter cannot use an ambient `HTTPS_PROXY`**, by design — it pins its
  own dispatcher to a re-validated IP. In a proxy-only sandbox that makes every
  call fail before a byte leaves the box, so the bench stands up a loopback
  relay rather than weakening the guard.

**What it did NOT do:** it tuned nothing — no prompt, craft-spec directive,
pass order or convergence budget was changed to move a number; it moved no
Labs gate and satisfies no part of [[Decision 3 - Demote Generative Surface to Labs]]'s
re-promotion condition; and it touched no scoring-path file
(`check-scoring-receipt main..HEAD` reports none changed). See
[[Generation - Story Bench]] for the instrument and
[[Decision 8 - Generation Quality Becomes a Measured Track]] for the ruling.
