// story-bench.test.ts — the pure helpers of scripts/story-bench.mjs.
//
// WHAT THIS COVERS AND WHAT IT DELIBERATELY DOES NOT. The bench itself
// GENERATES: it boots a server, spends real LLM calls, and writes screenplays.
// CI has no key, so the bench never runs there and this file never invokes it.
// What it does cover is every decision the bench makes ABOUT a run once the
// calls have happened — above all `classifyRun`, which is the rule that a run
// whose passes all fell back is reported as FAILED rather than as a story.
// That rule is the honesty of the whole instrument, so it is the one thing
// here that is pinned in both directions.
//
// `npm run story:bench` with no provider configured exits 2 and measures
// nothing; it is not part of `npm test` and has no CI step.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bench = await import(pathToFileURL(path.join(ROOT, 'scripts', 'story-bench.mjs')).href) as {
  runDirName: (now?: Date) => string;
  beatsToSceneTargets: (p: unknown) => Array<Record<string, unknown>>;
  parseLogLine: (line: string) => Record<string, unknown> | null;
  summariseCalls: (entries: Array<Record<string, unknown>>) => Record<string, unknown>;
  classifyRun: (a: { llmCalls: number; revisionPassesWithChanges: number; revisionPassCount: number; committedScenes?: number; requestedScenes?: number; committedNonStub?: number }) => { ok: boolean; status: string; label: string };
  nextRunDir: (root: string, date: string, exists: (f: string) => boolean, explicit?: string | null) => string;
  listRunDirs: (names: string[], stamp?: ((name: string) => number | null) | null) => string[];
  rowsFromDir: (dir: string, orderedIds: string[]) => Array<Record<string, unknown>>;
  scenesLabel: (row: Record<string, unknown>) => string;
  castGroundingOps: (p: unknown) => Array<Record<string, unknown>>;
  scriptWordCount: (f: string) => number;
  renderTable: (rows: Array<Record<string, unknown>>) => string;
  packetFrontMatter: (rows: Array<Record<string, unknown>>, runDate: string) => string;
  RUBRIC: string[];
};

const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, 'tests', 'fixtures', 'story-bench-premises.json'), 'utf8'),
) as { premises: Array<Record<string, unknown>> };

