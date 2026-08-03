// src/lib/session.ts — mergeSessionHeader (pre-existing) and
// isSameOriginApiRequest (new, defect-4 hardening).
//
// main.tsx's fetch wrapper previously detected an '/api/' call with
// `typeof input === "string" && input.startsWith("/api/")`, so a future
// `fetch(new Request(...))` or `fetch(new URL(...))` would silently bypass
// X-Session-Id attachment instead of failing loudly. No current call site
// does this (verified via a repo-wide grep), so this closes a latent gap
// rather than fixing a live bug. isSameOriginApiRequest is the pure,
// DOM-free (well: URL/Request/Headers are Node globals, but no `window`)
// decision extracted so it is independently testable under plain Node,
// mirroring why mergeSessionHeader itself was already extracted this way.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSameOriginApiRequest, mergeSessionHeader } from "../../src/lib/session.ts";

const ORIGIN = "https://storymachine.example";

describe("mergeSessionHeader", () => {
  it("adds X-Session-Id to a plain object header map without dropping other headers", () => {
    const result = mergeSessionHeader({ "Content-Type": "application/json" }, "sess-1") as Record<string, string>;
    assert.equal(result["Content-Type"], "application/json");
    assert.equal(result["X-Session-Id"], "sess-1");
  });

  it("replaces a pre-existing X-Session-Id case-insensitively", () => {
    const result = mergeSessionHeader({ "x-session-id": "stale" }, "fresh") as Record<string, string>;
    assert.equal(Object.keys(result).length, 1);
    assert.equal(result["X-Session-Id"], "fresh");
  });

  it("merges into a real Headers instance", () => {
    const existing = new Headers({ Accept: "application/json" });
    const result = mergeSessionHeader(existing, "sess-2") as Headers;
    assert.ok(result instanceof Headers);
    assert.equal(result.get("Accept"), "application/json");
    assert.equal(result.get("X-Session-Id"), "sess-2");
  });

  it("merges into a [string, string][] header array, replacing any prior entry", () => {
    const result = mergeSessionHeader([["X-Session-Id", "old"], ["Accept", "text/plain"]], "new") as [
      string,
      string,
    ][];
    assert.deepEqual(
      result.sort((a, b) => a[0].localeCompare(b[0])),
      [["Accept", "text/plain"], ["X-Session-Id", "new"]],
    );
  });

  it("handles undefined existing headers", () => {
    const result = mergeSessionHeader(undefined, "sess-3") as Record<string, string>;
    assert.deepEqual(result, { "X-Session-Id": "sess-3" });
  });
});

describe("isSameOriginApiRequest — string input (unchanged contract)", () => {
  it("matches a relative '/api/...' path", () => {
    assert.equal(isSameOriginApiRequest("/api/scriptide/save", ORIGIN), true);
  });

  it("rejects a relative non-api path", () => {
    assert.equal(isSameOriginApiRequest("/health", ORIGIN), false);
  });

  it("rejects an absolute same-origin URL string (unchanged from prior behavior — no call site passes one)", () => {
    assert.equal(isSameOriginApiRequest(`${ORIGIN}/api/scriptide/save`, ORIGIN), false);
  });

  it("rejects an absolute cross-origin URL string", () => {
    assert.equal(isSameOriginApiRequest("https://evil.example/api/x", ORIGIN), false);
  });
});

describe("isSameOriginApiRequest — URL input (new)", () => {
  it("matches a same-origin '/api/' URL", () => {
    const url = new URL("/api/scriptide/load", ORIGIN);
    assert.equal(isSameOriginApiRequest(url, ORIGIN), true);
  });

  it("rejects a same-origin non-api URL", () => {
    const url = new URL("/index.html", ORIGIN);
    assert.equal(isSameOriginApiRequest(url, ORIGIN), false);
  });

  it("rejects a cross-origin '/api/' URL (never leak the session id off-origin)", () => {
    const url = new URL("https://evil.example/api/x");
    assert.equal(isSameOriginApiRequest(url, ORIGIN), false);
  });

  it("rejects a same path on a different port (origin includes port)", () => {
    const url = new URL("http://storymachine.example:8080/api/x");
    assert.equal(isSameOriginApiRequest(url, ORIGIN), false);
  });
});

describe("isSameOriginApiRequest — Request input (new)", () => {
  it("matches a same-origin '/api/' Request", () => {
    const req = new Request(`${ORIGIN}/api/scriptide/doctor`, { method: "POST" });
    assert.equal(isSameOriginApiRequest(req, ORIGIN), true);
  });

  it("rejects a same-origin non-api Request", () => {
    const req = new Request(`${ORIGIN}/favicon.ico`);
    assert.equal(isSameOriginApiRequest(req, ORIGIN), false);
  });

  it("rejects a cross-origin Request even when its path starts with /api/", () => {
    const req = new Request("https://evil.example/api/x");
    assert.equal(isSameOriginApiRequest(req, ORIGIN), false);
  });
});

describe("isSameOriginApiRequest — defensive behavior", () => {
  it("never throws on a malformed URL-ish string and safely returns false", () => {
    // Only string inputs literally starting with '/api/' are ever treated as
    // relative paths (matching the original contract); anything else takes
    // the URL-parse branch and must not throw even on garbage input.
    assert.doesNotThrow(() => isSameOriginApiRequest("not a url at all", ORIGIN));
    assert.equal(isSameOriginApiRequest("not a url at all", ORIGIN), false);
  });
});
