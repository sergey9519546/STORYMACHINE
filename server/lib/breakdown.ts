// Run 14, Deliverable 2 — Production breakdown export. Pure module (no I/O,
// no Date.now(), no randomness): turns raw Fountain text into one row per
// scene (scene number, slug, parsed location/INT-EXT/time-of-day, speaking
// characters, word count, has-clock, has-clue-seeded) and serializes that to
// RFC 4180-ish CSV. Consumed by POST /api/export/breakdown
// (server/routes/export.ts) for the CSV attachment, and by
// server/lib/pitchkit-html.ts (via analyzeSceneCharacters) so the pitch kit's
// character-map SVG shares the exact same per-scene speaker/dialogue-line
// tally as the breakdown CSV, instead of re-deriving it a third way.
//
// E1-d — expanded to what a real line producer/1st AD needs: cast count,
// crowd/extras signal, props, vehicles, stunts, practical SFX, animals,
// weapons (all lexicon-based, extracted from ACTION lines only — see the
// "Production-element lexicons" section below for why), a night-exterior
// flag (the expensive INT/EXT-and-daypart combination), an eighths-of-a-page
// length estimate, and a continuity-day hint parsed from the slugline's
// time-of-day segment. Plus a whole-script BreakdownSummary roll-up. The
// original 9 fields/columns are unchanged and stay first in the row/CSV for
// backward compatibility with any existing consumer.
//
// Scene segmentation below intentionally MIRRORS server/nvm/analyze/
// fountain-analyzer.ts's segmentScenes()/normalizeCharacterName() (same
// preamble-folding rule: any blocks before the first scene_heading fold into
// scene 0 rather than being dropped; same no-heading fallback: a single
// 'UNTITLED SCENE'). It is a deliberate, small duplication rather than an
// import: those two helpers are not exported by fountain-analyzer.ts (it has
// no reason to expose them — its own callers only need the aggregated
// FountainAnalysis), and this run's constraints keep nvm/** as an
// import-only surface. Keeping the segmentation identical is what lets this
// file zip its own per-scene rows against analyzeFountainText()'s `records`
// array by plain index (records[idx].clockRaised / .seededClueIds) with no
// re-alignment logic — if the two segmentations ever produced a different
// scene count or order for the same input, that zip would silently
// misattribute clock/clue flags to the wrong scene, so any future edit to
// fountain-analyzer.ts's segmentScenes() must be mirrored here.

import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';

// ── Scene segmentation (mirrors fountain-analyzer.ts — see file header) ─────

interface RawScene {
  slug: string;
  blocks: FountainBlock[];
}

function segmentScenesLocal(blocks: FountainBlock[]): RawScene[] {
  const headingIdxs: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene_heading') headingIdxs.push(i);
  }

  if (headingIdxs.length === 0) {
    return [{ slug: 'UNTITLED SCENE', blocks }];
  }

  const scenes: RawScene[] = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h];
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : blocks.length;
    scenes.push({ slug: blocks[start].text.trim(), blocks: blocks.slice(start + 1, end) });
  }
  if (headingIdxs[0] > 0) {
    scenes[0] = { ...scenes[0], blocks: [...blocks.slice(0, headingIdxs[0]), ...scenes[0].blocks] };
  }
  return scenes;
}

function normalizeCharacterName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

