# STORYMACHINE — Project Memory

## CRITICAL RULE — applies to EVERYTHING

For every feature or task, independently determine the strongest possible
implementation and build it to the highest standard of **functionality,
reliability, usability, performance, compatibility, and maintainability**.

This is not optional and not scoped to one kind of work. Before writing code,
decide what the best version of the change actually is — not the quickest one
that passes — and build that. Concretely, for each task:

- **Functionality**: solve the real problem completely; handle the edge cases,
  not just the happy path.
- **Reliability**: guard inputs, fail safely, and prove it with tests (both
  the firing case and the non-firing/no-op case).
- **Usability**: clear names, clear messages, output that helps the next reader.
- **Performance**: no needless passes over data; choose appropriate algorithms
  and data structures.
- **Compatibility**: match existing patterns, types, and conventions in the file
  and the codebase; don't break callers.
- **Maintainability**: distinct, well-documented logic; explain *why* in comments
  where intent isn't obvious; keep changes consistent with surrounding code.

## Security constraints (must always hold)

- API key MUST be written only to `.env` (gitignored) — never in tracked files.
- All AI calls go through server-side Express routes — never from the frontend bundle.
- All routes sit behind `gameLimiter` (or stricter endpoint-specific limiters).
- No new `console.*` in `server/**`.
- Pre-existing `apiKey` identifiers in `src/components/SettingsPanel.tsx` are
  runtime input-field prop bindings, not embedded secrets — leave them alone.

## Standing task — NVM revision quality-check waves

Continuously add **3 new narrative quality checks per wave** to the NVM revision
engine, indefinitely, rotating through the pass files in
`server/nvm/revision/passes/`:

```
dialogue → character-arc → conflict → intention → originality → pacing →
payoff → relationship-arc → rhythm → structure → theme → voice → belief →
causality → (repeat)
```

Each wave:
1. Pick the next pass file in the rotation. Identify **empty cells** in that
   pass's coverage matrix (signals × analytical modes × structural positions)
   and implement the 3 checks that are *maximally distinct* from every existing
   rule — strongest implementation per the CRITICAL RULE above.
2. Every new check carries full guard conditions and a comment block explaining
   the rule and an explicit **distinctness rationale** vs. related rules.
3. Update the file's header comment with a "Wave N additions:" summary line.
4. Add **6 tests** (fire + no-fire per check) in `tests/passes/<pass>.test.ts`
   (e.g. `tests/passes/conflict.test.ts`), inserted BEFORE the most recent
   prior wave's `describe` block in that file (newest-first order). The
   monolithic root `test.ts` no longer exists — it was split one file per
   pass (audit M2.1) specifically so each wave only touches a single ~3–5k
   line file instead of a 64k-line one.
5. Run `node --experimental-strip-types tests/passes/<pass>.test.ts` for the
   file you touched — require **0 failures**. Run the full suite
   (`npm test`) before pushing to confirm nothing else regressed.
6. Commit and push to the working branch (`claude/review-merge-prs-IJKUO`).

Analytical modes to draw distinct checks from: average/aggregate, single-peak
isolation, co-occurrence/decoupling, distribution/timing, zone presence/absence,
underweight/bloat, sequence/aftermath, backward-cause, run-based, valence.

### Test runner

```
node --experimental-strip-types tests/passes/<pass>.test.ts   # the file you touched
npm test                                                       # full suite before pushing
```

### Commit message trailer

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AAt5miy6V8g5uGQWqtvyZU
```
