// Deterministic subtext meter — no LLM calls.
// Scans dialogue lines for "on the nose" patterns (direct emotional disclosure,
// explicit motive declaration) vs. subtext indicators (indirection, hedging,
// displacement). Returns a 0–100 score where 0 = pure subtext, 100 = pure on-the-nose.

const ON_THE_NOSE: RegExp[] = [
  // Direct emotion first-person declarations
  /\bI(?:'m| am)\s+(?:angry|furious|scared|afraid|terrified|happy|sad|devastated|disappointed|frustrated|jealous|guilty|ashamed|heartbroken)\b/i,
  // Direct want/goal/plan statements
  /\bI\s+(?:want|need|must|have\s+to|am\s+trying\s+to|intend\s+to|plan\s+to|came\s+here\s+to)\b/i,
  // Motive disclosure
  /\bmy\s+(?:goal|plan|objective|motive|intention|purpose|agenda|real\s+reason)\s+is\b/i,
  // Explicit deception disclosure
  /\bI(?:'m| am)\s+(?:lying|deceiving|manipulating|hiding|pretending|bluffing)\b/i,
  // Hidden-truth disclosure
  /\bthe\s+(?:truth|real(?:ity)?|actual\s+fact)\s+is\b/i,
  // Theme-stating ("this is really about")
  /\bthis\s+is\s+(?:really\s+)?about\b/i,
  // Direct emotional accusation without deflection
  /\byou\s+(?:killed|murdered|lied|stole|betrayed|destroyed)\b/i,
];

const SUBTEXT_INDICATORS: RegExp[] = [
  // Questions instead of declarations
  /\b(?:do|did|have|has|is|are|was|were|would|could|should|might|may)\s+you\b/i,
  // Hedging language
  /\b(?:perhaps|maybe|might|could|possibly|supposedly|I\s+suppose|I\s+imagine|I\s+wonder|somehow|for\s+some\s+reason)\b/i,
  // Displacement — talking obliquely about the subject
  /\b(?:funny|interesting|strange|curious|odd|ironic|coincidental|convenient)\b/i,
  // Metaphor/analogy markers
  /\b(?:reminds?\s+me\s+of|just\s+like|as\s+if|the\s+way|similar\s+to|kind\s+of\s+like)\b/i,
  // Avoidance / subject change
  /\b(?:anyway|regardless|never\s+mind|doesn?'?t\s+matter|forget\s+(?:it|about\s+it)|moving\s+on)\b/i,
  // Understatement / litotes
  /\b(?:not\s+(?:entirely|exactly|quite)|hardly|barely|scarcely|less\s+than)\b/i,
  // Indirection via third person / passive
  /\b(?:one\s+might|some\s+(?:people|might)|it\s+(?:seems|appears|could\s+be\s+argued))\b/i,
];

export interface SubtextAnalysis {
  score: number;           // 0 = pure subtext, 100 = pure on-the-nose
  onTheNoseCount: number;
  subtextCount: number;
  totalLines: number;
  worstLine: string;       // single most on-the-nose line (empty when score < 20)
}

export function analyzeSubtext(dialogueLines: string[]): SubtextAnalysis {
  if (dialogueLines.length === 0) {
    return { score: 0, onTheNoseCount: 0, subtextCount: 0, totalLines: 0, worstLine: '' };
  }

  let onTheNoseCount = 0;
  let subtextCount = 0;
  let worstScore = 0;
  let worstLine = '';

  for (const line of dialogueLines) {
    const otn = ON_THE_NOSE.filter(p => p.test(line)).length;
    const sub = SUBTEXT_INDICATORS.filter(p => p.test(line)).length;
    onTheNoseCount += otn;
    subtextCount += sub;
    const lineScore = otn > 0 ? Math.max(0, Math.min(100, otn * 40 - sub * 10)) : 0;
    if (lineScore > worstScore) { worstScore = lineScore; worstLine = line; }
  }

  const total = onTheNoseCount + subtextCount;
  const score = total === 0 ? 10 : Math.round((onTheNoseCount / total) * 100);

  return { score, onTheNoseCount, subtextCount, totalLines: dialogueLines.length, worstLine: score >= 20 ? worstLine : '' };
}
