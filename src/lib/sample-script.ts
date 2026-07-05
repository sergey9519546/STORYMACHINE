// Script Doctor — built-in sample screenplay ("Try a sample script").
//
// WHY this exists: a curious visitor with no script of their own currently
// dead-ends at the Script Doctor panel's idle state. This module supplies one
// original, self-contained Fountain screenplay so a single click produces a
// full 14-pass diagnosis with zero typing and zero API key required from the
// visitor (the doctor route itself is server-side and keyless from the
// client's point of view).
//
// DESIGN INTENT — this is deliberately mixed-craft, not a showcase reel:
//   - The report must be INTERESTING: real strengths the strengths-section
//     actually earns, genuine flaws spread across different craft dimensions,
//     a non-trivial root-cause cluster, and heatmap variety (a quiet first
//     act, a rising middle, a hot climax, a cool wind-down).
//   - It must NOT score suspiciously perfect (nothing to fix reads as fake)
//     or hopelessly broken (a wall of red teaches nothing) — the target is
//     mid-band CONSIDER territory: promising, with real work left to do.
//   - Every "planted" craft signal below is calibrated against the actual
//     heuristics in server/nvm/analyze/fountain-analyzer.ts so the report
//     reliably reproduces the intended beat rather than leaving it to chance:
//
//     STRENGTH — earned clue payoff: the phrase "the second key" is quoted
//     verbatim in scene 2 (seed) and scene 13 (payoff, 11 scenes later at the
//     literal climax) — the ONLY quoted phrase and the ONLY seed/payoff token
//     in the whole script, so it resolves cleanly to zero open clues and
//     earns buildStrengths' "every clue planted gets paid off" line.
//
//     STRENGTH — escalating tension: danger/tension-lexicon density is kept
//     near zero for the first half (a counting-room negotiation, a proposal,
//     recon, an investigator's office, a diner) and built up steadily across
//     the back half (a cut wire, a near-miss footstep, a car chase in the
//     rain, a tripped-alarm vault break-in) so StructureState.escalating
//     (second-half suspense average > first-half average) comes out true —
//     a "measured fact" strength per doctor.ts's buildStrengths, not a guess.
//
//     FLAW — a question raised and abandoned: Marcus asks June, in scene 2,
//     "What really happened to Danny after the Tulsa job?" June deflects.
//     The words "danny," "tulsa," and "happened" are deliberately never
//     reused anywhere later in the script, so detectQuestionLatency's
//     lexical-fingerprint matcher can never resolve the thread — it stays
//     permanently open, exactly the "raised and abandoned" flaw the brief
//     calls for, surfaced as a genuine unresolved thread rather than a
//     scripted-sounding complaint.
//
//     FLAW — a rushed, unearned revelation: at the climax (scene 13) Vance
//     says "Turns out Holloway signed my transfer papers six years ago,"
//     tying the detective to the mark with a single line and zero setup
//     anywhere earlier in the draft — a textbook late-inning reveal with no
//     foreshadowing for causality/payoff-minded passes to catch.
//
//     FLAW — one flat relationship thread: every scene where June and Marcus
//     both speak is written with deliberately transactional, unemotional
//     dialogue (no word from fountain-analyzer.ts's positive/negative
//     valence lexicons ever appears in their exchanges), so their pairwise
//     relationship valence never crosses the shift threshold — a partnership
//     that never once visibly moves, running start to finish underneath a
//     script that is otherwise busy escalating everything around it.
//
// This file is original content authored for StoryMachine — no copyrighted
// material. Deliberately short (mirrors the calibration corpus's economical
// scene style in server/nvm/analyze/calibration/corpus.ts) so all 14 passes
// return in seconds, not because a real feature screenplay would be this
// short.

export const title = "The Second Key";

