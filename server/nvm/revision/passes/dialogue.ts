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
