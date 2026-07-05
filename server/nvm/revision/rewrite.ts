// Wave 39 — LLM Prose Rewriter
// Given a fountain draft + diagnosed issues, calls Gemini to rewrite
// only the flagged layer, preserving approved spans.
// Falls back (returns original) when LLM is unavailable.

import type { RevisionIssue, ApprovedSpan, PassName, PassResult, StoryContext } from './passes/types.ts';

export interface RewriteInput {
  fountain: string;
  issues: RevisionIssue[];
  passName: PassName;
  approvedSpans: ApprovedSpan[];
  storyContext?: StoryContext;
  /** Compact summaries of passes that already ran — prevents undoing prior improvements. */
  priorPassResults?: PassResult[];
}

export interface RewriteResult {
  revised: string;
  usedLLM: boolean;
}

/** Minimum fraction of the original length an accepted rewrite must retain.
 *  Below this we assume the model silently dropped scenes. */
export const REWRITE_MIN_LENGTH_RATIO = 0.80;

export type RewriteVerdict =
  | { accept: true }
  | { accept: false; reason: 'truncated' | 'too_short' | 'empty' };

/**
 * Decide whether an LLM rewrite is safe to accept. Pure and exported so the
 * truncation/length guards can be unit-tested without a live model.
 *
 * - Rejects when the model hit its token ceiling (finishReason MAX_TOKENS): the
 *   screenplay's ending was dropped, so accepting would delete the final act.
 * - Rejects when output is empty or shrank below REWRITE_MIN_LENGTH_RATIO.
 */
export function evaluateRewrite(
  revisedText: string,
  originalLength: number,
  finishReason: string | undefined,
): RewriteVerdict {
  if (finishReason === 'MAX_TOKENS') return { accept: false, reason: 'truncated' };
  const text = revisedText.trim();
  if (text.length === 0) return { accept: false, reason: 'empty' };
  if (text.length < originalLength * REWRITE_MIN_LENGTH_RATIO) {
    return { accept: false, reason: 'too_short' };
  }
  return { accept: true };
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
  const { fountain, issues, passName, approvedSpans, storyContext, priorPassResults } = input;
  if (issues.length === 0) return { revised: fountain, usedLLM: false };

  const { sanitizeForPrompt } = await import('../../lib/prompt-utils.ts');

  const lines = fountain.split('\n');
  const issueBlock = issues
    .map(i => {
      const loc = sanitizeForPrompt(i.location, 120);
      const desc = sanitizeForPrompt(i.description, 300);
      const fix = i.suggestedFix ? ` (fix: ${sanitizeForPrompt(i.suggestedFix, 200)})` : '';
      return `  [${i.severity.toUpperCase()}] ${loc} — ${i.rule}: ${desc}${fix}`;
    })
    .join('\n');

  // Build story context preamble so the LLM understands the tone and stakes
  const contextBlock: string[] = [];
  if (storyContext?.theme) contextBlock.push(`STORY THEME: ${sanitizeForPrompt(storyContext.theme, 200)}`);
  if (storyContext?.genre) contextBlock.push(`GENRE: ${sanitizeForPrompt(storyContext.genre, 80)}`);
  if (storyContext?.directorStyle) contextBlock.push(`DIRECTOR STYLE: ${sanitizeForPrompt(storyContext.directorStyle, 150)}`);
  if (storyContext?.characters) contextBlock.push(`CHARACTERS: ${sanitizeForPrompt(storyContext.characters, 400)}`);

  // Build prior pass coordination block — tells the LLM what earlier passes
  // already changed so it doesn't undo improvements or re-diagnose resolved issues.
  const priorBlock: string[] = [];
  if (priorPassResults && priorPassResults.length > 0) {
    priorBlock.push('Revision passes already completed before this one:');
    for (const r of priorPassResults) {
      const changed = r.changed ? 'CHANGED' : 'no changes';
      const summary = sanitizeForPrompt(r.summary, 100);
      priorBlock.push(`  [${r.pass}] ${changed}: ${summary}`);
    }
    priorBlock.push('Do NOT undo any of the above improvements.');
  }

  const prompt = [
    ...(contextBlock.length > 0 ? [...contextBlock, ''] : []),
    `You are a screenplay editor performing the "${passName}" revision pass.`,
    `Rewrite the following Fountain screenplay to fix ONLY the issues listed below.`,
    `Preserve the story's theme, tone, and character voices. Do not change anything outside the scope of the "${passName}" pass.`,
    `Return the COMPLETE revised Fountain text with no extra commentary.`,
    '',
    ...(priorBlock.length > 0 ? [...priorBlock, ''] : []),
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
    const { logger } = await import('../../lib/logger.ts');
    ai.getAI(); // throws if no key

    // Budget output tokens to comfortably exceed the input so the model can return
    // the full screenplay without truncation. Roughly 1 token ≈ 4 chars; add 50%
    // headroom and clamp to a sane ceiling.
    const estInputTokens = Math.ceil(fountain.length / 4);
    const maxOutputTokens = Math.min(32_768, Math.max(8_192, Math.ceil(estInputTokens * 1.5)));

    const response = await ai.geminiProvider.generate({
      model: ai.modelForTask('REVISION'),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens },
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = (candidate?.content?.parts?.[0]?.text ?? '').trim();

    const verdict = evaluateRewrite(text, fountain.length, finishReason);
    if (verdict.accept) {
      return { revised: text, usedLLM: true };
    }
    // Rejected — log why so silent quality loss is observable, then keep original.
    logger.warn('revision_rewrite_rejected', {
      passName, reason: verdict.reason, finishReason,
      inputChars: fountain.length, outputChars: text.length,
    });
  } catch (err) {
    // No key or LLM error — log then fall back to the unchanged draft.
    const { logger } = await import('../../lib/logger.ts');
    logger.warn('revision_rewrite_failed', { passName, message: (err as Error).message });
  }

  return { revised: fountain, usedLLM: false };
}
