# Root-Cause Templates

Program v2 Type 4 rules: named, plain-language diagnoses for co-occurrence clusters that are always the SAME underlying craft wound wearing two rule- name hats, not a coincidence (`server/nvm/analyze/cluster.ts`). A template runs before the three generic clustering mechanisms and claims its matching issues first, so the flat issue list never double-reports the same wound as an unnamed generic cluster too. Each was chosen from measured rule-pair co-occurrence and spatial overlap evidence across the 20-sample calibration corpus, not intuition — see the wave commit history cited in `cluster.ts`'s own header for the full top-pairs tables.

## Wave 1189

Wave 1189 additions (Program v2, Type 4 — root-cause templates, second of its kind) — three more named templates, same method as Wave 1185 (runScriptDoctor + locateIssues over all 20 calibration corpus samples, tallied for rule-pair co-occurrence and span overlap), re-run because the corpus evolved under Waves 1186-1188. Several candidates suggested by the wave brief turned out to be non-viable on inspection of locate.ts, not by assumption: ACT1_BOUNDARY_WEAK ("End of Act 1 (Scene ~N)" — the "~" breaks SCENE_RE), NO_REVERSALS / NO_REVERSALS_LONG_STORY ("Overall structure" / "Conflict layer"), TOLD_BELIEF_DOMINATION ("Belief/revelation layer"), and EXPOSITION_DUMP / MISSING_INCITING_INCIDENT / REVELATION_DROUGHT ("Scenes N–M", the plural form SCENE_RE deliberately excludes) all resolve to anchor 'document' with no line span — locate.ts's own module comment says so explicitly for the plural case. A template needs real spans to overlap, so none of those pairs can ever join this mechanism; the three below were chosen from what DOES carry a scene/lines anchor, keeping the same evidentiary bar the brief asked for: COLD_OPEN_INERT + ACTION_CONSECUTIVE_LONG_RUN — co-fire in 14/20 samples; land in overlapping spans 13/14 times (COLD_OPEN_INERT always anchors to Scene 0's full span, and the corpus's earliest dense-action run lands at line ~3, inside it, in all but one sample). REVELATION_UNEARNED + REVELATION_WITHOUT_REACTION — co-fire in 7/20 samples; land in the identical scene span all 7/7 times (an unearned revelation and "the next scene didn't react to it" are frequently the SAME revelation scene, read by two different checks). BELIEF_REVERSAL_UNSUPPORTED + UNMOTIVATED_DECISION — co-fire in 5/20 samples; every one of those 5 has at least one overlapping pair (both rules independently flag the identical scene as an unsupported swing — an emotional/belief reversal by one check, a major decision by the other). Rule sets are kept fully disjoint from Wave 1185's three templates AND from each other (no member rule reused across any two templates in this file) — matchOverlapTemplate scans the full located[] for every template independently (see clusterIssues below), so a shared rule between two templates risks the same issue getting claimed by both and surfacing as two overlapping named findings for one convergence; disjoint rule sets make that structurally impossible rather than merely unlikely. Design choice: claim-before-generic-clustering, not enrich-after Two designs were available: (a) let overlapClusters/characterClusters run as today and afterward re-title any resulting cluster whose memberRules happen to match a template, or (b) run template recognition FIRST and remove (claim) the issues it matches from the pool before the generic clusterers ever see them. (b) is what's implemented, because (a) has a real double-report risk this module's own architecture forbids: the generic scene/lines clustering (Cluster 1 above) is span-overlap-based with NO awareness of rule identity, so it would independently form the exact same connected group a template also matches — re-titling it after the fact is a patch that has to special-case every future template's shape against every existing clusterer's output, whereas claiming issues up front means every clusterer downstream (overlap, character, document family) simply never sees a claimed issue again, by construction, forever — no coordination required as templates or clusterers are added later. The cost is that a template's own matching logic must be self-contained (it can't lean on overlapClusters' output), which is why matchOverlapTemplate below re-implements the identical span-overlap union-find, scoped to the template's own rule set.

### Consequences don't land (`aftermath-void`)

Requires: `DRAMATIC_TURN_AFTERMATH_VOID` + `INCITING_AFTERMATH_STALL`

### Page one has no hook and no air (`airless-opening`)

Requires: `COLD_OPEN_INERT` + `ACTION_CONSECUTIVE_LONG_RUN`

### A character turns, and nothing caused it (`causeless-turn`)

Requires: `BELIEF_REVERSAL_UNSUPPORTED` + `UNMOTIVATED_DECISION`

### The reveal comes from nowhere and changes nothing (`hollow-reveal`)

Requires: `REVELATION_UNEARNED` + `REVELATION_WITHOUT_REACTION`

### Everyone sounds the same about nothing (`inert-scene-flat-talk`)

Requires: `ZERO_ENTROPY_SCENE` + `DIALOGUE_ASSERTION_RUN`

### The middle has no engine (`midpoint-stall`)

Requires: `WEAK_MIDPOINT` + `MIDPOINT_EMOTIONAL_FLATLINE`

