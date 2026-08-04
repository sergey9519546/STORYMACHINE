/**
 * Truth Extraction — the missing feeder for truth-ledger.ts's TruthLedger.
 *
 * truth-ledger.ts implements a complete, tested TruthFact store with
 * Allen-style interval-overlap contradiction detection, but nothing in the
 * repo ever constructed one from a screenplay (see that file's "2026-08-03
 * wiring audit" header note). This module is that adapter: deterministic,
 * pure-text extraction of TruthFact[] from raw Fountain, with zero LLM calls
 * and zero I/O — matching NORTH_STAR's "LLM may SENSE, never SCORE" and the
 * keyless-first product posture (there is no API key in this environment at
 * all, so an LLM-dependent extractor could not even be exercised here).
 *
 * ── Scope decision (read before extending) ──────────────────────────────
 * The task brief offered four candidate fact families, ranked by how safely
 * a machine can assert them from text alone: character presence, life
 * status, object possession, and world-facts-from-dialogue. This module
 * implements ONLY life status. The other three are explicitly rejected here,
 * not merely deferred:
 *
 *   - CHARACTER PRESENCE (location): rejected as a CONTRADICTION source,
 *     though it looked safest on paper. The problem is interval semantics,
 *     not extraction: a presence fact naturally covers only the one scene
 *     that establishes it (a character's location between scenes is
 *     unknown — screenplays cut between locations constantly with no
 *     on-page travel). Point intervals [sceneIdx, sceneIdx] can only
 *     overlap with each other at the same scene index, which never happens
 *     across two different scenes, so they can NEVER produce a
 *     contradiction — dead weight. Making them capable of contradicting
 *     would require either (a) assuming a location claim persists across
 *     scenes until superseded, which is false about ordinary screenplay
 *     grammar and would misfire on every character who visits two
 *     locations in a script, or (b) reasoning about scene SIMULTANEITY
 *     (MEANWHILE/CONTINUOUS cross-cuts), which is Allen-interval timeline
 *     reasoning — temporal-consistency.ts's job, not this file's, and this
 *     task was explicitly scoped away from that module.
 *   - OBJECT POSSESSION: rejected per the brief's own ranking ("harder, more
 *     error-prone") — tracking "who holds X" across scenes needs
 *     coreference across paraphrased hand-offs ("gives it to her", "she
 *     takes it back") that a lexicon pass will under- and over-match.
 *   - WORLD FACTS FROM DIALOGUE: rejected outright. Characters lie,
 *     speculate, and are simply wrong — turning a line of dialogue into an
 *     `objective_world`-layer fact is exactly the failure mode
 *     TruthFact.epistemicLayer exists to prevent, and reliably classifying
 *     a claim as sincere-and-correct vs. a lie/rumor/guess from text alone
 *     is a semantic judgment, not a lexicon one.
 *
 * LIFE STATUS survives this filter because it is the one fact type that is
 * both (a) irreversible in ordinary screenplay grammar — once dead, a
 * character does not return to on-screen dialogue without the script
 * flagging it as extraordinary — and (b) naturally OPEN-INTERVAL: "dead"
 * holds from the death scene forward with no natural end, which is exactly
 * what makes TruthLedger's overlap check order-sensitive BY CONSTRUCTION
 * (see detectLifeStatusFacts below and scripts/probe-truth-order-sensitivity.mjs).
 * A point-in-time "alive" fact (a character speaks on-screen at scene N)
 * overlapping an open "dead" fact (validFromStep = deathScene + 1) is a
 * structurally sound, cheaply-checkable contradiction.
 *
 * ── Precision guards (why the false-positive rate should be low) ────────
 *   1. Only NAMED CHARACTERS who are independently observed speaking
 *      somewhere in the script are eligible subjects — no scanning of
 *      arbitrary capitalized action-line nouns.
 *   2. Death cues are matched only in ACTION text, never dialogue (a
 *      character threatening/reporting a death is not evidence of one).
 *   3. Flashback/dream/memory/fantasy-marked scenes are excluded from BOTH
 *      death-cue detection and alive-evidence collection — the single
 *      biggest false-positive source for this shape of detector (a dead
 *      character narrating or appearing in memory is a common, legitimate
 *      device, not a contradiction).
 *   4. A HEDGE-WORD guard scans the text immediately before a death-cue
 *      match for conditional/speculative framing ("if X dies", "dreamed X
 *      was dead", "afraid X was dead") and discards the match — this is the
 *      second-biggest false-positive source ("fake death" reveals and
 *      characters worrying aloud read identically to real death cues at the
 *      lexicon level without this guard).
 *   5. V.O. (voice-over) dialogue does NOT count as "alive" evidence — a
 *      dead narrator speaking in V.O. is a standard device (e.g. a posthumous
 *      narrator) and must not manufacture a contradiction against their own
 *      death fact.
 *   6. Only the EARLIEST qualifying death cue per character is kept — later
 *      recaps/mentions of the same death do not multiply weak evidence.
 *
 * Known, accepted residual risk (documented rather than "solved" — see the
 * probe's clean-corpus measurement): a character whose name is also a common
 * word (e.g. "Hope", "Will", "Grace") could coincidentally match a death
 * cue that is not about them ("all hope is dead"). This module does not
 * special-case common-noun names; the false-positive rate measured against
 * real material is the honest arbiter of whether that risk matters in
 * practice, not a priori name-listing.
 */

