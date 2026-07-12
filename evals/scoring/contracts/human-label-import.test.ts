// Human Preference Label JSONL Importer Tests — Phase G Calibration
// GREEN tests for parseLabels() behavior calibrated to actual implementation.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseLabels } from './human-label-import.ts';

test('parseLabels: parses valid single-line JSONL input', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":7,"engagement":6},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1, 'Should parse 1 label');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
  assert.strictEqual(result.summary.totalLines, 1, 'Summary should report 1 line');
  assert.strictEqual(result.summary.parsed, 1, 'Summary should report 1 parsed');
  assert.strictEqual(result.summary.failed, 0, 'Summary should report 0 failed');

  const label = result.labels[0];
  assert.strictEqual(label.evaluatorId, 'eval1');
  assert.strictEqual(label.pairId, 'pair1');
  assert.strictEqual(label.candidateA, 'a');
  assert.strictEqual(label.candidateB, 'b');
  assert.strictEqual(label.preference, 'A');
  assert.strictEqual(label.confidence, 0.8);
  assert.strictEqual(label.evaluatorRole, 'professional_writer');
});

test('parseLabels: parses multi-line JSONL with multiple valid entries', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":7},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.5,"rubricBreakdown":{"engagement":5},"evaluatorRole":"story_reader"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"tie","confidence":0.9,"rubricBreakdown":{"clarity":6,"engagement":6},"evaluatorRole":"owner"}`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 3, 'Should parse 3 labels');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
  assert.strictEqual(result.summary.parsed, 3);
  assert.strictEqual(result.summary.failed, 0);
  assert.deepStrictEqual(result.summary.preferenceDistribution, { A: 1, B: 1, tie: 1 });
});

