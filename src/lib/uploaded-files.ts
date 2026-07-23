// Pure helpers for StartScreen / StoryConfigForm multi-file ingest.
// Extracted so batch accumulation can be unit-tested without a React harness.

export type FileCategory = 'Lore' | 'Character' | 'Plot' | 'Rules' | 'Other';

export interface UploadedFile {
  /** Stable identity for row keys and concurrent remove/category updates. */
  id: string;
  name: string;
  content: string;
  size: number;
  category: FileCategory;
}

/** Extensions accepted by the lore/knowledge uploader (aligned with StartScreen drop). */
export const UPLOAD_ALLOWED_EXTS = /\.(txt|fountain|fdx|md|htm|html|json|csv)$/i;

/** Per-file size cap (bytes) — same 2 MB as StartScreen drag/drop. */
export const UPLOAD_MAX_FILE_SIZE = 2 * 1024 * 1024;

let uploadIdCounter = 0;

export function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  uploadIdCounter += 1;
  return `upload-${Date.now()}-${uploadIdCounter}`;
}

export function inferUploadCategory(filename: string): FileCategory {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'fountain' || ext === 'fdx') return 'Plot';
  if (ext === 'json' || ext === 'csv') return 'Rules';
  return 'Lore';
}

export function filterUploadableFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter(
    (f) => UPLOAD_ALLOWED_EXTS.test(f.name) && f.size > 0 && f.size <= UPLOAD_MAX_FILE_SIZE,
  );
}

/** Append a batch of newly read files onto the previous list. Pure. */
export function appendUploadedFiles(prev: UploadedFile[], batch: UploadedFile[]): UploadedFile[] {
  return prev.concat(batch);
}

export function removeUploadedFile(prev: UploadedFile[], id: string): UploadedFile[] {
  return prev.filter((file) => file.id !== id);
}

export function updateUploadedFileCategory(
  prev: UploadedFile[],
  id: string,
  category: FileCategory,
): UploadedFile[] {
  let changed = false;
  const next = prev.map((file) => {
    if (file.id !== id || file.category === category) return file;
    changed = true;
    return { ...file, category };
  });
  return changed ? next : prev;
}

/**
 * Read a batch of Files into UploadedFile records.
 * Uses File.text() when available; falls back to FileReader for older runtimes.
 * Failures on individual files are skipped (caller may surface a notice later).
 */
export async function readUploadedFiles(files: File[]): Promise<UploadedFile[]> {
  const records = await Promise.all(files.map(async (file): Promise<UploadedFile | null> => {
    try {
      const content = typeof file.text === 'function'
        ? await file.text()
        : await readFileAsText(file);
      if (typeof content !== 'string') return null;
      return {
        id: createUploadId(),
        name: file.name,
        content,
        size: file.size,
        category: inferUploadCategory(file.name),
      };
    } catch {
      // Skip unreadable file — do not abort the rest of the batch.
      return null;
    }
  }));
  return records.filter((record): record is UploadedFile => record !== null);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader did not return text'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });
}
