#!/usr/bin/env node
// Deterministic assembler for tests/fixtures/feature-length/assembled-feature.fountain.
//
// WHY THIS EXISTS. Until 2026-09-06 the largest Fountain file anywhere under
// version control was 12 scenes / 10,861 B
// (tests/fixtures/feature-scale-discrimination/intact.fountain). Every browser
// suite, every fixture and the calibration corpus ran on short form, so four
// defects that only appear at feature length shipped unseen — see
// docs/PATH_TO_EXCELLENCE.md's 2026-09-06 product-discovery record and
// docs/brain/Patterns.md ("no fixture at product length"). This script builds
// the missing length-scale stimulus from material the repository already owns
// and may legally redistribute.
//
// WHAT IT PRODUCES. One file: a Fountain title page, a provenance boneyard
// naming every source file and its licence, then the body of all twenty CC0
// live-action screenplays in data/screenplays/, concatenated in lexicographic
// filename order. Roughly 231 scenes / ~19k words / ~120 pages.
//
// WHAT IT IS NOT. The result is a DELIBERATELY INCOHERENT assembly: twenty
// unrelated stories with no throughline, no protagonist and no act structure.
// It is a length-scale stimulus — it exercises the code paths that only engage
// above ~40 scenes (bounded structural deduction, clustering at feature issue
// volume, the editor's incremental decoration, the panel's finding lists) — and
// it is NOT a craft benchmark. Nothing may read a health score, a verdict or a
// discrimination statistic off it and call that a measurement of the engine's
// judgment; see the fixture's own header and
// tests/fixtures/feature-length/README.md.
//
// DETERMINISM. Filename order is byte-lexicographic (Array#sort on the
// readdirSync result), every source body is copied verbatim, and the only
// generated text is the fixed header below — no clock, no randomness, no
// environment. tests/core/feature-length-fixture.test.ts re-runs this
// assembler and asserts the committed file is byte-identical to it, so a
// source screenplay edited without regenerating fails CI rather than silently
// changing what "feature length" means.
//
//   node scripts/build-feature-length-fixture.mjs          # write the fixture
//   node scripts/build-feature-length-fixture.mjs --check  # verify, exit 1 on drift

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIR = 'data/screenplays';
export const OUTPUT_PATH = 'tests/fixtures/feature-length/assembled-feature.fountain';

/** Fixed title page. A real submitted draft has one; the parser types these
 *  lines as action (src/lib/fountain.ts has no title-page handling — see
 *  tests/core/fixture-provenance-comment-guard.test.ts's scope note), which is
 *  exactly what a writer's draft does too, so the fixture reproduces the real
 *  input rather than a sanitized one.
 *
 *  Deliberately carries NO provenance vocabulary: because these lines really
 *  are scored as action, naming the corpus or the licence here would put
 *  repository metadata back into the drama — the exact 2026-09-04 defect
 *  fixture-provenance-comment-guard.test.ts exists to stop (it failed on an
 *  earlier draft of this header, which is how the rule got obeyed rather than
 *  assumed). All provenance lives in the boneyard below instead. */
const TITLE_PAGE = [
  'Title: THE LONG WAY DOWN',
  'Credit: Written by',
  'Author: Assembled Draft',
  'Draft date: 2026-09-06',
].join('\n');

/** Everything below lives inside a Fountain boneyard, so parseFountain types it
 *  `boneyard` and fountain-analyzer.ts skips it. `//` is NOT Fountain comment
 *  syntax and would be scored as action — the 2026-09-04 corpus-integrity
 *  correction, enforced by tests/core/fixture-provenance-comment-guard.test.ts. */
