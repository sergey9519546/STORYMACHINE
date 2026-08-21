// E5 (docs/PATH_TO_EXCELLENCE.md): pure, DOM-free coverage for the command
// palette's registry-filtering logic — the only slice of the palette that
// can get real, runnable unit tests in this repo (no jsdom/browser harness,
// see CLAUDE.md). React wiring (registry construction, dispatch-through-
// same-handler, Escape-ladder priority) is covered by
// tests/core/command-palette-wiring.test.ts's source assertions instead.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scorePaletteMatch, filterPaletteActions, type PaletteSearchable } from "../../src/lib/command-palette.ts";

describe("scorePaletteMatch", () => {
  it("scores an exact label match highest", () => {
    const exact = scorePaletteMatch("Settings", undefined, "Settings");
    const prefix = scorePaletteMatch("Settings Panel", undefined, "Settings");
    assert.ok(exact > prefix, `exact (${exact}) should outrank prefix (${prefix})`);
  });

  it("is case-insensitive on both sides", () => {
    assert.equal(scorePaletteMatch("Settings", undefined, "settings"), scorePaletteMatch("Settings", undefined, "SETTINGS"));
    assert.ok(scorePaletteMatch("SHIP", undefined, "ship") > 0);
  });

  it("ranks a label-prefix match above a mid-word substring match", () => {
    const prefix = scorePaletteMatch("Diagnose this draft", undefined, "diag");
    const midword = scorePaletteMatch("Re-diagnose", undefined, "diag");
    assert.ok(prefix > midword, `prefix (${prefix}) should outrank mid-word substring (${midword})`);
  });

  it("ranks a word-boundary substring match above a mid-word one", () => {
    const boundary = scorePaletteMatch("Open Ship panel", undefined, "ship");
    const midword = scorePaletteMatch("Reshipment", undefined, "ship");
    assert.ok(boundary > midword, `word-boundary (${boundary}) should outrank mid-word (${midword})`);
  });

  it("falls back to keyword matches when the label itself doesn't match", () => {
    const score = scorePaletteMatch("Open Ship", ["fdx", "final draft"], "fdx");
    assert.ok(score > 0);
    assert.equal(scorePaletteMatch("Open Ship", [], "fdx"), 0);
  });

  it("keyword exact beats keyword substring", () => {
    const exact = scorePaletteMatch("X", ["doctor"], "doctor");
    const substring = scorePaletteMatch("Y", ["redoctored"], "doctor");
    assert.ok(exact > substring);
  });

  it("does NOT fuzzy-match a character subsequence — literal matches only", () => {
    // Deliberate: see scorePaletteMatch's doc comment for why a
    // subsequence fallback was tried and removed. "ship" is a
    // subsequence of "Diagnose this draft (Script Doctor)"
    // (s···h···i···p, none adjacent) but should NOT match.
    assert.equal(scorePaletteMatch("Diagnose this draft (Script Doctor)", undefined, "ship"), 0);
  });

  it("returns 0 (no match) when nothing lines up at all", () => {
    assert.equal(scorePaletteMatch("Settings", ["labs", "config"], "xyz123"), 0);
  });
});

describe("filterPaletteActions", () => {
  const registry: (PaletteSearchable & { id: string })[] = [
    { id: "go-write", label: "Go to Write" },
    { id: "go-coverage", label: "Diagnose this draft (Script Doctor)", keywords: ["doctor", "coverage", "run"] },
    { id: "go-ship", label: "Open Ship (export & versions)" },
    { id: "export-pdf", label: "Export as PDF" },
    { id: "export-fdx", label: "Export as Final Draft (.fdx)", keywords: ["fdx", "final draft"] },
    { id: "toggle-dark", label: "Switch to dark mode", keywords: ["dark mode", "theme"] },
  ];

  it("an empty query returns every action, unchanged order (the curated registry order)", () => {
    assert.deepEqual(
      filterPaletteActions(registry, "").map((a) => a.id),
      registry.map((a) => a.id),
    );
    assert.deepEqual(
      filterPaletteActions(registry, "   ").map((a) => a.id),
      registry.map((a) => a.id),
    );
  });

  it("filters out actions that don't match at all", () => {
    const result = filterPaletteActions(registry, "pdf");
    assert.deepEqual(result.map((a) => a.id), ["export-pdf"]);
  });

  it("ranks the best match first when multiple actions match", () => {
    // "export" is a label-PREFIX on both export rows (score 90, tied — the
    // stable sort keeps their original registry order) and also appears
    // mid-label in go-ship's "Open Ship (export & versions)" (a lower-
    // scoring plain substring, not a prefix) — all three genuinely match,
    // ranked by how well.
    const result = filterPaletteActions(registry, "export");
    assert.deepEqual(result.map((a) => a.id), ["export-pdf", "export-fdx", "go-ship"]);
  });

  it("a query only present in a keyword still surfaces the action", () => {
    const result = filterPaletteActions(registry, "fdx");
    assert.deepEqual(result.map((a) => a.id), ["export-fdx"]);
  });

  it("a query matching nothing returns an empty list", () => {
    assert.deepEqual(filterPaletteActions(registry, "zzz-nope"), []);
  });

  it("word-boundary label matches outrank keyword-only matches", () => {
    // "ship" is a real word inside go-ship's label; nothing else in this
    // registry mentions it at all.
    const result = filterPaletteActions(registry, "ship");
    assert.deepEqual(result.map((a) => a.id), ["go-ship"]);
  });
});
