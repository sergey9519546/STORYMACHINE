---
type: audit
updated: 2026-09-05
sources: [docs/audits/2026-09-04-reverification/REVERIFICATION.md]
status: active
---

# Audit — 2026-09-04 Reverification

**Directory:** `docs/audits/2026-09-04-reverification/`
(`REVERIFICATION.md`).

**What it is:** an independent, read-only re-derivation of every checkable
claim from [[Session - 2026-09-04 Hardening Batch]] and the
corpus-contamination / advice-audit records, at `main @ c21fdc5b`, using
the agent's own harnesses (not the original scripts) against `git archive`
snapshots of each cited SHA.

**Verdict counts:** **7 reproduced, 2 partially reproduced, 1 not
reproduced**, plus one sub-claim ("the worker realms" survivor in the
Delete-Everything finding) that is not observable from outside the process
at all. Corpus-contamination claim 1 (headers parsing as action, clue
seeds, suspense-value movement) reproduced exactly, digit for digit,
against the receipt's own table — but it also found **two errors inside
the receipt itself**: the stated reason some files "did not move" was
false even though the shape claim held, and "18 up / 1 down / 2 flat" was
actually **15 up / 1 down / 5 flat**.

**What was NOT reproduced:** the compare-route's "before" latency figure
and its "control moved 1ms" precision claim (re-measured control moved
42→101ms on the same box — not a stable property of the method); a claimed
compare-route mean-latency improvement (re-run measured it getting
*slower*); `verify-a11y.mjs`'s "zero serious/critical violations… in both
themes" (the landing-page timing-artifact bug, see
[[Session - 2026-09-04 Hardening Batch]]). The re-verifier's own
conclusion: the project's identity-receipt machinery held up perfectly
under adversarial re-derivation; every failure clustered in single-run
latency percentiles quoted past what a shared, variably-loaded box can
support, and one accessibility gate auditing a surface before it settled.

## Sources

- `docs/audits/2026-09-04-reverification/REVERIFICATION.md`