describe('story-bench fixture', () => {
  it('every premise carries a cast, because IntentionalProof blocks an ungrounded character', () => {
    for (const p of FIXTURE.premises) {
      const cast = p.cast as Array<{ id: string; believes: string }>;
      assert.ok(Array.isArray(cast) && cast.length >= 2, `${p.id}: needs a cast of at least two`);
      for (const c of cast) {
        assert.match(c.id, /^[A-Z][A-Z_]*$/, `${p.id}: cast ids are screenplay cues`);
        assert.ok(c.believes.length > 10, `${p.id}/${c.id}: a belief must be a proposition, not a label`);
      }
      assert.equal(new Set(cast.map((c) => c.id)).size, cast.length, `${p.id}: duplicate cast id`);
    }
  });

  it('carries six premises of six distinct shapes, each with 6-10 beats', () => {
    assert.equal(FIXTURE.premises.length, 6);
    const shapes = FIXTURE.premises.map((p) => p.shape);
    assert.equal(new Set(shapes).size, 6, `shapes must all differ: ${shapes.join(', ')}`);
    // The brief's six: large cast, two-hander, comedy, non-linear, animation
    // family film, thriller.
    for (const needle of ['ensemble', 'two-hander', 'comedy', 'non-linear', 'animation', 'thriller']) {
      assert.ok(shapes.some((s) => String(s).includes(needle)), `no premise with shape "${needle}"`);
    }
    for (const p of FIXTURE.premises) {
      const beats = p.beats as unknown[];
      assert.ok(beats.length >= 6 && beats.length <= 10, `${p.id}: ${beats.length} beats, want 6-10`);
      assert.ok(String(p.premise).split(/\s+/).length >= 40, `${p.id}: premise should be a real paragraph`);
      assert.ok(new Set([p.id, p.title, p.genre, p.tone, p.theme, p.characters]).size === 6);
    }
  });

  it('says in the fixture itself that the beats are hand-authored because no premise-to-outline step exists', () => {
    const readme = (FIXTURE as unknown as { _readme: string[] })._readme.join(' ');
    assert.match(readme, /NO premise-to-outline step/);
    assert.match(readme, /HAND-AUTHORED/);
  });

  it('every beat names a REGISTERED mechanism, so a commit is not blocked by MechanismProof', () => {
    // MechanismProof is Tier 1 — it BLOCKS the commit — and it resolves each
    // activeMechanisms entry against server/nvm/mechanisms/<id>.mech.json.
    // The first version of this fixture used story-shaped names and every
    // scene of every premise was rejected with "unknown mechanism ... no
    // matching .mech.json". Read from disk rather than hard-coded, so adding a
    // seventh mechanism does not make this test a lie.
    const mechDir = path.join(ROOT, 'server', 'nvm', 'mechanisms');
    const registered = new Set(
      readdirSync(mechDir)
        .filter((f) => f.endsWith('.mech.json'))
        .map((f) => f.slice(0, -'.mech.json'.length)),
    );
    assert.ok(registered.size > 0, 'server/nvm/mechanisms must hold at least one .mech.json');

    const unknown: string[] = [];
    for (const p of FIXTURE.premises) {
      for (const [i, beat] of (p.beats as Array<{ activeMechanisms: string[] }>).entries()) {
        for (const m of beat.activeMechanisms) {
          if (!registered.has(m)) unknown.push(`${p.id}[${i}]: ${m}`);
        }
      }
    }
    assert.deepEqual(unknown, [], `beats naming a mechanism with no .mech.json: ${unknown.join(', ')}`);
  });

  it('every beat is a valid SceneTarget the converge routes accept', () => {
    const FUNCTIONS = new Set([
      'advance_plot', 'reveal_character', 'build_tension',
      'provide_relief', 'set_up_payoff', 'establish_world',
    ]);
    for (const p of FIXTURE.premises) {
      const targets = bench.beatsToSceneTargets(p);
      // The forEach below is vacuous on an empty array: with
      // beatsToSceneTargets stubbed to `return []` this whole file stayed
      // 30 pass / 0 fail. One target per beat, and at least one, is the
      // precondition that makes the rest of this assertion mean anything.
      assert.equal(
        targets.length, (p.beats as unknown[]).length,
        `${p.id}: every beat must become a SceneTarget — a short list silently skips the checks below`,
      );
      assert.ok(targets.length > 0, `${p.id}: no scene targets at all`);
      targets.forEach((t, i) => {
        assert.equal(t.sceneIdx, i, `${p.id}: sceneIdx must be dense and zero-based`);
        assert.ok(FUNCTIONS.has(String(t.sceneFunction)), `${p.id}[${i}]: unknown sceneFunction ${t.sceneFunction}`);
        // MechanismProof (server/nvm/proof/tier1/mechanism.ts) unconditionally
        // fails an EMPTY activeMechanisms list, so a beat with none could never
        // commit.
        assert.ok((t.activeMechanisms as string[]).length > 0, `${p.id}[${i}]: needs at least one mechanism`);
        const tension = t.tensionTarget as number;
        assert.ok(tension > 0 && tension <= 100, `${p.id}[${i}]: tensionTarget out of range`);
      });
    }
  });
});

describe('story-bench cast grounding', () => {
  it('emits one well-formed UPDATE_BELIEF per cast member', () => {
    const p = FIXTURE.premises.find((x) => x.id === 'counterweight')!;
    const ops = bench.castGroundingOps(p);
    assert.equal(ops.length, (p.cast as unknown[]).length);
    for (const op of ops) {
      assert.equal(op.op, 'UPDATE_BELIEF');
      const belief = op.belief as Record<string, unknown>;
      // StoryOpItemSchema + llm-generator's parseOp both require a string
      // proposition; the dispatcher keys characterBeliefs off charId, which is
      // what buildSystemPreamble later reads as "known characters".
      assert.equal(typeof op.charId, 'string');
      assert.equal(typeof belief.proposition, 'string');
      assert.equal(typeof belief.confidence, 'number');
    }
    assert.equal(new Set(ops.map((o) => (o.belief as { id: string }).id)).size, ops.length, 'belief ids must be distinct');
  });

  it('returns nothing for a premise with no cast, rather than a malformed op', () => {
    assert.deepEqual(bench.castGroundingOps({ id: 'x' }), []);
  });
});

