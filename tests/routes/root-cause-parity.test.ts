// CROSS-SURFACE ROOT-CAUSE PARITY — the writer's screen and the producer's
// documents must name the same problem, in the same scenes, in the same order,
// from ONE contentHash.
//
// ── The defect this exists to catch (2026-09-06 product discovery, #2) ──────
//
// On a 231-scene assembled feature, POST /api/export/coverage called
// `clusterIssues(locateIssues(issuesWithPass, fountain))` — with the scene-span
// argument MISSING. POST /api/export/coverage-letter did the same, and so did
// scripts/generate-p0-sample-report.ts. The five doctor-shaped routes in
// server/routes/scriptide.ts passed it.
//
// `sceneSpans` is not decoration. clusterIssues (server/nvm/analyze/cluster.ts)
// uses it for sceneIdxsOf — which scenes a finding names — AND for
// cohesionKey/splitOversizedGroup — how an over-cap group is split into
// separate findings. Measured on the fixture this file loads:
//
//                          with spans   without spans
//   root causes                   70             69
//   3rd finding's scenes    Scenes 1–58      Scene 1
//
// So the producer read "Scene 1" where the writer read "Scenes 1–58", and the
// two documents disagreed about how many problems the draft had and which one
// to fix first — with no error anywhere, from the same script text.
//
// ── What this test asserts ──────────────────────────────────────────────────
//
// One doctor run's contentHash is carried across FOUR live surfaces — the
// doctor JSON route, the live-diagnose JSON route, the exported coverage HTML
// and the exported coverage letter — and every one of them must agree on:
//
//   * the scene ranges, as RENDERED (the HTML's and the letter's scene phrases
//     are scraped out of the shipped bytes, never read off an in-process
//     object: an artifact a producer holds is all a producer has);
//   * the cluster counts (how many findings, and each finding's issue count);
//   * the priority ORDER (the sequence of finding titles);
//   * the TOP THREE findings' text, which is what the letter leads with.
//
// ── Why it cannot pass on the unfixed code ──────────────────────────────────
//
// The last case in this file is the REVERSION PROBE: it re-derives the findings
// the way each broken call site used to — `clusterIssues(located)` with no
// spans — and asserts that doing so produces DIFFERENT scene ranges and a
// DIFFERENT finding count from what the live routes now return. If someone
// reverts any call site to hand assembly, the parity cases above fail; if
// someone "fixes" those cases by weakening them, the probe fails because it
// would mean spans no longer matter. Both directions are pinned.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestServer, type TestServer } from './helpers.ts';
import { sceneLineSpans } from '../../server/nvm/analyze/locate.ts';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
import {
  rootCauseStatements, topRootCauses, SCENE_SPAN_DRIFT_MEASUREMENT,
} from '../../server/lib/root-cause-pipeline.ts';
import { formatSceneList } from '../../server/lib/scene-ranges.ts';
import type { LocatedIssue, RootCauseFinding } from '../../server/nvm/analyze/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '../fixtures/feature-length/assembled-feature.fountain');
const FEATURE = fs.readFileSync(FIXTURE, 'utf-8');

interface Surfaces {
  contentHash: string;
  /** POST /api/scriptide/doctor — the writer's screen. */
  doctorRootCauses: RootCauseFinding[];
  /** The same route's located issues — the input half of the pipeline, used by
   *  the reversion probe at the bottom of this file. */
  locatedIssues: LocatedIssue[];
  /** The headline report facts the doctor route publishes, so the
   *  SCENE_SPAN_DRIFT_MEASUREMENT block can re-measure them rather than trust a
   *  comment (round 2, 2026-09-11). */
  report: { sceneCount: number; wordCount: number; health: number; verdict: string };
  /** POST /api/scriptide/diagnose — the live JSON payload the editor polls. */
  diagnoseRootCauses: RootCauseFinding[];
  /** POST /api/export/coverage — the shareable HTML artifact. */
  coverageHtml: string;
  /** POST /api/export/coverage-letter — the reader's memo. */
  letterMarkdown: string;
}

let server: TestServer;
let s: Surfaces;

/** Every scene phrase the exported HTML renders for a root cause, in document
 *  order. Scraped from the SHIPPED BYTES — the `issue-fix` line of each root
 *  cause list item — because that is the only thing a recipient of the file
 *  has. Matches both the singular and plural forms formatSceneList can emit. */
