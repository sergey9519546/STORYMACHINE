import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getSessionId, mergeSessionHeader, shouldAttachSessionHeader } from "./lib/session.ts";

// ── Per-session identity: monkey-patch fetch before anything else runs ──────
// Installed here, first, before React ever mounts: dozens of panels across
// the app call fetch('/api/...') directly (see src/lib/session.ts's header
// comment), so patching fetch once at the entry point covers every existing
// call site AND any future one, which 60-odd individual edits could not
// guarantee. Only same-origin requests whose path starts with '/api/' are
// touched except the session-unlinked /api/events sink; anything else
// (cross-origin, non-API paths) passes through unmodified. EventSource-based
// SSE panels are a separate case (EventSource has no headers API) and instead
// append `?sessionId=` directly via src/lib/session.ts's withSession().
//
// shouldAttachSessionHeader handles all three fetch input shapes (string,
// Request, URL), preserves cross-origin protection, and keeps event requests
// outside StoryMachine's session capability boundary.
const originalFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!shouldAttachSessionHeader(input, window.location.origin)) {
    return originalFetch(input, init);
  }
  // Prefer init.headers (it overrides a Request input's own headers per the
  // Fetch spec); fall back to the Request's own headers so a hypothetical
  // fetch(requestObj) with no separate init never has its baked-in headers
  // silently dropped in favor of just the session header.
  const baseHeaders = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers = mergeSessionHeader(baseHeaders, getSessionId());
  return originalFetch(input, { ...init, headers });
}) as typeof window.fetch;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
