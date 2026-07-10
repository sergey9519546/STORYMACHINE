# Genre-Conditioned Rule Modifiers

Program v2 Type 3 rules: a small set of high-firing generic checks whose THRESHOLD (not existence) legitimately moves per genre, via `GENRE_RULE_MODIFIERS` in `server/lib/genre-router.ts`. A genre with no live modifier for a given rule falls through to that rule's own generic constant — so `storyContext.genre` being absent, unknown, or simply not listed is always byte-identical to the pre-Wave-1184 behavior. Never used to quiet a rule for everyone; only to make a guard fire on genuinely different, genre-specific craft expectations, each with a one-sentence craft argument for why.

## Wave 1188

Wave 1188 additions (Program v2, Type 3 — genre-conditioned, second of its kind): three more fields closing genre-coverage gaps (romance, sci_fi, mystery previously had no live modifier — see WEAK_MIDPOINT, ACT3_SCENE_EXCESS in structure.ts and EXPOSITION_DUMP in belief.ts for the call sites). B1-a additions (Genre Engine Expansion): noir's honest craft argument has arrived (see the noir entry below) — the "noir remains uncovered" note from Wave 1188 is retired. Six more genres also get entries here where a genuine argument exists: action, drama (a second field), courtroom, survival, melodrama, and folk_horror. Every genre NOT listed in GENRE_RULE_MODIFIERS (the large majority of the 28) deliberately has none — this is a threshold table, not a vocabulary table, and most genres' craft identity lives entirely in GENRE_MODIFIERS/genreRules instead. THRESHOLD_BOUNDS below gives every field here (and every tone delta) a plausibility range so a typo — an extra digit, a misplaced decimal — cannot silently ship.

### action

B1-a: action's pleasure is sustained physical intensity delivered through uniformly brisk, punchy scenes (GENRE_MODIFIERS.action: "every set piece raises the difficulty") — that structural uniformity in scene length is a deliberate genre feature (quick cuts, consistent brevity), not a rhythmic defect, so the monotony floor loosens.

- `energyMonotoneCoV`: 0.2

### austere


### bleak


### cathartic


### cerebral


### chaotic


### comedy

Comedy's low point is measured in dignity and embarrassment, not survival dread (GENRE_MODIFIERS.comedy: "let characters keep their dignity stakes even when the situation is absurd"), so a milder suspense dip still legitimately counts as the "all is lost" beat — the floor loosens.

- `darkNightSuspenseFloor`: 0.5

### courtroom

B1-a: courtroom's back half (closing arguments, deliberation, verdict, aftermath) legitimately stacks more scenes than Act 1's evidentiary setup (GENRE_MODIFIERS.courtroom: "the verdict must feel earned by the evidence built scene by scene") — an even larger imbalance than drama or mystery is tolerated before the resolution reads as bloated.

- `act3ExcessRatio`: 1.35

### cozy


### deadpan


### disaster

disaster's ensemble structure needs every thread escalating in real time simultaneously (GENRE_MODIFIERS.disaster: "its escalation follows a legible chain of cause and effect"), so a uniform cadence across that many simultaneous threads reads as a genuine stall more readily than baseline — the monotony floor tightens, though less sharply than thriller's single-throughline urgency.

- `energyMonotoneCoV`: 0.42

### drama

Drama's register is grounded restraint (GENRE_MODIFIERS.drama: "silence and restraint do heavy lifting"), so a sustained, deliberately uniform cadence is a legitimate stylistic choice, not a defect — both rhythm checks loosen (fire less readily) for drama. B1-a adds act3ExcessRatio: drama's climax often carries an extended reconciliation/aftermath beat that legitimately outsizes Act 1's setup, the same argument mystery's extended reveal already earned — the excess ratio loosens.

- `energyMonotoneCoV`: 0.25
- `pacingPlateauRatio`: 1.1
- `act3ExcessRatio`: 1.25

### dread_driven

Genre-completion wave: 8 new tones (16 → 24). Two (spiritual, emotional) deliberately carry no thresholdDeltas — the same never-padded discipline as deadpan/satirical/irreverent: a voice-only instruction is a complete entry when no honest numeric argument exists.


### emotional


### feverish


### folk_horror

B1-a: folk horror's dread is patient and ritualistic, culminating in a communal ceremony (GENRE_MODIFIERS.folk_horror: "the horror was agreed upon long before the story began") — the "all is lost" beat needs to carry even heavier communal dread than conventional horror to register as earned, so the suspense floor tightens beyond horror's own 1.5.

- `darkNightSuspenseFloor`: 1.6

### gangster

gangster's downfall movement — the unraveling of loyalty, the reckoning — legitimately outsizes the rise's setup scenes (GENRE_MODIFIERS.gangster: "the fall is the same arithmetic run in reverse"), the same argument drama's extended aftermath and mystery's extended reveal already earned — the excess ratio loosens.

- `act3ExcessRatio`: 1.25

### gritty


### hopeful


### horror