describe('story-bench log folding', () => {
  it('parses structured logger lines and ignores everything else', () => {
    assert.equal(bench.parseLogLine('not json'), null);
    assert.equal(bench.parseLogLine('{ broken'), null);
    assert.equal(bench.parseLogLine('{"level":"info"}'), null, 'a line with no msg is not a log entry');
    assert.deepEqual(bench.parseLogLine('{"msg":"x","a":1}'), { msg: 'x', a: 1 });
  });

  it('sums calls per model and counts every documented fallback shape', () => {
    const s = bench.summariseCalls([
      { msg: 'openai_compat_call', model: 'a/fast', ms: 900, promptTokens: 100, completionTokens: 400, completionChars: 1200 },
      { msg: 'openai_compat_call', model: 'a/fast', ms: 1100, promptTokens: 120, completionTokens: 0, completionChars: 0 },
      { msg: 'openai_compat_call', model: 'b/pro', ms: 12000, promptTokens: 10, completionTokens: 30, completionChars: 90 },
      { msg: 'revision_rewrite_failed', passName: 'dialogue' },
      { msg: 'revision_rewrite_rejected', passName: 'voice' },
      { msg: 'llm_generator_failed', sceneIdx: 2 },
      { msg: 'llm_generator_unavailable', sceneIdx: 3 },
      { msg: 'llm_generator_partial_parse', sceneIdx: 4 },
      { msg: 'ai_retry', label: 'x' },
      { msg: 'something_else' },
    ]);
    assert.equal(s.llmCalls, 3);
    assert.equal(s.emptyCompletions, 1);
    assert.equal(s.promptTokens, 230);
    assert.equal(s.completionTokens, 430);
    assert.equal(s.fallbacks, 5, 'all five fallback shapes must count');
    assert.equal(s.retries, 1);
    const byModel = s.byModel as Record<string, { calls: number; ms: number; empty: number }>;
    assert.equal(byModel['a/fast'].calls, 2);
    assert.equal(byModel['a/fast'].ms, 2000);
    assert.equal(byModel['a/fast'].empty, 1);
    assert.equal(byModel['b/pro'].calls, 1);
  });
});

