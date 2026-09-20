// Advice-rule fixes, 2026-09-04 — regression guards for six measured defects.
//
// SOURCE. An advice-quality audit read fifteen reports as a script consultant
// would, judged 84 individual findings against the script text, and found a
// 65% false-positive rate that RISES with the quality of the writing (83% on
// three well-made scripts, 23% on a badly-made one). Six of its findings are
// mechanical enough to fix and test; this file is the guard for each.
// docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md carries the full before/after.
//
// THE MATCHED PAIR. tests/fixtures/advice-audit/{excellent,bad}.fountain are
// two 10-scene scripts written for this work, matched on scene count and
// length so that anything separating them is craft rather than size. Every
// no-fire assertion below runs on the EXCELLENT script and every fire
// assertion on the BAD one, which is the discrimination claim stated as a
// test rather than as a number. Their headers say which individual lines are
// load-bearing.
//
// WHAT THIS FILE CANNOT SHOW. These are fixture-level guards. They cannot
// establish that the score discriminates on REAL writing — that is the AUC-24
// ratchet and the P1 benchmark, both of which need the owner's local corpus
// (CLAUDE.md, "Which floor, exactly"). A green run here is necessary, not
// sufficient.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFountain, titlePageLineCount } from '../../src/lib/fountain.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { isSuspenseDip, countSuspenseDips, SUSPENSE_DIP_THRESHOLD } from '../../server/nvm/screenplay/suspense-dip.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(REPO, 'tests/fixtures/advice-audit');
const EXCELLENT = fs.readFileSync(path.join(FIXTURES, 'excellent.fountain'), 'utf8');
const BAD = fs.readFileSync(path.join(FIXTURES, 'bad.fountain'), 'utf8');

/** Every rule finding in a doctor report, flattened with its pass. */
async function findings(fountain: string) {
  const report: any = await runScriptDoctor(fountain);
  const all = report.passes.flatMap((p: any) => p.issues.map((i: any) => ({ ...i, pass: p.pass })));
  return { report, all, rules: (r: string) => all.filter((i: any) => i.rule === r) };
}

// ── Defect 1: the reversal threshold was unreachable ──────────────────────

describe('advice fix 1 — the suspense-dip reversal predicate is reachable', () => {
  it('the threshold is inclusive at -1, which is where the integer channel actually lands', () => {
    assert.equal(SUSPENSE_DIP_THRESHOLD, -1);
    assert.equal(isSuspenseDip(-1), true, 'an exact -1 IS a reversal — this is the whole fix');
    assert.equal(isSuspenseDip(-2), true);
    assert.equal(isSuspenseDip(0), false);
    assert.equal(isSuspenseDip(1), false);
    assert.equal(isSuspenseDip(undefined), false, 'absent field reads as 0, matching every call site');
    assert.equal(isSuspenseDip(null), false);
    assert.equal(countSuspenseDips([{ suspenseDelta: -1 }, { suspenseDelta: 0 }, { suspenseDelta: -3 }]), 2);
  });

  // The measurement that motivated the change, asserted so it cannot silently
  // regress: `< -1` means `<= -2` after clamp+round, and NOTHING in the
  // repository's own corpus reaches it. A predicate no shipped script can
  // satisfy makes NO_REVERSALS (major) and NO_REVERSALS_LONG_STORY (critical,
  // 4x health weight) constants — a fixed penalty with zero discriminating
  // power at the top of every report.
  it('the OLD threshold was reachable by no script the repository ships; the new one separates them', () => {
    const corpus: Array<{ key: string; text: string }> = [
      { key: 'advice/excellent', text: EXCELLENT },
      { key: 'advice/bad', text: BAD },
    ];
    const dir = path.join(REPO, 'data/screenplays');
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.fountain')).sort()) {
      corpus.push({ key: 'cc0/' + f, text: fs.readFileSync(path.join(dir, f), 'utf8') });
    }
    for (const s of REFERENCE_CORPUS) corpus.push({ key: 'calib/' + s.label, text: s.fountain });

    let oldReach = 0, newReach = 0;
    for (const c of corpus) {
      const { records } = analyzeFountainText(c.text);
      if (records.some(r => r.suspenseDelta < -1)) oldReach++;
      if (records.some(r => isSuspenseDip(r.suspenseDelta))) newReach++;
    }
    assert.equal(oldReach, 0, `the old '< -1' predicate must still be shown unreachable; ${oldReach}/${corpus.length} reached it`);
    assert.ok(newReach > 0, 'the corrected predicate must fire somewhere');
    assert.ok(newReach < corpus.length, 'and must NOT fire everywhere — a constant in the other direction is no better');
  });

  it('NO_REVERSALS and NO_REVERSALS_LONG_STORY are no longer constants across the shipped corpus', async () => {
    const texts = [EXCELLENT, BAD];
    const dir = path.join(REPO, 'data/screenplays');
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.fountain')).sort().slice(0, 8)) {
      texts.push(fs.readFileSync(path.join(dir, f), 'utf8'));
    }
    let fired = 0;
    for (const t of texts) {
      const { rules } = await findings(t);
      if (rules('NO_REVERSALS').length > 0 || rules('NO_REVERSALS_LONG_STORY').length > 0) fired++;
    }
    assert.ok(fired > 0, 'the rules must still be able to fire');
    assert.ok(fired < texts.length, `must NOT fire on every script; fired on ${fired}/${texts.length}`);
  });
});

