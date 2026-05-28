## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2024-05-20 - [Zero-Allocation String Processing in Render Paths]
**Learning:** High-frequency input components like `ScriptIDE` can suffer from garbage collection spikes and UI latency if operations like `split("\n")` or `split(/\s+/)` are used inside the render cycle or event handlers (e.g., `handleKeyDown`, `stats` memo).
**Action:** Replace `String.prototype.split()` with zero-allocation character loops (`charCodeAt(i)`), `indexOf`, and `lastIndexOf` to perform text analysis and navigation without creating intermediate arrays.
