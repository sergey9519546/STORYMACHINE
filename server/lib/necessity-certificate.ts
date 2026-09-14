// Necessity Certificate — the four questions a scene must answer before it is
// generated, and a FORM check over the answers.
//
// ── WHAT THIS IS ────────────────────────────────────────────────────────────
// Before a scene is generated or accepted, the author (or the outline step)
// answers four questions about it:
//
//   whyNow          — why this moment, and not earlier or later
//   whyHere         — why this place
//   whyThem         — why these characters and no others
//   forcingFunction — what makes the scene unavoidable: the pressure that
//                     means it cannot be skipped
//
// The certificate is attached to the outline beat it belongs to (`beatId`) so
// it travels with the beat, and the four answers are injected into the
// scene-generation prompt as stated constraints — four concrete anchors the
// generator would otherwise invent.
//
// ── WHAT THIS IS NOT: THE FORM/JUDGE LINE ───────────────────────────────────
// `checkNecessity()` validates FORM ONLY. It answers "did you answer?", never
// "is that a good reason?". It makes no model call, reads no corpus, and
// returns the same result for the same input forever.
//
// That line is not a convenience, it is the design, and it is also the law
// here: NORTH_STAR §1 "No LLM-as-judge" — every verdict a user sees is a
// deterministic rule, LLMs may SENSE but never SCORE. A checker that graded
// the *quality* of a stated reason would be exactly the banned thing, dressed
// as a quality feature. See docs/DECISION_LOG.md (form-checked, not judged)
// and docs/story-generation/NECESSITY_CERTIFICATE.md.
//
// The value is in the 90% case: the writer who skipped the question entirely.
// A writer who answers thoughtfully but wrongly is not this module's failure
// mode, and trying to catch them is how the check would become a judge.
//
// ── WHAT THE ARCHIVE PROPOSED, AND WHERE IT FELL SHORT ──────────────────────
// docs/research-archive/_CLEVER_MOVES.md §10 ("The Necessity Engine: It's a
// Form, Not a Judge") designed this and got the PRINCIPLE exactly right. Its
// sketch has two defects, both fixed here:
//
//   1. Its field comments promise semantic checks ("must reference a
//      time-specific event", "must reference a location-specific feature")
//      that its own code does not implement and that CANNOT be implemented
//      without judging. Following the comments would have built the judge the
//      same section forbids. This module implements the code's intent — form
//      only — and says so in every reason string it emits.
//   2. Its only actual rule is `v?.length >= 10`. That passes "aaaaaaaaaa",
//      "because.  ", "nnnnnnnnnn" and — the case that matters — "TBD later",
//      while a writer who types the same sentence into all four boxes sails
//      through. A 10-character floor does not catch the skipped question; it
//      catches the empty box. The rules below are chosen to catch the
//      SKIPPED question while still never judging the answer (see each rule's
//      own note).
//
// ── TWO OTHER "NECESSITY" FUNCTIONS IN THIS REPOSITORY ─────────────────────
//
// `necessityProof` (server/nvm/proof/tier2/necessity.ts, wired into
// proof/kernel.ts) is the name the archive's own sketch used, so a reader
// following _CLEVER_MOVES §10 lands there first and may conclude this module
// duplicates it. It does not: that proof calls `necessityScore` below on an
// already-generated scene's ops and fails the candidate under 0.5. It never
// sees a stated reason, and nothing here fails a candidate.
//
// ── RELATIONSHIP TO `necessityScore` (server/nvm/quality/index.ts:546) ──────
// Different concept, deliberately not merged. That function scores the StoryOp
// list of an already-generated scene — how many ops earn their place — and
// never sees a stated reason. This module never sees an op; it checks the
// author's stated reasons before generation. Two names, two inputs, two
// stages. Neither is a "better version" of the other.
//
// Pure module: no I/O, no clock, no randomness, no imports beyond the shared
// prompt sanitizer. Safe to import from a route, a schema, or a prompt builder.

import { sanitizeSingleLine } from './prompt-utils.ts';

// ── The type ────────────────────────────────────────────────────────────────

/** The four answers, in the order they are asked and rendered. */
export const NECESSITY_FIELDS = ['whyNow', 'whyHere', 'whyThem', 'forcingFunction'] as const;

export type NecessityField = (typeof NECESSITY_FIELDS)[number];

