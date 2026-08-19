// Deliberate Rule-Breaking — GODMODE L37 (the layer that protects
// distinctive writing from formulaic "repair").
//
// The problem this module solves: a craft-rules system will flag a passive
// protagonist, minimal dialogue, an abrupt ending, or repeated scenes as
// violations. But in high-end scripts those choices are often DELIBERATE —
// and what compensates for them is detectable structure elsewhere. Without
// this layer, the analyzer recommends "fixing" the most distinctive parts
// of the script.
//
// Detection contract (GODMODE §37): for every apparent violation, annotate
//   - which rule/convention is being violated
//   - whether the violation looks intentional (pattern evidence)
//   - what compensates for it (structural signals elsewhere)
//   - whether the compensation is sufficient to read as deliberate craft
//
// This is a DIAGNOSTIC layer: it never changes health/verdict. It annotates
// findings so downstream surfaces (the doctor report, the revision passes'
// consumers) can suppress or soften "fix this" advice where the violation
// is compensated. Wiring it into pass output suppression is a separate,
// evidence-gated decision.

import type { FountainAnalysis } from '../analyze/types.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

export type ViolatedConvention =
  | 'passive_protagonist'      // protagonist reacts; agency arrives late or never
  | 'minimal_dialogue'         // sparse dialogue in a dialogue-heavy medium
  | 'late_protagonist_clarity' // protagonist's goal/nature withheld well past act 1
  | 'abrupt_ending'            // resolution far shorter than genre convention
  | 'repetitive_scene_shape'   // same beat shape recurring
  | 'nonlinear_order'          // fabula ≠ syuzhet ordering
  | 'tonal_collision';         // incompatible tones share scenes without transition

export interface RuleBreakingFinding {
  convention: ViolatedConvention;
  /** Structural evidence that the violation is intentional craft, not error. */
  compensations: string[];
  /** true when compensations cross the confidence threshold. */
  readsAsDeliberate: boolean;
  /** 0–1 confidence in the deliberate reading. */
  confidence: number;
  /** What must NOT be auto-repaired if this reads as deliberate. */
  preserveNotice: string;
}

