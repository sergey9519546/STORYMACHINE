// Wave 39 — Pass 12: Tone/Voice
// Checks voice consistency: tonal shifts without justification, register
// mismatches, generic vs. authored prose texture.
// Uses a simplified Burrows Delta proxy on action lines.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract action line word frequency per scene */
function sceneWordFrequencies(fountain: string): Map<number, Map<string, number>> {
  const lines = fountain.split('\n');
  const sceneFreqs = new Map<number, Map<string, number>>();
  let sceneIdx = -1;
  let isDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      sceneIdx++;
      sceneFreqs.set(sceneIdx, new Map());
      isDialogue = false;
      continue;
    }
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(trimmed)) { isDialogue = true; continue; }
    if (!trimmed) { isDialogue = false; continue; }
    if (isDialogue) continue; // skip dialogue
    if (sceneIdx < 0) continue;

    // Count words in action line
    const freqs = sceneFreqs.get(sceneIdx)!;
    const words = trimmed.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    for (const w of words) freqs.set(w, (freqs.get(w) ?? 0) + 1);
  }
  return sceneFreqs;
}

/** Jaccard distance between two frequency maps (as presence/absence) */
function jaccardDistance(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0; // dialogue-only scenes have no action vocabulary
  const setA = new Set(a.keys());
  const setB = new Set(b.keys());
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

export async function voicePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneFreqs = sceneWordFrequencies(fountain);
  const freqList = Array.from(sceneFreqs.entries());

  if (freqList.length < 3) {
    return {
      pass: 'voice',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Voice/tone pass: too few scenes for analysis',
    };
  }

  // ── Compute pairwise Jaccard distances for adjacent scenes ────────────────
  const distances: number[] = [];
  for (let i = 1; i < freqList.length; i++) {
    const d = jaccardDistance(freqList[i - 1][1], freqList[i][1]);
    distances.push(d);
  }

  const avgDist = distances.reduce((s, v) => s + v, 0) / distances.length;

  // ── Large tonal jump between adjacent scenes ──────────────────────────────
  for (let i = 0; i < distances.length; i++) {
    if (distances[i] > avgDist + 0.3 && distances[i] > 0.7) {
      const sceneNum = freqList[i + 1][0];
      const record = records[sceneNum];
      issues.push({
        location: `Scene ${sceneNum}${record ? ` (${record.slug})` : ''}`,
        rule: 'TONAL_WHIPLASH',
        description: `Scene ${sceneNum} has a very high lexical distance from Scene ${sceneNum - 1} (${Math.round(distances[i] * 100)}% divergence) — abrupt tonal shift`,
        severity: 'minor',
        suggestedFix: 'Add transitional language or bridging action to ease the shift between tones',
      });
    }
  }

  // ── All scenes have very similar vocabulary (no range) ────────────────────
  if (avgDist < 0.15 && freqList.length >= 5) {
    issues.push({
      location: 'Voice throughout',
      rule: 'VOICE_TOO_UNIFORM',
      description: `Lexical distance between all scenes is very low (avg ${Math.round(avgDist * 100)}%) — the voice is monotonous across all contexts`,
      severity: 'minor',
      suggestedFix: 'Vary the register between intimate scenes (simple vocabulary) and high-drama scenes (heightened language)',
    });
  }

  // ── Tonal consistency check via emotional shift vs prose distance ──────────
  for (let i = 0; i < records.length && i < freqList.length; i++) {
    const record = records[i];
    if (record.emotionalShift === 'negative' && (freqList[i][1].get('beautiful') ?? 0) > 2) {
      issues.push({
        location: `Scene ${i} (${record.slug})`,
        rule: 'TONE_REGISTER_MISMATCH',
        description: `Scene ${i} has a negative emotional shift but the prose uses elevated/positive language — tone and affect are misaligned`,
        severity: 'minor',
        suggestedFix: 'Align the prose register with the scene\'s emotional valence',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'voice', approvedSpans, storyContext: input.storyContext });
  const changed = revised !== fountain;

  return {
    pass: 'voice',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Voice/tone pass: consistent voice throughout'
      : `Voice/tone pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
