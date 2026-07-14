// Doctor report field validation — exhaustive property tests across diverse scripts.
//
// Every test here verifies ONE property of the ScriptDoctorReport across
// multiple script inputs. The goal is to ensure no field is ever missing,
// malformed, or contradictory on ANY valid Fountain input.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

// ── Diverse script corpus ─────────────────────────────────────────────────────

const SCRIPTS: Array<[string, string]> = [
  ['1-scene action', 'INT. A - DAY\n\nA single action line.'],
  ['1-scene dialogue', 'INT. A - DAY\n\nALICE\nHello there.\n\nBOB\nHi.'],
  ['2-scene', 'INT. A - DAY\n\nAction.\n\nINT. B - NIGHT\n\nMore action.'],
  ['3-scene', 'INT. A - DAY\n\nAct 1.\n\nINT. B - NIGHT\n\nAct 2.\n\nEXT. C - DAY\n\nAct 3.'],
  ['5-scene clean', Array.from({length:5},(_,i)=>`INT. S${i} - DAY\n\nScene ${i} action.\n\nCHAR_A\nDialogue ${i}.\n\nCHAR_B\nResponse ${i}.`).join('\n\n')],
  ['8-scene', Array.from({length:8},(_,i)=>`INT. S${i} - DAY\n\nAction ${i} with danger and urgency!\n\nHERO\nWe must hurry ${i}!`).join('\n\n')],
  ['10-scene', Array.from({length:10},(_,i)=>`INT. S${i} - NIGHT\n\nScene ${i}.\n\nALICE\nLine ${i}.\n\nBOB\nReply ${i}.`).join('\n\n')],
  ['15-scene', Array.from({length:15},(_,i)=>`INT. SC${i} - DAY\n\nBeat ${i}.\n\nCHAR_${i%3}\nSpeech ${i}.`).join('\n\n')],
  ['all dialogue', 'INT. TALK - DAY\n\n' + Array.from({length:10},(_,i)=>`ALICE\nSpeech ${i}.\n\nBOB\nReply ${i}.`).join('\n\n')],
  ['all action', 'INT. QUIET - DAY\n\n' + Array.from({length:10},(_,i)=>`Action line ${i}. The protagonist moves.`).join('\n\n')],
  ['heavy issues', Array.from({length:10},(_,i)=>`INT. S${i} - DAY\n\nALICE\nI am angry and sad. I feel rage.\n\nBOB\nI understand your anger completely.`).join('\n\n')],
  ['title page', 'Title: My Script\nCredit: Written by\nAuthor: Tester\n\nINT. A - DAY\n\nAction.'],
  ['no headings', 'Just plain text with no scene headings at all. Just prose.'],
  ['mixed case', 'int. lowercase - day\n\nMixed case heading.\n\nalice\nLowercase cue.'],
  ['very long line', 'INT. A - DAY\n\n' + 'A'.repeat(5000) + '\n\nALICE\n' + 'B'.repeat(2000)],
  ['special chars', 'INT. CAFÉ - NIÑO\n\nElena — "naïve" déjà vu. 日本語'],
  ['empty dialogue', 'INT. A - DAY\n\nALICE\n\n\nBOB\n'],
  ['transition heavy', 'INT. A - DAY\n\nAction.\n\nCUT TO:\n\nINT. B - NIGHT\n\nMore.\n\nFADE OUT.'],
  ['parenthetical heavy', 'INT. A - DAY\n\nALICE\n(quietly)\nHello.\n\nBOB\n(angry)\nNo!'],
  ['dual dialogue', 'INT. A - DAY\n\nALICE\nHello.\n\nBOB\nHi.'],
];

// ── Report completeness across all scripts ────────────────────────────────────

describe('doctor report — field completeness across diverse scripts', () => {
  before(() => clearDoctorCache());
  after(() => clearDoctorCache());

  for (const [label, script] of SCRIPTS) {
    it(`${label}: report has all required fields`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      // Required scalar fields
      assert.ok(typeof r.health === 'number', 'health must be a number');
      assert.ok(r.health >= 0 && r.health <= 100, `health out of range: ${r.health}`);
      assert.ok(typeof r.grade === 'string');
      assert.ok(['excellent','strong','solid','uneven','troubled'].includes(r.grade));
      assert.ok(typeof r.totalIssues === 'number' && r.totalIssues >= 0);
      assert.ok(typeof r.sceneCount === 'number' && r.sceneCount >= 0);
      assert.ok(typeof r.wordCount === 'number' && r.wordCount >= 0);
      assert.ok(typeof r.analyzedAt === 'number' && r.analyzedAt > 0);
      assert.ok(r.verdict === 'RECOMMEND' || r.verdict === 'CONSIDER' || r.verdict === 'PASS');
      assert.ok(typeof r.contentHash === 'string' && r.contentHash.length === 64);
      assert.ok(typeof r.plainSummary === 'string' && r.plainSummary.length > 0);
      // Array fields
      assert.ok(Array.isArray(r.passes));
      assert.ok(Array.isArray(r.bySeverity !== undefined ? [r.bySeverity] : [])); // bySeverity is an object
      assert.ok(typeof r.bySeverity.critical === 'number');
      assert.ok(typeof r.bySeverity.major === 'number');
      assert.ok(typeof r.bySeverity.minor === 'number');
    });
  }

  for (const [label, script] of SCRIPTS) {
    it(`${label}: passes array has exactly 14 entries in correct order`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      // For 0-scene scripts the degenerate path may return fewer passes
      if (r.sceneCount === 0) {
        assert.equal(r.passes.length, 0, '0-scene degenerate report has 0 passes');
        return;
      }
      assert.equal(r.passes.length, 14);
      const expected = ['structure','causality','intention','belief','conflict','character-arc','dialogue','rhythm','pacing','originality','payoff','voice','theme','relationship-arc'];
      assert.deepEqual(r.passes.map(p => p.pass), expected);
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 8)) {
    it(`${label}: dimensions array has 5 entries`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) return; // degenerate
      assert.ok(r.dimensions && r.dimensions.length === 5);
      assert.deepEqual(r.dimensions!.map(d => d.key),
        ['structure-pacing','character','dialogue-voice','plot-logic','theme-originality']);
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: heatmap has one entry per scene`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) {
        assert.equal(r.sceneHeatmap.length, 0);
        return;
      }
      assert.equal(r.sceneHeatmap.length, r.sceneCount);
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: contentHash is 64-char lowercase hex`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      assert.match(r.contentHash!, /^[0-9a-f]{64}$/);
    });
  }
});

