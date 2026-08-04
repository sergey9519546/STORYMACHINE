# ULTRAREVIEW — Whole-Codebase Adversarial Review

Scope: 178 files / 64,971 LOC (server/nvm vendored + tests excluded). 41 sonnet review agents, adversarial sonnet verify per finding.

**Totals:** {'all': 61, 'confirmed': 55, 'plausible': 2, 'rejected': 4}

> **INTEGRITY NOTE (2026-08-04 cross-session verification).** This ledger was
> committed TRUNCATED by the session that produced it: the totals above claim
> 61 findings, but the file contains only the 55 CONFIRMED and 2 PLAUSIBLE
> entries (57), the REJECTED section is absent entirely, and the final
> PLAUSIBLE entry cuts off mid-sentence at the end of this file. Verified
> against the original commit (`0e9ac81`) — it was authored this way, not
> damaged later. The 4 REJECTED findings and the tail of the last entry are
> lost unless the producing session's transcript is recovered.
>
> A 12-finding sample across severities was independently re-verified against
> source on 2026-08-04: all 12 genuinely fixed in code. Two divergences from
> this ledger's claims, both intentional and both invisible from the merge
> alone:
> - **personas registry**: this ledger's fix (LRU eviction, cap 500) never
>   landed — the merge kept an independent, stronger fix from earlier the
>   same day (`3a4a905`: cap 64, reject-on-capacity, builtin-id hijack
>   refusal, which also closes a prompt-injection vector this ledger did not
>   identify). The bug is fixed; the credit here is inaccurate.
> - **game.ts SSE wall-timer**: this ledger's fix (force-close + lock release
>   on timeout) was deliberately superseded by later ai-budget work — the
>   timer now emits an early completion event but does NOT close the stream
>   or release the room lock until the underlying call settles, a documented
>   SessionCommandCoordinator-safety tradeoff. The original HIGH finding's
>   core scenario (a stranded lock on a genuinely hung provider call) is
>   therefore STILL LIVE by design and sits in the maintainer decision queue
>   (see docs/PATH_TO_DONE.md).
>   **RESOLVED 2026-08-04**: between-turn cancellation built (Orchestrator.runRoomSimulation's optional `signal`, wired from game.ts's wall-timer in GET /api/run-room-stream, POST /api/run-room, and POST /api/simulate-to-fountain) — the promise now settles promptly at the next turn boundary instead of running to natural completion, so the stream ends and the lock releases without waiting out a hung call; scenario closed.

## CONFIRMED (55)

### [CRITICAL] server/planning/apdl-planner.ts:285 — correctness
**resolveCharacterTargets silently drops all emotional/audience effects targeting 'actor', 'target', or 'both', which is how nearly every template in emotional-effects-library.ts is authored.**

applyEmotionalEffect() calls resolveCharacterTargets(effect.character, action, state) to find which characters an effect applies to. For target values 'both', 'actor', or 'target' the function returns an empty array (with a comment admitting 'For now, return empty to avoid errors'), meaning the effect is applied to zero characters instead of the actual actor/target of the action. Since EMOTIONAL_EFFECTS_LIBRARY (the production library of action templates) exclusively uses these three symbolic targets (e.g. betray, reconcile, confront, threaten, sacrifice — every entry), any plan built from that library via enrichActionWithEmotions never actually updates character emotional_state during planning/execution unless the caller manually overrides emotional_effects with concrete character IDs (which examples.ts is forced to do for every single action it uses from the library).

_Failure:_ Call apdlPlan with an action created via enrichActionWithEmotions(baseAction, 'betray') (unmodified, as intended for production use). During applyAPDLAction, effect.character is 'target'/'actor', resolveCharacterTargets returns [], so the betrayal never raises the target's 'betrayed'/'anger' intensity or lowers 'trust'. Any subsequent action's emotional_preconditions that require e.g. target trust < X or betrayed > Y (as in 'reconcile', which requires 'regret' >= 0.3 built up from the betrayal) can never be satisfied, so the planner either produces a plan with silently no emotional progression or fails to find any valid plan at all, even though the causal facts changed correctly.

_Verify (CONFIRMED/high):_ Read apdl-planner.ts lines 218-292 directly. resolveCharacterTargets explicitly returns [] for 'both'/'actor'/'target' with a comment admitting the stub nature ("For now, return empty to avoid errors"). applyEmotionalEffect iterates over this empty array, so no emotional_state mutation occurs. Verified emotional-effects-library.ts uses exclusively these three symbolic values ('target', 'actor', 'both') across all its effect entries (betray, reconcile, confide, discover-secret, etc.) — never a concrete character ID. Therefore any action built from this library via enrichActionWithEmotions and r


### [HIGH] server/app.ts:197 — correctness
**Error-handling middleware is registered before the static-serving routes, so errors thrown there never reach it.**

Express dispatches errors by walking forward through the middleware stack from the point next(err) is called, skipping non-error middleware, until it hits an error-handling (4-arg) middleware that was registered AFTER the failing handler. Here the global error handler (line 197) is app.use()'d before the static-serving block (lines 240-253) that adds express.static(distPath), the Vite dev middleware, and the app.get('*') res.sendFile catch-all. Any error raised inside those — e.g. Vite's middleware throwing during a transform, or res.sendFile failing — occurs downstream of the already-registered error handler in the stack, so Express's own default error handler runs instead of this file's, bypassing both the deliberate error classification (SyntaxError/ValidationError/etc.) and the 'never expose internals to client' comment's intent.

