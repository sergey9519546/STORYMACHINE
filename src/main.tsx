import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getSessionId, mergeSessionHeader } from "./lib/session.ts";

// ── Per-session identity: monkey-patch fetch before anything else runs ──────
// Installed here, first, before React ever mounts: dozens of panels across
// the app call fetch('/api/...') directly (see src/lib/session.ts's header
// comment), so patching fetch once at the entry point covers every existing
// call site AND any future one, which 60-odd individual edits could not
// guarantee. Only same-origin requests whose URL literally starts with
// '/api/' are touched; anything else (absolute URLs, non-API paths) passes
// through unmodified — EventSource-based SSE panels are a separate case
// (EventSource has no headers API) and instead append `?sessionId=` directly
// via src/lib/session.ts's withSession() at their own call sites.
const originalFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : undefined;
  if (url === undefined || !url.startsWith("/api/")) {
    return originalFetch(input, init);
  }
  const headers = mergeSessionHeader(init?.headers, getSessionId());
  return originalFetch(input, { ...init, headers });
}) as typeof window.fetch;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
