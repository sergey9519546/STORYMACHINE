// IDENTICAL WRITING MUST SCORE IDENTICALLY, HOWEVER IT REACHES THE ANALYZER.
//
// ── What this file is for (2026-09-12, adversarial review findings 4, 5, 13) ─
// The public benchmark's whole measured signal is small: the shuffle-drop mean
// health gap over the 32 committed scripts is 1.9 points and climax-relocate's
// is 1.5. Against that, the review measured an 11.1-point swing on `main` from
// re-wrapping dialogue inside a speech, a 5.2-point swing from adding a
// standard Fountain title page, and a 4.7-point swing from replacing ASCII
// apostrophes with the curly ones every word processor emits. A benchmark whose
// instrument reads formatting at several times the amplitude of the thing it
// claims to measure is not measuring that thing, and every AUC in the
// repository inherits the problem.
//
// Each transform below is FORMAT, not writing: the same words, the same
// speakers, the same order. The assertion is therefore equality, not a
// tolerance — `health`, `verdict`, `grade`, `sceneCount`, `bySeverity` and
// `totalIssues` must be identical, and for the transforms that do not change a
// single printed character the whole report must be identical too.
//
// ── Both directions ────────────────────────────────────────────────────────
// A suite that only asserted invariance would pass on an analyzer that returned
// a constant. Every describe block therefore also asserts that the SAME harness
// still separates something it should: the dialogue-flatten control, which
// changes the writing rather than its formatting, must move the score.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';
import { parseFountain } from '../../src/lib/fountain.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

/** The committed, distributable corpus — the same 32 documents the public
 *  benchmark scores, so an invariance failure here and a benchmark move there
 *  are the same population. */
function corpusFiles(): string[] {
  const screenplays = readdirSync(path.join(REPO_ROOT, 'data/screenplays'))
    .filter((f) => f.endsWith('.fountain'))
    .map((f) => `data/screenplays/${f}`);
  const blind = readdirSync(path.join(REPO_ROOT, 'tests/fixtures/blind-pairs'))
    .filter((f) => f.endsWith('.fountain'))
    .map((f) => `tests/fixtures/blind-pairs/${f}`);
  return [...screenplays, ...blind].sort();
}

const FILES = corpusFiles();
function read(f: string): string { return readFileSync(path.join(REPO_ROOT, f), 'utf8'); }

/** The fields a writer sees and a coverage report prints. Compared as a whole
 *  so a transform cannot move one while leaving the headline alone. */
function surface(r: ScriptDoctorReport) {
  return {
    health: r.health,
    grade: r.grade,
    verdict: r.verdict,
    sceneCount: r.sceneCount,
    totalIssues: r.totalIssues,
    bySeverity: r.bySeverity,
  };
}

/** Re-wrap DIALOGUE lines only, at `cols`, using the repository's own parser to
 *  decide which lines those are. No blank line is introduced, no word is
 *  changed, and the whitespace-normalised text is asserted identical below —
 *  this is exactly what an editor does when a writer types a long speech. */
export function reflowDialogue(text: string, cols: number): string {
  const typeByLine = new Map<number, string>();
  for (const b of parseFountain(text)) typeByLine.set(b.lineNumber, b.type);
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (typeByLine.get(i + 1) !== 'dialogue' || line.trim().length <= cols) { out.push(line); continue; }
    const words = line.trim().split(/\s+/);
    let cur = '';
    for (const w of words) {
      if (cur === '') cur = w;
      else if ((cur + ' ' + w).length <= cols) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    }
    if (cur !== '') out.push(cur);
  }
  return out.join('\n');
}

const WIDTHS = [30, 35, 40, 60];

/** Reports keyed by file, computed once — each run is ~150 ms and this file
 *  scores 32 scripts several times over. */
const baseline = new Map<string, ScriptDoctorReport>();

before(async () => {
  for (const f of FILES) baseline.set(f, await runScriptDoctor(read(f)));
});

