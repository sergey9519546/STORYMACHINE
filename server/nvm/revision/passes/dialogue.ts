// Wave 135 — Pass 7: Dialogue/Subtext (Level 1 + Level 2)
// Level 1: surface pattern matching — on-the-nose, as-you-know, sycophancy,
//          monologue, trait labeling.
// Level 2: implicit emotion divergence — emotional suppression, power silence,
//          question dodge, denial inversion. Requires cross-referencing memory records.
// Wave 150 additions: talking heads (no physical beats in long dialogue runs),
// over-parenthetical (excessive direction undermining actors), and deadlock
// dialogue (same argument cycling without escalation).

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
