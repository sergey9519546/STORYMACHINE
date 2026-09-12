// What the P0 smoke gate is SERVED, pinned so it cannot drift from what the
// documents say again.
//
// ── Why this exists (2026-09-12, adversarial batch) ─────────────────────────
//
// `verify:p0-flow` booted with `NODE_ENV` unset, so `server/app.ts:279` took
// its Vite-dev-middleware branch — and nothing in the gate's output, its
// header, or its brief said so. The batch's p0-flow reviewer had to boot the
// server by hand and grep the markup for `/@vite/client` to establish which
// app the repo's golden-path gate (the one that blocks `publish` in
// `release.yml`) had been certifying. A gate whose subject is only knowable
// by re-deriving it is a gate whose documents will drift from it.
//
// Three things are pinned here, each the failure that actually happened:
//   1. the gate asks for the built `dist/` — in BOTH of its boots;
//   2. `serveModeOf` really distinguishes the two front ends, driven rather
//      than grepped, including the "neither" case;
//   3. `distStaleness` fires on a stale/missing `dist/`, so the freshness
//      rule that lets the gate build-or-refuse has been shown to fire.
// Plus the sentence in the documents that WAS false, so its return is a red
// test rather than a rediscovery.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  SERVE_BUILT_DIST,
  SERVE_VITE_DEV,
  distStaleness,
  serveModeOf,
} from '../../scripts/lib/browser-verify.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => readFileSync(path.join(REPO, rel), 'utf8');