import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';
import { normalizeScreenplay } from './screenplay-normalizer.ts';
import { TruthLedger, type TruthFact, type Contradiction } from './truth-ledger.ts';

// ── Public shape ─────────────────────────────────────────────────────────

export type ExtractedPredicate = 'life_status';
export type LifeStatusObject = 'alive' | 'dead';

export interface ExtractedFact {
  /** Lowercased character name — the TruthFact `subject` key. */
  subject: string;
  /** Display-case character name, as it appeared at the cue. */
  characterName: string;
  predicate: ExtractedPredicate;
  object: LifeStatusObject;
  /** Scene index (0-based, in the order the input text presents scenes)
   *  that this fact's evidence was observed at. */
  sceneIdx: number;
  validFromStep: number;
  validUntilStep: number | null;
  epistemicLayer: string;
  confidence: number;
  /** Short human-readable justification, becomes both the TruthFact
   *  proposition and its sole evidenceIds entry. */
  evidence: string;
}

// ── Scene segmentation (local, block-level — mirrors the shape
//    fountain-analyzer.ts's internal segmentScenes/extractSceneContent use,
//    but unexported there, so this is a small deliberate local copy rather
//    than reaching into another module's private internals) ────────────────

interface RawScene {
  slug: string;
  blocks: FountainBlock[];
  /** Transition block text (e.g. "FLASHBACK TO:") immediately preceding this
   *  scene's heading, if any — used for the non-literal-scene guard. */
  precedingTransition: string;
}

const NON_LITERAL_RE = /\b(FLASHBACK|DREAM|NIGHTMARE|MEMORY|FANTASY|VISION|IMAGINE[SD]?|HALLUCINATION)\b/i;
const TRANSITION_LOOKBACK = 5;

function segmentRawScenes(blocks: FountainBlock[]): RawScene[] {
  const headingIdxs: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene_heading') headingIdxs.push(i);
  }
  if (headingIdxs.length === 0) return [];

  const scenes: RawScene[] = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h];
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : blocks.length;
    let precedingTransition = '';
    for (let k = start - 1; k >= Math.max(0, start - TRANSITION_LOOKBACK); k--) {
      if (blocks[k].type === 'transition') { precedingTransition = blocks[k].text; break; }
      if (blocks[k].type === 'scene_heading') break;
    }
    scenes.push({ slug: blocks[start].text.trim(), blocks: blocks.slice(start + 1, end), precedingTransition });
  }
  return scenes;
}

