// Script Doctor worker-thread pool (lane W1, 2026-08-21).
//
// ── WHY ──────────────────────────────────────────────────────────────────────
// runScriptDoctor is pure, deterministic CPU work with no I/O to yield on, so
// running it on Node's main thread means one submission occupies the event
// loop from start to finish and EVERY other user's request — a save, a health
// check, an unrelated session's keystroke — waits behind it. The 2026-08-14
// audit measured that directly: a ~350-scene script held the whole server for
// 22+ minutes. Lane W2 fixed the curve that made it 22 minutes (the doctor is
// now ~1.9s at 351 scenes), but a 2-second stall for every concurrent user is
// still a denial of service in miniature, and the next slow pass someone adds
// would silently reintroduce the original defect. Moving execution off-thread
// removes the failure MODE, not just today's instance of it.
//
// ── DESIGN ───────────────────────────────────────────────────────────────────
// A tiny fixed pool (1-2 threads; the doctor is not parallelizable within one
// script, so more threads only buy concurrency across submissions) with a FIFO
// queue. Requests are dispatched to the first idle worker, in arrival order —
// the same first-come ordering the session coordinator gives session-scoped
// commands, preserved here so a queued analysis can never be starved by a
// later one.
//
// Four properties this must not break, each handled explicitly below:
//
//   1. CACHE SEMANTICS. The doctor's LRU lives on the MAIN thread and is
//      consulted here, before dispatch (doctorCachePeek), and populated here,
//      after (doctorCacheAdopt). A worker is a separate realm with its own
//      module instance, so a per-worker cache would break the "resubmitting
//      the same draft is free" property the moment the pool had two workers
//      or recycled one. See doctor.ts's coordinator-side cache block.
//
//   2. CANCELLATION. An AbortSignal terminates the worker outright. That is
//      the only honest way to cancel: the doctor is a synchronous CPU loop
//      with no await points to check a flag at, so a cooperative cancel would
//      not actually stop it. Terminating is safe precisely because the worker
//      holds no state anyone else can observe (see doctor-worker.ts). The
//      dead worker is dropped from the pool and a fresh one is spawned on the
//      next request.
//
//   3. ERROR PROPAGATION. A throw inside the worker comes back as a typed
//      message and is rethrown here with the original name/message/stack, so
//      callers (and asyncHandler's 500 path) see what they saw before.
//
//   4. NEVER WORSE THAN BEFORE. If workers cannot run in this environment at
//      all — an exotic loader setup, a locked-down runtime, a bundler that
//      did not emit the worker file — the pool disables itself permanently
//      and every call runs in-process, exactly as it did before this file
//      existed. A perf optimization must not be able to take the product
//      down; the fallback is what makes that guarantee, and
//      DOCTOR_WORKER_POOL=off exercises the same path by hand.
//
// Deep read (opts.deepRead) deliberately does NOT go through the pool: it
// fans out LLM calls whose budget/abort machinery (withAiBudget's
// AsyncLocalStorage scope in routes/scriptide.ts) is main-thread state, and
// it is I/O-bound rather than CPU-bound, so it is not the workload that
// starves the event loop. It runs in-process and is documented as such
// rather than silently half-supported.

import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { logger } from '../../lib/logger.ts';
import type { StoryContext } from '../revision/passes/types.ts';
import type { ScriptDoctorReport, DoctorProgressEvent } from './types.ts';
import type { DoctorWorkerRequest, DoctorWorkerResponse } from './doctor-worker.ts';

const WORKER_URL = new URL('./doctor-worker.ts', import.meta.url);

/** Idle workers are terminated after this long with nothing to do. Keeps a
 *  short-lived process (a test run, a CLI script) from being held open or
 *  leaking a thread, while a busy server effectively never pays respawn cost. */
const IDLE_SHUTDOWN_MS = 30_000;

