# `real-corpus-manifest.json` — read this before touching the array order

JSON has no comment syntax, so this note lives beside the file it describes.

## The array order is load-bearing

`tests/core/real-script-corpus.test.ts` computes its **enforced AUC-24
hard floor** (the ratchet `CLAUDE.md` names as "must not regress below
0.622") as `MANIFEST.slice(0, 24).map(m => m.file)`. The manifest's array
**order** therefore selects *which 24 scripts* that floor is measured over.

**Never sort, dedupe, or regroup this array.** Doing so — even for a
reasonable-looking reason like "sort by id" — silently changes which 24
scripts the AUC-24 floor measures, so the assertion keeps passing while
ceasing to mean what it claims. If you need to migrate or rewrite fields on
every entry (e.g. `scripts/migrate-corpus-ids.mjs`), map the array
**in place**, one-to-one, preserving index order exactly.

## Schema note (see `docs/p1-benchmark/CORPUS_IDENTIFICATION.md`)

As of this writing this manifest is still the **pre-migration** schema:
`name` (a bare screenplay title) and `file` (a title-bearing filename) are
present. `scripts/migrate-corpus-ids.mjs` — verified against synthetic/CC0
fixtures, not yet run against this real 72-script corpus (the corpus text
isn't available in every environment this tooling was built in) —
migrates each entry **in place**, in the same order, to:

```
id, contentHash, genre, origin, health, verdict, sceneCount, file
```

`name` is dropped (nothing reads it once
`tests/core/real-script-corpus.test.ts`'s test labels are id-derived —
see that file's own comment above its `MANIFEST` type and its `label`
const). `file` is **rewritten**, not dropped: its value becomes
`<id>.fountain`, the de-identified flat filename produced by
`scripts/migrate-corpus-ids.mjs --rename`. This is why
`tests/core/real-script-corpus.test.ts`'s `path.join(CORPUS_DIR, entry.file)`
needs no further code change post-migration — the field name is stable,
only its value's shape changes (from a title-bearing relative path to an
opaque flat filename).
