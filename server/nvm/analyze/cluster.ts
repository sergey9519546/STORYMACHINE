// Script Doctor — bridge half 5: turns co-firing LocatedIssues into named
// root-cause diagnoses (RootCauseFinding, ./types.ts). The flat 14-pass issue
// list runScriptDoctor() returns can run to dozens of entries; often several
// of them are symptoms of the SAME underlying craft problem ("this scene is
// thin AND its dialogue is flat AND its purpose repeats the last one" is one
// note — "your act-two opener isn't doing enough work" — not three unrelated
// lint hits). clusterIssues finds those convergences deterministically (never
// an LLM) so the editor can lead with "start here" instead of a flat dump.
//
// Distinctness from the flat issue list: LocatedIssue[] already says WHERE
// every individual issue is; RootCauseFinding says WHICH issues are the same
// problem wearing different rule-name hats. Both stay useful — the located
// list backs per-line squiggles, the findings back a higher-level summary
// panel — so neither replaces the other.
//
// ── Clustering axes (deliberately kept as three independent mechanisms) ────
// The spec calls for issues to converge either by physical proximity (same
// scene / overlapping line range) OR by sharing a character. Those are
// different signals and merging them would conflate them: two issues about
// the same character in DIFFERENT scenes are still "about this character",
// even though their line spans don't overlap at all; conversely two
// unrelated issues that both happen to land in the same scene as a
// character's first line shouldn't be swept into "about that character"
// just because the line ranges touch. So:
//   1. Scene/lines overlap clustering — proximity in the script.
//   2. Character clustering (by shared first-speaking-line identity) —
//      proximity to a *person*, independent of where else they appear.
//   3. Document-family clustering — for act-level/thematic issues with no
//      line anchor at all, grouped by the 5 writer-facing DimensionKey
//      families (types.ts) when at least 3 co-fire; below that threshold a
//      couple of stray whole-script notes isn't a "convergence", just two
//      unrelated observations.
// Singletons (any cluster of exactly 1) are never returned — clustering is
// about convergent symptoms, not a re-listing of the flat issue array.

import crypto from 'node:crypto';
import type { PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { LocatedIssue, RootCauseFinding } from './types.ts';

type Severity = RevisionIssue['severity'];
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };

// "Scene N" — parsed a second time here (locate.ts already used an
// equivalent regex to decide anchoring) because clusterIssues only receives
// LocatedIssue[], never the raw fountain: RootCauseFinding.sceneIdxs (for the
// heatmap/navigation) has to come from the issue's own location text, same
// as doctor.ts's buildSceneHeatmap already does. Kept local rather than
// shared with locate.ts's copy: this one is read-only bookkeeping (which
// scenes did this finding touch), not an anchoring decision, so the two are
// allowed to drift independently without either module depending on the
// other's internals.
const SCENE_RE = /Scene (\d+)/i;

// "Character: NAME" — mirrors locate.ts's own prefix tier, needed again here
// purely to produce a human-readable label for a character-clustered finding
// (clusterIssues has no other way to recover the display name than reading
// the same location text locate.ts already parsed to decide the anchor).
const CHARACTER_PREFIX_RE = /^Character:\s*(.+)$/i;

// The 14 PassName values regrouped into the 5 writer-facing DimensionKey
// families documented on types.ts's DimensionKey type. Duplicated from
// doctor.ts's (unexported) DIMENSION_DEFS rather than imported — doctor.ts is
// owned by a parallel agent and out of scope to modify — but the mapping
// itself is a fixed editorial decision pinned in the DimensionKey doc
// comment, so copying it here doesn't create a second source of truth in
// practice, just a second reader of the one the contract already documents.
const PASS_FAMILY: Record<PassName, string> = {
  structure: 'Structure & Pacing', pacing: 'Structure & Pacing', rhythm: 'Structure & Pacing',
  'character-arc': 'Character', intention: 'Character', 'relationship-arc': 'Character',
  dialogue: 'Dialogue & Voice', voice: 'Dialogue & Voice',
  causality: 'Plot Logic & Payoff', belief: 'Plot Logic & Payoff', payoff: 'Plot Logic & Payoff', conflict: 'Plot Logic & Payoff',
  theme: 'Theme & Originality', originality: 'Theme & Originality',
};

/** Turn a rule constant ("PAYOFF_TOO_QUICK") into plain lowercase words.
 *  Duplicated from doctor.ts's (unexported) humanizeRuleName for the same
 *  out-of-scope reason as PASS_FAMILY above, and for the same contract
 *  reason: the 14 pass files gain 3 rules every wave (CLAUDE.md's standing
 *  task), so a hand-curated rule->phrase table would go stale the moment a
 *  new rule ships. Lowercasing + de-underscoring guarantees no ALL_CAPS rule
 *  token ever reaches title/explanation text — the actual tested contract,
 *  not any particular wording. */
