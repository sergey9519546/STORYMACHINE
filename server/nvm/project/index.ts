// Holographic Projection (G3) — one canon, every format.
// `project(canon, target)` is a pure projection of the StoryCommit DAG +
// NarrativeState into any deliverable. No format is privileged; all are
// first-class derivations of the same causal source.
//
// Targets: fountain, novel, stage, comic, interactive, pitch, bible,
//          rewatch (second-viewing annotated), cutting_room (ghost branches),
//          sidecar (NVM quality JSON for CI/tooling).

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp, ClueCarrier, ThemeMove } from '../ops/StoryOp.ts';
import { buildSidecar } from './sidecar.ts';

export type ProjectionTarget =
  | 'fountain'
  | 'novel'
  | 'stage'
  | 'comic'
  | 'interactive'
  | 'pitch'
  | 'bible'
  | 'rewatch'
  | 'cutting_room'
  | 'sidecar'
  | 'treatment'
  | 'outline'
  | 'dialogue_only'
  | 'epistolary'
  | 'simulation_log'
  | 'director_commentary';

export interface Canon {
  commits: StoryCommit[];
  state: NarrativeState;
  title?: string;
  ghosts?: Array<{ ir: unknown; reason: string }>; // ghost commits for cutting_room
}

export interface Artifact {
  target: ProjectionTarget;
  content: string;
  metadata: Record<string, unknown>;
}

// Dispatch to per-target projector
export function project(canon: Canon, target: ProjectionTarget): Artifact {
  switch (target) {
    case 'fountain':     return projectFountain(canon);
    case 'novel':        return projectNovel(canon);
    case 'stage':        return projectStage(canon);
    case 'comic':        return projectComic(canon);
    case 'interactive':  return projectInteractive(canon);
    case 'pitch':        return projectPitch(canon);
    case 'bible':        return projectBible(canon);
    case 'rewatch':      return projectRewatch(canon);
    case 'cutting_room': return projectCuttingRoom(canon);
    case 'sidecar':      return projectSidecar(canon);
    case 'treatment':          return projectTreatment(canon);
    case 'outline':            return projectOutline(canon);
    case 'dialogue_only':      return projectDialogueOnly(canon);
    case 'epistolary':         return projectEpistolary(canon);
    case 'simulation_log':     return projectSimulationLog(canon);
    case 'director_commentary': return projectDirectorCommentary(canon);
  }
}

// ── Fountain rendering helpers ────────────────────────────────────────────────
// Wave: Compiler richness (Run 17-B). projectFountain used to render only 3 of
// the 14 StoryOp kinds (UPDATE_BELIEF, SHIFT_RELATIONSHIP, RECORD_VISUAL_FACT)
// — every other op vanished silently, so the text-derived analysis path
// (fountain-analyzer.ts) could never recover a signal that was never rendered.
// Every op below now produces craft-plausible Fountain prose (scene headings /
// action lines / character+dialogue blocks — never a debug dump of the op's
// raw fields), and where fountain-analyzer.ts's lexicons are the mechanism by
// which the text path senses a signal (deadline vocabulary, quoted clue
// tokens, valence words, …), the rendered prose deliberately reuses those
// lexicon terms. See tests/core/record-parity.test.ts and
// tests/core/projection-richness.test.ts for the measured effect.

/** Strips a common id-prefix token (clock-, clue-, fact-, etc.) and turns
 *  remaining hyphens/underscores into spaces, so a raw StoryOp identifier
 *  reads as plausible prose instead of a slug, e.g. 'clue-key' → 'key',
 *  'clock-heist' → 'heist'. Falls back to the space-joined whole id when no
 *  known prefix matches (never returns an empty string). */