// ── Per-scene word count ─────────────────────────────────────────────────────
// Every non-empty, non-boneyard/synopsis/note block's text contributes its
// whitespace-split word count — including the scene heading isn't meaningful
// (it's metadata, not screenplay prose the reader experiences), so
// segmentScenesLocal's `blocks` (which already excludes the heading itself)
// is exactly the right slice to sum over.
function sceneWordCount(blocks: FountainBlock[]): number {
  let words = 0;
  for (const b of blocks) {
    if (b.type === 'boneyard' || b.type === 'synopsis' || b.type === 'note') continue;
    const text = b.text.trim();
    if (!text) continue;
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return words;
}

// ── Per-scene character/dialogue tally ───────────────────────────────────────

/** One scene's speaking characters (first-appearance order, "speaking" means
 *  they own at least one dialogue block — a bare character cue with no
 *  dialogue text following it never counts, matching fountain-analyzer.ts's
 *  detectSpeakingCharacterCount discipline) plus a per-character dialogue-
 *  line count for the pitch kit's character-map node sizing. */
export interface SceneCharacterTally {
  sceneIdx: number;
  /** First-appearance order of characters who speak at least once in this scene. */
  speakers: string[];
  /** Dialogue-line count per speaker, keyed by the same normalized name in `speakers`. */
  dialogueLineCounts: Record<string, number>;
}

function tallySceneCharacters(blocks: FountainBlock[]): { order: string[]; counts: Record<string, number> } {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  let currentSpeaker = '';

  for (const b of blocks) {
    const text = b.text.trim();
    if (!text) continue;

    if (b.type === 'character' || b.type === 'dual_dialogue') {
      currentSpeaker = normalizeCharacterName(text);
    } else if (b.type === 'dialogue') {
      if (!currentSpeaker) continue;
      if (!(currentSpeaker in counts)) {
        counts[currentSpeaker] = 0;
        order.push(currentSpeaker);
      }
      counts[currentSpeaker]++;
    }
  }

  return { order, counts };
}

/** Per-scene speaker + dialogue-line-count tally for the whole document —
 *  the shared seam breakdown rows (speakingCharacters) and the pitch kit's
 *  character map (node size + co-scene edges) both read, so the two exports
 *  can never disagree about who spoke where. Pure/deterministic, same
 *  contract as analyzeFountainText. */
export function analyzeSceneCharacters(fountain: string): SceneCharacterTally[] {
  if (!fountain || !fountain.trim()) return [];
  const blocks = parseFountain(fountain);
  const rawScenes = segmentScenesLocal(blocks);
  return rawScenes.map((rs, idx) => {
    const { order, counts } = tallySceneCharacters(rs.blocks);
    return { sceneIdx: idx, speakers: order, dialogueLineCounts: counts };
  });
}

// ── Slug parsing: INT/EXT, location, time-of-day ─────────────────────────────

const INT_EXT_RE = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s*[.:\-]?\s*/i;

/** Split the trailing " - TIME-OF-DAY" (or en/em-dash variant) off a scene
 *  heading's location, at the LAST such separator — a location itself only
 *  rarely contains a bare hyphen, but "LOCATION - SUB-LOCATION - DAY" is
 *  plausible, and the time-of-day is always the final segment by
 *  screenplay convention. */
const DASH_SEPARATOR_RE = /\s[-–—]\s/;

export interface ParsedSlug {
  intExt: string;
  location: string;
  timeOfDay: string;
}

export function parseSlug(rawSlug: string): ParsedSlug {
  const slug = rawSlug.trim();
  const introMatch = slug.match(INT_EXT_RE);
  let intExt = 'N/A';
  let rest = slug;

  if (introMatch) {
    const raw = introMatch[1].toUpperCase().replace(/\./g, '');
    intExt = raw === 'I/E' ? 'INT/EXT' : raw;
    rest = slug.slice(introMatch[0].length).trim();
  }

  const parts = rest.split(DASH_SEPARATOR_RE);
  let location = rest;
  let timeOfDay = 'N/A';
  if (parts.length > 1) {
    timeOfDay = parts[parts.length - 1].trim() || 'N/A';
    location = parts.slice(0, -1).join(' - ').trim();
  }
  if (!location) location = rest || 'UNKNOWN';

  return { intExt, location, timeOfDay };
}

// ── Continuity-day parsing ────────────────────────────────────────────────────
// Converts a parsed time-of-day segment (ParsedSlug.timeOfDay, above) into a
// shooting-day-continuity hint the way an AD actually uses one when
// scheduling: an explicit numbered day ("DAY 3" → continuity chain member
// #3), or a same-story-time continuation flag ("CONTINUOUS" / "LATER" /
// "SAME TIME" — the scene picks up right where the previous one left off,
// which matters for wardrobe/makeup/prop continuity even across a location
// change. "MOMENTS LATER" intentionally matches the LATER branch below (the
// LATER keyword alone is the continuity signal, regardless of what precedes
// it). Returns null for a plain daypart (DAY, NIGHT, DAWN, DUSK, MORNING,
// AFTERNOON, EVENING) with no continuity signal, which is the common case
// and not itself meaningful.
const CONTINUITY_DAY_NUMBER_RE = /\bDAY\s*(\d+)\b/;
const CONTINUITY_CONTINUOUS_RE = /\bCONTINUOUS\b/;
const CONTINUITY_LATER_RE = /\bLATER\b/;
const CONTINUITY_SAME_TIME_RE = /\bSAME TIME\b/;

export function parseContinuityDay(timeOfDay: string): string | null {
  const t = timeOfDay.toUpperCase();
  const dayMatch = t.match(CONTINUITY_DAY_NUMBER_RE);
  if (dayMatch) return `DAY ${dayMatch[1]}`;
  if (CONTINUITY_CONTINUOUS_RE.test(t)) return 'CONTINUOUS';
  if (CONTINUITY_LATER_RE.test(t)) return 'LATER';
  if (CONTINUITY_SAME_TIME_RE.test(t)) return 'SAME TIME';
  return null;
}

// ── Production-element lexicons ──────────────────────────────────────────────
// Deliberately NOT imported from fountain-analyzer.ts's own lexicons (e.g.
// DANGER_TENSION_WORDS, CONCRETE_NOUNS, buildLexiconRegex): those exist to
// score narrative tension/craft SIGNALS for the doctor/coverage surface,
// tuned against the calibration corpus for that purpose. These exist to flag
// concrete PRE-PRODUCTION ELEMENTS (what a line producer/1st AD budgets and
// schedules) — a different purpose with its own tuning, so this is a
// deliberate small duplication of the "build a word-boundary regex from a
// term list" shape, not a cross-purpose import (same discipline as the
// segmentScenesLocal duplication documented at the top of this file).
function escapeRegExpTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTermRegex(terms: string[]): RegExp {
  return new RegExp(`\\b(?:${terms.map(escapeRegExpTerm).join('|')})\\b`, 'gi');
}

/** All per-scene lexicon extraction below is deliberately scoped to ACTION
 *  lines only (FountainBlock.type === 'action') — a real breakdown sheet
 *  marks props/vehicles/stunts/sfx/animals/weapons that appear ON SCREEN,
 *  which is what action description shows, not what a character merely
 *  talks about. A character saying "I took a crash course in first aid" or
 *  "she's a real firecracker" must never flag a stunt/sfx on the sheet —
 *  scoping to action lines is exactly what prevents that class of false
 *  positive. (speakingCharacters and wordCount, unchanged from Deliverable 1,
 *  remain the two fields that intentionally DO read dialogue — a
 *  character's speech is exactly the signal those two need, so dialogue
 *  inclusion there is correct, not an oversight.) Scene-heading, transition,
 *  shot, and parenthetical lines are out of scope too, for the same reason:
 *  only prose the reader/viewer experiences as staged action counts. */
function sceneActionText(blocks: FountainBlock[]): string {
  return blocks
    .filter(b => b.type === 'action')
    .map(b => b.text)
    .join('\n');
}

// Sensible per-scene ceilings so a chaotic action scene (a battle, a riot)
// can't produce a 60-item unusable list — a real breakdown sheet lists the
// practical top items for a department head to read at a glance, not an
// exhaustive inventory. Kept in first-appearance order (see
// extractLexiconHits), so the cap keeps the earliest-mentioned items, which
// tend to be the ones the scene is actually built around.
const CATEGORY_CAP = 12;
const PROPS_CAP = 15; // props are the most numerous category in practice

/** Collects distinct lexicon hits from `text`, upper-cased, in order of
 *  first appearance, capped at `cap` entries. `regex` must carry the 'g'
 *  flag (buildTermRegex always sets it) for matchAll to work; matchAll
 *  clones the regex internally per spec, so a shared global regex object
 *  reused across scenes is safe here (contrast hasLexiconMatch below,
 *  which uses .test() and must guard the shared-object statefulness
 *  itself). */
function extractLexiconHits(text: string, regex: RegExp, cap: number): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of text.matchAll(regex)) {
    const key = m[0].toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered.slice(0, cap);
}

