## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.

## 2025-06-04 - [String Allocation Bottlenecks in ScriptIDE]
**Learning:** High-frequency React render paths like key down handlers (`handleKeyDown`) and memoized statistics (`wordCount`) were doing redundant O(N) array allocations via `scriptText.split('\n')` and `scriptText.split(/\s+/)`. This creates garbage collection spikes during typing. Additionally, `.substring()` can be unsafe at edge cases compared to `.slice()`.
**Action:** Replace `.split()` with zero-allocation character loops (e.g. `charCodeAt(i) > 32` for word counting) and string index methods like `lastIndexOf` and `indexOf` for finding newlines. Replace all instances of `.substring()` with `.slice()`.
