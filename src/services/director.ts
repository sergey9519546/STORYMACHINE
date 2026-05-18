import { EngineState, ScriptBlock, DirectorState, SceneAnalysis } from "../types";

export async function analyzeScriptBlock(
  engineState: EngineState,
  scriptText: string,
  characters: unknown[] = [],
  externalSignal?: AbortSignal,
): Promise<EngineState> {
  // Parse scriptText into ScriptBlocks — pure JS, no AI needed here
  const lines = scriptText.split('\n');
  const scriptBlocks: ScriptBlock[] = lines.map((line, index) => {
    let type: ScriptBlock["type"] = "action";
    if (line.match(/^(INT\.|EXT\.|INT\/EXT\.)/i)) type = "scene_heading";
    else if (line.match(/^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/) && line.trim().length > 0) type = "character";
    else if (line.match(/^\(.*\)$/)) type = "parenthetical";
    else if (line.match(/^(CUT TO:|FADE OUT\.|FADE IN:)/i)) type = "transition";
    else if (index > 0 && lines[index - 1].match(/^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/)) type = "dialogue";
    return { id: `block-${Date.now()}-${index}`, type, text: line };
  }).filter(b => b.text.trim().length > 0);

  // All AI work (Gemini analysis, image generation, audio generation) happens server-side.
  // Combine the caller's abort signal (for cancellation) with a 60s timeout guard.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  externalSignal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch('/api/analyze-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptText,
        characters,
        engineState: {
          directorState: engineState.directorState,
          protagonist: { visualAnchor: engineState.protagonist?.visualAnchor ?? '' },
        },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === 'AbortError') {
      if (externalSignal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      throw new Error('Analysis request timed out (60s). Try a shorter script.');
    }
    throw e;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(err.error ?? `Analysis request failed (${response.status})`);
  }

  const data = await response.json() as {
    sceneAnalysis: SceneAnalysis;
    updatedDirectorState: Partial<DirectorState>;
  };

  if (!data.sceneAnalysis) throw new Error('Invalid analysis response from server');

  // Deep-merge throughlines: user-typed values take priority over AI output.
  // AI only fills in fields the user left blank (empty string); activeThroughlines
  // always comes from AI since it's a computed list, not a user-editable field.
  const aiTL   = data.updatedDirectorState.throughlines;
  const userTL = engineState.directorState.throughlines;
  const mergedThroughlines = aiTL ? {
    ...userTL,
    objectiveStory:     userTL.objectiveStory     || aiTL.objectiveStory     || '',
    mainCharacter:      userTL.mainCharacter      || aiTL.mainCharacter      || '',
    influenceCharacter: userTL.influenceCharacter || aiTL.influenceCharacter || '',
    relationshipStory:  userTL.relationshipStory  || aiTL.relationshipStory  || '',
    activeThroughlines: aiTL.activeThroughlines?.length
      ? aiTL.activeThroughlines
      : userTL.activeThroughlines,
  } : userTL;

  // Preserve existing codex entries if AI returned an empty array — avoids the
  // "No Knowledge Ingested Yet" flash when the LLM omits entries mid-session.
  const mergedCodex = data.updatedDirectorState.activeCodexEntries?.length
    ? data.updatedDirectorState.activeCodexEntries
    : engineState.directorState.activeCodexEntries;

  return {
    ...engineState,
    scriptBlocks,
    directorState: {
      ...engineState.directorState,
      ...data.updatedDirectorState,
      throughlines: mergedThroughlines,
      activeCodexEntries: mergedCodex,
    },
    currentAnalysis: data.sceneAnalysis,
    isAnalyzing: false,
    isGeneratingMedia: false,
  };
}
