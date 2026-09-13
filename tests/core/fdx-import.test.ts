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
import { parseFountain, renderableText } from '../../src/lib/fountain.ts';

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

  it('a Transition that Fountain would not infer comes back as a transition, not as action', () => {
    // formatTransition has forced a custom transition with "> " since it was
    // written, so it would "survive the round trip instead of silently
    // becoming a plain action line" (server/lib/fdx-import.ts). Until
    // 2026-09-13 src/lib/fountain.ts had no forced-transition branch, so the
    // marker made the line WORSE than the plain action it was meant to
    // prevent: `> SMASH TO BLACK:` came back as an ACTION line carrying a
    // literal ">" and printed that way from all four exporters. The escape
    // worked only for the names the inferred heuristic would have caught
    // anyway — i.e. the ones that did not need it.
    const fdxXml = [
      '<?xml version="1.0" encoding="UTF-8"?><FinalDraft><Content>',
      '<Paragraph Type="Scene Heading"><Text>INT. OFFICE - DAY</Text></Paragraph>',
      '<Paragraph Type="Action"><Text>Mary closes the file.</Text></Paragraph>',
      '<Paragraph Type="Transition"><Text>CUT TO:</Text></Paragraph>',
      '<Paragraph Type="Scene Heading"><Text>EXT. STREET - NIGHT</Text></Paragraph>',
      '<Paragraph Type="Action"><Text>Rain falls.</Text></Paragraph>',
      '<Paragraph Type="Transition"><Text>SMASH TO BLACK</Text></Paragraph>',
      '</Content></FinalDraft>',
    ].join('');
    const { fountain } = fdxToFountain(fdxXml);

    // The transition Fountain CAN infer is untouched — the marker is added
    // only where it is needed, so every existing import is byte-identical.
    assert.match(fountain, /^CUT TO:$/m);
    assert.match(fountain, /^> SMASH TO BLACK:$/m);

    // And the point of the marker: re-parsing the imported Fountain gives a
    // transition for BOTH, where the custom one used to come back as action.
    const types = parseFountain(fountain).filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(types, ['scene_heading', 'action', 'transition', 'scene_heading', 'action', 'transition'],
      'an imported Transition paragraph must read back as a transition whatever its wording');

    // The full circle: re-exporting carries the Final Draft type back, with no
    // marker anywhere in the XML.
    const reexported = fountainToFdx(fountain);
    assert.ok(/<Paragraph Type="Transition">\s*<Text>SMASH TO BLACK:<\/Text>/.test(reexported),
      'the custom transition must leave as a Final Draft Transition paragraph on the way back out');
    assert.equal(reexported.includes('&gt;'), false, 're-export must not carry the forced-transition marker');
  });

  it('a script with a forced transition and a forced cue survives Fountain -> FDX -> Fountain', () => {
    // The losslessness the exporters claim is at the ELEMENT level, not the
    // byte level, and the two markers show the difference. `>CUT TO:` comes
    // back WITHOUT its marker, because the bare line is an inferred transition
    // and the importer only forces what it must. `@田中` comes back WITH it,
    // because the bare name is not cue-shaped and dropping the marker would
    // lose the element — which is the round trip working, not failing.
    const SOURCE = [
      'INT. TEA HOUSE - DAY', '', 'A kettle ticks as it cools.', '',
      '>CUT TO:', '', 'EXT. STREET - NIGHT', '', 'Rain.', '',
      '@田中', 'I already told you what I saw.', '',
      'MARY', 'You told me what you wanted to have seen.', '',
      '>MATCH DISSOLVE:', '',
    ].join('\n');
    const elements = (t: string) => parseFountain(t).filter((b) => b.type !== 'empty')
      .map((b) => `${b.type}:${renderableText(b)}`);

    const before = elements(SOURCE);
    const { fountain: after, warnings } = fdxToFountain(fountainToFdx(SOURCE, 'Round Trip'));
    assert.deepEqual(warnings, []);

    assert.deepEqual(elements(after), before,
      'every element type AND its printed text must survive the round trip — before 2026-09-13 the two `>` '
      + 'lines left as transitions and came back as action');

    // Neither marker may reappear where the element does not need it, and no
    // marker may ever print.
    assert.match(after, /^CUT TO:$/m, 'an inferred transition must come back unforced');
    assert.match(after, /^> MATCH DISSOLVE:$/m, 'a custom transition must come back forced, or it is lost');
    assert.match(after, /^@田中$/m, 'a caseless cue must come back forced, or its speech becomes action prose');
    assert.deepEqual(before.filter((e) => e.includes('>') || e.includes('@')), [],
      'no renderable text may carry a marker on either side of the trip');
  });

  it('KNOWN LOSS: centered text does NOT survive Fountain -> FDX -> Fountain', () => {
    // ROUND 2, review finding 1b. The brief asked for "centered stays
    // centered" as a round-trip fixture; it does not, and the round-1 report
    // did not say so. It is pinned here rather than silently absent.
    //
    // THE MECHANISM, so it is not rediscovered as news: `src/lib/fdx.ts` maps
    // `centered -> 'Action'` (FDX_TYPE), because Final Draft has no Centered
    // PARAGRAPH TYPE — it expresses centering as an alignment property on an
    // Action paragraph (`<Paragraph Type="Action" Alignment="Center">`). So the
    // element leaves as Action with the markers already stripped by
    // `renderableText`, and nothing on the way back can know it was centered.
    //
    // NOT FIXED HERE, deliberately. The fix is to emit and read that alignment
    // attribute, which changes `buildParagraphs`, the exporter's entry shape and
    // the importer's paragraph reader — an exports change, on a surface this
    // scoring lane has no measurement for. Named in the lane report's §9.
    const SOURCE = 'INT. OFFICE - DAY\n\nMary closes the file.\n\n>THE END<\n';
    const elements = (t: string) => parseFountain(t).filter((b) => b.type !== 'empty')
      .map((b) => `${b.type}:${renderableText(b)}`);

    assert.deepEqual(elements(SOURCE), ['scene_heading:INT. OFFICE - DAY', 'action:Mary closes the file.', 'centered:THE END'],
      'the page centers it — that is the half that works, and the half the round-1 tests asserted');

    const { fountain: after } = fdxToFountain(fountainToFdx(SOURCE, 'Centered'));
    assert.deepEqual(elements(after), ['scene_heading:INT. OFFICE - DAY', 'action:Mary closes the file.', 'action:THE END'],
      'the centering is lost and the line comes back as ACTION. If this ever reads `centered:THE END`, the '
      + 'loss has been fixed — delete this test and add the round trip to the one above it. Do not relax it.',
    );
    // The words survive and no marker is invented, which is the weaker property
    // that DOES hold and is worth keeping asserted.
    assert.match(after, /^THE END$/m, 'the text must survive even though the element does not');
    assert.equal(after.includes('>'), false, 'and no marker may reappear');
  });

  it('KNOWN, and not a marker defect: the importer appends ":" to a transition that lacks one', () => {
    // formatTransition (server/lib/fdx-import.ts) reads the spec's "ending in
    // TO:" as a requirement to ENFORCE, so a Final Draft transition that does
    // not end in a colon gains one — including `FADE OUT.`, which is one of
    // Fountain's four canonical transitions and ends in a period by
    // definition. That is a text mutation in the IMPORTER, present long before
    // the forced-transition work and unrelated to it; what the 2026-09-13
    // change does is stop the mutated line ALSO losing its element type. It is
    // pinned here rather than left for the next reader to rediscover as news,
    // and deliberately not fixed: changing it changes the imported text of
    // every .fdx this repository accepts, which is an exports question with no
    // measurement in this lane.
    const fdxXml = [
      '<?xml version="1.0" encoding="UTF-8"?><FinalDraft><Content>',
      '<Paragraph Type="Scene Heading"><Text>INT. OFFICE - DAY</Text></Paragraph>',
      '<Paragraph Type="Action"><Text>Mary closes the file.</Text></Paragraph>',
      '<Paragraph Type="Transition"><Text>FADE OUT.</Text></Paragraph>',
      '</Content></FinalDraft>',
    ].join('');
    const { fountain } = fdxToFountain(fdxXml);
    assert.match(fountain, /^> FADE OUT\.:$/m, 'the appended colon is the behaviour being pinned');
    // The element survives, which is the half this lane is responsible for.
    assert.deepEqual(
      parseFountain(fountain).filter((b) => b.type !== 'empty').map((b) => b.type),
      ['scene_heading', 'action', 'transition'],
      'before 2026-09-13 this last element was `action` and printed "> FADE OUT.:" verbatim',
    );
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
