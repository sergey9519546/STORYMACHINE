// Scene-label consistency — writer-facing scene numbers are 1-based and every
// consumer that parses them back agrees about which scene is meant.
//
// WHY THIS EXISTS. Scene records carry a 0-based sceneIdx, and for a long time
// the 14 revision passes interpolated it raw into issue labels: the shipped
// sample report said "Scene 12 (INT. HOLLOWAY ESTATE - VAULT - CONTINUOUS)"
// while that slug is the 13th scene — the label contradicted itself, and every
// "here's the scene to fix" pointer sent the writer one scene early. The 2026-08
// migration made all labels 1-based, and moved the decode into the three
// consumers that parse "Scene N" back OUT of the label text:
//   - locate.ts   (SCENE_RE -> sceneSpans[idx], editor squiggles)
//   - doctor.ts   (SCENE_LOCATION_RE -> buildSceneHeatmap cell attribution)
//   - cluster.ts  (SCENE_RE -> RootCauseFinding.sceneIdxs, 0-based by contract)
//
// Unit fixtures cannot protect this boundary: the existing locate/cluster tests
// hand-author their location strings, so they keep passing no matter what the
// passes emit. This test runs the REAL pipeline end to end and cross-checks by
// slug content — the same self-validation that exposed the bug (a label of the
// form "Scene N (SLUG)" carries its own ground truth).
//
// It is also the drift tripwire: the pass files gain rules continuously, and a
// future author writing `Scene ${i}` with a 0-based i will produce a label
// whose N does not match its slug — and fail here, instead of shipping.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { locateIssues } from '../../server/nvm/analyze/locate.ts';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

const root = path.resolve(import.meta.dirname, '../..');

/** The committed demo screenplay — a real 14-scene script the full pipeline
 *  runs on, dense enough that many passes fire. */
function sampleFountain(): string {
  const src = fs.readFileSync(path.join(root, 'src/lib/sample-script.ts'), 'utf8');
  const m = /`([\s\S]+)`/.exec(src);
  assert.ok(m, 'expected to extract the sample screenplay');
  return m[1];
}

// Only parentheticals that are actual scene headings self-validate; passes
// also emit descriptive parentheticals — "Scene 13 (climax peak)",
// "Scene 8 (midpoint)" — which carry no slug to check against.
const SLUG_PAIRED = /Scene (\d+) \(((?:INT|EXT)[^)]*)\)/i;

