// FDX and DOCX exports are WELL-FORMED XML, whatever the script contains
// (2026-09-04, security review finding #2).
//
// The defect: src/lib/fdx.ts and src/lib/docx.ts each carried their own copy
// of escapeXml, and both escaped the five entities while passing C0 control
// characters straight through. A raw NUL in dialogue — routine wreckage from
// PDF-to-text extraction, an odd paste source, or a collaborator's file —
// therefore landed literally inside <Text> and <w:t>, producing a .fdx that a
// conforming parser rejects outright and a word/document.xml with the same
// bytes in it. Verified against the live server before the fix; the writer's
// deliverable is the thing that breaks.
//
// HOW THIS IS CHECKED, AND WHY IT IS HAND-ROLLED. This repository declares no
// XML parser: package.json's dependencies and devDependencies contain none
// (`sax`, `xml` and `xml-js` exist in node_modules only as transitive deps of
// the `docx` package, which this code does not use for these writers, and
// depending on a hoisted transitive is how a test starts failing for reasons
// that have nothing to do with the code under test). So assertWellFormedXml
// below is a strict, deliberately small checker rather than a real parser: it
// enforces the XML 1.0 Char production (the exact rule the old code broke),
// tag balance, and that no unescaped `<` or bare `&` survives in character
// data. That is narrower than a full parser, and it is precisely the property
// this fix is about.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml } from '../../src/lib/xml-escape.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { fountainToDocx } from '../../src/lib/docx.ts';

// Built by code point, never typed as literals: a source file carrying raw
// control bytes is exactly the hazard under test, and would be mangled by any
// tool that touches it.
const NUL = String.fromCharCode(0x00);
const VTAB = String.fromCharCode(0x0b);
const BELL = String.fromCharCode(0x07);
const LONE_HIGH_SURROGATE = String.fromCharCode(0xd83d); // the leading half of an emoji
const LONE_LOW_SURROGATE = String.fromCharCode(0xde00);
const EMOJI = String.fromCharCode(0xd83d, 0xde00); // U+1F600, a WELL-FORMED pair
const REPLACEMENT = String.fromCharCode(0xfffd);

/** XML 1.0 §2.2 Char: everything below U+0020 except tab/LF/CR is forbidden,
 *  as are unpaired surrogates and U+FFFE/U+FFFF. */
const ILLEGAL_CHAR = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uFFFE\\uFFFF]'
  + '|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])'
  + '|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]',
);

const ENTITY = /^&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/;

/**
 * A strict, small XML well-formedness check: every character is legal, every
 * element is closed in order, and character data contains no unescaped `<`
 * and no bare `&`. Throws with a located message, like a parser would.
 */
function assertWellFormedXml(xml: string, what: string): void {
  const illegal = ILLEGAL_CHAR.exec(xml);
  if (illegal) {
    const at = illegal.index;
    assert.fail(
      `${what}: XML-illegal character U+${xml.charCodeAt(at).toString(16).toUpperCase().padStart(4, '0')} `
      + `at offset ${at} (…${JSON.stringify(xml.slice(Math.max(0, at - 40), at + 40))}…)`,
    );
  }

  const stack: string[] = [];
  let i = 0;
  while (i < xml.length) {
    const ch = xml[i];
    if (ch === '<') {
      if (xml.startsWith('<?', i)) { // declaration / PI
        const end = xml.indexOf('?>', i);
        assert.notEqual(end, -1, `${what}: unterminated processing instruction`);
        i = end + 2; continue;
      }
      if (xml.startsWith('<!--', i)) {
        const end = xml.indexOf('-->', i);
        assert.notEqual(end, -1, `${what}: unterminated comment`);
        i = end + 3; continue;
      }
      const end = xml.indexOf('>', i);
      assert.notEqual(end, -1, `${what}: unterminated tag at offset ${i}`);
      const tag = xml.slice(i + 1, end);
      if (tag.startsWith('/')) {
        const name = tag.slice(1).trim();
        assert.equal(stack.pop(), name, `${what}: </${name}> does not close the open element`);
      } else if (!tag.endsWith('/')) {
        stack.push(tag.split(/[\s>]/)[0]);
      }
      i = end + 1; continue;
    }
    if (ch === '&') {
      assert.ok(ENTITY.test(xml.slice(i)), `${what}: bare '&' in character data at offset ${i}`);
      i += xml.slice(i).indexOf(';') + 1; continue;
    }
    i += 1;
  }
  assert.deepEqual(stack, [], `${what}: unclosed elements ${stack.join(', ')}`);
}