// ── Defect 2: the on-the-nose gate could not fire ─────────────────────────

describe('advice fix 2 — ON_THE_NOSE fires on stated feeling and stays silent on subtext', () => {
  it('fires on the deliberately on-the-nose script, at the lines that state a feeling', async () => {
    const { rules } = await findings(BAD);
    const hits = rules('ON_THE_NOSE');
    assert.ok(hits.length >= 3, `expected >=3 ON_THE_NOSE findings on the bad script, got ${hits.length}`);
    const text = hits.map((h: any) => h.description).join(' | ');
    // The widened filler slot: `still` was rejected by the old five-adverb whitelist.
    assert.match(text, /still worried/i, 'the `still` line was the measured whitelist miss');
    // The lexicon addition: `glad` was absent while its opposites were present.
    assert.match(text, /glad it all worked out/i);
  });

  it('stays silent on the well-made script, which states no feelings at all', async () => {
    const { rules } = await findings(EXCELLENT);
    assert.equal(rules('ON_THE_NOSE').length, 0, 'the widening must not be paid for on the negative fixture');
    assert.equal(rules('DIALOGUE_EMOTION_NAMING').length, 0);
  });

  it('does not read a NEGATED feeling as on-the-nose — "I\'m not angry" is subtext, not statement', async () => {
    const denial = [
      'INT. KITCHEN - NIGHT', '', 'ALICE', "I'm not angry.", '',
      'BOB', "I'm not scared of him.", '',
      'ALICE', "I have never been jealous of you.", '',
    ].join('\n');
    const { rules } = await findings(denial);
    assert.equal(rules('ON_THE_NOSE').length, 0, 'three denials must produce zero findings, not three');
  });
});

// ── Defect 3: two dialogue rules inverted on good writing ─────────────────

describe('advice fix 3 — AS_YOU_KNOW_BOB and SYCOPHANTIC_AGREEMENT no longer invert', () => {
  it('AS_YOU_KNOW_BOB does not fire on a line that REFUSES to deliver exposition', async () => {
    const { rules } = await findings(EXCELLENT);
    const hits = rules('AS_YOU_KNOW_BOB');
    assert.equal(hits.length, 0,
      `the excellent script's only trigger is TESS refusing to answer; got: ${hits.map((h: any) => h.description).join(' | ')}`);
  });

  it('AS_YOU_KNOW_BOB still fires when the phrase introduces an actual restated proposition', async () => {
    const exposition = [
      'INT. PLANT FLOOR - DAY', '', 'Two supervisors walk the line.', '',
      'MARA', 'You already know that the plant closes on Friday and the pension vests in March.', '',
      'PETE', 'As you know, the buyer wants the tooling shipped first.', '',
    ].join('\n');
    const { rules } = await findings(exposition);
    assert.ok(rules('AS_YOU_KNOW_BOB').length >= 2,
      'both the `that`-clause form and the classic opener must still fire');
  });

  it('SYCOPHANTIC_AGREEMENT does not fire on a loaded monosyllable mid-exchange', async () => {
    const { rules } = await findings(EXCELLENT);
    assert.equal(rules('SYCOPHANTIC_AGREEMENT').length, 0,
      'NOOR\'s "Yes." is an admission that ends her career, and the scene keeps pressing after it');
  });
});

