## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2024-06-19 - [Performance: Zero-allocation text parsing in ScriptIDE]
**Learning:** During high-frequency render events in large text editors (like keystrokes in ScriptIDE), operations like `String.prototype.split('\n')` or `.split(/\s+/)` create excessive intermediate array allocations leading to O(N) memory complexity, garbage collection spikes, and frame stuttering.
**Action:** Replace text splitting with zero-allocation alternatives:
1) Use `while (startIndex <= text.length)` loops with `text.indexOf('\n', startIndex)` and `text.slice()` to extract lines iteratively. Ensure edge cases (like no newlines remaining or trailing newlines) are handled by defaulting `nextNewline = text.length`.
2) Replace word counting via `split` with a global regex execution loop (`/[^\s]+/g.exec(text)`) which correctly parses Unicode whitespace without allocating arrays.
3) Use `text.lastIndexOf('\n')` with `slice()` instead of `split('\n')` when calculating values strictly for the current line.
4) Avoid using `.substring()`, preferring `.slice()` uniformly, to prevent arguments from being swapped if `start > end`, which can cause subtle logic bugs during dynamic cursor manipulation.
