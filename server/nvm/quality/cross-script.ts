// Cross-Script Comparison — GODMODE L38.
//
// "This is how the model learns reusable craft without copying plots."
// Given two or more script analyses, produce comparative records: which
// dramatic functions are shared, how each script implements them, what is
// invariant (the transferable craft principle), and what varies (the
// replaceable surface).
//
// This is the engine behind statements like: "three scripts all deliver
// 'protagonist publicly accepts forbidden identity'; one via direct
// declaration, one via witnessed physical action, one via refusing to keep
// performing the role. Invariant: private identity becomes irreversible
// public action. Variables: dialogue amount, setting, witnesses, tone."
//
// Pure + deterministic: consumes FountainAnalysis objects only.

import type { FountainAnalysis } from '../analyze/types.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

export interface ScriptSummary {
  label: string;
  sceneCount: number;
  /** Dominant scene purpose and its share. */
  topPurpose: string;
  topPurposeShare: number;
  /** Fraction of scenes carrying dialogue. */
  dialogueDensity: number;
  /** Fraction of scenes with 2+ visual beats. */
  visualDensity: number;
  /** Mean suspenseDelta across all scenes. */
  meanSuspense: number;
  /** Position (0–1) of the max-suspense scene — the climax locator proxy. */
  suspensePeakPosition: number;
  /** Count of revelation beats. */
  revelationCount: number;
  /** Count of dramatic-turn beats. */
  turnCount: number;
  /** Counts per scene purpose. */
  purposeHistogram: Record<string, number>;
}

export interface SharedFunctionRecord {
  /** The dramatic function present in 2+ scripts (purpose tag + evidence). */
  sharedFunction: string;
  /** Per-script implementation description. */
  implementations: Array<{ label: string; how: string }>;
  /** The invariant craft principle (what transfers). */
  invariant: string;
  /** What varies between implementations (what is replaceable). */
  variables: string[];
}

export interface CrossScriptReport {
  summaries: ScriptSummary[];
  sharedFunctions: SharedFunctionRecord[];
  /** Pairs of scripts ranked by structural similarity (0–1). */
  similarityPairs: Array<{ a: string; b: string; similarity: number }>;
  scored: boolean;
}

// ── Summarize one script ─────────────────────────────────────────────────────

export function summarizeScript(label: string, analysis: FountainAnalysis): ScriptSummary {
  const records = analysis.records;
  const purposeHistogram: Record<string, number> = {};
  for (const r of records) purposeHistogram[r.purpose] = (purposeHistogram[r.purpose] ?? 0) + 1;
  const [topPurpose, topCount] = Object.entries(purposeHistogram).sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];

  const suspense = records.map(r => r.suspenseDelta ?? 0);
  const maxSuspense = suspense.length > 0 ? Math.max(...suspense) : 0;
  const peakIdx = suspense.indexOf(maxSuspense);

  return {
    label,
    sceneCount: records.length,
    topPurpose: topPurpose ?? 'none',
    topPurposeShare: records.length > 0 ? (topCount ?? 0) / records.length : 0,
    dialogueDensity: records.length > 0
      ? records.filter(r => (r.speakingCharacterCount ?? 0) > 0).length / records.length
      : 0,
    visualDensity: records.length > 0
      ? records.filter(r => (r.visualBeats?.length ?? 0) >= 2).length / records.length
      : 0,
    meanSuspense: suspense.length > 0 ? suspense.reduce((s, x) => s + x, 0) / suspense.length : 0,
    suspensePeakPosition: suspense.length > 1 ? peakIdx / (suspense.length - 1) : 0.5,
    revelationCount: records.filter(r => r.revelation !== null && r.revelation !== undefined).length,
    turnCount: records.filter(r => (r.dramaticTurn ?? '').length > 0).length,
    purposeHistogram,
  };
}

// ── Shared functions ─────────────────────────────────────────────────────────

/** Find scene purposes that appear in 2+ scripts and describe each script's
 *  implementation via its local purpose/beat fingerprint. */
function findSharedFunctions(summaries: Array<{ summary: ScriptSummary; analysis: FountainAnalysis }>): SharedFunctionRecord[] {
  const purposeOwners = new Map<string, string[]>();
  for (const { summary } of summaries) {
    for (const purpose of Object.keys(summary.purposeHistogram)) {
      const owners = purposeOwners.get(purpose) ?? [];
      owners.push(summary.label);
      purposeOwners.set(purpose, owners);
    }
  }

  const records: SharedFunctionRecord[] = [];
  for (const [purpose, owners] of purposeOwners) {
    const uniqueOwners = [...new Set(owners)];
    if (uniqueOwners.length < 2) continue;

    const implementations = summaries.map(({ summary, analysis }) => {
      const scenes = analysis.records.filter(r => r.purpose === purpose);
      const how = describeImplementation(scenes, summary);
      return { label: summary.label, how };
    }).filter(impl => impl.how.length > 0);

    if (implementations.length < 2) continue;

    records.push({
      sharedFunction: `scene function "${purpose}" (${uniqueOwners.length} scripts)`,
      implementations,
      invariant: invariantFor(purpose),
      variables: variablesFor(summaries, purpose),
    });
  }
  return records;
}

