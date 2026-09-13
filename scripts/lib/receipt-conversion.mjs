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
    `- **Entry body as filed:** everything below this line is this entry as it was`,
    `  written before the measurement, with its pre-measurement tense corrected where`,
    `  it described the absence of a run. Its original bytes are at`,
    `  \`${facts.filedAtSha.slice(0, 8)}\`. The fields above are the run's own record.`,
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
  const out = lines.slice();
  // The entry's end MOVES as the body grows. Every span below is recomputed
  // against this, never against the caller's original `span.end` — the first
  // version of this function used the stale bound and spliced an inserted
  // field into the middle of another field's paragraph, which the
  // "fields in document order" fixture in
  // tests/scripts/receipt-conversion.test.ts now pins.
  let end = span.end;
  const grow = (delta) => { end += delta; };

  const newHeading = convertHeading(span.heading, facts);
  if (newHeading !== span.heading) {
    edits.push({ scan: 'one (heading)', before: span.heading, after: newHeading });
    out[span.start] = newHeading;
  }

  // Replace the fields the entry already carries, from the BOTTOM OF THE
  // DOCUMENT upwards — by position, not by the order of CONVERTED_FIELDS. A
  // real entry writes them in whatever order it likes (the renderer-residuals
  // entry has Command, Git SHA, Measured AUC-24, … Corpus fingerprint, Runner
  // attestation), so replacing them in list order invalidates every span below
  // the one just edited.
  const located = CONVERTED_FIELDS
    .map((field) => ({ field, para: fieldParagraph(out, span.start, end, field.label) }))
    .filter((l) => l.para)
    .sort((a, b) => b.para.start - a.para.start);
  for (const { field, para } of located) {
    const body = fieldBody(field.label, facts);
    edits.push({
      scan: `field **${field.label}**`,
      before: out.slice(para.start, para.end).join('\n'),
      after: body.join('\n'),
    });
    out.splice(para.start, para.end - para.start, ...body);
    grow(body.length - (para.end - para.start));
  }

  // A field the entry never carried is INSERTED after the last field it does
  // carry. A missing required field is its own gate failure ("missing required
  // field **X**"), so a converter that silently skipped one would hand the
  // owner a commit that cannot pass.
  for (const field of CONVERTED_FIELDS) {
    if (!field.insertIfMissing) continue;
    if (fieldParagraph(out, span.start, end, field.label)) continue;
    const at = lastFieldEnd(out, span.start, end);
    const body = fieldBody(field.label, facts);
    edits.push({ scan: `field **${field.label}** (inserted — the entry had none)`, before: '', after: body.join('\n') });
    out.splice(at, 0, ...body);
    grow(body.length);
  }

  // Bound every rewritten field's value window (see terminatorLines).
  const terminator = terminatorLines(facts);
  edits.push({ scan: 'three (the field value window, bounded)', before: '', after: terminator.join('\n') });
  out.splice(lastFieldEnd(out, span.start, end), 0, ...terminator);
  grow(terminator.length);

  // Scan two, over the whole entry body: re-tense, never delete.
  const bodyText = out.slice(span.start + 1, end).join('\n');
  const { text: retensed, hits } = retensePhrases(bodyText);
  if (hits.length > 0) {
    edits.push({
      scan: 'two (pending phrases, re-tensed)',
      before: hits.join(' · '),
      after: hits.map((h) => PENDING_PHRASE_REWRITES[h.toLowerCase()] ?? '(re-tensed)').join(' · '),
    });
    const replacement = retensed.split('\n');
    out.splice(span.start + 1, end - (span.start + 1), ...replacement);
    grow(replacement.length - (end - (span.start + 1)));
  }

  out.splice(span.start + 1, 0, ...bannerLines(facts));
  return { lines: out, edits, newHeading };
}

/** One past the last line of the last CONVERTED_FIELDS paragraph in the entry,
 *  or the line after the heading when it carries none. */
function lastFieldEnd(lines, start, end) {
  let at = start + 1;
  for (const field of CONVERTED_FIELDS) {
    const para = fieldParagraph(lines, start, end, field.label);
    if (para && para.end > at) at = para.end;
  }
  return at;
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