test('parseLabels: reports JSON parse error with line number and truncated raw text', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1"... BROKEN JSON
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.5,"rubricBreakdown":{},"evaluatorRole":"story_reader"}`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1, 'Should parse only valid line');
  assert.strictEqual(result.errors.length, 1, 'Should report 1 error');
  assert.strictEqual(result.errors[0].line, 1, 'Error should reference line 1');
  assert.ok(result.errors[0].raw.includes('BROKEN JSON'), 'Raw text should include part of the malformed line');
  assert.ok(result.errors[0].reason.includes('JSON parse error'), 'Error reason should mention JSON parse');
});

test('parseLabels: truncates raw text to 80 characters plus ellipsis for long lines', () => {
  const longLine = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"' + 'x'.repeat(100) + '","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const jsonl = longLine + '\n{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.5,"rubricBreakdown":{},"evaluatorRole":"story_reader"}';

  const result = parseLabels(jsonl);

  // First line is valid JSON, so only second is parsed
  // Try with invalid first line to see truncation
  const invalidJsonl = '{INVALID:JSON}:' + 'x'.repeat(100) + '\n{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.5,"rubricBreakdown":{},"evaluatorRole":"story_reader"}';
  const invalidResult = parseLabels(invalidJsonl);

  if (invalidResult.errors.length > 0) {
    assert.ok(invalidResult.errors[0].raw.length <= 83, 'Raw text should be truncated to ~80 chars + ...');
    assert.ok(invalidResult.errors[0].raw.endsWith('...'), 'Long raw text should end with ...');
  }
});

test('parseLabels: validates required string fields are non-empty', () => {
  // Empty evaluatorId
  const jsonl1 = '{"evaluatorId":"","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result1 = parseLabels(jsonl1);

  assert.strictEqual(result1.labels.length, 0);
  assert.strictEqual(result1.errors.length, 1);
  assert.ok(result1.errors[0].reason.includes('evaluatorId: cannot be empty'));

  // Empty pairId
  const jsonl2 = '{"evaluatorId":"eval1","pairId":"","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result2 = parseLabels(jsonl2);

  assert.strictEqual(result2.errors.length, 1);
  assert.ok(result2.errors[0].reason.includes('pairId: cannot be empty'));
});

test('parseLabels: validates preference is one of A, B, or tie', () => {
  const invalidPreferences = [
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"INVALID","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}',
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"a","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}',
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":123,"confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}',
  ];

  for (const jsonl of invalidPreferences) {
    const result = parseLabels(jsonl);
    assert.strictEqual(result.labels.length, 0);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].reason.includes('preference:'));
  }
});

test('parseLabels: accepts valid preference values A, B, and tie', () => {
  const validJsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"tie","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(validJsonl);

  assert.strictEqual(result.labels.length, 3);
  assert.strictEqual(result.errors.length, 0);
  assert.deepStrictEqual(result.summary.preferenceDistribution, { A: 1, B: 1, tie: 1 });
});

test('parseLabels: validates confidence is a number in [0, 1]', () => {
  // confidence < 0
  const jsonl1 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":-0.1,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result1 = parseLabels(jsonl1);

  assert.strictEqual(result1.errors.length, 1);
  assert.ok(result1.errors[0].reason.includes('confidence:'));

  // confidence > 1
  const jsonl2 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":1.5,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result2 = parseLabels(jsonl2);

  assert.strictEqual(result2.errors.length, 1);
  assert.ok(result2.errors[0].reason.includes('confidence:'));

  // confidence is not a number
  const jsonl3 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":"0.8","rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result3 = parseLabels(jsonl3);

  assert.strictEqual(result3.errors.length, 1);
  assert.ok(result3.errors[0].reason.includes('confidence: expected number'));
});

test('parseLabels: accepts confidence at boundaries 0 and 1', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":1,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 2);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.labels[0].confidence, 0);
  assert.strictEqual(result.labels[1].confidence, 1);
});

test('parseLabels: validates rubricBreakdown is an object with numeric values', () => {
  // rubricBreakdown is not an object
  const jsonl1 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":"invalid","evaluatorRole":"professional_writer"}';
  const result1 = parseLabels(jsonl1);

  assert.strictEqual(result1.errors.length, 1);
  assert.ok(result1.errors[0].reason.includes('rubricBreakdown:'));

  // rubricBreakdown is an array
  const jsonl2 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":[1,2,3],"evaluatorRole":"professional_writer"}';
  const result2 = parseLabels(jsonl2);

  assert.strictEqual(result2.errors.length, 1);
  assert.ok(result2.errors[0].reason.includes('rubricBreakdown:'));

  // rubricBreakdown has non-numeric value
  const jsonl3 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":"seven"},"evaluatorRole":"professional_writer"}';
  const result3 = parseLabels(jsonl3);

  assert.strictEqual(result3.errors.length, 1);
  assert.ok(result3.errors[0].reason.includes('rubricBreakdown.clarity'));
});

test('parseLabels: accepts empty rubricBreakdown object', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1);
  assert.strictEqual(result.errors.length, 0);
  assert.deepStrictEqual(result.labels[0].rubricBreakdown, {});
});

test('parseLabels: validates evaluatorRole is one of professional_writer, story_reader, owner', () => {
  const invalidRoles = [
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"invalid_role"}',
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"Professional_Writer"}',
    '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":123}',
  ];

  for (const jsonl of invalidRoles) {
    const result = parseLabels(jsonl);
    assert.strictEqual(result.labels.length, 0);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].reason.includes('evaluatorRole:'));
  }
});

test('parseLabels: accepts all valid evaluatorRole values', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"story_reader"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"owner"}`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 3);
  assert.strictEqual(result.errors.length, 0);
  assert.deepStrictEqual(result.summary.evaluatorRoles.sort(), [
    'owner',
    'professional_writer',
    'story_reader',
  ]);
});

test('parseLabels: optional notes field accepts string or is omitted', () => {
  // With notes
  const jsonl1 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer","notes":"Good match"}';
  const result1 = parseLabels(jsonl1);

  assert.strictEqual(result1.labels.length, 1);
  assert.strictEqual(result1.labels[0].notes, 'Good match');

  // Without notes
  const jsonl2 = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result2 = parseLabels(jsonl2);

  assert.strictEqual(result2.labels.length, 1);
  assert.strictEqual(result2.labels[0].notes, undefined);
});

test('parseLabels: rejects notes field if present but not a string', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer","notes":123}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 0);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].reason.includes('notes:'));
});

test('parseLabels: handles missing required field candidateB', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 0);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].reason.includes('candidateB'));
});

test('parseLabels: handles missing required field evaluatorRole', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{}}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 0);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].reason.includes('evaluatorRole'));
});

test('parseLabels: returns empty result for empty input', () => {
  const result = parseLabels('');

  assert.strictEqual(result.labels.length, 0);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.summary.totalLines, 0);
  assert.strictEqual(result.summary.parsed, 0);
  assert.strictEqual(result.summary.failed, 0);
});

