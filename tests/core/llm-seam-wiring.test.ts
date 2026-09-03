// llm-seam-wiring.test.ts — the two inversions that keep the deterministic
// core keyless are actually wired at the composition root.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Retrospective #5 cut two edges out of server/nvm/analyze/doctor.ts's import
// graph by inverting them:
//
//   * deep-read.ts asks server/lib/llm-port.ts for a transport instead of
//     importing server/engine/ai.ts. engine/ai.ts registers itself as the
//     adapter at module load.
//   * rewrite.ts's generative half lives in rewrite-llm.ts, which registers
//     itself with rewrite.ts at module load. server/routes/nvm/revision.ts —
//     the only entrypoint that runs revision passes outside runDiagnoseOnly()
//     — imports it for that side effect.
//
// tests/core/pure-core-boundary.test.ts proves the NEGATIVE half of that
// bargain: the core cannot reach either adapter. Nothing proved the POSITIVE
// half, and an inversion that nobody plugs in is worse than the static import
// it replaced — it fails silently, in the one mode (a configured API key) that
// no keyless test exercises. A dropped side-effect import would have shown up
// as "revision just stopped rewriting", with every existing test still green,
// because every existing test is keyless and asserts the unchanged draft.
//
// ── THIS FILE'S TESTS ARE ORDER-DEPENDENT, ON PURPOSE ────────────────────────
// Several assertions are about what has NOT been loaded yet — "the analysis
// core, on its own, has no LLM port and no rewriter". That is only observable
// before something pulls server/engine/ai.ts into the process, so every import
// below is dynamic and the tests run top to bottom in one describe rather than
// being grouped by subject. node:test runs subtests sequentially by default;
// if that ever changes, the "core alone" tests fail loudly rather than
// silently passing, because a registered adapter is exactly what they assert
// the absence of.
//
// NO NETWORK, EVER. The deep-read half drives a hand-written LlmPort. The
// rewrite half swaps the `generate` method on engine/ai.ts's exported
// geminiProvider object — a fake at the last hop before the SDK, which is what
// lets the accepted-rewrite path be asserted positively (usedLLM: true, the
// fake's text returned) instead of the keyless "it threw and we kept the
// draft" path that every other test already covers.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReachableSet } from '../../scripts/lib/import-graph.mjs';
import type { LlmPort, LlmPortRequest, LlmPortCallOptions } from '../../server/lib/llm-port.ts';
import type { RewriteInput } from '../../server/nvm/revision/rewrite.ts';
import type { RevisionIssue } from '../../server/nvm/revision/passes/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

// Type-only imports above are erased at runtime, so they do NOT load
// engine/ai.ts and cannot spoil the "core alone" assertions below. Everything
// with a runtime effect is imported dynamically, inside the test that wants it.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const REWRITE_LLM = 'server/nvm/revision/rewrite-llm.ts';

/** Three scenes, distinct enough that each one's record is identifiable. */
const FOUNTAIN = [
  'INT. APARTMENT - DAY',
  '',
  'Maya reads quietly by the window, at ease.',
  '',
  'MAYA',
  'A calm morning, finally.',
  '',
  'INT. OFFICE - DAY',
  '',
  'Cole flips through a case file, uneasy.',
  '',
  'COLE',
  'Something here does not add up.',
  '',
  'INT. WAREHOUSE - NIGHT',
  '',
  'A gun. Blood on the floor. Someone screams and runs.',
  '',
  'COLE',
  'Get down! Now!',
].join('\n');

/** One issue, so rewritePass gets past its `issues.length === 0` short-circuit
 *  and the only thing left that can stop it is the diagnose-only scope or a
 *  missing rewriter — which is precisely what these tests discriminate. */
const ONE_ISSUE: RevisionIssue[] = [{
  rule: 'TEST_ONLY_ISSUE',
  severity: 'minor',
  location: 'Scene 1',
  description: 'A deliberately synthetic issue, present only to make rewritePass proceed.',
}];

function rewriteInput(): RewriteInput {
  return { fountain: FOUNTAIN, issues: ONE_ISSUE, passName: 'dialogue', approvedSpans: [] };
}

/** Pulls the sceneIdx list one LLM call was asked about out of the batch
 *  prompt's "--- SCENE N (DATA" markers, so the fake port can answer exactly
 *  the batch it was given without hardcoding deep-read.ts's batch size. */
function requestedSceneIdxs(request: LlmPortRequest): number[] {
  const promptText = request.contents[0]?.parts?.[0]?.text ?? '';
  const idxs: number[] = [];
  const re = /--- SCENE (\d+) \(DATA/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(promptText)) !== null) idxs.push(Number(m[1]));
  return idxs;
}

interface PortSpy {
  port: LlmPort;
  tasks: string[];
  requests: Array<{ request: LlmPortRequest; options: LlmPortCallOptions }>;
}

/** An LlmPort built by hand — no engine/ai.ts, no provider stack, no network.
 *  This is the shape a worker thread would get if someone chose to give it
 *  one, and driving deep read through it is what proves the seam is real
 *  rather than a wrapper around a static import. */
