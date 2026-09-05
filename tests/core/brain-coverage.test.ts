// brain-coverage.test.ts — the project brain (docs/brain/) cannot go stale
// silently.
//
// WHY THIS EXISTS. docs/brain/ is a maintained knowledge graph over the
// repository's ~40 loose docs — CLAUDE.md now tells a new session or agent
// to start there. A vault like this drifts exactly the way the docs it
// summarizes already drifted before it existed: a new Decision Log entry
// lands with no note, an audit directory is added and nobody links it, a
// session record is appended to PATH_TO_EXCELLENCE.md and the vault still
// shows the old count. This test is the mechanical check that a new
// source-of-truth entry also gets a brain note — it is deliberately a
// SOURCE-DRIVEN check (it parses DECISION_LOG.md, docs/audits/, docs/
// p1-benchmark/, docs/scoring/, PATH_TO_EXCELLENCE.md, and package.json
// directly) rather than a fixed list, so it keeps working as those sources
// grow.
//
// ROOT OVERRIDE FOR DEMONSTRATION. Every check below resolves paths from
// BRAIN_COVERAGE_ROOT if set, else the real repository root. This exists so
// each assertion's "it fails when its input is missing" property can be
// demonstrated against a throwaway scratch copy of the repo (delete one
// note, point BRAIN_COVERAGE_ROOT at the copy, watch the specific assertion
// fail) without touching the real vault. Unset, this test always runs
// against the real repository, as `npm test` expects.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = process.env.BRAIN_COVERAGE_ROOT
  ? path.resolve(process.env.BRAIN_COVERAGE_ROOT)
  : DEFAULT_ROOT;

const VAULT_ROOT = path.join(ROOT, 'docs', 'brain');

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/** Every *.md file under the vault, recursively, excluding dotfiles/dirs. */
function listVaultNotes(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.md') && entry !== 'GRAPH.md') {
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(VAULT_ROOT);
  return out;
}

/** True if some vault note's full text contains `needle` verbatim. */
function someNoteContains(notes: { path: string; text: string }[], needle: string): boolean {
  return notes.some((n) => n.text.includes(needle));
}

/** Collapse all whitespace runs (including hard line-wraps inside prose) to a single space. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Like someNoteContains, but tolerant of markdown hard-wrapping on either side. */
function someNoteContainsLoosely(notes: { path: string; text: string }[], needle: string): boolean {
  const target = collapseWhitespace(needle);
  return notes.some((n) => collapseWhitespace(n.text).includes(target));
}

/**
 * Every path listed in a note's own frontmatter `sources: [a, b, c]` array,
 * repo-relative, trimmed. Returns [] if the note has no frontmatter or no
 * `sources:` line — those cases are already covered by (f)'s frontmatter
 * check, so this helper does not itself assert presence.
 */
function frontmatterSources(text: string): string[] {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const block = text.slice(0, end);
  const m = /^sources:\s*\[([^\]]*)\]\s*$/m.exec(block);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

