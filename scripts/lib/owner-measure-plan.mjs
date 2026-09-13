// THE PLAN, READ FROM THE RECORD — never from a list inside a script.
//
// `npm run owner:measure` executes an ORDER that two artifacts state: the
// prose table in docs/brain/Owner/Owner - R5 Measurement and Merge.md (which
// carries the REASONS, and is what a person reads) and
// docs/p1-benchmark/owner-measurement-plan.json (which carries the same facts
// in a shape a script can execute). This module reads the JSON, parses the
// note's table, and provides the comparison that
// tests/scripts/owner-measure-plan.test.ts turns into a failing test when the
// two disagree. Hardcoding the order in owner-measure.mjs would have made a
// third copy, and three copies of an order that changed twice in six days
// (2026-09-07, corrected 2026-09-11) is how a measurement ends up attached to
// the wrong tree.
//
// PURITY: nothing here spawns a process, reads an environment variable or
// touches the clock. It takes text in and returns objects.

/** Every refusal this module raises, so a caller can tell a guard from a bug. */
export class PlanError extends Error {
  constructor(message, detail = []) {
    super(message);
    this.name = 'PlanError';
    this.detail = detail;
  }
}

const WHEN_RE = /^(always|manual|if-accepted:[a-z0-9-]+|if-rejected:[a-z0-9-]+)$/;

/**
 * Validate a parsed plan object. Returns it unchanged so callers can write
 * `const plan = validatePlan(JSON.parse(bytes))`.
 *
 * The checks are deliberately shape-level and total: every one of them has a
 * test that shows it firing, because a plan file that is silently accepted
 * while missing a `tip` would turn the pre-flight's stale-tip stop into a
 * no-op — the one guard whose absence cannot be noticed from the output.
 */
export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new PlanError('plan must be a JSON object');
  }
  if (plan.schemaVersion !== 1) {
    throw new PlanError(`unsupported plan schemaVersion ${JSON.stringify(plan.schemaVersion)} (this script speaks 1)`);
  }
  if (typeof plan.remote !== 'string' || plan.remote === '') {
    throw new PlanError('plan.remote must name the git remote the tips are verified against');
  }
  if (!plan.baseline || typeof plan.baseline.ref !== 'string' || typeof plan.baseline.reason !== 'string') {
    throw new PlanError('plan.baseline must carry { ref, reason } — the baseline the branches are read against');
  }
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new PlanError('plan.steps must be a non-empty array');
  }
  const ids = new Set();
  for (const step of plan.steps) {
    for (const key of ['id', 'branch', 'tip', 'base', 'when', 'gate', 'reason']) {
      if (typeof step[key] !== 'string' || step[key] === '') {
        throw new PlanError(`step ${JSON.stringify(step.id ?? '(unnamed)')} is missing a string \`${key}\``);
      }
    }
    if (ids.has(step.id)) throw new PlanError(`duplicate step id "${step.id}"`);
    ids.add(step.id);
    if (!/^[0-9a-f]{40}$/.test(step.tip)) {
      throw new PlanError(`step "${step.id}" tip must be a full 40-character SHA (got "${step.tip}")`);
    }
    if (!/^[0-9a-f]{40}$/.test(step.base)) {
      throw new PlanError(`step "${step.id}" base must be a full 40-character SHA (got "${step.base}")`);
    }
    if (!WHEN_RE.test(step.when)) {
      throw new PlanError(`step "${step.id}" has an unreadable \`when\`: ${JSON.stringify(step.when)}`);
    }
    if (!['accept-reject', 'report'].includes(step.gate)) {
      throw new PlanError(`step "${step.id}" has an unknown \`gate\`: ${JSON.stringify(step.gate)}`);
    }
    if (!Array.isArray(step.receiptRanges) || step.receiptRanges.length === 0) {
      throw new PlanError(`step "${step.id}" must list at least one receiptRange`);
    }
    for (const range of step.receiptRanges) {
      if (!/\.\.HEAD$/.test(range)) {
        throw new PlanError(`step "${step.id}" receiptRange "${range}" must end in "..HEAD" — the gate is run on the checked-out tip`);
      }
    }
    for (const member of step.stack ?? []) {
      if (typeof member.branch !== 'string' || !/^[0-9a-f]{40}$/.test(member.tip ?? '')) {
        throw new PlanError(`step "${step.id}" has a stack member without a branch and full tip SHA`);
      }
    }
    if (step.stack && step.stack[step.stack.length - 1].branch !== step.branch) {
      throw new PlanError(
        `step "${step.id}" declares a stack whose last member is "${step.stack[step.stack.length - 1].branch}" `
        + `but measures "${step.branch}" — the measured tip must be the top of the stack`,
      );
    }
  }
  for (const step of plan.steps) {
    const m = /^if-(?:accepted|rejected):(.+)$/.exec(step.when);
    if (m && !ids.has(m[1])) {
      throw new PlanError(`step "${step.id}" waits on step "${m[1]}", which the plan does not define`);
    }
  }
  return plan;
}