function cleanId(id: string): string {
  const cleaned = id
    .replace(/^(clock|clue|fact|object|obj|mechanism|rule|claim|setup|event)[-_]/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : id;
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Concrete descriptive noun-phrase per clue carrier (GODMODE Stage 8) — lets
 *  SEED_CLUE's rendering name the carrier TYPE itself as a screenplay detail
 *  rather than a bare enum value. */
function carrierPhrase(carrier: ClueCarrier): string {
  switch (carrier) {
    case 'object':   return 'A small object';
    case 'line':     return 'A stray remark';
    case 'gesture':  return 'A small gesture';
    case 'location': return 'A detail in the room';
    case 'absence':  return 'A conspicuous absence';
    case 'behavior': return 'A telling habit';
    case 'camera':   return 'A held frame';
    case 'sound':    return 'A faint sound';
  }
}

/** Physical, externally-observable action beat per dominant emotion —
 *  deliberately never narrates the emotion word directly ("X feels sad");
 *  shows it through the body instead. Each branch reuses at least one
 *  POSITIVE_VALENCE_WORDS/NEGATIVE_VALENCE_WORDS term from
 *  fountain-analyzer.ts's lexicons (read-only reference — smile/laughing,
 *  sob, anger, terror, proud, alone) so the text-derived path's
 *  emotionalShift heuristic can plausibly agree with the ops-path
 *  APPRAISE_EMOTION that produced it. */
function emotionBeat(charId: string, dominant: string): string {
  const name = capitalize(charId);
  switch (dominant) {
    case 'joy':      return `${name} breaks into a wide, unguarded smile, laughing despite everything.`;
    case 'distress': return `${name}'s hands tremble; a ragged sob escapes before they can stop it.`;
    case 'anger':    return `${name} clenches a fist, anger flashing hot across their face.`;
    case 'fear':     return `${name} flinches back, breath catching, eyes wide with terror.`;
    case 'pride':    return `${name} stands taller, chin lifted, unmistakably proud.`;
    case 'shame':    return `${name} shrinks back, suddenly small and alone in the silence.`;
    default:         return `${name} watches, expression unreadable, giving nothing away.`;
  }
}

/** Two-voice dialogue exchange embodying a ThemeMove. ADVANCE_THEME_ARGUMENT
 *  carries no charId — the argument belongs to the narrative, not to any one
 *  character — so two anonymous voices carry it (a standard device for a
 *  choral/thematic beat). Returns raw Fountain lines (cue, dialogue, blank,
 *  cue, dialogue) ready to be pushed as-is; the blank line between the two
 *  cues is required so src/lib/fountain.ts's parser recognizes the second
 *  ALL-CAPS cue as a new character block rather than folding it into the
 *  first speaker's dialogue. */
function themeArgumentLines(claimId: string, move: ThemeMove): string[] {
  const claim = cleanId(claimId);
  const EXCHANGES: Record<ThemeMove, [string, string]> = {
    support:    [`Maybe ${claim} really is true.`, `It's earned, if nothing else.`],
    attack:     [`${capitalize(claim)}? Not anymore.`, `It was never as true as we thought.`],
    undercut:   [`You still believe ${claim}?`, `Not after everything that's happened.`],
    complicate: [`${capitalize(claim)}? It's not that simple.`, `Nothing about this is simple.`],
    resolve:    [`So that's it, then. ${capitalize(claim)}.`, `That's it. Finally.`],
  };
  const [a, b] = EXCHANGES[move];
  return ['\t\t\tVOICE A', a, '', '\t\t\tVOICE B', b];
}

/** Subtle atmosphere/tension line for UPDATE_READER_STATE — the reader-state
 *  delta itself carries no prose of its own; this renders a short,
 *  sign-matched mood beat so a compiled draft's ambient texture tracks the
 *  same suspense/curiosity direction the ledger recorded, reusing
 *  fountain-analyzer.ts's DANGER_TENSION_WORDS ('dangerous'), RELIEF_WORDS
 *  ('calm','safe'), and MYSTERY_WORDS ('strange','mystery') lexicons so the
 *  text-derived path has a chance to sense the same direction. Each branch
 *  was checked word-by-word against every OTHER lexicon in
 *  fountain-analyzer.ts (read-only reference) to avoid the trap the first
 *  draft of this function fell into — "stillness"/"settles"/"quiet" are
 *  RELIEF_WORDS entries, so a naive "dangerous stillness settles..." line for
 *  the suspense>0 branch was silently cancelling its own signal (measured:
 *  it flipped 6 of 19 golden-story suspenseDelta sign agreements from
 *  1.00 to 0.684 before this fix). Returns null for a no-signal delta (both
 *  fields zero/absent) — an unchanged mood gets no beat, which is itself the
 *  "subtle" behavior the spec calls for. */
function readerStateBeat(delta: { suspense?: number; curiosity?: number }): string | null {
  const suspense = delta.suspense ?? 0;
  const curiosity = delta.curiosity ?? 0;
  if (suspense > 0) return 'A dangerous hush falls over the room, and something feels wrong.';
  if (suspense < 0) return 'The tension eases; the air feels calm and safe again.';
  if (curiosity > 0) return 'Something strange lingers unspoken, a small mystery nobody names.';
  if (curiosity < 0) return 'The unanswered question fades, at least for now.';
  return null;
}

/** Location-aware slugline. When a commit carries an ADD_FACT with predicate
 *  'moves_to' (the same relocation-fact convention memory.ts's deriveSlug
 *  looks for), render the EXACT slug template deriveSlug uses
 *  (`INT. ${LOCATION} — SCENE ${sceneIdx + 1}`) so that scene's ops-derived
 *  and text-derived ScreenplaySceneRecord.slug become byte-identical — closing
 *  the STRUCTURAL_DIVERGENT gap documented in record-parity.test.ts for any
 *  commit that actually carries location info. When no such fact exists
 *  (neither producer has location info to work with), the placeholder slug is
 *  left exactly as it was — per this wave's instructions, a rendering isn't
 *  invented where the ops/state carry no location data — so the divergence
 *  documented in record-parity.test.ts for the no-location case is unchanged
 *  (this placeholder template is also relied on verbatim by
 *  tests/core/core-01.test.ts's "fountain output contains title and scene
 *  headers" check, which is outside this wave's file ownership). */
function sceneSlug(commit: StoryCommit): string {
  const relocationFact = commit.ops.find(
    (o): o is Extract<StoryOp, { op: 'ADD_FACT' }> => o.op === 'ADD_FACT' && o.fact.predicate === 'moves_to',
  );
  if (relocationFact) {
    return `INT. ${relocationFact.fact.object.toUpperCase()} — SCENE ${commit.sceneIdx + 1}`;
  }
  return `INT. SCENE ${commit.sceneIdx} - CONTINUOUS`;
}

/** Renders one StoryOp to zero or more raw Fountain lines (no trailing blank —
 *  the caller inserts that). `null`/`[]` means the op intentionally produces
 *  no visible text this wave (currently: an UPDATE_READER_STATE delta with no
 *  signal in either direction). Exhaustively switches over all 14 StoryOp
 *  kinds — StoryOp.ts's discriminated union makes an unhandled kind a
 *  compile-time error here, the same exhaustiveness discipline
 *  STORY_OP_KINDS/the dispatcher's assertNever arm already enforce. */
function renderFountainOp(op: StoryOp): string[] | null {
  switch (op.op) {
    case 'UPDATE_BELIEF':
      return [`\t\t\t${op.charId.toUpperCase()}`, `\t(believing) ${op.belief.proposition}`];

    case 'SHIFT_RELATIONSHIP':
      return [`The dynamic between ${op.pair[0]} and ${op.pair[1]} shifts — ${op.delta.reason}.`];

    case 'RECORD_VISUAL_FACT':
      return [op.fact.toUpperCase()];

    case 'RECORD_SONIC_FACT':
      // "(SOUND)" (unlike V.O./O.S./CONT'D) never matches fountain.ts's
      // character-cue regex, so this reliably parses as an action line
      // regardless of what precedes/follows it.
      return [`${op.fact.toUpperCase()} (SOUND)`];

    case 'ADD_FACT':
      if (op.fact.predicate === 'moves_to') {
        // Consumed by sceneSlug's heading above — narrate the arrival itself
        // rather than restating the raw fact a second time.
        return [`${capitalize(op.fact.subject)} arrives, and the world resettles around ${op.fact.object}.`];
      }
      // Deliberately comma-punctuated, not em-dash: detectSuspenseDelta counts
      // every em-dash/ellipsis in the scene toward its tension score (a
      // stylistic-density proxy, not a lexicon match), so a gratuitously
      // dashed sentence in an otherwise-neutral scene can nudge suspenseDelta
      // off zero for no craft reason. Measured: an em-dash here (and in
      // PAYOFF_SETUP below) flipped a genuinely neutral golden-story scene
      // from suspenseDelta 0 to +1 before this fix — see
      // tests/core/record-parity.test.ts's sign-agreement measurement.
      return [`${capitalize(op.fact.subject)} ${op.fact.predicate.replace(/[-_]/g, ' ')} ${op.fact.object}, plain and undeniable now.`];

    case 'EXPIRE_FACT':
      return [`Whatever "${cleanId(op.factId)}" once meant quietly stops being true.`];

    case 'APPRAISE_EMOTION':
      return [emotionBeat(op.charId, op.emotion.dominant)];

    case 'ADVANCE_OBJECT_ARC':
      return [`The ${cleanId(op.objectId)} is ${op.toState} now, visibly and unmistakably changed.`];

    case 'TRIGGER_RULE':
      return [`The ${cleanId(op.mechanismId)} shudders to life and does exactly what it was built to do.`];

    case 'SEED_CLUE':
      // Quoted phrase is what fountain-analyzer.ts's extractDistinctiveTokens
      // (QUOTE_RE) picks up for cross-scene clue-lifecycle tracking.
      return [`${carrierPhrase(op.carrier)} catches the eye: "${cleanId(op.clueId)}," small and easy to miss.`];

    case 'PAYOFF_SETUP':
      // Re-mentions the SAME quoted phrase a matching SEED_CLUE would have
      // rendered for the same id, so a real callback (not just co-designed
      // belief prose) can carry the payoff on the text-derived path too.
      // Comma-punctuated per the ADD_FACT comment above (em-dash density,
      // not just lexicon words, feeds detectSuspenseDelta).
      return [`There it is again: "${cleanId(op.setupId)}," exactly as it was seeded, and everything clicks into place.`];

    case 'RAISE_CLOCK':
      // "deadline"/"running out of time"/"final hour" are exact
      // DEADLINE_TERMS entries in fountain-analyzer.ts. Period-separated
      // (not em-dash) per the ADD_FACT comment above.
      return [`The deadline tightens. They are running out of time before the ${cleanId(op.clockId)} reaches its final hour.`];

    case 'ADVANCE_THEME_ARGUMENT':
      return themeArgumentLines(op.claimId, op.move);

    case 'UPDATE_READER_STATE': {
      const beat = readerStateBeat(op.delta);
      return beat ? [beat] : null;
    }
  }
}

// ── Per-target projectors ─────────────────────────────────────────────────────

function projectFountain(canon: Canon): Artifact {
  const lines: string[] = [
    `Title: ${canon.title ?? 'Untitled'}`,
    'Credit: Written by STORYMACHINE',
    '',
  ];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(sceneSlug(commit));
    lines.push('');
    for (const op of commit.ops) {
      const rendered = renderFountainOp(op);
      if (rendered && rendered.length > 0) {
        lines.push(...rendered);
        lines.push('');
      }
    }
  }
  return { target: 'fountain', content: lines.join('\n'), metadata: { scenes: canon.commits.length } };
}

function projectNovel(canon: Canon): Artifact {
  const paragraphs: string[] = [
    `# ${canon.title ?? 'Untitled'}`,
    '',
  ];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    paragraphs.push(`## Scene ${commit.sceneIdx}`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        paragraphs.push(`${op.charId} held this thought: _${op.belief.proposition}_.`);
      } else if (op.op === 'ADD_FACT') {
        paragraphs.push(`It was a fact: ${op.fact.subject} ${op.fact.predicate} ${op.fact.object}.`);
      } else if (op.op === 'APPRAISE_EMOTION') {
        paragraphs.push(`${op.charId} felt ${op.emotion.dominant} (intensity ${op.emotion.intensity}).`);
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        paragraphs.push(`Between ${op.pair[0]} and ${op.pair[1]}, something shifted — ${op.delta.reason}.`);
      } else if (op.op === 'SEED_CLUE') {
        paragraphs.push(`${carrierPhrase(op.carrier)} lingered, unremarked: "${cleanId(op.clueId)}."`);
      } else if (op.op === 'PAYOFF_SETUP') {
        paragraphs.push(`And there it was again — "${cleanId(op.setupId)}" — everything clicking into place at last.`);
      } else if (op.op === 'RAISE_CLOCK') {
        paragraphs.push(`Time was running out; the ${cleanId(op.clockId)} would not wait much longer.`);
      } else if (op.op === 'RECORD_VISUAL_FACT') {
        paragraphs.push(op.fact);
      } else if (op.op === 'RECORD_SONIC_FACT') {
        paragraphs.push(`A sound cut through everything: ${op.fact}.`);
      } else if (op.op === 'EXPIRE_FACT') {
        paragraphs.push(`Whatever "${cleanId(op.factId)}" once meant, it no longer held true.`);
      } else if (op.op === 'ADVANCE_OBJECT_ARC') {
        paragraphs.push(`The ${cleanId(op.objectId)} was ${op.toState} now, changed for good.`);
      } else if (op.op === 'TRIGGER_RULE') {
        paragraphs.push(`The ${cleanId(op.mechanismId)} did exactly what it was built to do.`);
      } else if (op.op === 'ADVANCE_THEME_ARGUMENT') {
        paragraphs.push(`The question of ${cleanId(op.claimId)} would not stay settled.`);
      } else if (op.op === 'UPDATE_READER_STATE') {
        const beat = readerStateBeat(op.delta);
        if (beat) paragraphs.push(beat);
      }
    }
    paragraphs.push('');
  }
  return { target: 'novel', content: paragraphs.join('\n'), metadata: { wordCount: paragraphs.join(' ').split(' ').length } };
}