function scrapeHtmlSceneLists(html: string): string[] {
  const out: string[] = [];
  const scoped = ['Root Causes', 'Recurring Issue Clusters'].map(h => htmlSection(html, h)).join('\n');
  for (const m of scoped.matchAll(/<div class="issue-fix">Subsumes ([^<]*)<\/div>/g)) {
    const segments = m[1].split(' &mdash; ');
    const scenes = segments.find(seg => /^Scenes? \d/.test(seg));
    if (scenes) out.push(scenes.trim());
  }
  return out;
}

/** Every scene phrase the letter renders, scraped from its markdown headings
 *  ("1. **MAJOR — <title> (Scenes 1–3)** — …"). */
function scrapeLetterSceneLists(markdown: string): string[] {
  const out: string[] = [];
  for (const m of markdown.matchAll(/\((Scenes? [^)]*)\)\*\*/g)) out.push(m[1].trim());
  return out;
}

/** The letter's root-cause headings in order, without the severity prefix. */
function scrapeLetterRootCauseHeadings(markdown: string): string[] {
  const section = markdown.split('\n## Root Causes\n')[1];
  if (section === undefined) return [];
  const body = section.split('\n## ')[0];
  const out: string[] = [];
  for (const m of body.matchAll(/^\d+\. \*\*(.+?)\*\* — /gm)) out.push(m[1]);
  return out;
}

/** One named <section> of the exported report, by its <h2> text. Scoping every
 *  scrape to a section matters: Top Priorities and the per-pass appendix use the
 *  SAME `issue-location`/`issue-description` markup as a root cause, so an
 *  unscoped scrape reads 969 "root causes" out of a document that has 70. */
function htmlSection(html: string, heading: string): string {
  const at = html.indexOf(`<h2>${heading}</h2>`);
  if (at < 0) return '';
  const end = html.indexOf('</section>', at);
  return html.slice(at, end < 0 ? undefined : end);
}

/** Root-cause titles in the order the exported HTML renders them: the named
 *  findings ("Root Causes", above Top Priorities) followed by the generic
 *  clusters ("Recurring Issue Clusters", below it) — coverage-html.ts's
 *  buildNamedRootCausesSection / buildClusterFindingsSection. The split is
 *  deliberate presentation; parity is about each run preserving canonical order
 *  and the two runs together covering every finding exactly once. */
function scrapeHtmlRootCauseTitles(html: string): string[] {
  const out: string[] = [];
  for (const heading of ['Root Causes', 'Recurring Issue Clusters']) {
    const section = htmlSection(html, heading);
    for (const m of section.matchAll(/<span class="issue-location">([^<]*)<\/span>/g)) out.push(m[1]);
  }
  return out;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’');
}

before(async () => {
  server = await startTestServer();

  const doctorRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: FEATURE, title: 'Assembled Feature' }),
  });
  assert.equal(doctorRes.status, 200);
  const doctorBody = await doctorRes.json() as {
    contentHash: string; rootCauses: RootCauseFinding[]; locatedIssues: LocatedIssue[];
    sceneCount: number; wordCount: number; health: number; verdict: string;
  };

  const diagnoseRes = await fetch(`${server.baseUrl}/api/scriptide/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: FEATURE }),
  });
  assert.equal(diagnoseRes.status, 200);
  const diagnoseBody = await diagnoseRes.json() as { contentHash: string; rootCauses: RootCauseFinding[] };

  const htmlRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: FEATURE, title: 'Assembled Feature' }),
  });
  assert.equal(htmlRes.status, 200);
  const coverageHtml = await htmlRes.text();

  const letterRes = await fetch(`${server.baseUrl}/api/export/coverage-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain: FEATURE, title: 'Assembled Feature' }),
  });
  assert.equal(letterRes.status, 200);
  const letterBody = await letterRes.json() as { markdown: string; contentHash: string | null };

  // ONE hash across all four surfaces is the precondition for every assertion
  // below: without it, a disagreement could honestly mean "different script".
  assert.equal(diagnoseBody.contentHash, doctorBody.contentHash, 'diagnose analyzed a different script');
  assert.equal(letterBody.contentHash, doctorBody.contentHash, 'letter analyzed a different script');
  assert.ok(
    coverageHtml.includes(doctorBody.contentHash),
    'exported coverage HTML does not publish the same contentHash',
  );

  s = {
    contentHash: doctorBody.contentHash,
    doctorRootCauses: doctorBody.rootCauses,
    locatedIssues: doctorBody.locatedIssues,
    report: {
      sceneCount: doctorBody.sceneCount, wordCount: doctorBody.wordCount,
      health: doctorBody.health, verdict: doctorBody.verdict,
    },
    diagnoseRootCauses: diagnoseBody.rootCauses,
    coverageHtml,
    letterMarkdown: letterBody.markdown,
  };
});

