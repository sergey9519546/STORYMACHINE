---
type: gate
updated: 2026-09-05
sources: [scripts/check-doctor-output-identity.mjs, tests/scripts/check-doctor-output-identity.test.ts]
status: active
---

# Gate — Output-Identity Harness

**What it checks:** that a change claimed to be a pure refactor (originally
lane W2's performance work) does not move a single number, string, or array
element in any `ScriptDoctorReport`. A measurement receipt is the wrong
instrument for this claim — a discrimination statistic can stay identical
while individual reports drift — so this harness instead runs
`runScriptDoctor` over the full deterministic fixture set (all 20
`data/screenplays/*.fountain` fixtures, all 20 calibration
`REFERENCE_CORPUS` samples, the P0 sample script, and any nonlinear-timeline
fixtures) and snapshots one canonical JSON report per fixture, stripping
only `analyzedAt` (a deliberate wall-clock stamp, noise by construction).

**Command:**
```
git archive origin/main | tar -x -C /tmp/baseline
node scripts/check-doctor-output-identity.mjs --tree /tmp/baseline --out /tmp/before
node scripts/check-doctor-output-identity.mjs --tree . --out /tmp/after
node scripts/check-doctor-output-identity.mjs --compare /tmp/before /tmp/after
```
The baseline must be the branch being **merged into**, not the fork point —
using the fork point mixes unrelated report drift into the diff.

**Where it lives:** `scripts/check-doctor-output-identity.mjs`;
`tests/scripts/check-doctor-output-identity.test.ts`.

**What it cannot catch:** any difference in behavior that produces
byte-identical `ScriptDoctorReport` output but changes something else
observable (timing, memory, an internal-only field not serialized into the
report) — it proves report identity, not full behavioral identity.

## Sources

- `scripts/check-doctor-output-identity.mjs` (full header)
