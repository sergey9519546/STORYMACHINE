// Script Doctor — built-in sample screenplay ("Try a sample script").
//
// WHY this exists: a curious visitor with no script of their own currently
// dead-ends at the Script Doctor panel's idle state. This module supplies one
// original, self-contained Fountain screenplay so a single click produces a
// full 14-pass diagnosis with zero typing and zero API key required from the
// visitor (the doctor route itself is server-side and keyless from the
// client's point of view).
//
// 2026-08-04 STIMULUS SWAP — "The Second Key" -> "Dead Frequency". The prior
// sample was ~665 words / 14 scenes ≈ 47.5 words/scene, far below the
// real-corpus median of ~161–181 words/scene measured in P1's baseline
// (docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md). FIELDING_DECISION_
// BRIEF.md recorded that thinness as a known limitation (it reads as "a
// competent skeleton, not a real draft," and inflates minor-issue counts /
// makes sub-scores read as false precision — defect D5 in
// docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md). The replacement is
// data/screenplays/dead-frequency.fountain, one of the 20 tracked CC0
// original screenplays in the STORYMACHINE benchmark corpus (see
// data/screenplays/LICENSE-live-action.md for full provenance/license —
// public domain, CC0 1.0 Universal, no copyright concern). It was picked by
// measuring words/scene for all 20 candidates: 1831 words / 12 scenes ≈
// 152.6 words/scene, the closest-to-band pick among scripts that also clear
// the >=12-scene preference (the single closer-band script, runoff.fountain
// at 161 words/scene, has only 9 scenes). The corpus's own manifest
// (LICENSE-live-action.md) independently documents this file as
// "strong"-band craft calibration material with a genuinely mixed profile:
// "Clue paid off late; revelation past midpoint; clock honored in both
// halves; escalating danger into climax; full relationship arc (rupture ->
// earned reconciliation)." Its measured report (HEAD at swap time, commit
// 0cf12c9) is health 78.3, verdict CONSIDER, sceneCount 12 — mid-band, not
// suspiciously perfect and not a wall of red, matching this module's
// original design intent below. data/screenplays/dead-frequency.fountain
// therefore now plays a DUAL ROLE: P1 discrimination-corpus member AND P0
// sample stimulus — it stays in the corpus (nothing was removed from
// data/screenplays/), and LICENSE-live-action.md's own entry for this file
// now cross-references this dual use.
//
// The retired stimulus, "The Second Key," is preserved verbatim (its
// original fountain text and this file's original design-intent comment) in
// docs/user-validation/ARCHIVED_SAMPLE_THE_SECOND_KEY.md — never blindly
// removed, per the standing keep-as-reference rule.
//
// DESIGN INTENT — this is deliberately mixed-craft, not a showcase reel: the
// report must be INTERESTING (real strengths the strengths-section actually
// earns, genuine flaws spread across different craft dimensions, heatmap
// variety) and must NOT score suspiciously perfect or hopelessly broken —
// the target is mid-band CONSIDER territory: promising, with real work left
// to do. Unlike the retired sample, this stimulus's craft signals were not
// hand-planted against fountain-analyzer.ts's heuristics for THIS specific
// use — they are the corpus author's genuine "strong-band" craft-calibration
// choices (see LICENSE-live-action.md's controlled-richness design note),
// independently confirmed by the doctor's own measured strengths on this
// exact text: escalating deadline pressure across both halves of the draft,
// an immediately-turning opening with real stakes on the table early, and
// dramatic turning points recurring in both the front half (Scenes 2, 4, 6)
// and the back half (Scenes 9, 10, 12) rather than clustering in one act.
//
// This file is original content (CC0-dedicated, see
// data/screenplays/LICENSE-live-action.md) — no copyrighted material.

export const title = "Dead Frequency";