describe('a Fountain-legal dialogue reflow does not move the score (finding 4)', () => {
  for (const f of FILES) {
    it(`${f} is invariant at ${WIDTHS.join('/')} columns`, async () => {
      const src = read(f);
      const base = baseline.get(f)!;
      for (const w of WIDTHS) {
        const wrapped = reflowDialogue(src, w);
        if (wrapped === src) continue;
        // The transform must be words-preserving, or the assertion below is
        // about something other than formatting.
        assert.equal(
          wrapped.replace(/\s+/g, ' ').trim(),
          src.replace(/\s+/g, ' ').trim(),
          `the ${w}-column reflow changed the words of ${f} — the probe is broken, not the engine`,
        );
        const got = await runScriptDoctor(wrapped);
        assert.deepEqual(
          surface(got),
          surface(base),
          `${f} scored differently after its dialogue was wrapped at ${w} columns. `
          + 'A Fountain dialogue element runs from its cue to the next blank line, so a wrapped speech '
          + 'is the same speech — see the block comment above parseFountain and joinWrappedDialogue. '
          + 'Measured before the 2026-09-12 fix: 119 of 128 (script, width) pairs moved, range -8.8 to '
          + '+5.0, and room-12 at 60 columns went CONSIDER -> PASS.',
        );
      }
    });
  }
});

describe('the parser reads a wrapped speech as dialogue, not as action prose', () => {
  // THE ASSERTION THAT WOULD HAVE CAUGHT THE BUG. Invariance of the SCORE can
  // in principle be satisfied by two wrongs cancelling; this checks the
  // mechanism directly. Before the fix, `undertow.fountain` wrapped at 35
  // columns went action 15 -> 55 with dialogue frozen at 18.
  it('re-wrapping dialogue changes no block type census except dialogue line count', () => {
    for (const f of FILES) {
      const src = read(f);
      for (const w of WIDTHS) {
        const wrapped = reflowDialogue(src, w);
        if (wrapped === src) continue;
        const census = (t: string) => {
          const c: Record<string, number> = {};
          for (const b of parseFountain(t)) c[b.type] = (c[b.type] ?? 0) + 1;
          return c;
        };
        const a = census(src);
        const b = census(wrapped);
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
          if (key === 'dialogue') continue;  // physical line count legitimately grows
          assert.equal(
            b[key] ?? 0, a[key] ?? 0,
            `${f} at ${w} columns: ${key} blocks went ${a[key] ?? 0} -> ${b[key] ?? 0}. `
            + 'Lines of a speech after the first are being reclassified — the dialogue-block rule in '
            + 'src/lib/fountain.ts is not holding.',
          );
        }
      }
    }
  });

  it('a multi-line speech parses as one dialogue element after the analyzer join', async () => {
    const { joinWrappedDialogue } = await import('../../server/nvm/analyze/screenplay-normalizer.ts');
    const wrapped = [
      'INT. KITCHEN - DAY', '', 'ANNA', 'I told you this would happen and', 'you did not listen to a word', 'of it.', '',
    ].join('\n');
    const joined = joinWrappedDialogue(wrapped);
    const dialogue = parseFountain(joined).filter((b) => b.type === 'dialogue');
    assert.equal(dialogue.length, 1, `expected one dialogue element, got ${dialogue.length}`);
    assert.equal(dialogue[0].text, 'I told you this would happen and you did not listen to a word of it.');
  });

  it('the join leaves a script whose speeches are already one line byte-identical', async () => {
    const { joinWrappedDialogue } = await import('../../server/nvm/analyze/screenplay-normalizer.ts');
    for (const f of FILES) {
      const src = read(f);
      assert.equal(joinWrappedDialogue(src), src, `${f} was rewritten by joinWrappedDialogue — it must be a no-op here`);
    }
  });

  it('the four escapes still break out of a dialogue block', () => {
    const cases: Array<[string, string]> = [
      ['forced action', '!She slams the door.'],
      ['forced heading', '.LATER THAT NIGHT'],
      ['lyric', '~ and the river ran on'],
      ['scene heading', 'INT. HALLWAY - NIGHT'],
    ];
    for (const [label, line] of cases) {
      const text = ['INT. KITCHEN - DAY', '', 'ANNA', 'I told you.', line, ''].join('\n');
      const blocks = parseFountain(text);
      const last = blocks[4];
      assert.notEqual(
        last.type, 'dialogue',
        `${label} (${JSON.stringify(line)}) was swallowed into the dialogue block. Real drafts drop the `
        + 'blank line before these four, and reading them as dialogue is worse than the bug being fixed.',
      );
    }
  });
});

/** Prefix a Fountain forced-element marker to every line the repository's own
 *  parser ALREADY types as that element. The marker is therefore REDUNDANT: it
 *  declares what the line already is, so not one printed character changes and
 *  no element changes — which is exactly what makes it a format transform and
 *  not a writing one. (A `~` lyric or a `> ... <` centering has no redundant
 *  application: no line in any of these scripts parses as `lyrics` or
 *  `centered`, so adding those markers necessarily changes the element. They
 *  are measured in the lane report and deliberately NOT claimed here.) */
