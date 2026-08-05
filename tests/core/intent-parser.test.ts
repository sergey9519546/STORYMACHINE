import test from 'node:test';
import assert from 'node:assert';
import { proposeStateDelta } from '../../server/nvm/live/intent-parser.ts';
import type { IntentParseResult } from '../../server/nvm/live/types.ts';

test('IntentParser - proposeStateDelta - Category A', () => {
  const result: IntentParseResult = {
    action: 'Mara looks out the window',
    intent: 'show ambient waiting',
    possibleStateEffects: [],
    riskCategory: 'A'
  };

  const card = proposeStateDelta(result);
  assert.strictEqual(card, null, 'Category A should not propose a state delta card');
});

test('IntentParser - proposeStateDelta - Category B', () => {
  const result: IntentParseResult = {
    action: 'Mara hides the keys',
    intent: 'conceal evidence',
    possibleStateEffects: ['Mara has the keys', 'Keys are hidden'],
    riskCategory: 'B'
  };

  const card = proposeStateDelta(result);
  assert.notStrictEqual(card, null, 'Category B should propose a state delta card');
  assert.strictEqual(card?.requiresConfirmation, false, 'Category B does not strictly require hard confirmation');
  assert.strictEqual(card?.effects.length, 2);
});

test('IntentParser - proposeStateDelta - Category C', () => {
  const result: IntentParseResult = {
    action: 'Mara shoots Eli',
    intent: 'kill Eli',
    possibleStateEffects: ['Eli is dead', 'Mara is a murderer'],
    riskCategory: 'C'
  };

  const card = proposeStateDelta(result);
  assert.notStrictEqual(card, null, 'Category C should propose a state delta card');
  assert.strictEqual(card?.requiresConfirmation, true, 'Category C requires hard confirmation');
});
