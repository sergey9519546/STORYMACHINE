// Server-side screenplay export endpoint plumbing (P2).
//
// The actual format renderers already exist as pure, dependency-free TypeScript
// in src/lib (Waves 91–92): fountainToPdf, fountainToDocx, fountainToFdx. They
// take a Fountain string and return bytes/text with no DOM access, so the server
// reuses them directly rather than duplicating the layout/format logic. This
// module only adds the HTTP concerns: format dispatch, MIME types, extensions.

import { fountainToPdf } from '../../../src/lib/pdf.ts';
import { fountainToDocx } from '../../../src/lib/docx.ts';
import { fountainToFdx } from '../../../src/lib/fdx.ts';

export type ExportFormat = 'pdf' | 'fdx' | 'docx' | 'fountain';

export interface ExportResult {
  format: ExportFormat;
  /** MIME type for the HTTP Content-Type header. */
  mimeType: string;
  /** Suggested download filename extension (no dot). */
  extension: string;
  /** Binary payload (PDF/DOCX) or UTF-8 text (FDX/Fountain) as a Buffer. */
  data: Buffer;
}

const MIME: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  fdx: 'application/xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  fountain: 'text/plain; charset=utf-8',
};

/** Export a Fountain document to the requested format. */
export function exportScreenplay(fountain: string, format: ExportFormat, title = 'Untitled Script'): ExportResult {
  const mimeType = MIME[format];
  switch (format) {
    case 'fountain':
      return { format, mimeType, extension: 'fountain', data: Buffer.from(fountain, 'utf-8') };
    case 'fdx':
      return { format, mimeType, extension: 'fdx', data: Buffer.from(fountainToFdx(fountain, title), 'utf-8') };
    case 'pdf':
      return { format, mimeType, extension: 'pdf', data: Buffer.from(fountainToPdf(fountain)) };
    case 'docx':
      return { format, mimeType, extension: 'docx', data: Buffer.from(fountainToDocx(fountain)) };
    default: {
      const exhaustive: never = format;
      throw new Error(`unsupported export format: ${String(exhaustive)}`);
    }
  }
}