function redundantMarker(type: string, mark: string): (t: string) => string {
  return (t) => {
    const typeByLine = new Map<number, string>();
    for (const b of parseFountain(t)) typeByLine.set(b.lineNumber, b.type);
    return t.split('\n')
      .map((l, i) => (typeByLine.get(i + 1) === type && l.trim() !== '' ? `${mark}${l.trim()}` : l))
      .join('\n');
  };
}

/** The transforms that change FORMAT and not one printed word. Each is the
 *  thing a real writer's real tools do to a real file. */
const FORMAT_TRANSFORMS: Array<[string, (t: string) => string, string]> = [
  ['a standard Fountain title page',
    (t) => `Title: The Long Way Down\nAuthor: A. Writer\nDraft date: 12 September 2026\nContact: writer@example.com\n\n${t}`,
    'finding 5 — the four metadata lines every real draft has. On main this moved health on 20 of 32 '
    + 'scripts (worst -5.2) and shifted the PRIMARY order AUC by 0.047, 2.3x the floor margin; on this '
    + "branch's base it still moved 29 of 32."],
  ['curly apostrophes (U+2019)', (t) => t.replace(/'/g, '\u2019'),
    'finding 13 — what Final Draft, Highland, Word, Google Docs and iOS all emit. Moved 21 of 32 before '
    + 'the typography fold, by up to 1.6 points, because every rule lexicon matches on ASCII.'],
  ['curly double quotes (U+201C/D)', (t) => t.replace(/"([^"\n]*)"/g, '\u201C$1\u201D'),
    'finding 13 — moved 7 of 32 before the fold, by up to +4.3 on the-key-under-the-mat.'],
  ['a boneyard note before the script', (t) => `/* production note: budget and scheduling discussion */\n\n${t}`,
    "finding 13 / writer's-loop finding 1 — a private note to yourself is not screenplay."],
  ['a boneyard note after the script', (t) => `${t}\n\n/* production note: budget and scheduling discussion */\n`,
    'same construct at the other end of the document.'],
  ['a boneyard padded with 800 repetitions',
    (t) => `/*\n${'scheduling and budget discussion '.repeat(800)}\n*/\n\n${t}`,
    "writer's-loop finding 1, the attack version. Before the denominator fix this moved health on 32 of "
    + '32 scripts, mean +7.206, up to +18.6, and flipped FOUR verdicts CONSIDER -> RECOMMEND without one '
    + 'word of screenplay changing.'],
  ['an inline note', (t) => `${t}\n\n[[remember to fix act two before the next pass]]\n`, 'the second non-printing construct.'],
  ['a synopsis line', (t) => `${t}\n\n= a synopsis line the reader never sees\n`, 'the third.'],
  ['a section heading', (t) => `${t}\n\n# ACT THREE\n`, 'the fourth.'],
  ['CRLF line endings', (t) => t.replace(/\n/g, '\r\n'), 'already invariant before this work; asserted so it stays that way.'],
  ['a byte-order mark', (t) => `\uFEFF${t}`, 'already invariant before this work; asserted so it stays that way.'],

  // ── The forced-element markers (round 2 of the adversarial review) ───────
  // Fountain's markers say what an element IS and are never printed.
  // parseFountain reads them to type a line and then leaves them in the
  // block's text, so the marker glued to the first word of the element and
  // reached every lexicon, the word count and all fourteen passes as prose.
  ['a redundant forced-action `!` on every action line', redundantMarker('action', '!'),
    "the round-1 reviewer's own find, and the largest of the three this branch closes: 32 of 32 scripts "
    + 'moved at 85273742, mean +1.056, largest +7.0 on room-12, and transfer-window was PROMOTED '
    + 'PASS -> CONSIDER by a marker that prints nothing.'],
  ['a redundant forced-heading `.` on every scene heading', redundantMarker('scene_heading', '.'),
    'same family. 32 of 32 moved at 85273742, mean +0.659, largest +2.5 on the-key-under-the-mat. Several '
    + "scripts in the private corpus mark scenes this way (the normalizer's own header names Ratatouille, "
    + 'Coco and Up), so this is not a synthetic shape.'],
  ['a redundant forced-transition `>` on every transition line', redundantMarker('transition', '>'),
    'the parser has no forced-transition branch at all, so `>CUT TO:` was scored as an ACTION LINE, `>` and '
    + 'all. 5 of the 6 applicable scripts moved at 85273742, mean -4.080, largest -15.7 on room-12.'],
];