function makePortSpy(): PortSpy {
  const spy: PortSpy = { tasks: [], requests: [], port: null as unknown as LlmPort };
  spy.port = {
    modelForTask(task: string) {
      spy.tasks.push(task);
      return 'fake-model-v1';
    },
    async generateContent(request, options) {
      spy.requests.push({ request, options });
      const annotations = requestedSceneIdxs(request).map(sceneIdx => ({
        sceneIdx,
        suspenseDelta: sceneIdx - 4,
        curiosityDelta: sceneIdx,
        emotionalShift: 'negative',
        purpose: 'raise_stakes',
        dramaticTurn: `port-supplied turn ${sceneIdx}`,
        revelation: null,
      }));
      return { text: JSON.stringify(annotations) };
    },
    async generateDirect() {
      throw new Error('deep read must not call generateDirect — it asks for the retrying variant');
    },
  };
  return spy;
}

describe('LLM seam wiring (retrospective #5, positive half)', () => {
  let restorePort: (() => void) | undefined;
  let restoreGenerate: (() => void) | undefined;

  after(() => {
    restorePort?.();
    restoreGenerate?.();
  });

  // ── Static: the composition root is wired, and would fail if it were not ──

  it('every route module that runs a revision pipeline can reach rewrite-llm.ts', () => {
    // "Runs revision passes outside runDiagnoseOnly()" is, on the shipped
    // surface, exactly "calls runRevisionPipeline() from under server/routes/"
    // — the doctor and the calibration corpus builder call it too, but both
    // wrap it in runDiagnoseOnly(), which returns before the rewriter is ever
    // consulted. Discovering the callers rather than naming one file is the
    // point: a NEW route that runs the pipeline has to wire the rewriter too,
    // and this fails until it does. (A future route that deliberately runs the
    // pipeline diagnose-only would be a false positive here; the fix then is
    // an explicit exclusion with a reason, not deleting the check.)
    const routeFiles: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(path.join(REPO_ROOT, dir)).sort()) {
        const rel = `${dir}/${entry}`;
        if (statSync(path.join(REPO_ROOT, rel)).isDirectory()) walk(rel);
        else if (rel.endsWith('.ts') && !rel.endsWith('.test.ts')) routeFiles.push(rel);
      }
    };
    walk('server/routes');

    const pipelineRoutes = routeFiles.filter(rel =>
      /\brunRevisionPipeline\s*\(/.test(readFileSync(path.join(REPO_ROOT, rel), 'utf8')));

    assert.ok(
      pipelineRoutes.length > 0,
      'no route module calls runRevisionPipeline() — this check would pass vacuously. '
      + 'If the pipeline genuinely left the route surface, delete this test with that finding; '
      + 'do not leave it here asserting nothing.',
    );

    for (const rel of pipelineRoutes) {
      const reachable = computeReachableSet(REPO_ROOT, [rel]);
      assert.ok(
        reachable.has(REWRITE_LLM),
        `${rel} runs the 14-pass revision pipeline but cannot reach ${REWRITE_LLM}, so nothing `
        + 'registers the prose rewriter with server/nvm/revision/rewrite.ts and every rewrite on '
        + 'this route silently no-ops — with a configured API key, and with every keyless test '
        + `still green. Add \`import '${'../'.repeat(rel.split('/').length - 1)}${REWRITE_LLM.replace('server/', '')}';\` `
        + 'to it, or route the call through a module that already has it.',
      );
    }
  });

  // ── The analysis core, alone, has neither adapter ─────────────────────────
  // These two run FIRST (see the file header): they assert the absence of
  // something a later test deliberately causes to exist.

  it('loading the analysis core alone registers no LLM port', async () => {
    const { getLlmPort } = await import('../../server/lib/llm-port.ts');
    await import('../../server/nvm/analyze/deep-read.ts');
    assert.equal(
      getLlmPort(),
      null,
      'importing deep-read.ts registered an LLM port, which means something in the deterministic '
      + 'core reached server/engine/ai.ts again. tests/core/pure-core-boundary.test.ts names the '
      + 'edge; this is the same regression seen from the other side.',
    );
  });

  it('loading the analysis core alone registers no prose rewriter', async () => {
    const { rewritePass } = await import('../../server/nvm/revision/rewrite.ts');
    const result = await rewritePass(rewriteInput());
    assert.deepEqual(
      result,
      { revised: FOUNTAIN, usedLLM: false },
      'rewrite.ts rewrote something with no rewriter registered — the short-circuit that makes '
      + 'the doctor safe to run keyless is gone.',
    );
  });

  // ── deep-read reaches the model THROUGH the port ──────────────────────────

  it('deep read drives a registered LlmPort and merges what it returns', async () => {
    const { registerLlmPort, getLlmPort } = await import('../../server/lib/llm-port.ts');
    const { deepReadRecords, clearDeepReadCache } = await import('../../server/nvm/analyze/deep-read.ts');
    const { analyzeFountainText } = await import('../../server/nvm/analyze/fountain-analyzer.ts');

    const previous = getLlmPort();
    restorePort = () => registerLlmPort(previous);

    const spy = makePortSpy();
    clearDeepReadCache();
    registerLlmPort(spy.port);

    const { records: baseline } = analyzeFountainText(FOUNTAIN);
    assert.equal(baseline.length, 3);

    const { records: merged, deepRead } = await deepReadRecords(FOUNTAIN, baseline);

    // The port was consulted for BOTH of the things deep read needs from it.
    assert.deepEqual(spy.tasks, ['ANALYSIS'], 'deep read must resolve its model through the port');
    assert.equal(spy.requests.length, 1, 'three scenes fit in one batch — expected exactly one call');
    // modelForTask's return value threaded all the way into the request (and,
    // with it, into deep-read.ts's per-scene cache key).
    assert.equal(spy.requests[0].request.model, 'fake-model-v1');
    assert.equal(spy.requests[0].request.config?.responseMimeType, 'application/json');
    assert.equal(spy.requests[0].request.config?.temperature, 0);
    assert.equal(spy.requests[0].options.label, 'deepReadScenes');

    assert.equal(deepRead.usedLLM, true);
    assert.equal(deepRead.scenesRead, 3);
    assert.equal(deepRead.scenesTotal, 3);
    assert.deepEqual(deepRead.fallbackScenes, []);

    for (let i = 0; i < 3; i++) {
      assert.equal(merged[i].suspenseDelta, i - 4, 'the port\'s value must reach the merged record');
      assert.equal(merged[i].dramaticTurn, `port-supplied turn ${i}`);
      // Identity fields stay the analyzer's, port or no port.
      assert.equal(merged[i].sceneIdx, baseline[i].sceneIdx);
      assert.equal(merged[i].slug, baseline[i].slug);
    }

    clearDeepReadCache();
  });

  it('deep read degrades cleanly — not by throwing — when no port is registered', async () => {
    const { registerLlmPort } = await import('../../server/lib/llm-port.ts');
    const { deepReadRecords, clearDeepReadCache } = await import('../../server/nvm/analyze/deep-read.ts');
    const { analyzeFountainText } = await import('../../server/nvm/analyze/fountain-analyzer.ts');

    const spy = makePortSpy();
    clearDeepReadCache();
    registerLlmPort(null);

    const { records: baseline } = analyzeFountainText(FOUNTAIN);
    const { records: returned, deepRead } = await deepReadRecords(FOUNTAIN, baseline);

    // This is the state of every doctor worker thread, of `npm run
    // measure-real`, and of a keyless server: no adapter has been loaded, and
    // the contract is that analysis still completes.
    assert.equal(returned, baseline, 'the untouched input array must be handed straight back');
    assert.deepEqual(deepRead, {
      scenesRead: 0,
      scenesTotal: 3,
      usedLLM: false,
      fallbackScenes: baseline.map((r: ScreenplaySceneRecord) => r.sceneIdx),
    });
    assert.equal(spy.requests.length, 0, 'nothing may be sent anywhere with no port registered');

    clearDeepReadCache();
  });

  // ── Loading the route wires the rewriter, and it actually runs ────────────

  it('importing the revision route registers the rewriter, and a rewrite reaches it', async () => {
    const { rewritePass } = await import('../../server/nvm/revision/rewrite.ts');

    // The same call returned usedLLM:false two tests ago. The ONLY thing that
    // changes between there and here is this import — which is the claim.
    await import('../../server/routes/nvm/revision.ts');

    const ai = await import('../../server/engine/ai.ts');
    const original = ai.geminiProvider.generate;
    restoreGenerate = () => { ai.geminiProvider.generate = original; };

    // Long enough to clear REWRITE_MIN_LENGTH_RATIO (0.80 of the original), so
    // the ACCEPTED branch is what gets exercised rather than a length reject.
    const revisedText = `${FOUNTAIN}\n\nCOLE\nAnd it was rewritten.\n`;
    let calls = 0;
    ai.geminiProvider.generate = async () => {
      calls++;
      return {
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: revisedText }] } }],
      } as unknown as Awaited<ReturnType<typeof original>>;
    };

    const result = await rewritePass(rewriteInput());

    assert.equal(calls, 1, 'the registered rewriter never reached the provider');
    assert.equal(result.usedLLM, true);
    assert.equal(result.revised, revisedText.trim(), 'the rewriter\'s output must be returned');
  });

  it('the diagnose-only scope still short-circuits after the rewriter is wired', async () => {
    const { rewritePass, runDiagnoseOnly } = await import('../../server/nvm/revision/rewrite.ts');
    const ai = await import('../../server/engine/ai.ts');

    let calls = 0;
    const previous = ai.geminiProvider.generate;
    ai.geminiProvider.generate = async () => {
      calls++;
      throw new Error('diagnose-only must never reach a provider');
    };

    try {
      const result = await runDiagnoseOnly(() => rewritePass(rewriteInput()));
      assert.deepEqual(result, { revised: FOUNTAIN, usedLLM: false });
      assert.equal(calls, 0, 'the doctor\'s zero-LLM-cost contract is broken');
    } finally {
      ai.geminiProvider.generate = previous;
    }
  });
});