describe('the P0 smoke gate serves the built dist/, and says which', () => {
  it('both of its keyless boots ask for the built dist/', () => {
    const gate = read('scripts/smoke-p0-live-flow.mjs');
    const boots = gate.match(/= await bootKeylessServer\(\{/g) ?? [];
    assert.equal(boots.length, 2, 'the gate boots exactly two servers (the main one and step 3e\'s budget server)');
    // Per CALL, not a count over the file: a header comment that mentions the
    // constant must not be able to stand in for a boot that passes it.
    for (const [n, after] of gate.split('= await bootKeylessServer({').slice(1).entries()) {
      const call = after.slice(0, after.indexOf('});') + 1);
      assert.ok(
        /serve:\s*SERVE_BUILT_DIST/.test(call),
        `bootKeylessServer call ${n + 1} does not pass serve: SERVE_BUILT_DIST — a boot left on the dev `
          + 'default certifies an app the published image does not serve, which is the defect this file exists for',
      );
    }
    // The name, not the string: one spelling of each mode, exported once.
    assert.match(gate, /SERVE_BUILT_DIST,\n/, 'the gate imports the constant rather than retyping the literal');
  });

  it('bootKeylessServer reads the mode back off the wire and refuses a mismatch', () => {
    const helper = read('scripts/lib/browser-verify.mjs');
    assert.match(helper, /export async function serveModeOf/);
    assert.match(helper, /export function ensureBuiltDist/);
    assert.match(helper, /const served = await serveModeOf\(base\);/);
    assert.match(
      helper,
      /if \(served\.mode !== serve\) \{[\s\S]*?throw new Error\(/,
      'a boot that comes up in the other front end must throw, not be certified as the one that was asked for',
    );
    assert.match(
      helper,
      /if \(serve === SERVE_BUILT_DIST\) ensureBuiltDist\(/,
      'a dist-served boot must guarantee dist/ is this tree\'s before the server starts',
    );
  });

  it('serveModeOf tells the two front ends apart (driven, both directions, plus neither)', async () => {
    const stub = (html: string) => async () => ({ text: async () => html });
    const dev = await serveModeOf('http://127.0.0.1:1/', stub(
      '<!doctype html><script type="module" src="/@vite/client"></script>',
    ) as never);
    assert.equal(dev.mode, SERVE_VITE_DEV);
    const dist = await serveModeOf('http://127.0.0.1:1/', stub(
      '<!doctype html><script type="module" crossorigin src="/assets/index-MmPcFF4j.js"></script>',
    ) as never);
    assert.equal(dist.mode, SERVE_BUILT_DIST);
    assert.match(dist.evidence, /index-MmPcFF4j\.js/, 'the evidence names the asset it classified on');
    // A markup shape that is neither must not be silently called one of them.
    const neither = await serveModeOf('http://127.0.0.1:1/', stub('<!doctype html><body>nothing</body>') as never);
    assert.equal(neither.mode, 'unknown');
  });

  it('distStaleness fires on a missing dist/, on a stale one, and not on a current one', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dist-staleness-'));
    mkdirSync(path.join(root, 'src'));
    mkdirSync(path.join(root, 'public', 'fonts'), { recursive: true });
    writeFileSync(path.join(root, 'src', 'main.tsx'), 'x');
    writeFileSync(path.join(root, 'index.html'), 'x');
    writeFileSync(path.join(root, 'public', 'favicon.svg'), '<svg/>');
    writeFileSync(path.join(root, 'public', 'fonts', 'inter-400.woff2'), 'font');
    writeFileSync(path.join(root, 'tsconfig.json'), '{}');

    assert.match(distStaleness({ repo: root }).reason ?? '', /dist\/index\.html does not exist/);

    mkdirSync(path.join(root, 'dist', 'assets'), { recursive: true });
    writeFileSync(path.join(root, 'dist', 'index.html'), 'built');
    assert.equal(distStaleness({ repo: root }).reason, null, 'a dist/ newer than every input is current');

    // The real regression: a source edit AFTER the build. Touch the input
    // forward rather than sleeping — the rule is an mtime comparison.
    const future = new Date(Date.now() + 60_000);
    utimesSync(path.join(root, 'src', 'main.tsx'), future, future);
    const stale = distStaleness({ repo: root });
    assert.match(stale.reason ?? '', /older than src[/\\]main\.tsx/, 'a source file newer than the build makes dist/ stale');

    // index.html at the repo root is a build input too, not just src/.
    const fresh = new Date(Date.now() + 120_000);
    writeFileSync(path.join(root, 'dist', 'index.html'), 'rebuilt');
    utimesSync(path.join(root, 'dist', 'index.html'), fresh, fresh);
    assert.equal(distStaleness({ repo: root }).reason, null);
    const later = new Date(Date.now() + 180_000);
    utimesSync(path.join(root, 'index.html'), later, later);
    assert.match(distStaleness({ repo: root }).reason ?? '', /older than index\.html/);
  });

  it('distStaleness fires on public/ — the input that was missing (review round 1, blocking)', () => {
    // WHY THIS FIXTURE EXISTS: `public/` is copied VERBATIM into `dist/` (the
    // favicon `index.html` links at :6, and the 11 `.woff2` faces
    // `src/index.css` loads from `/fonts/`), and the first version of
    // DIST_BUILD_INPUTS left it out. The reviewer edited `public/favicon.svg`,
    // distStaleness returned `reason: null`, the boot logged "dist/ is
    // current", and the served favicon was not the tree's. The two fixtures
    // above (src/, index.html) could not have caught it.
    const root = mkdtempSync(path.join(tmpdir(), 'dist-staleness-public-'));
    mkdirSync(path.join(root, 'src'));
    mkdirSync(path.join(root, 'public', 'fonts'), { recursive: true });
    mkdirSync(path.join(root, 'dist', 'assets'), { recursive: true });
    writeFileSync(path.join(root, 'src', 'main.tsx'), 'x');
    writeFileSync(path.join(root, 'index.html'), 'x');
    writeFileSync(path.join(root, 'public', 'favicon.svg'), '<svg/>');
    writeFileSync(path.join(root, 'public', 'fonts', 'inter-400.woff2'), 'font');
    writeFileSync(path.join(root, 'tsconfig.json'), '{}');
    writeFileSync(path.join(root, 'dist', 'index.html'), 'built');
    assert.equal(distStaleness({ repo: root }).reason, null, 'the fixture starts current');

    // A content edit to the favicon, exactly the reviewer's plant.
    const future = new Date(Date.now() + 60_000);
    writeFileSync(path.join(root, 'public', 'favicon.svg'), '<svg data-edited="1"/>');
    utimesSync(path.join(root, 'public', 'favicon.svg'), future, future);
    assert.match(
      distStaleness({ repo: root }).reason ?? '',
      /older than public[/\\]favicon\.svg/,
      'an edit to a file copied verbatim into dist/ must make dist/ stale',
    );

    // A font face, nested one level deeper — the built stylesheet references
    // these by URL, so a replaced face ships without a rebuild.
    const rebuilt = new Date(Date.now() + 120_000);
    utimesSync(path.join(root, 'dist', 'index.html'), rebuilt, rebuilt);
    assert.equal(distStaleness({ repo: root }).reason, null);
    const later = new Date(Date.now() + 180_000);
    utimesSync(path.join(root, 'public', 'fonts', 'inter-400.woff2'), later, later);
    assert.match(distStaleness({ repo: root }).reason ?? '', /older than public[/\\]fonts[/\\]inter-400\.woff2/);

    // And root build configuration, which is matched by shape rather than
    // listed: this tree has only tsconfig.json, but a postcss/tailwind config
    // added tomorrow is covered the same day.
    const rebuilt2 = new Date(Date.now() + 240_000);
    utimesSync(path.join(root, 'dist', 'index.html'), rebuilt2, rebuilt2);
    assert.equal(distStaleness({ repo: root }).reason, null);
    const later2 = new Date(Date.now() + 300_000);
    utimesSync(path.join(root, 'tsconfig.json'), later2, later2);
    assert.match(distStaleness({ repo: root }).reason ?? '', /older than tsconfig\.json/);
    writeFileSync(path.join(root, 'postcss.config.js'), 'module.exports = {};');
    const later3 = new Date(Date.now() + 360_000);
    utimesSync(path.join(root, 'dist', 'index.html'), new Date(Date.now() + 330_000), new Date(Date.now() + 330_000));
    utimesSync(path.join(root, 'postcss.config.js'), later3, later3);
    assert.match(distStaleness({ repo: root }).reason ?? '', /older than postcss\.config\.js/);
  });

  it('this repository really does ship a public/ directory into dist/', () => {
    // The fixture above proves the RULE; this proves the rule is about THIS
    // repo — that `public/` is not a hypothetical input. If these two
    // references ever move, the input list should be re-audited, not the
    // assertion relaxed.
    assert.match(read('index.html'), /href="\/favicon\.svg"/, 'index.html links the public/ favicon');
    assert.match(read('src/index.css'), /url\("\/fonts\/[^"]+\.woff2"\)/, 'the stylesheet loads public/fonts faces');
  });

  it('no document still says verify:production is the only production-mode suite', () => {
    for (const [file, stale] of [
      ['README.md', 'every other suite boots with `NODE_ENV` unset'],
      ['CONTRIBUTING.md', 'the only suite that boots `NODE_ENV=production`'],
      ['.github/workflows/ci.yml', 'every OTHER\n  # suite boots with NODE_ENV unset'],
      ['docs/brain/Gates/Gate - Browser Battery Suites.md', 'is the only\nsuite that boots `NODE_ENV=production`'],
    ] as const) {
      assert.ok(
        !read(file).includes(stale),
        `${file} still carries the sentence that was false for ${'verify:p0-flow'}: "${stale}"`,
      );
    }
    // And each names the gate that moved, so the correction is positive, not
    // just a deletion.
    for (const file of ['README.md', 'CONTRIBUTING.md', '.github/workflows/ci.yml']) {
      const source = read(file);
      const gate = /(verify:p0-flow|smoke-p0-live-flow)/;
      const served = /(NODE_ENV=production|built `?dist\/`?)/;
      const near = new RegExp(
        `(?:${gate.source}[\\s\\S]{0,600}?${served.source})|(?:${served.source}[\\s\\S]{0,600}?${gate.source})`,
      );
      assert.ok(near.test(source), `${file} must say that the p0-flow gate serves the built dist/`);
    }
  });
});