/** Strip Fountain character-cue decorations down to the bare name — same
 *  normalization fountain-analyzer.ts applies, duplicated locally (small,
 *  stable, not worth importing an unexported helper for). */
function normalizeCharacterName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

interface SceneFacts {
  sceneIdx: number;
  slug: string;
  nonLiteral: boolean;
  actionText: string;
  /** speaker display name -> had at least one ON-SCREEN (non-V.O.) line */
  speakers: Map<string, boolean>;
}

function buildSceneFacts(rawScenes: RawScene[]): SceneFacts[] {
  return rawScenes.map((rs, idx) => {
    const nonLiteral = NON_LITERAL_RE.test(rs.slug) || NON_LITERAL_RE.test(rs.precedingTransition);
    const actionLines: string[] = [];
    const speakers = new Map<string, boolean>();
    let currentSpeaker = '';
    let currentIsVO = false;

    for (const b of rs.blocks) {
      const text = b.text.trim();
      if (!text) continue;
      if (b.type === 'action') {
        actionLines.push(text);
      } else if (b.type === 'character' || b.type === 'dual_dialogue') {
        currentIsVO = /\(\s*V\.O\.\s*\)/i.test(text);
        currentSpeaker = normalizeCharacterName(text);
      } else if (b.type === 'dialogue') {
        if (currentSpeaker) {
          const hadOnScreen = speakers.get(currentSpeaker) ?? false;
          speakers.set(currentSpeaker, hadOnScreen || !currentIsVO);
        }
      }
      // parenthetical/transition/shot/section/synopsis/note/lyrics/centered/
      // boneyard carry no life-status signal and are intentionally skipped.
    }

    return { sceneIdx: idx, slug: rs.slug, nonLiteral, actionText: actionLines.join(' '), speakers };
  });
}

// ── Death-cue lexicon ────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deathPatterns(nameEsc: string): RegExp[] {
  return [
    new RegExp(`\\b${nameEsc}\\s+(?:is|was)\\s+dead\\b`, 'i'),
    new RegExp(`\\b${nameEsc}(?:'s)?\\s+(?:dies|died)\\b`, 'i'),
    new RegExp(`\\bkills?\\s+${nameEsc}\\b`, 'i'),
    new RegExp(`\\bmurders?\\s+${nameEsc}\\b`, 'i'),
    new RegExp(`\\bshoots?\\s+${nameEsc}\\s+dead\\b`, 'i'),
    new RegExp(`\\b${nameEsc}'s\\s+(?:dead body|corpse|lifeless body|drowned body|electrocuted body)\\b`, 'i'),
    new RegExp(`\\bstabs?\\s+${nameEsc}\\s+to\\s+death\\b`, 'i'),
    new RegExp(`\\bstrangles?\\s+${nameEsc}\\s+to\\s+death\\b`, 'i'),
    // ── Drowning (closed 2026-08-04 — CC0_CORPUS_EXPANSION addendum) ──────
    // Direct verb, guarded against the common "drowns out" (masks a sound)
    // idiom, which is not a death cue and would otherwise false-positive on
    // any script with a character's laugh/voice/music "drowning out" noise.
    new RegExp(`\\b${nameEsc}\\s+(?:drowns|drowned)\\b(?!\\s+out)`, 'i'),
    // Fixture-literal reasonable variant (undertow.fountain's actual
    // phrasing): "went under" ALONE is not unambiguous-death language (a
    // character can go underwater and resurface), so this pattern requires
    // BOTH the submersion clause AND an explicit, sentence-final
    // non-resurfacing clause ("does not come back up.") in the same scene's
    // action text before it counts as a death cue. The trailing `\.`
    // deliberately excludes non-terminal continuations like "doesn't come
    // back up right away, but surfaces moments later" — a recovery, not a
    // death.
    new RegExp(`\\b${nameEsc}\\s+(?:goes|went)\\s+under\\b[\\s\\S]{0,300}\\b(?:does\\s+not|doesn't|never)\\s+(?:come\\s+(?:back\\s+)?up|surfaces?\\s+again)\\.`, 'i'),
    // ── Electrocution (closed 2026-08-04) ──────────────────────────────────
    // "Electrocuted" (unlike "shocked") denotes death by electric current in
    // ordinary usage, not mere injury — same unambiguous-verb tier as
    // "kills"/"murders" above, so no hedge-window special-casing beyond the
    // existing HEDGE_RE gate is needed.
    new RegExp(`\\b${nameEsc}\\s+(?:is|was)\\s+electrocuted\\b`, 'i'),
    new RegExp(`\\belectrocutes?\\s+${nameEsc}\\b`, 'i'),
    // Fixture-literal reasonable variant (high-voltage.fountain's actual
    // phrasing): "isn't moving" ALONE is injury-tier, not death-tier
    // language (a stunned or unconscious character also "isn't moving"), so
    // this pattern requires the full combination the fixture actually
    // stages — the character's name near an arc/current/voltage event, an
    // inability to let go of it, AND the unresponsive tail — before it
    // counts. Any one piece alone (an arc without a death, "doesn't let go"
    // of an unrelated object, "isn't moving" from being merely stunned)
    // does not match.
    new RegExp(`\\b${nameEsc}(?:'s)?\\b[\\s\\S]{0,120}\\b(?:arc|current|voltage)\\b[\\s\\S]{0,150}\\b(?:doesn't|does\\s+not|didn't|did\\s+not)\\s+let\\s+go\\b[\\s\\S]{0,150}\\bisn'?t\\s+moving\\b`, 'i'),
  ];
}

