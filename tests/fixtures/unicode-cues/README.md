# Unicode character-cue fixtures

Three fixtures for `tests/core/unicode-character-cues.test.ts`, the regression
suite for the 2026-09-03 Unicode cue fix.

`accented-cues.fountain` and `ascii-cues.fountain` are **the same screenplay
twice**. Every byte is identical except the five character-cue names, which
carry diacritics in one file and not in the other:

| accented | ascii |
| -------- | ----- |
| `MARÍA`  | `MARIA` |
| `JOSÉ`   | `JOSE` |
| `ZOË`    | `ZOE` |
| `BJÖRN`  | `BJORN` |
| `RENÉE`  | `RENEE` |

Dialogue and action are deliberately pure ASCII in both, so a difference in
any doctor number can only come from the cue alphabet. Before the fix the
accented file parsed with **zero** recognised characters and **zero** dialogue
lines — every cue, every parenthetical and every dialogue line under it fell
back to `action`, because Fountain's grammar is context-dependent on the
preceding block. The test asserts the two files now produce the same character
list, the same dialogue counts, and the same doctor verdict.

`caseless-cues.fountain` is the negative direction: Japanese, Hebrew and
Arabic "cue" lines, each followed immediately by a line of dialogue — the
adjacency that promotes an ASCII all-caps line to a cue. Those scripts have no
case, so `\p{Lu}` does not match them and they stay `action`. That is a
deliberate choice, not an omission: admitting `\p{Lo}` would make every short
line of Japanese or Hebrew *action* a character cue. See the block comment at
the top of `src/lib/fountain.ts` for the full reasoning and for the
forced-cue (`@`) escape hatch this parser does not yet implement.

These files live in a SUBDIRECTORY on purpose.
`scripts/check-doctor-output-identity.mjs` scans `tests/fixtures/*.fountain`
flat, and its fixture set is a fixed 45. A `.fountain` file added at the top
level would silently become the 46th and make every future identity
comparison against an older tree report a spurious `+ fixture/... (present
only after)` difference.
