// Feature flags for gating experimental/research features behind Labs toggle.
//
// ROADMAP P2 requirement: Gate OASIS and ~38 research panels behind a single
// Labs flag so the default experience is Doctor + Editor only.

/**
 * Check if Labs features are enabled.
 * 
 * Labs features include:
 * - OASIS Story Machine (multi-agent simulation)
 * - Research panels (NVM, converge, twin, etc.)
 * - Experimental surfaces
 * 
 * Default: OFF (writers see Doctor + Editor only)
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
