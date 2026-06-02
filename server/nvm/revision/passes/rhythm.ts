// Wave 137 — Pass 8: Rhythm/Prosody
// Checks sentence rhythm in action lines: monotonous sentence lengths,
// run-on action blocks, staccato beats that need expansion.
// Wave 137 additions: passive voice constructions, weak-verb chains.
// Wave 151 additions: camera-direction overreach (writer directing the lens),
// adverb clustering (lazy qualifier density in action lines), and
// over-description (introducing characters with >4 physical descriptors).

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