/** Read one stored (method 0) entry out of a zip built by src/lib/zip.ts. */
function readStoredZipEntry(zip: Uint8Array, name: string): string {
  const bytes = Buffer.from(zip);
  let at = 0;
  while ((at = bytes.indexOf('PK\x03\x04', at, 'latin1')) !== -1) {
    const size = bytes.readUInt32LE(at + 18);
    const nameLen = bytes.readUInt16LE(at + 26);
    const extraLen = bytes.readUInt16LE(at + 28);
    const entryName = bytes.toString('utf8', at + 30, at + 30 + nameLen);
    const dataAt = at + 30 + nameLen + extraLen;
    if (entryName === name) return bytes.toString('utf8', dataAt, dataAt + size);
    at = dataAt + size;
  }
  assert.fail(`zip entry ${name} not found`);
}

/** Control characters in dialogue, action, a character cue and the title —
 *  everything that flows through escapeXml — plus an XML-breakout attempt. */
const HOSTILE_FOUNTAIN = `Title: Bad${NUL} Title</Text><evil>&
Author: J.${VTAB} Doe

INT. ROOM${BELL} - DAY

He types <that> & waits${NUL}, then stops.

BOB${VTAB}

Nothing${NUL} to say ${LONE_HIGH_SURROGATE}here${LONE_LOW_SURROGATE}, but ${EMOJI} survives.
`;

describe('escapeXml — XML 1.0 character legality', () => {
  it('escapes the five entities, exactly as before', () => {
    assert.equal(escapeXml(`a & b < c > d " e ' f`), 'a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });

  it('drops the C0 controls XML forbids, leaving no trace', () => {
    assert.equal(escapeXml(`before${NUL}${VTAB}${BELL}after`), 'beforeafter');
  });

  it('keeps tab, LF and CR — XML permits them and a writer typed them', () => {
    const ws = `a\tb\nc\rd`;
    assert.equal(escapeXml(ws), ws);
  });

  it('replaces a lone surrogate with U+FFFD instead of deleting it', () => {
    // Visible on purpose: a broken surrogate is the wreckage of a character
    // that was meant to be SEEN, so the writer needs to be able to find it.
    assert.equal(escapeXml(`x${LONE_HIGH_SURROGATE}y`), `x${REPLACEMENT}y`);
    assert.equal(escapeXml(`x${LONE_LOW_SURROGATE}y`), `x${REPLACEMENT}y`);
  });

  it('leaves a well-formed surrogate pair (an emoji) intact', () => {
    assert.equal(escapeXml(`hi ${EMOJI}!`), `hi ${EMOJI}!`);
  });

  it('never double-escapes: the stripping pass cannot introduce an entity character', () => {
    assert.equal(escapeXml(`&amp;${NUL}`), '&amp;amp;');
  });
});

describe('FDX export — well-formed for hostile input', () => {
  it('produces XML a strict parser accepts even with NUL, vertical tab and a lone surrogate', () => {
    const fdx = fountainToFdx(HOSTILE_FOUNTAIN, `Bad${NUL} Title`);
    assertWellFormedXml(fdx, 'fdx');
  });

  it('still neutralises the XML breakout attempt (unchanged behaviour)', () => {
    const fdx = fountainToFdx(HOSTILE_FOUNTAIN, 'Title');
    assert.ok(fdx.includes('&lt;that&gt;'), 'angle brackets escaped in action text');
    assert.ok(!fdx.includes('<evil>'), 'the injected element never becomes markup');
  });

  it('keeps the prose readable — only the invisible bytes are gone', () => {
    const fdx = fountainToFdx(HOSTILE_FOUNTAIN, 'Title');
    assert.ok(fdx.includes('Nothing to say'), 'the NUL is removed without eating the surrounding words');
    assert.ok(fdx.includes(EMOJI), 'a valid emoji survives export');
  });
});

describe('DOCX export — well-formed for hostile input', () => {
  it("word/document.xml is well-formed XML for the same hostile script", () => {
    const zip = fountainToDocx(HOSTILE_FOUNTAIN, { title: `Bad${NUL} Title`, author: `J.${VTAB} Doe` });
    const documentXml = readStoredZipEntry(zip, 'word/document.xml');
    assertWellFormedXml(documentXml, 'word/document.xml');
    assert.ok(documentXml.includes('Nothing to say'), 'dialogue survives with the control byte removed');
  });

  it('carries no C0 control byte anywhere in the document part', () => {
    const zip = fountainToDocx(HOSTILE_FOUNTAIN);
    const documentXml = readStoredZipEntry(zip, 'word/document.xml');
    assert.equal(ILLEGAL_CHAR.test(documentXml), false, 'document.xml contains an XML-illegal character');
  });
});
