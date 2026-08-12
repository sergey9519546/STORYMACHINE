# Workstream 03 — Product / UX Specification: Consumer Alpha

**Owner:** Product/UX lead · **Status:** Execution-ready draft v1 · **Date:** 2026-08-07
**Scope:** The consumer alpha per Context Brief §13 — one polished original world, 30–60 min, 3 characters, one secret, one lie, one irreversible act, 3 endings, mobile-web first, share pages, full instrumentation.
**Discipline tags:** [SETTLED] = context-brief decision, do not relitigate · [REC] = recommendation for sign-off · [ASSUMPTION] = planning number pending verification.

---

## 1. Positioning + Naming

**Category claim.** Not a chatbot, not a companion, not an infinite sandbox: **interactive drama with consequence physics** — a contained 30–60 minute story that remembers everything, asks before the irreversible, actually ends, and hands you the script of what you lived.

> For people who love stories more than chat, **[NAME]** is the played-story app where lies exist, secrets stay secret, and endings are real — because a deterministic story engine tracks the truth of your run and compiles it into a screenplay you own.

Character.AI/Talkie sell endless companionship (no consequence, no endings, rising regulatory heat); AI Dungeon sells an infinite sandbox (no convergence, no artifact). Our two structurally uncopyable numbers are **completion** and **artifact share** [SETTLED]; session-boundedness ("stories end") is also our trust-and-safety differentiator (§6).

**Working title:** StoryMachine (internal/engineering name; keep for the benchmark and B2B narrative).

**Consumer name candidates** — all five REQUIRE a professional trademark knockout + full search (US classes 9/41/42 at minimum) and domain/handle audit before use; none is claimed available here:

1. **Unwritten** — the promise in one word: nothing is true until you do it; then it's written (the artifact). Warm, huge-audience-safe. Risk: common dictionary word, crowded search space.
2. **Epilogue** — names the two weapons at once: endings and the artifact-after. Literate, premium. Risk: likely collisions with reading/book apps.
3. **Plotfall** — coined, ownable, evokes the moment the plot drops (nightfall/pratfall cadence); good game-y energy for the C-tier signature. Risk: meaningless until marketed.
4. **Throughline** — the memory/consequence claim in craft language ("the line that holds"). Risk: NPR podcast of the same name; used by writing tools.
5. **Rubicon** — the crossing-point; literally the C-tier mechanic as a brand. Risk: heavily used across industries (notably adtech); hardest clearance.

[REC] Front-runner for testing: **Unwritten** (broadest) with **Plotfall** as the ownable fallback. House lines: hero tagline **"Play a story that remembers."**; artifact line **"Own the script of what you lived."**; the reserved signature phrase **"This can't be undone."** (see §3).

---

## 2. UX Flows, Screen by Screen (mobile-web-first)

Design language: near-black paper, warm ink, screenplay-flavored typography in the stream (styled sluglines, character-name dialogue blocks); motion slow and few; **modal takeovers are reserved exclusively for C-tier moments** — admin surfaces are deliberately flat, so drama stays a scarce signal. Performance budget: first beat streams ≤4s after input; landing-tap to first streamed beat ≤90s.

### 2.1 Onboarding (S0–S3): age gate → content prefs → one-tap start

- **S0 Landing.** Full-bleed poster of the hero world. H1 "Play a story that remembers." Sub: "One night. Three people. Whatever you do — it happened." Primary CTA **Begin**. Secondary: "Read a finished episode" → a curated sample artifact page (the share loop doubles as marketing). Rating chip visible on the poster ("18+ · deception, non-graphic peril").
- **S1 Age gate.** Neutral date-of-birth entry (day/month/year pickers), no target age hinted, no "are you over 18?" yes/no. Under-18 → hold screen: "The alpha is 18+. Leave an email for when that changes." Denial is remembered (localStorage + account flag; acknowledge this is bypassable — see §6). Alpha is **18+ only** [REC; rationale §6].
- **S2 Content preferences** (one screen, ≤10s): "How dark can tonight get?" → **Softer** (violence implied only, mild profanity) / **Standard** (world default). No "harder" tier at alpha; romance is fixed fade-to-black; no explicit sexual content, period. Below, one required disclosure line: "You'll be playing with an AI storyteller. Everything it remembers about the story, you can see." + link "How this works & your data" (AI disclosure, analytics/dataset consent with opt-out toggle — legal review required).
- **S3 Cold open.** First-time users skip world select entirely: **Begin lands you inside the hero world's opening scene.** Two to three beats stream before any input is requested (hook first). The first input request is soft: "Say something — or say nothing." (silence is a valid, tracked move; this teaches *refuse* without a tutorial).

