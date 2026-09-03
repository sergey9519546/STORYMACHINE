// Export filenames — Retrospective #1 ("Title survives").
//
// Every export (Fountain/FDX/PDF/DOCX) used to hardcode "script.<ext>" no
// matter what the writer's script was actually called. This derives a
// filesystem-safe slug from the title instead (e.g. "midnight-signal.pdf"),
// falling back to "script.<ext>" only when there is genuinely no usable
// title (empty, whitespace, or the untouched "UNTITLED SCRIPT" placeholder).

const UNTITLED_PLACEHOLDER = "UNTITLED SCRIPT";

/** A lowercase, hyphenated, filesystem-safe slug of a script title, or null
 *  when the title carries no real information — callers fall back to a
 *  generic name in that case. */
export function slugifyScriptTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed || trimmed.toUpperCase() === UNTITLED_PLACEHOLDER) return null;
  const slug = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics (e.g. "e\u0301" -> "e")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, ""); // the length cap above can leave a trailing hyphen
  return slug.length > 0 ? slug : null;
}

/** Builds `<slug>.<ext>` from a title, falling back to `script.<ext>`.
 *  `ext` is passed WITHOUT a leading dot (e.g. "pdf", not ".pdf"). */
export function scriptExportFilename(title: string, ext: string): string {
  const slug = slugifyScriptTitle(title);
  return `${slug ?? "script"}.${ext}`;
}