/**
 * Every branch this plan names, in the order it measures them — a step that
 * measures a stack contributes its members in stack order, because that is
 * the order the note's table lists them in and the order the comparison test
 * needs. The measured tip is the last of them.
 */
export function planBranchOrder(plan) {
  const out = [];
  for (const step of plan.steps) {
    if (step.stack) {
      for (const member of step.stack) out.push({ branch: member.branch, tip: member.tip, stepId: step.id });
    } else {
      out.push({ branch: step.branch, tip: step.tip, stepId: step.id });
    }
  }
  return out;
}

/**
 * The branch rows of the owner note's table, in document order.
 *
 * The note's table is `| \`branch\` | \`tip\` | prose |`. Only rows whose
 * first cell is a backticked `scoring/...` name count; the header, the
 * separator, and any other table in the note are ignored. Returning the rows
 * IN ORDER is the point: the order is the plan.
 */
export function parseNoteBranchTable(noteText) {
  const rows = [];
  for (const line of noteText.split('\n')) {
    const m = /^\|\s*`(scoring\/[^`]+)`\s*\|\s*`([0-9a-f]{7,40})`\s*\|/.exec(line.trim());
    if (m) rows.push({ branch: m[1], tip: m[2] });
  }
  return rows;
}

/**
 * Compare the note's table with the plan. Returns a list of human-readable
 * disagreements; empty means the two artifacts state the same order and the
 * same tips. The test turns a non-empty list into a failure, and
 * `owner-measure.mjs --plan` prints it too, so a stale note is visible at the
 * moment the owner reads the plan rather than after a wasted run.
 */
export function comparePlanWithNote(plan, noteText) {
  const problems = [];
  const noteRows = parseNoteBranchTable(noteText);
  if (noteRows.length === 0) {
    return ['the owner note contains no parsable branch table (expected rows shaped `| `scoring/x` | `sha` | … |`)'];
  }
  const planRows = planBranchOrder(plan);
  const noteByBranch = new Map(noteRows.map((r) => [r.branch, r.tip]));

  for (const row of planRows) {
    const noteTip = noteByBranch.get(row.branch);
    if (noteTip === undefined) {
      problems.push(`the plan measures \`${row.branch}\` (step "${row.stepId}") but the note's table has no row for it`);
      continue;
    }
    if (!row.tip.startsWith(noteTip)) {
      problems.push(
        `\`${row.branch}\`: the note's table says tip \`${noteTip}\`, the plan says \`${row.tip.slice(0, noteTip.length)}\` `
        + '(full SHA in the plan). One of the two is stale — fix both, never one.',
      );
    }
  }
  for (const row of noteRows) {
    if (!planRows.some((p) => p.branch === row.branch)) {
      problems.push(`the note's table lists \`${row.branch}\` but the plan never measures it`);
    }
  }

  const planOrder = planRows.map((r) => r.branch);
  const noteOrder = noteRows.filter((r) => planOrder.includes(r.branch)).map((r) => r.branch);
  if (planOrder.length === noteOrder.length && planOrder.join('>') !== noteOrder.join('>')) {
    problems.push(
      `the order disagrees — note: ${noteOrder.join(' > ')}; plan: ${planOrder.join(' > ')}`,
    );
  }
  return problems;
}