function projectStage(canon: Canon): Artifact {
  const lines: string[] = [`PLAY: ${canon.title ?? 'Untitled'}`, ''];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(`--- ACT ${commit.sceneIdx + 1} ---`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        lines.push(`${op.charId.toUpperCase()}: [aside] ${op.belief.proposition}`);
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        lines.push(`[STAGE DIRECTION] ${op.pair[0]} and ${op.pair[1]} — ${op.delta.reason}`);
      } else if (op.op === 'APPRAISE_EMOTION') {
        lines.push(`[STAGE DIRECTION] ${emotionBeat(op.charId, op.emotion.dominant)}`);
      } else if (op.op === 'SEED_CLUE') {
        lines.push(`[STAGE DIRECTION] ${carrierPhrase(op.carrier)} is set in view: "${cleanId(op.clueId)}."`);
      } else if (op.op === 'PAYOFF_SETUP') {
        lines.push(`[STAGE DIRECTION] "${cleanId(op.setupId)}" is called back to, its purpose finally clear.`);
      } else if (op.op === 'RAISE_CLOCK') {
        lines.push(`[STAGE DIRECTION] The deadline tightens on the ${cleanId(op.clockId)} — running out of time.`);
      } else if (op.op === 'RECORD_VISUAL_FACT' || op.op === 'RECORD_SONIC_FACT') {
        lines.push(`[STAGE DIRECTION] ${op.fact}`);
      } else if (op.op === 'EXPIRE_FACT') {
        lines.push(`[STAGE DIRECTION] "${cleanId(op.factId)}" quietly stops being true.`);
      } else if (op.op === 'ADVANCE_OBJECT_ARC') {
        lines.push(`[STAGE DIRECTION] The ${cleanId(op.objectId)} is ${op.toState} now.`);
      } else if (op.op === 'TRIGGER_RULE') {
        lines.push(`[STAGE DIRECTION] The ${cleanId(op.mechanismId)} operates, visibly.`);
      } else if (op.op === 'ADVANCE_THEME_ARGUMENT') {
        lines.push(`VOICE A: ${capitalize(cleanId(op.claimId))}?`);
        lines.push(`VOICE B: [${op.move}]`);
      } else if (op.op === 'UPDATE_READER_STATE') {
        const beat = readerStateBeat(op.delta);
        if (beat) lines.push(`[STAGE DIRECTION] ${beat}`);
      }
    }
    lines.push('');
  }
  return { target: 'stage', content: lines.join('\n'), metadata: {} };
}

