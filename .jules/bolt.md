## 2024-05-14 - Prevent Double-Render Cycles on Derived State in Input Components
**Learning:** In high-frequency input components like `Editor` where state is derived from props (e.g., parsing `script` to `blocks`), using `useEffect` with `useState` triggers an unnecessary double-render cycle on every keystroke.
**Action:** Always enforce `useMemo` for derived state from props instead of `useEffect` + `useState` unless the computation is explicitly asynchronous. This codebase-specific pattern preserves responsiveness and prevents lagging during heavy text editing.
