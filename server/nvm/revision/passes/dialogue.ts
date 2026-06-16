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
