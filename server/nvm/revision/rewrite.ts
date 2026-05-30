// Wave 39 — LLM Prose Rewriter
// Given a fountain draft + diagnosed issues, calls Gemini to rewrite
// only the flagged layer, preserving approved spans.
// Falls back (returns original) when LLM is unavailable.

import type { RevisionIssue, ApprovedSpan, PassName } from './passes/types.ts';

export interface RewriteInput {
  fountain: string;
  issues: RevisionIssue[];
  passName: PassName;
  approvedSpans: ApprovedSpan[];
}

export interface RewriteResult {
  revised: string;
  usedLLM: boolean;
}

/**
 * Build a protected-spans comment for the LLM prompt.
 */
function approvedSpanInstructions(spans: ApprovedSpan[], lines: string[]): string {
  if (spans.length === 0) return '';
  const sections = spans.map(s => {
    const excerpt = lines.slice(s.startLine - 1, s.endLine).join('\n');
    return `  [APPROVED — DO NOT CHANGE — reason: ${s.reason}]\n${excerpt}`;
  });
  return '\nApproved sections that MUST remain unchanged:\n' + sections.join('\n\n');
}

/**
 * Attempt an LLM prose rewrite. Returns original if LLM unavailable or fails.
 */
export async function rewritePass(input: RewriteInput): Promise<RewriteResult> {
  const { fountain, issues, passName, approvedSpans } = input;
  if (issues.length === 0) return { revised: fountain, usedLLM: false };

  const lines = fountain.split('\n');
  const issueBlock = issues
    .map(i => `  [${i.severity.toUpperCase()}] ${i.location} — ${i.rule}: ${i.description}${i.suggestedFix ? ` (fix: ${i.suggestedFix})` : ''}`)
    .join('\n');

  const prompt = [
    `You are a screenplay editor performing the "${passName}" revision pass.`,
    `Rewrite the following Fountain screenplay to fix ONLY the issues listed below.`,
    `Do not change anything outside the scope of the "${passName}" pass.`,
    `Return the COMPLETE revised Fountain text with no extra commentary.`,
    '',
    'Issues to fix:',
    issueBlock,
    approvedSpanInstructions(approvedSpans, lines),
    '',
    '--- FOUNTAIN DRAFT ---',
    fountain,
    '--- END DRAFT ---',
  ].join('\n');

    // ── Try LLM ───────────────────────────────────────────────────────────────
  try {
    const ai = await import('../../engine/ai.ts');
    ai.getAI(); // throws if no key

    const response = await ai.geminiProvider.generate({
      model: ai.modelForTask('REVISION'),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 8192 },
    });
    const text = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    // Accept if non-empty and at least 70% of original length — allows meaningful
    // compression (tightened dialogue, removed padding) without accepting truncations.
    if (text.length > 0 && text.length >= fountain.length * 0.70) {
      return { revised: text, usedLLM: true };
    }
  } catch {
    // No key or LLM error — stub fallback
  }

  return { revised: fountain, usedLLM: false };
}
