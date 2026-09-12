# Path to Excellence — from working checkout to better-than-the-best

**State as of 2026-09-12, main @ 39996b6d (nine session records below); as of 2026-08-24, main @ 092a601d: Phases W and E are COMPLETE,
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

**2026-09-12 — the adversarial review: eight lanes, twenty-one review
rounds, no lane through on its first pass.** The owner asked for a
principal-level adversarial review of the current features and logic, run as
an orchestrator over Sonnet and Opus subagents, with the objective of finding
the best achievable version of THIS product and moving it there. Three
read-only investigators took main at c087a6ca apart first — the writer's loop
driven in a browser (18 findings: a production note in a comment raised health
~10 and flipped a verdict; a forged letter verdict passed the verifier; RE-RUN
COVERAGE ran nothing), the engine re-derived on an independent scorer (14: the
density channel's zero-gradient dead zone; reversing every scene of the
feature fixture raised health; a Fountain-legal dialogue reflow moved health 11
points; the gates reporter satisfied by a gutted suite), and the server, data
and test soundness of everything merged since 2026-09-06 (the verifier checked
none of the producer tier's numbers). Their findings became build lanes, each
through `docs/LANE_STANDARD.md`'s independent review, every review written
into `docs/audits/2026-09-12-adversarial/` before its verdict
([[Audit - 2026-09-12 Adversarial Review]]). **Six landed on main:**

- **`verify-covers-tier`** (9cd1805c, REVISE 8 → REVISE → MERGE): one claim
  set behind both exporters and both verifiers, nine more verified fields,
  page references through the PDF paginator, and the forgery limit stated
  truthfully with its counterexample committed — a 14-of-17-edit forgery
  still verifies, and the document now says so.
- **`instrument-integrity`** (ad9c7802, REVISE 4 → MERGE): the gates
  reporter proves its own liveness by raising one floor in memory and
  requiring the suite to FAIL on it by name; one scene segmenter for every
  harness, since the AUC-24 recipe could not see `EST.`, `I/E.` or forced
  headings and returned mixed-heading scripts unchanged; CLIMAX_RELOCATE
  moves the final scene to position one as every document said, with the
  floors re-locked from a rerun (the instrument got stronger, the engine
  reads it slightly worse, and the score did not move); an anchor on every
  `path:line` pointer in the claims register.
- **`writer-loop-client`** (e440a0a8, REVISE 7 → MERGE → round-3
  confirmation): RE-RUN issues a real run; a jump span belongs to its own
  finding or the card says it has no location; the front door's headline
  card is generated from a doctor run and guarded by a drift test; one health
  number; clamped dimension badges with one shared caption; the surfaces
  gate no longer starves on the rate limiter. Round 3 fixed, once at the
  cause, a readiness race three suites had each rediscovered: `innerText`
  reflects CSS `text-transform`, so the doctor's own "RUNNING PASS 1 OF 14…"
  counter satisfied a poll asking for a verdict.
- **`rulebook-and-guard-bound`** (0507b008, REVISE → REVISE → MERGE): the
  rulebook regenerates idempotently with four restored clusters and a
  zero-diff guard; the voice-eligible weight bound is derived from measured
  cost — the first derivation (1,500,000) was rejected because a 223-speaker
  document of 30-word speeches costs 27 seconds under it, the second
  (675,000) admits a worst shape of 12–14 s CPU against a 30 s budget, and
  the test asserts CPU under half the budget AND wall under the whole of it.
- **`writer-followups`** (e9b4cff8, REVISE → REVISE → MERGE): the gate
  rate-limit multiplier reaches only the browser gates, so the fuzzer, the
  load test and the production verifier run on the production limiter —
  which showed the fuzzer had been measuring a server production never runs
  (18 probes absorbed as 429, both WebSocket attacks skipped). It now boots
  two servers and the 200-concurrent case proves both halves: legitimate
  traffic gets through AND a 429 appears. The review also caught the 503s
  misattributed to session capacity; every one is the doctor analysis budget.
- **`exports-truth`** (54e97efd, REVISE 2 → MERGE → MERGE): one priorities
  list on four surfaces; Graph Health's unapplied deduction never rendered as
  applied; every cross-reference names a heading the report renders; export
  → re-import measured and disclosed, then made true in both directions —
  dual dialogue, centered text, lyrics, page breaks and forced action survive
  the FDX round trip, and section headings, synopses and notes are omitted
  rather than printed as action; the letter's promise matches its length
  (three to four pages, gated on the shape the route ships).

**Owner-gated, never merged here:** `scoring/adversarial-2026-09-12`
(READY-FOR-OWNER at 3124a94e after three review rounds) — a live gradient (0
of 32 scripts flat, 0 of 1,001 sampled densities), parse and format
invariance (now fourteen transforms, 0 of 32 each, where ten had moved the
score), forced-element markers and cue-extension spelling folded at the
parser seam, permutation-ensemble invariants, the voice-pair cap (cast 223:
24,753 pairs to 780), and the owner's first instruction made one command —
`npm run probe-corpus-shape` splits a corpus by document shape and prints word
counts, health, verdict and severity before any AUC is read. The review's one
blocking item was truth, not arithmetic: the pipeline seam took the whole
normaliser while three places said it took half; it is kept and disclosed as
its own cost, because the private corpus IS the double-spaced scraped-PDF
shape. Four public-benchmark floors moved DOWN; the reviewer reverted the
denominator fix alone and read exactly the isolation table's cell, so the
re-lock stands. The receipt is PENDING and no AUC-24 number is stated,
implied or projected anywhere. Stacked on it, `scoring/forced-cue` (in
flight) honours Fountain's `@` marker, the largest remaining format
sensitivity (32 of 32 public scripts, up to −26.8).

**The seventh lane landed last:** `lane/p0-flow-race` (9816ffe0, REVISE 3 →
MERGE) — the smoke gate's earliest-instant race, shown by a reviewer to fail
3 of 8 runs on main itself, was a gate race and not a product defect: the
built-in sample's doctor POST answers in 0–49 ms, so the "earliest instant"
landed after the run as often as before it, and the gate misread a warm
report as a cold panel. The gate now holds the lazy chunk at MOUNT and the
run at IN FLIGHT, so both windows are pinned rather than trusted; the review
returned REVISE because the regression detector caught the removed clause 4
of 6 times, and the pinned version catches it 6 of 6 at MOUNT with the
original cold panel reproduced on purpose. A deny-by-default scanner stops
the next hand-rolled hold. One lesson from its merge: the lane was gated on
a base that predated the exports merge, so the full suite and the battery
were run again on merged main before the record was closed.

**What the process learned, all recorded:** two lanes numbered their claims
register rows from the same base and both were reviewed MERGE, so for a day
"row 96" named two sentences — the client lane's rows were renumbered at
merge, seven brain-note citations moved with them, and the citation test now
fails on a duplicate, on a gap, and on a pointer whose target row does not
carry the claim beside it. Two merge-gate suites failed under load (the
shape guard's CPU-budget boundary and one 40-second verdict wait) and passed
on the idle machine, which is why merge gates run as separate steps on a
quiet machine. The container was rebuilt again mid-batch and the session
limit killed agents three times; every worktree, lane branch and review
survived because §7 of the lane standard had already made the sandbox
disposable.

**2026-09-07 — the innovation batch, and the rebuild that cost it its
record.** The owner asked for the project to be *pushed forward* — what
needs building, what needs improving — and not to steer away from what
STORYMACHINE is. Two read-only discoveries set the direction before any lane
was cut. The innovation discovery found that the repository already held
every piece of a real discrimination benchmark that could run in CI on
distributable text except three committed artifacts, and that the only
always-on discrimination signal was a `knownFailing` wrapper recording the
doctor ordering one of six blind pairs. The product discovery assembled a
146-scene feature from the CC0 shorts — deliberately incoherent, and the
most informative input of the session — and ranked twelve findings, every
one anchored to a phase gate. Five build lanes followed, each through
`docs/LANE_STANDARD.md`'s independent review. **None passed on the first
pass:**

- **The public benchmark** (P1's instrument, three rounds). `npm run
  benchmark:public` and an always-on test compute a degradation AUC over
  the 32 distributable scripts on every CI run: a pre-registered
  sha256-derived split, a hash-locked manifest, seeded bootstrap intervals,
  and floors in `scripts/lib/auc.ts` separate from the AUC-24 ratchet. The
  reviewer reproduced every statistic on a scorer of their own and then
  found the instrument could not yet prove it read anything: shuffle-drop
  and climax-relocate both sat at chance, so a dialogue-flatten positive
  control was added and reads 1.000 paired. The more flattering of two
  computed statistics had been the only one ratcheted; both are now. Two
  smaller catches: `--lock` exited 0 on a refusal, and the gate reporter's
  VERIFIED row did not run its suite. The measured finding that matters:
  dropping a third of a draft's scenes removes more weighted issues than
  words, so under the current sub-density term **the health formula pays a
  writer to delete a third of their scenes** — a scoring change, queued to
  the scoring lane below, never made on main.
- **`npm run verify-report`** (P3 closed, two rounds). The one P3 gap was a
  verifier a producer could run offline; the CLI reads an HTML report, a
  letter or a JSON export, extracts its claims, re-runs the doctor on the
  script, and prints a verdict. The reviewer's first round showed it
  printing `VERIFIED` at exit 0 on a forged report in two of three shapes:
  a health claim the parser could not read as a number became `NaN`, which
  compares unequal to nothing; and a body whose headline had been edited
  while its verify block stayed genuine passed untouched. The route's own
  zod schema now stands in front of the shared comparator, and the body is
  cross-checked against its verify block. Four genuine artifacts from a
  live keyless server were checked in the failure direction first. A 2 s
  timeout on the git fallback in `build-info.ts` closed a hang the review
  found.
- **The feature-length loop** (two rounds). There was no feature-length
  script anywhere in the repository, so nothing was ever exercised at the
  length the product is for. A 231-scene fixture is now assembled
  deterministically from the twenty CC0 shorts (provenance in a boneyard,
  outside the output-identity set by construction) and the loop was run on
  it: typing a new scene after running coverage threw React's infinite
  render loop — root-caused to a same-value state write with an update
  pending, fixed at the cause with an idempotent-state hook and a DOM test
  that fails on the old tree; every located finding got one jump control
  through one resolver; root-cause cards stopped contradicting their own
  expanders. The reviewer reproduced every number, then showed the browser
  step's "fail-first" was not deterministic (the lane had called that
  intrinsic) and made it 3/3 by delivering keystrokes without a drain gap;
  and that the shape-guard's lowered threshold subtracted real protection
  from 75 pre-existing rows — it is two tiers now, the old floor restored
  and a feature tier derived from its own generator. Tab stops fell from
  1,640 to 1,295 on the fixture with reading order unchanged.
- **The producer's exports** (two rounds, then the object was lost and the
  lane rebuilt and reviewed again — REVISE 5 → MERGE). The writer's screen and
  the producer's exports disagreed about where the problem was from the same
  content hash, because the export route omitted scene spans: on the
  231-scene fixture that is 70 root causes against 69, and a third finding
  reading "Scenes 1–58" against "Scene 1". One shared root-cause pipeline
  now serves all eight call sites, with a parity test that drives four live
  surfaces from one hash and fails when any one is reverted. The report's
  opening line is gated on evidence: a logline only when the most-present
  speaker has a clean dialogue-share gap (the gate costs one draft in
  thirty-three — the incoherent assembly), and a "turn" only when it is a
  line spoken in a dialogue block of the climax scene (runoff's stage
  direction stops being quoted; off-season's spoken turn stays). A
  one-page producer tier opens the coverage report and the letter — logline,
  length, verdict, the things to fix first with page numbers that match the
  PDF's printed labels, and the reference bounds the percentile is valid
  within — measured to fit a printed page, with a character budget CI pins.
  The percentile reads "not comparable" on every surface for a draft outside
  the reference set, with one symmetric predicate and the word count plumbed
  to every surface that applies it. Scene lists collapsed from a 1,231-char
  worst case to 28. The summary contradiction (#8) was stopped at the
  scoring seam and belongs to the branch below. The
  rebuild's reviewer reproduced the parity mutation, the print-media fit,
  the page-reference agreement with the PDF and the logline counts, and
  returned REVISE on five statements in shipped bytes: a measured table
  quoting a row that did not exist; the reference bounds stated twice on the
  producer's first page; a caveat clause that no longer parsed on the
  not-comparable path every real draft takes; a "0 after" claim for
  mid-clause ellipses whose counter-example was the lane's own showcase
  script (a sibling function had kept the old truncation); and a
  before-count one short. Round 2 built all five and the three notes — the
  drift table is re-derived from a live run so the class is gone, the goal
  clause is the sentence containing the want, and a probe's provenance was
  corrected from git twice over — and returned MERGE.
- **The scoring branch** (`scoring/feature-length-defects`, two rounds,
  not merged — the owner's `measure-real` decides). The three feature-length
  defects — the voice channel abstaining on every feature, character names
  and the title of the script scored as critical clues, and length beating
  coherence — became seven commits measured on the new instrument, plus the
  order-sensitive candidate `meanAbsDialogueShareDelta`, which measured a
  null once cast-size was normalised and stays exposed, not wired. On the
  public benchmark the matched-pair shuffle-drop reading moved from 0.5313
  to 0.8750, the damaged copy stopped scoring higher than the intact one
  (mean gap −1.93 → +1.89), climax-relocate's eleven exact ties fell to one,
  and the blind pairs went from one of six to four of six — with the
  calibration corpus untouched sample for sample. The reviewer reproduced
  every headline number and returned REVISE on what the branch *said*: the
  staple witness had passed by pinning one favourable ordering (six of
  twelve random orderings still outscored the best part); the slope table
  named the wrong population and omitted the four scripts where the damaged
  copy still wins; the owner-facing framing pointed at the rank-preserving
  half of the scarcity change, which AUC-24 cannot see. Round 2 made the
  witness hold over every ordering (saturation 15 → 12, the only value at
  which the term contributes nothing to the comparison, one floor re-locked
  *down*), split the formula change so the saturation half is landable on
  its own (`scoring/feature-length-saturation-only`), corrected the owner
  note's reason, and found that main's own feature fixture was being
  rejected by the branch's voice bound. A clue-guard narrowing that read
  better on every statistic was reverted when the full suite showed it had
  put a character into the clue channel — floors restored to the byte.
  The reviewer's round 2 found four one-line untruths left (a comment
  claiming a floor was not re-locked in the commit that re-locked it; a
  receipt count stale a second time and naming only the orphaned pre-rebase
  tip; a fifth copy of a rejected quotient; a misquoted margin) and, on its
  own 58 orderings, could not break the witness. Round 3, on those four
  fixes: MERGE-READY-FOR-OWNER at bcc96f85 — nothing on the branch is
  untrue, and what the owner is deciding about is the lane's own
  disclosures.

**The rebuild.** Between the exports lane's MERGE verdict and its merge, the
sandbox hit a usage limit and was rebuilt. Every worktree, the scratch
directory, every local audit tag and the exports lane's two unpushed
commits were erased; five lanes' review files and both discovery reports
went with them. What survived is what had been pushed and what the
reviewers said in their final messages, which are now committed verbatim
under `docs/audits/2026-09-07-innovation/` and labelled as reconstructed.
`docs/LANE_STANDARD.md` §7 is the rule: lanes push `lane/<name>` after
every commit, reviewers write into the repository before returning a
verdict. The exports lane was rebuilt from its two verdicts under that rule
and re-reviewed.

Main moved from 9b199b72 to c181dfe1. Still owner-only: `measure-real` on
`scoring/stacked-r5-plus-advice` and on `scoring/feature-length-defects`
(alternatives, not a stack — the branch's own measurement), the AUC-24 lock
before 2026-10-01, the Actions account block, the licence, the visibility
toggle, and the Node 24 base image. The `audit/2026-09-07/*` tags no longer
exist anywhere.

**2026-09-06 — current, synced, upgraded.** The owner asked for everything
still open to be taken care of and the project brought current. Three
lanes, nine review rounds, none merged on the first pass:

- **The scoring branches are synced** (three rounds). The R5 verbosity-bias
  fix and the advice-rule fixes existed only as local worktree branches,
  74 commits behind main; the record said they conflicted on five code
  files. Rebased onto main, they conflicted on nothing but the receipts
  ledger — the "five files" were main's own history being replayed — so
  the stacked branch the second measurement needs now exists too. All
  three are on origin as `scoring/*`, every receipt still PENDING, no
  corpus number claimed anywhere; the blind pairs were re-scored on all
  three (main reproduces the 2026-09-04 table exactly; the stack orders
  4/6, inside chance on six pairs, and the receipt says so). The reviewer
  applied the owner's conversion recipe literally and found it left the
  gate red: the gate also scans every required field's value for the bare
  word PENDING, and the recipe was one scan short on all three branches.
  The recipe now has three scans and a transcript proving exit 0.
- **One analysis is bounded by wall clock** (four rounds, Decision #7).
  The guard's accepted worst case was the analyzer's own ceiling cost of
  ~12–14 s, a pool decision rather than a guard one. `DOCTOR_ANALYSIS_BUDGET_MS`
  (30 s, twice the measured 13.8 s worst case) terminates a running job
  the way Cancel does, with a registered sentence. The reviewer's first
  burst probe showed a job rejected while still *queued* being told its
  draft was slow, so the budget split in two: a 60 s queue budget answered
  with 503 and a Retry-After derived from the pool's own job-time average,
  and then admission control that refuses a hopeless submission at the
  door (first shed answer 60 s → under a second in seven of eight runs).
  Eager worker respawn after a kill was found able to outlive a shutdown
  and hang the process; it now carries a shutdown generation. The pool's
  cache test asserts by counting worker runs and cache hits instead of a
  timing ratio. Reusing the guard's parse in the route was stopped with
  numbers: the blocks would cross a worker boundary, and the transport
  costs 80–95% of the parse it would replace.
- **Dependencies are current** (two rounds). `npm audit` 3 → 0. Eight
  majors landed one per commit behind the full suite and the battery:
  better-sqlite3 13 (which also removes the native build from the
  Dockerfile), motion 13, lucide-react 1.x, express 5, vite 8 with its
  React plugin, the Gemini SDK 2.x, playwright 1.63. Two skipped with
  reasons: typescript 7 drops the compiler API two tests use as a library;
  Node 26 typings would be untrue while CI, the Dockerfile and `engines`
  say 22. Express 5's newer `send` refused every deep link when the
  checkout path had a dot-prefixed ancestor — caught by the production
  suite, fixed with an explicit root, and given a regression test that
  fails on a normal CI path. The reviewer diffed the live router tree under
  both majors: 136 routes, identical.

Main moved from 2bfcbf9d to 08722bbe. Every review is under
`docs/audits/2026-09-06-currency/`. Still owner-only: the corpus runs on
the stacked branch and the AUC-24 lock before 2026-10-01, the tag pushes,
the Actions account block, the licence, the visibility toggle, and the
Node 24 base image.

**2026-09-05, day — the mistake search and the project brain.** The owner
asked for two things: *"search for mistakes"* over everything the review
batch had just merged, and a project brain — *"is there a project brain? is
it updated?"* — for a repository whose only map was `CLAUDE.md`. Three
read-only hunters (server, client, docs) read the merged range `1e170831..
802f1c16` and produced 1,271 lines of findings with reproduction commands;
those became six build lanes, each through `docs/LANE_STANDARD.md`'s
independent review. **Again none passed on the first pass, and the reviews
found more than the hunt had:**

- **Docs parity** (one round): the coverage HTML rendered its own copy of
  the percentile and draft-rank sentences; it now calls the shared modules,
  and the warm-up sentence that sixteen sites quoted differently is one
  canonical measured sentence.
- **Server fixes** (one round, plus a reviewer-specified follow-up
  commit): the cue guard's blank-gap context was keyed
  on the wrong predicate; a boneyard-wrapped payload reflowed into thousands
  of character blocks under the new bounds; the crash-path shutdown skipped
  the drain; the request logger printed the literal text `undefined` as a
  path prefix; a `URIError` from a malformed URL was a 500.
- **Client provenance** (one round): Draft History was one global list, so a
  writer looking at one script was ranked against every other script and
  the demo, all labelled with the host project's title; the sample was
  re-analysed on mount and handed up as the writer's own work. Entries now
  carry a per-script identity, legacy rows enter no denominator, the golden
  path makes one doctor POST instead of two, and the brief's own premise (a
  per-document id to borrow) was found false and documented rather than
  faked.
- **Dark mode and the a11y gate** (five rounds): every word on a snapshot
  card measured 1.13–2.45:1 in dark mode because a real dark background was
  paired with light-theme text tokens — the same defect in the Slate table,
  both snapshot modals, the Sidebar counter and a state-delta callout. The
  convention is written down (a surface is theme-invariant or fully themed,
  never mixed) and enforced by a source scanner that parses the TypeScript
  AST, models background occlusion and inheritance, and pins the two files
  it cannot yet fix at exactly 65 and 1 hits so a new one fails loudly. The
  reviewer's own probes became shipped fixtures; the round-4 "fixed" colours
  were re-measured at 3.32 and 2.56 and sent back; the exported coverage
  HTML's 375 px overflow was root-caused to unbroken rule-name tokens, not
  the strips the brief guessed. `verify:a11y` went from 74 to 117
  assertions.
- **Layout** (four rounds): "Full report" was on screen at 375 px but no
  real pointer event could reach it, so the whole Doctor panel was
  unreachable on a phone; clicking it at the earliest instant unmounted the
  running sample and opened a cold panel; the Slate produced four React
  duplicate-key errors on a double upload; a "still running" toolbar sentence
  stayed true forever after a cancelled or failed run — the exact class the
  hunt was about, found by the reviewer, not the hunt. The fix exposed a bug
  in the focus-trap suite (its restore-focus check, once the two "Full report"
  controls had distinct names, resolved to the panel's own button — which
  unmounts the instant the panel opens), and two tests that filtered comments by line prefix miscounted
  prose, which produced a structural comment stripper — whose first version
  the reviewer then showed skipped comments inside empty syntax lists.
- **The cost bound on the cue guard** (seven rounds): the round-8
  bypass (`NAME (cont'd)` lowercase) was closed by making the guard's
  candidate predicate the union of all three cue predicates and adding the
  direct oracle the eight rounds had lacked — `guardCueOccurrences(text) >=
  character blocks in parseFountain(normalizeScreenplay(text))`. The
  reviewer then showed the guard's *accepted* region still held requests
  costing 22 s to 5 m 44 s: the analyzer's voice pass is O(distinct²) and
  all-or-nothing on every character clearing 30 words, and the calibration
  grid had never sampled past 20 repeats. A measured bound on that driver
  followed, and then six more bypass classes in four rounds — a
  parenthetical-only walk-on, double-spaced wrapped dialogue, CR-only line
  endings, the analyzer's 400-scene ceiling that the guard's view did not
  share, a scene predicate narrower than the parser's, and a stray carriage
  return inside a single-spaced line — each closed with a word-map oracle
  and a predicate-parity proof. The seventh round retired
  the hand-modelled walk altogether: the guard now reads the real
  `parseFountain(normalizeScreenplay(text))` blocks — the same call the
  route makes anyway, measured cheaper than the model it replaced — and
  fails closed when the parse yields no character blocks in a cue-dense
  document. That was the first round of seven in which the reviewer could
  not construct a bypass. The accepted worst case fell from 343,598 ms to
  the analyzer's own ceiling cost of ~12–14 s.

**The brain** (two rounds): `docs/brain/` is an Obsidian-compatible vault of
87 notes — every decision, gate, surface, session record, audit, measurement
doc, owner item and unmerged branch, plus a glossary and a patterns note —
with a generator that fails on any unresolved wikilink and a seven-assertion
staleness test in CI. The reviewer's round 1 found the generator's
direct-invocation guard silently exited 0 on any path with a space (so the
new CI step could pass while doing nothing), a staleness assertion that any
note could satisfy, and six unfaithful numbers, including the 3,216 → 3,217
correction the vault had dropped. `CLAUDE.md` now points there first.

Main moved from 802f1c16 to 7d97c3e5: six build lanes plus the brain,
21 review rounds (docs parity 1, server fixes 1, client provenance 1,
dark mode 5, brain 2, layout 4, cue-guard cost bound 7 — counted from the
`## Round` headers and verdict lines of the committed review files), every merge behind one full suite and one battery on the
rebased branch. Reviewers' probe scripts were reused as lane fixtures four
times; the audit tags `audit/2026-09-05/<lane>-roundN` exist locally for
every reviewed round and cannot be pushed from this sandbox.

**Two follow-ups the reviews had queued landed the same night** (one review
round each, both MERGE with five follow-up items built before merging):
the structural-signal values that six surfaces printed with a bare
`toFixed(2)` — so a change of 0.0042 → 0.0254 rendered as `0.00 → 0.03` —
now go through one shared formatter that widens precision only as far as
the delta needs, with a cross-surface consistency test and a whole-tree
grep so a seventh hand-copy fails; and the 66 mixed-theme hits the scanner
had pinned in the Doctor panel and editor were fixed, the allowlist removed
so the scanner is zero-tolerance across `src/components`, and `verify:a11y`
gained a step that opens the full report with every section expanded in
both themes (worst node 1.04:1 before, 4.63:1 after; 134 assertions). Main
moved on to a21fffdd.

**What only the owner can do now** (in addition to the list below): push the
`audit/2026-09-05/*` tags (`git push origin --tags` from a machine that is
not behind the tag-blocking proxy).

**2026-09-05, overnight — the review batch.** The owner asked for a system
that makes the subagents do the best version of the work, and for the usage
limit to stop moving so fast. Both are written down now: `docs/LANE_STANDARD.md`
says what "the best version" means and requires an independent reviewer to
read every lane's diff against its brief, drive the change, reproduce a
number, hunt the shortcut, and return MERGE or a numbered REVISE list before
anything merges; a later amendment moved the full test suite and the browser
battery to one run per merge by the orchestrator, because six lanes and six
reviewers each re-running both was most of the cost. Six lanes built from the
evening audit went through it. **None passed review on the first pass, and
every review found something the gates had passed:**

- **Readiness and logs** (three rounds): `/ready` shared the per-IP limiter
  bucket with the whole API, so a busy, healthy container answered 429 to its
  own health check; the log fix let an absolute-form request line inject a
  hostname into the path field; the warm-up deadline timer was unref'd and
  could never fire; the drain promise was false for any probe that opens a
  new connection, so a real drain window (`SHUTDOWN_DRAIN_MS`) was built with
  a matching `stop_grace_period`.
- **Timing and dialogs** (two rounds): the cgroup reader read the hierarchy
  root, not the process's own cgroup, so the audit's silent-1.0x bug survived
  on exactly the Docker-on-v1 layout this sandbox uses; the dialog
  accessible names the brief required had no gate at all; the sibling Restore
  modal had the same defect and was finished rather than scoped around.
- **Cross-surface parity** (two rounds): the "byte-identical when absent"
  claim was false by 279 bytes and its test compared a call to itself (the
  reviewer injected junk into every report and all 41 tests passed); four
  copies of the percentile copy had drifted, one dropping "hand-authored
  synthetic"; a real bug surfaced on the way — Slate's file picker read a
  live FileList and then reset it, so it had never accepted a file.
- **Draft rank, dark mode, the a11y gate** (three rounds): the current run
  was counted against itself, so "tied" was true on every run and the new
  honest copy could never render; the container fix regressed three captions
  to 1.28:1; the new a11y step audited five thousand pixels below the fold
  where axe never looks; the rebase then forwarded the unscored shape to an
  export whose schema rejects it.
- **Keyless Fix & verify** (two rounds): an FDX upload verified the raw XML
  as the writer's rewrite ("Health 64 → 0" for a rewrite nobody made); the
  "no model was called" test used a throwing provider and could not see a
  swallowed call — a counting spy fails on the planted probe; the withheld
  reason was then wrong for the sample-script state, the same class one axis
  over.
- **The shape guard** (four rounds): the rebuilt guard missed the dual-
  dialogue caret; the fixture sweep walked the disk and failed from the repo
  root; the fuzz cases could not fail; the weight bound was not a cost bound
  (a 216-second legal request at the same weight as a rejected 31-second
  one); the structural bound that replaced it was defeated by double-spaced
  input, which is what PDF and FDX imports produce; and that fix was off by
  one blank line. The worst legal cue-shaped request is now measured in
  seconds, not minutes, and every bypass has a pinned fixture. *(Correction,
  independent review, 2026-09-05: "four rounds" undercounts it by one —
  `guard-review.md` has FIVE top-level review passes, verdicts REVISE,
  REVISE, REVISE, REVISE, MERGE, matching the batch README's own "REVISE 5 →
  4 → 1 → 1 → MERGE" row. It is five rounds.)*

The pattern the audit named — proving a property with the one example that
motivated it — held through the reviews too: each lane fixed the example the
reviewer gave and the reviewer found the next member of the class. The
standard now says so in §3, and every review is committed under
`docs/audits/2026-09-05-review-batch/` so the next round starts from them. Main moved from 1e170831
to 5d2b2638: 6 lanes, 15 review rounds, every merge behind one full suite and
one battery on the rebased branch. *(Correction, independent review,
2026-09-05: "15" is wrong under any correct count. Re-summing each lane's
actual top-level review-file headers — readiness 3, timing 2, cross-surface
parity 2, draft rank/dark mode/a11y 3, keyless Fix & verify 2, shape guard 5
(see the correction on that bullet above) — gives 17. Even the per-lane
prose above, taken as written before that correction, sums to 16. It is 17
review rounds.)*

**2026-09-04, evening — build, attack, repair, deploy, verify.** The owner's
brief tightened twice during this batch: *"do not merely audit, recommend,
or preserve — inspect, understand, decide, implement, test, attack, repair,
build, deploy, verify, repeat"*, and then *"we are not simplifying; anything
half-done gets built and wired in, never removed."* One lane was turned
around mid-flight by the second rule (below). What landed, each behind the
full gate set and the browser battery:

- **A dense, lexicon-free signal channel exists.** `structural-signals.ts`
  computes twelve per-scene channels and thirteen document aggregates from
  counts alone (words, lines, sentences, speech turns, speakers). Ten of the
  twelve fire on 75–100% of scenes; the lexicon channels driving today's
  advice fire on 7%. Direction was pre-registered before measuring:
  `meanAbsDialogueShareDelta` orders all three separation sets (audit pair,
  calibration bands 0.960, blind pairs 0.833) and `actionSentenceCvOverall`
  orders both real-prose sets. The honest counter-evidence is in the same
  file: `meanSpeakersPerScene`, registered with NO direction, orders 32 of
  32 pairs, and the winners anti-correlate with it — "fewer people talking"
  may be what separates. Exposed on the report, in the HTML strip and the
  letter; wired into nothing that scores (a test asserts doctor.ts names
  the field exactly once). Identity modulo the new key: 45/45, negative
  control fails as it should. Owner path in
  `docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md` §6.
- **The two pending scoring branches were scored on the blind pairs before
  the owner spends a corpus run on them.** R5 un-pins the nine scripts tied
  at one health value (3 of 6 ordered, none tied) — but only by exposing raw
  weighted-issue order, which is itself at chance here; advice-rule-fixes
  changes nothing (1 of 6). The stack could not be built: the branches
  conflict on five files including `character-arc.ts`, `rhythm.ts` and
  `fountain.ts`, so the second measurement needs a manual merge, not the
  clean rebase the earlier guidance assumed.
  `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`.
- **The record was corrected where re-verification disagreed** — annotated
  in place, never rewritten: the corpus receipt's own table reads 15 up / 1
  down / 5 flat, not 18/1/2; the JSON.parse leak was the hand-written
  120-character preview, not V8's 10-character snippet; the compare-route
  before value and its "control moved 1 ms" precision are directional only,
  and the residual stall was worker cold start, not vector clustering. The
  full report is committed under `docs/audits/2026-09-04-reverification/`.
- **Every route was attacked with real payloads, then repaired.** Two
  denial-of-service shapes survived the earlier hardening rounds: one
  unbroken 900,000-character token and 10,000 distinct one-off character
  cues both drove the analyzer quadratic (37 s at 300k characters; a minute
  at 8,000 names). Both are now refused in under 25 ms by a single shape
  guard in `validation.ts` shared by every fountain-accepting route — placed
  outside the scoring path, so no receipt was needed. *(Correction,
  independent audit, 2026-09-04 evening: the token half reproduces; the cue
  half holds only for ASCII cues of at most 40 characters — the guard's own
  alphabet, not the parser's. 2,000 Cyrillic, Greek, `#`-bearing or 41+
  character cues still reach the analyzer: HTTP 200 in 2.1–6.4 s, quadratic.
  A lane is rebuilding the guard on the parser's exported cue classes. Full
  report: `docs/audits/2026-09-04-evening-batch/AUDIT.md`.)* The collab WebSocket
  had no frame cap at all (the library default is 100 MiB); a 10 MB frame
  now closes with code 1009. 200 concurrent doctor requests from 200
  fabricated sessions were a pass, not a finding: the limiter and the pool
  held `/health` under a second. `scripts/fuzz-routes.mjs` re-runs all of
  it in ten seconds. A follow-up closed the one bypass the lane reported:
  an `.fdx` upload whose converted Fountain is pathological now meets the
  same guard after conversion.
- **The production build was actually deployed and walked.** Booting under
  `NODE_ENV=production` for the first time in this project's verification
  history found three gaps: no response compression at all (the 198 KB
  bundle went out as 198 KB), no cache differentiation (hashed assets and
  `index.html` both `max-age=0`, so nothing was ever cached), and a miss
  under `/assets/` returned the SPA shell with a 200 — HTML served as the JS
  the browser asked for. Fixed, with SSE explicitly excluded from
  compression so live progress still streams. `verify-production-build.mjs`
  is the eighth browser suite: 71 assertions including five path-traversal
  variants sent as raw HTTP, a byte-identical dev-vs-prod report check, and
  the full writer journey against the built bundle.
- **The percentile was upgraded, not withdrawn.** The lane began by removing
  the reference-set percentile the blind-pairs experiment had shown pins
  every short script at 100; the no-subtraction rule reversed it. The
  reference-set line stays, denominator and all, and gains a second honest
  denominator beside it: *"Rank among your drafts: 2nd of 5"*, computed
  client-side from the writer's own saved snapshots, carried into the
  coverage letter, and rendered as "first saved draft" copy rather than a
  fabricated "1st of 1". Slate Triage was deliberately left alone — it
  compares different scripts, and there is no draft history to rank there.
- **First-request cold start is gone.** The pool now warms one throwaway
  analysis per worker after `listen` (no-op under test or
  `DOCTOR_POOL_PREWARM=0`); the first real request drops from ~2.7 s to
  ~120 ms in this sandbox, warm requests unchanged. *(Correction,
  independent audit, 2026-09-04 evening: true only for a request that arrives
  after the ~2.1–2.7 s warm-up; the port accepts connections for that whole
  window and a request landing inside it measured 2,432 ms against 2,886 ms
  unwarmed. A lane is adding a readiness signal so traffic can be held until
  the pool is warm. Same report.)*
- **The landing contrast gate was blind, then fixed, then the colours.**
  The re-verifier's "not reproduced" was reproduced first: the a11y suite
  audited the landing mid-animation (0 violations at T0, 4 serious at rest).
  The gate now waits for the DOM to go quiet and for the entrance animation's
  own completion signal, audits twice, and keeps the worse; verified to FAIL
  on the unfixed landing before the four contrast fixes (and a fifth, the
  wizard step header) took it back to 69/69 in both themes.
- **The structural signals are now in the product, not just on the
  report.** The Doctor panel has a collapsible "Shape & Rhythm" section (a
  per-scene strip with the coverage-HTML tooltips, click a scene to jump to
  it, the two ordering aggregates each with a plain sentence and a "not
  part of the score" label); the coverage letter's one line became a
  paragraph with the real values; the fix receipt shows the aggregate deltas
  beside the health delta; and saved snapshots carry the two aggregates so
  the trend draws a second line under health. Reports without the field
  render byte-identically (the two committed letter fixtures did not move; a
  third fixture carries it). Old snapshots render unchanged.
- **The browser battery stopped flaking under load instead of being
  re-run until it passed.** One shared timing policy reads the load per CPU
  at suite start and scales every Playwright wait (1.0x at or below one per
  CPU, capped at 4.0x, base values unchanged); a refuse-above-threshold
  switch exits 3 without launching Chromium; and a `--retry-flaky` option in
  the new shared runner reports a retried pass as `flaky-pass`, never as a
  pass (CI keeps retries at zero). Eight suites, run alone and under four
  CPU hogs at load up to 11 on four CPUs: 16 of 16 pass with no base timeout
  raised and no suite needing a real fix. *(Correction, independent audit,
  2026-09-04 evening: the policy reads `os.loadavg()` over `os.cpus().length`,
  so it is silently a 1.0x no-op on Windows, where loadavg is always zero,
  and inside a CPU-quota-limited container, where cpus() reports the host's
  cores; the "under load" half of this sentence is machine-specific. A lane
  is adding the cgroup quota and an explicit "policy inactive" log line. Same
  report.)*

- **The editor bundle was split without changing when anything loads.**
  The 634 KB ScriptIDE chunk was carrying the collab CRDT stack for every
  writer, whether or not they ever opened a room; it now loads on first use.
  ScriptIDE is 183 KB, the largest chunk (CodeMirror, kept eager for typing
  latency) is 341 KB, and the production suite fails hard above 500 KB from
  now on. A Tailwind warning turned out to be a class-shaped token name in a
  comment.
- **The What-If Lab is scored by the Doctor now.** A branch was a list of
  story operations with no text at all; the repo's own deterministic
  operations-to-Fountain compiler materialises each branch as a variant of
  the current draft (no model, no invented phrasing), the pooled doctor
  route scores it with the same content-hash cache the editor uses, and
  the panel shows health, verdict, grade and the delta against the base
  draft beside the two descriptive aggregates. "Promote this branch" writes
  it into the editor as a scored snapshot, after snapshotting the previous
  text as the undo path. Two real bugs surfaced on the way: a title-page-only
  variant came back as a fake health-0 PASS until scene count was checked,
  and React strict mode promoted every branch twice until the effect was
  made one-shot. Note for the record: the Lab is behind the Labs flag, not in
  the default surface; the focus-trap suite reaches it by enabling Labs.

Main moved from 975eada2 to f7b64e9b over this batch: 23 commits, all
gated, all pushed. The owner-only list is unchanged from the record below,
with one correction already noted above: the second corpus measurement
needs a manual merge of the two pending branches, not a rebase.

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
  *(Correction, independent re-verification, 2026-09-04: "gated assertion"
  held for the surfaces above but not for the landing page, and the gap was
  invisible to the suite's own PASS — axe found FOUR serious `color-contrast`
  violations on the landing at rest, in both themes (`#entrance-actions-heading`
  3.45:1, two CTA badge spans at 3.05:1/3.55:1, a `.text-ink/35` tertiary link
  at 2.23:1; all under 4.5:1 AA), confirmed reproduced live. `verify-a11y.mjs`
  reported this surface clean because it audited the instant "Start fresh"
  attached to the DOM — before the entrance's ~1.2s typed intro and ~700ms
  fade/lift reveal reached rest (Playwright's `visible` wait does not require
  `opacity:1`): clean at the suite's own moment, 11 violating nodes ~1s later
  mid-animation, 4 real and stable ones once actually settled — a timing
  artifact, not a passing gate. Fixed: the gate now waits for the entrance's
  own completion signals (`data-slug-done`, `data-reveal-done`) plus a
  DOM-mutation-quiet window, audits the landing at two post-settle moments,
  and records the worse — confirmed to FAIL on the four violations before the
  color fixes below landed, and to pass clean (0/0 at both moments, both
  themes) after. Every other surface this suite audits was re-checked with
  the same at-rest discipline and reported byte-identical results — the
  timing gap was specific to the landing's own entrance animation. Full
  report: `docs/audits/2026-09-04-reverification/REVERIFICATION.md`.)*

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
