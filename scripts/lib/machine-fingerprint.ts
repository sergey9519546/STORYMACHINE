// ONE description of "which machine was this measured on" — imported by the
// calibration script that produces a timing table, by the fixture test that
// checks the table, and by the security suite's cost assertion so that a
// failure says WHERE it ran.
//
// WHY THIS FILE EXISTS. The 2026-09-12 derivation of
// MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (server/lib/validation.ts) recorded its
// timings as "this box" and "the reviewer's box". Neither box was named, and
// neither was the machine that actually enforces the derivation: the GitHub
// Actions ubuntu-latest runner, which on 2026-09-13 measured the same shape
// 53% more expensive than the reviewer's box and failed the assertion. A
// timing without a machine is not evidence; it is an anecdote. So every timing
// this repository commits now carries the machine it came from, in one format,
// produced by one function.

import os from 'node:os';

/** Everything that distinguishes one measuring machine from another, as far as
 *  a CPU-bound single-threaded analysis is concerned. Deliberately small and
 *  all-string/number: it is committed to a fixture and printed in an assertion
 *  message, so it has to stay readable in a diff and in a TAP log. */
export interface MachineFingerprint {
  /** os.cpus()[0].model, e.g. "AMD EPYC 7763 64-Core Processor". */
  readonly cpu: string;
  /** os.cpus().length — logical cores visible to this process. */
  readonly cores: number;
  /** os.availableParallelism() — what node:test uses to size its pool, and so
   *  how much company a test process has while it is being timed. */
  readonly parallelism: number;
  /** Total RAM in GiB, rounded — a proxy for the runner class. */
  readonly memGiB: number;
  readonly node: string;
  readonly platform: string;
  readonly arch: string;
  /** "github-actions" when GITHUB_ACTIONS is set, otherwise "local". The whole
   *  point of the 2026-09-13 re-derivation is that these two are different
   *  machines and the first one is the one that counts. */
  readonly ci: 'github-actions' | 'local';
  /** Runner labels/image, present only under Actions: RUNNER_OS/RUNNER_ARCH/
   *  ImageOS/ImageVersion joined, e.g. "Linux/X64/ubuntu24/20260901.1". */
  readonly runner?: string;
  /** GITHUB_RUN_ID, so a committed table points at a log that can be re-read. */
  readonly runId?: string;
}

/** Read the current machine's fingerprint. Pure apart from reading os/env. */
export function machineFingerprint(env: NodeJS.ProcessEnv = process.env): MachineFingerprint {
  const cpus = os.cpus();
  const ci = env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local';
  const runnerParts = [env.RUNNER_OS, env.RUNNER_ARCH, env.ImageOS, env.ImageVersion].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  return {
    cpu: cpus[0]?.model?.trim() ?? 'unknown',
    cores: cpus.length,
    parallelism: typeof os.availableParallelism === 'function' ? os.availableParallelism() : cpus.length,
    memGiB: Math.round(os.totalmem() / 1024 ** 3),
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    ci,
    ...(runnerParts.length > 0 ? { runner: runnerParts.join('/') } : {}),
    ...(env.GITHUB_RUN_ID ? { runId: env.GITHUB_RUN_ID } : {}),
  };
}

/** One line, for a TAP diagnostic or an assertion message. */
export function formatMachineFingerprint(m: MachineFingerprint): string {
  const tail = [m.runner ? `runner ${m.runner}` : null, m.runId ? `run ${m.runId}` : null]
    .filter(Boolean)
    .join(', ');
  return `${m.ci}: ${m.cpu} x${m.cores} (parallelism ${m.parallelism}, ${m.memGiB} GiB), `
    + `node ${m.node}, ${m.platform}/${m.arch}${tail ? `, ${tail}` : ''}`;
}
