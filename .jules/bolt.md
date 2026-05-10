## 2024-10-27 - [Derived State]
**Learning:** Using `useEffect` + `useState` to derive state from props (e.g., parsing the Fountain script on keystroke) causes a double-render cycle. This is particularly harmful in high-frequency input components like Editors.
**Action:** Always prefer `useMemo` for derived state during render to avoid the extra render cycle unless the computation is explicitly asynchronous.
