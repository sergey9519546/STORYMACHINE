// Title-page autofill — Retrospective #1 ("Title survives").
//
// Decides whether it's safe to auto-populate titlePage state from a script's
// own leading Fountain title block (see fountain-title-block.ts): only when
// the writer has not already set a real title page by hand (via ScriptIDE's
// Title tab). A single pure function, shared by every ScriptIDE call site
// that might trigger a parse (typing, paste, sample load, restoring a draft)
// so "never overwrite a writer-set titlePage" is enforced in exactly one
// place, the same way sample-install-guard.ts is the one place G0-01's
// "never overwrite draft text" rule lives.

import { DEFAULT_TITLE_PAGE, type TitlePageState } from "./scriptide-draft-store.ts";
import { parseFountainTitleBlock } from "./fountain-title-block.ts";

/** True when every field still matches the untouched placeholder — i.e. the
 *  writer has never set a real title page (via the Title tab, a prior parse,
 *  or the sample's own title). */
export function isDefaultTitlePage(t: TitlePageState): boolean {
  return (
    t.title === DEFAULT_TITLE_PAGE.title &&
    t.author === DEFAULT_TITLE_PAGE.author &&
    t.contact === DEFAULT_TITLE_PAGE.contact
  );
}

/**
 * Given the CURRENT titlePage and the script text, returns the titlePage to
 * apply, or null when nothing should change (writer already set a real
 * title page, or the script carries no leading title block).
 */
export function deriveTitlePageFromScript(
  currentTitlePage: TitlePageState,
  scriptText: string,
): TitlePageState | null {
  if (!isDefaultTitlePage(currentTitlePage)) return null; // never overwrite a writer-set title page
  const parsed = parseFountainTitleBlock(scriptText);
  if (!parsed) return null;
  return {
    title: parsed.title ?? currentTitlePage.title,
    author: parsed.author ?? currentTitlePage.author,
    contact: parsed.contact ?? currentTitlePage.contact,
  };
}
