import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectExcellence } from '../../server/nvm/analyze/excellence-signals.ts';

function buildWantNeedOppositionScript(): string {
  return [
    'INT. APARTMENT - MORNING',
    '',
    'SARAH paces back and forth, phone in hand. She looks out at the city skyline below.',
    '',
    'SARAH',
    'I want to leave this city. I need to start fresh somewhere else, somewhere I can be myself.',
    '',
    'She looks at a framed photo of her elderly mother on the shelf.',
    '',
    'SARAH (CONT\'D)',
    'But I\'m scared of what will happen if I go. I can\'t abandon her here. She depends on me.',
    '',
    'INT. OFFICE - DAY',
    '',
    'SARAH sits across from her BOSS at a desk covered with papers and documents.',
    '',
    'SARAH',
    'I need to find a new job, somewhere I can grow and learn and become who I want to be.',
    'But I\'m afraid of taking the risk. What if I fail? What if it ruins everything?',
    '',
    'BOSS',
    'What\'s holding you back? You\'re clearly talented and smart.',
    '',
    'SARAH',
    'My mother. My responsibilities. My fear. But I must try anyway. I have to move forward.',
    '',
    'INT. KITCHEN - NIGHT',
    '',
    'SARAH sits at the table with her MOTHER, who reads a newspaper.',
    '',
    'MOTHER',
    'You seem troubled, sweetheart. What is weighing on your mind?',
    '',
    'SARAH',
    'I want things to change. I want to pursue my dreams. But I\'m terrified of what that means.',
    '',
  ].join('\n');
}

function buildOnlyWantScript(): string {
  return [
    'INT. APARTMENT - MORNING',
    '',
    'ALEX sits at a desk, confidence radiating. Photos of trophies line the walls.',
    '',
    'ALEX',
    'I want to win the championship. I need to train harder and push myself.',
    '',
    'ALEX (CONT\'D)',
    'I will succeed. I have to achieve my goal no matter what stands in my way.',
    '',
    'INT. GYM - DAY',
    '',
    'ALEX trains intensely on the equipment, sweat dripping down their face.',
    '',
    'ALEX',
    'I want to be the best. I need to push myself every single day.',
    '',
    'TRAINER enters and watches.',
    '',
    'TRAINER',
    'You\'re determined. Very focused.',
    '',
    'ALEX',
    'Yes, nothing will stop me. I will win. I have to achieve excellence.',
    '',
    'INT. LOCKER ROOM - LATER',
    '',
    'ALEX changes clothes, still confident.',
    '',
    'ALEX (CONT\'D)',
    'Tomorrow is the final. I want it. I need it. I will dominate.',
    '',
  ].join('\n');
}

function buildOnlyNeedScript(): string {
  return [
    'INT. HOSPITAL ROOM - NIGHT',
    '',
    'JAMES sits by his daughter LILY\'s bedside, helpless and overcome with emotion.',
    '',
    'JAMES',
    'I\'m so scared. I can\'t lose her. She\'s everything to me.',
    '',
    'A NURSE enters quietly and checks the monitors.',
    '',
    'NURSE',
    'How is she doing? Any change?',
    '',
    'JAMES',
    'I\'m terrified. I won\'t let anything happen to her. She\'s all I have in this world.',
    '',
    'He looks at old photos on the bedside table, faded and worn.',
    '',
    'JAMES (CONT\'D)',
    'I\'m afraid of the future. But she\'s my daughter. I can\'t lose her.',
    '',
    'INT. HOSPITAL CORRIDOR - LATER',
    '',
    'JAMES speaks with DOCTOR on the quiet hallway.',
    '',
    'DOCTOR',
    'We\'re doing everything we can.',
    '',
    'JAMES',
    'I can\'t bear this. I\'m so scared. What if she doesn\'t make it?',
    '',
  ].join('\n');
}