function projectComic(canon: Canon): Artifact {
  const panels: Array<{ scene: number; panel: number; caption: string; visual?: string }> = [];
  let panelN = 0;
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    for (const op of commit.ops) {
      panelN++;
      if (op.op === 'RECORD_VISUAL_FACT') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: op.fact, visual: 'FULL_BLEED' });
      } else if (op.op === 'UPDATE_BELIEF') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: `${op.charId} (thought): ${op.belief.proposition}` });
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: op.delta.reason });
      }
    }
  }
  return { target: 'comic', content: JSON.stringify(panels, null, 2), metadata: { panels: panels.length } };
}

function projectInteractive(canon: Canon): Artifact {
  // The Living Story — executable JSON that can be re-loaded and replayed
  const playbook = {
    title: canon.title ?? 'Untitled',
    version: 1,
    commits: canon.commits.filter(c => !c.reverted).map(c => ({
      sceneIdx: c.sceneIdx,
      ops: c.ops,
      deltaSummary: c.deltaSummary,
    })),
    finalState: {
      objectiveReality: canon.state.objectiveReality,
      characterBeliefs: canon.state.characterBeliefs,
      audienceState: canon.state.audienceState,
    },
  };
  return {
    target: 'interactive',
    content: JSON.stringify(playbook, null, 2),
    metadata: { replayable: true, commitCount: playbook.commits.length },
  };
}

function projectPitch(canon: Canon): Artifact {
  const chars = Object.keys(canon.state.characterBeliefs);
  const facts = canon.state.objectiveReality.length;
  const ironyCount = Object.values(canon.state.characterBeliefs)
    .flatMap(b => b)
    .filter(b => b.source === 'told').length;

  const lines = [
    `# ${canon.title ?? 'Untitled'} — Pitch`,
    '',
    `**Characters:** ${chars.join(', ') || 'TBD'}`,
    `**Objective facts:** ${facts}`,
    `**Dramatic irony layers:** ${ironyCount} false beliefs held by characters`,
    `**Audience tension:** ${canon.state.audienceState.suspense}/100 suspense`,
    '',
    '## Central Dramatic Question',
    canon.state.authorIntent.theme
      ? `Theme: "${canon.state.authorIntent.theme}"`
      : '(No theme declared — set authorIntent.theme)',
    '',
    '## Story in One Line',
    `A ${facts > 0 ? 'fact-grounded' : 'character-driven'} narrative across ${canon.commits.length} scene(s)` +
    (ironyCount > 0 ? `, with ${ironyCount} layer(s) of dramatic irony.` : '.'),
  ];
  return { target: 'pitch', content: lines.join('\n'), metadata: { charCount: chars.length } };
}

function projectBible(canon: Canon): Artifact {
  const chars = Object.entries(canon.state.characterBeliefs).map(([id, beliefs]) => ({
    id,
    beliefs: beliefs.length,
    emotion: canon.state.characterEmotions[id]?.dominant ?? 'unknown',
  }));
  const sections = [
    `# ${canon.title ?? 'Untitled'} — Story Bible`,
    '',
    '## Characters',
    ...chars.map(c => `- **${c.id}**: ${c.beliefs} beliefs, dominant emotion: ${c.emotion}`),
    '',
    '## World Facts',
    ...canon.state.objectiveReality.map(f => `- ${f.subject} ${f.predicate} ${f.object}`),
    '',
    '## Audience Intelligence',
    `- Known facts: ${canon.state.audienceState.knownFacts.join(', ') || 'none'}`,
    `- Suspense: ${canon.state.audienceState.suspense}/100`,
    '',
    '## Seeded Clues',
    ...canon.state.clues.map(c => `- clue: ${c.clueId} (${c.carrier})`),
    '',
    '## Open Payoffs',
    ...canon.state.payoffs.map(p => `- setup: ${p.setupId} → payoff: ${p.payoffEventId}`),
  ];
  return { target: 'bible', content: sections.join('\n'), metadata: {} };
}

function projectRewatch(canon: Canon): Artifact {
  // Annotated for second viewing: every commit gets an irony note
  const lines: string[] = [`# ${canon.title ?? 'Untitled'} — Rewatch Guide`, ''];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(`### Scene ${commit.sceneIdx}`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told') {
        lines.push(`⚠️  **Rewatch note:** ${op.charId} believes "${op.belief.proposition}" — this is a LIE planted by the narrative`);
      } else if (op.op === 'SEED_CLUE') {
        lines.push(`🔍 **Clue planted:** ${op.clueId} (${op.carrier}) — first-timers miss this`);
      }
    }
    lines.push('');
  }
  return { target: 'rewatch', content: lines.join('\n'), metadata: {} };
}

function projectCuttingRoom(canon: Canon): Artifact {
  const ghosts = canon.ghosts ?? [];
  const lines: string[] = [`# ${canon.title ?? 'Untitled'} — Cutting Room`, ''];
  if (ghosts.length === 0) {
    lines.push('(No ghost commits — nothing was rejected in this run)');
  } else {
    lines.push(`${ghosts.length} rejected candidate(s):`);
    for (const g of ghosts) {
      lines.push(`- Rejected (${g.reason}): ${JSON.stringify(g.ir).slice(0, 80)}…`);
    }
  }
  return { target: 'cutting_room', content: lines.join('\n'), metadata: { ghosts: ghosts.length } };
}

function projectSidecar(canon: Canon): Artifact {
  const sidecar = buildSidecar(canon);
  return {
    target: 'sidecar',
    content: JSON.stringify(sidecar, null, 2),
    metadata: {
      qualityScore: sidecar.qualityScore,
      totalTension: sidecar.totalTension,
      proppCoverage: sidecar.proppCoverage,
      momentum: sidecar.momentum,
    },
  };
}

