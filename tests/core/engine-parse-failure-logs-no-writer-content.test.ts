// engine-parse-failure-logs-no-writer-content.test.ts — the generative
// engine's parse-failure/AI-error branches never put the writer's own text
// into a log line, proven behaviorally (not just by the static field-name
// guard in the sibling engine-logs-content-field-guard.test.ts).
//
// WHY THIS FILE, NOT MORE ASSERTIONS IN tests/routes/no-writer-content-in-
// logs.test.ts. That test drives the whole HTTP surface, which is exactly
// why it cannot reach server/engine/**: the simulation routes it would need
// to hit only run with an AI provider key configured, and CI (correctly)
// runs keyless. Driving these branches needs a fake LLM response, and the
// engine's seam for that is server/engine/ai.ts's setLLMProvider() — the
// SAME seam tests/core/deterministic-sim.test.ts already uses
// (resetLLMProvider(), to force the OTHER branch: no provider at all).
// server/lib/llm-port.ts (tests/core/llm-seam-wiring.test.ts) is a real
// inversion from today, but it is deep-read.ts's seam (server/nvm/analyze),
// not this one — server/engine/Agent.ts, agent/decision.ts, agent/memory.ts
// and DirectorNode.ts all call ai.ts's generateContent()/_provider directly.
// setLLMProvider is the actual, already-established fake-provider seam for
// this code, so that is what drives the branches below.
//
// THE PROOF SHAPE. A fake provider returns deliberately malformed (non-JSON)
// text carrying an LLM-OUTPUT marker; the character sheets driving each call
// carry a CHARACTER-NAME marker. Every parse-failure/AI-error branch these
// inputs can reach is exercised with process output captured start to
// finish (same tee-not-swallow technique as
// tests/routes/no-writer-content-in-logs.test.ts). With
// STORYMACHINE_LOG_WRITER_CONTENT unset (default), neither marker may appear
// anywhere in that output. Flipping it to '1' and repeating the exact same
// run must make the LLM-output marker (inside a describeContent() `raw`
// field) appear — proving the escape hatch actually carries content, not
// just that it is documented to.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Agent } from '../../server/engine/Agent.ts';
import { Stage } from '../../server/engine/Stage.ts';
import { DirectorNode } from '../../server/engine/DirectorNode.ts';
import { synthesizeReflectionsFor } from '../../server/engine/agent/memory.ts';
import { setLLMProvider, resetLLMProvider, type LLMProvider } from '../../server/engine/ai.ts';
import type { CharacterSheet, Location } from '../../server/engine/types.ts';
import type { GenerateContentResponse } from '@google/genai';

const MARK = {
  character: 'ZZENGCHARMARK1',
  llmOutput: 'ZZENGOUTPUTMARK2',
};

// Deliberately NOT valid JSON — every parse-failure branch under test exists
// specifically for this shape of response (a malformed/empty candidate from
// the model). Long enough to clear every call site's own "was this even
// worth logging a preview of" length gate (> 10 chars).
const MALFORMED = `${MARK.llmOutput} the story continues but the model forgot to emit JSON this turn, which is exactly the failure this whole file exists to make safe to log.`;

function fakeProvider(): LLMProvider {
  const response = { text: MALFORMED, candidates: [] } as unknown as GenerateContentResponse;
  return { generate: async () => response };
}

function sheet(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    char_id: 'eng-a1',
    name: MARK.character,
    public_mask: 'A composed art dealer.',
    hidden_motive: 'Protect the forged painting.',
    knowledge_vector: [],
    current_location_id: 'room-a',
    suspicion_score: 10,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g0', description: 'clear her name', value: 90, achieved: false },
      instrumental: [{ id: 'g1', description: 'find out who forged the painting', value: 70, achieved: false }],
      last_planned_at: 0,
    },
    ...overrides,
  };
}

function otherSheet(): CharacterSheet {
  return {
    char_id: 'eng-a2',
    name: 'Bystander',
    public_mask: 'A nervous curator.',
    hidden_motive: 'Cover his tracks.',
    knowledge_vector: [],
    current_location_id: 'room-a',
    suspicion_score: 5,
    is_alive: true,
  };
}

function makeStage(): Stage {
  const stage = new Stage(':memory:');
  const roomA: Location = { location_id: 'room-a', name: 'Gallery', description: 'A quiet gallery.', adjacent_locations: ['room-b'] };
  const roomB: Location = { location_id: 'room-b', name: 'Hallway', description: 'An empty hallway.', adjacent_locations: ['room-a'] };
  stage.addLocation(roomA);
  stage.addLocation(roomB);
  return stage;
}

