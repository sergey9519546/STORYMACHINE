// Shared dialect-B scene splitter for the analyze/ modules. Splits raw Fountain
// into ordered scene texts on INT./EXT. boundaries. This is the single home for
// the splitter that had been re-derived, byte-identically, across a dozen
// signal modules (emotional-arc, scene-economy, theme-extract, cold-open-promise,
// bonding-signal, disclosure-ledger, genre-obligation, mirror-scene,
// pattern-establishment, silence-signal, story-spine, scene-value-shift).
//
// Behaviour is preserved verbatim from those copies — same split regex, same
// filter. Canonicalizing this "dialect B" regex to also recognize EST./I./E./
// forced-heading sluglines is a SEPARATE, scoring-gated change and is
// deliberately DEFERRED here (it would shift produced scene counts and must go
// through the measure-before-threshold gate). Do not change the regex in this
// dedupe.

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
export function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}
