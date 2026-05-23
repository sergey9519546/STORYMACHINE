## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2026-05-23 - [Redundant String Splitting in Render Path]
**Learning:** In the `renderHighlightedText` function of `ScriptIDE.tsx`, a redundant `block.text.split("\\n")` was present inside the AST traversal loop. Since the `parseFountain` AST already structures blocks line-by-line, this caused unnecessary string allocations and inner loops on every keystroke render.
**Action:** Always verify the structure of an AST or parsed object before applying operations like `split()`. Avoid redundant string allocations inside hot render paths.