after(async () => { await server?.close(); });

describe('root-cause parity — the fixture is the length the defect needs', () => {
  it('is the committed feature-length assembly, not a short form', () => {
    assert.ok(FEATURE.length > 100_000, `fixture is only ${FEATURE.length} B`);
    assert.ok(s.doctorRootCauses.length > 20, `only ${s.doctorRootCauses.length} root causes — too few to order`);
  });
});

describe('root-cause parity — the two JSON surfaces', () => {
  it('the doctor route and the live-diagnose route return identical findings', () => {
    const sig = (f: RootCauseFinding) => `${f.id}|${f.severity}|${f.memberCount}|${f.sceneIdxs.join(',')}`;
    assert.deepEqual(s.diagnoseRootCauses.map(sig), s.doctorRootCauses.map(sig));
  });
});

describe('root-cause parity — scene ranges, as rendered', () => {
  it('every scene phrase in the exported HTML is one the doctor route can produce', () => {
    const expected = new Set(
      rootCauseStatements(s.doctorRootCauses).map(st => st.sceneList).filter(Boolean),
    );
    const rendered = scrapeHtmlSceneLists(s.coverageHtml);
    assert.ok(rendered.length > 0, 'scraped no scene phrases out of the exported HTML');
    for (const phrase of rendered) {
      assert.ok(expected.has(decodeEntities(phrase)), `HTML renders "${phrase}", which no doctor-route finding names`);
    }
  });

  it('every scene phrase in the letter is one the doctor route can produce', () => {
    const expected = new Set(
      rootCauseStatements(s.doctorRootCauses).map(st => st.sceneList).filter(Boolean),
    );
    const rendered = scrapeLetterSceneLists(s.letterMarkdown);
    assert.ok(rendered.length > 0, 'scraped no scene phrases out of the letter');
    for (const phrase of rendered) {
      assert.ok(expected.has(phrase), `letter renders "${phrase}", which no doctor-route finding names`);
    }
  });

  it('the widest finding names the same scenes on the panel data and in both exports', () => {
    const widest = [...s.doctorRootCauses].sort((a, b) => b.sceneIdxs.length - a.sceneIdxs.length)[0];
    const phrase = formatSceneList(widest.sceneIdxs);
    assert.ok(widest.sceneIdxs.length >= 5, `widest finding spans only ${widest.sceneIdxs.length} scenes`);
    assert.ok(
      s.coverageHtml.includes(phrase),
      `exported HTML never says "${phrase}" for the ${widest.sceneIdxs.length}-scene finding "${widest.title}"`,
    );
    // The letter leads with three findings, so the widest finding is only in it
    // when it is one of those three — assert on whichever of the top three is
    // widest instead of demanding the document carry a finding it never claims to.
    const topWidest = [...topRootCauses(s.doctorRootCauses)]
      .sort((a, b) => b.sceneIdxs.length - a.sceneIdxs.length)[0];
    if (topWidest.sceneIdxs.length > 0) {
      assert.ok(
        s.letterMarkdown.includes(formatSceneList(topWidest.sceneIdxs)),
        `letter never says "${formatSceneList(topWidest.sceneIdxs)}"`,
      );
    }
  });
});

describe('root-cause parity — cluster counts', () => {
  it('every "Subsumes N issues" figure in both exports matches a doctor-route memberCount', () => {
    const valid = new Set(rootCauseStatements(s.doctorRootCauses).map(st => st.countSentence));
    const htmlCounts: string[] = [];
    for (const m of s.coverageHtml.matchAll(/Subsumes (\d+ issues?(?: from \d+ rules?)?)/g)) htmlCounts.push(m[1]);
    const letterCounts: string[] = [];
    for (const m of s.letterMarkdown.matchAll(/Subsumes (\d+ issues?(?: from \d+ rules?)?)\./g)) letterCounts.push(m[1]);

    assert.ok(htmlCounts.length > 0, 'no root-cause counts in the exported HTML');
    assert.ok(letterCounts.length > 0, 'no root-cause counts in the letter');
    for (const c of [...htmlCounts, ...letterCounts]) {
      assert.ok(valid.has(c), `"Subsumes ${c}" matches no doctor-route finding`);
    }
  });

  it('the exported HTML renders every finding the doctor route returned — no more, no fewer', () => {
    const titles = scrapeHtmlRootCauseTitles(s.coverageHtml).map(decodeEntities);
    const expected = s.doctorRootCauses.map(f => f.title);
    // The HTML splits named findings above Top Priorities and generic clusters
    // below, so compare as multisets here; the order case below pins the
    // sequence within each section.
    assert.equal(titles.length, expected.length,
      `HTML renders ${titles.length} root causes, doctor route returned ${expected.length}`);
    assert.deepEqual([...titles].sort(), [...expected].sort());
  });
});

