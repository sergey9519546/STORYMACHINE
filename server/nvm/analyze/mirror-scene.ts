// Mirror-Scene / Structural-Echo excellence detector — ROADMAP §5 "mirror-scene".
// Deterministic, no LLM. Credits a script for deliberate structural rhyming:
// a scene near the end that echoes a scene near the beginning (same location
// returned to, or a full bookend), a hallmark of controlled craft.
//
// NEVER-PADDED: an excellence rule that fires on mediocre/random input is a
// FAILING rule. Conservative by design — require a genuine positional echo,
// not a coincidental recurring location. A location that also shows up
// through the middle of the script is a standing set, not a bookend, and is
// explicitly excluded.

export interface MirrorEcho {
  openingSceneIndex: number;
  closingSceneIndex: number;
  location: string;
  kind: 'location-bookend' | 'return-to-open';
}

export interface MirrorReport {
  echoes: MirrorEcho[];
  hasBookend: boolean;
  strength: number;   // 0..1 composite. 0 when scored is false.
  scored: boolean;
}

const MIN_SCENES = 8;
const EDGE_FRACTION = 0.15; // "first/last ~15% of scenes"

interface ParsedScene {
  index: number;
  location: string; // normalized location key, '' if unparseable
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

/**
 * Extract a normalized location key from a scene heading line, e.g.
 * "INT. JOHN'S APARTMENT - NIGHT" -> "johns apartment".
 * Returns '' when no usable location can be recovered.
 */
function normalizeLocation(sceneText: string): string {
  const headingLine = sceneText.split('\n', 1)[0] ?? '';
  const match = headingLine.match(/^(?:INT|EXT)[.\s/]+(.+)$/i);
  if (!match) return '';
  let body = match[1];
  // Strip trailing time-of-day / scene-number qualifiers after the last dash.
  const dashIdx = body.lastIndexOf(' - ');
  if (dashIdx !== -1) body = body.slice(0, dashIdx);
  body = body
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return body;
}

function parseScenes(fountain: string): ParsedScene[] {
  const scenes = scenesFromFountain(fountain);
  return scenes.map((s, i) => ({ index: i, location: normalizeLocation(s) }));
}

/**
 * Detect mirror-scene / structural-echo excellence signal.
 * Guards: empty input, no scene headings, single scene, malformed headings,
 * and scripts too short (< MIN_SCENES) for position to be meaningful all
 * abstain (scored:false, echoes:[]).
 */
export function detectMirrorScenes(fountain: string): MirrorReport {
  if (typeof fountain !== 'string' || fountain.trim().length === 0) {
    return { echoes: [], hasBookend: false, strength: 0, scored: false };
  }

  const scenes = parseScenes(fountain);
  const n = scenes.length;
  if (n < MIN_SCENES) {
    return { echoes: [], hasBookend: false, strength: 0, scored: false };
  }

  const located = scenes.filter(s => s.location.length > 0);
  if (located.length < MIN_SCENES) {
    // Too few scenes with usable locations to claim structural symmetry.
    return { echoes: [], hasBookend: false, strength: 0, scored: false };
  }

  const edgeCount = Math.max(1, Math.round(n * EDGE_FRACTION));
  const openingIdx = new Set<number>();
  const closingIdx = new Set<number>();
  for (let i = 0; i < edgeCount; i++) openingIdx.add(i);
  for (let i = n - edgeCount; i < n; i++) closingIdx.add(i);
  // Middle third — occurrences here disqualify a location as a bookend
  // (it's a recurring standing set, not a deliberate echo).
  const midStart = Math.floor(n / 3);
  const midEnd = Math.ceil((2 * n) / 3);

  // Group scene indices by normalized location.
  const byLocation = new Map<string, number[]>();
  for (const s of scenes) {
    if (!s.location) continue;
    const arr = byLocation.get(s.location) ?? [];
    arr.push(s.index);
    byLocation.set(s.location, arr);
  }

  const echoes: MirrorEcho[] = [];

  for (const [location, indices] of byLocation) {
    const openingHits = indices.filter(i => openingIdx.has(i));
    const closingHits = indices.filter(i => closingIdx.has(i));
    if (openingHits.length === 0 || closingHits.length === 0) continue;

    // Guard: recurring standing set — appears in the middle third too.
    const spansMiddle = indices.some(i => i >= midStart && i < midEnd);
    if (spansMiddle) continue;

    echoes.push({
      openingSceneIndex: Math.min(...openingHits),
      closingSceneIndex: Math.max(...closingHits),
      location,
      kind: 'location-bookend',
    });
  }

  // Special, higher-strength case: the FINAL scene's location equals the
  // OPENING scene's location specifically.
  const first = scenes[0];
  const last = scenes[n - 1];
  let hasReturnToOpen = false;
  if (first.location && last.location && first.location === last.location) {
    hasReturnToOpen = true;
    // Replace (or add) the matching bookend echo with the stronger kind.
    const idx = echoes.findIndex(e => e.location === first.location);
    const returnEcho: MirrorEcho = {
      openingSceneIndex: first.index,
      closingSceneIndex: last.index,
      location: first.location,
      kind: 'return-to-open',
    };
    if (idx !== -1) echoes[idx] = returnEcho;
    else echoes.push(returnEcho);
  }

  echoes.sort((a, b) => a.openingSceneIndex - b.openingSceneIndex);

  const hasBookend = echoes.length > 0;
  const genuineCount = echoes.filter(e => e.kind === 'location-bookend').length;
  const composite = Math.min(1, genuineCount * 0.35) + (hasReturnToOpen ? 0.45 : 0);
  const strength = hasBookend ? Math.min(1, composite) : 0;

  return { echoes, hasBookend, strength, scored: true };
}
