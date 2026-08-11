import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface TestTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface TestTextChunk {
  items: TestTextItem[];
}

type BoundedTextReader = (
  reader: ReadableStreamDefaultReader<TestTextChunk>,
  budget: { chars: number; textItems: number },
) => Promise<TestTextItem[]>;

function textItem(str: string): TestTextItem {
  return { str, transform: [12, 0, 0, 12, 108, 700], width: str.length * 7, height: 12 };
}

describe('PDF text stream limit cancellation', () => {
  it('cancels after the limit-crossing chunk without pulling trailing content', async () => {
    const pdfImport = await import('../../server/lib/pdf-import.ts');
    const readBoundedPdfTextItems = (pdfImport as unknown as {
      readBoundedPdfTextItems?: BoundedTextReader;
    }).readBoundedPdfTextItems;
    if (!readBoundedPdfTextItems) {
      assert.fail('pdf-import must expose the bounded stream reader used by extraction');
    }

    const chunks: TestTextChunk[] = [
      { items: [textItem('A')] },
      { items: [textItem('trailing content must not be pulled')] },
    ];
    let pulls = 0;
    let cancelReason: unknown;
    const stream = new ReadableStream<TestTextChunk>({
      pull(controller) {
        pulls++;
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel(reason) {
        cancelReason = reason;
      },
    }, { highWaterMark: 0 });

    await assert.rejects(
      () => readBoundedPdfTextItems(stream.getReader(), { chars: 900_000, textItems: 0 }),
      {
        message: 'This PDF contains more than 900,000 extractable text characters. Split it into smaller files and try again.',
      },
    );
    assert.equal(pulls, 1, 'limit handling must cancel instead of draining the trailing chunk');
    assert.ok(cancelReason instanceof Error);
    assert.equal(cancelReason.message, 'PDF text extraction limit exceeded');
  });
});
