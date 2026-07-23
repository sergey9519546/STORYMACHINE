// Regression coverage for src/lib/api-schemas.ts's client-side response
// schemas — these validate what the server ACTUALLY returns (see each
// schema's comment in api-schemas.ts for the exact route it mirrors).
// LocationSchema/StateResponseSchema and PersuasionRecordSchema previously
// declared field names (`node_id`/`adjacent`, `targetId`/`mode`/`resistance`)
// that matched nothing GET /api/state or GET /api/persuasion/:charId ever
// return — the same class of drift OutlineBeatSchema had before its fix.
// Before the fix, `.parse()`-ing a realistic response would throw; these
// tests pin the shapes to the real server field names so that regresses loudly.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LocationSchema,
  StateResponseSchema,
  PersuasionRecordSchema,
} from '../../src/lib/api-schemas.ts';

describe('LocationSchema / StateResponseSchema — mirrors server Location (location_id/adjacent_locations)', () => {
  it('parses a realistic GET /api/state Location row (location_id, adjacent_locations)', () => {
    const realLocation = {
      location_id: 'kitchen',
      name: 'The Kitchen',
      description: 'A cramped galley kitchen.',
      adjacent_locations: ['hallway', 'dining_room'],
    };
    const parsed = LocationSchema.parse(realLocation);
    assert.equal(parsed.location_id, 'kitchen');
    assert.deepEqual(parsed.adjacent_locations, ['hallway', 'dining_room']);
  });

  it('parses a full GET /api/state response ({ agents, nodes })', () => {
    const realResponse = {
      agents: [
        {
          char_id: 'alice',
          name: 'Alice',
          public_mask: 'The host',
          hidden_motive: 'Wants the will destroyed',
          knowledge_vector: ['fact_1'],
        },
      ],
      nodes: [
        { location_id: 'kitchen', name: 'The Kitchen', description: 'desc', adjacent_locations: ['hallway'] },
      ],
    };
    const parsed = StateResponseSchema.parse(realResponse);
    assert.equal(parsed.nodes[0].location_id, 'kitchen');
    assert.equal(parsed.agents[0].char_id, 'alice');
  });

  it('rejects the stale node_id/adjacent shape (would have silently masked the real bug)', () => {
    const staleShape = { node_id: 'kitchen', name: 'The Kitchen', adjacent: ['hallway'] };
    const result = LocationSchema.safeParse(staleShape);
    // location_id is required and absent from the stale shape — must fail.
    assert.equal(result.success, false);
  });
});

describe('PersuasionRecordSchema — mirrors server PersuasionRecord (agent_id/target_id/strategy)', () => {
  it('parses a realistic GET /api/persuasion/:charId row', () => {
    const realRecord = {
      id: 'p1',
      agent_id: 'alice',
      target_id: 'bob',
      strategy: 'reciprocity',
      turn: 4,
      success: true,
    };
    const parsed = PersuasionRecordSchema.parse(realRecord);
    assert.equal(parsed.target_id, 'bob');
    assert.equal(parsed.strategy, 'reciprocity');
    assert.equal(parsed.turn, 4);
  });

  it('parses a record with success omitted (optional per server type)', () => {
    const record = { id: 'p2', agent_id: 'alice', target_id: 'bob', strategy: 'logic', turn: 1 };
    const parsed = PersuasionRecordSchema.parse(record);
    assert.equal(parsed.success, undefined);
  });

  it('rejects the stale turn/targetId/mode shape (would have silently masked the real bug)', () => {
    const staleShape = { turn: 4, targetId: 'bob', mode: 'reciprocity', success: true };
    const result = PersuasionRecordSchema.safeParse(staleShape);
    // target_id/strategy/agent_id are required and absent from the stale shape — must fail.
    assert.equal(result.success, false);
  });
});
