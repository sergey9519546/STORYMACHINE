import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

interface PackageLock {
  packages: Record<string, { version?: string }>;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  engines?: { node?: string };
}

const manifestUrl = new URL('../../package.json', import.meta.url);
const lockUrl = new URL('../../package-lock.json', import.meta.url);

function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(match, `expected a stable semantic version, received ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(version: string, floor: string): boolean {
  const actual = parseVersion(version);
  const minimum = parseVersion(floor);
  for (let index = 0; index < actual.length; index++) {
    if (actual[index]! !== minimum[index]!) return actual[index]! > minimum[index]!;
  }
  return true;
}

describe('committed dependency resolution security floors', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8')) as PackageManifest;
  const lock = JSON.parse(await readFile(lockUrl, 'utf8')) as PackageLock;

  it('requires a Node runtime supported by the patched PDF parser', () => {
    assert.equal(manifest.engines?.node, '>=22.13.0 || >=24');
  });

  it('resolves pdfjs-dist at or above the GHSA-hq66-cqwq-w95j fix', () => {
    assert.equal(manifest.dependencies?.['pdfjs-dist'], '^6.2.108');
    const version = lock.packages['node_modules/pdfjs-dist']?.version;
    assert.ok(version, 'pdfjs-dist must be present in package-lock.json');
    assert.ok(isAtLeast(version, '6.2.108'), `pdfjs-dist ${version} is below 6.2.108`);
  });

  it('resolves every nanoid line at its applicable denial-of-service fix', () => {
    const resolutions = Object.entries(lock.packages)
      .filter(([path]) => path === 'node_modules/nanoid' || path.endsWith('/node_modules/nanoid'))
      .map(([path, entry]) => [path, entry.version] as const);

    assert.ok(resolutions.length > 0, 'expected at least one nanoid resolution');
    for (const [path, version] of resolutions) {
      assert.ok(version, `${path} must declare a resolved version`);
      const major = parseVersion(version)[0];
      const floor = major === 3 ? '3.3.17' : major === 5 ? '5.1.16' : undefined;
      assert.ok(floor, `${path} resolved an unreviewed nanoid major: ${version}`);
      assert.ok(isAtLeast(version, floor), `${path} resolves nanoid ${version}, below ${floor}`);
    }
  });

  it('resolves esbuild at or above the GHSA-g7r4-m6w7-qqqr fix', () => {
    const version = lock.packages['node_modules/esbuild']?.version;
    assert.ok(version, 'esbuild must be present in package-lock.json');
    assert.ok(isAtLeast(version, '0.28.1'), `esbuild ${version} is below 0.28.1`);
  });
});