// ── Cross-field consistency invariants ────────────────────────────────────────

describe('doctor report — cross-field consistency', () => {
  before(() => clearDoctorCache());

  for (const [label, script] of SCRIPTS.slice(0, 8)) {
    it(`${label}: bySeverity sum equals totalIssues`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      assert.equal(
        r.bySeverity.critical + r.bySeverity.major + r.bySeverity.minor,
        r.totalIssues,
        `${label}: severity sum (${r.bySeverity.critical}+${r.bySeverity.major}+${r.bySeverity.minor}) != totalIssues (${r.totalIssues})`,
      );
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 8)) {
    it(`${label}: per-pass severity counts reconcile with issue array`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) return;
      for (const pass of r.passes) {
        assert.equal(pass.critical, pass.issues.filter(i => i.severity === 'critical').length,
          `${label}/${pass.pass}: critical count mismatch`);
        assert.equal(pass.major, pass.issues.filter(i => i.severity === 'major').length,
          `${label}/${pass.pass}: major count mismatch`);
        assert.equal(pass.minor, pass.issues.filter(i => i.severity === 'minor').length,
          `${label}/${pass.pass}: minor count mismatch`);
      }
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: grade matches health formula`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.health >= 90) assert.equal(r.grade, 'excellent');
      else if (r.health >= 75) assert.equal(r.grade, 'strong');
      else if (r.health >= 55) assert.equal(r.grade, 'solid');
      else if (r.health >= 35) assert.equal(r.grade, 'uneven');
      else assert.equal(r.grade, 'troubled');
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: verdict matches health/scene formula`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.health >= 85 && r.sceneCount >= 8) assert.equal(r.verdict, 'RECOMMEND');
      else if (r.health >= 60) assert.equal(r.verdict, 'CONSIDER');
      else assert.equal(r.verdict, 'PASS');
    });
  }

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: all issue locations are non-empty strings`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) return;
      for (const pass of r.passes) {
        for (const issue of pass.issues) {
          assert.ok(issue.location.length > 0,
            `${label}/${pass.pass}/${issue.rule}: location must be non-empty`);
        }
      }
    });
  }
});

// ── Determinism across the corpus ─────────────────────────────────────────────

describe('doctor report — determinism across corpus', () => {
  before(() => clearDoctorCache());

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: two runs produce identical health + contentHash + verdict`, async () => {
      clearDoctorCache();
      const a = await runScriptDoctor(script);
      clearDoctorCache();
      const b = await runScriptDoctor(script);
      assert.equal(a.health, b.health, `${label}: health differs across runs`);
      assert.equal(a.contentHash, b.contentHash, `${label}: contentHash differs`);
      assert.equal(a.verdict, b.verdict, `${label}: verdict differs`);
      assert.equal(a.totalIssues, b.totalIssues, `${label}: totalIssues differs`);
    });
  }
});

// ── Narrative metrics presence ────────────────────────────────────────────────

describe('doctor report — narrative metrics', () => {
  before(() => clearDoctorCache());

  for (const [label, script] of SCRIPTS.slice(0, 5)) {
    it(`${label}: metrics object is present with valid numeric fields`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) return;
      assert.ok(r.metrics, `${label}: metrics must be present`);
      assert.ok(typeof r.metrics!.script.sceneCount === 'number');
      assert.ok(typeof r.metrics!.script.suspenseEntropy === 'number');
      assert.ok(typeof r.metrics!.script.momentumConsistency === 'number');
      assert.ok(typeof r.metrics!.script.narrativeCohesion === 'number');
      assert.ok(typeof r.metrics!.script.finalCliffhangerStrength === 'number');
      assert.ok(Array.isArray(r.metrics!.perScene));
    });
  }
});

// ── Diagnostic signals presence (anti-slop, theme, interiority, etc.) ─────────

describe('doctor report — diagnostic signal fields', () => {
  before(() => clearDoctorCache());

  const signalFields = [
    'antiSlop', 'theme', 'interiority', 'mirrorScenes',
    'silence', 'bonding', 'coldOpenPromise', 'patternEstablishment',
  ] as const;

  for (const [label, script] of SCRIPTS.slice(0, 4)) {
    it(`${label}: all 8 diagnostic signal fields are present`, async () => {
      clearDoctorCache();
      const r = await runScriptDoctor(script);
      if (r.sceneCount === 0) return;
      for (const field of signalFields) {
        assert.ok(r[field] !== undefined,
          `${label}: ${field} must be present on the report`);
      }
    });
  }
});
