// rewrite-llm.ts — the generative half of the revision pipeline's prose
// rewriter (split out of ./rewrite.ts, retrospective #5, 2026-09-03).
//
// WHY IT IS A SEPARATE FILE. ARCHITECTURE.md §1 promises the analysis core is
// pure and keyless. Until this split that was prose, not a module boundary:
// scripts/lib/import-graph.mjs treats `await import('…')` as an edge exactly
// like a static import (see its header — the receipt gate depends on that, so
// a lazy import cannot be used to hide a dependency), so rewrite.ts's four
// lazy imports put server/engine/ai.ts, server/engine/ai-provider.ts,
// server/lib/ai-providers/** (an HTTP client), server/lib/validation.ts and
// server/nvm/generate/craft-spec.ts inside the reachable set rooted at
// server/nvm/analyze/doctor.ts. craft-spec.ts's own header says it "must never
// be imported by, or influence, the deterministic doctor/scoring path" — the
// import graph disagreed with it.
//
// None of this code could ever RUN on a deterministic path: rewrite.ts returns
// before reaching the registered rewriter whenever isDiagnoseOnly() is true,
// and the doctor, the calibration corpus builder and the worker pool all run
// inside runDiagnoseOnly(). Splitting the file makes the import graph say what
// was already true of the call graph.
//
// WIRING. This module registers itself with rewrite.ts at load, and
// server/routes/nvm/revision.ts — the one entrypoint that runs passes outside
// runDiagnoseOnly() — imports it. tests/core/pure-core-boundary.test.ts fails
// if doctor.ts can reach this file (or engine/ai.ts) again.

import { logger } from '../../lib/logger.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import { getAI, geminiProvider, modelForTask } from '../../engine/ai.ts';
import { buildCraftPromptSection, looksLikeAnimationGenre } from '../generate/craft-spec.ts';
import type { ApprovedSpan } from './passes/types.ts';
import {
  evaluateRewrite,
  registerLlmRewriter,
  type RewriteInput,
  type RewriteResult,
} from './rewrite.ts';

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
 *
 * rewrite.ts::rewritePass owns the two short-circuits that used to open this
 * function (no issues, and the diagnose-only scope) and never calls the
 * registered rewriter when either applies — so by the time control reaches
 * here, an LLM call is genuinely intended.
 */
async function llmRewrite(input: RewriteInput): Promise<RewriteResult> {
  const { fountain, issues, passName, approvedSpans, storyContext, priorPassResults } = input;

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

  // Craft-spec injection (user-directed P0 exception — see
  // server/nvm/generate/craft-spec.ts header): compact form so the block
  // stays proportionate next to the pass-scoped issue list and the full
  // draft text below. Statically imported now that this whole function lives
  // outside the deterministic core — which is what craft-spec.ts's own header
  // has always required, and what the lazy import failed to deliver.
  const craftBlock = buildCraftPromptSection({
    compact: true,
    animation: looksLikeAnimationGenre(storyContext?.genre),
  });

  const prompt = [
    ...(contextBlock.length > 0 ? [...contextBlock, ''] : []),
    `You are a screenplay editor performing the "${passName}" revision pass.`,
    `Rewrite the following Fountain screenplay to fix ONLY the issues listed below.`,
    `Preserve the story's theme, tone, and character voices. Do not change anything outside the scope of the "${passName}" pass.`,
    `Return the COMPLETE revised Fountain text with no extra commentary.`,
    '',
    craftBlock,
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
    getAI(); // null when no key — geminiProvider.generate below throws on it

    // Budget output tokens to comfortably exceed the input so the model can return
    // the full screenplay without truncation. Roughly 1 token ≈ 4 chars; add 50%
    // headroom and clamp to a sane ceiling.
    const estInputTokens = Math.ceil(fountain.length / 4);
    const maxOutputTokens = Math.min(32_768, Math.max(8_192, Math.ceil(estInputTokens * 1.5)));

    const response = await geminiProvider.generate({
      model: modelForTask('REVISION'),
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
    logger.warn('revision_rewrite_failed', { passName, message: (err as Error).message });
  }

  return { revised: fountain, usedLLM: false };
}

// Self-registration: importing this module is what wires the generative half
// into rewrite.ts's rewritePass. server/routes/nvm/revision.ts imports it for
// exactly that reason; nothing on the deterministic path does, and nothing on
// the deterministic path would reach the rewriter even if it did.
registerLlmRewriter(llmRewrite);
