// Fountain-specific keybindings for CodeMirror 6.
// Ports the i/e slug shortcuts, Tab character-autocomplete + spacing, and
// Enter-after-character-cue → action-modal trigger from the old textarea
// handleKeyDown to proper CM6 keybindings.

import { KeyBinding } from '@codemirror/view';
import { EditorView } from '@codemirror/view';

export interface FountainKeymapOptions {
  /** Character names for Tab autocomplete — updated via compartment.reconfigure */
  characters: string[];
  /** Called when Enter is pressed after a character cue — shows the action modal */
  onCharacterEnter: (charName: string, cursor: number) => void;
}

function currentLineText(view: EditorView): string {
  const cursor = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursor);
  return view.state.doc.sliceString(line.from, cursor);
}

function insertAtCursor(view: EditorView, text: string, moveCursor = text.length): boolean {
  const cursor = view.state.selection.main.head;
  view.dispatch({
    changes: { from: cursor, to: cursor, insert: text },
    selection: { anchor: cursor + moveCursor },
  });
  return true;
}

// Regex: uppercase-only line that looks like a character cue
const CHAR_CUE_RE = /^[A-Z][A-Z0-9 '\-\.]+$/;

export function fountainKeymap(opts: FountainKeymapOptions): KeyBinding[] {
  return [
    // 'i' on an empty line → "INT. "
    {
      key: 'i',
      run(view) {
        const lineText = currentLineText(view);
        if (lineText !== '') return false;
        return insertAtCursor(view, 'INT. ');
      },
    },
    // 'e' on an empty line → "EXT. "
    {
      key: 'e',
      run(view) {
        const lineText = currentLineText(view);
        if (lineText !== '') return false;
        return insertAtCursor(view, 'EXT. ');
      },
    },
    // Enter after a character cue → fire the action modal
    {
      key: 'Enter',
      run(view) {
        const lineText = currentLineText(view).trim();
        if (!CHAR_CUE_RE.test(lineText)) return false;
        const cursor = view.state.selection.main.head;
        opts.onCharacterEnter(lineText, cursor);
        return true;
      },
    },
    // Tab: (1) character autocomplete, (2) dialogue indent, (3) action de-indent
    {
      key: 'Tab',
      run(view) {
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        const lineText = view.state.doc.sliceString(line.from, cursor);
        const trimmed = lineText.trim();

        // 1) Character name autocomplete: uppercase-only prefix
        if (
          trimmed.length > 0 &&
          trimmed === trimmed.toUpperCase() &&
          !trimmed.startsWith('INT') &&
          !trimmed.startsWith('EXT')
        ) {
          const match = opts.characters.find(
            (c) => c.toUpperCase().startsWith(trimmed) && c.toUpperCase() !== trimmed,
          );
          if (match) {
            const insertStart = line.from + (lineText.length - trimmed.length);
            view.dispatch({
              changes: { from: insertStart, to: cursor, insert: match.toUpperCase() },
              selection: { anchor: insertStart + match.length },
            });
            return true;
          }
        }

        // 2) Empty line → dialogue indent (10 spaces)
        if (trimmed === '') {
          return insertAtCursor(view, '          ');
        }

        // 3) Already at dialogue indent (10 spaces, not 12) → action indent (6 spaces)
        if (lineText.startsWith('          ') && !lineText.startsWith('            ')) {
          view.dispatch({
            changes: { from: line.from, to: line.from + 10, insert: '      ' },
            selection: { anchor: line.from + 6 },
          });
          return true;
        }

        // 4) Action indent → no indent (strip leading spaces)
        if (lineText.startsWith('      ')) {
          const stripped = lineText.replace(/^ +/, '');
          view.dispatch({
            changes: { from: line.from, to: cursor, insert: stripped },
            selection: { anchor: line.from + stripped.length },
          });
          return true;
        }

        return false; // let the default Tab handler (e.g. inline-complete accept) run
      },
    },
  ];
}