// ── Defect 4: the danger lexicon read innocuous words ─────────────────────

describe('advice fix 4 — the danger lexicon no longer reads a camera shot as peril', () => {
  it('a thumbnail run and a drone shot no longer make the opening the peak-suspense scene', () => {
    const { records } = analyzeFountainText(EXCELLENT);
    assert.equal(records[0].suspenseDelta, 0,
      'scene 1 contains only "runs a thumbnail" and "the drone shot" — neither is danger');
    const peak = Math.max(...records.map(r => r.suspenseDelta));
    assert.ok(records[0].suspenseDelta < peak || peak === 0,
      'scene 1 must no longer be the sole peak of a script that climaxes at scene 9');
  });

  it('the six removed words carry no suspense on their own', () => {
    const innocuous = [
      'INT. NEWSROOM - DAY', '',
      'She runs a thumbnail along the seam. The producer wants the drone shot before the light goes flat.',
      '',
      'The hallway is dark. Water runs in the sink. He is running late.', '',
    ].join('\n');
    const { records } = analyzeFountainText(innocuous);
    assert.equal(records[0].suspenseDelta, 0, 'run/runs/running, shot, dark must contribute nothing');
  });

  it('genuine peril still registers — the removal costs no danger AXIS', () => {
    const peril = [
      'INT. STAIRWELL - NIGHT', '',
      'A gun comes up. Blood on the rail. Someone screams and the chase begins.',
      'He is trapped, cornered, bleeding, and the attack is not over.', '',
    ].join('\n');
    const { records } = analyzeFountainText(peril);
    assert.ok(records[0].suspenseDelta >= 3, `expected a strong danger read, got ${records[0].suspenseDelta}`);
  });
});

// ── Defect 5: findings printed impossible facts ───────────────────────────

