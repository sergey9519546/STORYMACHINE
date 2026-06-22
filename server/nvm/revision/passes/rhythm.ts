// Wave 137 — Pass 8: Rhythm/Prosody
// Checks sentence rhythm in action lines: monotonous sentence lengths,
// run-on action blocks, staccato beats that need expansion.
// Wave 137 additions: passive voice constructions, weak-verb chains.
// Wave 151 additions: camera-direction overreach (writer directing the lens),
// adverb clustering (lazy qualifier density in action lines), and
// over-description (introducing characters with >4 physical descriptors).
// Wave 263 additions: question in action (rhetorical '?' breaks cinematic
// objectivity), simile excess (≥3 simile markers — literary register intrusion),
// color absence (no color word in 12+ action lines — monochrome visual world).
// Wave 277 additions: body-part overload (>40% of action lines fixate on isolated
// body parts), single-sentence flood (all 12+ action lines are exactly one
// sentence — no multi-clause variation), ellipsis chain (≥3 action lines trail
// off with '...' — prose avoids committing to a definitive description).
// Wave 291 additions: number word flood (>35% of action lines contain spelled-out
// numbers — "three", "seven" — diluting concision), prepositional opening dominance
// (>35% of action lines begin with a preposition), action line word-count floor
// (all 8+ action lines are ≤5 words — micro-beats with no description depth).
// Wave 305 additions: dash chain (≥3 action lines trail off with an em-dash),
// negation action flood (>25% of action lines describe what does NOT happen),
// action parenthesis aside (≥3 action lines contain parenthetical asides).
// Wave 319 additions: suddenly overuse (>20% of action lines contain urgency-
// announcement adverbs), pronoun opener dominance (>45% of action lines begin
// with a personal pronoun — combined-category test), physical interiority leak
// (>25% of action lines describe internal body sensations).
// Wave 330 additions: we-see flood (>25% of action lines begin with "We see/
// hear/find/watch/notice" — narrator intrudes into cinematic present tense),
// light description overload (>30% contain lighting vocabulary — DP's domain),
// set dressing dominance (>35% reference static furniture/architecture).
// Wave 344 additions: polysyndeton overload (≥3 action lines each pile up 3+ "and"
// coordinators — breathless compound action), semicolon in action (≥3 action lines use a
// semicolon — literary punctuation foreign to screen action), weather description overload
// (>30% of action lines contain weather vocabulary — the DP's domain crowding the drama).
// Wave 358 additions: colon in action (≥3 action lines use a colon as a literary reveal
// device — typographic stage-direction crowding cinematic prose), sound description overload
// (>30% of action lines contain sound vocabulary — the sound editor's domain crowding the
// frame), intensifier flood (>30% of action lines carry filler intensifiers: very, really,
// quite, extremely, utterly, etc. — padding that signals distrust of the underlying word).
// Wave 372 additions: triadic list overload (≥3 action lines use a "X, Y, and Z" rule-of-
// three enumeration — a rhythmic tic when repeated), mid-line em-dash overuse (≥3 action
// lines interrupt themselves with a mid-sentence em-dash — parenthetical breathlessness),
// temporal opener overuse (>25% of action lines begin with a time adverb like Now/Soon/
// Finally/Meanwhile — the prose narrating chronology instead of showing it).
// Wave 386 additions: comma-splice overuse (≥3 action lines join two pronoun-subject clauses
// with a comma — a prose error that blurs cinematic beats), article-opener dominance (>40% of
// action lines begin with The/A/An — monotone sentence openings), connective-opener overuse
// (≥3 action lines begin with a formal logical connective like However/Therefore/Instead —
// essayistic register foreign to screen action).
// Wave 400 additions: long-line flood (>60% of action lines are ≥12 words — uniformly dense
// prose with no breathing room; upper-end complement of short-line poverty), line-ending
// repetition (≥4 action lines close on the same non-trivial word — unintentional anaphora at
// the sentence level, the ending-word counterpart of opening-word repetition), progressive-verb
// overuse (>25% of action lines use is/are + -ing present-progressive construction — "she is
// running" instead of "she runs" — a subtle temporal mismatch in cinematic present tense).
// Wave 414 additions: vague-quantifier overload (>25% of action lines lean on imprecise
// quantities — "some", "several", "a few", "many" — vagueness draining specificity from the
// staging; distinct from NUMBER_WORD_FLOOD, which flags the opposite over-precision of spelled
// numerals), atmosphere-abstraction overload (>25% of action lines name an abstract mood noun —
// "tension", "silence", "an air of menace" — telling the feeling instead of showing the image
// that produces it), color-description overload (>30% of action lines carry a color word — an
// over-saturated palette crowding the DP's domain; the upper-end complement of COLOR_ABSENCE).
// Wave 428 additions: consecutive opener run (run-based — 5+ consecutive action lines all begin
// with the same first word, a local metronomic tic; distinct from all the global %-threshold
// opener checks which audit proportion across the whole script), action finale bloat (zone/
// distribution — last 25% of action lines averages >1.4× the word count of the first 75%;
// prose density grows toward the climax instead of tightening as pace should accelerate),
// longest action outlier (single-peak isolation — the single longest action line is ≥25 words
// AND ≥4× the average word count; one gargantuan line dominates, distinct from LONG_LINE_FLOOD
// which audits a global proportion rather than isolating the single outlier).
// Wave 442 additions: short-long segregated (co-occurrence/decoupling — short ≤4-word lines and
// long ≥12-word lines exist but never appear in the same 5-line sliding window; the two length
// extremes are spatially segregated into separate density zones rather than interleaving for local
// rhythmic contrast; distinct from all global-proportion and zone-average checks), long recovery
// absent (sequence/aftermath — no long action line ≥14 words is followed by a short recovery beat
// ≤7 words within 2 action lines; the first aftermath check in this pass, orthogonal to all
// proportion and peak-isolation checks), wordcount flatline (average/aggregate × variance — standard
// deviation of all action-line word counts is <2.5 with avg >4; the only check using statistical
// variance rather than a proportion or count threshold; fires when all lines are metronomically
// uniform in length regardless of which threshold they fall under).
// Wave 456 additions: consecutive long run (run-based — 5+ consecutive action lines each ≥9 words;
// a dense-prose avalanche with no breathing room in a localized stretch, distinct from LONG_LINE_FLOOD
// which audits global proportion and ACTION_LONG_RECOVERY_ABSENT which checks aftermath per-line),
// opening short absent (zone presence/absence — the first 25% of action lines contain no short line
// ≤4 words while short lines exist in the rest; the opening rhythmic palette never samples the staccato
// register, leaving the reader without early contrast; fills the opening-zone cell alongside
// ACTION_FINALE_BLOAT's finale cell), sentence count peak (single-peak isolation × sentence count —
// the single action line with the most sentences has ≥5 sentences AND ≥3× the script-average
// sentence count; one action line packs five-beat clusters while all others are brief, distinct from
// SINGLE_SENTENCE_FLOOD which fires when ALL lines are one-sentence and from LONGEST_ACTION_OUTLIER
// which isolates the word-count peak rather than sentence-count peak).
// Wave 470 additions: middle long absent (zone presence/absence × middle zone — the middle 50% of
// action lines has zero long lines ≥12 words while ≥2 appear in the outer zones; fills the middle-
// zone cell alongside opening-zone and finale-zone checks; distinct from all proportion and average
// checks which have no zone sensitivity), impact beat uncaused (backward-cause — ≥2 short ≤4w
// lines appear after the first 2 positions but none is preceded by a long ≥9w line within 2 action
// lines; the first backward-cause check in this pass, reversing the direction of ACTION_LONG_
// RECOVERY_ABSENT which checks aftermath, not antecedent), density peak early (distribution/timing ×
// peak position — the single longest action line ≥15w is located in the first 25% of action lines,
// front-loading the script's most elaborate prose in the setup rather than the climax; distinct from
// LONGEST_ACTION_OUTLIER which is position-agnostic and fires on word-count ratio, not position).
// Wave 484 additions: consecutive short run (run-based × short channel — 5+ consecutive action
// lines each ≤4 words, a sustained staccato burst that loses impact through repetition; run mirror
// of CONSECUTIVE_LONG_RUN which targets ≥9w runs), finale short absent (zone presence/absence ×
// finale zone — the last 25% of action lines contains no short ≤4w line while ≥2 exist elsewhere;
// the finale zone mirror of OPENING_SHORT_ABSENT, completing the zone set), action sentence average
// high (average/aggregate × sentence count per line — ≥8 action lines averaging >3 sentences each,
// multi-clause overload that collapses the shot-by-shot grammar of cinematic action; the average/
// aggregate complement of SINGLE_SENTENCE_FLOOD and SENTENCE_COUNT_PEAK).
// Wave 554 additions: action long beat uncaused (backward-cause × long channel — ≥3 long ≥12w
// lines after position 1 all lack a short ≤4w predecessor within 2 lines; long prose arrives
// without the compression that earns its density; backward-cause mirror of IMPACT_BEAT_UNCAUSED
// which checks the short→long direction), action sentence burst run (run-based × sentence count
// — 4+ consecutive action lines each containing ≥2 sentence-ending marks; a local multi-clause
// avalanche distinct from ACTION_SENTENCE_AVERAGE_HIGH which is a global average and from
// SENTENCE_COUNT_PEAK which isolates a single outlier), action punctuation desert (underweight/
// bloat × comma × scarcity — ≥10 action lines with <15% containing any comma, locking the
// prose into subject-verb-object simplicity without dependent clauses or list structure;
// complement of ACTION_COMMA_DENSE_FLOOD which fires at >30% with ≥3 commas per line).
// Wave 540 additions: action consecutive medium run (run-based × medium word count 5–11w — 6+
// consecutive action lines each between 5–11 words while ≥1 short ≤4w and ≥1 long ≥12w exist
// globally; the extremes exist but are excluded from this stretch, a "middle rut" that misses
// both the staccato and the dense registers; distinct from CONSECUTIVE_LONG_RUN ≥9w and
// CONSECUTIVE_SHORT_RUN ≤4w which target the opposite density extremes), action short expansion
// absent (sequence/aftermath × short→long direction — ≥8 action lines with ≥2 short ≤4w and
// ≥2 long ≥9w; every short line is followed within 2 lines only by non-long lines, so staccato
// beats never expand into elaboration in their aftermath; distinct from ACTION_LONG_RECOVERY_ABSENT
// which checks the opposite long→short direction and IMPACT_BEAT_UNCAUSED which is backward-cause),
// action word-count modal lock (average/aggregate × most-frequent word count — ≥10 action lines
// where >40% share the exact same word count, a metronomic spike at one length creating an even
// stronger uniformity signal than WORDCOUNT_FLATLINE which checks SD globally; distinct from
// SINGLE_SENTENCE_FLOOD which counts sentence structure not word count and from all run-based
// checks which require consecutive lines).
// Wave 526 additions: action word-count ascent run (run-based × strictly increasing word count —
// 5+ consecutive action lines each longer than the prior; ascending mirror of ACTION_WORD_COUNT_
// DESCENT_RUN, distinguishing directional expansion from density-based CONSECUTIVE_LONG_RUN),
// action finale long absent (zone presence/absence × long channel ≥12w × finale 25% — no long
// line in the closing 25% while ≥3 exist in the first 75%; completes the zone × long-channel grid
// alongside OPENING_LONG_ABSENT and MIDDLE_LONG_ABSENT), action comma dense flood (proportion ×
// comma-count ≥3 — >30% of ≥8 action lines carry 3+ commas each; list-heavy enumeration distinct
// from COMMA_SPLICE_OVERUSE clause-structure check and POLYSYNDETON_OVERLOAD coordinator chain).
// Wave 512 additions: action middle short absent (zone presence/absence × short channel ≤4w ×
// middle zone — middle 50% of action lines has no short line while ≥2 exist in the outer zones;
// completes the zone × short-channel grid alongside OPENING_SHORT_ABSENT and FINALE_SHORT_ABSENT,
// with the same zone-pairing logic as ACTION_MIDDLE_LONG_ABSENT but on the short channel),
// action word-count descent run (run-based × word count × strictly decreasing — 5+ consecutive
// action lines each strictly shorter than the prior, a sustained compression that risks becoming
// mechanical; distinct from CONSECUTIVE_SHORT_RUN which checks for short lines not decreasing
// sequence), action certainty adverb flood (proportion × certainty/stance adverbs — >20% of ≥8
// action lines contain certainty adverbs like clearly/obviously/certainly/naturally, a narrator-
// voice intrusion that tells the audience what to conclude rather than showing the event; distinct
// from ADVERB_CLUSTERING which counts all adverbs, SUDDENLY_OVERUSE which is urgency register, and
// INTENSIFIER_FLOOD which is degree modifiers — this is the epistemic-stance register).
// Wave 498 additions: opening long absent (zone presence/absence × long channel ≥12w × opening
// 25% — no long action line in the opening while ≥3 exist later; the opening-zone long companion
// to OPENING_SHORT_ABSENT, completing the opening-zone cell for the long-line channel; distinct
// from ACTION_MIDDLE_LONG_ABSENT which covers the middle zone), density peak late (distribution/
// timing × word count × finale zone — the script's single longest action line ≥15w falls in the
// final 25% while ≥3 long lines ≥12w exist in the first 75%; the climax carries the most
// elaborate prose while the rest of the script is sparser; the late-zone mirror of DENSITY_PEAK_
// EARLY and distinct from ACTION_FINALE_BLOAT which compares zone averages rather than isolating
// the single peak), short multiclausal (co-occurrence × short word count × sentence-end punctuation
// — ≥4 action lines each ≤5 words yet containing ≥2 sentence-ending marks; fragment-stacking
// that breaks a single dramatic beat into clause splinters; distinct from ACTION_QUESTION_INTRUSION
// which counts any "?" in action and from CONSECUTIVE_SHORT_RUN which measures run length not
// clause structure).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract action lines (non-dialogue, non-slug, non-transition) from fountain */
function extractActionLines(fountain: string): Array<{ text: string; lineNum: number }> {
  const lines = fountain.split('\n');
  const action: Array<{ text: string; lineNum: number }> = [];
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { skipNext = false; continue; }

    // Sluglines, transitions, character cues, parentheticals
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|CUT TO|FADE|SMASH|THE END)/i.test(line)) continue;
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(line)) { skipNext = true; continue; }
    if (skipNext) { skipNext = false; continue; } // dialogue line after character cue
    if (line.startsWith('(') && line.endsWith(')')) continue; // parenthetical
    if (line.startsWith('>') || line.startsWith('/*') || line.startsWith('//')) continue;

    action.push({ text: line, lineNum: i + 1 });
  }
  return action;
}

// ── Passive voice constructions (agentless) common in weak screenplay action ──
// These are high-precision patterns: all are genuine passive constructions where
// the subject receives action instead of performing it.
const PASSIVE_VOICE_PHRASES: readonly string[] = [
  'is seen', 'is heard', 'is found', 'is shown', 'is revealed', 'is discovered',
  'is opened', 'is closed', 'is broken', 'is given', 'is taken', 'is placed',
  'was seen', 'was heard', 'was found', 'was shown', 'was revealed', 'was discovered',
  'was opened', 'was closed', 'was broken', 'was given', 'was taken', 'was placed',
  'was killed', 'was shot', 'was hit', 'was thrown', 'was pushed', 'was pulled',
  'was grabbed', 'was locked', 'was told', 'was left', 'was sent', 'was made',
  'was brought', 'was carried', 'was dragged', 'was dropped', 'was led',
];

// ── Weak-verb-chain: auxiliary steps that bury the real action ─────────────
const WEAK_VERB_CHAIN_RE = /\b(started? to|began? to|continued to|went on to|proceeded to|was about to|seemed to be|tried to)\s+\w+/i;

/** Count sentences in a line (rough: split on . ! ?) */
function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) ?? []).length || 1;
}

