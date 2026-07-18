/**
 * Fast word count algorithm using char codes for zero-allocation.
 * Falls back to 0 for empty strings.
 */
export function fastWordCount(text: string): number {
  let count = 0;
  let inWord = false;
  for (let j = 0; j < text.length; j++) {
    if (text.charCodeAt(j) > 32) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}