function configuredPoolSize(): number {
  const raw = Number(process.env.DOCTOR_WORKER_POOL_SIZE);
  if (Number.isFinite(raw) && raw >= 1) return Math.min(4, Math.floor(raw));
  // The doctor is single-threaded per script, so the pool only buys
  // cross-submission concurrency. Two is enough to keep one long analysis
  // from blocking a second user, and small enough that N concurrent
  // feature-length submissions cannot saturate the host.
  const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.min(2, cpus - 1));
}

function poolEnabled(): boolean {
  return process.env.DOCTOR_WORKER_POOL !== 'off';
}

interface PendingJob {
  request: Omit<DoctorWorkerRequest, 'id'>;
  signal?: AbortSignal;
  /** E1 (2026-08-21): fired for each progress event the worker reports for
   *  THIS job while it runs — see DoctorWorkerResponse's 'progress' variant.
   *  Optional and purely observational, same contract as runScriptDoctor's
   *  own onProgress (types.ts's DoctorProgressEvent doc comment). */
  onProgress?: (event: DoctorProgressEvent) => void;
  resolve: (report: ScriptDoctorReport) => void;
  reject: (err: unknown) => void;
}

interface WorkerSlot {
  worker: Worker;
  /** The job this worker is currently running, if any. */
  active?: { job: PendingJob; id: number; onAbort?: () => void };
  idleTimer?: NodeJS.Timeout;
  /** Set once the worker has confirmed it can load doctor.ts. */
  ready: boolean;
  /** purgeDoctorWorkers() marked this worker's realm as holding a report
   *  someone asked to be forgotten, but it was mid-job at the time. It is
   *  terminated the moment that job settles rather than being killed under a
   *  caller who is still waiting for a legitimate answer. */
  retireWhenIdle?: boolean;
}

const queue: PendingJob[] = [];
const slots: WorkerSlot[] = [];
let nextRequestId = 1;
/** Latched when the environment proves it cannot run the worker at all. */
let poolDisabled = false;

/** An abort that happened before/while a job was queued or running. */
class DoctorAbortError extends Error {
  override name = 'AbortError';
  constructor() {
    super('Script Doctor analysis was cancelled.');
  }
}

function abortReasonToError(signal: AbortSignal): unknown {
  return signal.reason instanceof Error ? signal.reason : new DoctorAbortError();
}

function clearIdleTimer(slot: WorkerSlot): void {
  if (slot.idleTimer) {
    clearTimeout(slot.idleTimer);
    slot.idleTimer = undefined;
  }
}

function armIdleTimer(slot: WorkerSlot): void {
  clearIdleTimer(slot);
  slot.idleTimer = setTimeout(() => {
    if (slot.active) return;
    dropSlot(slot);
    void slot.worker.terminate();
  }, IDLE_SHUTDOWN_MS);
  // Never hold the process open on the pool's account.
  slot.idleTimer.unref?.();
}

function dropSlot(slot: WorkerSlot): void {
  clearIdleTimer(slot);
  const at = slots.indexOf(slot);
  if (at >= 0) slots.splice(at, 1);
}

/** Run the doctor on this thread. The fallback path, and the deep-read path.
 *  `onProgress` is forwarded straight through — same thread, no serialization
 *  boundary to cross, so this is a plain pass-through rather than the
 *  postMessage relay the worker path needs (doctor-worker.ts). */
async function runInProcess(
  request: Omit<DoctorWorkerRequest, 'id'>,
  onProgress?: (event: DoctorProgressEvent) => void,
): Promise<ScriptDoctorReport> {
  const { runScriptDoctor } = await import('./doctor.ts');
  return runScriptDoctor(
    request.fountain,
    request.storyContext,
    { ...(request.deepRead ? { deepRead: true } : {}), onProgress },
  );
}

/**
 * ref/unref discipline — subtle and load-bearing.
 *
 * An IDLE worker must be unref'd, or the pool alone keeps the process alive
 * forever and every `node --test` run (and every CLI script that touches the
 * doctor once) hangs at the end instead of exiting.
 *
 * A BUSY worker must be ref'd, or the opposite failure appears: with nothing
 * else pending, Node considers the event loop empty while an analysis is
 * still running on the thread and exits mid-job, abandoning the caller's
 * promise. (Node's test runner reports that as "Promise resolution is still
 * pending but the event loop has already resolved" — which is exactly how
 * this was caught.)
 */