describe('story-bench run classification — the honesty rule', () => {
  it('labels a run with no LLM call as FAILED, not as a story', () => {
    const c = bench.classifyRun({ llmCalls: 0, revisionPassesWithChanges: 0, revisionPassCount: 14 });
    assert.equal(c.ok, false);
    assert.match(c.label, /no LLM call/);
  });

  it('labels a run where every pass fell back as FAILED even though 14 passes "ran"', () => {
    // This is the exact shape the pipeline produced before this lane's
    // call-site fix: 14 clean passes, zero changes, a compiled script, a
    // health score — and not one word written by a model.
    const c = bench.classifyRun({ llmCalls: 6, revisionPassesWithChanges: 0, revisionPassCount: 14 });
    assert.equal(c.ok, false);
    assert.match(c.label, /fell back/);
  });

  it('does not label a run FAILED when at least one pass changed the text', () => {
    const c = bench.classifyRun({ llmCalls: 6, revisionPassesWithChanges: 1, revisionPassCount: 14 });
    assert.equal(c.ok, true);
  });

  it('does not invent a fallback verdict when the revision pipeline never ran', () => {
    const c = bench.classifyRun({ llmCalls: 3, revisionPassesWithChanges: 0, revisionPassCount: 0 });
    assert.equal(c.ok, true, 'zero passes is not "every pass fell back"');
  });

  // ── The clauses added in round 2 ────────────────────────────────────────
  // `status: ok` used to be the first thing a reader saw on a run that
  // committed 1 scene of 8 and shipped a 142-word fragment. These clauses are
  // purely structural — scene counts and a provenance flag, no prose
  // judgement — so NORTH_STAR §1 is untouched.
  const full = { llmCalls: 9, revisionPassesWithChanges: 2, revisionPassCount: 14 };

  it('FAILED when no committed scene carried a model-authored op', () => {
    const c = bench.classifyRun({ ...full, committedScenes: 1, requestedScenes: 8, committedNonStub: 0 });
    assert.equal(c.status, 'FAILED');
    assert.match(c.label, /every candidate stubbed/);
    assert.equal(c.ok, false);
  });

  it('FAILED when nothing was committed at all', () => {
    const c = bench.classifyRun({ ...full, committedScenes: 0, requestedScenes: 8, committedNonStub: 0 });
    assert.equal(c.status, 'FAILED');
    assert.match(c.label, /no scene was committed/);
  });

  it('FRAGMENT below half the requested scenes, or below three', () => {
    assert.equal(bench.classifyRun({ ...full, committedScenes: 2, requestedScenes: 8, committedNonStub: 2 }).status, 'FRAGMENT');
    // 2 of 3 is two-thirds, so the half rule does not catch it — the <3 rule does.
    assert.equal(bench.classifyRun({ ...full, committedScenes: 2, requestedScenes: 3, committedNonStub: 2 }).status, 'FRAGMENT');
  });

  it('DEGRADED at half or better but short of every scene', () => {
    const c = bench.classifyRun({ ...full, committedScenes: 6, requestedScenes: 8, committedNonStub: 6 });
    assert.equal(c.status, 'DEGRADED');
    assert.match(c.label, /6 of 8/);
  });

  it('ok only when every requested scene committed', () => {
    const c = bench.classifyRun({ ...full, committedScenes: 8, requestedScenes: 8, committedNonStub: 8 });
    assert.equal(c.status, 'ok');
    assert.equal(c.ok, true);
  });

  it('keeps the two original clauses FIRST, so claims row 117 stays literally true', () => {
    // Row 117: "a run in which every revision pass fell back to the unchanged
    // draft is labelled FAILED, not reported as a story." A perfect scene
    // record must not be able to talk that clause out of firing.
    const c = bench.classifyRun({
      llmCalls: 9, revisionPassesWithChanges: 0, revisionPassCount: 14,
      committedScenes: 8, requestedScenes: 8, committedNonStub: 8,
    });
    assert.equal(c.status, 'FAILED');
    assert.match(c.label, /every revision pass fell back/);
  });

  it('falls back to the original two-clause behaviour when no scene accounting is supplied', () => {
    const c = bench.classifyRun({ llmCalls: 9, revisionPassesWithChanges: 2, revisionPassCount: 14 });
    assert.equal(c.status, 'ok');
  });
});

