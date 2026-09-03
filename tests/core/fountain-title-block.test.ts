// Retrospective #1 ("Title survives") — parsing a leading Fountain title
// block into titlePage state, the guard that keeps it from ever clobbering a
// title the writer set by hand, and the export-filename slug that derives
// from it. Three pure modules, each exercised directly.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFountainTitleBlock } from "../../src/lib/fountain-title-block.ts";
import {
  deriveTitlePageFromScript,
  isDefaultTitlePage,
} from "../../src/lib/title-page-autofill.ts";
import { DEFAULT_TITLE_PAGE, type TitlePageState } from "../../src/lib/scriptide-draft-store.ts";
import { scriptExportFilename, slugifyScriptTitle } from "../../src/lib/export-filename.ts";

describe("parseFountainTitleBlock", () => {
  it("parses Title/Author/Contact out of a leading title block", () => {
    const script = [
      "Title: Midnight Signal",
      "Credit: Written by",
      "Author: Jane Doe",
      "Draft date: January 1, 2026",
      "Contact: jane@example.com",
      "",
      "FADE IN:",
      "",
      "INT. OFFICE - DAY",
      "",
    ].join("\n");
    const parsed = parseFountainTitleBlock(script);
    assert.deepEqual(parsed, {
      title: "Midnight Signal",
      author: "Jane Doe",
      contact: "jane@example.com",
    });
  });

  it("accepts 'Authors:' (plural) as an alias for Author", () => {
    const script = "Title: Two Hands\nAuthors: Sam & Robin\n\nFADE IN:\n";
    const parsed = parseFountainTitleBlock(script);
    assert.equal(parsed?.title, "Two Hands");
    assert.equal(parsed?.author, "Sam & Robin");
  });

  it("joins indented continuation lines into a multi-line Contact value", () => {
    const script = [
      "Title: The Long Way Home",
      "Contact:",
      "    123 Main St",
      "    Anytown, USA",
      "",
      "FADE IN:",
    ].join("\n");
    const parsed = parseFountainTitleBlock(script);
    assert.equal(parsed?.contact, "123 Main St\nAnytown, USA");
  });

  it("returns null when the script has no leading title block at all", () => {
    const script = "FADE IN:\n\nINT. OFFICE - DAY\n\nJohn sits at his desk.\n";
    assert.equal(parseFountainTitleBlock(script), null);
  });

  it("returns null for an empty script", () => {
    assert.equal(parseFountainTitleBlock(""), null);
  });

  it("returns null when the leading block has none of the three tracked fields", () => {
    const script = "Draft date: January 1, 2026\nGenre: Thriller\n\nFADE IN:\n";
    assert.equal(parseFountainTitleBlock(script), null);
  });

  it("does not misread a scene heading or character/dialogue line as a title-page key", () => {
    // No colon-before-space on the first line -> not a title page at all.
    const script = "INT. OFFICE - DAY\n\nJohn sits at his desk.\n";
    assert.equal(parseFountainTitleBlock(script), null);
  });
});

describe("deriveTitlePageFromScript (writer-safety guard)", () => {
  const scriptWithTitle = "Title: Midnight Signal\nAuthor: Jane Doe\n\nFADE IN:\n";

  it("derives a titlePage from the script when the current one is still the untouched default", () => {
    const derived = deriveTitlePageFromScript(DEFAULT_TITLE_PAGE, scriptWithTitle);
    assert.deepEqual(derived, {
      title: "Midnight Signal",
      author: "Jane Doe",
      contact: DEFAULT_TITLE_PAGE.contact,
    });
  });

  it("never overwrites a titlePage the writer already set, even if the script also has a title block", () => {
    const writerSet: TitlePageState = {
      title: "My Real Title",
      author: DEFAULT_TITLE_PAGE.author,
      contact: DEFAULT_TITLE_PAGE.contact,
    };
    const derived = deriveTitlePageFromScript(writerSet, scriptWithTitle);
    assert.equal(derived, null);
  });

  it("returns null when the script carries no title block, leaving titlePage untouched", () => {
    const derived = deriveTitlePageFromScript(DEFAULT_TITLE_PAGE, "FADE IN:\n\nINT. OFFICE - DAY\n");
    assert.equal(derived, null);
  });

  it("isDefaultTitlePage is true only for the exact untouched placeholder triple", () => {
    assert.equal(isDefaultTitlePage(DEFAULT_TITLE_PAGE), true);
    assert.equal(isDefaultTitlePage({ ...DEFAULT_TITLE_PAGE, title: "Something" }), false);
  });
});

describe("export filenames derive from the title (Retrospective #1)", () => {
  it("slugifies a real title into a lowercase, hyphenated filename", () => {
    assert.equal(scriptExportFilename("Midnight Signal", "pdf"), "midnight-signal.pdf");
    assert.equal(scriptExportFilename("  Dead Frequency  ", "fountain"), "dead-frequency.fountain");
  });

  it("strips punctuation and collapses runs of non-alphanumerics", () => {
    assert.equal(slugifyScriptTitle("The Second Key: A Thriller!"), "the-second-key-a-thriller");
  });

  it("falls back to 'script.<ext>' for an empty or untouched title", () => {
    assert.equal(scriptExportFilename("", "fdx"), "script.fdx");
    assert.equal(scriptExportFilename("   ", "docx"), "script.docx");
    assert.equal(scriptExportFilename(DEFAULT_TITLE_PAGE.title, "pdf"), "script.pdf");
    // Case-insensitive match against the untouched placeholder.
    assert.equal(scriptExportFilename("untitled script", "pdf"), "script.pdf");
  });
});
