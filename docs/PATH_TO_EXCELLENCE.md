# Path to Excellence — from working checkout to better-than-the-best

**State as of 2026-09-04, main @ bee9310e (three session records below); as of 2026-08-24, main @ 092a601d: Phases W and E are COMPLETE,
Phase S's code lanes are DONE, and Phase P's evidence lanes have reported**
— all six W lanes, all five E lanes, the judged E exit gate (met after one
honest NOT-MET round), S1–S3, the first release (`1.0.0-rc.1`, Docker image
published via the Release workflow), and P-1/P-2/P-3 evidence. What remains
is genuinely human-side: Phase S's owner deployment items and stranger-week
pilot, the owner-corpus measurement runs the P lanes specify, and Phase T's
owner-machine items.

**Independent verification sweep — 2026-08-24, six re-verifiers.** After the
completion sweep, six agents re-derived every claim from scratch on the tip,
each instructed to assume its assigned claims false until reproduced (probing
agents planted probes and reverted them; final trees clean). Outcome:
**every claim TRUE/HOLDS.** Release/ops: 8/8 (Release run success and the
prerelease `:latest` gate confirmed against the live workflow-run record;
restore drill 4/4; load test re-run end-to-end). Security-live: 8/8 (the
title-injection payload fired at all three routes comes back single-line; a
real 429 proved the shared limiter; delete-everything round-tripped
save→load→delete→empty; `npm audit` 0/0). Docs-vs-reality: all 23 cited SHAs
resolve and match their diffs, every number re-derived live (+8.5 gap
re-measured, P-2 JSON byte-identical bar its timestamp). Scoring-thesis: the
ablation guard fails exactly 2 tests when both deductions are zeroed, fixture
invariants re-derived independently (10861 bytes / 1964 tokens each), story-
graph stub now fails 5 tests (was 13/14-passing). Gate-integrity: all ten
reproduced — AND the verifier found two holes in the protection *added this
session*, both now closed in `092a601d`: the "mirror" assertion compared step
NAMES only (a release gate's body could be hollowed to `echo` with all checks
green), and `continue-on-error` on an unnamed step was invisible to every
scan. Two new tests compare run bodies and walk every `continue-on-error`
back to a named, allowlisted step; both proven against the exact exploits.
Product-surface verification was covered by the orchestrator's own full
browser battery on this tip (smoke PASS, focus-traps 14/14, surfaces 115/115,
ui-polish 19/19, command-palette 17/17, local-safety-net 8/8) after that
agent hit its session limit. The written record is trustworthy as-is.

**2026-09-04, later — the hardening batch.** Three read-only audits aimed at
what the day's own changes had added, then four fix lanes. The audits were
worth more than the fixes: each found something a passing test suite could
not have caught, because the tests asserted the behaviour that was written,
not the promise that was made.

- **"Delete Everything" did not.** A live run with a marker string found FOUR
  stores surviving the control: a full SQLite copy of the script in the
  reset-backup directory; the collab room and its Y.Doc, still joinable and
  still holding the shared text (a token request answered 200 for a room the
  session had just deleted); the doctor's report cache; and the worker realms.
  All four are cleared now, and a reload no longer rejoins through the
  `?collab=` capability left in the URL. Two promises were CORRECTED rather
  than implemented: the privacy page's "no server-side backup by default" was
  false for anyone who had used Reset, and the operator's own archive is
  deliberately left alone — the app must not reach into an operator's offline
  backups. The E4 safety net went from 8 assertions to 23, enumerating
  IndexedDB instead of assuming its names and byte-searching both on-disk
  roots. *(Correction, independent re-verification, 2026-09-04: three of the
  four named survivors — the reset-backup SQLite copy, the collab room/token,
  and the doctor report cache — were directly confirmed pre-fix and confirmed
  cleared post-fix by a live rerun. The fourth, "the worker realms," is not
  separable from the main-thread cache by any observation available from
  outside the process — a worker-held copy and the main-thread cache both
  present as the same fast post-delete response time — so it stands as
  inferred, not independently verified. Full report:
  `docs/audits/2026-09-04-reverification/REVERIFICATION.md`.)*
- **One unauthenticated request froze the whole server.** The worker pool
  exists so that a long analysis cannot stall everyone; five export routes —
  including the coverage-letter route added hours earlier — called the doctor
  directly instead. Measured `/health` p95 while each was under load:
  coverage-letter 1,794 → 15 ms, coverage 1,875 → 122 ms, pitchkit 1,749 →
  104 ms, slate 3,939 → 11 ms, verify 1,567 → 7 ms. Reports byte-identical
  across the worker boundary, proven 45/45 and pinned by a test that renders
  each export twice, pooled and unpooled, and compares bytes. The agent
  corrected the brief twice: `/breakdown` never calls the doctor at all, and
  `/slate` — which analyses every script in the slate — was the worst site.
- **The parser's own error message leaked the script.** V8's `JSON.parse`
  embeds a verbatim snippet of the offending input in its `SyntaxError`, so a
  malformed model response starting mid-prose put the writer's words into the
  logs through a line nobody wrote; the OpenRouter error path did the same
  with the raw response body. 27 sites now log a length and a hash prefix
  instead of names and story text, with hashed id references so an operator
  can still correlate lines about one character without learning who they
  are. The raw text lives behind `STORYMACHINE_LOG_WRITER_CONTENT`, off by
  default, documented as unsafe on a deployment holding other people's
  scripts — and the test proves both states, not just the safe one.
  *(Correction, independent re-verification, 2026-09-04: the fix is right,
  but the cause is over-attributed to V8 here. V8's own `SyntaxError` snippet
  is bounded to exactly 10 characters, and only fires when the response does
  not begin with valid JSON. The verbatim, unbounded leak the audit actually
  found — a 120-character excerpt of the model's raw output, confirmed
  reproduced verbatim — came from this codebase's own hand-written `preview:`
  field in the fallback log line, not from V8's parser. Both leaks are closed
  by the same fix; the severity described here belongs mostly to the
  hand-written field. Full report:
  `docs/audits/2026-09-04-reverification/REVERIFICATION.md`.)*