function setBusy(slot: WorkerSlot, busy: boolean): void {
  if (busy) slot.worker.ref();
  else slot.worker.unref();
}

function finishJob(slot: WorkerSlot, settle: () => void): void {
  const active = slot.active;
  if (active?.onAbort && active.job.signal) {
    active.job.signal.removeEventListener('abort', active.onAbort);
  }
  slot.active = undefined;
  setBusy(slot, false);
  settle();
  if (slot.retireWhenIdle) {
    // A wipe landed while this worker was busy. Its realm still holds the
    // in-worker cache copy of whatever it analysed, so drop it before it can
    // take another job — pump() below re-spawns as needed.
    dropSlot(slot);
    void slot.worker.terminate();
    pump();
    return;
  }
  pump();
  if (!slot.active) armIdleTimer(slot);
}

function spawnSlot(): WorkerSlot | undefined {
  let worker: Worker;
  try {
    worker = new Worker(WORKER_URL);
  } catch {
    // The environment cannot start the worker (loader, permissions, missing
    // file after a bundling step). Latch off and let every caller run
    // in-process — see property (4) in this file's header.
    poolDisabled = true;
    return undefined;
  }

  const slot: WorkerSlot = { worker, ready: false };

  worker.on('message', (message: DoctorWorkerResponse) => {
    if (message.type === 'ready') {
      slot.ready = true;
      return;
    }
    const active = slot.active;
    if (!active || active.id !== message.id) return; // stale (cancelled/superseded) reply
    if (message.type === 'progress') {
      active.job.onProgress?.(message.event);
      return; // does not settle the job — more messages (progress or result) still to come
    }
    if (message.type === 'result') {
      finishJob(slot, () => active.job.resolve(message.report));
    } else {
      const err = new Error(message.message);
      err.name = message.name;
      if (message.stack) err.stack = message.stack;
      finishJob(slot, () => active.job.reject(err));
    }
  });

  worker.on('error', (err) => {
    const active = slot.active;
    dropSlot(slot);
    if (!slot.ready) {
      // It died before ever proving it could load the doctor — treat this as
      // an environment that cannot host the pool rather than as a failed
      // analysis, and retry the job in-process so the user still gets a
      // report.
      poolDisabled = true;
      if (active) {
        slot.active = undefined;
        setBusy(slot, false);
        runInProcess(active.job.request, active.job.onProgress).then(active.job.resolve, active.job.reject);
      }
    } else if (active) {
      slot.active = undefined;
      setBusy(slot, false);
      active.job.reject(err);
    }
    pump();
  });

  worker.on('exit', () => {
    const active = slot.active;
    dropSlot(slot);
    if (active) {
      slot.active = undefined;
      // An exit with a job still attached that was NOT an abort (aborts
      // settle the promise before terminating) means the thread died under
      // us; surface it rather than hanging the request forever.
      active.job.reject(new Error('Script Doctor worker exited before returning a report.'));
    }
    pump();
  });

  // Starts idle, so starts unref'd — see setBusy's comment.
  worker.unref();
  slots.push(slot);
  return slot;
}

function dispatch(slot: WorkerSlot, job: PendingJob): void {
  clearIdleTimer(slot);
  setBusy(slot, true);
  const id = nextRequestId++;

  if (job.signal) {
    const onAbort = () => {
      if (slot.active?.id !== id) return;
      const signal = job.signal!;
      slot.active = undefined;
      setBusy(slot, false);
      dropSlot(slot);
      // Terminate: the doctor is a synchronous CPU loop with no await point
      // to observe a cancellation flag at, so this is the only cancel that
      // actually stops the work rather than merely stopping the waiting.
      void slot.worker.terminate();
      job.reject(abortReasonToError(signal));
      pump();
    };
    job.signal.addEventListener('abort', onAbort, { once: true });
    slot.active = { job, id, onAbort };
  } else {
    slot.active = { job, id };
  }

  slot.worker.postMessage({ id, ...job.request } satisfies DoctorWorkerRequest);
}