function buildDefensibleAntagonistScript(): string {
  return [
    'INT. BOARDROOM - DAY',
    '',
    'MARCUS, a CEO in his fifties, sits across from ELENA, a young whistleblower.',
    '',
    'MARCUS',
    'You need to understand our position. We had to cut costs to survive.',
    '',
    'ELENA',
    'But you lied to investors about the quarterly numbers.',
    '',
    'MARCUS',
    'We had good reasons. The company would have failed without those measures.',
    'I believe we made the right choice given the circumstances.',
    '',
    'INT. HALLWAY - LATER',
    '',
    'MARCUS confronts ELENA again near the elevator, speaking urgently.',
    '',
    'MARCUS (CONT\'D)',
    'This company employs three thousand people. We had to survive the market crisis.',
    'I had to make hard decisions because the alternative was bankruptcy and ruin.',
    '',
    'ELENA',
    'That\'s not a justification for deception.',
    '',
    'MARCUS',
    'Maybe not in your moral framework. But I understand the weight of responsibility.',
    'I had to protect jobs. I had to protect families.',
    '',
    'INT. MARCUS\'S OFFICE - EVENING',
    '',
    'MARCUS sits alone at his desk, reflective.',
    '',
    'MARCUS (CONT\'D)',
    'I had reasons. People needed this company to survive. I needed to act.',
    '',
  ].join('\n');
}

function buildCardboardAntagonistScript(): string {
  return [
    'INT. VILLAIN\'S LAIR - NIGHT',
    '',
    'DOCTOR EVIL sits in his chair, stroking a hairless cat, cackling with glee.',
    '',
    'DOCTOR EVIL',
    'I will destroy the world. Mwahahaha! Everyone will tremble before me!',
    '',
    'HENCHMAN enters, bowing respectfully.',
    '',
    'HENCHMAN',
    'Sir, what is your plan for global domination?',
    '',
    'DOCTOR EVIL',
    'To take over everything! I will crush all who oppose me! Utter destruction!',
    '',
    'INT. EVIL HIDEOUT - DAY',
    '',
    'DOCTOR EVIL addresses minions in an underground cavern.',
    '',
    'DOCTOR EVIL (CONT\'D)',
    'I hate the good guys. They annoy me greatly. Destroy them all immediately!',
    '',
    'MINION',
    'Yes, master. Anything else you desire?',
    '',
    'DOCTOR EVIL',
    'Bring me a sandwich. And initiate more chaos across the globe!',
    '',
  ].join('\n');
}

function buildTinyScript(): string {
  return 'INT. ROOM - DAY\n\nJOHN\nHello.\n\n';
}