function humanizeRuleName(rule: string): string {
  return rule.toLowerCase().replace(/_/g, ' ');
}

function worstSeverity(members: LocatedIssue[]): Severity {
  let worst: Severity = 'minor';
  for (const m of members) {
    if (SEVERITY_RANK[m.issue.severity] < SEVERITY_RANK[worst]) worst = m.issue.severity;
  }
  return worst;
}

/** The rule that recurs most often among a cluster's members; ties resolve
 *  to whichever is encountered first — deterministic without an arbitrary
 *  secondary sort key, matching doctor.ts's analyzeDimensionIssues. */
function dominantRuleArea(members: LocatedIssue[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.issue.rule, (counts.get(m.issue.rule) ?? 0) + 1);
  let top = members[0].issue.rule;
  let topCount = 0;
  for (const m of members) {
    const c = counts.get(m.issue.rule)!;
    if (c > topCount) { topCount = c; top = m.issue.rule; }
  }
  return humanizeRuleName(top);
}

function sceneIdxsOf(members: LocatedIssue[]): number[] {
  const idxs = new Set<number>();
  for (const m of members) {
    const match = SCENE_RE.exec(m.issue.location);
    if (match) idxs.add(parseInt(match[1], 10));
  }
  return [...idxs].sort((a, b) => a - b);
}

function uniqueRules(members: LocatedIssue[]): string[] {
  return [...new Set(members.map(m => m.issue.rule))];
}

function characterLabel(location: string): string {
  const m = CHARACTER_PREFIX_RE.exec(location);
  return (m ? m[1] : location).trim();
}

/** Stable id: sha256 of the sorted member rules + span (+ an optional extra
 *  discriminator), so the same convergence always gets the same id (React
 *  keys / client-side dedup) regardless of what order the pipeline happened
 *  to emit issues in. `extra` is only used for document-family findings
 *  (whose span is always undefined) to keep two different dimension
 *  families from ever colliding even in the degenerate case where their rule
 *  sets happened to match. */
