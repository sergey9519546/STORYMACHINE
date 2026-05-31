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
