// GET /health reports the Script Doctor pool's permanent fallback latch
// (lane doctor-pool-fallback, 2026-09-19; logic audit C10).
//
// WHY THIS IS A SEPARATE FILE. The interesting assertion is what /health says
// AFTER the pool has latched itself off, and latching it means letting a real
// worker thread fail to load the doctor (see
// tests/core/doctor-pool-load-failure.test.ts for the injection and why it
// uses the real worker file). That is process-wide, one-way state; putting it
// in tests/routes/ready.test.ts would leave every other test in that file
// reading a pool that had been broken on purpose. The unlatched shape stays
// there, inside its whole-object deepEqual.
//
// WHAT IT PROTECTS. Before this lane the latch was a private boolean. Once it
// set, an operator watching /health saw only a rising `inProcessRuns` — which
// an ordinary deep read produces too — so a server that had permanently lost
// its worker pool, and with it every wall-clock budget Decision #7 defines
// (those are enforceable only by terminating a worker), read exactly like a
// healthy one. These two fields are the difference.

import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import {
  runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus,
  resetDoctorPoolCountersForTests, resetDoctorPoolDisabledForTests,
} from '../../server/nvm/analyze/doctor-pool.ts';

process.env.DOCTOR_POOL_EAGER_RESPAWN = '0';

const SCRIPT = 'INT. HEALTH ROOM - DAY\n\nA figure waits.\n\nFIGURE\nHello.\n\n'
  + 'EXT. HEALTH STREET - NIGHT\n\nRain falls.\n';

describe('routes/config — GET /health.doctorPool carries the fallback latch', () => {
  let server: TestServer;
  let snapshot: string | undefined;

  before(async () => {
    snapshot = process.env.DOCTOR_WORKER_DOCTOR_MODULE;
    server = await startTestServer();
  });

  after(async () => {
    await server.close();
    delete process.env.DOCTOR_POOL_EAGER_RESPAWN;
  });

  afterEach(async () => {
    await shutdownDoctorPool();
    if (snapshot === undefined) delete process.env.DOCTOR_WORKER_DOCTOR_MODULE;
    else process.env.DOCTOR_WORKER_DOCTOR_MODULE = snapshot;
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();
  });

  it('reports poolDisabled:false / poolDisabledReason:null on a healthy process', async () => {
    const body = await (await fetch(`${server.baseUrl}/health`)).json();
    assert.equal(body.doctorPool.poolDisabled, false);
    assert.equal(body.doctorPool.poolDisabledReason, null);
  });

  it('reports poolDisabled:true and the reason once a worker proves it cannot load the doctor', async () => {
    process.env.DOCTOR_WORKER_DOCTOR_MODULE = './__doctor_module_that_does_not_exist__.ts';
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    const report = await runScriptDoctorOffThread(SCRIPT);
    assert.equal(typeof report.health, 'number', 'precondition: the caller was still served in-process');
    assert.equal(doctorPoolStatus().disabled, true, 'precondition: the latch is set');

    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200, '/health must keep answering — it cannot throw');
    const body = await res.json();
    assert.equal(body.doctorPool.poolDisabled, true);
    assert.equal(typeof body.doctorPool.poolDisabledReason, 'string');
    assert.match(body.doctorPool.poolDisabledReason, /could not load the doctor module/);
    // The counter that used to be the only signal is still there, and still
    // cannot distinguish this from a deep read on its own.
    assert.equal(body.doctorPool.inProcessRuns, 1);
  });
});