/** Feed queued jobs to idle workers, in FIFO order, spawning up to the pool
 *  size on demand. */
function pump(): void {
  while (queue.length > 0) {
    if (poolDisabled) {
      const job = queue.shift()!;
      runInProcess(job.request, job.onProgress).then(job.resolve, job.reject);
      continue;
    }
    let slot = slots.find(s => !s.active);
    if (!slot) {
      if (slots.length >= configuredPoolSize()) return; // all busy — wait
      slot = spawnSlot();
      if (!slot) continue; // spawn failed and latched poolDisabled; retry as in-process
    }
    const job = queue.shift()!;
    if (job.signal?.aborted) {
      job.reject(abortReasonToError(job.signal));
      continue;
    }
    dispatch(slot, job);
  }
}

/**
 * Run the Script Doctor without occupying the event loop.
 *
 * Contract-identical to calling runScriptDoctor directly: same arguments,
 * same report, same cache behavior, same errors. The only observable
 * differences are that the caller's `await` no longer blocks every other
 * request, that an optional AbortSignal now genuinely stops the work, and
 * (E1, 2026-08-21) that an optional onProgress callback fires the same
 * DoctorProgressEvent stream runScriptDoctor would have emitted in-process,
 * relayed across the worker boundary by doctor-worker.ts's 'progress'
 * message. A cache hit fires none — there is nothing to report progress on.
 */
export async function runScriptDoctorOffThread(
  fountain: string,
  storyContext?: StoryContext,
  opts?: { deepRead?: boolean; signal?: AbortSignal; onProgress?: (event: DoctorProgressEvent) => void },
): Promise<ScriptDoctorReport> {
  const deepRead = opts?.deepRead === true;
  const signal = opts?.signal;
  const onProgress = opts?.onProgress;

  if (signal?.aborted) throw abortReasonToError(signal);

  // Cache on the COORDINATOR (property 1). A hit costs one hash and returns
  // immediately — never worth a thread hop.
  const { doctorCachePeek, doctorCacheAdopt } = await import('./doctor.ts');
  const cached = doctorCachePeek(fountain, storyContext, deepRead);
  if (cached) return cached;

  const request: Omit<DoctorWorkerRequest, 'id'> = { fountain, storyContext, deepRead };

  // Deep read stays in-process — see this file's header for why.
  if (deepRead || poolDisabled || !poolEnabled()) {
    const report = await runInProcess(request, onProgress);
    doctorCacheAdopt(fountain, report, storyContext, deepRead);
    return report;
  }

  const report = await new Promise<ScriptDoctorReport>((resolve, reject) => {
    queue.push({ request, signal, onProgress, resolve, reject });
    pump();
  });

  doctorCacheAdopt(fountain, report, storyContext, deepRead);
  return report;
}

/** Tear the pool down — for tests and for a clean process shutdown. Queued
 *  jobs are rejected rather than left dangling. */
export async function shutdownDoctorPool(): Promise<void> {
  while (queue.length > 0) {
    queue.shift()!.reject(new Error('Script Doctor pool was shut down.'));
  }
  const terminating = slots.splice(0).map(slot => {
    clearIdleTimer(slot);
    slot.active = undefined;
    return slot.worker.terminate().catch(() => undefined);
  });
  await Promise.all(terminating);
}