export const fountain = `// Original work contributed to STORYMACHINE benchmark, CC0 (public domain dedication).
// Live-action genre: radio-noir thriller. Strong-band craft calibration.
// Author: STORYMACHINE benchmark contributor, 2026.

INT. KQRS RADIO STUDIO - NIGHT

A small-town AM station after midnight. Banks of analog gear glow amber in the dark. MAYA OKONKWO, 40s, headphones around her neck, cues a vinyl record on a turntable and eases the fader up.

The on-air light is red. Through the soundproof glass, the lobby is empty and the parking lot holds a single car.

MAYA
You're listening to KQRS, the night shift, where the signal reaches a little further after dark. I'm Maya Okonkwo. The record is warm, the coffee is cold, and the phone lines are open. Stay with me.

She leans back in the chair. The phone bank beside the board is dark. Three lines, none lit. She pulls a folded photograph from her shirt pocket and props it against the mic: a man in a sheriff's uniform, arm around a younger Maya.

INT. STATION NEWSROOM - CONTINUOUS

A corkboard of yellowed press clippings and a county map pinned with colored tacks. Maya lingers on one framed clipping: DETECTIVE RAY OKONKWO, 50, KILLED IN THE LINE OF DUTY.

A desk phone on the assignment desk rings. Maya crosses to it and picks it up on the third ring.

MAYA
KQRS newsroom, you're on the air.

CALLER (V.O.)
(filtered, toneless, almost synthetic)
The Miller bridge. Before sunrise. Three cars.

MAYA
Who is this? How did you get this extension?

CALLER (V.O.)
You answer. That's enough.

The line goes dead. Maya holds the receiver a long moment, then sets it in the cradle. Her hand is steady, but she looks at it as though it belongs to someone else.

EXT. ROUTE 9 - MILLER BRIDGE - PRE-DAWN

A county cruiser parked on the bridge's gravel shoulder, lights off. DEPUTY DAN HALE, 30s, lifts a flare from the trunk. Maya's sedan pulls up behind him, headlights cutting the fog.

Dan turns, unsurprised to see her.

DAN
You shouldn't be here, Maya. Road's iced up past the reflectors.

MAYA
I got a call at the station. Three cars, this bridge, before sunrise. I want to know what you can see from here.

DAN
Two sets of skid marks already in the deck, black ice under the railing. You want me to lay a flare out because some caller told you to?

MAYA
I want you to lay the flare out because my father would have. And because three cars on an iced bridge at dawn is a story whether you flag it or not.

Dan studies her face. Then he sets the flare. It hisses cherry-red against the blacktop, throwing their shadows long across the frost.

INT. KQRS STUDIO - NIGHT

Maya pulls the station's engineering log from the bottom drawer of the board: a bound ledger of frequency readings, signal complaints, and FCC filings running back twenty years. She flips to the last entry in her father's blocky handwriting, dated the week he died.

MAYA
(reading aloud, low)
"Dead air on 1490 after 2 a.m. Not equipment. Source unknown. Do not dismiss. R.O."

She traces the entry with her fingertip. One-four-nine-zero. The same frequency the caller came in on tonight. She pulls the dispatch log for tonight and finds the gap: 2:04 to 2:11, no recorded signal, no recorded silence either.

INT. SHERIFF'S OFFICE - BULLPEN - DAY

Dan pins a printed copy of the anonymous call to a corkboard beside an eight-by-ten of the iced bridge. Sheriff RON PELLEW, 60s, silver mustache, watches with his arms folded across his barrel chest.

SHERIFF PELLEW
One anonymous tip. One bridge that didn't collapse. You're not your father, Deputy. And the lady with the microphone isn't either.

DAN
The caller described the ice pattern before the county road crew logged it. That's foreknowledge, Sheriff.

SHERIFF PELLEW
Then thank the road crew and file it under dead tips. I won't have this office chasing ghosts on a dead detective's frequency.

Dan catches Maya in the hallway outside, keeping his voice below the hum of the fluorescents.

DAN
(low)
He won't open a case. But I pulled the dispatch tapes from the night your father went off the bridge. There's a gap. Fourteen minutes of dead air right where a distress call should have been logged.

MAYA
I knew it. Somebody scrubbed that gap, or somebody suppressed the call that should have filled it.

DAN
There's one more thing. The radio base unit recovered from your father's cruiser that night, it was logged into evidence and never processed. The intake slip has a signature on it.

MAYA
Whose?

DAN
Pellew's.

INT. MAYA'S HOUSE - KITCHEN - NIGHT

Maya and Dan at her kitchen table, the engineering log open between them under a pendant light. An old grievance surfaces, the kind that has set its own table.

MAYA
You were his partner, Dan. You were first on the scene that night and you never once told me what you saw when you looked down over that railing.

DAN
Because what I saw was a man who drove off that bridge alone, Maya. A man who chose that road. I didn't want that to be the last picture you carried of him.

MAYA
You don't get to choose what I carry. And you don't get to carry it for me. Three years, Dan. Three years of you ducking my calls, and I thought it was because you couldn't stand the sight of me, because I reminded you of him.

DAN
The truth is, I couldn't stand the sight of myself. I sat with that tape for a year before I could listen to it past the gap.

INT. KQRS STUDIO - NIGHT

Two-oh-four a.m. The phone rings. Maya lets it ring twice, then lifts the receiver and keys it to air.

MAYA
KQRS. You're live.

CALLER (V.O.)
The grain elevator off County 4. Tonight. Before the flood channel opens at midnight.

MAYA
Why me? Why this station?

CALLER (V.O.)
Because you answer. Because you don't hang up.

MAYA
Then give me a name. Give me one name I can verify.

CALLER (V.O.)
Pellew.

The line drops. Maya writes the address on the back of her hand in ballpoint pen.

EXT. COUNTY 4 - GRAIN ELEVATOR - NIGHT

Floodlights on a deserted concrete lot ringed by rusted silos. Dan's cruiser and Maya's car. Rain starting, the kind that turns to sleet before dawn.

Maya finds a service door ajar. Inside, lit by Dan's flashlight: a wall calendar with one date circled two weeks out, and a sticky note on a metal cabinet.

MAYA
(reading the note)
"Final broadcast. Midnight. Live."

DAN
Final broadcast. That's the deadline. Whatever this is, it ends at midnight tonight.

A floorboard creaks above them. They both freeze. Dan's hand goes to his sidearm.

INT. GRAIN ELEVATOR - UPPER LEVEL - CONTINUOUS

Dan leads, weapon up, flashlight in his off hand. Maya stays behind him against the wall. The room is empty except for a CB radio base station bolted to a desk, its dial set to 1490, its power light a steady green.

Maya crosses to it and touches the dial. It's warm.

MAYA
Someone was just here. Listening on my father's frequency, on a base unit just like his.

DAN
The truth is, Maya, I came to this elevator once before. The week your father died. He was investigating a smuggling run that used 1490 as a meet channel, boats up the flood canal. He made me swear I'd keep you out of it, and I swore, and then he drove to that bridge without me.

MAYA
The truth is I knew. He told me about the run the morning he died, over coffee at this same table. I told him not to go alone. He went anyway.

A long silence. The rain ticks against the tin roof. Dan lowers his weapon.

INT. SHERIFF'S OFFICE - EVIDENCE LOCKER - DAY

Dan lifts a cardboard box from the evidence shelf. The intake slip reads CASE OKONKWO, R. - RADIO BASE UNIT - RETAINED. The signature at the bottom is Pellew's.

DAN
This unit was logged the night he died and never sent to the state lab. Pellew signed for it. He signed for it because it's the same model the caller is using tonight. The caller isn't hijacking the station's transmitter. They're using my father's radio, the one taken from his cruiser.

MAYA
Why would Pellew hold it for three years?

DAN
Because as long as that radio sat in evidence, the frequency stayed dead. And the smuggling run stayed open. Until you started answering the night shift and the channel lit back up.

MAYA
The truth is, I've wondered for three years whether I missed something I could have stopped. That's why I took the night shift. I was listening for him.

DAN
The truth is, I blamed myself for not being in the cruiser with him. That's why I never came to see you. I thought you'd blame me too.

MAYA
I did. For a long time. I'm done with that now.

INT. KQRS STUDIO - NIGHT

Eleven fifty-eight p.m. Maya is alone at the board, headphones on, mic hot. Dan waits in the lobby, hand resting on his radio. The on-air light is red.

MAYA
(into the mic)
This is the night shift, and this is my last broadcast on this frequency. For three years someone has been calling in on a dead man's radio, and for three years nobody picked up. Tonight I'm picking up. Whoever you are, if you've been waiting for someone to listen, I'm listening now.

The phone rings at the stroke of midnight. Maya lets it ring once, then answers.

CALLER (V.O.)
I've been waiting three years for someone to listen.

MAYA
Then tell me. The truth is, I'm ready to hear it.

EXT. SHERIFF'S OFFICE - NIGHT

Sheriff Pellew is led out in cuffs past a row of cruisers, the evidence box under Dan's arm. Dawn is breaking pink and cold over the river. Reporters' shutters click.

Dan finds Maya on the courthouse steps, the engineering log closed in her lap, her face tired and clear.

DAN
He kept your father's radio so the frequency would stay dead. When you started answering the night shift, he used it to send you to the places he wanted no one to look, the bridge, the elevator, the docks.

MAYA
And you didn't let him finish the job. I'm grateful for that, Dan. I forgive you for the three years of silence. I shouldn't have made you carry it alone, and I shouldn't have carried my half alone either.

DAN
We start over. That's the only broadcast that matters now.

Maya turns the closed log over in her hands, then sets it down on the step beside her. Behind her, the signal light on the studio wall goes dark, finally, for the last time.

FADE OUT.
`;