Total: one CTA tap + DOB + one preference tap → playing.

### 2.2 World Select (S4) — return visits

Vertical card stack:
- **Hero world card:** poster, logline, "~45 min," rating chip, progress ("3 endings — 1 found," two slots shown as wax-sealed silhouettes), **Start** / **Branch from a moment** (§2.9).
- **Blank Start card:** "Bring a premise. We'll build the night around it." Tap → single text field with cycling placeholder examples ("A wedding. A stranger. A name nobody says."). Engine proposes a setting card, three characters, a tone/rating confirm — and this line: **"We've hidden a secret in this story. Find it."** (The secret is generated but never shown; the engine seeds one secret, one lie, one irreversible pivot, and ending conditions so blank starts still converge.) [REC] Ships feature-flagged (staff + ~10% cohort) during alpha: curated-world metrics must stay clean, and safety rails are strongest on pre-compiled worlds.
- **Vantage select** (per world): alpha launches with one playable vantage (Rowan, §8). The other two appear as locked cards with a story reason, not a padlock: "Jules's night — after your first ending." [REC: second vantage is the week-3/4 content drop.]

### 2.3 The Play Screen (S5) — the core loop

Layout, top to bottom:
1. **Status strip** (thin, auto-hides on scroll): world chip, scene heading in slugline style ("THE DOCK — LATER"), the **Lens handle** (small prism glyph, top-right), overflow menu (save & exit, report, settings).
2. **Beat stream:** dramatized beats as they stream. Action beats in prose; dialogue as NAME + line blocks. Tap-and-hold any beat → Flag / Copy line (flagging per §6).
3. **The Ticker** — visible state, quiet [SETTLED: A/B auto-commit with ticker + one-tap revert].
   - **A-tier:** after commit, a single muted line under the relevant beat, centered, small: "· the marina log is in your pocket ·". Collapses into ticker history (accessible from the Lens) after a few seconds.
   - **B-tier:** same line with an amber dot, persists ~8s with an inline **undo** text button: "· Jules noticed your hesitation · undo". 
   - Tapping any ticker line opens a small sheet: plain-language delta + provenance + "Undo — the story will forget this." One-tap revert is available until a dependent beat commits; after that the line is history (the Lens still shows it). First ticker ever shown gets a one-time caption: "The story keeps track. Tap to see or undo."
4. **Input dock:** freeform text field ("What do you do?") plus quick-verbs:
   - Persistent: **Say** · **Do**.
   - Contextual chips appear from scene state: **Choose** (when the engine offers explicit options — rendered as 2–3 tappable choice cards above the dock), **Refuse**, **Press**, and **Lie**.
   - **Lie is the signature verb.** It surfaces whenever a character asks the player a direct question: chips read [Tell the truth] [Lie] [Deflect]. Tapping **Lie** frames the next typed line as a lie; a one-time caption explains the stakes: "They'll believe you. The story won't forget that they shouldn't." Committing creates `believes_false(...)` state, visible in the Lens, exposable later. No tutorial anywhere; every verb is taught by the first context that makes it meaningful.
5. **Invisible QA** [SETTLED §3]: no margin notes, no critic surface. Hard constraints ride the scene packet; the fast post-gen gate silently triggers at most one bounded regenerate (the ordinary streaming shimmer runs ~2–4s longer; never an error state); everything else logs to the dataset.

### 2.4 The C-tier Confirmation — "The Threshold" (S6)

[SETTLED: C-tier interrupts as staged drama; rare — 3–5 per run, never two within a scene; ending triggers always C-tier.]