/** Writer-facing question for each field. One implementation — the route, the
 *  UI labels, the prompt block and the docs all read these, so the four
 *  questions cannot drift apart across surfaces. */
export const NECESSITY_QUESTIONS: Record<NecessityField, string> = {
  whyNow: 'Why this moment, and not earlier or later?',
  whyHere: 'Why this place?',
  whyThem: 'Why these characters and no others?',
  forcingFunction: 'What makes this scene unavoidable — what pressure means it cannot be skipped?',
};

/** Short label for a narrow UI column — the writer surface's field labels.
 *  Here rather than in the component, so the four questions have ONE home:
 *  a fourth wording map living in DirectorPanel.tsx could drift from these
 *  three (round-1 review, finding 6). */
export const NECESSITY_UI_LABELS: Record<NecessityField, string> = {
  whyNow: 'Why now',
  whyHere: 'Why here',
  whyThem: 'Why them',
  forcingFunction: 'Forcing function',
};

/** Short prompt-side label for each field. */
export const NECESSITY_PROMPT_LABELS: Record<NecessityField, string> = {
  whyNow: 'WHY NOW',
  whyHere: 'WHY HERE',
  whyThem: 'WHY THESE CHARACTERS',
  forcingFunction: 'FORCING FUNCTION (what makes the scene unavoidable)',
};

/**
 * The four stated reasons for one beat/scene, plus the id of the beat they
 * belong to. `beatId` is what makes the certificate travel WITH the beat
 * instead of being a free-floating form: the outline route persists the
 * certificate inside its beat, and a certificate whose beatId does not match
 * the beat carrying it is a wiring bug the check reports (`beat_id_mismatch`).
 */
export interface NecessityCertificate {
  beatId: string;
  whyNow: string;
  whyHere: string;
  whyThem: string;
  forcingFunction: string;
}

// ── Where it attaches ───────────────────────────────────────────────────────
//
// The certificate rides INSIDE the outline beat it belongs to — the beat
// object server/routes/config.ts persists (`stage.setOutline`) and
// server/engine/Stage.ts serializes into Illusion_State.outline_json — so it
// travels with the beat through save, reload, export and preset replacement
// without a second store to keep in sync.
//
// WHY IT IS NOT A FIELD ON `OutlineBeat` ITSELF. OutlineBeat is declared in
// server/engine/types.ts:383, and server/engine/types.ts is INSIDE the
// reachable set rooted at server/nvm/analyze/doctor.ts — i.e. it is a
// SCORING-PATH file by scripts/check-scoring-receipt.mjs's tier-2 definition
// (verified with scripts/lib/import-graph.mjs's computeReachableSet). Editing
// it requires a measurement receipt for a change that touches no score at
// all. The certificate is author-stated prose that reaches a prompt and
// nothing else, so it is modelled as a structural EXTENSION of the beat here
// instead. Nothing is lost: server/lib/validation.ts's OutlineBeatSchema is
// `.passthrough()`, the POST /api/outline handler spreads `...beat`, and
// Stage.ts round-trips the beat as JSON — so the field survives the whole
// path, and this module is where it is typed, validated and sanitized.

/** An outline beat carrying its certificate. Structural, so it applies to
 *  engine/types.ts's OutlineBeat and to the client's own beat type alike
 *  without either importing the other. */
export type WithNecessity<T> = T & { necessity?: NecessityCertificate };

/** The fields of a beat that identify it. */
export interface NecessityBeatRef {
  phase: string;
  turn_start: number;
  turn_end: number;
}

/**
 * The canonical id of the beat a certificate belongs to.
 *
 * OutlineBeat has no id field, and the outline is an ARRAY — an array index
 * would re-point every certificate at a different beat the moment a beat is
 * inserted or removed. Phase plus turn range is what the engine itself uses
 * to select the active beat (server/engine/agent/decision.ts:196 and
 * server/engine/DirectorNode.ts:874 both find a beat by
 * `phase === phase && turn within [turn_start, turn_end]`), so it is the
 * identity the rest of the system already treats as a beat's identity.
 *
 * The route stamps this onto every stored certificate, which is what makes
 * `beatIdMismatch` meaningful: a certificate whose id does not match the beat
 * carrying it has been moved, not authored, for that beat.
 */
