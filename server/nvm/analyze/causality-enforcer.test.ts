import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessCausality, CAUSAL_RATIO_ENTAILED_THRESHOLD } from './causality-enforcer.ts';
import type { CausalScene } from './causality-enforcer.ts';

test('fully causal chain: high ratio, ENTAILED, no episodic scenes', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causedByPriorScene: true, causeSceneIndex: 0 },
    { sceneIndex: 2, causedByPriorScene: true, causeSceneIndex: 1 },
    { sceneIndex: 3, causedByPriorScene: true, causeSceneIndex: 2 },
    { sceneIndex: 4, causedByPriorScene: true, causeSceneIndex: 3 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.causalLinks, 4);
  assert.deepEqual(report.episodicScenes, []);
  assert.equal(report.causalRatio, 1);
  assert.deepEqual(report.brokenLinks, []);
  assert.equal(report.support, 'ENTAILED');
  assert.ok(report.causalRatio >= CAUSAL_RATIO_ENTAILED_THRESHOLD);
});

test('no-fire: fully causal chain does not produce broken links or episodic scenes', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 0 },
    { sceneIndex: 2, causeSceneIndex: 1 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.brokenLinks.length, 0);
  assert.equal(report.episodicScenes.length, 0);
});

test('episodic list (no backward links): episodicScenes populated, UNKNOWN', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1 },
    { sceneIndex: 2 },
    { sceneIndex: 3 },
  ];
  const report = assessCausality(scenes);
  assert.deepEqual(report.episodicScenes, [1, 2, 3]);
  assert.equal(report.causalLinks, 0);
  assert.equal(report.causalRatio, 0);
  assert.deepEqual(report.brokenLinks, []);
  assert.equal(report.support, 'UNKNOWN');
});

test('forward-pointing cause fires brokenLink + CONTRADICTED', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 2 }, // points forward -- invalid
    { sceneIndex: 2 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.brokenLinks.length, 1);
  assert.equal(report.brokenLinks[0].sceneIndex, 1);
  assert.equal(report.brokenLinks[0].reason, 'forward-cause');
  assert.equal(report.support, 'CONTRADICTED');
});

test('self-cause and dangling-cause each fire independently', () => {
  const selfCauseScenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 1 }, // self-cause
  ];
  const selfReport = assessCausality(selfCauseScenes);
  assert.equal(selfReport.brokenLinks.length, 1);
  assert.equal(selfReport.brokenLinks[0].reason, 'self-cause');
  assert.equal(selfReport.support, 'CONTRADICTED');

  const danglingScenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 99 }, // does not exist
  ];
  const danglingReport = assessCausality(danglingScenes);
  assert.equal(danglingReport.brokenLinks.length, 1);
  assert.equal(danglingReport.brokenLinks[0].reason, 'dangling-cause');
  assert.equal(danglingReport.support, 'CONTRADICTED');
});

test('no-fire: valid backward links never mis-flagged as broken', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 0 },
    { sceneIndex: 5, causeSceneIndex: 1 },
  ];
  const report = assessCausality(scenes);
  assert.deepEqual(report.brokenLinks, []);
  assert.equal(report.causalLinks, 2);
});

test('ratio math: causalLinks / (sceneCount - 1), mixed causal and episodic', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 0 },
    { sceneIndex: 2 }, // episodic
    { sceneIndex: 3, causeSceneIndex: 2 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.causalLinks, 2);
  assert.equal(report.causalRatio, 2 / 3);
  assert.deepEqual(report.episodicScenes, [2]);
  // 2/3 = 0.667 >= CAUSAL_RATIO_ENTAILED_THRESHOLD (0.6), no broken links -> ENTAILED
  assert.equal(report.support, 'ENTAILED');
});

test('ratio math: ratio below ENTAILED threshold with no broken links stays UNKNOWN', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causeSceneIndex: 0 },
    { sceneIndex: 2 }, // episodic
    { sceneIndex: 3 }, // episodic
    { sceneIndex: 4 }, // episodic
  ];
  const report = assessCausality(scenes);
  assert.equal(report.causalLinks, 1);
  assert.equal(report.causalRatio, 1 / 4);
  assert.ok(report.causalRatio < CAUSAL_RATIO_ENTAILED_THRESHOLD);
  assert.deepEqual(report.brokenLinks, []);
  assert.equal(report.support, 'UNKNOWN');
});

test('empty input abstains to UNKNOWN', () => {
  const report = assessCausality([]);
  assert.equal(report.support, 'UNKNOWN');
  assert.equal(report.causalLinks, 0);
  assert.equal(report.causalRatio, 0);
  assert.deepEqual(report.episodicScenes, []);
  assert.deepEqual(report.brokenLinks, []);
});

test('single-scene input abstains to UNKNOWN', () => {
  const report = assessCausality([{ sceneIndex: 0 }]);
  assert.equal(report.support, 'UNKNOWN');
  assert.equal(report.causalLinks, 0);
  assert.deepEqual(report.episodicScenes, []);
});

test('guard: out-of-order sceneIndex values abstain rather than crash', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 2 },
    { sceneIndex: 1, causeSceneIndex: 2 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.support, 'UNKNOWN');
});

test('guard: duplicate sceneIndex values abstain rather than crash', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 0, causeSceneIndex: 0 },
  ];
  const report = assessCausality(scenes);
  assert.equal(report.support, 'UNKNOWN');
});

test('no-fire: causedByPriorScene true without causeSceneIndex treated as unverified/episodic, not broken', () => {
  const scenes: CausalScene[] = [
    { sceneIndex: 0 },
    { sceneIndex: 1, causedByPriorScene: true },
  ];
  const report = assessCausality(scenes);
  assert.deepEqual(report.brokenLinks, []);
  assert.deepEqual(report.episodicScenes, [1]);
});
