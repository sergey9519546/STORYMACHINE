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
