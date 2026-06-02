// Wave 137 — Pass 8: Rhythm/Prosody
// Checks sentence rhythm in action lines: monotonous sentence lengths,
// run-on action blocks, staccato beats that need expansion.
// Wave 137 additions: passive voice constructions, weak-verb chains.

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
