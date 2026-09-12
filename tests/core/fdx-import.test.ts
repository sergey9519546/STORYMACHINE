// Script Doctor — Final Draft (.fdx) import.
// Conventions: node:test + assert/strict, matching tests/core/fountain-analyzer.test.ts.
//
// Coverage: round trip through the existing Fountain→FDX exporter
// (src/lib/fdx.ts), XML entity decoding (named, numeric, hex, and the
// double-encoded-ampersand edge case), multiple <Text> runs per paragraph,
// unknown paragraph types, the no-<Paragraph> error path, and determinism.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { fdxToFountain } from '../../server/lib/fdx-import.ts';
import { parseFountain } from '../../src/lib/fountain.ts';

describe('fdxToFountain — round trip through the Fountain→FDX exporter', () => {
  const SAMPLE_FOUNTAIN = [
    'INT. KITCHEN - DAY',
    '',
    "Sarah stares at the letter, hands trembling.",
    '',
    'SARAH',
    '(whispering)',
    "I can't believe this is real.",
    '',
    'JOHN',
    'We need to go now.',
    '',
    'EXT. HIGHWAY - NIGHT',
    '',
    'The car speeds away into the distance.',
    '',
    'CUT TO:',
    '',
    'INT. GARAGE - NIGHT',
    '',
    'JOHN',
    'That was too close.',
    '',
  ].join('\n');

  it('recovers scene headings, character names, parentheticals, and dialogue lines', () => {
    const fdxXml = fountainToFdx(SAMPLE_FOUNTAIN, 'Round Trip Test');
    const { fountain, warnings } = fdxToFountain(fdxXml);

    assert.deepEqual(warnings, []);

    // Scene headings survive (Scene Heading paragraphs already start with
    // INT./EXT., so they round-trip un-forced).
    assert.match(fountain, /^INT\. KITCHEN - DAY$/m);
    assert.match(fountain, /^EXT\. HIGHWAY - NIGHT$/m);
    assert.match(fountain, /^INT\. GARAGE - NIGHT$/m);

    // Character names survive, uppercased, on their own line.
    assert.match(fountain, /^SARAH$/m);
    assert.match(fountain, /^JOHN$/m);

    // Parenthetical stays wrapped and directly under the character (no
    // blank line between Character/Parenthetical/Dialogue of one speech).
    assert.match(fountain, /^SARAH\n\(whispering\)\nI can't believe this is real\.$/m);

    // Plain dialogue lines survive verbatim.
    assert.match(fountain, /^We need to go now\.$/m);
    assert.match(fountain, /^That was too close\.$/m);

    // An auto-detected transition ("CUT TO:") round-trips without the
    // forced "> " prefix.
    assert.match(fountain, /^CUT TO:$/m);
  });

  it('a Character name that is not a Fountain cue comes back as a cue, not as action', () => {
    // The importer knows the ELEMENT TYPE (Final Draft stores it) where
    // Fountain only infers it from the line's shape. A caseless name, or one
    // carrying punctuation the cue alphabet excludes, is not cue-shaped — so
    // before round 3 it came back as an ACTION line and took its whole speech
    // with it as action prose, silently, on exactly the real files this
    // importer exists to accept. `@` is the spec's answer and formatCharacter
    // asks CHARACTER_CUE_RE rather than restating the grammar.
    const fdxXml = [
      '<?xml version="1.0" encoding="UTF-8"?><FinalDraft><Content>',
      '<Paragraph Type="Scene Heading"><Text>INT. TEA HOUSE - DAY</Text></Paragraph>',
      '<Paragraph Type="Character"><Text>田中</Text></Paragraph>',
      '<Paragraph Type="Dialogue"><Text>I already told you what I saw.</Text></Paragraph>',
      '<Paragraph Type="Character"><Text>MARY</Text></Paragraph>',
      '<Paragraph Type="Dialogue"><Text>You told me what you wanted to have seen.</Text></Paragraph>',
      '</Content></FinalDraft>',
    ].join('');
    const { fountain } = fdxToFountain(fdxXml);

    // The name that IS cue-shaped is untouched — the marker is added only
    // where it is needed, so every existing import is byte-identical.
    assert.match(fountain, /^MARY$/m);
    assert.match(fountain, /^@田中$/m);

    // And the point of the marker: re-parsing the imported Fountain gives a
    // cue with a speech under it, for BOTH names.
    const types = parseFountain(fountain).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(types, ['scene_heading', 'character', 'dialogue', 'character', 'dialogue'],
      'an imported Character paragraph must read back as a character cue whatever its name looks like');
  });

  it('is deterministic: converting the same FDX twice yields identical output', () => {
    const fdxXml = fountainToFdx(SAMPLE_FOUNTAIN, 'Determinism Check');
    const first = fdxToFountain(fdxXml);
    const second = fdxToFountain(fdxXml);
    assert.deepEqual(first, second);
  });
});

describe('fdxToFountain — XML entity decoding', () => {
  it('decodes named entities (&lt; &gt; &quot; &apos;) and numeric entities (decimal and hex)', () => {
    const fdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft><Content>
  <Paragraph Type="Action"><Text>&lt;ran&gt; &quot;fast&quot; &apos;really&apos; &#65;&#x42;</Text></Paragraph>
</Content></FinalDraft>`;
    const { fountain, warnings } = fdxToFountain(fdxXml);
    assert.equal(fountain, '<ran> "fast" \'really\' AB\n');
    assert.deepEqual(warnings, []);
  });

  it('decodes &amp; LAST so a double-encoded sequence cannot re-introduce a live entity', () => {
    // "&amp;amp;" is "&amp;" that was escaped a second time. Decoding &amp;
    // first (wrong order) would fully resolve it down to a bare "&". Decoding
    // &amp; last means it only unwinds one level, landing on the literal,
    // inert text "&amp;" — never live markup.
    const fdxXml = `<FinalDraft><Content>
  <Paragraph Type="Action"><Text>Tom &amp;amp; Jerry</Text></Paragraph>
</Content></FinalDraft>`;
    const { fountain } = fdxToFountain(fdxXml);
    assert.equal(fountain, 'Tom &amp; Jerry\n');
  });
});

describe('fdxToFountain — multiple <Text> runs per paragraph', () => {
  it('concatenates sibling <Text> runs (Final Draft splits styled spans mid-paragraph)', () => {
    const fdxXml = `<FinalDraft><Content>
  <Paragraph Type="Action"><Text>Hello, </Text><Text AdornmentStyle="Bold">World</Text><Text>!</Text></Paragraph>
</Content></FinalDraft>`;
    const { fountain } = fdxToFountain(fdxXml);
    assert.equal(fountain, 'Hello, World!\n');
  });
});

describe('fdxToFountain — unknown paragraph types', () => {
  it('treats an unrecognized paragraph Type as Action and warns once per distinct type', () => {
    const fdxXml = `<FinalDraft><Content>
  <Paragraph Type="Storyboard"><Text>A director's odd annotation.</Text></Paragraph>
  <Paragraph Type="Storyboard"><Text>Another one, same unknown type.</Text></Paragraph>
  <Paragraph Type="SceneNumber"><Text>42</Text></Paragraph>
</Content></FinalDraft>`;
    const { fountain, warnings } = fdxToFountain(fdxXml);

    // Both unknown-typed paragraphs still made it into the Fountain output as
    // plain action text.
    assert.match(fountain, /A director's odd annotation\./);
    assert.match(fountain, /Another one, same unknown type\./);
    assert.match(fountain, /42/);

    // Exactly one warning per DISTINCT unknown type, not per paragraph.
    assert.equal(warnings.length, 2);
    assert.ok(warnings.some(w => w.includes('Storyboard')));
    assert.ok(warnings.some(w => w.includes('SceneNumber')));
  });
});

describe('fdxToFountain — invalid input', () => {
  it('throws a plain Error when there is no <Paragraph> content at all', () => {
    assert.throws(
      () => fdxToFountain('<FinalDraft><Content></Content></FinalDraft>'),
      /no <Paragraph> content/i,
    );
  });

  it('throws a plain Error for input that is not FDX/XML at all', () => {
    assert.throws(
      () => fdxToFountain('This is just some plain text, not a Final Draft file.'),
      /no <Paragraph> content/i,
    );
  });
});
