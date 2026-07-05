// "Simulate this script" — tests for the pure script→OASIS scenario mapping.
// Conventions: node:test + assert/strict, matching tests/core/fountain-analyzer.test.ts.
// Pure function — no HTTP, no server, no DOM.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioFromScript } from '../../src/lib/scenario-from-script.ts';
import type { ScriptCharacter } from '../../src/components/scriptide/CharacterManager.tsx';

function makeChar(partial: Partial<ScriptCharacter> & { name: string }): ScriptCharacter {
  return { id: partial.name, ghost: '', lie: '', want: '', need: '', ...partial };
}

describe('buildScenarioFromScript — field mapping', () => {
  it('maps a managed character\'s ghost/lie/want/need to knowledge_vector/public_mask/hidden_motive/goalStack, field by field', () => {
    const script = [
      'INT. THE STUDY - NIGHT',
      '',
      'John sits at the desk, reading a letter.',
      '',
      'JOHN',
      "I need to find the truth.",
      '',
      'EXT. GARDEN - DAY',
      '',
      'John paces near the roses.',
      '',
      'JANE',
      "You shouldn't be out here.",
      '',
      'JOHN',
      'I had to think.',
      '',
      'INT. THE STUDY - NIGHT',
      '',
      'Later. John returns to the desk.',
      '',
      'JOHN',
      "It's done.",
    ].join('\n');

    const characters: ScriptCharacter[] = [
      makeChar({
        name: 'John',
        ghost: 'Lost his brother in a fire',
        lie: 'Confident and controlled',
        want: 'To expose the conspiracy',
        need: 'To forgive himself',
      }),
    ];

    const { payload, warnings } = buildScenarioFromScript(script, characters);
    const john = payload.agents.find(a => a.name === 'John');
    assert.ok(john, 'John should be present in agents');
    assert.equal(john!.char_id, 'john');
    assert.equal(john!.public_mask, 'Confident and controlled'); // lie -> public_mask
    assert.equal(john!.hidden_motive, 'To expose the conspiracy'); // want -> hidden_motive
    assert.deepEqual(john!.knowledge_vector, ['Lost his brother in a fire']); // ghost -> knowledge_vector seed
    assert.deepEqual(john!.goalStack, {
      terminal: { id: 'john_terminal', description: 'To forgive himself', value: 100, achieved: false },
      instrumental: [],
      last_planned_at: 0,
    }); // need -> goalStack terminal goal
    assert.equal(john!.suspicion_score, 0);
    assert.equal(john!.is_alive, true);
    // John's first speaking scene is "THE STUDY" (scene 1) -> current_location_id resolves there.
    const studyNode = payload.nodes.find(n => n.name === 'The Study');
    assert.ok(studyNode);
    assert.equal(john!.current_location_id, studyNode!.location_id);
    assert.equal(warnings.length, 0);
  });

  it('includes a speaking character absent from the Codex with a minimal sheet, located at their first speaking scene', () => {
    const script = [
      'INT. THE STUDY - NIGHT',
      '',
      'JOHN',
      'Hello.',
      '',
      'EXT. GARDEN - DAY',
      '',
      'JANE',
      "You shouldn't be out here.",
    ].join('\n');

    const characters: ScriptCharacter[] = [makeChar({ name: 'John' })];
    const { payload } = buildScenarioFromScript(script, characters);

    const jane = payload.agents.find(a => a.name === 'Jane');
    assert.ok(jane, 'Jane (unmanaged, script-only) should be included');
    assert.equal(jane!.char_id, 'jane');
    assert.equal(jane!.public_mask, '');
    assert.equal(jane!.hidden_motive, '');
    assert.deepEqual(jane!.knowledge_vector, []);
    assert.equal(jane!.goalStack, undefined);
    assert.equal(jane!.is_alive, true);

    const gardenNode = payload.nodes.find(n => n.name === 'Garden');
    assert.ok(gardenNode);
    assert.equal(jane!.current_location_id, gardenNode!.location_id);
  });

  it('dedupes repeated sluglines into one location and links only consecutively-visited locations', () => {
    const script = [
      'INT. THE STUDY - NIGHT',
      '',
      'Action here.',
      '',
      'EXT. GARDEN - DAY',
      '',
      'More action.',
      '',
      'INT. THE STUDY - NIGHT', // revisits Study — must not create a duplicate node
      '',
      'Final beat.',
    ].join('\n');

    const { payload, warnings } = buildScenarioFromScript(script, []);
    assert.equal(payload.nodes.length, 2, 'THE STUDY should be deduped to a single node');

    const study = payload.nodes.find(n => n.name === 'The Study');
    const garden = payload.nodes.find(n => n.name === 'Garden');
    assert.ok(study && garden);
    // Traversal graph: Study<->Garden (visited consecutively twice), no self-loops.
    assert.deepEqual(study!.adjacent_locations, [garden!.location_id]);
    assert.deepEqual(garden!.adjacent_locations, [study!.location_id]);
    // No characters in this fixture — that's a separate, expected warning.
    assert.ok(warnings.some(w => /No characters found/.test(w)));
  });

  it('falls back to one default location when the script has zero scene headings', () => {
    const script = ['JOHN', 'Hello there, is anybody home?'].join('\n');
    const characters: ScriptCharacter[] = [makeChar({ name: 'John' })];

    const { payload, warnings } = buildScenarioFromScript(script, characters);
    assert.equal(payload.nodes.length, 1);
    assert.equal(payload.nodes[0].location_id, 'default_location');
    assert.equal(payload.agents[0].current_location_id, 'default_location');
    assert.equal(warnings.length, 0); // a default location is not itself a problem worth warning about
  });

  it('caps locations at 12 and surfaces a truncation warning naming both counts', () => {
    const lines: string[] = [];
    for (let i = 1; i <= 15; i++) {
      lines.push(`INT. LOCATION ${i} - DAY`, '', `Something happens in location ${i}.`, '');
    }
    const { payload, warnings } = buildScenarioFromScript(lines.join('\n'), []);
    assert.equal(payload.nodes.length, 12);
    assert.ok(
      warnings.some(w => w.includes('15') && w.includes('12') && /distinct locations/.test(w)),
      `expected a truncation warning mentioning 15 and 12, got: ${JSON.stringify(warnings)}`
    );
  });

  it('returns an honest empty result for an empty script with no characters', () => {
    const { payload, warnings } = buildScenarioFromScript('', []);
    assert.equal(payload.nodes.length, 1);
    assert.equal(payload.nodes[0].location_id, 'default_location');
    assert.deepEqual(payload.agents, []);
    assert.ok(warnings.some(w => /No characters found/.test(w)));
  });
});
