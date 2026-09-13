#!/usr/bin/env node
// scripts/tap-failures.mjs — a compact failure summary from a TAP13 stream.
//
// WHY THIS EXISTS (2026-09-13, ci-concurrency lane round 2, item 7): the
// GitHub Actions job-log API returns only the LAST ~100 KB of a job's log.
// `npm test` (scripts/run-tests.mjs) runs ~13,800 tests over ~7 minutes and
// node:test's non-TTY reporter is TAP — a full stream far bigger than
// 100 KB. Found reading a red run (34741928418) whose job summary said
// "# fail 2" with no way to name the two failures from the API: the `not
// ok` lines and their diagnostics had already scrolled out of the readable
// tail. This script pulls just the failing tests (a `not ok` line plus its
// `location:` and `error:`) out of a saved TAP file — a few hundred bytes
// per failure — and CI prints that at the end of the job (see ci.yml's
// "Print test failure summary" step, `if: always()`), where it survives the
// truncation even when the full stream does not. The full stream itself is
// still uploaded as a workflow artifact by the following step, for when
// more context than the summary gives is needed.
//
// A node:test failure's diagnostic block is a YAML-ish blob bounded by a
// `  ---` line and a `  ...` line (see any `not ok` in a real run for the
// exact shape). `error:` is usually a block scalar (`error: |-`), whose body
// is every following line indented deeper than `error:` itself, until a
// dedent back to `errorIdx`'s own indent or shallower.
import { readFileSync } from 'node:fs';

/**
 * @param {string} tap raw TAP13 text
 * @returns {{num: string, name: string, location: string, error: string}[]}
 */
export function extractFailures(tap) {
  const lines = tap.split('\n');
  const failures = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^not ok (\d+) - (.*)$/.exec(lines[i]);
    if (!m) continue;
    const [, num, name] = m;

    // The diagnostic block runs from the next line that is exactly `---`
    // (once trimmed) to the next line that is exactly `...`. A test with no
    // diagnostic block at all (should not happen for a real node:test
    // failure, but a hand-written fixture might omit one) yields "(no
    // diagnostic block)" for both fields rather than scanning past the next
    // failure's own block.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '---' && !/^not ok \d+ - /.test(lines[j])) j++;
    if (j >= lines.length || lines[j].trim() !== '---') {
      failures.push({ num, name, location: '(no diagnostic block)', error: '(no diagnostic block)' });
      continue;
    }
    const blockStart = j + 1;
    let k = blockStart;
    while (k < lines.length && lines[k].trim() !== '...') k++;
    const block = lines.slice(blockStart, k);

    const locationLine = block.find((l) => /^\s*location:/.test(l));
    const location = locationLine
      ? locationLine.replace(/^\s*location:\s*/, '').trim()
      : '(no location field)';

    const errorIdx = block.findIndex((l) => /^\s*error:/.test(l));
    let error = '(no error field)';
    if (errorIdx !== -1) {
      const errorLine = block[errorIdx];
      const errorIndent = errorLine.search(/\S/);
      const inline = errorLine.replace(/^\s*error:\s*/, '').trim();
      if (inline !== '' && inline !== '|-' && inline !== '|' && inline !== '>-' && inline !== '>') {
        // A short error is emitted inline: `error: some message`.
        error = inline;
      } else {
        // A block scalar: collect every following line indented deeper than
        // `error:` itself, stopping at the first dedent back to it or
        // shallower (the next sibling YAML key).
        const body = [];
        for (let e = errorIdx + 1; e < block.length; e++) {
          const l = block[e];
          if (l.trim() === '') continue;
          if (l.search(/\S/) <= errorIndent) break;
          body.push(l.trim());
        }
        error = body.join(' ').trim() || '(empty error body)';
      }
    }

    failures.push({ num, name, location, error });
  }
  return failures;
}

/** @param {ReturnType<typeof extractFailures>} failures */
export function renderSummary(failures) {
  if (failures.length === 0) {
    return 'FAILURE SUMMARY: no `not ok` lines found in the TAP stream — nothing to report.\n';
  }
  const lines = [
    `FAILURE SUMMARY: ${failures.length} failing test(s) (full TAP output is the uploaded workflow artifact)`,
    '',
  ];
  for (const f of failures) {
    lines.push(`not ok ${f.num} - ${f.name}`);
    lines.push(`  location: ${f.location}`);
    lines.push(`  error: ${f.error}`);
    lines.push('');
  }
  return lines.join('\n');
}

// Run as a script (skipped when imported by the test file).
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/tap-failures.mjs <tap-file>');
    process.exit(2);
  }
  let tap;
  try {
    tap = readFileSync(file, 'utf8');
  } catch (err) {
    // A missing file means an earlier step (npm ci, lint, ...) failed before
    // "Run tests" ever ran — that is not this script's job to diagnose, and
    // `if: always()` means this step still runs in that case. Report it
    // plainly and exit 0: this is a summary aid, not a gate of its own.
    console.log(`FAILURE SUMMARY: no TAP file at ${file} (${err.code ?? err.message}) — `
      + 'the "Run tests" step likely never ran because an earlier step failed.');
    process.exit(0);
  }
  process.stdout.write(renderSummary(extractFailures(tap)));
}
