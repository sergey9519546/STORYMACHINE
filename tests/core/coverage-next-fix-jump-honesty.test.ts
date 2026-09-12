// The "next fix" card must not invent a line for a whole-draft finding.
//
// ── The defect (2026-09-12 adversarial audit, finding #5) ───────────────────
//
// On tests/fixtures/feature-length/assembled-feature.fountain the doctor's top
// priority is NO_REVERSALS_LONG_STORY at location "Conflict layer", which
// server/nvm/analyze/locate.ts honestly resolves to the 'document' tier — no
// line. `computeJumpSpan` fell through to the first ROOT CAUSE's line-anchored
// members and returned their envelope, and CoverageSummary rendered it as the
// top priority's own location: a control labelled "JUMP TO LINE 137" that
// flashed lines 137–2709 of a 2,927-line file. Line 137 is NELL's dialogue in
// scene 8, a QUESTION_DODGE member of the unrelated root cause "Recurring zero
// entropy scene trouble in Scenes 2–12". At short length the same finding
// correctly showed NO LOCATION, so the affordance lied only at the one length
// where a writer cannot check it by eye.
//
// This runs the finding's own command — the real doctor on the real committed
// fixture, through the same buildRootCausePipeline the route uses — so it
// measures the actual report rather than a hand-built shape that happens to
// reproduce the symptom. The pure boundary cases live in
// tests/core/jump-span.test.ts; the DRIVEN half is in
// scripts/verify-p2-p3-surfaces.mjs's P2-featurelen phase.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { buildRootCausePipeline } from '../../server/lib/root-cause-pipeline.ts';
import {
  computeJumpSpan,
  computeRootCauseJumpSpan,
  computeTopPriorityJumpSpan,
} from '../../src/lib/jump-span.ts';
import {
  documentTierLocations,
  jumpTargetForMemberRule,
  NO_LOCATION_DOCUMENT_REASON,
} from '../../src/lib/finding-jump.ts';

const REPO = path.resolve(import.meta.dirname, '../..');
const FIXTURE = path.join(REPO, 'tests/fixtures/feature-length/assembled-feature.fountain');

describe("the feature fixture's top priority is honestly whole-draft", async () => {
  const fountain = readFileSync(FIXTURE, 'utf8');
  const totalLines = fountain.split('\n').length;
  const report = await runScriptDoctor(fountain);
  const pipeline = buildRootCausePipeline(report, fountain);
  const top = report.topPriorities[0];
  const root = pipeline.rootCauses[0];

  it('the fixture still produces the feature-scale report this test is about', () => {
    assert.ok(report.sceneCount >= 140, `sceneCount=${report.sceneCount}`);
    assert.ok(totalLines > 2000, `totalLines=${totalLines}`);
    assert.ok(top?.location, 'no top priority to reason about');
    assert.ok(root, 'no root cause to reason about');
  });

  it('the top priority is resolved to the document tier — the server claims no line for it', () => {
    assert.ok(
      documentTierLocations(pipeline.locatedIssues).has(top.location!),
      `top priority location ${JSON.stringify(top.location)} is not document-tier; `
        + 'this fixture no longer reproduces finding #5 and the assertions below would be vacuous',
    );
  });

  it('the top-priority resolver returns no span — the card shows the honest note instead', () => {
    assert.equal(
      computeTopPriorityJumpSpan({ topLocation: top.location, locatedIssues: pipeline.locatedIssues }),
      undefined,
    );
    // The copy that fills the slot instead already existed; finding #5 is that
    // nothing ever reached it at this length.
    assert.match(NO_LOCATION_DOCUMENT_REASON, /^No location — this note is about the draft as a whole/);
  });

  it('the span the card USED to render belongs to a different finding, and covers most of the file', () => {
    const foreign = computeRootCauseJumpSpan({ root, locatedIssues: pipeline.locatedIssues });
    assert.ok(foreign, 'the root cause does resolve to a span — that is why the old fallthrough had something to return');
    assert.equal(foreign!.owner, 'root-cause');
    const covered = (foreign!.endLine - foreign!.startLine + 1) / totalLines;
    assert.ok(
      covered > 0.8,
      `the old control flashed ${(covered * 100).toFixed(1)}% of the file (lines `
        + `${foreign!.startLine}-${foreign!.endLine} of ${totalLines}); this is what made it unusable even where honest`,
    );
    // The composite still resolves it — what changed is that the owner is
    // visible, so the top priority's card can and does refuse it.
    const composite = computeJumpSpan({
      topLocation: top.location,
      root,
      locatedIssues: pipeline.locatedIssues,
    });
    assert.deepEqual(composite, foreign);
  });

  it("the root cause's own located notes stay reachable, tightly and under their own name", () => {
    let offered: { rule: string; startLine: number; endLine: number; label: string } | null = null;
    for (const rule of root.memberRules) {
      const target = jumpTargetForMemberRule(rule, root, pipeline.locatedIssues, pipeline.sceneLineSpans);
      if (target.kind === 'jump') {
        offered = { rule, startLine: target.startLine, endLine: target.endLine, label: target.label };
        break;
      }
    }
    assert.ok(offered, 'no member of the leading root cause resolves to a span — nothing to offer');
    const coveredLines = offered!.endLine - offered!.startLine + 1;
    assert.ok(
      coveredLines / totalLines < 0.1,
      `the attributed member jump must be a tight span, not an envelope: `
        + `${offered!.startLine}-${offered!.endLine} = ${coveredLines} of ${totalLines} lines`,
    );
    // It is named after where it actually sends the writer, by the one shared
    // naming rule — never after the priority it is offered beneath.
    assert.match(offered!.label, /^Jump to (?:scene|line) \d+$/);
  });
});

describe('CoverageSummary wires the top-priority-scoped resolver', () => {
  const source = readFileSync(
    path.join(REPO, 'src/components/scriptide/CoverageSummary.tsx'),
    'utf8',
  );

  it('resolves the what-next card from the TOP PRIORITY only', () => {
    assert.match(source, /import \{ computeTopPriorityJumpSpan \} from "\.\.\/\.\.\/lib\/jump-span\.ts";/);
    assert.match(source, /const jumpSpan = computeTopPriorityJumpSpan\(\{\s*\n\s*topLocation: top\?\.location,\s*\n\s*locatedIssues: report\?\.locatedIssues,\s*\n\s*\}\);/);
  });

  it('does not pass a root cause into the card-leading resolver', () => {
    const block = source.slice(
      source.indexOf('const jumpSpan = computeTopPriorityJumpSpan({'),
      source.indexOf('const whatNextJump: JumpTarget'),
    );
    assert.ok(block.length > 0, 'jump resolution block not found');
    assert.doesNotMatch(block, /\broot,/);
  });

  it('offers the root cause\'s located note separately, attributed to that finding', () => {
    assert.match(source, /const rootCauseMemberJump/);
    assert.match(source, /jumpTargetForMemberRule\(rule, root, report\?\.locatedIssues, report\?\.sceneLineSpans\)/);
    assert.match(source, /if \(whatNextJump\.kind === "jump"\) return null;/);
    assert.match(source, /A located note from “\{rootCauseMemberJump\.rootTitle\}” — a different finding:/);
  });
});
