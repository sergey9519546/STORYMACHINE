// Feature flags for gating experimental/research features behind Labs toggle.
//
// ROADMAP P2 requirement: Gate OASIS and ~38 research panels behind a single
// Labs flag so the default experience is Doctor + Editor only.
//
// DECISION #3 (2026-09-03, docs/DECISION_LOG.md) widened what this ONE flag
// covers: the GENERATIVE surface (rewrite/fix-with-AI, deep read,
// auto-analysis, the live-intent copilot, and the AI-provider Settings tabs)
// moved behind it too, because no test anywhere asserts that an LLM rewrite,
// a copilot suggestion, or a deep-read annotation is any GOOD — every
// LLM-adjacent test in the repo is plumbing (see
// docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md §11). Nothing was
// deleted: the code, the routes, and their plumbing tests all still run, and
// with Labs ON every generative control behaves exactly as before. Deliberately
// still ONE flag rather than two — a second toggle would be a second surface to
// explain, and both halves are gated for the same reason (unevaluated).

/**
 * Check if Labs features are enabled.
 *
 * Labs features include:
 * - OASIS Story Machine (multi-agent simulation)
 * - Research panels (NVM, converge, twin, etc.)
 * - The generative surface (Decision #3): "Fix with AI" in the editor,
 *   Script Doctor's "Deep read" and "Fix & verify", auto-analysis, the
 *   live-intent copilot, and Settings' AI-provider tabs
 * - Experimental surfaces
 *
 * Default: OFF (writers see the keyless Doctor + Editor only)
 */
export function getLabsEnabled(): boolean {
  try {
    return localStorage.getItem('sm_labs_enabled') === 'true';
  } catch {
    // localStorage unavailable (private browsing, etc.) — fail safe to OFF
    return false;
  }
}

/**
 * Enable or disable Labs features.
 * 
 * @param enabled - true to enable Labs, false to disable
 */
export function setLabsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('sm_labs_enabled', enabled.toString());
  } catch {
    // localStorage unavailable — fail silently, Labs stays OFF
  }
}
