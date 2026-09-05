#!/usr/bin/env node
// brain-graph.mjs — builds the project-brain knowledge graph from docs/brain/.
//
// WHY THIS EXISTS. The project brain (docs/brain/) is an Obsidian-compatible
// vault: one note per decision/gate/surface/session/audit/measurement/owner
// item/branch, linked by [[wikilink]]. A vault of prose notes drifts the same
// way any other doc set drifts — a note gets renamed and its inbound links
// silently point at nothing, or a new decision lands with no note at all. This
// script is the mechanical check: it walks every note, resolves every
// wikilink by the same rule Obsidian itself uses for an unambiguous vault
// (basename match, case-sensitive, extension-optional, ignoring the folder),
// and FAILS THE BUILD (exit 1) on any note missing YAML frontmatter or any
// wikilink that does not resolve to exactly one note. It also writes the
// graph two ways so both a machine and a human can consume it:
//
//   docs/brain/brain.graph.json — {nodes:[{id,type,title,path}], edges:[{from,to}]}
//   docs/brain/GRAPH.md          — a Mermaid graph LR of the type-level
//                                   structure, plus the top-20 most-linked
//                                   notes by total degree (in + out).
//
// USAGE:
//   node scripts/brain-graph.mjs           # regenerate (npm run brain)
//   node scripts/brain-graph.mjs --check   # verify only, write nothing
//                                             (npm run check-brain uses this,
//                                             plus a diff against the
//                                             committed files — see that
//                                             script's own header)
//
// Both modes fail loudly (exit 1, message to stderr) on:
//   - a note (any *.md under docs/brain/, excluding brain.graph.json/GRAPH.md
//     themselves and anything under .obsidian/) with no YAML frontmatter
//     (the file must start with a `---` line);
//   - a [[wikilink]] that resolves to zero or more-than-one note.
//
// Link resolution deliberately mirrors Obsidian's own default behavior for a
// vault with no path ambiguity: a wikilink target is matched against every
// note's basename (filename without its .md extension), regardless of which
// subfolder the note lives in. `[[Title|display text]]` and inline-code
// spans / fenced code blocks (which Obsidian does not treat as links) are
// both handled — a wikilink-shaped string inside backticks is prose, not a
// link, and is skipped.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VAULT_ROOT = path.join(REPO_ROOT, 'docs', 'brain');
export const GRAPH_JSON_PATH = path.join(VAULT_ROOT, 'brain.graph.json');
export const GRAPH_MD_PATH = path.join(VAULT_ROOT, 'GRAPH.md');

const CHECK_ONLY = process.argv.includes('--check');

/** Recursively list every *.md file under `dir`, skipping dotfiles/dirs (e.g. .obsidian). */
function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function frontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(4, end);
  /** @type {Record<string,string>} */
  const fields = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

/** Strip fenced code blocks and inline code spans — Obsidian does not link inside either. */
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

/** Every [[Target]] or [[Target|Display]] reference in `text`, target text only. */
function wikilinkTargets(text) {
  const targets = [];
  const re = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(text))) targets.push(m[1].trim());
  return targets;
}

export function buildGraph() {
  if (!existsSync(VAULT_ROOT)) {
    throw new Error(`vault root not found: ${VAULT_ROOT}`);
  }
  const files = listMarkdownFiles(VAULT_ROOT).filter((f) => path.basename(f) !== 'GRAPH.md');

  /** @type {{id:string,type:string,title:string,path:string}[]} */
  const nodes = [];
  /** basename (no extension) -> node id, for link resolution */
  const byBasename = new Map();
  const errors = [];

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const text = readFileSync(file, 'utf8');
    const fm = frontmatter(text);
    if (!fm) {
      errors.push(`missing YAML frontmatter: ${rel}`);
      continue;
    }
    const base = path.basename(file, '.md');
    const id = rel;
    const titleMatch = /^#\s+(.+)$/m.exec(text);
    const title = titleMatch ? titleMatch[1].trim() : base;
    nodes.push({ id, type: fm.type || 'unknown', title, path: rel });
    if (byBasename.has(base)) {
      errors.push(`duplicate note basename "${base}": ${byBasename.get(base)} and ${rel}`);
    } else {
      byBasename.set(base, id);
    }
  }

  /** @type {{from:string,to:string}[]} */
  const edges = [];
  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const text = readFileSync(file, 'utf8');
    const stripped = stripCode(text);
    for (const target of wikilinkTargets(stripped)) {
      const targetId = byBasename.get(target);
      if (!targetId) {
        errors.push(`unresolved wikilink [[${target}]] in ${rel}`);
        continue;
      }
      edges.push({ from: rel, to: targetId });
    }
  }

  return { nodes, edges, errors };
}