describe('detectExcellence — excellence signal detection', () => {
  describe('wantNeedOpposition', () => {
    it('fires on script with protagonist expressing want-vs-need tension', () => {
      const result = detectExcellence(buildWantNeedOppositionScript());
      assert.strictEqual(result.scored, true, 'should score input above 500 chars');

      const signal = result.signals.find(s => s.id === 'wantNeedOpposition');
      assert(signal, 'should include wantNeedOpposition signal');
      assert.strictEqual(signal!.present, true, 'should detect want-need opposition');
      assert(signal!.confidence > 0, 'should report positive confidence');
      assert(
        signal!.evidence.includes('external goal') || signal!.evidence.includes('internal conflict'),
        'evidence should mention goals and conflict'
      );
    });

    it('does NOT fire on script with only explicit want (no internal conflict)', () => {
      const result = detectExcellence(buildOnlyWantScript());
      assert.strictEqual(result.scored, true);

      const signal = result.signals.find(s => s.id === 'wantNeedOpposition');
      assert(signal, 'should include signal');
      assert.strictEqual(signal!.present, false, 'should NOT fire when only want');
      assert.strictEqual(signal!.confidence, 0);
    });

    it('does NOT fire on script with only fear/need (no explicit want)', () => {
      const result = detectExcellence(buildOnlyNeedScript());
      assert.strictEqual(result.scored, true);

      const signal = result.signals.find(s => s.id === 'wantNeedOpposition');
      assert(signal, 'should include signal');
      assert.strictEqual(signal!.present, false, 'should NOT fire when only need');
      assert.strictEqual(signal!.confidence, 0);
    });

    it('abstains on input below minimum size threshold', () => {
      const result = detectExcellence(buildTinyScript());
      assert.strictEqual(result.scored, false, 'should abstain on tiny input');
      assert.strictEqual(result.signals.length, 0);
    });
  });

  describe('antagonistDefensibility', () => {
    it('fires on script with defensible antagonist (reasoned position)', () => {
      const result = detectExcellence(buildDefensibleAntagonistScript());
      assert.strictEqual(result.scored, true);

      const signal = result.signals.find(s => s.id === 'antagonistDefensibility');
      assert(signal, 'should include antagonistDefensibility signal');
      assert.strictEqual(signal!.present, true, 'should detect defensible claim');
      assert(signal!.confidence > 0, 'should report positive confidence');
      assert(
        signal!.evidence.includes('reasoning') || signal!.evidence.includes('defensible'),
        'evidence should reference reasoning'
      );
    });

    it('does NOT fire on script with cardboard antagonist (pure evil)', () => {
      const result = detectExcellence(buildCardboardAntagonistScript());
      assert.strictEqual(result.scored, true);

      const signal = result.signals.find(s => s.id === 'antagonistDefensibility');
      assert(signal, 'should include signal');
      assert.strictEqual(signal!.present, false, 'should NOT fire on pure evil');
      assert.strictEqual(signal!.confidence, 0);
    });

    it('abstains on input below minimum size threshold', () => {
      const result = detectExcellence(buildTinyScript());
      assert.strictEqual(result.scored, false);
    });
  });

  describe('overall behavior', () => {
    it('returns empty signals and scored=false on empty input', () => {
      const result = detectExcellence('');
      assert.strictEqual(result.scored, false);
      assert.strictEqual(result.signals.length, 0);
    });

    it('returns empty signals on whitespace-only input', () => {
      const result = detectExcellence('   \n\n   \t\t  ');
      assert.strictEqual(result.scored, false);
      assert.strictEqual(result.signals.length, 0);
    });

    it('returns all signals in the array with ids', () => {
      const result = detectExcellence(buildWantNeedOppositionScript());
      assert.strictEqual(result.scored, true);
      assert(Array.isArray(result.signals));
      assert(result.signals.length > 0);

      const ids = new Set(result.signals.map(s => s.id));
      assert(ids.has('wantNeedOpposition'));
      assert(ids.has('antagonistDefensibility'));
    });

    it('is deterministic across multiple runs', () => {
      const script = buildWantNeedOppositionScript();
      const run1 = detectExcellence(script);
      const run2 = detectExcellence(script);

      assert.deepStrictEqual(run1, run2);
    });

    it('is deterministic for antagonist detection', () => {
      const script = buildDefensibleAntagonistScript();
      const run1 = detectExcellence(script);
      const run2 = detectExcellence(script);

      assert.deepStrictEqual(run1, run2);
    });

    it('is conservative on mediocre input (never-padded)', () => {
      const mediocre = [
        'INT. OFFICE - DAY',
        '',
        'WORKER sits at desk, looking tired and unfocused.',
        '',
        'WORKER',
        'I want to do my job well. I need to focus on the reports that are due.',
        '',
        'BOSS enters and places papers on the desk with a heavy sigh.',
        '',
        'BOSS',
        'Do the reports. I need them by tomorrow morning.',
        '',
        'WORKER',
        'Okay. I will do them. I want to get them right and accurate.',
        '',
        'BOSS',
        'Good. Make sure they are complete and correct.',
        '',
        'BOSS exits. WORKER sits alone at desk, staring at the papers.',
        '',
        'WORKER',
        'I need to work now. I want to leave on time though.',
        '',
        'INT. BREAK ROOM - LATER',
        '',
        'WORKER sits with COLLEAGUE at a table drinking coffee.',
        '',
        'COLLEAGUE',
        'How are you doing with everything?',
        '',
        'WORKER',
        'Tired. I want to finish but I need this job to pay my bills.',
        '',
        'COLLEAGUE',
        'Yeah, I understand how you feel about it.',
        '',
      ].join('\n');

      const result = detectExcellence(mediocre);
      assert.strictEqual(result.scored, true);

      const wantNeedSignal = result.signals.find(s => s.id === 'wantNeedOpposition');
      if (wantNeedSignal?.present) {
        assert(wantNeedSignal.confidence < 0.5);
      }

      const antagonistSignal = result.signals.find(s => s.id === 'antagonistDefensibility');
      assert.strictEqual(antagonistSignal?.present, false);
    });

    it('all signals have confidence in 0..1 range', () => {
      const result = detectExcellence(buildWantNeedOppositionScript());
      if (result.scored) {
        for (const signal of result.signals) {
          assert(
            signal.confidence >= 0 && signal.confidence <= 1,
            `confidence out of range: ${signal.confidence}`
          );
        }
      }
    });

    it('presence=false implies confidence=0', () => {
      const result = detectExcellence(buildOnlyWantScript());
      if (result.scored) {
        for (const signal of result.signals) {
          if (!signal.present) {
            assert.strictEqual(signal.confidence, 0);
          }
        }
      }
    });
  });
});