test('(a) every Decision Log entry has a brain note', () => {
  const log = read('docs/DECISION_LOG.md');
  const decisionNumbers = [...log.matchAll(/^## Decision #(\d+):/gm)].map((m) => m[1]);
  assert.ok(decisionNumbers.length > 0, 'DECISION_LOG.md must contain at least one "## Decision #N:" heading');

  // Scoped to Decisions notes specifically (path under docs/brain/Decisions/),
  // not any note that happens to mention "Decision #N" — e.g. an Owner note
  // that references a decision in passing must not satisfy "has a brain
  // note" for that decision. Same reasoning as (d) below, which scopes to
  // Gates/ for the identical reason (round-1 review finding: deleting
  // Decisions/Decision 6 - License the Repository.md stayed green here
  // because Owner/Owner - License Decision.md also says "Decision #6").
  const decisionNotes = listVaultNotes().filter((n) => n.path.includes(`${path.sep}Decisions${path.sep}`));
  assert.ok(decisionNotes.length > 0, 'docs/brain/Decisions must contain at least one note');

  const missing: string[] = [];
  for (const n of decisionNumbers) {
    if (!someNoteContains(decisionNotes, `Decision #${n}`)) missing.push(n);
  }
  assert.deepEqual(
    missing,
    [],
    `docs/DECISION_LOG.md has decisions with no note in docs/brain/Decisions/ mentioning "Decision #N": ${missing.join(', ')}`,
  );
});

test('(b) every docs/audits directory and every dated p1-benchmark/scoring doc has a brain note', () => {
  const notes = listVaultNotes();

  const auditsDir = path.join(ROOT, 'docs', 'audits');
  const auditDirNames = readdirSync(auditsDir).filter((entry) =>
    statSync(path.join(auditsDir, entry)).isDirectory(),
  );
  assert.ok(auditDirNames.length > 0, 'docs/audits must contain at least one directory');

  const missingAudits: string[] = [];
  for (const dirName of auditDirNames) {
    const needle = `docs/audits/${dirName}`;
    if (!someNoteContains(notes, needle)) missingAudits.push(dirName);
  }
  assert.deepEqual(
    missingAudits,
    [],
    `docs/audits directories with no brain note citing them: ${missingAudits.join(', ')}`,
  );

  const datedMeasurementFiles: string[] = [];
  for (const dir of ['docs/p1-benchmark', 'docs/scoring']) {
    const full = path.join(ROOT, dir);
    for (const entry of readdirSync(full)) {
      if (entry.endsWith('.md') && entry.includes('_20') && statSync(path.join(full, entry)).isFile()) {
        datedMeasurementFiles.push(`${dir}/${entry}`);
      }
    }
  }
  assert.ok(
    datedMeasurementFiles.length > 0,
    'docs/p1-benchmark and docs/scoring must contain at least one dated (*_20*.md) measurement doc',
  );

  const missingMeasurements: string[] = [];
  for (const relPath of datedMeasurementFiles) {
    if (!someNoteContains(notes, relPath)) missingMeasurements.push(relPath);
  }
  assert.deepEqual(
    missingMeasurements,
    [],
    `dated measurement docs with no brain note citing them: ${missingMeasurements.join(', ')}`,
  );
});

test('(c) every session-record heading in PATH_TO_EXCELLENCE.md has a brain note', () => {
  const doc = read('docs/PATH_TO_EXCELLENCE.md');
  const notes = listVaultNotes();

  // Bold openers of the shape **2026-…** at the start of a line — the session
  // record headers this lane's brief calls out by name.
  const headings = [...doc.matchAll(/^\*\*(2026-[^*]+)\*\*/gm)].map((m) => m[1]);
  assert.ok(headings.length > 0, 'PATH_TO_EXCELLENCE.md must contain at least one "**2026-…**" session heading');

  const missing: string[] = [];
  for (const heading of headings) {
    if (!someNoteContainsLoosely(notes, heading)) missing.push(heading);
  }
  assert.deepEqual(
    missing,
    [],
    `PATH_TO_EXCELLENCE.md session headings with no brain note quoting them (whitespace-insensitive): ${JSON.stringify(missing)}`,
  );
});

test('(d) every npm run verify:* script in package.json appears in a Gate note', () => {
  // Originally scoped to only the eight suites verify:browser composes.
  // Widened (round 2) to every `verify:*` key package.json defines — that
  // included verify:corpus-layout and verify:llm-providers, which are real
  // maintainer gates (pre-flight corpus checking; a live-provider smoke
  // test) that are not part of the browser battery and had no Gate note.
  // Both now have one: [[Gate - Corpus Layout Verification]] and
  // [[Gate - LLM Provider Smoke Test]].
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  const suites = Object.keys(pkg.scripts).filter((s) => s.startsWith('verify:'));
  assert.ok(suites.length > 0, 'package.json must define at least one verify:* script');

  // Scoped to Gate notes specifically (path under docs/brain/Gates/), not any
  // note that happens to mention the suite name — a session record naming a
  // suite in passing does not satisfy "appears in a Gate note."
  const gateNotes = listVaultNotes().filter((n) => n.path.includes(`${path.sep}Gates${path.sep}`));
  assert.ok(gateNotes.length > 0, 'docs/brain/Gates must contain at least one note');

  const missing: string[] = [];
  for (const suite of suites) {
    if (!someNoteContains(gateNotes, suite)) missing.push(suite);
  }
  assert.deepEqual(
    missing,
    [],
    `verify:* suites with no Gate note naming them: ${missing.join(', ')}`,
  );
});

test('(e) brain.graph.json and GRAPH.md are fresh (regeneration produces no diff)', async () => {
  // Import lazily so the (f) test below can also import it and so this file
  // does not pay the vault-walk cost for tests that do not need it.
  const graphModule = await import(
    pathToFileURL(path.join(ROOT, 'scripts', 'brain-graph.mjs')).href
  );
  const { buildGraph, renderGraphMd, GRAPH_JSON_PATH, GRAPH_MD_PATH } = graphModule;
  const { nodes, edges, errors } = buildGraph();
  assert.deepEqual(errors, [], `brain-graph found problems, cannot check freshness: ${errors.join('; ')}`);

  const expectedJson = JSON.stringify({ nodes, edges }, null, 2) + '\n';
  const expectedMd = renderGraphMd(nodes, edges);

  assert.ok(existsSync(GRAPH_JSON_PATH), 'docs/brain/brain.graph.json must exist — run `npm run brain`');
  assert.ok(existsSync(GRAPH_MD_PATH), 'docs/brain/GRAPH.md must exist — run `npm run brain`');

  const actualJson = readFileSync(GRAPH_JSON_PATH, 'utf8');
  const actualMd = readFileSync(GRAPH_MD_PATH, 'utf8');

  assert.equal(actualJson, expectedJson, 'docs/brain/brain.graph.json is stale — run `npm run brain` and commit the result');
  assert.equal(actualMd, expectedMd, 'docs/brain/GRAPH.md is stale — run `npm run brain` and commit the result');
});

test('(f) no unresolved wikilinks and every note has YAML frontmatter', async () => {
  const graphModule = await import(
    pathToFileURL(path.join(ROOT, 'scripts', 'brain-graph.mjs')).href
  );
  const { buildGraph } = graphModule;
  const { errors } = buildGraph();
  assert.deepEqual(
    errors,
    [],
    `brain-graph found unresolved wikilinks or notes missing frontmatter:\n${errors.join('\n')}`,
  );
});

test('(g) every note\'s frontmatter sources: path resolves against the repo', () => {
  // The vault's central promise is "this note links to and summarizes real
  // source files." (a)-(f) check the notes themselves are complete and
  // internally consistent; this is the one check that the citations they
  // point OUT of the vault are real, so a renamed or deleted source file
  // cannot silently sit uncaught in a note's own frontmatter forever.
  const notes = listVaultNotes();
  const missing: string[] = [];
  for (const note of notes) {
    for (const source of frontmatterSources(note.text)) {
      if (!existsSync(path.join(ROOT, source))) {
        missing.push(`${path.relative(ROOT, note.path)} -> ${source}`);
      }
    }
  }
  assert.deepEqual(
    missing,
    [],
    `notes whose frontmatter sources: path does not resolve against the repo:\n${missing.join('\n')}`,
  );
});
