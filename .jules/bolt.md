## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2026-06-01 - ⚡ Bolt Performance Optimization: Zero-Allocation Script Parsing

**Learning:** During high-frequency React render cycles (such as keystroke updates in `ScriptIDE.tsx`), string methods like `.split('\n')` and `.substring(...)` generate excessive intermediate arrays and string objects. This leads to heavy garbage collection spikes, causing frame-stuttering and UI latency, especially for large scripts. Using index-based iterations (`indexOf`, `lastIndexOf`, `slice`) and zero-allocation logic (`charCodeAt`) drastically reduces allocations and stabilizes render performance.

**Action:** Replace `.split()` array allocations with zero-allocation while/for-loops using `.indexOf()` and `.lastIndexOf()`. Replace `.substring(...)` with `.slice(...)` to avoid argument-swapping edge-case bugs and guarantee stable slicing. Refactor word counting to use a `charCodeAt(i) > 32` state machine instead of `split(/\s+/)`.