/** Tee (never swallow) process output for the duration of `body` — mirrors
 *  tests/routes/no-writer-content-in-logs.test.ts's captureProcessOutput. */
async function captureProcessOutput(body: () => Promise<void>): Promise<string> {
  const captured: string[] = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  const tee = (real: typeof realOut) => ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    captured.push(String(chunk));
    return (real as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
  process.stdout.write = tee(realOut);
  process.stderr.write = tee(realErr);
  try {
    await body();
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return captured.join('');
}

/** Drives every parse-failure branch this suite covers once, returning the
 *  full captured process output. Rebuilds a fresh Stage each time so runs
 *  under different flag values cannot see each other's belief-graph state. */
async function runFailingSimulationTurn(): Promise<string> {
  return captureProcessOutput(async () => {
    const stage = makeStage();
    try {
      stage.addAgent(sheet());
      stage.addAgent(otherSheet());

      // Agent.takeTurn() -> agent/decision.ts selectBestAction(): malformed
      // JSON -> agent_parse_fallback (empty content on the fallback candidate).
      const agent = new Agent(sheet(), stage);
      const action = await agent.takeTurn();
      const actionId = stage.recordAction('eng-a1', action, 'room-a');

      // Agent.updateEpistemics() -> agent_parse_fallback.
      const recent = stage.getSensoryFilter('room-a', 5);
      await agent.updateEpistemics(recent);

      // agent/memory.ts synthesizeReflectionsFor() -> agent_parse_fallback.
      await synthesizeReflectionsFor('eng-a1', stage);

      // DirectorNode.evaluateRoom() -> evaluatePerspective() -> the
      // malformed response is parsed via safeJsonParse (server/lib/json.ts),
      // which on real malformed input logs json_parse_error itself.
      const director = new DirectorNode(stage);
      await director.evaluateRoom('room-a', [
        { action_id: actionId, timestamp: Date.now(), char_id: 'eng-a1', location_id: 'room-a', action_type: 'SPEAK', target_char_id: null, content: 'Something was said.', is_audible: true },
      ]);
    } finally {
      stage.close();
    }
  });
}

describe('server/engine parse-failure branches never leak the writer\'s character name or the model\'s raw output', () => {
  const previousFlag = process.env.STORYMACHINE_LOG_WRITER_CONTENT;

  before(() => setLLMProvider(fakeProvider()));
  after(() => {
    resetLLMProvider();
    if (previousFlag === undefined) delete process.env.STORYMACHINE_LOG_WRITER_CONTENT;
    else process.env.STORYMACHINE_LOG_WRITER_CONTENT = previousFlag;
  });

  it('with the escape hatch OFF (default), neither the character name nor the raw model output reaches the log', async () => {
    delete process.env.STORYMACHINE_LOG_WRITER_CONTENT;
    const output = await runFailingSimulationTurn();

    assert.ok(output.length > 0, 'sanity: something was actually logged during this run');
    assert.ok(
      !output.includes(MARK.character),
      `the character's name (${MARK.character}) reached the process log:\n${output}`,
    );
    assert.ok(
      !output.includes(MARK.llmOutput),
      `the model's raw output (${MARK.llmOutput}) reached the process log:\n${output}`,
    );
  });

  it('with the escape hatch ON, the raw model output DOES reach the log — proving it is a real switch, not just documentation', async () => {
    process.env.STORYMACHINE_LOG_WRITER_CONTENT = '1';
    const output = await runFailingSimulationTurn();

    assert.ok(
      output.includes(MARK.llmOutput),
      'STORYMACHINE_LOG_WRITER_CONTENT=1 must make describeContent() include the raw text — '
      + `it did not appear anywhere in this run's output:\n${output}`,
    );
    // The character's own NAME is never the payload describeContent() carries
    // (call sites pass idRef(char_id), not the sheet, into it) — the escape
    // hatch widens what a parse failure reveals about the MODEL's output, not
    // a second, separate promise about display names. That distinction is
    // asserted here so a future change cannot quietly widen idRef() call
    // sites into logging names without this test noticing.
    assert.ok(
      !output.includes(MARK.character),
      `the escape hatch also revealed the character's name (${MARK.character}), which it must never do:\n${output}`,
    );
  });
});
