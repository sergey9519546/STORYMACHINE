// Draft History script identity — which SCRIPT a recorded doctor run belongs
// to (2026-09-05, B-3/B-6).
//
// WHY THIS EXISTS. `sm_doctor_history_v1` (ScriptDoctorPanel.tsx) is ONE
// global localStorage array. Every completed diagnosis appended an entry to
// it and nothing ever asked which script the entry was a run OF — not the
// list UI, and (once the draft-rank line landed) not the rank either, whose
// denominator label says "runs and saved drafts **of this script**". Driven
// in Chromium on a fresh profile, a writer who ran the built-in sample, then
// uploaded "Script Alpha", then uploaded "Script Beta" was told, while
// looking at Beta: "Rank among your drafts: 3rd of 3 runs and saved drafts of
// this script" — the other two being a demo and an unrelated screenplay. The
// one field that could have scoped the union, `title`, was stamped from the
// HOST project's title prop rather than the analyzed document's, so all three
// entries read "Dead Frequency".
//
// WHAT A SCRIPT IS, HERE. There is no per-document id to borrow: ScriptIDE
// persists exactly ONE draft (`scriptide_draft_v1`, src/lib/
// scriptide-draft-store.ts) and its `snapshots` array is that one document's
// version list, not a per-document keyed store. So identity is derived from
// where the analyzed text CAME FROM, which is the honest answer available:
//
//   - "editor"          the ScriptIDE draft itself. Exactly one such document
//                       exists, which is also why it is the ONLY key whose
//                       rank union may include `snapshots` — a saved Version
//                       is a version of the editor draft and of nothing else.
//   - "upload:<name>"   a file the writer analyzed without loading it into the
//                       editor. Named by the document's OWN title page when it
//                       has one (so the same script re-uploaded after a
//                       revision keeps ranking against its earlier runs even
//                       if the filename changed), else by its filename stem.
//   - "sample"          the built-in demo (src/lib/sample-script.ts). Never
//                       recorded going forward (ScriptDoctorPanel's
//                       isSampleRun/analyzedIsSample guards) — the key exists
//                       so an entry recorded BEFORE those guards held can be
//                       recognized and kept out of the writer's own counts.
//
// WHAT THIS KEY CANNOT DO — the four limits, stated so they are documented
// behaviour rather than accidents someone rediscovers in a bug report. Each is
// a consequence of the identity above being derived from PROVENANCE plus the
// document's own name, which is the only evidence a browser-side history has:
//
//   1. Two DIFFERENT screenplays uploaded under the SAME title page (or the
//      same filename, when neither carries a title page) share one key and are
//      ranked against each other. Pinned by the "two different uploads that
//      share a title are one script to this module" test — the trade is
//      deliberate: a writer revising one script under a new filename is the
//      common case, two unrelated scripts named identically is not.
//   2. ONE script worked on BOTH ways splits in two: runs on the uploaded copy
//      key to `upload:<its title>`, runs after loading it into the editor key
//      to `editor`, so neither denominator counts the other's runs. Pinned by
//      the "the same script analyzed as an upload and in the editor keys
//      apart" test. Undercounting is the honest failure here — the alternative
//      (matching an upload to the editor by title) would let a title collision
//      merge a demo, or somebody else's draft, into the writer's own history.
//   3. The `editor` key survives a wholesale draft replacement: clear the
//      editor, paste a different screenplay, and its runs join the old ones
//      under one key. Deliberate — `snapshots` (the Versions list) belongs to
//      that same one document and carries over identically, so keying the
//      editor by anything finer would split the rank from the very Versions it
//      unions with. The two stores stay consistent with each other, which is
//      the property a rank denominator needs.
//   4. A TITLELESS upload keys by filename stem, so `draft-v2.fountain` and
//      `draft-v3.fountain` are two scripts, not two revisions of one. A file
//      with no title page carries no claim about what it is; inventing one
//      from a fuzzy filename match would be a guess, and a wrong guess here
//      silently merges histories.
//
// MIGRATION IS ADDITIVE. `scriptKey` is optional on the stored entry: every
// entry written before this module existed stays valid, stays listed (under
// "Earlier drafts"), and is simply not counted in any one script's
// denominator, because nothing in it can say which script it was. Nothing is
// dropped, renamed, or rewritten in place — the store is read forward-
// compatibly and only NEW entries carry the key.
//
// Pure: no I/O, no React, no localStorage access. Everything here is a
// function of its arguments, so the panel's behaviour is testable without a
// DOM (tests/core/doctor-history-identity.test.ts).

