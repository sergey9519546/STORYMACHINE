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
