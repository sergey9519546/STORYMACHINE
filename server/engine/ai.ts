import { GoogleGenAI } from '@google/genai';

let _shared: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!_shared) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY environment variable is required');
    _shared = new GoogleGenAI({ apiKey: key });
  }
  return _shared;
}

// Wraps a promise with a hard deadline. Clears the timer on settle so Node can exit cleanly.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini timeout (${ms}ms): ${label}`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
