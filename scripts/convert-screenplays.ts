/**
 * Convert screenplay PDFs to Fountain text for local use.
 *
 * Usage:
 *   node --experimental-strip-types scripts/convert-screenplays.ts
 *
 * Reads PDFs from SOURCE_DIR (default: the William Joyce screenplays folder),
 * converts each to Fountain via server/lib/pdf-import.ts's pdfToFountain,
 * and writes:
 *   - data/screenplays/<slug>.fountain  (converted text)
 *   - data/screenplays/manifest.json   (metadata for all converted scripts)
 *
 * The output directory is gitignored. Copyrighted screenplay text never enters
 * the repository.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { pdfToFountain } from '../server/lib/pdf-import.ts';

const SOURCE_DIR = process.env.SCREENPLAY_SOURCE_DIR
  ?? 'C:/Users/serge/OneDrive/Documents/William joyce/2-Screenplays';

const OUTPUT_DIR = process.env.SCREENPLAY_OUTPUT_DIR
  ?? 'C:/Users/serge/OneDrive/Documents/MAIN_StoryMachine_Engine_Logic/STORYMACHINE V1 REPO/STORYMACHINE/data/screenplays';

interface ManifestEntry {
  slug: string;
  sourcePath: string;
  sourceDir: string;
  outputFile: string;
  pageCount?: number;
  wordCount?: number;
  sceneCount?: number;
  convertedAt: string;
  warnings: string[];
  error?: string;
}

async function findAllPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findAllPdfs(full));
    } else if (entry.name.toLowerCase().endsWith('.pdf')) {
      results.push(full);
    }
  }
  return results;
}

function slugify(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function countScenes(fountain: string): number {
  return fountain.split('\n').filter(line => /^(INT|EXT|EST|I\/E|INT\.\/EXT)[.\s]/i.test(line.trim())).length;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const pdfs = await findAllPdfs(SOURCE_DIR);
  console.log(`Found ${pdfs.length} PDF files in ${SOURCE_DIR}`);

  const manifest: ManifestEntry[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const pdfPath of pdfs) {
    const name = basename(pdfPath);
    const dir = basename(join(pdfPath, '..'));
    const slug = slugify(name);
    const outputFile = join(OUTPUT_DIR, `${slug}.fountain`);

    const entry: ManifestEntry = {
      slug,
      sourcePath: pdfPath,
      sourceDir: dir,
      outputFile,
      convertedAt: new Date().toISOString(),
      warnings: [],
    };

    try {
      const bytes = new Uint8Array(await readFile(pdfPath));
      const { fountain, warnings } = await pdfToFountain(bytes);

      entry.warnings = warnings;
      entry.wordCount = countWords(fountain);
      entry.sceneCount = countScenes(fountain);

      await writeFile(outputFile, fountain, 'utf-8');

      console.log(`  ✓ ${name} → ${slug}.fountain (${entry.wordCount} words, ${entry.sceneCount} scenes${warnings.length > 0 ? `, ${warnings.length} warnings` : ''})`);
      successCount++;
    } catch (err) {
      entry.error = (err as Error).message ?? String(err);
      console.log(`  ✗ ${name}: ${entry.error}`);
      errorCount++;
    }

    manifest.push(entry);
  }

  const manifestPath = join(OUTPUT_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\nDone: ${successCount} converted, ${errorCount} failed`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