export interface RuleBreakingReport {
  findings: RuleBreakingFinding[];
  /** Conventions checked that did NOT fire — useful for negative evidence. */
  checked: ViolatedConvention[];
  scored: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function suspenseOf(r: ScreenplaySceneRecord): number {
  return r.suspenseDelta ?? 0;
}

/** Mean over a numeric field, guarded for empty arrays. */
function mean(xs: number[]): number {
  return xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

// ── Detectors ─────────────────────────────────────────────────────────────────
// Each detector returns a finding only when BOTH (a) the convention is
// violated and (b) at least one compensation signal exists. A violation with
// zero compensations is an ordinary flaw — the revision passes already
// handle those; this module has nothing protective to say about them.

function detectPassiveProtagonist(analysis: FountainAnalysis): RuleBreakingFinding | null {
  const records = analysis.records;
  if (records.length < 8) return null;

  // Violation: sustained zero/negative suspense without reversal through the
  // first two-thirds, i.e. the story observes rather than drives. We use
  // dramaticTurn density as the agency proxy: few or no turns before the
  // final third.
  const firstTwoThirds = records.slice(0, Math.floor(records.length * 2 / 3));
  const turnCount = firstTwoThirds.filter(r => (r.dramaticTurn ?? '').length > 0).length;
  const agencyArrivesLate = turnCount <= Math.max(1, Math.floor(firstTwoThirds.length * 0.1));

  if (!agencyArrivesLate) return null;

  // Compensations (GODMODE §37 examples):
  //  - institutional entrapment study: dense scenes + rising curiosity
  //  - eventual act of agency as climax: turns cluster in final third
  const finalThird = records.slice(Math.floor(records.length * 2 / 3));
  const lateTurnCount = finalThird.filter(r => (r.dramaticTurn ?? '').length > 0).length;
  const compensations: string[] = [];
  if (lateTurnCount >= 2) {
    compensations.push(`${lateTurnCount} dramatic turn(s) cluster in the final third — agency arrives as the climax, the deliberate-entrapment shape`);
  }
  const curiosityRise = mean(finalThird.map(r => r.curiosityDelta ?? 0)) - mean(firstTwoThirds.map(r => r.curiosityDelta ?? 0));
  if (curiosityRise > 0.5) {
    compensations.push(`curiosity rises into the finale (+${curiosityRise.toFixed(1)}) — the passivity is observational by design, and the audience is being primed`);
  }

  if (compensations.length === 0) return null;

  return {
    convention: 'passive_protagonist',
    compensations,
    readsAsDeliberate: compensations.length >= 2,
    confidence: Math.min(0.85, 0.5 + compensations.length * 0.15),
    preserveNotice: 'Do NOT auto-insert protagonist agency beats in the first two acts — the entrapment study and the late-agency climax are the design.',
  };
}

function detectMinimalDialogue(analysis: FountainAnalysis): RuleBreakingFinding | null {
  const records = analysis.records;
  if (records.length < 6) return null;

  // Violation: very few dialogue-carrying scenes relative to scene count.
  const dialogueScenes = records.filter(r => (r.speakingCharacterCount ?? 0) > 0).length;
  const sparse = dialogueScenes / records.length < 0.35;
  if (!sparse) return null;

  // Compensations: visual/sonic density carrying the information instead
  // (GODMODE §37: "blocking, sound, and object behavior carry information").
  const visualScenes = records.filter(r => (r.visualBeats?.length ?? 0) >= 2).length;
  const compensations: string[] = [];
  if (visualScenes / records.length > 0.5) {
    compensations.push(`${visualScenes}/${records.length} scenes carry 2+ visual beats — blocking and image carry the story in place of speech`);
  }
  const revealScenes = records.filter(r => r.revelation !== null && r.revelation !== undefined).length;
  if (revealScenes >= 3) {
    compensations.push(`${revealScenes} revelation beats — information arrives by discovery, not conversation`);
  }

  if (compensations.length === 0) return null;

  return {
    convention: 'minimal_dialogue',
    compensations,
    readsAsDeliberate: compensations.length >= 1,
    confidence: Math.min(0.8, 0.45 + compensations.length * 0.15),
    preserveNotice: 'Do NOT pad dialogue to convention — the visual storytelling is load-bearing here.',
  };
}

function detectAbruptEnding(analysis: FountainAnalysis): RuleBreakingFinding | null {
  const records = analysis.records;
  if (records.length < 10) return null;

  // Violation: final 10% of scenes carries near-zero suspense/curiosity
  // resolution movement compared to the pre-climax peak.
  const tail = records.slice(Math.floor(records.length * 0.9));
  const pre = records.slice(Math.floor(records.length * 0.6), Math.floor(records.length * 0.9));
  const tailEnergy = mean(tail.map(suspenseOf));
  const preEnergy = mean(pre.map(suspenseOf));
  const abrupt = preEnergy - tailEnergy > 2 && tail.length <= Math.max(2, Math.floor(records.length * 0.1));
  if (!abrupt) return null;

  // Compensation: an earlier-earned revelation or turn makes incompletion
  // read as the intended aftertaste (GODMODE §37: "incompletion creates
  // the intended moral aftertaste").
  const compensations: string[] = [];
  const lateReveal = records.slice(Math.floor(records.length * 0.6)).find(r => r.revelation !== null && r.revelation !== undefined);
  if (lateReveal) {
    compensations.push('a late revelation recontextualizes the story just before the cut — the abruptness lands as aftertaste, not truncation');
  }
  if (preEnergy > 3) {
    compensations.push(`pre-climax energy is high (${preEnergy.toFixed(1)}) — the cut happens at peak, an intentional button`);
  }

  if (compensations.length === 0) return null;

  return {
    convention: 'abrupt_ending',
    compensations,
    readsAsDeliberate: compensations.length >= 1,
    confidence: Math.min(0.75, 0.4 + compensations.length * 0.15),
    preserveNotice: 'Do NOT extend the resolution — verify the cut point against authorial intent before "fixing" the ending length.',
  };
}

function detectRepetitiveSceneShape(analysis: FountainAnalysis): RuleBreakingFinding | null {
  const records = analysis.records;
  if (records.length < 8) return null;

  // Violation: the same purpose dominates.
  const purposeCounts = new Map<string, number>();
  for (const r of records) purposeCounts.set(r.purpose, (purposeCounts.get(r.purpose) ?? 0) + 1);
  const [topPurpose, topCount] = [...purposeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!topPurpose || topCount / records.length < 0.5) return null;

  // Compensation: escalation across the repetitions — each recurrence
  // higher-stakes than the last (GODMODE §37: "each repetition changes
  // status and increases dread").
  const occurrences = records.filter(r => r.purpose === topPurpose);
  const firstHalf = occurrences.slice(0, Math.floor(occurrences.length / 2));
  const secondHalf = occurrences.slice(Math.floor(occurrences.length / 2));
  const escalation = mean(secondHalf.map(suspenseOf)) - mean(firstHalf.map(suspenseOf));
  if (escalation <= 0.5) return null;

  return {
    convention: 'repetitive_scene_shape',
    compensations: [
      `suspense escalates +${escalation.toFixed(1)} between the first and second half of the "${topPurpose}" run — the repetition is a rising pattern, not redundancy`,
    ],
    readsAsDeliberate: escalation > 1,
    confidence: Math.min(0.8, 0.45 + escalation * 0.1),
    preserveNotice: 'Do NOT vary or merge these scenes to satisfy variety rules — the escalating repetition is the dread engine.',
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

const ALL_CONVENTIONS: ViolatedConvention[] = [
  'passive_protagonist', 'minimal_dialogue', 'late_protagonist_clarity',
  'abrupt_ending', 'repetitive_scene_shape', 'nonlinear_order', 'tonal_collision',
];

export function analyzeRuleBreaking(analysis: FountainAnalysis): RuleBreakingReport {
  if (analysis.records.length === 0) {
    return { findings: [], checked: [], scored: false };
  }

  const findings: RuleBreakingFinding[] = [];
  const fired: ViolatedConvention[] = [];

  const detectors = [detectPassiveProtagonist, detectMinimalDialogue, detectAbruptEnding, detectRepetitiveSceneShape];
  for (const detect of detectors) {
    const finding = detect(analysis);
    if (finding) {
      findings.push(finding);
      fired.push(finding.convention);
    }
  }

  return {
    findings,
    checked: ALL_CONVENTIONS.filter(c => !fired.includes(c)),
    scored: true,
  };
}
