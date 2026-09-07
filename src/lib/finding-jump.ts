// One jump affordance for every finding — the shared resolver behind it.
//
// ── Why this exists (2026-09-06, feature-length discovery item #9) ─────────
//
// On a 231-scene draft the doctor route already resolves 899 issues to honest
// anchors — 431 scene-tier, 81 character-tier, 42 line-tier, 345 correctly
// unlocatable 'document'-tier (server/nvm/analyze/locate.ts). The panel
// rendered a jump control on the top priorities, the per-pass issues and the
// root-cause headlines, but NOT on the notes inside a root cause's "contributing
// notes" expander, and it said nothing at all for the 345 findings that have no
// honest span — a writer reading priority #1 ("Conflict layer") saw an
// affordance on the finding below it and none on this one, with no explanation.
// Worse, the SAME control carried two different accessible names in two places:
// `Jump to line 136` in CoverageSummary's What-next card and
// `Jump to "<prose location>" in the script` in ScriptDoctorPanel — two
// implementations of one concept.
//
// This module is the single answer to "where does this finding point, what do
// we call that, and if nowhere, why not". Pure and React-free so the naming
// and the honesty rule are unit-testable without mounting a component (this
// repo has no jsdom), the same split src/lib/jump-span.ts (which resolves
// WHICH span) already uses. jump-span.ts stays the span picker; this module
// names the target and owns the not-locatable case.
//
// ── The naming rule ───────────────────────────────────────────────────────
//
// The anchor TIER decides the word, because the tier is what the server was
// honest about:
//   * 'scene'      → "Jump to scene N" — the finding is attributed to a scene,
//                    and N is that scene's 1-based number resolved from the
//                    route's own sceneLineSpans (index i is scene i's span),
//                    never re-parsed out of prose.
//   * 'lines'      → "Jump to line N" — the finding named an explicit range.
//   * 'character'  → "Jump to line N" — anchored to that character's first
//                    speaking line, which is a real line, not a scene claim.
//   * 'document'   → no control; an honest reason instead.
// A scene-tier anchor whose line falls outside every known span degrades to
// the line wording rather than inventing a scene number.

import type { LocatedIssue, RootCauseFinding, IssueAnchor } from "../../server/nvm/analyze/types.ts";
import type { SceneLineSpan } from "../../server/nvm/analyze/locate.ts";

/** What the panel should render for one finding: a jump, or a reason there
 *  isn't one. Never "nothing" — that was the defect. */
export type JumpTarget =
  | {
      kind: "jump";
      startLine: number;
      endLine: number;
      /** Accessible name AND visible label: "Jump to scene 12" / "Jump to line 340". */
      label: string;
      /** 1-based scene number when the target resolved to one, else null. */
      sceneNumber: number | null;
    }
  | { kind: "none"; reason: string };

/** The whole-draft case: act-level findings, prose patterns, anything the
 *  server deliberately left on the 'document' tier. Not a failure — the
 *  honest answer. */
export const NO_LOCATION_DOCUMENT_REASON =
  "No location — this note is about the draft as a whole (act-level, or a pattern spread across scenes), so there is no single line to jump to.";

/** The rarer case: the finding claims a place, but nothing in this report
 *  resolved it to a line. Kept distinct from the reason above so the copy
 *  never tells a writer "this is whole-draft" about a finding that simply
 *  failed to resolve. */
export const NO_LOCATION_UNRESOLVED_REASON =
  "No location — this note names a place the report could not resolve to a line in the draft it analysed.";

/** Regex every browser gate uses to find a jump control by its accessible
 *  name. Exported so the suites derive their expectation from this module
 *  instead of hand-typing a literal that silently stops matching when the
 *  wording moves (the drift docs/LANE_STANDARD.md §1 calls a defect). */
export const JUMP_CONTROL_NAME_RE = /jump to (?:scene|line) \d+/i;

/** Accessible name of a root-cause card's member-rule disclosure, for the same
 *  derive-don't-retype reason. Kept beside the label it must match
 *  (rootCauseExpanderLabel, at the bottom of this file). */
export const ROOT_CAUSE_EXPANDER_NAME_RE = /^Show the \d+ rules? behind (?:them|it)$/;

/** 1-based scene number containing `line`, or null when the line falls
 *  outside every known span (or no spans were sent). Spans are index-ordered
 *  (index i is scene i), so this is a plain scan — the arrays are one entry
 *  per scene, a few hundred at feature length. */