/** The ScriptIDE editor draft — the one document `snapshots` belongs to. */
export const SCRIPT_KEY_EDITOR = "editor";
/** The built-in sample screenplay. Never written by a post-fix run. */
export const SCRIPT_KEY_SAMPLE = "sample";
/** Namespace for a file analyzed without entering the editor. */
export const UPLOAD_KEY_PREFIX = "upload:";

/** Where the text a report was computed from came from. Mirrors the three
 *  cases ScriptDoctorPanel's own run classification already distinguishes
 *  (`runSource`: sample | upload | draft), so the two can never disagree. */
export type AnalyzedScriptSource =
  | { kind: "editor"; hostTitle?: string }
  | { kind: "sample"; sampleTitle: string }
  | { kind: "upload"; fileName: string; ownTitle?: string | null; hostTitle?: string };

/** The identity stamped onto a history entry and used to scope the rank. */
export interface AnalyzedScript {
  key: string;
  /** The ANALYZED document's own title — never the host project's, which is
   *  what the pre-fix `recordDoctorHistory(data, title)` call stamped. */
  title: string;
}

/** Lowercased, whitespace-collapsed name used inside an upload key, so
 *  "Script  Alpha" and "script alpha" are one script, not two. Returns "" for
 *  input with nothing in it. */
