import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendUploadedFiles,
  filterUploadableFiles,
  inferUploadCategory,
  UPLOAD_MAX_FILE_SIZE,
  type UploadedFile,
} from '../../src/lib/uploaded-files.ts';

describe('uploaded-files helpers', () => {
  it('infers category from extension', () => {
    assert.equal(inferUploadCategory('plot.fountain'), 'Plot');
    assert.equal(inferUploadCategory('sheet.fdx'), 'Plot');
    assert.equal(inferUploadCategory('rules.json'), 'Rules');
    assert.equal(inferUploadCategory('table.csv'), 'Rules');
    assert.equal(inferUploadCategory('world.md'), 'Lore');
  });

  it('filters by extension and size', () => {
    const files = [
      { name: 'a.txt', size: 10 },
      { name: 'b.exe', size: 10 },
      { name: 'c.md', size: UPLOAD_MAX_FILE_SIZE + 1 },
      { name: 'd.fountain', size: 0 },
      { name: 'e.json', size: 100 },
    ] as File[];
    const kept = filterUploadableFiles(files).map((f) => f.name);
    assert.deepEqual(kept, ['a.txt', 'e.json']);
  });

  it('appendUploadedFiles concatenates the whole batch without dropping siblings', () => {
    const prev: UploadedFile[] = [
      { name: 'old.md', content: 'x', size: 1, category: 'Lore' },
    ];
    const batch: UploadedFile[] = [
      { name: 'a.txt', content: 'a', size: 1, category: 'Lore' },
      { name: 'b.txt', content: 'b', size: 1, category: 'Lore' },
      { name: 'c.txt', content: 'c', size: 1, category: 'Lore' },
    ];
    const next = appendUploadedFiles(prev, batch);
    assert.equal(next.length, 4);
    assert.deepEqual(next.map((f) => f.name), ['old.md', 'a.txt', 'b.txt', 'c.txt']);
    // Immutability: prev unchanged.
    assert.equal(prev.length, 1);
  });
});