// ── Six new targets (Output Syntax matrix) ────────────────────────────────────
// Wave: Output Syntax expansion. Every target below is a real professional
// document format, not a debug dump, and every one reuses the per-op craft
// vocabulary already established by renderFountainOp/emotionBeat/carrierPhrase/
// cleanId/themeArgumentLines/readerStateBeat above rather than duplicating it —
// each target simply recombines those primitives at a different "altitude"
// (treatment prose, beat-sheet line, pure dialogue, first-person document,
// neutral ledger line, meta-commentary paragraph).

/** Which charIds an op "touches" — the shared signal used both to find a
 *  scene's/canon's dominant/protagonist character (epistolary POV, treatment
 *  logline) and nothing else. Ops with no character (ADD_FACT, SEED_CLUE, …)
 *  contribute no ids, which is correct: they don't belong to anyone's POV. */
function opCharIds(op: StoryOp): string[] {
  switch (op.op) {
    case 'UPDATE_BELIEF':      return [op.charId];
    case 'APPRAISE_EMOTION':   return [op.charId];
    case 'SHIFT_RELATIONSHIP': return [op.pair[0], op.pair[1]];
    default:                   return [];
  }
}

/** The character whose charId is touched by the most ops in a set — ties break
 *  toward whichever id was seen first. Returns null when no op in the set
 *  touches any character (e.g. a scene made only of facts/clues/clocks). */
function dominantCharacterOf(ops: StoryOp[]): string | null {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const op of ops) {
    for (const id of opCharIds(op)) {
      if (!counts.has(id)) { counts.set(id, 0); order.push(id); }
      counts.set(id, counts.get(id)! + 1);
    }
  }
  if (order.length === 0) return null;
  let best = order[0];
  for (const id of order) {
    if (counts.get(id)! > counts.get(best)!) best = id;
  }
  return best;
}

/** Same tally, across every non-reverted commit in the canon — the "who is
 *  this story actually about" signal the treatment's logline is built from. */
function protagonistOf(canon: Canon): string | null {
  const allOps = canon.commits.filter(c => !c.reverted).flatMap(c => c.ops);
  return dominantCharacterOf(allOps);
}

/** Logline: protagonist + want (their first stated belief) + opposition (the
 *  first character a negative-valence relationship shift pits them against).
 *  Never returns an empty string — falls back to a still-true generic line
 *  when the canon carries no character ops at all (empty commits, or a canon
 *  made only of facts/clues). */
function deriveLogline(canon: Canon): string {
  const protagonist = protagonistOf(canon);
  if (!protagonist) {
    return 'A story unfolds, its central figure yet to declare themselves.';
  }
  const name = capitalize(protagonist);
  let want: string | null = null;
  let opposition: string | null = null;
  const NEGATIVE_DIMENSIONS = new Set(['resentment', 'fear', 'contempt', 'guilt']);
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    for (const op of commit.ops) {
      if (want === null && op.op === 'UPDATE_BELIEF' && op.charId === protagonist) {
        want = op.belief.proposition;
      }
      if (opposition === null && op.op === 'SHIFT_RELATIONSHIP' && op.pair.includes(protagonist)) {
        const other = op.pair[0] === protagonist ? op.pair[1] : op.pair[0];
        if (op.delta.amount < 0 || NEGATIVE_DIMENSIONS.has(op.delta.dimension)) {
          opposition = capitalize(other);
        }
      }
    }
  }
  const wantClause = want
    ? `driven by the conviction that ${want.charAt(0).toLowerCase()}${want.slice(1)}`
    : 'driven by a conviction they cannot quite shake';
  const oppositionClause = opposition
    ? `against the mounting resistance of ${opposition}`
    : 'against a world that will not yield easily';
  return `${name}, ${wantClause}, must contend ${oppositionClause}.`;
}

/** Closing "where the story stands" paragraph: theme argument state, open
 *  (un-paid-off) clues, and clocks still actively running. Every clause has a
 *  non-empty fallback so an empty/early canon still reads as a complete
 *  (if uneventful) closing paragraph rather than a blank line. */
function deriveClosingState(canon: Canon): string {
  const theme = canon.state.authorIntent.theme;
  const openClues = canon.state.clues.filter(c => !canon.state.payoffs.some(p => p.setupId === c.clueId));
  const activeClocks = Object.entries(canon.state.clocks).filter(([, amount]) => amount > 0);
  const parts: string[] = [];
  parts.push(theme
    ? `The story still argues its case: "${theme}."`
    : 'The story has yet to declare its argument outright.');
  parts.push(openClues.length > 0
    ? `${openClues.length} clue${openClues.length === 1 ? '' : 's'} remain${openClues.length === 1 ? 's' : ''} unresolved — ${openClues.map(c => cleanId(c.clueId)).join(', ')}.`
    : 'No clue is left dangling.');
  parts.push(activeClocks.length > 0
    ? `Time is still running out on ${activeClocks.map(([id]) => cleanId(id)).join(', ')}.`
    : 'No clock presses on what remains.');
  return parts.join(' ');
}

/** One treatment-altitude sentence per op: what happens, and (for the ops
 *  that carry narrative weight — clues, payoffs, clocks, theme, relationship,
 *  belief) an explicit clause on why it matters. Exhaustive over all 14
 *  StoryOp kinds, same discipline as renderFountainOp. Returns null only for
 *  an UPDATE_READER_STATE delta with no signal (mirrors readerStateBeat). */
