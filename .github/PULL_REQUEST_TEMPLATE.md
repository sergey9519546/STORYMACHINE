# Pull Request

## Summary

<!-- What does this change do, and why? One or two sentences. -->

## Checklist

- [ ] Tests added/updated
- [ ] `npm run lint` clean (type check)
- [ ] `npm test` exits 0
- [ ] `npm run build` clean
- [ ] No `console.*` under `server/**` (CI-enforced; use `server/lib/logger.ts`)
- [ ] `npm run honesty-audit` clean
- [ ] No new overclaim language
- [ ] Security: no secrets/keys serialized to clients (flags only)
- [ ] If touching routes: zod validation on body + correct limiter (`gameLimiter` or the stricter `aiLimiter` for any route that can trigger LLM calls)

## Notes for review

<!-- Anything reviewers should know: out-of-scope follow-ups, risky areas,
verification commands, screenshots, etc. -->

<!--
P0 FREEZE: no new engine/scoring/UI work without clearance. See ROADMAP.md
and CONTRIBUTING.md. Security fixes are the documented exception.
-->