export function necessityBeatId(beat: NecessityBeatRef): string {
  const phase = typeof beat.phase === 'string' ? beat.phase : '';
  const start = Number.isFinite(beat.turn_start) ? beat.turn_start : 0;
  const end = Number.isFinite(beat.turn_end) ? beat.turn_end : 0;
  return `${phase}:${start}-${end}`;
}

// ── Form thresholds (the defensible bar) ────────────────────────────────────

/** Minimum trimmed length of one answer, in characters.
 *
 *  WHY 16 AND NOT THE ARCHIVE'S 10: at 10, "TBD later." (10) and "Later on."
 *  (9→ nearly) sit right at the boundary, and every one-word non-answer a
 *  writer actually types ("Pacing.", "Because.", "Tension") is under it only
 *  by accident of spelling. 16 is the shortest floor that no single English
 *  word reaches and that a real minimal answer clears easily — "The vault
 *  shuts at dawn" is 22. It is a floor on EFFORT, not on quality: a 16-char
 *  answer still passes, however bad it is. */
export const NECESSITY_MIN_CHARS = 16;

/** Minimum number of DISTINCT normalized words in one answer.
 *
 *  WHY DISTINCT: a word floor alone is defeated by "because because because
 *  because"; a character floor alone is defeated by "aaaaaaaaaaaaaaaaaa".
 *  Counting distinct words closes both with one rule. Four is the smallest
 *  count that cannot be reached by a single content word plus articles, and
 *  it is reached by every real answer of the form "<subject> <verb> <object>
 *  <qualifier>". */
export const NECESSITY_MIN_DISTINCT_WORDS = 4;

/** Maximum length of one answer, in characters. Matches the 500-char cap
 *  OutlineBeatSchema already applies to a beat's goal/constraint/avoid
 *  (server/lib/validation.ts) — the certificate rides inside the beat, so a
 *  second, different cap would be a defect. */
export const NECESSITY_MAX_CHARS = 500;

/** Function words. A word from this list is never, on its own, evidence that
 *  a question was answered — "it is not" is three words and says nothing —
 *  so the `non_answer` rule asks whether any word OUTSIDE this list survives
 *  removing the placeholder phrases below.
 *
 *  It is used ONLY there. The distinct-word floor still counts every word,
 *  because "the vault door is shut" is a real four-word answer and should not
 *  be punished for containing "the" and "is". */
export const NECESSITY_STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'this', 'that', 'these', 'those', 'he', 'she', 'they', 'we', 'i', 'you',
  'his', 'her', 'him', 'them', 'their', 'our', 'by', 'as', 'from', 'into',
  'than', 'then', 'so', 'if', 'not', 'no', 'do', 'does', 'did', 'has', 'have',
  'had', 'will', 'would', 'can', 'could', 'there', 'here', 'up', 'out',
]);

/**
 * Placeholder tokens and phrases: text a writer types INSTEAD of answering.
 *
 * This is not a quality blocklist and must never become one. Every entry is a
 * literal non-answer — a placeholder ("tbd", "todo", "asdf"), a refusal
 * ("because", "no reason", "reasons"), or a restatement of the engine's own
 * demand ("the plot needs it", "to advance the plot"). A string may contain
 * any of these and still pass; a field fails only when what REMAINS after
 * removing them falls below the distinct-word floor — i.e. when the answer is
 * made of nothing else.
 *
 * Multi-word entries are matched as whole token sequences, never as
 * substrings, so "none" never matches inside "nonetheless".
 */
export const NECESSITY_NON_ANSWER_PHRASES: readonly string[] = [
  'n a', 'na', 'nil', 'none', 'null', 'nothing', 'unknown', 'unclear',
  'tbd', 'to be decided', 'to be determined', 'todo', 'to do', 'later', 'idk',
  'placeholder', 'asdf', 'qwerty', 'xxx', 'test', 'testing', 'lorem ipsum',
  'because', 'just because', 'because i said so', 'it just does',
  'no reason', 'reasons', 'plot reasons', 'story reasons', 'dramatic reasons',
  'for the plot', 'for plot', 'for drama', 'for tension', 'for pacing',
  'the plot needs it', 'the plot requires it', 'the story needs it',
  'the story requires it', 'the script needs it', 'it is needed',
  'it is necessary', 'its necessary', 'necessary', 'needed', 'required',
  'to move the story forward', 'to advance the plot', 'to move things along',
  'obviously', 'why not', 'see above', 'same as above', 'as above', 'ditto',
  'etc', 'whatever', 'dunno',
];

