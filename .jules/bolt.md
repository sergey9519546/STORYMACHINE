## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.

## 2026-06-10 - Zero-allocation Parsing on Hot Render Paths
**Learning:** In high-frequency React component logic (like keystroke handlers and derived stats in `ScriptIDE.tsx`), relying on standard string methods like `.split()` on large text bodies (like an entire screenplay) causes excessive array allocations and severe garbage collection stuttering during typing. A critical codebase-specific performance pattern is to manually write zero-allocation loops (e.g. `.charCodeAt() > 32` for word counts) and use string index offsets (e.g. `lastIndexOf('
')` combined with `.slice()`) instead of splitting and taking the last element.
**Action:** When auditing high-frequency React paths, hunt for `.split()` calls on potentially large strings. Replace them immediately with zero-allocation character index loops or `.indexOf` / `.slice` offsets to keep the main thread fast.