/** Count words in a line */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export async function rhythmPass(input: PassInput): Promise<PassResult> {
  const { fountain, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const actionLines = extractActionLines(fountain);
  if (actionLines.length < 4) {
    return {
      pass: 'rhythm',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Rhythm pass: too few action lines to evaluate',
    };
  }

  const wordCounts = actionLines.map(l => countWords(l.text));
  const avgWords = wordCounts.reduce((s, v) => s + v, 0) / wordCounts.length;

  // ── Monotonous rhythm: all lines within 30% of average ───────────────────
  const varied = wordCounts.filter(w => Math.abs(w - avgWords) > avgWords * 0.3).length;
  if (varied < wordCounts.length * 0.2 && actionLines.length >= 8) {
    issues.push({
      location: 'Action lines throughout',
      rule: 'MONOTONOUS_RHYTHM',
      description: `Action lines are rhythmically uniform (avg ${Math.round(avgWords)} words, <20% variation) — prose lacks pulse`,
      severity: 'minor',
      suggestedFix: 'Mix very short sentences (impact) with longer ones (expansion) to create rhythmic contrast',
    });
  }

  // ── Run-on action block: >5 consecutive long lines ────────────────────────
  let longStreak = 0;
  let streakStartLine = 0;
  for (const line of actionLines) {
    if (countWords(line.text) > 20) {
      if (longStreak === 0) streakStartLine = line.lineNum;
      longStreak++;
      if (longStreak === 5) {
        issues.push({
          location: `Lines ~${streakStartLine}–${line.lineNum}`,
          rule: 'RUN_ON_ACTION',
          description: '5+ consecutive long action lines (>20 words each) — the scene reads as dense prose, not screenplay',
          severity: 'major',
          suggestedFix: 'Break long action blocks with white space, one-word lines, or visual beat separators',
        });
        // Do not reset — let streak grow past 5 without re-firing for the same run
      }
    } else {
      longStreak = 0;
    }
  }

  // ── Staccato: >4 consecutive very short lines ─────────────────────────────
  let shortStreak = 0;
  let shortStart = 0;
  for (const line of actionLines) {
    if (countWords(line.text) <= 4) {
      if (shortStreak === 0) shortStart = line.lineNum;
      shortStreak++;
      if (shortStreak === 4) {
        issues.push({
          location: `Lines ~${shortStart}–${line.lineNum}`,
          rule: 'STACCATO_FRAGMENTATION',
          description: '4+ consecutive very short action lines (≤4 words) — prose feels telegraphic without tension payoff',
          severity: 'minor',
          suggestedFix: 'Expand at least one fragment into a full beat that grounds the reader in the scene',
        });
        // Do not reset — let streak grow past 4 without re-firing for the same run
      }
    } else {
      shortStreak = 0;
    }
  }

  // ── Passive voice: agentless constructions dilute cinematic drive ─────────
  // Only fire when there are ≥3 passive constructions — an occasional passive is
  // valid (e.g. "was born") but repeated use removes the active subject.
  const passiveMatches: Array<{ lineNum: number; phrase: string }> = [];
  for (const line of actionLines) {
    const lower = line.text.toLowerCase();
    for (const phrase of PASSIVE_VOICE_PHRASES) {
      if (lower.includes(phrase)) {
        passiveMatches.push({ lineNum: line.lineNum, phrase });
        break; // one match per line is enough
      }
    }
  }
  if (passiveMatches.length >= 3) {
    issues.push({
      location: `Lines ${passiveMatches[0].lineNum}, ${passiveMatches[1].lineNum}, ${passiveMatches[2].lineNum}…`,
      rule: 'PASSIVE_VOICE_OVERUSE',
      description: `${passiveMatches.length} action lines use agentless passive constructions ("${passiveMatches[0].phrase}", …) — cinematic action requires active subjects`,
      severity: 'minor',
      suggestedFix: 'Rewrite: "The door was opened" → "Alice kicked the door open". Put the agent first and use an active verb',
    });
  }

  // ── Weak-verb chains: "started to run", "began to speak" ─────────────────
  const weakChainLines: number[] = [];
  for (const line of actionLines) {
    if (WEAK_VERB_CHAIN_RE.test(line.text)) weakChainLines.push(line.lineNum);
  }
  if (weakChainLines.length >= 2) {
    issues.push({
      location: `Lines ${weakChainLines.slice(0, 3).join(', ')}`,
      rule: 'WEAK_VERB_CHAIN',
      description: `${weakChainLines.length} action lines use weak auxiliary chains ("started to", "began to", "continued to") — bury the real verb and slow the scene`,
      severity: 'minor',
      suggestedFix: 'Replace "started to run" with "ran"; "began to speak" with "spoke" — use the root verb directly',
    });
  }

  // ── Wave 151: Camera-direction, adverb clustering, over-description ──────────

  // CAMERA_DIRECTION_OVERREACH: Writers directing the camera in action lines
  // ("we see", "the camera", "close on", "cut to", "pull back to reveal") — this
  // is the director's job. Spec scripts that over-direct read as amateur.
  const cameraDirectionRe = /\b(we see|we hear|we follow|the camera|close on|close up|cut to|pull back|track (in|out|with)|camera (?:moves|pans|tilts|pushes|pulls|reveals|shows)|p\.o\.v\.|point of view|tight on|wide on|reveal\s+that)\b/i;
  let cameraCount = 0;
  for (const line of actionLines) {
    if (cameraDirectionRe.test(line.text) && cameraCount < 3) {
      cameraCount++;
      if (cameraCount === 2) {
        // Fire once when we hit 2+ instances
        issues.push({
          location: `Line ${line.lineNum}`,
          rule: 'CAMERA_DIRECTION_OVERREACH',
          description: `Action lines direct the camera ${cameraCount}+ times ("we see", "close on", "the camera moves", etc.) — spec screenplays should describe what happens, not how to shoot it`,
          severity: 'minor',
          suggestedFix: 'Remove camera directions. Describe the physical world and action directly: "She closes her eyes" not "Close on her eyes as they close"',
        });
      }
    }
  }

  // ADVERB_CLUSTERING: Action lines dense with adverbs (-ly words) indicate
  // weak verbs propped up by qualifiers. A concentrated adverb count is a tell.
  // We flag any action line with 3+ adverbs — the verb is doing no work.
  const adverbRe = /\b\w+ly\b/gi;
  let adverbFlagCount = 0;
  for (const line of actionLines) {
    const adverbs = line.text.match(adverbRe) ?? [];
    if (adverbs.length >= 3 && adverbFlagCount < 2) {
      adverbFlagCount++;
      issues.push({
        location: `Line ${line.lineNum}`,
        rule: 'ADVERB_CLUSTERING',
        description: `Action line has ${adverbs.length} adverbs: "${adverbs.join('", "')}" — adverb clusters signal weak verbs propped up by qualifiers`,
        severity: 'minor',
        suggestedFix: `Replace the weak verb + adverb with a single precise verb. "Runs quickly" → "Sprints". "Speaks softly" → "Whispers".`,
      });
    }
  }

  // OVER_DESCRIPTION: An action line introducing a character with 4+ physical
  // adjectives or descriptors signals style-sheet over-writing. The reader gets
  // a catalogue instead of a specific, telling image.
  // We detect this by looking for lines with 4+ adjectives describing a person.
  const adjRe = /\b(tall|short|thin|fat|lean|heavy|broad|slender|stocky|muscular|frail|young|old|middle-aged|dark|fair|pale|tan|tanned|weathered|handsome|beautiful|ugly|plain|sharp|soft|hard|angular|round|tired|alert|nervous|calm|serious|intense|gentle|fierce|cold|warm|wild|controlled|elegant|rough|smooth|scarred|battered|groomed|unkempt)\b/gi;
  for (let i = 0; i < actionLines.length; i++) {
    const line = actionLines[i];
    const adjMatches = line.text.match(adjRe) ?? [];
    // Only fire for lines that seem to describe a person (contain a name-like pattern or "A MAN/WOMAN")
    if (adjMatches.length >= 4 && /\b(man|woman|person|figure|character|he|she|detective|agent|officer|doctor|doctor|nurse|soldier|cop)\b/i.test(line.text)) {
      issues.push({
        location: `Line ${line.lineNum}`,
        rule: 'OVER_DESCRIPTION',
        description: `Line introduces a character with ${adjMatches.length} physical adjectives: "${adjMatches.join('", "')}" — an inventory of traits instead of one telling image`,
        severity: 'minor',
        suggestedFix: 'Cut to one or two specific, unexpected details that do more work than a list. What single image makes this person unforgettable?',
      });
      break; // one flag per pass
    }
  }

  // ── Wave 170: Opening-word repetition, sensory imbalance, near-word repeat ──

  // OPENING_WORD_REPETITION: More than 40% of action lines begin with the same
  // word. A screenplay where nearly half the lines start with "He" or "She" or
  // "The" reads as repetitive at the sentence level, not just in content.
  if (actionLines.length >= 8) {
    const firstWords = new Map<string, number>();
    for (const line of actionLines) {
      const first = (line.text.split(/\s+/)[0] ?? '').toLowerCase();
      if (first) firstWords.set(first, (firstWords.get(first) ?? 0) + 1);
    }
    const [topWord, topCount] = [...firstWords.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    if (topCount / actionLines.length > 0.4) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'OPENING_WORD_REPETITION',
        description: `${topCount} of ${actionLines.length} action lines (${Math.round(topCount / actionLines.length * 100)}%) begin with "${topWord}" — the prose rhythm is anchored to a single sentence-opening pattern`,
        severity: 'minor',
        suggestedFix: 'Vary sentence openings: start some lines with the object, some with a location, some with a sound. "He walks to the door" → "The door takes two steps to reach."',
      });
    }
  }

  // SENSORY_IMBALANCE: 10+ action lines with no sound descriptors anywhere.
  // Great screenplay prose engages at least two senses — purely visual action
  // strips the cinematic world of its acoustic dimension.
  if (actionLines.length >= 10) {
    const soundWords = [
      'silence','silent','quiet','loud','deafening','faint','distant','snap','creak','rumble',
      'hiss','click','thud','slam','crack','whisper','roar','buzz','ring','drip','squeak',
      'screech','bang','boom','clatter','grunt','echo','muffled','rattle','scrape','tick',
      'whoosh','clang','chime','howl','moan','wail','shriek','murmur','clamor','din',
    ];
    const hasSoundLine = actionLines.some(l => {
      const lower = l.text.toLowerCase();
      return soundWords.some(w => lower.includes(w));
    });
    if (!hasSoundLine) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SENSORY_IMBALANCE',
        description: `${actionLines.length} action lines contain no sound descriptors — the screenplay world is purely visual. Film is also audio.`,
        severity: 'minor',
        suggestedFix: 'Add at least one sound cue to the action lines: a creak, silence, a distant hum, or a sharp click that anchors the audience in the acoustic space',
      });
    }
  }

  // NEAR_WORD_REPEAT: A content word (6+ letters, not a stopword) appears 4+
  // times within any 5-line window of action. Tight repetition in a small
  // area signals vocabulary strain — the writer is cycling the same word.
  if (actionLines.length >= 8) {
    const RHYTHM_STOPWORDS = new Set([
      'about','after','again','against','along','also','another','around','away','back',
      'before','between','beyond','could','every','first','going','having','itself','might',
      'never','nothing','other','place','really','still','their','there','these','those',
      'through','under','until','where','which','while','would','without','within',
    ]);
    const windowSize = 5;
    outer: for (let i = 0; i <= actionLines.length - windowSize; i++) {
      const windowLines = actionLines.slice(i, i + windowSize);
      const wordFreq = new Map<string, number>();
      for (const line of windowLines) {
        for (const raw of line.text.toLowerCase().split(/\W+/)) {
          if (raw.length >= 6 && !RHYTHM_STOPWORDS.has(raw)) {
            wordFreq.set(raw, (wordFreq.get(raw) ?? 0) + 1);
          }
        }
      }
      for (const [word, count] of wordFreq) {
        if (count >= 4) {
          issues.push({
            location: `Lines ${windowLines[0].lineNum}–${windowLines[windowLines.length - 1].lineNum}`,
            rule: 'NEAR_WORD_REPEAT',
            description: `"${word}" appears ${count} times within a ${windowSize}-line window — tight repetition of the same content word signals vocabulary strain`,
            severity: 'minor',
            suggestedFix: `Vary the vocabulary: replace 2-3 of the "${word}" occurrences with synonyms or rephrase the action to eliminate the repetition`,
          });
          break outer;
        }
      }
    }
  }

  // ── Wave 184: Abstract noun overload, filler gestures, gerund fragments ─────

  // ABSTRACT_NOUN_OVERLOAD: Action lines that name psychological states instead of
  // dramatising them through physical reality. A screenplay's action lines must
  // describe what is seen and heard — when more than 30% name an internal feeling
  // or abstract concept directly, the writing becomes novelistic.
  if (actionLines.length >= 8) {
    const abstractRe = /\b(feeling|feelings|thought|thoughts|emotion|emotions|mood|longing|desire|tension|anxiety|grief|regret|wonder|doubt|confusion|shame|guilt|despair|bitterness|sorrow|hatred|anguish|dread|yearning|nostalgia|melancholy|wistfulness|apprehension)\b/i;
    const abstractCount = actionLines.filter(l => abstractRe.test(l.text)).length;
    if (abstractCount / actionLines.length > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ABSTRACT_NOUN_OVERLOAD',
        description: `${abstractCount} of ${actionLines.length} action lines (${Math.round(abstractCount / actionLines.length * 100)}%) name psychological states directly (feeling, grief, longing, despair…). Action lines must show; they cannot tell.`,
        severity: 'minor',
        suggestedFix: 'Replace abstract nouns with concrete physical action: "She grips the letter until her knuckles whiten" instead of "She feels grief". Let the body carry the emotion.',
      });
    }
  }

  // FILLER_GESTURE_EXCESS: Overuse of content-free body gestures (nodding, shrugging,
  // sighing, fidgeting) that fill action lines without advancing story. When a story
  // relies on filler gestures for more than 20% of its action, the scenes have no
  // physical world — characters perform emotional semaphore in a vacuum.
  if (actionLines.length >= 8) {
    const fillerGestureRe = /\b(nods?|nodding|shrugs?|shrugging|sighs?|sighing|fidgets?|fidgeting|clears?\s+(?:his|her|their|a)\s+throat|shifts?\s+(?:uncomfortably|in\s+(?:his|her|their)\s+(?:seat|chair)))\b/i;
    const fillerCount = actionLines.filter(l => fillerGestureRe.test(l.text)).length;
    if (fillerCount >= 3 && fillerCount / actionLines.length > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'FILLER_GESTURE_EXCESS',
        description: `${fillerCount} action lines use content-free filler gestures (nods, shrugs, sighs, fidgets) — ${Math.round(fillerCount / actionLines.length * 100)}% of action is empty emotional semaphore with no physical world.`,
        severity: 'minor',
        suggestedFix: 'Replace filler gestures with specific physical actions that reveal character and place the reader in a concrete world. "He nods" tells nothing. "He lines up the shot glasses, one for each lie she told him" does.',
      });
    }
  }

  // GERUND_FRAGMENT_CHAIN: Action lines where more than 30% begin with a gerund
  // ("-ing" present participle as a sentence fragment). Occasional gerund openings
  // create economy and pace. When they dominate, the writing becomes a listicle
  // of disconnected actions — the narrative loses grammatical coherence.
  if (actionLines.length >= 8) {
    const gerundRe = /^[A-Z][a-z]*ing\b/;
    const gerundCount = actionLines.filter(l => gerundRe.test(l.text.trim())).length;
    if (gerundCount >= 4 && gerundCount / actionLines.length > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'GERUND_FRAGMENT_CHAIN',
        description: `${gerundCount} of ${actionLines.length} action lines (${Math.round(gerundCount / actionLines.length * 100)}%) begin with a gerund fragment (Walking… Reaching… Turning…). The screenplay substitutes fragments for active sentences.`,
        severity: 'minor',
        suggestedFix: 'Convert gerund fragments to active sentences with a subject: "Walking to the door" → "She crosses to the door". Reserve gerund fragments for single-beat impact moments, not as a default register.',
      });
    }
  }

  // ── Wave 207: Conjunction opener excess, then-chain, exclamation in action ──

  // CONJUNCTION_OPENER_EXCESS: More than 30% of action lines begin with a
  // coordinating conjunction (And, But, Or, So, Yet). An occasional conjunction-
  // opener creates emphasis; when they dominate, the action reads like a breathless
  // list or interior monologue rather than the cinematic present tense a screenplay
  // requires. Distinct from OPENING_WORD_REPETITION (any word at >40%): this
  // targets the coordinating-conjunction pattern specifically. Requires 8+ lines.
  if (actionLines.length >= 8) {
    const conjRe207 = /^(And|But|Or|So|Yet)\b/i;
    const conjCount207 = actionLines.filter(l => conjRe207.test(l.text.trim())).length;
    const conjRatio207 = conjCount207 / actionLines.length;
    if (conjRatio207 > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'CONJUNCTION_OPENER_EXCESS',
        severity: 'minor',
        description: `${conjCount207} of ${actionLines.length} action lines (${Math.round(conjRatio207 * 100)}%) begin with a coordinating conjunction (And, But, Or, So, Yet) — the action reads like a breathless list rather than present-tense cinematic description.`,
        suggestedFix: "Reserve conjunction openers for single moments of emphasis. 'But she hesitates.' works once; a scene where half the lines start with And/But/Or reads as literary exercise, not screenplay.",
      });
    }
  }

  // THEN_CHAIN: More than 25% of action lines begin with "Then" or "And then" —
  // the weakest narrative connector. "Then A. Then B. Then C." sequences events
  // without causality; the action feels like stage directions lifted from a
  // production report. Distinct from CONJUNCTION_OPENER_EXCESS (And/But/Or/So/Yet).
  // Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const thenRe207 = /^(Then|And then)\b/i;
    const thenCount207 = actionLines.filter(l => thenRe207.test(l.text.trim())).length;
    const thenRatio207 = thenCount207 / actionLines.length;
    if (thenRatio207 > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'THEN_CHAIN',
        severity: 'minor',
        description: `${thenCount207} of ${actionLines.length} action lines (${Math.round(thenRatio207 * 100)}%) begin with "Then" — sequencing without causality. "Then she runs. Then he follows." is a list of events, not a scene.`,
        suggestedFix: "Replace 'Then' with cause: instead of 'Then she turns,' write 'The sound makes her turn' or 'She can't hold still any longer.' Every beat should follow from the last because of something — not merely after it.",
      });
    }
  }

  // EXCLAMATION_IN_ACTION: Three or more action lines end with '!'. Exclamation
  // marks in action prose are a tell of over-writing: the screenplay annotates
  // that something is exciting instead of writing action that IS exciting. The
  // reader feels the writer's enthusiasm rather than the scene's tension. Distinct
  // from dialogue exclamation checks in voice.ts — this fires solely on action
  // description. Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const exclCount207 = actionLines.filter(l => l.text.trim().endsWith('!')).length;
    if (exclCount207 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'EXCLAMATION_IN_ACTION',
        severity: 'minor',
        description: `${exclCount207} action lines end with '!' — the screenplay annotates excitement instead of writing it. Exclamation marks in action prose signal the writer's enthusiasm, not the scene's tension.`,
        suggestedFix: "Remove the exclamation marks and rewrite each line to make the action itself urgent: sharper verbs, shorter sentences, concrete physical consequence. 'He catches the pass!' → 'He catches it. Barely.'",
      });
    }
  }

  // ── Wave 221: Prose-cadence signal-processing — flow blocking, length ramp,
  //    intra-clause cadence. These treat the action-line word-count series as a signal
  //    and read its flow, trend, and internal punctuation rather than per-line features. ──

  // PROSE_RHYTHM_BLOCKING (minor): action-line lengths cross their mean in fewer than 25%
  // of transitions WHILE the variance is genuinely high — long and short lines are sorted
  // into blocks (a wall of long description, then a run of fragments) instead of alternating.
  // Distinct from MONOTONOUS_RHYTHM (which fires on LOW variance): here the variance is
  // healthy but the arrangement is blocked, so the page reads as slabs rather than a pulse.
  if (actionLines.length >= 8) {
    const cov221 = avgWords > 0 ? Math.sqrt(wordCounts.reduce((s, w) => s + (w - avgWords) ** 2, 0) / wordCounts.length) / avgWords : 0;
    let crossings221 = 0, transitions221 = 0, prevSign221 = 0;
    for (const w of wordCounts) {
      const sign221 = w > avgWords ? 1 : w < avgWords ? -1 : 0;
      if (sign221 !== 0) {
        if (prevSign221 !== 0) { transitions221++; if (sign221 !== prevSign221) crossings221++; }
        prevSign221 = sign221;
      }
    }
    const crossRate221 = transitions221 > 0 ? crossings221 / transitions221 : 1;
    if (cov221 >= 0.3 && transitions221 >= 6 && crossRate221 < 0.25) {
      issues.push({
        location: 'Action-line rhythm',
        rule: 'PROSE_RHYTHM_BLOCKING',
        severity: 'minor',
        description: `Action lines vary in length (coefficient ${cov221.toFixed(2)}) but cross their average in only ${Math.round(crossRate221 * 100)}% of transitions — long and short lines are sorted into blocks rather than alternated. The page reads as a slab of dense description followed by a slab of fragments, not as a pulse.`,
        suggestedFix: 'Interleave long and short action lines instead of grouping them: drop a one-beat fragment into the middle of a dense passage, and expand a single line within a run of staccato. Rhythm comes from frequent alternation, not from one long block of each.',
      });
    }
  }

  // PROSE_LENGTH_RAMP (minor): action-line length trends upward across the script (positive
  // normalised regression slope) — the description thickens as the story advances. As scenes
  // should quicken toward the climax, prose should tighten, not sprawl; a rising line-length
  // trend signals action writing that loses discipline and energy as it goes.
  if (actionLines.length >= 8) {
    const nW221 = wordCounts.length;
    const meanIdx221 = (nW221 - 1) / 2;
    let cov221b = 0, varIdx221 = 0;
    for (let i = 0; i < nW221; i++) {
      cov221b += (i - meanIdx221) * (wordCounts[i] - avgWords);
      varIdx221 += (i - meanIdx221) ** 2;
    }
    const slope221 = varIdx221 > 0 ? cov221b / varIdx221 : 0;
    const slopeNorm221 = avgWords > 0 ? slope221 / avgWords : 0;
    if (slopeNorm221 > 0.06) {
      issues.push({
        location: 'Action-line length trend',
        rule: 'PROSE_LENGTH_RAMP',
        severity: 'minor',
        description: `Action lines grow steadily longer across the script (normalised slope +${(slopeNorm221 * 100).toFixed(0)}% per line) — the description thickens as the story advances. Prose should tighten toward the climax, not sprawl; a rising length trend bleeds energy out of the action writing exactly where it should be sharpest.`,
        suggestedFix: 'Tighten the later action lines: as stakes rise, cut description to its sharpest verbs and shortest beats. The prose cadence should accelerate alongside the story, with the leanest writing reserved for the climax.',
      });
    }
  }

  // INTRACLAUSE_CADENCE_ABSENT (minor): the action lines are long enough to support internal
  // rhythm, yet almost none use a comma, dash, or semicolon to shape a breath mid-line. Every
  // line is a single flat clause. Internal punctuation is how prose controls caesura and pace
  // within a sentence; its total absence makes even varied-length lines read as a monotone.
  if (actionLines.length >= 10 && avgWords >= 9) {
    const internalPunctRe221 = /[,;]|--|—|–/;
    const cadencedLines221 = actionLines.filter(l => internalPunctRe221.test(l.text)).length;
    const cadenceRatio221 = cadencedLines221 / actionLines.length;
    if (cadenceRatio221 < 0.1) {
      issues.push({
        location: 'Action description',
        rule: 'INTRACLAUSE_CADENCE_ABSENT',
        severity: 'minor',
        description: `Only ${cadencedLines221} of ${actionLines.length} action lines use any internal punctuation (comma, dash, semicolon) despite averaging ${Math.round(avgWords)} words — nearly every line is a single unbroken clause. Without mid-line caesura the prose has no internal breath; it reads as a stack of flat declaratives regardless of length.`,
        suggestedFix: 'Shape breath within lines: use a comma to set up a beat before a turn ("He reaches the door, stops."), a dash for an interruption, a semicolon to weld two images. Internal punctuation is how action writing controls pace inside a sentence, not just between them.',
      });
    }
  }

  // ── Wave 235: Declarative pile, simultaneous-action absent, motion-verb overload ──

  // DECLARATIVE_PILE (minor, ≥10 lines): More than 70% of action lines are flat
  // declaratives — no internal punctuation (comma, dash, semicolon) and no
  // subordinating conjunction (when, while, until, before, after, because, although,
  // though, unless). Pure declaratives sequence events without temporal layering,
  // causality, or simultaneity. The action reads as a stage manager's beat list
  // rather than cinematic description. Distinct from INTRACLAUSE_CADENCE_ABSENT
  // (which fires on avg word count ≥ 9 with <10% punctuated lines): this fires
  // regardless of line length when the grammatical structure is uniformly flat.
  if (actionLines.length >= 10) {
    const subordRe235 = /\b(when|while|until|before|after|because|although|though|unless)\b/i;
    const internalPunct235 = /[,;]|--|—|–/;
    const flatCount235 = actionLines.filter(
      l => !internalPunct235.test(l.text) && !subordRe235.test(l.text),
    ).length;
    if (flatCount235 / actionLines.length > 0.7) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'DECLARATIVE_PILE',
        severity: 'minor',
        description: `${flatCount235} of ${actionLines.length} action lines (${Math.round(flatCount235 / actionLines.length * 100)}%) are flat declaratives with no internal punctuation and no subordinating clause. Pure declarative sequences ("She enters. He looks. She leaves.") have no temporal layering, no causality signal, and no simultaneity — the action reads as a beat list rather than cinematic prose.`,
        suggestedFix: "Introduce structural variety: \"As she opens the door, he rises.\" layers two actions. \"Before he can speak, she's gone.\" uses cause and sequence. \"He watches, unable to move.\" uses a comma and hanging modifier. Even one varied structure per page breaks the declarative monotone.",
      });
    }
  }

  // SIMULTANEOUS_ACTION_ABSENT (minor, ≥12 lines): No action line uses a
  // simultaneous-action marker ("while", "even as", "at the same time").
  // Simultaneity is a key visual grammar of film — two things happening at once
  // in the frame. A 12+-line scene where every action is strictly sequential
  // misses the spatial and temporal depth that makes description cinematic.
  // Distinct from DECLARATIVE_PILE (grammatical structure): this fires on the
  // semantic absence of simultaneous-action language even when grammar is varied.
  if (actionLines.length >= 12) {
    const simultRe235 = /\bwhile\b|\beven as\b|\bat the same time\b/i;
    const hasSimult235 = actionLines.some(l => simultRe235.test(l.text));
    if (!hasSimult235) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMULTANEOUS_ACTION_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no simultaneous-action language ("while", "even as", "at the same time") — every action is strictly sequential. Film captures two things happening at once in the frame; a scene with no simultaneity misses the visual layering that distinguishes screenplay from a prose sequence of events.`,
        suggestedFix: 'Add at least one simultaneous layer: "While he talks, she reads the room." or "Even as he smiles, his hands are shaking." Simultaneous action creates visual depth and reveals character through contradiction.',
      });
    }
  }

  // MOTION_VERB_OVERLOAD (minor, ≥8 lines): More than 50% of action lines are
  // dominated by locomotion verbs (walks, runs, enters, crosses, moves, turns,
  // approaches, steps, etc.). A scene built primarily around physical movement —
  // characters located and directed rather than experienced — is choreography,
  // not drama. Distinct from FILLER_GESTURE_EXCESS (small gestures like nods/
  // shrugs): this fires on large-scale locomotion verbs that position bodies in
  // space without grounding the reader in the emotional reality of the scene.
  if (actionLines.length >= 8) {
    const motionVerbRe235 = /\b(walks?|runs?|moves?|crosses?|enters?|exits?|goes|comes?|turns?|reaches?|steps?|approaches?|leaves?|follows?|leads?|rushes?|hurries?|strides?|races?)\b/i;
    const motionCount235 = actionLines.filter(l => motionVerbRe235.test(l.text)).length;
    if (motionCount235 / actionLines.length > 0.5) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'MOTION_VERB_OVERLOAD',
        severity: 'minor',
        description: `${motionCount235} of ${actionLines.length} action lines (${Math.round(motionCount235 / actionLines.length * 100)}%) are built around locomotion verbs (walks, enters, crosses, approaches…). The scene is choreography — characters are positioned and directed rather than experienced. Without emotional grounding, sensory texture, or world-building between the movements, the action reads like a blocking rehearsal script.`,
        suggestedFix: 'Balance motion with perception, emotion, and world detail: instead of three consecutive "walks/crosses/turns" lines, insert what the character notices, what the space costs them, or what the movement reveals. Movement gains meaning from the environment and inner life surrounding it.',
      });
    }
  }

  // ── Wave 249: Short line poverty, visual texture absent, spatial anchor absent ──

  // SHORT_LINE_POVERTY (minor, ≥12 action lines): Not a single action line is
  // ≤3 words — the prose has no punchy impact beats at all. Distinct from
  // STACCATO_FRAGMENTATION (which fires when there are TOO MANY consecutive
  // very-short lines): this fires when there are ZERO short lines, meaning the
  // screenwriter never used the single-word or two-word line as a dramatic tool.
  // "She runs. He falls. Bang." — the very short line is one of screenwriting's
  // most powerful instruments for landing a moment; its complete absence means
  // every beat gets equal weight, which means no beat gets weight at all.
  if (actionLines.length >= 12) {
    const hasShortLine249 = actionLines.some(l => countWords(l.text) <= 3);
    if (!hasShortLine249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SHORT_LINE_POVERTY',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no line of 3 words or fewer — the prose has no punchy impact beats. The very-short line is one of screenwriting's most powerful tools: "She stops." "He's gone." "Silence." When everything runs at similar length, nothing can land with maximum impact.`,
        suggestedFix: 'Introduce at least 2-3 impact lines of 1-3 words at your key dramatic beats. Not every action needs a full sentence. "She fires." — done. "Empty." — done. Short lines create a beat the reader cannot rush past.',
      });
    }
  }

  // VISUAL_TEXTURE_ABSENT (minor, ≥10 action lines): No action line contains a
  // texture or material descriptor (rough, smooth, worn, cracked, rusty, dusty,
  // tattered, stained, polished, weathered, gleaming, etc.). The visual world of
  // the screenplay has no tactile dimension — nothing has a surface. Tactile
  // adjectives are what make described objects feel real rather than generic;
  // their complete absence gives the visual world a catalogue-entry quality.
  if (actionLines.length >= 10) {
    const textureRe249 = /\b(rough|smooth|worn|cracked|rusty|dusty|tattered|stained|polished|weathered|gleaming|faded|scratched|dirty|grimy|shiny|damp|frayed|peeling|battered|chipped|spotless|pristine|scarred|pocked|matte|glossy|grainy|gritty|velvet|silky|coarse|brittle)\b/i;
    const hasTexture249 = actionLines.some(l => textureRe249.test(l.text));
    if (!hasTexture249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'VISUAL_TEXTURE_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no texture or material descriptor — the screenplay world has no tactile surface. Nothing is rough, worn, cracked, gleaming, or stained. Texture words are what make described objects feel real; their absence gives the visual world a blank, set-photograph quality.`,
        suggestedFix: 'Add at least 2-3 texture descriptors to the action: the worn armrest, the cracked plastic casing, the polished floor that reflects the overhead light. Texture is how the world tells the audience how old it is, how it has been used, and what it costs to be in it.',
      });
    }
  }

  // SPATIAL_ANCHOR_ABSENT (minor, ≥8 action lines): No action line contains a
  // spatial anchor phrase that locates action within a specific part of the scene
  // ("in the corner", "by the window", "at the table", "across the room",
  // "against the wall", "near the door", "through the hallway", "on the floor",
  // "behind the desk", "from above", "to the left", "overhead"). Without
  // spatial anchors, characters move through featureless space — the audience
  // cannot build a mental map of the scene's geography. Distinct from
  // LOCATION_MONOTONE (which fires when scenes are all in the same location):
  // this fires when WITHIN scenes there is no spatial grounding.
  if (actionLines.length >= 8) {
    const spatialRe249 = /\b(in the corner|by the window|at the table|across the room|against the wall|near the door|through the hall|on the floor|behind the desk|from above|to the left|to the right|overhead|in the doorway|on the stairs|beside the|in front of the|at the far end|in the centre|at the back|in the background)\b/i;
    const hasSpatial249 = actionLines.some(l => spatialRe249.test(l.text));
    if (!hasSpatial249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SPATIAL_ANCHOR_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no spatial anchor phrase — characters move through featureless space. Without "across the room", "by the window", "against the wall", the audience cannot build a mental map of the scene's geography. Every action floats in an unlocated void.`,
        suggestedFix: 'Anchor each significant action to a specific part of the space: not "she crosses to him" but "she crosses to him at the far window." Spatial specificity is what turns an abstract description into a scene the audience can see.',
      });
    }
  }

  // ── Wave 263: Question in action, simile excess, color absence ──

  // QUESTION_IN_ACTION (minor, ≥8 lines): ≥2 action lines end with '?' — rhetorical
  // questions in action prose break the objective cinematic present tense. The camera
  // observes; it does not ask. Distinct from EXCLAMATION_IN_ACTION (wrong-energy marker).
  if (actionLines.length >= 8) {
    const questionCount263 = actionLines.filter(l => l.text.trim().endsWith('?')).length;
    if (questionCount263 >= 2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'QUESTION_IN_ACTION',
        severity: 'minor',
        description: `${questionCount263} action lines end with '?' — rhetorical questions in action prose break the objective cinematic present tense. The camera observes; it does not ask. "What does he want?" in an action line imports interior monologue or authorial musing into a form that must describe only what is seen and heard.`,
        suggestedFix: "Remove question marks from action prose. If the question is about character intent, dramatise it through behavior: instead of 'What is she looking for?' write 'She opens every drawer. Quickly. Not finding it.' Let the audience ask the question; the action only shows what is happening.",
      });
    }
  }

  // SIMILE_EXCESS (minor, ≥10 lines): ≥3 action lines contain simile markers
  // ("like a", "as if", "as though", "resembles") — simile is a prose fiction
  // technique that substitutes comparison for direct description. Screenplay
  // action should present the physical world as itself, not as something else.
  if (actionLines.length >= 10) {
    const simileRe263 = /\blike a\b|\bas if\b|\bas though\b|\bresembles\b/i;
    const simileCount263 = actionLines.filter(l => simileRe263.test(l.text)).length;
    if (simileCount263 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMILE_EXCESS',
        severity: 'minor',
        description: `${simileCount263} action lines use simile markers ("like a", "as if", "as though", "resembles") — simile is a prose fiction technique that substitutes comparison for direct description. Screenplay action lines must describe what is seen; repeated similes import a literary register that fights the concrete visual grammar of the form.`,
        suggestedFix: `Replace similes with specific, direct physical description. Instead of "he moves like a predator," write what is actually visible: "He keeps low. Watching the exits." The camera cannot shoot a simile; it can only shoot what is there.`,
      });
    }
  }

  // COLOR_ABSENCE (minor, ≥12 lines): No color word appears in the action
  // description — a 12+-line scene with no color information presents a monochrome
  // world, giving the director and production designer nothing to work from.
  // Distinct from VISUAL_TEXTURE_ABSENT (which fires on absence of tactile
  // surface descriptors).
  if (actionLines.length >= 12) {
    const colorRe263 = /\b(red|blue|green|yellow|orange|purple|violet|pink|brown|black|white|grey|gray|gold|silver|crimson|scarlet|cobalt|amber|ivory|ebony|beige|teal|azure|emerald|olive|tan|maroon|navy|khaki)\b/i;
    const hasColor263 = actionLines.some(l => colorRe263.test(l.text));
    if (!hasColor263) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COLOR_ABSENCE',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no color reference — the visual world is rendered without color. Film is a visual medium; color is one of the cinematographer's primary expressive tools. A scene description with no color information presents a monochrome world and gives the director nothing to work from visually.`,
        suggestedFix: 'Introduce at least one color reference in the action: the red exit sign, the grey concrete walls, the yellow stain on the ceiling. Color is not decoration — it is the screenplay\'s instruction to the visual department about the emotional temperature of the scene.',
      });
    }
  }

  // ── Wave 277: Body-part overload, single-sentence flood, ellipsis chain ──────

  // BODY_PART_OVERLOAD (minor, ≥8 action lines): More than 40% of action lines
  // contain a body-part reference (hands, eyes, jaw, chest, fingers…). A scene
  // built primarily from isolated body-part movements has no spatial context — it
  // reads as a disconnected close-up reel. When the majority of action zooms to
  // body parts, characters become floating anatomy rather than people grounded in
  // a physical world. Distinct from OVER_DESCRIPTION (stacking adjectives on one
  // character intro) — this fires on the PROPORTION of body-part-centric action.
  if (actionLines.length >= 8) {
    const bodyPartRe277 = /\b(hand|hands|eye|eyes|face|arm|arms|leg|legs|foot|feet|finger|fingers|mouth|lip|lips|shoulder|shoulders|head|neck|chest|back|knee|knees|fist|fists|jaw|thumb|wrist|elbow|hip|hips|toe|toes|brow|brows|hair|cheek|cheeks|chin|throat|forehead|temple|temples)\b/i;
    const bodyPartCount277 = actionLines.filter(l => bodyPartRe277.test(l.text)).length;
    if (bodyPartCount277 / actionLines.length > 0.4) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'BODY_PART_OVERLOAD',
        severity: 'minor',
        description: `${bodyPartCount277} of ${actionLines.length} action lines (${Math.round(bodyPartCount277 / actionLines.length * 100)}%) centre on an isolated body part — the scene reads as a disconnected close-up reel. Characters become floating anatomy with no spatial context or physical world surrounding them.`,
        suggestedFix: 'Alternate body-part beats with spatial action, environmental detail, and cause-and-effect beats. "His jaw tightened" tells us little; "He looked at the contract, jaw tightening as he reached the clause at the bottom" places the body in the world.',
      });
    }
  }

  // SINGLE_SENTENCE_FLOOD (minor, ≥12 action lines, avgWords≥7): Every action
  // line is a single declarative sentence — no line contains more than one
  // sentence. Multi-sentence lines create rhythmic variety and temporal layering
  // within a beat. Their complete absence means the prose sounds identical at
  // every scale: short action and long action both end at the same grammatical
  // boundary. A single well-placed two-sentence line signals a different kind of
  // moment. Distinct from MONOTONOUS_RHYTHM (word-count uniformity) — this fires
  // on sentence-count uniformity, even when word counts vary.
  if (actionLines.length >= 12 && avgWords >= 7) {
    const multiSentCount277 = actionLines.filter(l => countSentences(l.text) > 1).length;
    if (multiSentCount277 === 0) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SINGLE_SENTENCE_FLOOD',
        severity: 'minor',
        description: `All ${actionLines.length} action lines are single-sentence — the prose has no multi-clause variation. When every beat ends at the same grammatical boundary, different types of moments receive identical structural weight. Multi-sentence action lines signal a different pace, a different complexity, or a held breath after an impact.`,
        suggestedFix: 'Introduce at least 2-3 two-sentence action lines at key moments: "She opens the file. Nothing makes sense." or "He stands. Three seconds. Four." A second sentence after the first creates a reaction beat built into the description.',
      });
    }
  }

  // ELLIPSIS_CHAIN (minor, ≥8 action lines): Three or more action lines end with
  // '...' — the screenplay trails into hesitation. An action line that does not
  // commit to describing what happens is not an action line: it is the author
  // leaving a blank. One trailing ellipsis can suggest ambient ambiguity; three
  // or more suggests the writer is avoiding the work of deciding what occurs.
  if (actionLines.length >= 8) {
    const ellipsisCount277 = actionLines.filter(l => l.text.trim().endsWith('...')).length;
    if (ellipsisCount277 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ELLIPSIS_CHAIN',
        severity: 'minor',
        description: `${ellipsisCount277} action lines end with '...' — the screenplay trails into hesitation. Action prose must describe what is seen and heard; an ellipsis-ended action line defers the description and leaves the audience (and the crew) with nothing. Three or more trailing ellipses indicate a pattern of avoidance.`,
        suggestedFix: "Commit to the action: replace each trailing ellipsis with a specific physical description of what is seen, heard, or done. If a beat is genuinely ambiguous, describe the visible surface: 'She looks at him. Something passes between them.' — the ambiguity is in the meaning, not the description.",
      });
    }
  }

  // ── Wave 291: NUMBER_WORD_FLOOD ───────────────────────────────────────────
  // More than 35% of action lines contain spelled-out number words ("one",
  // "two", "three", "seven", etc.). Sprinkling numbers through action prose
  // creates a pseudo-precise tone that reads as over-specification — the
  // writer quantifying detail that should be visual and immediate. One or
  // two number words ground a scene; a flood signals the writer is measuring
  // rather than staging. Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const numberWordRe291 = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/i;
    const numberWordCount291 = actionLines.filter(l => numberWordRe291.test(l.text)).length;
    if (numberWordCount291 / actionLines.length > 0.35) {
      issues.push({
        location: 'Action lines — number-word density',
        rule: 'NUMBER_WORD_FLOOD',
        severity: 'minor',
        description: `${numberWordCount291} of ${actionLines.length} action lines (${Math.round(numberWordCount291 / actionLines.length * 100)}%) contain spelled-out number words. A flood of quantified details gives the prose a cataloguing quality — the writer is measuring the world rather than staging it. Numbers should appear when they carry dramatic weight ("three seconds"), not as ambient decoration.`,
        suggestedFix: 'Cut number words that don\'t carry dramatic weight. "Two guards stand at the door" is fine; "Three paintings and four chairs in two rows" is over-specification. Reserve number words for countdowns, precise costs, and moments where quantity is the point.',
      });
    }
  }

  // ── Wave 291: PREPOSITIONAL_OPENING_DOMINANCE ─────────────────────────────
  // More than 35% of action lines begin with a preposition or prepositional
  // phrase ("In the corner", "At the table", "Across the room", "Through the
  // window"). Prepositional openers are a lazy way to establish spatial context
  // — they put the location before the action. Over-reliance creates a
  // catalogue of settings with no sense of which details matter. Requires 8+
  // action lines.
  if (actionLines.length >= 8) {
    const prepRe291 = /^(in |at |on |by |from |through |across |along |over |under |between |behind |beside |among |around |against |above |below |into |onto |upon |within |toward|towards |beneath |beyond |near |inside |outside |throughout )/i;
    const prepCount291 = actionLines.filter(l => prepRe291.test(l.text.trim())).length;
    if (prepCount291 / actionLines.length > 0.35) {
      issues.push({
        location: 'Action lines — prepositional openers',
        rule: 'PREPOSITIONAL_OPENING_DOMINANCE',
        severity: 'minor',
        description: `${prepCount291} of ${actionLines.length} action lines (${Math.round(prepCount291 / actionLines.length * 100)}%) begin with a prepositional phrase. Starting every line with a location establishes where before it establishes who or what — the prose reads as stage directions from a spatial inventory rather than a camera in motion.`,
        suggestedFix: 'Lead action lines with characters, objects, or verbs: "She turns" instead of "In the corner, she turns". Reserve prepositional openers for transitions between locations or establishing shots — when every line leads with location, no location stands out.',
      });
    }
  }

  // ── Wave 291: ACTION_LINE_WORD_FLOOR ──────────────────────────────────────
  // Every action line is 5 words or fewer. Exclusively micro-beats leave no
  // room for description, texture, or context — the script reads as a storyboard
  // shot list, not a screenplay. Even a lean, kinetic script benefits from
  // occasional lines that carry more visual or emotional information. Requires
  // 8+ action lines.
  if (actionLines.length >= 8) {
    const microBeats291 = actionLines.filter(l => countWords(l.text) <= 5).length;
    if (microBeats291 === actionLines.length) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_LINE_WORD_FLOOR',
        severity: 'minor',
        description: `All ${actionLines.length} action lines are 5 words or fewer — the script reads as a shot-list storyboard rather than a screenplay. Micro-beats are effective in short bursts but their exclusive use strips all context from the action: no spatial grounding, no texture, no emotional register beyond the bare event.`,
        suggestedFix: 'Mix micro-beats with fuller lines: use 2-3 word lines for impact moments but surround them with lines that establish context, atmosphere, or consequence. "She runs. The door slams. Outside — silence." works because the long beat ("Outside — silence.") earns the two micro-beats before it.',
      });
    }
  }

  // ── Wave 305: DASH_CHAIN ──────────────────────────────────────────────────
  // Three or more action lines end with an em-dash or double hyphen — the
  // prose keeps interrupting itself. The companion tic to ELLIPSIS_CHAIN
  // (trailing dots): where the ellipsis trails off, the dash breaks off, and
  // either way the line declines to finish describing what happens. One
  // mid-action cut can sting; a chain of them is a stylistic stutter.
  // Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const dashCount305 = actionLines.filter(l => /(—|--)\s*$/.test(l.text.trim())).length;
    if (dashCount305 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'DASH_CHAIN',
        severity: 'minor',
        description: `${dashCount305} action lines end with an em-dash — the prose keeps breaking off mid-thought. Where a trailing ellipsis hesitates, a trailing dash interrupts; either way the line declines to finish describing what the camera sees. Used once, the cut-off can mirror an on-screen interruption; chained, it becomes a stylistic stutter that withholds description as a habit.`,
        suggestedFix: 'Reserve the trailing dash for moments when something genuinely cuts the action short — a door slamming, a gunshot, a hard cut — and complete the description everywhere else. If the interruption is real, the next line should show what did the interrupting.',
      });
    }
  }

  // ── Wave 305: NEGATION_ACTION_FLOOD ──────────────────────────────────────
  // More than 25% of action lines describe what does NOT happen ("He doesn't
  // move." "Nothing happens." "Nobody answers."). Negative space is
  // unfilmable: the camera cannot photograph an absence, only the visible
  // behavior that implies it. A flood of negation means the prose is
  // narrating around the scene instead of staging it. Requires 8+ action
  // lines.
  if (actionLines.length >= 8) {
    const negationRe305 = /\b(doesn't|don't|does not|do not|didn't|did not|nothing|no one|nobody|never|can't|cannot|won't|will not)\b/i;
    const negationCount305 = actionLines.filter(l => negationRe305.test(l.text)).length;
    if (negationCount305 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines — negation density',
        rule: 'NEGATION_ACTION_FLOOD',
        severity: 'minor',
        description: `${negationCount305} of ${actionLines.length} action lines (${Math.round(negationCount305 / actionLines.length * 100)}%) describe what does NOT happen. The camera cannot photograph an absence — "He doesn't move" gives the frame nothing, while "He stands rigid, hands flat against his thighs" gives it everything. Pervasive negation means the prose narrates around the scene rather than staging it.`,
        suggestedFix: 'Convert each negation into the visible behavior that implies it: "Nobody answers" → "The phone rings on, six times, seven"; "She doesn\'t react" → "She keeps slicing the onion, the knife perfectly even." Stillness and silence are filmable — but only as concrete, positive images.',
      });
    }
  }

  // ── Wave 305: ACTION_PARENTHESIS_ASIDE ───────────────────────────────────
  // Three or more action lines contain parenthetical asides "(like this)".
  // Parentheses in action prose are a novelist's device — a whispered author
  // commentary the camera has no equivalent for. Distinct from the dialogue
  // parenthetical checks (wrylies under character cues): this fires on
  // parentheses embedded inside action description. Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const asideCount305 = actionLines.filter(l => /\([^)]{2,}\)/.test(l.text)).length;
    if (asideCount305 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_PARENTHESIS_ASIDE',
        severity: 'minor',
        description: `${asideCount305} action lines contain parenthetical asides. Parentheses in action prose are a novelist's whisper — author commentary delivered past the scene — and the camera has no equivalent register for them. Each aside pulls the reader out of the visual flow to receive a private footnote.`,
        suggestedFix: 'Unpack each aside: if the parenthetical content matters, promote it to its own sentence; if it is a wink or qualifier, cut it. "She picks up the gun (her father\'s)" becomes "She picks up the gun. Her father\'s." — same information, delivered in the scene instead of beside it.',
      });
    }
  }

  // ── Wave 319: SUDDENLY_OVERUSE, PRONOUN_OPENER_DOMINANCE, PHYSICAL_INTERIORITY_LEAK ──

  // SUDDENLY_OVERUSE (minor, ≥10 action lines): More than 20% of action lines
  // contain a temporal-urgency adverb ("suddenly", "abruptly", "immediately",
  // "instantly", "without warning"). These words announce that an action is
  // surprising instead of writing action that IS surprising — they editorialize
  // rather than dramatize. Distinct from ADVERB_CLUSTERING (which fires when a
  // single line has 3+ adverbs); this fires on the proportion of lines each
  // containing these specific urgency shortcuts.
  if (actionLines.length >= 10) {
    const suddenlyRe319 = /\b(suddenly|abruptly|immediately|instantly|without warning)\b/i;
    const suddenCount319 = actionLines.filter(l => suddenlyRe319.test(l.text)).length;
    if (suddenCount319 / actionLines.length > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SUDDENLY_OVERUSE',
        severity: 'minor',
        description: `${suddenCount319} of ${actionLines.length} action lines (${Math.round(suddenCount319 / actionLines.length * 100)}%) contain urgency-announcement adverbs ("suddenly", "abruptly", "immediately", etc.) — the script tells the reader an action is surprising rather than making it so. "Suddenly the door opens" announces a surprise; "The door opens" delivers one.`,
        suggestedFix: 'Cut the announcement and trust the action: remove "suddenly/abruptly/immediately" and let the scene\'s rhythm create the effect. Short sentences, a line break before the action, or a concrete sensory trigger does what the adverb was trying to do.',
      });
    }
  }

  // PRONOUN_OPENER_DOMINANCE (minor, ≥12 action lines): More than 45% of
  // action lines begin with a personal pronoun (He, She, They, His, Her,
  // Their, It, We). The combined category of pronoun openers creates a
  // monotone actor-centric rhythm even when no single pronoun individually
  // dominates. Distinct from OPENING_WORD_REPETITION (which fires when one
  // specific word exceeds 40% — this fires when the combined pronoun category
  // exceeds 45%, catching even an even "He/She/They" distribution).
  if (actionLines.length >= 12) {
    const pronounRe319 = /^(He|She|They|His|Her|Their|It|We|I)\b/;
    const pronounCount319 = actionLines.filter(l => pronounRe319.test(l.text.trim())).length;
    if (pronounCount319 / actionLines.length > 0.45) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'PRONOUN_OPENER_DOMINANCE',
        severity: 'minor',
        description: `${pronounCount319} of ${actionLines.length} action lines (${Math.round(pronounCount319 / actionLines.length * 100)}%) begin with a personal pronoun (He, She, They, His, Her, etc.) — the prose is actor-centric to the point of rhythmic monotony. Every beat starts with who is doing it rather than what is happening or where it happens. Without object-first, location-first, or sound-first variation, the scene reads as a character-tracking ledger.`,
        suggestedFix: 'Vary sentence openings: begin some lines with the object ("The gun slides across the table"), the location ("On the far side of the room"), or the sound ("A car honks twice"). The subject of the sentence can still be the character — but foregrounding the world around them gives the scene spatial depth.',
      });
    }
  }

  // PHYSICAL_INTERIORITY_LEAK (minor, ≥10 action lines): More than 25% of
  // action lines describe a private internal body sensation (stomach tightens,
  // heart races, breath catches, knees go weak, chest constricts, throat
  // closes). These are interoceptive descriptions — felt inside the body —
  // that a camera cannot photograph. Distinct from COGNITION_IN_ACTION (which
  // catches mental verbs like "realizes", "wonders"), EMOTION_NAMING_IN_ACTION
  // in originality.ts (which catches "is sad/scared" emotional labels).
  if (actionLines.length >= 10) {
    const interiorityRe319 = /\b(stomach\s+(tightens?|drops?|lurches?|clenches?|knots?)|heart\s+(races?|pounds?|hammers?|lurches?|skips?|sinks?)|chest\s+(tightens?|constricts?|aches?)|breath\s+(catches?|hitches?|shortens?)|throat\s+(tightens?|closes?|constricts?|catches?)|knees?\s+(go|turn|become)\s+(weak|shaky|rubbery)|gut\s+(clenches?|lurches?|drops?|tightens?))\b/i;
    const interiorCount319 = actionLines.filter(l => interiorityRe319.test(l.text)).length;
    if (interiorCount319 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'PHYSICAL_INTERIORITY_LEAK',
        severity: 'minor',
        description: `${interiorCount319} of ${actionLines.length} action lines (${Math.round(interiorCount319 / actionLines.length * 100)}%) describe internal body sensations (stomach tightens, heart races, breath catches, etc.) — private physical states that a camera cannot film. These are interoceptive descriptions: the audience sees a face, not a racing heart. The screenplay is reporting what the character feels inside rather than writing what would be visible on screen.`,
        suggestedFix: "Translate internal sensation into visible behaviour: instead of \"His stomach drops\", write \"He leans against the doorframe. Doesn't speak.\" Let the actor play the interiority through their body and face — the screenplay's job is to give them something to react to, not to narrate the reaction itself.",
      });
    }
  }

  // ── Wave 330: WE_SEE_FLOOD, LIGHT_DESCRIPTION_OVERLOAD, SET_DRESSING_DOMINANCE ──

  // WE_SEE_FLOOD (minor, ≥10 action lines): More than 25% of action lines begin
  // with "We see", "We hear", "We find", "We watch", "We notice", or "We observe".
  // This construction breaks cinematic present tense — the screenplay's narrator
  // steps into frame and directs the audience's gaze. "We see John enter" is a
  // production note; "John enters" is a scene. Distinct from CAMERA_DIRECTION_OVERREACH
  // (explicit lens notation like "CLOSE ON"), PASSIVE_VOICE_OVERUSE ("is seen" —
  // grammatical passive), and PRONOUN_OPENER_DOMINANCE (combined pronoun category,
  // not specifically the filmmaking "We see" convention).
  if (actionLines.length >= 10) {
    const weSeeRe330 = /^We\s+(see|hear|find|watch|notice|observe)\b/i;
    const weSeeCount330 = actionLines.filter(l => weSeeRe330.test(l.text.trim())).length;
    if (weSeeCount330 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'WE_SEE_FLOOD',
        severity: 'minor',
        description: `${weSeeCount330} of ${actionLines.length} action lines (${Math.round(weSeeCount330 / actionLines.length * 100)}%) begin with "We see/hear/find/watch/notice" — the screenplay's narrator steps into frame and tells the audience what to observe. Screenplay convention demands the cinematic present tense: describe what IS, not what "we" see. The script is the camera; it doesn't need to announce itself.`,
        suggestedFix: 'Remove the "We see/hear" framing and state the action directly: "We see the door open" → "The door opens." Trust the cinematographer to frame it — focus the prose on the event, not the instruction to observe it.',
      });
    }
  }

  // LIGHT_DESCRIPTION_OVERLOAD (minor, ≥10 action lines): More than 30% of
  // action lines contain lighting vocabulary (light, shadow, dark, glow, beam,
  // illuminate, ray, sunlight, moonlight, silhouette, flicker, shaft, etc.).
  // A screenplay heavy on lighting description is doing the DP's job — lighting
  // is a production decision, not a screenplay element. Distinct from COLOR_ABSENCE
  // (fires when color is absent), VISUAL_TEXTURE_ABSENT (fires when visual
  // texture is absent), SENSORY_IMBALANCE (fires when sound is absent).
  if (actionLines.length >= 10) {
    const lightRe330 = /\b(lights?|lighting|shadows?|darkness|dimly?|brightly?|glow(?:ing)?|beams?|illuminate[sd]?|rays?|sunlight|moonlight|lamplight|candlelight|flicker(?:ing)?|silhouettes?|silhouetted|backlit|spotlit|spotlight|dappled|shafts?)\b/i;
    const lightCount330 = actionLines.filter(l => lightRe330.test(l.text)).length;
    if (lightCount330 / actionLines.length > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'LIGHT_DESCRIPTION_OVERLOAD',
        severity: 'minor',
        description: `${lightCount330} of ${actionLines.length} action lines (${Math.round(lightCount330 / actionLines.length * 100)}%) contain lighting description (light, shadow, glow, illuminate, beam, etc.) — the screenplay is designing the cinematography rather than dramatizing character action. Lighting is a production decision made by the DP and director; when light fills the prose, the human drama is crowded out.`,
        suggestedFix: 'Reserve lighting description for functional story beats — a power cut that changes the scene, a match struck that reveals something. Otherwise trust the DP to light the scene and focus the prose on what characters do, want, and reveal.',
      });
    }
  }

  // SET_DRESSING_DOMINANCE (minor, ≥10 action lines): More than 35% of action
  // lines mention static furniture or architectural elements (desk, chair, table,
  // door, window, wall, floor, shelf, stairs, counter, etc.). When the prose
  // catalogues the set rather than dramatizing the people in it, the screenplay
  // is furnishing a stage rather than staging a drama. Distinct from
  // VISUAL_TEXTURE_ABSENT (fires when visual detail is absent — opposite problem),
  // SPATIAL_ANCHOR_ABSENT (fires when characters lack positional grounding), and
  // OVER_DESCRIPTION (fires for 4+ physical adjectives describing a character).
  if (actionLines.length >= 10) {
    const setRe330 = /\b(desks?|chairs?|tables?|couches?|sofas?|beds?|floors?|ceilings?|windows?|doors?|doorways?|carpets?|shelves|shelf|bookcase|bookshelf|staircases?|stairs|hallways?|corridors?|counters?|cupboards?|cabinets?|wardrobes?|fireplace|mantle|mantlepiece|bathtubs?|sinks?|refrigerators?|fridges?|ovens?|stovetops?)\b/i;
    const setCount330 = actionLines.filter(l => setRe330.test(l.text)).length;
    if (setCount330 / actionLines.length > 0.35) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SET_DRESSING_DOMINANCE',
        severity: 'minor',
        description: `${setCount330} of ${actionLines.length} action lines (${Math.round(setCount330 / actionLines.length * 100)}%) reference static furniture or architectural elements (desk, chair, door, window, floor, etc.) — the prose is cataloguing the set rather than dramatizing the people in it. A screenplay's action lines should track what characters do; when furniture fills the page, the human drama is crowded out.`,
        suggestedFix: "Anchor furniture and props to character behavior: instead of noting that a desk sits in the corner, show a character lean against it, avoid it, or slam a fist on its surface. Props earn their place by participating in action, not by being listed.",
      });
    }
  }

  // ── Wave 344: POLYSYNDETON_OVERLOAD, SEMICOLON_IN_ACTION, WEATHER_DESCRIPTION_OVERLOAD ──

  // POLYSYNDETON_OVERLOAD (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines each string together three or more "and" coordinators ("He grabs the bag
  // and runs and slams the door and bolts"). Piling clauses with repeated "and" makes
  // every beat the same weight and the prose breathless — the reader can't tell which
  // action matters because they all arrive in one undifferentiated rush. Distinct from
  // THEN_CHAIN (lines beginning with "Then"), CONJUNCTION_OPENER_EXCESS (lines beginning
  // with a conjunction), and RUN_ON_ACTION (raw sentence length): this targets intra-line
  // coordinating-conjunction pileup specifically.
  if (actionLines.length >= 8) {
    const polysyndetonCount344 = actionLines.filter(l => (l.text.match(/\band\b/gi) ?? []).length >= 3).length;
    if (polysyndetonCount344 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'POLYSYNDETON_OVERLOAD',
        severity: 'minor',
        description: `${polysyndetonCount344} action lines string together three or more "and" coordinators ("He grabs the bag and runs and slams the door and bolts"). Piling clauses with repeated "and" gives every beat the same weight and makes the prose breathless — the reader cannot tell which action matters because they all arrive in one undifferentiated rush, and the rhythm flattens into a list.`,
        suggestedFix: 'Break the chains into separate sentences and vary their length: let the decisive action stand alone in a short sentence while subordinate beats fold into longer ones. Punctuation is pacing — a period where an "and" sat tells the reader this beat lands, then the next.',
      });
    }
  }

  // SEMICOLON_IN_ACTION (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines use a semicolon. The semicolon is a literary punctuation mark — it joins
  // two independent clauses into a considered, written relationship that the camera
  // has no equivalent for. Screen action wants the clean kinetic beat of a period or
  // the speed of a fragment, not the balanced subordination of prose. Distinct from
  // DASH_CHAIN (trailing em-dash), ELLIPSIS_CHAIN (trailing "..."), and ACTION_
  // PARENTHESIS_ASIDE (parenthetical interjections).
  if (actionLines.length >= 8) {
    const semicolonCount344 = actionLines.filter(l => l.text.includes(';')).length;
    if (semicolonCount344 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SEMICOLON_IN_ACTION',
        severity: 'minor',
        description: `${semicolonCount344} action lines use a semicolon. The semicolon is a literary mark — it binds two independent clauses into a considered, written relationship the camera cannot photograph. Screen action wants the clean kinetic snap of a period or the speed of a fragment; the semicolon's balanced subordination belongs to the page, not the frame, and signals prose written to be read rather than shot.`,
        suggestedFix: "Replace semicolons with periods or restructure the beat: two independent clauses joined by a semicolon are almost always two sentences wanting to be free. Splitting them sharpens the rhythm and lets each action land on its own.",
      });
    }
  }

  // WEATHER_DESCRIPTION_OVERLOAD (minor, ≥10 action lines): More than 30% of action
  // lines contain weather vocabulary (rain, wind, snow, storm, fog, mist, clouds, sun,
  // thunder, lightning, breeze, drizzle, etc.). Like lighting and set dressing, ambient
  // weather is largely the domain of the director and production — when it saturates the
  // prose, atmosphere crowds out the human drama and the page describes conditions
  // instead of characters. Distinct from LIGHT_DESCRIPTION_OVERLOAD and SET_DRESSING_
  // DOMINANCE (different vocabularies) and from originality's WEATHER_OPENER_CRUTCH
  // (which flags scenes that OPEN on weather — a per-scene structural check, not an
  // action-line density measure).
  if (actionLines.length >= 10) {
    const weatherRe344 = /\b(rain(?:ing|s|y|fall|drops?)?|wind(?:y|s|swept)?|snow(?:ing|s|y|flakes?|fall)?|storm(?:y|s|ing)?|fog(?:gy|s)?|mist(?:y|s)?|clouds?|cloudy|thunder(?:ing|s)?|lightning|breeze|drizzl(?:e|ing)|sleet|hail(?:ing|stones?)?|downpour|blizzard|gale|overcast|sunshine|sunlit|drought|humid(?:ity)?|monsoon)\b/i;
    const weatherCount344 = actionLines.filter(l => weatherRe344.test(l.text)).length;
    if (weatherCount344 / actionLines.length > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'WEATHER_DESCRIPTION_OVERLOAD',
        severity: 'minor',
        description: `${weatherCount344} of ${actionLines.length} action lines (${Math.round(weatherCount344 / actionLines.length * 100)}%) contain weather description (rain, wind, snow, storm, fog, etc.) — atmosphere is crowding out the human drama. Like lighting, ambient weather is largely a production and directorial decision; when it saturates the prose, the page describes conditions instead of characters and the audience's attention drifts from the people to the climate.`,
        suggestedFix: 'Reserve weather for moments where it materially affects the scene — a storm that strands the characters, cold that frays tempers, rain that hides a sound. Otherwise trust the location and production to supply the weather, and spend the prose on what the characters do within it.',
      });
    }
  }

  // ── Wave 358: COLON_IN_ACTION, SOUND_DESCRIPTION_OVERLOAD, INTENSIFIER_FLOOD ──

  // COLON_IN_ACTION (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines use a colon as a dramatic-reveal device ("She opens her hand: a ring.",
  // "He turns: SARAH stands in the doorway."). The colon is a literary typography
  // trick — it engineers suspense on the page with punctuation. The camera achieves
  // the same reveal with a cut or a camera move; encoding it as a colon means the
  // writer is stage-managing the reader's eye rather than trusting the image to land.
  // Distinct from SEMICOLON_IN_ACTION (`;` not `:`), DASH_CHAIN (trailing em-dash),
  // ELLIPSIS_CHAIN (trailing `...`), and ACTION_PARENTHESIS_ASIDE.
  if (actionLines.length >= 8) {
    const colonCount358 = actionLines.filter(l => l.text.includes(':')).length;
    if (colonCount358 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COLON_IN_ACTION',
        severity: 'minor',
        description: `${colonCount358} action lines use a colon as a dramatic-reveal device ("He turns: she's already gone."). The colon engineers a beat of suspense on the page with punctuation alone. The camera achieves the same reveal with a cut or a hold; encoding the reveal as a colon means the writer is typographically directing the reader's experience rather than trusting the image to land on its own.`,
        suggestedFix: "Convert the colon beat into a visual one: split the line at the colon into two separate sentences. \"He turns. She's already gone.\" — the white space between them does the colon's dramatic work while keeping the prose cinematic.",
      });
    }
  }

  // SOUND_DESCRIPTION_OVERLOAD (minor, ≥10 action lines, >30%): More than 30%
  // of action lines describe specific sounds (bang, crash, roar, hum, buzz,
  // clatter, screech, etc.). Audio is the sound designer's and composer's domain;
  // when prose saturates with sonic detail, the writer encroaches on post-production
  // territory and the text describes what the mix will supply rather than what the
  // camera shows. Analogous to LIGHT_DESCRIPTION_OVERLOAD (DP's domain) and
  // WEATHER_DESCRIPTION_OVERLOAD (production design); this fires on the sound
  // vocabulary specifically.
  if (actionLines.length >= 10) {
    const soundRe358 = /\b(bang(?:s|ing)?|crash(?:es|ing)?|roar(?:s|ing)?|hum(?:s|ming)?|buzz(?:es|ing)?|clatter(?:s|ing)?|screech(?:es|ing)?|thud(?:s|ding)?|rattle(?:s|d|ing)?|squeal(?:s|ing)?|wail(?:s|ing)?|sirens?|echoes?|echo(?:ing)?|reverberat(?:es|ing|ed)|blast(?:s|ing)?|shriek(?:s|ing)?|rumble(?:s|d|ing)?|creak(?:s|ing)?|groan(?:s|ing)?)\b/i;
    const soundCount358 = actionLines.filter(l => soundRe358.test(l.text)).length;
    if (soundCount358 / actionLines.length > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SOUND_DESCRIPTION_OVERLOAD',
        severity: 'minor',
        description: `${soundCount358} of ${actionLines.length} action lines (${Math.round(soundCount358 / actionLines.length * 100)}%) describe specific sounds (bangs, crashes, roars, wails, etc.) — the prose is saturated with sonic detail that belongs to the sound designer. When audio description crowds the page, the writer is composing the mix rather than describing the visual action, and the camera's storytelling is subordinated to a production department's territory.`,
        suggestedFix: 'Keep sound references for moments where the audio is the dramatic point — a gunshot the audience has dreaded, a silence that breaks something open. Otherwise trust the sound department to supply ambient audio and spend the prose on the visual action that drives the scene forward.',
      });
    }
  }

  // INTENSIFIER_FLOOD (minor, ≥10 action lines, >30%): More than 30% of action
  // lines contain filler intensifiers (very, really, quite, rather, extremely,
  // utterly, absolutely, totally, completely, deeply, terribly, incredibly,
  // awfully, etc.). These are qualifiers that pad imprecise words rather than
  // replacing them. Distinct from ADVERB_CLUSTERING (which fires per-line when
  // 3+ `-ly` adverbs appear; this audits story-wide density of a specific set of
  // non-`-ly` and `-ly` filler intensifiers, not per-line stacking of any adverb).
  if (actionLines.length >= 10) {
    const intensifierRe358 = /\b(very|really|quite|rather|extremely|utterly|absolutely|totally|completely|deeply|terribly|incredibly|awfully|dreadfully|enormously|immensely|exceedingly|remarkably)\b/i;
    const intensifierCount358 = actionLines.filter(l => intensifierRe358.test(l.text)).length;
    if (intensifierCount358 / actionLines.length > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'INTENSIFIER_FLOOD',
        severity: 'minor',
        description: `${intensifierCount358} of ${actionLines.length} action lines (${Math.round(intensifierCount358 / actionLines.length * 100)}%) carry filler intensifiers (very, really, quite, extremely, utterly, completely, etc.) — qualifiers that signal the writer doesn't trust the underlying word. "Very cold" is weaker than "freezing"; "really scared" is weaker than "terrified." Intensifiers pad imprecise choices rather than replacing them with precise ones.`,
        suggestedFix: 'Delete every intensifier and upgrade the underlying word: "very cold" → "freezing", "really angry" → "furious", "quite beautiful" → "stunning". If removing the intensifier makes the image weaker, the problem is the noun or verb, not the missing qualifier — fix the word, not the padding.',
      });
    }
  }

  // ── Wave 372: TRIADIC_LIST_OVERLOAD, MID_LINE_EM_DASH_OVERUSE, TEMPORAL_OPENER_OVERUSE ──

  // TRIADIC_LIST_OVERLOAD (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines use a "X, Y, and Z" rule-of-three enumeration ("He grabs his coat, his keys,
  // and his nerve."). The triad is a powerful rhetorical figure precisely because it is
  // rare; leaned on repeatedly across action lines it becomes a rhythmic tic — every beat
  // resolves into the same three-part cadence, and the prose acquires a sing-song
  // predictability. Distinct from POLYSYNDETON_OVERLOAD (3+ "and" coordinators, no commas)
  // and DECLARATIVE_PILE (sentence-structure uniformity): this targets the comma-list triad.
  if (actionLines.length >= 8) {
    const triadRe372 = /[^,]+,\s+[^,]+,?\s+(and|or)\s+\w+/i;
    const triadCount372 = actionLines.filter(l => triadRe372.test(l.text)).length;
    if (triadCount372 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'TRIADIC_LIST_OVERLOAD',
        severity: 'minor',
        description: `${triadCount372} action lines use a "X, Y, and Z" rule-of-three enumeration. The triad lands precisely because it is rare; repeated across action lines it becomes a rhythmic tic — every beat resolves into the same three-part cadence and the prose acquires a sing-song predictability that flattens emphasis. When everything comes in threes, nothing stands out.`,
        suggestedFix: 'Vary the list structure: break some triads into single decisive images, let others run to two items or four, and reserve the rule-of-three for the one beat where its rhetorical weight matters. Rhythmic variety in enumeration keeps the prose from settling into a chant.',
      });
    }
  }

  // MID_LINE_EM_DASH_OVERUSE (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines interrupt themselves with a mid-sentence em-dash (or double hyphen) — text—text.
  // The interrupting dash injects a parenthetical aside or a sharp pivot into the middle of
  // a beat; used heavily it makes the action prose breathless and self-interrupting, as if
  // every line has a second thought it cannot suppress. Distinct from DASH_CHAIN (a trailing
  // em-dash at the END of the line — an interruption/trailing-off) and ACTION_PARENTHESIS_
  // ASIDE (parenthetical interjections in parentheses): this targets mid-line dash breaks.
  if (actionLines.length >= 8) {
    const midDashRe372 = /\w\s*(—|--)\s*\w/;
    const trailingDashRe372 = /(—|--)\s*$/;
    const midDashCount372 = actionLines.filter(l => midDashRe372.test(l.text) && !trailingDashRe372.test(l.text)).length;
    if (midDashCount372 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'MID_LINE_EM_DASH_OVERUSE',
        severity: 'minor',
        description: `${midDashCount372} action lines interrupt themselves with a mid-sentence em-dash ("She reaches for the door—then stops."). The interrupting dash injects an aside or a sharp pivot into the middle of a beat; used this often it makes the action prose breathless and self-interrupting, as if every line carries a second thought it can't suppress, and the constant mid-line breaks fracture the reading rhythm.`,
        suggestedFix: 'Convert most mid-line dashes into separate sentences or clean clauses: "She reaches for the door—then stops." → "She reaches for the door. Then stops." Reserve the interrupting dash for the rare beat where the abrupt pivot is the point; as a habit it makes the prose twitchy.',
      });
    }
  }

  // TEMPORAL_OPENER_OVERUSE (minor, ≥10 action lines, >25%): More than 25% of action
  // lines begin with a temporal adverb ("Now", "Soon", "Later", "Finally", "Eventually",
  // "Meanwhile", "Afterward", "Already"). Opening beats by narrating chronology tells the
  // reader when things happen rather than showing the action and letting sequence imply
  // itself; heavy use makes the prose read as a timeline being recited. Distinct from
  // THEN_CHAIN ("Then" openers) and SUDDENLY_OVERUSE ("Suddenly"/urgency adverbs): this
  // targets a distinct set of chronology-narrating openers.
  if (actionLines.length >= 10) {
    const temporalOpenerRe372 = /^(now|soon|later|finally|eventually|meanwhile|afterwards?|already|presently|nowadays|moments later|seconds later)\b/i;
    const temporalCount372 = actionLines.filter(l => temporalOpenerRe372.test(l.text.trim())).length;
    if (temporalCount372 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'TEMPORAL_OPENER_OVERUSE',
        severity: 'minor',
        description: `${temporalCount372} of ${actionLines.length} action lines (${Math.round(temporalCount372 / actionLines.length * 100)}%) begin with a temporal adverb ("Now", "Soon", "Later", "Finally", "Meanwhile"). Opening beats by narrating chronology tells the reader when things happen rather than showing the action and letting the sequence imply itself. Heavy use makes the prose read as a timeline being recited instead of a present-tense scene unfolding.`,
        suggestedFix: 'Cut most temporal openers and trust the order of the lines to convey sequence: action written in sequence already reads as "and then this happens." Reserve an explicit time marker for a genuine jump or a beat where the timing is the dramatic point.',
      });
    }
  }

  // ── Wave 386: COMMA_SPLICE_OVERUSE, ARTICLE_OPENER_DOMINANCE, CONNECTIVE_OPENER_OVERUSE ──

  // COMMA_SPLICE_OVERUSE (minor, ≥8 action lines, ≥3 lines): Three or more action lines
  // join two independent pronoun-subject clauses with a comma ("He turns, she follows.").
  // A comma splice fuses two beats into one breath where a period would let each land; in
  // screen action it blurs the discrete kinetic units the camera captures, so two actions
  // read as a single smeared gesture. Distinct from SEMICOLON_IN_ACTION (semicolons),
  // RUN_ON_ACTION (raw length), and POLYSYNDETON_OVERLOAD ("and" pileup): this targets the
  // comma-spliced clause join specifically.
  if (actionLines.length >= 8) {
    const commaSpliceRe386 = /,\s+(he|she|they|it|we|you)\s+\w/i;
    const spliceCount386 = actionLines.filter(l => commaSpliceRe386.test(l.text)).length;
    if (spliceCount386 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COMMA_SPLICE_OVERUSE',
        severity: 'minor',
        description: `${spliceCount386} action lines join two independent clauses with a comma ("He turns, she follows."). A comma splice fuses two beats into one breath where a period would let each land. In screen action this blurs the discrete kinetic units the camera captures — two separate actions read as a single smeared gesture, and the prose loses the clean beat-by-beat rhythm screenwriting depends on.`,
        suggestedFix: 'Split comma-spliced clauses into separate sentences: "He turns, she follows." → "He turns. She follows." Each action then lands as its own beat with its own emphasis. Reserve the comma join only where the two actions are genuinely one continuous motion.',
      });
    }
  }

  // ARTICLE_OPENER_DOMINANCE (minor, ≥10 action lines, >40%): More than 40% of action
  // lines begin with an article ("The", "A", "An"). Opening line after line with an article
  // produces a flat, list-like cadence — "The door opens. A man enters. The light flickers."
  // — where every beat starts from the same grammatical foot and the prose acquires a
  // monotonous, inventory-taking rhythm. Distinct from OPENING_WORD_REPETITION (a single
  // specific word opening >40% of lines): this aggregates the article category, catching
  // the flatness even when "The" and "A" alternate.
  if (actionLines.length >= 10) {
    const articleOpenerRe386 = /^(the|a|an)\s/i;
    const articleCount386 = actionLines.filter(l => articleOpenerRe386.test(l.text.trim())).length;
    if (articleCount386 / actionLines.length > 0.40) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ARTICLE_OPENER_DOMINANCE',
        severity: 'minor',
        description: `${articleCount386} of ${actionLines.length} action lines (${Math.round(articleCount386 / actionLines.length * 100)}%) begin with an article ("The", "A", "An"). Opening line after line with an article produces a flat, inventory-taking cadence — "The door opens. A man enters. The light flickers." — where every beat starts from the same grammatical foot and the prose settles into a monotonous rhythm that drains momentum.`,
        suggestedFix: 'Vary the sentence openings: start some lines with the subject\'s action, a prepositional phrase, or the character\'s name. Recasting "The door opens" as "Hinges shriek as the door swings wide" or leading with motion breaks the article-driven monotony and restores rhythmic variety.',
      });
    }
  }

  // CONNECTIVE_OPENER_OVERUSE (minor, ≥8 action lines, ≥3 lines): Three or more action
  // lines begin with a formal logical connective ("However", "Therefore", "Thus", "Instead",
  // "Nonetheless", "Moreover", "Consequently"). These essayistic linkers argue a logical
  // relationship between beats — they belong to expository prose, not the present-tense
  // observation of screen action, where the sequence of images implies the logic. Distinct
  // from CONJUNCTION_OPENER_EXCESS (And/But/So) and TEMPORAL_OPENER_OVERUSE (Now/Soon/Later):
  // this targets formal argumentative connectives.
  if (actionLines.length >= 8) {
    const connectiveRe386 = /^(however|therefore|thus|instead|nonetheless|nevertheless|moreover|furthermore|consequently|hence|accordingly|conversely)[\s,]/i;
    const connectiveCount386 = actionLines.filter(l => connectiveRe386.test(l.text.trim())).length;
    if (connectiveCount386 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'CONNECTIVE_OPENER_OVERUSE',
        severity: 'minor',
        description: `${connectiveCount386} action lines begin with a formal logical connective ("However", "Therefore", "Instead", "Nonetheless"). These essayistic linkers argue a logical relationship between beats — they belong to expository prose, not the present-tense observation of screen action, where the bare sequence of images should imply the logic. Connective-led action reads as an essay describing a film rather than the film itself.`,
        suggestedFix: 'Cut the logical connectives and let the order of the action carry the relationship: "However, she stays." → "She stays." The contrast or consequence is already visible in what follows what. Screen action shows the logic through sequence; stating it in prose connectives is telling, not showing.',
      });
    }
  }

  // ── Wave 400: LONG_LINE_FLOOD, LINE_ENDING_REPETITION, PROGRESSIVE_VERB_OVERUSE ──

  // LONG_LINE_FLOOD (minor, ≥10 action lines, >60% are ≥12 words): The action prose is
  // uniformly dense — more than 60% of all action lines carry ≥12 words, leaving no
  // white-space breathing room on the page. Dense prose is exhausting to read and signals
  // a writer who treats action like a novel excerpt rather than a screenplay — every moment
  // fully described, nothing implied by what's shown. The upper-end complement of SHORT_
  // LINE_POVERTY (all lines ≤5 words) and ACTION_LINE_WORD_FLOOR (≤5 words floor): this
  // fires on the opposite failure. Distinct from RUN_ON_ACTION (≥5 consecutive lines >20
  // words — a streak check at a higher threshold) and MONOTONOUS_RHYTHM (uniformity in
  // length variance, not upper-end distribution).
  if (actionLines.length >= 10) {
    const longCount400a = actionLines.filter(l => countWords(l.text) >= 12).length;
    if (longCount400a / actionLines.length > 0.6) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'LONG_LINE_FLOOD',
        severity: 'minor',
        description: `${longCount400a} of ${actionLines.length} action lines (${Math.round(longCount400a / actionLines.length * 100)}%) are 12 words or longer — the prose is uniformly dense with no visual breathing room. A screenplay page reads fastest when long description is broken by short, punchy beats. When most lines are long, the page becomes a wall of text that slows the reader and buries the moments that should land fast.`,
        suggestedFix: 'Break up the density: after a long descriptive line, let a short one land — "She stares." or "Nothing." or "A beat." give the eye a rest and make the longer lines feel deliberate rather than exhausting. Vary line length as a rhythmic tool, not just a consequence of how much there is to describe.',
      });
    }
  }

  // LINE_ENDING_REPETITION (minor, ≥10 action lines, ≥4 lines end with the same word):
  // Four or more action lines close on the same non-trivial final word — an unintentional
  // sentence-level anaphora that creates a rhythmic echo the audience hears before the
  // writer intended. Ending-word repetition is the counterpart of opening-word repetition
  // but at the close of each sentence, where the rhythmic stamp is equally (or more)
  // noticeable. Distinct from OPENING_WORD_REPETITION (opener-word global count), NEAR_
  // WORD_REPEAT (any word in a 6-line window, not sentence-final position), and THEN_CHAIN
  // (specific temporal connective, not any word in sentence-final position).
  if (actionLines.length >= 10) {
    const ENDING_STOP400b = new Set([
      'the','a','an','in','on','at','to','of','and','or','but','it','is','are','was','were',
      'be','been','that','this','there','his','her','its','their','my','your','our','he',
      'she','they','we','you','him','me','them','us',
    ]);
    const endingCounts400b = new Map<string, number>();
    for (const l of actionLines) {
      const words400b = l.text.replace(/[^a-z\s]/gi, '').trim().split(/\s+/).filter(Boolean);
      const last400b = words400b[words400b.length - 1]?.toLowerCase() ?? '';
      if (last400b.length >= 3 && !ENDING_STOP400b.has(last400b)) {
        endingCounts400b.set(last400b, (endingCounts400b.get(last400b) ?? 0) + 1);
      }
    }
    if (endingCounts400b.size > 0) {
      const [topEnd400b, topEndCount400b] = [...endingCounts400b.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topEndCount400b >= 4) {
        issues.push({
          location: 'Action lines throughout',
          rule: 'LINE_ENDING_REPETITION',
          severity: 'minor',
          description: `${topEndCount400b} action lines end with the same word ("${topEnd400b}") — an unintentional rhythmic echo at the sentence close. Ending-word repetition creates a stamp the reader hears accumulating before the writer intended it, flattening what should be varied prose into a metronomic pattern. Unlike an opening-word tic (which drives forward), a repeated ending word lands and then echoes, compounding the monotone.`,
          suggestedFix: `Vary how action lines end: restructure sentences so different words close them, or change which detail is the sentence's final emphasis. The last word of a line carries disproportionate weight — repeating "${topEnd400b}" trains the audience to stop caring what the line was building toward.`,
        });
      }
    }
  }

  // PROGRESSIVE_VERB_OVERUSE (minor, ≥10 action lines, >25% use is/are + -ing):
  // More than a quarter of all action lines use a present-progressive construction ("she
  // is running", "he is watching", "they are fighting") instead of the screenplay standard
  // of simple present ("she runs", "he watches"). Progressive constructions introduce a
  // temporal layer — the action is ongoing at the time of description — that the simple
  // cinematic present does not have. This thickens the tense register, makes action feel
  // less immediate, and is a common marker of prose-fiction habits carried into screenplay
  // format. Distinct from PASSIVE_VOICE_OVERUSE (was/were + past participle — true passive,
  // different construction and different register problem) and WEAK_VERB_CHAIN (started
  // to / began to — modal auxiliary chains, not be-progressive).
  if (actionLines.length >= 10) {
    const progressRe400c = /\b(?:is|are)\s+\w+ing\b/i;
    const progressCount400c = actionLines.filter(l => progressRe400c.test(l.text)).length;
    if (progressCount400c / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'PROGRESSIVE_VERB_OVERUSE',
        severity: 'minor',
        description: `${progressCount400c} of ${actionLines.length} action lines (${Math.round(progressCount400c / actionLines.length * 100)}%) use a present-progressive construction ("is/are + -ing") instead of the screenplay standard of simple present. "She is running" vs. "She runs" — the progressive adds a temporal layer that softens immediacy: the action is happening, ongoing, observed from a distance rather than witnessed in real time. A page of progressive verbs reads like a novelist describing a film rather than a screenplay enacting one.`,
        suggestedFix: 'Replace "is/are + -ing" with the simple present verb: "She is running" → "She runs", "They are fighting" → "They fight". The simple present is the language of the cinematic now — it drops the reader into the action rather than positioning them as an observer of something ongoing.',
      });
    }
  }

  // ── Wave 414: VAGUE_QUANTIFIER_OVERLOAD, ATMOSPHERE_ABSTRACTION_OVERLOAD, COLOR_DESCRIPTION_OVERLOAD ──

  // VAGUE_QUANTIFIER_OVERLOAD (minor, ≥8 action lines, >25%): More than 25% of action lines
  // lean on a vague quantifier ("some", "several", "a few", "many", "various", "numerous", "a
  // couple of", "a number of"). Vague quantities drain specificity from the staging — "some
  // people gather", "a few cars pass" — leaving the director and the audience with no concrete
  // image to hold. Screen action is most vivid when it commits to a number the eye can see.
  // Distinct from NUMBER_WORD_FLOOD (the opposite failure — over-precise spelled numerals like
  // "three"/"seven" diluting concision) and INTENSIFIER_FLOOD (degree adverbs, not quantities):
  // this targets imprecise quantification specifically.
  if (actionLines.length >= 8) {
    const vagueQuantRe414 = /\b(some|several|a few|many|various|numerous|a couple(?:\s+of)?|a number of|a bunch of|lots of|plenty of|countless|myriad)\b/i;
    const vagueQuantCount414 = actionLines.filter(l => vagueQuantRe414.test(l.text)).length;
    if (vagueQuantCount414 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'VAGUE_QUANTIFIER_OVERLOAD',
        severity: 'minor',
        description: `${vagueQuantCount414} of ${actionLines.length} action lines (${Math.round(vagueQuantCount414 / actionLines.length * 100)}%) lean on a vague quantifier ("some", "several", "a few", "many"). Imprecise quantities drain specificity from the staging — "some people gather", "a few cars pass" — leaving nothing concrete for the eye to hold. Screen action is most vivid when it commits to a number the audience can see, and a page of vague quantities reads as a writer gesturing at a scene rather than rendering it.`,
        suggestedFix: 'Commit to specific, visible quantities: "some people" → "three people"; "a few cars" → "two cars, then a third." A precise number gives the scene a concrete image and a rhythm; vagueness asks the reader to imagine the staging the writer declined to choose. Reserve "some" for the rare beat where the imprecision is itself the point.',
      });
    }
  }

  // ATMOSPHERE_ABSTRACTION_OVERLOAD (minor, ≥8 action lines, >25%): More than 25% of action
  // lines name an abstract mood or atmosphere noun ("tension", "silence", "an air of menace",
  // "a sense of dread", "energy", "presence", "atmosphere") instead of rendering the concrete
  // image that would produce that feeling. Naming the atmosphere is the action-line equivalent
  // of on-the-nose dialogue — it tells the audience what to feel rather than showing the detail
  // that makes them feel it. "Tension fills the room" is a label; "Nobody picks up their fork"
  // is the tension. Distinct from LIGHT/WEATHER/SOUND_DESCRIPTION_OVERLOAD (concrete sensory
  // vocabulary, the DP's/sound editor's domain) and SET_DRESSING_DOMINANCE (physical furniture):
  // this targets abstract mood nouns that have no visual referent at all.
  if (actionLines.length >= 8) {
    const atmosphereRe414 = /\b(tension|silence|stillness|atmosphere|mood|energy|presence|aura|vibe|unease|dread|menace|melancholy|serenity|chaos|calm)\b|\b(?:an?\s+)?(?:air|sense|feeling|wave|sensation)\s+of\b/i;
    const atmosphereCount414 = actionLines.filter(l => atmosphereRe414.test(l.text)).length;
    if (atmosphereCount414 / actionLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ATMOSPHERE_ABSTRACTION_OVERLOAD',
        severity: 'minor',
        description: `${atmosphereCount414} of ${actionLines.length} action lines (${Math.round(atmosphereCount414 / actionLines.length * 100)}%) name an abstract mood ("tension", "silence", "an air of menace", "a sense of dread") rather than rendering the concrete image that produces it. Naming the atmosphere is the action-line equivalent of on-the-nose dialogue — it tells the audience what to feel instead of showing the detail that makes them feel it. "Tension fills the room" is a label; "Nobody picks up their fork" is the tension itself.`,
        suggestedFix: 'Replace named atmospheres with the physical detail that creates them: "An air of menace" → "He cleans the knife slowly, watching the door." "A sense of dread" → "The phone rings. Nobody moves." The camera cannot photograph "tension" — it can only photograph the behavior and objects that make the audience feel it.',
      });
    }
  }

  // COLOR_DESCRIPTION_OVERLOAD (minor, ≥10 action lines, >30%): More than 30% of action lines
  // carry a color word — an over-saturated palette where the prose is constantly specifying
  // hues. Color is one of the cinematographer's primary tools, and a screenplay that names a
  // color in nearly every line is doing the DP's job for them while crowding the dramatic
  // action with palette notes the page does not need. A few deliberate color cues land; a
  // constant stream reads as a writer art-directing every frame. The upper-end complement of
  // COLOR_ABSENCE (no color word in 12+ lines — a monochrome world); reuses the same color
  // vocabulary, audited for over-saturation rather than absence.
  if (actionLines.length >= 10) {
    const colorRe414 = /\b(red|blue|green|yellow|orange|purple|violet|pink|brown|black|white|grey|gray|gold|silver|crimson|scarlet|cobalt|amber|ivory|ebony|beige|teal|azure|emerald|olive|tan|maroon|navy|khaki)\b/i;
    const colorCount414 = actionLines.filter(l => colorRe414.test(l.text)).length;
    if (colorCount414 / actionLines.length > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COLOR_DESCRIPTION_OVERLOAD',
        severity: 'minor',
        description: `${colorCount414} of ${actionLines.length} action lines (${Math.round(colorCount414 / actionLines.length * 100)}%) name a color — an over-saturated palette where nearly every line specifies a hue. Color is one of the cinematographer's primary expressive tools, and a screenplay that colors in every frame does the DP's job while crowding the dramatic action with palette notes the page does not need. A few deliberate color cues land with force; a constant stream reads as a writer art-directing every shot.`,
        suggestedFix: 'Reserve color for the cues that carry meaning — the red dress in a grey room, the one warm light in a cold frame — and let most action describe what happens, not its exact hue. Color used sparingly directs the eye to what matters; color in every line flattens into wallpaper and buries the beats that should pop.',
      });
    }
  }

  // ── Wave 428: CONSECUTIVE_OPENER_RUN, ACTION_FINALE_BLOAT, LONGEST_ACTION_OUTLIER ──

  // CONSECUTIVE_OPENER_RUN (run-based, ≥8 action lines): Five or more consecutive action lines
  // all begin with the same first word (case-insensitive). A local repetition tic where the
  // writer locks onto one opening word for an entire paragraph — "She does. She does. She does.
  // She does. She does." — producing a metronomic cadence that reads as inattention rather than
  // rhythm. Even when the GLOBAL proportion of that opener is within normal range (so none of the
  // %-threshold checks fire), a local run of five or more identical openers creates a pounding
  // monotone that flattens the individual beats into a list.
  // Distinctness: PRONOUN_OPENER_DOMINANCE (>45% globally start with a pronoun), ARTICLE_OPENER_
  // DOMINANCE (>40% globally start with The/A/An), PREPOSITIONAL_OPENING_DOMINANCE (>35%), and
  // TEMPORAL_OPENER_OVERUSE (>25%) are all global proportion checks on specific categories; this
  // is the only run-based check on opener patterns, catching LOCAL clustering regardless of
  // category and regardless of the global proportion.
  if (actionLines.length >= 8) {
    const firstWord428a = (text: string) => (text.trim().split(/\s+/)[0] ?? '').toLowerCase();
    let runLen428a = 1;
    let runWord428a = firstWord428a(actionLines[0].text);
    let runStart428a = 0;
    let bestRun428a = { word: runWord428a, start: 0, len: 1 };
    for (let i = 1; i < actionLines.length; i++) {
      const fw428a = firstWord428a(actionLines[i].text);
      if (fw428a === runWord428a) {
        runLen428a++;
        if (runLen428a > bestRun428a.len) bestRun428a = { word: runWord428a, start: runStart428a, len: runLen428a };
      } else {
        runLen428a = 1;
        runWord428a = fw428a;
        runStart428a = i;
      }
    }
    if (bestRun428a.len >= 5) {
      issues.push({
        location: `Action lines ${bestRun428a.start + 1}–${bestRun428a.start + bestRun428a.len} (opener: "${bestRun428a.word}")`,
        rule: 'CONSECUTIVE_OPENER_RUN',
        severity: 'minor',
        description: `${bestRun428a.len} consecutive action lines in a row all begin with "${bestRun428a.word}" — a local repetition tic that reduces the prose to a metronomic list. Even when the global proportion of that opener is unremarkable, a run of five or more identical first words creates a pounding cadence that flattens individual beats into a monotone sequence.`,
        suggestedFix: `Break the opener run: vary the sentence construction across these ${bestRun428a.len} lines. Start one with an object ("The door—"), one with a clause ("When she finally—"), one with a verb ("Slams the—"). Varying how sentences open is the single fastest way to restore prose rhythm to a paragraph that has locked into a tic.`,
      });
    }
  }

  // ACTION_FINALE_BLOAT (zone/distribution, ≥10 action lines, ≥3 in last zone): The last 25%
  // of the fountain's action lines (by position in the script) average more than 1.4× the word
  // count of the first 75%. The prose grows denser toward the climax instead of tightening —
  // the opposite of the rhythmic principle that action description should accelerate as stakes
  // rise and cutting quickens. A script that gets MORE expansive in its action lines as it
  // approaches the finale reads as though the writer slowed down to describe the ending in
  // theatrical detail rather than cutting the image to its essential flash.
  // Distinctness: LONG_LINE_FLOOD (>60% of all action lines globally are ≥12 words) audits a
  // global proportion regardless of position in the script. ACTION_FINALE_BLOAT audits the
  // SPATIAL DISTRIBUTION of word density — only the zone contrast between first 75% and last
  // 25% — which can fire even when LONG_LINE_FLOOD stays quiet (e.g., 40% of lines are long
  // but concentrated in the finale). No other check compares action line word-count by zone.
  if (actionLines.length >= 10) {
    const totalFountainLines428b = fountain.split('\n').length;
    const zoneThreshold428b = totalFountainLines428b * 0.75;
    const firstZone428b = actionLines.filter(l => l.lineNum <= zoneThreshold428b);
    const lastZone428b = actionLines.filter(l => l.lineNum > zoneThreshold428b);
    if (firstZone428b.length >= 3 && lastZone428b.length >= 3) {
      const wc428b = (l: { text: string }) => l.text.split(/\s+/).filter(Boolean).length;
      const firstAvg428b = firstZone428b.reduce((s, l) => s + wc428b(l), 0) / firstZone428b.length;
      const lastAvg428b = lastZone428b.reduce((s, l) => s + wc428b(l), 0) / lastZone428b.length;
      if (firstAvg428b > 0 && lastAvg428b > firstAvg428b * 1.4) {
        issues.push({
          location: 'Action lines — finale density (last 25% of script)',
          rule: 'ACTION_FINALE_BLOAT',
          severity: 'minor',
          description: `Action lines in the last 25% of the script average ${lastAvg428b.toFixed(1)} words, compared to ${firstAvg428b.toFixed(1)} in the first 75% — the prose grows ${Math.round(lastAvg428b / firstAvg428b * 100 - 100)}% denser toward the climax. Rhythm works against the story here: as stakes rise and cutting should quicken, the action description expands. The finale reads in theatrical slow-motion where it should flash.`,
          suggestedFix: 'Trim the late-script action lines to their essential image: one verb, one object, one consequence — nothing more. The most urgent moments in the story deserve the leanest prose. Reserve expansive description for the opening and Act 2 texture; let the finale move.',
        });
      }
    }
  }

  // LONGEST_ACTION_OUTLIER (single-peak isolation, ≥8 action lines): The single longest action
  // line (by word count) is at least 25 words AND at least 4× the average action line word
  // count. One gargantuan line dominates the script's prose — likely a dense exposition dump,
  // an elaborate blocking note, or a stage direction that has sprawled into a paragraph. Unlike
  // the camera-direction and set-dressing checks (which audit domains), this catches any
  // over-long line regardless of content: whatever is in it, no single action line should be
  // 4× the typical one. The outlier is usually a case of a writer putting several beats,
  // multiple description layers, or explanatory commentary all into one block rather than
  // cutting it into discrete, screenable images.
  // Distinctness: LONG_LINE_FLOOD fires when >60% of all lines globally are ≥12 words — a
  // proportion check that stays quiet if only ONE line is catastrophically over-long. This
  // fires only when ONE specific line is 4× average AND ≥25 words — a single-peak outlier
  // check that is complementary and orthogonal to the flood check.
  if (actionLines.length >= 8) {
    const wcs428c = actionLines.map(l => l.text.split(/\s+/).filter(Boolean).length);
    const avgWc428c = wcs428c.reduce((s, w) => s + w, 0) / wcs428c.length;
    const maxWc428c = Math.max(...wcs428c);
    if (maxWc428c >= 25 && avgWc428c > 0 && maxWc428c >= avgWc428c * 4) {
      const peakIdx428c = wcs428c.indexOf(maxWc428c);
      issues.push({
        location: `Action line ${actionLines[peakIdx428c].lineNum} (${maxWc428c} words)`,
        rule: 'LONGEST_ACTION_OUTLIER',
        severity: 'minor',
        description: `The longest action line in the script runs ${maxWc428c} words — ${(maxWc428c / avgWc428c).toFixed(1)}× the average of ${avgWc428c.toFixed(1)} words per line. One action line has sprawled into a paragraph while the rest of the script is written in compact beats. This outlier is typically a case of multiple images, blocking notes, and commentary all collapsed into one block rather than cut into discrete screenable moments.`,
        suggestedFix: 'Break this line into three or four shorter beats, each on its own line with a blank between: identify the distinct images inside it (the object, the action, the consequence) and render each as its own action line. A 25+ word action line is almost never a single screenable moment — it is at least two, and cutting it gives each image the space to land.',
      });
    }
  }

  // ACTION_SHORTLONG_SEGREGATED (co-occurrence/decoupling, ≥10 action lines, ≥2 short ≤4w, ≥2 long ≥12w):
  // Short action lines (≤4 words) and long action lines (≥12 words) exist in the script but never
  // appear within the same 5-line consecutive window — the two length extremes are spatially
  // segregated into separate zones rather than interleaving for rhythmic contrast. Effective screenplay
  // prose mixes staccato beats and expansive description within each sequence: each dense image is
  // punctuated by a sharp short beat, and each staccato run is grounded by at least one fuller line.
  // When short and long lines cluster in entirely separate regions, the script reads in monotonous
  // density waves — an extended descriptive zone then a staccato zone — with no local rhythmic texture.
  // Distinctness: LONG_LINE_FLOOD checks a global proportion (>60% lines ≥12 words). ACTION_FINALE_BLOAT
  // compares zone averages across first 75% vs last 25% of lines. LONGEST_ACTION_OUTLIER isolates one
  // extreme peak. This is the first check to test LOCAL CO-OCCURRENCE of short and long extremes in a
  // sliding 5-line window — a granular spatial test distinct from all proportion or zone checks.
  if (actionLines.length >= 10) {
    const shortAL442a = actionLines.filter(l => l.text.split(/\s+/).filter(Boolean).length <= 4);
    const longAL442a = actionLines.filter(l => l.text.split(/\s+/).filter(Boolean).length >= 12);
    if (shortAL442a.length >= 2 && longAL442a.length >= 2) {
      let hasCoOccurrence442a = false;
      for (let w = 0; w <= actionLines.length - 5; w++) {
        const win442a = actionLines.slice(w, w + 5);
        const hasShort442a = win442a.some(l => l.text.split(/\s+/).filter(Boolean).length <= 4);
        const hasLong442a = win442a.some(l => l.text.split(/\s+/).filter(Boolean).length >= 12);
        if (hasShort442a && hasLong442a) { hasCoOccurrence442a = true; break; }
      }
      if (!hasCoOccurrence442a) {
        issues.push({
          location: `Action lines — short/long segregation (${shortAL442a.length} short ≤4w, ${longAL442a.length} long ≥12w)`,
          rule: 'ACTION_SHORTLONG_SEGREGATED',
          severity: 'minor',
          description: `The script has ${shortAL442a.length} short action line(s) (≤4 words) and ${longAL442a.length} long line(s) (≥12 words), but they never appear within 5 consecutive action lines of each other — they are spatially segregated into distinct zones. Effective screenplay rhythm interleaves staccato beats with expansive description so each dense image is followed by a short sharp cut. When the extremes cluster in separate regions, the script alternates between a descriptive zone and a staccato zone with no local rhythmic texture inside either.`,
          suggestedFix: `Break the segregation: after each cluster of long descriptive lines, insert a short sharp action beat (2–3 words: "She stops.", "A beat.", "Gone.") to reset the reader's pace. Follow each staccato run with at least one fuller descriptive line before the next short beat lands.`,
        });
      }
    }
  }

  // ACTION_LONG_RECOVERY_ABSENT (sequence/aftermath, ≥8 action lines, ≥2 qualifying long lines ≥14w):
  // For each long action line (≥14 words) that is not among the last two action lines, check whether
  // either of the next 2 action lines provides a "recovery beat" (≤7 words). Good screenplay rhythm
  // uses the "density peak → recovery beat" pattern: after an expansive description, a short sharp
  // line lets the image land before the next dense block arrives. When no long line is ever followed
  // by a short recovery beat, the prose sustains relentless density peak-to-peak with no rhythmic
  // exhale — the reader has nowhere to breathe between images.
  // Distinctness: LONG_LINE_FLOOD is a global proportion check (>60%). ACTION_FINALE_BLOAT compares
  // zone averages. LONGEST_ACTION_OUTLIER isolates a single peak by word count. This is the FIRST
  // aftermath/sequence check in this pass — it asks what follows a long line rather than how many
  // exist or where they cluster. Orthogonal to all existing analytical modes in use here.
  if (actionLines.length >= 8) {
    const qualifying442b = actionLines.filter(
      (l, idx) => l.text.split(/\s+/).filter(Boolean).length >= 14 && idx < actionLines.length - 2,
    );
    if (qualifying442b.length >= 2) {
      const hasRecovery442b = qualifying442b.some(ql => {
        const qIdx = actionLines.indexOf(ql);
        return (
          (qIdx + 1 < actionLines.length &&
            actionLines[qIdx + 1].text.split(/\s+/).filter(Boolean).length <= 7) ||
          (qIdx + 2 < actionLines.length &&
            actionLines[qIdx + 2].text.split(/\s+/).filter(Boolean).length <= 7)
        );
      });
      if (!hasRecovery442b) {
        issues.push({
          location: `Action lines — long-line recovery absent (${qualifying442b.length} qualifying lines ≥14w, none followed by ≤7-word beat within 2 lines)`,
          rule: 'ACTION_LONG_RECOVERY_ABSENT',
          severity: 'minor',
          description: `${qualifying442b.length} long action line(s) (≥14 words) appear outside the script's final two action lines, but none is followed by a short recovery beat (≤7 words) within the next 2 action lines. Good prose rhythm uses the "density peak → recovery beat" pattern: after an expansive description, a short sharp line lets the image land before the next dense block arrives. Without recovery beats, long action lines pile up with no rhythmic relief — the prose becomes an unbroken wall of description that tires the reader.`,
          suggestedFix: `After each cluster of long action lines, insert a short sharp beat — a 2–5 word line that captures the essential consequence ("He freezes.", "A long silence.", "The door is open."). This punctuation tells the reader where one image ends and the next begins.`,
        });
      }
    }
  }

  // ACTION_WORDCOUNT_FLATLINE (average/aggregate × variance, ≥8 action lines, avg word count >4):
  // The standard deviation of word counts across all action lines is < 2.5 while the average is >4
  // (ruling out sparse scripts where every line is a 1-word interjection). Low standard deviation
  // means every line is nearly the same length — a metronomic uniformity that kills rhythmic interest.
  // The writer unconsciously produces the same-length line regardless of whether a beat calls for a
  // short punch or an expansive image. Screenplay rhythm requires diversity: 2-word staccato beats,
  // 5-word staging notes, 12-word descriptive paragraphs — interleaved to move the reader's eye at
  // varying speeds.
  // Distinctness: Every other length check uses a global proportion threshold (>N% of lines cross X),
  // a count threshold (≥N instances), or a zone-average comparison. Variance is orthogonal: it fires
  // when line lengths are uniformly mediocre — no line too long, no line too short — a monotone band.
  // None of the existing checks can detect a script where 100% of lines are exactly 6 words each.
  if (actionLines.length >= 8) {
    const wcs442c = actionLines.map(l => l.text.split(/\s+/).filter(Boolean).length);
    const avg442c = wcs442c.reduce((s, w) => s + w, 0) / wcs442c.length;
    if (avg442c > 4) {
      const variance442c = wcs442c.reduce((s, w) => s + (w - avg442c) ** 2, 0) / wcs442c.length;
      const stdDev442c = Math.sqrt(variance442c);
      if (stdDev442c < 2.5) {
        issues.push({
          location: `Action lines — word-count flatline (stdDev = ${stdDev442c.toFixed(2)}, avg = ${avg442c.toFixed(1)} words)`,
          rule: 'ACTION_WORDCOUNT_FLATLINE',
          severity: 'minor',
          description: `All ${actionLines.length} action lines have nearly identical word counts: standard deviation is ${stdDev442c.toFixed(2)} around an average of ${avg442c.toFixed(1)} words per line. This metronomic uniformity signals that no conscious rhythmic shaping is occurring — the writer produces the same-length line regardless of whether a beat calls for a short punch or an expansive image. Screenplay rhythm requires diversity: 2-word staccato beats, 5-word staging notes, 12-word descriptive paragraphs — interleaved to move the reader's eye at varying speeds.`,
          suggestedFix: `Deliberately vary action line length to match the dramatic function: short lines (1–4 words) for sharp beats and transitions; medium lines (5–9 words) for staging and reaction; long lines (10–15 words) for setting and atmosphere. Read the script aloud — if every pause feels the same length, the rhythm is wrong.`,
        });
      }
    }
  }

  // ── Wave 456: ACTION_CONSECUTIVE_LONG_RUN, ACTION_OPENING_SHORT_ABSENT, ACTION_SENTENCE_COUNT_PEAK ──

  // ACTION_CONSECUTIVE_LONG_RUN — Run-based × long action lines (n≥8, 5+ consecutive lines ≥9w):
  // Five or more consecutive action lines each containing ≥9 words creates a dense-prose avalanche
  // with no breathing room in a localized stretch. Dense lines demand more reading effort; when five
  // or more stack with no short beat between them, the reader is forced through a wall of description
  // with no rhythmic relief. Good screen prose alternates density — a long image followed by a shorter
  // beat that lets it settle. Run-based mode × long-line threshold.
  // Distinct from LONG_LINE_FLOOD (Wave 400: global proportion >60% of all lines ≥12w — this fires
  // on a local consecutive run at a lower per-line threshold without requiring global dominance),
  // ACTION_LONG_RECOVERY_ABSENT (Wave 442: sequence/aftermath — no single ≥14w line is followed by a
  // ≤7w recovery within 2 lines; this checks a global consecutive-run count, not aftermath per-line),
  // ACTION_FINALE_BLOAT (Wave 428: zone average word count in final 25%; this checks a local run, not
  // a zone average), and LONGEST_ACTION_OUTLIER (Wave 428: single-peak isolation).
  if (actionLines.length >= 8) {
    let maxLongRun456a = 0, curLongRun456a = 0;
    let maxLongStart456a = -1, curLongStart456a = -1;
    for (let i = 0; i < actionLines.length; i++) {
      if (wordCounts[i] >= 9) {
        if (curLongRun456a === 0) curLongStart456a = actionLines[i].lineNum;
        if (++curLongRun456a > maxLongRun456a) {
          maxLongRun456a = curLongRun456a;
          maxLongStart456a = curLongStart456a;
        }
      } else { curLongRun456a = 0; }
    }
    if (maxLongRun456a >= 5) {
      issues.push({
        location: `Action lines near line ${maxLongStart456a} — consecutive long-line run (${maxLongRun456a} lines ≥9w)`,
        rule: 'ACTION_CONSECUTIVE_LONG_RUN',
        severity: 'minor',
        description: `${maxLongRun456a} consecutive action lines each contain 9 or more words — a dense-prose avalanche with no rhythmic relief between them. Dense action lines demand sustained reading effort; when five or more stack without a short punctuating beat, the reader is forced through a wall of description with nowhere to breathe. Good screenplay prose alternates density: a long image or staging note followed by a shorter beat that lets it settle before the next dense line arrives. The consecutive long-line run also signals that the writer is not consciously shaping rhythm in this passage — lines are being generated at uniform density rather than sculpted for pace.`,
        suggestedFix: `Insert a short action beat (1–5 words) somewhere within the run of ${maxLongRun456a} long lines near line ${maxLongStart456a}: a reaction, a pause, a single image in sharp focus. The short line does not have to carry much information — "A beat." or "She stops." is enough — but it breaks the density and gives the reader's eye a place to exhale before the next dense line arrives.`,
      });
    }
  }

  // ACTION_OPENING_SHORT_ABSENT — Zone presence/absence × opening zone × short lines (n≥10, first
  // quarter contains no line ≤4w while short lines exist later). The first 25% of action lines set
  // the rhythmic palette the reader expects for the script. If the opening zone never samples the
  // staccato register (no line ≤4 words) while short lines appear later, the script withholds its
  // sharpest rhythmic tool from the opening pages — the reader forms the impression of a uniformly
  // dense prose style in the establishing pages and is not primed to expect rhythmic variety.
  // Distinct from MONOTONOUS_RHYTHM (Wave 137: global word-count uniformity <20% variation across
  // ALL lines — this fires when the OPENING ZONE SPECIFICALLY lacks short lines even if the global
  // script has them), ACTION_FINALE_BLOAT (Wave 428: zone-average comparison between finale and
  // earlier lines; this is a zone presence/absence check, not an average comparison), and
  // ACTION_WORDCOUNT_FLATLINE (Wave 442: global variance across ALL lines — this targets the opening
  // zone only). This fills the opening-zone cell alongside the finale cell (ACTION_FINALE_BLOAT).
  if (actionLines.length >= 10) {
    const openingEnd456b = Math.max(2, Math.floor(actionLines.length / 4));
    const openingLines456b = wordCounts.slice(0, openingEnd456b);
    const laterLines456b = wordCounts.slice(openingEnd456b);
    const hasShortInOpening456b = openingLines456b.some(w => w <= 4);
    const hasShortLater456b = laterLines456b.some(w => w <= 4);
    if (!hasShortInOpening456b && hasShortLater456b) {
      issues.push({
        location: `Action lines 1–${openingEnd456b} (opening 25%) — staccato register absent`,
        rule: 'ACTION_OPENING_SHORT_ABSENT',
        severity: 'minor',
        description: `The first ${openingEnd456b} action lines (opening 25% of the script) contain no short line (≤4 words), while short staccato beats appear later in the script. The opening pages set the rhythmic expectations the reader brings to the rest of the script: if every opening action line is medium-to-long, the reader forms the impression of a uniformly dense prose voice and is not primed to expect rhythmic variation. Short beats early in the script — a reaction, a pause, a single-image line — introduce the staccato register immediately and signal to the reader that the prose will vary its tempo.`,
        suggestedFix: `Add at least one short action line (1–4 words) in the first ${openingEnd456b} action lines of the script: a character reaction, a pause beat, or a single sharp image. The short line does not need to carry dramatic weight — "A silence." or "He freezes." is enough — but its presence early signals rhythmic range and prepares the reader's eye for variety.`,
      });
    }
  }

  // ACTION_SENTENCE_COUNT_PEAK — Single-peak isolation × sentence count (n≥8, peak ≥5 sentences
  // AND ≥3× script-average sentences-per-action-line). The single action line with the highest
  // sentence count packs 5+ sentences (multiple beats) while the average action line has far fewer.
  // Packing five beats into one action line violates the cardinal rule that each screenplay beat
  // deserves its own visual unit: the reader's eye cannot separate the consequences when five things
  // happen in a single un-broken visual block. The single-peak nature identifies one pathological
  // outlier rather than a global proportion problem.
  // Distinct from SINGLE_SENTENCE_FLOOD (Wave 277: all 12+ action lines have exactly 1 sentence —
  // the opposite extreme; this fires when ONE line has too MANY sentences), LONGEST_ACTION_OUTLIER
  // (Wave 428: single peak × word count, not sentence count — the existing peak-isolation check uses
  // a different metric), and MONOTONOUS_RHYTHM (global proportion, not peak isolation).
  if (actionLines.length >= 8) {
    const sentCounts456c = actionLines.map(l => countSentences(l.text));
    const avgSentCount456c = sentCounts456c.reduce((s, v) => s + v, 0) / sentCounts456c.length;
    const maxSent456c = Math.max(...sentCounts456c);
    const maxSentIdx456c = sentCounts456c.indexOf(maxSent456c);
    if (maxSent456c >= 5 && avgSentCount456c > 0 && maxSent456c >= avgSentCount456c * 3) {
      issues.push({
        location: `Action line at line ${actionLines[maxSentIdx456c].lineNum} — sentence-count outlier (${maxSent456c} sentences)`,
        rule: 'ACTION_SENTENCE_COUNT_PEAK',
        severity: 'minor',
        description: `One action line contains ${maxSent456c} sentences while the script average is ${avgSentCount456c.toFixed(1)} sentences per action line — a ${(maxSent456c / avgSentCount456c).toFixed(1)}× outlier. Packing ${maxSent456c} separate beats into a single un-broken action line violates the principle that each screenplay beat deserves its own visual unit: when multiple events are crammed into one block without blank-line separation, the reader's eye cannot cleanly distinguish where one consequence ends and the next begins. The combined weight of five beats in a single line also dilutes each individual moment — nothing lands with the isolation that makes a beat register.`,
        suggestedFix: `Break the ${maxSent456c}-sentence action line at line ${actionLines[maxSentIdx456c].lineNum} into separate lines, each separated by a blank line: each sentence becomes its own action block. Even a two-word beat ("He stops.") reads with more impact as its own visual unit than as one clause in a five-sentence block. The blank line between beats is how a screenplay tells the reader to pause.`,
      });
    }
  }

  // ── Wave 470: ACTION_MIDDLE_LONG_ABSENT, ACTION_IMPACT_BEAT_UNCAUSED, ACTION_DENSITY_PEAK_EARLY ──

  // ACTION_MIDDLE_LONG_ABSENT — Zone presence/absence × middle zone (n≥12, 0 long ≥12w in the
  // middle 50% while ≥2 long lines exist in the outer zones). The middle zone (action lines
  // 25%–75%) is where Act 2 drama, confrontations, and complex staging live. When every long
  // descriptive line is front-loaded in the opening zone or back-loaded in the finale zone, the
  // mid-script drama reads as a telegraphic beat sheet with no expansive staging — the screenplay
  // thins at its dramatic core. Fills the middle-zone cell in the zone presence/absence matrix
  // alongside ACTION_OPENING_SHORT_ABSENT (opening zone) and ACTION_FINALE_BLOAT (finale zone).
  // Distinct from ACTION_FINALE_BLOAT (Wave 428: compares zone AVERAGES, not per-zone long-line
  // presence), ACTION_OPENING_SHORT_ABSENT (Wave 456: opening zone × short-line presence; this is
  // middle zone × long-line presence, different zone and different threshold), LONG_LINE_FLOOD
  // (global proportion, no zone sensitivity whatsoever).
  if (actionLines.length >= 12) {
    const openEnd470a = Math.floor(actionLines.length * 0.25);
    const midEnd470a = Math.floor(actionLines.length * 0.75);
    const outerLong470a = [
      ...actionLines.slice(0, openEnd470a),
      ...actionLines.slice(midEnd470a),
    ].filter(l => countWords(l.text) >= 12).length;
    const midLong470a = actionLines.slice(openEnd470a, midEnd470a).filter(
      l => countWords(l.text) >= 12,
    ).length;
    if (midLong470a === 0 && outerLong470a >= 2) {
      issues.push({
        location: `Action lines ${openEnd470a + 1}–${midEnd470a} of ${actionLines.length} (middle 50%)`,
        rule: 'ACTION_MIDDLE_LONG_ABSENT',
        severity: 'minor',
        description: `The middle 50% of action lines (positions ${openEnd470a + 1}–${midEnd470a} of ${actionLines.length}) contains no long line (≥12 words), while ${outerLong470a} long lines appear in the opening or finale zones. The mid-script zone — where Act 2 drama, confrontations, and revelations occur — has been rendered entirely in short, compressed beats. Without a single expansive descriptive line in the middle, the drama's core reads as a telegraphic beat sheet rather than fully realised scene staging.`,
        suggestedFix: 'Add at least one full descriptive action line (≥10 words) in the middle section: where are the characters, how does the space change around them, what does the environment reveal? A long line in the middle zone does not slow the script — it anchors the drama at its most complex point.',
      });
    }
  }

  // ACTION_IMPACT_BEAT_UNCAUSED — Backward-cause × short-line context (n≥8, ≥2 qualifying short
  // lines ≤4w starting from index 2, none preceded by a long ≥9w line within 2 action lines
  // before it). A short impact beat derives its punch from the density it crystallises: "She
  // stops." lands hard after a long staging line that built the moment, but floats when it follows
  // equally short beats. When ALL of the script's staccato moments arrive context-free — no prior
  // dense line within 2 action lines — they appear in a vacuum rather than resolving a specific
  // image or situation. The cause (density buildup) is always absent.
  // Distinct from ACTION_LONG_RECOVERY_ABSENT (Wave 442: sequence/aftermath — asks what comes
  // AFTER a long line; this reverses the direction, asking what comes BEFORE a short line — the
  // first backward-cause check in this pass, analytically opposite in direction of inquiry),
  // SHORT_LINE_POVERTY (Wave 249: fires when zero short lines exist; this fires when short lines
  // exist but ALL lack a dense antecedent), STACCATO_FRAGMENTATION (run count, not causal context).
  if (actionLines.length >= 8) {
    const qualifyingShortIdxs470b: number[] = [];
    for (let i = 2; i < actionLines.length; i++) {
      if (countWords(actionLines[i].text) <= 4) qualifyingShortIdxs470b.push(i);
    }
    if (qualifyingShortIdxs470b.length >= 2) {
      const anyBuiltUp470b = qualifyingShortIdxs470b.some(idx => {
        const prev1Wc = idx >= 1 ? countWords(actionLines[idx - 1].text) : 0;
        const prev2Wc = idx >= 2 ? countWords(actionLines[idx - 2].text) : 0;
        return prev1Wc >= 9 || prev2Wc >= 9;
      });
      if (!anyBuiltUp470b) {
        issues.push({
          location: 'Action lines throughout — short impact beats lack density buildup',
          rule: 'ACTION_IMPACT_BEAT_UNCAUSED',
          severity: 'minor',
          description: `${qualifyingShortIdxs470b.length} short action line(s) (≤4 words) appear after the script's opening, but none is preceded by a longer line (≥9 words) within the previous 2 action lines. Short impact beats draw their punch from the density they punctuate — "She stops." hits hard after a staging line that built the moment, but floats when it follows equally short beats. All the script's staccato moments arrive context-free: they crystallise nothing because there is no prior density for them to resolve.`,
          suggestedFix: 'Before each short impact beat, ensure at least one of the preceding 2 action lines is a fuller line (≥9 words) that builds the staging or situation being crystallised. "He lifts the gun, checking the chamber, his hands completely steady." followed by "He fires." is a beat; two consecutive short lines are just a list.',
        });
      }
    }
  }

  // ACTION_DENSITY_PEAK_EARLY — Distribution/timing × peak position (n≥10, the single longest
  // action line ≥15w sits in the first 25% of action lines). In a drama building toward a climax,
  // the most elaborate prose beat should arrive at or after the midpoint — where the staging
  // complexity and dramatic weight are greatest. When the densest action line is front-loaded in
  // the setup, the opening pages earn the most elaborate description while the confrontation and
  // climax are written in lighter, shorter beats. The prose density curve inverts the story's
  // tension curve.
  // Distinct from LONGEST_ACTION_OUTLIER (Wave 428: fires when max word count ≥25w AND ≥4×
  // average — a ratio test, position-agnostic; this fires on POSITION in the first 25%,
  // regardless of ratio, for any ≥15w peak), ACTION_FINALE_BLOAT (Wave 428: compares zone
  // AVERAGES between first 75% and last 25%; this tracks a single-line peak's POSITION, not a
  // zone average), ACTION_OPENING_SHORT_ABSENT (Wave 456: opening zone × short-line absence; this
  // is opening zone × long-line PEAK presence — complementary and distinct threshold/direction).
  if (actionLines.length >= 10) {
    const maxWc470c = Math.max(...wordCounts);
    const maxIdx470c = wordCounts.indexOf(maxWc470c);
    const openingEnd470c = Math.floor(actionLines.length * 0.25);
    if (maxWc470c >= 15 && maxIdx470c < openingEnd470c) {
      issues.push({
        location: `Action line ${actionLines[maxIdx470c].lineNum} (${maxWc470c} words — densest in script, in opening 25%)`,
        rule: 'ACTION_DENSITY_PEAK_EARLY',
        severity: 'minor',
        description: `The longest action line (${maxWc470c} words) is action line ${maxIdx470c + 1} of ${actionLines.length} — in the first 25% of action lines. The script's most expansive prose moment is front-loaded in the setup, while the confrontation and climax are written in shorter, lighter beats. The prose density curve inverts the story's tension arc: the opening earns the most elaborate staging while the scenes that cost the characters the most are rendered in compressed, minimal description.`,
        suggestedFix: 'Trim the dense early line to its essential staging beats, and expand at least one mid-script or late-script action line to carry fuller description. The scene that earns the most words should be the one that costs the characters the most — usually not the opening.',
      });
    }
  }

  // ── Wave 484: CONSECUTIVE_SHORT_RUN, ACTION_FINALE_SHORT_ABSENT, ACTION_SENTENCE_AVERAGE_HIGH ──

  // CONSECUTIVE_SHORT_RUN (run-based × short action line channel, ≥8 action lines,
  // maxConsecutiveRun ≥ 5): Five or more consecutive action lines each contain four words or
  // fewer — a sustained staccato burst that loses its impact through sheer repetition. A single
  // short line ("He stops.") has force when it crystallises a long moment; five or more in
  // succession produces a telegraphic stutter. The staccato register relies on contrast: it hits
  // hardest when it follows or precedes density. A run of five or more consecutive short lines
  // suggests the writer has stayed in shorthand long after the image has been delivered, or has
  // broken a single beat into too many micro-fragments instead of constructing the action as a
  // complete unit. Run-based mode × short-line channel. Distinct from CONSECUTIVE_LONG_RUN (Wave
  // 456: ≥9-word lines — same mode, opposite end), ACTION_LINE_WORD_COUNT_FLOOR (Wave 291: ALL
  // action lines ≤5 words — global presence/absence check, not a run), ACTION_IMPACT_BEAT_
  // UNCAUSED (Wave 470: backward-cause on short lines — antecedent context, not run length):
  // this is the run-based mirror of CONSECUTIVE_LONG_RUN on the short-line channel.
  if (actionLines.length >= 8) {
    let maxShortRun484a = 0;
    let curShortRun484a = 0;
    for (const wc of wordCounts) {
      if (wc <= 4) {
        if (++curShortRun484a > maxShortRun484a) maxShortRun484a = curShortRun484a;
      } else {
        curShortRun484a = 0;
      }
    }
    if (maxShortRun484a >= 5) {
      issues.push({
        location: `${maxShortRun484a} consecutive action line(s) of ≤4 words`,
        rule: 'CONSECUTIVE_SHORT_RUN',
        severity: 'minor',
        description: `A run of ${maxShortRun484a} consecutive action lines each contain four words or fewer — a sustained staccato burst that outlasts its impact. A short line hits hardest when it crystallises the density before it; five or more in succession creates a telegraphic stutter rather than a sequence of punches. The very property that makes short beats effective — their economy against surrounding fullness — is cancelled when they accumulate into a run. After three or four short lines in a row, the reader's attention shifts from what each line captures to the mechanical rhythm of the shorthand.`,
        suggestedFix: 'Break the staccato run by expanding at least one of the short lines into a fuller staging beat (8–12 words) that gives the action physical and spatial specificity. The short lines before and after it will then read as the sharp beats they were intended to be, rather than as a list. "He runs. She runs. Door. Stairs. Corner." becomes far more effective as: "He bolts for the door. She cuts around the corner after him, hands flat against the wall as she takes the turn." followed by a single short beat: "Gone."',
      });
    }
  }

  // ACTION_FINALE_SHORT_ABSENT (zone presence/absence × finale zone × short-line channel,
  // ≥10 action lines, ≥2 short ≤4w lines in the first 75%, none in the final 25%): The
  // script's opening and middle use short impact beats, but the finale zone (last 25% of
  // action lines) uses none — the climactic staging is written entirely in longer, fuller
  // lines with no staccato relief. As pace accelerates toward a climax, short impact beats
  // become structurally important: a one-line beat at the moment of decision, a three-word
  // line at the turning point, forces the reader to pause and feel the beat's weight. When
  // the finale zone has zero short lines among its action prose, the climax is written at a
  // uniform prose density rather than using short beats to create the sensation of time slowing
  // at critical moments. Zone presence/absence mode × finale zone × short-line channel. Distinct
  // from ACTION_OPENING_SHORT_ABSENT (Wave 456: opening zone — this is the finale zone mirror),
  // ACTION_MIDDLE_LONG_ABSENT (Wave 470: middle zone × long lines — different zone and channel),
  // ACTION_FINALE_BLOAT (Wave 428: finale avg word count vs first-75% avg — average comparison,
  // not short-line presence/absence).
  if (actionLines.length >= 10) {
    const finaleStart484b = Math.floor(actionLines.length * 0.75);
    const finaleShortCount484b = wordCounts.slice(finaleStart484b).filter(w => w <= 4).length;
    const outerShortCount484b = wordCounts.slice(0, finaleStart484b).filter(w => w <= 4).length;
    if (finaleShortCount484b === 0 && outerShortCount484b >= 2) {
      issues.push({
        location: `Action lines ${finaleStart484b + 1}–${actionLines.length} (final 25%) — no short ≤4-word line`,
        rule: 'ACTION_FINALE_SHORT_ABSENT',
        severity: 'minor',
        description: `The final 25% of action lines (the climactic staging) contains no short line of 4 words or fewer, while ${outerShortCount484b} such lines appear earlier in the script. The staccato register used to create impact in earlier sections disappears precisely when the story needs it most: at the climax, a one-line beat at the moment of decision, a three-word line at the turning point, forces the reader to pause inside the beat rather than pass through it at prose velocity. When the finale is written entirely in longer, fuller lines, the climactic staging feels uniform rather than punctuated — every beat takes the same amount of time to read, regardless of its dramatic weight.`,
        suggestedFix: 'Add at least one short action line (≤4 words) in the finale zone: the single word at the decision point, the two-word beat before the final action, the minimal line that holds the moment. "She pulls the trigger." becomes "She fires." if the preceding two lines have built the moment fully. Short beats in the climax are not shortcuts — they are the most intensive form of staging because they ask the reader to stop and feel rather than read.',
      });
    }
  }

  // ACTION_SENTENCE_AVERAGE_HIGH (average/aggregate × sentence count per action line, ≥8 action
  // lines, avg sentences per line > 3.0): Action lines average more than three sentences each —
  // the prose layer is structured as multi-clause paragraphs rather than shot-by-shot beats.
  // A cinematic action line should typically represent one thing the camera records: one physical
  // action, one visual detail, one spatial element. When the average line packs three or more
  // sentences, each action beat is no longer a camera instruction but a paragraph of connected
  // moves. This collapses the implicit shot grammar into prose narrative: the reader cannot feel
  // where one camera position ends and the next begins, and the director has no clean unit of
  // staging to work with. Average/aggregate mode × sentence count per action line. Distinct from
  // SENTENCE_COUNT_PEAK (Wave 456: the single outlier line with the most sentences — single-peak
  // isolation, not average), SINGLE_SENTENCE_FLOOD (Wave 277: ALL lines have exactly one sentence
  // — the opposite failure), POLYSYNDETON_OVERLOAD (Wave 344: "and" coordinators — different
  // multi-clause signal): this is the first average/aggregate check on sentences-per-line density.
  if (actionLines.length >= 8) {
    const countSentences484c = (text: string): number => {
      const matches = text.match(/[.!?]+/g);
      return matches ? matches.length : 0;
    };
    const totalSentences484c = actionLines.reduce((s, l) => s + Math.max(1, countSentences484c(l.text)), 0);
    const avgSentences484c = totalSentences484c / actionLines.length;
    if (avgSentences484c > 3.0) {
      issues.push({
        location: `Action lines — avg ${avgSentences484c.toFixed(1)} sentences/line across ${actionLines.length} lines`,
        rule: 'ACTION_SENTENCE_AVERAGE_HIGH',
        severity: 'minor',
        description: `Action lines average ${avgSentences484c.toFixed(1)} sentences each across ${actionLines.length} lines — the prose is structured as multi-clause paragraphs rather than shot-by-shot beats. A cinematic action line should typically represent one thing the camera records: one physical action, one visual detail, one spatial movement. When the average line packs three or more sentences, the script's implicit shot grammar collapses into prose narrative: the reader cannot feel where one camera position ends and the next begins, and the director receives paragraphs to block rather than units of staging to assemble.`,
        suggestedFix: 'Break multi-sentence action lines into separate lines, each representing one distinct visual beat: instead of "She opens the door. The room is dark. A shape moves in the corner." write three separate action lines, each one a beat the camera can hold. The white space between them — the blank lines in the script — is where the cuts live. Three separate short lines read faster and cut cleaner than one long line with three sentences inside it.',
      });
    }
  }

  // ── Wave 498: ACTION_OPENING_LONG_ABSENT, ACTION_DENSITY_PEAK_LATE, ACTION_SHORT_MULTICLAUSAL ──

  // ACTION_OPENING_LONG_ABSENT (zone presence/absence × long-line channel × opening 25%,
  // ≥10 action lines, ≥3 long lines ≥12 words in the rest): The first 25% of action lines
  // contains no long line (≥12 words) while at least three long lines exist in the rest of the
  // script. The opening zone never samples the descriptive register — it is written entirely
  // in short or medium beats without any spatial, visual, or atmospheric richness. The opening
  // quarter is where the script establishes its world: the specific textures and details that
  // give the audience a sense of physical reality. When the entire opening is written in
  // telegraphic notation with no long descriptive line, the world is gestured at rather than
  // rendered. Zone presence/absence mode × long-line channel × opening zone. Distinct from
  // ACTION_OPENING_SHORT_ABSENT (Wave 456: opening zone × short channel — this is the same
  // zone on the LONG channel), ACTION_MIDDLE_LONG_ABSENT (Wave 470: middle zone × long channel
  // — same channel, different zone), LONGEST_ACTION_OUTLIER (Wave 428: single-peak isolation,
  // not zone presence), DENSITY_PEAK_EARLY (Wave 470: the peak is IN the opening — the
  // inverse of this check, which fires when the opening is ABSENT of long lines).
  if (actionLines.length >= 10) {
    const openEnd498a = Math.floor(actionLines.length * 0.25);
    const openLongCount498a = wordCounts.slice(0, openEnd498a).filter(w => w >= 12).length;
    const restLongCount498a = wordCounts.slice(openEnd498a).filter(w => w >= 12).length;
    if (openLongCount498a === 0 && restLongCount498a >= 3) {
      issues.push({
        location: `Opening action lines (1–${openEnd498a}) — no long line ≥12 words`,
        rule: 'ACTION_OPENING_LONG_ABSENT',
        severity: 'minor',
        description: `The first 25% of action lines (lines 1–${openEnd498a}) contains no line of 12 words or more — the script's opening is written entirely in short and medium beats — while ${restLongCount498a} long action lines appear later. The opening quarter is where the physical world is established: specific textures, spatial relationships, and atmospheric details that give the audience a sense of real place. When the entire opening is telegraphic notation without any line that constructs an image in full, the world is gestured at rather than built. A reader can absorb shorthand once they feel grounded; without at least one fully rendered line in the opening, they are told where they are without being made to see it.`,
        suggestedFix: `Add at least one action line of 12+ words in the opening quarter (first ${openEnd498a} lines) — a line that renders the space, the light, the texture, or the atmosphere in concrete specific detail. This doesn't need to be a full set-piece description; even one line that names a specific, unexpected visual detail ("The linoleum curls at the corner where a water stain has dried into a dark ring.") grounds the reader more fully than three lines of bare notation.`,
      });
    }
  }

  // ACTION_DENSITY_PEAK_LATE (distribution/timing × word count × finale zone, ≥10 action lines,
  // peak ≥15 words in final 25%, ≥3 long lines ≥12 words in first 75%): The script's single
  // longest action line falls in the final 25% while the first three-quarters use long lines more
  // sparingly. The climax carries the most elaborately written action prose when it should use the
  // most economical — pace accelerates toward the climax, and elaborate prose slows reading speed
  // exactly when the story's rhythm should be sharpening. A script that saves its longest prose
  // description for the final act may be producing it at the wrong moment: what works as rich
  // texture in Act 1 functions as a speed bump in Act 3. Distribution/timing mode × word count ×
  // finale zone × single-peak position. Distinct from DENSITY_PEAK_EARLY (Wave 470: peak in first
  // 25% — this is the late-zone mirror), ACTION_FINALE_BLOAT (Wave 428: finale AVERAGE vs first
  // three-quarters average — comparison of zone means, not single-peak isolation), LONGEST_ACTION_
  // OUTLIER (Wave 428: whether the peak is an outlier ratio from the average — position-agnostic).
  if (actionLines.length >= 10) {
    const peakWC498b = Math.max(...wordCounts);
    const peakPos498b = wordCounts.indexOf(peakWC498b);
    const finaleStart498b = Math.floor(actionLines.length * 0.75);
    const restLongCount498b = wordCounts.slice(0, finaleStart498b).filter(w => w >= 12).length;
    if (peakWC498b >= 15 && peakPos498b >= finaleStart498b && restLongCount498b >= 3) {
      issues.push({
        location: `Action line ${peakPos498b + 1} (in final 25%) — longest at ${peakWC498b} words`,
        rule: 'ACTION_DENSITY_PEAK_LATE',
        severity: 'minor',
        description: `The script's longest action line (action line ${peakPos498b + 1}, ${peakWC498b} words) falls in the final 25% of action prose, while ${restLongCount498b} long lines (≥12 words) appear in the first three-quarters. The most elaborate action description arrives at the climax rather than in the earlier acts. Script pace is supposed to tighten toward the ending: scenes get shorter, action beats more economical, staging more pointed. When the longest, most densely written action line falls in the finale, it works against this rhythm — the prose requires the reader to slow down exactly where the story should be accelerating. The climax deserves the most precise and specific staging, but precision is achieved through selection, not through length.`,
        suggestedFix: `Trim or redistribute the finale's longest action line — break it into shorter separate beats (each one a cut), move its richest descriptive work to an earlier act where pacing can afford elaboration, or distill it to its three or four most specific images and cut the rest. The first act can absorb long descriptive lines as world-building; the climax should work with economy.`,
      });
    }
  }

  // ACTION_SHORT_MULTICLAUSAL (co-occurrence × short word count × sentence-end punctuation,
  // ≥8 action lines, ≥4 lines with ≤5 words AND ≥2 sentence-ending marks): At least four action
  // lines are simultaneously short (≤5 words) and multi-sentence (≥2 sentence-ending punctuation
  // marks) — fragment-stacking that breaks a single dramatic beat into clause splinters. These
  // are lines like "He runs. Falls." or "She sees it. Freezes." — short in word count but packing
  // two distinct actions into the same line, each terminated separately. This form has a specific
  // rhythmic failure: the two-beat fragment is neither the sustained read of a full action line
  // nor the sharp economy of a single-word or single-clause line. It commits to brevity but then
  // doubles up within it, creating the worst of both registers: dense in event, thin in detail.
  // Co-occurrence mode × short word count × sentence-end punctuation count. Distinct from
  // ACTION_QUESTION_INTRUSION (Wave 305: counts "?" in action lines regardless of length),
  // CONSECUTIVE_SHORT_RUN (Wave 484: counts consecutive ≤4w lines regardless of clause structure),
  // SENTENCE_COUNT_PEAK (Wave 456: audits the single outlier line by sentence count — not the
  // count of co-occurrence lines globally). First check combining both length and sentence-density
  // co-occurrence at the action line level.
  if (actionLines.length >= 8) {
    const shortMulticlauseCount498c = actionLines.filter(l => {
      const wc = wordCounts[actionLines.indexOf(l)];
      const sentEnds = (l.text.match(/[.!?]+/g) ?? []).length;
      return wc <= 5 && sentEnds >= 2;
    }).length;
    if (shortMulticlauseCount498c >= 4) {
      issues.push({
        location: `${shortMulticlauseCount498c} action line(s) of ≤5 words with ≥2 sentence-ending marks`,
        rule: 'ACTION_SHORT_MULTICLAUSAL',
        severity: 'minor',
        description: `${shortMulticlauseCount498c} action lines are simultaneously short (≤5 words) and multi-sentence (≥2 sentence-ending marks) — lines like "He runs. Falls." or "She sees it. Freezes." The fragment-stacking form breaks a single dramatic beat into clause splinters that are neither the full statement of a long line nor the clean punch of a one-clause beat. These lines commit to brevity but double up within it: two distinct actions share a short line with no room to give either one spatial or physical specificity. The result is a form that is simultaneously rushed (too compressed) and cluttered (too many separate actions), delivering two beats at the speed of one while also providing the staging of neither.`,
        suggestedFix: 'Separate each fragment-stacked line into two distinct action lines (each one a camera beat) or merge both actions into a single well-constructed clause that gives the movement full physical specificity. "He runs. Falls." becomes either two lines — "He breaks for the door." / "He goes down hard." — or one line: "He sprints for the door and catches his heel on the mat, sprawling." The two-line version cuts faster; the one-line version delivers more staging. Either is preferable to the fragment stack.',
      });
    }
  }

  // ── Wave 512: ACTION_MIDDLE_SHORT_ABSENT, ACTION_WORD_COUNT_DESCENT_RUN, ACTION_CERTAINTY_ADVERB_FLOOD ──

  // ACTION_MIDDLE_SHORT_ABSENT (zone presence/absence × short channel × middle zone, ≥10 action
  // lines, ≥2 short ≤4w lines in the combined outer zones): The middle 50% of action lines contains
  // no short line (≤4 words) while at least two short lines exist in the outer zones combined. The
  // middle zone is uniformly dense and never drops to a staccato beat, leaving the script's
  // longest sustained section without the pacing contrast that a compressed line provides. A short
  // line in the middle of prose signals a gear-change: something happens too quickly for elaboration,
  // a reaction is registered in isolation, a beat lands without commentary. When the middle zone
  // has none of this, it risks feeling metronomically even. Zone presence/absence mode × short-line
  // channel × middle zone. Distinct from OPENING_SHORT_ABSENT (Wave 456: opening zone), FINALE_
  // SHORT_ABSENT (Wave 484: finale zone), ACTION_MIDDLE_LONG_ABSENT (Wave 470: same zone, long channel).
  if (actionLines.length >= 10) {
    const midStart512a = Math.floor(actionLines.length * 0.25);
    const midEnd512a = Math.floor(actionLines.length * 0.75);
    const midShortCount512a = wordCounts.slice(midStart512a, midEnd512a).filter(w => w <= 4).length;
    const outerShortCount512a =
      wordCounts.slice(0, midStart512a).filter(w => w <= 4).length +
      wordCounts.slice(midEnd512a).filter(w => w <= 4).length;
    if (midShortCount512a === 0 && outerShortCount512a >= 2) {
      issues.push({
        location: `Middle action lines (${midStart512a + 1}–${midEnd512a}) — no short line ≤4 words`,
        rule: 'ACTION_MIDDLE_SHORT_ABSENT',
        severity: 'minor',
        description: `The middle 50% of action lines (lines ${midStart512a + 1}–${midEnd512a}) contains no short line of 4 words or fewer, while ${outerShortCount512a} short lines exist in the outer zones — the script's longest sustained section is written without any compressed beat. Short lines serve a pacing function in the middle of prose: they signal a gear-change, register a reaction in isolation, or land a beat without commentary. When the middle zone is uniformly dense, it risks feeling metronomically even — each line demands similar reading time, and the absence of the staccato beat removes the contrast that makes the surrounding longer lines feel deliberate rather than routine.`,
        suggestedFix: `Add at least one short action line (≤4 words) in the middle section (action lines ${midStart512a + 1}–${midEnd512a}) — a one-word reaction, a two-word observation, a three-word beat that interrupts the density. The short line doesn't need to be climactic; it needs to change the reader's rhythm and signal that something just happened in a single beat.`,
      });
    }
  }

  // ACTION_WORD_COUNT_DESCENT_RUN (run-based × word count × strictly decreasing, ≥8 action lines):
  // 5+ consecutive action lines each strictly shorter in word count than the preceding line — a
  // sustained compression that narrows the prose from description to fragment. A descent of five or
  // more is a deliberate structural pattern: the reader anticipates each shorter line before it
  // arrives, and the surprise-and-release that makes compression effective is consumed by the
  // mechanical predictability of a sustained descent. Run-based mode × word count × strictly
  // decreasing sequence. Distinct from CONSECUTIVE_SHORT_RUN (Wave 484: consecutive short ≤4w
  // lines regardless of whether they are decreasing — any short lines qualify, not a descent),
  // ACTION_WORD_COUNT_FLOOR (Wave 291: all action lines ≤5w globally, not a local descent),
  // SCENE_COMPRESSION_SPIRAL in pacing.ts (scene-level length, not action-line word count).
  if (actionLines.length >= 8) {
    let maxDescentRun512b = 1;
    let curDescentRun512b = 1;
    for (let i512b = 1; i512b < wordCounts.length; i512b++) {
      if (wordCounts[i512b] < wordCounts[i512b - 1]) {
        curDescentRun512b++;
        if (curDescentRun512b > maxDescentRun512b) maxDescentRun512b = curDescentRun512b;
      } else {
        curDescentRun512b = 1;
      }
    }
    if (maxDescentRun512b >= 5) {
      issues.push({
        location: `${maxDescentRun512b} consecutive action lines — strictly decreasing word count`,
        rule: 'ACTION_WORD_COUNT_DESCENT_RUN',
        severity: 'minor',
        description: `The script has a run of ${maxDescentRun512b} consecutive action lines where each is strictly shorter in word count than the one before it — a sustained compression that narrows the prose from description down to near-silence over five or more beats. A two- or three-line descent is a controlled technique: the reader feels the beat landing with increasing force as the prose tightens. At ${maxDescentRun512b} lines, the pattern becomes mechanical — the reader anticipates the next shorter line before it arrives, and the predictable rhythm of the descent drains the compression of its kinetic force. The technique works once; repeated five or more times without interruption, it signals a formula rather than a choice.`,
        suggestedFix: `Interrupt the descent at or before the fifth step: either break the sequence with a longer or equal-length line that resets the reader's expectation, or collapse the last three steps of the descent into a single beat. The moment the descent is predictable is the moment it stops serving rhythm — a held note after a falling phrase is often more powerful than the phrase continuing to fall.`,
      });
    }
  }

  // ACTION_CERTAINTY_ADVERB_FLOOD (proportion × certainty/stance adverbs × action lines, ≥8 action
  // lines, >20% contain stance certainty adverbs): More than one in five action lines explicitly
  // tell the reader what to conclude through certainty adverbs (clearly, obviously, certainly,
  // naturally, undeniably, inevitably, predictably, unsurprisingly, plainly, evidently).
  // These words place the narrator as an interpreter rather than a camera — they tell the audience
  // how to read an event instead of presenting the event and letting the audience conclude. Unlike
  // intensifiers (very, really) that amplify adjectives, certainty adverbs assert epistemic stance
  // about what the image means. Proportion mode × certainty/stance adverb register. Distinct from
  // ADVERB_CLUSTERING (Wave 151: all adverbs by density — not the stance category), SUDDENLY_OVERUSE
  // (Wave 319: urgency adverbs — different semantic register), INTENSIFIER_FLOOD (Wave 358: degree
  // modifiers like "very/really/quite" — different semantic category from epistemic stance).
  if (actionLines.length >= 8) {
    const certaintyRe512c = /\b(clearly|obviously|certainly|naturally|undeniably|inevitably|predictably|unsurprisingly|plainly|evidently|manifestly)\b/i;
    const certaintyCount512c = actionLines.filter(l => certaintyRe512c.test(l.text)).length;
    if (certaintyCount512c / actionLines.length > 0.20) {
      issues.push({
        location: `${certaintyCount512c}/${actionLines.length} action line(s) with certainty adverbs`,
        rule: 'ACTION_CERTAINTY_ADVERB_FLOOD',
        severity: 'minor',
        description: `${certaintyCount512c} of ${actionLines.length} action lines (${(certaintyCount512c / actionLines.length * 100).toFixed(0)}%) contain a certainty or stance adverb — "clearly," "obviously," "certainly," "naturally," "inevitably," or similar — placing the narrator inside the prose as an interpreter of the image rather than as a camera recording it. Cinematic action prose is supposed to present events and let the audience draw conclusions; when the prose asserts that something is "clearly" the case or "obviously" significant, it preempts the audience's inference and collapses the interpretive space that makes images powerful. Certainty adverbs also signal authorial anxiety: the writer doesn't fully trust the staging to communicate what it means.`,
        suggestedFix: `Remove or replace each certainty adverb with either more specific staging (show the thing that makes it obvious) or a plain indicative statement that presents the event without asserting how to read it. "She clearly can't believe it" becomes "She stares. Blinks." — the staging creates the certainty the adverb was trying to tell. Every certainty adverb is a prompt to ask: what specific image or action makes this obvious? Stage that instead.`,
      });
    }
  }

  // ── Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD ──

  // ACTION_WORD_COUNT_ASCENT_RUN (run-based × word count × strictly increasing sequence,
  // ≥8 action lines, longest ascending run ≥5): Five or more consecutive action lines where
  // each line is strictly longer in word count than the previous one — a sustained expansion
  // that, like its descent mirror, becomes mechanical when prolonged. A two- or three-line
  // ascent has purpose: prose building toward something, elaboration gathering momentum. At
  // five or more steps the reader anticipates the next longer line before it arrives and the
  // accumulative effect drains the technique of its kinetic force. Run-based mode × word-count
  // channel × strictly increasing direction. Distinct from ACTION_WORD_COUNT_DESCENT_RUN
  // (Wave 512: strictly DECREASING sequence — the opposite direction on the same channel),
  // CONSECUTIVE_LONG_RUN (Wave 456: consecutive lines each ≥9 words regardless of direction
  // — a density threshold check not a directional-sequence check), ACTION_FINALE_BLOAT
  // (Wave 428: finale-zone average vs first-75% average — zone comparison, not a run).
  if (actionLines.length >= 8) {
    let maxAscentRun526a = 0;
    let curAscentRun526a = 1;
    for (let i = 1; i < wordCounts.length; i++) {
      if (wordCounts[i] > wordCounts[i - 1]) {
        curAscentRun526a++;
      } else {
        if (curAscentRun526a > maxAscentRun526a) maxAscentRun526a = curAscentRun526a;
        curAscentRun526a = 1;
      }
    }
    if (curAscentRun526a > maxAscentRun526a) maxAscentRun526a = curAscentRun526a;
    if (maxAscentRun526a >= 5) {
      issues.push({
        location: `${maxAscentRun526a} consecutive action lines — strictly increasing word count`,
        rule: 'ACTION_WORD_COUNT_ASCENT_RUN',
        severity: 'minor',
        description: `The script has a run of ${maxAscentRun526a} consecutive action lines where each is strictly longer in word count than the one before it — a sustained expansion that builds from sparse notation up to dense description over five or more beats. A two- or three-line ascent is a controlled technique: the reader feels the beat building with increasing weight as the prose elaborates. At ${maxAscentRun526a} lines, the pattern becomes mechanical — the reader anticipates the next longer line before it arrives, and the predictable rhythm of the ascent drains the expansion of its kinetic force. The technique works once; repeated five or more times without interruption, it signals a formula rather than a choice.`,
        suggestedFix: `Interrupt the ascent at or before the fifth step: either break the sequence with a shorter or equal-length line that resets the reader's expectation, or collapse the last three steps of the ascent into a single beat. The moment the ascent is predictable is the moment it stops serving rhythm — a short staccato beat after a rising phrase resets the reader and makes the next expansion feel earned rather than inevitable.`,
      });
    }
  }

  // ACTION_FINALE_LONG_ABSENT (zone presence/absence × long-line channel × finale 25%,
  // ≥10 action lines, ≥3 long lines ≥12 words in the first 75%): The final 25% of action
  // lines contains no long line (≥12 words) while at least three long lines exist in the
  // first three-quarters. The finale zone never samples the descriptive register — the
  // climax is written entirely in short or medium beats without any line that constructs a
  // detailed image. A finale with no long action line risks feeling telegraphic at exactly
  // the moment when the script should deliver its most precisely-realized staging. Precision
  // does not require brevity alone: the climax benefits from at least one fully-committed
  // descriptive beat that anchors the spatial and physical reality of the resolution. Zone
  // presence/absence mode × long-line channel × finale zone. Distinct from
  // ACTION_OPENING_LONG_ABSENT (Wave 498: opening 25% — same channel, different zone),
  // ACTION_MIDDLE_LONG_ABSENT (Wave 470: middle 50% — same channel, different zone; this
  // check completes the zone × long-channel grid), ACTION_FINALE_SHORT_ABSENT (Wave 484:
  // finale zone × SHORT channel — same zone, opposite channel), ACTION_FINALE_BLOAT
  // (Wave 428: finale-zone average word count vs first 75% — comparison of zone averages,
  // not zone presence/absence of long lines).
  if (actionLines.length >= 10) {
    const finaleStart526b = Math.floor(actionLines.length * 0.75);
    const finaleLongCount526b = wordCounts.slice(finaleStart526b).filter(w => w >= 12).length;
    const preLongCount526b = wordCounts.slice(0, finaleStart526b).filter(w => w >= 12).length;
    if (finaleLongCount526b === 0 && preLongCount526b >= 3) {
      issues.push({
        location: `Finale action lines (${finaleStart526b + 1}–${actionLines.length}) — no long line ≥12 words`,
        rule: 'ACTION_FINALE_LONG_ABSENT',
        severity: 'minor',
        description: `The final 25% of action lines (lines ${finaleStart526b + 1}–${actionLines.length}) contains no line of 12 words or more — the script's finale is written entirely in short and medium beats — while ${preLongCount526b} long action lines appear in the first three-quarters. The finale is where the script delivers its most specific and physically-realized staging: the space where action lands, the texture of a confrontation, the exact geometry of a resolution. When the entire finale is telegraphic notation with no fully-constructed descriptive line, the climax is gestured at rather than rendered. A short line can deliver a beat with force, but without at least one long line anchoring the physical reality, the finale risks feeling like a summary of events rather than the events themselves.`,
        suggestedFix: `Add at least one action line of 12+ words in the finale (action lines ${finaleStart526b + 1}–${actionLines.length}) — a line that renders the space, the physical action, or the specific detail that makes the climactic moment real rather than merely described. This does not need to be decorative; it needs to commit to the scene's specific reality in the way that only a fully-constructed sentence can.`,
      });
    }
  }

  // ACTION_COMMA_DENSE_FLOOD (proportion × comma count ≥3 × action lines, ≥8 action lines,
  // >30% contain ≥3 commas each): More than three in ten action lines pack at least three
  // commas — list-heavy, breathless writing that fragments action into enumerations rather
  // than presenting it as continuous movement. Each action line with three or more commas
  // is effectively a catalogue: a sequence of items, gestures, or details enumerated
  // rather than staged. A single comma structures a sentence; two commas indicate
  // complexity; at three or more, the line has stopped being a sentence describing an
  // action and has become a shopping list of concurrent observations. When this pattern
  // dominates more than 30% of the action prose, the script imposes an exhausting parsing
  // burden — each line demanding the reader to process a series of coordinated details
  // instead of experiencing a single, specific image. Proportion mode × comma-density
  // signal × action lines. Distinct from COMMA_SPLICE_OVERUSE (Wave 386: two pronoun-
  // subject clauses joined by a comma — a grammatical error pattern targeting clause
  // structure not raw comma count), POLYSYNDETON_OVERLOAD (Wave 344: three or more "and"
  // coordinators — a coordinator-chain pattern, different character than comma enumeration),
  // TRIADIC_LIST_OVERLOAD (Wave 372: specifically "X, Y, and Z" three-item enumerations —
  // targets the Oxford-comma list structure, not comma density per se).
  if (actionLines.length >= 8) {
    const commaDenseCount526c = actionLines.filter(l => (l.text.match(/,/g) ?? []).length >= 3).length;
    if (commaDenseCount526c / actionLines.length > 0.30) {
      issues.push({
        location: `${commaDenseCount526c}/${actionLines.length} action line(s) with ≥3 commas`,
        rule: 'ACTION_COMMA_DENSE_FLOOD',
        severity: 'minor',
        description: `${commaDenseCount526c} of ${actionLines.length} action lines (${(commaDenseCount526c / actionLines.length * 100).toFixed(0)}%) contain three or more commas each — list-heavy, breathless writing that fragments action into catalogued enumerations rather than continuous movement. An action line with three or more commas is effectively a shopping list: a sequence of items, gestures, or details enumerated rather than staged. A single comma structures a sentence; two commas indicate complexity; three or more signal that the line has abandoned forward motion and begun accumulating. When this pattern dominates more than 30% of the action prose, the script imposes an ongoing parsing burden — each line requiring the reader to process a series of coordinated details rather than experience a single, specific image. The effect is exhausting rather than energizing, and the catalogue register is more suited to notes than to dramatic staging.`,
        suggestedFix: `Revise comma-heavy action lines by choosing one or two details and cutting the rest, or by reorganizing a multi-comma enumeration into separate action lines — each one a distinct beat. "He opens the door, steps into the hallway, checks both directions, and freezes" becomes two lines: "He steps into the hallway." / "He freezes." The fewer commas, the cleaner the cut, and the more each action lands with its own weight.`,
      });
    }
  }

  // ACTION_CONSECUTIVE_MEDIUM_RUN (run-based × medium word count 5–11w, ≥8 action lines,
  // ≥1 short ≤4w AND ≥1 long ≥12w existing globally): Six or more consecutive action lines
  // each fall between 5 and 11 words — the story's prose never samples the staccato (≤4w) or
  // the dense (≥12w) register for a sustained stretch, even though both extremes exist elsewhere.
  // A 6+-line medium rut is a rhythmic dead zone: the prose advances with steady pace but no
  // contrast, losing both the percussive impact of a short line and the elaborative weight of a
  // long one. The run signals that the writer has settled into a comfortable middle cadence and
  // forgotten that rhythm requires extremes to define the center.
  // Distinct from: CONSECUTIVE_LONG_RUN (Wave 456: ≥9w threshold — density check, not mid-range),
  // CONSECUTIVE_SHORT_RUN (Wave 484: ≤4w — the opposite density extreme), ACTION_WORD_COUNT_ASCENT/
  // DESCENT_RUN (Wave 512/526: directional sequences — increasing or decreasing, not banded),
  // WORDCOUNT_FLATLINE (Wave 442: SD-based global uniformity, fires when ALL lines are metronomic
  // not just a consecutive stretch).
  if (actionLines.length >= 8) {
    const hasShortsGlobal540a = wordCounts.some(w => w <= 4);
    const hasLongsGlobal540a = wordCounts.some(w => w >= 12);
    if (hasShortsGlobal540a && hasLongsGlobal540a) {
      let maxMedRun540a = 0;
      let curMedRun540a = 0;
      for (const w of wordCounts) {
        if (w >= 5 && w <= 11) {
          curMedRun540a++;
          if (curMedRun540a > maxMedRun540a) maxMedRun540a = curMedRun540a;
        } else {
          curMedRun540a = 0;
        }
      }
      if (maxMedRun540a >= 6) {
        issues.push({
          location: `${maxMedRun540a} consecutive action line(s) in the 5–11 word range`,
          rule: 'ACTION_CONSECUTIVE_MEDIUM_RUN',
          severity: 'minor',
          description: `${maxMedRun540a} consecutive action lines each fall between 5 and 11 words — the script maintains a comfortable mid-range cadence for a sustained stretch without sampling either the staccato register (≤4 words) or the dense descriptive register (≥12 words), even though both extremes appear elsewhere in the script. Rhythm depends on contrast: a short line lands with percussive impact because it interrupts a longer sentence, and a long line carries elaborative weight because it stretches past the surrounding brevity. In a ${maxMedRun540a}-line medium run, every beat arrives with the same pace — steady but undifferentiated — and the cumulative effect is a plateau of prose that reads as moderate rather than dramatic.`,
          suggestedFix: `Break the medium run by introducing at least one short (≤4 words) or long (≥12 words) action line within the ${maxMedRun540a}-line sequence. A single staccato beat mid-run resets the reader's expectation and makes the surrounding medium lines feel deliberate rather than habitual; a single long line anchors the run with a fully-realized image that the brevity around it makes more vivid.`,
        });
      }
    }
  }

  // ACTION_SHORT_EXPANSION_ABSENT (sequence/aftermath × short→long direction, ≥8 action lines,
  // ≥2 short ≤4w and ≥2 long ≥9w): Every short action line (≤4 words) that has at least one
  // action line after it is followed within 2 action lines only by non-long lines — no staccato
  // beat expands into elaboration in its aftermath. A short line is a percussive compression: it
  // delivers a single beat with force and then waits for a follow-through. When no short line is
  // ever followed by a long line that elaborates, expands, or contextualizes what the brief beat
  // just compressed, the staccato register operates as pure punctuation rather than as a setup for
  // the next full image. The script misses the most powerful short-line rhythm: compression →
  // release, the brief beat landing and then opening out into a long elaboration.
  // Distinct from: ACTION_LONG_RECOVERY_ABSENT (Wave 442: long→short direction — the post-long
  // brevity check; this is the opposite direction, checking post-short elaboration), IMPACT_BEAT_
  // UNCAUSED (Wave 470: backward-cause × short — checks that a short beat was PRECEDED by a long;
  // this checks that a short beat is FOLLOWED by a long), CONSECUTIVE_SHORT_RUN (run-based).
  if (actionLines.length >= 8) {
    const shortIdxs540b = wordCounts.reduce((acc, w, i) => { if (w <= 4) acc.push(i); return acc; }, [] as number[]);
    const longIdxSet540b = new Set(wordCounts.reduce((acc, w, i) => { if (w >= 9) acc.push(i); return acc; }, [] as number[]));
    if (shortIdxs540b.length >= 2 && longIdxSet540b.size >= 2) {
      const qualShort540b = shortIdxs540b.filter(i => i < wordCounts.length - 1);
      if (qualShort540b.length >= 2) {
        const allShortNoExpansion540b = qualShort540b.every(i => {
          for (let off = 1; off <= 2; off++) {
            if (i + off < wordCounts.length && longIdxSet540b.has(i + off)) return false;
          }
          return true;
        });
        if (allShortNoExpansion540b) {
          issues.push({
            location: `${qualShort540b.length} short action line(s) ≤4 words — no long ≥9w in any aftermath window`,
            rule: 'ACTION_SHORT_EXPANSION_ABSENT',
            severity: 'minor',
            description: `Every short action line (≤4 words, ${qualShort540b.length} qualifying line(s)) is followed within two action lines only by lines that are also short or medium — no staccato beat expands into a long elaborative line (≥9 words) in its aftermath, despite ${longIdxSet540b.size} long lines existing elsewhere in the script. The compression→release rhythm is the most powerful short-line technique available: a brief beat isolates a single action or sensation, and the long line that follows fills in the space opened by that compression, contextualizing or expanding what the brevity suggested. When no short line is ever followed by an elaboration, the staccato register functions only as punctuation rather than as setup — the audience receives the brief beat but never the release that makes the brevity meaningful.`,
            suggestedFix: `After at least one short action line, write a long action line (≥9 words) within the following two beats — an expansion that elaborates, contextualizes, or extends what the brief beat compressed. "She stops." / followed by / "The hallway stretches ahead of her, longer than it was before, the far door smaller than it should be from here." The long line after the short one earns the compression retrospectively.`,
          });
        }
      }
    }
  }

  // ACTION_WORD_COUNT_MODAL_LOCK (average/aggregate × most-frequent word count, ≥10 action
  // lines, >40% share the exact same word count): More than four in ten action lines share
  // precisely the same word count — a modal spike at a single length that produces a
  // metronomic cadence even stronger than the SD-based uniformity captured by WORDCOUNT_FLATLINE.
  // When the same word count dominates this heavily, every line with that count reads as part of
  // the same metronomic rhythm, and the audience's ear adapts to its beat long before the script
  // ends. Readers stop perceiving individual lines and start tracking an expectation — the next
  // line will be N words — and when that expectation is met more than 40% of the time, the prose
  // loses the quality of surprise that rhythm requires.
  // Distinct from: WORDCOUNT_FLATLINE (Wave 442: SD < 2.5 — measures spread across all lines,
  // fires for broad low-variance distributions that need not spike at any one value; this fires
  // when one specific word count accounts for >40% regardless of the distribution's spread),
  // SINGLE_SENTENCE_FLOOD (Wave 277: sentence structure not word count), CONSECUTIVE runs (require
  // adjacency — this is a global aggregate check regardless of line order).
  if (actionLines.length >= 10) {
    const countFreq540c = new Map<number, number>();
    for (const w of wordCounts) countFreq540c.set(w, (countFreq540c.get(w) ?? 0) + 1);
    let maxFreq540c = 0;
    let modalLen540c = 0;
    for (const [len, freq] of countFreq540c) {
      if (freq > maxFreq540c) { maxFreq540c = freq; modalLen540c = len; }
    }
    if (maxFreq540c / wordCounts.length > 0.40) {
      issues.push({
        location: `${maxFreq540c}/${wordCounts.length} action lines share the ${modalLen540c}-word count`,
        rule: 'ACTION_WORD_COUNT_MODAL_LOCK',
        severity: 'minor',
        description: `${maxFreq540c} of ${wordCounts.length} action lines (${(maxFreq540c / wordCounts.length * 100).toFixed(0)}%) share exactly the same word count of ${modalLen540c} words — a modal spike that produces a metronomic cadence. When more than 40% of action lines carry the same word count, the prose converges on a single beat length that the reader internalizes well before the script ends: each new line arriving at the expected length confirms a rhythm rather than varying it. Screenplay action should surprise the eye with its density changes — short lines compressing impact, long lines expanding space and context — and a modal lock on one word count drains that variability, making the prose feel stamped from a template rather than calibrated to each beat's dramatic weight.`,
        suggestedFix: `Redistribute the ${modalLen540c}-word lines: convert a portion of them to shorter beats (remove a descriptive clause, reduce an action to its essential verb) or longer beats (add the specific spatial or physical detail that makes the moment real). Aim for no word count to account for more than 25% of all action lines — the prose should feel like it is calibrated beat by beat, not measured out in uniform portions.`,
      });
    }
  }

  {
    // ACTION_LONG_BEAT_UNCAUSED — backward-cause × long channel.
    // ≥8 action lines, ≥3 long ≥12w lines at positions i≥2. Every qualifying long line lacks
    // a short ≤4w line in the prior 2 action lines → fire. An elaborate prose beat is the
    // resolution of compression: the short line compresses a moment to its essence, and the
    // long line expands from that essence into context and texture. When no long line is ever
    // preceded by a short in its ramp-up window, elaboration arrives without setup — density
    // appears from nowhere rather than emerging from a preparation of brevity.
    // Distinct from: IMPACT_BEAT_UNCAUSED (Wave 470: backward-cause × short channel — checks
    // that a short beat was preceded by a long; this is the mirror, checking that a long beat
    // is preceded by a short), ACTION_LONG_RECOVERY_ABSENT (Wave 442: long→short aftermath,
    // not antecedent), ACTION_SHORT_EXPANSION_ABSENT (Wave 540: short→long aftermath direction).
    if (actionLines.length >= 8) {
      const qualLongs554a = wordCounts
        .map((w, i) => ({ w, i }))
        .filter(x => x.i >= 2 && x.w >= 12);
      if (qualLongs554a.length >= 3) {
        const allLongNoCause554a = qualLongs554a.every(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            if (i - off >= 0 && wordCounts[i - off] <= 4) return false;
          }
          return true;
        });
        if (allLongNoCause554a) {
          issues.push({
            location: `${qualLongs554a.length} long action line(s) ≥12 words — no short ≤4w predecessor within 2 lines`,
            rule: 'ACTION_LONG_BEAT_UNCAUSED',
            severity: 'minor',
            description: `${qualLongs554a.length} action lines each run to 12 or more words, yet none of them is preceded within 2 lines by a short action line (≤4 words). An elaborate prose beat is the resolution of compression: the short line strips a moment to its barest element — object, action, consequence — and the long line that follows it earns its density by expanding from that compressed starting point into context, texture, and implication. When elaborate prose appears without prior compression, each long line must justify its length from inside itself, without the rhythmic setup that makes density feel earned rather than indulgent. The audience encounters elaboration before brevity has told them what to hold on to.`,
            suggestedFix: `Before at least one long action line (≥12 words), write a short beat (≤4 words) within the prior two lines — a compressed fragment that isolates a single action, object, or sensation. "She stops." / followed one or two lines later by a long line that expands what that stopping meant: the elaboration now arrives as the consequence of the compression rather than appearing from nowhere.`,
          });
        }
      }
    }
  }

  {
    // ACTION_SENTENCE_BURST_RUN — run-based × sentence count ≥2 × consecutive presence.
    // ≥8 action lines, 4+ consecutive lines each containing ≥2 sentence-ending marks → fire.
    // A local run of multi-clause action lines creates a wall of compound prose that loses the
    // shot-grammar of cinematic action: each action line should ideally capture one visual beat,
    // and stacking 4+ multi-sentence lines back-to-back compresses multiple beats per frame
    // without breathing room between images.
    // Distinct from: ACTION_SENTENCE_AVERAGE_HIGH (Wave 484: average/aggregate × avg > 3
    // sentences per line globally — a whole-script aggregate, not a local consecutive run),
    // SENTENCE_COUNT_PEAK (Wave 456: single-peak isolation × one outlier line with ≥5 sentences
    // and ≥3× average — fires on the single worst offender, not a run), POLYSYNDETON_OVERLOAD
    // (Wave 344: coordinator chains not sentence-end punctuation), SINGLE_SENTENCE_FLOOD (Wave
    // 277: the opposite — all lines have exactly 1 sentence globally).
    if (actionLines.length >= 8) {
      const sentCounts554b = actionLines.map(l => countSentences(l.text));
      let maxRun554b = 0;
      let cur554b = 0;
      for (const sc of sentCounts554b) {
        if (sc >= 2) {
          cur554b++;
          if (cur554b > maxRun554b) maxRun554b = cur554b;
        } else {
          cur554b = 0;
        }
      }
      if (maxRun554b >= 4) {
        issues.push({
          location: `${maxRun554b} consecutive action line(s) — each ≥2 sentences`,
          rule: 'ACTION_SENTENCE_BURST_RUN',
          severity: 'minor',
          description: `${maxRun554b} consecutive action lines each contain two or more sentence-ending marks — a sustained wall of multi-clause prose that collapses the shot-grammar of cinematic action. Screenplay action at its most precise operates one image per line: each action beat establishes a single visual fact (what the camera sees) and lets the white space between lines function as the edit. A run of ${maxRun554b} consecutive multi-sentence lines compresses two or more visual beats per action line back-to-back, giving the reader a sustained density with no visual breathing room — the line-breaks lose their function as implicit cuts, and the action reads as prose rather than as a shooting script.`,
          suggestedFix: `Break the multi-clause run by splitting at least one double-sentence action line into two single-sentence lines, each on its own line. "She picks up the gun. She checks the chamber." becomes "She picks up the gun." on its own line, and "She checks the chamber." on the next — two visual beats, two edits, with the white space between them doing rhythmic work. If more than one beat genuinely belongs in one visual moment, keep them together, but ensure the surrounding lines are single-sentence to restore the contrast.`,
        });
      }
    }
  }

  {
    // ACTION_PUNCTUATION_DESERT — underweight/bloat × comma × scarcity.
    // ≥10 action lines with <15% containing any comma → fire. When virtually no action lines
    // use commas, the prose is locked into unmodified subject-verb-object structure: no
    // dependent clauses, no list enumerations, no parenthetical insertions, no mid-sentence
    // pauses. Commas are the primary tool for adding rhythmic complexity within a single
    // sentence; their total absence produces prose that can only deliver simple, unqualified
    // statements, and the cumulative reading experience is syntactically monotone.
    // Distinct from: ACTION_COMMA_DENSE_FLOOD (Wave 526: the opposite — >30% with ≥3 commas
    // per line — fires on comma excess; this fires on comma starvation), COMMA_SPLICE_OVERUSE
    // (Wave 386: checks a specific misuse pattern of commas joining pronoun clauses, not
    // overall comma frequency), all word-count proportion checks which do not audit punctuation.
    if (actionLines.length >= 10) {
      const commaCount554c = actionLines.filter(l => l.text.includes(',')).length;
      if (commaCount554c / actionLines.length < 0.15) {
        issues.push({
          location: `${commaCount554c} of ${actionLines.length} action line(s) contain a comma`,
          rule: 'ACTION_PUNCTUATION_DESERT',
          severity: 'minor',
          description: `Fewer than 15% of action lines contain a comma (${commaCount554c} of ${actionLines.length}) — the script's action prose is almost entirely comma-free. Commas are the primary tool for syntactic complexity within a single action sentence: they introduce dependent clauses ("She hesitates, then moves"), list actions in sequence ("She opens the door, scans the room, steps inside"), and insert parenthetical qualifications that give an action its emotional subtext ("He smiles, just barely"). When virtually no action lines use commas, every sentence must be simple and unmodified — subject, verb, object, full stop. The cumulative reading experience is syntactically monotone: each beat arrives as a single unadorned statement, and the prose is rhythmically restricted even when word count and sentence count are varied.`,
          suggestedFix: `Introduce commas into at least 15% of action lines by adding syntactic complexity where the action allows it: join a main action to a qualifying detail ("She opens the door, her hand shaking"), enumerate two simultaneous observations ("The room is empty, the window open"), or add a mid-sentence pause that gives an action its physical texture ("He stops, listens, then takes the stairs two at a time"). Each well-placed comma adds a rhythmic beat inside the sentence that the surrounding simple lines cannot provide.`,
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'rhythm', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'rhythm',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Rhythm/prosody pass: prose rhythm is varied'
      : `Rhythm/prosody pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
