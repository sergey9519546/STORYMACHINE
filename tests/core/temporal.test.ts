import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { relate, inverse, composeConsistent, type AllenRelation, type Interval, type Constraint } from '../../server/nvm/analyze/temporal.ts';

test('relate() — basic Allen relations', async (t) => {
  // before: [1,3] before [5,7] — 3 < 5
  await t.test('[1,3] before [5,7]', () => {
    const result = relate({ start: 1, end: 3 }, { start: 5, end: 7 });
    assert.equal(result, 'before');
  });

  // meets: [1,3] meets [3,5] — a2 === b1
  await t.test('[1,3] meets [3,5]', () => {
    const result = relate({ start: 1, end: 3 }, { start: 3, end: 5 });
    assert.equal(result, 'meets');
  });

  // overlaps: [1,5] overlaps [3,7] — a1 < b1, a2 in (b1, b2)
  await t.test('[1,5] overlaps [3,7]', () => {
    const result = relate({ start: 1, end: 5 }, { start: 3, end: 7 });
    assert.equal(result, 'overlaps');
  });

  // starts: [1,3] starts [1,5] — a1 === b1, a2 < b2
  await t.test('[1,3] starts [1,5]', () => {
    const result = relate({ start: 1, end: 3 }, { start: 1, end: 5 });
    assert.equal(result, 'starts');
  });

  // during: [3,5] during [1,7] — a1 > b1, a2 < b2
  await t.test('[3,5] during [1,7]', () => {
    const result = relate({ start: 3, end: 5 }, { start: 1, end: 7 });
    assert.equal(result, 'during');
  });

  // finishes: [5,7] finishes [1,7] — a2 === b2, a1 > b1
  await t.test('[5,7] finishes [1,7]', () => {
    const result = relate({ start: 5, end: 7 }, { start: 1, end: 7 });
    assert.equal(result, 'finishes');
  });

  // equals: [2,5] equals [2,5]
  await t.test('[2,5] equals [2,5]', () => {
    const result = relate({ start: 2, end: 5 }, { start: 2, end: 5 });
    assert.equal(result, 'equals');
  });

  // after: [5,7] after [1,3] — a1 > b2
  await t.test('[5,7] after [1,3]', () => {
    const result = relate({ start: 5, end: 7 }, { start: 1, end: 3 });
    assert.equal(result, 'after');
  });

  // met_by: [3,5] met_by [1,3] — a1 === b2
  await t.test('[3,5] met_by [1,3]', () => {
    const result = relate({ start: 3, end: 5 }, { start: 1, end: 3 });
    assert.equal(result, 'met_by');
  });

  // overlapped_by: [3,7] overlapped_by [1,5] — b1 < a1, b2 in (a1, a2)
  await t.test('[3,7] overlapped_by [1,5]', () => {
    const result = relate({ start: 3, end: 7 }, { start: 1, end: 5 });
    assert.equal(result, 'overlapped_by');
  });

  // started_by: [1,5] started_by [1,3] — b1 === a1, b2 > a2
  await t.test('[1,5] started_by [1,3]', () => {
    const result = relate({ start: 1, end: 5 }, { start: 1, end: 3 });
    assert.equal(result, 'started_by');
  });

  // contains: [1,7] contains [3,5] — b1 > a1, b2 < a2
  await t.test('[1,7] contains [3,5]', () => {
    const result = relate({ start: 1, end: 7 }, { start: 3, end: 5 });
    assert.equal(result, 'contains');
  });

  // finished_by: [1,7] finished_by [5,7] — b2 === a2, b1 > a1
  await t.test('[1,7] finished_by [5,7]', () => {
    const result = relate({ start: 1, end: 7 }, { start: 5, end: 7 });
    assert.equal(result, 'finished_by');
  });
});

test('inverse() — all 13 relations', async (t) => {
  const relations: AllenRelation[] = [
    'before', 'meets', 'overlaps', 'starts', 'during', 'finishes', 'equals',
    'after', 'met_by', 'overlapped_by', 'started_by', 'contains', 'finished_by'
  ];

  const inverseMap: Record<AllenRelation, AllenRelation> = {
    before: 'after',
    meets: 'met_by',
    overlaps: 'overlapped_by',
    starts: 'started_by',
    during: 'contains',
    finishes: 'finished_by',
    equals: 'equals',
    after: 'before',
    met_by: 'meets',
    overlapped_by: 'overlaps',
    started_by: 'starts',
    contains: 'during',
    finished_by: 'finishes',
  };

  for (const rel of relations) {
    await t.test(`inverse('${rel}') = '${inverseMap[rel]}'`, () => {
      const inv = inverse(rel);
      assert.equal(inv, inverseMap[rel]);
      // Also test involution: inverse(inverse(r)) === r
      assert.equal(inverse(inv), rel);
    });
  }
});

test('composeConsistent() — empty constraints', () => {
  const result = composeConsistent([]);
  assert.equal(result.consistent, true);
  assert.equal(result.violation, undefined);
});

test('composeConsistent() — single event abstention', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'A', relation: 'equals' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, true);
});

test('composeConsistent() — consistent chain A < B < C', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'B', relation: 'before' },
    { a: 'B', b: 'C', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, true);
  assert.equal(result.violation, undefined);
});

test('composeConsistent() — 3-cycle contradiction A < B < C < A', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'B', relation: 'before' },
    { a: 'B', b: 'C', relation: 'before' },
    { a: 'C', b: 'A', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, false);
  assert.notEqual(result.violation, undefined);
  assert.equal(result.violation?.cycleStart, 'A');
  assert.equal(result.violation?.path.length, 3);
});

test('composeConsistent() — longer cycle A < B < C < D < A', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'B', relation: 'before' },
    { a: 'B', b: 'C', relation: 'before' },
    { a: 'C', b: 'D', relation: 'before' },
    { a: 'D', b: 'A', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, false);
  assert.notEqual(result.violation, undefined);
});

test('composeConsistent() — multi-constraint DAG (no cycle)', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'B', relation: 'before' },
    { a: 'A', b: 'C', relation: 'before' },
    { a: 'B', b: 'D', relation: 'before' },
    { a: 'C', b: 'D', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, true);
});

test('composeConsistent() — self-loop contradiction', () => {
  const constraints: Constraint[] = [
    { a: 'A', b: 'B', relation: 'before' },
    { a: 'B', b: 'A', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, false);
  assert.notEqual(result.violation, undefined);
});

test('composeConsistent() — mixed relations with cycle', () => {
  const constraints: Constraint[] = [
    { a: 'Scene1', b: 'Scene2', relation: 'before' },
    { a: 'Scene2', b: 'Scene3', relation: 'meets' },
    { a: 'Scene3', b: 'Scene1', relation: 'before' }
  ];
  const result = composeConsistent(constraints);
  assert.equal(result.consistent, false);
  assert.notEqual(result.violation, undefined);
});