describe('story-bench run directories are non-destructive', () => {
  // A --only run after a six-premise run used to replace that run's six-row
  // table.md and summary.json with a one-row one, overwrite four artifacts, and
  // turn --packet into a one-script packet. The reviewer hit it for real.
  it('uses <date> for the first run of a day', () => {
    assert.equal(bench.nextRunDir('/r', '2026-09-13', () => false), path.join('/r', '2026-09-13'));
  });

  it('never returns a directory that already holds a summary.json', () => {
    const taken = new Set([path.join('/r', '2026-09-13', 'summary.json')]);
    assert.equal(bench.nextRunDir('/r', '2026-09-13', (f) => taken.has(f)), path.join('/r', '2026-09-13-run2'));
    taken.add(path.join('/r', '2026-09-13-run2', 'summary.json'));
    assert.equal(bench.nextRunDir('/r', '2026-09-13', (f) => taken.has(f)), path.join('/r', '2026-09-13-run3'));
  });

  it('honours an explicit --out name', () => {
    assert.equal(bench.nextRunDir('/r', '2026-09-13', () => true, 'seam-fix'), path.join('/r', 'seam-fix'));
  });

  it('finds the directories --out and --into write, which --packet could not see', () => {
    // `listRunDirs` filtered on the dated pattern alone, so a run written to
    // `--out seam-fix` was invisible to `--packet`, which then assembled a
    // packet from an OLDER dated directory while printing "the newest run
    // directory of N". With a stamp it sees every FINISHED run.
    const stamps: Record<string, number> = {
      '2026-09-12': 10, '2026-09-13': 20, 'seam-fix': 30, 'notes.txt': Number.NaN,
    };
    const stamp = (d: string) => (d in stamps && !Number.isNaN(stamps[d]) ? stamps[d] : null);
    assert.deepEqual(
      bench.listRunDirs(['seam-fix', '2026-09-13', '2026-09-12', 'notes.txt'], stamp),
      ['2026-09-12', '2026-09-13', 'seam-fix'],
      'a --out run is a run, and the newest one is the one --packet must read',
    );
  });

  it('drops a directory with no summary.json, so --packet never picks a crashed run', () => {
    const stamp = (d: string) => (d === '2026-09-12' ? 10 : null);
    assert.deepEqual(bench.listRunDirs(['2026-09-12', '2026-09-13'], stamp), ['2026-09-12'],
      'an unfinished run has no summary.json to read and must not be chosen as newest');
  });

  it('without a stamp keeps exactly the original name-only behaviour', () => {
    assert.deepEqual(
      bench.listRunDirs(['seam-fix', '2026-09-13', '2026-09-12', 'notes.txt']),
      ['2026-09-12', '2026-09-13'],
    );
  });

  it('orders run directories so --packet reads the newest, not the lexically last', () => {
    // '2026-09-13-run10' sorts before '-run2' as a string; the packet must
    // still read run10.
    assert.deepEqual(
      bench.listRunDirs(['2026-09-13-run10', '2026-09-12', '2026-09-13', '2026-09-13-run2', 'notes.txt']),
      ['2026-09-12', '2026-09-13', '2026-09-13-run2', '2026-09-13-run10'],
    );
  });
});

