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
  | 'sidecar';

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