/** Boolean presence check against a shared global lexicon regex. `.test()`
 *  on a 'g'-flagged RegExp is STATEFUL — it advances `lastIndex` on every
 *  call, so reusing the same regex object across scenes without resetting
 *  it first can make a later scene's genuine match silently return false
 *  because the cursor is already parked past that offset. This resets
 *  `lastIndex` before every test specifically to avoid that class of bug
 *  (the module-level consts below are shared singletons, not re-created
 *  per scene, precisely so this reset matters). */
function hasLexiconMatch(text: string, regex: RegExp): boolean {
  regex.lastIndex = 0;
  return regex.test(text);
}

// Generic on-screen hand props / set-dressing objects, tracked as its own
// category distinct from vehicles/weapons/animals below — matches the
// standard ~15-category breakdown-sheet convention (Cast, Extras, Stunts,
// Vehicles, Animals, Props, Special Effects, ... are always kept separate
// so nothing is double-budgeted under two line items).
const PROPS_LEXICON = [
  'PHONE', 'CELL PHONE', 'SMARTPHONE', 'LAPTOP', 'COMPUTER', 'TABLET', 'CAMERA',
  'BRIEFCASE', 'SUITCASE', 'LUGGAGE', 'BACKPACK', 'PURSE', 'WALLET', 'HANDBAG',
  'FLASHLIGHT', 'LANTERN', 'CANDLE', 'CANDLES', 'KEY', 'KEYS', 'BOOK', 'BOOKS',
  'LETTER', 'ENVELOPE', 'NEWSPAPER', 'PHOTOGRAPH', 'PHOTO', 'PAINTING', 'MAP',
  'COMPASS', 'BINOCULARS', 'RADIO', 'WALKIE-TALKIE', 'HEADPHONES', 'NOTEBOOK',
  'CIGARETTE', 'CIGARETTES', 'LIGHTER', 'MATCHES', 'MIRROR', 'CLOCK', 'WATCH',
  'RING', 'NECKLACE', 'BADGE', 'PASSPORT', 'TICKET', 'CASH', 'MONEY',
  'CREDIT CARD', 'TOOLBOX', 'HAMMER', 'SCREWDRIVER', 'WRENCH', 'DRILL',
  'SYRINGE', 'BANDAGE', 'FIRST AID KIT', 'HANDCUFFS', 'ROPE', 'DUCT TAPE',
  'CRATE', 'BOX', 'GUITAR', 'VIOLIN', 'TROPHY', 'STATUE', 'VASE', 'SAFE',
  'UMBRELLA', 'CANE',
];

