// Wave 39 — Pass 10: Originality
// Checks for clichés, generic scene descriptions, and predictable outcomes.
// Reuses quality engine's genericness signals.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

// ── Cliché phrase library ─────────────────────────────────────────────────────
const CLICHE_PHRASES = [
  // Dialogue clichés
  'we need to talk', 'it\'s not what it looks like', 'i can explain',
  'you don\'t understand', 'we\'re not so different', 'i had no choice',
  'you were always the strong one', 'i never meant to hurt you',
  'this changes everything', 'over my dead body',
  'we can get through this', 'it was never meant to be',
  'i was just doing my job', 'you have no idea what i\'ve been through',
  'trust me on this', 'i\'m not who you think i am',
  'you lied to me', 'just let it go', 'this isn\'t over',
  'things will never be the same', 'you complete me',
  // Action clichés
  'looks around nervously', 'takes a deep breath', 'fights back tears',
  'runs a hand through', 'stares into the distance', 'jaw drops',
  'eyes go wide', 'heart sinks', 'blood runs cold',
  'a single tear', 'laughs to himself', 'swallows hard',
  'shifts uncomfortably', 'bites his lip', 'bites her lip',
  'forces a smile', 'lets out a long breath',
  // Scene clichés
  'begins to rain', 'phone rings', 'alarm goes off',
  'the screen goes black', 'camera pulls back',
  'nothing but silence', 'time seems to stop', 'the world falls away',
];

// ── Generic scene descriptor patterns ────────────────────────────────────────
const GENERIC_PATTERNS = [
  /\b(beautiful|gorgeous|stunning|amazing|incredible)\s+(sunset|sunrise|view|landscape)\b/i,
  /\b(dark and stormy|cold and dark|bright and sunny)\b/i,
  /\bmeanwhile\b/i,
  /\blater that (day|night|evening)\b/i,
  /\bthe next (day|morning|night)\b/i,
  /\bsuddenly\b/i,
  /\bfor what seems like (an eternity|forever|hours)\b/i,
  /\bthe air (is|was) thick\b/i,
  /\b(time|world) (seems|seemed) to (stop|freeze|stand still)\b/i,
  /\bnothing would ever be the same\b/i,
  /\bwithout another word\b/i,
];

export async function originalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const lines = fountain.split('\n');

  // ── Cliché phrases ────────────────────────────────────────────────────────
  const foundCliches = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const cliche of CLICHE_PHRASES) {
      if (lower.includes(cliche) && !foundCliches.has(cliche)) {
        foundCliches.add(cliche);
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'CLICHE_PHRASE',
          description: `Cliché phrase detected: "${cliche}"`,
          severity: 'minor',
          suggestedFix: 'Replace with a specific, unexpected formulation unique to this character and moment',
        });
      }
    }
  }

  // ── Generic patterns ──────────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(lines[i])) {
        const match = lines[i].match(pattern)?.[0] ?? '';
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'GENERIC_DESCRIPTOR',
          description: `Generic scene descriptor: "${match}" — adds no specific sensory information`,
          severity: 'minor',
          suggestedFix: 'Replace with a concrete, specific detail that only THIS story could have',
        });
        break; // one issue per line max
      }
    }
  }

  // ── Scene purpose variety: fully uniform or critically low variety ────────
  const purposes = records.map(r => r.purpose);
  const purposeSet = new Set(purposes);
  if (purposeSet.size === 1 && records.length >= 4) {
    issues.push({
      location: 'Overall scene variety',
      rule: 'UNIFORM_SCENE_PURPOSES',
      description: `All ${records.length} scenes share the same purpose (${purposes[0]}) — the screenplay lacks tonal/functional variety`,
      severity: 'major',
      suggestedFix: 'Vary scene functions: mix setup, conflict, revelation, character moment, and comedic relief',
    });
  } else if (purposeSet.size <= 2 && records.length >= 8) {
    // Low variety: only 2 distinct purposes across 8+ scenes means structural monotony
    const topTwo = [...purposeSet].join(' and ');
    issues.push({
      location: 'Overall scene variety',
      rule: 'LOW_SCENE_VARIETY',
      description: `${records.length} scenes use only ${purposeSet.size} distinct purpose(s) (${topTwo}) — insufficient structural variety for a story this long`,
      severity: 'minor',
      suggestedFix: 'Introduce revelation, raising-stakes, and relief scenes to create a fuller dramatic arc',
    });
  }

  // ── Limit total issues to avoid overwhelming output ───────────────────────
  // Clichés (minor) are pushed first and would crowd out the higher-severity
  // structural findings (UNIFORM_SCENE_PURPOSES is major) under a naive slice.
  // Sort by severity so the most important issues always survive truncation.
  const severityRank: Record<string, number> = { critical: 0, major: 1, minor: 2 };
  const prioritized = [...issues].sort(
    (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
  );
  const dedupedIssues = prioritized.slice(0, 8);

  const { revised, usedLLM } = await rewritePass({ fountain, issues: dedupedIssues, passName: 'originality', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'originality',
    issues: dedupedIssues,
    revisedFountain: revised,
    changed,
    summary: dedupedIssues.length === 0
      ? 'Originality pass: no clichés detected'
      : `Originality pass: ${dedupedIssues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