function findingId(memberRules: string[], startLine?: number, endLine?: number, extra = ''): string {
  const sortedRules = [...memberRules].sort();
  const key = `${JSON.stringify(sortedRules)}|${startLine ?? ''}|${endLine ?? ''}|${extra}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

// ── Union-find over line-overlap ─────────────────────────────────────────────

function makeUnionFind(n: number): { find: (x: number) => number; union: (a: number, b: number) => void } {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  return { find, union };
}

/** Cluster 1: issues anchored to a scene or an explicit line range whose
 *  spans overlap (inclusive) — "converge in the same physical part of the
 *  script", regardless of whether that's because they share one scene
 *  exactly or because a line-range issue happens to fall inside it. */
function overlapClusters(located: LocatedIssue[]): LocatedIssue[][] {
  const idxs: number[] = [];
  located.forEach((li, i) => {
    if ((li.anchor === 'scene' || li.anchor === 'lines') && li.startLine !== undefined && li.endLine !== undefined) {
      idxs.push(i);
    }
  });
  if (idxs.length === 0) return [];

  const uf = makeUnionFind(located.length);
  for (let a = 0; a < idxs.length; a++) {
    const i = idxs[a];
    const A = located[i];
    for (let b = a + 1; b < idxs.length; b++) {
      const j = idxs[b];
      const B = located[j];
      if (A.startLine! <= B.endLine! && B.startLine! <= A.endLine!) uf.union(i, j);
    }
  }

  const groups = new Map<number, LocatedIssue[]>();
  for (const i of idxs) {
    const root = uf.find(i);
    const group = groups.get(root) ?? [];
    group.push(located[i]);
    groups.set(root, group);
  }
  return [...groups.values()].filter(g => g.length >= 2);
}

/** Cluster 2: character-anchored issues sharing the same first-speaking
 *  line. locate.ts anchors every issue about a given character to that
 *  character's (document-wide) first cue line, so two issues about the SAME
 *  character always carry the identical startLine — grouping by that value
 *  is exactly "the same character anchor", with no need to re-derive or
 *  re-normalize a name from free-form location text. */
function characterClusters(located: LocatedIssue[]): LocatedIssue[][] {
  const byLine = new Map<number, LocatedIssue[]>();
  for (const li of located) {
    if (li.anchor !== 'character' || li.startLine === undefined) continue;
    const group = byLine.get(li.startLine) ?? [];
    group.push(li);
    byLine.set(li.startLine, group);
  }
  return [...byLine.values()].filter(g => g.length >= 2);
}

/** Cluster 3: document-anchored issues (act-level/thematic/whole-script —
 *  nothing to overlap or attach to a character) grouped by which of the 5
 *  writer-facing dimensions their pass belongs to, when at least 3 co-fire
 *  in the same family — the spec's explicit higher bar for this axis, since
 *  "two whole-script notes happened to both come from Character-family
 *  passes" is weak evidence of one shared root cause, whereas 3+ is a
 *  pattern worth naming. */
function documentFamilyClusters(located: LocatedIssue[]): Array<{ family: string; members: LocatedIssue[] }> {
  const byFamily = new Map<string, LocatedIssue[]>();
  for (const li of located) {
    if (li.anchor !== 'document') continue;
    const family = PASS_FAMILY[li.pass];
    const group = byFamily.get(family) ?? [];
    group.push(li);
    byFamily.set(family, group);
  }
  return [...byFamily.entries()]
    .filter(([, members]) => members.length >= 3)
    .map(([family, members]) => ({ family, members }));
}

// ── Finding synthesis ─────────────────────────────────────────────────────────

function synthesizeSceneOrLinesFinding(members: LocatedIssue[]): RootCauseFinding {
  const topRuleArea = dominantRuleArea(members);
  const memberRules = uniqueRules(members);
  const startLine = Math.min(...members.map(m => m.startLine!));
  const endLine = Math.max(...members.map(m => m.endLine!));
  const sceneIdxs = sceneIdxsOf(members);
  const where = sceneIdxs.length === 1
    ? `Scene ${sceneIdxs[0]}`
    : sceneIdxs.length > 1
      ? `Scenes ${sceneIdxs[0]}–${sceneIdxs[sceneIdxs.length - 1]}`
      : `lines ${startLine}-${endLine}`;

  return {
    id: findingId(memberRules, startLine, endLine),
    title: `Recurring ${topRuleArea} trouble in ${where}`,
    explanation: `${members.length} issues converge here, mostly around ${topRuleArea} `
      + `— concentrated in ${where} (lines ${startLine}-${endLine}).`,
    severity: worstSeverity(members),
    memberRules,
    memberCount: members.length,
    sceneIdxs,
    startLine,
    endLine,
  };
}

function synthesizeCharacterFinding(members: LocatedIssue[]): RootCauseFinding {
  const topRuleArea = dominantRuleArea(members);
  const memberRules = uniqueRules(members);
  const line = members[0].startLine!;
  const label = characterLabel(members[0].issue.location);
  const sceneIdxs = sceneIdxsOf(members);

  return {
    id: findingId(memberRules, line, line),
    title: `Recurring ${topRuleArea} trouble for ${label}`,
    explanation: `${members.length} issues converge on ${label}, mostly around ${topRuleArea} `
      + `— first raised at line ${line}.`,
    severity: worstSeverity(members),
    memberRules,
    memberCount: members.length,
    sceneIdxs,
    startLine: line,
    endLine: line,
  };
}

function synthesizeDocumentFamilyFinding(family: string, members: LocatedIssue[]): RootCauseFinding {
  const topRuleArea = dominantRuleArea(members);
  const memberRules = uniqueRules(members);
  const passesInvolved = new Set(members.map(m => m.pass)).size;

  return {
    id: findingId(memberRules, undefined, undefined, family),
    title: `Widespread ${family} concerns`,
    explanation: `${members.length} issues across ${passesInvolved} pass(es) in ${family} point to the same `
      + `underlying problem, mostly around ${topRuleArea}.`,
    severity: worstSeverity(members),
    memberRules,
    memberCount: members.length,
    sceneIdxs: sceneIdxsOf(members),
    startLine: undefined,
    endLine: undefined,
  };
}

/**
 * Roll located issues up into named root-cause findings. Pure and
 * deterministic: iteration is over plain arrays/Maps in insertion order (no
 * randomness, no wall-clock reads), so the same LocatedIssue[] always
 * produces the same findings, in the same order, with the same ids.
 */
export function clusterIssues(located: LocatedIssue[]): RootCauseFinding[] {
  const findings: RootCauseFinding[] = [];

  for (const group of overlapClusters(located)) findings.push(synthesizeSceneOrLinesFinding(group));
  for (const group of characterClusters(located)) findings.push(synthesizeCharacterFinding(group));
  for (const { family, members } of documentFamilyClusters(located)) {
    findings.push(synthesizeDocumentFamilyFinding(family, members));
  }

  // Severity first (critical findings lead), then how many issues each one
  // subsumes — matches doctor.ts's buildTopPriorities ordering convention.
  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.memberCount - a.memberCount);
  return findings;
}
