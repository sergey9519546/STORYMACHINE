// Wave 137 — Pass 8: Rhythm/Prosody
// Checks sentence rhythm in action lines: monotonous sentence lengths,
// run-on action blocks, staccato beats that need expansion.
// Wave 137 additions: passive voice constructions, weak-verb chains.
// Wave 151 additions: camera-direction overreach (writer directing the lens),
// adverb clustering (lazy qualifier density in action lines), and
// over-description (introducing characters with >4 physical descriptors).
// Wave 263 additions: question in action (rhetorical '?' breaks cinematic
// objectivity), simile excess (≥3 simile markers — literary register intrusion),
// color absence (no color word in 12+ action lines — monochrome visual world).
// Wave 277 additions: body-part overload (>40% of action lines fixate on isolated
// body parts), single-sentence flood (all 12+ action lines are exactly one
// sentence — no multi-clause variation), ellipsis chain (≥3 action lines trail
// off with '...' — prose avoids committing to a definitive description).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract action lines (non-dialogue, non-slug, non-transition) from fountain */
function extractActionLines(fountain: string): Array<{ text: string; lineNum: number }> {
  const lines = fountain.split('\n');
  const action: Array<{ text: string; lineNum: number }> = [];
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { skipNext = false; continue; }

    // Sluglines, transitions, character cues, parentheticals
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|CUT TO|FADE|SMASH|THE END)/i.test(line)) continue;
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(line)) { skipNext = true; continue; }
    if (skipNext) { skipNext = false; continue; } // dialogue line after character cue
    if (line.startsWith('(') && line.endsWith(')')) continue; // parenthetical
    if (line.startsWith('>') || line.startsWith('/*') || line.startsWith('//')) continue;

    action.push({ text: line, lineNum: i + 1 });
  }
  return action;
}

// ── Passive voice constructions (agentless) common in weak screenplay action ──
// These are high-precision patterns: all are genuine passive constructions where
// the subject receives action instead of performing it.
const PASSIVE_VOICE_PHRASES: readonly string[] = [
  'is seen', 'is heard', 'is found', 'is shown', 'is revealed', 'is discovered',
  'is opened', 'is closed', 'is broken', 'is given', 'is taken', 'is placed',
  'was seen', 'was heard', 'was found', 'was shown', 'was revealed', 'was discovered',
  'was opened', 'was closed', 'was broken', 'was given', 'was taken', 'was placed',
  'was killed', 'was shot', 'was hit', 'was thrown', 'was pushed', 'was pulled',
  'was grabbed', 'was locked', 'was told', 'was left', 'was sent', 'was made',
  'was brought', 'was carried', 'was dragged', 'was dropped', 'was led',
];

// ── Weak-verb-chain: auxiliary steps that bury the real action ─────────────
const WEAK_VERB_CHAIN_RE = /\b(started? to|began? to|continued to|went on to|proceeded to|was about to|seemed to be|tried to)\s+\w+/i;

/** Count sentences in a line (rough: split on . ! ?) */
function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) ?? []).length || 1;
}