function provenanceBoneyard(sources) {
  const lines = [];
  lines.push('/*');
  lines.push('ASSEMBLED FEATURE-LENGTH FIXTURE — NOT A STORY.');
  lines.push('');
  lines.push('This file is a DELIBERATELY INCOHERENT assembly: the bodies of twenty');
  lines.push('unrelated short screenplays concatenated in lexicographic filename order.');
  lines.push('There is no throughline, no protagonist, no act structure and no intended');
  lines.push('meaning across the seams. It exists for ONE purpose: to exercise this');
  lines.push('repository at the length the product is actually used at, because until');
  lines.push('2026-09-06 the largest committed Fountain file was 12 scenes and four');
  lines.push('feature-length defects shipped unseen as a result.');
  lines.push('');
  lines.push('DO NOT read craft meaning off this file. Its health score, verdict, grade');
  lines.push('and issue counts are properties of a concatenation, not of writing, and');
  lines.push('must never be quoted as a discrimination measurement. The legitimate');
  lines.push('assertions over it are structural and scale-shaped: scene count, finding');
  lines.push('volume, span resolvability, render and analysis behaviour at length.');
  lines.push('');
  lines.push('Generated by scripts/build-feature-length-fixture.mjs (deterministic:');
  lines.push('lexicographic source order, verbatim bodies, fixed header). Regenerate');
  lines.push('with `node scripts/build-feature-length-fixture.mjs`; the committed copy is');
  lines.push('byte-checked by tests/core/feature-length-fixture.test.ts.');
  lines.push('');
  lines.push('LICENCE — every source below is dedicated to the public domain under');
  lines.push('CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/),');
  lines.push('per data/screenplays/LICENSE-live-action.md, which is also the record of');
  lines.push('their provenance: each is an ORIGINAL work written for the STORYMACHINE');
  lines.push('benchmark corpus, none adapted from any produced or copyrighted');
  lines.push('screenplay. Fourteen of the twenty are AGENT-AUTHORED (Claude, 2026-08-04)');
  lines.push('and are mechanism-test material, not professionally-authored writing.');
  lines.push('This assembly inherits that dedication and that caveat in full.');
  lines.push('');
  lines.push('SOURCES, in the order they appear below (file — scenes — words):');
  for (const s of sources) {
    lines.push(`  ${s.rel} — ${s.sceneCount} scenes — ${s.wordCount} words — CC0 1.0`);
  }
  lines.push('');
  lines.push(
    `TOTAL: ${sources.length} sources, ` +
      `${sources.reduce((n, s) => n + s.sceneCount, 0)} scenes, ` +
      `${sources.reduce((n, s) => n + s.wordCount, 0)} words ` +
      '(per-source figures from analyzeFountainText(); the whole-file figures the ' +
      'assembled document reports differ slightly because scene and word counting ' +
      'run over the joined text, not the sum of its parts).',
  );
  lines.push('*/');
  return lines.join('\n');
}

/** Count scene headings the same way scripts/check-doctor-output-identity.mjs
 *  does, so the two length-scale harnesses agree on what a scene is without
 *  either importing the analyzer. */
function sceneCountOf(text) {
  return (text.match(/^(INT\.|EXT\.|INT\/EXT|EXT\/INT|I\/E)/gm) || []).length;
}

function wordCountOf(text) {
  let words = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 32) {
      if (!inWord) { words++; inWord = true; }
    } else inWord = false;
  }
  return words;
}

/** Build the fixture text. Exported so the test can assemble in-memory and
 *  compare against the committed bytes without shelling out. */
export function assembleFeatureFixture(repo = REPO) {
  const dir = path.join(repo, SOURCE_DIR);
  const files = readdirSync(dir).filter((f) => f.endsWith('.fountain')).sort();
  if (files.length === 0) {
    throw new Error(`no .fountain sources under ${SOURCE_DIR} — cannot assemble`);
  }
  const sources = files.map((file) => {
    const text = readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n').trim();
    return {
      rel: `${SOURCE_DIR}/${file}`,
      text,
      sceneCount: sceneCountOf(text),
      wordCount: wordCountOf(text),
    };
  });
  const body = sources.map((s) => s.text).join('\n\n');
  return `${TITLE_PAGE}\n\n${provenanceBoneyard(sources)}\n\n${body}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const out = path.join(REPO, OUTPUT_PATH);
  const assembled = assembleFeatureFixture();
  if (check) {
    let current = '';
    try { current = readFileSync(out, 'utf8'); } catch { /* missing counts as drift */ }
    if (current === assembled) {
      process.stdout.write(`build-feature-length-fixture: ${OUTPUT_PATH} is current (${assembled.length} B, ${sceneCountOf(assembled)} scenes).\n`);
      return 0;
    }
    process.stderr.write(
      `build-feature-length-fixture: ${OUTPUT_PATH} DIFFERS from a fresh assembly ` +
      `(committed ${current.length} B, assembled ${assembled.length} B). ` +
      'Re-run `node scripts/build-feature-length-fixture.mjs`.\n',
    );
    return 1;
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, assembled, 'utf8');
  process.stdout.write(
    `build-feature-length-fixture: wrote ${OUTPUT_PATH} — ${assembled.length} B, ` +
    `${sceneCountOf(assembled)} scenes, ${wordCountOf(assembled)} words.\n`,
  );
  return 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exit(main());
}