_Failure:_ In production, dist/index.html is missing (e.g. a bad deploy where `npm run build` didn't run). GET / hits app.get('*') -> res.sendFile(path.join(distPath,'index.html')) fails (ENOENT) with no error callback, so Express internally calls next(err). Because the custom error handler was registered earlier in the stack, this error skips it and is handled by Express's built-in default handler, which sends an HTML error page including the file path and, outside production NODE_ENV, a stack trace to the client instead of the intended sanitized `{error:'Internal Server Error'}` JSON — leaking internal filesystem paths to any caller.

_Verify (CONFIRMED/high):_ Confirmed by direct reading of server/app.ts. The error-handling middleware (4-arg signature) is registered via app.use() at line 197, and the static-serving block — express.static, Vite dev middleware, and the app.get('*') catch-all with res.sendFile — is registered afterward at lines 240-253. Express's error-dispatch mechanism only considers error handlers registered at or after the point in the stack where next(err) was called (or an exception was thrown); handlers registered earlier in the stack are skipped for that error. Since the static-serving handlers come after the global error handl


### [HIGH] server/collab/yjs-server.ts:138 — correctness
**closeConn removes awareness by the room's own Y.Doc clientID instead of the disconnecting client's actual awareness client id(s), so it never clears the departing client's cursor/selection state.**

awarenessProtocol.removeAwarenessStates(room.awareness, [room.doc.clientID], conn) always passes the SERVER-SIDE room Y.Doc's clientID — a value the room's own code never registers as a local awareness state (the server never calls awareness.setLocalState). Each remote client's awareness entries are keyed by that client's own Yjs doc clientID, sent via MESSAGE_AWARENESS updates in onMessage. There is no per-connection map recording which clientID(s) a given WebSocket controls (the standard y-websocket pattern tracks this explicitly), so this call is effectively a no-op on every disconnect/error — it never removes the correct entries.

_Failure:_ Client A connects, moves its cursor (awareness update establishes state under A's clientID), then closes the tab. closeConn fires and calls removeAwarenessStates with room.doc.clientID (an unrelated id), so A's cursor/selection entry is never explicitly removed. Every other connected client keeps rendering A's stale cursor/selection until y-protocols' internal ~30s outdated-state timeout eventually times it out (if it fires at all before A reconnects and reuses the slot), producing visibly wrong collaborative-cursor UI and wasted broadcast traffic in the interim.

_Verify (CONFIRMED/high):_ The code at lines 138-142 calls awarenessProtocol.removeAwarenessStates(room.awareness, [room.doc.clientID], conn). room.doc.clientID is the clientID of the server-side Y.Doc created in getRoom (line 52), which is never used as an awareness key by any client — awareness entries are populated via applyAwarenessUpdate (line 107) using each remote client's own encoded clientID from their MESSAGE_AWARENESS payloads. There is no per-connection map (e.g. conn -> Set<clientID>) recording which awareness clientID(s) a WebSocket controls, unlike the standard y-websocket reference implementation (which 


### [HIGH] server/collab/yjs-server.ts:224 — correctness
**parseRoomId calls decodeURIComponent on attacker-controlled URL path segments with no try/catch, so a malformed percent-encoding in the upgrade request throws synchronously inside the 'upgrade' event handler.**

parseRoomId (line 181) does `decodeURIComponent(m[1])` unguarded. decodeURIComponent throws a URIError on malformed escape sequences (e.g. a lone '%' or an invalid UTF-8 percent sequence). This function is invoked directly from the server.on('upgrade', ...) handler (line 224) with no surrounding try/catch, so the exception propagates out of the synchronous event emission.

_Failure:_ A client (or scanner/attacker) opens a WebSocket upgrade to a path like `/collab/%E0%A4%A` (incomplete UTF-8 escape) or `/collab/%` — decodeURIComponent throws URIError: URI malformed. Since Node's 'upgrade' event is emitted synchronously from the HTTP server internals without Claude's own guard, this uncaught exception either crashes the process (if no global uncaughtException handler is registered) or, at minimum, aborts the current I/O callback with no HTTP response sent, giving a trivial unauthenticated DoS vector against the shared HTTP/Express port.

_Verify (CONFIRMED/high):_ Verified against actual code: parseRoomId (yjs-server.ts:176-183) matches path via /^\/collab\/([^/]+)\/?$/ which does not validate percent-encoding correctness, then calls decodeURIComponent(m[1]) unguarded at line 181. This is invoked directly at line 224 inside server.on('upgrade', ...) with no try/catch anywhere in the call chain. A request to a path like /collab/%E0%A4%A or /collab/% matches the regex (since % and hex digits are not '/') but is invalid percent-encoding, so decodeURIComponent throws URIError synchronously. Node's EventEmitter propagates synchronous throws from listeners ba


### [HIGH] server/engine/CausalSpine.ts:449 — correctness
**terminal_threatened GoalMutation is recorded once per suspect instead of once per contradiction event, duplicating identical mutations when a contradiction implicates multiple suspects.**

Inside processContradiction, the `for (const suspectId of suspectIds)` loop (line 324) contains the entire 'terminal_threatened' block (lines 449-477). The check `worstSeverity >= 75 && discoverer.goalStack` and the resulting GoalMutation description depend only on `edges`/`terminalDesc`, which are identical across all suspects in this call — nothing in the block is suspect-specific. When suspectIds has more than one entry (i.e. a contradiction implicates two or more agents, e.g. via processEvent's EventPropositions), the exact same 'terminal_threatened' GoalMutation (same trigger_event_id, same description) is created and recorded via recordGoalMutation once per suspect.

_Failure:_ A contradiction edge is found where the from_belief's source_event_id resolves to two different asserted_by agents (suspectIds.size === 2) and worstSeverity >= 75 and the contradicted proposition overlaps the discoverer's terminal goal description. processContradiction then calls this.stage.recordGoalMutation(threatenedMutation) twice for what is really a single logical event. AppraisalEngine.appraise() later filters GoalMutations by turn_index only (not by uniqueness) and adds +40 distress / +20 fear per 'terminal_threatened' mutation found (lines 101-104 of AppraisalEngine.ts), so the discoverer's distress/fear are inflated to 80/40 instead of the intended 40/20 for a single narrative event, corrupting the emotion model and any downstream contagion/suspicion computed from it.

_Verify (CONFIRMED/high):_ Read CausalSpine.ts lines 300-481. suspectIds is built once (a Set, lines 310-322) from all edges, independent of iteration. The `for (const suspectId of suspectIds)` loop (line 324) wraps the entire block including the terminal_threatened logic (lines 449-477). That block's condition (`worstSeverity >= 75 && discoverer.goalStack`), the computed `terminalDesc`, `contradictedPropositions`, and `threatensTerminal` are all derived solely from `edges` and `discoverer` — none reference `suspectId` or `suspect` at all. So if `threatensTerminal` is true on one iteration it's true on every iteration, 


### [HIGH] server/engine/Orchestrator.ts:603 — data loss
**When a round ends via a successful RELOCATE/FLEE, the entire round's StoryCommit (canon ledger entry) is silently skipped for ALL agents who acted earlier that round, not just the relocating agent.**

The epistemic-update batch and its corresponding buildTurnCommit/appendCommit call (lines 603-702) are gated behind `if (!didRelocate && lastActionId)`. `didRelocate` is set to true and the inner for-loop `break`s as soon as any agent in the round successfully relocates (line 490-500). Any agents who already took actions earlier in that same round's for-loop (recorded via `this.stage.recordAction` and fed to `this.spine.processEvent`) have their actions logged and spine-processed, but because the whole epistemic+commit block is skipped when didRelocate is true, those actions never get an EpistemicUpdate, never get diffed for relationship/emotion deltas, and — critically — never produce a StoryCommit, so their narrative consequences never reach the canon ledger (`this.stage.appendCommit`) at all. Unlike the Fix-C Tier-1-reject path, this drop is completely untracked — it does not increment `_droppedCount`/`_droppedReasons`, so `consumeDroppedCommits()` never reports it to callers.

_Failure:_ In a room with 3 agents, agent1 SPEAKs (recorded, spine-processed), agent2 LIEs (recorded, spine-processed, may even set incitingActionEmitted), then agent3 successfully RELOCATEs (adjacent location exists) causing `didRelocate=true` and `break`. The round-end block is entirely skipped, so agent1's SPEAK and agent2's LIE — both already visible in the action log and spine — are never turned into a StoryCommit and never appear in canon; a client reading canon history for that scene sees no trace of the SPEAK/LIE despite them being in the raw action log, and no droppedCommits event is emitted to explain the gap.

_Verify (CONFIRMED/high):_ Read Orchestrator.ts lines 452-702. Each round's for-loop iterates agentsInRoom in initiative order; any agent's SPEAK/LIE/etc. before a relocating agent is recorded via stage.recordAction and spine.processEvent (lines 514-530) before the relocating agent's turn arrives. When a RELOCATE/FLEE succeeds (lines 490-500), didRelocate is set true and the loop `break`s immediately, ending the round early. The epistemic-update batch and buildTurnCommit/appendCommit block is gated by a single round-level `if (!didRelocate && lastActionId)` at line 603, so when didRelocate is true the entire block, incl


### [HIGH] server/engine/ai.ts:224 — correctness
**The module-load-time provider wrapper drops the AbortSignal parameter, silently defeating the timeout-cancellation (H2) fix documented elsewhere in the same file.**

At import time, if `aiProviderManager.hasProvider()` is true, `_provider` is replaced with `{ generate: (params) => activeProvider.generate(params), generateStream: (params) => activeProvider.generateStream?.(params) ?? ... }` — neither closure accepts or forwards a `signal` argument. `generateContent()` (line 417) creates a fresh `AbortController` per attempt and calls `withTimeout(_provider.generate(params, controller.signal), ...)`, but since this default `_provider.generate` ignores its second argument entirely, the signal never reaches `FreeRideProvider`/`GeminiProvider`, and `controller.abort()` on timeout has no effect on the in-flight fetch/socket. Compare this to `resetLLMProvider()` (line 234) and `resetAllProviders()` (line 254), which build the wrapper correctly with `(params, signal) => activeProvider.generate(params, signal)` — i.e. the exact H2 audit fix described in the surrounding comments is only applied when one of those reset functions is explicitly called later; the default path installed at module load is missing it.

_Failure:_ Server boots with OPENROUTER_API_KEY set (FreeRideProvider auto-selected at import time) and no code ever calls setLLMProvider/resetLLMProvider/resetAllProviders. A `generateContent()` call times out after `timeoutMs` — the caller correctly receives a timeout rejection and moves on, but the underlying OpenRouter fetch keeps running in the background past the deadline (socket not aborted), consuming a connection/quota and potentially still mutating shared state or writing stale data on eventual completion — exactly the resource-leak class the H2 comments say was fixed.

_Verify (CONFIRMED/high):_ Lines 225-231 show the module-load-time default wrapper (installed when aiProviderManager.hasProvider() is true at import time) uses `generate: (params) => activeProvider.generate(params)` — no signal parameter at all, unlike resetLLMProvider (234-247) and resetAllProviders (254-269) which explicitly forward `(params, signal) => activeProvider.generate(params, signal)` with an H2-audit comment. This confirms the claim exactly: the initial module-load path lacks the signal-forwarding fix that is present in the two reset functions. Since _provider is a module-level singleton set at import time a


### [HIGH] server/planning/apdl-planner.ts:503 — correctness
**buildPlan() sets initial_state and final_state to the same object (the search node's final state) and replays the whole action sequence a second time starting from that already-final state, corrupting the reported emotional trajectory/catharsis/coherence.**

buildPlan(node, goal) only has access to node.state, which is the state AFTER all of node.actions have already been executed (that's the state A* was searching over). Line 485 calls `extractEmotionalStates(node.actions, node.state, node.state)`, which — per its own implementation — takes the second argument as `currentState` and re-applies every action in `node.actions` starting from it, i.e. it applies the full action sequence a second time on top of a state that already reflects that sequence having been applied once. Additionally, lines 503-504 assign `initial_state: node.state, final_state: node.state`, so the returned APDLPlan reports the same object for both initial and final state, losing the actual starting world state entirely.

_Failure:_ After apdlPlan resolves a 4-action plan, `plan.initial_state === plan.final_state` and both equal the post-plan state (e.g. Alice's trust already at its final reconciled value). Any consumer that reads plan.initial_state expecting the pre-plan state (e.g. apdl-validator.ts's validatePlanPreconditions(plan, actions), which does `let state = plan.initial_state` and simulates forward) starts its precondition check from the wrong (already-resolved) state, producing false negatives/positives in validation. Separately, because extractEmotionalStates double-applies the action sequence to compute the trajectory shown to the caller, the emotional_trajectory/catharsis_points/coherence_score in the returned plan reflect a fictitious 8-step doubled sequence rather than the actual 4-step plan, so reported catharsis points and trajectory can appear or disappear incorrectly relative to what was actually planned.

_Verify (CONFIRMED/high):_ Read apdl-planner.ts lines 343-513 directly.

extractEmotionalStates(actions, initialState, finalState) at line 350-357 only uses the second positional arg as `currentState` (finalState param is unused in the body), and re-applies every action in `actions` sequentially via applyAPDLAction starting from that state. buildPlan (line 483-513) calls this at line 485 as `extractEmotionalStates(node.actions, node.state, node.state)`. Since node.state is documented/used elsewhere (e.g. isGoalSatisfied(node.state, goal) in the A* search, not shown here but implied by PlanningNode) as the state AFTER no


### [HIGH] server/planning/oasis-integration.ts:283 — correctness
**resolveCharacters silently drops emotional effects targeted at 'actor', 'target', or 'both' instead of resolving them.**

DeterministicEmotionalValidator.resolveCharacters returns an empty array for target values 'both', 'actor', and 'target' with a comment saying action-parameter resolution 'would need' to happen, but that resolution is never implemented. simulateEmotionalEffects iterates action.emotional_effects and calls resolveCharacters(effect.character, ...) — for any effect whose character field is 'actor'/'target'/'both', no entry is added to the effects map at all, yet the function still returns overallConfidence: 0.8 and no warning specific to the dropped effect (only a generic 'consider OASIS' warning).

_Failure:_ An APDLAction has emotional_effects: [{ character: 'actor', emotion: 'guilt', delta: 0.3 }]. Calling simulateWithOracle(action, state) returns an effects Map with no entry for the actor, and overallConfidence 0.8 as if the simulation were reasonably trustworthy — callers relying on this to preview/apply emotional deltas for the acting character will silently see no effect at all, even though the action's definition explicitly specifies one.

_Verify (CONFIRMED/high):_ Read oasis-integration.ts lines 209-288. resolveCharacters (line 275) explicitly returns [] for target === 'both' | 'actor' | 'target' with a comment admitting action-parameter resolution "would need" to happen but isn't implemented (lines 283-286). simulateEmotionalEffects (lines 209-239) calls resolveCharacters(effect.character, ...) for each emotional_effects entry and only populates the effects map for characters in the returned array (lines 219-231) — for 'actor'/'target'/'both' the returned array is empty, so the for-loop body never executes and no map entry is created for that effect. T


### [HIGH] server/routes/game.ts:326 — resource-leak
**The SSE run-room-stream's 5-minute wall-clock timer does not actually stop the running simulation, close the connection, or release the room lock — it only stops emitting further SSE messages.**

The `wallTimer` callback (lines 327-332) sets `disconnected = true` and emits one final SSE event, but that is all it does — it does not call `res.end()`, does not cancel/abort the in-flight `await orchestrator.runRoomSimulation(nodeId, maxTurns, emit)` call, and does not call `releaseSimulationRooms(res)`. The actual `res.end()` (via `ensureEnded()`) and the room-lock release (`releaseSimulationRooms(res)` in the inner `finally` at line 364, and again in the outer `finally` at line 375) only run once the awaited `runRoomSimulation` promise itself settles — i.e. after the simulation actually finishes on its own, however long that takes. The doc comment directly above the timer (lines 324-326) explicitly claims this timer 'close[s] the SSE stream and release[s] the runningRooms lock so the session isn't stranded,' which is not what the code does.

_Failure:_ A room simulation stalls (e.g. an underlying LLM call hangs or `orchestrator.runRoomSimulation` never resolves due to a stuck downstream dependency). At the 5-minute mark the wallTimer fires and emits a 'stream timeout' event, but the HTTP response is never actually closed (the client's SSE connection stays open with no more data, looking hung to the browser) and the `runningRooms` lock for that `sessionId:nodeId` pair is never released. Any subsequent POST /api/run-room or GET /api/run-room-stream request for the same room from the same session then gets a 409 'Simulation is already running or queued' indefinitely, until the original stalled call eventually resolves (which may be never), effectively locking that room out for the session with no operator-visible recovery path — directly contradicting the comment's stated purpose of preventing a 'stranded' session.

_Verify (CONFIRMED/high):_ Read game.ts lines 303-378 directly. The wallTimer callback (327-332) only sets disconnected=true and calls emit() once — emit() itself is a no-op guard for res.write, not a stream terminator. The actual res.end() (via ensureEnded()) and releaseSimulationRooms(res) only run in the outer finally block (373-377), which executes only after the try block completes, i.e., after the awaited orchestrator.runRoomSimulation(nodeId, maxTurns, emit) call (line 357) settles. No AbortController or cancellation token is passed to runRoomSimulation, so there is no mechanism for the timer to actually interrup


### [HIGH] server/routes/nvm/analysis.ts:202 — correctness
**POST /api/nvm/analyze/compare crashes with an unhandled exception whenever the loaded corpus has fewer than 3 vectors.**

`numClusters = Math.min(5, Math.floor(corpus.length / 3))` evaluates to 0 whenever `corpus.length < 3` (including the empty-corpus case, corpus.length === 0). `clusterCorpus()` (server/nvm/analyze/story-vector.ts:287-289) explicitly throws `Invalid numClusters: 0 (corpus has N vectors)` whenever `numClusters <= 0`. That throw propagates out of the awaited call at analysis.ts:203, is caught by `asyncHandler`, and surfaces as a generic 500 instead of a meaningful response — the endpoint is completely broken for any small/early-stage corpus, a state the corpus loader (server/lib/corpus-loader.ts) can legitimately return (e.g. a manifest with only 1-2 valid, non-zero-scene screenplays).

_Failure:_ Corpus manifest has 2 valid screenplay entries (or the corpus cache is empty/not yet built). A user calls POST /api/nvm/analyze/compare with a valid scriptText that passes the completeness gate. `corpus.length` is 2, so `numClusters = Math.floor(2/3) = 0`. `clusterCorpus([...corpus, queryVector], 0)` throws immediately, the request 500s, and the response never reaches the neighbors/health payload that was already computed — a fully valid, non-empty analysis request fails outright instead of degrading gracefully (e.g. returning no cluster/null cluster).

_Verify (CONFIRMED/high):_ analysis.ts:202 computes numClusters = Math.min(5, Math.floor(corpus.length / 3)) with no lower bound, so any corpus.length in {0,1,2} yields numClusters=0. clusterCorpus (story-vector.ts:283-289) only short-circuits on vectors.length===0 (returns []), but here vectors = [...corpus, queryVector] which has length >=1 always (query added), so the vectors.length===0 guard never fires; the very next check `numClusters <= 0` throws unconditionally when numClusters is 0. This throw propagates from the awaited call at analysis.ts:203, uncaught by any local try/catch, so asyncHandler's wrapper convert


### [HIGH] server/routes/scriptide.ts:224 — data-loss
**Script save silently truncates scriptText over 500,000 chars with no error or truncation flag returned to the client.**

`scriptText.substring(0, 500_000)` truncates the payload before persisting it via `stage.saveScriptIDEState`, and the resulting object is saved and echoed back as `result` with no indication the text was cut. There's no validation error, no `truncated: true` field, nothing the client can act on.

_Failure:_ A writer's screenplay grows past ~500k characters (a long feature draft with notes easily gets there). The next autosave silently drops everything past the 500k boundary; the client believes the save succeeded (200 OK), and the trailing content of the script is permanently gone from server-side storage — if the user later reloads on a different device/session, they lose all work past that point with zero warning.

_Verify (CONFIRMED/high):_ Code at scriptide.ts:224 confirms: `body.scriptText.substring(0, 500_000)` truncates any string input unconditionally, with no length validation error, no truncated flag added to the persisted/returned object, and the response is a plain 200 `res.json(result)` (or 409 only on version conflict). The save proceeds and persists the truncated text via stage.saveScriptIDEState, and load (line 241-249) would return the truncated text with status 'ok' — nothing distinguishes this from a full successful save. This matches the described failure scenario for a screenplay exceeding 500k chars.


### [HIGH] src/components/AIPanel.tsx:188 — correctness
**Failed AI requests store the error message in the same `result` state used for legitimate output, so the error text is offered for insertion into the script.**

`runPrompt`'s catch block (line 59) does `setResult(`Error: ${...}`)` on any failure (network error, non-2xx response, thrown exception) using the exact same `result` state that holds successful AI output. The render logic at lines 188-208 only checks `result` truthiness to show the Result panel and, critically, the 'Insert into Script' button (lines 201-208) — it never distinguishes an error string from a real suggestion. There is no separate `isError` flag gating the insert button.

_Failure:_ User clicks 'Generate Scene' while the AI backend is down or returns a 500. `runPrompt` catches the failure and sets `result` to `"Error: Request failed (500)"`. The Result panel renders this string with a working 'Insert into Script' button. If the user clicks it (reasonably assuming it's the generated content, since the panel gives no visual distinction between success and failure output), `onApplySuggestion("Error: Request failed (500)")` fires and that literal error text is spliced into the user's screenplay/script content.

_Verify (CONFIRMED/high):_ Read src/components/AIPanel.tsx in full. runPrompt's catch block (line 59) does setResult(`Error: ${...}`) using the same `result` state set on success (line 55). The render block (lines 188-208) shows the Result panel and the "Insert into Script" button whenever `result` is truthy (line 191, 201), with no isError flag, no prefix check on the string, and no other gating logic anywhere in the component. onApplySuggestion(result) at line 203 will fire with the literal error text if clicked. The failure scenario (backend down/500, catch sets error text into result, user clicks Insert) reproduces 


### [HIGH] src/components/ScriptIDE.tsx:1223 — data-loss / async-race
**handleCleanAction rebuilds and overwrites the whole script from a block array captured before the await, silently discarding any edits the user typed during the network round-trip.**

handleCleanAction closes over `parsedBlocks` (and implicitly the pre-request `scriptText`) at call time, then `await`s a fetch to /api/scriptide/clean-action. When the response resolves, it does `const blocks = parsedBlocks; updatedBlocks[index] = {...}; const newScript = updatedBlocks.map(b => b.text).join('\n'); mutateDraft(newScript);` — i.e. it reconstructs the ENTIRE document from the stale, pre-request blocks array (only patching one index) and writes it back with mutateDraft. Every other async writer in this file that can race with typing (CoverageSummary/ScriptDoctorPanel callbacks, via getDraftGeneration) checks a generation counter before applying a late result; this one does not, even though mutateDraft/draftTextGenRef exists specifically for that purpose per the surrounding comments (G0-02).

_Failure:_ User clicks 'clean' on an action line, then keeps typing elsewhere in the script (or a new scene) while the request is in flight (typical LLM latency ~1-3s). When the response arrives, mutateDraft(newScript) replaces scriptText with the reconstruction built from the OLD parsedBlocks snapshot, so every keystroke typed during that window is silently erased from the visible draft (and will subsequently get persisted to localStorage/server as the new 'current' state on the next autosave).

_Verify (CONFIRMED/high):_ Reviewed lines 1223-1254. handleCleanAction is an async closure created fresh each render, capturing `parsedBlocks` (derived from `scriptText` at invocation time) before the `await fetch(...)`. After the await resolves, it builds `updatedBlocks` from that stale `blocks = parsedBlocks` array, patches only `index`, joins all block texts into `newScript`, and calls `mutateDraft(newScript)` unconditionally — no comparison against `getDraftGeneration()`/`draftTextGenRef` before applying, unlike the pattern used elsewhere in the file (e.g., CoverageSummary/ScriptDoctorPanel write-backs at lines ~241


### [HIGH] src/components/Sidebar.tsx:115 — data-loss
**Editing a character long-text field (Ghost/Lie/Want/Need) that already holds more than 500 characters silently truncates the stored value, permanently discarding the tail.**

LongTextField renders `displayValue = value.slice(0, LONG_FIELD_MAX)` (500) as the textarea's controlled value, and its onChange handler writes back `e.target.value.slice(0, LONG_FIELD_MAX)` via onUpdate. If the character's actual field value (coming from the `characters` prop, e.g. loaded from an imported script or set programmatically elsewhere without the 500-char cap) is longer than 500 characters, the component only ever displays the first 500 characters. As soon as the user makes any edit at all (even appending one character at the end), onUpdate is called with a value capped at 500 characters, which overwrites the parent's state and permanently deletes characters 501+ that existed before the edit — there is no warning that content beyond the visible 500 will be lost.

_Failure:_ A character's `ghost` field is set to a 600-character string (e.g. imported from a prior version of the app, or set via some other code path without the same 500-char guard). The writer opens the Sidebar, types a single additional character into the Ghost box. LongTextField's onChange fires with `e.target.value` (at most the visible 500 chars + 1 new char), slices to 500, and calls `onUpdateCharacter(id, 'ghost', <=500 chars)`. The original 100 characters beyond index 500 are gone from application state immediately, with no confirmation or recovery — a silent, irreversible truncation of existing user data.

_Verify (CONFIRMED/high):_ Code at Sidebar.tsx:115-126 confirms the claim precisely: displayValue = value.slice(0, 500) truncates what's shown regardless of the actual stored value's length, and onChange always writes back e.target.value.slice(0,500) via onUpdate(charId, field, capped). Since the textarea is a controlled input whose value is capped, e.target.value itself can never exceed 500 chars after the first keystroke/edit, so any edit to a field whose underlying value exceeds 500 chars results in onUpdate being called with a value <=500 chars, overwriting/discarding characters beyond index 500 in parent state. The


### [HIGH] src/components/StoryMachine.tsx:372 — correctness
**submitScenario clears the server state via /api/reset but leaves client-side agents/nodes/ledger untouched if the subsequent /api/init call fails, desyncing the UI from the server.**

submitScenario POSTs /api/reset first (wiping server-side agents/nodes/ledger), then POSTs /api/init with the new payload, and only calls refreshAll() (which repopulates agents/nodes/ledger from the server) after BOTH succeed. If /api/reset succeeds but /api/init throws (e.g. HTTP 400 for a malformed scenario payload), the catch block only calls showError — it never calls refreshAll() or clears the stale agents/nodes/ledger state. The component's React state (and thus the whole UI: The Stage, Agents panel, Script Ledger) keeps showing the pre-reset scenario/ledger, even though the server has already discarded that data.

_Failure:_ User has a running scenario with ledger entries, opens 'Edit scenario' and submits a payload that the server's /api/init validation rejects (e.g. duplicate location_id or malformed agent). /api/reset succeeds and wipes server state; /api/init returns non-ok and throws. The UI still displays the old agents and ledger entries as if nothing happened. The user then clicks 'Force turn' on a character or 'Export to script' — Force turn's /api/turn call references a char_id the server no longer has, and Export to script fetches /api/ledger/fountain against the now-empty server ledger, silently producing an empty/wrong script export while the UI still visually shows the old (stale) ledger contents.

_Verify (CONFIRMED/high):_ Code at lines 372-390 matches the claim exactly. /api/reset is posted and checked (372-377), then /api/init is posted and checked (378-383), and refreshAll() — which is the only mechanism that repopulates agents/nodes/ledger from server state — is called only after both succeed (384). The catch block (385-386) only calls showError; it does not call refreshAll() or otherwise clear/resync agents, nodes, or ledger. Some client state (persuasionLog, activePressures, streamLog) is preemptively cleared before the reset call (369-371), but that is a different set of state than the agents/nodes/ledger


### [HIGH] src/components/editor/FountainEditor.tsx:332 — data-loss
**The Yjs seed text captures `value` from the initial render closure, so local edits made during the async collab-join window are silently discarded once the room binds.**

The collab-join effect (mount-only, deps `[]`) calls `createCollabSession({ room: collabRoom, userName: collabUserName, initialText: value })` where `value` is the prop as it was at the time this effect was created (first render) — it is never refreshed even though `createCollabSession` is async and does a network round-trip (`fetchCollabToken`) before resolving. Meanwhile, the separate value-sync effect (lines 358-371) keeps applying newer `value` prop changes directly into the CodeMirror buffer as long as `collabRef.current` is still null (i.e., before the session resolves) — this is exactly the window during the token fetch. When the session finally resolves and `ytext.length === 0` (this client is first to join), it seeds the shared doc with the *stale* `initialText` captured at mount, not the buffer's current (possibly newer) content, and then `yCollab` takes over the buffer from that Yjs doc.

_Failure:_ Editor mounts with collabRoom set and value="INT. WAREHOUSE\n". Token fetch takes ~300ms (typical network latency). During that window the user types more text, or the parent updates the `value` prop (e.g. an accepted AI suggestion) to "INT. WAREHOUSE\n\nRain hammers the roof." via the local-sync effect, which is applied because collabRef.current is still null. The token fetch resolves; since this is the first joiner, `ytext.length === 0` so it seeds with `initialText` = the original mount-time value "INT. WAREHOUSE\n" (missing the added line), and yCollab now drives the buffer from that stale Yjs text — the user's edits made during the join window are overwritten/lost with no warning.

_Verify (CONFIRMED/high):_ Code matches the claim exactly. Line 332-335: createCollabSession is called with initialText: value, where value is captured in a mount-only effect (deps []). The async chain (fetchCollabToken -> socket connect) resolves later via .then at line 336-339. Meanwhile the separate effect at 358-371 explicitly checks `if (collabRef.current) return;` (line 363) — so until the collab session resolves and collabRef.current is set (line 338), any new `value` prop is applied directly into the CodeMirror buffer via dispatch (366-370). If the underlying createCollabSession implementation seeds the shared Y


### [MEDIUM] scripts/check-docs-quality.ts:92 — correctness
**Code-block skipping only ignores the fence delimiter lines themselves, not the content between them, contrary to the stated intent.**

The comment says 'Skip code blocks (between \`\`\` markers)' but the implementation only does `if (line.trim().startsWith('```')) continue;` for each line independently — there is no toggled boolean state (e.g. `inCodeBlock`) tracking whether the scanner is currently inside a fenced block. As a result every line *inside* a fenced code block is still scanned against the AI-pattern regexes.

_Failure:_ A markdown doc contains a fenced code sample such as:
```
const config = { utilize: true }; // in order to enable caching
```
Both 'utilize' and 'in order to' are flagged as high-severity AI writing patterns even though they appear inside code, not prose. In `--strict` mode (used as a pre-commit gate per the file's own docstring) this can block a legitimate commit purely because of code content, not documentation prose.

_Verify (CONFIRMED/high):_ Read scanFile() in full (lines 79-115). The loop has no boolean/state tracking whether it's inside a fenced block; it only does `if (line.trim().startsWith('```')) continue;` which skips solely the fence delimiter lines. Any line between two ``` markers still falls through to the `for (const pattern of DOC_AI_PATTERNS)` loop and gets regex-matched. This directly contradicts the comment's stated intent to skip code blocks, and the failure scenario (a fenced code sample containing 'utilize' or 'in order to') would indeed be flagged. Severity as filed (medium) seems reasonable — it's a false-posi


### [MEDIUM] scripts/generate-rulebook.ts:446 — correctness
**The brace-depth scan that bounds the GENRE_RULE_MODIFIERS object literal sets `i = lines.length` on match, which then becomes `objEnd`, making the scan run to end-of-file instead of stopping at the actual closing brace.**

In `extractGenreModifiers`, the loop finds the matching closing `}` for the object by depth-tracking. When depth returns to 0, the code does `i = lines.length; break;` inside the character loop to force the outer loop to stop — but this also clobbers `i`, which is subsequently assigned to `objEnd` (`const objEnd = i;`). So `objEnd` is always set to `lines.length` (end of file) rather than the line index of the actual closing brace, whenever the object's close is found before EOF.

_Failure:_ Any top-level `  identifier: {` pattern appearing anywhere in `server/lib/genre-router.ts` AFTER the `GENRE_RULE_MODIFIERS` object closes (e.g. an unrelated exported const or helper object later in the file) will be misparsed by the subsequent `keyRe` scan (which iterates `objStart+1` to `objEnd`) as if it were a genre entry inside `GENRE_RULE_MODIFIERS`, producing bogus 'genre' entries and field values in the generated `docs/rulebook/genre.md`, silently corrupting the generated documentation without any error.

_Verify (CONFIRMED/high):_ Read lines 446-454 directly. Inside the character loop, when depth returns to 0 at the true closing brace, the code executes `i = lines.length; break;` — this both signals loop termination AND clobbers the outer loop variable `i`. The inner `break` only exits the `for (const ch of lines[i])` loop; control then reaches `if (depth === 0 && i !== objStart) break;` in the outer loop, which now sees i = lines.length (truthy inequality) and breaks the outer for-loop too — but i has already been mutated to lines.length. `const objEnd = i;` therefore captures lines.length, not the line index of the ac


### [MEDIUM] scripts/convert-screenplays.ts:83 — data-loss
**Slugs are derived only from the PDF's filename with no collision detection, so two differently-named or differently-located PDFs that slugify to the same string silently overwrite each other's converted output.**

`slugify(name)` strips non-alphanumerics and lowercases, ignoring the source directory entirely. `outputFile` is `join(OUTPUT_DIR, slug + '.fountain')`. If `findAllPdfs` (which recurses into subdirectories) returns two PDFs whose names collide after slugification (e.g. different drafts/versions in different subfolders, or names differing only in punctuation/case), the second `writeFile(outputFile, ...)` overwrites the first's `.fountain` file with no warning.

_Failure:_ SOURCE_DIR contains `Drafts/The Second Key.pdf` and `Final/The Second Key.pdf` (or `The_Second_Key.pdf` vs `the-second-key.pdf`). Both slugify to `the-second-key`. The first PDF is converted and written to `the-second-key.fountain`; when the second PDF is processed it silently overwrites that file. `manifest.json` ends up with two entries both pointing at the same `outputFile`, and the content of the first-converted screenplay is permanently lost even though the manifest implies both were successfully preserved.

_Verify (CONFIRMED/high):_ Lines 81-84, 103: slug is derived only from basename via slugify (strips non-alphanumerics, lowercases), ignoring directory. outputFile = OUTPUT_DIR/slug.fountain. No check against previously-used slugs/outputFiles exists anywhere in the loop (lines 80-114) or manifest handling. writeFile at line 103 unconditionally overwrites. findAllPdfs recurses subdirectories (line 40-52), so two PDFs in different subfolders with names that collide after slugification (e.g. differing only by punctuation/case, or same title in Drafts/ vs Final/) produce identical slugs, and the second write silently clobber


### [MEDIUM] server/engine/DirectorNode.ts:912 — correctness
**_checkDramaticIrony selects the 'oldest' unexposed lie by sorting on proposition_id, a random UUID that carries no temporal ordering.**

`const oldest = unexposed.sort((a, b) => a.proposition_id.localeCompare(b.proposition_id))[0];` is intended (per the surrounding comment, 'Oldest unexposed lie determines urgency') to find the longest-standing unexposed lie so escalation/urgency tracks how long the dramatic irony has been open. EventProposition (types.ts ~448-455) has no timestamp/turn field at all — proposition_id is a randomUUID() minted at creation time and event_id is likewise a UUID FK to the action, neither of which sorts chronologically. localeCompare on random UUID strings produces an arbitrary, non-deterministic-feeling ordering unrelated to actual age.

_Failure:_ Two unexposed lies exist in a room: an old one from turn 3 and a fresh one from turn 9. Because sorting is by UUID string rather than turn/creation order, the freshly created (turn 9) lie can sort ahead of the turn-3 lie and get picked as `oldest`. Its event_id becomes the pressure's trigger_event_id and its content/asserted_by drives the WITHHOLD/ESCALATE hint text, so the Director signals urgency/escalation tied to the wrong (newer) lie while the truly long-buried lie from turn 3 is never surfaced or escalated, defeating the intended pacing mechanic.

_Verify (CONFIRMED/high):_ Code at DirectorNode.ts:912 confirmed: `const oldest = unexposed.sort((a, b) => a.proposition_id.localeCompare(b.proposition_id))[0];`. EventProposition (types.ts:448-455) has fields proposition_id and event_id only, both UUIDs, with no created_at/turn_index or any temporal field. proposition_id is presumably minted via randomUUID() at creation (consistent with other UUID fields in the file such as pressure_id: randomUUID()), so lexicographic comparison of UUID strings has no relationship to creation order. The result `oldest` directly drives trigger_event_id and beat_id's causal_chain/narrati


### [MEDIUM] server/engine/DirectorNode.ts:87 — correctness
**All new beliefs from a Director perspective evaluation are attributed to the same 'last external audible action', even when multiple distinct speakers contributed the observed events, mis-assigning belief provenance.**

`const lastExternalAction = [...recentActions].reverse().find(a => a.char_id !== eval_.observer_id && a.is_audible);` is computed once per observer and then used for every belief in `eval_.new_beliefs` whose source is 'told' (lines 90-100), regardless of which specific action in the transcript actually produced that belief. Unlike Agent.ts's updateEpistemics, which resolves `source_action_index` per belief against the numbered action list, this path has no per-belief index and blames the single most-recent external action for all 'told' beliefs formed this round.

_Failure:_ In a room with two speaking agents A and B in the same batch of recentActions, an observer forms two 'told' beliefs — one actually derived from A's statement and one from B's later statement. Both freshBeliefs entries get `source_agent_id = lastExternalAction.char_id` (B, since B spoke last), so the belief actually caused by A is incorrectly attributed to B. Downstream, CausalSpine.processContradiction resolves suspects via `source_agent_id` (line 314), so if that mis-attributed belief is later contradicted, the Director/spine directs confrontation pressure and goal mutations at B (innocent of that specific claim) instead of A, corrupting the whodunit chain the causal spine is designed to track.

_Verify (CONFIRMED/high):_ Read DirectorNode.ts lines 60-116 directly. The code exactly matches the claim: `lastExternalAction` (line 87-88) is computed once per observer per evaluation round via reverse-find on recentActions, then used unconditionally for every belief with source 'told' in eval_.new_beliefs (lines 90-100), with no per-belief resolution against which specific action produced it. Note the file even has an actionById map built at line 76 for source resolution by action_id, but it is never used in the per-belief mapping at lines 92-100 — only lastExternalAction is used, confirming the missing per-belief in


### [MEDIUM] server/engine/Orchestrator.ts:811 — correctness
**Room-tension sort comparator is broken and does not order rooms by tension at all.**

The tertiary tiebreak `return (tensionState.accumulator > 50 ? a : b) === a ? -1 : 1;` does not compare `a` and `b` against each other in any meaningful way. When `tensionState.accumulator > 50`, the expression reduces to `a === a`, which is always `true`, so the comparator returns `-1` for EVERY pair regardless of which locations are actually being compared. This violates the basic antisymmetry/consistency contract Array.prototype.sort relies on, so the resulting room order is not a real ordering by tension — it is essentially arbitrary/engine-dependent for any pair that also ties on suspicion sum and agent count.

_Failure:_ With `tensionState.accumulator` at, say, 60 and two rooms A and B tied on suspicion-sum and agent-count, sorting `[roomB, roomA]` calls the comparator with (roomB, roomA) first: `(accumulator>50 ? a : b)` evaluates to `a` (roomB), compared against `a` (roomB) itself → true → returns -1, claiming roomB < roomA. But sorting `[roomA, roomB]` also returns -1 for (roomA, roomB) claiming roomA < roomB. The comparator asserts both orderings are 'less than' simultaneously, so which room actually runs first in runFullScene's per-round hot-room-first scheduling becomes non-deterministic/engine-artifact rather than reflecting the documented 'stable across calls' tension tiebreak, defeating the intended dramatic-pressure-driven room scheduling.

_Verify (CONFIRMED/high):_ Code at line 811 confirmed verbatim: `return (tensionState.accumulator > 50 ? a : b) === a ? -1 : 1;`. When accumulator > 50, expression is `a === a ? -1 : 1`, which is always -1 regardless of which room object is passed as a vs b in that call — i.e., for every pair of tied rooms the comparator says "a < b" no matter which room is actually a and which is b. This violates comparator antisymmetry (sort(x,y) and sort(y,x) both return -1), making the tiebreak result order-dependent/unstable rather than a real ordering by tension. Similarly when accumulator <= 50, it reduces to `b === a ? -1 : 1`, 


### [MEDIUM] server/engine/Orchestrator.ts:293 — correctness
**On a successful RELOCATE/FLEE, `action.target` is left holding the destination location identifier, which then gets written into `target_char_id` (a field every other consumer treats as a character id).**

When `_resolveRelocation` succeeds (lines 265-269 in runTurn, 490-500 in runRoomSimulation), the code updates `action.content` and calls `this.stage.updateAgentLocation(...)`, but never clears `action.target` (unlike the two failure branches, which explicitly set `action.target = null`). `action.target` still contains the location name/id string that was passed in as the RELOCATE/FLEE destination. That value then flows straight into `actionEntry.target_char_id: action.target ?? null` (line 293 / 524), and `target_char_id` is documented and consumed elsewhere (e.g. `agent/deterministic.ts:550`'s `a.target_char_id === sheet.char_id` accusatory check, and CausalSpine's suspect/discoverer target_char_id fields) as a character id, not a location id.

_Failure:_ An agent whose char_id happens to collide with or be compared against a location identifier string is not the concern; the real effect is that any downstream logic scanning recent actions for `target_char_id === someCharId` (e.g. deterministic.ts's accusatory-tone-toward-me check) silently mis-evaluates for this action — it neither matches a real character reference nor is null, so any code that assumes `target_char_id` is either a valid char_id or null (rather than 'sometimes a location string') can produce a bogus or missed match when iterating the action log for this RELOCATE/FLEE entry.

_Verify (CONFIRMED/high):_ Verified in server/engine/Orchestrator.ts: lines 265-280 (and the mirrored 490-510 in runRoomSimulation) show that both failure branches of RELOCATE/FLEE explicitly set `action.target = null`, but the success branch (targetLoc truthy) at 267-269 only updates `action.content` and calls `updateAgentLocation` — it never clears `action.target`. That means on success, `action.target` still holds the destination location id/name string that was passed into `_resolveRelocation`. This value is then written directly into `target_char_id: action.target ?? null` at line 293 (and 524), and `ActionLogEntry


### [MEDIUM] server/engine/ai-provider.ts:184 — correctness
**FreeRideProvider.generate ignores config.systemInstruction, responseSchema, and responseMimeType, silently diverging from GeminiProvider's behavior for identical calls.**

`extractTextFromContents(params.contents)` only folds `params.contents` into a single user message; `params.config.systemInstruction` (used pervasively, e.g. memory.ts's `synthesizeReflectionsFor`/`replanGoalsFor` to set character identity/instructions) is never read or sent to OpenRouter. Likewise `responseSchema`/`responseMimeType: 'application/json'` — used to constrain structured JSON output — are dropped; only `temperature`/`maxOutputTokens`/`stopSequences` are forwarded. Every caller that assumes uniform behavior across providers (the whole point of the `LLMProvider`/`AIProvider` abstraction) silently loses the system prompt and JSON-schema constraint whenever the free-tier provider is active.

_Failure:_ With OPENROUTER_API_KEY configured (free tier auto-selected), `synthesizeReflectionsFor` sends its `systemInstruction: "You are ${sheet.name} in a reflective moment..."` and a strict `responseSchema` requiring `{reflections: [...]}`. FreeRideProvider drops both, so the model receives only the bare user prompt with no persona framing and no JSON-shape constraint; it can freely return prose instead of JSON, at which point `safeJsonParse` falls back to `{reflections: []}` and the character silently gains zero reflective insights that turn, while GEMINI-tier deployments behave completely differently for the identical call.

_Verify (CONFIRMED/high):_ Read ai-provider.ts in full for FreeRideProvider (lines 149-350) and GeminiProvider (356-382). FreeRideProvider.generate (180-268) and generateStream (270-349) both derive messages solely via extractTextFromContents(params.contents) and only extract config.temperature/maxOutputTokens/stopSequences (192-195, 281-283) before POSTing to OpenRouter with {model, messages, temperature, max_tokens, stop}. Nowhere in the file does FreeRideProvider read params.config.systemInstruction, responseSchema, or responseMimeType. GeminiProvider.generate/generateStream (375-381), by contrast, spread the entire 


### [MEDIUM] server/lib/ai-config.ts:71 — correctness
**wireProviders() silently leaves the previous provider wired when an openai-compat provider is selected with no baseUrl configured yet.**

For the LLM branch (and identically for embeddings/image/TTS below it), the 'openai-compat' case only calls setLLMProvider(...) when `baseURL` is truthy; there is no else-branch to reset/clear the provider when it is empty. Contrast this with the final `else` arm which explicitly calls resetLLMProvider() for the non-openai-compat case. If an operator (or the /api/ai-config route) applies `{ provider: 'openai-compat' }` before (or without ever) supplying a baseUrl, applyConfig()/wireProviders() runs, getPublicConfig() now reports provider: 'openai-compat', but the actually-wired LLMProvider singleton is whatever was active before this call (could still be the old Gemini provider, or a previous openai-compat provider pointed at a stale/different baseUrl/key).

_Failure:_ Client currently has Gemini wired (default). Admin POSTs { provider: 'openai-compat' } intending to configure a new endpoint but the baseUrl field is submitted in a later separate call (or omitted). applyConfig() runs with baseUrl undefined -> wireProviders()'s openai-compat branch takes `_cfg.baseUrl ?? ''` = '' -> falsy -> setLLMProvider is never called -> Gemini provider remains live. Meanwhile llmReady() (which for non-gemini provider checks `Boolean(pub.baseUrl) && ...`) correctly reports NOT ready, so the UI may show 'not configured', yet any code path that calls getLLMProvider()/generate() directly (bypassing llmReady) will silently keep using Gemini with production keys instead of failing closed or reflecting the requested provider switch — a config/behavior mismatch that could route real traffic to the wrong backend or (if Gemini key is unset) throw a much more confusing error than the intended 'baseUrl missing' message.

_Verify (CONFIRMED/high):_ Verified against server/lib/ai-config.ts:60-76. wireProviders()'s openai-compat branch for the LLM only calls setLLMProvider() when baseURL is truthy (line 71-73); there is no else clearing/resetting when it's empty, unlike the final else arm (line 75) which explicitly calls resetLLMProvider(). applyConfig() (line 124-135) does a shallow merge `_cfg = { ..._cfg, ...cfg }`, so POST /api/ai-config with just { provider: 'openai-compat' } (validated/admin-gated but not required to include baseUrl per this code path) leaves _cfg.baseUrl as whatever it previously was (undefined by default), producin


### [MEDIUM] server/lib/embeddings.ts:9 — resource-leak
**Module-level embedding cache is unbounded and never evicted for the lifetime of the server process.**

`_cache` is a plain Map keyed by full proposition text, populated by every call to getEmbedding() across all game sessions the server ever handles, with no TTL, size cap, or per-session scoping. The comment claims propositions are 'session-scoped' but nothing in the code enforces that — the Map is a single process-wide global that outlives any individual session.

_Failure:_ A long-running server instance handling many concurrent/sequential game sessions over days will accumulate one cache entry per distinct proposition string ever embedded; since propositions are free-form natural-language text generated per belief, the cache grows unbounded and is never freed, leading to steadily increasing memory usage until the process is restarted or OOMs.

_Verify (CONFIRMED/medium):_ Code at server/lib/embeddings.ts:9 confirms `_cache` is a module-level `Map<string, number[]>` created once at import time, with no TTL, size limit, or clearing mechanism anywhere in the file. `getEmbedding()` (lines 11-18) checks the cache, and on miss calls the embedding provider and unconditionally does `_cache.set(text, values)` with no bound. Nothing in this file or its only caller (`detectSemanticContradictions`) ever deletes entries or scopes the cache per session — the comment's claim of "session-scoped" behavior is aspirational/inaccurate, not enforced by any code. Keys are raw propos


### [MEDIUM] server/lib/session-store.ts:195 — correctness
**MAX_SESSIONS is parsed with a bare Number() with no validation, unlike the sibling boundedIntegerEnv() helper used for other session env vars in the same file.**

Every other capacity/retention env var in this file (SESSION_RESET_BACKUP_KEEP, SESSION_RESET_BACKUP_TTL_HOURS) goes through boundedIntegerEnv(), which throws fast on a malformed value. MAX_SESSIONS instead does `Number(process.env.MAX_SESSIONS ?? 100)` with no isFinite/isSafeInteger check. In getOrCreateSession(), the cap check is `if (sessions.size >= MAX_SESSIONS)`; if MAX_SESSIONS is NaN (any non-numeric env value, e.g. a typo'd '100mb' or an empty-but-present string), `sessions.size >= NaN` is always false, so the cap is silently and completely disabled.

_Failure:_ Operator sets MAX_SESSIONS=unlimited (or any non-numeric string) intending a very high/no cap; instead of failing fast at startup (as the analogous SESSION_RESET_BACKUP_KEEP misconfiguration would), the process silently accepts unbounded session creation — every distinct sessionId opens its own Stage/SQLite handle with no eviction, leading to unbounded memory/file-handle growth (resource exhaustion) with no operator-visible warning.

_Verify (CONFIRMED/high):_ Line 195 confirms: `export const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 100);` — unlike lines 193-194 which use boundedIntegerEnv (which presumably validates and clamps/throws). A non-numeric MAX_SESSIONS env value produces NaN. At line 221, `if (sessions.size >= MAX_SESSIONS)` — any comparison with NaN is false, so the cap check never triggers, silently disabling the session limit. This matches the failure_scenario exactly: no validation, no fail-fast, silent unbounded growth.


### [MEDIUM] server/lib/session-store.ts:208 — correctness
**SESSION_TTL_MS (from SESSION_IDLE_TTL_MINUTES) has no numeric validation, so a malformed env value silently disables idle-session eviction.**

`SESSION_TTL_MS = Number(process.env.SESSION_IDLE_TTL_MINUTES ?? 1440) * 60 * 1000` has no isFinite check. sweepIdleSessions() computes `now - s.lastAccess > ttlMs`; if SESSION_IDLE_TTL_MINUTES is non-numeric, ttlMs is NaN and every comparison against NaN is false, so sessions are never evicted by the 60s sweep. This is the same validation gap as MAX_SESSIONS above and defeats the documented cost/correctness rationale in the surrounding comment ("erring generous costs only RAM" assumes the TTL is still a real number, not effectively infinite).

_Failure:_ SESSION_IDLE_TTL_MINUTES is set to an invalid value (typo, empty override in some deployment tooling that doesn't strip it to undefined). Idle in-memory sessions accumulate forever with no eviction; combined with the MAX_SESSIONS bug this doubles the exposure, but even alone it means non-persist (':memory:') sessions from long-abandoned tabs are retained indefinitely, growing process memory unbounded.

_Verify (CONFIRMED/high):_ Code at session-store.ts:208 is exactly as quoted: `Number(process.env.SESSION_IDLE_TTL_MINUTES ?? 1440) * 60 * 1000` with no validation. If the env var is set to a non-numeric string, Number() yields NaN, and NaN * anything is NaN, so SESSION_TTL_MS becomes NaN. This flows as the default ttlMs parameter into sweepIdleSessions (line 341), used in `now - s.lastAccess > ttlMs`; any comparison with NaN is false, so no session is ever evicted by the periodic sweep (line 355 sets it running every 60s). This matches the described failure scenario exactly and is a real, reproducible defect (same clas


### [MEDIUM] server/lib/structure-presets.ts:1454 — correctness
**instantiatePreset() can emit a beat whose turn_end exceeds expectedTurns, producing an out-of-range turn number.**

turn_end is computed as Math.max(Math.round((t.pct_end/100)*n), Math.round((t.pct_start/100)*n) + 1). The '+1' floor is meant to guarantee a beat spans at least one turn, but it is applied without clamping to n (the total turn count), so when a beat's pct_start and pct_end round to the same (maximal) turn number, turn_end becomes n+1 — one turn past the end of the session.

_Failure:_ instantiatePreset('save_the_cat', 4) (n clamped to the 4-turn floor via Math.max(4, expectedTurns)): the 'Final Image' template has pct_start:97, pct_end:100. turn_start = Math.round(0.97*4) = 4, and turn_end = Math.max(Math.round(1.00*4), 4+1) = Math.max(4,5) = 5. The returned OutlineBeat has turn_start=4, turn_end=5 for a 4-turn session, i.e. it references turn 5 which does not exist. Any downstream code that indexes a turns array of length expectedTurns, or asserts turn_end <= expectedTurns, will either throw, silently drop the beat, or leave the last beat perpetually 'active' past the session's actual end.

_Verify (CONFIRMED/high):_ Read structure-presets.ts lines 1444-1461 directly. The code is exactly as described: n = Math.max(4, expectedTurns); turn_end = Math.max(Math.round((pct_end/100)*n), Math.round((pct_start/100)*n) + 1), with no clamp to n. For save_the_cat's last beat (pct_start:97, pct_end:100) at expectedTurns=4: n=4, turn_start=Math.round(3.88)=4, turn_end=Math.max(Math.round(4)=4, 4+1=5)=5. This produces turn_end=5 in a 4-turn session, one past the valid range — reproducing the failure scenario exactly as claimed. No clamping or downstream guard was found in the function itself. Severity is plausibly mediu


### [MEDIUM] server/personas/registry.ts:64 — resource-leak
**registerUserPersona has no cap on the number of user personas stored, allowing unbounded memory growth.**

userPersonas is a module-level Map with no maximum size or eviction policy. Every call to registerUserPersona (reachable from POST-style route in scriptide.ts:759) inserts or overwrites an entry keyed by the persona's id. Since ids are user-controlled (any string matching the kebab-case regex), a client can register an unbounded number of distinct persona ids, each holding up to ~2000+300*12 bytes of string data, growing the process's memory indefinitely with no TTL, LRU, or per-user quota.

_Failure:_ A client repeatedly POSTs new personas with unique ids (e.g. persona-1, persona-2, ... persona-N) to the registration endpoint. Since there's no limit on distinct ids nor any expiry, the userPersonas Map grows without bound, degrading and eventually crashing the Node process (OOM) — a straightforward DoS vector on a route that appears to only be guarded by generic rate limiting, not a persona-count cap.

_Verify (CONFIRMED/high):_ registry.ts:64-71 confirms userPersonas is an in-memory Map with no size cap, TTL, or eviction — registerUserPersona simply does userPersonas.set(normalized.id, normalized) unconditionally. The route in server/routes/scriptide.ts:756-766 (POST /api/scriptide/personas) is guarded only by gameLimiter (a generic request-rate limiter) and PersonaBodySchema validation (field shape/format), neither of which bounds the number of distinct persona ids a client can register. Since ids are user-controlled strings (just required to be kebab-case per validatePersona), a client issuing many requests with un


### [MEDIUM] server/planning/apdl-validator.ts:108 — correctness
**validatePlanPreconditions (and the coherence checks that mirror it) never actually evolve emotional_state between scenes, only bumping timestamp, so precondition/coherence checks after scene 1 are validated against the plan's original emotional_state rather than the state that would actually exist at that point in the story.**

In validatePlanPreconditions, after checking action i's preconditions against `state`, the code does `state = { ...state, timestamp: state.timestamp + 1 }` — this creates a new object but keeps the same `emotional_state` Map reference, i.e. none of action i's emotional_effects are applied before checking action i+1's preconditions. The same pattern appears in checkForUnearnedEmotions (line ~224) and checkForIncoherentTransitions (line ~318). The code comment even flags this as 'simplified - in real implementation would use proper state evolution', but it is exported and used by index.ts/generateValidationSummary as the real validation entry point.

_Failure:_ A plan where action 2 requires precondition `bob.guilt >= 0.4` that is only satisfied because action 1's emotional_effects raised bob's guilt (e.g. the 'betray' → 'show_remorse' sequence in examples.ts, where show_remorse's precondition depends on guilt raised by betray). validatePlanPreconditions will check action 2's precondition against the ORIGINAL initial emotional_state (guilt still 0), report a spurious violation for a plan that is actually valid, and generateValidationSummary will surface this false violation to the user as 'Emotional Preconditions: ✗ 1 violation(s)' even though the actual simulated plan (as produced by apdl-planner.ts, bugs aside) satisfied it.

_Verify (CONFIRMED/high):_ Read apdl-validator.ts lines 91-322. validatePlanPreconditions loops over plan.actions, calling validateEmotionalPreconditions(action, state) against `state`, then does `state = { ...state, timestamp: state.timestamp + 1 }` — a shallow copy that keeps the same emotional_state Map reference and never applies action.emotional_effects. So action i+1's precondition check sees the exact same emotional_state as action 1 (only timestamp changes), i.e. state never evolves per the story. The identical dead-simple pattern (spread + timestamp bump, no effects applied) recurs in checkForUnearnedEmotions (


### [MEDIUM] src/components/DirectorPanel.tsx:280 — correctness
**Tension/menace sparkline history is mutated in a ref, so the SparkLine render always lags one update behind the true state.**

tensionHistoryRef.current is appended to inside a useEffect that fires after directorState.tensionLevel/menaceGauge change and trigger a re-render. Because it's a plain ref (not state), mutating it does NOT itself schedule a re-render. The JSX at line ~883 that reads tensionHistoryRef.current to draw the SparkLine renders during the SAME pass that triggered the effect, i.e. before the effect has appended the new point — so it always displays the array from before this update. The freshly-appended point only becomes visible once some later, unrelated re-render occurs.

_Failure:_ User raises tensionLevel to a new peak (e.g. climax of the story) and immediately opens/looks at the Arc tab; the sparkline never shows that final peak because no further state change causes React to re-render this component again — the writer sees a graph that is stuck one tension update behind reality, hiding the most consequential (often final) data point.

_Verify (CONFIRMED/high):_ Verified in src/components/DirectorPanel.tsx: tensionHistoryRef (line 255) is a plain useRef, mutated inside useEffect at lines 280-286 keyed on [directorState.tensionLevel, directorState.menaceGauge]. This effect only mutates the ref array; it never calls any setState, so React has no reason to schedule another render after it runs. The JSX at lines 883-888 reads tensionHistoryRef.current directly during render to feed SparkLine. Because effects run after the commit of the render they were scheduled from, the render that was triggered by the tensionLevel/menaceGauge change reads the ref befor


### [MEDIUM] src/components/FixedPointsPanel.tsx:196 — correctness
**bcTargetIdx becomes a stale/misaligned array index after removeFP shifts the fps array, causing the backchain result to be labeled with the wrong fixed point.**

backchainSingle(i) stores the raw array index i in bcTargetIdx and fires an async request for fps[i] at that time. If the user then calls removeFP on an earlier index before the response resolves (or even after), fps shifts left but bcTargetIdx is never adjusted. BackchainResultView then renders fpDesc from fps[bcTargetIdx] — now a different fixed point than the one the fetched bcResult actually describes.

_Failure:_ User has 4 fixed points, clicks Backchain on index 2 (fp C). While/after the response is showing, they remove index 0 (fp A). fps is now [B, C_now_at_1... wait D, C shift] — concretely index 2 now refers to what was originally index 3 (fp D). The panel keeps showing 'Backchain: <fp D's description>' or '@ scene <fp D's scene>' as the header for a result that was actually computed for fp C, misleading the author about which attractor the trace/schedule applies to.

_Verify (CONFIRMED/high):_ backchainSingle(i) stores the raw array index in bcTargetIdx (line 112-117) and fetches fps[i] at call time. removeFP (line 82-83) uses Array.filter to remove by index, which shifts every later element's index left, but does not touch bcTargetIdx or bcResult. BackchainResultView is then rendered with fpDesc computed from fps[bcTargetIdx] (lines 196-200), which after a removal of an earlier item now points at a different FixedPoint object than the one the async response was actually computed for. There is no id/key-based lookup, no invalidation of bcResult on any fps mutation, and no bounds/sta


### [MEDIUM] src/components/NarrativeAnalyticsPanel.tsx:143 — correctness
**Forced refresh has no request sequencing/cancellation, so an out-of-order (slower) network response can overwrite the result of a later refresh with stale data.**

load(tab, true) bypasses the dataRef/loadingRef guard and fires a new fetch even if one for the same tab is already in flight. There is no AbortController or generation/token check before `setData(d => ({ ...d, [tab]: json }))`, so whichever response arrives last wins — even if it was sent first.

_Failure:_ User clicks the refresh (↺) button twice in quick succession on the Tension tab while the network is inconsistent (e.g. first request slow due to a heavier canon recompute). The second (later-sent) request's response arrives first and updates the ledger, then the first (earlier-sent, slower) request's stale response arrives afterward and overwrites it, leaving the UI showing outdated tension data with no indication it is stale.

_Verify (CONFIRMED/high):_ Read lines 98-118 and 143. `load(tab, force)` at line 100 only skips duplicate fetches when `!force`; with `force=true` (the refresh button's call at line 143) the guard is bypassed entirely, so clicking refresh twice fires two concurrent fetches to the same endpoint with no correlation between request and response. The completion handler at line 111 (`setData(d => ({ ...d, [tab]: json }))`) has no generation/sequence token check and no AbortController anywhere in the file to cancel the stale in-flight request. Whichever response resolves last (by promise resolution order, not send order) wins


### [MEDIUM] src/components/ProofInspectorPanel.tsx:88 — correctness
**inspect() has no guard against out-of-order responses, so a stale fetch can overwrite the report for the currently selected scene.**

inspect(commitId) immediately sets selectedId and starts a fetch, but nothing ties the eventual res.json() back to the commitId that triggered it. mountedRef only protects against post-unmount setState, not against a newer click superseding an older in-flight request.

_Failure:_ User clicks Scene A (fetch A starts), then quickly clicks Scene B (selectedId becomes B, fetch B starts). If fetch A's response arrives after fetch B's (e.g. A's proof computation is slower), setReport(A's data) executes last and overwrites B's report — the panel now shows selectedId=B highlighted in the sidebar but displays Scene A's tier1/tier2/tier3 proof results, silently misleading the user about which scene's proofs they're viewing.

_Verify (CONFIRMED/high):_ inspect() at lines 88-103 sets selectedId immediately, then awaits fetch(`/api/nvm/proof/${commitId}`) and unconditionally calls setReport(await res.json()) once mountedRef.current is true. There is no capture of a request id/generation counter, and no check that commitId still equals the current selectedId before applying the result. mountedRef only guards against post-unmount setState, exactly as the claim states. Because React state updaters (setSelectedId, setReport) don't block on prior in-flight fetches, clicking scene A then quickly scene B starts two overlapping fetches; if A's respons


### [MEDIUM] src/components/QualityEnginesPanel.tsx:114 — correctness
**inspect() has the same missing request-ordering guard as ProofInspectorPanel, so a slower earlier fetch can clobber a later selection's report.**

Identical pattern: setSelectedId(commitId) and the fetch to /api/nvm/quality/scene/:commitId are not correlated by a request token or id check before setReport runs. Only mountedRef (unmount) is checked, not staleness relative to the current selectedId.

_Failure:_ User selects Scene A then Scene B in rapid succession before A's request settles. If A's response resolves after B's, the panel ends up with selectedId=B (highlighted in the list) but report holding Scene A's quality data — every tab (Overview, Dialogue, Voice, Propp, Causal Graph) renders wrong-scene data under the correct-looking selected-scene highlight.

_Verify (CONFIRMED/high):_ inspect() (lines 114-129) sets selectedId immediately, then fetches /api/nvm/quality/scene/${commitId} and unconditionally calls setReport(await res.json()) once the response resolves, gated only by mountedRef.current (unmount check). There is no request token, AbortController, or comparison of commitId to the current selectedId/latest-request-id before applying the result. If a user clicks Scene A then quickly Scene B, and A's fetch resolves after B's, setReport will apply A's stale report last, while selectedId reflects B — a real, reproducible stale-response race matching the failure_scenar


### [MEDIUM] src/components/StoryMachine.tsx:500 — correctness
**handleRunRoom's EventSource.onerror unconditionally closes the connection and rejects on the very first 'error' event, even though EventSource normally auto-reconnects on transient network blips.**

The standard EventSource behavior is to fire 'error' on a dropped connection and then automatically attempt to reconnect (readyState becomes CONNECTING, not CLOSED) unless the client explicitly closes it. Here, onerror immediately calls evtSource.close() and rejects the wrapping promise with 'SSE connection lost' on the first error, regardless of whether the browser would have transparently reconnected. This turns a recoverable transient network hiccup into a hard failure that aborts the whole 5-turn room simulation.

_Failure:_ During a 'Run Dialogue Lock' simulation, the underlying HTTP/SSE connection briefly drops (e.g. a Wi-Fi blip, a proxy timeout, or a server restart mid-stream) partway through the 5 turns. The browser would normally reconnect and keep receiving 'agent_action'/'round_complete' events, but onerror fires first, immediately closes the EventSource and rejects — the catch block shows 'Room simulation failed. SSE connection lost' and the loading/stream state resets, discarding a simulation that could have completed with a brief reconnect.

_Verify (CONFIRMED/high):_ Read src/components/StoryMachine.tsx lines 473-505. handleRunRoom wraps the EventSource lifecycle in a Promise. The onerror handler (lines 500-504) unconditionally calls evtSource.close() and reject(new Error('SSE connection lost')) on the very first 'error' event — there is no check of evtSource.readyState, no retry/backoff logic, and no distinction between a transient network drop (where the browser would auto-reconnect, readyState going to CONNECTING) versus the stream being terminated by the server/network for good. Standard EventSource semantics do fire onerror on transient disconnects wh


### [MEDIUM] src/lib/fountain.ts:80 — correctness
**Dual-dialogue `^` marker retroactively retags the nearest character-type block anywhere in the document, not necessarily the immediately preceding speaking cue.**

When a character cue ending in `^` is detected, the code does `[...blocks].reverse().find(b => b.type === 'character')` to find "the preceding character block" to also mark as dual_dialogue. This search is unbounded — it scans the entire blocks array built so far, with no restriction to the same scene or to blocks immediately adjacent (only action/scene_heading/empty blocks in between, no other character block). If a `^`-suffixed cue appears after any number of scenes that contain only action/scene-heading blocks (no intervening character cue), the nearest 'character'-typed block found could be a character cue from a completely different, earlier scene, which then gets silently retyped to 'dual_dialogue'.

_Failure:_ Script:
```
JOE
Hello.

Action beat.

FADE OUT.

INT. NEW SCENE - DAY

Some unrelated action.

MARY ^
Hi.
```
MARY's cue ends in `^` and is preceded by a blank line, so the dual-dialogue branch fires. The reverse search finds JOE's block (the only prior 'character'-type block, from an earlier unrelated scene) and mutates it to 'dual_dialogue', pairing JOE and MARY as a two-column dual-dialogue cue even though they are in different scenes and were never intended to be paired. This corrupts downstream FDX/DOCX/PDF export layout (fdx.ts, docx.ts, screenplay-layout.ts all consume this block typing) and any dual-dialogue-aware rendering.

_Verify (CONFIRMED/high):_ Code at fountain.ts:84 is exactly as described: `[...blocks].reverse().find(b => b.type === 'character')` with zero bound on scene, distance, or intervening scene headings. The only guard (line 78) restricts when the dual_dialogue branch fires for the CURRENT cue (must be preceded by empty/start), but does nothing to constrain which prior block gets retagged. In the failure scenario, once JOE's cue is emitted as 'character' and never followed by another character-type block until MARY ^ appears (even after an intervening scene heading), the reverse find will match JOE's block since it's the ne


### [MEDIUM] src/services/director.ts:25 — correctness
**An already-aborted externalSignal is silently ignored because the code only listens for a future 'abort' event.**

Line 25 does `externalSignal?.addEventListener('abort', () => controller.abort())` unconditionally, but never checks `externalSignal.aborted` first. DOM/undici AbortSignal only fires the 'abort' event once, at the moment abort() is called; if the signal was already aborted before analyzeScriptBlock was invoked, that event has already fired and this newly-attached listener will never run.

_Failure:_ Caller does `const ctrl = new AbortController(); ctrl.abort(); analyzeScriptBlock(state, text, chars, ctrl.signal)` (e.g. user cancels then a debounced call still fires with the same stale signal object, or a component reuses a signal after an earlier cancellation). The function proceeds to fetch '/api/analyze-script' fully, never aborting, ignoring the caller's explicit cancellation request and wasting a network round trip / potentially resolving with results the caller no longer wants applied.

_Verify (CONFIRMED/high):_ Lines 23-25: a fresh `controller` is created and only linked to `externalSignal` via `addEventListener('abort', ...)`, with no upfront `if (externalSignal?.aborted) controller.abort()` check. Per the AbortSignal spec, the 'abort' event fires exactly once at the moment `.abort()` is called; a listener attached after that point will never see it. So if `externalSignal` is already aborted when `analyzeScriptBlock` is invoked, `controller` is never aborted, `fetch` runs to completion using `controller.signal` (which stays non-aborted), and the AbortError catch path (lines 44-46, including the `ext


### [LOW] server/engine/Stage.ts:1407 — resource-leak
**Shadow-write timeout timer is never cleared when the EventStore write finishes first, leaving a dangling setTimeout per commit.**

_shadowWriteToEventStore creates `timeoutPromise` with `setTimeout(() => { timedOut = true; reject(...) }, shadowWriteTimeoutMs)` and races it against `shadowWrite()`. When `shadowWrite()` resolves (the common, fast path), the code never calls `clearTimeout` on the pending timer — it is simply left to fire later. Under sustained high commit throughput (many turns per session, each calling appendCommit -> _shadowWriteToEventStore), this accumulates one live timer per commit for up to `shadowWriteTimeoutMs` after each shadow write already succeeded, retaining the `commit`/closure state in memory for that whole window and needlessly keeping the event loop occupied.

_Failure:_ A long self-play/simulation run issuing hundreds of StoryCommits in quick succession (each via appendCommit) with eventStoreShadow enabled: hundreds of setTimeout handles queue up simultaneously, each holding a reference to its commit's closure until the timer fires minutes later, inflating memory and event-loop timer-queue size well beyond what the actual outstanding shadow-write concurrency requires.

_Verify (CONFIRMED/high):_ Read the full _shadowWriteToEventStore method (Stage.ts ~1393-1474). The timeoutPromise's setTimeout handle is never captured in a variable and clearTimeout is never called anywhere in the function, including in the success path of shadowWrite() or in the Promise.race().catch() handler. So when shadowWrite() resolves first (the common fast path), the timer keeps running until shadowWriteTimeoutMs elapses, holding a reference to the closure (commit, startTime, timedOut) via the timer callback the whole time. Under high commit throughput this does accumulate many live timers simultaneously as de


### [LOW] server/lib/ai-providers/openai-compat.ts:483 — correctness
**The embedding adapter swallows all HTTP failures by returning an empty array instead of surfacing an error, silently corrupting downstream vector math.**

Unlike the LLM adapter (which throws with the status/body on !res.ok), makeOpenAICompatEmbeddingProvider's embed() returns `[]` for ANY non-ok response (401 unauthorized, 500 server error, malformed request, rate limit, etc.). Callers that store/compare this vector (e.g. cosine similarity in story-vector.ts or corpus-loader.ts caching) have no way to distinguish 'provider is down/misconfigured' from 'the embedding is degenerate/zero-length', and a zero-length vector mixed into vector math expecting a fixed dimension can silently produce NaN, an always-zero similarity, or an out-of-bounds/undefined index rather than a clear failure.

_Failure:_ The configured openai-compat embedding endpoint starts returning 401 (e.g. an expired/rotated API key). embed() returns [] for every call. Any code that assumes embeddings have a fixed dimension (e.g. computing a dot product or writing to a fixed-size cache record) either silently produces 0/NaN similarity scores for every comparison, or throws an unrelated 'index out of range'/'undefined access' error far from the real cause, and the auth failure is never logged or surfaced to the caller.

_Verify (CONFIRMED/high):_ Code at openai-compat.ts:483 is exactly `if (!res.ok) return [];`, contrasted with the LLM adapter's `if (!res.ok) { const errText = ...; throw new Error(...); }` at lines 445-447. This confirms the claim precisely: any non-ok HTTP response (401, 500, 429, etc.) from the embeddings endpoint is swallowed and replaced with an empty array, with no logging and no error surfaced to the caller. Downstream code relying on a fixed-dimension embedding vector for similarity/caching would indeed receive a length-0 array indistinguishable from a legitimate degenerate embedding. This is a real, demonstrabl


### [LOW] server/lib/embeddings.ts:54 — correctness
**The comment's stated 'capped at 5 comparisons per new belief' bound is only enforced on the inner loop, not on the number of new beliefs processed.**

candidateNew (line 54) is filtered by confidence only, with no slice/cap, so the outer for-loop at line 56 iterates over every high-confidence new belief and issues an embedding call for each (subject only to the module cache). Only the inner existing-beliefs loop is capped to 5 via `.slice(0, 5)` at line 61. If a caller passes many new beliefs in one batch, the actual number of embedding calls is `candidateNew.length * up-to-5`, not bounded to a small constant as the header comment implies.

_Failure:_ A turn that produces e.g. 50 new high-confidence beliefs results in up to 250 embedding provider calls in a single detectSemanticContradictions invocation, contrary to the documented 'bound API calls' guarantee, risking rate-limit exhaustion or slow turns.

_Verify (CONFIRMED/high):_ Read server/lib/embeddings.ts lines 41-81. candidateExisting (line 53) is capped via .slice(-10) and further sliced to 5 in the inner loop (line 61), but candidateNew (line 54) is filtered only by confidence with no cap or slice. The outer for-loop (line 56) iterates over every element of candidateNew, each iteration issuing an embedding call for nb.proposition (line 57) plus up to 5 more for existing beliefs. The header comment "Capped at 5 comparisons per new belief to bound API calls" is true per-belief but doesn't bound total calls, since the number of new beliefs itself is unbounded. A ba


### [LOW] server/lib/fountain.ts:201 — correctness
**RELOCATE fallback substitutes the target character ID for a location name when content lacks the expected '→ ' prefix.**

When entry.content does not start with '→ ' (i.e. it wasn't produced by the Orchestrator's expected encoding), the destination falls back to `entry.target_char_id`, which is a character identifier, not a location name — RELOCATE actions have no target character semantically, so this is very likely to produce an internal ID string rendered directly into the exported screenplay text (e.g. 'JOHN moves to char_042.') instead of a human-readable location.

_Failure:_ Any RELOCATE entry whose content field was populated by a caller other than the documented Orchestrator convention (or was left as a bare location name without the arrow prefix) renders a raw internal character/location ID into the customer-facing Fountain output.

_Verify (CONFIRMED/medium):_ Code at fountain.ts:199-207 matches the claim exactly. RELOCATE case checks entry.content.startsWith('→ '); if not, falls back to entry.target_char_id ?? entry.content ?? 'another room'. target_char_id is documented elsewhere in the file (e.g. EXAMINE case at line 190-191) as a character ID that must be resolved via agentMap.get(...).name before display — it is never itself a display-ready string. In the RELOCATE fallback it is used raw with no such lookup, so if a RELOCATE entry ever lacks the '→ ' prefix and has a target_char_id set, a raw internal ID renders directly into the Fountain scrip


### [LOW] server/lib/session-store.ts:288 — correctness
**An explicit sessionId supplied as a query/body array (e.g. duplicate ?sessionId= params) silently falls back to 'default' instead of the documented reject-with-400 behavior.**

The comment above this block states "a *present but malformed* explicit value is rejected with 400 rather than silently falling back, since silently substituting 'default' here could leak another user's session into an otherwise-explicit request." But the actual code only rejects with 400 when `raw` is a string that fails the regex; when `raw` is present but not a string at all (Express parses repeated query keys like `?sessionId=a&sessionId=b` into a string[]), the `typeof raw !== 'string'` branch silently returns 'default' instead of throwing ValidationError, contradicting the stated security rationale.

_Failure:_ A client (or a buggy proxy/browser extension) sends a request with `?sessionId=alice&sessionId=bob` or a duplicated body field parsed into an array. Instead of a 400 error, the request silently resolves to the shared 'default' session rather than either explicit id — a caller who believed they were addressing an explicit, isolated session instead reads/writes the 'default' session's state, exactly the leakage scenario the comment says this code is designed to prevent.

_Verify (CONFIRMED/high):_ Lines 274-294 show raw = req.query.sessionId (GET) or req.body?.sessionId (else). Express parses repeated query params (?sessionId=a&sessionId=b) into a string[]. At line 288, `if (typeof raw !== 'string' || !raw.trim()) return 'default';` — an array raw fails the `typeof raw !== 'string'` check and silently returns 'default', bypassing the ValidationError throw path that handles malformed string values. This directly contradicts the comment at lines 283-286 stating malformed explicit values are rejected with 400 to avoid session leakage. The failure scenario (duplicate ?sessionId= params) is 


### [LOW] server/lib/validation.ts:79 — correctness
**isPrivateIPv6's fe80/fc00/fd00 detection matches on the literal leading characters of the (zero-trimmed) hextet string rather than the numeric value, so it misclassifies unrelated public IPv6 addresses whose compressed first hextet happens to start with the same letters.**

RFC5952 canonical IPv6 text drops leading zeros within each hextet, so the 16-bit value 0x0FE8 renders as 'fe8', and 0x0FC0 renders as 'fc0'. The checks `/^fe[89ab]/.test(norm)` and `norm.startsWith('fc') || norm.startsWith('fd')` only look at the literal string prefix, not the actual first 16 bits of the address. A hextet string like 'fe8' or 'fc0' matches the prefix test even though its true numeric value (0x0FE8 / 0x0FC0) falls far outside the actual fe80::/10 link-local or fc00::/7 unique-local ranges (which require the full top byte to be 0xFE80-0xFEBF or 0xFC00-0xFDFF respectively).

_Failure:_ A caller sets AiConfigSchema.baseUrl to 'http://[fe8::1]/v1' — a syntactically valid, non-link-local IPv6 literal (its true first hextet value is 0x0FE8, not in fe80::/10). ssrfUnsafeUrlReason() calls isPrivateIPv6('fe8::1'), whose regex `/^fe[89ab]/` matches on the literal characters 'fe' + '8', so the address is wrongly rejected as 'must not target a private/loopback/reserved IP address' even though it is a legitimate public address the operator intended to configure. (The same literal-prefix flaw applies to the fc/fd unique-local check, e.g. 'fc0::1'.)

_Verify (CONFIRMED/high):_ Read validation.ts:75-99. The regex `/^fe[89ab]/.test(norm)` and `norm.startsWith('fc')||norm.startsWith('fd')` operate on the literal (lowercased) address string, not on the numeric value of the first hextet. RFC5952 canonical form strips leading zeros per hextet, so hextet 0x0FE8 (decimal 4072, whose true leading byte is 0x0F, well outside fe80::/10) renders as "fe8" and the string "fe8::1" matches `/^fe[89ab]/` purely because the characters happen to be 'f','e','8'. Same for "fc0::1" (true value 0x0FC0, top byte 0x0F, outside fc00::/7) matching `startsWith('fc')`. This causes isPrivateIPv6 


### [LOW] src/App.tsx:38 — type-unsafe-cast
**Persisted config is cast to StoryConfig with only a typeof-object check, not a shape/field validation.**

loadPersistedView() only verifies parsed.config is a non-null object before casting it to StoryConfig with `as StoryConfig`. It never checks that required fields (theme, format, structure, directorStyle, emotionalArc, backstory) actually exist or have valid enum values. Any object survives, e.g. `{}` or a config shape from an older app version with renamed/removed fields.

_Failure:_ User has stale localStorage from a previous StoryConfig schema (e.g. missing `structure` or with an old enum value no longer supported) or a browser extension/user tampering writes `sm_app_view_v1` with `config: {}`. loadPersistedView returns this object as a fully-typed StoryConfig, App renders ScriptIDE with initialConfig={} , and any code in ScriptIDE/StoryMachine that assumes these fields exist (e.g. `config.structure.toUpperCase()` or a switch over `directorStyle`) throws or silently mis-renders instead of falling back to the wizard.

_Verify (CONFIRMED/medium):_ App.tsx:38 confirms the claim precisely: `parsed.config && typeof parsed.config === 'object' ? (parsed.config as StoryConfig) : null` — no check of required fields (theme/format/structure/directorStyle/emotionalArc/backstory) or enum validity. Any object, including `{}`, passes and is cast. Downstream, ScriptIDE.tsx uses `initialConfig.theme` (with `||` fallback, safe) but also `initialConfig?.directorStyle` at line 1791 and other direct field reads elsewhere; some of these fields feed into logic that assumes a valid enum (e.g. director-style branching, structure-based generation) without a nu


### [LOW] src/components/FixedPointsPanel.tsx:159 — correctness
**FixedPointCard is keyed by array index, so its internal `expanded` state is silently reassigned to a different fixed point when an earlier card is removed.**

fps.map((fp, i) => <FixedPointCard key={i} .../>) uses the positional index as the React key. FixedPointCard holds its own `expanded` local useState. When removeFP splices an earlier entry out of the array, every card after it shifts down one index; React reuses the component instance for that key (index) rather than remounting, so the previously-collapsed/expanded UI state now applies to a different fixed point's data.

_Failure:_ With 3 fixed points where the writer manually collapsed card #3 (index 2) to reduce clutter, removing fixed point #1 (index 0) shifts the old #3 into index 1's slot; the component at key=1 (now showing fp that was #2) inherits whatever expanded/collapsed state the old key=1 instance had, so a card the user never touched appears collapsed/expanded unexpectedly.

_Verify (CONFIRMED/high):_ Confirmed by direct code read: fps.map((fp,i) => <FixedPointCard key={i} .../>) at line 159-161 uses array index as key, and FixedPointCard defines `const [expanded, setExpanded] = useState(true)` internally (line 229) with no reset tied to fp identity. removeFP splices the array (line 82), shifting indices of subsequent items down by one. React reconciliation keyed by index will reuse component instances at each index position rather than remounting, so the expanded/collapsed local state bleeds across to a different fixed point's data after a removal. This is a standard React anti-pattern ins


### [LOW] src/components/ProjectionGalleryPanel.tsx:122 — correctness
**exportFountainAs silently does nothing on a failed export request, giving the user no feedback that the FDX/DOCX/PDF export failed.**

In exportFountainAs, both the fdx/docx branch (`if (!res.ok) return;`) and the print-html branch (`if (!res.ok) return;`) swallow non-2xx responses without setting any error state or showing a message; the surrounding component has no try/catch either, so a rejected fetch (network error) would also produce an unhandled promise rejection.

_Failure:_ User clicks '↓ FDX' while the /api/export/fdx route is down or returns a 500. The button click produces no visible change — no download starts, no error text appears — leaving the user to assume the export succeeded or that the button is unresponsive, with no diagnostic signal that the request actually failed server-side.

_Verify (CONFIRMED/high):_ Read exportFountainAs (lines 103-131). Confirmed: both the print-html branch (line 112: `if (!res.ok) return;`) and the fdx/docx branch (line 123: `if (!res.ok) return;`) silently bail on non-2xx responses with no error state, toast, or console message set anywhere in the function or component. There is also no try/catch around the fetch calls, so a rejected fetch (e.g., network failure) would throw an unhandled promise rejection inside an async function invoked directly from an onClick handler (lines 211-213), which is swallowed by the browser with no user-visible feedback. This matches the f


### [LOW] src/components/StoryMachine.tsx:509 — correctness
**handleRunRoom's finally block calls setLoading(false)/setStreamLog([]) without checking mountedRef, unlike the fetch helpers elsewhere in the same file that guard all setState calls with mountedRef.**

Every data-fetching helper in this component (fetchState, fetchLedger, fetchIllusionState, fetchSpineData, notifyFetchFailure) checks `mountedRef.current` before calling setState, specifically to avoid updating state after the component unmounts (there's even a dedicated cleanup effect that closes the EventSource and marks `mountedRef.current = false` on unmount). handleRunRoom's own finally block (and handleTurn's, and submitScenario's) breaks this pattern: it calls setLoading(false) and setStreamLog([]) unconditionally after the awaited work resolves.

_Failure:_ The user starts 'Run Dialogue Lock', then closes/unmounts the StoryMachine view (e.g. clicks 'Back to script') while the SSE stream is still in flight or immediately after refreshAll() begins. The cleanup effect closes the EventSource, but the outstanding handleRunRoom promise chain still resolves and its finally block calls setLoading/setStreamLog on the now-unmounted component, producing a React 'setState on unmounted component' warning and, in stricter test/SSR harnesses, a real error.

_Verify (CONFIRMED/high):_ Read src/components/StoryMachine.tsx lines 473-512. handleRunRoom's finally block (lines 509-511) calls setLoading(false) and setStreamLog([]) with no mountedRef.current guard, unlike fetchState/fetchLedger/fetchIllusionState/notifyFetchFailure etc. which all check mountedRef.current (confirmed via grep showing the pattern at lines 248/250/285/298/312/325/334/347). The cleanup effect (line 256) only sets mountedRef.current = false and presumably closes the EventSource — it does not cancel/await the in-flight promise chain (SSE promise + refreshAll()). If the component unmounts while that promi


### [LOW] src/components/editor/collab.ts:85 — resource-leak
**Y.Doc is allocated before the auth-token fetch and is never destroyed if that fetch rejects.**

createCollabSession() does `const doc = new Y.Doc();` then `await fetchCollabToken(opts.room)` with no try/catch around the doc allocation. If fetchCollabToken throws (network error, 401/403, server down), the function's promise rejects and control never reaches the `return { ..., destroy() { doc.destroy(); ... } }` object. The caller (FountainEditor.tsx's `.catch((err) => console.error(...))`) only logs — it never sees the `doc` instance, so it can never call `doc.destroy()`. Every failed join leaks a Y.Doc (and any observers Yjs registers internally on creation).

_Failure:_ Collab room token endpoint is briefly unreachable (deploy blip, expired session) while a writer has the editor open with collabRoom set. FountainEditor mounts, calls createCollabSession, which allocates a Y.Doc, then fails the token fetch. The doc is silently leaked. If the writer's page keeps retrying (e.g. switching documents, remounting the editor, or a caller that retries the join), each attempt leaks another Y.Doc with no way to reclaim it short of a full page reload.

_Verify (CONFIRMED/high):_ The code exactly matches the claim: `const doc = new Y.Doc();` then `const ytext = doc.getText('script');` then `const token = await fetchCollabToken(opts.room);` with no try/catch wrapping. If fetchCollabToken throws (non-ok response or network failure), createCollabSession's returned promise rejects immediately; the doc object is local to the function and never exposed, so the WebsocketProvider is also never created and doc.destroy() is unreachable. Caller behavior in FountainEditor.tsx (not shown here but referenced) only logging the error would indeed leak the doc. This is a real, reproduc


### [LOW] src/components/VoiceDNAPanel.tsx:76 — async-race
**load() checks mountedRef before awaiting res.json(), not after, so setData can still fire after unmount.**

In `load()`, the guard `if (!mountedRef.current) return;` runs immediately after the fetch resolves but before `await res.json()`. If the component unmounts during the JSON-parsing await (e.g. a large payload, slow parse, or the panel being closed right as the response body streams in), `setData(await res.json())` still executes on the unmounted component because the mounted check already passed.

_Failure:_ User opens VoiceDNAPanel, the /api/nvm/voice-dna fetch succeeds and its body starts parsing, then the user immediately clicks Close (unmounting the panel) before `res.json()` resolves. `mountedRef.current` was already read as true, so `setData(...)` still runs against the unmounted component, producing a React warning/no-op state update instead of the guard's intended no-op — the check gives false confidence that a stale response can't slip through.

_Verify (CONFIRMED/high):_ Code at lines 74-83 confirms the claim exactly: line 79 checks `if (!mountedRef.current) return;` and then line 80 does `setData(await res.json())` — the check happens before the second await, not after. If unmount occurs during `res.json()` parsing, `setData` will fire on an unmounted component. This is a real, if minor, race — React will just log a warning (no crash) since React 18 doesn't error on this, but the guard's intent is defeated. Severity is correctly rated low since impact is just a benign console warning/no-op, not a crash or data corruption.


### [LOW] src/components/editor/screenplay-complete.ts:137 — correctness
**sceneHeadingCompletions picks the LAST hyphen in the line as the location/time-of-day boundary, so a location name containing a hyphen hijacks autocomplete into time-of-day suggestions mid-location.**

`dashIdx = afterPrefix.lastIndexOf('-')` is meant to find the ' - TIME' separator, but it matches any hyphen anywhere in the typed text, including one that's part of the location name itself (e.g. 'X-RAY ROOM', 'MOTHER-IN-LAW'S HOUSE').

_Failure:_ User types 'INT. X-' while still naming the location 'X-RAY ROOM'. dashIdx finds the hyphen in 'X-', afterPrefix.slice(dashIdx+1) is empty, and the function switches from location suggestions to offering the full TIME_OF_DAY list (DAY, NIGHT, CONTINUOUS, ...) even though the writer hasn't finished the location, incorrectly hijacking the dropdown before the scene heading's location is complete.

_Verify (CONFIRMED/high):_ Line 137's afterPrefix.lastIndexOf('-') is a naive last-hyphen search with no whitespace/word-boundary guard. For input "INT. X-" (still typing location "X-RAY ROOM"), afterPrefix=" X-", dashIdx finds that hyphen, and the code falls straight into the time-of-day branch (lines 155-164), offering TIME_OF_DAY completions instead of location completions, matching the claimed failure scenario exactly. Severity is appropriately low since it's an autocomplete UX glitch (wrong dropdown shown mid-typing) with no data corruption or crash — it self-corrects once ' - ' with a real separator is typed, but 


### [LOW] src/components/scriptide/ScriptDoctorPanel.tsx:1781 — correctness
**Format sniff for uploaded .fountain/.txt files can misclassify a plain Fountain script as Final Draft XML based on a literal text match.**

handleFileSelected's format detection falls back to `text.includes("<FinalDraft")` whenever the filename doesn't end in .fdx. This is a plain substring search over the raw uploaded text, not a structural/XML check, so it fires on any incidental occurrence of that literal string inside dialogue, action lines, or a scene heading in an otherwise ordinary Fountain screenplay.

_Failure:_ A writer uploads a plain-text .fountain file whose dialogue or action description happens to contain the substring "<FinalDraft" (e.g. a character discussing screenwriting software, or a stray copy-pasted fragment). sniffedFdx becomes true, format is set to "fdx", and the entire raw Fountain text is sent to the server as the `fdx` field in the POST /api/scriptide/doctor(/deep) request instead of `fountain`. The server's FDX/XML parser receives non-XML text and the diagnosis either fails outright or silently mis-parses the script, producing a wrong or empty report for a script that was actually valid, ordinary Fountain.

_Verify (CONFIRMED/high):_ Line 1781 reads: `const sniffedFdx = /^\s*<\?xml/.test(text) || text.includes("<FinalDraft");` — exactly as described. The second disjunct is a raw substring search over the entire uploaded text with no anchoring, no XML-structure verification, and no requirement that it appear at the start of the file. Any plain Fountain/.txt upload whose body happens to contain the literal characters "<FinalDraft" (e.g., in dialogue, an action line, or a pasted code snippet about screenwriting software) will trip this branch and cause the raw Fountain text to be sent under the `fdx` field instead of `fountai


### [LOW] src/services/director.ts:25 — resource-leak
**The abort listener added to externalSignal is never removed, so it accumulates across repeated calls that share the same signal.**

`externalSignal?.addEventListener('abort', () => controller.abort())` has no matching `removeEventListener` and isn't registered with `{ once: true }`. Each invocation of analyzeScriptBlock with the same long-lived signal (e.g. a per-session or per-component AbortSignal used across many script edits) permanently attaches a new closure over a per-call `controller`, none of which are ever cleaned up.

_Failure:_ A React component keeps one AbortController for the lifetime of an editing session and calls analyzeScriptBlock repeatedly (e.g. on every debounced keystroke) passing the same signal. After N calls there are N dangling listeners; besides the memory retained by each stale `controller` closure, once N exceeds Node/browser's default max-listeners threshold a MaxListenersExceededWarning is emitted, and if the shared signal is ever aborted, all N stale controllers fire abort() simultaneously (harmless individually but indicates the leak and adds needless work each time).

_Verify (CONFIRMED/medium):_ Line 25 (`externalSignal?.addEventListener('abort', () => controller.abort());`) has no `{ once: true }` option and no matching removeEventListener anywhere in the function, including in the success path or the catch block. If a caller passes the same long-lived AbortSignal across multiple invocations (a plausible pattern for a per-session controller in a React component doing debounced analysis calls), each call adds a new listener that is never removed, since the function returns/throws without ever detaching it. This is a genuine, if minor, resource leak intrinsic to the function as written


## PLAUSIBLE (2)

### [LOW] evals/scoring/runner/metamorphic-cases.ts:9 — correctness
**seededShuffle's LCG loses precision because JS doubles cannot exactly represent the multiplication product once the masked state exceeds ~2^53/1103515245.**

The state `s` is re-masked to `& 0x7fffffff` every iteration, so it can be as large as 2147483647. On the next iteration `s * 1103515245` computes a product up to ~2.37e18, far beyond Number.MAX_SAFE_INTEGER (2^53 ≈ 9.007e15). JS numbers are IEEE-754 doubles, so this multiplication silently rounds to the nearest representable double before the `& 0x7fffffff` truncation is applied, meaning the low-order bits of the 'true' LCG state are wrong/lost for essentially every iteration where s is more than ~8.16e6. This breaks the intended glibc-style LCG recurrence: the sequence is no longer the well-understood constant-multiplier LCG it appears to implement, and can exhibit much lower effective entropy/period or biased low bits than a correct 32-bit LCG, even though the result is still deterministic for a fixed seed on a given JS engine.

_Failure:_ For the `scene_shuffle` metamorphic case (seed=7) run against a base script with many scenes, the permutation produced by seededShuffle is not a faithful realization of the documented LCG — for some scene counts/seeds the corrupted low bits can produce a permutation that is much closer to identity (or otherwise low-entropy) than intended, so the 'seeded scene shuffle' may fail to sufficiently scramble scene order and the `expect: { kind: 'decrease', minDrop: 0.1 }` invariant could pass or fail for reasons unrelated to the doctor's actual sensitivity to scene order, undermining the metamorphic test's validity as a structural-damage regression check.

_Verify (PLAUSIBLE/medium):_ The math is correct: s is masked to at most 0x7fffffff (2147483647), and s * 1103515245 can reach ~2.37e18, which exceeds Number.MAX_SAFE_INTEGER (2^53 ≈ 9.007e15). JS's `*` operator on doubles will round such products to the nearest representable double before the `& 0x7fffffff` truncation, so the low-order bits of the "true" 32-bit LCG state are not faithfully reproduced for large s. This is a genuine, easily reproduced numerical fact (not a misread).

However, the claimed downstream harm is speculative: seededShuffle is still a fully deterministic PRNG-like function (fixed seed -> fixed seq


### [LOW] server/planning/pddl-types.ts:136 — data-corruption
**cloneWorldState performs only a shallow copy of the entities map, sharing mutable Entity objects (including their properties Map) between the original and cloned world states.**

cloneWorldState creates `new Map(state.entities)`, which copies the map's key/value pairs but not the Entity objects themselves or each Entity's `properties: Map<string, any>`. Any code that mutates an entity's `properties` map (a common operation for simulation/planning, e.g. `entity.properties.set('mood', 'angry')`) on the cloned state will mutate the same Entity object referenced by the original (and any other) state, and vice versa.

_Failure:_ Planner calls cloneWorldState(state) to speculatively simulate an action (e.g. to try alternate branches in search), then mutates entity.properties on the clone to model a property change. Because the Entity object is shared by reference, the original (unsimulated) state's entity.properties reflects the same mutation, corrupting the state the planner believed was untouched — leading to incorrect backtracking/plan comparison or contaminating a state that should represent 'not yet executed'.

_Verify (PLAUSIBLE/high):_ Confirmed by direct code read: cloneWorldState (pddl-types.ts:136-142) does `entities: new Map(state.entities)`, a shallow copy of the map — Entity objects (and each Entity's internal `properties: Map<string,any>`, defined at line 30) are shared by reference between the original and cloned state. This is a genuine aliasing bug consistent with the claim's description. However, I searched the entire server/planning directory (and broader server/) for any code that actually mutates `entity.properties` (e.g. `.properties.set(...)`) after cloning, and found none — applyEffect (line 128-131) only ev

---

## CLOSURE — full-sweep re-verification (2026-08-04, Lane F)

This section closes the ledger honestly. It does not rewrite anything above —
every finding's original text stands as originally recorded, including the
2026-08-04 INTEGRITY NOTE that opens this file (which itself already disclosed
the truncation and the personas/SSE supersession pattern before this pass
started). What follows is a full re-verification, not a re-sample: every one
of the 57 findings actually present in this file (55 CONFIRMED + 2 PLAUSIBLE)
was individually checked against the CURRENT repository state — the cited
file and line(s) read directly, and for several the actual runtime behavior
re-exercised (discrimination.test.ts run, a rule-level doctor diff script run
against the composite fixture) rather than just re-read.

### On the truncation (findings 58–61 and the REJECTED section)

Confirmed again, independently: the file has 631 lines and the last PLAUSIBLE
entry (pddl-types.ts:136) cuts off mid-sentence at "found none — applyEffect
(line 128-131) only ev" with no closing punctuation, section header, or the
promised totals breakdown anywhere after it. This matches the INTEGRITY NOTE's
account exactly (verified against commit `0e9ac81`, unchanged). **Nothing was
fabricated to fill the gap.** The 4 REJECTED findings and the remainder of
finding 57 are unrecoverable from this file; they would require the producing
session's transcript, which this pass does not have access to. The tally
below is therefore out of the 57 findings this file actually contains, not
out of the 61 the header claims — that discrepancy is the point of this
closure, not an error in it.

### Per-finding status table

Every row was independently re-verified this pass by reading the current file
at the cited location (not by trusting the ledger's own "Verify" paragraph,
though in every case below the current code matches what a fix for the
described failure would look like). "Commit" is the fix commit identified via
`git log` where a single commit is clearly responsible; the two bulk-fix
commits (`8fb20ed` / merge `9181abc`, titled "resolve 55 confirmed + 2
plausible ultrareview findings") account for the great majority of rows and
are abbreviated **[bulk]** below rather than repeated 50+ times.

| # | Sev | Finding (file:line) | Status | Note |
|---|-----|----------------------|--------|------|
| 1 | CRITICAL | apdl-planner.ts:285 resolveCharacterTargets drops actor/target/both | FIXED | Delegates to shared `resolveEffectTargets` (effect-targets.ts), which resolves actor/target/both correctly. [bulk] |
| 2 | HIGH | app.ts:197 error handler registered before static serving | FIXED | Error handler now registered *after* the static-serving block (line ~220, after line ~207); comment at the site explains why. [bulk] |
| 3 | HIGH | yjs-server.ts:138 closeConn removes wrong awareness clientID | FIXED | `Room.connAwareness: Map<WebSocket, Set<number>>` now tracks each connection's real clientIDs; `closeConn` removes exactly those. [bulk] |
| 4 | HIGH | yjs-server.ts:224 parseRoomId unguarded decodeURIComponent | FIXED | `parseRoomId` now wraps `decodeURIComponent` in try/catch, returns null on `URIError`. [bulk] |
| 5 | HIGH | CausalSpine.ts:449 terminal_threatened duplicated per suspect | FIXED | The suspect-independent block was moved *outside* the `for (const suspectId of suspectIds)` loop; runs once per contradiction event. [bulk] |
| 6 | HIGH | Orchestrator.ts:603 round StoryCommit skipped on relocate | FIXED | Gate is now `if (lastActionId && !truncated)` — the `!didRelocate` condition is gone; a documented "Fix (canon-drop)" comment explains the change. [bulk] |
| 7 | HIGH | ai.ts:224 module-load provider wrapper drops AbortSignal | FIXED | Module-load path now calls shared `makeDelegatingProvider()`, which forwards `signal` to both `generate` and `generateStream`, same as the reset paths. [bulk] |
| 8 | HIGH | apdl-planner.ts:503 buildPlan initial_state===final_state, double-applies actions | FIXED | `buildPlan` now takes a separate `initialState` parameter, distinct from `node.state`; `extractEmotionalStates` is called with the true pre-plan state; `initial_state`/`final_state` are no longer the same object. [bulk] |
| 9 | HIGH | oasis-integration.ts:283 resolveCharacters drops actor/target/both | FIXED | Same shared-resolver fix as #1 — `simulateEmotionalEffects` now calls `resolveEffectTargets`. [bulk] |
| 10 | HIGH | game.ts:326 SSE wall-timer doesn't stop simulation/release lock | RESOLVED (superseded twice) | Ledger's own INTEGRITY NOTE already tracked this: original fix superseded by ai-budget work, then genuinely resolved by `7f57119` ("sse: between-turn cancellation — the wall timer now actually stops the run"), which wires an `AbortSignal` through `run-room-stream`/`run-room`/`simulate-to-fountain` into `Orchestrator.runRoomSimulation`'s new optional `signal` param, checked between turns/rounds. Re-verified directly in Orchestrator.ts: `if (signal?.aborted) { truncated = true; break; }` at both the per-round and per-agent checkpoints. Confirmed still live at HEAD. |
| 11 | HIGH | analysis.ts:202 /compare crashes when corpus < 3 vectors | FIXED | `numClusters > 0 ? clusterCorpus(allVectors, numClusters) : []` — degrades to no cluster instead of throwing. [bulk] |
| 12 | HIGH | scriptide.ts:224 script save silently truncates >500k chars | FIXED (different mechanism than literal ask) | `ScriptideSaveBodySchema` now has `scriptText: z.string().max(500_000)` — an oversized payload is now rejected with a 400 by validation *before* the route's `.substring(0, 500_000)` can ever fire (that line is now unreachable dead code for the truncation case). The originally-described failure — silent 200 OK with data loss — no longer occurs; the client instead gets an explicit rejection. [bulk] |
| 13 | HIGH | AIPanel.tsx:188 error text offered for "Insert into Script" | FIXED | Component now has a dedicated `isError` state; render gate is `result && !isError`. [bulk] |
| 14 | HIGH | ScriptIDE.tsx:1223 handleCleanAction overwrites mid-flight edits | FIXED | Captures `startDraftGen = getDraftGeneration()` before the await, checks `isDraftStale(startDraftGen, getDraftGeneration())` after, and refuses the write-back (shows "Draft changed while cleaning") instead of applying stale reconstruction. [bulk] |
| 15 | HIGH | Sidebar.tsx:115 LongTextField truncates fields >500 chars on edit | FIXED | `displayValue = value` (full value, no `.slice`); `onChange` now passes back `e.target.value` unmodified — only the native `maxLength` attribute blocks *new* growth, no more truncation of pre-existing longer content. [bulk] |
| 16 | HIGH | StoryMachine.tsx:372 submitScenario desyncs UI when /api/init fails after /api/reset | FIXED | Catch block now calls `if (resetSucceeded) await refreshAll();` to resync client state to the post-reset server reality. [bulk] |
| 17 | HIGH | FountainEditor.tsx:332 Yjs seed uses stale mount-time value | FIXED | `initialText` is now passed as a getter (`() => valueRef.current`); `collab.ts`'s `createCollabSession` resolves it at actual sync time (`provider.once('sync', ...)`), not at mount. [bulk] |
| 18 | MEDIUM | check-docs-quality.ts:92 code-block skip doesn't track state | FIXED | `inCodeBlock` boolean now toggled on fence lines and checked before pattern-matching each line. [bulk] |
| 19 | MEDIUM | generate-rulebook.ts:446 objEnd clobbered to lines.length | FIXED | The `i = lines.length` clobber is gone; the outer loop's own break condition now leaves `i` at the real closing-brace line. [bulk] |
| 20 | MEDIUM | convert-screenplays.ts:83 slug collisions overwrite output | FIXED | New `dedupeSlug()` helper + `usedSlugs` Set; a collision gets a `-2`/`-3`… suffix instead of silently overwriting. [bulk] |
| 21 | MEDIUM | DirectorNode.ts:912 "oldest" lie sorted by random UUID | FIXED | New `_oldestUnexposedProposition()` resolves the real origin turn via `stage.getEventCard(...).turn_index`, not UUID string sort. [bulk] |
| 22 | MEDIUM | DirectorNode.ts:87 all beliefs attributed to one "last external action" | FIXED | Each belief is now attributed via `source_action_index` resolved per-belief against `recentActions`, falling back to `lastExternalAction` only when the model omits/mis-indexes it. [bulk] |
| 23 | MEDIUM | Orchestrator.ts:811 tension-tiebreak comparator not antisymmetric | FIXED | Comparator now actually compares `a` vs `b`: `return tensionState.accumulator > 50 ? (a < b ? -1 : 1) : (a < b ? 1 : -1);` with an `a === b` short-circuit. [bulk] |
| 24 | MEDIUM | Orchestrator.ts:293 RELOCATE leaves target in target_char_id | FIXED | Both the `runTurn` and `runRoomSimulation` success branches now set `action.target = null` after consuming the destination into `content`, matching the two failure branches. [bulk] |
| 25 | MEDIUM | ai-provider.ts:184 FreeRideProvider drops systemInstruction/schema | FIXED | `FreeRideProvider.generate` now forwards `config.systemInstruction` as a leading `system` message and translates `responseSchema`/`responseMimeType` into an OpenAI-style `response_format`. [bulk] |
| 26 | MEDIUM | ai-config.ts:71 wireProviders leaves stale provider wired | FIXED | The openai-compat branch now has an `else` that fails closed with a throwing `generate` stub when `baseURL` is empty, instead of silently leaving the previous provider wired. [bulk] |
| 27 | MEDIUM | embeddings.ts:9 unbounded process-wide cache | FIXED | `_cache` is now a bounded LRU (`EMBEDDING_CACHE_CAPACITY = 2000`) with delete-then-reset-on-hit and evict-oldest-on-insert. [bulk] |
| 28 | MEDIUM | session-store.ts:195 MAX_SESSIONS unvalidated (NaN disables cap) | FIXED | Now `boundedIntegerEnv('MAX_SESSIONS', 100, 1, 100_000)`, which throws on a malformed value instead of silently producing NaN. [bulk] |
| 29 | MEDIUM | session-store.ts:208 SESSION_TTL_MS unvalidated (NaN disables eviction) | FIXED | Now `boundedIntegerEnv('SESSION_IDLE_TTL_MINUTES', 1440, 1, 24*365) * 60_000`. [bulk] |
| 30 | MEDIUM | structure-presets.ts:1454 turn_end can exceed expectedTurns | FIXED | Now clamped: `turn_end: Math.min(n, Math.max(...))`. [bulk] |
| 31 | MEDIUM | personas/registry.ts:64 unbounded userPersonas map | SUPERSEDED | Already flagged by this ledger's own INTEGRITY NOTE. Re-confirmed directly: current code has `MAX_USER_PERSONAS = 64`, capacity-rejection, and `builtin_id` refusal — matching the note's description of `3a4a905`'s independent, stronger same-day fix, not this ledger's own (never-landed) LRU/cap-500 fix. |
| 32 | MEDIUM | apdl-validator.ts:108 validatePlanPreconditions never evolves emotional_state | FIXED | New `applyActionEmotionalEffects()` (using the same shared `resolveEffectTargets`) is now called after each precondition check in `validatePlanPreconditions`, `checkForUnearnedEmotions`, and `checkForIncoherentTransitions` — all three sibling functions fixed, not just the one cited line. [bulk] |
| 33 | MEDIUM | DirectorPanel.tsx:280 tension sparkline lags one render behind | FIXED | `tensionHistory` is now `useState`, updated via `setTensionHistory` inside the effect — no longer a plain ref mutation that can't trigger a re-render. [bulk] |
| 34 | MEDIUM | FixedPointsPanel.tsx:196 bcTargetIdx stale after removeFP shifts array | FIXED | A `bcTargetDesc` snapshot is captured at request time and rendered directly (`bcResult && bcTargetDesc !== null`) instead of re-deriving the label from `fps[bcTargetIdx]` after the array may have shifted. [bulk] |
| 35 | MEDIUM | NarrativeAnalyticsPanel.tsx:143 forced refresh has no request sequencing | FIXED | `requestIdRef` per-tab monotonic counter; a response is only committed if `requestIdRef.current[tab] === requestId` at resolution time. [bulk] |
| 36 | MEDIUM | ProofInspectorPanel.tsx:88 inspect() has no out-of-order guard | FIXED | `requestIdRef` counter; state is only applied if `requestIdRef.current === requestId`. [bulk] |
| 37 | MEDIUM | QualityEnginesPanel.tsx:114 inspect() same missing guard | FIXED | `activeRequestRef` holds the current `commitId`; state only applied if it still matches. [bulk] |
| 38 | MEDIUM | StoryMachine.tsx:500 handleRunRoom onerror closes on first error | FIXED | `onerror` now checks `evtSource.readyState !== EventSource.CLOSED) return;` — only a genuinely closed connection is treated as fatal; transient drops are left to the browser's own reconnect. [bulk] |
| 39 | MEDIUM | fountain.ts:80 dual-dialogue `^` retags unbounded prior character block | FIXED | The reverse search now `break`s on `scene_heading`, bounding the retag to the current scene. [bulk] |
| 40 | MEDIUM | director.ts:25 already-aborted externalSignal silently ignored | FIXED | `if (externalSignal?.aborted) controller.abort(); else externalSignal?.addEventListener(...)`. [bulk] |
| 41 | LOW | Stage.ts:1407 shadow-write timer never cleared on fast path | FIXED | `Promise.race([...]).catch(...).finally(() => clearTimeout(timeoutHandle))`. [bulk] |
| 42 | LOW | openai-compat.ts:483 embed() swallows HTTP failures as `[]` | FIXED | Now throws `Error('OpenAI-compat embedding error ${status}: ...')` on `!res.ok`, matching the LLM adapter's behavior. [bulk] |
| 43 | LOW | embeddings.ts:54 cap only bounds inner loop, not outer | FIXED | `candidateNew` is now also `.slice(-10)`, bounding total calls regardless of how many beliefs are passed in. [bulk] |
| 44 | LOW | fountain.ts:201 (server) RELOCATE fallback uses target_char_id | FIXED | Fallback is now `entry.content || 'another room'` — never falls back to `target_char_id`, which RELOCATE never semantically has. [bulk] |
| 45 | LOW | session-store.ts:288 array sessionId silently falls back to 'default' | FIXED | `typeof raw !== 'string'` now throws `ValidationError` (400) instead of falling through to `'default'`. [bulk] |
| 46 | LOW | validation.ts:79 isPrivateIPv6 matches literal hextet prefix, not value | FIXED | Now parses the numeric first hextet and range-checks it (`(firstHextet & 0xffc0) === 0xfe80`, etc.) instead of string-prefix matching. [bulk] |
| 47 | LOW | App.tsx:38 persisted config cast with only a typeof check | FIXED | New `isValidStoryConfig()` does real shape validation before the cast, not just `typeof === 'object'`. [bulk] |
| 48 | LOW | FixedPointsPanel.tsx:159 keyed by array index, state bleeds on removal | FIXED | Cards now keyed by a stable, monotonically-issued `fpKeys[i]` (via `nextFpKeyRef`), independent of array position. [bulk] |
| 49 | LOW | ProjectionGalleryPanel.tsx:122 exportFountainAs silently no-ops on failure | FIXED | Failures are now caught and surfaced via `setErrors(err => ({ ...err, fountain: ... }))` instead of a bare `return`. [bulk] |
| 50 | LOW | StoryMachine.tsx:509 handleRunRoom finally lacks mountedRef guard | FIXED | `finally` block is now `if (mountedRef.current) { setLoading(false); setStreamLog([]); }`. [bulk] |
| 51 | LOW | collab.ts:85 Y.Doc leaked when token fetch fails | FIXED | `fetchCollabToken` call now wrapped in try/catch; catch block calls `doc.destroy()` before rethrowing. [bulk] |
| 52 | LOW | VoiceDNAPanel.tsx:76 mountedRef checked before, not after, the second await | FIXED (different mechanism) | File no longer uses manual `mountedRef` checks around a raw fetch; it now uses the shared `useLatestRequest()` hook (`src/hooks/useLatestRequest.ts` / `latest-request.ts`), a "latest-wins" request core that structurally cannot apply a stale or post-unmount result. [bulk] |
| 53 | LOW | screenplay-complete.ts:137 lastIndexOf('-') hijacked by location hyphens | FIXED | New `lastSeparatorDashIndex()` only matches a `-` preceded by whitespace (a real ` - TIME` separator), not any hyphen in the typed text. [bulk] |
| 54 | LOW | ScriptDoctorPanel.tsx:1781 FDX sniff is an unanchored substring match | FIXED | Now `/^\s*<FinalDraft\b/.test(text)` — anchored to the start of the file, not a substring search anywhere in the content. [bulk] |
| 55 | LOW | director.ts:25 abort listener never removed, accumulates | FIXED | Listener now registered with `{ once: true }` and explicitly `removeEventListener`'d in the catch path. [bulk] |
| 56 | LOW (PLAUSIBLE) | metamorphic-cases.ts:9 seededShuffle LCG loses precision above 2^53 | FIXED | `s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;` — `Math.imul` does the multiply in exact int32, eliminating the double-precision overflow the finding described. [bulk] |
| 57 | LOW (PLAUSIBLE) | pddl-types.ts:136 cloneWorldState shares Entity objects/properties Maps | FIXED | `cloneWorldState` now deep-copies each `Entity` and its `properties` Map: `{ ...e, properties: new Map(e.properties) }`. [bulk] |

### Final tally

- **FIXED: 54** (of the 55 CONFIRMED entries, all but #10 and #31 fixed by the
  straightforward bulk remediation commits `8fb20ed`/`9181abc`)
- **RESOLVED-via-supersession: 1** (#10, game.ts SSE wall-timer — already
  disclosed by this ledger's own INTEGRITY NOTE; independently re-confirmed
  still live at HEAD via `7f57119`)
- **SUPERSEDED: 1** (#31, personas registry — already disclosed by this
  ledger's own INTEGRITY NOTE; independently re-confirmed still live at HEAD
  via `3a4a905`)
- **FIXED (of the 2 PLAUSIBLE): 2** (#56, #57)
- **STILL OPEN: 0**
- **NOT VERIFIABLE: 0**
- **Lost to truncation, not fabricated: 4 REJECTED findings + the tail of
  finding 57's own verify paragraph** — see "On the truncation" above.

Every one of the 57 findings this file actually contains is now closed —
either genuinely fixed in place, or (for the 2 the ledger's own integrity
note already flagged) fixed via a different, independently-verified
mechanism than the one this ledger originally credited. There are no STILL
OPEN findings from the ULTRAREVIEW ledger to route to a maintainer as of this
pass. The unresolved item surfaced by this same session is unrelated to any
numbered finding here: `tests/core/discrimination.test.ts`'s
`composite-reviewer-scenario` minimum-gap regression guard remains an honest
`todo` (re-verified 2026-08-04, gap unchanged at +2.2 against a 5.0 floor) —
see that file's own `BLIND_SPOT_NOTE` for the current rule-level diagnosis
and what would actually close it.

