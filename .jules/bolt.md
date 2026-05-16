## 2025-05-16 - [Performance Improvement] String Parsing Memoization in ScriptIDE

**Learning:** `ScriptIDE.tsx` was experiencing severe input latency because the expensive `parseFountain` function was executing multiple times per render cycle (on every keystroke). Deriving state inline within React render methods is an anti-pattern, particularly for heavy string manipulations.

**Action:** Extracted `parseFountain` into a top-level `useMemo` hook to cache the parsed blocks and reused this cached value across child hooks (`renderHighlightedText`, `stats`) and inline render conditions (Director's Shot List, Semantic Firewall). This ensures `parseFountain` runs at most once per text change, significantly reducing main thread blockage.