**Exact pattern:**
1. Stream pauses at a sentence end. Over 300ms the scene desaturates, blurs (≈8px), vignette darkens.
2. The **Threshold card** rises to ~60% height: near-black surface, single hairline border, generous space. Haptic: two soft pulses (Android `vibrate([40,80,40])`; iOS Safari has no vibration API — degrade to the motion alone, optionally a low audio tick if sound is on).
3. **Copy block, max three short lines, second person, present tense:** line 1 names the stakes; line 2 names the cost; line 3 — only for true irreversibles — the reserved italic signature: *This can't be undone.*
4. **Actions:** primary is a **hold-to-commit pill** with a diegetic verb ("Hold to burn it") — press and hold ~900ms while a ring fills; releasing early rewinds the ring with a soft tick. Decline is a quiet text button with diegetic copy ("Not yet" / "Step back"). There is **no X and no "Cancel"** — the back gesture counts as decline. The words "Are you sure?", "OK," and "Confirm" never appear anywhere in the product.
5. **On commit:** ring completes → one strong haptic → the card *seals* (a 400ms stamp motion) → collapses into a one-line ledger entry in the stream marked with a seal glyph → the consequence beat streams. Generation is kicked off at the moment of commit; the seal animation is the latency mask (no speculative pre-generation of both branches [SETTLED §7 — no prefetching]).
6. **On decline:** the card sinks and the scene resumes with a one-line micro-beat acknowledging the hesitation (cheap-model render) — declining is also a story event, and it is never punished mechanically.

C-tier commits have **no undo** — that is the mechanic and the point; the ticker's revert affordance visibly does not appear on sealed entries.

### 2.5 The Story Lens (S7) — one gesture away

[SETTLED: optional, beautiful, the map you open in a game.] **Gesture:** swipe down from the top of the stream (the lens "drops over" the scene) or tap the prism handle. Opens instantly; streaming continues beneath; never gated, never required.

