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
//
// A fourth mechanism sits above these three (Wave 1185, see the "Wave 1185
// additions" block below for the full rationale): a small set of NAMED
// templates — recognized rule-pair convergences that are always the same
// underlying wound, not a coincidence — run first and claim their matching
// issues so the three generic mechanisms above only ever see what's left.

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

// ── Wave 1185 additions (Program v2, Type 4 — root-cause templates) ────────
//
// Everything above this point turns co-firing issues into a GENERIC finding
// ("Recurring Structure & Pacing trouble in Scene 5") — accurate, but it
// names the symptom cluster, not the wound. A template is a recognized,
// NAMED co-occurrence pattern: a fixed pair (or larger set) of rules that,
// when they land in the same spatially-connected group (the exact same
// mechanism overlapClusters already uses — same scene, or a lines-anchored
// issue whose range falls inside a scene-anchored one's span), are always
// the same underlying craft problem wearing two rule-name hats, not a
// coincidence. The three below were chosen from measured evidence, not
// intuition (Wave 1184's method: runScriptDoctor over all 20 calibration
// corpus samples, tallied for rule-pair co-occurrence and, more strongly,
// spatial overlap — see the wave commit for the full top-pairs table):
//
//   WEAK_MIDPOINT + MIDPOINT_EMOTIONAL_FLATLINE     — co-fire in 20/20
//     samples; land in the identical scene span 20/20 times they co-fire
//     (both anchor to the same floor(n/2) midpoint scene by construction).
//   DRAMATIC_TURN_AFTERMATH_VOID + INCITING_AFTERMATH_STALL — co-fire in
//     12/20 samples; land in the identical scene span all 12/12 times (the
//     story's first catalyst is very often also its first dramatic turn).
//   ZERO_ENTROPY_SCENE + DIALOGUE_ASSERTION_RUN     — co-fire in 20/20
//     samples; the assertion run's line range falls inside a zero-entropy
//     scene's span in 14/20 samples (real overlap, not mere co-presence).
//
// ── Wave 1189 additions (Program v2, Type 4 — root-cause templates, second
// of its kind) — three more named templates, same method as Wave 1185
// (runScriptDoctor + locateIssues over all 20 calibration corpus samples,
// tallied for rule-pair co-occurrence and span overlap), re-run because the
// corpus evolved under Waves 1186-1188. Several candidates suggested by the
// wave brief turned out to be non-viable on inspection of locate.ts, not by
// assumption: ACT1_BOUNDARY_WEAK ("End of Act 1 (Scene ~N)" — the "~" breaks
// SCENE_RE), NO_REVERSALS / NO_REVERSALS_LONG_STORY ("Overall structure" /
// "Conflict layer"), TOLD_BELIEF_DOMINATION ("Belief/revelation layer"), and
// EXPOSITION_DUMP / MISSING_INCITING_INCIDENT / REVELATION_DROUGHT ("Scenes
// N–M", the plural form SCENE_RE deliberately excludes) all resolve to
// anchor 'document' with no line span — locate.ts's own module comment says
// so explicitly for the plural case. A template needs real spans to overlap,
// so none of those pairs can ever join this mechanism; the three below were
// chosen from what DOES carry a scene/lines anchor, keeping the same
// evidentiary bar the brief asked for:
//
//   COLD_OPEN_INERT + ACTION_CONSECUTIVE_LONG_RUN — co-fire in 14/20 samples;
//     land in overlapping spans 13/14 times (COLD_OPEN_INERT always anchors
//     to Scene 0's full span, and the corpus's earliest dense-action run
//     lands at line ~3, inside it, in all but one sample).
//   REVELATION_UNEARNED + REVELATION_WITHOUT_REACTION — co-fire in 7/20
//     samples; land in the identical scene span all 7/7 times (an unearned
//     revelation and "the next scene didn't react to it" are frequently the
//     SAME revelation scene, read by two different checks).
//   BELIEF_REVERSAL_UNSUPPORTED + UNMOTIVATED_DECISION — co-fire in 5/20
//     samples; every one of those 5 has at least one overlapping pair (both
//     rules independently flag the identical scene as an unsupported swing —
//     an emotional/belief reversal by one check, a major decision by the
//     other).
//
// Rule sets are kept fully disjoint from Wave 1185's three templates AND
// from each other (no member rule reused across any two templates in this
// file) — matchOverlapTemplate scans the full located[] for every template
// independently (see clusterIssues below), so a shared rule between two
// templates risks the same issue getting claimed by both and surfacing as
// two overlapping named findings for one convergence; disjoint rule sets
// make that structurally impossible rather than merely unlikely.
//
// ── Design choice: claim-before-generic-clustering, not enrich-after ──────
// Two designs were available: (a) let overlapClusters/characterClusters run
// as today and afterward re-title any resulting cluster whose memberRules
// happen to match a template, or (b) run template recognition FIRST and
// remove (claim) the issues it matches from the pool before the generic
// clusterers ever see them. (b) is what's implemented, because (a) has a
// real double-report risk this module's own architecture forbids: the
// generic scene/lines clustering (Cluster 1 above) is span-overlap-based
// with NO awareness of rule identity, so it would independently form the
// exact same connected group a template also matches — re-titling it after
// the fact is a patch that has to special-case every future template's shape
// against every existing clusterer's output, whereas claiming issues up
// front means every clusterer downstream (overlap, character, document
// family) simply never sees a claimed issue again, by construction, forever
// — no coordination required as templates or clusterers are added later. The
// cost is that a template's own matching logic must be self-contained (it
// can't lean on overlapClusters' output), which is why matchOverlapTemplate
// below re-implements the identical span-overlap union-find, scoped to the
// template's own rule set.