function treatmentOpSentence(op: StoryOp): string | null {
  switch (op.op) {
    case 'ADD_FACT':
      if (op.fact.predicate === 'moves_to') {
        return `${capitalize(op.fact.subject)} arrives at ${op.fact.object}, resetting the ground the story stands on.`;
      }
      return `It becomes true that ${op.fact.subject} ${op.fact.predicate.replace(/[-_]/g, ' ')} ${op.fact.object} — a fact the rest of the story now has to live with.`;
    case 'EXPIRE_FACT':
      return `What was once true about "${cleanId(op.factId)}" quietly stops holding — the ground shifts under everyone who believed it.`;
    case 'UPDATE_BELIEF':
      return `${capitalize(op.charId)} comes to believe ${op.belief.proposition}${op.belief.source === 'told' ? ', though it was only ever told to them' : ''} — a conviction that will shape what they do next.`;
    case 'APPRAISE_EMOTION':
      return `${emotionBeat(op.charId, op.emotion.dominant)} It matters because feeling shapes what comes next.`;
    case 'SHIFT_RELATIONSHIP':
      return `Between ${capitalize(op.pair[0])} and ${capitalize(op.pair[1])}, something shifts — ${op.delta.reason} — and neither will treat the other quite the same again.`;
    case 'ADVANCE_OBJECT_ARC':
      return `The ${cleanId(op.objectId)} is ${op.toState} now, and its changed state will matter later.`;
    case 'TRIGGER_RULE':
      return `The ${cleanId(op.mechanismId)} fires, doing exactly what it was built to do — the story's machinery made visible.`;
    case 'SEED_CLUE':
      return `${carrierPhrase(op.carrier)} is planted here — "${cleanId(op.clueId)}" — small enough to miss, but it will matter.`;
    case 'PAYOFF_SETUP':
      return `What was seeded as "${cleanId(op.setupId)}" pays off here, and the pieces the story has been quietly assembling click into place.`;
    case 'RAISE_CLOCK':
      return `The deadline on the ${cleanId(op.clockId)} tightens; time is running out, and everyone in the scene knows it.`;
    case 'ADVANCE_THEME_ARGUMENT':
      return `The story's argument about ${cleanId(op.claimId)} moves — this scene ${op.move}s the case, and the theme is no longer where it started.`;
    case 'UPDATE_READER_STATE': {
      const beat = readerStateBeat(op.delta);
      return beat ? `${beat} The audience's sense of what's coming shifts with it.` : null;
    }
    case 'RECORD_VISUAL_FACT':
      return `${capitalize(op.fact)}, plainly visible, and impossible to unsee.`;
    case 'RECORD_SONIC_FACT':
      return `A sound cuts through the scene — ${op.fact} — and no one can pretend not to have heard it.`;
  }
}

/** One prose paragraph per scene, dramatizing every op it carries. An
 *  ops-free scene still reads as a complete (if uneventful) paragraph rather
 *  than an empty line. */
function treatmentParagraph(commit: StoryCommit): string {
  const sentences = commit.ops.map(treatmentOpSentence).filter((s): s is string => s !== null);
  return sentences.length > 0
    ? sentences.join(' ')
    : 'The scene passes quietly, its consequences held for later.';
}

function projectTreatment(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const lines: string[] = [
    `TITLE: ${canon.title ?? 'Untitled'}`,
    'FORMAT: Treatment',
    '',
    'LOGLINE',
    deriveLogline(canon),
    '',
  ];
  for (const commit of commits) {
    lines.push(`Scene ${commit.sceneIdx + 1}.`);
    lines.push(treatmentParagraph(commit));
    lines.push('');
  }
  lines.push('WHERE THE STORY STANDS');
  lines.push(deriveClosingState(canon));
  return { target: 'treatment', content: lines.join('\n'), metadata: { scenes: commits.length } };
}

type BeatCategory = 'reversal' | 'revelation' | 'relationship' | 'clue' | 'escalation' | 'beat';

/** Generic one-line beat summary for the 8 op kinds that don't map to one of
 *  the 5 named beat categories below (they still need SOME summary text when
 *  they're the only op a scene carries). */
function genericBeatSummary(op: StoryOp): string {
  switch (op.op) {
    case 'ADD_FACT':
      return `A fact lands: ${op.fact.subject} ${op.fact.predicate.replace(/[-_]/g, ' ')} ${op.fact.object}.`;
    case 'APPRAISE_EMOTION':
      return `${capitalize(op.charId)}'s ${op.emotion.dominant} takes hold.`;
    case 'ADVANCE_OBJECT_ARC':
      return `The ${cleanId(op.objectId)} becomes ${op.toState}.`;
    case 'TRIGGER_RULE':
      return `The ${cleanId(op.mechanismId)} fires.`;
    case 'RECORD_VISUAL_FACT':
      return `${capitalize(op.fact)}.`;
    case 'RECORD_SONIC_FACT':
      return `A sound: ${op.fact}.`;
    case 'ADVANCE_THEME_ARGUMENT':
      return `The story ${op.move}s its case about "${cleanId(op.claimId)}."`;
    case 'UPDATE_READER_STATE':
      return readerStateBeat(op.delta) ?? '(A quiet beat.)';
    default:
      return '(A beat.)';
  }
}

/** The dominant op (by the priority the wave spec fixes: reversal > revelation
 *  > relationship shift > clue > escalation) determines the one-line beat
 *  summary for the scene; a scene with none of those 5 falls back to
 *  summarizing whatever its first op is (or "(No events this scene.)" for an
 *  ops-free scene). */
function beatCategoryAndSummary(commit: StoryCommit): { category: BeatCategory; summary: string } {
  const ops = commit.ops;

  const reversalOp = ops.find(o =>
    o.op === 'EXPIRE_FACT' ||
    (o.op === 'ADVANCE_THEME_ARGUMENT' && (o.move === 'attack' || o.move === 'undercut')));
  if (reversalOp) {
    if (reversalOp.op === 'EXPIRE_FACT') {
      return { category: 'reversal', summary: `What was true about "${cleanId(reversalOp.factId)}" no longer holds.` };
    }
    const themeOp = reversalOp as Extract<StoryOp, { op: 'ADVANCE_THEME_ARGUMENT' }>;
    return { category: 'reversal', summary: `The case for "${cleanId(themeOp.claimId)}" turns — the argument is ${themeOp.move}ed.` };
  }

  const revelationOp = ops.find(o => o.op === 'PAYOFF_SETUP' || o.op === 'UPDATE_BELIEF');
  if (revelationOp) {
    if (revelationOp.op === 'PAYOFF_SETUP') {
      return { category: 'revelation', summary: `"${cleanId(revelationOp.setupId)}" pays off — the pieces click into place.` };
    }
    const beliefOp = revelationOp as Extract<StoryOp, { op: 'UPDATE_BELIEF' }>;
    return { category: 'revelation', summary: `${capitalize(beliefOp.charId)} realizes: ${beliefOp.belief.proposition}` };
  }

  const relOp = ops.find((o): o is Extract<StoryOp, { op: 'SHIFT_RELATIONSHIP' }> => o.op === 'SHIFT_RELATIONSHIP');
  if (relOp) {
    return { category: 'relationship', summary: `${capitalize(relOp.pair[0])} and ${capitalize(relOp.pair[1])} — ${relOp.delta.reason}.` };
  }

  const clueOp = ops.find((o): o is Extract<StoryOp, { op: 'SEED_CLUE' }> => o.op === 'SEED_CLUE');
  if (clueOp) {
    return { category: 'clue', summary: `A clue is planted: "${cleanId(clueOp.clueId)}."` };
  }

  const clockOp = ops.find((o): o is Extract<StoryOp, { op: 'RAISE_CLOCK' }> => o.op === 'RAISE_CLOCK');
  if (clockOp) {
    return { category: 'escalation', summary: `The pressure rises on the ${cleanId(clockOp.clockId)} — running out of time.` };
  }

  const first = ops[0];
  if (!first) return { category: 'beat', summary: '(No events this scene.)' };
  return { category: 'beat', summary: genericBeatSummary(first) };
}

