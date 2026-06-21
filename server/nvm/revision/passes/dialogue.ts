// Wave 135 — Pass 7: Dialogue/Subtext (Level 1 + Level 2)
// Level 1: surface pattern matching — on-the-nose, as-you-know, sycophancy,
//          monologue, trait labeling.
// Level 2: implicit emotion divergence — emotional suppression, power silence,
//          question dodge, denial inversion. Requires cross-referencing memory records.
// Wave 150 additions: talking heads (no physical beats in long dialogue runs),
// over-parenthetical (excessive direction undermining actors), and deadlock
// dialogue (same argument cycling without escalation).
// Wave 255 additions: ellipsis overuse (trailing-off tic), tag-question overuse
// Wave 269 additions: dialogue question cluster (3+ consecutive questions),
// dialogue agreement chain (3+ consecutive capitulations),
// long speech dominance (>50% of lines 15+ words).
// (confirmation-seeking dialogue), and exclamation overuse (everyone shouts).
// Wave 283 additions: future tense flood (>35% of lines in future tense),
// conditional overload in dialogue (>30% lines contain if/unless/might/could),
// opener monotony (single opening word in >30% of substantive lines).
// Wave 297 additions: contraction starvation (formal full-forms with zero
// contractions — stilted speech), apology loop ("sorry" in >20% of lines),
// repeated line (identical substantive line spoken verbatim 3+ times).
// Wave 311 additions: hedge saturation (>30% of lines contain a softener anywhere —
// "just"/"maybe"/"sort of"/"I think"), filler sound overuse (≥3 lines with a vocalized
// hesitation — "um"/"uh"/"er"), one-word-line dominance (>35% of lines are a single word).
// Wave 325 additions: expletive opener overuse (>25% of lines begin with "There's"/"It's"/
// "Here's" dummy subjects), absolute overuse (>30% of lines contain "always"/"everyone"/
// "completely" universals), within-line word echo (≥3 lines triple a word: "No no no").
// Wave 336 additions: question flood (>35% of all lines are questions — interrogation
// without assertion), negative opener flood (>30% of lines open with "No"/"Can't"/"Never"
// — uniform combative tone), mid-sentence caps flood (≥4 lines shout a word via ALL-CAPS).
// Wave 350 additions: you-opener flood (>30% of lines begin with "You" — uniform
// confrontational pitch), thanks overuse (≥3 gratitude lines — politeness filler), self-
// reference / illeism (a character names themselves in >20% of their lines).
// Wave 364 additions: first-person saturation (>40% of lines begin with "I"/"My" —
// self-centred dialogue never engages with the other person), passive construct flood
// (>25% of lines use passive voice — evasive agentless speech), present-perfect flood
// (>25% of lines use present perfect — characters explain the past instead of the now).
// Wave 378 additions: superlative flood (>25% of lines carry a superlative like "best"/
// "worst"/"most" — hyperbolic ranking drains emphasis), anaphora run (≥3 consecutive lines
// open with the same word — unintended chant), verbal-tic flood (>25% of lines carry a
// disclaimer-intensifier like "literally"/"actually"/"honestly" — verbal-tic padding).
// Wave 392 additions: emotion naming (≥3 lines state a feeling outright — "I'm angry"/"I'm
// scared" — show-don't-tell violation in dialogue), amplifier flood (>25% of lines carry an
// amplifier like very/really/totally — padded intensity), time-marker flood (>25% of lines
// carry a temporal reference — dialogue scheduling and recapping instead of confronting now).
// Wave 406 additions: vague-noun flood (>30% of lines lean on indefinite placeholders —
// "thing"/"stuff"/"something"/"someone" — characters gesture vaguely instead of naming
// concretely), reported-speech flood (>20% of lines recount what someone else said —
// "he said"/"she told me"/"they say" — the scene recaps conversations instead of enacting
// them), oath-intensifier flood (>20% of lines lean on a mild oath — "damn"/"hell"/"oh god"
// — emphasis outsourced to swearing rather than to the words themselves).
// Wave 420 additions: interrupt flood (>25% of lines end with "--" — truncated speech
// becomes a verbal tic rather than a dramatic device; distribution/bloat mode), excuse flood
// (>25% of lines carry a rationalization — "because"/"I had to"/"that's why" — characters
// justify past actions rather than engaging the present; valence mode), affirmation flood
// (>25% of lines are pure bare assent — "yes"/"okay"/"absolutely" — dialogue with no
// friction or resistance; underweight mode).
// Wave 434 additions: tension peak silent (the scene with the story's highest suspenseDelta
// contains no dialogue — the most gripped moment passes without a spoken word; single-peak
// isolation × backward-cause mode, first check in this pass to use suspenseDelta for peak
// isolation), climax void (the final 20% of scenes has no dialogue at all while the earlier
// story is verbally active — the resolution plays as silent spectacle; zone presence/absence
// mode × climax zone, first zone-silence check in this pass), hedge front-loaded (hedging
// language concentrates entirely in the first half of dialogue with ≤1 instance in the
// second half — uncertainty vocabulary disappears from escalation and climax; distribution/
// timing mode × hedging lexeme, distinct from HEDGE_SATURATION which is a rate check).
// Wave 448 additions: curiosity peak silent (the scene with the story's highest curiosityDelta
// contains no dialogue — the moment of maximum audience wonder passes without any character
// speaking; single-peak isolation × curiosity channel, the curiosity-channel parallel of
// DIALOGUE_TENSION_PEAK_SILENT), question back-loaded (questions concentrate in the second
// half of dialogue at >2× the first-half rate — characters retreat into interrogation
// precisely when dramatic stakes should force declaration; distribution/timing × question-
// mark channel, the first distribution check on question density across the story arc, distinct
// from QUESTION_FLOOD's global rate and DIALOGUE_HEDGE_FRONT_LOADED's hedge channel), revelation
// scene void (every revelation scene contains no dialogue — every disclosure happens without any
// character speaking in the moment of discovery; co-occurrence/decoupling × revelation × dialogue
// presence, distinct from DIALOGUE_TENSION_PEAK_SILENT which is single-peak and from
// REVELATION_RELATIONSHIP_VOID in causality.ts which checks the relationship channel).
// Wave 462 additions: dramatic-turn scene void (every dramatic-turn scene contains no dialogue —
// the story's pivots happen in silence; co-occurrence/decoupling × dramatic turn × dialogue
// presence, the turn-channel parallel of DIALOGUE_REVELATION_SCENE_VOID), negation flood (>30%
// of lines carry a negation — "no"/"not"/"never"/"can't"/"nothing" — dialogue is dominated by
// refusal and denial; valence/bloat mode × negation lexeme, the opposite-valence counterpart of
// DIALOGUE_AFFIRMATION_FLOOD which catches bare assent), opening silent (the first 20% of scenes
// contains no dialogue while the rest is verbally active — the story opens as pure silent
// spectacle; zone presence/absence × opening zone, the opening-zone parallel of DIALOGUE_CLIMAX_
// VOID which audits the final 20%).
// Wave 476 additions: clock scene void (co-occurrence/decoupling × clock × dialogue — every
// clockRaised scene has no dialogue; time pressure is established in pure silence without any
// character naming or negotiating the deadline; the clock-channel completion of the event-type
// co-occurrence set alongside revelation and dramatic-turn voids), positive scene void
// (co-occurrence/decoupling × positive emotional × dialogue — every positively charged scene
// has no dialogue; victories and joys are rendered without a voice; co-occurrence × emotional
// valence rather than event-type, the first emotional-register co-occurrence check in this pass),
// dialogue dense aftermath silent (sequence/aftermath × dialogue density — every scene with ≥3
// dialogue lines is immediately followed by a scene with zero dialogue; verbal density consistently
// triggers a cut to silence rather than escalation; the first sequence/aftermath check in this
// pass, distinct from the zone-silence and single-peak checks).
// Wave 490 additions: dialogue verbal peak uncaused (backward-cause × dialogue density peak —
// n≥8, ≥5 scenes with dialogue; the scene with the highest per-scene dialogue line count at
// records pos≥2 has no structural driver in the 2 prior records; first backward-cause check
// in this pass, distinct from DIALOGUE_TENSION_PEAK_SILENT which fires on absence AT the peak
// not backward-cause BEFORE it), dialogue negative scene void (co-occurrence × negative emotional
// shift × dialogue absence — all negative-emotion scenes have no dialogue; the negative-valence
// complement of DIALOGUE_POSITIVE_SCENE_VOID, completing the emotional-register co-occurrence pair),
// dialogue scene temporal cluster (distribution/timing × dialogue-presence × thirds — n≥9, ≥4
// scenes with any dialogue, >75% in one structural third; distinct from CLIMAX_VOID and OPENING_
// SILENT which fire on ZERO dialogue in a zone, and from HEDGE_FRONT_LOADED and QUESTION_BACK_
// LOADED which track specific dialogue CONTENT not scene-level presence).
// Wave 504 additions: dialogue silence run (run-based × dialogue absence × consecutive scene-level
// silence — n≥8, ≥4 scenes with dialogue, longest consecutive zero-dialogue scene run ≥ 3; distinct
// from OPENING_SILENT and CLIMAX_VOID which check ZONE absence in a fixed 20% window, from SCENE_
// TEMPORAL_CLUSTER which checks overconcentration across thirds, and from DENSE_AFTERMATH_SILENT
// which checks aftermath of a single dense scene rather than sustained multi-scene silence), dialogue
// density front heavy (average/aggregate × dialogue density × first-vs-second-half — n≥8, ≥5 scenes
// with dialogue, avg lines/scene in first half ≥ 1.0 AND ≥ 2× the second-half average; verbal
// activity front-loads and the story goes quieter as stakes rise; distinct from SCENE_TEMPORAL_
// CLUSTER which measures thirds-level presence not density ratio, from all flood/rate checks which
// measure global pass-level rates, and from HEDGE_FRONT_LOADED which measures a specific content
// pattern not raw line density), payoff scene dialogue absent (co-occurrence/decoupling × payoff
// event × dialogue absence — n≥8, ≥2 payoff scenes, ≥3 scenes with dialogue, all payoff scenes
// have zero dialogue lines; thread resolutions are rendered in silence; distinct from REVELATION_
// SCENE_VOID, DRAMATIC_TURN_SCENE_VOID, CLOCK_SCENE_VOID which audit different event types, and
// from POSITIVE_SCENE_VOID / NEGATIVE_SCENE_VOID which audit emotional register not event type).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract dialogue lines from fountain text with speaker attribution */
function extractDialogue(fountain: string): Array<{ speaker: string; line: string; lineNum: number }> {
  const lines = fountain.split('\n');
  const dialogue: Array<{ speaker: string; line: string; lineNum: number }> = [];
  let currentSpeaker = '';
  let isDialogue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Character cue: ALL CAPS, not a slugline/transition
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(line) && !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/.test(line)) {
      currentSpeaker = line.split('(')[0].trim();
      isDialogue = true;
    } else if (isDialogue && line && !line.startsWith('(') && currentSpeaker) {
      // Parenthetical wraps in parens — skip
      if (!line.startsWith('(')) {
        dialogue.push({ speaker: currentSpeaker, line, lineNum: i + 1 });
      }
    } else if (!line) {
      isDialogue = false;
    }
  }
  return dialogue;
}

/** Detect on-the-nose emotion statements — requires explicit emotion word after "I feel/am" */
const ON_THE_NOSE_RE = /\b(I (feel|am) (so |very )?(angry|sad|happy|scared|afraid|excited|devastated|thrilled|heartbroken|furious|terrified|depressed|anxious|nervous|proud|ashamed|guilty|jealous|hopeless|miserable)|I'm (so |very )?(angry|sad|happy|scared|afraid|excited|devastated|thrilled|heartbroken|furious|terrified|depressed|anxious|nervous|proud|ashamed|guilty|jealous|hopeless|miserable))\b/i;

/** Detect explicit character trait labeling instead of showing */
const TRAIT_LABELING_RE = /\b(you are|he is|she is|they are|you're|he's|she's|they're)\s+(so |very |such a |a )?(brave|smart|stupid|coward|liar|hero|weak|strong|fool|genius|monster|saint|evil|kind|cruel|honest|dishonest|reckless|ruthless|manipulative|selfish|selfless)\b/i;

/** Detect pure exposition delivery ("As you know, Bob...") */
const AS_YOU_KNOW_RE = /\b(as you know|you already know|as we discussed|as I told you|you remember that|let me explain|the reason (is|why))\b/i;

/** Detect question-answer agreement (character agrees without pushback) */
const AGREEMENT_RE = /^(yes|right|exactly|absolutely|of course|agreed|sure|correct|definitely|totally|indeed)[.,!]?$/i;

// ── Level 2 — Subtext analysis primitives ────────────────────────────────

/** Positive-suppression vocabulary — characters protesting their own contentment */
const POSITIVE_SUPPRESSION_RE = /\b(fine|okay|alright|great|good|wonderful|perfect|don'?t worry|everything('s| is) (fine|okay|alright|good)|i'?m okay|we'?ll be okay|it'?s going to be|no problem|nothing wrong)\b/i;

/** Strong-negative phrases that initiate a denial cycle */
const STRONG_NEGATIVE_RE = /\b(i can'?t believe|i'?m devastated|it'?s over|she'?s gone|he'?s dead|everything'?s (wrong|ruined)|i'?ve lost|can'?t do this|don'?t know (how|if|what)|i give up|why (did|would|should)|nothing (matters|works))\b/i;

/** Forced positive immediately following a strong negative — the denial inversion */
const DENIAL_POSITIVE_RE = /\b(but (everything|it'?ll|it will)|i'?m okay|we'?ll be (fine|okay|alright)|it'?s going to be (okay|alright|fine)|things will|i'?ll be (fine|okay|alright))\b/i;

const STOPWORDS_Q = new Set([
  'the','a','an','and','but','or','so','yet','for','nor','in','on','at','to','of',
  'by','up','out','if','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might','must',
  'shall','can','this','that','these','those','it','its','you','your','my','we',
  'our','they','their','he','his','she','her','me','him','us','who','what','when',
  'where','why','how','which','about','with','just','even','really','very','quite',
]);

/** Extract the salient content words from a question line */
function extractQuestionSubjects(question: string): string[] {
  return question
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS_Q.has(w.toLowerCase()))
    .map(w => w.toLowerCase())
    .slice(0, 5);
}

/** Extract the salient content words from any dialogue line (stopwords + short words
 *  removed). Shared by the Wave 215 conversational-dynamics checks to measure turn-to-turn
 *  responsiveness and overall lexical diversity. */
function dialogueContentWords(line: string): string[] {
  return line
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS_Q.has(w.toLowerCase()))
    .map(w => w.toLowerCase());
}

/** Map each fountain line number (0-based) to a 0-based scene index via sluglines */
function buildLineToSceneMap(fountain: string): number[] {
  const lines = fountain.split('\n');
  const map = new Array<number>(lines.length).fill(0);
  let sceneIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(lines[i].trim())) sceneIdx++;
    map[i] = Math.max(0, sceneIdx);
  }
  return map;
}