const VEHICLES_LEXICON = [
  'CAR', 'CARS', 'TRUCK', 'TRUCKS', 'VAN', 'BUS', 'MOTORCYCLE', 'MOTORBIKE',
  'BICYCLE', 'BIKE', 'SCOOTER', 'TAXI', 'CAB', 'LIMO', 'LIMOUSINE', 'JEEP',
  'SUV', 'PICKUP', 'SEDAN', 'CONVERTIBLE', 'HELICOPTER', 'CHOPPER', 'PLANE',
  'AIRPLANE', 'JET', 'BOAT', 'SHIP', 'YACHT', 'FERRY', 'CANOE', 'KAYAK',
  'SUBMARINE', 'TRAIN', 'SUBWAY', 'TRAM', 'TROLLEY', 'AMBULANCE',
  'FIRE TRUCK', 'POLICE CAR', 'CRUISER', 'SQUAD CAR', 'TANK', 'ATV',
  'SNOWMOBILE', 'TRACTOR', 'FORKLIFT', 'GOLF CART', 'HEARSE', 'RICKSHAW',
  'SEGWAY',
];

const STUNTS_LEXICON = [
  'FIGHT', 'FIGHTS', 'FIGHTING', 'BRAWL', 'BRAWLING', 'PUNCH', 'PUNCHES',
  'KICK', 'KICKS', 'TACKLE', 'TACKLES', 'CHASE', 'CHASES', 'CAR CHASE',
  'CRASH', 'CRASHES', 'CRASHING', 'EXPLOSION', 'EXPLODES', 'EXPLODE',
  'GUNFIGHT', 'SHOOTOUT', 'FIREFIGHT', 'STUNT', 'STUNTMAN', 'FLIP',
  'BACKFLIP', 'SOMERSAULT', 'PLUNGE', 'PLUNGES', 'COLLIDE', 'COLLIDES',
  'COLLISION', 'AMBUSH', 'SKIRMISH', 'WRESTLE', 'WRESTLING', 'CHOKEHOLD',
  'WRECK', 'WRECKED', 'PURSUIT', 'FREEFALL', 'RAPPEL', 'PARKOUR',
  'DETONATION', 'HAND-TO-HAND', 'GRAPPLE', 'MELEE',
];

const SFX_LEXICON = [
  'BLOOD', 'BLOODY', 'BLOODIED', 'GORE', 'FIRE', 'FLAME', 'FLAMES', 'SMOKE',
  'HAZE', 'FOG', 'MIST', 'RAIN', 'SNOW', 'SLEET', 'HAIL', 'WIND', 'GUST',
  'GUSTS', 'DUST', 'DEBRIS', 'SPARKS', 'EMBER', 'EMBERS', 'STEAM', 'ASH',
  'ASHES', 'LIGHTNING', 'THUNDER', 'FLOOD', 'FLOODING', 'MUDSLIDE',
  'AVALANCHE', 'EARTHQUAKE', 'TREMOR', 'SHATTER', 'SHATTERED', 'SHATTERS',
  'SPLINTER', 'SPLINTERS', 'MUZZLE FLASH', 'BLOOD SPATTER',
];