/**
 * Drop every worker realm's in-worker report cache — the pool half of "delete
 * everything" (server/routes/config.ts's POST /api/session/delete).
 *
 * WHY A TERMINATION AND NOT A MESSAGE. doctor.ts's LRU lives on the MAIN
 * thread and is what this pool consults and populates (property 1 in this
 * file's header), but a worker is a separate realm running its own module
 * instance, so runScriptDoctor's own doctorCacheSet ALSO fills a second,
 * per-worker copy — doctor.ts calls that out as "a harmless side effect", and
 * it is harmless for correctness. It is not harmless for a deletion promise:
 * that copy holds report findings whose `location` strings are built from the
 * writer's sluglines. A worker exposes no cache-clearing message and adding
 * one would put a privacy-critical operation behind the same postMessage
 * queue a long analysis is already occupying. Terminating is exact, cannot be
 * starved, and is already this pool's cancellation primitive (property 2) —
 * workers hold no state anyone else can observe, and the next request spawns
 * a fresh one.
 *
 * Idle workers go immediately; a busy worker is flagged and terminated the
 * instant its job settles, so an unrelated caller's in-flight analysis is
 * never killed to satisfy someone else's wipe. Returns how many were
 * terminated outright.
 */
export function purgeDoctorWorkers(): number {
  let terminated = 0;
  for (const slot of [...slots]) {
    if (slot.active) { slot.retireWhenIdle = true; continue; }
    dropSlot(slot);
    void slot.worker.terminate();
    terminated++;
  }
  return terminated;
}

/** Introspection for tests: whether the pool is actually carrying work, or
 *  has fallen back to in-process execution. */
export function doctorPoolStatus(): { enabled: boolean; disabled: boolean; workers: number; queued: number } {
  return { enabled: poolEnabled(), disabled: poolDisabled, workers: slots.length, queued: queue.length };
}

/**
 * Boot-time pre-warm (2026-09-04 re-verification: the first
 * POST /api/scriptide/doctor after a fresh boot measured ~460-540ms of
 * worker-pool cold start — spawning the thread, having it load doctor.ts's
 * whole module graph (calibration corpus, the revision pipeline, every
 * pass) inside the worker realm for the first time — versus 6-26ms once a
 * worker is warm. That cost is paid once per worker's lifetime, not per
 * request, so paying it eagerly at boot instead of on the first real user's
 * request is a pure win with no behavior change: `runScriptDoctorOffThread`
 * is contract-identical either way (this file's own doc comment on it).
 *
 * Dispatches one tiny, disposable analysis per configured pool slot so each
 * worker thread actually gets spawned and proves it can load doctor.ts,
 * exactly the same path `pump()` takes for a real request. Each call uses
 * distinct throwaway content (index baked into the slugline) so the
 * coordinator-side cache (property 1 in this file's header) can't collapse
 * N warm-up calls into one dispatch — a cache hit never reaches a worker at
 * all, which would leave every slot past the first cold.
 *
 * Never thrown from, never slow to call: every job's own rejection is
 * caught and logged individually (a worker that can't start is exactly the
 * "environment can't host the pool" case doctor-pool.ts already treats as
 * permanent, harmless fallback — see spawnSlot()'s doc comment), and the
 * function returns a Promise the caller is expected to let run in the
 * background rather than await — see server.ts's call site. Guarded to a
 * no-op under `NODE_ENV=test` (a test run should never spend wall-clock time
 * or spawn threads warming a pool nobody in the test is about to measure)
 * and under `DOCTOR_POOL_PREWARM=0` (an explicit opt-out for a deployment
 * that wants zero extra boot-time work, e.g. a constrained environment where
 * even a handful of throwaway analyses matters).
 *
 * `runJob` is injectable for tests only — production callers always take the
 * default, which is the same `runScriptDoctorOffThread` every real request
 * goes through.
 */
const WARM_UP_FOUNTAIN = (index: number): string =>
  `INT. PRE-WARM ROOM ${index} - DAY\n\nA figure stands, waiting for nothing in particular.\n\nWARMUP\nHello.\n`;