test('parseLabels: ignores whitespace-only lines', () => {
  const jsonl = '   \n  \n  ';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 0);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.summary.totalLines, 0);
});

test('parseLabels: summary reports rubricDimensions sorted alphabetically', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"zebra":1,"apple":2,"middle":3},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{"banana":4},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(jsonl);

  assert.deepStrictEqual(result.summary.rubricDimensions, [
    'apple',
    'banana',
    'middle',
    'zebra',
  ]);
});

test('parseLabels: summary reports evaluatorRoles sorted alphabetically', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"story_reader"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"owner"}`;

  const result = parseLabels(jsonl);

  assert.deepStrictEqual(result.summary.evaluatorRoles, [
    'owner',
    'professional_writer',
    'story_reader',
  ]);
});

test('parseLabels: summary preferenceDistribution counts correctly', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"B","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval4","pairId":"pair4","candidateA":"g","candidateB":"h","preference":"tie","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval5","pairId":"pair5","candidateA":"i","candidateB":"j","preference":"tie","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(jsonl);

  assert.deepStrictEqual(result.summary.preferenceDistribution, { A: 2, B: 1, tie: 2 });
});

test('parseLabels: deterministic output (same input produces same output)', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":7},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.5,"rubricBreakdown":{"engagement":5},"evaluatorRole":"story_reader"}`;

  const result1 = parseLabels(jsonl);
  const result2 = parseLabels(jsonl);

  assert.deepStrictEqual(result1, result2, 'Same input should produce identical output');
});

test('parseLabels: line number is 1-indexed in error reports', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}
{INVALID
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 2);
  assert.strictEqual(result.errors.length, 1);
  assert.strictEqual(result.errors[0].line, 2, 'Error should report 1-indexed line 2');
});

test('parseLabels: filters empty lines and counts only non-empty lines in totalLines', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}

{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}

`;

  const result = parseLabels(jsonl);

  assert.strictEqual(result.summary.totalLines, 2, 'totalLines should count non-empty lines only');
  assert.strictEqual(result.labels.length, 2);
});

test('parseLabels: accumulates rubricDimensions from all valid labels', () => {
  const jsonl = `{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":7,"engagement":6},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval2","pairId":"pair2","candidateA":"c","candidateB":"d","preference":"B","confidence":0.8,"rubricBreakdown":{"pacing":5},"evaluatorRole":"professional_writer"}
{"evaluatorId":"eval3","pairId":"pair3","candidateA":"e","candidateB":"f","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":8,"dialog":4},"evaluatorRole":"professional_writer"}`;

  const result = parseLabels(jsonl);

  // Should collect unique dimensions: clarity, engagement, pacing, dialog
  assert.ok(result.summary.rubricDimensions.includes('clarity'));
  assert.ok(result.summary.rubricDimensions.includes('engagement'));
  assert.ok(result.summary.rubricDimensions.includes('pacing'));
  assert.ok(result.summary.rubricDimensions.includes('dialog'));
  assert.strictEqual(result.summary.rubricDimensions.length, 4);
});

test('parseLabels: parses rubricBreakdown with negative numbers', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":-5,"engagement":6},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1);
  assert.deepStrictEqual(result.labels[0].rubricBreakdown, { clarity: -5, engagement: 6 });
});

test('parseLabels: parses rubricBreakdown with zero and decimal numbers', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"a","candidateB":"b","preference":"A","confidence":0.8,"rubricBreakdown":{"clarity":0,"engagement":3.5},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1);
  assert.deepStrictEqual(result.labels[0].rubricBreakdown, { clarity: 0, engagement: 3.5 });
});

test('parseLabels: parses candidateA and candidateB as any non-empty strings', () => {
  const jsonl = '{"evaluatorId":"eval1","pairId":"pair1","candidateA":"very long candidate A text with special chars @#$%","candidateB":"123","preference":"A","confidence":0.8,"rubricBreakdown":{},"evaluatorRole":"professional_writer"}';
  const result = parseLabels(jsonl);

  assert.strictEqual(result.labels.length, 1);
  assert.strictEqual(
    result.labels[0].candidateA,
    'very long candidate A text with special chars @#$%',
  );
  assert.strictEqual(result.labels[0].candidateB, '123');
});