const ANIMALS_LEXICON = [
  'DOG', 'DOGS', 'CAT', 'CATS', 'HORSE', 'HORSES', 'BIRD', 'BIRDS', 'SNAKE',
  'SNAKES', 'WOLF', 'WOLVES', 'BEAR', 'BEARS', 'LION', 'LIONS', 'TIGER',
  'TIGERS', 'DEER', 'RABBIT', 'RABBITS', 'FOX', 'FOXES', 'RAT', 'RATS',
  'MOUSE', 'MICE', 'PIG', 'PIGS', 'COW', 'COWS', 'GOAT', 'GOATS', 'SHEEP',
  'CHICKEN', 'CHICKENS', 'ROOSTER', 'OWL', 'OWLS', 'EAGLE', 'EAGLES',
  'HAWK', 'HAWKS', 'CROW', 'CROWS', 'RAVEN', 'RAVENS', 'SHARK', 'SHARKS',
  'WHALE', 'WHALES', 'DOLPHIN', 'DOLPHINS', 'MONKEY', 'MONKEYS', 'ELEPHANT',
  'ELEPHANTS', 'SPIDER', 'SPIDERS', 'BEE', 'BEES', 'ANT', 'ANTS', 'FISH',
  'ALLIGATOR', 'CROCODILE', 'COYOTE', 'COYOTES',
];

const WEAPONS_LEXICON = [
  'GUN', 'GUNS', 'PISTOL', 'PISTOLS', 'RIFLE', 'RIFLES', 'SHOTGUN',
  'SHOTGUNS', 'REVOLVER', 'REVOLVERS', 'HANDGUN', 'MACHINE GUN',
  'SNIPER RIFLE', 'ASSAULT RIFLE', 'KNIFE', 'KNIVES', 'DAGGER', 'DAGGERS',
  'SWORD', 'SWORDS', 'BLADE', 'BLADES', 'MACHETE', 'MACHETES', 'AXE',
  'HATCHET', 'CLUB', 'BOMB', 'BOMBS', 'GRENADE', 'GRENADES', 'EXPLOSIVE',
  'EXPLOSIVES', 'DYNAMITE', 'TASER', 'CROSSBOW', 'SPEAR', 'SPEARS',
  'BRASS KNUCKLES', 'SWITCHBLADE', 'BAYONET', 'CHAINSAW',
];

// Crowd/party/audience vocabulary — used only for the extrasSignal boolean
// (not a listed category, so no dedupe/cap needed; see hasLexiconMatch).
const EXTRAS_LEXICON = [
  'CROWD', 'CROWDS', 'CROWDED', 'MOB', 'THRONG', 'THRONGED', 'PARTY',
  'PARTYGOERS', 'AUDIENCE', 'SPECTATORS', 'ONLOOKERS', 'BYSTANDERS',
  'PEDESTRIANS', 'COMMUTERS', 'PROTESTERS', 'PROTESTORS', 'DEMONSTRATORS',
  'PARADE', 'RALLY', 'CONCERTGOERS', 'FANS', 'MASSES', 'HORDE', 'SWARM',
  'GATHERING', 'GATHERED', 'CONGREGATION', 'WORSHIPPERS', 'TOURISTS',
  'SHOPPERS', 'REVELERS', 'GUESTS', 'ATTENDEES', 'PACKED',
];

const PROPS_RE = buildTermRegex(PROPS_LEXICON);
const VEHICLES_RE = buildTermRegex(VEHICLES_LEXICON);
const STUNTS_RE = buildTermRegex(STUNTS_LEXICON);
const SFX_RE = buildTermRegex(SFX_LEXICON);
const ANIMALS_RE = buildTermRegex(ANIMALS_LEXICON);
const WEAPONS_RE = buildTermRegex(WEAPONS_LEXICON);
const EXTRAS_RE = buildTermRegex(EXTRAS_LEXICON);

// ── Page length (industry "eighths of a page") ───────────────────────────────
// The unit ADs actually schedule with is the EIGHTH of a page. Rather than
// trust the Fountain SOURCE's own line breaks (a plain-text .fountain file
// may legitimately hold an entire action paragraph as one long unwrapped
// line — some editors don't hard-wrap — so counting raw source lines would
// under-measure exactly the scenes this field most needs to catch), this
// estimates the FORMATTED line count per block from its character length,
// using the standard Courier 12pt / 1.5"-left-margin assumptions most
// professional breakdown/scheduling software uses:
//  - action / scene-heading-adjacent prose: full measure, ~60 characters/line
//  - dialogue / parenthetical: indented, narrower column, ~35 characters/line
//  - character cues: always their own single line, regardless of length
// Total formatted lines / 55 lines-per-page, expressed in eighths
// (55 / 8 ≈ 6.875 lines/eighth), is the same "~55 lines/page" approximation
// most scheduling tools default to. This is an acknowledged simplification,
// not a real pagination engine — true Final Draft pagination also depends on
// page-break widow/orphan rules this module has no access to — documented
// here so nobody mistakes pageEighths for exact page numbers.
const ACTION_CHARS_PER_LINE = 60;
const DIALOGUE_CHARS_PER_LINE = 35;
const LINES_PER_PAGE = 55;
const LINES_PER_EIGHTH = LINES_PER_PAGE / 8;

