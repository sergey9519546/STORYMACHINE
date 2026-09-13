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
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bench = await import(pathToFileURL(path.join(ROOT, 'scripts', 'story-bench.mjs')).href) as {
  runDirName: (now?: Date) => string;
  beatsToSceneTargets: (p: unknown) => Array<Record<string, unknown>>;
  parseLogLine: (line: string) => Record<string, unknown> | null;
  summariseCalls: (entries: Array<Record<string, unknown>>) => Record<string, unknown>;
  classifyRun: (a: { llmCalls: number; revisionPassesWithChanges: number; revisionPassCount: number }) => { ok: boolean; label: string };
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
});

describe('story-bench reporting', () => {
  const rows = [
    { id: 'alpha', shape: 'thriller', scenes: 8, committedScenes: 8, requestedScenes: 8, words: 1200, health: 61.5, verdict: 'NEEDS WORK', llmCalls: 22, fallbacks: 3, revisionPassesWithChanges: 4, revisionPassCount: 14, wallMs: 91_000, promptTokens: 9000, completionTokens: 4000, status: 'ok' },
    { id: 'b', shape: 'comedy', scenes: 0, committedScenes: 0, requestedScenes: 7, words: 0, health: null, verdict: null, llmCalls: 0, fallbacks: 14, revisionPassesWithChanges: 0, revisionPassCount: 14, wallMs: 2_000, promptTokens: 0, completionTokens: 0, status: 'FAILED' },
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