describe('root-cause parity — priority order and the top three', () => {
  it('the exported HTML renders each of its two sections in canonical order', () => {
    // Compared as SEQUENCES, not by a title->position map: splitOversizedGroup
    // (cluster.ts) gives several findings the same auto-generated title at
    // feature scale ("Widespread Structure & Pacing concerns" appears more than
    // once on this fixture), so a map keyed by title silently collapses them and
    // a monotonicity check on it reports a false reorder.
    const statements = rootCauseStatements(s.doctorRootCauses);
    const expected = [
      ...statements.filter(st => st.named).map(st => st.title),
      ...statements.filter(st => !st.named).map(st => st.title),
    ];
    assert.deepEqual(scrapeHtmlRootCauseTitles(s.coverageHtml).map(decodeEntities), expected);
  });

  it("the letter leads with the doctor route's first three findings, in that order", () => {
    const expected = rootCauseStatements(topRootCauses(s.doctorRootCauses)).map(
      st => `${st.severity.toUpperCase()} — ${st.title}${st.sceneList ? ` (${st.sceneList})` : ''}`,
    );
    assert.deepEqual(scrapeLetterRootCauseHeadings(s.letterMarkdown), expected);
  });

  it("the letter's top-three bodies are the doctor route's explanations verbatim", () => {
    for (const st of rootCauseStatements(topRootCauses(s.doctorRootCauses))) {
      assert.ok(
        s.letterMarkdown.includes(`${st.explanation} Subsumes ${st.countSentence}.`),
        `letter does not carry "${st.title}"'s explanation plus its count verbatim`,
      );
    }
  });
});

describe('root-cause parity — REVERSION PROBE (this test must be able to fail)', () => {
  it('re-clustering WITHOUT scene spans produces different findings — so the parity claims above are real', () => {
    // Exactly what server/routes/export.ts, server/routes/coverage-letter.ts and
    // scripts/generate-p0-sample-report.ts used to do: clusterIssues(located)
    // with the spans argument omitted. `locatedIssues` comes off the doctor
    // route's own JSON, so these are the same located issues every surface
    // above saw — not a synthetic stand-in.
    const reverted = clusterIssues(s.locatedIssues);
    const live = s.doctorRootCauses;

    // THE DISCRIMINATOR IS THE SCENE RANGES, NOT THE COUNT (corrected
    // 2026-09-12). This probe used to lead with `reverted.length !==
    // live.length`, which held on this fixture at the time (70 vs 69) and was
    // never the defect being guarded: the measured harm is a 58-scene finding
    // reported to a producer as "Scene 1". After the parse-and-format
    // invariance work changed the fixture's issue mix, both clusterings return
    // the same NUMBER of findings while their ranges still differ sharply
    // (`Scenes 12-26` vs `Scenes 13-17, 19`) — so the old assertion would have
    // failed while the property it stands for was untouched. A count is a
    // proxy; the ranges are the thing.
    const liveRanges = rootCauseStatements(live).map(st => st.sceneList).join(' | ');
    const revertedRanges = rootCauseStatements(reverted).map(st => st.sceneList).join(' | ');
    assert.notEqual(
      revertedRanges, liveRanges,
      'scene ranges are identical with and without spans — the parity assertions above prove nothing',
    );

    // And the difference has to be SUBSTANTIAL, not one finding's rounding:
    // without spans the ranges go gappy, which is the mechanism.
    const differing = rootCauseStatements(live)
      .filter((st, i) => st.sceneList !== rootCauseStatements(reverted)[i]?.sceneList).length;
    assert.ok(
      differing >= 3,
      `only ${differing} finding(s) name different scenes with and without spans; the drift this file `
      + 'measures is document-wide, so a handful of matching ranges is not the property',
    );
  });

  it('re-clustering WITH scene spans reproduces the live routes exactly — the routes really do pass them', () => {
    const sig = (f: RootCauseFinding) => `${f.id}|${f.severity}|${f.memberCount}|${f.sceneIdxs.join(',')}`;
    const rebuilt = clusterIssues(s.locatedIssues, sceneLineSpans(FEATURE));
    assert.deepEqual(rebuilt.map(sig), s.doctorRootCauses.map(sig));
  });

  it('the reverted scene ranges are demonstrably WORSE, not merely different', () => {
    const reverted = clusterIssues(s.locatedIssues);
    const bySig = new Map(reverted.map(f => [f.id, f]));
    let narrowed = 0;
    for (const live of s.doctorRootCauses) {
      const was = bySig.get(live.id);
      if (was && was.sceneIdxs.length < live.sceneIdxs.length) narrowed += 1;
    }
    assert.ok(
      narrowed > 0,
      'no finding named fewer scenes without spans — the measured defect (a 58-scene finding '
      + 'reported as "Scene 1" in the producer\'s export) is not reproduced by this probe',
    );
  });
});

