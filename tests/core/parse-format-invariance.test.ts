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
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { normalizeScreenplay } from '../../server/nvm/analyze/screenplay-normalizer.ts';

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
  ['a redundant forced-cue `@` on every character cue', redundantMarker('character', '@'),
    'the fourth marker and the LARGEST format sensitivity ever measured on this branch. Round 2 pinned it '
    + 'as a known gap rather than closing it, because the parser did not implement `@` at all — `@MARY` was '
    + 'action prose and so was every line of her speech — and honouring it in the normaliser alone would '
    + 'have made the analysis strip a marker all four renderers still printed. Round 3 closed BOTH halves '
    + '(src/lib/fountain.ts parseFountain + renderableText), so this moved 32 of 32 scripts at 3124a94e, '
    + 'mean -1.172, largest -26.8 on room-12, and moves 0 of 32 here.'],

  // ── Cue extension spelling (round 2) ────────────────────────────────────
  // CHARACTER_CUE_RE admits only the canonical spellings, so a cue carrying
  // any other one is not a cue and its whole speech is action prose.
  ['every cue extension respelled without its periods',
    (t) => t.replace(/\(\s*V\.O\.\s*\)/g, '(V.O)').replace(/\(\s*O\.S\.\s*\)/g, '(O.S)').replace(/\(\s*CONT'D\s*\)/g, '(CONTD)'),
    'what a typist emits. 12 of the 14 applicable scripts moved at 85273742, largest -1.3 on soft-launch.'],
  ['every cue extension respelled with no punctuation at all',
    (t) => t.replace(/\(\s*V\.O\.\s*\)/g, '(VO)').replace(/\(\s*O\.S\.\s*\)/g, '(OS)').replace(/\(\s*CONT'D\s*\)/g, '(CONTD)'),
    'the same extension again — (VO) is (V.O.).'],
  ['every cue extension in lower case',
    (t) => t.replace(/\(\s*(V\.O\.|O\.S\.|CONT'D)\s*\)/g, (_m, e) => `(${String(e).toLowerCase()})`),
    'spelling is not meaning: the same speaker in the same mode.'],
  ['a curly apostrophe inside (CONT\u2019D)', (t) => t.replace(/\(CONT'D\)/g, '(CONT\u2019D)'),
    'the typographic fold reaches inside the extension too — every word processor emits this one.'],
];

describe('format is not writing: nineteen transforms, 32 scripts, exact equality (findings 5 and 13, rounds 2 and 3)', () => {
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

// ── ONE SPEAKER, HOWEVER THE EXTENSION IS SPELLED (round 2) ────────────────
describe('a cue extension is a decoration, not part of the name', () => {
  const SCRIPT = (voSpelling: string, ocSpelling: string) => `INT. KITCHEN - NIGHT

MARY pours coffee and waits.

MARY
I can hear you out there.

MARY ${ocSpelling}
Don't pretend the light isn't on.

INT. HALLWAY - CONTINUOUS

The door is shut. A shadow moves under it.

MARY ${voSpelling}
I counted your footsteps.
`;

  it('the same speaker with an off-camera or voice-over extension is ONE character, and still SPEAKS', () => {
    // Both halves matter, and the first alone cannot catch the bug: before the
    // fix `MARY (O.C.)` was not a cue at all, so the character list was still
    // ['MARY'] — the off-camera speech had simply become action prose and
    // vanished from the dialogue. The dialogue-line count is what sees that.
    const a = analyzeFountainText(SCRIPT('(V.O.)', '(O.C.)'));
    assert.deepEqual(
      a.characters, ['MARY'],
      'MARY, MARY (O.C.) and MARY (V.O.) are one speaker. (O.C.) was missing from the cue regex and from '
      + 'all four copies of the decoration strip until 2026-09-12 round 2 — got '
      + `${JSON.stringify(a.characters)}`,
    );
    assert.equal(
      a.dialogueLineCount, 3,
      `only ${a.dialogueLineCount} of the 3 speeches parsed as dialogue. An extension the cue regex does not `
      + "admit does not merely rename the speaker: the cue is not a cue, so the speech under it is scored as "
      + 'ACTION PROSE. (O.C.) is the case that was missing.',
    );
  });

  it('an all-caps action-shaped line with an extension was ALREADY a cue — the fold only levels the spelling', () => {
    // The one class change the fold makes, asserted as the consistency fix it
    // is rather than left for a reader to discover. On a git archive 85273742
    // export the canonical spelling parsed character+dialogue while every
    // alias parsed action+action; the fold makes the four agree. It does NOT
    // create the class — that is CHARACTER_CUE_RE's shape, a separate question.
    const doc = (line: string) => `INT. HALL - NIGHT\n\n${line}\nWho is there?\n`;
    const typesOf = (line: string) => parseFountain(normalizeScreenplay(doc(line)))
      .filter((b) => b.type !== 'empty').map((b) => b.type).join(',');
    const canonical = typesOf('DOOR SLAMS (O.S.)');
    assert.equal(canonical, 'scene_heading,character,dialogue',
      'the canonical spelling has always been read as a cue here; if that changed, this test is about the wrong thing');
    for (const alias of ['DOOR SLAMS (OS)', 'DOOR SLAMS (O.S)', 'A PHONE BUZZES (VO)']) {
      assert.equal(typesOf(alias), canonical,
        `${JSON.stringify(alias)} parses differently from its canonical twin. Spelling is not meaning.`);
    }
    // And the other direction: a parenthetical that is not an extension is
    // still not a cue, so the fold has not widened what counts as one.
    for (const notACue of ['MARY (into phone)', 'THE SIGN READS KEEP OUT (beat)']) {
      assert.equal(typesOf(notACue), 'scene_heading,action,action',
        `${JSON.stringify(notACue)} became a cue. The fold must never eat a parenthetical direction.`);
    }
  });

  it('every spelling of the same extension produces the same report', async () => {
    const canonical = await runScriptDoctor(SCRIPT('(V.O.)', '(O.C.)'));
    for (const [vo, oc] of [['(V.O)', '(O.C)'], ['(VO)', '(OC)'], ['(v.o.)', '(o.c.)']] as const) {
      const got = await runScriptDoctor(SCRIPT(vo, oc));
      assert.deepEqual(
        surface(got), surface(canonical),
        `spelling the extensions ${vo}/${oc} moved the score. Spelling is not meaning: the fold lives in `
        + 'normalizeCueExtensions (server/nvm/analyze/screenplay-normalizer.ts) and the canonical set in '
        + 'CUE_EXTENSIONS (src/lib/fountain.ts).',
      );
    }
  });
});

// ── THE MARKER ROUND 2 PINNED, CLOSED ON BOTH SIDES (round 3) ──────────────
// The row above asserts that a REDUNDANT `@` does not move the score. That is
// necessary and not sufficient: an analyzer that simply deleted `@` would pass
// it while every exporter still printed the marker, which is the split the
// round-2 review named as its reason for pinning rather than fixing. So the
// same marker is checked at the other end too — what the parser makes of it,
// and what each of the four renderers prints — and in the direction that
// cannot be faked by deletion: a cue only `@` can express.
describe('a forced cue `@` is a character cue everywhere (round 3)', () => {
  const CASELESS = 'INT. TEA HOUSE - DAY\n\nA kettle ticks as it cools.\n\n@田中\n(quietly)\nそこにいるのは知っている。\n\nEXT. STREET - LATER\n\nRain.\n';

  it('the parser types the cue, its parenthetical and its speech exactly as an unforced cue', () => {
    const types = parseFountain(CASELESS).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(
      types,
      ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'scene_heading', 'action'],
      'a forced cue must produce the SAME element sequence an unforced one does — the whole point of `@` is '
      + 'that the lines below it are dialogue, not action prose',
    );
    // The other direction, and it is the decision this fixture exists for:
    // WITHOUT the marker the same caseless line is still action, because "all
    // caps" is meaningless in a caseless script (src/lib/fountain.ts).
    const unforced = parseFountain(CASELESS.replace('@', '')).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(
      unforced, ['scene_heading', 'action', 'action', 'action', 'action', 'scene_heading', 'action'],
      'admitting a caseless line as a cue WITHOUT the marker would make every short line of Japanese action '
      + 'a character cue — `@` is the escape hatch precisely because the bare line must not be one',
    );
  });

  it('a `^` forced cue is dual dialogue and retags the left column, as an unforced `^` does', () => {
    const dual = 'INT. HALL - NIGHT\n\n@田中\nYes.\n\n@McCLANE^\nNo.\n\nEXT. STREET - DAY\n\nRain.\n';
    const types = parseFountain(dual).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(
      types,
      ['scene_heading', 'dual_dialogue', 'dialogue', 'dual_dialogue', 'dialogue', 'scene_heading', 'action'],
      'the caret tail must be read past the marker, and the preceding cue retagged as the left column',
    );
  });

  it('the analyzer counts the speaker and the speech, under the bare name', () => {
    const a = analyzeFountainText(CASELESS);
    assert.deepEqual(a.characters, ['田中'], 'the marker is a decoration, never part of the name');
    assert.equal(a.dialogueLineCount, 1, 'the speech under a forced cue is DIALOGUE, not action prose');
  });

  it('not one of the four renderers prints the marker', async () => {
    const { layoutScreenplay } = await import('../../src/lib/screenplay-layout.ts');
    const { fountainToFdx } = await import('../../src/lib/fdx.ts');
    const { fountainToDocx } = await import('../../src/lib/docx.ts');
    const { fountainToPdf } = await import('../../src/lib/pdf.ts');
    const latin1 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; };

    const layoutLines = layoutScreenplay(CASELESS).flatMap((p) => p.lines.map((l) => l.text));
    assert.deepEqual(
      layoutLines.filter((t) => t.includes('@')), [],
      'screenplay-layout.ts feeds the PDF writer; a marker reaching it is a marker on the page',
    );
    assert.ok(layoutLines.includes('田中'), 'the bare name must still be laid out');

    const fdx = fountainToFdx(CASELESS, 'Forced Cue');
    assert.equal(fdx.includes('@'), false, 'the FDX export still carries the marker');
    assert.ok(
      /<Paragraph Type="Character">\s*<Text>田中<\/Text>/.test(fdx),
      'the forced cue must leave as a Final Draft Character paragraph, not an Action one',
    );

    const docx = latin1(fountainToDocx(CASELESS, 'Forced Cue'));
    assert.equal(
      [...docx.matchAll(/<w:t xml:space="preserve">([\s\S]*?)<\/w:t>/g)].filter((m) => m[1].includes('@')).length,
      0, 'the DOCX export still carries the marker in a text run',
    );
    assert.ok(docx.includes('w:val="Character"'), 'the forced cue must take the Character style');

    assert.equal(latin1(fountainToPdf(CASELESS, 'Forced Cue')).includes('@'), false, 'the PDF still carries the marker');
  });

  it('`@` inside a speech is NOT a cue, and `@` on an action line is left alone', () => {
    // The deliberate non-escape. A Character element needs a preceding blank
    // line in the spec, and `@` is a character writers really do type inside
    // dialogue — reading `@everyone` as a cue would be worse than the bug.
    const speech = 'INT. OFFICE - DAY\n\nMARY\nTell them all.\n@everyone, the meeting moved.\n\nEXT. LOT - DAY\n\nRain.\n';
    const types = parseFountain(speech).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(types, ['scene_heading', 'character', 'dialogue', 'dialogue', 'scene_heading', 'action']);

    // And the normaliser's strip is gated on the PARSER having typed the line
    // from the marker, so an action line that merely starts with `@` keeps it.
    const action = 'INT. OFFICE - DAY\n\n@home he would have said nothing at all.\n\nEXT. LOT - DAY\n\nRain.\n';
    assert.equal(normalizeScreenplay(action).includes('@home'), true,
      'stripForcedMarkers must not touch a `@` the parser did not type a cue from');
  });
});
