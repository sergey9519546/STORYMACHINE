// THE THREE-SCAN RECEIPT CONVERSION, APPLIED MECHANICALLY.
//
// docs/brain/Owner/Owner - R5 Measurement and Merge.md worked out, by running
// the gate's own exported functions over three real branches in a throwaway
// clone, that closing the receipt gate after a corpus run takes a specific
// edit: each PENDING entry must be REWRITTEN IN PLACE so the range adds
// measured entries and no pending one. Appending a measured entry beside them
// does not work (`checkReceiptForRange` validates EVERY entry the range adds,
// and `ok` is `problems.length === 0`), and neither does fixing only the
// heading — `pendingReason` runs THREE scans and all three have to come back
// clean:
//
//   scan one   the `###` heading
//   scan two   four phrases anywhere in the entry body, each compiled with
//              `\s+` between words so a line wrap inside one still matches
//   scan three the VALUE of every required field, where a value runs from its
//              own `- **` line to the next `- **` bullet — a window large
//              enough to cross a `####` addendum heading and swallow prose
//
// This module is that edit, as code. It takes the receipt's text and the facts
// a real run produced, and returns the rewritten text plus every edit it made,
// so `--dry-run` can print them as a diff and a human can read them before
// anything is committed.
//
// WHAT IT WILL NOT DO. It never invents a number, a fingerprint, a SHA or an
// attestation — every one of those comes in from the caller, out of the run.
// And it never claims prose it re-tensed was written after the measurement:
// each converted entry gains one banner line saying that the body below it is
// the entry AS FILED with its pre-measurement tense mechanically corrected,
// and naming the commit where the original bytes still are. A reader who wants
// the entry as it was written has one `git show` to run.
//
// PURITY: text in, text out. No filesystem, no environment, no clock; the
// date and the machine identity are arguments, because a receipt that quotes a
// machine nobody ran on is the failure this whole gate exists to prevent.

import {
  ENTRY_HEADING_RE,
  PENDING_PHRASES,
  pendingReason,
} from '../check-scoring-receipt.mjs';

/** Every refusal, so a caller can tell a guard from a crash. */
export class ConversionError extends Error {
  constructor(message, detail = []) {
    super(message);
    this.name = 'ConversionError';
    this.detail = detail;
  }
}

/**
 * How each pending phrase is re-tensed.
 *
 * These are the only four phrases `pendingReason`'s second scan knows, and the
 * gate exports them so this table cannot drift from the gate's. Each rewrite
 * is a TENSE SHIFT, not a deletion: "no run had happened as of filing" is true
 * before and after the measurement, where "no run has happened" becomes false
 * the moment the owner runs one. A deletion would leave a sentence that says
 * something else; a tense shift leaves the sentence's claim intact and dated.
 *
 * None of the replacements re-matches any phrase in the list — asserted in
 * tests/scripts/receipt-conversion.test.ts, together with the completeness
 * check that fails if the gate ever grows a fifth phrase.
 */
export const PENDING_PHRASE_REWRITES = Object.freeze({
  'has not been run': 'had not been run as of filing',
  'was not run': 'had not been run as of filing',
  'not yet measured': 'unmeasured as of filing',
  'pending owner measurement': 'awaiting owner measurement as filed',
});

/** One phrase's rewrite, by phrase text. A function so callers (and this file)
 *  need no index signature on the frozen table. */
export function rewriteFor(phrase) {
  return Object.prototype.hasOwnProperty.call(PENDING_PHRASE_REWRITES, phrase)
    ? PENDING_PHRASE_REWRITES[phrase]
    : undefined;
}

/** The fields a converted entry owes, in the order they are written. The four
 *  the gate REQUIRES are marked; `Measured AUC-24` is not required by the gate
 *  but is the whole point of the run, so it is filled too. */
const CONVERTED_FIELDS = [
  { label: 'Command', insertIfMissing: true },
  { label: 'Measured AUC-24', insertIfMissing: true },
  { label: 'Corpus fingerprint', insertIfMissing: true },
  { label: 'Git SHA', insertIfMissing: true },
  // `Baseline used` is the gate's ALTERNATIVE spelling of the Git SHA
  // requirement (`REQUIRED_FIELDS`'s "Git SHA (or Baseline used)"), and
  // `pendingReason` tries both patterns. An entry that carries it and keeps a
  // PENDING marker in it would stay pending however clean the Git SHA field
  // is, so it is rewritten WHEN PRESENT — and never inserted, because an entry
  // that measured at HEAD has no baseline tree to name.
  { label: 'Baseline used', insertIfMissing: false },
  { label: 'Runner attestation', insertIfMissing: true },
];

