
## 2024-07-08 - Use ValidationError in API Payload Validation
**Learning:** In the backend Express architecture (`server/lib/session-store.ts`), generic `Error` throws in validation functions bypass the global error handler's 400 response logic and result in 500 Internal Server Errors that are logged as unhandled errors.
**Action:** When validating HTTP payload fields (e.g., in `requireString`), use the exported `ValidationError` class from the same module instead of `Error` so that `server/app.ts` correctly catches and responds with a 400 Bad Request.