export async function dialoguePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const dialogue = extractDialogue(fountain);

  // ── On-the-nose emotion statements ───────────────────────────────────────
  for (const d of dialogue) {
    if (ON_THE_NOSE_RE.test(d.line)) {
      issues.push({
        location: `Line ${d.lineNum} (${d.speaker})`,
        rule: 'ON_THE_NOSE',
        description: `${d.speaker} states their emotion directly: "${d.line.slice(0, 60)}${d.line.length > 60 ? '...' : ''}"`,
        severity: 'major',
        suggestedFix: 'Replace with a physical action or indirect remark that implies the emotion',
      });
    }
  }

  // ── As-you-know exposition ────────────────────────────────────────────────
  for (const d of dialogue) {
    if (AS_YOU_KNOW_RE.test(d.line)) {
      issues.push({
        location: `Line ${d.lineNum} (${d.speaker})`,
        rule: 'AS_YOU_KNOW_BOB',
        description: `${d.speaker} delivers as-you-know exposition: "${d.line.slice(0, 60)}${d.line.length > 60 ? '...' : ''}"`,
        severity: 'major',
        suggestedFix: 'Deliver the information through conflict or discovery rather than direct statement',
      });
    }
  }

  // ── Consecutive agreements (sycophantic echo) ────────────────────────────
  for (let i = 1; i < dialogue.length; i++) {
    if (AGREEMENT_RE.test(dialogue[i].line) && dialogue[i].speaker !== dialogue[i - 1].speaker) {
      issues.push({
        location: `Line ${dialogue[i].lineNum} (${dialogue[i].speaker})`,
        rule: 'SYCOPHANTIC_AGREEMENT',
        description: `${dialogue[i].speaker} simply agrees with ${dialogue[i - 1].speaker} — no conflict or subtext`,
        severity: 'minor',
        suggestedFix: 'Give the agreeing character a qualification, hesitation, or counter-desire',
      });
    }
  }

  // ── Long monologue (>6 lines without interruption) ───────────────────────
  let consecutiveSpeaker = '';
  let consecutiveCount = 0;
  for (const d of dialogue) {
    if (d.speaker === consecutiveSpeaker) {
      consecutiveCount++;
      if (consecutiveCount === 6) {
        issues.push({
          location: `Around line ${d.lineNum} (${d.speaker})`,
          rule: 'UNINTERRUPTED_MONOLOGUE',
          description: `${d.speaker} speaks 6+ consecutive dialogue lines with no interruption — monologue dilutes tension`,
          severity: 'minor',
          suggestedFix: 'Break the monologue with a reaction, interruption, or physical beat',
        });
        consecutiveCount = 0; // reset to avoid repeat flags
      }
    } else {
      consecutiveSpeaker = d.speaker;
      consecutiveCount = 1;
    }
  }

  // ── Trait labeling (show don't tell) ──────────────────────────────────────
  for (const d of dialogue) {
    if (TRAIT_LABELING_RE.test(d.line)) {
      issues.push({
        location: `Line ${d.lineNum} (${d.speaker})`,
        rule: 'TRAIT_LABELING',
        description: `${d.speaker} explicitly labels a character trait: "${d.line.slice(0, 60)}${d.line.length > 60 ? '...' : ''}"`,
        severity: 'minor',
        suggestedFix: 'Show the trait through a specific action or choice rather than naming it directly',
      });
    }
  }

  // ── No dialogue at all ────────────────────────────────────────────────────
  if (dialogue.length === 0 && fountain.split('\n').length > 20) {
    issues.push({
      location: 'Entire screenplay',
      rule: 'NO_DIALOGUE',
      description: 'Screenplay contains no dialogue — subtext cannot exist without text',
      severity: 'minor',
      suggestedFix: 'Add at least one dialogue exchange to externalize character intention',
    });
  }

  // ── Level 2: Implicit subtext divergence (requires memory records) ────────
  if (records.length > 0 && dialogue.length > 0) {
    const lineToScene = buildLineToSceneMap(fountain);
    const recordByScene = new Map(records.map(r => [r.sceneIdx, r]));

    // Group dialogue lines by their scene index
    const sceneDialogue = new Map<number, typeof dialogue>();
    for (const d of dialogue) {
      const si = lineToScene[d.lineNum - 1] ?? 0;
      if (!sceneDialogue.has(si)) sceneDialogue.set(si, []);
      sceneDialogue.get(si)!.push(d);
    }

    for (const [sceneIdx, sceneDiag] of sceneDialogue) {
      const rec = recordByScene.get(sceneIdx) ?? records[Math.min(sceneIdx, records.length - 1)];

      // EMOTIONAL_SUPPRESSION: negative-shift scene + speaker uses ≥60% positive-suppression vocab
      if (rec.emotionalShift === 'negative') {
        const speakerLines = new Map<string, string[]>();
        for (const d of sceneDiag) {
          if (!speakerLines.has(d.speaker)) speakerLines.set(d.speaker, []);
          speakerLines.get(d.speaker)!.push(d.line);
        }
        for (const [speaker, lines] of speakerLines) {
          if (lines.length >= 3) {
            const positiveCount = lines.filter(l => POSITIVE_SUPPRESSION_RE.test(l)).length;
            if (positiveCount >= Math.ceil(lines.length * 0.6)) {
              issues.push({
                location: `Scene ${sceneIdx + 1} (${speaker})`,
                rule: 'EMOTIONAL_SUPPRESSION',
                description: `${speaker} uses only positive/neutral vocabulary in a negative-shift scene — emotion never surfaces through the text`,
                severity: 'major',
                suggestedFix: 'Let one line crack the facade — a pause, a deflection, a wrong word that betrays the real feeling',
              });
            }
          }
        }
      }

      // POWER_SILENCE: large relationship-shift scene + one speaker > 70% of lines
      if ((rec.relationshipShifts?.length ?? 0) > 0 && sceneDiag.length >= 4) {
        const absNet = rec.relationshipShifts!.reduce((s, r) => s + Math.abs(r.amount), 0);
        if (absNet > 0.5) {
          const speakerCount = new Map<string, number>();
          for (const d of sceneDiag) speakerCount.set(d.speaker, (speakerCount.get(d.speaker) ?? 0) + 1);
          const sorted = [...speakerCount.entries()].sort((a, b) => b[1] - a[1]);
          const [topSpeaker, topCount] = sorted[0];
          const pct = topCount / sceneDiag.length;
          if (pct > 0.7) {
            issues.push({
              location: `Scene ${sceneIdx + 1} (${topSpeaker})`,
              rule: 'POWER_SILENCE',
              description: `${topSpeaker} speaks ${Math.round(pct * 100)}% of dialogue in a relationship-shifting scene — the other character(s) are silenced`,
              severity: 'minor',
              suggestedFix: 'Give the silent character a reaction, objection, or deflection — their silence is louder than any line',
            });
          }
        }
      }
    }

    // QUESTION_DODGE: direct question not addressed in the immediate reply
    for (let i = 0; i + 1 < dialogue.length; i++) {
      const curr = dialogue[i];
      const next = dialogue[i + 1];
      if (curr.line.trim().endsWith('?') && next.speaker !== curr.speaker) {
        const subjects = extractQuestionSubjects(curr.line);
        if (subjects.length >= 2) {
          const responseLower = next.line.toLowerCase();
          const answered = subjects.some(s => responseLower.includes(s));
          if (!answered) {
            issues.push({
              location: `Line ${next.lineNum} (${next.speaker})`,
              rule: 'QUESTION_DODGE',
              description: `${next.speaker} dodges ${curr.speaker}'s question — no subject from the question appears in the reply`,
              severity: 'minor',
              suggestedFix: 'Either answer the question, explicitly deflect it, or have the asker notice the dodge',
            });
          }
        }
      }
    }

    // DENIAL_INVERSION: strong negative followed immediately by forced positive (same speaker)
    const speakerHistory = new Map<string, Array<{ line: string; lineNum: number }>>();
    for (const d of dialogue) {
      if (!speakerHistory.has(d.speaker)) speakerHistory.set(d.speaker, []);
      speakerHistory.get(d.speaker)!.push({ line: d.line, lineNum: d.lineNum });
    }
    for (const [speaker, lines] of speakerHistory) {
      for (let i = 0; i + 1 < lines.length; i++) {
        if (STRONG_NEGATIVE_RE.test(lines[i].line) && DENIAL_POSITIVE_RE.test(lines[i + 1].line)) {
          issues.push({
            location: `Lines ${lines[i].lineNum}-${lines[i + 1].lineNum} (${speaker})`,
            rule: 'DENIAL_INVERSION',
            description: `${speaker} follows a strong negative with an immediate forced positive — unearned emotional whiplash`,
            severity: 'minor',
            suggestedFix: 'Let the negative land. Silence, action, or a changed subject is more powerful than a reassurance',
          });
        }
      }
    }
  }

  // ── Wave 150: Talking heads, over-parenthetical, deadlock dialogue ───────────

  // TALKING_HEADS: Long stretches of dialogue with no action lines between them.
  // Characters become disembodied voices; the physical world disappears.
  // We count consecutive dialogue *exchanges* (each character-cue block) without
  // any action line between them. Blank lines are Fountain formatting, not breaks.
  {
    const fountainLines = fountain.split('\n');
    let exchangeCount = 0;       // how many char-cue blocks in a row without action
    let exchangeStartLine = -1;  // line number when the current run began
    let lastExchangeLine = -1;
    let insideDialogueBlock = false; // true from char cue until blank line or action

    for (let i = 0; i < fountainLines.length; i++) {
      const t = fountainLines[i].trim();
      const isSlug = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t);
      const isCharCue = t && /^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) && !isSlug;
      const isParenthetical = t.startsWith('(') && t.endsWith(')');
      const isBlank = !t;
      // Action: non-empty, not a slug, not a char cue, not parenth, not dialogue (i.e., inside dialogue block = false)
      const isAction = t && !isSlug && !isCharCue && !isParenthetical && !insideDialogueBlock;

      if (isSlug) {
        // New scene — flush and reset
        if (exchangeCount >= 5) {
          issues.push({
            location: `Lines ${exchangeStartLine + 1}–${lastExchangeLine + 1}`,
            rule: 'TALKING_HEADS',
            description: `${exchangeCount} consecutive dialogue exchanges with no action beat — characters lack physical presence in the scene`,
            severity: 'minor',
            suggestedFix: 'Insert at least one action line every 3-4 exchanges to keep characters grounded in physical space',
          });
        }
        exchangeCount = 0; exchangeStartLine = -1; insideDialogueBlock = false;
      } else if (isAction) {
        // Action line breaks the talking-heads run
        if (exchangeCount >= 5) {
          issues.push({
            location: `Lines ${exchangeStartLine + 1}–${lastExchangeLine + 1}`,
            rule: 'TALKING_HEADS',
            description: `${exchangeCount} consecutive dialogue exchanges with no action beat (lines ${exchangeStartLine + 1}–${lastExchangeLine + 1}) — characters become disembodied voices`,
            severity: 'minor',
            suggestedFix: 'Insert at least one action line every 3-4 exchanges to keep characters grounded in physical space',
          });
        }
        exchangeCount = 0; exchangeStartLine = -1; insideDialogueBlock = false;
      } else if (isCharCue) {
        // Start of a new exchange block
        if (exchangeCount === 0) exchangeStartLine = i;
        exchangeCount++;
        lastExchangeLine = i;
        insideDialogueBlock = true;
      } else if (isBlank) {
        insideDialogueBlock = false;
      } else if (insideDialogueBlock) {
        lastExchangeLine = i; // dialogue content line
      }
    }
    // Flush any open run at end-of-file
    if (exchangeCount >= 5 && exchangeStartLine >= 0) {
      issues.push({
        location: `Lines ${exchangeStartLine + 1}–${lastExchangeLine + 1}`,
        rule: 'TALKING_HEADS',
        description: `${exchangeCount} consecutive dialogue exchanges with no action beat — characters become disembodied voices`,
        severity: 'minor',
        suggestedFix: 'Insert at least one action line every 3-4 exchanges to keep characters grounded in physical space',
      });
    }
  }

  // OVER_PARENTHETICAL: A character uses parenthetical stage directions on more
  // than 40% of their dialogue lines. Over-direction undermines actors and signals
  // the writer doesn't trust their own dialogue.
  {
    const fountainLines = fountain.split('\n');
    const charParentheticalCount = new Map<string, number>();
    const charLineCount = new Map<string, number>();
    let currentChar = '';
    let isInDialogue = false;

    for (const line of fountainLines) {
      const t = line.trim();
      if (!t) { isInDialogue = false; continue; }
      const isSlugLine = /^(INT\.|EXT\.)/i.test(t);
      if (isSlugLine) { currentChar = ''; isInDialogue = false; continue; }
      const isCharCueLine = /^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) && !isSlugLine;
      if (isCharCueLine) {
        currentChar = t.split('(')[0].trim();
        isInDialogue = true;
        continue;
      }
      if (isInDialogue && currentChar) {
        if (t.startsWith('(') && t.endsWith(')')) {
          charParentheticalCount.set(currentChar, (charParentheticalCount.get(currentChar) ?? 0) + 1);
        } else {
          charLineCount.set(currentChar, (charLineCount.get(currentChar) ?? 0) + 1);
        }
      } else if (t && !t.startsWith('(')) {
        isInDialogue = false;
      }
    }

    for (const [char, lineCount] of charLineCount) {
      if (lineCount >= 6) {
        const pCount = charParentheticalCount.get(char) ?? 0;
        const ratio = pCount / lineCount;
        if (ratio > 0.4) {
          issues.push({
            location: `Character: ${char}`,
            rule: 'OVER_PARENTHETICAL',
            description: `${char} has parenthetical stage directions on ${Math.round(ratio * 100)}% of their dialogue lines (${pCount} parentheticals / ${lineCount} lines) — over-direction undermines the dialogue and the actor`,
            severity: 'minor',
            suggestedFix: `Remove parentheticals that simply state the obvious emotional register. Trust the dialogue itself to convey tone — actors don't need instruction for every line`,
          });
          break; // one flag per pass
        }
      }
    }
  }

  // DEADLOCK_DIALOGUE: Characters repeat the same surface-level argument across
  // multiple consecutive exchanges without escalation — the dialogue cycles rather
  // than building. We detect this by checking if the same keywords from a question
  // or assertion appear in 3+ consecutive exchanges (same back-and-forth rhythm).
  {
    // Group dialogue into exchanges: pairs of [speaker A, speaker B]
    if (dialogue.length >= 6) {
      // Look for repetitive keyword patterns: same subject word appearing in 3+
      // consecutive dialogue lines from alternating speakers.
      const windowSize = 6;
      for (let i = 0; i <= dialogue.length - windowSize; i++) {
        const window = dialogue.slice(i, i + windowSize);
        // Check speaker alternation (A B A B A B)
        const alternates = window.every((d, j) => j === 0 || d.speaker !== window[j - 1].speaker);
        if (!alternates) continue;

        // Extract shared words across the 6-line window
        const wordFreq = new Map<string, number>();
        for (const d of window) {
          const words = d.line.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !STOPWORDS_Q.has(w));
          for (const w of words) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
        }
        // A word appearing in 4+ of the 6 exchanges signals repetitive cycling
        const cyclingWords = [...wordFreq.entries()].filter(([, c]) => c >= 4).map(([w]) => w);
        if (cyclingWords.length >= 2) {
          issues.push({
            location: `Lines ${window[0].lineNum}–${window[window.length - 1].lineNum}`,
            rule: 'DEADLOCK_DIALOGUE',
            description: `Characters cycle the same argument without escalation across ${windowSize} lines — words repeated: "${cyclingWords.slice(0, 3).join('", "')}" — the scene goes nowhere`,
            severity: 'minor',
            suggestedFix: 'Escalate: one character must change tactics, reveal new information, or make a concession that shifts the dynamic. Circular arguments need a circuit-breaker',
          });
          break; // one flag per pass
        }
      }
    }
  }

  // ── Wave 164: Rhetorical question flood, dialogue density inversion, voice uniformity ──

  // RHETORICAL_QUESTION_FLOOD: A speaker asks 3+ of their own consecutive speeches as questions
  // (ignoring other speakers' interspersed turns). Urgency without a single declarative desire
  // statement is passive — the character never says what they actually want.
  {
    const speakerSpeeches = new Map<string, Array<{ line: string; lineNum: number }>>();
    for (const d of dialogue) {
      if (!speakerSpeeches.has(d.speaker)) speakerSpeeches.set(d.speaker, []);
      speakerSpeeches.get(d.speaker)!.push({ line: d.line, lineNum: d.lineNum });
    }
    for (const [speaker, speeches] of speakerSpeeches) {
      if (speeches.length < 3) continue;
      for (let i = 0; i <= speeches.length - 3; i++) {
        const w3 = speeches.slice(i, i + 3);
        if (w3.every(s => s.line.trim().endsWith('?'))) {
          issues.push({
            location: `Around line ${w3[0].lineNum} (${speaker})`,
            rule: 'RHETORICAL_QUESTION_FLOOD',
            description: `${speaker} asks 3+ consecutive questions across turns with no declarative statement — urgency without desire feels passive and evasive`,
            severity: 'minor',
            suggestedFix: 'Replace at least one question with a direct statement of what the character wants, fears, or knows. Characters who only ask questions never reveal themselves.',
          });
          break;
        }
      }
    }
  }

  // DIALOGUE_DENSITY_INVERSION: Climax zone (last 25% of scenes) averages more dialogue
  // lines per scene than setup zone (first 25%). Climax scenes should be action-compressed
  // and punchy; heavy talk in the climax means the writer is explaining rather than showing.
  if (records.length >= 8 && dialogue.length > 0) {
    const ddiLineToScene = buildLineToSceneMap(fountain);
    const sceneLineCounts = new Map<number, number>();
    for (const d of dialogue) {
      const si = ddiLineToScene[d.lineNum - 1] ?? 0;
      sceneLineCounts.set(si, (sceneLineCounts.get(si) ?? 0) + 1);
    }
    const n = records.length;
    const setupEnd = Math.floor(n * 0.25);
    const climaxStart = Math.floor(n * 0.75);
    const setupCounts: number[] = [];
    const climaxCounts: number[] = [];
    for (let i = 0; i < n; i++) {
      const cnt = sceneLineCounts.get(i) ?? 0;
      if (i < setupEnd) setupCounts.push(cnt);
      else if (i >= climaxStart) climaxCounts.push(cnt);
    }
    if (setupCounts.length >= 2 && climaxCounts.length >= 2) {
      const setupAvg = setupCounts.reduce((s, c) => s + c, 0) / setupCounts.length;
      const climaxAvg = climaxCounts.reduce((s, c) => s + c, 0) / climaxCounts.length;
      if (setupAvg > 0 && climaxAvg > setupAvg * 1.5) {
        issues.push({
          location: `Climax zone (scenes ${climaxStart + 1}–${n})`,
          rule: 'DIALOGUE_DENSITY_INVERSION',
          description: `Climax zone averages ${climaxAvg.toFixed(1)} dialogue lines/scene vs ${setupAvg.toFixed(1)} in setup — the script talks more during the climax than the opening, inverting expected action compression`,
          severity: 'major',
          suggestedFix: 'Compress climax dialogue to short punchy exchanges; redistribute exposition to the setup zone where characters have room to breathe',
        });
      }
    }
  }

  // CHARACTER_VOICE_UNIFORMITY: All significant speakers have nearly identical average
  // line lengths across the screenplay. Distinct characters have distinct rhythms —
  // terse vs. expansive. When all speakers share the same rhythm, no one has a voice.
  if (dialogue.length >= 15) {
    const speakerLengths = new Map<string, number[]>();
    for (const d of dialogue) {
      if (!speakerLengths.has(d.speaker)) speakerLengths.set(d.speaker, []);
      speakerLengths.get(d.speaker)!.push(d.line.length);
    }
    const qualified = new Map<string, number>();
    for (const [spk, lengths] of speakerLengths) {
      if (lengths.length >= 5) {
        qualified.set(spk, lengths.reduce((s, l) => s + l, 0) / lengths.length);
      }
    }
    if (qualified.size >= 3) {
      const avgs = [...qualified.values()];
      const mean = avgs.reduce((s, a) => s + a, 0) / avgs.length;
      if (mean > 5) {
        const maxDev = Math.max(...avgs.map(a => Math.abs(a - mean) / mean));
        if (maxDev < 0.2) {
          issues.push({
            location: 'All characters',
            rule: 'CHARACTER_VOICE_UNIFORMITY',
            description: `${qualified.size} speaking characters all share nearly identical dialogue rhythm (max length deviation: ${Math.round(maxDev * 100)}%) — no speaker has a distinct voice`,
            severity: 'major',
            suggestedFix: 'Differentiate rhythm: give one character terse fragments, another sprawling speeches, a third clipped single words. Voice lives in rhythm, not just vocabulary',
          });
        }
      }
    }
  }

  // ── Wave 178: Greeting ritual, vocative overuse, filler openers ─────────────

  // GREETING_RITUAL_OVERUSE: Dialogue is padded with rote greetings and
  // farewells ("Hello", "How are you", "Goodbye"). Screen dialogue should start
  // as late and end as early as possible; ritual pleasantries are dead air that
  // real scenes cut straight past. Requires 3+ greeting/farewell lines.
  {
    const greetingRe = /^(hello|hi|hey|good (morning|afternoon|evening|night)|goodbye|bye|see you( later| around)?|how are you|how'?s it going|what'?s up|nice to meet you|good to see you|take care)\b[.,!?]*$/i;
    const greetingLines = dialogue.filter(d => greetingRe.test(d.line.trim()));
    if (greetingLines.length >= 3) {
      issues.push({
        location: `${greetingLines.length} lines (e.g. line ${greetingLines[0].lineNum})`,
        rule: 'GREETING_RITUAL_OVERUSE',
        description: `${greetingLines.length} dialogue lines are rote greetings or farewells ("${greetingLines[0].line.trim()}", "${greetingLines[1].line.trim()}"…) — ritual pleasantries are dead air the scene should cut straight past.`,
        severity: 'minor',
        suggestedFix: 'Start scenes mid-conversation, after the hellos. Open on the first line that carries friction or intent; cut the greetings and goodbyes that surround the real exchange.',
      });
    }
  }

  // VOCATIVE_NAME_OVERUSE: Characters address each other by name far more often
  // than people do in real speech ("Listen, John." / "John, you don't get it").
  // Frequent vocatives are a tell of expository, on-the-nose writing. Requires
  // 8+ dialogue lines, 2+ named speakers, and >25% of lines naming another.
  if (dialogue.length >= 8) {
    const speakerNames = new Set(
      dialogue.map(d => d.speaker.toLowerCase()).filter(n => n.length >= 3),
    );
    if (speakerNames.size >= 2) {
      let vocativeLines = 0;
      for (const d of dialogue) {
        const lower = d.line.toLowerCase();
        const self = d.speaker.toLowerCase();
        for (const name of speakerNames) {
          if (name === self) continue;
          const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          if (re.test(lower)) { vocativeLines++; break; }
        }
      }
      const ratio = vocativeLines / dialogue.length;
      if (vocativeLines >= 3 && ratio > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'VOCATIVE_NAME_OVERUSE',
          description: `${vocativeLines} of ${dialogue.length} dialogue lines (${Math.round(ratio * 100)}%) address another character by name — people rarely use names this often in speech, and the frequency reads as expository writing announcing who's who.`,
          severity: 'minor',
          suggestedFix: 'Cut most of the names. A vocative should be reserved for the moment it carries weight — a warning, a plea, a final word. Sprinkled through every line, it flattens into a tic.',
        });
      }
    }
  }

  // FILLER_OPENER_OVERUSE: More than 30% of dialogue lines open with a
  // conversational throat-clear ("Well,", "Look,", "Listen,", "I mean,"). An
  // occasional filler characterizes; a constant one makes every character sound
  // hesitant and the dialogue sound like a first draft. Requires 8+ lines.
  if (dialogue.length >= 8) {
    const fillerRe = /^(well|look|listen|i mean|you know|okay|ok|so|now|see|right)\s*,/i;
    const fillerLines = dialogue.filter(d => fillerRe.test(d.line.trim())).length;
    const ratio = fillerLines / dialogue.length;
    if (ratio > 0.3) {
      issues.push({
        location: 'Dialogue openings',
        rule: 'FILLER_OPENER_OVERUSE',
        description: `${fillerLines} of ${dialogue.length} dialogue lines (${Math.round(ratio * 100)}%) open with a filler interjection ("Well,", "Look,", "Listen,") — a constant throat-clear that makes every character sound hesitant and the dialogue sound unrevised.`,
        severity: 'minor',
        suggestedFix: 'Delete most of the openers and let the line start on its actual content. Reserve a "Look," for the beat where a character is genuinely steeling themselves to say something hard.',
      });
    }
  }

  // ── Wave 185: Question dominance, interruption void, speaker monopoly ──────

  // QUESTION_DOMINANCE: More than 45% of all dialogue lines are questions.
  // Characters who spend most of their time asking rather than declaring or acting
  // are running on inquiry instead of intention — the dialogue lacks agency.
  // Different from RHETORICAL_QUESTION_FLOOD (same speaker, 3 consecutive).
  if (dialogue.length >= 12) {
    const questionLines = dialogue.filter(d => d.line.trim().endsWith('?'));
    const ratio = questionLines.length / dialogue.length;
    if (ratio > 0.45) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'QUESTION_DOMINANCE',
        description: `${questionLines.length} of ${dialogue.length} dialogue lines (${Math.round(ratio * 100)}%) are questions — characters interrogate rather than act. Dialogue dominated by inquiry signals no one knows what they want.`,
        severity: 'minor',
        suggestedFix: 'Balance questions with declarations. Characters should want something and say it. Replace at least half the questions with active statements of desire, intention, or knowledge.',
      });
    }
  }

  // INTERRUPTION_VOID: Not a single dialogue line ends with an interruption marker
  // ('--' or '—'). Real conversations collide, overlap, cut off. When every
  // character waits their turn before speaking, the dialogue sounds like a formal
  // debate rather than a living exchange between people under pressure.
  if (dialogue.length >= 15) {
    const interruptionRe = /--$|—$|–$/;
    const hasInterruption = dialogue.some(d => interruptionRe.test(d.line.trim()));
    if (!hasInterruption) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'INTERRUPTION_VOID',
        description: `${dialogue.length} dialogue lines with no interruption markers ('--') — every character waits politely for their turn. Scenes under pressure need characters who cut each other off.`,
        severity: 'minor',
        suggestedFix: 'Add at least 2-3 interruptions in high-tension scenes (end a cut-off line with \'--\'). Characters who are afraid, urgent, or dominant don\'t let others finish.',
      });
    }
  }

  // SPEAKER_MONOPOLY: One character delivers more than 55% of all dialogue lines
  // in a script with 2+ speakers. Unlike UNINTERRUPTED_MONOLOGUE (which tracks
  // consecutive bursts), this fires on cumulative dominance — a character who
  // speaks less often but always at length can still crowd out every other voice.
  if (dialogue.length >= 15) {
    const speakerCounts2 = new Map<string, number>();
    for (const d of dialogue) {
      speakerCounts2.set(d.speaker, (speakerCounts2.get(d.speaker) ?? 0) + 1);
    }
    if (speakerCounts2.size >= 2) {
      const [monopolistName, monopolistLines] = [...speakerCounts2.entries()]
        .sort((a, b) => b[1] - a[1])[0];
      const ratio = monopolistLines / dialogue.length;
      if (ratio > 0.55) {
        issues.push({
          location: `Character: ${monopolistName}`,
          rule: 'SPEAKER_MONOPOLY',
          description: `${monopolistName} delivers ${monopolistLines} of ${dialogue.length} total dialogue lines (${Math.round(ratio * 100)}%) — the story silences all other voices and hands the entire floor to one character.`,
          severity: 'minor',
          suggestedFix: `Redistribute dialogue: give other characters more lines that push back, pursue their own agenda, or reframe the conversation. Dominating the word count is not the same as driving the scene.`,
        });
      }
    }
  }

  // ── Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload ────

  // PUNCTUATION_FLATLINE: More than 85% of all dialogue lines end with a period
  // AND no line ends with '!'. Every character speaks in the same flat declarative
  // register — no urgency, no burst, no surprise. Emotional range lives in
  // punctuation as well as words; a script where everything ends with a full stop
  // runs on a single monotone emotional note. Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    let periodCount204 = 0;
    let bangCount204 = 0;
    for (const d of dialogue) {
      const t204 = d.line.trim();
      if (t204.endsWith('.')) periodCount204++;
      if (t204.endsWith('!')) bangCount204++;
    }
    const periodRatio204 = periodCount204 / dialogue.length;
    if (periodRatio204 > 0.85 && bangCount204 === 0) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'PUNCTUATION_FLATLINE',
        severity: 'minor',
        description: `${periodCount204} of ${dialogue.length} dialogue lines (${Math.round(periodRatio204 * 100)}%) end with a period and none end with '!' — every character speaks in the same flat declarative register. Emotional range lives in punctuation as well as words.`,
        suggestedFix:
          "Vary terminal punctuation to signal register: '!' for urgency or surprise, '--' for interruption or trailing off, fragments without punctuation for staccato impact. A script where everything ends with a period sounds emotionally flattened.",
      });
    }
  }

  // DIALOGUE_STACCATO_OVERUSE: More than 65% of all dialogue lines are five words
  // or fewer. Punchy short lines are powerful — but only by contrast. When nearly
  // every line is a one-breath fragment, no character gets to develop a thought.
  // The script reads like telegrams rather than speech, and all emotional weight
  // collapses into monotone brevity. Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const staccatoCount204 = dialogue.filter(d => {
      const wordCount204 = d.line.trim().split(/\s+/).filter(w => w.length > 0).length;
      return wordCount204 <= 5;
    }).length;
    const staccatoRatio204 = staccatoCount204 / dialogue.length;
    if (staccatoRatio204 > 0.65) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_STACCATO_OVERUSE',
        severity: 'minor',
        description: `${staccatoCount204} of ${dialogue.length} dialogue lines (${Math.round(staccatoRatio204 * 100)}%) are five words or fewer — punchy brevity overwhelms the dialogue. No character gets to develop a complete thought.`,
        suggestedFix:
          'Balance short lines with some longer, more developed speeches. Characters under pressure can still form sentences; the weight of a short line only lands when surrounded by longer ones.',
      });
    }
  }

  // PRONOUN_I_OVERLOAD: More than 60% of all dialogue lines across all speakers
  // begin with the first-person pronoun "I" (including contractions I'm, I'll, I'd,
  // I've). When most sentences center on the speaker's own perspective, nobody is
  // listening — the dialogue becomes a simultaneous monologue of ego. Characters
  // with a distinct voice address the world, not just themselves. Requires 10+ lines.
  if (dialogue.length >= 10) {
    const iStartCount204 = dialogue.filter(d => /^I\b/.test(d.line.trim())).length;
    const iStartRatio204 = iStartCount204 / dialogue.length;
    if (iStartRatio204 > 0.60) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'PRONOUN_I_OVERLOAD',
        severity: 'minor',
        description: `${iStartCount204} of ${dialogue.length} dialogue lines (${Math.round(iStartRatio204 * 100)}%) begin with "I" — most characters are talking about themselves rather than engaging with each other. The dialogue is a chorus of ego, not a conversation.`,
        suggestedFix:
          'Vary sentence openers: start lines with the other character\'s name, an action verb ("Take it."), a declarative about the world ("This changes everything."), or a question. When every line begins with "I", no one is listening.',
      });
    }
  }

  // ── Wave 215: Conversational dynamics — responsiveness, lexical diversity, cadence.
  //    Three information-theoretic measures of dialogue as a system rather than as a bag
  //    of independent surface features: do turns engage each other, is the vocabulary
  //    rich, and does the line-length rhythm vary. ──

  // NON_RESPONSIVE_EXCHANGE (major): a run of 4+ consecutive cross-speaker turns where
  // each line shares zero content words with the line it answers. Both speakers say
  // something substantive, but about unrelated things — the scene is a set of parallel
  // monologues, not a conversation. Generalises QUESTION_DODGE (which is question-only)
  // to the entire exchange and requires sustained, not isolated, non-responsiveness.
  if (dialogue.length >= 10) {
    let nonRespRun215 = 0, maxNonResp215 = 0, runStartLine215 = 0, maxRunStartLine215 = 0;
    for (let i = 1; i < dialogue.length; i++) {
      if (dialogue[i].speaker === dialogue[i - 1].speaker) { nonRespRun215 = 0; continue; }
      const priorWords215 = new Set(dialogueContentWords(dialogue[i - 1].line));
      const replyWords215 = dialogueContentWords(dialogue[i].line);
      // Only judge turns where both speakers said something substantive.
      if (priorWords215.size === 0 || replyWords215.length === 0) { nonRespRun215 = 0; continue; }
      const engages215 = replyWords215.some(w => priorWords215.has(w));
      if (!engages215) {
        if (nonRespRun215 === 0) runStartLine215 = dialogue[i - 1].lineNum;
        nonRespRun215++;
        if (nonRespRun215 > maxNonResp215) { maxNonResp215 = nonRespRun215; maxRunStartLine215 = runStartLine215; }
      } else {
        nonRespRun215 = 0;
      }
    }
    if (maxNonResp215 >= 4) {
      issues.push({
        location: `Dialogue from line ${maxRunStartLine215}`,
        rule: 'NON_RESPONSIVE_EXCHANGE',
        severity: 'major',
        description: `${maxNonResp215} consecutive speaker exchanges share no content words — each character answers with something substantive but unrelated to what was just said. The dialogue is a set of parallel monologues; nobody is listening to anybody.`,
        suggestedFix: 'Make each line engage the previous one: pick up a word, a claim, or an image the other character just used and push against it. Even a deliberate non-sequitur should be visibly ignoring something specific, not floating free of the exchange.',
      });
    }
  }

  // DIALOGUE_LEXICAL_POVERTY (minor): the content-word type-token ratio (unique/total)
  // across all dialogue falls below 0.45 over a substantial sample. The characters
  // recycle a tiny vocabulary — the script circles a few hundred words and every line
  // sounds drawn from the same shallow pool. Vocabulary breadth is a primary marker of
  // alive, specific dialogue.
  if (dialogue.length >= 10) {
    const allContent215: string[] = [];
    for (const d of dialogue) allContent215.push(...dialogueContentWords(d.line));
    if (allContent215.length >= 30) {
      const uniqueContent215 = new Set(allContent215).size;
      const ttr215 = uniqueContent215 / allContent215.length;
      if (ttr215 < 0.45) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_LEXICAL_POVERTY',
          severity: 'minor',
          description: `The dialogue's content-word type-token ratio is ${ttr215.toFixed(2)} (${uniqueContent215} unique words across ${allContent215.length}) — characters recycle a very small vocabulary. Lexical variety is what makes each line feel newly minted; a ratio this low makes the script sound like it is circling a handful of words.`,
          suggestedFix: 'Widen the vocabulary: replace repeated abstractions with concrete, specific nouns and verbs drawn from each character\'s own world and expertise. Specificity of word choice is what separates distinct, living dialogue from interchangeable filler.',
        });
      }
    }
  }

  // CADENCE_MONOTONY (minor): the coefficient of variation of dialogue line lengths
  // (in words) is below 0.35 — nearly every line is the same length. Unlike
  // CHARACTER_VOICE_UNIFORMITY (which compares speakers' means to each other), this
  // measures the rhythmic texture of the dialogue as a whole. Real speech alternates
  // clipped ripostes with longer reaches; a metronomic line length drains the rhythm.
  if (dialogue.length >= 12) {
    const wordCounts215 = dialogue.map(d => d.line.trim().split(/\s+/).filter(w => w.length > 0).length);
    const meanLen215 = wordCounts215.reduce((a, b) => a + b, 0) / wordCounts215.length;
    if (meanLen215 >= 3) {
      const variance215 = wordCounts215.reduce((a, l) => a + (l - meanLen215) ** 2, 0) / wordCounts215.length;
      const cov215 = Math.sqrt(variance215) / meanLen215;
      if (cov215 < 0.35) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'CADENCE_MONOTONY',
          severity: 'minor',
          description: `Dialogue line length varies by a coefficient of only ${cov215.toFixed(2)} around a mean of ${meanLen215.toFixed(1)} words — nearly every line runs the same length. The dialogue marches in metronomic lockstep with no rhythmic dynamics.`,
          suggestedFix: 'Break the metronome: follow a long, searching speech with a two-word riposte, or a clipped exchange with a sudden confession. Rhythm — the alternation of short and long — is half of how dialogue conveys emotion and shifting power.',
        });
      }
    }
  }

  // ── Wave 227: DIALOGUE_MIRROR_SYNDROME ────────────────────────────────────
  // A "mirror response" ends with '?' AND shares ≥2 content words with the line
  // it immediately answers (different speaker). "I found the briefcase." → "You
  // found the briefcase?" The responder confirms comprehension but contributes
  // nothing new: no counter-claim, no challenge, no redirect. When ≥3 such
  // responses occur, the exchange has become a reflection surface rather than a
  // collision of minds. Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    let mirrorCount227 = 0;
    for (let i = 1; i < dialogue.length; i++) {
      if (dialogue[i].speaker === dialogue[i - 1].speaker) continue;
      if (!dialogue[i].line.trim().endsWith('?')) continue;
      const priorWords227 = new Set(dialogueContentWords(dialogue[i - 1].line));
      if (priorWords227.size < 2) continue;
      const replyWords227 = dialogueContentWords(dialogue[i].line);
      const echoCount227 = replyWords227.filter(w => priorWords227.has(w)).length;
      if (echoCount227 >= 2) mirrorCount227++;
    }
    if (mirrorCount227 >= 3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_MIRROR_SYNDROME',
        severity: 'minor',
        description: `${mirrorCount227} responses echo ≥2 content words from the line they answer back as a question — the "mirror" pattern. The responder demonstrates comprehension but adds nothing: "I found the key." / "You found the key?" contributes no new information, tension, or direction to the exchange.`,
        suggestedFix: `Replace mirror-question responses with genuine reactions: a challenge, a counter-claim, a qualification, or a redirect that pushes the scene forward. Every line should advance the exchange rather than confirm the previous one.`,
      });
    }
  }

  // ── Wave 227: IMPERATIVE_DOMINANCE ────────────────────────────────────────
  // One major character delivers ≥60% of their lines as imperatives (commands
  // starting with a base verb: Get, Go, Stop, Come, Take, Give, Tell, Find…).
  // Imperative-dominant characters have no register other than authority — they
  // issue orders and never reveal vulnerability, doubt, or desire. A character
  // who only commands is a plot function, not a person. Requires 10+ lines for
  // the character in question, and 12+ total dialogue lines.
  if (dialogue.length >= 12) {
    const imperativeRe227 = /^(get|go|stop|come|take|give|tell|find|run|leave|stay|move|wait|help|turn|put|show|make|open|close|hold|keep|try|bring|send|call|talk|speak|write|read|sit|stand|walk|follow|check|watch|ask|answer|remember|forget|think|consider|understand|realize|learn|count|pick|push|pull|throw|catch|break|hit|cut|kill|save|start|finish|drop|raise|lower|join|leave)\b/i;
    const fillerRe227 = /^(well|look|listen|i mean|you know|okay|ok|so|now|see|right)\s*,/i;
    const impCounts227 = new Map<string, { total: number; imperative: number }>();
    for (const d of dialogue) {
      if (!impCounts227.has(d.speaker)) impCounts227.set(d.speaker, { total: 0, imperative: 0 });
      const s227 = impCounts227.get(d.speaker)!;
      s227.total++;
      if (imperativeRe227.test(d.line.trim()) && !fillerRe227.test(d.line.trim())) s227.imperative++;
    }
    for (const [speaker, counts] of impCounts227) {
      if (counts.total >= 10 && counts.imperative / counts.total >= 0.6) {
        issues.push({
          location: `Character: ${speaker}`,
          rule: 'IMPERATIVE_DOMINANCE',
          severity: 'minor',
          description: `${speaker} delivers ${counts.imperative} of ${counts.total} dialogue lines (${Math.round(counts.imperative / counts.total * 100)}%) as imperative commands — the character has no register other than authority. Characters who only issue orders never reveal vulnerability, uncertainty, or desire.`,
          suggestedFix: `Break ${speaker}'s command register: give them at least one line that asks rather than orders, reveals a fear, concedes something, or expresses a wish. A character who only commands is a plot function, not a person.`,
        });
        break; // one flag per pass
      }
    }
  }

  // ── Wave 227: LAST_ACT_EXPOSITION_SPIKE ───────────────────────────────────
  // Act 3 dialogue carries a higher proportion of expository "as-you-know" lines
  // (AS_YOU_KNOW_RE and TRAIT_LABELING_RE) than Act 1. By Act 3, characters should
  // be acting on what they know, not explaining it for the first time. Exposition
  // in the climax signals retroactive plot-plugging — the story is filling in
  // information that should have been established long before.
  // Requires 8+ records, 6+ dialogue lines, ≥2 act3 expository lines.
  if (records.length >= 8 && dialogue.length >= 6) {
    const expLineToScene227 = buildLineToSceneMap(fountain);
    const n227 = records.length;
    const act1End227 = Math.floor(n227 * 0.25);
    const act3Start227 = Math.floor(n227 * 0.75);
    let act1TotalDlg227 = 0, act1ExpDlg227 = 0;
    let act3TotalDlg227 = 0, act3ExpDlg227 = 0;
    for (const d of dialogue) {
      const si227 = expLineToScene227[d.lineNum - 1] ?? 0;
      const isExp227 = AS_YOU_KNOW_RE.test(d.line) || TRAIT_LABELING_RE.test(d.line);
      if (si227 < act1End227) {
        act1TotalDlg227++;
        if (isExp227) act1ExpDlg227++;
      } else if (si227 >= act3Start227) {
        act3TotalDlg227++;
        if (isExp227) act3ExpDlg227++;
      }
    }
    if (act3ExpDlg227 >= 2 && act3TotalDlg227 >= 3 && act1TotalDlg227 >= 2) {
      const act1Ratio227 = act1ExpDlg227 / act1TotalDlg227;
      const act3Ratio227 = act3ExpDlg227 / act3TotalDlg227;
      if (act3Ratio227 > act1Ratio227 && act3Ratio227 >= 0.3) {
        issues.push({
          location: `Act 3 dialogue (scenes ${act3Start227}–${n227 - 1})`,
          rule: 'LAST_ACT_EXPOSITION_SPIKE',
          severity: 'major',
          description: `Act 3 carries ${act3ExpDlg227} of ${act3TotalDlg227} dialogue lines (${Math.round(act3Ratio227 * 100)}%) using expository patterns ("as you know", trait labels) vs. ${Math.round(act1Ratio227 * 100)}% in Act 1. Exposition in the climax is retroactive plot-plugging — characters explaining things that should have been established long before.`,
          suggestedFix: `Move expository dialogue to Act 1 or early Act 2. By Act 3, characters should be acting on what they know, not explaining it. Revelation belongs at the structural pivot, not at the climax.`,
        });
      }
    }
  }

  // ── Wave 241: DIALOGUE_SELF_CORRECTION_ABSENT ────────────────────────────
  // No dialogue line contains a mid-speech self-correction marker ("I mean",
  // "actually,", "wait,", "no—", etc.) across ≥15 total lines. Distinct from
  // INTERRUPTION_VOID (which fires when no line ENDS with a trailing dash or
  // ellipsis — cut-off by another speaker). This fires when speech is never
  // SELF-interrupted — no character restarts, qualifies mid-stream, or catches
  // themselves. Real speech under pressure is full of self-correction; its
  // complete absence makes dialogue feel over-composed, written at a desk
  // rather than spoken in a scene.
  if (dialogue.length >= 15) {
    const selfCorrectRe241 = /\b(I mean|actually,|wait[,—]|no—|—I |—wait|well,|or rather|I meant|correction,|—no)\b/i;
    const hasSelfCorrect241 = dialogue.some(d => selfCorrectRe241.test(d.line));
    if (!hasSelfCorrect241) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_SELF_CORRECTION_ABSENT',
        severity: 'minor',
        description: `${dialogue.length} dialogue lines contain no mid-speech self-correction ("I mean", "actually,", "wait—", "no—"). Real speech is full of self-interruption and course-correction; its complete absence makes dialogue feel over-written — composed lines delivered at lecterns, not words spoken under pressure.`,
        suggestedFix: "Add 2-3 moments of spoken self-correction: a character who starts a sentence and redirects it (\"I need to — look, just listen.\"), one who qualifies mid-stream (\"He was wrong, actually, he was terrified\"), one who catches themselves. Self-correction reveals character under pressure and makes speech sound live.",
      });
    }
  }

  // ── Wave 241: SPEAKER_PAIR_MONOPOLY ──────────────────────────────────────
  // Two speakers account for ≥85% of all dialogue lines when ≥4 unique speakers
  // are present and ≥16 total lines exist. Distinct from SPEAKER_MONOPOLY
  // (which fires when ONE speaker ≥55%): this fires when the dominant PAIR
  // monopolises the verbal space while a larger ensemble looks on silently.
  // An ensemble that only observes is set dressing — every speaking role must
  // have something to say that only they would say.
  if (dialogue.length >= 16) {
    const speakerCounts241 = new Map<string, number>();
    for (const d of dialogue) {
      speakerCounts241.set(d.speaker, (speakerCounts241.get(d.speaker) ?? 0) + 1);
    }
    if (speakerCounts241.size >= 4) {
      const sorted241 = [...speakerCounts241.entries()].sort((a, b) => b[1] - a[1]);
      const topTwo241 = sorted241[0][1] + sorted241[1][1];
      const pairRatio241 = topTwo241 / dialogue.length;
      if (pairRatio241 >= 0.85) {
        issues.push({
          location: 'Dialogue speaker distribution',
          rule: 'SPEAKER_PAIR_MONOPOLY',
          severity: 'minor',
          description: `Two characters ("${sorted241[0][0]}" and "${sorted241[1][0]}") deliver ${topTwo241} of ${dialogue.length} lines (${Math.round(pairRatio241 * 100)}%) while ${speakerCounts241.size - 2} other speakers are nearly silent. With ${speakerCounts241.size} speaking roles in the script, the remaining ensemble exists as functional props rather than verbal agents.`,
          suggestedFix: `Give the silent characters a verbal stake: a challenge, a doubt, an observation that complicates the scene. An ensemble that only listens is set dressing; every speaking role should carry a line that only they would deliver.`,
        });
      }
    }
  }

  // ── Wave 241: DIALOGUE_RETROSPECTIVE_FLOOD ────────────────────────────────
  // More than 55% of dialogue lines contain common past-tense verbs — characters
  // spend more time recounting history than acting in the present moment.
  // Retrospective-dominant dialogue turns scenes into debriefs: characters
  // explain what happened rather than making things happen. Film is present tense;
  // extended past-tense dialogue is a news report, not a scene. Requires ≥12 lines.
  if (dialogue.length >= 12) {
    const pastTenseRe241 = /\b(was|were|had|did|went|said|told|thought|knew|came|saw|heard|felt|made|took|got|found|left|seemed|looked|happened|turned|tried|started|kept|called|helped|lived|worked|used|changed|died|moved|returned|asked|wanted|needed|gave|sent|brought|caught|held|meant|ran|sat|stood|spoke|walked|became|began)\b/i;
    const retroCount241 = dialogue.filter(d => pastTenseRe241.test(d.line)).length;
    if (retroCount241 / dialogue.length > 0.55) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_RETROSPECTIVE_FLOOD',
        severity: 'minor',
        description: `${retroCount241} of ${dialogue.length} dialogue lines (${Math.round(retroCount241 / dialogue.length * 100)}%) contain past-tense verbs — characters spend more time recounting history than acting in the present. Retrospective dialogue turns scenes into debriefs rather than live events.`,
        suggestedFix: "Shift the balance toward present-tense confrontation: characters should want things, force each other's choices, and reveal information in the moment — not explain what happened before. When backstory is necessary, interrupt it with present-tense stakes: \"She left me. Right now, tonight — that's what matters.\"",
      });
    }
  }

  // ── Wave 255: ELLIPSIS_OVERUSE ────────────────────────────────────────────
  // More than 35% of dialogue lines contain an ellipsis ("..." or "…"). An
  // occasional trailing-off marks hesitation or a thought left unfinished; on
  // more than a third of lines it becomes a tic that makes every character sound
  // tentative, wistful, and verbally identical. Distinct from PUNCTUATION_FLATLINE
  // (period-dominant) and INTERRUPTION_VOID (no trailing dashes); this targets the
  // ellipsis specifically. Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const ellipsisRe255 = /\.\.\.|…/;
    const ellipsisCount255 = dialogue.filter(d => ellipsisRe255.test(d.line)).length;
    const ellipsisRatio255 = ellipsisCount255 / dialogue.length;
    if (ellipsisRatio255 > 0.35) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'ELLIPSIS_OVERUSE',
        severity: 'minor',
        description: `${ellipsisCount255} of ${dialogue.length} dialogue lines (${Math.round(ellipsisRatio255 * 100)}%) contain an ellipsis ("…") — a trailing-off tic that makes every character sound tentative and wistful. Overused, the ellipsis flattens distinct voices into the same hesitant register.`,
        suggestedFix: 'Reserve the ellipsis for the rare line where a thought genuinely dies on the lips. Let most lines land on a firm period or break off on a dash when another character cuts in — decisive punctuation gives dialogue spine.',
      });
    }
  }

  // ── Wave 255: TAG_QUESTION_OVERUSE ────────────────────────────────────────
  // More than 25% of dialogue lines end with a confirmation-seeking tag question
  // ("…isn't it?", "…right?", "…you know?", "…don't you?"). Tag questions hand
  // the floor back to the other speaker and signal a character fishing for
  // agreement rather than asserting. A constant stream of them makes everyone
  // sound insecure and the dialogue sound like it's negotiating its own validity.
  // Distinct from QUESTION_DOMINANCE (any question) and RHETORICAL_QUESTION_FLOOD
  // (one speaker, consecutive). Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    const tagQuestionRe255 = /\b(is(n'?t)? it|are(n'?t)? (you|they|we)|do(n'?t)? (you|they|we)|does(n'?t)? (he|she|it)|right|ok(ay)?|you know|would(n'?t)? you|wo(n'?t)? you|have(n'?t)? (you|we|they)|was(n'?t)? (it|he|she)|ca(n'?t)? (you|we|they)|huh|eh|yeah)\s*\?$/i;
    const tagCount255 = dialogue.filter(d => tagQuestionRe255.test(d.line.trim())).length;
    const tagRatio255 = tagCount255 / dialogue.length;
    if (tagCount255 >= 3 && tagRatio255 > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'TAG_QUESTION_OVERUSE',
        severity: 'minor',
        description: `${tagCount255} of ${dialogue.length} dialogue lines (${Math.round(tagRatio255 * 100)}%) end with a confirmation-seeking tag question ("…right?", "…isn't it?", "…you know?") — characters keep fishing for agreement instead of asserting. The constant tag makes everyone sound insecure and the dialogue sound like it's negotiating its own validity.`,
        suggestedFix: 'Convert most tags into flat assertions and let other characters supply the pushback themselves. Save the tag question for the beat where a character genuinely needs the other to commit — a manipulator closing a deal, a doubter seeking reassurance.',
      });
    }
  }

  // ── Wave 255: EXCLAMATION_OVERUSE ─────────────────────────────────────────
  // More than 35% of dialogue lines end with an exclamation mark. When most lines
  // shout, none of them land — sustained high volume has no contrast to make any
  // single outburst register, and the dialogue reads as melodrama. This is the
  // mirror image of PUNCTUATION_FLATLINE (which fires on period-only monotone with
  // zero exclamations); here the register is pinned at maximum intensity instead.
  // Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const bangCount255 = dialogue.filter(d => d.line.trim().endsWith('!')).length;
    const bangRatio255 = bangCount255 / dialogue.length;
    if (bangRatio255 > 0.35) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'EXCLAMATION_OVERUSE',
        severity: 'minor',
        description: `${bangCount255} of ${dialogue.length} dialogue lines (${Math.round(bangRatio255 * 100)}%) end with an exclamation mark — the dialogue is pinned at maximum volume. When most lines shout, none of them land: sustained intensity has no contrast to make any single outburst register, and the scene reads as melodrama.`,
        suggestedFix: 'Strip exclamation marks back to the two or three moments that truly earn them. Real force comes from contrast — a quiet, flat line beside a sudden shout hits harder than a page of shouting. Let restraint set up the explosion.',
      });
    }
  }

  // ── Wave 269: DIALOGUE_QUESTION_CLUSTER ───────────────────────────────────
  // Three or more consecutive dialogue lines are all questions (ending with
  // '?'). A dialogue exchange made entirely of questions has no movement —
  // nobody is answering, asserting, or committing. The scene circles without
  // advancing. Questions create tension but only if someone eventually provides
  // an answer, a deflection, or a counter-position; an unbroken run signals
  // the scene is interrogating itself rather than progressing.
  // Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    let qRun269 = 0;
    let qRunStart269 = 0;
    for (let i = 0; i < dialogue.length; i++) {
      if (dialogue[i].line.trim().endsWith('?')) {
        if (qRun269 === 0) qRunStart269 = i;
        qRun269++;
      } else {
        qRun269 = 0;
      }
      if (qRun269 >= 3) {
        issues.push({
          location: `Lines ${dialogue[qRunStart269].lineNum}–${dialogue[i].lineNum}`,
          rule: 'DIALOGUE_QUESTION_CLUSTER',
          severity: 'minor',
          description: `${qRun269} consecutive dialogue lines (lines ${dialogue[qRunStart269].lineNum}–${dialogue[i].lineNum}) are all questions — nobody is answering. A dialogue exchange made entirely of questions has no forward movement: nobody asserts, commits, or deflects. The scene interrogates itself rather than advancing.`,
          suggestedFix: 'Break the question chain with an answer, a deflection, or a flat assertion. Questions create tension only when someone eventually steps forward and commits to a position. One answer changes the scene\'s dynamic; an unbroken question loop signals a stall.',
        });
        break;
      }
    }
  }

  // ── Wave 269: DIALOGUE_AGREEMENT_CHAIN ────────────────────────────────────
  // Three or more consecutive dialogue lines are all agreement responses
  // ("yes", "right", "exactly", "absolutely", "of course", "agreed", etc.).
  // A run of pure capitulations means nobody is pushing back, qualifying, or
  // introducing any friction. Drama lives in resistance; an agreement chain
  // flattens conflict and signals that the scene is a consensus exercise
  // rather than a negotiation. Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    let agreeRun269 = 0;
    let agreeRunStart269 = 0;
    for (let i = 0; i < dialogue.length; i++) {
      if (AGREEMENT_RE.test(dialogue[i].line.trim())) {
        if (agreeRun269 === 0) agreeRunStart269 = i;
        agreeRun269++;
      } else {
        agreeRun269 = 0;
      }
      if (agreeRun269 >= 3) {
        issues.push({
          location: `Lines ${dialogue[agreeRunStart269].lineNum}–${dialogue[i].lineNum}`,
          rule: 'DIALOGUE_AGREEMENT_CHAIN',
          severity: 'minor',
          description: `${agreeRun269} consecutive dialogue lines (lines ${dialogue[agreeRunStart269].lineNum}–${dialogue[i].lineNum}) are all agreement responses — no character pushes back, qualifies, or dissents. Drama lives in resistance; an unbroken chain of capitulations flattens all conflict and makes the scene a consensus exercise rather than a negotiation.`,
          suggestedFix: 'Insert at least one challenge, qualification, or partial disagreement into the agreement run. Even a "Yes, but..." changes the scene\'s dynamic. Pure agreement chains read as the characters talking themselves into something rather than deciding it through conflict.',
        });
        break;
      }
    }
  }

  // ── Wave 269: LONG_SPEECH_DOMINANCE ───────────────────────────────────────
  // More than 50% of all dialogue lines are 15 words or longer. When most
  // lines are extended speeches, brevity is crowded out — no punchy exchange,
  // no staccato beat, no rapid-fire cross-talk. The script reads as a series
  // of orations rather than a conversation. This is the mirror of
  // DIALOGUE_STACCATO_OVERUSE (which fires when lines are too short); here
  // every character gets too much floor time, and the cadence collapses into
  // a single slow register. Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const longLineCount269 = dialogue.filter(d => d.line.trim().split(/\s+/).length >= 15).length;
    if (longLineCount269 / dialogue.length > 0.50) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'LONG_SPEECH_DOMINANCE',
        severity: 'minor',
        description: `${longLineCount269} of ${dialogue.length} dialogue lines (${Math.round(longLineCount269 / dialogue.length * 100)}%) are 15 words or longer — the dialogue is dominated by extended speeches. No character delivers a short, punchy response; every turn is a full oration. The cadence collapses into a single slow register with no rhythmic variation.`,
        suggestedFix: 'Break long speeches into shorter turns, or interrupt them with brief reactions from other characters. Brief lines create urgency and give the impression that characters are reacting to each other rather than reading prepared remarks. Long speeches land harder when they follow a run of short, sharp exchanges.',
      });
    }
  }

  // ── Wave 283: FUTURE_TENSE_FLOOD ─────────────────────────────────────────
  // More than 35% of dialogue lines contain future-tense constructions.
  // When characters spend the majority of their dialogue discussing what will
  // happen rather than what is happening or has happened, the scene loses
  // present-tense tension — it becomes a planning session rather than a
  // confrontation. Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    const futureTenseRe283 = /\b(i will|i'll|we'll|you'll|they'll|he'll|she'll|it'll|going to|gonna|will be|will have|i'm going to|we're going to|you're going to|they're going to)\b/i;
    const futureCount283 = dialogue.filter(d => futureTenseRe283.test(d.line)).length;
    if (futureCount283 / dialogue.length > 0.35) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'FUTURE_TENSE_FLOOD',
        severity: 'minor',
        description: `${futureCount283} of ${dialogue.length} dialogue lines (${Math.round(futureCount283 / dialogue.length * 100)}%) contain future-tense constructions ("I'll", "going to", "will", etc.). When characters spend most of their dialogue discussing what will happen, the scene loses present-tense urgency — it becomes a planning session rather than a live confrontation.`,
        suggestedFix: 'Ground characters in the present and past: what do they want right now, what did they just discover, what are they reacting to? Reserve future-tense lines for explicit plans, threats, and promises — sparse use makes them land harder.',
      });
    }
  }

  // ── Wave 283: DIALOGUE_CONDITIONAL_OVERLOAD ──────────────────────────────
  // More than 30% of dialogue lines contain conditional constructions.
  // Heavy use of "if", "unless", "might", "could", "would" gives the
  // dialogue a hedged, tentative quality — characters refuse to commit.
  // Drama requires commitment; conditional overload reads as characters
  // who are unwilling to take a stand. Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    const conditionalRe283 = /\b(if |unless |might |could |would )/i;
    const condCount283 = dialogue.filter(d => conditionalRe283.test(d.line)).length;
    if (condCount283 / dialogue.length > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_CONDITIONAL_OVERLOAD',
        severity: 'minor',
        description: `${condCount283} of ${dialogue.length} dialogue lines (${Math.round(condCount283 / dialogue.length * 100)}%) contain conditional constructions ("if", "unless", "might", "could", "would"). Pervasive hedging makes characters sound uncommitted — they speak in hypotheticals rather than making demands, stating facts, or drawing lines.`,
        suggestedFix: 'Replace hedged lines with direct statements, demands, or declarations. Reserve conditionals for specific dramatic purposes: ultimatums, genuine uncertainty, or deliberate evasion. Characters who speak in conditionals feel passive; characters who commit feel alive.',
      });
    }
  }

  // ── Wave 283: DIALOGUE_OPENER_MONOTONY ───────────────────────────────────
  // A single word opens more than 30% of substantive dialogue lines.
  // When characters constantly begin their lines the same way ("Well,",
  // "Look,", "I think", "You know"), the dialogue acquires a tic-like
  // rhythm. Readers notice the repetition as a craft flaw rather than
  // experiencing the character's voice. Requires 12+ dialogue lines and
  // 8+ substantive lines (4+ words each).
  if (dialogue.length >= 12) {
    const substantive283 = dialogue.filter(d => d.line.trim().split(/\s+/).length >= 4);
    if (substantive283.length >= 8) {
      const openerCounts283 = new Map<string, number>();
      for (const d of substantive283) {
        const firstWord283 = d.line.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g, '');
        if (firstWord283.length > 0) {
          openerCounts283.set(firstWord283, (openerCounts283.get(firstWord283) ?? 0) + 1);
        }
      }
      const maxOpenerCount283 = Math.max(...openerCounts283.values());
      if (maxOpenerCount283 / substantive283.length > 0.30) {
        const topOpener283 = [...openerCounts283.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_OPENER_MONOTONY',
          severity: 'minor',
          description: `The word "${topOpener283}" opens ${maxOpenerCount283} of ${substantive283.length} substantive dialogue lines (${Math.round(maxOpenerCount283 / substantive283.length * 100)}%). Repeated sentence-openers create a tic-like rhythm that reads as a craft flaw — audiences notice the pattern rather than the character's voice.`,
          suggestedFix: `Vary how characters begin their lines. Instead of always starting with "${topOpener283}", let them open with action verbs, questions, names, interjections, or mid-thought fragments. Each opening word signals the character\'s emotional posture; monotony flattens that signal.`,
        });
      }
    }
  }

  // ── Wave 297: CONTRACTION_STARVATION ──────────────────────────────────────
  // The dialogue uses formal full-forms ("do not", "cannot", "I am", "it is")
  // at least 5 times but contains zero contractions anywhere. Spoken English
  // contracts by default; dialogue that never does reads as written prose
  // recited aloud — every character sounds like a formal letter. A single
  // uncontracted form is emphasis ("I did NOT do that"); systematic absence
  // is a register error. Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const fullFormRe297 = /\b(do not|does not|did not|cannot|can not|will not|would not|should not|could not|is not|are not|was not|were not|have not|has not|had not|I am|you are|we are|they are|it is|that is|there is)\b/i;
    const contractionRe297 = /\b\w+(n't|'re|'ll|'ve|'d)\b|\b(I'm|it's|that's|there's|he's|she's|what's|who's|let's)\b/i;
    const fullFormCount297 = dialogue.filter(d => fullFormRe297.test(d.line)).length;
    const hasAnyContraction297 = dialogue.some(d => contractionRe297.test(d.line));
    if (fullFormCount297 >= 5 && !hasAnyContraction297) {
      issues.push({
        location: 'Dialogue register',
        rule: 'CONTRACTION_STARVATION',
        severity: 'minor',
        description: `${fullFormCount297} dialogue lines use formal full-forms ("do not", "cannot", "I am") and the script contains zero contractions — every character speaks in written-prose register. Spoken English contracts by default; systematic absence of contractions makes all dialogue sound recited rather than spoken, and erases a key tool for distinguishing character voices.`,
        suggestedFix: 'Contract by default ("don\'t", "can\'t", "I\'m") and reserve full forms for deliberate emphasis: "I did not touch it" lands as insistence precisely because the surrounding dialogue contracts. If one character must speak formally (a lawyer, an aristocrat, a non-native speaker), make that a deliberate contrast against everyone else.',
      });
    }
  }

  // ── Wave 297: APOLOGY_LOOP ────────────────────────────────────────────────
  // More than 20% of dialogue lines contain an apology ("sorry", "I apologize",
  // "forgive me", "my apologies"). When characters apologize constantly, the
  // dialogue becomes a loop of social repair with no one ever standing firm —
  // apology is deference, and pervasive deference removes the friction that
  // drama needs. Requires 10+ dialogue lines.
  if (dialogue.length >= 10) {
    const apologyRe297 = /\b(sorry|i apologi[zs]e|forgive me|my apologies|i beg your pardon)\b/i;
    const apologyCount297 = dialogue.filter(d => apologyRe297.test(d.line)).length;
    if (apologyCount297 / dialogue.length > 0.20) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'APOLOGY_LOOP',
        severity: 'minor',
        description: `${apologyCount297} of ${dialogue.length} dialogue lines (${Math.round(apologyCount297 / dialogue.length * 100)}%) contain an apology. Characters who constantly apologize are constantly deferring — the dialogue becomes a loop of social repair in which no one holds their ground. Apology dissolves conflict on contact; a script saturated with it has no sustained friction.`,
        suggestedFix: 'Cut most apologies and let characters stand behind what they said or did. When an apology must stay, make it costly: a character who never apologizes finally doing so is a scene; a character who apologizes every other line is a tic. Replace reflexive "sorry" with deflection, justification, or silence.',
      });
    }
  }

  // ── Wave 297: DIALOGUE_REPEATED_LINE ─────────────────────────────────────
  // The same substantive dialogue line (4+ words) is spoken verbatim three or
  // more times across the script. Unlike DIALOGUE_MIRROR_SYNDROME (adjacent
  // speakers echoing each other within an exchange), this catches global
  // copy-paste repetition: a line recurring across scenes word-for-word reads
  // as a generation or revision artifact unless it is a deliberate refrain.
  // Requires 12+ dialogue lines.
  if (dialogue.length >= 12) {
    const lineCounts297 = new Map<string, number>();
    for (const d of dialogue) {
      const norm297 = d.line.trim().toLowerCase().replace(/[^a-z0-9' ]/g, '');
      if (norm297.split(/\s+/).length >= 4) {
        lineCounts297.set(norm297, (lineCounts297.get(norm297) ?? 0) + 1);
      }
    }
    const repeated297 = [...lineCounts297.entries()].filter(([, c]) => c >= 3);
    if (repeated297.length > 0) {
      const [topLine297, topCount297] = repeated297.sort((a, b) => b[1] - a[1])[0];
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_REPEATED_LINE',
        severity: 'minor',
        description: `The line "${topLine297}" is spoken verbatim ${topCount297} times across the script${repeated297.length > 1 ? ` (and ${repeated297.length - 1} other line(s) also repeat 3+ times)` : ''}. A word-for-word recurring line reads as a copy-paste artifact unless it is a deliberate refrain — and a refrain only works when each repetition lands in a transformed context that changes its meaning.`,
        suggestedFix: 'Either vary the repetitions (same intent, different words — characters rarely phrase a thought identically twice) or make the refrain intentional: repeat the line at structurally significant moments where the changed circumstances give the same words a new meaning. An accidental echo is a flaw; an engineered one is a motif.',
      });
    }
  }

  // ── Wave 311: DIALOGUE_HEDGE_SATURATION ───────────────────────────────────
  // More than 30% of dialogue lines contain a softener/hedge word anywhere in
  // the line ("just", "maybe", "sort of", "I think", "I guess", "kind of",
  // "probably"). Pervasive hedging makes every character sound tentative and
  // unwilling to commit — the dialogue equivalent of qualifying every sentence.
  // Distinct from FILLER_OPENER_OVERUSE (opener interjections like "Well,") and
  // DIALOGUE_CONDITIONAL_OVERLOAD (if/unless/might/could/would): this audits
  // body-wide softener density with a disjoint word set. Requires 10+ lines.
  if (dialogue.length >= 10) {
    const hedgeRe311 = /\b(just|maybe|perhaps|probably|somewhat|sort of|kind of|you know|a little|i guess|i suppose|i think|i mean)\b/i;
    const hedgeCount311 = dialogue.filter(d => hedgeRe311.test(d.line)).length;
    if (hedgeCount311 / dialogue.length > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_HEDGE_SATURATION',
        severity: 'minor',
        description: `${hedgeCount311} of ${dialogue.length} dialogue lines (${Math.round(hedgeCount311 / dialogue.length * 100)}%) contain a softener ("just", "maybe", "sort of", "I think"). Pervasive hedging makes every character sound tentative and uncommitted — the dialogue qualifies itself out of any conviction, and no one ever simply states what they want or believe.`,
        suggestedFix: 'Strip the softeners and let characters commit: "I just think maybe we should probably go" → "We go now." Reserve hedging for characters whose evasiveness is the point, and even then use it sparingly — a single qualifier lands when it is not buried among a dozen others.',
      });
    }
  }

  // ── Wave 311: DIALOGUE_FILLER_SOUND_OVERUSE ──────────────────────────────
  // Three or more dialogue lines contain a vocalized hesitation sound ("um",
  // "uh", "er", "erm", "hmm", "uh-huh"). Written-in filler sounds are a blunt
  // way to signal hesitation that reads as transcription rather than craft;
  // recurring across the script they become a tic. Distinct from FILLER_OPENER_
  // OVERUSE (word interjections "Well,"/"Look,"/"Listen,") — the sound set is
  // disjoint. Requires 8+ dialogue lines.
  if (dialogue.length >= 8) {
    const fillerSoundRe311 = /\b(um|uh|erm|hmm|uh-huh|mm-hmm|er)\b/i;
    const fillerSoundLines311 = dialogue.filter(d => fillerSoundRe311.test(d.line)).length;
    if (fillerSoundLines311 >= 3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_FILLER_SOUND_OVERUSE',
        severity: 'minor',
        description: `${fillerSoundLines311} dialogue lines contain a vocalized hesitation sound ("um", "uh", "er", "hmm"). Written-in filler sounds signal hesitation by transcription rather than by craft; recurring across the script they read as a verbal tic the page never trims, and they slow every exchange that carries one.`,
        suggestedFix: 'Cut the filler sounds and convey hesitation through what the character does instead — a beat of silence, an action line, an incomplete sentence. If a stammer is essential to a specific moment, keep one and remove the rest so the one that stays actually registers.',
      });
    }
  }

  // ── Wave 311: DIALOGUE_ONE_WORD_DOMINANCE ─────────────────────────────────
  // More than 35% of dialogue lines are a single word ("Yes." "No." "What?"
  // "Stop."). A machine-gun run of one-word lines reads as a chatbot exchange
  // rather than conversation — no character ever develops a thought, and the
  // scene becomes a volley of reflexes. Distinct from DIALOGUE_STACCATO_OVERUSE
  // (≤5-word lines at >65%) and voice's DIALOGUE_MONOSYLLABLE_DOMINANCE
  // (word character-length): this is a line-level one-word count. Requires
  // 10+ dialogue lines.
  if (dialogue.length >= 10) {
    const oneWordCount311 = dialogue.filter(
      d => d.line.trim().split(/\s+/).filter(Boolean).length === 1,
    ).length;
    if (oneWordCount311 / dialogue.length > 0.35) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_ONE_WORD_DOMINANCE',
        severity: 'minor',
        description: `${oneWordCount311} of ${dialogue.length} dialogue lines (${Math.round(oneWordCount311 / dialogue.length * 100)}%) are a single word. A run of one-word lines reads as a reflex volley rather than a conversation — no character develops a thought, builds an argument, or reveals themselves through how they say something.`,
        suggestedFix: 'Let characters complete thoughts. Reserve one-word lines for genuine punch — a flat "No." after a plea — and surround them with lines that carry intent and subtext. A monosyllable lands hardest when it interrupts speech, not when it is the only register the scene has.',
      });
    }
  }

  // ── Wave 325: DIALOGUE_EXPLETIVE_OPENER_OVERUSE, DIALOGUE_ABSOLUTE_OVERUSE, DIALOGUE_WITHIN_LINE_WORD_ECHO ──

  // DIALOGUE_EXPLETIVE_OPENER_OVERUSE (minor, ≥10 lines, >25%): More than 25%
  // of dialogue lines begin with an expletive/dummy-subject construction
  // ("There's…", "It's…", "Here's…", "There was…"). Expletive openers delay the
  // real subject and drain a line of agency — "There's a problem" instead of
  // "We have a problem" or "The bridge is out." Distinct from FILLER_OPENER_
  // OVERUSE (interjections "Well,"/"Look,"), DIALOGUE_OPENER_MONOTONY (a single
  // repeated word), and voice's conjunction opener: this targets dummy subjects.
  if (dialogue.length >= 10) {
    const expletiveRe325 = /^(there'?s|there is|there are|there was|there were|it'?s|it is|it was|here'?s|here is)\b/i;
    const expletiveCount325 = dialogue.filter(d => expletiveRe325.test(d.line.trim())).length;
    if (expletiveCount325 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_EXPLETIVE_OPENER_OVERUSE',
        severity: 'minor',
        description: `${expletiveCount325} of ${dialogue.length} dialogue lines (${Math.round(expletiveCount325 / dialogue.length * 100)}%) begin with an expletive construction ("There's…", "It's…", "Here's…"). Dummy-subject openers delay the real subject and drain a line of agency — "There's a problem" holds the speaker at arm's length from the trouble, where "The deal is dead" or "We're trapped" puts them in it.`,
        suggestedFix: 'Recast expletive openers around a real subject and an active verb: "There is someone at the door" → "Someone\'s at the door" or, sharper, "He found us." The dummy subject is almost always cuttable, and cutting it makes the line land faster and harder.',
      });
    }
  }

  // DIALOGUE_ABSOLUTE_OVERUSE (minor, ≥10 lines, >30%): More than 30% of
  // dialogue lines contain a universal/absolute term ("always", "everyone",
  // "everything", "completely", "totally", "absolutely", "forever",
  // "constantly", "entirely"). Dialogue saturated with absolutes reads as
  // hyperbole — every character speaks in totalizing extremes, so nothing is
  // measured and no claim carries weight. Distinct from voice's NEGATION_
  // SATURATION (a disjoint set: no/not/never/nothing) and DIALOGUE_HEDGE_
  // SATURATION (the opposite register — softeners). Requires 10+ lines.
  if (dialogue.length >= 10) {
    const absoluteRe325 = /\b(always|everyone|everybody|everything|everywhere|completely|totally|absolutely|forever|constantly|entirely|every single (time|day|one)|all the time)\b/i;
    const absoluteCount325 = dialogue.filter(d => absoluteRe325.test(d.line)).length;
    if (absoluteCount325 / dialogue.length > 0.3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_ABSOLUTE_OVERUSE',
        severity: 'minor',
        description: `${absoluteCount325} of ${dialogue.length} dialogue lines (${Math.round(absoluteCount325 / dialogue.length * 100)}%) contain an absolute term ("always", "everyone", "everything", "completely"). Dialogue saturated with universals reads as hyperbole — when every character speaks in totalizing extremes, nothing is measured and no claim carries weight, because the next line is just as absolute as the last.`,
        suggestedFix: 'Replace blanket absolutes with specifics: "You always do this" → "You did it again at dinner, in front of my mother." The concrete instance hits harder than the universal claim, and it gives the other character something precise to deny or defend.',
      });
    }
  }

  // DIALOGUE_WITHIN_LINE_WORD_ECHO (minor, ≥8 lines, ≥3 echo lines): Three or
  // more dialogue lines repeat the same word three or more times within a single
  // line ("No no no", "Run run run", "I want I want I want"). Within-line word
  // tripling is a stock shorthand for panic or insistence; used repeatedly it
  // becomes a tic that signals heightened emotion by typography rather than
  // craft. Distinct from DIALOGUE_REPEATED_LINE (whole lines repeated across the
  // script) and DIALOGUE_ONE_WORD_DOMINANCE (single-word lines). Requires 8+ lines.
  if (dialogue.length >= 8) {
    const echoLineCount325 = dialogue.filter(d => {
      const words325 = (d.line.toLowerCase().match(/[a-z']+/g) ?? []).filter(w => w.length >= 2);
      const freq325 = new Map<string, number>();
      for (const w of words325) freq325.set(w, (freq325.get(w) ?? 0) + 1);
      return [...freq325.values()].some(v => v >= 3);
    }).length;
    if (echoLineCount325 >= 3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_WITHIN_LINE_WORD_ECHO',
        severity: 'minor',
        description: `${echoLineCount325} dialogue lines repeat a single word three or more times within the line ("No no no", "Run run run"). Within-line word tripling is a stock shorthand for panic or insistence; recurring across the script it becomes a tic that signals heightened emotion through typography rather than through what is actually said or done.`,
        suggestedFix: 'Reserve the word-tripling for one genuine peak of panic and convey urgency elsewhere through content and action — a clipped command, an unfinished sentence, a physical beat. Repetition lands when it is rare; when every charged line triples a word, the device stops reading as emotion and starts reading as formatting.',
      });
    }
  }

  // ── Wave 336: DIALOGUE_QUESTION_FLOOD, DIALOGUE_NEGATIVE_OPENER_FLOOD, DIALOGUE_MIDSENTENCE_CAPS_FLOOD ──

  // DIALOGUE_QUESTION_FLOOD (minor, ≥10 lines, >35%): More than 35% of all
  // dialogue lines end with a question mark — the script runs on interrogation.
  // Without declarative lines to anchor exchange, dialogue reads like an interview
  // rather than a conversation: characters only seek, never assert, never decide.
  // Distinct from DIALOGUE_QUESTION_CLUSTER (3+ consecutive questions in a row)
  // and TAG_QUESTION_OVERUSE (the specific appended "…isn't it?" form).
  if (dialogue.length >= 10) {
    const questionCount336 = dialogue.filter(d => d.line.trimEnd().endsWith('?')).length;
    if (questionCount336 / dialogue.length > 0.35) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_QUESTION_FLOOD',
        severity: 'minor',
        description: `${questionCount336} of ${dialogue.length} dialogue lines (${Math.round(questionCount336 / dialogue.length * 100)}%) end with a question mark — more than a third of all dialogue is interrogative. Without declarative lines to anchor the exchange, the conversation reads as an interview rather than a scene: characters perpetually seek without asserting, committing to a position, or driving an action forward.`,
        suggestedFix: "Balance the question load: characters who never declare, insist, or state are passive in their own story. Recasting some questions as statements or demands shifts the power dynamic and creates the assertion–challenge tension that makes dialogue feel alive. Reserve dense question runs for scenes of genuine uncertainty or interrogation.",
      });
    }
  }

  // DIALOGUE_NEGATIVE_OPENER_FLOOD (minor, ≥10 lines, >30%): More than 30% of
  // dialogue lines open with a negative word or contraction — "No", "Not",
  // "Never", "Don't", "Can't", "Won't", etc. When a third of all dialogue begins
  // with refusal or denial, the tone is uniformly combative and the audience loses
  // contrast: there is no baseline of agreement or openness to make the negations
  // land. Distinct from NEGATION_SATURATION in voice.ts (checks "no/not/never/
  // nothing" anywhere in the line) and CONTRACTION_STARVATION (missing contractions).
  if (dialogue.length >= 10) {
    const negOpenerRe336 = /^(no\b|not\b|never\b|none\b|nothing\b|nobody\b|nowhere\b|don't|can't|won't|isn't|doesn't|didn't|couldn't|wouldn't|shouldn't|haven't|hasn't|hadn't|aren't|wasn't|weren't)/i;
    const negOpenerCount336 = dialogue.filter(d => negOpenerRe336.test(d.line.trimStart())).length;
    if (negOpenerCount336 / dialogue.length > 0.3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_NEGATIVE_OPENER_FLOOD',
        severity: 'minor',
        description: `${negOpenerCount336} of ${dialogue.length} dialogue lines (${Math.round(negOpenerCount336 / dialogue.length * 100)}%) open with a negative word or contraction ("No", "Not", "Never", "Don't", "Can't", etc.). When a third of all dialogue begins with refusal or denial, the tone is uniformly combative — without a baseline of agreement or openness, the negations lose their force and the scene reads as characters simply blocking each other rather than genuinely conflicting.`,
        suggestedFix: "Vary the entry points: characters who always open with refusal never reveal what they do want, what they fear, or what they believe. Let some lines begin with assertion, admission, or question — the negotiation between yes and no is what creates dramatic texture. Reserve negative openers for moments where the denial itself carries the most weight.",
      });
    }
  }

  // DIALOGUE_MIDSENTENCE_CAPS_FLOOD (minor, ≥8 lines, ≥4 lines): Four or more
  // dialogue lines contain a word of three or more consecutive uppercase letters
  // that appears after the first word of the line — the writer shouts emphasis
  // typographically ("I TOLD you", "You simply CANNOT", "We NEED to leave"). Used
  // sparingly, ALL-CAPS marks a single vocal peak; recurring across four or more
  // lines it signals that the writer is instructing the actor where to raise their
  // voice rather than writing lines whose urgency is already in the words and rhythm.
  // Distinct from EXCLAMATION_OVERUSE (which counts "!" marks) and
  // ONE_WORD_LINE_DOMINANCE (single-word lines).
  if (dialogue.length >= 8) {
    const capsCount336 = dialogue.filter(d => {
      const words336 = d.line.split(/\s+/);
      return words336.slice(1).some((w: string) => /^[A-Z]{3,}$/.test(w.replace(/[^A-Za-z]/g, '')));
    }).length;
    if (capsCount336 >= 4) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_MIDSENTENCE_CAPS_FLOOD',
        severity: 'minor',
        description: `${capsCount336} dialogue lines contain a mid-sentence ALL-CAPS word ("I TOLD you", "You simply CANNOT", "We NEED to leave"). ALL-CAPS mid-sentence is an actor direction embedded in the line — it tells the performer where to shout rather than writing words whose pressure is already felt in the rhythm and word choice. Recurring across four or more lines, it becomes a typographic tic that signals emotion rather than conveying it.`,
        suggestedFix: "Reserve ALL-CAPS emphasis for one genuine vocal peak in the script and convey urgency elsewhere through sentence structure, word choice, and rhythm. A shorter, better-chosen sentence often hits harder than a shouted word. If the line needs the caps to feel urgent, the line itself needs rewriting.",
      });
    }
  }

  // ── Wave 350: DIALOGUE_YOU_OPENER_FLOOD, DIALOGUE_THANKS_OVERUSE, DIALOGUE_SELF_REFERENCE ──

  // DIALOGUE_YOU_OPENER_FLOOD (minor, ≥10 lines, >30%): More than 30% of dialogue
  // lines begin with "You". When most lines open by pointing at the listener, every
  // exchange reads as accusation or instruction — the dialogue acquires a uniform
  // confrontational pitch and the speakers never turn the lens on themselves. A scene
  // built entirely of "You did", "You always", "You need to" has no give, only push.
  // Distinct from PRONOUN_I_OVERLOAD (first-person "I" openers), DIALOGUE_NEGATIVE_
  // OPENER_FLOOD (negations), and DIALOGUE_ABSOLUTE_OVERUSE ("always"/"never" anywhere
  // in the line).
  if (dialogue.length >= 10) {
    const youOpenerCount350 = dialogue.filter(d => /^you\b/i.test(d.line.trim())).length;
    if (youOpenerCount350 / dialogue.length > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_YOU_OPENER_FLOOD',
        severity: 'minor',
        description: `${youOpenerCount350} of ${dialogue.length} dialogue lines (${Math.round(youOpenerCount350 / dialogue.length * 100)}%) begin with "You". When most lines open by pointing at the listener, every exchange reads as accusation or instruction — the dialogue acquires a uniform confrontational pitch and the speakers never turn the lens on themselves. A scene built of "You did", "You always", "You need to" has no give, only push, and the relentless second-person address flattens the texture.`,
        suggestedFix: 'Vary the grammatical subject: let some lines begin with "I", with a shared "we", or with the thing itself rather than the person blamed for it. A character who can only speak in accusations reveals nothing of their own stake — rebalancing toward first person and concrete subjects restores the give-and-take.',
      });
    }
  }

  // DIALOGUE_THANKS_OVERUSE (minor, ≥8 lines, ≥3 thanks lines): Three or more dialogue
  // lines are expressions of gratitude ("Thank you", "Thanks", "I appreciate it", "Much
  // obliged"). Like greetings and apologies, rote thanks is social lubricant that real
  // scenes cut past — repeated gratitude is politeness filler that softens the dialogue
  // and rarely carries dramatic charge. Distinct from GREETING_RITUAL_OVERUSE (hellos
  // and farewells), APOLOGY_LOOP ("sorry"), and SYCOPHANTIC_AGREEMENT (capitulation):
  // this targets the specific gratitude register.
  if (dialogue.length >= 8) {
    const thanksRe350 = /^(thank you|thanks|thank god|thanks a lot|many thanks|much obliged|i appreciate (it|that|you)|i'?m (so |really )?grateful|cheers)\b/i;
    const thanksCount350 = dialogue.filter(d => thanksRe350.test(d.line.trim())).length;
    if (thanksCount350 >= 3) {
      issues.push({
        location: `${thanksCount350} gratitude line(s)`,
        rule: 'DIALOGUE_THANKS_OVERUSE',
        severity: 'minor',
        description: `${thanksCount350} dialogue lines are expressions of gratitude ("Thank you", "Thanks", "I appreciate it"). Like greetings and apologies, rote thanks is social lubricant real scenes cut past — repeated gratitude is politeness filler that softens the exchange and rarely carries dramatic charge. A script that keeps staging the thank-yous spends lines on courtesy rather than conflict or intent.`,
        suggestedFix: 'Cut most expressions of gratitude or convert them into something with subtext — a thanks that is really a dismissal, a "much obliged" that drips with resentment. Reserve genuine gratitude for the one moment it costs the character something to say it; as a reflex it is dead air.',
      });
    }
  }

  // DIALOGUE_SELF_REFERENCE (minor, ≥8 lines, ≥3 lines, >20%): Three or more dialogue
  // lines (and more than 20% of all lines) contain the speaker's own name — a character
  // referring to themselves in the third person (illeism). Used once it can characterize
  // grandiosity or detachment; recurring across many lines it reads as an authorial tic
  // rather than a deliberate voice choice, and it breaks the naturalism of speech.
  // Distinct from VOCATIVE_NAME_OVERUSE (a speaker naming OTHER characters) — this audits
  // a speaker naming themselves. Requires 2+ named speakers so the names are meaningful.
  if (dialogue.length >= 8) {
    const speakerNames350 = new Set(
      dialogue.map(d => d.speaker.toLowerCase()).filter(n => n.length >= 3),
    );
    if (speakerNames350.size >= 2) {
      let selfRefLines350 = 0;
      for (const d of dialogue) {
        const self = d.speaker.toLowerCase();
        if (self.length < 3) continue;
        const re = new RegExp(`\\b${self.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (re.test(d.line.toLowerCase())) selfRefLines350++;
      }
      if (selfRefLines350 >= 3 && selfRefLines350 / dialogue.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_SELF_REFERENCE',
          severity: 'minor',
          description: `${selfRefLines350} of ${dialogue.length} dialogue lines (${Math.round(selfRefLines350 / dialogue.length * 100)}%) have a character refer to themselves by name (illeism). Used once, third-person self-reference can characterize grandiosity or detachment; recurring across many lines it reads as an authorial tic rather than a deliberate voice choice, and it breaks the naturalism of how people actually speak about themselves.`,
          suggestedFix: 'Replace most third-person self-references with "I" and "me". If a character\'s illeism is a deliberate trait (ego, dissociation, performance), keep it sparing and pointed so it reads as character rather than habit; otherwise let them speak in the first person like everyone else.',
        });
      }
    }
  }

  // ── Wave 364: DIALOGUE_FIRST_PERSON_SATURATION, DIALOGUE_PASSIVE_CONSTRUCT_FLOOD, DIALOGUE_PRESENT_PERFECT_FLOOD ──

  // DIALOGUE_FIRST_PERSON_SATURATION (minor, ≥10 lines, >40%): More than 40% of
  // dialogue lines begin with "I" or "My". When most speech opens in the first person,
  // characters report their own experiences and feelings rather than engaging with the
  // other person or the shared reality — dialogue becomes a sequence of parallel
  // self-reports rather than an exchange. Distinct from YOU_OPENER_FLOOD (second-person
  // openers) and DIALOGUE_OPENER_MONOTONY (any single word at >30%; this targets the
  // combined "I"/"My" first-person category at a higher 40% threshold with a specific
  // self-centeredness diagnosis).
  if (dialogue.length >= 10) {
    const firstPersonCount364 = dialogue.filter(d => /^(I\b|My\b)/i.test(d.line.trim())).length;
    if (firstPersonCount364 / dialogue.length > 0.40) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_FIRST_PERSON_SATURATION',
        severity: 'minor',
        description: `${firstPersonCount364} of ${dialogue.length} dialogue lines (${Math.round(firstPersonCount364 / dialogue.length * 100)}%) begin with "I" or "My" — almost every line opens by centering the speaker. When dialogue is this self-focused, characters report their own experiences rather than engaging with each other or the shared reality. The exchange becomes a sequence of parallel self-reports and the conversational texture flattens; listeners are addressed as audiences, not interlocutors.`,
        suggestedFix: 'Vary the grammatical subject: let characters begin some lines with "You", with the thing they are reacting to, or with no pronoun at all. The first word of a line sets the focus — when it is always "I" or "My", the scene is a duet of monologues rather than a conversation.',
      });
    }
  }

  // DIALOGUE_PASSIVE_CONSTRUCT_FLOOD (minor, ≥10 lines, >25%): More than 25% of
  // dialogue lines use a passive construction (auxiliary + past participle: "was told",
  // "has been done", "will be seen"). Passive dialogue is systematically agentless —
  // characters describe events without naming who caused them, which obscures
  // accountability and responsibility. In a confrontation, passive speech reads as
  // evasion; in exposition, it reads as bureaucratic distancing. Distinct from rhythm.ts
  // PASSIVE_VOICE (action lines, not dialogue) and from all other dialogue checks.
  if (dialogue.length >= 10) {
    const passiveRe364 = /\b(was|were|has been|have been|had been|is being|are being|will be)\s+\w+ed\b/i;
    const passiveCount364 = dialogue.filter(d => passiveRe364.test(d.line)).length;
    if (passiveCount364 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_PASSIVE_CONSTRUCT_FLOOD',
        severity: 'minor',
        description: `${passiveCount364} of ${dialogue.length} dialogue lines (${Math.round(passiveCount364 / dialogue.length * 100)}%) use a passive construction ("was told", "has been done", "will be seen"). Passive dialogue is systematically agentless — events happen without named causes, which obscures accountability and weakens confrontation. Characters who speak primarily in passive constructions sound like bureaucrats issuing disclaimers rather than people with stakes.`,
        suggestedFix: 'Activate the passive constructions: "I was told" → "She told me"; "It was decided" → "I decided" or "You decided". Active voice names the agent and the action and makes it possible to assign responsibility — which is what most dramatic scenes are ultimately about.',
      });
    }
  }

  // DIALOGUE_PRESENT_PERFECT_FLOOD (minor, ≥10 lines, >25%): More than 25% of
  // dialogue lines use the present perfect tense ("I have been", "she has told me",
  // "we have tried", "they have always"). The present perfect looks backward — it
  // describes a past action with current relevance. When most dialogue is in the
  // present perfect, characters are explaining the past rather than confronting the
  // present moment. The scene's urgency is displaced into backstory. Distinct from
  // FUTURE_TENSE_FLOOD (forward-looking tense), TALKING_HEADS (length), and all
  // other tense checks; this specifically targets backward-looking perfect tense.
  if (dialogue.length >= 10) {
    const perfectRe364 = /\b(i'?ve|you'?ve|she'?s|he'?s|we'?ve|they'?ve|i have|you have|she has|he has|we have|they have|it has|hasn'?t|haven'?t)\s+\w/i;
    const perfectCount364 = dialogue.filter(d => perfectRe364.test(d.line)).length;
    if (perfectCount364 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_PRESENT_PERFECT_FLOOD',
        severity: 'minor',
        description: `${perfectCount364} of ${dialogue.length} dialogue lines (${Math.round(perfectCount364 / dialogue.length * 100)}%) use the present perfect tense ("I've been", "She's told me", "We've tried"). The present perfect looks backward — it describes past actions with present relevance. When most dialogue is in this tense, characters are explaining the history rather than confronting each other now, and the scene's urgency is displaced from the room into backstory.`,
        suggestedFix: 'Ground dialogue in the present tense: "I\'ve been worried about you" → "I\'m worried about you". The present tense puts the confrontation in the room rather than in the past. Reserve the present perfect for lines where the pastness of the action matters dramatically; as a default register, it drains the scene of immediate stakes.',
      });
    }
  }

  // ── Wave 378: DIALOGUE_SUPERLATIVE_FLOOD, DIALOGUE_ANAPHORA_RUN, DIALOGUE_VERBAL_TIC_FLOOD ──

  // DIALOGUE_SUPERLATIVE_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue
  // lines carry a superlative ("best", "worst", "most", "greatest", "biggest"). Constant
  // superlatives push every statement to an extreme, so nothing can be merely good or bad —
  // it is always the most or the worst. The hyperbole flattens the emotional range and
  // drains the words of force through repetition. Distinct from DIALOGUE_ABSOLUTE_OVERUSE
  // ("always"/"never"/"everyone"/"completely" universals): this targets ranking superlatives.
  if (dialogue.length >= 10) {
    const superlativeRe378 = /\b(most|least|best|worst|greatest|biggest|smallest|hardest|easiest|strongest|weakest|fastest|slowest|richest|poorest|happiest|saddest|closest|furthest|farthest|finest)\b/i;
    const superlativeCount378 = dialogue.filter(d => superlativeRe378.test(d.line)).length;
    if (superlativeCount378 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_SUPERLATIVE_FLOOD',
        severity: 'minor',
        description: `${superlativeCount378} of ${dialogue.length} dialogue lines (${Math.round(superlativeCount378 / dialogue.length * 100)}%) carry a superlative ("best", "worst", "most", "greatest"). Constant superlatives push every statement to an extreme, so nothing can be merely good or bad — it is always the most or the worst. The hyperbole flattens the emotional range and the superlatives lose all force through repetition.`,
        suggestedFix: 'Reserve superlatives for the rare moment a character genuinely means the extreme, and let most statements sit at normal intensity. A character who calls everything "the worst" has nowhere to go when something truly is — calibrated language gives the peaks somewhere to stand out.',
      });
    }
  }

  // DIALOGUE_ANAPHORA_RUN (minor, ≥6 lines, ≥3 consecutive): Three or more consecutive
  // dialogue lines begin with the same word. Deliberate anaphora is a rhetorical device,
  // but when it surfaces unplanned across a run of lines it reads as a chant — the dialogue
  // locks into a repetitive opening cadence that signals the writer reached for the same
  // sentence frame each time. Distinct from DIALOGUE_OPENER_MONOTONY (a single word opening
  // >X% of ALL lines, scattered) and voice.ts DIALOGUE_REPEATED_OPENER_WORD: this targets a
  // consecutive run specifically.
  if (dialogue.length >= 6) {
    const firstWord378 = (s: string): string => {
      const m = s.trim().toLowerCase().match(/^([a-z']+)/);
      return m ? m[1] : '';
    };
    let runStart378 = 0;
    let maxRun378 = 1;
    let maxRunWord378 = '';
    for (let i378 = 1; i378 < dialogue.length; i378++) {
      const prev378 = firstWord378(dialogue[i378 - 1].line);
      const cur378 = firstWord378(dialogue[i378].line);
      if (cur378 && cur378 === prev378) {
        const runLen378 = i378 - runStart378 + 1;
        if (runLen378 > maxRun378) { maxRun378 = runLen378; maxRunWord378 = cur378; }
      } else {
        runStart378 = i378;
      }
    }
    if (maxRun378 >= 3 && maxRunWord378) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_ANAPHORA_RUN',
        severity: 'minor',
        description: `A run of ${maxRun378} consecutive dialogue lines all begin with the same word ("${maxRunWord378}..."). Deliberate anaphora is a rhetorical device, but surfacing unplanned across a run of lines it reads as a chant — the dialogue locks into a repetitive opening cadence that signals the writer reached for the same sentence frame each time rather than varying how each speaker enters their line.`,
        suggestedFix: `Vary the openings across the run: only one or two lines should start with "${maxRunWord378}" unless the repetition is a deliberate rhetorical build. Recasting the other lines to begin differently breaks the chant and restores the irregular rhythm of real speech.`,
      });
    }
  }

  // DIALOGUE_VERBAL_TIC_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue
  // lines carry a disclaimer-intensifier ("literally", "actually", "honestly", "basically",
  // "seriously", "frankly", "obviously"). These are verbal-tic words that pad a line and
  // pre-frame the statement rather than letting it stand — and unlike real speech, written
  // dialogue carries only the tics the writer deliberately included, so density makes every
  // character sound like they share one verbal habit. Distinct from DIALOGUE_HEDGE_SATURATION
  // (softeners like "just"/"maybe"/"sort of") and voice.ts DIALOGUE_DISCOURSE_MARKER_OPENER
  // (sentence-initial "Okay,"/"Alright,"): this targets mid-line disclaimer-intensifiers.
  if (dialogue.length >= 10) {
    const verbalTicRe378 = /\b(literally|actually|basically|honestly|seriously|frankly|obviously|clearly|technically|essentially|apparently|presumably|definitely)\b/i;
    const verbalTicCount378 = dialogue.filter(d => verbalTicRe378.test(d.line)).length;
    if (verbalTicCount378 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_VERBAL_TIC_FLOOD',
        severity: 'minor',
        description: `${verbalTicCount378} of ${dialogue.length} dialogue lines (${Math.round(verbalTicCount378 / dialogue.length * 100)}%) carry a disclaimer-intensifier ("literally", "actually", "honestly", "basically"). These verbal-tic words pad the line and pre-frame the statement rather than letting it stand. Written dialogue carries only the tics the writer deliberately included, so this density makes every character sound like they share one verbal habit, flattening their distinctness.`,
        suggestedFix: 'Cut most disclaimer-intensifiers and let the statements assert themselves: "I honestly don\'t know" → "I don\'t know." Reserve a tic like "literally" or "honestly" for one character as a deliberate trait if it characterizes them; as a default it is filler that dilutes every line.',
      });
    }
  }

  // ── Wave 392: DIALOGUE_EMOTION_NAMING, DIALOGUE_AMPLIFIER_FLOOD, DIALOGUE_TIME_MARKER_FLOOD ──

  // DIALOGUE_EMOTION_NAMING (minor, ≥8 lines, ≥3 lines): Three or more dialogue lines
  // state a feeling outright ("I'm angry", "I'm so scared", "I feel hurt"). Naming the
  // emotion is the on-the-nose form of feeling — it tells the audience what to register
  // instead of letting behavior, subtext, and choice convey it. A character who announces
  // their emotions leaves the actor nothing to play and the audience nothing to infer.
  // Distinct from ON_THE_NOSE (broad literalness), EMOTIONAL_SUPPRESSION (the opposite —
  // feeling withheld entirely), and TRAIT_LABELING (naming a character's traits).
  if (dialogue.length >= 8) {
    const emotionNamingRe392 = /\b(i'?m|i am|i feel|i'?m feeling|feeling)\s+(so\s+|really\s+|very\s+)?(angry|sad|scared|afraid|frightened|happy|hurt|upset|furious|terrified|nervous|anxious|lonely|jealous|miserable|devastated|heartbroken|ashamed|guilty|excited|thrilled|depressed|frustrated|worried|enraged|grief|heartbroken|overjoyed|crushed)\b/i;
    const emotionNamingCount392 = dialogue.filter(d => emotionNamingRe392.test(d.line)).length;
    if (emotionNamingCount392 >= 3) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_EMOTION_NAMING',
        severity: 'minor',
        description: `${emotionNamingCount392} dialogue lines state a feeling outright ("I'm angry", "I'm so scared", "I feel hurt"). Naming the emotion is the on-the-nose form of feeling — it tells the audience what to register instead of letting behavior, subtext, and choice convey it. A character who announces their emotions leaves the actor nothing to play and the audience nothing to infer.`,
        suggestedFix: 'Replace stated emotions with behavior that reveals them: "I\'m so angry" becomes a clipped silence, a controlled question, a glass set down too hard. Let the audience read the feeling off what the character does and avoids saying — the emotion lands harder when it is shown leaking out than when it is announced.',
      });
    }
  }

  // DIALOGUE_AMPLIFIER_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue lines
  // carry an amplifier ("very", "really", "totally", "absolutely", "completely",
  // "extremely"). Amplifiers inflate without sharpening — they signal the writer doesn't
  // trust the underlying word, and in density they make every line strain for emphasis until
  // none of it registers. Distinct from DIALOGUE_HEDGE_SATURATION (softeners like "just"/
  // "maybe"/"sort of") and DIALOGUE_VERBAL_TIC_FLOOD (disclaimers like "literally"/"actually"):
  // this targets degree-amplifying intensifiers.
  if (dialogue.length >= 10) {
    const amplifierRe392 = /\b(very|really|totally|absolutely|completely|extremely|incredibly|utterly|terribly|awfully|enormously|hugely)\b/i;
    const amplifierCount392 = dialogue.filter(d => amplifierRe392.test(d.line)).length;
    if (amplifierCount392 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_AMPLIFIER_FLOOD',
        severity: 'minor',
        description: `${amplifierCount392} of ${dialogue.length} dialogue lines (${Math.round(amplifierCount392 / dialogue.length * 100)}%) carry an amplifier ("very", "really", "totally", "absolutely"). Amplifiers inflate without sharpening — they signal the writer doesn't trust the underlying word, and in density they make every line strain for emphasis until none of it registers. "I'm very sure" is weaker than "I'm sure."`,
        suggestedFix: 'Delete amplifiers and let the bare statement carry the weight, or replace the amplifier-plus-weak-word with a single precise one: "really scared" → "terrified", "very big" → "enormous". If removing the amplifier weakens the line, the underlying word is the problem — fix the word, not the intensifier.',
      });
    }
  }

  // DIALOGUE_TIME_MARKER_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue lines
  // carry an explicit temporal reference ("yesterday", "tomorrow", "last night", "an hour
  // ago", "next week", "years ago"). Dialogue saturated with time markers is busy scheduling
  // and recapping — locating events on a timeline — rather than confronting the present
  // moment between the characters. The scene's urgency leaks into logistics. Distinct from
  // DIALOGUE_RETROSPECTIVE_FLOOD (lines that OPEN with "I remember"/"Back when"): this counts
  // mid-line temporal references in both directions.
  if (dialogue.length >= 10) {
    const timeMarkerRe392 = /\b(yesterday|tomorrow|tonight|last (night|week|month|year|time)|next (week|month|year|time)|an? (hour|day|week|month|year)s? ago|years? ago|this (morning|afternoon|evening)|a (minute|moment|second)s? ago|in a (minute|moment|second|week|month|year))\b/i;
    const timeMarkerCount392 = dialogue.filter(d => timeMarkerRe392.test(d.line)).length;
    if (timeMarkerCount392 / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_TIME_MARKER_FLOOD',
        severity: 'minor',
        description: `${timeMarkerCount392} of ${dialogue.length} dialogue lines (${Math.round(timeMarkerCount392 / dialogue.length * 100)}%) carry an explicit temporal reference ("yesterday", "an hour ago", "next week"). Dialogue saturated with time markers is busy scheduling and recapping — locating events on a timeline — rather than confronting the present moment between the characters, so the scene's urgency leaks into logistics.`,
        suggestedFix: 'Cut most time markers and let the scene play in the present: the audience rarely needs the exact when. Reserve a temporal reference for the beat where the timing is the dramatic point — a deadline, a damning alibi — and trust the rest to unfold in the now.',
      });
    }
  }

  // ── Wave 406: DIALOGUE_VAGUE_NOUN_FLOOD, DIALOGUE_REPORTED_SPEECH_FLOOD, DIALOGUE_OATH_INTENSIFIER_FLOOD ──

  // DIALOGUE_VAGUE_NOUN_FLOOD (minor, ≥10 lines, >30%): More than 30% of dialogue lines lean
  // on an indefinite placeholder noun or pronoun ("thing", "things", "stuff", "something",
  // "someone", "somewhere", "somehow", "anything", "whatever"). Characters who speak in vague
  // pointers — "do the thing", "get the stuff", "something happened", "talk to someone" — never
  // name the concrete object of the scene, so the dialogue feels evasive or under-written and
  // the audience cannot picture what anyone is actually discussing. The placeholder set here is
  // deliberately disjoint from DIALOGUE_ABSOLUTE_OVERUSE (everyone/everything/always — totalizing
  // universals) and from voice's NEGATION_SATURATION (no/not/never/nothing): this targets the
  // indefinite-vagueness register, not the absolute or the negative one.
  if (dialogue.length >= 10) {
    const vagueNounRe406 = /\b(thing|things|stuff|something|someone|somebody|somewhere|somehow|anything|anybody|whatever|thingy|whatsit)\b/i;
    const vagueNounCount406 = dialogue.filter(d => vagueNounRe406.test(d.line)).length;
    if (vagueNounCount406 / dialogue.length > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_VAGUE_NOUN_FLOOD',
        severity: 'minor',
        description: `${vagueNounCount406} of ${dialogue.length} dialogue lines (${Math.round(vagueNounCount406 / dialogue.length * 100)}%) lean on an indefinite placeholder ("thing", "stuff", "something", "someone"). Characters who speak in vague pointers never name the concrete object of the scene — "do the thing", "get the stuff", "talk to someone" — so the dialogue reads as evasive or under-written and the audience cannot picture what anyone is actually discussing.`,
        suggestedFix: 'Replace placeholders with the specific noun the scene is really about: "Get the stuff" → "Get the morphine"; "Something happened" → "She found the letters." A concrete noun grounds the scene in a real object with real stakes; reserve deliberate vagueness for the beat where a character is genuinely evading, and make that evasion legible as a choice.',
      });
    }
  }

  // DIALOGUE_REPORTED_SPEECH_FLOOD (minor, ≥10 lines, >20%): More than 20% of dialogue lines
  // recount what someone else said ("he said", "she told me", "they say", "I told him", "she
  // goes", "he was like"). When characters spend the scene relaying off-page conversations, the
  // story recaps dialogue instead of enacting it — the dramatic exchange happened elsewhere, and
  // we are getting the minutes. Direct confrontation is replaced by hearsay, which drains the
  // present scene of agency. Distinct from DIALOGUE_TIME_MARKER_FLOOD (temporal references),
  // DIALOGUE_PASSIVE_CONSTRUCT_FLOOD (agentless "was told"), and DIALOGUE_PRESENT_PERFECT_FLOOD
  // (have/has done): this targets the speech-attribution / quotation-of-others pattern.
  if (dialogue.length >= 10) {
    const reportedSpeechRe406 = /\b(he|she|they|i|we|you)\s+(said|says|told|tells|asked|asks|replied|answered|mentioned|claimed|whispered|shouted|goes)\b|\btold\s+(me|him|her|them|us|you)\b|\b(was|were)\s+like\b|\bthey\s+say\b/i;
    const reportedSpeechCount406 = dialogue.filter(d => reportedSpeechRe406.test(d.line)).length;
    if (reportedSpeechCount406 / dialogue.length > 0.20) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_REPORTED_SPEECH_FLOOD',
        severity: 'minor',
        description: `${reportedSpeechCount406} of ${dialogue.length} dialogue lines (${Math.round(reportedSpeechCount406 / dialogue.length * 100)}%) recount what someone else said ("he said", "she told me", "they say"). When characters spend the scene relaying off-page conversations, the story recaps dialogue instead of enacting it — the real exchange happened elsewhere and we are getting the minutes. Confrontation is replaced by hearsay, draining the present scene of agency.`,
        suggestedFix: 'Dramatize the reported exchange instead of summarizing it: if what "she told me" matters, stage that scene; if it does not, cut the recap and let the present characters act on the information directly. Reserve reported speech for the beat where the act of relaying is itself the drama — a lie about what was said, a quote weaponized — not as the default mode of the scene.',
      });
    }
  }

  // DIALOGUE_OATH_INTENSIFIER_FLOOD (minor, ≥10 lines, >20%): More than 20% of dialogue lines
  // lean on a mild oath as an intensifier ("damn", "dammit", "hell", "the hell", "for god's
  // sake", "oh god", "jesus", "christ", "bloody"). When emphasis is routinely outsourced to
  // swearing, the oaths stop landing — profanity used as punctuation flattens into wallpaper,
  // and the one moment that should detonate has no charge left because every line already swore.
  // Distinct from DIALOGUE_AMPLIFIER_FLOOD (very/really/totally — degree amplifiers), DIALOGUE_
  // VERBAL_TIC_FLOOD (literally/actually/honestly — disclaimers), and EXCLAMATION_OVERUSE
  // (punctuation): this targets the oath/expletive lexical register specifically.
  if (dialogue.length >= 10) {
    const oathRe406 = /\b(damn|damn it|dammit|goddamn|goddammit|hell|the hell|for god'?s sake|for christ'?s sake|oh god|oh my god|my god|jesus|christ|good lord|bloody|for fuck'?s sake)\b/i;
    const oathCount406 = dialogue.filter(d => oathRe406.test(d.line)).length;
    if (oathCount406 / dialogue.length > 0.20) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_OATH_INTENSIFIER_FLOOD',
        severity: 'minor',
        description: `${oathCount406} of ${dialogue.length} dialogue lines (${Math.round(oathCount406 / dialogue.length * 100)}%) lean on a mild oath for emphasis ("damn", "hell", "oh god", "jesus"). When emphasis is routinely outsourced to swearing, the oaths stop landing — profanity used as punctuation flattens into wallpaper, so the one moment that should detonate has no charge left because every line already swore.`,
        suggestedFix: 'Strip the reflexive oaths and let the underlying words carry the weight, saving an expletive for the single beat where the character\'s composure genuinely cracks. Emphasis works by contrast: when most lines are clean, the one curse that breaks through registers as a real loss of control rather than as the character\'s ordinary speech rhythm.',
      });
    }
  }

  // ── Wave 420: DIALOGUE_INTERRUPT_FLOOD, DIALOGUE_EXCUSE_FLOOD, DIALOGUE_AFFIRMATION_FLOOD ──

  // DIALOGUE_INTERRUPT_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue lines end
  // with "--" (mid-sentence interruption). Interruptions are a powerful device when used
  // sparingly — they dramatize power dynamics (who gets to finish a sentence), overlapping
  // urgency, and characters who are not listening. But when more than a quarter of all lines
  // are truncated, "--" becomes a verbal tic rather than a device: nobody finishes a thought,
  // not because the drama demands constant interruption but because the writer has adopted
  // "--" as a default line ending. The interrupt loses its charge when it is the norm.
  // Distribution/bloat mode × interruption marker. Distinct from ELLIPSIS_OVERUSE (Wave 255:
  // trailing "..." — the trailing-off/hesitation register), DIALOGUE_FILLER_SOUND_OVERUSE
  // (Wave 311: um/uh vocalized hesitation), and DIALOGUE_ONE_WORD_DOMINANCE (short-line
  // dominance regardless of why the line is short): "--" specifically signals a cut from
  // outside rather than a fade-out or hesitation from within.
  if (dialogue.length >= 10) {
    const interruptCount420a = dialogue.filter(d => /--\s*$/.test(d.line)).length;
    if (interruptCount420a / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_INTERRUPT_FLOOD',
        severity: 'minor',
        description: `${interruptCount420a} of ${dialogue.length} dialogue lines (${Math.round(interruptCount420a / dialogue.length * 100)}%) end with "--" (mid-sentence interruption). When more than a quarter of all lines are truncated, the interruption stops being a dramatic device and becomes a verbal tic — nobody finishes a thought, not because the scene demands constant interruption but because "--" has become the script's default line ending. Power dynamics, urgency, and overlap are only legible through interruption when interruption is the exception.`,
        suggestedFix: 'Reserve "--" for the beats where interruption matters dramatically: the line the antagonist won\'t let the hero finish, the confession cut off by an alarm, the argument that escalates because nobody is listening. Strip the reflexive mid-sentence cuts and let characters complete their thoughts in most lines — the one interruption that breaks through will land harder against lines that were allowed to land.',
      });
    }
  }

  // DIALOGUE_EXCUSE_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue lines carry
  // an explicit rationalization or excuse pattern — "because", "that's why", "the reason is",
  // "I had to", "had no choice", "couldn't help it", "I didn't mean to". Characters who spend
  // more than a quarter of their lines justifying past decisions are living inside retrospective
  // self-defense rather than engaging the present scene: the dialogue is directed inward at
  // explaining what already happened rather than outward at confronting what is happening now.
  // When justification becomes the dominant register, subtext collapses — the script explains
  // motivation instead of dramatizing it. Valence mode × justification/rationalization register.
  // Distinct from DIALOGUE_CONDITIONAL_OVERLOAD (Wave 283: if/unless/might/could — hypothetical
  // future reasoning), DIALOGUE_HEDGE_SATURATION (Wave 311: "just"/"maybe" — uncertainty
  // softeners), and DIALOGUE_REPORTED_SPEECH_FLOOD (Wave 406: relaying what others said).
  if (dialogue.length >= 10) {
    const excuseRe420b = /\b(because|that'?s why|that is why|the reason (is|was|being)|i had (to|no choice)|had no choice|what was i supposed to|couldn'?t help (it|myself)|i didn'?t (mean|intend|want))\b/i;
    const excuseCount420b = dialogue.filter(d => excuseRe420b.test(d.line)).length;
    if (excuseCount420b / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_EXCUSE_FLOOD',
        severity: 'minor',
        description: `${excuseCount420b} of ${dialogue.length} dialogue lines (${Math.round(excuseCount420b / dialogue.length * 100)}%) carry a rationalization or excuse pattern ("because", "I had to", "that's why", "had no choice"). When over a quarter of all dialogue is self-justification, characters are living in retrospective defense rather than engaging the present scene. Subtext collapses: instead of implying motivation through action, the script explains it in words, draining tension and agency from every exchange.`,
        suggestedFix: 'Let characters act rather than explain. Strip the "because" clauses and "I had no choice" disclaimers and stage the consequence instead — if a character made a desperate choice, show what they do next rather than justifying what they already did. Reserve explicit rationalization for the single beat where a character\'s self-justification is itself the dramatic subject: the lie they tell themselves that the scene is designed to expose.',
      });
    }
  }

  // DIALOGUE_AFFIRMATION_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue lines are
  // pure bare assent — "yes", "okay", "sure", "right", "exactly", "absolutely", "of course",
  // "fine", "indeed", "alright", "yeah", "correct", "agreed", "certainly", "definitely",
  // "understood", "noted", "got it". When a quarter of all lines are nothing but agreement,
  // the dialogue has no friction: nobody pushes back, nobody redirects, nobody asserts a
  // position that creates resistance. Pure assent lines are often padding — the writer's way
  // of giving a character a turn without giving them a position. Dialogue without resistance
  // is scenery, not drama. Underweight/bloat mode × affirmation register. Distinct from
  // DIALOGUE_AGREEMENT_CHAIN (Wave 269: 3+ consecutive capitulations — consecutive structural
  // run; AFFIRMATION_FLOOD fires on overall proportion regardless of placement), DIALOGUE_ONE_
  // WORD_DOMINANCE (Wave 311: any single-word line — broad short-line pattern, not
  // semantically restricted to assent), and DIALOGUE_THANKS_OVERUSE (Wave 350: gratitude
  // specifically — a semantically narrower subset of affirmation).
  if (dialogue.length >= 10) {
    const affirmRe420c = /^(yes|yeah|yep|yup|okay|ok|sure|right|exactly|absolutely|of course|fine|indeed|alright|all right|correct|agreed|certainly|definitely|understood|roger|affirmative|fair enough|noted|copy that|got it)[.!]?$/i;
    const affirmCount420c = dialogue.filter(d => affirmRe420c.test(d.line.trim())).length;
    if (affirmCount420c / dialogue.length > 0.25) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_AFFIRMATION_FLOOD',
        severity: 'minor',
        description: `${affirmCount420c} of ${dialogue.length} dialogue lines (${Math.round(affirmCount420c / dialogue.length * 100)}%) are pure bare assent ("yes", "okay", "sure", "exactly", "absolutely", "of course"). When over a quarter of all lines are nothing but agreement, the dialogue has no friction — nobody pushes back, asserts a position, or redirects the exchange. Pure assent lines are padding: giving a character a turn without a position. Dialogue without resistance is scenery, not drama.`,
        suggestedFix: 'Replace reflex affirmations with a qualification, a redirect, or a counter-assertion: "Yes, but—", "Sure, if you ignore the part where—", "Okay, then what about—". Reserve pure assent for the dramatic beat where a character\'s capitulation means something — the moment they stop fighting is only powerful when they had been fighting. If a beat only needs acknowledgment, cut the line and use action instead.',
      });
    }
  }

  // ── Wave 434: DIALOGUE_TENSION_PEAK_SILENT, DIALOGUE_CLIMAX_VOID, DIALOGUE_HEDGE_FRONT_LOADED ──

  // DIALOGUE_TENSION_PEAK_SILENT (minor, n≥8, dlg≥10, peakSuspense≥2, peakPos≥1):
  // The scene with the story's highest suspenseDelta contains no dialogue. The
  // moment of peak narrative tension is entirely silent — no character speaks
  // when the story is at its most gripped. Film dialogue is most powerful under
  // pressure: a confession at gunpoint, a vow during a chase, a revelation in the
  // burning house. When the peak-suspense scene passes in complete silence, the
  // most charged delivery slot for a spoken line goes unused, and what a character
  // says (or cannot say) under maximum pressure is never dramatized. Single-peak
  // isolation × backward-cause mode (looking backward from the structural peak to
  // check whether a character voice was present). Distinct from TALKING_HEADS (runs
  // of dialogue without physical action — the opposite absence), DIALOGUE_DENSITY_
  // INVERSION (Act-level density ratio, not a single peak scene), and EMOTIONAL_
  // SUPPRESSION (what is said — a text-pattern check): this is the first check in
  // the pass to use suspenseDelta to isolate the structural peak and audit for
  // the presence of speech at that exact moment.
  if (records.length >= 8 && dialogue.length >= 10) {
    let peakPos434a = -1;
    let peakVal434a = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const sd = (records[i] as any).suspenseDelta ?? 0;
      if (sd > peakVal434a) { peakVal434a = sd; peakPos434a = i; }
    }
    if (peakPos434a >= 1 && peakVal434a >= 2) {
      const peakSceneIdx434a = (records[peakPos434a] as any).sceneIdx;
      const lineToScene434a = buildLineToSceneMap(fountain);
      const peakHasDlg434a = dialogue.some(d => (lineToScene434a[d.lineNum - 1] ?? 0) === peakSceneIdx434a);
      if (!peakHasDlg434a) {
        issues.push({
          location: `Scene ${peakSceneIdx434a} — peak suspense, no dialogue`,
          rule: 'DIALOGUE_TENSION_PEAK_SILENT',
          severity: 'minor',
          description: `Scene ${peakSceneIdx434a} carries the story's highest suspenseDelta (${peakVal434a.toFixed(2)}) but contains no dialogue — the most gripped moment of the story passes in complete silence. Film dialogue is most powerful under pressure: a question the character cannot hold back, a declaration they can no longer swallow, a fragment cut off by the crisis. When the peak-suspense scene is entirely unspoken, the most charged delivery slot for a voice goes empty.`,
          suggestedFix: `Add at least one line of dialogue to the peak-tension scene: a question asked at the worst possible moment, a vow or denial forced by the crisis, or a fragment of speech cut off before it finishes. A character who speaks under maximum pressure concentrates the scene's energy in a way that silence alone cannot — and what they manage to say (or fail to say) becomes the line the audience remembers.`,
        });
      }
    }
  }

  // DIALOGUE_CLIMAX_VOID (minor, n≥10, dlg≥15, ≥10 early-dialogue lines): The
  // final 20% of scenes — the climax and denouement zone — contains no dialogue
  // lines at all, even though the earlier story carries substantial verbal content.
  // When the ending is rendered entirely in action without a single spoken line,
  // the resolution plays out as pure spectacle: characters never voice what they
  // believe, what they have lost, or what the events mean. Film endings gain much
  // of their resonance from a character speaking directly at the turning point —
  // a declaration, a question, a silence broken just once at the decisive moment.
  // A climax that never opens its mouth resolves the plot while leaving the story's
  // human stakes unspoken. Zone presence/absence mode × climax zone. Distinct from
  // NO_DIALOGUE (fires when the ENTIRE script has zero dialogue — the most extreme
  // condition; this fires when dialogue is present elsewhere but entirely absent
  // from the final 20%), LAST_ACT_EXPOSITION_SPIKE (checks for too much expository
  // dialogue in Act 3, not absence of dialogue), and DIALOGUE_DENSITY_INVERSION
  // (compares Act-level density ratios): this is the first zone-silence check in
  // the pass — the first to require dialogue's complete absence from a specific
  // structural zone while confirming it is present elsewhere.
  if (records.length >= 10 && dialogue.length >= 15) {
    const finalStart434b = Math.floor(records.length * 0.8);
    const lineToScene434b = buildLineToSceneMap(fountain);
    const earlyDlgCount434b = dialogue.filter(d => (lineToScene434b[d.lineNum - 1] ?? 0) < finalStart434b).length;
    const finalDlgCount434b = dialogue.filter(d => (lineToScene434b[d.lineNum - 1] ?? 0) >= finalStart434b).length;
    if (finalDlgCount434b === 0 && earlyDlgCount434b >= 10) {
      issues.push({
        location: `Final 20% (Scenes ${finalStart434b}+) — no dialogue`,
        rule: 'DIALOGUE_CLIMAX_VOID',
        severity: 'minor',
        description: `The final 20% of scenes (from Scene ${finalStart434b}) contains no dialogue, even though the earlier story carries ${earlyDlgCount434b} spoken lines. The climax and denouement play out in complete silence: no character speaks through the resolution. When the ending is entirely unspoken, the story's verbal stakes — what characters believe, what they have lost, what the events mean — are never given voice. The resolution plays as spectacle rather than as drama.`,
        suggestedFix: `Add at least one dialogue line to the climax zone: a declaration, a question, or a silence broken at the decisive moment. The line does not have to explain what happened — it can be oblique, fragmented, or barely audible — but a character must speak. An ending without a voice resolves the plot while leaving the story's human meaning unspoken; the final spoken line is what the audience carries out of the theatre.`,
      });
    }
  }

  // DIALOGUE_HEDGE_FRONT_LOADED (minor, dlg≥14, first-half hedges≥5, second-half
  // hedges≤1): Hedging language — "maybe", "perhaps", "I think", "I guess",
  // "I suppose", "just", "sort of", "kind of", "probably", "possibly" — concentrates
  // entirely in the first half of dialogue, with at most one hedge line in the
  // entire second half. The story's uncertainty vocabulary is structurally
  // backwards: characters speak with maximum diffidence in the setup but with
  // unbroken certainty through the escalation, climax, and resolution. In practice,
  // doubt and tentativeness belong in the complication and climax zones — the moments
  // of maximum pressure — not in the opening where everyone is still finding their
  // footing. When hedging language disappears from the second half, characters who
  // were tentative become inexplicably decisive precisely when the stakes are
  // highest, and the voice of doubt goes silent just where the story most needs it.
  // Distribution/timing mode × hedging lexeme. Distinct from DIALOGUE_HEDGE_
  // SATURATION (Wave 311: fires when >30% of ALL lines carry a softener — a global
  // rate check regardless of temporal position; FRONT_LOADED fires on scripts where
  // the hedge count may be well below 30% but is entirely clustered in the first
  // half, catching a different population), DIALOGUE_CONDITIONAL_OVERLOAD (Wave 283:
  // conditional syntactic structures — if/unless/might/could — not hedging
  // qualifiers), and DIALOGUE_FIRST_PERSON_SATURATION (register breadth, not
  // uncertainty register): this is the first distribution/timing check in the pass.
  if (dialogue.length >= 14) {
    const hedgeRe434c = /\b(just|maybe|perhaps|probably|possibly|i think|i guess|i suppose|kind of|sort of|i mean|or something)\b/i;
    const half434c = Math.floor(dialogue.length / 2);
    const firstHedges434c = dialogue.slice(0, half434c).filter(d => hedgeRe434c.test(d.line)).length;
    const secondHedges434c = dialogue.slice(half434c).filter(d => hedgeRe434c.test(d.line)).length;
    if (firstHedges434c >= 5 && secondHedges434c <= 1) {
      issues.push({
        location: 'Dialogue — hedge distribution (front-loaded)',
        rule: 'DIALOGUE_HEDGE_FRONT_LOADED',
        severity: 'minor',
        description: `${firstHedges434c} hedge lines ("maybe", "I think", "I guess", "just", "sort of") appear in the first half of dialogue, but only ${secondHedges434c} in the second half — the story's uncertainty vocabulary is entirely front-loaded. Characters speak with maximum diffidence in the setup but with unbroken certainty through the escalation and climax. Doubt and tentativeness belong at the moments of highest pressure; when hedging disappears from the second half, characters become inexplicably decisive precisely when the stakes make wavering most natural and human.`,
        suggestedFix: `Redistribute hedging language into the escalation and climax: let characters voice doubt and uncertainty as pressure mounts, and ensure the second half carries at least two or three hedge lines at the moments of maximum stakes. Reserve complete certainty for the resolution, when a character has earned it through the confrontation — not as the default register of the entire second half.`,
      });
    }
  }

  // ── Wave 448: DIALOGUE_CURIOSITY_PEAK_SILENT, DIALOGUE_QUESTION_BACK_LOADED, DIALOGUE_REVELATION_SCENE_VOID ──

  // DIALOGUE_CURIOSITY_PEAK_SILENT (single-peak isolation × curiosity × dialogue absence,
  // n≥8, dlg≥10, peakCuriosity≥1.5, peakPos≥1): The scene with the story's highest
  // curiosityDelta contains no dialogue — the moment of maximum audience wonder passes
  // without any character speaking. Curiosity and voice are natural partners: the question
  // a character cannot hold back, the half-answer demanded, the fragment of truth that opens
  // more than it closes. When the peak-curiosity scene is entirely silent, the story's most
  // heightened epistemic moment occurs without anyone speaking to it.
  // Distinctness: DIALOGUE_TENSION_PEAK_SILENT (Wave 434) isolates peak suspenseDelta and
  // checks for dialogue absence — this is the curiosity-channel parallel, the same structural
  // isolation mode applied to a different signal axis. DIALOGUE_CLIMAX_VOID (Wave 434) is a
  // zone check on the final 20%; CURIOSITY_PEAK_NO_FOLLOWTHROUGH (Wave 447, causality.ts)
  // checks whether a revelation follows the curiosity peak — a different pass, different output
  // check. This is the first single-peak check in dialogue.ts on the curiosity axis.
  if (records.length >= 8 && dialogue.length >= 10) {
    let peakPos448a = -1;
    let peakVal448a = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const cd = (records[i] as any).curiosityDelta ?? 0;
      if (cd > peakVal448a) { peakVal448a = cd; peakPos448a = i; }
    }
    if (peakPos448a >= 1 && peakVal448a >= 1.5) {
      const peakSceneIdx448a = (records[peakPos448a] as any).sceneIdx;
      const lineToScene448a = buildLineToSceneMap(fountain);
      const peakHasDlg448a = dialogue.some(d => (lineToScene448a[d.lineNum - 1] ?? 0) === peakSceneIdx448a);
      if (!peakHasDlg448a) {
        issues.push({
          location: `Scene ${peakSceneIdx448a} — peak curiosity, no dialogue`,
          rule: 'DIALOGUE_CURIOSITY_PEAK_SILENT',
          severity: 'minor',
          description: `Scene ${peakSceneIdx448a} carries the story's highest curiosityDelta (${peakVal448a.toFixed(2)}) but contains no dialogue — the moment of maximum audience wonder passes without any character speaking. Curiosity and voice are natural partners: the question the character cannot hold back, the half-answer demanded, the fragment of truth that opens more than it closes. When the peak-curiosity scene is entirely unspoken, the story's most heightened epistemic moment — the audience's peak lean-forward — occurs without any human voice speaking to it.`,
          suggestedFix: `Add at least one line of dialogue to the peak-curiosity scene: a question the character can no longer hold back, a demand for information, or a partial disclosure that invites more wonder rather than closing it. At the moment of maximum audience curiosity, a character voice concentrates the wondering — what they manage to ask or almost-say becomes the question the audience carries forward.`,
        });
      }
    }
  }

  // DIALOGUE_QUESTION_BACK_LOADED (distribution/timing × question-mark channel, dlg≥12,
  // firstHalfQs≥1, secondHalfQs≥3, secondHalfRate > 2× firstHalfRate): Questions cluster
  // in the second half of dialogue — the story's interrogative register more than doubles in
  // density from setup to escalation. When characters become progressively more questioning
  // as pressure mounts, they retreat into interrogation precisely where dramatic stakes should
  // be forcing declaration and commitment. The arc of a well-crafted dialogue moves toward
  // greater assertiveness as characters are confronted; a script where questioning density
  // accelerates in the back half inverts this — the climax is more deferring than the setup.
  // Distinctness: QUESTION_FLOOD (Wave 336) fires when >35% of ALL lines are questions — a
  // global proportion check blind to temporal position. DIALOGUE_HEDGE_FRONT_LOADED (Wave
  // 434) is a distribution check on hedge vocabulary (lexeme-based), not question endings.
  // DIALOGUE_QUESTION_CLUSTER (Wave 269) is a run-based check per speaker (3+ consecutive
  // questions — local accumulation). This is the FIRST distribution/timing check on the
  // question-mark channel, auditing the temporal arc of questioning across the story.
  if (dialogue.length >= 12) {
    const half448b = Math.floor(dialogue.length / 2);
    const firstHalfQs448b = dialogue.slice(0, half448b).filter(d => d.line.trimEnd().endsWith('?')).length;
    const secondHalfQs448b = dialogue.slice(half448b).filter(d => d.line.trimEnd().endsWith('?')).length;
    const firstHalfRate448b = firstHalfQs448b / half448b;
    const secondHalfRate448b = secondHalfQs448b / (dialogue.length - half448b);
    if (firstHalfQs448b >= 1 && secondHalfQs448b >= 3 && secondHalfRate448b > firstHalfRate448b * 2) {
      issues.push({
        location: 'Dialogue — question distribution (back-loaded)',
        rule: 'DIALOGUE_QUESTION_BACK_LOADED',
        severity: 'minor',
        description: `${secondHalfQs448b} of the story's question-ending dialogue lines appear in the second half (${Math.round(secondHalfRate448b * 100)}% of second-half lines), versus only ${firstHalfQs448b} in the first half (${Math.round(firstHalfRate448b * 100)}% of first-half lines) — more than twice the question density in the back half. When characters become progressively more interrogative as pressure mounts, they retreat into asking precisely where dramatic stakes should be forcing them to commit, declare, and confront. Back-loaded questioning inverts the arc of conviction: the climax is more deferring than the setup.`,
        suggestedFix: `Redistribute or replace questions in the back half: as pressure escalates, let characters state what they know, demand what they need, or declare what they will do rather than asking. Save questions for specific moments of genuine uncertainty in the escalation, not as a default register when the story is at its most tense. Well-placed assertions in the climax concentrate dramatic energy in a way that accumulated questioning cannot.`,
      });
    }
  }

  // DIALOGUE_REVELATION_SCENE_VOID (co-occurrence/decoupling × revelation × dialogue presence,
  // n≥8, dlg≥10, ≥2 revelation scenes): Every scene in which a revelation occurs (r.revelation
  // non-null) contains no dialogue — truths surface in silent scenes and every disclosure happens
  // without any character speaking. The disclosure and voice layers are permanently decoupled:
  // no confession, confrontation, forced admission, or demand-for-truth is ever spoken in the
  // moment of discovery. When revelations are consistently silent, the story's most significant
  // epistemic moments are rendered as pure action or visual rather than as dramatic human speech.
  // Distinctness: DIALOGUE_TENSION_PEAK_SILENT (Wave 434) isolates the SINGLE peak-suspense
  // scene — one scene, suspense channel. This checks ALL revelation-containing scenes for
  // the consistent absence of voice — a co-occurrence check on a field-level pattern.
  // REVELATION_RELATIONSHIP_VOID (causality.ts, Wave 419) checks whether revelation scenes carry
  // relationship shifts — a different output channel. EMOTIONAL_SUPPRESSION checks what is said
  // vs. what subtext implies — what is NOT said at all is the opposite condition.
  if (records.length >= 8 && dialogue.length >= 10) {
    const revScenes448c = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes448c.length >= 2) {
      const lineToScene448c = buildLineToSceneMap(fountain);
      const dlgSceneIdxSet448c = new Set(dialogue.map(d => lineToScene448c[d.lineNum - 1] ?? -1));
      const allRevSilent448c = revScenes448c.every((r: any) => !dlgSceneIdxSet448c.has(r.sceneIdx));
      if (allRevSilent448c) {
        issues.push({
          location: `${revScenes448c.length} revelation scene(s) — no dialogue in any`,
          rule: 'DIALOGUE_REVELATION_SCENE_VOID',
          severity: 'minor',
          description: `All ${revScenes448c.length} revelation scenes contain no dialogue — every truth the script surfaces does so in complete silence. No character ever speaks in the moment of discovery: no confession, confrontation, forced admission, or demand-for-truth. When disclosures happen in entirely unspoken scenes, the story's most significant epistemic moments are rendered as pure action or visual rather than as dramatic speech, and the disclosure and voice layers of the story are permanently decoupled.`,
          suggestedFix: `Add at least one line of dialogue to a revelation scene: a character asking the question whose answer is the revelation, a confrontation that forces the disclosure, or a denial in the face of the truth. A revelation with a spoken line — even a fragment — is dramatically richer than one rendered in action alone, because the voice tells us what the discovery means to the character who receives it.`,
        });
      }
    }
  }

  // ── Wave 462: DIALOGUE_DRAMATIC_TURN_SCENE_VOID, DIALOGUE_NEGATION_FLOOD, DIALOGUE_OPENING_SILENT ──

  // DIALOGUE_DRAMATIC_TURN_SCENE_VOID (co-occurrence/decoupling × dramatic turn × dialogue
  // presence, n≥8, dlg≥10, ≥2 turn scenes): Every scene that carries a story pivot
  // (dramaticTurn !== 'nothing') contains no dialogue — the reversals and recognitions that
  // redirect the story all happen without a spoken word. A dramatic turn is the moment a
  // character's situation flips, and the human meaning of that flip usually lives in what they
  // say (or refuse to say) as it lands: the recognition spoken aloud, the reversal protested, the
  // accusation that turns the scene. When every pivot is silent, the story's turning points are
  // rendered as pure action, and the audience is never told — by a voice — what the change means
  // to the people inside it.
  // Distinctness: DIALOGUE_REVELATION_SCENE_VOID (Wave 448) is the same co-occurrence check on
  // the REVELATION channel — this is the DRAMATIC-TURN channel, a different event population.
  // DIALOGUE_TENSION_PEAK_SILENT (Wave 434) isolates the SINGLE peak-suspense scene; this audits
  // ALL turn scenes for the consistent absence of voice. DRAMATIC_TURN_RELATIONSHIP_VOID
  // (causality.ts, Wave 447) checks turn scenes for relationship shifts — a different output
  // channel in a different pass.
  if (records.length >= 8 && dialogue.length >= 10) {
    const turnScenes462a = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes462a.length >= 2) {
      const lineToScene462a = buildLineToSceneMap(fountain);
      const dlgSceneIdxSet462a = new Set(dialogue.map(d => lineToScene462a[d.lineNum - 1] ?? -1));
      const allTurnsSilent462a = turnScenes462a.every((r: any) => !dlgSceneIdxSet462a.has(r.sceneIdx));
      if (allTurnsSilent462a) {
        issues.push({
          location: `${turnScenes462a.length} dramatic-turn scene(s) — no dialogue in any`,
          rule: 'DIALOGUE_DRAMATIC_TURN_SCENE_VOID',
          severity: 'minor',
          description: `All ${turnScenes462a.length} dramatic-turn scenes (reversals, recognitions, pivots) contain no dialogue — every turning point in the story happens in complete silence. A dramatic turn is the moment a character's situation flips, and the human meaning of that flip usually lives in what they say as it lands: the recognition spoken aloud, the reversal protested, the accusation that turns the scene. When every pivot is unspoken, the story's turning points are rendered as pure action, and no voice ever tells the audience what the change means to the people inside it.`,
          suggestedFix: `Add at least one line of dialogue to a dramatic-turn scene: the words a character finds (or fails to find) at the moment everything changes — a recognition, a refusal, an accusation, a name spoken in disbelief. The line need not explain the turn; it should register it in a human voice, so the pivot is felt as a person's experience and not only as a plot mechanic.`,
        });
      }
    }
  }

  // DIALOGUE_NEGATION_FLOOD (valence/bloat mode × negation lexeme, dlg≥10, >30%): More than 30%
  // of dialogue lines carry an explicit negation — "no", "not", "never", "can't", "won't",
  // "don't", "nothing", "nobody", "none". When most lines are framed as denial, refusal, or
  // absence, the dialogue's prevailing valence is negative-resistant: characters define
  // themselves by what they reject rather than what they want, and the scene's forward energy
  // dissipates into a wall of "no". A measure of resistance is dramatically useful, but a
  // pervasive negation register flattens the emotional range and stalls the exchange — every
  // line pushes back and none reaches forward.
  // Distinctness: DIALOGUE_AFFIRMATION_FLOOD (Wave 420) is the opposite-valence counterpart
  // (>25% bare assent — "yes"/"okay"/"absolutely"); this catches the negation pole. DIALOGUE_
  // EXCUSE_FLOOD (Wave 420) targets rationalization lexemes ("because"/"I had to"); negation is
  // a distinct lexical family. Distinct from QUESTION_FLOOD (interrogatives) and all tense/opener
  // floods: this is the first check auditing the negation register of dialogue.
  if (dialogue.length >= 10) {
    const negationRe462b = /\b(no|not|never|can'?t|won'?t|don'?t|doesn'?t|didn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|nothing|nobody|none|nowhere|cannot)\b/i;
    const negationCount462b = dialogue.filter(d => negationRe462b.test(d.line)).length;
    if (negationCount462b / dialogue.length > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_NEGATION_FLOOD',
        severity: 'minor',
        description: `${negationCount462b} of ${dialogue.length} dialogue lines (${Math.round(negationCount462b / dialogue.length * 100)}%) carry an explicit negation ("no", "not", "never", "can't", "nothing"). When most lines are framed as denial, refusal, or absence, the dialogue's prevailing valence is negative-resistant: characters define themselves by what they reject rather than what they want, and the exchange's forward energy dissipates into a wall of "no". Resistance has dramatic value, but a pervasive negation register flattens the emotional range — every line pushes back and none reaches forward.`,
        suggestedFix: `Convert some negations into positive assertions of desire or intent: "I can't do this" → "I need another way"; "Nothing matters" → "One thing still matters". A character who states what they want, rather than only what they refuse, gives the scene something to move toward. Reserve dense negation for moments of genuine refusal, not as the default grammar of every exchange.`,
      });
    }
  }

  // DIALOGUE_OPENING_SILENT (zone presence/absence × opening zone, n≥10, dlg≥15): The first 20%
  // of scenes contains no dialogue at all, even though the rest of the story is verbally active.
  // The story opens as pure silent spectacle: action, image, and atmosphere with no spoken word
  // until the opening zone has passed. A wordless opening can be a deliberate, powerful choice —
  // but when it spans the entire first fifth of a dialogue-driven story, the audience meets the
  // characters without ever hearing them, and the voices that will carry the drama are withheld
  // precisely where first impressions of character are formed.
  // Distinctness: DIALOGUE_CLIMAX_VOID (Wave 434) is the same zone-silence check on the FINAL 20%
  // — this is the opening-zone parallel, completing the bookend pairing. Distinct from DIALOGUE_
  // TENSION_PEAK_SILENT / DIALOGUE_CURIOSITY_PEAK_SILENT (single-peak isolation, not a zone) and
  // from DIALOGUE_DENSITY_INVERSION (compares act-level density ratios rather than requiring
  // complete absence from a zone): this requires dialogue's total absence from the opening while
  // confirming it is present later.
  if (records.length >= 10 && dialogue.length >= 15) {
    const openingEnd462c = Math.floor(records.length * 0.2);
    const lineToScene462c = buildLineToSceneMap(fountain);
    const openingDlgCount462c = dialogue.filter(d => (lineToScene462c[d.lineNum - 1] ?? 0) < openingEnd462c).length;
    const laterDlgCount462c = dialogue.filter(d => (lineToScene462c[d.lineNum - 1] ?? 0) >= openingEnd462c).length;
    if (openingEnd462c >= 1 && openingDlgCount462c === 0 && laterDlgCount462c >= 10) {
      issues.push({
        location: `Opening 20% (Scenes 0–${openingEnd462c - 1}) — no dialogue`,
        rule: 'DIALOGUE_OPENING_SILENT',
        severity: 'minor',
        description: `The first 20% of scenes (Scenes 0–${openingEnd462c - 1}) contains no dialogue, even though the rest of the story carries ${laterDlgCount462c} spoken lines. The story opens as pure silent spectacle — action, image, and atmosphere with no spoken word until the opening zone has passed. A wordless opening can be a deliberate choice, but when it spans the entire first fifth of a dialogue-driven story, the audience meets the characters without ever hearing them, and the voices that carry the drama are withheld precisely where first impressions of character are formed.`,
        suggestedFix: `Introduce at least one line of dialogue in the opening zone: a first spoken word that establishes a character's voice, register, or relationship before the plot accelerates. The line can be terse or oblique — it does not need to deliver exposition — but hearing a character speak early lets the audience form an impression of who they are, which a silent opening defers until the story is already underway.`,
      });
    }
  }

  // ── Wave 476: DIALOGUE_CLOCK_SCENE_VOID, DIALOGUE_POSITIVE_SCENE_VOID, DIALOGUE_DENSE_AFTERMATH_SILENT ──

  // DIALOGUE_CLOCK_SCENE_VOID — Co-occurrence/decoupling × clock × dialogue (n≥8, dlg≥10,
  // ≥2 clockRaised scenes). Every scene that establishes a deadline (clockRaised === true)
  // contains no dialogue — time pressure is created in pure silence, without a character ever
  // naming, negotiating, or responding to the threat out loud. Clock raises are among the most
  // urgent story events; when every deadline arrives in an unspoken scene, the audience registers
  // urgency as a visual or structural fact rather than as a human pressure — no character
  // agonizes, bargains, or threatens because of the clock.
  // Distinct from: DIALOGUE_REVELATION_SCENE_VOID (Wave 448: revelation channel — different event
  // type), DIALOGUE_DRAMATIC_TURN_SCENE_VOID (Wave 462: dramatic-turn channel — different event
  // type), DIALOGUE_TENSION_PEAK_SILENT (Wave 434: single-peak × highest-suspense scene — only
  // the peak, not all clock-raise scenes), CLOCK_RAISE_RELATIONSHIP_VOID (causality.ts Wave 419:
  // clock × relationship channel — a different output signal in a different pass).
  if (records.length >= 8 && dialogue.length >= 10) {
    const clockScenes476a = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes476a.length >= 2) {
      const lineToScene476a = buildLineToSceneMap(fountain);
      const dlgSceneSet476a = new Set(dialogue.map(d => lineToScene476a[d.lineNum - 1] ?? -1));
      const allClockSilent476a = clockScenes476a.every((r: any) => !dlgSceneSet476a.has(r.sceneIdx));
      if (allClockSilent476a) {
        issues.push({
          location: `${clockScenes476a.length} clock-raise scene(s) — no dialogue in any`,
          rule: 'DIALOGUE_CLOCK_SCENE_VOID',
          severity: 'minor',
          description: `All ${clockScenes476a.length} scenes that raise a story deadline (clockRaised) contain no dialogue — every time pressure in the script is established without a spoken word. Clock raises are among the most urgent narrative events: a deadline is not just a ticking mechanism but a human crisis that provokes negotiation, threat, argument, or desperation. When every deadline scene is silent, the pressure is registered as a visual or structural fact rather than as a dramatic urgency that characters name and respond to in real time.`,
          suggestedFix: `Add at least one line of dialogue to a clock-raise scene: a character naming the deadline ("We have until dawn"), arguing over what it means ("Then there's no time"), or responding to the pressure it creates. A deadline spoken aloud — even acknowledged in a fragment — becomes a shared human stake rather than a plot-mechanical timestamp that the audience reads but no one inside the story feels aloud.`,
        });
      }
    }
  }

  // DIALOGUE_POSITIVE_SCENE_VOID — Co-occurrence/decoupling × positive emotional × dialogue
  // (n≥8, dlg≥10, ≥3 emotionally positive scenes). Every positively charged scene (emotionalShift
  // === 'positive') contains no dialogue — the story's victories, joys, and emotional wins all
  // happen in complete silence. The script withholds the voice at every positive peak: no character
  // celebrates, thanks, expresses relief, or articulates hope aloud when the scene's emotional
  // charge is positive. This decouples the story's warmth and triumph from human speech.
  // Distinct from: DIALOGUE_REVELATION_SCENE_VOID / DIALOGUE_DRAMATIC_TURN_SCENE_VOID / DIALOGUE_
  // CLOCK_SCENE_VOID (co-occurrence × event-type; this is co-occurrence × emotional register, a
  // different axis), DIALOGUE_TENSION_PEAK_SILENT / DIALOGUE_CURIOSITY_PEAK_SILENT (single-peak
  // isolation × a numeric delta — only one scene; this checks ALL positive-emotion scenes for
  // consistent silence), DIALOGUE_NEGATION_FLOOD (valence × line-content lexeme; this is valence
  // × scene-level presence/absence of voice, not line-level lexical register).
  if (records.length >= 8 && dialogue.length >= 10) {
    const posScenes476b = (records as any[]).filter(r => r.emotionalShift === 'positive');
    if (posScenes476b.length >= 3) {
      const lineToScene476b = buildLineToSceneMap(fountain);
      const dlgSceneSet476b = new Set(dialogue.map(d => lineToScene476b[d.lineNum - 1] ?? -1));
      const allPosSilent476b = posScenes476b.every((r: any) => !dlgSceneSet476b.has(r.sceneIdx));
      if (allPosSilent476b) {
        issues.push({
          location: `${posScenes476b.length} positive-emotion scene(s) — no dialogue in any`,
          rule: 'DIALOGUE_POSITIVE_SCENE_VOID',
          severity: 'minor',
          description: `All ${posScenes476b.length} positively charged scenes (emotionalShift: positive) contain no dialogue — every victory, joy, or emotional win in the script happens in complete silence. No character celebrates, expresses relief, articulates hope, or gives voice to the positive moment. When the story's warmth and triumph are consistently rendered without any spoken word, the positive emotional world of the script is decoupled from the voice layer: joy is shown but never spoken, and the audience never hears a character inhabit it in real time.`,
          suggestedFix: `Add at least one line of dialogue to a positively charged scene: a character expressing relief, gratitude, triumph, or hope in their own voice. The line need not be grandiose — "We made it" or "I didn't think that was possible" — but a spoken acknowledgment gives the audience a voice to attach to the feeling, rather than leaving the emotion as an entirely external, unspoken event.`,
        });
      }
    }
  }

  // DIALOGUE_DENSE_AFTERMATH_SILENT — Sequence/aftermath × dialogue density × silence (n≥10,
  // dlg≥10, ≥3 scenes with ≥3 dialogue lines, every such dense scene immediately followed by
  // a scene with zero dialogue). A dense verbal exchange consistently triggers a cut to complete
  // silence in the next scene — the script treats spoken density and its aftermath as
  // architecturally incompatible. Verbal momentum should carry through: a scene of intense
  // dialogue often provokes a reaction, an action, or an escalation. When every dense scene is
  // followed by silence, the verbal layer never accumulates across scene boundaries.
  // Distinct from: TALKING_HEADS (Wave 150: within-scene dialogue without physical action; a
  // within-scene density check, not an inter-scene aftermath check), DIALOGUE_CLIMAX_VOID /
  // DIALOGUE_OPENING_SILENT (Wave 434/462: zone-based silence — structural zones, not dense-scene
  // aftermath), DIALOGUE_REVELATION_SCENE_VOID / DIALOGUE_DRAMATIC_TURN_SCENE_VOID (co-occurrence
  // × event-type, not dialogue density aftermath). First sequence/aftermath check in this pass.
  if (records.length >= 10 && dialogue.length >= 10) {
    const lineToScene476c = buildLineToSceneMap(fountain);
    const dlgPerScene476c = new Map<number, number>();
    for (const d of dialogue) {
      const si = lineToScene476c[d.lineNum - 1] ?? -1;
      if (si >= 0) dlgPerScene476c.set(si, (dlgPerScene476c.get(si) ?? 0) + 1);
    }
    const denseSceneIdxs476c = [...dlgPerScene476c.entries()]
      .filter(([, cnt]) => cnt >= 3)
      .map(([si]) => si);
    if (denseSceneIdxs476c.length >= 3) {
      const allDenseFollowedBySilence476c = denseSceneIdxs476c.every(si => {
        const pos = records.findIndex(r => r.sceneIdx === si);
        if (pos < 0 || pos >= records.length - 1) return true;
        const nextSi = (records as any[])[pos + 1].sceneIdx;
        return (dlgPerScene476c.get(nextSi) ?? 0) === 0;
      });
      if (allDenseFollowedBySilence476c) {
        issues.push({
          location: `${denseSceneIdxs476c.length} dialogue-dense scene(s) — each immediately followed by a silent scene`,
          rule: 'DIALOGUE_DENSE_AFTERMATH_SILENT',
          severity: 'minor',
          description: `Every one of the ${denseSceneIdxs476c.length} dialogue-dense scenes (≥3 spoken lines) is immediately followed by a scene with no dialogue — verbal density consistently triggers a cut to complete silence. This decouples verbal momentum from its aftermath: a rich exchange of words should provoke a continuation, reaction, or escalation in voice, but instead each dense scene is followed by an entirely unspoken scene. When the pattern is consistent, the verbal layer never compounds across scene boundaries — the script treats spoken density as a terminal event rather than as a force that propagates into what follows.`,
          suggestedFix: `Give at least one dialogue-dense scene a verbally active sequel: let the scene that follows continue or escalate the exchange — a follow-up confrontation, a reaction spoken aloud, or a scene where characters process what was just said. The aftermath of a dense verbal scene is where its stakes are felt; rendering it consistently in silence drains the verbal momentum precisely when it should compound.`,
        });
      }
    }
  }

  // ── Wave 490: DIALOGUE_VERBAL_PEAK_UNCAUSED, DIALOGUE_NEGATIVE_SCENE_VOID, DIALOGUE_SCENE_TEMPORAL_CLUSTER ──

  // DIALOGUE_VERBAL_PEAK_UNCAUSED — backward-cause × dialogue density peak.
  // n≥8 records, ≥5 scenes with dialogue. Find the scene with the highest per-scene dialogue line
  // count. If it is at records pos≥2 and neither of the 2 prior records contains a structural
  // driver (revelation, dramatic turn, suspense rise, clockRaised, seeded clues, or non-neutral
  // emotion) → fire. The verbally richest scene arrives from narrative vacuum — an eruption of
  // speech without a story cause that would motivate the expanded exchange.
  // Distinct from: DIALOGUE_TENSION_PEAK_SILENT (Wave 434: single-peak × suspense channel → dialogue
  // ABSENCE; checks what's missing AT the peak, not what's missing BEFORE it; different direction
  // and different cause metric), DIALOGUE_DENSE_AFTERMATH_SILENT (Wave 476: checks what FOLLOWS
  // dense scenes — aftermath direction; this checks what PRECEDES the peak — backward-cause
  // direction). First backward-cause check in this pass.
  if (records.length >= 8 && dialogue.length >= 5) {
    const lineToScene490a = buildLineToSceneMap(fountain);
    const dlgPerScene490a = new Map<number, number>();
    for (const d of dialogue) {
      const si = lineToScene490a[d.lineNum - 1] ?? -1;
      if (si >= 0) dlgPerScene490a.set(si, (dlgPerScene490a.get(si) ?? 0) + 1);
    }
    const activeScenes490a = [...dlgPerScene490a.entries()].filter(([, cnt]) => cnt > 0);
    if (activeScenes490a.length >= 5) {
      const maxDlgCount490a = Math.max(...activeScenes490a.map(([, cnt]) => cnt));
      const peakSI490a = activeScenes490a.find(([, cnt]) => cnt === maxDlgCount490a)![0];
      const peakPos490a = records.findIndex(r => r.sceneIdx === peakSI490a);
      if (peakPos490a >= 2) {
        const prior1_490a = records[peakPos490a - 1] as any;
        const prior2_490a = records[peakPos490a - 2] as any;
        const hasCause490a = [prior1_490a, prior2_490a].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            (r.suspenseDelta ?? 0) > 0 ||
            r.clockRaised === true ||
            ((r.seededClueIds ?? []).length > 0) ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause490a) {
          const peakRec490a = records[peakPos490a] as any;
          issues.push({
            location: `Scene ${peakRec490a.sceneIdx} (${peakRec490a.slug}) — peak dialogue scene (${maxDlgCount490a} lines) has no prior causal driver`,
            rule: 'DIALOGUE_VERBAL_PEAK_UNCAUSED',
            severity: 'minor',
            description: `The most verbally dense scene (scene ${peakRec490a.sceneIdx}, ${maxDlgCount490a} dialogue lines) has no structural driver in the two preceding scenes — no revelation, dramatic turn, suspense rise, deadline, seeded clue, or emotional shift that would motivate an eruption of speech. The verbal peak arrives in narrative dead air: characters suddenly say a great deal without any story event having forced or provoked the expanded exchange. The most dialogue-rich scene in a script should feel earned — it should come BECAUSE something happened that demanded speech.`,
            suggestedFix: `Give scene ${peakRec490a.sceneIdx - 1} or ${peakRec490a.sceneIdx - 2} a structural catalyst that provokes the verbal outpouring: a revelation that demands confrontation, a dramatic turn that opens new territory for speech, or an emotional escalation that forces characters to articulate what they have been suppressing.`,
          });
        }
      }
    }
  }

  // DIALOGUE_NEGATIVE_SCENE_VOID — co-occurrence × negative emotional shift × dialogue absence.
  // n≥8 records, ≥2 negative-emotion scenes (emotionalShift==='negative'). All negative-emotion
  // scenes have zero dialogue lines → fire. Defeat, grief, crisis, and loss are rendered entirely
  // in silence — the story's hardest emotional moments pass without a spoken word.
  // The negative-valence complement of DIALOGUE_POSITIVE_SCENE_VOID (Wave 476), completing the
  // emotional-register co-occurrence pair across both polarities.
  // Distinct from: DIALOGUE_POSITIVE_SCENE_VOID (opposite valence — this is the negative partner),
  // DIALOGUE_CLIMAX_VOID / DIALOGUE_OPENING_SILENT (zone-absence — different structural criterion,
  // not valence-based), DIALOGUE_TENSION_PEAK_SILENT (single-peak isolation on the ONE highest-
  // suspense scene; this fires when ALL negative-emotion scenes are silent, a broader co-occurrence
  // check), DIALOGUE_REVELATION_SCENE_VOID / CLOCK_SCENE_VOID (event-type, not emotional valence).
  if (records.length >= 8 && dialogue.length >= 5) {
    const lineToScene490b = buildLineToSceneMap(fountain);
    const dlgPerScene490b = new Map<number, number>();
    for (const d of dialogue) {
      const si = lineToScene490b[d.lineNum - 1] ?? -1;
      if (si >= 0) dlgPerScene490b.set(si, (dlgPerScene490b.get(si) ?? 0) + 1);
    }
    const negScenes490b = (records as any[]).filter(r => r.emotionalShift === 'negative');
    if (negScenes490b.length >= 2) {
      const allNegSilent490b = negScenes490b.every(r => (dlgPerScene490b.get(r.sceneIdx) ?? 0) === 0);
      if (allNegSilent490b) {
        issues.push({
          location: `${negScenes490b.length} negative-emotion scene(s) — all have no dialogue`,
          rule: 'DIALOGUE_NEGATIVE_SCENE_VOID',
          severity: 'minor',
          description: `Every one of the ${negScenes490b.length} scenes with a negative emotional shift contains no dialogue. The story's hardest moments — defeat, grief, crisis, and loss — are rendered entirely in silence, without any character speaking in the moment of despair. Negative emotional scenes are precisely where characters are most likely to crack: to say what they have been holding back, to rage or grieve or demand. When every negative scene is silenced, the hardest beats of the story pass without a voice, and the audience cannot hear characters processing their worst experiences.`,
          suggestedFix: `Give at least one negative-emotion scene a dialogue line — a character who breaks under pressure, who voices their despair, who lashes out, or who asks the question they have been afraid to ask. Negative emotional scenes are the most dramatically charged moments for speech: the places where the distance between what characters say and what they feel is most compressed and most revealing.`,
        });
      }
    }
  }

  // DIALOGUE_SCENE_TEMPORAL_CLUSTER — distribution/timing × dialogue-presence × thirds.
  // n≥9 records, ≥4 scenes with any dialogue. Divide records into three equal structural thirds.
  // If >75% of dialogue-present scenes fall in a single third → fire. The script concentrates
  // its verbal activity in one structural zone, leaving the other two-thirds as silent spectacle.
  // Distinct from: DIALOGUE_CLIMAX_VOID / DIALOGUE_OPENING_SILENT (zone-ABSENCE checks firing
  // when a specific zone has ZERO dialogue; this fires on over-CONCENTRATION in one zone while
  // other zones may have some dialogue), DIALOGUE_HEDGE_FRONT_LOADED / DIALOGUE_QUESTION_BACK_
  // LOADED (distribution of specific dialogue CONTENT patterns — hedge language, question marks;
  // this measures which SCENES have any dialogue at all, a scene-level presence check, not a
  // content-pattern distribution), EMOTIONAL_ZONE_CLUSTER in causality.ts (different signal channel).
  if (records.length >= 9 && dialogue.length >= 4) {
    const lineToScene490c = buildLineToSceneMap(fountain);
    const dlgPerScene490c = new Map<number, number>();
    for (const d of dialogue) {
      const si = lineToScene490c[d.lineNum - 1] ?? -1;
      if (si >= 0) dlgPerScene490c.set(si, (dlgPerScene490c.get(si) ?? 0) + 1);
    }
    const dlgPositions490c = (records as any[])
      .map((r, pos) => ({ pos, si: r.sceneIdx }))
      .filter(({ si }) => (dlgPerScene490c.get(si) ?? 0) > 0)
      .map(({ pos }) => pos);
    if (dlgPositions490c.length >= 4) {
      const third490c = Math.floor(records.length / 3);
      const zone1490c = dlgPositions490c.filter(p => p < third490c).length;
      const zone2490c = dlgPositions490c.filter(p => p >= third490c && p < 2 * third490c).length;
      const zone3490c = dlgPositions490c.filter(p => p >= 2 * third490c).length;
      const maxZ490c = Math.max(zone1490c, zone2490c, zone3490c);
      if (maxZ490c / dlgPositions490c.length > 0.75) {
        const zoneName490c = zone1490c === maxZ490c ? 'opening' : zone2490c === maxZ490c ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ490c}/${dlgPositions490c.length} dialogue-present scenes in the ${zoneName490c} third`,
          rule: 'DIALOGUE_SCENE_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${Math.round(maxZ490c / dlgPositions490c.length * 100)}% of scenes with any dialogue (${maxZ490c} of ${dlgPositions490c.length}) fall in the ${zoneName490c} structural third. Verbal activity is concentrated in one zone while the other two-thirds of the story pass as near-silent action or montage. Sustained silent stretches across two structural thirds deny the audience verbal access to characters — their interiority, their conflicts, and their desires — for most of the runtime. A script that confines its spoken exchanges to one zone reads as if it has two different registers: one articulate zone surrounded by mute territory.`,
          suggestedFix: `Add at least one dialogue-bearing scene in each of the ${zoneName490c === 'opening' ? 'middle and closing' : zoneName490c === 'middle' ? 'opening and closing' : 'opening and middle'} thirds currently lacking spoken exchanges. Not every scene needs dialogue, but each structural zone should have at least some verbal access to the story's characters. Move an existing dialogue scene from the ${zoneName490c} cluster, or add new dialogue beats in the silent zones.`,
        });
      }
    }
  }

  // ── Wave 504 checks ──────────────────────────────────────────────────────────

  // DIALOGUE_SILENCE_RUN — Run-based × dialogue absence × consecutive scene-level silence.
  // n≥8 records, ≥4 scenes with any dialogue (story is verbally active). Longest consecutive run
  // of records with zero dialogue lines ≥ 3 → fire. A sustained three-scene silence means the story
  // passes through a significant stretch without any spoken language despite being verbally active
  // elsewhere. Three or more consecutive silent scenes signal that the story has retreated into pure
  // visual/action narration for a run long enough to lose verbal character access — no interiority
  // expressed through speech, no confrontation, no processing, no exchange.
  // Distinct from: DIALOGUE_OPENING_SILENT (zone presence/absence — the FIRST 20% of scenes has no
  // dialogue; a fixed window, not a consecutive run), DIALOGUE_CLIMAX_VOID (zone presence/absence —
  // the FINAL 20% of scenes; same mode, different zone), DIALOGUE_SCENE_TEMPORAL_CLUSTER (distribution
  // across thirds — a different mode measuring overconcentration rather than consecutive absence),
  // DIALOGUE_DENSE_AFTERMATH_SILENT (sequence/aftermath — ONE dense scene followed by ONE silent scene;
  // this fires when THREE consecutive scenes are all silent, regardless of what preceded them).
  {
    const n504a = records.length;
    if (n504a >= 8) {
      const lineToScene504a = buildLineToSceneMap(fountain);
      const dlgPerScene504a = new Map<number, number>();
      for (const d of dialogue) {
        const si = lineToScene504a[d.lineNum - 1] ?? -1;
        if (si >= 0) dlgPerScene504a.set(si, (dlgPerScene504a.get(si) ?? 0) + 1);
      }
      const scenesWithDlg504a = (records as any[]).filter(
        r => (dlgPerScene504a.get(r.sceneIdx) ?? 0) > 0,
      ).length;
      if (scenesWithDlg504a >= 4) {
        let maxSilRun504a = 0;
        let curSilRun504a = 0;
        for (const r of records as any[]) {
          if ((dlgPerScene504a.get(r.sceneIdx) ?? 0) === 0) {
            if (++curSilRun504a > maxSilRun504a) maxSilRun504a = curSilRun504a;
          } else {
            curSilRun504a = 0;
          }
        }
        if (maxSilRun504a >= 3) {
          issues.push({
            location: `longest consecutive zero-dialogue run: ${maxSilRun504a} scenes`,
            rule: 'DIALOGUE_SILENCE_RUN',
            severity: 'minor',
            description: `The script contains a consecutive run of ${maxSilRun504a} scenes with no dialogue at all, despite being verbally active elsewhere. A sustained ${maxSilRun504a}-scene silence locks the audience out of character interiority, confrontation, and exchange for a significant stretch — retreating into pure visual narration or action for a run long enough to drain verbal character access. In a script that has other scenes with spoken exchanges, such a concentrated silent zone signals that the story has lost its verbal channel for too long.`,
            suggestedFix: `Break up the ${maxSilRun504a}-scene silent run by adding at least one dialogue exchange within the stretch. It does not need to be long — a brief confrontation, a reaction line, or a spoken acknowledgement of what has just happened can restore verbal character access without interrupting the visual momentum. Three or more consecutive silent scenes should each serve a specific narrative purpose that justifies the silence.`,
          });
        }
      }
    }
  }

  // DIALOGUE_DENSITY_FRONT_HEAVY — Average/aggregate × dialogue density × first-vs-second-half.
  // n≥8 records, ≥5 scenes with any dialogue. Compare average dialogue lines per scene in the first
  // half of records vs. the second half. If the first-half average is ≥ 1.0 AND is ≥ 2× the second-
  // half average → fire. The story front-loads its verbal activity: the dialogue grows sparse as
  // stakes rise, which is the opposite of what dramatic escalation demands. The second half — where
  // confrontations peak, resolutions land, and characters are under the most pressure — should
  // carry at least as much verbal energy as the first half.
  // Distinct from: DIALOGUE_SCENE_TEMPORAL_CLUSTER (distribution/timing × scene presence × thirds —
  // measures which thirds have any dialogue-present scenes, not the density per scene; a different
  // mode, different granularity), DIALOGUE_HEDGE_FRONT_LOADED (distribution of hedging language
  // specifically — a content pattern, not raw line density), LONG_SPEECH_DOMINANCE (global rate of
  // long lines, not zone-density imbalance), all flood/rate checks (single-pass global proportions,
  // not half-vs-half density comparison). First average/aggregate check applied to scene-level
  // density across halves in this pass.
  {
    const n504b = records.length;
    if (n504b >= 8) {
      const lineToScene504b = buildLineToSceneMap(fountain);
      const dlgPerScene504b = new Map<number, number>();
      for (const d of dialogue) {
        const si = lineToScene504b[d.lineNum - 1] ?? -1;
        if (si >= 0) dlgPerScene504b.set(si, (dlgPerScene504b.get(si) ?? 0) + 1);
      }
      const allCounts504b = (records as any[]).map((r: any) => dlgPerScene504b.get(r.sceneIdx) ?? 0);
      const totalDlgScenes504b = allCounts504b.filter(c => c > 0).length;
      if (totalDlgScenes504b >= 5) {
        const half504b = Math.floor(n504b / 2);
        const firstHalf504b = allCounts504b.slice(0, half504b);
        const secondHalf504b = allCounts504b.slice(half504b);
        const avgFirst504b = firstHalf504b.reduce((s: number, c: number) => s + c, 0) / firstHalf504b.length;
        const avgSecond504b = secondHalf504b.reduce((s: number, c: number) => s + c, 0) / secondHalf504b.length;
        if (avgFirst504b >= 1.0 && avgFirst504b >= 2 * avgSecond504b) {
          issues.push({
            location: `first-half avg ${avgFirst504b.toFixed(1)} dialogue lines/scene vs. second-half avg ${avgSecond504b.toFixed(1)}`,
            rule: 'DIALOGUE_DENSITY_FRONT_HEAVY',
            severity: 'minor',
            description: `The first half of the script averages ${avgFirst504b.toFixed(1)} dialogue lines per scene while the second half averages only ${avgSecond504b.toFixed(1)} — a ratio of ${(avgFirst504b / Math.max(avgSecond504b, 0.01)).toFixed(1)}× front-loading. Verbal activity declines as the story's stakes rise. The second half — where confrontations peak, resolutions land, and characters are under the most pressure — should carry at least as much spoken energy as the first half. When dialogue grows sparse precisely as tension increases, the story retreats into silence at the moments characters most need to articulate, confront, and reveal.`,
            suggestedFix: `Add dialogue to second-half scenes that are currently silent or sparse. Focus on the moments of highest pressure: the confrontation that was brewing in the first half, the revelation that demands a spoken response, or the resolution that a character needs to voice. The second half is not the place for silence unless that silence is itself a dramatic statement.`,
          });
        }
      }
    }
  }

  // PAYOFF_SCENE_DIALOGUE_ABSENT — Co-occurrence/decoupling × payoff event × dialogue absence.
  // n≥8 records, ≥2 payoff scenes (payoffSetupIds.length > 0), ≥3 scenes with any dialogue.
  // All payoff scenes have zero dialogue lines → fire. The story resolves its planted narrative
  // promises entirely in silence — no character names, acknowledges, or responds to the thread
  // that has been resolved. Payoff scenes are the dramatic culmination of foreshadowed promises:
  // the moment the audience has been waiting for since the setup. When all payoffs land silently,
  // they arrive without the human voice that confirms what just happened and registers the cost.
  // Distinct from: DIALOGUE_REVELATION_SCENE_VOID (Wave 448: revelation events, not payoff events —
  // a different narrative event type), DIALOGUE_DRAMATIC_TURN_SCENE_VOID (Wave 462: dramatic turns),
  // DIALOGUE_CLOCK_SCENE_VOID (Wave 476: clock scenes), DIALOGUE_POSITIVE_SCENE_VOID and DIALOGUE_
  // NEGATIVE_SCENE_VOID (emotional register, not event type), PAYOFF_NO_EMOTION and PAYOFF_SUSPENSE_
  // VOID in causality.ts (those check the payoff scene's OWN signal channels, not dialogue presence).
  {
    const n504c = records.length;
    if (n504c >= 8) {
      const lineToScene504c = buildLineToSceneMap(fountain);
      const dlgPerScene504c = new Map<number, number>();
      for (const d of dialogue) {
        const si = lineToScene504c[d.lineNum - 1] ?? -1;
        if (si >= 0) dlgPerScene504c.set(si, (dlgPerScene504c.get(si) ?? 0) + 1);
      }
      const payoffScenes504c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      const scenesWithDlg504c = (records as any[]).filter(
        r => (dlgPerScene504c.get(r.sceneIdx) ?? 0) > 0,
      ).length;
      if (payoffScenes504c.length >= 2 && scenesWithDlg504c >= 3) {
        const allPayoffSilent504c = payoffScenes504c.every(
          r => (dlgPerScene504c.get(r.sceneIdx) ?? 0) === 0,
        );
        if (allPayoffSilent504c) {
          issues.push({
            location: `${payoffScenes504c.length} payoff scene(s) — all have no dialogue`,
            rule: 'PAYOFF_SCENE_DIALOGUE_ABSENT',
            severity: 'minor',
            description: `Every one of the ${payoffScenes504c.length} payoff scenes — scenes that resolve a previously planted narrative promise — contains no dialogue. Thread resolutions land in complete silence: the moments the audience has been waiting for since the setup pass without any character naming, acknowledging, or responding to what has just been resolved. Payoff scenes are the dramatic culmination of foreshadowed expectations; they deserve speech that registers the weight of what is being fulfilled or denied.`,
            suggestedFix: `Give at least one payoff scene a dialogue line that acknowledges what has just been resolved — a character who names the significance of what happened, who responds to the fulfilled or broken promise, or whose speech demonstrates that the thread has landed with emotional weight. Payoffs are most powerful when a voice confirms what the audience has been waiting to see.`,
          });
        }
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'dialogue', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'dialogue',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Dialogue/subtext pass: dialogue is clean'
      : `Dialogue/subtext pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
