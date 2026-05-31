// Wave 39 — Pass 7: Dialogue/Subtext
// Checks dialogue quality using the quality engine's DialogueValidators:
// on-the-nose emotion statements, monologues, pure exposition delivery,
// characters who agree with everything.

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

/** Detect on-the-nose emotion statements */
const ON_THE_NOSE_RE = /\b(I (feel|am|feel so)|I'm (so |very )?(angry|sad|happy|scared|afraid|excited|devastated|thrilled|heartbroken|furious|terrified|devastated))\b/i;

/** Detect pure exposition delivery ("As you know, Bob...") */
const AS_YOU_KNOW_RE = /\b(as you know|you already know|as we discussed|as I told you|you remember that|let me explain|the reason (is|why))\b/i;

/** Detect question-answer agreement (character agrees without pushback) */
const AGREEMENT_RE = /^(yes|right|exactly|absolutely|of course|agreed|sure|correct|definitely|totally|indeed)[.,!]?$/i;

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