/**
 * The heading that bounds the entry as it was FILED.
 *
 * WHY THE ENTRY IS RESTRUCTURED AND NOT PATCHED IN PLACE (round-1 review, F4).
 * Round 1 replaced each field where it stood and left the body around it. On
 * the real `scoring/renderer-residuals` entry that produced a receipt whose
 * heading says MEASURED and whose first paragraph says "its AUC-24 is not
 * known … exits **1** on this entry, which is the intended state … No AUC-24
 * number is stated, implied or projected anywhere on this branch". None of
 * those sentences is in `PENDING_PHRASES`, so the scanner passed an entry that
 * contradicted itself in the paragraph a reader reaches first.
 *
 * Per-sentence surgery on arbitrary prose is the wrong fix: those sentences
 * were TRUE when they were written, and a mechanical rewrite of them would be
 * this script inventing claims. So the entry is given one shape instead:
 *
 *   heading (MEASURED …)
 *   the conversion banner
 *   the five fields this run measured
 *   - **Entry body as filed:**   <- bounds every field's value window
 *   #### As filed, before this measurement …
 *   the entry's original body, verbatim but for the re-tensed phrases
 *
 * Everything that describes the pending state is then below a heading that
 * says so, and everything above it is the run's own record.
 */
export const AS_FILED_HEADING_PREFIX = '#### As filed, before this measurement';

/**
 * Sentences that assert no measurement exists. They are legitimate BELOW the
 * as-filed boundary and a contradiction above it, so this is the guard that
 * the restructure actually put them below it. Drawn from the three real
 * pending entries (`AUC-24 is not known`, `no AUC-24 number is stated`,
 * `exits **1** on this entry`, `claims none`, `not a receipt`).
 */
export const PENDING_ASSERTION_PATTERNS = Object.freeze([
  /\bAUC-24\s+is\s+not\s+known\b/i,
  /\bno\s+AUC-24\s+(?:number|value)\s+is\s+(?:stated|claimed)/i,
  /\bhas\s+no\s+AUC-24\s+(?:number|value)\b/i,
  /\bclaims\s+none\b/i,
  /\bexits\s+\*\*1\*\*/i,
  /\bis\s+an\s+honest\s+ledger\s+row,\s+not\s+a\s+receipt\b/i,
  /\bno\s+real-corpus\s+(?:run|measurement)\s+(?:happened|was\s+run)\b/i,
]);

/**
 * Refuse when a sentence asserting that no measurement exists survives ABOVE
 * the as-filed boundary — where it would contradict the heading and the
 * fields. Exported so the guard can be shown failing on its own input.
 *
 * @throws ConversionError naming every offending line.
 */
export function assertNoPendingAssertionsAbove(lines, boundaryIndex, heading = '(entry)') {
  const offenders = [];
  for (let i = 0; i < boundaryIndex && i < lines.length; i++) {
    for (const re of PENDING_ASSERTION_PATTERNS) {
      if (re.test(lines[i])) { offenders.push(`  line ${i + 1}: ${lines[i].trim()}`); break; }
    }
  }
  if (offenders.length === 0) return;
  throw new ConversionError(
    `${offenders.length} sentence(s) asserting that no measurement exists survive ABOVE the `
    + '"as filed" boundary of this entry.',
    [
      heading,
      ...offenders,
      '',
      'Above that boundary the entry speaks for the run that just happened, so a sentence saying',
      'the measurement does not exist is a contradiction a reader meets before the numbers. This',
      'is the same refusal `convertHeading` applies to a heading, for the same reason. Move the',
      'sentence below the boundary or rewrite it by hand; nothing was committed.',
    ],
  );
}

/** The bullet that BOUNDS every rewritten field's value window.
 *
 * THE PROBLEM IT SOLVES, which is the note's scan three in its hardest form: a
 * field's value runs from its own `- **` line to the NEXT `- **` bullet, so a
 * trailing field's window swallows every paragraph below it to the end of the
 * entry — and a bare `PENDING` in that swallowed prose keeps the entry pending
 * no matter how the field itself is written. Mangling the prose to remove the
 * word would be the wrong fix (it is the entry's own account of why it was
 * filed pending, and it was true when written). Ending the WINDOW is the right
 * one: this bullet is a `- **` line, so every field above it stops here, and
 * it says in its own words what the prose below it is.
 */
