## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2025-03-05 - Avoid O(N) array allocations in high-frequency React text renderers
**Learning:** `String.prototype.split('\n')` creates significant garbage collection spikes and memory bloat when used repeatedly in high-frequency React component render paths (like parsing lines for syntax highlighting on every keystroke).
**Action:** Use zero-allocation index tracking algorithms (like `.indexOf('\n', startIndex)`) and `.slice()` to extract text dynamically without generating massive intermediate arrays in editor components.
## 2025-03-05 - Avoid O(N) array allocations for regex word counting
**Learning:** `String.prototype.split(/\s+/)` causes O(N) array allocations over an entire script simply to get its length. This causes immense memory overhead when computing stats during renders.
**Action:** Use a regex execution loop (e.g. `/[^\s]+/g.exec(string)`) coupled with a counter variable to determine word counts with zero intermediate array allocation overhead.
