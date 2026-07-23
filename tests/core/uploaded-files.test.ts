import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendUploadedFiles,
  createUploadId,
  filterUploadableFiles,
  inferUploadCategory,
  readUploadedFiles,
  removeUploadedFile,
  updateUploadedFileCategory,
  UPLOAD_MAX_FILE_SIZE,
  type UploadedFile,
} from '../../src/lib/uploaded-files.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function file(partial: Partial<UploadedFile> & Pick<UploadedFile, 'name'>): UploadedFile {
  return {
    id: partial.id ?? createUploadId(),
    name: partial.name,
    content: partial.content ?? '',
    size: partial.size ?? 1,
    category: partial.category ?? 'Lore',
  };
}

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
    const prev: UploadedFile[] = [file({ name: 'old.md', content: 'x' })];
    const batch: UploadedFile[] = [
      file({ name: 'a.txt', content: 'a' }),
      file({ name: 'b.txt', content: 'b' }),
      file({ name: 'c.txt', content: 'c' }),
    ];
    const next = appendUploadedFiles(prev, batch);
    assert.equal(next.length, 4);
    assert.deepEqual(next.map((f) => f.name), ['old.md', 'a.txt', 'b.txt', 'c.txt']);
    assert.equal(prev.length, 1);
  });

  it('remove and category update use stable ids, not list indexes', () => {
    const a = file({ id: 'a', name: 'a.txt', category: 'Lore' });
    const b = file({ id: 'b', name: 'b.txt', category: 'Lore' });
    const c = file({ id: 'c', name: 'c.txt', category: 'Lore' });
    const withoutB = removeUploadedFile([a, b, c], 'b');
    assert.deepEqual(withoutB.map((f) => f.id), ['a', 'c']);
    const recategorized = updateUploadedFileCategory([a, b, c], 'c', 'Rules');
    assert.equal(recategorized[2].category, 'Rules');
    assert.equal(recategorized[0].category, 'Lore');
    assert.notEqual(recategorized, [a, b, c]);
  });

  it('reads every sibling concurrently and preserves picker order', async () => {
    const reads = [deferred<string>(), deferred<string>(), deferred<string>()];
    let started = 0;
    const files = reads.map((read, index) => ({
      name: `${index}.txt`,
      size: 1,
      text: () => {
        started += 1;
        return read.promise;
      },
    })) as File[];

    const resultPromise = readUploadedFiles(files);
    assert.equal(started, 3, 'all File.text reads should start before any resolves');
    reads[2].resolve('third');
    reads[0].resolve('first');
    reads[1].resolve('second');

    const result = await resultPromise;
    assert.deepEqual(result.map(file => file.name), ['0.txt', '1.txt', '2.txt']);
    assert.deepEqual(result.map(file => file.content), ['first', 'second', 'third']);
    assert.equal(new Set(result.map(file => file.id)).size, 3);
  });

  it('keeps readable siblings when one file read fails', async () => {
    const files = [
      { name: 'good.txt', size: 1, text: async () => 'good' },
      { name: 'bad.txt', size: 1, text: async () => { throw new Error('unreadable'); } },
      { name: 'also-good.md', size: 1, text: async () => 'also good' },
    ] as File[];
    const result = await readUploadedFiles(files);
    assert.deepEqual(result.map(file => file.name), ['good.txt', 'also-good.md']);
  });

  it('accepts every supported extension and the exact size boundary', () => {
    const names = ['a.TXT', 'b.fountain', 'c.fdx', 'd.md', 'e.htm', 'f.html', 'g.json', 'h.csv'];
    const files = [
      ...names.map(name => ({ name, size: UPLOAD_MAX_FILE_SIZE })),
      { name: 'too-large.txt', size: UPLOAD_MAX_FILE_SIZE + 1 },
    ] as File[];
    assert.deepEqual(filterUploadableFiles(files).map(file => file.name), names);
  });
});