function terminatorLines(facts) {
  return [
    '- **Entry body as filed:** the section below is this entry as it was filed,',
    '  before any measurement existed — minus the fields above, which this run rewrote,',
    '  and with the phrases that named the absence of a run put into the past tense.',
    '  Sentences there describe the state AT FILING and several are no longer true; the',
    `  fields above are the run's own record. Original bytes: \`${facts.filedAtSha.slice(0, 8)}\`.`,
  ];
}

/**
 * The probe lines of a Command field, one per side that was attempted, saying
 * what actually happened. An empty `facts.probes` means the plan recorded no
 * probe for this step, and the field says that instead of claiming a run.
 */
function probeCommandLines(facts) {
  const probes = facts.probes ?? [];
  if (probes.length === 0) {
    return ['no corpus-shape probe (the measurement plan records none for this step);'];
  }
  const words = { ran: 'RAN', skipped: 'was SKIPPED', unavailable: 'was UNAVAILABLE' };
  return [
    '`npm run --silent probe-corpus-shape -- --csv`, which',
    ...probes.map((p, i) => `  ${i === probes.length - 1 ? '' : ''}on the ${p.which} tree ${words[p.outcome] ?? p.outcome} (${p.detail.replace(/\s+/g, ' ').slice(0, 90)});`),
  ];
}

function labelPattern(label) {
  return new RegExp(`^\\s*(?:[-*]\\s+)?\\*\\*\\s*${label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*:?\\s*\\*\\*`, 'i');
}

/**
 * One entry's line span in a receipt's line array: `### <date>` through the
 * line before the next `### <date>` (or end of file). Uses the gate's own
 * heading regex, so "what is an entry" has exactly one definition.
 */
export function findEntries(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (ENTRY_HEADING_RE.test(lines[i].trim())) {
      if (out.length > 0) out[out.length - 1].end = i;
      out.push({ heading: lines[i].trim(), start: i, end: lines.length });
    }
  }
  return out;
}

/**
 * The lines of one field's own PARAGRAPH — its labelled line plus the
 * continuation lines under it, stopping at a blank line, the next bullet, or
 * any heading.
 *
 * DELIBERATELY NARROWER THAN THE GATE'S FIELD WINDOW. `fieldValueByPattern`
 * runs a value all the way to the next `- **` bullet, which on a trailing
 * field is the rest of the entry; replacing THAT would delete the entry's
 * body. So the rewrite replaces the paragraph and the VERIFICATION uses the
 * gate's own wider window — which is exactly where the note measured the
 * failures that scan three exists to catch.
 */