/** Count words in a line */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export async function rhythmPass(input: PassInput): Promise<PassResult> {
  const { fountain, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const actionLines = extractActionLines(fountain);
  if (actionLines.length < 4) {
    return {
      pass: 'rhythm',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Rhythm pass: too few action lines to evaluate',
    };
  }

  const wordCounts = actionLines.map(l => countWords(l.text));
  const avgWords = wordCounts.reduce((s, v) => s + v, 0) / wordCounts.length;

  // ── Monotonous rhythm: all lines within 30% of average ───────────────────
  const varied = wordCounts.filter(w => Math.abs(w - avgWords) > avgWords * 0.3).length;
  if (varied < wordCounts.length * 0.2 && actionLines.length >= 8) {
    issues.push({
      location: 'Action lines throughout',
      rule: 'MONOTONOUS_RHYTHM',
      description: `Action lines are rhythmically uniform (avg ${Math.round(avgWords)} words, <20% variation) — prose lacks pulse`,
      severity: 'minor',
      suggestedFix: 'Mix very short sentences (impact) with longer ones (expansion) to create rhythmic contrast',
    });
  }

  // ── Run-on action block: >5 consecutive long lines ────────────────────────
  let longStreak = 0;
  let streakStartLine = 0;
  for (const line of actionLines) {
    if (countWords(line.text) > 20) {
      if (longStreak === 0) streakStartLine = line.lineNum;
      longStreak++;
      if (longStreak === 5) {
        issues.push({
          location: `Lines ~${streakStartLine}–${line.lineNum}`,
          rule: 'RUN_ON_ACTION',
          description: '5+ consecutive long action lines (>20 words each) — the scene reads as dense prose, not screenplay',
          severity: 'major',
          suggestedFix: 'Break long action blocks with white space, one-word lines, or visual beat separators',
        });
        // Do not reset — let streak grow past 5 without re-firing for the same run
      }
    } else {
      longStreak = 0;
    }
  }

  // ── Staccato: >4 consecutive very short lines ─────────────────────────────
  let shortStreak = 0;
  let shortStart = 0;
  for (const line of actionLines) {
    if (countWords(line.text) <= 4) {
      if (shortStreak === 0) shortStart = line.lineNum;
      shortStreak++;
      if (shortStreak === 4) {
        issues.push({
          location: `Lines ~${shortStart}–${line.lineNum}`,
          rule: 'STACCATO_FRAGMENTATION',
          description: '4+ consecutive very short action lines (≤4 words) — prose feels telegraphic without tension payoff',
          severity: 'minor',
          suggestedFix: 'Expand at least one fragment into a full beat that grounds the reader in the scene',
        });
        // Do not reset — let streak grow past 4 without re-firing for the same run
      }
    } else {
      shortStreak = 0;
    }
  }

  // ── Passive voice: agentless constructions dilute cinematic drive ─────────
  // Only fire when there are ≥3 passive constructions — an occasional passive is
  // valid (e.g. "was born") but repeated use removes the active subject.
  const passiveMatches: Array<{ lineNum: number; phrase: string }> = [];
  for (const line of actionLines) {
    const lower = line.text.toLowerCase();
    for (const phrase of PASSIVE_VOICE_PHRASES) {
      if (lower.includes(phrase)) {
        passiveMatches.push({ lineNum: line.lineNum, phrase });
        break; // one match per line is enough
      }
    }
  }
  if (passiveMatches.length >= 3) {
    issues.push({
      location: `Lines ${passiveMatches[0].lineNum}, ${passiveMatches[1].lineNum}, ${passiveMatches[2].lineNum}…`,
      rule: 'PASSIVE_VOICE_OVERUSE',
      description: `${passiveMatches.length} action lines use agentless passive constructions ("${passiveMatches[0].phrase}", …) — cinematic action requires active subjects`,
      severity: 'minor',
      suggestedFix: 'Rewrite: "The door was opened" → "Alice kicked the door open". Put the agent first and use an active verb',
    });
  }

  // ── Weak-verb chains: "started to run", "began to speak" ─────────────────
  const weakChainLines: number[] = [];
  for (const line of actionLines) {
    if (WEAK_VERB_CHAIN_RE.test(line.text)) weakChainLines.push(line.lineNum);
  }
  if (weakChainLines.length >= 2) {
    issues.push({
      location: `Lines ${weakChainLines.slice(0, 3).join(', ')}`,
      rule: 'WEAK_VERB_CHAIN',
      description: `${weakChainLines.length} action lines use weak auxiliary chains ("started to", "began to", "continued to") — bury the real verb and slow the scene`,
      severity: 'minor',
      suggestedFix: 'Replace "started to run" with "ran"; "began to speak" with "spoke" — use the root verb directly',
    });
  }

  // ── Wave 151: Camera-direction, adverb clustering, over-description ──────────

  // CAMERA_DIRECTION_OVERREACH: Writers directing the camera in action lines
  // ("we see", "the camera", "close on", "cut to", "pull back to reveal") — this
  // is the director's job. Spec scripts that over-direct read as amateur.
  const cameraDirectionRe = /\b(we see|we hear|we follow|the camera|close on|close up|cut to|pull back|track (in|out|with)|camera (?:moves|pans|tilts|pushes|pulls|reveals|shows)|p\.o\.v\.|point of view|tight on|wide on|reveal\s+that)\b/i;
  let cameraCount = 0;
  for (const line of actionLines) {
    if (cameraDirectionRe.test(line.text) && cameraCount < 3) {
      cameraCount++;
      if (cameraCount === 2) {
        // Fire once when we hit 2+ instances
        issues.push({
          location: `Line ${line.lineNum}`,
          rule: 'CAMERA_DIRECTION_OVERREACH',
          description: `Action lines direct the camera ${cameraCount}+ times ("we see", "close on", "the camera moves", etc.) — spec screenplays should describe what happens, not how to shoot it`,
          severity: 'minor',
          suggestedFix: 'Remove camera directions. Describe the physical world and action directly: "She closes her eyes" not "Close on her eyes as they close"',
        });
      }
    }
  }

  // ADVERB_CLUSTERING: Action lines dense with adverbs (-ly words) indicate
  // weak verbs propped up by qualifiers. A concentrated adverb count is a tell.
  // We flag any action line with 3+ adverbs — the verb is doing no work.
  const adverbRe = /\b\w+ly\b/gi;
  let adverbFlagCount = 0;
  for (const line of actionLines) {
    const adverbs = line.text.match(adverbRe) ?? [];
    if (adverbs.length >= 3 && adverbFlagCount < 2) {
      adverbFlagCount++;
      issues.push({
        location: `Line ${line.lineNum}`,
        rule: 'ADVERB_CLUSTERING',
        description: `Action line has ${adverbs.length} adverbs: "${adverbs.join('", "')}" — adverb clusters signal weak verbs propped up by qualifiers`,
        severity: 'minor',
        suggestedFix: `Replace the weak verb + adverb with a single precise verb. "Runs quickly" → "Sprints". "Speaks softly" → "Whispers".`,
      });
    }
  }

  // OVER_DESCRIPTION: An action line introducing a character with 4+ physical
  // adjectives or descriptors signals style-sheet over-writing. The reader gets
  // a catalogue instead of a specific, telling image.
  // We detect this by looking for lines with 4+ adjectives describing a person.
  const adjRe = /\b(tall|short|thin|fat|lean|heavy|broad|slender|stocky|muscular|frail|young|old|middle-aged|dark|fair|pale|tan|tanned|weathered|handsome|beautiful|ugly|plain|sharp|soft|hard|angular|round|tired|alert|nervous|calm|serious|intense|gentle|fierce|cold|warm|wild|controlled|elegant|rough|smooth|scarred|battered|groomed|unkempt)\b/gi;
  for (let i = 0; i < actionLines.length; i++) {
    const line = actionLines[i];
    const adjMatches = line.text.match(adjRe) ?? [];
    // Only fire for lines that seem to describe a person (contain a name-like pattern or "A MAN/WOMAN")
    if (adjMatches.length >= 4 && /\b(man|woman|person|figure|character|he|she|detective|agent|officer|doctor|doctor|nurse|soldier|cop)\b/i.test(line.text)) {
      issues.push({
        location: `Line ${line.lineNum}`,
        rule: 'OVER_DESCRIPTION',
        description: `Line introduces a character with ${adjMatches.length} physical adjectives: "${adjMatches.join('", "')}" — an inventory of traits instead of one telling image`,
        severity: 'minor',
        suggestedFix: 'Cut to one or two specific, unexpected details that do more work than a list. What single image makes this person unforgettable?',
      });
      break; // one flag per pass
    }
  }

  // ── Wave 170: Opening-word repetition, sensory imbalance, near-word repeat ──

  // OPENING_WORD_REPETITION: More than 40% of action lines begin with the same
  // word. A screenplay where nearly half the lines start with "He" or "She" or
  // "The" reads as repetitive at the sentence level, not just in content.
  if (actionLines.length >= 8) {
    const firstWords = new Map<string, number>();
    for (const line of actionLines) {
      const first = (line.text.split(/\s+/)[0] ?? '').toLowerCase();
      if (first) firstWords.set(first, (firstWords.get(first) ?? 0) + 1);
    }
    const [topWord, topCount] = [...firstWords.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    if (topCount / actionLines.length > 0.4) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'OPENING_WORD_REPETITION',
        description: `${topCount} of ${actionLines.length} action lines (${Math.round(topCount / actionLines.length * 100)}%) begin with "${topWord}" — the prose rhythm is anchored to a single sentence-opening pattern`,
        severity: 'minor',
        suggestedFix: 'Vary sentence openings: start some lines with the object, some with a location, some with a sound. "He walks to the door" → "The door takes two steps to reach."',
      });
    }
  }

  // SENSORY_IMBALANCE: 10+ action lines with no sound descriptors anywhere.
  // Great screenplay prose engages at least two senses — purely visual action
  // strips the cinematic world of its acoustic dimension.
  if (actionLines.length >= 10) {
    const soundWords = [
      'silence','silent','quiet','loud','deafening','faint','distant','snap','creak','rumble',
      'hiss','click','thud','slam','crack','whisper','roar','buzz','ring','drip','squeak',
      'screech','bang','boom','clatter','grunt','echo','muffled','rattle','scrape','tick',
      'whoosh','clang','chime','howl','moan','wail','shriek','murmur','clamor','din',
    ];
    const hasSoundLine = actionLines.some(l => {
      const lower = l.text.toLowerCase();
      return soundWords.some(w => lower.includes(w));
    });
    if (!hasSoundLine) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SENSORY_IMBALANCE',
        description: `${actionLines.length} action lines contain no sound descriptors — the screenplay world is purely visual. Film is also audio.`,
        severity: 'minor',
        suggestedFix: 'Add at least one sound cue to the action lines: a creak, silence, a distant hum, or a sharp click that anchors the audience in the acoustic space',
      });
    }
  }

  // NEAR_WORD_REPEAT: A content word (6+ letters, not a stopword) appears 4+
  // times within any 5-line window of action. Tight repetition in a small
  // area signals vocabulary strain — the writer is cycling the same word.
  if (actionLines.length >= 8) {
    const RHYTHM_STOPWORDS = new Set([
      'about','after','again','against','along','also','another','around','away','back',
      'before','between','beyond','could','every','first','going','having','itself','might',
      'never','nothing','other','place','really','still','their','there','these','those',
      'through','under','until','where','which','while','would','without','within',
    ]);
    const windowSize = 5;
    outer: for (let i = 0; i <= actionLines.length - windowSize; i++) {
      const windowLines = actionLines.slice(i, i + windowSize);
      const wordFreq = new Map<string, number>();
      for (const line of windowLines) {
        for (const raw of line.text.toLowerCase().split(/\W+/)) {
          if (raw.length >= 6 && !RHYTHM_STOPWORDS.has(raw)) {
            wordFreq.set(raw, (wordFreq.get(raw) ?? 0) + 1);
          }
        }
      }
      for (const [word, count] of wordFreq) {
        if (count >= 4) {
          issues.push({
            location: `Lines ${windowLines[0].lineNum}–${windowLines[windowLines.length - 1].lineNum}`,
            rule: 'NEAR_WORD_REPEAT',
            description: `"${word}" appears ${count} times within a ${windowSize}-line window — tight repetition of the same content word signals vocabulary strain`,
            severity: 'minor',
            suggestedFix: `Vary the vocabulary: replace 2-3 of the "${word}" occurrences with synonyms or rephrase the action to eliminate the repetition`,
          });
          break outer;
        }
      }
    }
  }

  // ── Wave 184: Abstract noun overload, filler gestures, gerund fragments ─────

  // ABSTRACT_NOUN_OVERLOAD: Action lines that name psychological states instead of
  // dramatising them through physical reality. A screenplay's action lines must
  // describe what is seen and heard — when more than 30% name an internal feeling
  // or abstract concept directly, the writing becomes novelistic.
  if (actionLines.length >= 8) {
    const abstractRe = /\b(feeling|feelings|thought|thoughts|emotion|emotions|mood|longing|desire|tension|anxiety|grief|regret|wonder|doubt|confusion|shame|guilt|despair|bitterness|sorrow|hatred|anguish|dread|yearning|nostalgia|melancholy|wistfulness|apprehension)\b/i;
    const abstractCount = actionLines.filter(l => abstractRe.test(l.text)).length;
    if (abstractCount / actionLines.length > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ABSTRACT_NOUN_OVERLOAD',
        description: `${abstractCount} of ${actionLines.length} action lines (${Math.round(abstractCount / actionLines.length * 100)}%) name psychological states directly (feeling, grief, longing, despair…). Action lines must show; they cannot tell.`,
        severity: 'minor',
        suggestedFix: 'Replace abstract nouns with concrete physical action: "She grips the letter until her knuckles whiten" instead of "She feels grief". Let the body carry the emotion.',
      });
    }
  }

  // FILLER_GESTURE_EXCESS: Overuse of content-free body gestures (nodding, shrugging,
  // sighing, fidgeting) that fill action lines without advancing story. When a story
  // relies on filler gestures for more than 20% of its action, the scenes have no
  // physical world — characters perform emotional semaphore in a vacuum.
  if (actionLines.length >= 8) {
    const fillerGestureRe = /\b(nods?|nodding|shrugs?|shrugging|sighs?|sighing|fidgets?|fidgeting|clears?\s+(?:his|her|their|a)\s+throat|shifts?\s+(?:uncomfortably|in\s+(?:his|her|their)\s+(?:seat|chair)))\b/i;
    const fillerCount = actionLines.filter(l => fillerGestureRe.test(l.text)).length;
    if (fillerCount >= 3 && fillerCount / actionLines.length > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'FILLER_GESTURE_EXCESS',
        description: `${fillerCount} action lines use content-free filler gestures (nods, shrugs, sighs, fidgets) — ${Math.round(fillerCount / actionLines.length * 100)}% of action is empty emotional semaphore with no physical world.`,
        severity: 'minor',
        suggestedFix: 'Replace filler gestures with specific physical actions that reveal character and place the reader in a concrete world. "He nods" tells nothing. "He lines up the shot glasses, one for each lie she told him" does.',
      });
    }
  }

  // GERUND_FRAGMENT_CHAIN: Action lines where more than 30% begin with a gerund
  // ("-ing" present participle as a sentence fragment). Occasional gerund openings
  // create economy and pace. When they dominate, the writing becomes a listicle
  // of disconnected actions — the narrative loses grammatical coherence.
  if (actionLines.length >= 8) {
    const gerundRe = /^[A-Z][a-z]*ing\b/;
    const gerundCount = actionLines.filter(l => gerundRe.test(l.text.trim())).length;
    if (gerundCount >= 4 && gerundCount / actionLines.length > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'GERUND_FRAGMENT_CHAIN',
        description: `${gerundCount} of ${actionLines.length} action lines (${Math.round(gerundCount / actionLines.length * 100)}%) begin with a gerund fragment (Walking… Reaching… Turning…). The screenplay substitutes fragments for active sentences.`,
        severity: 'minor',
        suggestedFix: 'Convert gerund fragments to active sentences with a subject: "Walking to the door" → "She crosses to the door". Reserve gerund fragments for single-beat impact moments, not as a default register.',
      });
    }
  }

  // ── Wave 207: Conjunction opener excess, then-chain, exclamation in action ──

  // CONJUNCTION_OPENER_EXCESS: More than 30% of action lines begin with a
  // coordinating conjunction (And, But, Or, So, Yet). An occasional conjunction-
  // opener creates emphasis; when they dominate, the action reads like a breathless
  // list or interior monologue rather than the cinematic present tense a screenplay
  // requires. Distinct from OPENING_WORD_REPETITION (any word at >40%): this
  // targets the coordinating-conjunction pattern specifically. Requires 8+ lines.
  if (actionLines.length >= 8) {
    const conjRe207 = /^(And|But|Or|So|Yet)\b/i;
    const conjCount207 = actionLines.filter(l => conjRe207.test(l.text.trim())).length;
    const conjRatio207 = conjCount207 / actionLines.length;
    if (conjRatio207 > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'CONJUNCTION_OPENER_EXCESS',
        severity: 'minor',
        description: `${conjCount207} of ${actionLines.length} action lines (${Math.round(conjRatio207 * 100)}%) begin with a coordinating conjunction (And, But, Or, So, Yet) — the action reads like a breathless list rather than present-tense cinematic description.`,
        suggestedFix: "Reserve conjunction openers for single moments of emphasis. 'But she hesitates.' works once; a scene where half the lines start with And/But/Or reads as literary exercise, not screenplay.",
      });
    }
  }

  // THEN_CHAIN: More than 25% of action lines begin with "Then" or "And then" —
  // the weakest narrative connector. "Then A. Then B. Then C." sequences events
  // without causality; the action feels like stage directions lifted from a
  // production report. Distinct from CONJUNCTION_OPENER_EXCESS (And/But/Or/So/Yet).
  // Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const thenRe207 = /^(Then|And then)\b/i;
    const thenCount207 = actionLines.filter(l => thenRe207.test(l.text.trim())).length;
    const thenRatio207 = thenCount207 / actionLines.length;
    if (thenRatio207 > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'THEN_CHAIN',
        severity: 'minor',
        description: `${thenCount207} of ${actionLines.length} action lines (${Math.round(thenRatio207 * 100)}%) begin with "Then" — sequencing without causality. "Then she runs. Then he follows." is a list of events, not a scene.`,
        suggestedFix: "Replace 'Then' with cause: instead of 'Then she turns,' write 'The sound makes her turn' or 'She can't hold still any longer.' Every beat should follow from the last because of something — not merely after it.",
      });
    }
  }

  // EXCLAMATION_IN_ACTION: Three or more action lines end with '!'. Exclamation
  // marks in action prose are a tell of over-writing: the screenplay annotates
  // that something is exciting instead of writing action that IS exciting. The
  // reader feels the writer's enthusiasm rather than the scene's tension. Distinct
  // from dialogue exclamation checks in voice.ts — this fires solely on action
  // description. Requires 8+ action lines.
  if (actionLines.length >= 8) {
    const exclCount207 = actionLines.filter(l => l.text.trim().endsWith('!')).length;
    if (exclCount207 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'EXCLAMATION_IN_ACTION',
        severity: 'minor',
        description: `${exclCount207} action lines end with '!' — the screenplay annotates excitement instead of writing it. Exclamation marks in action prose signal the writer's enthusiasm, not the scene's tension.`,
        suggestedFix: "Remove the exclamation marks and rewrite each line to make the action itself urgent: sharper verbs, shorter sentences, concrete physical consequence. 'He catches the pass!' → 'He catches it. Barely.'",
      });
    }
  }

  // ── Wave 221: Prose-cadence signal-processing — flow blocking, length ramp,
  //    intra-clause cadence. These treat the action-line word-count series as a signal
  //    and read its flow, trend, and internal punctuation rather than per-line features. ──

  // PROSE_RHYTHM_BLOCKING (minor): action-line lengths cross their mean in fewer than 25%
  // of transitions WHILE the variance is genuinely high — long and short lines are sorted
  // into blocks (a wall of long description, then a run of fragments) instead of alternating.
  // Distinct from MONOTONOUS_RHYTHM (which fires on LOW variance): here the variance is
  // healthy but the arrangement is blocked, so the page reads as slabs rather than a pulse.
  if (actionLines.length >= 8) {
    const cov221 = avgWords > 0 ? Math.sqrt(wordCounts.reduce((s, w) => s + (w - avgWords) ** 2, 0) / wordCounts.length) / avgWords : 0;
    let crossings221 = 0, transitions221 = 0, prevSign221 = 0;
    for (const w of wordCounts) {
      const sign221 = w > avgWords ? 1 : w < avgWords ? -1 : 0;
      if (sign221 !== 0) {
        if (prevSign221 !== 0) { transitions221++; if (sign221 !== prevSign221) crossings221++; }
        prevSign221 = sign221;
      }
    }
    const crossRate221 = transitions221 > 0 ? crossings221 / transitions221 : 1;
    if (cov221 >= 0.3 && transitions221 >= 6 && crossRate221 < 0.25) {
      issues.push({
        location: 'Action-line rhythm',
        rule: 'PROSE_RHYTHM_BLOCKING',
        severity: 'minor',
        description: `Action lines vary in length (coefficient ${cov221.toFixed(2)}) but cross their average in only ${Math.round(crossRate221 * 100)}% of transitions — long and short lines are sorted into blocks rather than alternated. The page reads as a slab of dense description followed by a slab of fragments, not as a pulse.`,
        suggestedFix: 'Interleave long and short action lines instead of grouping them: drop a one-beat fragment into the middle of a dense passage, and expand a single line within a run of staccato. Rhythm comes from frequent alternation, not from one long block of each.',
      });
    }
  }

  // PROSE_LENGTH_RAMP (minor): action-line length trends upward across the script (positive
  // normalised regression slope) — the description thickens as the story advances. As scenes
  // should quicken toward the climax, prose should tighten, not sprawl; a rising line-length
  // trend signals action writing that loses discipline and energy as it goes.
  if (actionLines.length >= 8) {
    const nW221 = wordCounts.length;
    const meanIdx221 = (nW221 - 1) / 2;
    let cov221b = 0, varIdx221 = 0;
    for (let i = 0; i < nW221; i++) {
      cov221b += (i - meanIdx221) * (wordCounts[i] - avgWords);
      varIdx221 += (i - meanIdx221) ** 2;
    }
    const slope221 = varIdx221 > 0 ? cov221b / varIdx221 : 0;
    const slopeNorm221 = avgWords > 0 ? slope221 / avgWords : 0;
    if (slopeNorm221 > 0.06) {
      issues.push({
        location: 'Action-line length trend',
        rule: 'PROSE_LENGTH_RAMP',
        severity: 'minor',
        description: `Action lines grow steadily longer across the script (normalised slope +${(slopeNorm221 * 100).toFixed(0)}% per line) — the description thickens as the story advances. Prose should tighten toward the climax, not sprawl; a rising length trend bleeds energy out of the action writing exactly where it should be sharpest.`,
        suggestedFix: 'Tighten the later action lines: as stakes rise, cut description to its sharpest verbs and shortest beats. The prose cadence should accelerate alongside the story, with the leanest writing reserved for the climax.',
      });
    }
  }

  // INTRACLAUSE_CADENCE_ABSENT (minor): the action lines are long enough to support internal
  // rhythm, yet almost none use a comma, dash, or semicolon to shape a breath mid-line. Every
  // line is a single flat clause. Internal punctuation is how prose controls caesura and pace
  // within a sentence; its total absence makes even varied-length lines read as a monotone.
  if (actionLines.length >= 10 && avgWords >= 9) {
    const internalPunctRe221 = /[,;]|--|—|–/;
    const cadencedLines221 = actionLines.filter(l => internalPunctRe221.test(l.text)).length;
    const cadenceRatio221 = cadencedLines221 / actionLines.length;
    if (cadenceRatio221 < 0.1) {
      issues.push({
        location: 'Action description',
        rule: 'INTRACLAUSE_CADENCE_ABSENT',
        severity: 'minor',
        description: `Only ${cadencedLines221} of ${actionLines.length} action lines use any internal punctuation (comma, dash, semicolon) despite averaging ${Math.round(avgWords)} words — nearly every line is a single unbroken clause. Without mid-line caesura the prose has no internal breath; it reads as a stack of flat declaratives regardless of length.`,
        suggestedFix: 'Shape breath within lines: use a comma to set up a beat before a turn ("He reaches the door, stops."), a dash for an interruption, a semicolon to weld two images. Internal punctuation is how action writing controls pace inside a sentence, not just between them.',
      });
    }
  }

  // ── Wave 235: Declarative pile, simultaneous-action absent, motion-verb overload ──

  // DECLARATIVE_PILE (minor, ≥10 lines): More than 70% of action lines are flat
  // declaratives — no internal punctuation (comma, dash, semicolon) and no
  // subordinating conjunction (when, while, until, before, after, because, although,
  // though, unless). Pure declaratives sequence events without temporal layering,
  // causality, or simultaneity. The action reads as a stage manager's beat list
  // rather than cinematic description. Distinct from INTRACLAUSE_CADENCE_ABSENT
  // (which fires on avg word count ≥ 9 with <10% punctuated lines): this fires
  // regardless of line length when the grammatical structure is uniformly flat.
  if (actionLines.length >= 10) {
    const subordRe235 = /\b(when|while|until|before|after|because|although|though|unless)\b/i;
    const internalPunct235 = /[,;]|--|—|–/;
    const flatCount235 = actionLines.filter(
      l => !internalPunct235.test(l.text) && !subordRe235.test(l.text),
    ).length;
    if (flatCount235 / actionLines.length > 0.7) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'DECLARATIVE_PILE',
        severity: 'minor',
        description: `${flatCount235} of ${actionLines.length} action lines (${Math.round(flatCount235 / actionLines.length * 100)}%) are flat declaratives with no internal punctuation and no subordinating clause. Pure declarative sequences ("She enters. He looks. She leaves.") have no temporal layering, no causality signal, and no simultaneity — the action reads as a beat list rather than cinematic prose.`,
        suggestedFix: "Introduce structural variety: \"As she opens the door, he rises.\" layers two actions. \"Before he can speak, she's gone.\" uses cause and sequence. \"He watches, unable to move.\" uses a comma and hanging modifier. Even one varied structure per page breaks the declarative monotone.",
      });
    }
  }

  // SIMULTANEOUS_ACTION_ABSENT (minor, ≥12 lines): No action line uses a
  // simultaneous-action marker ("while", "even as", "at the same time").
  // Simultaneity is a key visual grammar of film — two things happening at once
  // in the frame. A 12+-line scene where every action is strictly sequential
  // misses the spatial and temporal depth that makes description cinematic.
  // Distinct from DECLARATIVE_PILE (grammatical structure): this fires on the
  // semantic absence of simultaneous-action language even when grammar is varied.
  if (actionLines.length >= 12) {
    const simultRe235 = /\bwhile\b|\beven as\b|\bat the same time\b/i;
    const hasSimult235 = actionLines.some(l => simultRe235.test(l.text));
    if (!hasSimult235) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMULTANEOUS_ACTION_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no simultaneous-action language ("while", "even as", "at the same time") — every action is strictly sequential. Film captures two things happening at once in the frame; a scene with no simultaneity misses the visual layering that distinguishes screenplay from a prose sequence of events.`,
        suggestedFix: 'Add at least one simultaneous layer: "While he talks, she reads the room." or "Even as he smiles, his hands are shaking." Simultaneous action creates visual depth and reveals character through contradiction.',
      });
    }
  }

  // MOTION_VERB_OVERLOAD (minor, ≥8 lines): More than 50% of action lines are
  // dominated by locomotion verbs (walks, runs, enters, crosses, moves, turns,
  // approaches, steps, etc.). A scene built primarily around physical movement —
  // characters located and directed rather than experienced — is choreography,
  // not drama. Distinct from FILLER_GESTURE_EXCESS (small gestures like nods/
  // shrugs): this fires on large-scale locomotion verbs that position bodies in
  // space without grounding the reader in the emotional reality of the scene.
  if (actionLines.length >= 8) {
    const motionVerbRe235 = /\b(walks?|runs?|moves?|crosses?|enters?|exits?|goes|comes?|turns?|reaches?|steps?|approaches?|leaves?|follows?|leads?|rushes?|hurries?|strides?|races?)\b/i;
    const motionCount235 = actionLines.filter(l => motionVerbRe235.test(l.text)).length;
    if (motionCount235 / actionLines.length > 0.5) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'MOTION_VERB_OVERLOAD',
        severity: 'minor',
        description: `${motionCount235} of ${actionLines.length} action lines (${Math.round(motionCount235 / actionLines.length * 100)}%) are built around locomotion verbs (walks, enters, crosses, approaches…). The scene is choreography — characters are positioned and directed rather than experienced. Without emotional grounding, sensory texture, or world-building between the movements, the action reads like a blocking rehearsal script.`,
        suggestedFix: 'Balance motion with perception, emotion, and world detail: instead of three consecutive "walks/crosses/turns" lines, insert what the character notices, what the space costs them, or what the movement reveals. Movement gains meaning from the environment and inner life surrounding it.',
      });
    }
  }

  // ── Wave 249: Short line poverty, visual texture absent, spatial anchor absent ──

  // SHORT_LINE_POVERTY (minor, ≥12 action lines): Not a single action line is
  // ≤3 words — the prose has no punchy impact beats at all. Distinct from
  // STACCATO_FRAGMENTATION (which fires when there are TOO MANY consecutive
  // very-short lines): this fires when there are ZERO short lines, meaning the
  // screenwriter never used the single-word or two-word line as a dramatic tool.
  // "She runs. He falls. Bang." — the very short line is one of screenwriting's
  // most powerful instruments for landing a moment; its complete absence means
  // every beat gets equal weight, which means no beat gets weight at all.
  if (actionLines.length >= 12) {
    const hasShortLine249 = actionLines.some(l => countWords(l.text) <= 3);
    if (!hasShortLine249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SHORT_LINE_POVERTY',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no line of 3 words or fewer — the prose has no punchy impact beats. The very-short line is one of screenwriting's most powerful tools: "She stops." "He's gone." "Silence." When everything runs at similar length, nothing can land with maximum impact.`,
        suggestedFix: 'Introduce at least 2-3 impact lines of 1-3 words at your key dramatic beats. Not every action needs a full sentence. "She fires." — done. "Empty." — done. Short lines create a beat the reader cannot rush past.',
      });
    }
  }

  // VISUAL_TEXTURE_ABSENT (minor, ≥10 action lines): No action line contains a
  // texture or material descriptor (rough, smooth, worn, cracked, rusty, dusty,
  // tattered, stained, polished, weathered, gleaming, etc.). The visual world of
  // the screenplay has no tactile dimension — nothing has a surface. Tactile
  // adjectives are what make described objects feel real rather than generic;
  // their complete absence gives the visual world a catalogue-entry quality.
  if (actionLines.length >= 10) {
    const textureRe249 = /\b(rough|smooth|worn|cracked|rusty|dusty|tattered|stained|polished|weathered|gleaming|faded|scratched|dirty|grimy|shiny|damp|frayed|peeling|battered|chipped|spotless|pristine|scarred|pocked|matte|glossy|grainy|gritty|velvet|silky|coarse|brittle)\b/i;
    const hasTexture249 = actionLines.some(l => textureRe249.test(l.text));
    if (!hasTexture249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'VISUAL_TEXTURE_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no texture or material descriptor — the screenplay world has no tactile surface. Nothing is rough, worn, cracked, gleaming, or stained. Texture words are what make described objects feel real; their absence gives the visual world a blank, set-photograph quality.`,
        suggestedFix: 'Add at least 2-3 texture descriptors to the action: the worn armrest, the cracked plastic casing, the polished floor that reflects the overhead light. Texture is how the world tells the audience how old it is, how it has been used, and what it costs to be in it.',
      });
    }
  }

  // SPATIAL_ANCHOR_ABSENT (minor, ≥8 action lines): No action line contains a
  // spatial anchor phrase that locates action within a specific part of the scene
  // ("in the corner", "by the window", "at the table", "across the room",
  // "against the wall", "near the door", "through the hallway", "on the floor",
  // "behind the desk", "from above", "to the left", "overhead"). Without
  // spatial anchors, characters move through featureless space — the audience
  // cannot build a mental map of the scene's geography. Distinct from
  // LOCATION_MONOTONE (which fires when scenes are all in the same location):
  // this fires when WITHIN scenes there is no spatial grounding.
  if (actionLines.length >= 8) {
    const spatialRe249 = /\b(in the corner|by the window|at the table|across the room|against the wall|near the door|through the hall|on the floor|behind the desk|from above|to the left|to the right|overhead|in the doorway|on the stairs|beside the|in front of the|at the far end|in the centre|at the back|in the background)\b/i;
    const hasSpatial249 = actionLines.some(l => spatialRe249.test(l.text));
    if (!hasSpatial249) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SPATIAL_ANCHOR_ABSENT',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no spatial anchor phrase — characters move through featureless space. Without "across the room", "by the window", "against the wall", the audience cannot build a mental map of the scene's geography. Every action floats in an unlocated void.`,
        suggestedFix: 'Anchor each significant action to a specific part of the space: not "she crosses to him" but "she crosses to him at the far window." Spatial specificity is what turns an abstract description into a scene the audience can see.',
      });
    }
  }

  // ── Wave 263: Question in action, simile excess, color absence ──

  // QUESTION_IN_ACTION (minor, ≥8 lines): ≥2 action lines end with '?' — rhetorical
  // questions in action prose break the objective cinematic present tense. The camera
  // observes; it does not ask. Distinct from EXCLAMATION_IN_ACTION (wrong-energy marker).
  if (actionLines.length >= 8) {
    const questionCount263 = actionLines.filter(l => l.text.trim().endsWith('?')).length;
    if (questionCount263 >= 2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'QUESTION_IN_ACTION',
        severity: 'minor',
        description: `${questionCount263} action lines end with '?' — rhetorical questions in action prose break the objective cinematic present tense. The camera observes; it does not ask. "What does he want?" in an action line imports interior monologue or authorial musing into a form that must describe only what is seen and heard.`,
        suggestedFix: "Remove question marks from action prose. If the question is about character intent, dramatise it through behavior: instead of 'What is she looking for?' write 'She opens every drawer. Quickly. Not finding it.' Let the audience ask the question; the action only shows what is happening.",
      });
    }
  }

  // SIMILE_EXCESS (minor, ≥10 lines): ≥3 action lines contain simile markers
  // ("like a", "as if", "as though", "resembles") — simile is a prose fiction
  // technique that substitutes comparison for direct description. Screenplay
  // action should present the physical world as itself, not as something else.
  if (actionLines.length >= 10) {
    const simileRe263 = /\blike a\b|\bas if\b|\bas though\b|\bresembles\b/i;
    const simileCount263 = actionLines.filter(l => simileRe263.test(l.text)).length;
    if (simileCount263 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMILE_EXCESS',
        severity: 'minor',
        description: `${simileCount263} action lines use simile markers ("like a", "as if", "as though", "resembles") — simile is a prose fiction technique that substitutes comparison for direct description. Screenplay action lines must describe what is seen; repeated similes import a literary register that fights the concrete visual grammar of the form.`,
        suggestedFix: `Replace similes with specific, direct physical description. Instead of "he moves like a predator," write what is actually visible: "He keeps low. Watching the exits." The camera cannot shoot a simile; it can only shoot what is there.`,
      });
    }
  }

  // COLOR_ABSENCE (minor, ≥12 lines): No color word appears in the action
  // description — a 12+-line scene with no color information presents a monochrome
  // world, giving the director and production designer nothing to work from.
  // Distinct from VISUAL_TEXTURE_ABSENT (which fires on absence of tactile
  // surface descriptors).
  if (actionLines.length >= 12) {
    const colorRe263 = /\b(red|blue|green|yellow|orange|purple|violet|pink|brown|black|white|grey|gray|gold|silver|crimson|scarlet|cobalt|amber|ivory|ebony|beige|teal|azure|emerald|olive|tan|maroon|navy|khaki)\b/i;
    const hasColor263 = actionLines.some(l => colorRe263.test(l.text));
    if (!hasColor263) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COLOR_ABSENCE',
        severity: 'minor',
        description: `${actionLines.length} action lines contain no color reference — the visual world is rendered without color. Film is a visual medium; color is one of the cinematographer's primary expressive tools. A scene description with no color information presents a monochrome world and gives the director nothing to work from visually.`,
        suggestedFix: 'Introduce at least one color reference in the action: the red exit sign, the grey concrete walls, the yellow stain on the ceiling. Color is not decoration — it is the screenplay\'s instruction to the visual department about the emotional temperature of the scene.',
      });
    }
  }

  // ── Wave 277: Body-part overload, single-sentence flood, ellipsis chain ──────

  // BODY_PART_OVERLOAD (minor, ≥8 action lines): More than 40% of action lines
  // contain a body-part reference (hands, eyes, jaw, chest, fingers…). A scene
  // built primarily from isolated body-part movements has no spatial context — it
  // reads as a disconnected close-up reel. When the majority of action zooms to
  // body parts, characters become floating anatomy rather than people grounded in
  // a physical world. Distinct from OVER_DESCRIPTION (stacking adjectives on one
  // character intro) — this fires on the PROPORTION of body-part-centric action.
  if (actionLines.length >= 8) {
    const bodyPartRe277 = /\b(hand|hands|eye|eyes|face|arm|arms|leg|legs|foot|feet|finger|fingers|mouth|lip|lips|shoulder|shoulders|head|neck|chest|back|knee|knees|fist|fists|jaw|thumb|wrist|elbow|hip|hips|toe|toes|brow|brows|hair|cheek|cheeks|chin|throat|forehead|temple|temples)\b/i;
    const bodyPartCount277 = actionLines.filter(l => bodyPartRe277.test(l.text)).length;
    if (bodyPartCount277 / actionLines.length > 0.4) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'BODY_PART_OVERLOAD',
        severity: 'minor',
        description: `${bodyPartCount277} of ${actionLines.length} action lines (${Math.round(bodyPartCount277 / actionLines.length * 100)}%) centre on an isolated body part — the scene reads as a disconnected close-up reel. Characters become floating anatomy with no spatial context or physical world surrounding them.`,
        suggestedFix: 'Alternate body-part beats with spatial action, environmental detail, and cause-and-effect beats. "His jaw tightened" tells us little; "He looked at the contract, jaw tightening as he reached the clause at the bottom" places the body in the world.',
      });
    }
  }

  // SINGLE_SENTENCE_FLOOD (minor, ≥12 action lines, avgWords≥7): Every action
  // line is a single declarative sentence — no line contains more than one
  // sentence. Multi-sentence lines create rhythmic variety and temporal layering
  // within a beat. Their complete absence means the prose sounds identical at
  // every scale: short action and long action both end at the same grammatical
  // boundary. A single well-placed two-sentence line signals a different kind of
  // moment. Distinct from MONOTONOUS_RHYTHM (word-count uniformity) — this fires
  // on sentence-count uniformity, even when word counts vary.
  if (actionLines.length >= 12 && avgWords >= 7) {
    const multiSentCount277 = actionLines.filter(l => countSentences(l.text) > 1).length;
    if (multiSentCount277 === 0) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SINGLE_SENTENCE_FLOOD',
        severity: 'minor',
        description: `All ${actionLines.length} action lines are single-sentence — the prose has no multi-clause variation. When every beat ends at the same grammatical boundary, different types of moments receive identical structural weight. Multi-sentence action lines signal a different pace, a different complexity, or a held breath after an impact.`,
        suggestedFix: 'Introduce at least 2-3 two-sentence action lines at key moments: "She opens the file. Nothing makes sense." or "He stands. Three seconds. Four." A second sentence after the first creates a reaction beat built into the description.',
      });
    }
  }

  // ELLIPSIS_CHAIN (minor, ≥8 action lines): Three or more action lines end with
  // '...' — the screenplay trails into hesitation. An action line that does not
  // commit to describing what happens is not an action line: it is the author
  // leaving a blank. One trailing ellipsis can suggest ambient ambiguity; three
  // or more suggests the writer is avoiding the work of deciding what occurs.
  if (actionLines.length >= 8) {
    const ellipsisCount277 = actionLines.filter(l => l.text.trim().endsWith('...')).length;
    if (ellipsisCount277 >= 3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ELLIPSIS_CHAIN',
        severity: 'minor',
        description: `${ellipsisCount277} action lines end with '...' — the screenplay trails into hesitation. Action prose must describe what is seen and heard; an ellipsis-ended action line defers the description and leaves the audience (and the crew) with nothing. Three or more trailing ellipses indicate a pattern of avoidance.`,
        suggestedFix: "Commit to the action: replace each trailing ellipsis with a specific physical description of what is seen, heard, or done. If a beat is genuinely ambiguous, describe the visible surface: 'She looks at him. Something passes between them.' — the ambiguity is in the meaning, not the description.",
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'rhythm', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'rhythm',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Rhythm/prosody pass: prose rhythm is varied'
      : `Rhythm/prosody pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