export function sceneNumberForLine(line: number, spans?: readonly SceneLineSpan[]): number | null {
  if (!spans || spans.length === 0) return null;
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i];
    if (line >= s.startLine && line <= s.endLine) return i + 1;
  }
  return null;
}

/** The visible/accessible name for a jump to `startLine`. `anchor` decides
 *  the word (see the header); omit it when the tier is unknown, which yields
 *  the line wording — the claim that is always true. */
export function jumpLabel(
  startLine: number,
  spans?: readonly SceneLineSpan[],
  anchor?: IssueAnchor,
): { label: string; sceneNumber: number | null } {
  const sceneNumber = sceneNumberForLine(startLine, spans);
  if (anchor === "scene" && sceneNumber !== null) {
    return { label: `Jump to scene ${sceneNumber}`, sceneNumber };
  }
  return { label: `Jump to line ${startLine}`, sceneNumber };
}

/** Build a JumpTarget from an already-chosen span. `reason` is what to say
 *  when there is no span. */
export function jumpTargetForSpan(
  span: { startLine?: number; endLine?: number } | null | undefined,
  spans?: readonly SceneLineSpan[],
  anchor?: IssueAnchor,
  reason: string = NO_LOCATION_UNRESOLVED_REASON,
): JumpTarget {
  if (!span || span.startLine === undefined || span.endLine === undefined) {
    return { kind: "none", reason };
  }
  const { label, sceneNumber } = jumpLabel(span.startLine, spans, anchor);
  return { kind: "jump", startLine: span.startLine, endLine: span.endLine, label, sceneNumber };
}

/** Index of every located issue by its prose `location`, first occurrence
 *  wins — the same collapse ScriptDoctorPanel's locationAnchorMap already
 *  performed, moved here so the anchor TIER survives alongside the span
 *  (the old map dropped it, which is why the panel could not name a scene). */
export type LocationAnchorIndex = Map<
  string,
  { startLine: number; endLine: number; anchor: IssueAnchor }
>;

export function indexLocatedIssuesByLocation(
  located: readonly Pick<LocatedIssue, "issue" | "anchor" | "startLine" | "endLine">[] | undefined,
): LocationAnchorIndex {
  const map: LocationAnchorIndex = new Map();
  for (const l of located ?? []) {
    if (l.startLine === undefined || l.endLine === undefined) continue; // 'document' tier — no honest span
    if (!map.has(l.issue.location)) {
      map.set(l.issue.location, { startLine: l.startLine, endLine: l.endLine, anchor: l.anchor });
    }
  }
  return map;
}

/** The jump for one issue, resolved through the index above.
 *  `documentTier` distinguishes "the server said whole-draft" from "we could
 *  not resolve it": an issue absent from the index because every one of its
 *  located entries was 'document'-tier gets the whole-draft sentence. */
export function jumpTargetForIssueLocation(
  location: string | undefined,
  index: LocationAnchorIndex,
  spans?: readonly SceneLineSpan[],
  documentTierLocations?: ReadonlySet<string>,
): JumpTarget {
  if (typeof location !== "string") {
    return { kind: "none", reason: NO_LOCATION_UNRESOLVED_REASON };
  }
  const hit = index.get(location);
  if (hit) return jumpTargetForSpan(hit, spans, hit.anchor);
  return {
    kind: "none",
    reason: documentTierLocations?.has(location)
      ? NO_LOCATION_DOCUMENT_REASON
      : NO_LOCATION_UNRESOLVED_REASON,
  };
}

/** Every location the server resolved ONLY to the 'document' tier — i.e. it
 *  looked and honestly found no line. Used for the reason split above. */
export function documentTierLocations(
  located: readonly Pick<LocatedIssue, "issue" | "anchor" | "startLine" | "endLine">[] | undefined,
): Set<string> {
  const anchored = new Set<string>();
  const document = new Set<string>();
  for (const l of located ?? []) {
    if (l.startLine !== undefined && l.endLine !== undefined) anchored.add(l.issue.location);
    else document.add(l.issue.location);
  }
  for (const a of anchored) document.delete(a);
  return document;
}

