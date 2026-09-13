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

/** The fields a converted entry owes, in the order they are written. The four
 *  the gate REQUIRES are marked; `Measured AUC-24` is not required by the gate
 *  but is the whole point of the run, so it is filled too. */
const CONVERTED_FIELDS = [
  { label: 'Command', required: true },
  { label: 'Measured AUC-24', required: false },
  { label: 'Corpus fingerprint', required: true },
  { label: 'Git SHA', required: true },
  { label: 'Runner attestation', required: true },
];

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
    const replacement = PENDING_PHRASE_REWRITES[phrase];
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
    'row before any real-corpus run existed. The fields below carry the numbers the run',
    'printed; the prose under them is the entry AS FILED, with its pre-measurement tense',
    `mechanically corrected. The original bytes are in git at \`${facts.filedAtSha.slice(0, 8)}\``,
    '(`git show <sha>:docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`).',
  ];
}

/** Steps 2-4 of the recipe: the content the receipt owes once the run exists. */
function fieldBody(label, facts) {
  const bullet = (rest) => [`- **${label}:** ${rest[0]}`, ...rest.slice(1).map((l) => `  ${l}`)];
  switch (label) {
    case 'Command':
      return bullet([
        `\`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure\` on \`${facts.branch}\` @`,
        `\`${facts.filedAtSha.slice(0, 8)}\`, which ran, in this order and in the foreground:`,
        '`node scripts/verify-corpus-layout.mjs --corpus-dir=<corpus>`,',
        '`npm run --silent probe-corpus-shape -- --csv` (on this tree and on the pre-branch',
        'base), and `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real`. The full',
        `command lines and their output are on the owner's machine in the run's local`,
        'output directory, which is outside this repository and stays there. The command',
        'list this entry carried as filed is in git at the SHA named above.',
      ]);
    case 'Measured AUC-24':
      if (facts.auc24 === null) {
        return bullet([
          '**not applicable to this range** — the run happened and its numbers are in this',
          'entry, but this range moves no statistic AUC-24 reports. See the fingerprint above.',
        ]);
      }
      return bullet([
        `**${facts.auc24.toFixed(4)}** — shuffle-drop over the first ${facts.subsetSize} manifest scripts,`,
        `recipe \`${facts.degradationId}\` (the scene segmentation changed on 2026-09-12, so this`,
        'number is NOT comparable to the 0.731 recorded on 2026-07-11, and not comparable to',
        'the 761-script P1 baseline\'s 0.734 / 0.766 either — different corpus, different',
        `degradation, different denominator). Floor \`AUC24_FLOOR\` ${facts.floor}.`,
        ...(facts.baselineAuc24 === null || facts.baselineAuc24 === undefined
          ? []
          : [`Same recipe, same corpus, ${facts.baselineRef} in the same run: **${facts.baselineAuc24.toFixed(4)}**.`]),
        ...(facts.actSwapAuc === null || facts.actSwapAuc === undefined
          ? []
          : [`Act-swap, the second recipe \`npm run measure-real\` prints: ${facts.actSwapAuc.toFixed(3)}.`]),
      ]);
    case 'Corpus fingerprint':
      return bullet([
        `${facts.corpusScriptCount} eligible scripts; manifest`,
        `\`tests/fixtures/real-corpus-manifest.json\` ${facts.manifestScriptCount} entries, sha256`,
        `\`${facts.manifestHash.slice(0, 16)}\`; corpus identity (sha256 over the manifest's content`,
        `hashes, in committed array order) \`${facts.corpusFingerprint.slice(0, 16)}\`; AUC subset =`,
        `entries 0..${facts.subsetSize - 1} in that order. No title, no filename, no line of text.`,
      ]);
    case 'Git SHA':
      return bullet([
        `\`${facts.filedAtSha}\` — the tip of \`${facts.branch}\` this was measured on,`,
        'the commit this conversion is written on top of.',
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
  const out = lines.slice();
  const newHeading = convertHeading(span.heading, facts);
  if (newHeading !== span.heading) {
    edits.push({ scan: 'one (heading)', before: span.heading, after: newHeading });
    out[span.start] = newHeading;
  }

  // Fields, rewritten from the bottom up so earlier spans stay valid.
  const located = [];
  for (const field of CONVERTED_FIELDS) {
    const para = fieldParagraph(out, span.start, span.end, field.label);
    located.push({ field, para });
  }
  let insertAt = null;
  for (let i = located.length - 1; i >= 0; i--) {
    const { field, para } = located[i];
    const body = fieldBody(field.label, facts);
    if (para) {
      edits.push({
        scan: `field **${field.label}**`,
        before: out.slice(para.start, para.end).join('\n'),
        after: body.join('\n'),
      });
      out.splice(para.start, para.end - para.start, ...body);
      insertAt = insertAt ?? para.start;
    }
  }
  // A field the entry never carried is INSERTED — beside the other bullets if
  // there are any, else directly under the banner. A missing required field is
  // its own gate failure ("missing required field **X**"), so a converter that
  // silently skipped it would hand the owner a commit that cannot pass.
  for (const { field, para } of located) {
    if (para) continue;
    const anchor = fieldParagraph(out, span.start, span.end, 'Command')
      ?? fieldParagraph(out, span.start, span.end, 'Git SHA');
    const at = anchor ? anchor.end : span.start + 1;
    const body = fieldBody(field.label, facts);
    edits.push({ scan: `field **${field.label}** (inserted — the entry had none)`, before: '', after: body.join('\n') });
    out.splice(at, 0, ...body);
  }

  // Scan two, over the whole entry body: re-tense, never delete.
  const bodyStart = span.start + 1;
  const bodyEnd = span.end + (out.length - lines.length);
  const bodyText = out.slice(bodyStart, bodyEnd).join('\n');
  const { text: retensed, hits } = retensePhrases(bodyText);
  if (hits.length > 0) {
    edits.push({ scan: 'two (pending phrases, re-tensed)', before: hits.join(' · '), after: hits.map((h) => PENDING_PHRASE_REWRITES[h.toLowerCase()] ?? '(re-tensed)').join(' · ') });
    out.splice(bodyStart, bodyEnd - bodyStart, ...retensed.split('\n'));
  }

  out.splice(span.start + 1, 0, ...bannerLines(facts));
  return { lines: out, edits };
}

/**
 * Convert every PENDING entry in `receiptText`, using the gate's own
 * `pendingReason` to decide which entries are pending and to verify the
 * result. Returns { text, converted: [{heading, edits}], unchanged: [...] }.
 *
 * @throws ConversionError naming the entry AND the scan that still fails, when
 *         an entry cannot be closed mechanically. The caller prints that and
 *         does not commit — which is the whole contract: this either produces
 *         a tree the real CLI exits 0 on, or it produces nothing.
 */
export function convertPendingEntries(receiptText, facts) {
  requireFacts(facts);
  let lines = receiptText.split('\n');
  const converted = [];
  const unchanged = [];

  // Work from the LAST pending entry backwards: every conversion changes the
  // line count, and a later span computed before an earlier edit is wrong.
  const pending = findEntries(lines).filter((span) => {
    const entry = { heading: span.heading, lines: lines.slice(span.start + 1, span.end) };
    return pendingReason(entry) !== null;
  });
  for (const span of [...pending].reverse()) {
    const result = convertEntry(lines, span, facts);
    lines = result.lines;
    converted.unshift({ heading: span.heading, edits: result.edits });
  }
  for (const span of findEntries(lines)) {
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
  for (const span of findEntries(lines)) {
    if (!converted.some((c) => c.heading === span.heading)) unchanged.push(span.heading);
  }
  return { text: lines.join('\n'), converted, unchanged };
}

const REQUIRED_FACTS = [
  'date', 'branch', 'filedAtSha', 'runner', 'corpusFingerprint', 'manifestHash',
  'manifestScriptCount', 'corpusScriptCount', 'subsetSize', 'degradationId', 'floor',
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