Full-screen dark overlay, three layers via tabs:
- **PEOPLE.** A constellation: three character nodes (player marked "you"); edge thickness = live tension, edge warmth = trust. Tap a node → a plain-language card: **Knows** ("That you opened the briefcase — since the dock"), **Believes, wrongly** (shown only when the audience knows it's wrong — dramatic irony made visible), **Suspects** (rendered as proximity, no numbers: "She's close."). Every item carries provenance ("since Scene 3, when you left the glass out") — tap to jump to that beat.
- **SECRETS.** Wax seals. **Broken seals** = secrets you've uncovered (tap to re-read the reveal beat). **Intact seals** = secrets that exist but remain unfound — shown as an epithet only, never contents: "Sealed — WHO DANIEL PROTECTS." This is the honesty rule: the Lens only ever renders `audience_knows` content; the shape of what you're missing, never the substance.
- **THREADS.** Setups awaiting payoff drawn literally as loose threads: "The toast Daniel promised — unfinished."
Footer: "The story remembers 23 things. You've witnessed 21." Exit: swipe up. One-time discovery nudge at the first act break: the prism pulses once — "See what the story remembers."

### 2.6 Ending & Finale Flow (S8)

Ending trigger arrives as a Threshold (always). Commit → final beats stream → hard cut to black (600ms hold) → then:
1. **Title card:** world title, "an episode lived by [display name]," date — then the ending reveal: **"ENDING 2 OF 3 — THE EMPTY CHAIR."** The other slots render as sealed silhouettes.
2. **Stats card:** runtime · scenes · choices made · lies you told · lies you caught · secrets found 2/3 with the sealed epithet shown ("Never found: WHO DANIEL PROTECTS") · thresholds crossed · **declined at the threshold: 1** (players adore this number).
3. **Compile render** — staged diegetically to cover real compile latency, with stages named truthfully: "Gathering what actually happened…" (confirmed deltas) → "Checking every line against the record…" (reconciliation pass) → "Setting it in type…" (Fountain → layout). The artifact carries its reconciliation status [SETTLED §9]: `reconciled` renders a small seal ("Every line checked against the record"); `partially_reconciled` marks affected scenes with a footnote glyph and the line "This scene is reconstructed from memory."
4. **Artifact preview:** the formatted episode, scrollable. Primary CTAs: **Share your episode** · **Play the branch you didn't take** (deep-links to the most dramatic declined Threshold) · Back to shelf.

### 2.7 The Artifact Share Page (S9) — public, per-artifact URL `/e/{slug}`

- **Spoiler shield first:** poster + "Rowan's night ended in: ▓▓▓ — Spoilers." with a **Show me how it ended** reveal button. OG/social image never spoils: title card + "An ending was found." + an auto-selected pull-quote (highest-tension confirmed line, typically a Threshold beat).
- **The episode:** screenplay-styled (monospace serif webfont, proper sluglines/dialogue blocks), the run's Threshold beats typeset with their seal glyphs. Stats strip. Footer watermark on every viewport-page: "Lived in WHOEVER YOU ARE · [NAME] · play your own night → [link]"; watermark also embedded in free-tier PDF export.
- **Replay CTA**, sticky: "This took Rowan 47 minutes and cost them everything. Your turn." → Begin (attributed, §7).
- Sharing is **opt-in per artifact**; display name is a pseudonym by default; every artifact passes the safety filter before its page goes public; reader counts accrue to the owner (§4).

### 2.8 Collection — "The Shelf" (S10)

A grid of bound episodes (spine color = ending reached). Per-world progress card: endings 1/3 with sealed silhouettes, secrets tally, and the **branch map** — a vertical subway map of your runs whose stations are Threshold moments (icon-only until experienced; spoiler-safe).

### 2.9 Replay & Branching

From the Shelf or any artifact you own: scrub the beat timeline of a completed run, tap any beat → **"Branch here — the story rewinds to this moment. Everything after it un-happens (in the new copy)."** Branching forks a new run from the state snapshot as-of-that-beat (cheap by construction on the append-only delta history [SETTLED §8]); the original artifact is immutable [SETTLED §1 dual-artifact rule]. Branch runs are marked `entry_type=branch` so completion metrics stay honest (§7).

---

## 3. Writing the Drama of Confirmations — C-tier Copy

House rules: ≤3 short lines; second person, present tense; name the *cost*, never the mechanic; the commit verb is diegetic and specific; the decline is diegetic and never shaming; *This can't be undone.* appears verbatim, italic, last line, **only** on true irreversibles — it is the product's signature and is never used elsewhere (not in settings, not in account deletion, nowhere).

1. **Telling the lie.** "She'll believe you. That's the problem." / *This can't be unsaid.* → **Hold to lie** · Say nothing
2. **Revealing the secret.** "Once he knows, everything he does next is different. There's no way to un-know it." → **Tell him** · Keep it
3. **Destroying evidence.** "The letter burns in seconds. What it proves burns with it." / *This can't be undone.* → **Hold to burn it** · Step back
4. **Betrayal.** "They trusted you with this. You're about to spend that trust. All of it." → **Do it** · Not like this
5. **The public accusation.** "Accuse her in front of everyone, and there is no apology big enough to take it back." → **Accuse her** · Swallow it
6. **Breaking the promise.** "You made this promise on the dock. Breaking it is who you'll be for the rest of this story." → **Break it** · Keep it
7. **Saying the name (alpha world).** "Say his real name in this room and everyone here becomes a witness." / *This can't be unsaid.* → **Say it** · Hold your tongue
8. **The ending trigger.** "Past this door, the story ends. One secret stays sealed behind you." → **Walk out** · One more scene

Note the pattern: the decline options are themselves characterful ("Swallow it," "Not like this") — declining is playing, not cancelling.

---

## 4. Retention + Share Mechanics (no dark patterns)

**Completion loop.** The unit of engagement is a finished 30–60 min run, not a session streak. Finishing always pays: an ending named, a slot filled, an artifact minted.

**Endings as collection.** Three slots per world; names revealed only when earned (sealed silhouettes otherwise); ending 3 is conditional/hidden (§8) so collection requires mastery, not grinding. The Shelf and world card make the empty slots quietly visible.

**"The secret you never found."** Sealed epithets (never contents) appear at the finale, on the world card, and optionally in the weekly digest: "A reader of your episode found the secret you didn't." Tease by *shape*, never by countdown or expiry.

**Artifact share loop.** Finish → mint → share → reader hits spoiler shield → reads an ending → "Your turn" → new run, attributed to the artifact. Reader counts flow back to the owner ("Your episode was read 12 times this week; 3 readers started their own night") — social proof as the re-engagement engine instead of loss-aversion.

**Streak-free re-engagement.** Explicitly banned: streaks, daily rewards, expiring currency, FOMO countdowns, and any message in a character's voice arriving outside the story ("Jules misses you" is the parasocial pattern regulators cite). The story is a place you go, not a person who pings you.

**Justified notifications (email at alpha; push only for installed PWA, opt-in):**
1. Transactional: compile ready (only if the user left before render); receipts/account.
2. **One** mid-run resume nudge, 48h after abandonment, quoting the actual pending moment: "Daniel is still holding the door. Scene 6." Once per run, ever.
3. Weekly digest (explicit opt-in at alpha): reads of your artifacts + endings news.
4. Content drops (new vantage/world): ≤1/month.

---

## 5. Monetization

**Verified category norms (checked 2026-08-07; third-party sources — re-verify at the vendors' checkouts before pricing is finalized):**
- **Character.AI** — free tier with ads (rolled out by April 2026), daily swipe caps and a "Charms" virtual currency; **c.ai+ $9.99/mo or $94.99/yr (≈$7.92/mo)** for ad-free, best models, priority access ([eesel.ai pricing analysis](https://www.eesel.ai/blog/character-ai-pricing)).
- **Talkie** — free tier is ad-funded (~40–50s ads roughly every 10 minutes of chat); **Talkie+ $9.99/mo; annual $49.99 first year promo, renewing at $95.99/yr**; a $24.99/mo Pro tier announced "coming soon" ([Talkie review, May 2026](https://honeychat.bot/en/blog/talkie-ai-review-features-pricing-2026/)).
- **AI Dungeon** (closest interactive-fiction comparable) — free "Wanderer" tier plus subscriptions with bundled monthly credits: **Journey $9.99, Champion $14.99, Legend $29.99, Mythic $49.99/mo**, credits scaling by tier ([AI Dungeon pricing overview](https://uragent.org/tools/ai_dungeon/)).

Read of the market: **$9.99/mo is the anchor**; the category monetizes overage via virtual currency/credits; heavy free tiers are ad-funded; Talkie's promo-then-double renewal is a churn/optics anti-pattern we will not copy.

**Recommended model [REC]: free tier + one subscription + non-expiring run top-ups.** The metered unit is the **run** (one full story attempt; branches count). We meter quantity, never truth or drama:

- **Never gated:** the Lens, the ticker/undo, safety features, the C-tier moment itself, base compile + watermarked share page. (Paywalling a Threshold — "pay to betray" — would poison the signature mechanic and is an optics disaster in this category.)
- **Free:** full access to the hero world, **2 runs/month**, watermarked artifacts. A skilled free player *can* find all three endings — mastery is not paywalled, volume is.
- **Plus — $9.99/mo or $79.99/yr (≈$6.67/mo):** 12 runs/mo included, all worlds and vantages, Blank Start seeding, PDF/Fountain download with watermark removed, custom display name, priority at peak.
- **Top-ups (never expire):** $4.99 → 8 runs; $8.99 → 16 runs.

**Cost-margin guardrail (linkage to the per-story cost model workstream):** `included_runs × p50_cost_per_completed_story ≤ 40% of monthly price`, and `p95 cost per story ≤ $1.00`, enforced mechanically by per-beat token budgets + model routing + three-tier context [SETTLED §11]. [ASSUMPTION pending the cost model: p50 cost per completed story $0.30–0.50.] At $0.30, 12 included runs = $3.60 (36% of $9.99) ✓; median subscribers are expected to play 6–10 runs/mo, so realized COGS ≈ $1.80–3.00. Top-up pricing (~$0.56–0.62/run) holds ≥2× margin over p50 cost. If the cost model lands above $0.50 p50, the knobs move in this order: included runs ↓ → routing mix → price ↑ (last).

**Alpha sequencing:** the alpha itself is free (waitlist), capped at 2 runs/week; a fake-door pricing screen (`paywall_viewed`) runs in the final two alpha weeks to test the $9.99 anchor before real billing ships at beta.

---

## 6. Trust & Safety UX

**Age gating.** Neutral DOB gate (§2.1); alpha is **18+ only** [REC]: every minor-protection obligation now in force (SB 243 break reminders, content blocks) is surface area we should not build while proving the core loop, and "no minors at alpha" is the strongest diligence posture. DOB self-attestation is bypassable — we say so honestly and revisit verified age assurance + a 16–17 mode post-alpha.

**Content rails & rating per world.** Every world carries a house rating chip rendered on its poster, share pages, and store card — alpha world: "18+ · Mature themes: deception, implied criminal past, non-graphic peril. No sexual content. No self-harm content." Rails are compiled into the scene packet as hard constraints at prompt-build time, backstopped by the fast post-gen gate [SETTLED §3] — prevention first, detection second. Player content preferences (Softer/Standard) tighten the packet further. Blank Start premises are classified before compilation; disallowed premises (sexualized minors in any form, self-harm scenarios, real-person depiction, unlicensed IP [SETTLED §10]) are declined with a plain, non-judgmental card and alternatives.

**Self-harm and abuse in an interactive-fiction context.** The critical distinction is **fictional depiction vs. player disclosure**. The intent parser (already running on every input, so zero added latency) also classifies first-person disclosure signals. On trigger, the story pauses with a deliberately *non-diegetic* card — flat white, sans-serif, visually outside the fiction: "Taking a breath outside the story. Some of what you wrote sounds like it might be about you, not Rowan. If things are heavy right now: **988 Suicide & Crisis Lifeline (US) — call or text 988** · International: findahelpline.com." Options: **I'm okay — keep playing** · **Save and step away**. No lecture, no lockout for in-rating fiction; repeated triggers offer the Softer intensity setting. Crisis resources are never delivered in a character's voice, and no character or system surface ever presents as a therapist or counselor (Tennessee's 2026 law prohibits AI presenting as licensed mental-health professionals — see below). In-fiction self-harm content is simply not in the alpha world and is packet-forbidden for generation. Abuse/harassment content follows the rating rails; player-authored abuse toward characters is fiction and permitted within rating, but the gate blocks out-of-rating escalation.

**Reporting.** Long-press any beat → **Flag this beat** → categories (Sexual content / Violence beyond rating / Self-harm content / Hate / Breaks the story / Other). The report auto-attaches the beat, its receipts (model, prompt version, hashes [SETTLED §8]) and a state snapshot hash — every report is exactly reproducible. Ack copy: "A human reads every flag within 24 hours." Public artifact pages carry a report link.

**Why the C-tier pattern doubles as a safety pattern.** (1) The engine structurally cannot escalate past a grave boundary on its own — every irreversible act requires explicit, logged human consent; (2) the rarity budget caps intensity pacing by design; (3) declines are always honored and never punished, so "no" is a first-class input — the inverse of the NSFW-pressure failure mode the category is infamous for; (4) receipts make every Threshold auditable in moderation and diligence. Layered: rails = prevention, gate = detection, Threshold = consent, report = recourse.

**Regulatory climate (verified 2026-08-07).** The FTC opened a Section 6(b) inquiry into AI companion chatbots in **September 2025**, ordering Alphabet, Character Technologies, Instagram, Meta, OpenAI, Snap and xAI to produce information on monetization, data practices, and safety-impact evaluation, with particular focus on minors ([California Lawyers Association summary](https://calawyers.org/privacy-law/regulatory-focus-on-ai-companion-character-chatbots/)). State law is moving fast ([Orrick 2026 state chatbot law roundup](https://www.orrick.com/en/Insights/2026/04/2026-State-Chatbot-Laws-Key-Provisions-and-Regulatory-Trends)): **California SB 243** (eff. Jan 1, 2026 — AI-status disclosure, mental-health crisis protocols, minor protections including sexual-content blocks and break reminders); **New York** (eff. Nov 5, 2025 — suicidal-ideation protocols, recurring AI disclosure, crisis referrals); **Oregon SB 1546** and **Washington** (eff. 2027 — disclosures, minor protections, private rights of action, $1,000/violation statutory damages in OR); **Tennessee** (eff. Jul 2026 — no AI posing as licensed mental-health professionals); Nebraska/Idaho conversational-AI safety acts (2027). We may argue we're a story game rather than a "companion chatbot," but we **design to the strictest plausible reading**: persistent AI disclosure (onboarding, settings, artifact footer: "written in play with an AI storyteller"), the crisis protocol above, no minors, no parasocial notifications. Stories that end are themselves anti-parasocial architecture — that sentence belongs in every diligence deck.

---

## 7. Instrumentation

All events carry base context: `user_id (pseudonymous), session_id, ts, platform, app_version, world_id?, run_id?`. The append-only delta history is the dataset spine [SETTLED §8]; analytics events are a separate, lighter stream.

| Event | Key properties | Fired when |
|---|---|---|
| `page_view` | path, ref, utm | any page load (incl. share pages: `share_page_view` with artifact_id, ref) |
| `age_gate_submitted` | passed, age_bucket | DOB submitted |
| `onboarding_completed` | intensity_pref, ms_since_landing | prefs screen done |
| `run_started` | world_id, vantage_id, entry_type: fresh\|branch\|share_replay, run_number | run created |
| `first_beat_rendered` | ttfb_ms | first streamed beat visible (the **activation moment**) |
| `player_input` | beat_index, verb: say\|do\|choose\|refuse\|lie\|silence\|freeform, char_count | input committed |
| `beat_committed` | beat_index, tier: A\|B\|C, gen_ms, model_id, tokens_in/out, cost_usd, regen_count: 0\|1, gate_result | beat finalized (cadence + cost source of truth) |
| `ticker_undo` | beat_index, tier | revert tapped |
| `ctier_presented` | kind: lie\|reveal\|betrayal\|irreversible\|ending, beat_index | Threshold shown |
| `ctier_resolved` | kind, choice: commit\|decline, dwell_ms, hold_aborts | Threshold answered |
| `lens_opened` | beat_index, via: swipe\|handle\|finale, dwell_ms, tabs_viewed | Lens opened/closed |
| `run_abandoned` | last_beat_index, at_ctier: bool, runtime_min | derived, 30 min inactivity mid-run |
| `ending_reached` | ending_id, runtime_min, beat_count, secrets_found/total, lies_told, lies_caught, ctier_commits/declines | final beat sealed |
| `compile_completed` | ms, reconciliation_status, page_count | artifact rendered |
| `share_created` | artifact_id, channel: link\|native_sheet | share action |
| `share_replay_started` | source_artifact_id | run started from a share page (attribution) |
| `session_start` | days_since_signup, days_since_last | app open (D1/D7 derivation) |
| `cost_per_story` | total_usd, usd_by_model, usd_gate, beats | rollup at ending or abandonment |
| `gate_regen` / `beat_budget_exceeded` | reason: leak\|contradiction\|slop / overage | QA gate events |
| `beat_flagged` | category, beat_index | report filed |
| `paywall_viewed` | price_shown, source | fake-door screen (late alpha) |

**The 5 KPIs and alpha go/no-go bands** [targets are inference from consumer norms, not established facts]:

1. **Completion rate:** `ending_reached / runs with ≥5 beats` — **target ≥35%** (stretch 50%). The headline number chat products structurally cannot post.
2. **Artifact share rate:** `share_created / ending_reached` — **target ≥15%**; secondary: ≥25% of shared artifacts get ≥1 external `share_page_view`.
3. **Return:** **D1 ≥30%, D7 ≥15%** of activated users (`first_beat_rendered` in first session); plus second-run rate ≥40% of completers within 7 days (the endings-collection proof).
4. **Time-to-first-beat / activation:** ≥80% of age-gate passers reach `first_beat_rendered`; median landing→first-beat ≤90s.
5. **Cost per completed story:** **p50 ≤ $0.50, p95 ≤ $1.00**, with gate regen rate ≤10% of beats [linked to cost-model workstream].

Guardrail diagnostics (not KPIs): Threshold decline rate healthy band 10–40% (≈0% means it isn't a choice; >60% means the staging frightens); Lens open rate ≥40% of runs; ticker undo rate <5% (trust in auto-commits).
**Go/no-go:** GO = completion ≥35% AND (share ≥15% OR D7 ≥15%) AND cost p95 ≤$1.00 AND zero unresolved T&S incidents. Anything less = iterate the world/loop before widening the funnel.

---

## 8. Alpha World Brief + Backups

### Creative brief — **WHOEVER YOU ARE** (launch world)

- **Genre / tone:** contemporary romantic thriller — one night, one venue, three people. Broad-appeal (romance stakes without companion-app dynamics), IP-clean, cheap on world tokens, rich in secrets and two-handers.
- **Logline:** *The night before your wedding, a stranger walks into the rehearsal dinner claiming to be family — and by dawn you'll know exactly who you're marrying, or exactly who you've lost.*
- **Setting:** a small coastal restaurant closed for the private rehearsal dinner — dining room, kitchen, back office, and the dock out back. Dusk to dawn. The contained clock: a decision must exist by morning.
- **Characters (3 total, per §13 / v2 §21 — one protagonist, two supporting):**
  - **ROWAN (the player).** Marrying Jules tomorrow. Voice card: direct, dry, watches hands not faces.
  - **JULES.** The fiancé(e). Warm, quick, deflects with jokes; goes quiet in exactly the wrong moments. Want: to marry Rowan tomorrow as the person they've become. Fear: the old name.
  - **DANIEL.** Arrives uninvited; introduced as Jules's estranged brother. Actually a U.S. Marshals handler. Voice card: courteous, unhurried, answers questions with smaller questions; never lies twice the same way.
- **THE SECRET (one):** Jules is four years into witness protection. The old life: Jules drove for an insurance-arson crew, saw a fire kill a night watchman, and testified. The conviction has just been overturned; a retrial means testifying again — and relocating again, possibly tomorrow, possibly without Rowan. Evidence chain the player can find: the case file in Daniel's briefcase → the real name → the retrial notice.
- **THE LIE (one, in play from beat ~10):** Jules tells Rowan directly: "Daniel's my brother. We don't talk. It's nothing." Tracked as `believes_false(Rowan, …)` until punctured; the player may also lie (to Jules about what they've found; to Daniel about what Jules has said) — every lie is state.
- **THE IRREVERSIBLE ACT (one core, C-tier):** **saying Jules's real name aloud in front of a witness** — it breaks cover, and it cannot be unsaid (Threshold copy #7). Supporting C-tier pool: opening the briefcase; calling the number in the file (summons the Marshals tonight); burning the retrial notice; the dawn decision (ending trigger).
- **THREE ENDINGS:**
  1. **I DO** — Rowan learns the truth and marries into it anyway: a wedding with one guest who doesn't exist and a life that might vanish. (Truth found; trust preserved.)
  2. **THE EMPTY CHAIR** — Jules is gone by morning, relocated alone; triggered by breaking cover or making the call. The devastating one; it shares hardest.
  3. **WHOEVER YOU ARE** (hidden, conditional) — Rowan chooses to disappear *with* Jules. Unlocks only if the truth is found without cover ever breaking and Rowan tells Jules no lies in the back half. The mastery ending.
- **Second sealed secret (the tease):** Daniel's own stake — this is his last protectee before he leaves the service, and he bent the rules to warn Jules early. Epithet on the stats card: "Never found: WHO DANIEL PROTECTS."
- **Object economy (small, trackable):** the briefcase, the file, the retrial notice, Daniel's card with the phone number, the wedding rings, one dockside photograph.
- **Rating:** 18+ · deception, implied criminal past, non-graphic peril; no sexual content beyond a kiss; no self-harm content; mild profanity. **IP note:** all names/premise original; no real-person or franchise references; final title needs the same trademark screen as the product name.

### Backup world concepts

- **DEAD AIR.** The last midnight broadcast of a dying local radio station. Player is the host; a caller phones in knowing too much about a ten-year-old hit-and-run; the engineer won't go home. Secret: which of the three was in the car. Dialogue-native (cheap tokens, voice-ready later), noir-broad, one studio, one night.
- **THE UNDERSTUDY.** Opening night; the lead has vanished 90 minutes before curtain; the player is her understudy. The director insists "she's just late" (the lie); the theater safe holds why she ran (the secret); going on in her place — or opening the safe on stage — is the irreversible. A play within a play, and the compiled artifact is literally a script of a night at the theater.

---

## Dependencies & open items
1. Trademark/knockout search: all five names + world title (external counsel).
2. Cost-model workstream: confirm p50/p95 per-story cost; re-run §5 knobs.
3. Legal review: dataset consent language, 18+ wording, "companion chatbot" applicability memo (design assumes covered).
4. Content workstream: world bible, voice cards, Threshold beat map for WHOEVER YOU ARE.
5. Engine workstream: Blank Start safety classifier spec (feature-flagged at alpha).

**Sources:** [eesel.ai — Character AI pricing](https://www.eesel.ai/blog/character-ai-pricing) · [honeychat.bot — Talkie AI review & pricing 2026](https://honeychat.bot/en/blog/talkie-ai-review-features-pricing-2026/) · [uragent.org — AI Dungeon pricing](https://uragent.org/tools/ai_dungeon/) · [calawyers.org — Regulatory focus on AI companion chatbots](https://calawyers.org/privacy-law/regulatory-focus-on-ai-companion-character-chatbots/) · [Orrick — 2026 State Chatbot Laws](https://www.orrick.com/en/Insights/2026/04/2026-State-Chatbot-Laws-Key-Provisions-and-Regulatory-Trends)
