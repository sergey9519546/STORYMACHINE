## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.

## 2026-07-10 - Replace .split() allocations in render paths
**Learning:** Using `String.prototype.split()` in high-frequency React render paths (like keystroke updates or mapping over large arrays) creates unnecessary intermediate arrays, causing garbage collection spikes. `split().pop()` for file extensions and `split(' ')[0]` for first words are common anti-patterns.
**Action:** Use zero-allocation methods like `lastIndexOf('.')` combined with `.slice()` for extensions, or `.indexOf(' ')` with `.slice()` for extracting initial substrings. For word counting, `(string.match(/\S+/g) || []).length` is significantly faster and avoids allocating an array for whitespace.