export function fieldParagraph(lines, start, end, label) {
  const re = labelPattern(label);
  for (let i = start; i < end; i++) {
    if (!re.test(lines[i])) continue;
    let j = i + 1;
    for (; j < end; j++) {
      const line = lines[j];
      if (line.trim() === '') break;
      if (/^\s*[-*]\s+\*\*/.test(line)) break;
      if (/^#{1,6}\s/.test(line)) break;
    }
    return { start: i, end: j, bulleted: /^\s*[-*]\s/.test(lines[i]) };
  }
  return null;
}

/** Re-tense every pending phrase in `text`, preserving the first letter's
 *  case. Returns { text, hits }. A match may span a line wrap — each phrase is
 *  compiled with `\s+` between words for exactly that reason — and the
 *  replacement collapses the wrap, which markdown reflows. */
export function retensePhrases(text) {
  let out = text;
  const hits = [];
  for (const phrase of PENDING_PHRASES) {
    const replacement = rewriteFor(phrase);
    if (!replacement) {
      throw new ConversionError(
        `the receipt gate knows a pending phrase this converter does not: "${phrase}". `
        + 'Add it to PENDING_PHRASE_REWRITES with a tense shift that keeps the sentence true.',
      );
    }
    const re = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    out = out.replace(re, (match) => {
      hits.push(match.replace(/\s+/g, ' '));
      return /^[A-Z]/.test(match)
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;
    });
  }
  return { text: out, hits };
}

/** Scan one: the heading. A PENDING parenthetical is replaced by what was
 *  measured; a bare PENDING word left outside any parenthetical is refused
 *  rather than guessed at, because a heading is the one line a reader trusts. */
export function convertHeading(heading, facts) {
  const measured = facts.auc24 === null
    ? `MEASURED ${facts.date} — no AUC-24 applies to this range; see the fields below`
    : `MEASURED ${facts.date} — AUC-24 ${facts.auc24.toFixed(4)} on the local real-script corpus`;
  let out = heading.replace(/\s*\([^()]*\bPENDING\b[^()]*\)\s*$/i, ` (${measured})`);
  if (out === heading) {
    out = heading.replace(/\s*\([^()]*\bPENDING\b[^()]*\)/i, ` (${measured})`);
  }
  if (/\bPENDING\b/i.test(out)) {
    const retensed = retensePhrases(out).text;
    if (/\bPENDING\b/i.test(retensed)) {
      throw new ConversionError(
        'scan one: the heading still contains the word PENDING after the parenthetical was replaced.',
        [heading, '', 'Rewrite the heading by hand — a heading is the line a reader trusts, and'
          + ' guessing at which clause the word belongs to is how a wrong one ships.'],
      );
    }
    out = retensed;
  }
  return out;
}

/** The banner every converted entry gains, directly under its heading. */
function bannerLines(facts) {
  return [
    '',
    `**CONVERTED ${facts.date} BY \`npm run owner:measure\`.** This entry was filed as a ledger`,
    'row before any real-corpus run existed. It now has two parts: the fields immediately',
    `below, which are this run's record, and a \`${AS_FILED_HEADING_PREFIX}\``,
    'section carrying the entry as it was filed. Read the fields for what was measured and',
    `that section for what the branch is. Original bytes: \`${facts.filedAtSha.slice(0, 8)}\``,
    '(`git show <sha>:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`).',
  ];
}

/** Steps 2-4 of the recipe: the content the receipt owes once the run exists. */
function fieldBody(label, facts) {
  const bullet = (rest) => [`- **${label}:** ${rest[0]}`, ...rest.slice(1).map((l) => `  ${l}`)];
  switch (label) {
    case 'Command':
      // WRITTEN FROM WHAT RAN, NOT FROM A TEMPLATE (round-1 review, F2). Round 1
      // asserted `probe-corpus-shape` ran "on this tree and on the pre-branch
      // base" in every receipt, under an attestation signing for the whole
      // list — while three committed plan steps carry `probe: null` and a probe
      // that exists can still come back skipped or unavailable. `facts.probes`
      // is the run's own record of each side's outcome.
      return bullet([
        `\`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure\` on \`${facts.branch}\` @`,
        `\`${facts.filedAtSha.slice(0, 8)}\`, which ran, in this order and in the foreground:`,
        '`node scripts/verify-corpus-layout.mjs --corpus-dir=<corpus>`;',
        ...probeCommandLines(facts),
        'and `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real`. The full command',
        `lines and their output are on the owner's machine in the run's local output`,
        'directory, which is outside this repository and stays there. The command list',
        'this entry carried as filed is in the section below and in git at the SHA above.',
      ]);
    case 'Measured AUC-24':
      if (facts.auc24 === null) {
        return bullet([
          '**not applicable to this range** — the run happened and its numbers are in this',
          'entry, but this range moves no statistic AUC-24 reports. See the fingerprint above.',
        ]);
      }
      // THE RECIPE ID IS THE ONE THAT PRODUCED THIS NUMBER (round-1 review, F1).
      // Round 1 stamped `shuffle-drop/v2` on a number `measure-real` computed
      // with its own pre-2026-09-12 scene split, in a permanent receipt, under
      // an attestation — writing the id that exists to prevent exactly that
      // comparison onto the number it was meant to protect against.
      return bullet([
        `**${facts.auc24.toFixed(4)}** — shuffle-drop over the first ${facts.subsetSize} manifest scripts,`,
        `computed by \`npm run measure-real\` on recipe \`${facts.degradationId}\``,
        `(${facts.degradationEvidence}).`,
        ...(facts.recipeSame
          ? [
            `That is the same recipe \`lock-auc24\` writes (\`${facts.lockDegradationId}\`), so this`,
            'number and the committed table are the same statistic.',
          ]
          : [
            `**IT IS NOT THE RECIPE \`lock-auc24\` WRITES.** The committed table`,
            `\`tests/fixtures/auc24-table.json\` is \`${facts.lockDegradationId}\` (scripts/lib/auc.ts);`,
            'this number is on the segmentation that id was bumped away from, which is the same',
            'segmentation the **0.731 of 2026-07-11** was measured on. So the two numbers this run',
            'produces are NOT comparable to each other, and this one is NOT the one `AUC24_FLOOR`',
            'was written for. Neither is comparable to the 761-script P1 baseline\'s 0.734 / 0.766',
            '— different corpus, different degradation, different denominator.',
          ]),
        `Floor \`AUC24_FLOOR\` ${facts.floor}, for reference only where the recipes differ.`,
        ...(facts.baselineAuc24 === null || facts.baselineAuc24 === undefined
          ? []
          : [`Same recipe, same corpus, same run, ${facts.baselineRef}: **${facts.baselineAuc24.toFixed(4)}** — that comparison IS valid.`]),
        ...(facts.actSwapAuc === null || facts.actSwapAuc === undefined
          ? []
          : [`Act-swap, the second recipe \`npm run measure-real\` prints: ${facts.actSwapAuc.toFixed(3)}.`]),
      ]);
    case 'Corpus fingerprint':
      // THE `sha256:` PREFIX IS LOad-BEARING. The gate reads a whole backticked
      // span of 7-40 hex digits as a CITED GIT OBJECT and fails the entry when
      // it does not resolve — the check that exposed the 2026-08-08
      // fabrication. A bare 16-hex fingerprint in backticks trips it, which the
      // end-to-end fixture caught: two "cites git object … which does not exist"
      // problems on an otherwise clean conversion. Prefixed, the span is not
      // all-hex and the scan correctly ignores it.
      return bullet([
        `${facts.corpusScriptCount} eligible scripts; manifest`,
        `\`tests/fixtures/real-corpus-manifest.json\` ${facts.manifestScriptCount} entries,`,
        `\`sha256:${facts.manifestHash.slice(0, 16)}\`; corpus identity (sha256 over the manifest's`,
        `content hashes, in committed array order) \`sha256:${facts.corpusFingerprint.slice(0, 16)}\`;`,
        `AUC subset = entries 0..${facts.subsetSize - 1} in that order. No title, no filename, no text.`,
      ]);
    case 'Git SHA':
      return bullet([
        `\`${facts.filedAtSha}\` — the tip of \`${facts.branch}\` this was measured on,`,
        'the commit this conversion is written on top of.',
      ]);
    case 'Baseline used':
      return bullet([
        facts.baselineRef && facts.baselineAuc24 !== null && facts.baselineAuc24 !== undefined
          ? `\`${facts.baselineRef}\`, measured in the SAME run on recipe \`${facts.degradationId}\`:`
          : 'the tree this branch was compared against, measured in the same run:',
        facts.baselineRef && facts.baselineAuc24 !== null && facts.baselineAuc24 !== undefined
          ? `AUC-24 **${facts.baselineAuc24.toFixed(4)}**, against this branch's ${facts.auc24 === null ? '(none)' : facts.auc24.toFixed(4)}.`
          : 'see the Measured AUC-24 field above.',
      ]);
    case 'Runner attestation':
      return bullet([
        `I ran the command above myself on ${facts.date}, on my own machine`,
        `(\`${facts.runner}\`), in the foreground, against the local corpus that`,
        '`REAL_SCRIPT_CORPUS_DIR` pointed at, and read its output. The numbers in this entry',
        'are the numbers that run printed; none of them is carried over from another',
        'document. The screenplay text never left that machine: what travels into this',
        'repository is this entry\'s numbers and the fingerprint above.',
      ]);
    default:
      throw new ConversionError(`no body defined for field "${label}"`);
  }
}

/**
 * Convert ONE entry, identified by its index in `findEntries(lines)`.
 * Returns { lines, edits }.
 */
function convertEntry(lines, span, facts) {
  const edits = [];
  const before = lines.slice(span.start, span.end);
  const newHeading = convertHeading(span.heading, facts);
  if (newHeading !== span.heading) {
    edits.push({ scan: 'one (heading)', before: span.heading, after: newHeading });
  }

  // ── take the fields OUT of the body ──────────────────────────────────────
  // Bottom-up by POSITION, not by the order of CONVERTED_FIELDS: a real entry
  // writes them in whatever order it likes (the renderer-residuals ledger has
  // Command, Git SHA, Measured AUC-24, … Corpus fingerprint, Runner
  // attestation), and removing them in list order invalidates every span below
  // the one just removed.
  const body = before.slice(1);
  const located = CONVERTED_FIELDS
    .map((field) => ({ field, para: fieldParagraph(body, 0, body.length, field.label) }))
    .filter((l) => l.para)
    .sort((a, b) => b.para.start - a.para.start);
  for (const { field, para } of located) {
    edits.push({
      scan: `field **${field.label}** (rewritten, and moved above the as-filed boundary)`,
      before: body.slice(para.start, para.end).join('\n'),
      after: fieldBody(field.label, facts).join('\n'),
    });
    body.splice(para.start, para.end - para.start);
  }
  for (const field of CONVERTED_FIELDS) {
    if (!field.insertIfMissing) continue;
    if (located.some((l) => l.field.label === field.label)) continue;
    edits.push({
      scan: `field **${field.label}** (added — the entry had none)`,
      before: '',
      after: fieldBody(field.label, facts).join('\n'),
    });
  }

  // ── scan two, over what is left of the body ──────────────────────────────
  const { text: retensed, hits } = retensePhrases(body.join('\n'));
  if (hits.length > 0) {
    edits.push({
      scan: 'two (pending phrases, re-tensed)',
      before: hits.join(' · '),
      after: hits.map((h) => rewriteFor(h.toLowerCase()) ?? '(re-tensed)').join(' · '),
    });
  }
  const asFiled = retensed.split('\n');
  while (asFiled.length > 0 && asFiled[0].trim() === '') asFiled.shift();
  while (asFiled.length > 0 && asFiled[asFiled.length - 1].trim() === '') asFiled.pop();

  // ── one shape: heading, banner, fields, boundary, the entry as filed ─────
  const fieldsBlock = [];
  for (const field of CONVERTED_FIELDS) {
    if (!field.insertIfMissing && !located.some((l) => l.field.label === field.label)) continue;
    fieldsBlock.push(...fieldBody(field.label, facts));
  }
  const terminator = terminatorLines(facts);
  edits.push({ scan: 'three (the field value window, bounded)', before: '', after: terminator.join('\n') });
  const boundary = `${AS_FILED_HEADING_PREFIX} (${facts.date})`;
  edits.push({ scan: 'the as-filed boundary', before: '', after: boundary });

  const entry = [
    newHeading,
    ...bannerLines(facts),
    '',
    ...fieldsBlock,
    ...terminator,
    '',
    boundary,
    '',
    ...asFiled,
    '',
  ];

  // The guard that the restructure actually put the pending prose below the
  // boundary. It can only fail if something above it acquired one of those
  // sentences — which is what it is for.
  assertNoPendingAssertionsAbove(entry, entry.indexOf(boundary), newHeading);

  const out = lines.slice();
  out.splice(span.start, span.end - span.start, ...entry);
  return { lines: out, edits, newHeading };
}

/**
 * Convert every PENDING entry in `receiptText`, using the gate's own
 * `pendingReason` to decide which entries are pending and to verify the
 * result. Returns { text, converted: [{heading, edits}], unchanged: [...] }.
 *
 * @param {string} receiptText
 * @param {Record<string, unknown>} facts
 * @param {{ only?: Set<string> | null }} [opts]  the headings the RANGE adds;
 *        null converts every pending entry (used by tests, never by the CLI).
 * @throws ConversionError naming the entry AND the scan that still fails, when
 *         an entry cannot be closed mechanically. The caller prints that and
 *         does not commit — which is the whole contract: this either produces
 *         a tree the real CLI exits 0 on, or it produces nothing.
 */
export function convertPendingEntries(receiptText, facts, { only = null } = {}) {
  requireFacts(facts);
  let lines = receiptText.split('\n');
  const converted = [];
  const outOfScope = [];

  // SCOPE IS THE RANGE, NOT THE FILE — and that is not a nicety.
  //
  // MEASURED 2026-09-13: `pendingReason` flags FOUR entries in the ledger as it
  // stands on `scoring/renderer-residuals`, and only three of them are the
  // branch stack's. The fourth is the 2026-09-06 P3 VERIFY-REPORT CLI entry,
  // long since merged to main: its Runner-attestation field window runs past
  // its own bullets and swallows prose that mentions the pending branches, so
  // scan three sees the word. The real CLI never validates it, because it
  // validates only entries the RANGE ADDS (`checkReceiptForRange`) — history is
  // never re-validated, deliberately, so that the ledger's own honest
  // correction entries do not fail the build years later. A converter that
  // rewrote every pending-looking entry in the file would edit merged history
  // to fix a problem nothing reports. `only` is the caller's set of in-range
  // headings, taken from the gate's own `addedReceiptLines` + `extractEntries`.
  const inScope = (heading) => (only === null ? true : only.has(heading));

  // Work from the LAST pending entry backwards: every conversion changes the
  // line count, and a later span computed before an earlier edit is wrong.
  const pending = findEntries(lines).filter((span) => {
    const entry = { heading: span.heading, lines: lines.slice(span.start + 1, span.end) };
    if (pendingReason(entry) === null) return false;
    if (inScope(span.heading)) return true;
    outOfScope.push(span.heading);
    return false;
  });
  for (const span of [...pending].reverse()) {
    const result = convertEntry(lines, span, facts);
    lines = result.lines;
    converted.unshift({ heading: span.heading, newHeading: result.newHeading, edits: result.edits });
  }
  // Verify by the entry's NEW heading. The first version of this loop compared
  // the post-conversion spans against the entries' OLD headings — which scan
  // one has just rewritten — so it matched nothing and the guard never ran:
  // a converter whose own "did this work?" check could not fail. The
  // "cannot be closed" case in tests/scripts/receipt-conversion.test.ts is the
  // input that caught it.
  for (const span of findEntries(lines)) {
    if (!converted.some((c) => c.newHeading === span.heading)) continue;
    const entry = { heading: span.heading, lines: lines.slice(span.start + 1, span.end) };
    const reason = pendingReason(entry);
    if (reason === null) continue;
    throw new ConversionError(
      `an entry is still PENDING after conversion: ${reason}`,
      [
        span.heading,
        '',
        ...lines.slice(span.start, Math.min(span.end, span.start + 40)),
        '',
        'The three scans are in docs/brain/Owner/Owner - R5 Measurement and Merge.md.',
        'Nothing was committed.',
      ],
    );
  }
  return { text: lines.join('\n'), converted, outOfScope };
}

const REQUIRED_FACTS = [
  'date', 'branch', 'filedAtSha', 'runner', 'corpusFingerprint', 'manifestHash',
  'manifestScriptCount', 'corpusScriptCount', 'subsetSize', 'floor',
  // The recipe that produced THIS number, the evidence for that claim, and the
  // recipe the committed table uses. All three are required: an entry that
  // names one without the other two is the round-1 receipt that stamped
  // `shuffle-drop/v2` on a legacy-recipe number (review F1).
  'degradationId', 'degradationEvidence', 'lockDegradationId',
];

function requireFacts(facts) {
  if (!facts || typeof facts !== 'object') throw new ConversionError('facts object is required');
  for (const key of REQUIRED_FACTS) {
    if (facts[key] === undefined || facts[key] === null || facts[key] === '') {
      throw new ConversionError(
        `refusing to write a receipt without \`${key}\` — every field in a converted entry `
        + 'comes out of the run, and a blank one would be a number nobody measured.',
      );
    }
  }
  if (!('auc24' in facts)) throw new ConversionError('refusing to write a receipt without `auc24` (pass null only when the range genuinely has none)');
  if (typeof facts.recipeSame !== 'boolean') {
    throw new ConversionError('refusing to write a receipt without `recipeSame` — whether the reported number and the locked table are the same statistic is not something to leave unsaid');
  }
  if (!Array.isArray(facts.probes)) {
    throw new ConversionError('refusing to write a receipt without `probes` — the Command field is written FROM the run, and an absent list would make it a template again (review F2)');
  }
  if (!/^[0-9a-f]{40}$/.test(facts.filedAtSha)) {
    throw new ConversionError(`\`filedAtSha\` must be a full 40-character SHA (got "${facts.filedAtSha}")`);
  }
}

/** A unified-ish diff of one conversion, for `--dry-run`. Prints the edits,
 *  never the whole file. */
export function formatEdits(converted) {
  const out = [];
  for (const entry of converted) {
    out.push('─'.repeat(76));
    out.push(entry.heading.slice(0, 76));
    out.push('─'.repeat(76));
    for (const edit of entry.edits) {
      out.push(`  @@ ${edit.scan}`);
      for (const line of String(edit.before).split('\n')) if (line !== '') out.push(`  - ${line}`);
      for (const line of String(edit.after).split('\n')) if (line !== '') out.push(`  + ${line}`);
      out.push('');
    }
  }
  return out.join('\n');
}
