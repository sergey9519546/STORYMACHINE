// Redirect-safe OpenAI-compat fetch (SSRF follow-on).
// Proves fetchOpenAICompat never auto-follows a hop into a private/metadata
// target and never forwards Authorization across origins.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  fetchOpenAICompat,
  makeOpenAICompatEmbeddingProvider,
  makeOpenAICompatImageProvider,
  makeOpenAICompatLLMProvider,
  makeOpenAICompatTTSProvider,
} from '../../server/lib/ai-providers/openai-compat.ts';
import type { GenerateContentParameters } from '@google/genai';

function listen(handler: http.RequestListener): Promise<{ url: string; port: number; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, port: addr.port, server });
    });
  });
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((r) => server.close(() => r()));
}

describe('fetchOpenAICompat — redirect SSRF hardening', () => {
  it('follows a same-origin redirect and preserves Authorization', async () => {
    let sawAuthOnFinal = false;
    const { url, server } = await listen((req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/final' });
        res.end();
        return;
      }
      if (req.url === '/final') {
        sawAuthOnFinal = (req.headers.authorization ?? '').startsWith('Bearer ');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    try {
      const res = await fetchOpenAICompat(`${url}/start`, {
        method: 'GET',
        headers: { Authorization: 'Bearer secret-key' },
      });
      assert.equal(res.status, 200);
      assert.equal(sawAuthOnFinal, true);
    } finally {
      await close(server);
    }
  });

  it('rejects a redirect to 169.254.169.254 (cloud metadata)', async () => {
    const { url, server } = await listen((_req, res) => {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/pivot`, { method: 'GET' }),
        (err: Error) => {
          assert.match(err.message, /Refusing OpenAI-compat redirect|private|metadata|link-local/i);
          return true;
        },
      );
    } finally {
      await close(server);
    }
  });

  it('rejects a cross-origin redirect to a different loopback port (private pivot)', async () => {
    // Second server is also loopback, but a different origin (port). Cross-origin
    // hops revalidate with the literal SSRF guard and reject private targets.
    let victimHits = 0;
    const victim = await listen((_req, res) => {
      victimHits += 1;
      res.writeHead(200);
      res.end('should-not-be-reached');
    });
    const { url, server } = await listen((_req, res) => {
      res.writeHead(302, { Location: `${victim.url}/secret` });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/start`, {
          method: 'GET',
          headers: { Authorization: 'Bearer secret-key' },
        }),
        (err: Error) => {
          assert.match(err.message, /Refusing OpenAI-compat redirect|private|loopback/i);
          return true;
        },
      );
      assert.equal(victimHits, 0, 'private redirect target must not receive a request');
    } finally {
      await close(server);
      await close(victim.server);
    }
  });

  it('throws when a redirect has no Location header', async () => {
    const { url, server } = await listen((_req, res) => {
      res.writeHead(302);
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/nolo`, { method: 'GET' }),
        /missing Location/i,
      );
    } finally {
      await close(server);
    }
  });

  it('throws when redirect hop limit is exceeded', async () => {
    const { url, server } = await listen((req, res) => {
      // Bounce between two same-origin paths forever.
      const next = req.url === '/a' ? '/b' : '/a';
      res.writeHead(302, { Location: next });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/a`, { method: 'GET' }, { maxRedirects: 2 }),
        /redirect limit/i,
      );
    } finally {
      await close(server);
    }
  });

  it('allows exactly three redirects by default and rejects a fourth', async () => {
    const { url, server } = await listen((req, res) => {
      const hop = Number(req.url?.slice(1) || 0);
      if (hop < 4) {
        res.writeHead(302, { Location: `/${hop + 1}` });
        res.end();
        return;
      }
      res.writeHead(200);
      res.end('done');
    });
    try {
      const res = await fetchOpenAICompat(`${url}/1`, { method: 'GET' });
      assert.equal(res.status, 200);
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/0`, { method: 'GET' }),
        /redirect limit/i,
      );
    } finally {
      await close(server);
    }
  });

  it('rejects invalid redirect limits before making a request', async () => {
    await assert.rejects(
      () => fetchOpenAICompat('https://api.openai.com/v1', {}, { maxRedirects: Number.POSITIVE_INFINITY }),
      /non-negative integer/i,
    );
    await assert.rejects(
      () => fetchOpenAICompat('https://api.openai.com/v1', {}, { maxRedirects: -1 }),
      /non-negative integer/i,
    );
  });

  it('LLM provider path rejects a redirect pivot to metadata (end-to-end)', async () => {
    const { url, server } = await listen((_req, res) => {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'sk-test' });
      await assert.rejects(
        () => provider.generate({ model: 'x', contents: 'hi' } as GenerateContentParameters),
        /Refusing OpenAI-compat redirect|private|metadata|link-local/i,
      );
    } finally {
      await close(server);
    }
  });

  it('embedding, image, and TTS providers reject metadata redirects end-to-end', async () => {
    const { url, server } = await listen((_req, res) => {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    });
    const expected = /Refusing OpenAI-compat redirect|private|metadata|link-local/i;
    try {
      const embedding = makeOpenAICompatEmbeddingProvider({ baseURL: url, apiKey: 'sk-test', model: 'embed' });
      const image = makeOpenAICompatImageProvider({ baseURL: url, apiKey: 'sk-test', model: 'image' });
      const tts = makeOpenAICompatTTSProvider({ baseURL: url, apiKey: 'sk-test', model: 'tts' });
      await assert.rejects(() => embedding.embed('private input'), expected);
      await assert.rejects(() => image.generate('private prompt'), expected);
      await assert.rejects(() => tts.speak('private speech'), expected);
    } finally {
      await close(server);
    }
  });

  it('production rejects an initial private target unless the explicit override is set', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousOverride = process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
    let hits = 0;
    const { url, server } = await listen((_req, res) => {
      hits += 1;
      res.writeHead(200);
      res.end('ok');
    });
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/private`, { method: 'GET' }),
        /Refusing outbound AI-provider request|private|loopback/i,
      );
      assert.equal(hits, 0);

      process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
      const res = await fetchOpenAICompat(`${url}/private`, { method: 'GET' });
      assert.equal(res.status, 200);
      assert.equal(hits, 1);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousOverride === undefined) delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      else process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = previousOverride;
      await close(server);
    }
  });

  it('rejects protocol-relative Location that resolves to a private host', async () => {
    const { url, server } = await listen((_req, res) => {
      // Resolves against current http://127.0.0.1:port → http://169.254.169.254/...
      res.writeHead(302, { Location: '//169.254.169.254/latest/meta-data/' });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/proto-rel`, { method: 'GET' }),
        /Refusing OpenAI-compat redirect|private|metadata|link-local/i,
      );
    } finally {
      await close(server);
    }
  });

  it('rejects non-http and userinfo redirect targets even with private targets allowed', async () => {
    const previous = process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
    process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    const { url, server } = await listen((req, res) => {
      res.writeHead(302, {
        Location: req.url === '/scheme'
          ? 'file:///etc/passwd'
          : 'http://user:pass@localhost/private',
      });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/scheme`, { method: 'GET' }),
        /http or https scheme/i,
      );
      await assert.rejects(
        () => fetchOpenAICompat(`${url}/userinfo`, { method: 'GET' }),
        /userinfo/i,
      );
    } finally {
      if (previous === undefined) delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      else process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = previous;
      await close(server);
    }
  });

  it('rejects a body-preserving cross-origin redirect before disclosing request content', async () => {
    const previous = process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
    process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    let victimHits = 0;
    const victim = await listen((_req, res) => {
      victimHits += 1;
      res.writeHead(200);
      res.end();
    });
    const start = await listen((_req, res) => {
      res.writeHead(307, { Location: `${victim.url}/collect` });
      res.end();
    });
    try {
      await assert.rejects(
        () => fetchOpenAICompat(`${start.url}/start`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer secret-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: 'private draft text' }),
        }),
        /cross-origin 307 redirect with request body/i,
      );
      assert.equal(victimHits, 0);
    } finally {
      if (previous === undefined) delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      else process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = previous;
      await close(start.server);
      await close(victim.server);
    }
  });

  it('applies Fetch POST-to-GET semantics on a cross-origin 302', async () => {
    const previous = process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
    process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    let finalMethod = '';
    let finalAuth: string | undefined;
    let finalBody = '';
    const final = await listen((req, res) => {
      finalMethod = req.method ?? '';
      finalAuth = req.headers.authorization;
      req.setEncoding('utf8');
      req.on('data', chunk => { finalBody += chunk; });
      req.on('end', () => {
        res.writeHead(200);
        res.end('ok');
      });
    });
    const start = await listen((_req, res) => {
      res.writeHead(302, { Location: `${final.url}/done` });
      res.end();
    });
    try {
      const res = await fetchOpenAICompat(`${start.url}/start`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'private draft text' }),
      });
      assert.equal(res.status, 200);
      assert.equal(finalMethod, 'GET');
      assert.equal(finalAuth, undefined);
      assert.equal(finalBody, '');
    } finally {
      if (previous === undefined) delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      else process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = previous;
      await close(start.server);
      await close(final.server);
    }
  });

  it('strips Authorization on a successful cross-origin hop when private targets are allowed', async () => {
    const prev = process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
    process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    try {
      let finalAuth: string | undefined;
      const final = await listen((req, res) => {
        finalAuth = req.headers.authorization;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      const start = await listen((_req, res) => {
        res.writeHead(302, { Location: `${final.url}/done` });
        res.end();
      });
      try {
        const res = await fetchOpenAICompat(`${start.url}/start`, {
          method: 'GET',
          headers: { Authorization: 'Bearer secret-key' },
        });
        assert.equal(res.status, 200);
        assert.equal(finalAuth, undefined, 'Authorization must not cross origins');
      } finally {
        await close(start.server);
        await close(final.server);
      }
    } finally {
      if (prev === undefined) delete process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS;
      else process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = prev;
    }
  });
});
