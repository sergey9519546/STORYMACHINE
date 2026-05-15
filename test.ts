import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonParse } from './src/lib/json.ts';

describe('safeJsonParse', () => {
  it('returns parsed value for valid JSON object', () => {
    assert.deepEqual(safeJsonParse('{"a":1,"b":"hello"}', {}), { a: 1, b: 'hello' });
  });

  it('returns parsed value for valid JSON array', () => {
    assert.deepEqual(safeJsonParse('[1,2,3]', []), [1, 2, 3]);
  });

  it('returns fallback for invalid JSON', () => {
    assert.equal(safeJsonParse('not valid json {{', 42), 42);
  });

  it('returns fallback for null input', () => {
    assert.equal(safeJsonParse(null, 'default'), 'default');
  });

  it('returns fallback for empty string', () => {
    assert.equal(safeJsonParse('', 99), 99);
  });

  it('preserves fallback type for array fallback', () => {
    const result = safeJsonParse<string[]>('invalid', []);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it('preserves fallback type for null fallback', () => {
    const result = safeJsonParse<Record<string, number> | null>('{bad}', null);
    assert.equal(result, null);
  });

  it('handles nested objects', () => {
    const input = '{"outer":{"inner":true}}';
    const result = safeJsonParse<{ outer: { inner: boolean } }>(input, { outer: { inner: false } });
    assert.equal(result.outer.inner, true);
  });
});

describe('Fountain script block parsing (regex patterns)', () => {
  const isSceneHeading = (line: string) => /^(INT\.|EXT\.|INT\/EXT\.)/i.test(line);
  const isCharacter    = (line: string) => /^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/.test(line) && line.trim().length > 0;
  const isTransition   = (line: string) => /^(CUT TO:|FADE OUT\.|FADE IN:)/i.test(line);
  const isParenthetical= (line: string) => /^\(.*\)$/.test(line);

  it('detects INT. scene heading', () => {
    assert.ok(isSceneHeading('INT. THE STUDY - NIGHT'));
  });

  it('detects EXT. scene heading', () => {
    assert.ok(isSceneHeading('EXT. CITY ROOFTOP - DAY'));
  });

  it('detects INT/EXT. scene heading', () => {
    assert.ok(isSceneHeading('INT/EXT. MOVING CAR - CONTINUOUS'));
  });

  it('does not mis-classify action as scene heading', () => {
    assert.ok(!isSceneHeading('He walks into the room.'));
  });

  it('detects ALL CAPS character name', () => {
    assert.ok(isCharacter('DETECTIVE VANCE'));
  });

  it('detects V.O. character name', () => {
    assert.ok(isCharacter('ELEANOR (V.O.)'));
  });

  it('does not classify mixed-case as character', () => {
    assert.ok(!isCharacter('He turns slowly.'));
  });

  it('detects CUT TO: transition', () => {
    assert.ok(isTransition('CUT TO:'));
  });

  it('detects FADE OUT. transition', () => {
    assert.ok(isTransition('FADE OUT.'));
  });

  it('detects parenthetical', () => {
    assert.ok(isParenthetical('(quietly)'));
    assert.ok(isParenthetical('(beat)'));
  });

  it('does not classify non-parenthetical as parenthetical', () => {
    assert.ok(!isParenthetical('She smiles.'));
  });
});