describe('advice fix 5 — no finding states a fact the script contradicts', () => {
  it('a character-arc finding never claims more scenes than the script has', async () => {
    const { report, all } = await findings(BAD);
    const claim = all.find((i: any) => /speaks in \d+ scene/.test(i.description ?? ''));
    assert.ok(claim, 'the bad script has an inert major character; the finding should exist');
    const n = Number(/speaks in (\d+) scene/.exec(claim.description)![1]);
    assert.ok(n <= report.sceneCount, `claimed ${n} scenes on a ${report.sceneCount}-scene script`);
    assert.match(claim.description, /dialogue cues/, 'and the cue count must be labelled as cues, not as scenes');
  });

  // The general guard the audit asked for: sweep BOTH fixtures' entire reports
  // for any scene index or scene count that the report's own sceneCount makes
  // impossible. This catches the next instance of the defect, not just this one.
  for (const [name, text] of [['excellent', EXCELLENT], ['bad', BAD]] as const) {
    it(`no finding on the ${name} fixture cites a scene index or count above report.sceneCount`, async () => {
      const { report, all } = await findings(text);
      const bad: string[] = [];
      for (const issue of all) {
        const haystack = `${issue.location ?? ''} :: ${issue.description ?? ''}`;
        for (const m of haystack.matchAll(/\bScenes?\s+(\d+)/gi)) {
          if (Number(m[1]) > report.sceneCount) bad.push(`${issue.rule}: "Scene ${m[1]}" > sceneCount ${report.sceneCount} in ${haystack.slice(0, 160)}`);
        }
        for (const m of haystack.matchAll(/\b(?:appears|speaks) in (\d+) scene/gi)) {
          if (Number(m[1]) > report.sceneCount) bad.push(`${issue.rule}: "in ${m[1]} scenes" > sceneCount ${report.sceneCount}`);
        }
        for (const m of haystack.matchAll(/(\d+) of (\d+) scenes/gi)) {
          if (Number(m[2]) > report.sceneCount) bad.push(`${issue.rule}: "of ${m[2]} scenes" > sceneCount ${report.sceneCount}`);
        }
      }
      assert.deepEqual(bad, [], bad.join('\n'));
    });
  }

  it('ACTION_SHORTEST_OUTLIER never cites a line of dialogue as an action line', async () => {
    const { all } = await findings(EXCELLENT);
    const hit = all.find((i: any) => i.rule === 'ACTION_SHORTEST_OUTLIER');
    if (hit) {
      // The measured failure was `action line 108: "No."` — line 108 is NOOR's
      // dialogue, reached because a cue's dialogue BLOCK was skipped one line
      // at a time. If the rule still fires, the line it names must be action.
      const lineNum = Number(/action line (\d+)/.exec(hit.location)![1]);
      const src = EXCELLENT.split('\n');
      let cueAbove = false;
      for (let i = lineNum - 2; i >= 0 && src[i].trim() !== ''; i--) {
        const body = src[i].trim().replace(/\s*\(.*?\)\s*$/, '');
        if (/^[\p{Lu}\p{Lt}][\p{Lu}\p{Lt}\p{M}0-9\s\-'.]{2,}$/u.test(body) && !/^(INT\.|EXT\.)/i.test(body)) { cueAbove = true; break; }
      }
      assert.equal(cueAbove, false, `ACTION_SHORTEST_OUTLIER named line ${lineNum} ("${src[lineNum - 1]}"), which sits inside a dialogue block`);
    }
  });

  it('a cue carrying a (CONT\'D) extension is not treated as an action line', async () => {
    const { all } = await findings(BAD);
    const hit = all.find((i: any) => i.rule === 'ACTION_SHORTEST_OUTLIER');
    if (hit) assert.doesNotMatch(hit.location, /CONT'D|V\.O\.|O\.S\./, 'a character cue is not action');
  });

  it('COLON_IN_ACTION does not read a clock or a timestamp as a dramatic-reveal device', async () => {
    const clocks = [
      'INT. DISPATCH - NIGHT', '',
      'Checks the time: 8:52.', '', 'The log reads: 9:40 PM.', '', 'Ratio on the gauge: 3:1.', '',
      'She waits.', '', 'He waits.', '', 'The radio hisses.', '', 'Nothing.', '',
      'A car passes.', '', 'The clock turns over.', '', 'She stands.', '',
    ].join('\n');
    const { rules } = await findings(clocks);
    assert.equal(rules('COLON_IN_ACTION').length, 0, 'three numeric colons must not read as three reveals');
  });

  it('COLON_IN_ACTION still fires on genuine reveal colons', async () => {
    const reveals = [
      'INT. HALL - NIGHT', '',
      'He turns: she is already gone.', '', 'She opens her hand: a ring.', '',
      'The door swings back: an empty room.', '', 'He waits.', '', 'She waits.', '',
      'The lamp buzzes.', '', 'Nothing moves.', '', 'A floorboard settles.', '',
    ].join('\n');
    const { rules } = await findings(reveals);
    assert.ok(rules('COLON_IN_ACTION').length >= 1, 'prose after the colon is the reveal shape and must still fire');
  });
});

// ── Defect 6: the score denominator counted non-screenplay text ───────────

describe('advice fix 6 — wordCount and the title page', () => {
  it('parseFountain types a Fountain title page instead of calling it action', () => {
    const blocks = parseFountain(EXCELLENT);
    const titleBlocks = blocks.filter(b => b.type === 'title_page');
    assert.ok(titleBlocks.length >= 2, 'Title: and Author: must both be typed title_page');
    assert.equal(blocks.some(b => b.type === 'action' && /^(Title|Author|Credit|Draft date)\s*:/i.test(b.text.trim())), false);
  });

  it('titlePageLineCount refuses to eat an opening action line that carries a colon', () => {
    assert.equal(titlePageLineCount('Checks the time: 8:52.\n\nINT. ROOM - DAY\n'), 0);
    assert.equal(titlePageLineCount('INT. ROOM - DAY\n\nHe waits.\n'), 0);
    assert.equal(titlePageLineCount('Title: X\nAuthor: Y\n\nINT. ROOM - DAY\n'), 2);
    // A nonstandard key is admitted only AFTER a recognised one has opened the block.
    assert.equal(titlePageLineCount('Title: X\nGenre: Thriller\n\nINT. ROOM - DAY\n'), 2);
    assert.equal(titlePageLineCount('Genre: Thriller\n\nINT. ROOM - DAY\n'), 0);
  });

  it('wordCount excludes boneyard comments and title-page keys', () => {
    const body = 'INT. ROOM - DAY\n\nShe waits by the window for a long time.\n';
    const bare = analyzeFountainText(body).wordCount;
    const withBoneyard = analyzeFountainText(`/*\nprovenance provenance provenance provenance provenance\n*/\n\n${body}`).wordCount;
    const withTitle = analyzeFountainText(`Title: A Long Title Goes Here\nAuthor: Someone Entirely\n\n${body}`).wordCount;
    assert.equal(withBoneyard, bare, 'a boneyard must not inflate the health denominator');
    assert.equal(withTitle, bare, 'a title page must not inflate the health denominator');
  });

  it('every shipped CC0 fixture now counts only its screenplay body', () => {
    const dir = path.join(REPO, 'data/screenplays');
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.fountain')).sort()) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const blocks = parseFountain(text);
      const boneyardWords = blocks
        .filter(b => b.type === 'boneyard')
        .reduce((n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length, 0);
      assert.ok(boneyardWords > 0, `${f} should still carry its CC0 provenance boneyard`);
      const counted = analyzeFountainText(text).wordCount;
      const raw = text.trim().split(/\s+/).filter(Boolean).length;
      assert.ok(counted < raw, `${f}: wordCount ${counted} must be below the raw file count ${raw}`);
    }
  });

  it('a provenance boneyard changes NOTHING about the score it precedes', async () => {
    const body = EXCELLENT.replace(/\/\*[\s\S]*?\*\/\n?/, '');
    const withHeader: any = await runScriptDoctor(EXCELLENT);
    const without: any = await runScriptDoctor(body);
    assert.equal(withHeader.health, without.health);
    assert.equal(withHeader.wordCount, without.wordCount);
    assert.equal(withHeader.sceneCount, without.sceneCount);
    assert.equal(withHeader.totalIssues, without.totalIssues);
  });
});

// ── The headline the audit reported ───────────────────────────────────────

describe('advice fixes — the matched pair, as the audit measured it', () => {
  it('the excellent script no longer out-produces the bad one in critical findings', async () => {
    const good = await findings(EXCELLENT);
    const bad = await findings(BAD);
    assert.ok(
      good.report.bySeverity.critical <= bad.report.bySeverity.critical,
      `excellent has ${good.report.bySeverity.critical} criticals vs bad's ${bad.report.bySeverity.critical}`,
    );
    assert.ok(
      good.report.totalIssues < bad.report.totalIssues,
      `excellent has ${good.report.totalIssues} findings vs bad's ${bad.report.totalIssues} — the well-made script must not be told more is wrong with it`,
    );
  });

  // HONEST LIMIT, asserted so nobody reads the file as claiming more than it
  // shows: after all six fixes the two scripts still receive the SAME health
  // score. These fixes remove specific false claims; they do not make the
  // composite score discriminate. That is P1's job and it needs real writing.
  it('but health still does not separate them — recorded, not hidden', async () => {
    const good = await findings(EXCELLENT);
    const bad = await findings(BAD);
    assert.ok(
      Math.abs(good.report.health - bad.report.health) < 5,
      `if this ever starts failing, the composite score has begun to separate the pair — re-measure and update docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md rather than deleting this test. excellent=${good.report.health} bad=${bad.report.health}`,
    );
  });
});
