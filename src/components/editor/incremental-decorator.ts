// Shared incremental-decoration ViewPlugin factory for CodeMirror 6, used by
// both fountain-highlight.ts (syntax color classes) and
// screenplay-format.ts (indentation classes) — the two files differ only in
// their block-type→class-name mapping, so the actual incremental-update
// machinery (and its correctness reasoning) lives here exactly once instead
// of twice.
//
// STRATEGY (perf fix — see incremental-reparse.ts's header for the parsing
// theory this rests on): recompute decorations only for the CHANGED range
// plus the currently VISIBLE range on every editor update — never a full
// `state.doc.toString()` + `parseFountain(doc)` over the whole document —
// with a full reparse still run once after IDLE_MS of no further edits, so
// any drift the windowed path doesn't reach (content outside every window
// touched this session) self-corrects. Measured effect on a 430-scene/145KB
// script: see this pass's commit message and
// docs/perf/incremental-decorations-benchmark.md for the full before/after
// numbers (full-doc parse on every keystroke was ~100-120ms; the windowed
// path is submillisecond-to-low-single-digit-ms per keystroke in the common
// case).

import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view';
import { EditorState, RangeSetBuilder, Text } from '@codemirror/state';
import { parseFountain, type FountainBlockType } from '../../lib/fountain.ts';
import {
  computeReparseWindow,
  mergeLineRanges,
  parseWindow,
  containsBoneyardMarker,
  type DocLike,
} from './incremental-reparse.ts';

// Debounce for the "ground truth" full reparse — long enough to never fire
// mid-typing-burst, short enough that a paused writer sees any windowed-path
// drift (there is none known; this is a correctness backstop, not a
// known-necessary correction) settle well before their next keystroke.
const IDLE_REPARSE_MS = 500;

function docLikeFor(doc: Text): DocLike {
  return {
    totalLines: doc.lines,
    lineText: (n: number) => doc.line(n).text,
  };
}

function buildFullDecorations(
  state: EditorState,
  classFor: (type: FountainBlockType) => string | undefined,
): DecorationSet {
  const doc = state.doc.toString();
  const blocks = parseFountain(doc);
  const builder = new RangeSetBuilder<Decoration>();
  for (const block of blocks) {
    const cls = classFor(block.type);
    if (!cls) continue;
    const lineNo = block.lineNumber;
    if (lineNo < 1 || lineNo > state.doc.lines) continue;
    const line = state.doc.line(lineNo);
    try {
      builder.add(line.from, line.from, Decoration.line({ class: cls }));
    } catch {
      // RangeSetBuilder requires strictly ascending `from` values; skip if out-of-order.
    }
  }
  return builder.finish();
}

/**
 * Builds a ViewPlugin that maintains a line-decoration DecorationSet derived
 * from `classFor`, incrementally. Every keystroke patches only the changed +
 * visible line ranges (via incremental-reparse.ts); a full rebuild runs once
 * at mount and again after each pause in typing.
 */
export function incrementalFountainDecorator(classFor: (type: FountainBlockType) => string | undefined) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private view: EditorView;
      private idleTimer: ReturnType<typeof setTimeout> | null = null;
      // Whether the document is known (or suspected) to contain a `/* ... */`
      // boneyard comment anywhere — see incremental-reparse.ts's header,
      // case 3, for why this forces a full reparse rather than a windowed
      // one. Recomputed precisely on every full reparse (mount + idle);
      // between those, set conservatively (true) the instant an edit's
      // inserted or removed text touches a `/*`/`*/` marker.
      private docHasBoneyard: boolean;

      constructor(view: EditorView) {
        this.view = view;
        this.decorations = buildFullDecorations(view.state, classFor);
        this.docHasBoneyard = view.state.doc.toString().includes('/*');
      }

      update(update: ViewUpdate) {
        this.view = update.view;
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);

          let touchedBoneyard = this.docHasBoneyard;
          if (!touchedBoneyard) {
            update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
              if (touchedBoneyard) return;
              const removed = update.startState.doc.sliceString(fromA, toA);
              if (containsBoneyardMarker(removed) || containsBoneyardMarker(inserted.toString())) {
                touchedBoneyard = true;
              }
            });
          }
          this.docHasBoneyard = touchedBoneyard;

          if (this.docHasBoneyard) {
            // Correctness fallback — rare in real scripts (measured
            // fixtures contain none), so this never fires on this pass's
            // benchmark path. The idle reparse below also recalibrates
            // docHasBoneyard precisely (this flag only ever widens, never
            // narrows, until then).
            this.decorations = buildFullDecorations(update.state, classFor);
          } else {
            const ranges: [number, number][] = [];
            update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
              const doc = update.state.doc;
              const fromLine = doc.lineAt(Math.min(fromB, doc.length)).number;
              const toLine = doc.lineAt(Math.min(Math.max(fromB, toB), doc.length)).number;
              ranges.push([fromLine, toLine]);
            });
            for (const vr of update.view.visibleRanges) {
              const doc = update.state.doc;
              ranges.push([doc.lineAt(vr.from).number, doc.lineAt(vr.to).number]);
            }
            this.patchRanges(update.state, mergeLineRanges(ranges));
          }
          this.scheduleIdleReparse();
        } else if (update.viewportChanged) {
          const doc = update.state.doc;
          const ranges: [number, number][] = update.view.visibleRanges.map(
            (vr) => [doc.lineAt(vr.from).number, doc.lineAt(vr.to).number] as [number, number],
          );
          this.patchRanges(update.state, mergeLineRanges(ranges));
        }
      }

      private patchRanges(state: EditorState, ranges: [number, number][]) {
        const doc = state.doc;
        const docLike = docLikeFor(doc);
        for (const [fromLine, toLine] of ranges) {
          const { anchorLine, endLine } = computeReparseWindow(docLike, fromLine, toLine);
          const from = doc.line(anchorLine).from;
          const to = doc.line(endLine).to;
          const sliceText = doc.sliceString(from, to);
          const blocks = parseWindow(sliceText, anchorLine);
          const adds: ReturnType<typeof Decoration.line>[] = [];
          const positions: number[] = [];
          for (const block of blocks) {
            const cls = classFor(block.type);
            if (!cls) continue;
            if (block.lineNumber < 1 || block.lineNumber > doc.lines) continue;
            const line = doc.line(block.lineNumber);
            adds.push(Decoration.line({ class: cls }));
            positions.push(line.from);
          }
          const addRanges = adds.map((deco, i) => deco.range(positions[i]));
          this.decorations = this.decorations.update({
            filterFrom: from,
            filterTo: to,
            filter: () => false,
            add: addRanges,
            sort: true,
          });
        }
      }

      private scheduleIdleReparse() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          this.idleTimer = null;
          const view = this.view;
          this.decorations = buildFullDecorations(view.state, classFor);
          this.docHasBoneyard = view.state.doc.toString().includes('/*');
          // Nothing else changed this transaction — this purely asks
          // CodeMirror to re-collect decorations (including ours) and
          // repaint, the standard CM6 idiom for an async plugin update.
          view.dispatch({});
        }, IDLE_REPARSE_MS);
      }

      destroy() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
      }
    },
    { decorations: (v: { decorations: DecorationSet }) => v.decorations },
  );
}
