## 2024-05-11 - [React Anti-Pattern] Derived State in High-Frequency Inputs
**Learning:** In React editors or components with high-frequency inputs (like textareas), using `useState` initialized via `useEffect` from props (e.g., parsing a script) creates an unnecessary double render cycle (prop changes -> first render -> effect fires -> state updates -> second render).
**Action:** Always use `useMemo` for derived state from props instead of `useEffect` + `useState` unless the computation is explicitly asynchronous.
