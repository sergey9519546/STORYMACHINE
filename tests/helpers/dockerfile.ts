// Shared Dockerfile reader for source-text guard tests.
//
// Extracted 2026-09-18 from tests/core/dockerfile-toolchain.test.ts, where it
// was written and hardened over three review rounds (see that file's header
// for each defeat it closes), so that tests/core/healthcheck-address.test.ts
// reads the Dockerfile the SAME way instead of carrying a second, weaker copy
// of the same parser. Behaviour is unchanged by the move; the toolchain
// guard's own fixtures still exercise every normalization below.

export interface Stage {
  /** Stage alias from `AS <name>`, or the 1-based index when unnamed. */
  name: string;
  /** The FROM target verbatim — an image (the shipped `node:*-alpine`) OR a stage alias. */
  base: string;
  /** Live (comment-stripped, continuation- and heredoc-joined) instructions. */
  instructions: string[];
  /** `ARG NAME=value` instructions declared before the first FROM. */
  globalArgs: string[];
}

/**
 * Split a Dockerfile into stages of LIVE instructions only.
 *
 * Three normalizations happen here and all are load-bearing:
 *  - comment-only lines are dropped (see tests/core/dockerfile-toolchain.test.ts's
 *    header — the real Dockerfile's prose quotes the very commands the
 *    guards check for, so a guard that read comments would pass on prose);
 *  - backslash line-continuations are joined into one logical instruction, so
 *    a toolchain split across several lines still reads as one `RUN`;
 *  - a `RUN <<EOF` heredoc body is folded into its own RUN instruction
 *    (round-2 review item 3) instead of being read as loose instructions that
 *    belong to nothing.
 */
export function parseStages(source: string): Stage[] {
  const rawLines = source.split(/\r?\n/);

  // Drop comment-only lines first, then join continuations. Doing it in this
  // order means a comment sitting INSIDE a continued instruction (legal in a
  // Dockerfile) cannot smuggle text into the joined logical line. A `#` line
  // inside a heredoc is a shell comment, so dropping it there is right too.
  const live = rawLines.filter((line) => !/^\s*#/.test(line));

  const logical: string[] = [];
  let buffer = '';
  let heredocTerminator: string | null = null;
  for (const line of live) {
    if (heredocTerminator !== null) {
      if (line.trim() === heredocTerminator) {
        logical.push(buffer.trim());
        buffer = '';
        heredocTerminator = null;
        continue;
      }
      buffer += `\n${line}`;
      continue;
    }
    if (/\\\s*$/.test(line)) {
      buffer += `${line.replace(/\\\s*$/, '')} `;
      continue;
    }
    const joined = `${buffer}${line}`.trim();
    buffer = '';
    const heredoc = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*$/.exec(joined);
    if (heredoc !== null && /^RUN\b/i.test(joined)) {
      heredocTerminator = heredoc[1];
      buffer = joined;
      continue;
    }
    logical.push(joined);
  }
  if (buffer.trim() !== '') logical.push(buffer.trim());

  const stages: Stage[] = [];
  const globalArgs: string[] = [];
  for (const instruction of logical) {
    if (instruction === '') continue;
    // `--platform=…` and any other FROM flag must not hide the stage
    // (round-2 review item 3: the round-1 regex refused the whole line).
    const from = /^FROM\s+((?:--\S+\s+)*)(\S+)(?:\s+AS\s+(\S+))?\s*$/i.exec(instruction);
    if (from) {
      stages.push({
        name: from[3] ?? String(stages.length + 1),
        base: from[2],
        instructions: [],
        globalArgs,
      });
      continue;
    }
    if (stages.length === 0) {
      if (/^ARG\b/i.test(instruction)) globalArgs.push(instruction);
      continue;
    }
    stages[stages.length - 1].instructions.push(instruction);
  }
  return stages;
}
