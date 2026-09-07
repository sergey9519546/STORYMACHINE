// Round-3 of the feature-length FindingJump lane (2026-09-07).
//
// Round 2 made Per-Pass appendix "no location" notes NOT tab stops
// (ScriptDoctorPanel.tsx jumpFocusable={false} → FindingJump focusable={false}),
// so a keyboard writer is not asked to Tab through ~345 reasons on a list
// they cannot act on. The measurement (374 notes, 29 tab stops on the
// 231-scene fixture) lived in the commit message. The browser step still
// inspected `.first()` and demanded tabindex=0 — so reverting the appendix
// flag, or making every note a tab stop again, still passed.
//
// This file is the source-level half of that lock (no jsdom — same convention
// as tests/core/scriptide-render-loop-guard.test.ts). The driven half is
// scripts/verify-p2-p3-surfaces.mjs's P2-featurelen phase, which now counts
// `[data-no-location-focusable]` separately from `[data-no-location]`.
//
// Both directions: the appendix is opted OUT of tab stops, and the act-on
// surfaces (Top Priorities, root-cause headlines, expander member rows) are
// NOT opted out — a future "make them all unfocusable" would also be a
// regression.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const jump = read("../../src/components/scriptide/FindingJump.tsx");
const panel = read("../../src/components/scriptide/ScriptDoctorPanel.tsx");

describe("FindingJump — focusable governs the no-location tab stop, not the reason", () => {
  it("omits tabindex and data-no-location-focusable when focusable is false", () => {
    assert.match(
      jump,
      /tabIndex=\{focusable \? 0 : undefined\}/,
      "tabIndex must be 0 only when focusable is true — a hardcoded 0 reintroduces the 345-stop appendix flood",
    );
    assert.match(
      jump,
      /data-no-location-focusable=\{focusable \? "" : undefined\}/,
      "the browser gate counts this attribute to split act-on notes from appendix notes",
    );
  });

  it("still stamps data-no-location and the reason on BOTH branches", () => {
    // Reverting only the tab stop must not resurrect the original defect
    // (unlocatable findings rendering nothing, or rendering without a reason).
    assert.match(jump, /data-no-location=""/);
    assert.match(jump, /aria-label=\{reason\}/);
    assert.match(jump, /title=\{reason\}/);
    assert.match(jump, /role="note"/);
  });
});

describe("ScriptDoctorPanel — only the Per-Pass appendix opts out of tab stops", () => {
  it("the Per-Pass Breakdown IssueCard passes jumpFocusable={false}", () => {
    // The appendix is the only IssueCard in this file that passes the flag.
    // Pin the call, not a count of the word, so a second silent `false` on
    // Top Priorities would fail the next test rather than this one.
    assert.match(
      panel,
      /jump=\{jumpForIssue\(issue\.location\)\}\s*\n\s*onJump=\{onNavigateToFinding\}\s*\n\s*\/\/ The appendix:[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*jumpFocusable=\{false\}/,
      "the Per-Pass appendix IssueCard must pass jumpFocusable={false} with its identifying comment",
    );
  });

  it("Top Priorities IssueCard does not pass jumpFocusable={false}", () => {
    const top = panel.match(
      /\{report\.topPriorities\.map\(\(issue, i\) => \(\s*<IssueCard[\s\S]*?\/>\s*\)\)\}/,
    );
    assert.ok(top, "Top Priorities must still render IssueCard");
    assert.doesNotMatch(
      top[0],
      /jumpFocusable=\{false\}/,
      "Top Priorities are an act-on surface — their no-location notes must stay tab stops",
    );
  });

  it("root-cause headlines and member-rule FindingJumps do not pass focusable={false}", () => {
    // RootCauseCard uses FindingJump directly (not IssueCard). Round 2 left
    // those on the default (focusable=true): a writer who opened an expander
    // or is reading a headline can still Tab to the reason.
    const card = panel.match(/function RootCauseCard\([\s\S]*?\n\}/);
    assert.ok(card, "RootCauseCard must still exist");
    assert.doesNotMatch(
      card[0],
      /focusable=\{false\}/,
      "root-cause headline and member-rule notes are act-on surfaces",
    );
  });

  it("jumpFocusable is wired through to FindingJump, not swallowed", () => {
    assert.match(
      panel,
      /<FindingJump target=\{jump\} onJump=\{onJump\} focusable=\{jumpFocusable\} \/>/,
      "IssueCard must forward jumpFocusable to FindingJump — a dropped prop makes the appendix flag a no-op",
    );
  });
});