describe('format is not writing: fourteen transforms, 32 scripts, exact equality (findings 5 and 13, and round 2)', () => {
  for (const [label, fn, why] of FORMAT_TRANSFORMS) {
    it(`${label} does not move any of the 32 scripts`, async () => {
      const moved: string[] = [];
      for (const f of FILES) {
        const got = await runScriptDoctor(fn(read(f)));
        const base = baseline.get(f)!;
        try {
          assert.deepEqual(surface(got), surface(base));
        } catch {
          moved.push(`${f} ${base.health} -> ${got.health} (${base.verdict} -> ${got.verdict})`);
        }
      }
      assert.deepEqual(moved, [], `${moved.length} of ${FILES.length} scripts moved under "${label}". ${why}`);
    });
  }
});

/** The submitted bytes are still what identifies a submission. */
describe('the canonical analysis text does not reach contentHash', () => {
  it('two submissions that normalise to the same screenplay still hash differently', async () => {
    const src = read(FILES[0]);
    const padded = `/* a private note */\n\n${src}`;
    const a = await runScriptDoctor(src);
    const b = await runScriptDoctor(padded);
    assert.equal(a.health, b.health, 'the two must SCORE the same');
    assert.notEqual(
      a.contentHash, b.contentHash,
      'contentHash must identify the bytes the writer submitted, not the screenplay they normalise to — '
      + 'two different files are two different submissions even when they score identically',
    );
  });
});

describe('the harness still separates writing from formatting (the both-directions check)', () => {
  it('flattening every speech to "Hello." DOES move the score on every script', async () => {
    // The control from the public benchmark, run here so that an invariance
    // suite cannot pass by scoring everything the same.
    let moved = 0;
    for (const f of FILES) {
      const src = read(f);
      const typeByLine = new Map<number, string>();
      for (const b of parseFountain(src)) typeByLine.set(b.lineNumber, b.type);
      const flattened = src.split('\n')
        .map((l, i) => (typeByLine.get(i + 1) === 'dialogue' ? 'Hello.' : l))
        .join('\n');
      const got = await runScriptDoctor(flattened);
      if (got.health !== baseline.get(f)!.health) moved++;
    }
    assert.equal(moved, FILES.length, `only ${moved} of ${FILES.length} scripts moved under dialogue flattening — `
      + 'the invariance assertions above are worthless if the analyzer cannot tell writing apart at all');
  });
});

// ── THE MARKER THIS BRANCH DOES NOT CLOSE, PINNED WITH ITS SIZE ────────────
// `@` is Fountain's forced character cue. src/lib/fountain.ts has never
// implemented it, so `@MARY` is action prose and so is every line of the
// speech beneath her. Honouring it is a PARSER FEATURE, not a normalisation:
// unlike `!`, `.` and `>`, stripping `@` changes the type of every line BELOW
// the cue, and the editor, PDF, FDX and DOCX renderers would all still print
// the marker the analysis had decided was invisible.
//
// It is asserted here with its measured size so it cannot be rediscovered as
// news, and so that the day someone DOES implement it this test goes red and
// says where the row belongs.
describe('the forced cue `@` is a known, quantified gap (round 2)', () => {
  it('still moves every one of the 32 scripts, because the parser does not implement it', async () => {
    const apply = redundantMarker('character', '@');
    let moved = 0;
    let applicable = 0;
    for (const f of FILES) {
      const src = read(f);
      const marked = apply(src);
      if (marked === src) continue;
      applicable++;
      const got = await runScriptDoctor(marked);
      if (JSON.stringify(surface(got)) !== JSON.stringify(surface(baseline.get(f)!))) moved++;
    }
    assert.equal(applicable, FILES.length, 'every script must carry at least one character cue');
    assert.equal(
      moved, FILES.length,
      `${moved} of ${FILES.length} scripts moved under a redundant forced cue "@". This is a PINNED KNOWN GAP, `
      + 'not a tolerance: at 85273742 it was 32 of 32, mean -1.172, largest -26.8 on room-12 — the largest '
      + 'format sensitivity this branch has measured. If this number has FALLEN, the parser has learned `@` '
      + '(or something has changed the corpus): move this row into FORMAT_TRANSFORMS as an invariance '
      + 'assertion, check that every renderer strips the marker too, and delete this test. Do not relax it.',
    );
  });
});
