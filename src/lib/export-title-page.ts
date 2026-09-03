// Shared title-page resolution for every export format (FDX/PDF/DOCX).
//
// Retrospective (exports fidelity pass): every exporter used to either skip
// the title page entirely (pdf.ts, docx.ts) or fabricate one from a bare
// "Untitled Script" default (fdx.ts) no matter what the writer actually
// typed into ScriptIDE's Title tab. A writer's real title-page data can come
// from two places — an explicit value the caller supplies (ScriptIDE's
// `titlePage` state, or a server route's `req.body.title`) or the Fountain
// script's own leading title block (`Title:`/`Author:`/`Contact:` key:value
// lines — see fountain-title-block.ts, which every exporter's body-parsing
// already skips past without ever surfacing the values it read). When
// NEITHER source has anything, the export carries no title page at all —
// never a page of blank placeholders.

import { parseFountainTitleBlock } from './fountain-title-block.ts';

export interface ExportTitlePage {
  title?: string;
  author?: string;
  contact?: string;
}

/** Accepts either a plain title string (the legacy shorthand every exporter
 *  used to take, still how the server's /api/export/fdx and /api/export/docx
 *  routes call in — they only ever carry a single free-text `title` field)
 *  or a full {title, author, contact} object (what ScriptIDE's Title tab
 *  state actually holds). */
export type TitlePageInput = string | ExportTitlePage | null | undefined;

function normalize(input: TitlePageInput): ExportTitlePage | undefined {
  const raw: ExportTitlePage = typeof input === 'string' ? { title: input } : (input ?? {});
  const title = raw.title?.trim();
  const author = raw.author?.trim();
  const contact = raw.contact?.trim();
  if (!title && !author && !contact) return undefined;
  return {
    ...(title ? { title } : {}),
    ...(author ? { author } : {}),
    ...(contact ? { contact } : {}),
  };
}

/**
 * Resolve the title page an export should render: the caller-supplied value
 * if it carries any real content, else whatever the Fountain text's own
 * leading title block parses to, else `null` — meaning render NO title page
 * (not a page of empty placeholders).
 */
export function resolveExportTitlePage(fountain: string, explicit?: TitlePageInput): ExportTitlePage | null {
  const fromExplicit = normalize(explicit);
  if (fromExplicit) return fromExplicit;
  const fromScript = normalize(parseFountainTitleBlock(fountain) ?? undefined);
  return fromScript ?? null;
}
