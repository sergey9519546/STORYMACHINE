## 2024-05-12 - Prevent double render in high-frequency Editor component
**Learning:** Codebase-specific React anti-pattern constraint: In high-frequency input components like Editors, always enforce `useMemo` for derived state from props instead of `useEffect` + `useState` to prevent unnecessary double-render cycles, unless the computation is explicitly asynchronous.
**Action:** Always prefer `useMemo` over `useEffect` + `useState` for deriving synchronous state from props, especially in frequently updating components like text editors.