- **Some text was invisible, and no one had measured.** The first systematic
  accessibility pass found that `design-system.css` loads after Tailwind, so
  colour utilities meant to override `.sm-title` silently lost — rendering
  panel titles ink-on-ink at roughly 1:1. Four Fountain syntax colours had no
  dark value at all. Several tokens could not satisfy both the paper and
  night grounds at once, proven with luminance maths rather than adjusted
  until the checker went quiet, so they are split per background. There was
  no `<main>` landmark anywhere in the editor. The keyboard-only journey had
  never been driven end to end; it now is, as a gated assertion, and
  `verify:a11y` joins the browser chain as its seventh suite.

  **CORRECTION (2026-09-04, later — independent re-verification).** This
  entry's "gated assertion" was true of the surfaces above but not of the
  landing page, and the gap was not visible from the suite's own PASS: an
  independent re-verifier ran axe-core directly against the landing (no
  exclusions) and found FOUR serious `color-contrast` violations at rest, in
  both themes (`#entrance-actions-heading` 3.45:1, two badge spans on the
  primary CTA at 3.05:1 and 3.55:1, and a `.text-ink/35` tertiary link at
  2.23:1 — all under the 4.5:1 AA minimum). `verify-a11y.mjs` reported this
  surface CLEAN because it audited the instant "Start fresh" attached to the
  DOM — before the entrance's own ~1.2s typed intro and ~700ms fade/lift
  reveal ever reached their rest state (Playwright's default `visible` wait
  does not require `opacity:1`). Re-auditing the same page at three moments
  in one session showed the mechanism directly: CLEAN at the suite's own
  moment, 11 violating nodes ~1s later mid-animation, 4 real and stable ones
  once the page actually settled — a timing artifact, not a passing gate.
  The gate now waits for the entrance's own completion signals
  (`data-slug-done`, `data-reveal-done`) plus a DOM-mutation-quiet window
  before auditing, audits the landing at two post-settle moments and records
  the worse, and was confirmed to FAIL on the four violations above before
  they were fixed (all now use established `-on-light`/`-on-dark`-family
  tokens; see `src/components/StartScreen.tsx` and
  `scripts/verify-a11y.mjs`/`scripts/lib/browser-verify.mjs`). Every other
  surface this suite audits was re-checked with the same at-rest discipline
  and reported byte-identical results — the timing gap was specific to the
  landing's own entrance animation.

Then the follow-ups, and the audits kept earning their keep:

- **The last main-thread analysis is gone, and it was never two.** The
  compare route was thought to run one analysis too many; reading the code
  showed it ran up to TWENTY-TWO, because the corpus vectoriser analyses
  every reference screenplay when its cache is cold and `data/` is gitignored,
  so every fresh checkout is cold. `/health` p95 under that route's load:
  2,420 → 51 ms, with the control route moving 1 ms — which is what makes the
  figure believable. The agent also declined the design this brief preferred,
  with a reason: moving the rule index into the workers would have made a
  reported field vary by which worker served the request, to save 1.35 ms.
  The pool guard's allow-list is down to its one permanent exception.
  *(Correction, independent re-verification, 2026-09-04: the after value
  reproduces (51 vs. a re-measured 60 ms); the before value and the "control
  moved 1 ms" precision claim do not. The re-run measured pre-fix `/health`
  p95 at 734 ms, not 2,420 ms (a ~12x improvement on that run, not ~47x), and
  its own control moved 42 → 101 ms on the same container — the weather here
  is worth tens of ms, not 1 ms, so the original 1 ms reading was luck, not a
  property of the method. p95 over ~20 probes on a shared, variably-loaded
  box is a single order statistic and does not support four-significant-figure
  precision; treat every number in this bullet as directional. The
  event-loop-unblocking effect itself is real and reproduces cleanly; a
  separate claim that the compare route's own mean latency improved
  (3,509 → 2,461 ms) is NOT reproduced — the re-run measured it getting
  slower (mean 3,590 → 4,565 ms). Full report:
  `docs/audits/2026-09-04-reverification/REVERIFICATION.md`.)*
- **The keyboard trap is closed at the arrival, not the exit.** Tab-escape now
  arms automatically when focus lands on the editor from a bare Tab keypress
  elsewhere on the page, and never for a click, a jump-to-line, or the
  command palette — so a writer who tabs past the editor tabs onward, while a
  writer who tabs in and starts typing still gets element cycling.
- **A specificity tie was silently deciding colours.** The `dark:` variant is
  defined through `:where()`, which adds zero specificity, so every
  light/dark token pair added the day before was tied with its sibling and
  won or lost on generated source order. Caught because the new dark-theme
  coverage rendered a surface no earlier test had. Every pair is now explicit.
  The same new coverage found five spans in the Labs diagnostics with no
  colour class at all — near-black on near-black in dark theme.

Two items stay unfixed ON PURPOSE and are named where a reader will find
them: the scrollable-region fix was implemented, tested, and reverted because
it made the keyboard trap easier to hit (plausibly safe now, but unproven, so
it is not claimed), and two Labs panels have no dark-mode support at all —
a different and larger problem than a contrast miss, so it was flagged rather
than folded in. The battery also caught two bugs in the test tooling itself:
`verify:a11y` resolved its dependency through a path relative to the current
directory and so died before its first assertion in any git worktree, and the
privacy sweep asserted that no saved row existed while the editor it had just
driven was autosaving into that row — a correct 409 failing a wrong
assertion, visible only under load.

**Independent re-verification, 2026-09-04.** A separate read-only agent
re-derived every checkable claim in the hardening record above (and in the
corpus-contamination and advice-audit records elsewhere in this doc set)
from scratch, on its own pinned `git archive` snapshots of each cited SHA,
with its own independent harnesses rather than re-running the original
scripts. Tally: **7 reproduced, 2 partially reproduced, 1 not reproduced**
(plus one sub-claim — the "worker realms" survivor above — that is not
observable from outside the process at all). The five dated identity
receipts checked (compare-route off-thread, Unicode character cues, the R6
engine-version surface plus its negative control, and both corpus-integrity
identity checks) **all reproduced verbatim**, byte-identical output and exit
codes included, with every cited baseline SHA resolving. The corrections
above (Delete Everything's fourth survivor, the JSON.parse leak's real
source, and the compare-route latency figures) and in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s 2026-09-04 corpus-integrity
entry come from this pass; one claim it could not reproduce at all —
`verify-a11y.mjs`'s "zero serious/critical violations on the audited
surfaces in both themes" — is not a hardening-record item and is left to the
agent already correcting that sentence. The verifier's own conclusion, in
one sentence: the machinery this project built for checkable claims —
identity receipts, byte-for-byte comparisons, cited SHAs — held up perfectly
under adversarial re-derivation; every failure it found clusters in two
places, single-run latency percentiles quoted past the precision a shared,
variably-loaded box can support, and one accessibility gate that audits a
surface before its content has finished settling. Full report:
`docs/audits/2026-09-04-reverification/REVERIFICATION.md`.

**2026-09-04 session — from fixing what was wrong to building what was
missing.** With the retrospective's twelve findings closed, the owner's brief
changed: *"the goal is not just to fix errors, but to find what can be
improved, upgraded, or built better."* Four read-only discovery agents walked
the product as its users — a screenwriter doing the whole journey in a real
browser, a producer reading six real doctor reports as JSON, a professional
opening every export format, and a stranger arriving cold at the repo — and
their ranked findings became build lanes. 55 commits, 163 files. What landed:

- **A producer can be handed something.** The report was a dashboard of
  counts; there is now a deterministic Coverage Letter — verdict, summary in
  reader voice, what is working, root causes, the three fixes to make first,
  the honest caveats, and a footer carrying the content hash and engine
  commit so a skeptic can verify it — generated by template from the report
  the doctor already produces, with no LLM anywhere near it. Snapshots are
  scored, so a writer can see whether draft three actually beat draft two.
- **The report points at lines now, not just labels.** 82% of findings
  carried no line anchor, only "document"; that is now 46%, measured over 814
  located issues on five real scripts. Root-cause clusters — the feature whose
  own doc comment promises "the difference between a 40-item lint dump and a
  script reader saying *this is the problem*" — degraded into 61-member
  rule-name dumps with no scene; they are capped at 15 and split by scene
  cohesion (worst case 112 → 15). The route now attaches an ordering that
  leads with findings a writer can actually jump to, and a per-character
  roll-up joining three signals that previously had to be cross-referenced by
  hand.