// ── The measured table, re-measured (round 2, 2026-09-11) ────────────────────
//
// server/lib/root-cause-pipeline.ts's header used to carry a hand-typed table of
// what omitting `sceneSpans` costs. One of its three rows was wrong in both
// columns — it read `1, 2–12` / `1, 2–9` where the real values are `Scenes 2–12`
// and `Scenes 2–4, 6–9` — so it understated its own finding (the without-spans
// list is GAPPY, not a contiguous run) while being unreproducible, and a brain
// note quoted it. A measured claim that only a human re-types has no gate under
// it.
//
// The numbers are now SCENE_SPAN_DRIFT_MEASUREMENT, and this block is the gate:
// every field is re-derived from a live doctor + clusterIssues run on the named
// fixture, and the brain note is required to quote the same strings. A cluster.ts
// change that moves any of them fails here rather than making the module comment
// and the vault both silently wrong.
describe('the scene-span drift measurement is re-measured, not re-typed', () => {
  const M = SCENE_SPAN_DRIFT_MEASUREMENT;

  it('the fixture it names is the fixture it was measured on', () => {
    assert.equal(M.fixture, 'tests/fixtures/feature-length/assembled-feature.fountain');
    assert.ok(FIXTURE.endsWith(M.fixture.replace(/^tests\//, '')),
      `this suite loads ${FIXTURE}, which is not the fixture the measurement names`);
  });

  it('every column comes from ONE contentHash, and the report facts match', () => {
    assert.ok(s.contentHash.startsWith(M.contentHash12),
      `live hash ${s.contentHash.slice(0, 12)} !== recorded ${M.contentHash12}`);
    assert.equal(s.report.sceneCount, M.sceneCount);
    assert.equal(s.report.wordCount, M.wordCount);
    assert.equal(s.locatedIssues.length, M.issueCount);
    assert.equal(s.report.health, M.health);
    assert.equal(s.report.verdict, M.verdict);
  });

  it('the WITH-spans column matches a live run', () => {
    const withSpans = clusterIssues(s.locatedIssues, sceneLineSpans(FEATURE));
    assert.equal(withSpans.length, M.withSpans.rootCauses);
    assert.equal(formatSceneList(withSpans[0].sceneIdxs), M.withSpans.topFindingScenes);
    assert.equal(formatSceneList(withSpans[2].sceneIdxs), M.withSpans.thirdFindingScenes);
  });

  it('the WITHOUT-spans column matches a live run, gaps included', () => {
    const withoutSpans = clusterIssues(s.locatedIssues);
    assert.equal(withoutSpans.length, M.withoutSpans.rootCauses);
    assert.equal(formatSceneList(withoutSpans[0].sceneIdxs), M.withoutSpans.topFindingScenes);
    assert.equal(formatSceneList(withoutSpans[2].sceneIdxs), M.withoutSpans.thirdFindingScenes);
    // The row that was wrong: the without-spans top finding is SCATTERED. If this
    // ever collapses to a single run, the measurement is describing a different
    // defect and the comment above it needs rewriting, not just the number.
    assert.ok(M.withoutSpans.topFindingScenes.includes(', '),
      'the without-spans top finding must still be a gappy list, not one range');
  });

  it('the brain note quotes the same six values', () => {
    const note = fs.readFileSync(
      path.join(__dirname, '../../docs/brain/Surfaces/Surface - Root Cause Pipeline.md'),
      'utf-8',
    );
    for (const value of [
      String(M.withSpans.rootCauses), String(M.withoutSpans.rootCauses),
      M.withSpans.topFindingScenes, M.withoutSpans.topFindingScenes,
      M.withSpans.thirdFindingScenes, M.withoutSpans.thirdFindingScenes,
    ]) {
      assert.ok(note.includes(value), `the brain note does not quote "${value}"`);
    }
  });
});