// Conditional / speculative / fictive framing that turns an apparent death
// cue into something else entirely (a threat, a nightmare, a fake-out) —
// checked in the text immediately BEFORE a candidate match. This is the
// single highest-value precision guard in this file (see file header §4).
const HEDGE_RE = /\b(if|unless|imagine[sd]?|dream(?:s|ed|ing)?|nightmare(?:s|d)?|afraid|thinks?|thought|believe[sd]?|pretend(?:s|ed)?|fake[sd]?|faked|staged|suppos(?:e|ed|edly)|apparently|rumor(?:ed)?|worr(?:y|ies|ied)|would|might|could|wish(?:es|ed)?|hope[sd]?|nearly|almost|swears?|convinced)\b/i;
const HEDGE_WINDOW = 40; // chars scanned before the match for hedge words
const SNIPPET_PAD = 25; // chars of context captured on each side for evidence

function findDeathCue(actionText: string, name: string): string | null {
  if (!actionText) return null;
  const nameEsc = escapeRegExp(name);
  for (const pattern of deathPatterns(nameEsc)) {
    const m = pattern.exec(actionText);
    if (!m || m.index == null) continue;
    const hedgeStart = Math.max(0, m.index - HEDGE_WINDOW);
    const hedgeContext = actionText.slice(hedgeStart, m.index);
    if (HEDGE_RE.test(hedgeContext)) continue; // hedged — precision guard, skip
    const snippetStart = Math.max(0, m.index - SNIPPET_PAD);
    const snippetEnd = Math.min(actionText.length, m.index + m[0].length + SNIPPET_PAD);
    return actionText.slice(snippetStart, snippetEnd).trim();
  }
  return null;
}

// ── Extraction ───────────────────────────────────────────────────────────

/** Turn raw screenplay text into a small, high-precision TruthFact[]-shaped
 *  fact list. Pure function of the input string — same text always produces
 *  the same facts (no Date.now(), no I/O), matching this cluster's
 *  determinism convention. */