/**
 * Observable warm state for the pre-warm above — the piece the 2026-09-04
 * ops audit found missing entirely: a request landing in the ~2.1-2.7s
 * window between "port is accepting connections" (server.ts's app.listen
 * callback) and "pool is warm" pays the full cold-start cost with nothing —
 * a load balancer, a health check, a test — able to tell the two states
 * apart. GET /ready (server/routes/config.ts) reads this via
 * `getDoctorPoolWarmState()` to gate traffic on it.
 *
 * `finished` is the field that matters for readiness: it becomes true both
 * on a real warm-up completing (success or partial failure — see `failed`)
 * AND on every no-op branch below (NODE_ENV=test, DOCTOR_POOL_PREWARM=0) —
 * a run that will never pre-warm has nothing to wait for, so treating that
 * as "warm" immediately is correct, not a lie: the pool's steady-state
 * behavior (fall back in-process, or cold-start the first real request) is
 * unaffected either way.
 */
export interface DoctorPoolWarmState {
  /** True once warmDoctorPool() has begun running (a no-op run included). */
  started: boolean;
  /** True once warmDoctorPool() has settled — as warm as it will get. */
  finished: boolean;
  /** Wall-clock duration of the warm-up in ms, or null before it finishes. */
  ms: number | null;
  /** Worker slots that warmed successfully (0 for a no-op run, or a timeout). */
  slotsWarmed: number;
  /** Warm-up jobs that failed (each already logged individually; never fatal). */
  failed: number;
  /** Date.now() epoch ms when `finished` flipped to true, or null before then. */
  finishedAt: number | null;
  /** True when the deadline (see prewarmDeadlineMs()) fired before every
   *  warm-up job settled — `finished` is still true (see warmDoctorPool()'s
   *  doc comment), but slotsWarmed/failed did not get a final tally because
   *  the still-pending jobs were abandoned, not awaited. Follow-up review
   *  finding (2026-09-04): a wedged worker previously left `finished` false
   *  forever, which meant GET /ready 503'd forever for a process that was in
   *  fact serving every request correctly (the pool falls back in-process). */
  timedOut: boolean;
}

const initialWarmState = (): DoctorPoolWarmState =>
  ({ started: false, finished: false, ms: null, slotsWarmed: 0, failed: 0, finishedAt: null, timedOut: false });

/** How long warmDoctorPool() waits for every warm-up job to settle before
 *  giving up and reporting `finished:true, timedOut:true` anyway. 30s is
 *  generous against the measured ~2.1-3.9s real-world warm-up (this file's
 *  own doc comments) while still bounding the worst case: without a
 *  deadline, an unresponsive worker (accepts a job, never replies — the one
 *  case runScriptDoctorOffThread has no per-job timeout for) would leave
 *  `finished` false, and therefore GET /ready 503, forever. Overridable via
 *  DOCTOR_POOL_PREWARM_TIMEOUT_MS for tests (which use a short override) and
 *  for an operator who has measured a different real-world ceiling. */