// ── Reason codes ────────────────────────────────────────────────────────────

/** Machine-readable reason a field failed the FORM check. Every code names a
 *  property of the TEXT, never of the idea in it. */
export type NecessityReasonCode =
  | 'missing'
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'too_few_distinct_words'
  | 'non_answer'
  | 'duplicate_answer';

export interface NecessityFieldResult {
  field: NecessityField;
  ok: boolean;
  /** Machine-readable codes, stable across releases. */
  reasons: NecessityReasonCode[];
  /** One writer-facing sentence per reason, in the same order. Each says what
   *  the FORM problem is; none says the answer is bad. */
  detail: string[];
}

export interface NecessityCheckResult {
  ok: boolean;
  /** The beatId carried on the certificate, echoed so a caller holding many
   *  results can route each back to its beat. '' when the certificate carries
   *  no usable id. */
  beatId: string;
  /** True when the certificate's beatId does not match the beat the caller
   *  says it belongs to (`opts.beatId`). A wiring problem, not a form problem:
   *  it does NOT by itself make `ok` false, because the writer's four answers
   *  may be perfectly well-formed; the caller decides what to do with a
   *  mis-filed certificate. */
  beatIdMismatch: boolean;
  fields: Record<NecessityField, NecessityFieldResult>;
  /** The fields that failed, in NECESSITY_FIELDS order. */
  failed: NecessityField[];
  /** The honest one-liner. Returned with every result so no surface can render
   *  a verdict without the sentence that bounds it. */
  disclaimer: string;
}

export interface NecessityCheckOptions {
  /** The beat this certificate is supposed to belong to. When given and
   *  different from `cert.beatId`, the result reports `beatIdMismatch`. */
  beatId?: string;
}

/** The sentence every surface must show next to a necessity verdict. It is a
 *  single exported constant so the route, the UI and the docs cannot drift
 *  into promising more than the check does. */
export const NECESSITY_CHECK_DISCLAIMER =
  'This checks that you answered all four questions, not whether the answers are good. ' +
  'No model reads them and nothing here scores them — the engine cannot tell a true reason from a plausible one.';

/** What the writer is told about where the answers go. Conditional on
 *  purpose, because the claim has to hold in every state: the certificate is
 *  stored on the beat unconditionally, and it becomes prompt constraints for
 *  a scene generated FROM that beat (buildSystemPreamble, via a SceneTarget
 *  carrying it). It does not claim that some other scene, generated from an
 *  archetype rather than from this beat, is constrained by it — no client
 *  generates scenes from outline beats today. */
export const NECESSITY_SAVED_WITH_BEAT_COPY =
  'Answers are saved with the beat. No scene generator in the app reads them yet — the engine states all four as constraints only for a scene generated from this beat, which nothing here does today.';

// ── Normalization ───────────────────────────────────────────────────────────

/** Lowercase, strip everything that is not a letter/digit/space, collapse
 *  whitespace. Deterministic and shared by every rule below so two rules can
 *  never disagree about what "the same words" means. */
function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalized(value: string): string {
  return normalizeWords(value).join(' ');
}

/** Remove every occurrence of a non-answer phrase, matched as a whole token
 *  sequence. Returns the surviving tokens. */
function stripNonAnswerPhrases(tokens: readonly string[]): string[] {
  const phrases = NECESSITY_NON_ANSWER_PHRASES
    .map(p => normalizeWords(p))
    .filter(p => p.length > 0)
    // Longest first, so "the plot needs it" is consumed before "needs"/"plot".
    .sort((a, b) => b.length - a.length);

  const out: string[] = [];
  let i = 0;
  outer: while (i < tokens.length) {
    for (const phrase of phrases) {
      if (i + phrase.length > tokens.length) continue;
      let matches = true;
      for (let k = 0; k < phrase.length; k++) {
        if (tokens[i + k] !== phrase[k]) { matches = false; break; }
      }
      if (matches) { i += phrase.length; continue outer; }
    }
    out.push(tokens[i]);
    i += 1;
  }
  return out;
}

// ── The check ───────────────────────────────────────────────────────────────