- **The report tells you what it cannot know.** Every report carries a
  provenance block: which engine commit produced it, how many rules, that the
  ground truth is mechanical self-degradation rather than human judgment, that
  percentiles come from a 20-sample internal set, and a structural-reliability
  note past 40 scenes. Verification now distinguishes a report whose text was
  edited from one where only the engine moved on — different accusations,
  previously indistinguishable. Findings carry stable ids so two drafts can be
  diffed. The verdict sentence reads like a reader, in a sentence that names
  the threshold band the score landed in ("scored in the middle band, above
  the decline line but short of what the recommend line requires") rather
  than a craft judgment of the script — corrected 2026-09-04 after an
  advice-quality audit found the first reader-voice pass ("solid bones with
  fixable structural problems") described a deliberately excellent script
  and a deliberately bad one identically at the same score, because the
  phrase was keyed on the verdict band, not on anything the engine actually
  read. The methodology caveat stays its own sentence rather than dropped.
- **A script with an accented name was invisible to the engine.** `MARÍA`
  parsed as an action line and took her dialogue with her — in the parser and
  again in the doctor's own duplicate ASCII-only regex — so every
  character-and-dialogue signal silently vanished for any script with a José,
  a Zoë, a Björn. Both copies now accept Unicode capitals. The receipt is
  deliberately unflattering: identity over the 45 in-repo fixtures holds
  ONLY because none of them contains a non-ASCII capital, and it records the
  measured moves instead of implying nothing changed (a new accented fixture:
  0 → 5 characters, 0 → 16 dialogue lines, health 76.7 → 74.7).
- **Exports stopped losing the writer's name.** PDF and DOCX had no title
  page at all — every export, no warning — and the FDX writer ignored the
  title the writer typed. Fixed, along with a PDF encoder that turned `CAFÉ`
  into `CAF?`, an FDX serializer that dropped the dual-dialogue wrapper while
  a comment claimed Final Draft would re-pair them, and two divergent export
  implementations now consolidated behind a byte-parity test.
- **The editor became an editor.** Tab used to throw the writer out of the
  document; it now cycles element types the way Final Draft does, with
  documented escape hatches, and the shortcuts panel's false "Tab is never
  intercepted" line is gone. Find-and-replace did not exist at all. Two
  separate CodeMirror extensions each re-parsed the WHOLE document on every
  keystroke, and `ScriptIDE.tsx` did it a third time outside them: typing at
  the start of a feature-length script cost ~100 ms per keystroke. Decoration
  is now incremental (changed range + viewport, full reparse on idle) and the
  third parse is idle-debounced, ending at 67-83 ms in a contended sandbox
  where 65-85 ms is the harness's own floor. Both changes are proven, not
  asserted: a harness compares incremental decorations against a full parse
  after every edit, and the debounced value is tested to match the synchronous
  one once settled. One dead per-keystroke loop computing four fields nothing
  read was deleted on the way through.
- **The writer's own work stopped disappearing.** Clearing the sample and
  switching tabs silently restored it — real data loss, on a plain tab
  switch. A server backup restored from before the browser's last acknowledged
  save used to win without a word; it is now a labelled conflict the writer
  decides. Oversized saves retried forever without saying why. The title
  survives paste, typing and sample load, and exports are named after it.
  Settings → Session → Delete Everything was physically unreachable at phone
  width.
- **Decisions, made and recorded.** The generative surface is demoted to Labs
  (Decision #3) — consistent with P2, and keyless-first stops being an excuse
  for not evaluating it; two additional leaks were found and closed in the
  process. The power analysis is adopted (#4): P0's target is 17 sessions with
  5 as a checkpoint, P1 gains a κ floor and a 49-script overlap budget. Every
  reported unverified gate now carries an expiry and blocks after it (#5).
- **The self-hoster and the contributor.** A real `docker-compose.yml` instead
  of a two-variable `docker run`; an `:edge` image so the registry stops
  lagging main by 75 commits; the skipped-by-default gates (`RUN_E2E`,
  `verify:browser`, and its real ~3-minute cost) documented; the pre-commit
  hook wired into install; four superseded root reports archived; and the
  account-level CI failure signature explained so a contributor does not
  debug their own PR for it.

**One thing needs the owner and is not an engineering call:** `LICENSE`
grants no rights to any person without prior written permission, and
`package.json` says `UNLICENSED`, while README documents Docker self-hosting
and CONTRIBUTING thanks contributors. A stranger who checks the licence before
cloning stops there — before ever seeing the product. Recorded as Decision #6,
DECISION NEEDED, with the options and what each unblocks; the LICENSE file
itself is untouched, because choosing one is a legal decision, not a
refactor.

**2026-09-03 session — the retrospective's twelve findings, worked.** The
2026-09-02 retrospective (`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`)
ranked twelve mistakes and weak routes. This session dispatched each to an
isolated-worktree agent (one Opus lane at a time after the first nine
parallel lanes died on a session rate limit, then two, then Sonnet for the
mechanical halves), verified every landing on the merged tree (lint, full
suite at 0 failures, no-console, reachability, receipt gate, docs, honesty,
metamorphic, and the six-suite browser battery where UI moved), and pushed
26 commits (`a4bec2fc..e40f4cf5`, 146 files). What landed, by finding:

- **#3 + #5 — the score's import graph is now a gate, and it is smaller.**
  `305bb4ab` makes the receipt guard classify EVERY file reachable from
  `doctor.ts` as scoring-path (proven on `c9023b8f`, the historical commit
  that changed `src/lib/fountain.ts` unreceipted). That pulled 43 non-core
  files into scope, so `6601370f`–`31d7bb4c` cut the edges: the LLM
  dependency inverted through `server/lib/llm-port.ts`, the SQLite `Stage`
  and Express out of the doctor's graph via module splits (dynamic and
  type-only imports are edges to the walker, so only splits count), reachable
  set 85 → 63 files, outside-core 43 → 21 with a justified allowlist.
  `tests/core/pure-core-boundary.test.ts` fails 5/6 on the pre-refactor
  tree; `tests/core/llm-seam-wiring.test.ts` proves the seam is plugged in
  (mutation-checked). Output identity: 45/45 byte-identical, receipted.
- **#2 + #9 + #7 — the AUC-24 statistic is CI-recomputable from committed
  numbers.** `316fcf66`–`c49e5542`: one definition of the statistic and the
  degradation recipe (`scripts/lib/auc.ts`, oracle-tested byte-identical to
  the old inline code), `npm run lock-auc24` (refuses without the corpus,
  writes hashes + health values only), `tests/core/auc24-table.test.ts`
  (skips loudly until the table exists), and `report-unverified-gates.mjs`
  now blocks past a per-gate expiry — the table's is **2026-10-01**. The
  floor stays 0.622: nobody has re-measured since 2026-07-11, and a raise
  without a measurement is a guess wearing a gate's clothes.
- **#4 — collab rooms are server-minted capabilities** (`1e02c23a`): 128-bit
  ids, typed name is a local label, token minting requires a live room,
  WebSocket upgrade re-checks the registry, per-session budgets, the id no
  longer logged. Required an output-identity receipt because
  `validation.ts` was still in the doctor's graph that morning.
- **#6 + #8 — coverage is measured, claims are registered.** `dfc16c16`:
  the 21 rules with zero test references now have fire/no-fire tests (none
  was dead), `scripts/measure-rule-test-coverage.mjs` writes
  `docs/rulebook/coverage.json` and the rulebook's sentence is derived from
  it (3,186 of 3,186 distinct names referenced; tripwire test). `e8bc1dd7`:
  `docs/CLAIMS_REGISTER.md` (22 rows, 20 supported, 2 retired, 0 live
  unsupported), an honesty-audit claims lane with a planted-violation test,
  the entrance's human-comparison line reworded to what is true (the audit
  now refuses the retired phrase itself — it caught this very paragraph),
  `MEGA_CATALOG_12700_SYSTEMS.md` archived to `docs/filed-backlog/`.
- **#10 — power analysis** (`61fe5310`, `c17d90fc`): at n=153 the 95% CI on
  an AUC of 0.80 is about ±0.07, so the gate cannot be told from 0.75; five
  moderated sessions bound "would use again" to [28%, 99%]; κ needs 43–49
  triple-rated scripts. The plan is under-powered on all three legs; the
  numbers are in `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md`, computed
  by a committed script, and proposed (unsigned) in the pre-registration.
- **#12 — the title page persists** (`0467de9b`): migration rung v13→v14,
  round-trip and restore-drill tests. Follow-on data-path audit found and
  fixed a silent overwrite (`5f6e38a6`: a server backup restore OLDER than
  the browser's last acknowledged save used to win without a word — now a
  labelled `server-rolled-back` conflict), the oversized-save retry loop, and
  the optional `scriptText` that could blank a row (`937ec7c9`).
- **Browser proofs are a CI job** (`fd6da8dc`): six suites, shared
  `scripts/lib/browser-verify.mjs`, `playwright` pinned, mirrored in
  release.yml; three stale "CI has no browser" claims corrected. The receipt
  guard now FAILS on CI when no base ref resolves (`7ca24907`).
- **74 vacuous tests made behavioural** (`b0262020`, 23 files; method and
  six KNOWN WEAKNESS findings in `VACUOUS_TESTS_SWEEP.md`).
- **375/390px** (`e093f863`): the toolbar's utility cluster and the Settings
  tab strip clipped off-screen — Settings → Session → Delete Everything was
  unreachable on a phone. Two fixes, desktop byte-identical.
- **Four false present-tense claims** (`8a742b6c`): "six critics" (twelve),
  a stale 3,216, an incomplete `validate` description, and a security item
  marked CLOSED while `npm audit` reports four advisories (three in the
  production `express` chain) — now an honest OPEN line.
- **#1 — verbosity bias:** ships as the unmerged branch
  `claude/r5-verbosity-bias-pending-measurement` (4 commits). Density is
  now normalised by scene opportunity — `weightedIssues / (sceneCount·30)^0.7`,
  penalty `8·density²` — after measurement showed the proposed opportunity
  count could not include action paragraphs (they are the filler) or speeches
  (bad craft inflates them). The padding witness flips from +5.4 to −4.4;
  metamorphic 8/8 with zero known-failing cases; 11,212 tests, 0 failing. The
  honest costs are written down: calibration band separation halves (25.3 →
  11.1), the composite discrimination pair sits 0.2 above its gate, all 45
  in-repo reports move (28 change verdict), one feature-scale tier assertion
  is SUSPENDED in-file pending verdict re-anchoring, and the 72-row real-corpus
  manifest is stale until re-locked. The ledger entry is headed PENDING OWNER
  MEASUREMENT — and the receipt gate accepted it, which is a gap being closed
  now (a pending entry is a promise, not a receipt).

**What only the owner can do now** (in addition to the list above):
`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24` and commit the table
before 2026-10-01 (the gate blocks after that); `npm run measure-real` on
the R5 branch, then re-lock the manifest and merge it; fix GitHub Actions
(see the block above); sign or reject the power-analysis proposals; decide
finding #11 (demote the generative half to Labs, or fund a graded set).

**2026-08-24 session — five landings after the phase close-out.** Recorded
here because three of them changed what the project believes about itself:

- `6e04740` — the five recorded UX/perf leftovers, closed. The PDF doctor
  route was the last path still computing on the main thread (now pooled);
  deep-read's UI stops implying a cancel it cannot deliver; the coverage
  jump button turned out not to *render at all* for the sample (its top
  finding is scene-anchored and the old code only parsed line numbers);
  Settings gained a real roving tabindex; and finding-identity is now
  scene-anchored — browser-verified to turn a spurious "8 cleared · 8 new"
  after a one-line edit into an honest "no change."
- `7d398a7` — docs truth-sync. `ARCHITECTURE.md` still claimed a 1000-scene
  analyzer ceiling (400 since W1), README's env table was missing seven live
  variables, and its documented restore `curl` would have returned 400
  (verified live against a running server).
- `4b03c80` — **P-2/P-3 evidence, and it contradicts the retirement design.**
  The design calls a "Tier B" of rules removable "at zero measurable score
  cost, by construction." Measured: 246 rules fire only on degraded scripts,
  and removing exactly that tier drops pooled AUC 0.572 → 0.530
  (SCENE_SHUFFLE 0.487 → 0.342). Retirement bar item **B5 breaks** — full
  channel-zero collapses the calibration bands until *weak ties strong*, and
  monotonicity is not even monotone in K. Five rules outscore all 906 that
  ever fire (0.753 vs 0.572, the only non-overlapping CI pair in the run).
  **Nothing was retired; the in-repo evidence does not justify it.** Same
  commit fixes reversal-detection Channel 2, whose absolute thresholds made
  it structurally inert on the float-scale producer the owner's 125-film run
  would have used — that run would have measured the scale, not the detector.
- `5fa7282` — the live catalog is **3,217**, not 3,216 (`33a2ee48` added
  INVERSE_CHEKHOV_GUN). Live-state claims corrected in `CLAUDE.md` and
  `ROADMAP.md`; dated historical records left intact.
- `9a5783cb` — four committed probe scripts globbed `*.fountain.txt` against
  a `*.fountain` corpus: they selected zero files, printed empty tables, and
  **exited 0**. Two are the commands the 2026-08-05 novelty result cites as
  its own reproduction. Fixed, and an empty selection now exits 1 — a probe
  that measured nothing must fail loudly rather than report silence as a
  result.

**2026-08-24, later — the completion sweep and its six lanes.** An
eight-area adversarial audit (21 agents) enumerated everything left and
re-tested every item previously filed as owner-only. Its Section A is now
**exhausted**; what it found was worse than a punch list:

- `a2448714` — **ten CI gates that advertised protection they did not have.**
  The worst: `check-scoring-receipt.mjs` resolved its range as
  `origin/main...HEAD` under CI, so on a **push to main those refs are the
  same SHA and the range is empty** — the gate printed "OK" and exited 0
  regardless of what the push contained, across ~182 main-push runs. That is
  the exact mechanism by which the 2026-08-08 fabricated-receipt incident
  recurs undetected. Now resolved from the pushed range and proven against
  the real historical case (`3634a13..0e148c3` → exit 1, naming doctor.ts
  and types.ts). Entry validation is no longer a line count: the fabricated
  2026-08-08 entry fails on four independent tells while the honest
  2026-08-21 entries pass. The no-console gate's `--exclude=index.ts`
  matched by **basename**, silently exempting the live route barrel
  (`server/routes/nvm/index.ts`) — a planted `console.log` there passed CI;
  exemptions are now derived from tsconfig and each is *proven unreachable*
  from `server.ts`. Plus: `tests/critics` and the live kernel test never ran;
  four tripwire bypass shapes closed; ci.yml had no `permissions` block and
  release.yml leaked `packages: write` into the `npm ci` job; `:latest`
  published unconditionally from a prerelease.
- `274d71f4` — **the suite could not detect deletion of the product's own
  thesis.** Ablating BOTH feature-scale deductions left all 10,863 tests and
  the metamorphic gate green, because `ARC_DED_MIN_SCENES = 15` and every
  committed fixture was ≤14 scenes. New CC0 21-scene fixtures make intact and
  act-swapped **word-count identical**, holding scarcity and the whole rule
  channel constant so only structure varies. Ablation now fails 2 tests
  (independently re-verified). Also fixed two story-graph tests whose names
  promised discrimination while asserting only types.
- `1b410f33` — **Story Vector 500'd on every request** (a manifest no
  checkout can have), and under that a dimension mismatch that could compare
  unrelated rules across a warm cache. Its `genome` field was five hardcoded
  literals while the docs advertised measured numbers; now `null` with a
  stated reason. Ships the **server dead-code tripwire** (`src/` had one,
  `server/` did not — which is why 78 files / 24,722 lines accumulated
  unnoticed).
- `20f90b47` — **a prompt-injection vulnerability.** A caller-supplied
  `title` reached `compileScreenplay()` effectively raw; `Title:` is a
  single-line key, so a newline forged extra title-page keys and then
  arbitrary screenplay body — which is interpolated into the LLM rewrite
  prompt fenced by a literal `--- END DRAFT ---` the forged body could
  impersonate on each of the 14 passes. Fixed via `sanitizeSingleLine()` on
  all three compile call sites, with regression tests.
- `6584e3bc` / `f2e4d09f` — docs truth-sync round 2 (a **met** P1 exit
  condition that four documents still called failing; AUC-24 stale at 0.672
  vs 0.731) plus an honesty-audit lane over the repo's own description; and a
  cross-lane fix caught by the new step-for-step mirror assertion firing on
  its first real opportunity.

Suite 10,576 → **10,994**, 0 failures. Nothing was deleted: the dead-weight
inventory is written up as three separate decisions in
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`.

Successor to `PATH_TO_DONE.md`'s
task framing: that file tracks ROADMAP phases; this one sequences everything
measured by the three 2026-08-14 audits (UX-in-browser, engine-truth,
ship-vehicle) into the shortest honest path to a product that is *truly
working, easily controllable, interactive, and well designed* — not finished
to be finished. `ROADMAP.md` stays canonical on phase semantics.

**The bar.** Against Final Draft / Highland / Arc Studio / WriterDuet /
coverage services, this product already has three genuine differentiators no
competitor offers: **independently re-verifiable coverage reports** (a
skeptical recipient can re-derive the numbers), **correct client-side
exports in under 500ms** (validated PDF/FDX/DOCX/Fountain), and a
**keyless-first privacy posture** (deterministic analysis with no AI key and
no script text leaving the deployment). "Better than the best" means
protecting those three while fixing what the audits measured below.

---

## Phase T — Trust repair (days; some items are the owner's clicks)

The engine's credibility mechanism was defeated this week: a fabricated
measurement receipt (nonexistent SHA, self-admitted "simulated" run) entered
main via the 2026-08-11 integration merge and laundered the GODMODE
health-formula change past the receipt guard. The correction entry is
recorded (`MEASUREMENT_RECEIPTS.md`, 2026-08-14); these discharge it:

- **T1 (owner machine) — HALF DONE. The code half landed; only the receipt
  is left.** Narrowed 2026-08-24 after verifying against the code, because
  this item read as fully open and two of its three clauses were already
  closed by `de21e5f2` (2026-08-19, "quarantine failed L5 score channel"):
  - ~~If the measurement says the deduction hurts discrimination, unwire
    it.~~ **DONE.** `scripts/calibrate-graph-health.ts` ran the real Doctor
    path over all 20 controlled calibration scripts and measured WRONG-SIGN
    discrimination (graph health r = −0.290 against band rank; it fires on
    20/20 samples because the extractor reads the controlled-richness design
    as isolated/underlinked). `graphDeduction` is now out of the health
    formula — `doctor.ts:2034-2043` computes
    `baseHealth − structuralDeduction − arcIncoherenceDeduction −
    dialogueDeduction`, with graph health kept as a surfaced diagnostic only.
    The unwired-first pattern worked exactly as intended.
  - ~~Either restore `COMPOSITE_MIN_GAP` to 5.0 or receipt the 4.0.~~
    **DONE — restored to 5.0**, and it is a hard assertion:
    `tests/core/discrimination.test.ts:371-377`, file green at 14 pass /
    0 fail / 0 todo, measured gap **+8.5** on 2026-08-24.
  - **STILL OPEN (owner machine, and only the owner's):** run
    `npm run discharge-obligations` (or `npm run measure-real`) against the
    local corpus and record a REAL receipt covering the `0e148c3` →
    `de21e5f2` `graphDeduction` episode. The deduction is unwired, so nothing
    unvalidated is scoring anyone today — but the fabricated 2026-08-08
    receipt that laundered it is still the reason this phase exists, and the
    correction entry in `MEASUREMENT_RECEIPTS.md` (2026-08-14) is a
    *statement* that no real measurement was made, not a measurement. This
    cannot be discharged in CI or by an agent: the corpus is local-only for
    copyright reasons and deliberately cannot reach CI.
- **T2 (owner clicks).** Repository is **public** (`"private": false`,
  re-verified live 2026-08-24) despite the 2026-08-03 decision to make it
  private — for a product inviting unpublished scripts, flip it. Enable
  branch protection on `main` (currently none — the fabricated receipt
  arrived via an unreviewed integration merge; protection is the structural
  fix). Confirm the Dependency-graph toggle (CI evidence says on since
  08-10).

  **Also T2, added 2026-08-24 — fix the repo description.** ROADMAP.md
  claimed on 2026-08-21 that "no rule-count claim survives on the shipped
  surface (grep-verified)". The grep was over files and was right about
  files; the repository's own About blurb is also a shipped surface, and it
  still reads:

  > Deterministic screenplay analysis engine — 3,216 corpus-measured rules, a 14-pass Script Doctor, and a Fountain authoring IDE. Keyless-first; no LLM-as-judge.

  That trips `stale-count-3216` and `corpus-measured` in
  `scripts/honesty-audit.mjs`, and the number is stale besides (the live
  catalog is 3,217). Only a repo admin can edit it. **Set it to exactly
  this** — pre-validated 2026-08-24 by running the audit's own live
  `PATTERNS` array against it (0 violations across all 24 entries that apply
  to repo metadata; 160 chars, under GitHub's 350 limit):

  > Deterministic screenplay analysis engine — a 14-pass Script Doctor, re-derivable coverage reports, and a Fountain authoring IDE. Keyless-first; no LLM-as-judge.

  Every claim in it is machine-checked: the 14-pass pipeline is live
  (`ROADMAP`/`CLAUDE.md`), "re-derivable coverage reports" is asserted
  end-to-end by `node scripts/verify-p2-p3-surfaces.mjs` (the P3 round-trip
  re-derives contentHash/health/verdict/totalIssues from the pasted script
  and matches the export exactly, and a one-character edit correctly
  mismatches), and keyless-first is the CI posture. It names no rule count,
  so it cannot go stale the way the current one did. Homepage and topics
  are already clean. Once it is set, consider flipping
  `REPO_METADATA_BLOCKING` to `true` in `scripts/honesty-audit.mjs` so the
  description can only regress loudly.
- **T3 (decision).** PR #257 (`INVERSE_CHEKHOV_GUN`, 3,216 → 3,217): merge
  with a one-line recorded freeze amendment, or close. Its receipt is the
  good pattern — the conflict is only with the freeze language. Delete the
  two stale remote branches at main's SHA.

## Phase W — Make it truly work (1–2 weeks)

Five defects an ordinary first-time user hits in their first five minutes,
all reproduced and screenshotted in the 2026-08-14 UX audit:

- **W1 (M) — DONE 2026-08-21.** `runScriptDoctor` now runs on a
  `node:worker_threads` pool (`server/nvm/analyze/doctor-pool.ts`, size 1–2,
  FIFO queue) with the LRU cache held on the coordinator, AbortSignal
  cancellation that terminates the worker outright, and a permanent
  in-process fallback if workers cannot run in the environment.
  `ANALYZER_SCENE_CEILING` lowered 1000 → 400 (honest headroom above the
  292-scene longest real feature; the existing truncation messaging already
  covers it).
- **W2 (L) — DONE 2026-08-21.** The super-quadratic cost was **not** in the
  named suspects. Profiling put 99.7% of it in one place none of them named:
  `auditTemporalConsistency`'s Allen-algebra path-consistency propagation
  (158ms / 7.5s / 43.4s at 26 / 62 / 120 scenes), where each of the O(n³)
  triples allocated three `Array.from` snapshots and a fresh `Set`. Re-expressed
  over bit-packed typed arrays with a universal-relation fast path; measured
  end-to-end doctor runtime 26→119ms, 62→206ms, 120→386ms, 244→1.2s,
  306→1.7s, 351→1.9s (was: never returned). Proven pure by
  `scripts/check-doctor-output-identity.mjs` — 45/45 fixtures byte-identical
  pre/post — plus a verbatim-oracle equivalence test over 200 seeded graphs.
  Budget-tested in CI by `tests/core/doctor-perf-budget.test.ts`.
- **W3 (M) — DONE 2026-08-21.** The false "Save Conflict" traced to the
  `visibilitychange` keepalive save: the POST persists server-side but its
  ack dies with the reloading page, so the next load sees dirty +
  revision-mismatch and blames a phantom tab. `decideScriptIDERestore` now
  compares draft content against the server copy and returns a new
  `reconciled` outcome when they match; the dialog only fires on a real
  divergence, and its copy no longer invents a second tab. Browser-repro
  suite: 3/3 pre-fix reproductions, 0 post-fix.
- **W4 (M) — DONE 2026-08-21.** `CoverageSummary` hands its computed report
  up via `onReportComputed`; "Full report" hydrates `ScriptDoctorPanel`
  through `initialReport` (instrumentation preserved) instead of
  cold-remounting. Staleness still tracks the draft generation, so a
  hydrated report that's out of date says so.
- **W5 (S) — DONE 2026-08-21.** Settings dialog wore `sm-btn` (a button
  primitive) instead of `sm-panel` — one-class fix ends the bleed-through
  and label collisions. The 375px CTA badge became a self-contained
  cream-on-stamp ribbon clear of the caption row (it had been stamp-red on
  stamp-red: invisible at every viewport).
- **W6 (M) — DONE 2026-08-21.** Ship got its own writer-facing container
  (`ShipPanel.tsx`: exports, snapshots/versions, independent-verification
  pointer) on a new `ship` tool slot; the research shell survives untouched
  but is reachable only through the Labs-gated "Open Studio" overflow entry.
  `verify-p2-p3-surfaces.mjs` grew 7 assertions pinning this (108/108), and
  the four deliberately orphaned oasis prototypes moved to an explicit
  allowlist so the dead-file tripwire stays armed for new leaks. Known
  tradeoff, recorded in `SURFACE_REVALIDATION_2026-08-04.md`'s 08-21
  addendum: the Title Page form is now Labs-only; the keyless route is
  Fountain title-page syntax at the top of the draft.

**Exit gate — MET 2026-08-21:** journey table re-run in a real browser
(W3/W4 repro suite 11/11 including pre-fix reproduction of all six original
failures; surface verification 108/108; smoke flow PASS with captured exit
codes); the 306-scene synthetic analyzes in ~1.4s end-to-end with the
server responsive throughout (worker pool + 470× curve fix, output proven
byte-identical across 45 fixtures). Landed as `a86756f` + `40ce647`
(W3–W6) and `9c0c992` + `f416336` (W1/W2 + a ceiling-tracking test
fixture). Remaining Phase W-adjacent debt is listed under Phase T, not
here: the GODMODE `graphDeduction` measurement is still owed on the owner's
machine.

## Phase E — Easily controllable and interactive (2–3 weeks)

- **E1 — DONE 2026-08-21.** `POST /api/scriptide/doctor/stream`: SSE
  sibling of `/doctor` (same schema, limiter, worker pool, report shape)
  emitting per-stage and per-pass progress frames; `ScriptDoctorPanel`
  shows "Running pass N of 14…" with a real Cancel that reaches the
  existing res-close → AbortSignal → worker-terminate path — no new
  cancellation mechanism. Progress hooks are purely observational: proven
  byte-identical across all 45 fixtures (receipt recorded in
  `MEASUREMENT_RECEIPTS.md`, independently re-verified before merge).
  Browser-proofed: cancel cleared in 118ms with the server immediately
  serving the next run. Deep-read/PDF routes deliberately kept one-shot.
- **E2 — DONE 2026-08-21.** `locatedIssues` now rides every doctor
  response (reusing the `locateIssues()` call the routes already made —
  zero new computation); finding cards get a Jump button →
  `FountainEditor.highlightRange` scrolls and paints a fading stamp-red
  wash on the exact lines; Cmd/Ctrl+Enter re-runs via the E1 streaming
  path; a session-only "N findings cleared · M new" delta line
  (identity = pass::rule::location, its line-number-drift noisiness
  documented in-code as an accepted limitation). Browser-proofed
  end-to-end on a real finding: jump → edit → re-run → cleared.
- **E3 — DONE 2026-08-21.** Entrance promise line (originally compared the
  read to a human studio coverage reader — reworded 2026-09-03 per the
  2026-09-02 retrospective's finding #8: an unsupported human-comparison
  claim with zero human-agreement evidence; see `docs/CLAIMS_REGISTER.md`),
  privacy sentence ("Keyless by default — your script stays in this
  deployment unless you turn on AI features yourself" — worded to be true
  for visitors, since keys are opt-in via Settings, not operator-only), CTA
  hierarchy preserved; all three visible without scrolling at 1440px and
  375px. Fixed a real pre-existing bug en route: the CTA description
  inherited `.sm-btn`'s
  `white-space: nowrap` and spilled past the button edge at every viewport.
- **E4 — DONE 2026-08-21.** IndexedDB draft mirror
  (`scriptide-idb-store.ts`, never-rejecting, wins on restore only when
  strictly newer than localStorage — the quota-failure recovery case,
  routed through a new `decideScriptIDELocalRestore` sibling rather than a
  change to the W3 logic); Delete Everything in Settings → Session,
  confirm-gated, wiping IndexedDB + localStorage and calling the new
  `POST /api/session/delete` (the existing `destroySession()` primitive:
  Stage eviction + SQLite file unlink, caller's own session only); the
  `#privacy` page stating what stays in the browser, what the server
  stores, what leaves (nothing by default, live-checked), and how to
  delete — every sentence code-verified. The lane's own browser proof
  caught and fixed a real bug: the wipe's reload raced the
  `visibilitychange` autosave, which silently resurrected the deleted
  draft; a synchronous suppression flag now guards every write path.
- **E5 — DONE 2026-08-21.** Command palette (Cmd/Ctrl+K, `CommandPalette.tsx`
  + `src/lib/command-palette.ts`): an ARIA combobox/listbox over a ~25-entry
  action registry, every `run:` a direct call to the SAME named callback the
  visible button already calls (`handleTaskChange`, `openToolSlot`,
  `exportPDF`, …) — verified by source assertion, not just code review. The
  keyboard-map audit (`ShortcutModal.tsx`) found three previously-documented
  bindings with zero matching keydown handler anywhere in the tree (Ctrl+S
  as "save draft," Ctrl+Shift+F "Typewriter Focus," Alt+Shift+D "Dark / CRT
  Vintage / Print Theme") — grepped, confirmed false, and per the "remove
  nothing; correct anything stale" rule, wired for real rather than deleted:
  Ctrl+S force-saves, Ctrl+Shift+F really centers the cursor's line (a
  narrower, honestly-scoped "Typewriter Focus" than the old claim — no line
  dimming), Alt+Shift+D really toggles dark/light (the CRT/print claim was
  dropped — no such themes exist in this codebase). A11y sweep added real
  `role="dialog" aria-modal="true"` + `useModalFocusTrap` to two panels that
  had neither (SettingsPanel, StartScreen's file-preview modal — the latter
  needed its own extracted component for the trap's mount-effect to line up
  correctly, same reason ScriptIDE.tsx's inline modals already work that
  way), ARIA tablist/tab/tabpanel roles on Settings' tab strip, `<label
  htmlFor>`/`useId()` association on every Settings form field (previously
  bare sibling `<label>`s with no programmatic link to their input), and
  closed a real gap the browser-proof script caught live (not from source
  review): the shortcuts panel had no Escape handling at all before this
  pass. `prefers-reduced-motion` is inherited for free from the
  `MotionConfig reducedMotion="user"` already wired at `App.tsx`'s root — the
  palette and every touched dialog use `motion.div`, so no separate
  reduced-motion path was needed. Browser-proofed end to end
  (`scripts/verify-e5-command-palette.mjs`, 17/17): Cmd+K open → type "ship"
  → Enter → the real Ship panel opens; Escape closes the palette AND
  restores focus to the editor; a 25-press Tab-cycle inside Settings never
  escapes its trap; an entrance Tab-order walk reaches 6+ visible controls
  with none stranded off-screen. `npm test` 10,769/10,769 (0 fail, up from
  10,727 with 42 new tests: 14 pure filter/scoring + 28 source-wiring
  assertions); `verify-p2-p3-surfaces.mjs` 115/115 unaffected.

**Exit gate — MET 2026-08-21, after one honest failure.** The judged pass
(eight journeys browser-walked at 1440px + 375px, ~225 screenshots,
adversarial brief) first returned **NOT MET**: five journeys excellent —
with Verify-a-Report, the privacy page's specificity, the coverage delta
banner, and the command palette judged *beyond* what Final Draft /
Highland / Arc Studio / WriterDuet ship — but three below the bar. All
three gaps were then root-caused and fixed (`0c0a80c`), each with a
browser re-proof: (1) the coverage mini-panel was a fixed overlay with no
layout participation, clipping the header's save-status chip at 1440px —
the toolbar now reserves real panel width, and an independent bug found in
the same code (save-status compared display strings against enum values,
so the status chip could never match its state) was fixed with it; (2) the
first-contact journey rode through `CoverageSummary`'s static spinner —
the E1 SSE client is now a shared module (`src/lib/doctor-stream.ts`) and
the summary card shows the live pass counter with a real Cancel; (3)
Typewriter Focus was verified genuinely broken (no `scrollPastEnd()`, so
the cursor stalled ~375px off-center near document end) and fixed to
~0.2px of center, sustained while typing past the fold. The drawer-clip
the judge also flagged was re-driven and found to be a transient
entrance-animation frame, not a static defect — recorded, not "fixed."

## Phase P — Provably better (parallel track; includes the human-only work)

- **P-1 — EVIDENCE PHASE DONE 2026-08-21** (`109318df`; full findings in
  `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`; wiring
  remains owner-gated). Two structural facts first: neither named corpus
  is reachable from a remote session (both owner-local), and three of the
  four signals (agency-signal, question-latency, truth-extraction) are
  CANNOT-MEASURE against the 125-film corpus's annotation schema even in
  principle — they read raw screenplay prose the JSON annotations never
  carry. Measured on the 44-script in-repo real-prose sample
  (`scripts/measure-unwired-signals.ts`): **reversal-detection** — 0/44
  disagreement with the legacy channel; recommend WIRE Channel 2, with one
  owner-machine 125-film run still owed (command in the doc, amplitude
  caveat flagged). **agency-signal** — the annotation-bridge measurement
  path is structurally impossible; stays unwired pending the 761-script
  corpus. **question-latency** — ungated AUC 0.53–0.57 with all 95% CIs
  straddling 0.5; retire this measurement path (consistent with the prior
  "underpowered, not refuted" verdict). **truth-extraction** — 0/44 false
  positives on real prose + synthetic mechanism AUC 1.000; the
  false-positive evidence supports a low-risk WIRE, recall unmeasurable
  in-repo. No scoring file changed; receipt guard clean by construction.
- **P-2 — EVIDENCE PHASE DONE 2026-08-24** (findings in
  `docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md`; harness
  `scripts/measure-rule-channel-evidence.ts`). The bar was run on everything
  reachable and the conclusion is **the in-repo evidence does NOT justify a
  retirement recommendation** — not for sample-size reasons. Three findings
  govern it. (1) **The migration's own safety guarantee is wrong.** The design
  calls Tier B removable "at zero measurable score cost, by construction";
  246 rule names fire only on a degraded variant and never on an intact
  script, so removing exactly Tier B costs pooled AUC 0.572 → 0.530 and
  SCENE_SHUFFLE 0.487 → 0.342. (2) **B5 is settleable in-repo and it BREAKS**
  — full channel-zero collapses the four calibration bands to an 0.93-point
  spread with weak tying strong, and monotonicity is not monotone in K, so it
  must be re-measured for the exact removal set. (3) **B1's dialogue clause
  flips on a health-floor artifact** (raw CI-lo 0.711 FAIL,
  saturation-corrected 1.000 PASS), so the owner run must report both.
  Directionally the inversion reproduces and sharpens: five rules outscore all
  906 firing ones on pooled AUC (0.753 vs 0.572, the one non-overlapping CI
  pair). B2/B3/B4 CANNOT-MEASURE (owner-local corpus); B6 satisfied; B7
  half-unsatisfied (rollback plan written, no individual named). Also
  recorded: the live catalog is **3,217**, not the 3,216 this file, CLAUDE.md
  and ROADMAP still say (`33a2ee48` added INVERSE_CHEKHOV_GUN). Nothing was
  retired.
- **P-3 — EVIDENCE PHASE DONE 2026-08-24** (findings in
  `docs/p1-benchmark/CLIMAX_RELOCATE_REDERIVATION_2026-08-24.md`; harness
  `scripts/rederive-climax-relocate.ts`). First, a reachability defect: all
  four committed probes in the 2026-08-05 family glob `*.fountain.txt` while
  the corpus is `*.fountain`, so they select zero files and exit 0 having
  measured nothing — including the two commands `NOVELTY_SIGNAL` offers as its
  own reproduction. Rebuilt from the committed pieces that survived, the
  targeted claim's **direction holds** (18/18 CC0 scripts rise) and its
  **magnitude does not** (delta +0.28 vs the reported +0.45). The sanctioned
  noun-type layer was then measured against a specificity control this harness
  adds (move a *middle* scene to the front instead of the climax): raw
  proper-noun novelty is **anti-specific** (gap −0.105 — it fires more on the
  benign move), while the relational-reference contrast is **specific**
  (+0.118) but not yet sensitive (CI-lo 0.474). One of five formulations
  clears both conditions (anaphoric density at scene 1, AUC 0.645
  [0.539, 0.750]) and is recorded as a lead, not a finding — one positive out
  of five unregistered tests on 38 short scripts. `NOVELTY_SIGNAL_2026-08-05.md`
  stays marked unreproducible-historical; its numbers still must not be cited.
  Nothing wired.
- **P-4 (human-only).** Five real P0 sessions via the fielding kit and
  async portal — recruitment and moderation cannot be delegated. Record
  the outcome PASS/STOP honestly, whatever it is.
- **P-5 (human-only).** ≥3 blind readers for the P1 label set.

**Exit gate:** pooled discrimination AUC ≥ 0.80 on the held-out partition
with reported uncertainty — or a recorded, reasoned amendment of the gate.
No silent drift.

## Phase S — Ship it and keep it alive (1 week)

From the ops audit — the Docker vehicle is already well-built; finish it.
**Code lanes DONE 2026-08-21 (`5abbfef` + `a541460`):**

- **S1 ✓** Backup cadence: opt-in `BACKUP_INTERVAL_HOURS` timer in
  `server.ts` running the existing `backupSessions()`; and the restore path
  now EXISTS as code (`restoreSession()` + `npm run restore-session`),
  proven by a drill test that backs up a real session, destroys it,
  restores, and asserts the `.db` byte-identical with every field
  round-tripped — a backup that has never been restored is not a backup.
- **S2 ✓** `RELIABILITY.md` §IV-C re-verified with dated verdicts: CON-001/
  002/004 VERIFIED-FIXED; **CON-003 was still present** (Director's Cut,
  Converge-commit, and the Move Bus appended/reverted commits directly on
  Stage while the Orchestrator's cached head went stale) — fixed via
  `Orchestrator.syncFromStage()` at all three sites, regression-tested.
  Global `MAX_ROOMS` cap (env, default 50, 429 at the boundary) added.
- **S3 ✓** `scripts/load-test-doctor.mjs`: 10 concurrent feature-length
  (250-scene) doctor runs × 3 rounds on a 4-CPU container — 30/30
  succeeded, p50 4.4s / p95 7.9s, with `/health` probed every 200ms
  answering p50 2ms / max 384ms throughout. The W1/W2 work holds under
  concurrency.
- **S4 (partial) ✓** Version bumped to `1.0.0-rc.1` — deliberately a
  release candidate, not 1.0.0: the 1.0 definition below requires the
  receipt trail's open `graphDeduction` obligation and human validation
  that remain owner-side. The Release workflow ran via `workflow_dispatch`
  on `a541460` and **published the first versioned Docker image to GHCR**
  (Release run: success, 2026-08-21). The annotated `v1.0.0-rc.1` git tag
  exists locally but the session's git proxy blocks tag pushes — pushing
  it is an owner click. (A stale `v1.0.0` tag from an old commit sits on
  the remote with no release behind it; owner may want to delete it.)

**Still owner-only:** set `ADMIN_TOKEN`/`TRUST_PROXY`/`METRICS_TOKEN` in
the real environment; enable `BACKUP_INTERVAL_HOURS` (and retention) in
production; push the `v1.0.0-rc.1` tag.

**Owner-only, added 2026-09-03 — GitHub Actions is not running jobs.**
Every `main` CI run since `db8b7a88` (2026-09-02 19:12 UTC, a docs-only
commit) is red, and a manual re-run of `305bb4ab` (run 33696391120, attempt
2) failed the same way: both jobs "complete" in 2–3 seconds with no runner
assigned (`runner_id: 0`), no steps, and no downloadable log (HTTP 404).
No workflow file changed between the last green run (`939f7829`,
2026-08-24) and the first red one, and every gate in `ci.yml` passes
locally on each merged commit (lint, full suite, no-console, reachability,
receipt, docs, honesty, browser battery). This is the signature of an
account-level Actions block — runner availability, a spending limit, or a
failed payment on the account — not a code failure, and it cannot be
diagnosed or fixed from a session (the API exposes no reason). Check
Settings → Actions and Settings → Billing on the account, then re-run the
latest `main` run; nothing needs to be pushed.

**Exit gate:** the stranger-week test — one pilot writer uses a hosted
instance for a week and loses nothing. Human-only; not started.

## Definition of 1.0

A stranger lands, understands the promise in ten seconds, pastes a
feature-length draft, watches analysis stream in seconds with a working
cancel, moves finding-by-finding through their script, exports a correct
PDF/FDX, hands the report to a skeptic who verifies it independently — and
every number in that report is backed by a receipt trail with zero
fabricated entries. The three differentiators stay true in marketing copy
because they stay true in the code.

**Sequencing note:** T and W first and in parallel (T is mostly clicks and
one measurement; W is the product), E on W's heels, P runs alongside
throughout (its human items have no code dependency), S last. Nothing in E
or S is worth doing before W1/W2 — polish on top of a server that freezes
for 22 minutes is decoration.