/** The jump for a root-cause finding's own headline. A finding with scenes
 *  is a scene claim (its title already says "Scenes 2–12"), so it takes the
 *  scene wording via its FIRST scene; a finding with a span but no scenes
 *  (line-tier members only) takes the line wording. `sceneIdxs` is 0-based
 *  (server/nvm/analyze/cluster.ts), 1-based on screen. */
export function jumpTargetForFinding(
  finding: Pick<RootCauseFinding, "sceneIdxs" | "startLine" | "endLine">,
  spans?: readonly SceneLineSpan[],
): JumpTarget {
  if (finding.startLine === undefined || finding.endLine === undefined) {
    return { kind: "none", reason: NO_LOCATION_DOCUMENT_REASON };
  }
  if (finding.sceneIdxs.length > 0) {
    return {
      kind: "jump",
      startLine: finding.startLine,
      endLine: finding.endLine,
      label: `Jump to scene ${finding.sceneIdxs[0] + 1}`,
      sceneNumber: finding.sceneIdxs[0] + 1,
    };
  }
  return jumpTargetForSpan(finding, spans);
}

/** The jump for ONE rule inside a root cause's contributing-notes list.
 *
 *  A RootCauseFinding carries member RULE NAMES, not member issues (see
 *  server/nvm/analyze/types.ts), so "where did this rule fire inside this
 *  finding" is resolved from the report's own locatedIssues: the first
 *  located issue for that rule whose span lies inside the finding's own
 *  envelope. That is a lookup, not a second clustering implementation — it
 *  never decides membership, only which of an already-declared member's
 *  occurrences to point at, and it refuses to point outside the finding.
 *  When the finding has no envelope (a 'Widespread …' document-family
 *  cause), the first anchored occurrence of the rule anywhere is used, since
 *  there is no envelope to violate. */
export function jumpTargetForMemberRule(
  rule: string,
  finding: Pick<RootCauseFinding, "startLine" | "endLine">,
  located: readonly Pick<LocatedIssue, "issue" | "anchor" | "startLine" | "endLine">[] | undefined,
  spans?: readonly SceneLineSpan[],
): JumpTarget {
  const anchored = (located ?? []).filter(
    (l) => l.issue.rule === rule && l.startLine !== undefined && l.endLine !== undefined,
  );
  if (anchored.length === 0) {
    const fired = (located ?? []).some((l) => l.issue.rule === rule);
    return {
      kind: "none",
      reason: fired ? NO_LOCATION_DOCUMENT_REASON : NO_LOCATION_UNRESOLVED_REASON,
    };
  }
  const inside =
    finding.startLine !== undefined && finding.endLine !== undefined
      ? anchored.filter((l) => l.endLine! >= finding.startLine! && l.startLine! <= finding.endLine!)
      : anchored;
  const pick = inside[0] ?? (finding.startLine === undefined ? anchored[0] : undefined);
  if (!pick) return { kind: "none", reason: NO_LOCATION_UNRESOLVED_REASON };
  return jumpTargetForSpan(pick, spans, pick.anchor);
}

/** Copy for a root cause's two counts (discovery item #10).
 *
 *  The card previously said "15 issues converge here" (memberCount, from the
 *  server-generated explanation) directly above "Show the 12 contributing
 *  notes" (memberRules.length) — one card, two numbers, the same word for
 *  both. They count different things and both are true: 15 individual notes
 *  fired, produced by 12 distinct rules.
 *
 *  DECISION: the writer-facing size of a root cause is the NUMBER OF ISSUES
 *  (memberCount) — that is what the server's own explanation sentence already
 *  leads with and what the severity ordering uses (cluster.ts sorts by
 *  memberCount). The expander lists RULES, so it says rules. Where the two
 *  differ, both are shown ("15 issues from 12 rules") so neither number can
 *  read as a contradiction of the other. */
export function rootCauseCountSentence(memberCount: number, ruleCount: number): string {
  const issues = `${memberCount} issue${memberCount === 1 ? "" : "s"}`;
  if (ruleCount === memberCount) return issues;
  return `${issues} from ${ruleCount} rule${ruleCount === 1 ? "" : "s"}`;
}

/** Label for the expander that reveals the member RULES. Always says
 *  "rules", because rules are what it lists. */
export function rootCauseExpanderLabel(memberCount: number, ruleCount: number): string {
  return `Show the ${ruleCount} rule${ruleCount === 1 ? "" : "s"} behind ${
    memberCount === 1 ? "it" : "them"
  }`;
}