export const fountain = `INT. PAWNSHOP BACK ROOM - NIGHT

June counts a stack of bills at a folding table under a bare bulb, patient, unhurried.

JUNE
Ten thousand even. Count it twice if you want, we'll still be here at nine.

INT. MARCUS'S APARTMENT - NIGHT

Marcus spreads photographs of a hillside estate across a cluttered table. June leans in the doorway, arms crossed.

MARCUS
Holloway keeps his best pieces behind a vault only two people alive can open. There's a photograph of the door underneath this stack. Somebody scratched "the second key" into the corner of the frame years ago.

JUNE
I already told you in Reno, I'm done taking your jobs.

MARCUS
What really happened to Danny after the Tulsa job?

JUNE
Don't.

EXT. HOLLOWAY ESTATE - GATE - DAY

June photographs the security panel through a long lens while Marcus times the guard's rounds against a stopwatch.

MARCUS
Same guard, same route, every forty minutes.

JUNE
Forty minutes is enough if the key holds.

INT. PRECINCT - DETECTIVE VANCE'S OFFICE - DAY

Vance pins photographs of the same estate to a corkboard already crowded with older, unsolved cases.

VANCE
Two prior break-ins on this street, both unsolved, both during a private auction.

VANCE
The auction closes in nine days. If Holloway's buyer is real, someone hits that vault before midnight the night before.

INT. DINER - NIGHT

June and Marcus split a check while looking over the same photographs, folded to fit between the plates.

MARCUS
Forty minutes gets us to the hallway. The vault needs the second half of that.

JUNE
Then we go tonight, not tomorrow.

EXT. HOLLOWAY ESTATE - SERVICE GATE - NIGHT

Marcus cuts the service gate's wire while June watches the tree line. A flashlight beam sweeps the dark hedge feet away.

JUNE
Guard's early. Down.

They hide in the hedge as the beam crosses over them and moves on.

INT. HOLLOWAY ESTATE - SERVICE HALLWAY - NIGHT

A floorboard creaks under June's boot. Somewhere close, footsteps stop, then start again, closer.

MARCUS
Don't run. Walking is quieter than running ever is.

INT. VANCE'S CAR - NIGHT

Vance parks across from the estate, matching a service van's plate against an old file.

VANCE
Same plate as the Ashford break-in. Same two people, four years apart. If they're inside, it's before dawn or never.

INT. MARCUS'S APARTMENT - DAY

Marcus wraps a scraped knuckle while June checks the second half of the blueprint against a folded page.

MARCUS
Forty minutes was optimistic. We'll need thirty more tomorrow.

JUNE
There's no tomorrow. Vance was two blocks out tonight.

EXT. CITY STREET - RAIN - NIGHT

Marcus runs the light as Vance's headlights close the gap in the mirror behind them.

MARCUS
She's made the car.

JUNE
Then we lose her before the bridge.

INT. HOLLOWAY ESTATE - STUDY - NIGHT

June works a hidden panel while Marcus watches the door, one hand steady on the frame.

MARCUS
If that panel doesn't give, we're trapped in here with no second way out.

INT. HOLLOWAY ESTATE - VAULT ANTECHAMBER - NIGHT

An alarm sensor blinks red, one motion away from tripping. June eases past it into the dark.

JUNE
Don't breathe.

INT. HOLLOWAY ESTATE - VAULT - CONTINUOUS

June turns the brass teeth in her palm -- the same worn engraving still reads "the second key" -- and the vault door releases with a heavy metallic groan. Vance steps out of the dark, gun raised.

VANCE
Hands where I can see them. Don't move.

MARCUS
We're not armed. There's no gun in here but yours.

VANCE
Turns out Holloway signed my transfer papers six years ago. We've never really stopped working together.

INT. PRECINCT - INTERROGATION ROOM - DAY

June sits alone across an empty table, the photographs from Marcus's apartment sealed in an evidence bag beside her untouched coffee.

JUNE
Ask Marcus about the vault. Ask Vance about her transfer. Don't ask me about my brother -- I stopped answering that years ago.
`;