const REASON_DETAIL: Record<NecessityReasonCode, string> = {
  missing: 'No answer was supplied for this question.',
  empty: 'This answer is blank.',
  too_short: `This answer is shorter than ${NECESSITY_MIN_CHARS} characters — too short to be an answer rather than a placeholder.`,
  too_long: `This answer is longer than ${NECESSITY_MAX_CHARS} characters; shorten it (the beat's own goal/constraint fields carry the long form).`,
  too_few_distinct_words: `This answer uses fewer than ${NECESSITY_MIN_DISTINCT_WORDS} different words.`,
  // Says what the rule MEASURED, not what the writer meant. The earlier
  // wording asserted the answer was "made only of placeholder or filler
  // text", which is false in exactly the case the rule over-fires on
  // ("Nothing else has worked." is not filler) — round-1 review, finding 1.
  non_answer: 'Setting aside placeholder phrases ("TBD", "because the plot needs it") and words like "it" and "is", this answer has no words left, so there is nothing here that answers the question.',
  duplicate_answer: 'This answer is word-for-word identical to another of the four, so at least one of the four questions is unanswered.',
};

/**
 * FORM check over one certificate. Pure and deterministic: same input, same
 * output, no model call, no scoring of whether a reason is *good*.
 *
 * Every rule is a property of the text — present, non-empty, long enough,
 * enough different words, not only placeholder tokens, not a copy of a
 * sibling answer. Nothing here reads meaning.
 *
 * There is no rule here that compares an answer against the beat's own text.
 * One existed in round 1 (`restates_context`) and was removed by the round-1
 * review: a beat has no scene HEADING to restate — `OutlineBeat` is phase,
 * turn range, goal, constraint, avoid — so the only context available was a
 * whole goal sentence, and a "why here" answer for a beat whose goal names
 * the place must reuse the place's nouns. It rejected "It is the only room
 * with the safe." for a beat about the safe room. The other seven rules cover
 * the skipped question without needing an input this module cannot validate.
 */
export function checkNecessity(
  cert: NecessityCertificate | null | undefined,
  opts: NecessityCheckOptions = {},
): NecessityCheckResult {
  const raw = (cert ?? {}) as Partial<Record<NecessityField | 'beatId', unknown>>;
  const certBeatId = typeof raw.beatId === 'string' ? raw.beatId.trim() : '';

  // Normalized form of every field, computed once — the duplicate rule needs
  // every field's normalization before any field's verdict is final.
  const norm: Record<NecessityField, string> = {
    whyNow: '', whyHere: '', whyThem: '', forcingFunction: '',
  };
  for (const field of NECESSITY_FIELDS) {
    const value = raw[field];
    norm[field] = typeof value === 'string' ? normalized(value) : '';
  }

  const fields = {} as Record<NecessityField, NecessityFieldResult>;
  const failed: NecessityField[] = [];

  for (const field of NECESSITY_FIELDS) {
    const value = raw[field];
    const reasons: NecessityReasonCode[] = [];

    if (typeof value !== 'string') {
      reasons.push('missing');
    } else {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        reasons.push('empty');
      } else {
        if (trimmed.length < NECESSITY_MIN_CHARS) reasons.push('too_short');
        if (trimmed.length > NECESSITY_MAX_CHARS) reasons.push('too_long');

        const tokens = normalizeWords(trimmed);
        const distinct = new Set(tokens);
        if (distinct.size < NECESSITY_MIN_DISTINCT_WORDS) reasons.push('too_few_distinct_words');

        // Placeholder-only: does ANY content word survive removing the
        // placeholder phrases?
        //
        // THE BOUND, AND WHY IT IS THIS ONE (round-1 review, finding 1).
        // It used to be `surviving.size < NECESSITY_MIN_DISTINCT_WORDS` — at
        // least four words had to survive — and that rejected real answers:
        // the blocklist contains ordinary English content words ("nothing",
        // "later", "needed", "necessary", "test"), so a genuine four-to-six
        // word answer containing one of them dropped under the floor.
        // Measured by the reviewer across fifteen cases: three of ten
        // realistic writer answers were rejected ("Nothing else has worked.",
        // "She needs it later.", "He has nothing left."), against zero
        // intended targets missed either way. The bound below missed zero
        // targets and rejected none of the real answers.
        //
        // A form check that rejects a real answer is worse than one that
        // accepts a lazy one: the point is catching the SKIPPED question, and
        // a writer who is told their real sentence is filler learns to
        // distrust the whole check.
        const surviving = new Set(stripNonAnswerPhrases(tokens));
        let survivingContentWords = 0;
        for (const word of surviving) {
          if (!NECESSITY_STOP_WORDS.has(word)) survivingContentWords += 1;
        }
        if (survivingContentWords === 0) reasons.push('non_answer');

        // Copy of a sibling answer (exact, after normalization).
        const isDuplicate = NECESSITY_FIELDS.some(
          other => other !== field && norm[other].length > 0 && norm[other] === norm[field],
        );
        if (isDuplicate) reasons.push('duplicate_answer');
      }
    }

    const ok = reasons.length === 0;
    if (!ok) failed.push(field);
    fields[field] = {
      field,
      ok,
      reasons,
      detail: reasons.map(code => REASON_DETAIL[code]),
    };
  }

  return {
    ok: failed.length === 0,
    beatId: certBeatId,
    beatIdMismatch: typeof opts.beatId === 'string' && opts.beatId.trim() !== certBeatId,
    fields,
    failed,
    disclaimer: NECESSITY_CHECK_DISCLAIMER,
  };
}

