# oasis_cinematic_v2 — non-functional scaffolding, kept as reference

**Status (2026-08-03 wiring audit): DOES NOT IMPORT. Not wired to anything.**

Verified: `python3 -c "import scripts.oasis_cinematic_v2"` raises
`ModuleNotFoundError`. `__init__.py` imports `character_system.py`,
`structure_system.py`, `oasis_integration.py`, `storymachine_bridge.py`, and
`core.py` — **none of which exist in this directory**. `action_system.py` is
0 bytes. It also depends on the `camel` / `oasis` / `numpy` PyPI packages,
none of which are installed and none of which appear in any requirements file.

It is NOT connected to `server/planning/oasis-integration.ts` — grepped in
both directions, zero references. That TypeScript file is an independent,
never-implemented stub that happens to share the name.

It is also unrelated to the live OASIS in `server/routes/game.ts`, which is
real, wired, and correctly gated behind the Labs flag per ROADMAP P2.

## What is actually here

Two large files carry nearly all the content: `cinematic_system.py` (~10,400
lines) and `audience_system.py` (~5,000 lines). Both are overwhelmingly enum
and dataclass taxonomies — roughly 30 methods across 10,400 lines in the
former — with a small amount of real selection logic (`_select_shot_type` and
similar).

## Why it is kept rather than deleted

The camera/shot/lighting taxonomy is genuine domain vocabulary and may have
salvage value if a cinematic surface is ever built. But note that
`docs/STORYTELLING_COVERAGE_MAP.md` rules the entire Cinematic category
OUT OF SCOPE for this product: a screenplay-text analyzer cannot score a
lighting setup. So salvage would serve a different product than the one this
repo is building.

Treat as inert reference material. Nothing here runs, and nothing should be
wired without first rebuilding the five missing modules.
