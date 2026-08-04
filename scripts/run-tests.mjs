import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Keep the suite boundary explicit: experimental engine/V5 test trees are not
// part of the current P0 research gate. Passing literal glob strings to Node's
// test runner runs zero tests on Windows, so discover the intended files here
// and pass concrete paths directly to Node.
const TEST_ROOTS = [
  'evals/scoring',
  'server/nvm/analyze',
  'server/nvm/proof',
  'tests/collab',
  'tests/core',
  'tests/e2e',
  'tests/nvm',
  'tests/passes',
  'tests/routes',
  'tests/scripts',
];

function collectTestFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTestFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) files.push(path);
  }
  return files;
}

const testFiles = TEST_ROOTS
  .flatMap((root) => collectTestFiles(resolve(root)))
  .sort();

if (testFiles.length === 0) {
  throw new Error('Test discovery found no files; refusing a false-green test run.');
}

console.log(`Running ${testFiles.length} test files.`);
const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...testFiles],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
