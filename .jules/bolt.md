## 2025-03-01 - ⚡ Bolt: [performance improvement]
**Learning:** Replaced remaining use of `.split()` in React components with zero-allocation alternatives to reduce memory allocations and prevent GC pauses during rendering.
**Action:** Replaced `.split()` with regex, indexOf, or manual slicing logic in `ScriptIDE.tsx`.