interface RootCauseTemplate {
  /** Slug embedded in the finding's id (stable across runs — see
   *  synthesizeTemplateFinding) so a template's findings are identifiable
   *  and never collide with a generic cluster's hash-only id. */
  id: string;
  /** Every one of these rules must appear (as a distinct rule, at least
   *  once) within the same spatially-connected group for the template to
   *  fire — two issues of the SAME rule overlapping is not this template,
   *  it's an ordinary generic cluster (or, if the whole group is exactly one
   *  rule repeated, no finding at all — clusterIssues never merges same-rule
   *  duplicates into a named wound). */
  requiredRules: string[];
  /** Plain-language name of the underlying problem — the wound, not the
   *  symptom list. No rule-name jargon, no ALL_CAPS token. */
  title: string;
  /** One or two sentences: what the two symptoms together prove, and the
   *  single concrete change that clears both at once (the fix-and-verify
   *  surface consumes this text as its fix target). */
  explanation: (members: LocatedIssue[], where: string) => string;
}

const ROOT_CAUSE_TEMPLATES: RootCauseTemplate[] = [
  {
    id: 'midpoint-stall',
    requiredRules: ['WEAK_MIDPOINT', 'MIDPOINT_EMOTIONAL_FLATLINE'],
    title: 'The middle has no engine',
    explanation: (members, where) =>
      `Two independent checks agree that ${where} is the story's dead center: midpoint suspense `
      + `pressure is flat, and the midpoint scene itself carries no emotional or tension shift. `
      + `That's not two problems, it's one missing pivot — give this single scene a reversal, a `
      + `revelation, or a point-of-no-return decision, and both symptoms clear together.`,
  },
  {
    id: 'aftermath-void',
    requiredRules: ['DRAMATIC_TURN_AFTERMATH_VOID', 'INCITING_AFTERMATH_STALL'],
    title: "Consequences don't land",
    explanation: (members, where) =>
      `${where} delivers the story's pivotal turn, but the two scenes that follow register `
      + `nothing — no suspense rise, no emotional shift, no relationship movement — on two separate `
      + `readings of the same wake. The turn itself doesn't need rewriting; the very next scene does: `
      + `make someone react to what just happened before the story is allowed to move on.`,
  },
  {
    id: 'inert-scene-flat-talk',
    requiredRules: ['ZERO_ENTROPY_SCENE', 'DIALOGUE_ASSERTION_RUN'],
    title: 'Everyone sounds the same about nothing',
    explanation: (members, where) =>
      `${where} has no plot or character momentum, and it also carries a run of purely declarative `
      + `dialogue in that same stretch — nobody asks a question, nobody pushes back, nothing is at `
      + `stake in how it's said or what it moves. Give one character in this scene a want that `
      + `collides with another's; the friction fixes the momentum and the dialogue in the same stroke.`,
  },
  {
    id: 'airless-opening',
    requiredRules: ['COLD_OPEN_INERT', 'ACTION_CONSECUTIVE_LONG_RUN'],
    title: 'Page one has no hook and no air',
    explanation: (members, where) =>
      `${where} opens the story with no narrative hook at all — no revelation, clue, clock pressure, `
      + `or relationship shift, and flat suspense — and in that same stretch also runs a wall of `
      + `consecutive dense action lines with no short beat to let the reader exhale. That's one failing `
      + `first impression wearing two rule-name hats: give the opening a single concrete stake, and `
      + `break the dense run with one short, sharp beat — both symptoms clear together.`,
  },
  {
    id: 'hollow-reveal',
    requiredRules: ['REVELATION_UNEARNED', 'REVELATION_WITHOUT_REACTION'],
    title: 'The reveal comes from nowhere and changes nothing',
    explanation: (members, where) =>
      `${where} delivers a revelation with no prior misinformation for it to overturn, and the very `
      + `next scene shows no emotional, relational, or suspense ripple from it either — the truth is `
      + `weak going in and inert coming out. Plant a false belief a scene or two earlier that this `
      + `moment overturns, and let the following scene visibly react to it — one fix seeds both ends `
      + `of the reveal.`,
  },
  {
    id: 'causeless-turn',
    requiredRules: ['BELIEF_REVERSAL_UNSUPPORTED', 'UNMOTIVATED_DECISION'],
    title: 'A character turns, and nothing caused it',
    explanation: (members, where) =>
      `${where} shows a character making a major decision and swinging sharply in belief or emotion — `
      + `on two separate readings of the same scene, with no setup in the two scenes before it to `
      + `justify either. The decision and the feeling are the same missing beat: add one scene shortly `
      + `before where the character learns something, faces pressure, or confronts a choice, and both `
      + `the reversal and the decision earn their moment.`,
  },
];