/** [SETUP]/[PAYOFF]/[CLOCK]/[TURN] annotations from whichever of those op
 *  kinds the scene carries — independent of, and possibly in addition to, the
 *  dominant-op summary above (a scene can be dominantly a "relationship"
 *  beat and still carry a clue seed, which still deserves its [SETUP] tag). */
function beatAnnotations(ops: StoryOp[]): string {
  const tags: string[] = [];
  if (ops.some(o => o.op === 'SEED_CLUE')) tags.push('[SETUP]');
  if (ops.some(o => o.op === 'PAYOFF_SETUP')) tags.push('[PAYOFF]');
  if (ops.some(o => o.op === 'RAISE_CLOCK')) tags.push('[CLOCK]');
  if (ops.some(o => o.op === 'ADVANCE_THEME_ARGUMENT')) tags.push('[TURN]');
  return tags.join(' ');
}

function projectOutline(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const n = commits.length;
  const lines: string[] = [`OUTLINE: ${canon.title ?? 'Untitled'}`, ''];
  if (n === 0) {
    lines.push('(No scenes committed yet.)');
    return { target: 'outline', content: lines.join('\n'), metadata: { scenes: 0 } };
  }
  // Act-break convention mirrors compile.ts's injectActBreaks (25%/50%/75% of
  // scene count) — the same headroom guard (n < 4 → no markers, too short to
  // meaningfully break into acts).
  const act2Start = n >= 4 ? Math.floor(n * 0.25) : -1;
  const midpoint  = n >= 4 ? Math.floor(n * 0.5)  : -1;
  const act3Start = n >= 4 ? Math.floor(n * 0.75) : -1;
  commits.forEach((commit, i) => {
    if (i === act2Start) lines.push('--- END OF ACT ONE ---');
    if (i === midpoint)  lines.push('--- MIDPOINT ---');
    if (i === act3Start) lines.push('--- END OF ACT TWO ---');
    const { summary } = beatCategoryAndSummary(commit);
    const tags = beatAnnotations(commit.ops);
    lines.push(`${i + 1}. ${summary}${tags ? ' ' + tags : ''}`);
  });
  return { target: 'outline', content: lines.join('\n'), metadata: { scenes: n } };
}

function projectDialogueOnly(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const lines: string[] = [`${canon.title ?? 'Untitled'} — TABLE READ DRAFT`, ''];
  for (const commit of commits) {
    lines.push(`SCENE ${commit.sceneIdx + 1}`);
    lines.push('');
    let hasDialogue = false;
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        lines.push(`\t\t\t${op.charId.toUpperCase()}`);
        lines.push(op.belief.proposition);
        lines.push('');
        hasDialogue = true;
      } else if (op.op === 'ADVANCE_THEME_ARGUMENT') {
        lines.push(...themeArgumentLines(op.claimId, op.move));
        lines.push('');
        hasDialogue = true;
      }
      // Every other op kind (action/visual/sonic/facts/clues/clocks/…) is
      // deliberately dropped — this target exists solely to let actors read
      // the spoken lines for voice testing.
    }
    if (!hasDialogue) lines.push('(No dialogue this scene.)', '');
  }
  return { target: 'dialogue_only', content: lines.join('\n'), metadata: { scenes: commits.length } };
}

/** SHIFT_RELATIONSHIP rendered as how the letter-writer addresses the other
 *  party — only fires when the dominant (POV) character is actually one side
 *  of the shift; a relationship shift between two OTHER characters isn't
 *  something this entry's writer would plausibly narrate in the first person. */
function relationshipAddressLine(pov: string, op: Extract<StoryOp, { op: 'SHIFT_RELATIONSHIP' }>): string | null {
  if (op.pair[0] !== pov && op.pair[1] !== pov) return null;
  const other = op.pair[0] === pov ? op.pair[1] : op.pair[0];
  return `To you, ${capitalize(other)}: something between us has shifted — ${op.delta.reason}. I am not sure either of us can pretend otherwise.`;
}

/** One scene as one document — letter/journal-entry-flavored, always in the
 *  first person of the scene's dominant (POV) character, date-stamped by
 *  sceneIdx. A scene with no POV character (only facts/clues/clocks, no
 *  UPDATE_BELIEF/APPRAISE_EMOTION/SHIFT_RELATIONSHIP) still produces a
 *  complete entry, narrated by an unnamed observer. */
function epistolaryEntry(commit: StoryCommit): string[] {
  const pov = dominantCharacterOf(commit.ops);
  const writer = pov ? capitalize(pov) : 'The Recorder';
  const body: string[] = [];
  for (const op of commit.ops) {
    if (op.op === 'UPDATE_BELIEF' && (pov === null || op.charId === pov)) {
      body.push(`I have come to believe ${op.belief.proposition}${op.belief.source === 'told' ? ', though I only have someone else’s word for it' : ''}.`);
    } else if (op.op === 'ADD_FACT') {
      body.push(op.fact.predicate === 'moves_to'
        ? `I arrived at ${op.fact.object} today.`
        : `I learned that ${op.fact.subject} ${op.fact.predicate.replace(/[-_]/g, ' ')} ${op.fact.object}.`);
    } else if (op.op === 'SHIFT_RELATIONSHIP' && pov !== null) {
      const addr = relationshipAddressLine(pov, op);
      if (addr) body.push(addr);
    } else if (op.op === 'APPRAISE_EMOTION' && (pov === null || op.charId === pov)) {
      body.push(`I felt ${op.emotion.dominant} today, more than I let on.`);
    } else if (op.op === 'SEED_CLUE') {
      body.push(`I noticed something I can't quite explain: ${cleanId(op.clueId)}.`);
    } else if (op.op === 'PAYOFF_SETUP') {
      body.push(`At last I understand "${cleanId(op.setupId)}" — it all makes sense now.`);
    } else if (op.op === 'RAISE_CLOCK') {
      body.push(`I am running out of time on ${cleanId(op.clockId)}.`);
    } else if (op.op === 'EXPIRE_FACT') {
      body.push(`What I once took as true about "${cleanId(op.factId)}" no longer holds.`);
    }
  }
  if (body.length === 0) body.push('Nothing worth recording happened today.');
  return [
    `ENTRY — DAY ${commit.sceneIdx + 1}`,
    'Dear journal,',
    '',
    ...body,
    '',
    `— ${writer}`,
    '',
  ];
}