export function renderGraphMd(nodes, edges) {
  const byType = new Map();
  for (const n of nodes) {
    if (!byType.has(n.type)) byType.set(n.type, []);
    byType.get(n.type).push(n);
  }

  // Type-level edge counts (how many links go from notes of type A to type B).
  const idToType = new Map(nodes.map((n) => [n.id, n.type]));
  const typeEdgeCounts = new Map();
  for (const e of edges) {
    const a = idToType.get(e.from);
    const b = idToType.get(e.to);
    if (!a || !b) continue;
    const key = `${a}|${b}`;
    typeEdgeCounts.set(key, (typeEdgeCounts.get(key) || 0) + 1);
  }

  const mermaidLines = ['```mermaid', 'graph LR'];
  for (const type of byType.keys()) {
    mermaidLines.push(`  ${sanitizeId(type)}["${type} (${byType.get(type).length})"]`);
  }
  for (const [key, count] of typeEdgeCounts) {
    const [a, b] = key.split('|');
    if (a === b) continue; // skip self-loops at the type level for legibility
    mermaidLines.push(`  ${sanitizeId(a)} -->|${count}| ${sanitizeId(b)}`);
  }
  mermaidLines.push('```');

  // Degree (in + out) per node, top 20.
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) || 0) + 1);
    degree.set(e.to, (degree.get(e.to) || 0) + 1);
  }
  const top20 = [...nodes]
    .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
    .slice(0, 20);

  const tableLines = [
    '| Rank | Note | Type | Degree (in+out) |',
    '|---:|---|---|---:|',
    ...top20.map(
      (n, i) => `| ${i + 1} | [[${path.basename(n.path, '.md')}]] | ${n.type} | ${degree.get(n.id) || 0} |`,
    ),
  ];

  return [
    '# Project Brain — Graph',
    '',
    '_Generated by `npm run brain` (scripts/brain-graph.mjs). Do not edit by hand — a manual edit is overwritten on the next regeneration._',
    '',
    `${nodes.length} notes, ${edges.length} resolved links.`,
    '',
    '## Type-level structure',
    '',
    ...mermaidLines,
    '',
    '## Top 20 most-linked notes',
    '',
    ...tableLines,
    '',
  ].join('\n');
}

function sanitizeId(type) {
  return type.replace(/[^a-zA-Z0-9]/g, '_');
}

function main() {
  const { nodes, edges, errors } = buildGraph();

  if (errors.length > 0) {
    console.error(`brain-graph: ${errors.length} problem(s) found:\n`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('\nFix the note(s) above — every note needs YAML frontmatter, and every [[wikilink]] must resolve to exactly one note.');
    process.exit(1);
  }

  const graphJson = JSON.stringify({ nodes, edges }, null, 2) + '\n';
  const graphMd = renderGraphMd(nodes, edges);

  if (CHECK_ONLY) {
    const existingJson = existsSync(GRAPH_JSON_PATH) ? readFileSync(GRAPH_JSON_PATH, 'utf8') : null;
    const existingMd = existsSync(GRAPH_MD_PATH) ? readFileSync(GRAPH_MD_PATH, 'utf8') : null;
    const stale = existingJson !== graphJson || existingMd !== graphMd;
    if (stale) {
      console.error(
        'brain-graph --check: docs/brain/brain.graph.json or docs/brain/GRAPH.md is stale. Run `npm run brain` and commit the result.',
      );
      process.exit(1);
    }
    console.log(`brain-graph --check: OK. ${nodes.length} notes, ${edges.length} links, graph is fresh.`);
    return;
  }

  writeFileSync(GRAPH_JSON_PATH, graphJson);
  writeFileSync(GRAPH_MD_PATH, graphMd);
  console.log(`brain-graph: wrote ${nodes.length} notes, ${edges.length} links to brain.graph.json and GRAPH.md.`);
}

// Run only when invoked directly (`node scripts/brain-graph.mjs`), not when
// imported by tests/core/brain-coverage.test.ts for buildGraph()/renderGraphMd().
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
