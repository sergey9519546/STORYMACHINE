// Unit tests for multi-language scene heading parsing in parseFountain and screenplay-normalizer.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFountain } from '../../src/lib/fountain.ts';
import { isHeading } from '../../server/nvm/analyze/screenplay-normalizer.ts';

describe('multi-language scene headings', () => {
  it('parses INTERIOR, EXTERIOR, ESTABLECIENDO, and INT/EXT as scene_heading blocks in parseFountain', () => {
    const text = [
      'INTERIOR. SALON DE ESTAR - NOCHE',
      'Juan entra lentamente.',
      '',
      'EXTERIOR. CALLE - DIA',
      'La lluvia cae con fuerza.',
      '',
      'ESTABLECIENDO. CIUDAD DE MEXICO - DIA',
      'El sol brilla sobre los edificios.',
      '',
      'INT/EXT. AUTO - DIA',
      'Maria conduce rapido.',
    ].join('\n');

    const blocks = parseFountain(text);
    const headings = blocks.filter(b => b.type === 'scene_heading');
    assert.equal(headings.length, 4);
    assert.equal(headings[0].text, 'INTERIOR. SALON DE ESTAR - NOCHE');
    assert.equal(headings[1].text, 'EXTERIOR. CALLE - DIA');
    assert.equal(headings[2].text, 'ESTABLECIENDO. CIUDAD DE MEXICO - DIA');
    assert.equal(headings[3].text, 'INT/EXT. AUTO - DIA');
  });

  it('correctly identifies multi-language headings in isHeading', () => {
    assert.equal(isHeading('INTERIOR. CASA - DIA'), true);
    assert.equal(isHeading('EXTERIOR. JARDIN - NOCHE'), true);
    assert.equal(isHeading('ESTABLECIENDO. PARIS - DIA'), true);
    assert.equal(isHeading('INT/EXT. CAFETERIA - DIA'), true);
    assert.equal(isHeading('INTÉRIEUR. APPARTEMENT - NUIT'), true);
    assert.equal(isHeading('EXTÉRIEUR. RUE - JOUR'), true);
    assert.equal(isHeading('INNEN. ZIMMER - TAG'), true);
    assert.equal(isHeading('AUSSEN. STRASSE - NACHT'), true);
    assert.equal(isHeading('ACTION SCENE WITHOUT HEADING'), false);
  });
});