/**
 * Whether a step runs, given the accept/reject decisions taken so far.
 * `decisions` maps a step id to 'accepted' | 'rejected'.
 *
 * Returns { eligible, reason } — the reason is printed either way, because
 * "why is this branch not being measured" is as much a part of the plan as
 * "why is this one".
 */
export function stepEligibility(step, decisions) {
  if (step.when === 'always') return { eligible: true, reason: 'unconditional — the first measurement in the order' };
  if (step.when === 'manual') {
    return {
      eligible: false,
      reason: 'manual — reached only by an explicit --only=<id>; the note\'s decision tree does not schedule it automatically',
    };
  }
  const m = /^if-(accepted|rejected):(.+)$/.exec(step.when);
  const want = m[1] === 'accepted' ? 'accepted' : 'rejected';
  const got = decisions.get(m[2]);
  if (got === undefined) {
    return { eligible: false, reason: `waits on step "${m[2]}", which has not been decided in this run` };
  }
  if (got !== want) {
    return { eligible: false, reason: `runs only if "${m[2]}" is ${want}; it was ${got}` };
  }
  return { eligible: true, reason: `"${m[2]}" was ${want}` };
}

/** Wrap prose to `width` columns for the printed plan. Pure, so the plan
 *  printer is testable without capturing stdout. */
export function wrap(text, width = 76, indent = '      ') {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line === '') line = word;
    else if ((line + ' ' + word).length + indent.length <= width) line += ' ' + word;
    else {
      lines.push(indent + line);
      line = word;
    }
  }
  if (line !== '') lines.push(indent + line);
  return lines;
}

/**
 * The printed plan: every step, whether it will run, and WHY — before
 * anything is done. `--plan` prints exactly this and exits.
 */
export function formatPlan(plan, { noteProblems = [] } = {}) {
  const out = [];
  out.push('='.repeat(78));
  out.push('OWNER MEASUREMENT PLAN — read from the record, not from this script');
  out.push('='.repeat(78));
  out.push(`record   : docs/p1-benchmark/owner-measurement-plan.json (updated ${plan.updated})`);
  out.push(`note     : ${plan.note}`);
  out.push(`remote   : ${plan.remote}`);
  out.push('');
  out.push(`0. BASELINE  ${plan.baseline.ref}`);
  out.push(...wrap(plan.baseline.reason));
  out.push('');
  let n = 0;
  for (const step of plan.steps) {
    n += 1;
    const when = step.when === 'always'
      ? 'always'
      : step.when === 'manual'
        ? 'only with --only=' + step.id
        : step.when;
    out.push(`${n}. ${step.id}  [${when}]`);
    out.push(`      branch : ${step.branch} @ ${step.tip.slice(0, 8)}`);
    if (step.stack) {
      out.push(`      stack  : ${step.stack.map((s) => `${s.branch}@${s.tip.slice(0, 8)}`).join(' -> ')}`);
    }
    out.push(`      receipt: ${step.receiptRanges.map((r) => r.replace(/^([0-9a-f]{8})[0-9a-f]*/, '$1')).join('  ')}`);
    out.push(`      gate   : ${step.gate === 'accept-reject' ? 'accept/reject decision after the number' : 'measured and reported'}`);
    out.push(...wrap(step.reason));
    if (step.caveat) out.push(...wrap(`CAVEAT: ${step.caveat}`));
    out.push('');
  }
  n += 1;
  out.push(`${n}. LOCK  ${plan.lock.command} -> ${plan.lock.artifact}`);
  out.push(...wrap(plan.lock.reason));
  out.push('');
  if (noteProblems.length > 0) {
    out.push('!'.repeat(78));
    out.push('THE NOTE AND THE PLAN DISAGREE:');
    for (const p of noteProblems) out.push(...wrap(p, 76, '  - '.length === 4 ? '    ' : '    '));
    out.push('!'.repeat(78));
    out.push('');
  }
  return out.join('\n');
}