function projectEpistolary(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const lines: string[] = [`${canon.title ?? 'Untitled'} — Collected Documents`, ''];
  for (const commit of commits) lines.push(...epistolaryEntry(commit));
  return { target: 'epistolary', content: lines.join('\n'), metadata: { entries: commits.length } };
}

/** One neutral, turn-indexed line per op — the Fabula view: exactly what
 *  happened, zero presentation spin. Turn-indexed by sceneIdx (not
 *  wall-clock), per spec. Exhaustive over all 14 StoryOp kinds. */
function simulationLogLine(turn: number, op: StoryOp): string {
  switch (op.op) {
    case 'ADD_FACT':
      return `TURN ${turn} · FACT: ${op.fact.subject} ${op.fact.predicate} ${op.fact.object}`;
    case 'EXPIRE_FACT':
      return `TURN ${turn} · FACT EXPIRED: ${op.factId}`;
    case 'UPDATE_BELIEF':
      return `TURN ${turn} · BELIEF: ${op.charId} -> "${op.belief.proposition}" (source: ${op.belief.source})`;
    case 'APPRAISE_EMOTION':
      return `TURN ${turn} · EMOTION: ${op.charId} = ${op.emotion.dominant} (intensity ${op.emotion.intensity})`;
    case 'SHIFT_RELATIONSHIP':
      return `TURN ${turn} · RELATIONSHIP: ${op.pair[0]}-${op.pair[1]} ${op.delta.dimension} ${op.delta.amount >= 0 ? '+' : ''}${op.delta.amount}`;
    case 'ADVANCE_OBJECT_ARC':
      return `TURN ${turn} · OBJECT: ${op.objectId} -> ${op.toState}`;
    case 'TRIGGER_RULE':
      return `TURN ${turn} · RULE FIRED: ${op.mechanismId}/${op.ruleId}`;
    case 'SEED_CLUE':
      return `TURN ${turn} · CLUE SEEDED: ${op.clueId} (${op.carrier})`;
    case 'PAYOFF_SETUP':
      return `TURN ${turn} · PAYOFF: ${op.setupId} -> ${op.payoffEventId}`;
    case 'RAISE_CLOCK':
      return `TURN ${turn} · CLOCK: ${op.clockId} +${op.amount}`;
    case 'ADVANCE_THEME_ARGUMENT':
      return `TURN ${turn} · THEME ARGUMENT: ${op.claimId} ${op.move}`;
    case 'UPDATE_READER_STATE': {
      const parts: string[] = [];
      if (op.delta.suspense)   parts.push(`suspense ${op.delta.suspense >= 0 ? '+' : ''}${op.delta.suspense}`);
      if (op.delta.curiosity)  parts.push(`curiosity ${op.delta.curiosity >= 0 ? '+' : ''}${op.delta.curiosity}`);
      if (op.delta.investment) parts.push(`investment ${op.delta.investment >= 0 ? '+' : ''}${op.delta.investment}`);
      if (op.delta.knownFact)  parts.push(`known: ${op.delta.knownFact}`);
      return `TURN ${turn} · READER STATE: ${parts.length > 0 ? parts.join(', ') : 'no change'}`;
    }
    case 'RECORD_VISUAL_FACT':
      return `TURN ${turn} · VISUAL: ${op.fact}`;
    case 'RECORD_SONIC_FACT':
      return `TURN ${turn} · SONIC: ${op.fact}`;
  }
}

function projectSimulationLog(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const lines: string[] = [`SIMULATION LOG: ${canon.title ?? 'Untitled'}`, ''];
  let entries = 0;
  for (const commit of commits) {
    for (const op of commit.ops) {
      lines.push(simulationLogLine(commit.sceneIdx, op));
      entries++;
    }
  }
  if (entries === 0) lines.push('(No ops recorded.)');
  return { target: 'simulation_log', content: lines.join('\n'), metadata: { entries } };
}

/** Per-scene director's-voice paragraph: what was planted, what paid off,
 *  where audience tension moved, what the theme argument did, and — the
 *  dramatic-irony beat — what the audience already knows that a character
 *  believing a `told` (i.e. lied-to) proposition does not. Reuses the same
 *  told-source signal projectRewatch already keys its irony notes off of. */
function projectDirectorCommentary(canon: Canon): Artifact {
  const commits = canon.commits.filter(c => !c.reverted);
  const lines: string[] = [`${canon.title ?? 'Untitled'} — Director's Commentary`, ''];
  for (const commit of commits) {
    const planted: string[] = [];
    const paidOff: string[] = [];
    const tensionMoves: string[] = [];
    const themeMoves: string[] = [];
    const irony: string[] = [];
    for (const op of commit.ops) {
      if (op.op === 'SEED_CLUE') planted.push(cleanId(op.clueId));
      if (op.op === 'PAYOFF_SETUP') paidOff.push(cleanId(op.setupId));
      if (op.op === 'UPDATE_READER_STATE') {
        const beat = readerStateBeat(op.delta);
        if (beat) tensionMoves.push(beat);
      }
      if (op.op === 'ADVANCE_THEME_ARGUMENT') themeMoves.push(`${op.move}s the claim that ${cleanId(op.claimId)}`);
      if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told') {
        irony.push(`${capitalize(op.charId)} believes "${op.belief.proposition}" without knowing it was only ever told to them`);
      }
    }
    const paragraph: string[] = [
      `Here's what's really happening under the surface of scene ${commit.sceneIdx + 1}.`,
    ];
    if (planted.length > 0) paragraph.push(`We're planting ${planted.join(', ')} here — the audience won't clock it yet, but it'll matter.`);
    if (paidOff.length > 0) paragraph.push(`This is where ${paidOff.join(', ')} pays off — everything we planted earlier clicks into place.`);
    if (tensionMoves.length > 0) paragraph.push(`Notice how the tension moves here: ${tensionMoves.join(' ')}`);
    if (themeMoves.length > 0) paragraph.push(`The theme is doing real work in this scene — the story ${themeMoves.join('; ')}.`);
    if (irony.length > 0) paragraph.push(`And here's the dramatic irony: ${irony.join('; ')} — the audience already knows better.`);
    if (planted.length === 0 && paidOff.length === 0 && tensionMoves.length === 0 && themeMoves.length === 0 && irony.length === 0) {
      paragraph.push('A quieter beat — no machinery visibly turning here, but it earns its place in the sequence.');
    }
    lines.push(`SCENE ${commit.sceneIdx + 1}.`, paragraph.join(' '), '');
  }
  return { target: 'director_commentary', content: lines.join('\n'), metadata: { scenes: commits.length } };
}
