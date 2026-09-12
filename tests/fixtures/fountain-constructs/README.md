# `every-construct.fountain`

One short screenplay carrying every construct `src/lib/fountain.ts` parses,
so that `tests/core/export-roundtrip.test.ts` can state the exact fate of each
one across an export and a re-import rather than only the fate of the three
committed scripts, which between them use nothing but boneyard comments
(`grep -cE '^#{1,6} |^= |\[\[|\^$|^~|^===' ` on each is 0 — the 2026-09-12
review's finding).

The constructs, and why each is here:

| line | construct | printing? |
|---|---|---|
| `# ACT ONE` | section heading | no |
| `= Maya finds the log…` | synopsis | no |
| `[[a standalone note…]]` | note on its own line | no |
| `… coffee. [[check this line]]` | inline note inside a printing line | no |
| `/* … */` | boneyard comment, over two lines | no |
| `DAN ^` | dual dialogue (second speaker) | yes |
| `> THE END <` | centered text | yes |
| `~Somewhere a radio plays` | lyric | yes |
| `!FORCED ACTION LINE IN CAPS` | forced action, all caps | yes |
| `!INT. THE MIND OF A KILLER` | forced action shaped like a scene heading | yes |
| `===` | page break | yes |

`!INT. THE MIND OF A KILLER` is the case worth keeping: before the round-2
repair it came back unforced and re-parsed as a SCENE HEADING, so the round
trip invented a scene (2 -> 3) in a script it was supposed to return unchanged.

This file is a fixture, not a corpus entry: it is not a real screenplay, it is
never scored for discrimination, and nothing outside the round-trip suite reads
it.