describe('story-bench table is DERIVED from the per-premise row files', () => {
  // WHY THIS SUITE EXISTS. `rowsFromDir` is the whole of `ce2a75b6` — the
  // commit that lets three premises be re-run into an existing run without
  // inventing a table for the other three — and it shipped with NO assertion.
  // The round-2 reviewer replaced its body with `return []` and this file
  // reported 30 pass / 0 fail. Under docs/LANE_STANDARD.md §3 that is not a
  // guard; it is an untested feature. These four assertions are the contract:
  // fixture order, one row replaced, absent rows skipped, and a table that
  // reproduces.
  // Deliberately NOT alphabetical: a derivation that simply globbed the
  // directory would come back in readdir order and pass an alphabetical
  // fixture by accident. The table must follow the FIXTURE.
  const ORDER = ['charlie', 'alpha', 'bravo'];
  const rowFor = (id: string, over: Record<string, unknown> = {}) => ({
    id, shape: 'thriller', scenes: 3, committedScenes: 3, committedNonStub: 2, requestedScenes: 8,
    words: 100, health: 40, verdict: 'PASS', llmCalls: 5, fallbacks: 1,
    revisionPassesWithChanges: 2, revisionPassCount: 14, wallMs: 1_000,
    promptTokens: 10, completionTokens: 5, status: 'FRAGMENT', ...over,
  });

  function tmpRun(write: (dir: string) => void): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'story-bench-rows-'));
    write(dir);
    return dir;
  }

  it('returns rows in FIXTURE order, whatever order they were written in', () => {
    const dir = tmpRun((d) => {
      // Deliberately reverse: a re-run writes whichever premises it re-ran,
      // whenever it finishes them, and the table must not reshuffle.
      for (const id of ['alpha', 'bravo', 'charlie']) {
        writeFileSync(path.join(d, `${id}.row.json`), JSON.stringify(rowFor(id)));
      }
    });
    try {
      assert.deepEqual(bench.rowsFromDir(dir, ORDER).map((r) => r.id), ORDER);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('a re-written row file replaces exactly one row and leaves the others standing', () => {
    const dir = tmpRun((d) => {
      for (const id of ORDER) writeFileSync(path.join(d, `${id}.row.json`), JSON.stringify(rowFor(id)));
      // The re-run: one premise, new numbers, written over its own row file.
      writeFileSync(path.join(d, 'bravo.row.json'), JSON.stringify(rowFor('bravo', { health: 71.9, committedScenes: 5, status: 'DEGRADED' })));
    });
    try {
      const rows = bench.rowsFromDir(dir, ORDER);
      assert.equal(rows.length, 3, 'the two premises that were not re-run must survive');
      assert.deepEqual(rows.map((r) => r.id), ORDER);
      assert.deepEqual(rows.map((r) => r.health), [40, 40, 71.9]);
      assert.deepEqual(rows.map((r) => r.status), ['FRAGMENT', 'FRAGMENT', 'DEGRADED']);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('skips a premise with no row file rather than emitting a hole', () => {
    const dir = tmpRun((d) => {
      writeFileSync(path.join(d, 'alpha.row.json'), JSON.stringify(rowFor('alpha')));
      writeFileSync(path.join(d, 'charlie.row.json'), JSON.stringify(rowFor('charlie')));
      // A stray file that is not a row must not be picked up either.
      writeFileSync(path.join(d, 'alpha.final.fountain'), 'INT. ROOM - DAY\n');
    });
    try {
      const rows = bench.rowsFromDir(dir, ORDER);
      assert.deepEqual(rows.map((r) => r.id), ['charlie', 'alpha']);
      assert.ok(rows.every((r) => r && typeof r.id === 'string'), 'no undefined entries');
      assert.deepEqual(bench.rowsFromDir(dir, []), [], 'no ids, no rows');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('renderTable(rowsFromDir(...)) reproduces the table the run would have printed', () => {
    // The tie the committed documents rest on: the table is the rendering of
    // the row files, not a thing typed beside them.
    const rows = ORDER.map((id) => rowFor(id));
    const dir = tmpRun((d) => {
      for (const r of [rows[1], rows[2], rows[0]]) {
        writeFileSync(path.join(d, `${r.id}.row.json`), JSON.stringify(r));
      }
    });
    try {
      assert.equal(bench.renderTable(bench.rowsFromDir(dir, ORDER)), bench.renderTable(rows));
      const table = bench.renderTable(bench.rowsFromDir(dir, ORDER));
      assert.equal(table.split('\n').length, 5, 'header, rule, three rows');
      assert.ok(table.includes('alpha') && table.includes('bravo') && table.includes('charlie'));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('story-bench reporting', () => {
  const rows = [
    { id: 'alpha', shape: 'thriller', scenes: 8, committedScenes: 8, committedNonStub: 8, requestedScenes: 8, words: 1200, health: 61.5, verdict: 'NEEDS WORK', llmCalls: 22, fallbacks: 3, revisionPassesWithChanges: 4, revisionPassCount: 14, wallMs: 91_000, promptTokens: 9000, completionTokens: 4000, status: 'ok' },
    { id: 'b', shape: 'comedy', scenes: 0, committedScenes: 0, committedNonStub: 0, requestedScenes: 7, words: 0, health: null, verdict: null, llmCalls: 0, fallbacks: 14, revisionPassesWithChanges: 0, revisionPassCount: 14, wallMs: 2_000, promptTokens: 0, completionTokens: 0, status: 'FAILED' },
  ];

  it('renders one aligned row per run and an em dash for an absent score', () => {
    const table = bench.renderTable(rows);
    const lines = table.split('\n');
    assert.equal(lines.length, 4, 'header, rule, two rows');
    assert.ok(lines[0].includes('premise') && lines[0].includes('fallbacks') && lines[0].includes('tokens'));
    // The scenes column is committed/requested, never a bare count: a premise
    // whose scenes were rejected by a Tier 1 proof must not read as a premise
    // that asked for that many.
    assert.ok(lines[3].includes('0/7'), 'a run that committed nothing must show 0/7, not 0');
    assert.ok(lines[2].includes('8/8'));
    assert.ok(lines[0].includes('passes changed'), 'the revision column must be in the table');
    // The column that decides what the run measured: committed scenes whose IR
    // is not a stub. 0/N means the stub generator was measured, not the model.
    assert.ok(lines[0].includes('model scenes'), 'the model-scenes column must be in the table');
    assert.ok(lines[2].includes('8/8'));
    assert.ok(lines[3].includes('0/0'));
    assert.match(lines[2], /alpha/);
    assert.match(lines[3], /FAILED/);
    assert.ok(lines[3].includes('—'), 'a run with no score shows an em dash, never 0');
    const widths = new Set(lines.map((l) => l.length));
    assert.equal(widths.size, 1, 'every row must be the same width');
  });

  it('counts script words without the title page', () => {
    const f = 'Title: X\nCredit: Y\n\nINT. ROOM - DAY\n\nShe waits.\n';
    assert.equal(bench.scriptWordCount(f), 6, 'INT. ROOM - DAY (4) + She waits. (2)');
  });

  it('runDirName is the plain ISO date', () => {
    assert.equal(bench.runDirName(new Date('2026-09-13T22:31:00Z')), '2026-09-13');
  });
});

describe('story-bench reading packet front matter', () => {
  const rows = [
    { id: 'alpha', shape: 'thriller', scenes: 8, words: 1200, health: 61.5, verdict: 'NEEDS WORK', status: 'ok' },
  ];
  const fm = bench.packetFrontMatter(rows, '2026-09-13');

  it('asks the owner the five rubric questions and gives a blank grid', () => {
    assert.equal(bench.RUBRIC.length, 5);
    for (const q of bench.RUBRIC) assert.ok(fm.includes(q), `rubric question missing: ${q}`);
    assert.match(fm, /Q1 {2}Q2 {2}Q3 {2}Q4 {2}Q5/);
    assert.match(fm, /alpha\s+__ {2}__ {2}__ {2}__ {2}__/, 'the grid must be blank, not pre-filled');
  });

  it('heads each script with the COMMITTED scene count, not the doctor\'s', () => {
    // The packet is the one artefact a human scores from, and it printed the
    // doctor's sceneCount as "N scenes" under the same name the results table
    // gives committed/requested. For the-understudy-clause that was 5 against 3
    // committed, the extra two typed by a revision pass.
    assert.equal(
      bench.scenesLabel({ scenes: 5, committedScenes: 3, requestedScenes: 8 }),
      '3 of 8 scenes committed',
    );
    // A row from before the columns existed still renders something true.
    assert.equal(bench.scenesLabel({ scenes: 4 }), '4 of 4 scenes committed');
    assert.match(fm, /TWO SCENE COUNTS, AND WHICH ONE IS AUTHORITATIVE/);
    assert.match(fm, /the committed count is the truth about the run/);
  });

  it('says what the health number cannot see, and what this packet is the seed of', () => {
    assert.match(fm, /STRUCTURE/);
    assert.match(fm, /cannot see whether a story is interesting/);
    // Decision #3's condition, stated without claiming to satisfy it.
    assert.match(fm, /Decision #3/);
    assert.match(fm, /30-case/);
    assert.match(fm, /SEED OF THAT SET/);
    assert.match(fm, /does not satisfy the\s+condition and does not promote anything out of Labs/);
  });

  it('makes no quality claim anywhere in the front matter', () => {
    const banned = /\b(high[- ]quality|excellent|great stor|proven|validated|professional[- ]grade)\b/i;
    assert.ok(!banned.test(fm), 'the packet must not claim quality — the reader is the instrument');
  });
});