function blockFormattedLineCount(b: FountainBlock): number {
  if (b.type === 'boneyard' || b.type === 'synopsis' || b.type === 'note' || b.type === 'empty') return 0;
  const text = b.text.trim();
  if (!text) return 0;
  if (b.type === 'character' || b.type === 'dual_dialogue') return 1;
  const charsPerLine = (b.type === 'dialogue' || b.type === 'parenthetical') ? DIALOGUE_CHARS_PER_LINE : ACTION_CHARS_PER_LINE;
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function sceneFormattedLineCount(blocks: FountainBlock[]): number {
  let lines = 0;
  for (const b of blocks) lines += blockFormattedLineCount(b);
  return lines;
}

/** Eighths of a page for one scene, minimum 1 — there is no such thing as a
 *  0-eighths scene on a real shooting schedule; even a one-line scene
 *  consumes a slot. +1 line (added once, not per-block) accounts for the
 *  scene heading itself, which occupies its own page line but is excluded
 *  from `blocks` by segmentScenesLocal (the heading text lives in `slug`
 *  instead). */
function scenePageEighths(blocks: FountainBlock[]): number {
  const lines = sceneFormattedLineCount(blocks) + 1;
  return Math.max(1, Math.ceil(lines / LINES_PER_EIGHTH));
}

// ── Breakdown rows ────────────────────────────────────────────────────────────

export interface BreakdownRow {
  sceneNumber: number;
  slug: string;
  location: string;
  intExt: string;
  timeOfDay: string;
  speakingCharacters: string[];
  wordCount: number;
  hasClock: boolean;
  hasClueSeeded: boolean;
  /** Distinct speaking-character count for this scene — derived as
   *  speakingCharacters.length, kept as its own field so CSV consumers get a
   *  plain number instead of having to count a semicolon-joined list. */
  castCount: number;
  /** Crowd/party/audience vocabulary detected in this scene's ACTION lines
   *  (EXTRAS_LEXICON via hasLexiconMatch) — a signal that background/extras
   *  casting is likely needed, not a headcount. */
  extrasSignal: boolean;
  /** Concrete hand-prop / set-dressing nouns mentioned in ACTION lines
   *  (PROPS_LEXICON), deduped, first-appearance order, capped at PROPS_CAP. */
  props: string[];
  /** Vehicle mentions in ACTION lines (VEHICLES_LEXICON), same dedupe/order/cap discipline. */
  vehicles: string[];
  /** Stunt/action-choreography vocabulary in ACTION lines (STUNTS_LEXICON), same discipline. */
  stunts: string[];
  /** Practical special-effects vocabulary in ACTION lines (SFX_LEXICON), same discipline. */
  sfx: string[];
  /** Animal mentions in ACTION lines (ANIMALS_LEXICON), same discipline. */
  animals: string[];
  /** Weapon mentions in ACTION lines (WEAPONS_LEXICON), same discipline. */
  weapons: string[];
  /** EXT (or combined INT/EXT) heading combined with a NIGHT-containing
   *  time-of-day — the most expensive scheduling combination (night-shoot
   *  lighting/crew premiums), flagged explicitly rather than left for a
   *  producer to cross-reference intExt against timeOfDay by hand. */
  nightExterior: boolean;
  /** Scene length in eighths of a page — see "Page length" section above
   *  for the character-length-based formatted-line estimate and the
   *  ~55-lines-per-page / 6.875-lines-per-eighth assumption. */
  pageEighths: number;
  /** Shooting-day-continuity hint parsed from timeOfDay ("DAY 3",
   *  "CONTINUOUS", "LATER", "SAME TIME"), or null when the time-of-day is a
   *  plain daypart with no continuity signal — see parseContinuityDay. */
  continuityDay: string | null;
}

/** Build one row per scene from raw Fountain text. Deterministic: reruns
 *  analyzeFountainText (server/nvm/analyze/fountain-analyzer.ts) for the
 *  clockRaised/seededClueIds flags rather than trusting a caller-supplied
 *  report — same "recompute for authenticity" discipline as
 *  server/lib/coverage-html.ts's caller (POST /api/export/coverage). */
export function buildBreakdownRows(fountain: string): BreakdownRow[] {
  if (!fountain || !fountain.trim()) return [];

  const blocks = parseFountain(fountain);
  const rawScenes = segmentScenesLocal(blocks);
  const { records } = analyzeFountainText(fountain);

  return rawScenes.map((rs, idx) => {
    const { intExt, location, timeOfDay } = parseSlug(rs.slug);
    const { order } = tallySceneCharacters(rs.blocks);
    const record = records[idx];
    const actionText = sceneActionText(rs.blocks);

    return {
      sceneNumber: idx + 1,
      slug: rs.slug,
      location,
      intExt,
      timeOfDay,
      speakingCharacters: order,
      wordCount: sceneWordCount(rs.blocks),
      hasClock: record?.clockRaised ?? false,
      hasClueSeeded: (record?.seededClueIds.length ?? 0) > 0,
      castCount: order.length,
      extrasSignal: hasLexiconMatch(actionText, EXTRAS_RE),
      props: extractLexiconHits(actionText, PROPS_RE, PROPS_CAP),
      vehicles: extractLexiconHits(actionText, VEHICLES_RE, CATEGORY_CAP),
      stunts: extractLexiconHits(actionText, STUNTS_RE, CATEGORY_CAP),
      sfx: extractLexiconHits(actionText, SFX_RE, CATEGORY_CAP),
      animals: extractLexiconHits(actionText, ANIMALS_RE, CATEGORY_CAP),
      weapons: extractLexiconHits(actionText, WEAPONS_RE, CATEGORY_CAP),
      // nightExterior: EXT (or combined INT/EXT) heading + a NIGHT-containing
      // time-of-day — the expensive night-shoot combination.
      nightExterior: (intExt === 'EXT' || intExt === 'INT/EXT') && timeOfDay.toUpperCase().includes('NIGHT'),
      pageEighths: scenePageEighths(rs.blocks),
      continuityDay: parseContinuityDay(timeOfDay),
    };
  });
}

// ── Whole-script summary ──────────────────────────────────────────────────────

export interface BreakdownSummary {
  sceneCount: number;
  /** Distinct row.location strings across the whole script. */
  uniqueLocationCount: number;
  /** Distinct locations that appear under an INT (or combined INT/EXT)
   *  heading at least once. A location can land in both this and
   *  extLocationCount (e.g. "CAR" shot both INT and EXT). */
  intLocationCount: number;
  /** Distinct locations that appear under an EXT (or combined INT/EXT)
   *  heading at least once. */
  extLocationCount: number;
  /** Count of rows with nightExterior === true. */
  nightExteriorSceneCount: number;
  /** Distinct speaking-character names across every scene. */
  totalCastCount: number;
  /** The row with the highest castCount (first occurrence wins ties), or
   *  null for an empty script. */
  biggestCastScene: { sceneNumber: number; slug: string; castCount: number } | null;
  /** Scene counts (not mention counts) per element category — "how many
   *  scenes need a stunt coordinator", the unit a producer schedules
   *  against, not "how many stunt words appear". */
  propSceneCount: number;
  vehicleSceneCount: number;
  stuntSceneCount: number;
  sfxSceneCount: number;
  animalSceneCount: number;
  weaponSceneCount: number;
  extrasSceneCount: number;
  /** Sum of every row's pageEighths. */
  totalPageEighths: number;
  /** totalPageEighths / 8 — the standard "N pages, M eighths" conversion,
   *  left as a plain fraction (e.g. 92.375) rather than a formatted
   *  "92 3/8" string so callers can format it however their UI/CSV wants. */
  estimatedPageCount: number;
}

/** Whole-script roll-up a line producer reads first, before the per-scene
 *  detail. Pure function of already-built rows (no re-parsing) — every
 *  field above documents its own one-line derivation. */
export function buildBreakdownSummary(rows: BreakdownRow[]): BreakdownSummary {
  const locations = new Set<string>();
  const intLocations = new Set<string>();
  const extLocations = new Set<string>();
  const cast = new Set<string>();
  let nightExteriorSceneCount = 0;
  let propSceneCount = 0;
  let vehicleSceneCount = 0;
  let stuntSceneCount = 0;
  let sfxSceneCount = 0;
  let animalSceneCount = 0;
  let weaponSceneCount = 0;
  let extrasSceneCount = 0;
  let totalPageEighths = 0;
  let biggestCastScene: BreakdownSummary['biggestCastScene'] = null;

  for (const row of rows) {
    locations.add(row.location);
    if (row.intExt === 'INT' || row.intExt === 'INT/EXT') intLocations.add(row.location);
    if (row.intExt === 'EXT' || row.intExt === 'INT/EXT') extLocations.add(row.location);
    for (const name of row.speakingCharacters) cast.add(name);
    if (row.nightExterior) nightExteriorSceneCount++;
    if (!biggestCastScene || row.castCount > biggestCastScene.castCount) {
      biggestCastScene = { sceneNumber: row.sceneNumber, slug: row.slug, castCount: row.castCount };
    }
    if (row.props.length > 0) propSceneCount++;
    if (row.vehicles.length > 0) vehicleSceneCount++;
    if (row.stunts.length > 0) stuntSceneCount++;
    if (row.sfx.length > 0) sfxSceneCount++;
    if (row.animals.length > 0) animalSceneCount++;
    if (row.weapons.length > 0) weaponSceneCount++;
    if (row.extrasSignal) extrasSceneCount++;
    totalPageEighths += row.pageEighths;
  }

  return {
    sceneCount: rows.length,
    uniqueLocationCount: locations.size,
    intLocationCount: intLocations.size,
    extLocationCount: extLocations.size,
    nightExteriorSceneCount,
    totalCastCount: cast.size,
    biggestCastScene,
    propSceneCount,
    vehicleSceneCount,
    stuntSceneCount,
    sfxSceneCount,
    animalSceneCount,
    weaponSceneCount,
    extrasSceneCount,
    totalPageEighths,
    estimatedPageCount: totalPageEighths / 8,
  };
}

// ── CSV serialization ─────────────────────────────────────────────────────────

// The first 9 columns are the original Deliverable-1 set, unchanged in name
// and order for backward compatibility with any existing consumer that
// parses this CSV positionally. New E1-d columns are appended after them.
const CSV_HEADER = [
  'Scene Number', 'Slug', 'Location', 'INT/EXT', 'Time of Day',
  'Speaking Characters', 'Word Count', 'Has Clock', 'Has Clue Seeded',
  'Cast Count', 'Extras Signal', 'Props', 'Vehicles', 'Stunts', 'SFX',
  'Animals', 'Weapons', 'Night Exterior', 'Page Eighths', 'Continuity Day',
];

// CSV-injection (a.k.a. "formula injection") leading characters: spreadsheet
// apps (Excel, Google Sheets, LibreOffice) treat a cell whose content starts
// with any of these as a live formula, not text — '=', '+', '-', '@' are the
// classic OWASP-documented set, and a leading TAB (\t) or CR (\r) before one
// of them doesn't stop the app from still parsing it as a formula, so both
// are skipped before checking the first "real" character. Every field here
// is screenplay-derived (sluglines, character names, prop/vehicle/SFX lists)
// — attacker-controlled if the screenplay itself is — so e.g. a slugline
// "=HYPERLINK(...)" or a prop list starting "-2+3+cmd|..." exported to CSV
// and opened in Excel/Sheets would execute as a formula rather than display
// as text.
const CSV_FORMULA_LEAD = /^[\t\r]*[=+\-@]/;

/** RFC 4180 field escaping plus CSV-injection (formula injection) neutralization:
 *  - a field containing a comma, double quote, or any line break gets wrapped
 *    in double quotes, with every internal double quote doubled (unchanged
 *    RFC 4180 behavior);
 *  - a field whose first character (after skipping a leading TAB/CR) is one
 *    of `= + - @` gets a single quote prefixed, INSIDE the quoting above —
 *    the standard mitigation: spreadsheet apps render a leading `'` as a
 *    literal-text marker and strip it on display rather than treating the
 *    cell as a formula, while any other consumer (this project's own CSV
 *    parsing, a human reading the raw file) sees the character unchanged. A
 *    benign field ("Bob", "KITCHEN") is untouched either way.
 *  Exported so its escaping edge cases (comma-and-quote slugs, embedded
 *  newlines, formula-injection leads) are directly unit-testable without
 *  building a whole BreakdownRow. */
export function escapeCsvField(value: string): string {
  const neutralized = CSV_FORMULA_LEAD.test(value) ? `'${value}` : value;
  if (/["\n\r,]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

/** Serialize breakdown rows to a CSV document, header included. CRLF row
 *  separators per RFC 4180 (the format most spreadsheet tools assume). */
export function breakdownRowsToCsv(rows: BreakdownRow[]): string {
  const lines = [CSV_HEADER.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push([
      String(row.sceneNumber),
      row.slug,
      row.location,
      row.intExt,
      row.timeOfDay,
      row.speakingCharacters.join(';'),
      String(row.wordCount),
      row.hasClock ? 'true' : 'false',
      row.hasClueSeeded ? 'true' : 'false',
      String(row.castCount),
      row.extrasSignal ? 'true' : 'false',
      row.props.join(';'),
      row.vehicles.join(';'),
      row.stunts.join(';'),
      row.sfx.join(';'),
      row.animals.join(';'),
      row.weapons.join(';'),
      row.nightExterior ? 'true' : 'false',
      String(row.pageEighths),
      row.continuityDay ?? '',
    ].map(escapeCsvField).join(','));
  }
  return lines.join('\r\n');
}