function describeImplementation(scenes: ScreenplaySceneRecord[], summary: ScriptSummary): string {
  if (scenes.length === 0) return '';
  const dialogueShare = scenes.filter(s => (s.speakingCharacterCount ?? 0) > 0).length / scenes.length;
  const visualShare = scenes.filter(s => (s.visualBeats?.length ?? 0) >= 2).length / scenes.length;
  const withTurns = scenes.filter(s => (s.dramaticTurn ?? '').length > 0).length;
  const parts: string[] = [`${scenes.length} scene(s)`];
  if (dialogueShare > 0.6) parts.push('dialogue-forward');
  else if (dialogueShare < 0.3) parts.push('action/visual-forward');
  if (visualShare > 0.5) parts.push('visually dense');
  if (withTurns >= 2) parts.push(`${withTurns} in-scene turns`);
  const relShiftScenes = scenes.filter(s => (s.relationshipShifts?.length ?? 0) > 0).length;
  if (relShiftScenes > 0) parts.push(`${relShiftScenes} carry relationship movement`);
  return parts.join(', ');
}

function invariantFor(purpose: string): string {
  const INVARIANTS: Record<string, string> = {
    climax: 'confrontation forces the protagonist to enact their (possibly changed) value under maximal pressure',
    revelation: 'withheld information lands with relationship/consequence weight, not just novelty',
    setup: 'a concrete carrier is planted that the audience can later recognize',
    'payoff-setup': 'the planted carrier returns transformed',
    'breather': 'pressure drops so the next escalation can register',
    'advance_plot': 'the world state materially changes',
    'build_tension': 'danger/pressure rises without resolving',
    'reveal_character': 'a choice under pressure exposes what the character actually values',
  };
  return INVARIANTS[purpose] ?? 'the function changes story state in its characteristic way';
}

function variablesFor(summaries: Array<{ summary: ScriptSummary }>, _purpose: string): string[] {
  const vars: string[] = [];
  const dialogueRange = summaries.map(s => s.summary.dialogueDensity);
  if (Math.max(...dialogueRange) - Math.min(...dialogueRange) > 0.2) vars.push('dialogue amount');
  const visualRange = summaries.map(s => s.summary.visualDensity);
  if (Math.max(...visualRange) - Math.min(...visualRange) > 0.2) vars.push('visual density');
  const peakRange = summaries.map(s => s.summary.suspensePeakPosition);
  if (Math.max(...peakRange) - Math.min(...peakRange) > 0.2) vars.push('climax placement');
  vars.push('setting, witnesses, tone');
  return vars;
}

// ── Structural similarity ─────────────────────────────────────────────────────

function structuralSimilarity(a: ScriptSummary, b: ScriptSummary): number {
  // Simple cosine-ish similarity over normalized structural features.
  const features = (s: ScriptSummary): number[] => [
    s.topPurposeShare,
    s.dialogueDensity,
    s.visualDensity,
    Math.min(1, s.meanSuspense / 5),
    s.suspensePeakPosition,
    Math.min(1, s.revelationCount / Math.max(1, s.sceneCount)),
    Math.min(1, s.turnCount / Math.max(1, s.sceneCount)),
  ];
  const fa = features(a), fb = features(b);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < fa.length; i++) {
    dot += fa[i] * fb[i];
    na += fa[i] ** 2;
    nb += fb[i] ** 2;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? Math.round(dot / denom * 100) / 100 : 0;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function compareScripts(
  inputs: Array<{ label: string; analysis: FountainAnalysis }>,
): CrossScriptReport {
  const withContent = inputs.filter(i => i.analysis.records.length > 0);
  if (withContent.length < 2) {
    return { summaries: [], sharedFunctions: [], similarityPairs: [], scored: false };
  }

  const summarized = withContent.map(i => ({ summary: summarizeScript(i.label, i.analysis), analysis: i.analysis }));
  const summaries = summarized.map(s => s.summary);

  const similarityPairs: CrossScriptReport['similarityPairs'] = [];
  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      similarityPairs.push({
        a: summaries[i].label,
        b: summaries[j].label,
        similarity: structuralSimilarity(summaries[i], summaries[j]),
      });
    }
  }
  similarityPairs.sort((x, y) => y.similarity - x.similarity);

  return {
    summaries,
    sharedFunctions: findSharedFunctions(summarized),
    similarityPairs,
    scored: true,
  };
}