function prewarmDeadlineMs(): number {
  const raw = Number(process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
}

let warmState: DoctorPoolWarmState = initialWarmState();

/** Read-only snapshot of the pre-warm's current state — safe to call at any
 *  time, including before warmDoctorPool() has ever run. Returns a copy so a
 *  caller can never mutate this module's own tracking state. */
export function getDoctorPoolWarmState(): DoctorPoolWarmState {
  return { ...warmState };
}

/** Test-only reset, mirroring shutdownDoctorPool()'s role for pool slots —
 *  lets a test start from a known "never warmed" state without restarting
 *  the process. */
export function resetDoctorPoolWarmStateForTests(): void {
  warmState = initialWarmState();
}

export async function warmDoctorPool(
  opts: { runJob?: (fountain: string) => Promise<unknown> } = {},
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    warmState = { started: true, finished: true, ms: 0, slotsWarmed: 0, failed: 0, finishedAt: Date.now(), timedOut: false };
    return;
  }
  if (process.env.DOCTOR_POOL_PREWARM === '0') {
    warmState = { started: true, finished: true, ms: 0, slotsWarmed: 0, failed: 0, finishedAt: Date.now(), timedOut: false };
    return;
  }

  const runJob = opts.runJob ?? ((fountain: string) => runScriptDoctorOffThread(fountain));
  const startedAt = Date.now();
  warmState = { started: true, finished: false, ms: null, slotsWarmed: 0, failed: 0, finishedAt: null, timedOut: false };
  let failures = 0;

  try {
    // Running in-process (pool off, or already latched disabled) buys nothing
    // by repeating the throwaway analysis more than once — there is only one
    // thread to warm, the main one, and it's already loading doctor.ts as
    // part of this very call.
    const count = poolEnabled() && !poolDisabled ? configuredPoolSize() : 1;

    const jobsSettled = Promise.all(
      Array.from({ length: count }, (_, index) =>
        runJob(WARM_UP_FOUNTAIN(index)).catch((err: unknown) => {
          failures++;
          logger.warn('doctor_pool_prewarm_job_failed', {
            index,
            error: err instanceof Error ? err.message : String(err),
          });
        })),
    );

    // Deadline race (follow-up review finding, 2026-09-04): a worker that
    // accepts a job and never replies would otherwise leave jobsSettled
    // pending forever — runScriptDoctorOffThread has no per-job timeout of
    // its own (only the pool's idle-shutdown timer). Whichever settles
    // first wins; the timer is cleared either way so it never lingers.
    //
    // Deliberately NOT `.unref()`'d, unlike this file's other timers
    // (IDLE_SHUTDOWN_MS): those exist to stop a timer from holding a
    // short-lived process open on its own account, with nothing else
    // depending on it. This one backs a guarantee an active caller is
    // ALREADY awaiting ("warmDoctorPool() resolves within deadlineMs, no
    // matter what") — unref'd, it can lose the race against the event loop
    // draining before it ever fires (confirmed: with nothing else scheduled,
    // an unref'd version of this timer never fires at all, so the very
    // deadline it exists to guarantee silently stops applying). Ref'd is
    // safe here specifically because the promise chain already holding the
    // process open is the caller's own `await warmDoctorPool()` — this timer
    // adds no new process-lifetime hazard beyond what that await already is.
    const deadlineMs = prewarmDeadlineMs();
    let deadlineTimer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'timeout'>((resolve) => {
      deadlineTimer = setTimeout(() => resolve('timeout'), deadlineMs);
    });

    const outcome = await Promise.race([jobsSettled.then((): 'settled' => 'settled'), deadline]);
    if (deadlineTimer) clearTimeout(deadlineTimer);

    const elapsed = Date.now() - startedAt;

    if (outcome === 'timeout') {
      logger.warn('doctor_pool_prewarm_timed_out', { requested: count, deadlineMs, ms: elapsed });
      warmState = {
        started: true, finished: true, ms: elapsed, slotsWarmed: 0, failed: 0, finishedAt: Date.now(), timedOut: true,
      };
      // The still-pending jobs may resolve or reject later; each already
      // catches its own rejection above (the .catch in the Array.from
      // callback), so letting jobsSettled keep running in the background
      // after we've moved on can never surface as an unhandled rejection —
      // GET /ready and /health must not wait on a worker that may never
      // answer.
      void jobsSettled;
      return;
    }

    warmState = {
      started: true, finished: true, ms: elapsed, slotsWarmed: count - failures, failed: failures, finishedAt: Date.now(), timedOut: false,
    };

    logger.info('doctor_pool_prewarmed', {
      requested: count,
      failures,
      workers: doctorPoolStatus().workers,
      ms: elapsed,
    });
  } catch (err) {
    // Belt-and-braces: every per-job failure is already caught above, so
    // this only fires on something outside that loop (e.g. configuredPoolSize
    // itself throwing on a corrupt env value). A boot-time perf optimization
    // must never be able to take the process down or surface as an unhandled
    // rejection — see this file's property (4) for the same guarantee applied
    // to the pool itself. `finished` still flips to true here: a /ready
    // gate must never wait forever on a warm-up that has already given up.
    const elapsed = Date.now() - startedAt;
    warmState = { started: true, finished: true, ms: elapsed, slotsWarmed: 0, failed: failures, finishedAt: Date.now(), timedOut: false };
    logger.warn('doctor_pool_prewarm_failed', {
      error: err instanceof Error ? err.message : String(err),
      ms: elapsed,
    });
  }
}