Horror's low point must carry genuine dread, not a passing dip (GENRE_MODIFIERS.horror: "creeping unease curdling into terror"), so the beat needs a higher suspense floor to count as earned — the floor tightens.

- `darkNightSuspenseFloor`: 1.5

### irreverent


### maximalist


### melancholic


### melodrama

B1-a: melodrama demands constant emotional swings scene to scene (GENRE_MODIFIERS.melodrama: "sincerity at full volume, not restraint") — here a uniform rhythm undercuts the genre's core promise more than it would elsewhere, so the monotony floor tightens further than thriller's.

- `energyMonotoneCoV`: 0.5

### mystery

Mystery's climax is the extended solution reveal — walking the clues back, gathering and confronting suspects (GENRE_MODIFIERS.mystery: "the solution must be surprising yet inevitable in hindsight") — which legitimately runs longer than Act 1's setup, so a bigger Act 3 vs Act 1 imbalance is tolerated before it reads as a bloated resolution — the excess ratio loosens.

- `act3ExcessRatio`: 1.3

### nihilistic


### noir

B1-a: noir's slow-burn atmosphere (GENRE_MODIFIERS.noir: "hard-boiled, shadowed, wry... voice-thick narration") earns the same relaxed plateau tolerance drama's restraint argument already established — a sustained, moody cadence is the point, not a stall. But noir's economy of hard-boiled narration runs the opposite way on exposition: the compressed, wry voice that defines the genre breaks down faster than in other genres if the story drifts into a long told-only stretch, so the streak tolerance tightens instead of loosening.

- `pacingPlateauRatio`: 1.1
- `expositionDumpStreak`: 2

### nostalgic


### operatic


### paranoid


### psychological_thriller

Genre-completion wave: 6 new genres get a live modifier here, exactly where a genuine one-line craft argument exists — the other 13 new genres (dark_comedy, romantic_comedy, spy_espionage, political_thriller, police_procedural, cosmic_horror, space_opera, time_travel, post_apocalyptic, urban_fantasy, sports_drama, prison_drama, noir_comedy) deliberately have none: their craft identity lives entirely in GENRE_MODIFIERS/genreRules above, and inventing a numeric nudge with no honest argument is exactly the padding this table forbids. psychological_thriller's dread is interior erosion of certainty, not external event (see GENRE_MODIFIERS.psychological_thriller: "dread accrues through internal erosion... more than through external event"), so a sustained, uniform cadence is often the intended slow-bleed effect rather than a stall — the same argument noir's slow burn already earned, so the plateau tolerance loosens identically.

- `pacingPlateauRatio`: 1.1

### road_movie

road_movie's episodic stop-and-go structure is a deliberate genre feature (GENRE_MODIFIERS.road_movie: "a sequence of stops, encounters, and detours"), the same repeated-rhythm argument action and survival already earned — the monotony floor loosens.

- `energyMonotoneCoV`: 0.2

### romance

Romance's central pivot is relationship risk, not thriller-style suspense (GENRE_MODIFIERS.romance: "tension lives in proximity, restraint... the gap between what is wanted and what is said"), so a midpoint that reads as suspense-flat by the generic yardstick can still be a real dramatic pivot — the pressure floor loosens.

- `weakMidpointPressureFloor`: 0.4

### romantic


### satirical


### sci_fi

Sci-fi legitimately carries heavier early exposition than other genres (GENRE_MODIFIERS.sci_fi: "one rigorously-applied premise reshapes human behavior; follow it to its honest consequences" — establishing that premise costs scenes), so one additional consecutive told-only scene is tolerated before the streak reads as inert — the streak length loosens.

- `expositionDumpStreak`: 4

### slasher

slasher's climax must clear genuinely maximal terror: the pattern established across the body count means the "all is lost" beat has to exceed even horror's own elevated floor (1.5) to register as earned rather than just another kill in the sequence — the floor tightens beyond horror's, matching folk_horror's reasoning for the same reason.

- `darkNightSuspenseFloor`: 1.7

### spiritual


### superhero

superhero's climactic battle legitimately outsizes the origin/setup scenes of Act 1 (GENRE_MODIFIERS.superhero: antagonist confrontation as thematic-mirror payoff), the same argument courtroom's verdict stack and mystery's extended reveal already earned — the excess ratio loosens.

- `act3ExcessRatio`: 1.3

### surreal


### survival

B1-a: survival's grinding, repetitive endurance (GENRE_MODIFIERS.survival: "resourcefulness under scarcity is the engine") makes a deliberately flat, repetitive rhythm the intended effect, the same argument as drama and action — the monotony floor loosens.

- `energyMonotoneCoV`: 0.2

### thriller

Thriller's contract is forward momentum in every scene (see GENRE_MODIFIERS.thriller: "no scene ends in the same place it began"), so even moderate scene-length uniformity already reads as a stall — both rhythm checks tighten (fire more readily) for thriller.

- `energyMonotoneCoV`: 0.45
- `pacingPlateauRatio`: 1.3

### uncanny