export function normalizeScriptName(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** "alpha.fountain" -> "alpha"; "My Script.final.fdx" -> "My Script.final".
 *  Only a real trailing extension is removed — a dot, then a LETTER, then up
 *  to seven more letters/digits — so "Act 2.5.fountain" becomes "Act 2.5"
 *  rather than "Act 2". Every format this panel accepts (.fountain, .fdx,
 *  .pdf, .txt) starts with a letter. */
export function fileNameStem(fileName: string): string {
  return fileName.replace(/\.[A-Za-z][A-Za-z0-9]{0,7}$/, "").trim() || fileName.trim();
}

/** The stable key + display title for the document a report was computed
 *  from. An upload with no readable title page and no filename falls back to
 *  the upload namespace with an empty name, which still separates it from the
 *  editor draft — the one distinction that must never collapse. */
export function analyzedScriptIdentity(source: AnalyzedScriptSource): AnalyzedScript {
  if (source.kind === "sample") {
    return { key: SCRIPT_KEY_SAMPLE, title: source.sampleTitle.trim() || "Sample script" };
  }
  if (source.kind === "editor") {
    return { key: SCRIPT_KEY_EDITOR, title: (source.hostTitle ?? "").trim() || "Untitled" };
  }
  const own = (source.ownTitle ?? "").trim();
  const stem = fileNameStem(source.fileName ?? "");
  const display = own || stem || "Untitled upload";
  return { key: `${UPLOAD_KEY_PREFIX}${normalizeScriptName(own || stem)}`, title: display };
}

/** The subset of ScriptDoctorPanel's `DoctorHistoryEntry` this module reads.
 *  Structural, not imported, so this file stays free of the component (the
 *  same convention snapshot-trend.ts's DraftHistoryRecord follows). */
export interface KeyedHistoryRecord {
  at: number;
  title: string;
  contentHash: string;
  /** Absent on every entry recorded before 2026-09-05 — see the migration
   *  note in this file's header. Never inferred from the title, which was
   *  itself stamped wrong before this fix. */
  scriptKey?: string;
}

export type HistoryGroupKind = "current" | "other" | "sample" | "legacy";

export interface DoctorHistoryGroup<T extends KeyedHistoryRecord> {
  /** null for the legacy group (entries that carry no key at all). */
  key: string | null;
  kind: HistoryGroupKind;
  /** Heading shown above the group's rows. */
  title: string;
  /** Newest-first, matching how the list has always rendered. */
  entries: T[];
}

export interface DoctorHistoryView<T extends KeyedHistoryRecord> {
  /** Current script first, then other scripts (most recent activity first),
   *  then the built-in sample, then unkeyed "earlier drafts". */
  groups: DoctorHistoryGroup<T>[];
  /** Entries belonging to the script on screen — the ONLY history rows the
   *  draft-rank denominator may count. Newest-first. */
  currentEntries: T[];
  /** currentEntries.length — every recorded run of the script on screen,
   *  including the run being displayed (which has its own row). */
  currentCount: number;
  /** Recorded runs of anything else: other scripts, the built-in sample, and
   *  unkeyed pre-migration entries. */
  elsewhereCount: number;
  /** currentCount + elsewhereCount — every row the list can show. */
  totalCount: number;
}

/** The key an entry belongs to, or null when it predates keying. A legacy
 *  entry whose contentHash matches the built-in sample's is attributed to the
 *  sample: it is the one pre-migration entry whose provenance IS knowable,
 *  and leaving it unattributed would let the demo keep sitting in a writer's
 *  "earlier drafts". `sampleContentHash` is null whenever it could not be
 *  computed (no WebCrypto — see computeSampleContentHash), in which case the
 *  entry simply stays legacy. */
export function entryScriptKey(
  entry: KeyedHistoryRecord,
  sampleContentHash?: string | null,
): string | null {
  if (sampleContentHash && entry.contentHash === sampleContentHash) return SCRIPT_KEY_SAMPLE;
  return typeof entry.scriptKey === "string" && entry.scriptKey.length > 0 ? entry.scriptKey : null;
}

const LEGACY_GROUP_TITLE = "Earlier drafts (recorded before runs were tracked per script)";

/** Group a Draft History array by script for display, and hand back the
 *  scoped slice the rank must use — ONE computed object, so the list's
 *  heading counts and the rank denominator can never drift apart again (they
 *  answer different questions, and both questions are answered here).
 *
 *  `entries` is in storage order (oldest-first, the order
 *  ScriptDoctorPanel appends in); every group's `entries` comes back
 *  newest-first, matching how the list has always rendered. */
export function groupHistoryByScript<T extends KeyedHistoryRecord>(
  entries: readonly T[],
  currentKey: string,
  currentTitle: string,
  sampleContentHash?: string | null,
): DoctorHistoryView<T> {
  const current: T[] = [];
  const sample: T[] = [];
  const legacy: T[] = [];
  const others = new Map<string, T[]>();

  for (const entry of entries) {
    const key = entryScriptKey(entry, sampleContentHash);
    if (key === null) {
      legacy.push(entry);
    } else if (key === currentKey) {
      current.push(entry);
    } else if (key === SCRIPT_KEY_SAMPLE) {
      sample.push(entry);
    } else {
      const bucket = others.get(key);
      if (bucket) bucket.push(entry);
      else others.set(key, [entry]);
    }
  }

  const newestFirst = (list: T[]): T[] => [...list].reverse();
  /** The heading for a group of OTHER scripts: the title the most recent of
   *  them was recorded under (titles can be edited between runs; the latest
   *  is the one the writer will recognize). */
  const groupTitle = (list: T[]): string => {
    for (let i = list.length - 1; i >= 0; i--) {
      const t = (list[i].title ?? "").trim();
      if (t) return t;
    }
    return "Untitled";
  };

  const groups: DoctorHistoryGroup<T>[] = [];
  if (current.length > 0) {
    groups.push({
      key: currentKey,
      kind: "current",
      title: currentTitle.trim() || groupTitle(current),
      entries: newestFirst(current),
    });
  }
  // Other scripts, most-recently-active first.
  const otherGroups = [...others.entries()].map(([key, list]) => ({
    key,
    kind: "other" as const,
    title: groupTitle(list),
    entries: newestFirst(list),
  }));
  otherGroups.sort((a, b) => (b.entries[0]?.at ?? 0) - (a.entries[0]?.at ?? 0));
  groups.push(...otherGroups);
  if (sample.length > 0) {
    groups.push({
      key: SCRIPT_KEY_SAMPLE,
      kind: "sample",
      title: "Built-in sample (not your draft)",
      entries: newestFirst(sample),
    });
  }
  if (legacy.length > 0) {
    groups.push({ key: null, kind: "legacy", title: LEGACY_GROUP_TITLE, entries: newestFirst(legacy) });
  }

  const currentCount = current.length;
  const totalCount = entries.length;
  return {
    groups,
    currentEntries: newestFirst(current),
    currentCount,
    elsewhereCount: totalCount - currentCount,
    totalCount,
  };
}

/** The built-in sample's determinism receipt, computed the same way the
 *  server does (`sha256(fountain.trim())`, server/nvm/analyze/doctor.ts's
 *  computeContentHash) so a legacy history entry written by a sample run can
 *  be recognized by content rather than by its (wrongly stamped) title.
 *
 *  Returns null instead of throwing when WebCrypto is unavailable — an
 *  insecure origin, or a browser with SubtleCrypto disabled. The caller
 *  degrades to "legacy": such an entry stays listed and stays out of every
 *  per-script denominator, which is the same outcome for the rank and a less
 *  specific label in the list. Never a reason to break a diagnosis. */
export async function computeSampleContentHash(sampleFountain: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bytes = new TextEncoder().encode(sampleFountain.trim());
    const digest = await subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}
