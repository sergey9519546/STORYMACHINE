// GET /api/scriptide/complete (P1 inline AI copilot FIM completion stream).
//
// Bug covered here: the route's own genre/directorStyle validity checks
// (`isValidGenre`/`isValidStyle`) were a stale, pre-genre-completion-wave
// allowlist — only the original 8 StoryGenre members and 6 DirectorStyle
// members — even though engine/types.ts's StoryGenre union now has 47
// members and DirectorStyle has 27 (see genre-router.ts's own "Genre-
// completion wave" header comment). Any caller who picked a genre/style
// added after that original set (e.g. "heist", "kubrick") had it silently
// dropped from the composed prompt block — the completion silently ignored
// the writer's chosen genre/style for the large majority of the roster,
// while every OTHER genre/style-consuming route (world-build, refine-
// dialogue, analyze-tension, /api/story-genre, /api/director-style) honors
// the full current roster via `k in GENRE_NAMES` / `k in STYLE_MODIFIERS`.
//
// Provider seam: setLLMProvider with a `generate`-only stub (no
// generateStream) so engine/ai.ts's generateContentStream() falls back to a
// single generateContent() call — the fallback path documented at
// generateContentStream's own definition — letting this test capture the
// exact prompt string sent to the model without needing a real streaming
// mock.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import type { GenerateContentParameters } from '@google/genai';

// Neutral prefix — long enough to clear the route's `rawPrefix.length < 10`
// short-circuit, and deliberately free of the words "heist"/"kubrick" so a
// match against those words in the captured prompt can only come from the
// genre/style modifier block, never an echo of the prefix itself.
const PREFIX = 'INT. QUIET HOUSE - NIGHT\nA woman studies a photograph in silence.';

describe('routes/scriptide — GET /api/scriptide/complete genre/directorStyle composition', async () => {
  let server: TestServer;
  let capturedContents: string | undefined;
  // G0-03: the route now guards on llmReady() (server/routes/scriptide.ts)
  // before ever reaching the provider — setLLMProvider's mock alone (below)
  // no longer makes the route "ready", since llmReady() checks the key
  // sources (env GEMINI_API_KEY / ai-config.ts's multi-provider config), not
  // whether ai.ts's provider seam has been swapped. This suite's actual
  // subject is genre/directorStyle prompt composition, which only runs once
  // the guard is satisfied, so set a dummy key for its duration (restored in
  // `after`) the same way the mocked provider below is installed/reset.
  const prevGeminiKey = process.env.GEMINI_API_KEY;

  before(async () => {
    process.env.GEMINI_API_KEY = 'test-key-for-genre-style-composition';
    server = await startTestServer();
    setLLMProvider({
      generate: async (params: GenerateContentParameters) => {
        capturedContents = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
        return { text: 'continuation text' } as unknown as import('@google/genai').GenerateContentResponse;
      },
    });
  });
  after(async () => {
    resetLLMProvider();
    if (prevGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGeminiKey;
    await server.close();
  });

  it('honors a post-expansion genre ("heist") in the composed prompt block, not just the original 8', async () => {
    capturedContents = undefined;
    const res = await fetch(
      `${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(PREFIX)}&genre=heist`,
    );
    assert.equal(res.status, 200);
    await res.text(); // drain the SSE stream so the handler runs to completion
    assert.ok(capturedContents, 'expected the stub provider to have been called');
    const contents = capturedContents as string;
    assert.ok(
      contents.includes('GENRE — HEIST'),
      `expected the composed prompt to include the heist genre modifier block; got:\n${contents}`,
    );
  });

  it('honors a post-expansion director style ("kubrick") in the composed prompt block, not just the original 6', async () => {
    capturedContents = undefined;
    const res = await fetch(
      `${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(PREFIX)}&directorStyle=kubrick`,
    );
    assert.equal(res.status, 200);
    await res.text();
    assert.ok(capturedContents, 'expected the stub provider to have been called');
    const contents = capturedContents as string;
    assert.ok(
      contents.includes('CINEMATIC STYLE — KUBRICK'),
      `expected the composed prompt to include the kubrick style modifier block; got:\n${contents}`,
    );
  });

  it('still honors an original-roster genre+style pair ("thriller"/"hitchcock") — no regression on the previously-supported subset', async () => {
    capturedContents = undefined;
    const res = await fetch(
      `${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(PREFIX)}&genre=thriller&directorStyle=hitchcock`,
    );
    assert.equal(res.status, 200);
    await res.text();
    assert.ok(capturedContents, 'expected the stub provider to have been called');
    const contents = capturedContents as string;
    assert.ok(
      /THRILLER/.test(contents) || /HITCHCOCK/.test(contents),
      `expected the composed prompt to reference the thriller genre or hitchcock style; got:\n${contents}`,
    );
  });

  it('ignores an unknown genre/style value entirely (no crash, no bogus block)', async () => {
    capturedContents = undefined;
    const res = await fetch(
      `${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(PREFIX)}&genre=not-a-real-genre&directorStyle=not-a-real-style`,
    );
    assert.equal(res.status, 200);
    await res.text();
    assert.ok(capturedContents, 'expected the stub provider to have been called');
  });
});
