// A one-purpose module hook: present `scripts/lib/auc.ts` to the importing
// process with ONE floor constant raised, without touching the file on disk.
//
// ── Why this exists (2026-09-12, adversarial review finding 7) ─────────────
// `scripts/report-unverified-gates.mjs` used to call a verified gate's row
// `[RAN]` whenever the suite exited 0. A suite whose floor assertions have
// been replaced by `Number.isFinite(...)` also exits 0, so the one positive
// row in the gate report — the row that exists specifically so "not mentioned
// as a gap" and "actually measured" stop looking the same — could be satisfied
// by a suite that measures and asserts nothing.
//
// The fix the finding asks for is a MUTATION CHECK: run the suite a second
// time with one floor raised above its measured value and require a failure.
// A floor the suite no longer compares against cannot produce one.
//
// ── Why a module hook rather than editing the file ────────────────────────
// The obvious implementation is "write a raised value into scripts/lib/auc.ts,
// run the suite, restore the original". That puts a FABRICATED RATCHET on disk
// for several seconds inside a CI step, and a step killed in that window
// (timeout, cancelled workflow, Ctrl-C) leaves it there — a silently altered
// floor in a tree that looks clean is precisely the failure the whole floor
// machinery exists to make expensive. A `module.registerHooks` load hook
// rewrites the source IN MEMORY, in the child process only, so no sequence of
// interruptions can leave the repository altered.
// tests/scripts/report-unverified-gates.test.ts asserts scripts/lib/auc.ts is
// byte-identical after every mutation run it drives.
//
// The suite reads `scripts/lib/auc.ts` from disk as well as importing it (the
// `--lock` shape assertions), so under this hook the imported floors and the
// on-disk literals deliberately DISAGREE and those assertions fail too. That
// is why the reporter does not accept "the mutated run exited non-zero" as
// proof: it requires the mutated run's own
// `not ok … clears <CONSTANT> = <raised value>` line, which only an assertion
// that actually compares the measurement to that constant can produce.
//
// ── Usage ──────────────────────────────────────────────────────────────────
//   AUC_FLOOR_MUTATION_CONSTANT=PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR \
//   AUC_FLOOR_MUTATION_VALUE=0.5813 \
//   node --experimental-strip-types \
//     --import ./scripts/lib/raise-auc-floor-hook.mjs <suite>
//
// Both variables are required; a missing one, an unparseable value, or a
// constant this hook cannot find in the source is a hard throw. A hook that
// silently did nothing would make the mutation check report "the assertion is
// live" about a run where nothing was mutated.
//
// The pure rewrite lives in scripts/lib/raise-auc-floor.mjs so tests can drive
// it without registering a hook in their own process.

import { registerHooks } from 'node:module';

import {
  AUC_LIB_SUFFIX,
  MUTATION_CONSTANT_ENV,
  MUTATION_VALUE_ENV,
  raiseFloorInSource,
} from './raise-auc-floor.mjs';

const constant = process.env[MUTATION_CONSTANT_ENV];
const rawValue = process.env[MUTATION_VALUE_ENV];

if (!constant || !rawValue) {
  throw new Error(
    `raise-auc-floor-hook: both ${MUTATION_CONSTANT_ENV} and ${MUTATION_VALUE_ENV} must be set. `
    + 'Loading this hook without them would run the suite unmutated while the caller believed it '
    + 'had been mutated.',
  );
}

const value = Number(rawValue);
let applied = false;

registerHooks({
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    if (!url.endsWith(AUC_LIB_SUFFIX)) return loaded;
    const source = raiseFloorInSource(String(loaded.source), constant, value);
    applied = true;
    return { ...loaded, source };
  },
});

process.on('exit', () => {
  if (applied) return;
  // Nothing imported scripts/lib/auc.ts, so the run the caller is about to
  // read as "the mutated run" was not mutated at all. Say so loudly: a quiet
  // exit here would be read as "the floor assertion is live".
  process.stderr.write(
    `raise-auc-floor-hook: ${AUC_LIB_SUFFIX} was never loaded, so ${constant} was never raised. `
    + 'Treat this run as UNMUTATED.\n',
  );
});