// ── Runtime coercion ────────────────────────────────────────────────────────

/**
 * Narrow an unknown value (a request body's scene target, a row read back out
 * of a session database written by an older build) to a NecessityCertificate,
 * or null. Shape only — it does not run the form check, so a caller can tell
 * "there is no certificate here" apart from "there is one and it is
 * incomplete".
 *
 * Values are passed through sanitizeSingleLine() at the cap the schema
 * enforces: these four strings are written into an LLM prompt as four separate
 * lines, and a raw newline in one of them would forge a fifth.
 */
export function coerceNecessityCertificate(raw: unknown): NecessityCertificate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const out: NecessityCertificate = {
    beatId: typeof obj.beatId === 'string' ? sanitizeSingleLine(obj.beatId, 128) : '',
    whyNow: '', whyHere: '', whyThem: '', forcingFunction: '',
  };
  let sawAnyField = false;
  for (const field of NECESSITY_FIELDS) {
    const value = obj[field];
    if (typeof value !== 'string') continue;
    sawAnyField = true;
    out[field] = sanitizeSingleLine(value, NECESSITY_MAX_CHARS);
  }
  return sawAnyField ? out : null;
}

/**
 * True when all four answers are blank — an untouched form, not an attempt.
 *
 * The distinction matters at the storage seam: a writer who never opened the
 * necessity fields must not end up with a stored certificate that then
 * "fails" four times over, and a UI that renders four empty textareas must
 * not turn that into an answer. A PARTLY filled certificate is NOT blank: it
 * is a real, incomplete attempt, and the form check is what says so.
 */
export function necessityIsBlank(cert: NecessityCertificate | null | undefined): boolean {
  if (!cert) return true;
  return NECESSITY_FIELDS.every(field => {
    const value = cert[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

// ── Prompt injection ────────────────────────────────────────────────────────

/**
 * Render the four answers as a stated-constraint block for a scene-generation
 * prompt. Returns '' when there is no certificate, or when the certificate
 * FAILS the form check — a certificate with an unanswered question is not a
 * constraint, it is noise, and half a necessity block would tell the generator
 * that three anchors are the whole answer.
 *
 * The block states the answers as binding constraints on the scene. It never
 * asks the model to evaluate them: the model's job is to obey the four
 * anchors, not to grade them.
 */
export function buildNecessityPromptBlock(
  cert: NecessityCertificate | null | undefined,
  opts: NecessityCheckOptions = {},
): string {
  if (!cert) return '';
  const result = checkNecessity(cert, opts);
  if (!result.ok) return '';

  const lines = NECESSITY_FIELDS.map(field =>
    `- ${NECESSITY_PROMPT_LABELS[field]}: ${sanitizeSingleLine(cert[field], NECESSITY_MAX_CHARS)}`,
  );

  return [
    'SCENE NECESSITY (author-stated; these are constraints, not suggestions):',
    ...lines,
    'The scene you generate must be unmistakably about THIS moment, THIS place, THESE characters, and THIS pressure. ' +
    'If the scene you are about to write would work equally well a week earlier, in another room, or with a different pair of characters, it is the wrong scene — rewrite it until the four answers above are the reason it exists.',
  ].join('\n');
}