/** Run one template's recognizer over every located issue: filter to the
 *  template's own rule set (scene/lines-anchored issues only — a template
 *  has nothing to say about a character- or document-anchored issue, since
 *  the whole claim is spatial convergence), union-find them by the identical
 *  inclusive span-overlap rule overlapClusters uses, then keep only the
 *  resulting groups that contain EVERY required rule at least once.
 *  Singletons and partial matches (only one of the required rules present in
 *  a connected group) are correctly not a template match — they fall through
 *  to the ordinary clusterers untouched. */
function matchOverlapTemplate(
  template: RootCauseTemplate,
  located: LocatedIssue[],
): { consumed: LocatedIssue[]; findings: RootCauseFinding[] } {
  const candidates = located.filter(li =>
    template.requiredRules.includes(li.issue.rule)
    && (li.anchor === 'scene' || li.anchor === 'lines')
    && li.startLine !== undefined && li.endLine !== undefined,
  );
  if (candidates.length < 2) return { consumed: [], findings: [] };

  const uf = makeUnionFind(candidates.length);
  for (let a = 0; a < candidates.length; a++) {
    const A = candidates[a];
    for (let b = a + 1; b < candidates.length; b++) {
      const B = candidates[b];
      if (A.startLine! <= B.endLine! && B.startLine! <= A.endLine!) uf.union(a, b);
    }
  }

  const groups = new Map<number, LocatedIssue[]>();
  candidates.forEach((li, i) => {
    const root = uf.find(i);
    const group = groups.get(root) ?? [];
    group.push(li);
    groups.set(root, group);
  });

  const consumed: LocatedIssue[] = [];
  const findings: RootCauseFinding[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const rulesPresent = new Set(group.map(m => m.issue.rule));
    const allRequiredPresent = template.requiredRules.every(r => rulesPresent.has(r));
    if (!allRequiredPresent) continue;
    findings.push(synthesizeTemplateFinding(template, group));
    consumed.push(...group);
  }
  return { consumed, findings };
}

function synthesizeTemplateFinding(template: RootCauseTemplate, members: LocatedIssue[]): RootCauseFinding {
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
    // Template id is folded into both the hash discriminator (extra) AND the
    // visible prefix, so a template's findings are stable across runs and
    // identifiable at a glance (never just an opaque hash) — the "recorded
    // in the finding id for stability" requirement.
    id: `${template.id}-${findingId(memberRules, startLine, endLine, template.id)}`,
    title: template.title,
    explanation: template.explanation(members, where),
    severity: worstSeverity(members),
    memberRules,
    memberCount: members.length,
    sceneIdxs,
    startLine,
    endLine,
  };
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

  // Named templates run first and claim their member issues (see the Wave
  // 1185 design-choice comment above matchOverlapTemplate) so the generic
  // clusterers below never re-report the same spatial convergence under the
  // generic "Recurring X trouble" wording.
  const consumed = new Set<LocatedIssue>();
  for (const template of ROOT_CAUSE_TEMPLATES) {
    const { consumed: templateConsumed, findings: templateFindings } = matchOverlapTemplate(template, located);
    for (const li of templateConsumed) consumed.add(li);
    findings.push(...templateFindings);
  }
  const remaining = consumed.size === 0 ? located : located.filter(li => !consumed.has(li));

  for (const group of overlapClusters(remaining)) findings.push(synthesizeSceneOrLinesFinding(group));
  for (const group of characterClusters(remaining)) findings.push(synthesizeCharacterFinding(group));
  for (const { family, members } of documentFamilyClusters(remaining)) {
    findings.push(synthesizeDocumentFamilyFinding(family, members));
  }

  // Severity first (critical findings lead), then how many issues each one
  // subsumes — matches doctor.ts's buildTopPriorities ordering convention.
  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.memberCount - a.memberCount);
  return findings;
}