describe('scene-label consistency — 1-based labels, agreeing consumers', () => {
  let fountain: string;
  let slugs: string[];
  let report: Awaited<ReturnType<typeof runScriptDoctor>>;
  let issues: Array<RevisionIssue & { pass: PassName }>;

  before(async () => {
    fountain = sampleFountain();
    slugs = fountain
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^(INT|EXT)[. ]/.test(l));
    report = await runScriptDoctor(fountain);
    issues = report.passes.flatMap((p) =>
      p.issues.map((issue) => ({ ...issue, pass: p.pass })),
    );
    assert.ok(issues.length > 50, `expected a rich issue set, got ${issues.length}`);
  });

  it('every slug-paired label ("Scene N (SLUG)") has N = the slug\'s 1-based position', () => {
    let checked = 0;
    const wrong: string[] = [];
    for (const issue of issues) {
      const m = SLUG_PAIRED.exec(issue.location);
      if (!m) continue;
      checked++;
      const n = Number(m[1]);
      const slug = m[2].trim();
      if (slugs[n - 1]?.trim() !== slug) {
        const hint =
          slugs[n]?.trim() === slug ? 'OFF-BY-ONE (0-based leak)' :
          slugs[n - 2]?.trim() === slug ? 'OVER-CORRECTED (double +1)' : 'unmatched';
        wrong.push(`${issue.location} [${hint}]`);
      }
    }
    assert.ok(checked >= 5, `expected several slug-paired labels to check, got ${checked}`);
    assert.deepEqual(wrong, [], `labels whose number contradicts their own slug:\n  ${wrong.join('\n  ')}`);
  });

  it('no label or description names a scene outside 1..sceneCount', () => {
    const bad: string[] = [];
    for (const issue of issues) {
      for (const m of `${issue.location} ${issue.description}`.matchAll(/Scene (\d+)/g)) {
        const n = Number(m[1]);
        if (n < 1 || n > slugs.length) {
          bad.push(`"Scene ${n}" in: ${issue.location}`);
          break;
        }
      }
    }
    assert.deepEqual(bad, [], `scene numbers outside 1..${slugs.length}:\n  ${bad.join('\n  ')}`);
  });

  it('heatmap attribution agrees with the label text (doctor.ts decode)', () => {
    // Every slug-paired issue must be counted on the heatmap cell whose slug
    // it names — content agreement, not just index arithmetic.
    const bySlug = new Map(report.sceneHeatmap.map((c) => [c.slug.trim(), c]));
    let checked = 0;
    for (const issue of issues) {
      const m = SLUG_PAIRED.exec(issue.location);
      if (!m) continue;
      const cell = bySlug.get(m[2].trim());
      assert.ok(cell, `heatmap has no cell for slug named by: ${issue.location}`);
      assert.ok(
        cell.issueCount > 0,
        `heatmap cell for "${cell.slug}" shows zero issues although "${issue.location}" names it`,
      );
      checked++;
    }
    assert.ok(checked >= 5, `expected several heatmap cross-checks, got ${checked}`);
  });

  it('editor anchoring agrees with the label text (locate.ts decode)', () => {
    const lines = fountain.split('\n');
    const located = locateIssues(issues, fountain);
    let checked = 0;
    for (const li of located) {
      const m = SLUG_PAIRED.exec(li.issue.location);
      if (!m || li.anchor !== 'scene' || li.startLine === undefined || li.endLine === undefined) continue;
      const slug = m[2].trim();
      // The anchored span must contain the heading line of the named slug —
      // 1-based startLine/endLine per locate.ts's contract.
      const spanText = lines.slice(li.startLine - 1, li.endLine).map((l) => l.trim());
      assert.ok(
        spanText.includes(slug),
        `"${li.issue.location}" anchored to lines ${li.startLine}-${li.endLine}, which do not contain "${slug}"`,
      );
      checked++;
    }
    assert.ok(checked >= 5, `expected several anchored cross-checks, got ${checked}`);
  });

  it('cluster sceneIdxs stay 0-based and in range (cluster.ts decode)', () => {
    const findings = clusterIssues(locateIssues(issues, fountain));
    let sawAny = false;
    for (const f of findings) {
      for (const idx of f.sceneIdxs) {
        sawAny = true;
        assert.ok(
          Number.isInteger(idx) && idx >= 0 && idx < slugs.length,
          `sceneIdxs must be 0-based indices in [0, ${slugs.length}); got ${idx} in "${f.title}"`,
        );
      }
      // The finding's prose re-encodes scene numbers (+1) from its 0-based
      // sceneIdxs (cluster.ts's `where` string flows into the explanation).
      // Every "Scene N" the prose mentions must be the 1-based form of a
      // scene inside the finding's own range.
      if (f.sceneIdxs.length > 0) {
        const lo = Math.min(...f.sceneIdxs) + 1;
        const hi = Math.max(...f.sceneIdxs) + 1;
        for (const m of `${f.title} ${f.explanation}`.matchAll(/Scenes? (\d+)/g)) {
          const n = Number(m[1]);
          assert.ok(
            n >= lo && n <= hi,
            `finding "${f.title}" mentions Scene ${n} but its sceneIdxs=[${f.sceneIdxs}] span 1-based ${lo}–${hi}`,
          );
        }
      }
    }
    assert.ok(sawAny, 'expected at least one clustered finding with sceneIdxs');
  });
});
