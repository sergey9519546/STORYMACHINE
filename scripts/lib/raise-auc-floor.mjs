// The pure half of the floor-raising mutation check: rewrite ONE
// `export const <NAME> = <number>;` line in a floor module's source.
//
// Split from scripts/lib/raise-auc-floor-hook.mjs (which registers a module
// hook and throws on import when its env vars are absent) so a test can drive
// this function on a string without loading a hook into its own process.
//
// Why the mutation exists at all, and why it is done in memory rather than on
// disk, is documented in raise-auc-floor-hook.mjs's header. In one line: the
// gate reporter re-runs a verified suite with one floor raised above its own
// measured value and requires the suite to FAIL on that floor by name, because
// exit 0 does not distinguish a live assertion from a gutted one
// (docs/audits/2026-09-12-adversarial/engine-logic.md finding 7).

/** Env var names, exported so the hook, the reporter and their tests agree. */
export const MUTATION_CONSTANT_ENV = 'AUC_FLOOR_MUTATION_CONSTANT';
export const MUTATION_VALUE_ENV = 'AUC_FLOOR_MUTATION_VALUE';

/** Repo-relative suffix of the module whose floors get rewritten. */
export const AUC_LIB_SUFFIX = '/scripts/lib/auc.ts';

/**
 * Rewrite one `export const NAME = <number>;` line.
 *
 * Throws rather than returning the source unchanged when the constant is not
 * present in that exact single-line shape: a mutation that silently did nothing
 * would let the caller read an unmutated run as "the floor assertion is live",
 * which is the precise false assurance this machinery closes.
 *
 * @param {string} source  the module source
 * @param {string} constant  the exported identifier to rewrite
 * @param {number} value  the raised floor
 * @returns {string} the rewritten source
 */
export function raiseFloorInSource(source, constant, value) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(constant)) {
    throw new Error(`raise-auc-floor: ${constant} is not a constant identifier`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`raise-auc-floor: ${value} is not a finite floor value`);
  }
  const pattern = new RegExp(`(export const ${constant} = )(-?[0-9.]+)(;)`);
  if (!pattern.test(source)) {
    throw new Error(
      `raise-auc-floor: no single-line \`export const ${constant} = <number>;\` to raise. `
      + 'The mutation check cannot prove anything against a constant it could not move, so this '
      + 'throws rather than running the suite unmutated.',
    );
  }
  return source.replace(pattern, `$1${value}$3`);
}
