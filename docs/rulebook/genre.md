# Genre-Conditioned Rule Modifiers

Program v2 Type 3 rules: a small set of high-firing generic checks whose THRESHOLD (not existence) legitimately moves per genre, via `GENRE_RULE_MODIFIERS` in `server/lib/genre-router.ts`. A genre with no live modifier for a given rule falls through to that rule's own generic constant — so `storyContext.genre` being absent, unknown, or simply not listed is always byte-identical to the pre-Wave-1184 behavior. Never used to quiet a rule for everyone; only to make a guard fire on genuinely different, genre-specific craft expectations, each with a one-sentence craft argument for why.

## Wave 1188

Wave 1188 additions (Program v2, Type 3 — genre-conditioned, second of its kind): three more fields closing genre-coverage gaps (romance, sci_fi, mystery previously had no live modifier — see WEAK_MIDPOINT, ACT3_SCENE_EXCESS in structure.ts and EXPOSITION_DUMP in belief.ts for the call sites). noir remains uncovered pending a future wave's honest craft argument.

### comedy

Comedy's low point is measured in dignity and embarrassment, not survival dread (GENRE_MODIFIERS.comedy: "let characters keep their dignity stakes even when the situation is absurd"), so a milder suspense dip still legitimately counts as the "all is lost" beat — the floor loosens.

- `darkNightSuspenseFloor`: 0.5

### drama

Drama's register is grounded restraint (GENRE_MODIFIERS.drama: "silence and restraint do heavy lifting"), so a sustained, deliberately uniform cadence is a legitimate stylistic choice, not a defect — both rhythm checks loosen (fire less readily) for drama.

- `energyMonotoneCoV`: 0.25
- `pacingPlateauRatio`: 1.1

### horror

Horror's low point must carry genuine dread, not a passing dip (GENRE_MODIFIERS.horror: "creeping unease curdling into terror"), so the beat needs a higher suspense floor to count as earned — the floor tightens.

- `darkNightSuspenseFloor`: 1.5

### mystery

Mystery's climax is the extended solution reveal — walking the clues back, gathering and confronting suspects (GENRE_MODIFIERS.mystery: "the solution must be surprising yet inevitable in hindsight") — which legitimately runs longer than Act 1's setup, so a bigger Act 3 vs Act 1 imbalance is tolerated before it reads as a bloated resolution — the excess ratio loosens.

- `act3ExcessRatio`: 1.3

### romance

Romance's central pivot is relationship risk, not thriller-style suspense (GENRE_MODIFIERS.romance: "tension lives in proximity, restraint... the gap between what is wanted and what is said"), so a midpoint that reads as suspense-flat by the generic yardstick can still be a real dramatic pivot — the pressure floor loosens.

- `weakMidpointPressureFloor`: 0.4

### sci_fi

Sci-fi legitimately carries heavier early exposition than other genres (GENRE_MODIFIERS.sci_fi: "one rigorously-applied premise reshapes human behavior; follow it to its honest consequences" — establishing that premise costs scenes), so one additional consecutive told-only scene is tolerated before the streak reads as inert — the streak length loosens.

- `expositionDumpStreak`: 4

### thriller

Thriller's contract is forward momentum in every scene (see GENRE_MODIFIERS.thriller: "no scene ends in the same place it began"), so even moderate scene-length uniformity already reads as a stall — both rhythm checks tighten (fire more readily) for thriller.

- `energyMonotoneCoV`: 0.45
- `pacingPlateauRatio`: 1.3

