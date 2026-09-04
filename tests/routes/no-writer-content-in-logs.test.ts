// The REVERSE privacy promise: nothing writer-identifiable reaches a place the
// writer would not expect. PrivacyPage.tsx tells a writer their draft lives in
// their browser and in this deployment's session database. A log line, a
// metrics response, or an error body carrying their script text, their title,
// or a character's name is a copy in a store they were never told about — one
// that typically outlives everything "Delete Everything" can reach, because
// stdout goes wherever the operator's log shipper sends it.
//
// The collaboration lane wrote the first test of this shape
// (tests/collab/token.test.ts, "the room id never reaches a log line"). This
// one generalises it from one capability to the writer's actual content, over
// the whole surface that receives a script: the doctor, the SSE doctor stream,
// the ScriptIDE save (script text, title page, snapshots, characters, research
// notes), the coverage-letter export, the coverage HTML export, and the
// deliberate failure paths of each — a 400, a 413, a malformed body — since an
// error handler echoing its input is the classic way content escapes.
//
// It asserts on the WHOLE process output, not on the loggers it can name: a
// future `logger.info` added anywhere in a request's path fails this test
// without anyone having to remember to extend a list.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

const { destroyAllRoomsForTesting } = await import('../../server/collab/yjs-server.ts');
const { resetCollabRoomsForTesting } = await import('../../server/lib/collab-rooms.ts');

// One token per distinct thing a writer would recognise as theirs. Each is a
// single unbroken word so a match cannot be an accident of formatting, and
// none of them appears anywhere else in the tree.
const MARK = {
  action: 'ZZACTIONMARK1',
  dialogue: 'ZZDIALOGMARK2',
  slug: 'ZZSLUGMARK3',
  character: 'ZZCHARMARK4',
  title: 'ZZTITLEMARK5',
  author: 'ZZAUTHORMARK6',
  contact: 'ZZCONTACTMARK7',
  snapshot: 'ZZSNAPMARK8',
  note: 'ZZNOTEMARK9',
} as const;

const FOUNTAIN = `Title: THE ${MARK.title} AFFAIR
Author: ${MARK.author}

INT. ${MARK.slug} WAREHOUSE - NIGHT

A cold room. ${MARK.action} is painted on the wall.

${MARK.character}
This is the ${MARK.dialogue} line.

EXT. ${MARK.slug} STREET - DAY

Rain, and ${MARK.action} again.

${MARK.character}
Another ${MARK.dialogue} line.

INT. ${MARK.slug} OFFICE - DAY

${MARK.character}
A third ${MARK.dialogue} line.
`;

/** Tee (never swallow) process output for the duration of `body`. node:test's
 *  own TAP stream goes through here, so it must keep flowing. */
