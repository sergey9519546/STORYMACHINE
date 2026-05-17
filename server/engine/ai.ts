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

export function getModel(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-pro';
}

// Returns the generation temperature to use for all Gemini calls.
// Set GEMINI_TEMPERATURE=0 in .env to get near-deterministic outputs.
// Defaults to 1.0 (Gemini default). Values outside 0–2 are clamped.
export function getTemperature(): number {
  const raw = parseFloat(process.env.GEMINI_TEMPERATURE ?? '');
  return isNaN(raw) ? 1.0 : Math.max(0, Math.min(2, raw));
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
