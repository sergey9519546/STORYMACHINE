## 2024-05-30 - Optimize string splitting in high-frequency script rendering and keystroke handlers

**Learning:** Intermediate array allocations created by `String.prototype.split()` in keystroke event handlers and render-heavy derived state calculations (e.g. `wordCount` via `scriptText.trim().split(/\s+/).length`) lead to garbage collection spikes and measurable input lag for large documents.

**Action:** Replace `.split()` with zero-allocation alternatives such as a `charCodeAt` iterative loop for counting words/lines, and `lastIndexOf` combined with `.slice()` for extracting specific trailing lines to ensure optimal main-thread performance during high-frequency events.