async function captureProcessOutput(body: () => Promise<void>): Promise<string> {
  const captured: string[] = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  const tee = (real: typeof realOut) => ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    captured.push(String(chunk));
    return (real as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
  process.stdout.write = tee(realOut);
  process.stderr.write = tee(realErr);
  try {
    await body();
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return captured.join('');
}

function assertNoMarks(haystack: string, what: string): void {
  for (const [name, mark] of Object.entries(MARK)) {
    const at = haystack.indexOf(mark);
    if (at === -1) continue;
    const context = haystack.slice(Math.max(0, at - 200), at + 200);
    assert.fail(`${what} contains the writer's ${name} (${mark}):\n${context}`);
  }
}

describe('routes — the writer\'s own words never reach the process log', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    destroyAllRoomsForTesting();
    resetCollabRoomsForTesting();
    await server.close();
  });

  it('a full pass over every route that receives a script logs nothing containing it', async () => {
    const sid = freshSessionId();
    const H = { 'Content-Type': 'application/json', 'X-Session-Id': sid };
    const statuses: Record<string, number> = {};

    const output = await captureProcessOutput(async () => {
      const post = async (label: string, path: string, body: unknown, raw?: string) => {
        const res = await fetch(`${server.baseUrl}${path}`, {
          method: 'POST', headers: H, body: raw ?? JSON.stringify(body),
        });
        statuses[label] = res.status;
        const text = await res.text();
        // A 2xx body legitimately hands the writer their own material back —
        // a report quotes their sluglines, a coverage letter quotes the
        // script. That is the product, not a leak. An ERROR body is the
        // interesting case: an error handler that echoes its input is how
        // content escapes into a shared error tracker, so every >=400 answer
        // is checked.
        if (res.status >= 400) assertNoMarks(text, `the ${label} error response body`);
      };

      // ── The happy paths ────────────────────────────────────────────────
      await post('doctor', '/api/scriptide/doctor', { fountain: FOUNTAIN });
      await post('save', '/api/scriptide/save', {
        scriptText: FOUNTAIN,
        titlePage: {
          title: `THE ${MARK.title} AFFAIR`,
          author: MARK.author,
          contact: `${MARK.contact}@example.com`,
        },
        snapshots: [
          { id: 's1', name: `Draft ${MARK.snapshot}`, text: FOUNTAIN, date: new Date().toISOString(),
            health: 41, verdict: 'PASS', sceneCount: 3, analyzedAt: Date.now() },
          { id: 's2', name: `Draft two ${MARK.snapshot}`, text: FOUNTAIN, date: new Date().toISOString(),
            health: 44, verdict: 'CONSIDER', sceneCount: 3, analyzedAt: Date.now() },
        ],
        characters: [{ name: MARK.character, notes: `lead — ${MARK.note}` }],
        researchNotes: [{ text: `research ${MARK.note}` }],
        isDarkMode: false,
        expectedUpdatedAt: null,
      });
      await post('diagnose', '/api/scriptide/diagnose', { fountain: FOUNTAIN });
      await post('coverage-letter', '/api/export/coverage-letter', {
        fountain: FOUNTAIN, title: `THE ${MARK.title} AFFAIR`, author: MARK.author,
      });
      await post('coverage', '/api/export/coverage', {
        fountain: FOUNTAIN, title: `THE ${MARK.title} AFFAIR`,
      });
      await post('verify', '/api/export/verify', { fountain: FOUNTAIN });

      const load = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
      statuses.load = load.status;
      // Round-trip proof that the save above really stored the marked
      // content, so "nothing was logged" cannot be an artefact of nothing
      // having been persisted in the first place.
      const loaded = await load.text();
      assert.ok(loaded.includes(MARK.title), 'precondition: the save really persisted the title page');
      assert.ok(loaded.includes(MARK.snapshot), 'precondition: the save really persisted both snapshots');

      // ── Deliberate failure paths ───────────────────────────────────────
      // A 400 from zod, a malformed-JSON SyntaxError, and an oversized body:
      // three different error branches in app.ts, each of which has the
      // writer's text in hand at the moment it answers.
      await post('doctor-bad-shape', '/api/scriptide/doctor', { fountain: { nested: FOUNTAIN } });
      await post('doctor-malformed-json', '/api/scriptide/doctor', null,
        `{"fountain": ${JSON.stringify(FOUNTAIN)}`);
      await post('doctor-too-large', '/api/scriptide/doctor', null,
        JSON.stringify({ fountain: FOUNTAIN + 'x'.repeat(1_100_000) }));
      await post('save-bad-shape', '/api/scriptide/save', { scriptText: 12, snapshots: FOUNTAIN });
      await post('letter-two-formats', '/api/export/coverage-letter', { fountain: FOUNTAIN, fdx: FOUNTAIN });

      // ── Collaboration + the wipe itself ────────────────────────────────
      const room = await fetch(`${server.baseUrl}/api/collab/rooms`, { method: 'POST', headers: H, body: '{}' });
      statuses.room = room.status;
      const { roomId } = await room.json() as { roomId: string };
      statuses.token = (await fetch(`${server.baseUrl}/api/collab/token`, {
        method: 'POST', headers: H, body: JSON.stringify({ roomId }),
      })).status;
      statuses.delete = (await fetch(`${server.baseUrl}/api/session/delete`, {
        method: 'POST', headers: H, body: '{}',
      })).status;
    });

    // The routes really ran — a test that logs nothing because it exercised
    // nothing proves nothing.
    assert.equal(statuses.doctor, 200, `doctor: ${JSON.stringify(statuses)}`);
    assert.equal(statuses.save, 200);
    assert.equal(statuses['coverage-letter'], 200);
    assert.equal(statuses.coverage, 200);
    assert.equal(statuses.load, 200);
    assert.equal(statuses.delete, 200);
    assert.equal(statuses.room, 200);
    assert.ok(statuses['doctor-malformed-json'] >= 400, 'the malformed-JSON probe must really have failed');
    assert.ok(statuses['doctor-too-large'] >= 400, 'the oversized-body probe must really have failed');

    assertNoMarks(output, 'the process log');
  });

  it('GET /metrics never carries the writer\'s words', async () => {
    // metrics.recordAiCall keys on the part of a label BEFORE the ':'
    // (server/lib/metrics.ts's categoryOf), and labels look like
    // "takeTurn:<character name>" — so the category is what is kept and the
    // name is what is dropped. This pins that behavior at the endpoint.
    const res = await fetch(`${server.baseUrl}/metrics`);
    assert.equal(res.status, 200);
    assertNoMarks(await res.text(), 'the /metrics response');
  });

  it('GET /api/events/summary never carries the writer\'s words', async () => {
    const res = await fetch(`${server.baseUrl}/api/events/summary`);
    assert.equal(res.status, 200);
    assertNoMarks(await res.text(), 'the /api/events/summary response');
  });
});
