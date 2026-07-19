## 2024-05-18 - [Centralized Fountain Parsing]
**Learning:** Found an architectural pattern where expensive text parsing (`parseFountain`) was being re-executed multiple times on every keystroke within isolated React components (like Sidebar and AnalysisPanel) and hooks, leading to O(N * M) parsing cycles.
**Action:** Always verify if expensive O(N) operations executed inside child components or hooks can be lifted, memoized at the parent level, and passed down as props to ensure they run strictly once per state change.
## 2024-05-19 - [O(N) Rendering Latency Bottleneck in Fountain Highlighting]
**Learning:** Found an unexpected O(N^2) memory scaling issue caused by `text.split("\n")` being mapped into a massive dictionary (`lineClasses`) and then mapped *again* to create React elements. This double-allocation strategy causes measurable frame stuttering when typing in large scripts since it executes completely synchronously on the main thread during high-frequency render events.
**Action:** When parsing hierarchical document structures to flat nodes (like text lines), always prefer mapping directly over the parsed AST (e.g. `blocks`) to generate React Elements instead of building intermediate hash maps or re-splitting raw strings.
## 2024-03-09 - [Redundant FountainBlock Splits]
**Learning:** Found that FountainBlocks inherently represent single lines from parseFountain, but high-frequency render paths were still defensively applying .split("\n") to them on every keystroke, causing unnecessary string array allocations.
**Action:** When working with tokens/blocks that are already line-split by the parser, directly reference the token properties instead of re-parsing them to eliminate O(N) memory allocations during syntax highlighting.
## 2024-03-09 - [Zero-Allocation Multiline Tokenization]
**Learning:** Found that defensive `.split("\\n")` calls on parsed string tokens (e.g. FountainBlocks) during rendering cause significant garbage collection overhead and frame stuttering in large documents, as they allocate thousands of short-lived arrays on every keystroke.
**Action:** When handling potentially multiline tokens in high-frequency rendering loops, always use zero-allocation parsing like a `while` loop with `indexOf("\\n")` rather than `split()`.
