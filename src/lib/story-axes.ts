// Story-axis option lists for the frontend, derived from the SERVER's
// authoritative name tables rather than hardcoded copies. The server routes
// validate dynamically against these same objects (routes/config.ts uses
// Object.keys(GENRE_NAMES | TONE_NAMES-via-zod | STRUCTURE_NAMES |
// ARC_TENSION_CURVES | STYLE_MODIFIERS | CHARACTER_ARC_MODES)), so importing
// them here guarantees the UI can never drift out of sync with what the
// server accepts — a new genre/tone/structure/style/arc/mode added on the
// server appears in every selector automatically.
//
// These are pure-data modules (no node-only imports): genre-router.ts and
// structure-presets.ts import only types from engine/types.ts, so they are
// safe to bundle client-side. Value (not type-only) imports from ../../server
// are new for src/, but the modules carry no secrets — only writer-facing
// names and prompt text — and Rollup tree-shaking drops the unused exports.

import { GENRE_NAMES, TONE_NAMES } from '../../server/lib/genre-router.ts';
import {
  STRUCTURE_NAMES,
  ARC_TENSION_CURVES,
  STYLE_MODIFIERS,
  CHARACTER_ARC_MODES,
} from '../../server/lib/structure-presets.ts';

export interface AxisOption {
  value: string;
  label: string;
  /** Optional longer writer-facing description (title/tooltip text). */
  description?: string;
}

function titleCase(id: string): string {
  return id
    .split('_')
    .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Director-style ids whose plain title-casing reads wrong (initials, hyphens,
// diacritics). Everything else title-cases cleanly ("wes_anderson" → "Wes
// Anderson").
const STYLE_LABEL_OVERRIDES: Record<string, string> = {
  pta: 'Paul Thomas Anderson',
  bong_joon_ho: 'Bong Joon-ho',
  park_chan_wook: 'Park Chan-wook',
  almodovar: 'Almodóvar',
};

export const GENRE_OPTIONS: AxisOption[] = Object.entries(GENRE_NAMES).map(
  ([value, label]) => ({ value, label }),
);

export const TONE_OPTIONS: AxisOption[] = Object.entries(TONE_NAMES).map(
  ([value, label]) => ({ value, label }),
);

export const STRUCTURE_OPTIONS: AxisOption[] = Object.entries(STRUCTURE_NAMES).map(
  ([value, label]) => ({ value, label }),
);

export const EMOTIONAL_ARC_OPTIONS: AxisOption[] = Object.keys(ARC_TENSION_CURVES).map(
  value => ({ value, label: titleCase(value) }),
);

export const DIRECTOR_STYLE_OPTIONS: AxisOption[] = Object.keys(STYLE_MODIFIERS).map(
  value => ({ value, label: STYLE_LABEL_OVERRIDES[value] ?? titleCase(value) }),
);

export const CHARACTER_ARC_MODE_OPTIONS: AxisOption[] = Object.entries(CHARACTER_ARC_MODES).map(
  ([value, def]) => ({ value, label: def.name, description: def.description }),
);
