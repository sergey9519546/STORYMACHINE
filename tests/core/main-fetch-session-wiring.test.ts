// main.tsx cannot be imported under `node --experimental-strip-types` (it
// calls createRoot(document.getElementById("root")!) at module scope, which
// requires a DOM this repo's test harness does not provide — see
// CLAUDE.md). Source-level assertions instead confirm the fetch wrapper
// routes its same-origin '/api/' detection through session.ts's
// isSameOriginApiRequest (unit-tested directly in session.test.ts) rather
// than the old `typeof input === "string"` check, which silently passed a
// Request/URL input through unmodified instead of attaching X-Session-Id.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MAIN_SRC = path.resolve(import.meta.dirname, "../../src/main.tsx");

describe("main.tsx fetch wrapper — session-header decision wiring", () => {
  const source = fs.readFileSync(MAIN_SRC, "utf8");

  it("imports and calls the telemetry-aware session-header decision helper", () => {
    assert.match(
      source,
      /import\s*\{[^}]*shouldAttachSessionHeader[^}]*\}\s*from\s*["']\.\/lib\/session\.ts["']/,
    );
    const idx = source.indexOf("window.fetch = ((input");
    const body = source.slice(idx, idx + 900);
    assert.match(body, /shouldAttachSessionHeader\(input, window\.location\.origin\)/);
  });

  it("no longer gates on `typeof input === \"string\"` alone", () => {
    assert.doesNotMatch(
      source,
      /typeof input === "string" \? input : undefined/,
      "the narrow string-only URL detection should be replaced by isSameOriginApiRequest",
    );
  });

  it("the wrapper's early-return guard calls shouldAttachSessionHeader with the live origin", () => {
    const idx = source.indexOf("window.fetch = ((input");
    assert.ok(idx > -1, "expected the fetch override assignment");
    const body = source.slice(idx, idx + 900);
    assert.match(body, /shouldAttachSessionHeader\(input, window\.location\.origin\)/);
  });

  it("falls back to the Request's own headers when init carries none, instead of dropping them", () => {
    const idx = source.indexOf("window.fetch = ((input");
    const body = source.slice(idx, idx + 900);
    assert.match(
      body,
      /init\?\.headers\s*\?\?\s*\(input instanceof Request \? input\.headers : undefined\)/,
      "a Request input's own headers must be preserved when no separate init.headers is given",
    );
  });
});
