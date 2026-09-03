// Settings tab strip — the WAI-ARIA tabs keyboard pattern (roving tabindex).
//
// E5 shipped the roles (role="tablist"/"tab"/"tabpanel", aria-selected,
// aria-controls) and deferred the keyboard half, which left the strip in the
// worst of both worlds: it ANNOUNCED itself as a tab list to a screen reader
// and then behaved like eight ordinary buttons — eight Tab presses to cross,
// and arrow keys that did nothing at all.
//
// Two layers of coverage, matching this repo's established split (see
// tests/core/use-modal-focus-trap.test.ts's header): the DECISION is a pure
// function and is tested as one; the DOM wiring that feeds it has no jsdom
// harness here, so it is verified at the source level the same way
// tests/core/command-palette-wiring.test.ts verifies its own.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { nextRovingIndex } from '../../src/lib/roving-tabindex.ts';

const SRC = path.resolve(import.meta.dirname, '../../src');
const source = fs.readFileSync(path.join(SRC, 'components/SettingsPanel.tsx'), 'utf8');

describe('nextRovingIndex', () => {
  it('moves right and left one step at a time', () => {
    assert.equal(nextRovingIndex('ArrowRight', 0, 8), 1);
    assert.equal(nextRovingIndex('ArrowRight', 3, 8), 4);
    assert.equal(nextRovingIndex('ArrowLeft', 4, 8), 3);
  });

  it('wraps at both ends', () => {
    assert.equal(nextRovingIndex('ArrowRight', 7, 8), 0);
    assert.equal(nextRovingIndex('ArrowLeft', 0, 8), 7);
  });

  it('Home and End jump to the ends', () => {
    assert.equal(nextRovingIndex('Home', 5, 8), 0);
    assert.equal(nextRovingIndex('End', 5, 8), 7);
    assert.equal(nextRovingIndex('Home', 0, 8), 0);
    assert.equal(nextRovingIndex('End', 7, 8), 7);
  });

  it('returns null for every key the pattern does not own', () => {
    // Critically Tab (must leave the strip), Enter/Space (the browser's own
    // button activation) and ordinary typing — a handler that swallowed
    // these would break more than it fixed.
    for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a', 'ArrowUp', 'ArrowDown', 'PageUp']) {
      assert.equal(nextRovingIndex(key, 2, 8), null, `${key} must not be intercepted`);
    }
  });

  it('survives a nonsense current index instead of computing off the end', () => {
    assert.equal(nextRovingIndex('ArrowRight', 99, 8), 0);
    assert.equal(nextRovingIndex('ArrowLeft', -4, 8), 7);
    assert.equal(nextRovingIndex('ArrowRight', 0, 1), 0, 'a one-tab strip wraps to itself');
    assert.equal(nextRovingIndex('ArrowRight', 0, 0), null, 'an empty strip has nowhere to go');
  });
});

describe('SettingsPanel.tsx — tab strip wiring', () => {
  // Decision #3 (2026-09-03, docs/DECISION_LOG.md) put one derivation between
  // TAB_LABELS and the rendered strip: visibleSettingsTabs() drops the five
  // generative provider tabs when Labs is off. The invariant this test has
  // always protected — ONE ordered list, derived from TAB_LABELS, and the
  // strip renders from it rather than repeating the order by hand — is
  // unchanged; the list the strip renders is now that list filtered.
  it('derives one ordered tab list from TAB_LABELS and renders from it', () => {
    assert.match(source, /const TAB_ORDER = Object\.keys\(TAB_LABELS\) as Tab\[\];/);
    assert.match(source, /export function visibleSettingsTabs\(labsEnabled: boolean\): Tab\[\] \{/);
    // The visible list is DERIVED from TAB_ORDER, never a second hand-written
    // order that could drift out of sync with TAB_LABELS.
    const helper = source.slice(
      source.indexOf('export function visibleSettingsTabs'),
      source.indexOf('// ── Story-axis config'),
    );
    assert.match(helper, /TAB_ORDER/);
    assert.doesNotMatch(helper, /'session'\s*,\s*'labs'/);
    assert.match(source, /const visibleTabs = visibleSettingsTabs\(labsEnabled\);/);
    assert.match(source, /\{visibleTabs\.map\(\(tab, index\) => \(/);
  });

  it('puts only the selected tab in the Tab order (roving tabindex)', () => {
    assert.match(source, /tabIndex=\{activeTab === tab \? 0 : -1\}/);
  });

  it('keeps aria-selected on the active tab and the roles E5 shipped', () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tab"\n/);
    assert.match(source, /aria-selected=\{activeTab === tab\}/);
    assert.match(source, /aria-controls=\{`settings-panel-\$\{tab\}`\}/);
    assert.match(source, /role="tabpanel"/);
  });

  it('binds the arrow-key handler on every tab, with its index', () => {
    assert.match(source, /onKeyDown=\{\(e\) => handleTabKeyDown\(e, index\)\}/);
  });

  it('handleTabKeyDown moves BOTH selection and real focus, and only for keys it owns', () => {
    const handler = source.slice(
      source.indexOf('const handleTabKeyDown'),
      source.indexOf('const [cfg, setCfg]'),
    );
    assert.ok(handler.length > 0, 'handleTabKeyDown not found in SettingsPanel.tsx');
    // Indexes are into the VISIBLE strip since Decision #3 — using
    // TAB_ORDER.length here would let ArrowRight "move" to a tab that is not
    // rendered when Labs is off, and focus would silently go nowhere.
    assert.match(handler, /nextRovingIndex\(e\.key, index, visibleTabs\.length\)/);
    assert.match(handler, /const target = visibleTabs\[next\];/);
    // Bail out BEFORE preventDefault for unowned keys, or Tab stops working.
    assert.ok(
      handler.indexOf('if (next === null) return;') < handler.indexOf('e.preventDefault()'),
      'preventDefault must come after the "key we do not own" bail-out',
    );
    assert.match(handler, /setActiveTab\(target\)/);
    assert.match(handler, /tabRefs\.current\[target\]\?\.focus\(\)/);
  });

  it('keeps a ref per tab button so focus can actually be moved', () => {
    assert.match(source, /const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement \| null>>>\(\{\}\);/);
    assert.match(source, /ref=\{\(el\) => \{ tabRefs\.current\[tab\] = el; \}\}/);
  });

  it('still selects on click — the pointer path is untouched', () => {
    assert.match(source, /onClick=\{\(\) => setActiveTab\(tab\)\}/);
  });
});