export function extractTruthFacts(screenplayText: string): ExtractedFact[] {
  if (!screenplayText || !screenplayText.trim()) return [];

  const blocks = parseFountain(normalizeScreenplay(screenplayText));
  const rawScenes = segmentRawScenes(blocks);
  if (rawScenes.length === 0) return [];
  const sceneFacts = buildSceneFacts(rawScenes);

  // Eligible subjects: characters independently observed speaking anywhere
  // in the script (file header §1) — insertion order preserved for
  // deterministic iteration, though only earliest-match semantics depend on
  // scene order, not this set's order.
  const knownCharacters = new Set<string>();
  for (const sf of sceneFacts) {
    for (const name of sf.speakers.keys()) knownCharacters.add(name);
  }

  const facts: ExtractedFact[] = [];

  // Death facts — earliest qualifying cue per character only (file header §6).
  const deathByChar = new Map<string, { sceneIdx: number; evidence: string }>();
  for (const sf of sceneFacts) {
    if (sf.nonLiteral) continue; // file header §3
    for (const name of knownCharacters) {
      if (deathByChar.has(name)) continue;
      const hit = findDeathCue(sf.actionText, name);
      if (hit) deathByChar.set(name, { sceneIdx: sf.sceneIdx, evidence: hit });
    }
  }
  for (const [name, { sceneIdx, evidence }] of deathByChar) {
    facts.push({
      subject: name.toLowerCase(),
      characterName: name,
      predicate: 'life_status',
      object: 'dead',
      sceneIdx,
      // Valid from the scene AFTER the death scene — same-scene dialogue
      // (last words before dying) is extremely common and must not conflict
      // with the death established later in the same scene.
      validFromStep: sceneIdx + 1,
      validUntilStep: null, // irreversible — open interval, see file header
      epistemicLayer: 'objective_world',
      confidence: 0.85,
      evidence: `[scene ${sceneIdx}] ${evidence}`,
    });
  }

  // Alive facts — one point-in-time fact per (character, scene) where they
  // have on-screen, non-V.O. dialogue in a non-flashback/dream scene
  // (file header §3, §5).
  for (const sf of sceneFacts) {
    if (sf.nonLiteral) continue;
    for (const [name, onScreen] of sf.speakers) {
      if (!onScreen) continue;
      facts.push({
        subject: name.toLowerCase(),
        characterName: name,
        predicate: 'life_status',
        object: 'alive',
        sceneIdx: sf.sceneIdx,
        validFromStep: sf.sceneIdx,
        validUntilStep: sf.sceneIdx,
        epistemicLayer: 'objective_world',
        confidence: 0.95,
        evidence: `[scene ${sf.sceneIdx}] ${name} speaks on-screen at "${sf.slug}"`,
      });
    }
  }

  return facts;
}

/** Populate a fresh TruthLedger from extractTruthFacts' output. Returns both
 *  the ledger and the flat fact list (callers usually want to report on the
 *  facts even when there are zero contradictions). */
export function buildTruthLedger(screenplayText: string): { ledger: TruthLedger; facts: ExtractedFact[] } {
  const facts = extractTruthFacts(screenplayText);
  const ledger = new TruthLedger();
  for (const f of facts) {
    ledger.add(f.evidence, {
      step: f.sceneIdx,
      subject: f.subject,
      predicate: f.predicate,
      obj: f.object,
      epistemicLayer: f.epistemicLayer,
      confidence: f.confidence,
      validFromStep: f.validFromStep,
      validUntilStep: f.validUntilStep,
      evidenceIds: [f.evidence],
    });
  }
  return { ledger, facts };
}

/** Convenience one-shot: extract, populate, detect. Not wired into doctor.ts
 *  or any score/verdict path — see file header and truth-ledger.ts's own
 *  "KEEP AS REFERENCE / INTEGRATE LATER" status note. This function exists
 *  so the probe script and tests have a single call surface; it is not
 *  itself imported by any scoring code. */
export function detectTruthContradictions(screenplayText: string): {
  ledger: TruthLedger;
  facts: ExtractedFact[];
  contradictions: Contradiction[];
} {
  const { ledger, facts } = buildTruthLedger(screenplayText);
  return { ledger, facts, contradictions: ledger.detectContradictions() };
}

export type { TruthFact, Contradiction };
