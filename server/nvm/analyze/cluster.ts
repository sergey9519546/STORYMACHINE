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
  /** 'spatial' (default, omitted) — the Wave 1185/1189 mechanism: every
   *  required rule must land in the same scene/lines-overlapping group,
   *  matched via matchOverlapTemplate's self-contained union-find.
   *  'document' (Wave 1193) — for required-rule sets whose members are
   *  document-anchored (whole-script aggregate checks with no line span to
   *  overlap — see the Wave 1189 comment's list of rules that resolve to
   *  'document' for exactly this reason). A document-mode template has no
   *  spatial claim to make: "the whole script" is the only meaningful
   *  location, so it fires whenever every required rule appears ANYWHERE in
   *  the located issues, matched via matchDocumentTemplate. Kept as a
   *  distinct mode (not folded into matchOverlapTemplate) because the two
   *  have genuinely different evidentiary bars: spatial mode proves the
   *  SAME place, document mode can only prove the same SCRIPT — conflating
   *  them would silently weaken the spatial claim the six existing
   *  templates already made and are tested against. */
  mode?: 'spatial' | 'document';
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

  // ── Wave 1193 additions (Program v2, Type 4 — root-cause templates, third
  // of its kind; adversarial-review response) — four DOCUMENT-mode templates
  // (see the `mode` field's doc comment on RootCauseTemplate above). Wave
  // 1189 found that several strong candidate pairs resolve to anchor
  // 'document' and are therefore invisible to the spatial mechanism; rather
  // than discard them again, Wave 1193 adds the document-mode matcher
  // (matchDocumentTemplate below) so they can be named too. All four were
  // audited directly against the pass source (not assumed from rule names —
  // see the wave commit) to confirm the required rules are genuinely
  // distinct signals that converge on one diagnosis, not restatements of
  // each other or of an existing template:
  //
  //   static-spine     — NO_REVERSALS + SUSPENSE_FLATLINE_RUN +
  //     PURPOSE_MONOTONE_RUN. All three are document-anchored (structure.ts's
  //     "Overall structure", pacing.ts's "N consecutive scenes — suspense
  //     flatline", structure.ts's "Scenes N–M (purpose: ...)" — the plural
  //     "Scenes" form SCENE_RE deliberately excludes, per the Wave 1189
  //     comment). Chosen because they audit the story's turning mechanism
  //     from three independent angles (opposition, tension trend, scene
  //     function) that a script with no narrative reversal will very often
  //     fail together: no reversal anywhere means suspense has nothing to
  //     climb (flatline) and scenes keep re-running the same job (monotone
  //     purpose run) because nothing has happened to change what any scene
  //     needs to do.
  //   promises-unkept   — CHEKHOV_GUN_UNFIRED + SETUP_PAYOFF_IMBALANCE. Both
  //     document-anchored (causality.ts's "Scenes 0–N (setup zone)" — plural
  //     form, excluded from SCENE_RE — and "Setup/payoff distribution").
  //     Genuinely distinct signals kept apart on purpose: UNFIRED audits
  //     WHICH early clues never got a matching payoffSetupIds entry;
  //     IMBALANCE audits the raw COUNT ratio of seeds to payoffs script-wide.
  //     A script can fail one without the other (a handful of orphaned early
  //     clues in an otherwise seed-light script won't trip the 5-seed/≤1-
  //     payoff count threshold), so co-firing is real corroboration: named
  //     unfired guns AND a script-wide payoff drought are the same craft
  //     failure — planted material that never cashes in — read at two
  //     different grains.
  //   unearned-change   — UNMOTIVATED_TRANSFORMATION + ESCALATION_PLATEAU.
  //     Both document-anchored (character-arc.ts's "Mid-story character arc"
  //     and causality.ts's "Suspense escalation arc"). Distinct from the
  //     existing causeless-turn template (BELIEF_REVERSAL_UNSUPPORTED +
  //     UNMOTIVATED_DECISION, Wave 1189): causeless-turn is about a single
  //     SCENE-level swing with no immediately preceding setup; this template
  //     is about the story's OVERALL arc — the protagonist's dominant
  //     emotional tone changes between the first and last third with no
  //     revelation/turning-point/climax/raise-stakes/complicate scene in the
  //     middle third to cause it, while separately the tension curve itself
  //     never climbs (last suspense peak no higher than the first). A
  //     character who ends up somewhere different with no rising pressure to
  //     have pushed them there is one wound, not two unrelated notes.
  //   talk-over-action  — DIALOGUE_DOMINANCE + TALKING_HEADS. Mixed grain on
  //     purpose: DIALOGUE_DOMINANCE is a single document-anchored,
  //     whole-script ratio check ("Script dialogue/action balance", >70% of
  //     non-slug/non-cue lines are dialogue); TALKING_HEADS is a lines-
  //     anchored, per-run check (5+ consecutive dialogue exchanges with no
  //     action beat). Document mode was chosen deliberately over trying to
  //     force a spatial overlap: a script-wide dialogue-heavy ratio and a
  //     concrete talking-heads run are evidence of the SAME imbalance at two
  //     granularities (the global statistic and a named local instance of
  //     it), not two coincidentally-adjacent symptoms, so requiring them to
  //     share a line span would be a stricter bar than the claim actually
  //     needs.
  //
  // Rejected as overlapping with existing coverage (audited, not assumed):
  //   NO_REVERSALS_LONG_STORY as a SEPARATE static-spine member — its
  //     `structure.reversalDensity === 0` condition and NO_REVERSALS's
  //     `structure.reversalCount === 0` condition both express "zero
  //     reversals"; for the n≥8 scripts where LONG_STORY can even fire,
  //     density and count are zero together, so LONG_STORY is not new
  //     evidence beyond NO_REVERSALS — including both would inflate the
  //     template's memberCount without adding a distinct observation.
  //   ESCALATION_PLATEAU's own SECOND independent implementation
  //     (conflict.ts, first-half-max vs. second-half-average) as an
  //     ADDITIONAL required rule alongside the causality.ts implementation
  //     used above — both fire under the SAME rule name already (see the
  //     duplicate-family registry below, which is exactly the mechanism for
  //     same-name/cross-pass convergence; a template's requiredRules is the
  //     wrong layer to also solve that problem).
  //   ORPHAN_CLUE as a third promises-unkept member — scene-anchored
  //     (fires once per orphaned clue at its planting scene), so folding it
  //     into a document-mode template would silently claim every orphan
  //     instance script-wide and remove them from ever forming their own
  //     scene-level generic cluster; the two document-anchored aggregate
  //     rules already prove the same wound without that side effect.
  {
    id: 'static-spine',
    requiredRules: ['NO_REVERSALS', 'SUSPENSE_FLATLINE_RUN', 'PURPOSE_MONOTONE_RUN'],
    mode: 'document',
    title: 'The story has no turning mechanism',
    explanation: () =>
      `The script has zero dramatic reversals, a long consecutive run of scenes where tension never `
      + `rises, and a long run of scenes repeating the same purpose — three independent readings of `
      + `the same structural failure: nothing happens that changes what the story needs from any given `
      + `scene. Give the middle of the story one hard reversal — a plan that backfires, an ally who `
      + `turns — and suspense has somewhere to climb and scenes have a new job to do.`,
  },
  {
    id: 'promises-unkept',
    requiredRules: ['CHEKHOV_GUN_UNFIRED', 'SETUP_PAYOFF_IMBALANCE'],
    mode: 'document',
    title: 'Planted material never pays off',
    explanation: () =>
      `Early clues are named as never fired, and separately the script plants far more setups than it `
      + `ever resolves — the same broken promise seen at two grains: specific guns on the mantel and the `
      + `overall ledger of seeds versus payoffs. Pick the two or three planted threads that matter most `
      + `and give each one a scene that cashes it in; the ledger and the named guns clear together.`,
  },
  {
    id: 'unearned-change',
    requiredRules: ['UNMOTIVATED_TRANSFORMATION', 'ESCALATION_PLATEAU'],
    mode: 'document',
    title: 'The character changes, but nothing pushed them there',
    explanation: () =>
      `The protagonist's dominant emotional tone is different at the end than at the start with no `
      + `revelation, turning point, or rising-stakes scene in the middle third to explain the shift, and `
      + `separately the story's own tension curve never climbs — the pressure that would justify a `
      + `changed person never builds. Add one causal scene in the middle third where the character is `
      + `forced to confront something, and let the stakes genuinely escalate toward it; the transformation `
      + `earns itself once there is pressure behind it.`,
  },
  {
    id: 'talk-over-action',
    requiredRules: ['DIALOGUE_DOMINANCE', 'TALKING_HEADS'],
    mode: 'document',
    title: 'The story is being told in conversation, not in action',
    explanation: () =>
      `Over 70% of the script's content lines are dialogue, and at least one stretch runs five or more `
      + `consecutive dialogue exchanges with no action beat at all — the same imbalance at the global `
      + `statistic and in a concrete instance of it. Break up the longest talking-heads run with physical `
      + `action tied to what's being said, and look for at least one scene that could be dramatized `
      + `through behavior instead of a line of dialogue explaining it.`,
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

  // DoS guard (S1-b), defense-in-depth: same shape and same fix as
  // overlapClusters' identical all-pairs scan below — sort by startLine so
  // the inner loop can break the instant B.startLine exceeds A.endLine,
  // rather than scanning every remaining candidate. See overlapClusters'
  // comment for the full correctness argument (it applies unchanged here:
  // union-find is order-independent, so this is a pure speedup).
  const order = candidates.map((_, i) => i).sort((x, y) => candidates[x].startLine! - candidates[y].startLine!);

  const uf = makeUnionFind(candidates.length);
  for (let a = 0; a < order.length; a++) {
    const i = order[a];
    const A = candidates[i];
    for (let b = a + 1; b < order.length; b++) {
      const j = order[b];
      const B = candidates[j];
      if (B.startLine! > A.endLine!) break;
      uf.union(i, j);
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

/** Run one document-mode template's recognizer: filter to the template's own
 *  rule set with NO anchor restriction (document-mode templates fire on
 *  presence, not spatial overlap — see RootCauseTemplate's `mode` doc
 *  comment), then fire once, script-wide, when every required rule appears
 *  at least once anywhere in `located`. Unlike matchOverlapTemplate there is
 *  no grouping step: "the whole script" is the only location a document-mode
 *  template can claim, so all matching issues form the one and only
 *  candidate group. */
function matchDocumentTemplate(
  template: RootCauseTemplate,
  located: LocatedIssue[],
): { consumed: LocatedIssue[]; findings: RootCauseFinding[] } {
  const candidates = located.filter(li => template.requiredRules.includes(li.issue.rule));
  const rulesPresent = new Set(candidates.map(li => li.issue.rule));
  const allRequiredPresent = template.requiredRules.every(r => rulesPresent.has(r));
  if (!allRequiredPresent) return { consumed: [], findings: [] };
  return { consumed: candidates, findings: [synthesizeTemplateFinding(template, candidates)] };
}

function synthesizeTemplateFinding(template: RootCauseTemplate, members: LocatedIssue[]): RootCauseFinding {
  const memberRules = uniqueRules(members);
  // Document-mode members (and, in principle, a mixed-anchor group) may
  // carry no line span at all — Math.min/max over an all-undefined array
  // would be NaN, so span bookkeeping is scoped to whichever members DO
  // carry one; a group with none simply reports no span, same as any other
  // document-anchored finding (see RootCauseFinding.startLine's doc comment).
  const linedMembers = members.filter(m => m.startLine !== undefined && m.endLine !== undefined);
  const startLine = linedMembers.length > 0 ? Math.min(...linedMembers.map(m => m.startLine!)) : undefined;
  const endLine = linedMembers.length > 0 ? Math.max(...linedMembers.map(m => m.endLine!)) : undefined;
  const sceneIdxs = sceneIdxsOf(members);
  const where = sceneIdxs.length === 1
    ? `Scene ${sceneIdxs[0]}`
    : sceneIdxs.length > 1
      ? `Scenes ${sceneIdxs[0]}–${sceneIdxs[sceneIdxs.length - 1]}`
      : startLine !== undefined
        ? `lines ${startLine}-${endLine}`
        : 'across the script';

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

  // DoS guard (S1-b): the naive double loop below is O(idxs.length^2), which
  // freezes the event loop when a pathological script (tens of thousands of
  // trivial scenes, each producing its own scene-anchored issue) drives
  // idxs.length into the tens of thousands. Sorting by startLine first makes
  // the inner loop safely early-out WITHOUT changing which pairs union:
  // once idxs is ordered by startLine ascending, comparing a fixed A against
  // B's in that order guarantees A.startLine <= B.startLine, which makes the
  // overlap test's first clause (A.startLine <= B.endLine) trivially true
  // (B.endLine >= B.startLine >= A.startLine) — so overlap reduces to just
  // B.startLine <= A.endLine. The moment that fails for one B it fails for
  // every later B too (their startLine only grows), so the inner loop can
  // break immediately instead of scanning the rest. This turns the pair scan
  // from O(n^2) worst case into O(n log n + n*k) (k = average overlap-window
  // size), with the union-find result — order-independent by construction —
  // byte-identical to the pre-fix all-pairs scan for every existing script.
  const sortedIdxs = [...idxs].sort((x, y) => located[x].startLine! - located[y].startLine!);

  const uf = makeUnionFind(located.length);
  for (let a = 0; a < sortedIdxs.length; a++) {
    const i = sortedIdxs[a];
    const A = located[i];
    for (let b = a + 1; b < sortedIdxs.length; b++) {
      const j = sortedIdxs[b];
      const B = located[j];
      if (B.startLine! > A.endLine!) break;
      uf.union(i, j);
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

// ── Wave 1193 additions (Program v2, Type 4 — cross-pass duplicate-family
// merging; adversarial-review response) — a review of the shipped product
// praised root-cause clustering but flagged that near-duplicate ISSUE
// FAMILIES (different rule names, different passes, but the same single
// craft observation) reach the user un-merged: e.g. SEED_EMOTIONAL_DECOUPLED
// (intention.ts, Wave 451), CLUE_SEED_EMOTION_FLAT (payoff.ts, Wave 328),
// PROACTIVE_EMOTION_DECOUPLED (intention.ts, Wave 339), and
// ARC_SEED_EMOTIONAL_AFTERMATH_VOID (character-arc.ts, Wave 505) can all fire
// on the same script and surface as four separate lines, when a writer reads
// them as one note said four times. This is a DIFFERENT failure mode from
// the Wave 1185/1189 templates above: a template names a co-occurrence of
// genuinely DIFFERENT symptoms that together prove one wound; a duplicate
// family merges near-restatements of the SAME symptom that different passes
// happened to name differently (or, in the dual-authorship cases below,
// literally the same rule name computed independently by two passes).
//
// Every entry here was verified by reading the actual check logic in
// passes/*.ts, not assumed from rule-name similarity — the rulebook has
// hundreds of X_Y_DECOUPLED combinatorial rules (co-occurrence mode across
// dozens of channel pairs) and most pairs that merely share the "DECOUPLED"
// or "MONOTONE" stem audit genuinely different channels (e.g.
// REVELATION_SUSPENSE_DECOUPLED appears in both belief.ts and structure.ts
// under the SAME name but with DIFFERENT logic — belief.ts uses average-mode
// suspenseDelta, structure.ts uses categorical every-scene-flat — so it is
// correctly NOT a family here; conflating those two would be a false merge).
//
//   seed-scene-emotional-flatline — SEED_EMOTIONAL_DECOUPLED,
//     CLUE_SEED_EMOTION_FLAT, PROACTIVE_EMOTION_DECOUPLED,
//     ARC_SEED_EMOTIONAL_AFTERMATH_VOID (the reviewer's named example).
//     SEED_EMOTIONAL_DECOUPLED and CLUE_SEED_EMOTION_FLAT are the same check
//     (every seed scene has emotionalShift === 'neutral', n≥8, ≥3 seed
//     scenes) implemented independently in intention.ts and payoff.ts.
//     PROACTIVE_EMOTION_DECOUPLED audits the same neutral-emotion failure
//     over the broader proactive-scene set (clock-raised OR seeded, not seed
//     alone). ARC_SEED_EMOTIONAL_AFTERMATH_VOID checks the AFTERMATH channel
//     (the scene immediately AFTER a seed, not the seed scene itself) — a
//     related but not identical signal, kept in the family because all four
//     converge on one writer-facing note ("your seeding carries no feeling")
//     and a script that fails one very often fails the others too.
//   payoff-scene-emotional-flatline — PAYOFF_EMOTION_DECOUPLED, which is
//     defined TWICE under the identical rule name: intention.ts (Wave 521,
//     co-occurrence mode — payoff scenes vs. ≥2 emotional scenes elsewhere,
//     zero overlap) and payoff.ts (Wave 317, simpler "every payoff scene is
//     neutral" condition). Same rule constant, two independent authors, two
//     LocatedIssues on any script that fails both — the purest case of
//     unmerged duplication this mechanism exists to catch.
//   payoff-scene-relational-flatline — PAYOFF_RELATIONSHIP_DECOUPLED, same
//     dual-authorship pattern: intention.ts (Wave 591) and payoff.ts
//     (Wave 328) both independently check "no payoff scene carries a
//     relationship shift" under the identical rule name.
//   revelation-relational-flatline — REVELATION_RELATIONSHIP_DECOUPLED, same
//     pattern again: belief.ts (Wave 334) and intention.ts (Wave 591) both
//     check "no revelation scene carries a relationship shift" under the
//     identical rule name.
//
// All four families are document-anchored aggregate checks (the underlying
// rules' locations are all whole-script summaries like "All N seed scenes —
// emotionally neutral", never "Scene N"), so — like the Wave 1193 templates
// above — there is no line span to overlap: the merge fires whenever 2+ of a
// family's member rules appear anywhere in the report, contributed by 2+
// DISTINCT passes (a family converging within a SINGLE pass would mean one
// pass fired the same observation twice, which the existing rule contract
// doesn't allow — the cross-pass requirement is what makes this a genuine
// "two authors said the same thing" case rather than a false positive).

interface DuplicateFamily {
  /** Slug embedded in the finding's id, same convention as RootCauseTemplate. */
  id: string;
  /** The rule names this family recognizes. A family fires when 2+ of these
   *  appear, contributed by 2+ distinct passes — NOT "all of them", since a
   *  script can plausibly trip only two of a four-member family and that is
   *  still a real duplicate (the reviewer's own example: any 2 of the 4
   *  seed-emotion rules saying the same thing is already noise worth
   *  merging, not just when all 4 land together). */
  memberRules: string[];
  /** Plain-language name of the merged observation. No rule-name jargon. */
  title: string;
  /** The single observation every member rule is restating, plus the one
   *  craft fix — states how many passes agree (the evidence-strength framing
   *  the named templates above already use) instead of listing N near-
   *  identical lines. */
  observation: (members: LocatedIssue[], passCount: number) => string;
}

const DUPLICATE_FAMILIES: DuplicateFamily[] = [
  {
    id: 'seed-scene-emotional-flatline',
    memberRules: [
      'SEED_EMOTIONAL_DECOUPLED', 'CLUE_SEED_EMOTION_FLAT',
      'PROACTIVE_EMOTION_DECOUPLED', 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID',
    ],
    title: 'Seeded threads carry no feeling',
    observation: (members, passCount) =>
      `${passCount} separate checks agree on the same thing: the scenes where this script plants its `
      + `clues and threads (and, more broadly, where the protagonist takes initiative) are emotionally `
      + `neutral. A thread planted in a scene that also carries some feeling — dread, hope, grief — is `
      + `imprinted on the audience; one planted in a flat scene is catalogued as information and `
      + `forgotten before it can pay off. Move at least one seed into (or right after) a scene where a `
      + `character is already feeling something, rather than treating every plant as pure mechanism.`,
  },
  {
    id: 'payoff-scene-emotional-flatline',
    memberRules: ['PAYOFF_EMOTION_DECOUPLED'],
    title: 'Payoffs land with no feeling attached',
    observation: (members, passCount) =>
      `${passCount} independent checks land on the same payoff scenes and agree they're all `
      + `emotionally neutral — every thread resolution happens with the protagonist (and the audience) `
      + `feeling nothing in the moment. The double-impact payoff — the resolution that also breaks `
      + `someone's heart or delivers real relief — is one of the highest-yield fixes available: fuse at `
      + `least one payoff with an emotionally charged beat instead of resolving it as pure information.`,
  },
  {
    id: 'payoff-scene-relational-flatline',
    memberRules: ['PAYOFF_RELATIONSHIP_DECOUPLED'],
    title: 'Payoffs never move a relationship',
    observation: (members, passCount) =>
      `${passCount} independent checks agree that no payoff scene in this script also shifts a `
      + `relationship — thread resolutions run in a lane entirely separate from the characters' bonds. `
      + `The most resonant payoffs change how two people stand with each other AS they close a loop; `
      + `let at least one resolution also move a relationship instead of resolving in a relational vacuum.`,
  },
  {
    id: 'revelation-relational-flatline',
    memberRules: ['REVELATION_RELATIONSHIP_DECOUPLED'],
    title: 'Discoveries never change how anyone relates to anyone',
    observation: (members, passCount) =>
      `${passCount} independent checks agree that no revelation scene in this script also carries a `
      + `relationship shift — the truth comes out, but nobody's bond with anybody else moves because of `
      + `it. Most revelations should reframe a relationship (the truth about who someone is changes how `
      + `much they're trusted); let at least one disclosure land on a relationship, not just on the plot.`,
  },
];

/** Run one family's recognizer: filter to the family's member rules
 *  (document-anchored only — see the Wave 1193 comment above for why all
 *  four current families are), require the DISTINCT-PASS count to be 2+ (a
 *  single pass repeating itself isn't a cross-pass duplicate), and — when
 *  satisfied — claim every matching issue into one merged finding. Mirrors
 *  matchDocumentTemplate's shape deliberately (same anchor assumption, same
 *  "claim everything that matched" behavior) but is kept as its own function
 *  because the fire condition is a genuinely different quantifier: a
 *  template requires EVERY required rule; a family requires only 2+ of its
 *  member rules, since partial agreement between passes is already the
 *  noise this mechanism exists to remove. */
function matchDuplicateFamily(
  family: DuplicateFamily,
  located: LocatedIssue[],
): { consumed: LocatedIssue[]; findings: RootCauseFinding[] } {
  const candidates = located.filter(li => family.memberRules.includes(li.issue.rule) && li.anchor === 'document');
  if (candidates.length < 2) return { consumed: [], findings: [] };
  const passesInvolved = new Set(candidates.map(li => li.pass));
  if (passesInvolved.size < 2) return { consumed: [], findings: [] };
  return { consumed: candidates, findings: [synthesizeFamilyFinding(family, candidates, passesInvolved.size)] };
}

function synthesizeFamilyFinding(family: DuplicateFamily, members: LocatedIssue[], passCount: number): RootCauseFinding {
  const memberRules = uniqueRules(members);
  return {
    id: `${family.id}-${findingId(memberRules, undefined, undefined, family.id)}`,
    title: family.title,
    explanation: family.observation(members, passCount),
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
  const consumed = new Set<LocatedIssue>();

  // Duplicate-family merging runs FIRST — before the named templates and
  // before the generic clusterers — so a near-duplicate restatement never
  // gets a second, template- or generic-cluster-shaped chance to surface
  // (see the Wave 1193 comment above for why this is a different mechanism
  // from claim-before-generic template matching, not a special case of it).
  for (const family of DUPLICATE_FAMILIES) {
    const { consumed: familyConsumed, findings: familyFindings } = matchDuplicateFamily(family, located);
    for (const li of familyConsumed) consumed.add(li);
    findings.push(...familyFindings);
  }

  // Named templates run next and claim their member issues (see the Wave
  // 1185 design-choice comment above matchOverlapTemplate) so the generic
  // clusterers below never re-report the same spatial convergence under the
  // generic "Recurring X trouble" wording. Spatial-mode templates only ever
  // see issues the family pass above didn't already claim; document-mode
  // templates do the same, scoped to a disjoint rule set (see the Wave 1193
  // template comment) so the two mechanisms never compete for one issue.
  const afterFamilies = consumed.size === 0 ? located : located.filter(li => !consumed.has(li));
  for (const template of ROOT_CAUSE_TEMPLATES) {
    const { consumed: templateConsumed, findings: templateFindings } = template.mode === 'document'
      ? matchDocumentTemplate(template, afterFamilies)
      : matchOverlapTemplate(template, afterFamilies);
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
