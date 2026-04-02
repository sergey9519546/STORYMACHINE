import { NCP, WorldContext, CharacterContext, NarrativeArcContext, RulesContext } from '../state/ncpSchema';
import { SymbolicState } from '../state/narrativeState';
import { CodexEngine, CodexEntry } from '../memory/codexEngine';

/**
 * The ContextOrchestrator manages the Narrative Context Protocol (NCP).
 * It dynamically filters and injects relevant lore, character bios,
 * plot points, and rules into the LLM prompt to prevent token bloat
 * while maintaining strict narrative coherence.
 */
export class ContextOrchestrator {
  private ncp: NCP;
  private codex: CodexEngine;

  constructor(initialNCP: NCP, codexEngine: CodexEngine) {
    this.ncp = initialNCP;
    this.codex = codexEngine;
  }

  /**
   * Updates the global NCP state (e.g., when a user uploads new lore).
   */
  public updateNCP(newNCP: Partial<NCP>): void {
    this.ncp = { ...this.ncp, ...newNCP };
  }

  /**
   * Returns the full NCP state.
   */
  public getNCP(): NCP {
    return this.ncp;
  }

  /**
   * Generates a focused context string for the LLM based on the current
   * SymbolicState (Ground Truth) and the upcoming scene's semantic query.
   * It only pulls relevant world details, active characters, and current structural beats.
   */
  public async buildActiveContext(
    state: SymbolicState, 
    activeCharacterIds: string[], 
    locationId: string,
    sceneQuery: string // The semantic intent of the upcoming scene
  ): Promise<string> {
    const contextParts: string[] = [];

    // 1. Dynamic RAG Codex Retrieval (The "Story Bible")
    // Retrieve only the lore, items, and rules relevant to this specific scene
    const relevantCodexEntries = await this.codex.retrieveRelevant(sceneQuery, { limit: 3 });
    if (relevantCodexEntries.length > 0) {
      contextParts.push(`[ RELEVANT LORE & CANON ]`);
      for (const entry of relevantCodexEntries) {
        contextParts.push(`- ${entry.title} (${entry.category}): ${entry.content}`);
      }
    }

    // 2. World Context (Filtered by location)
    const location = state.fabula.locations[locationId];
    if (location) {
      contextParts.push(`\n[ WORLD: ${location.name} ]`);
      // Retrieve specific location lore from Codex
      const locationLore = await this.codex.retrieveRelevant(location.name, { categories: ['location'], limit: 1 });
      if (locationLore.length > 0) {
        contextParts.push(locationLore[0].content);
      } else {
        // Fallback to general world rules if no specific location lore is found
        contextParts.push(this.ncp.world.geography.join('\n'));
        contextParts.push(this.ncp.world.sociopoliticalHistory.join('\n'));
      }
    }

    // 3. Character Context (Filtered by active characters)
    contextParts.push(`\n[ ACTIVE CHARACTERS ]`);
    for (const charId of activeCharacterIds) {
      const char = this.ncp.characters[charId];
      if (char) {
        contextParts.push(`- ${char.name}:`);
        contextParts.push(`  Want: ${char.consciousWant}`);
        contextParts.push(`  Need: ${char.unconsciousNeed}`);
        contextParts.push(`  Defenses: ${char.defenseMechanisms.join(', ')}`);
        contextParts.push(`  Speech: Vocab(${char.speechPatterns.vocabulary}), Tics(${char.speechPatterns.verbalTics.join(', ')})`);
      }
    }

    // 4. Narrative Arc Context (Current Beat & Throughlines)
    contextParts.push(`\n[ NARRATIVE ARC ]`);
    const activeBeats = this.ncp.narrativeArc.bottleneckBeats.filter(b => !b.isResolved);
    if (activeBeats.length > 0) {
      contextParts.push(`Current Bottleneck: ${activeBeats[0].name} - ${activeBeats[0].description}`);
    }
    
    // Inject active signposts for the 4 throughlines
    const osSignpost = this.ncp.narrativeArc.throughlines.objectiveStory.signposts.find(s => s.status === 'active');
    if (osSignpost) contextParts.push(`Objective Story Signpost: ${osSignpost.name}`);

    const mcSignpost = this.ncp.narrativeArc.throughlines.mainCharacter.signposts.find(s => s.status === 'active');
    if (mcSignpost) contextParts.push(`Main Character Signpost: ${mcSignpost.name}`);

    // 5. Rules & Constraints (Always active)
    contextParts.push(`\n[ RULES & CONSTRAINTS ]`);
    contextParts.push(`Diegetic Rules:`);
    this.ncp.rules.diegetic.forEach(r => contextParts.push(`- ${r}`));
    contextParts.push(`Non-Diegetic Rules:`);
    this.ncp.rules.nonDiegetic.forEach(r => contextParts.push(`- ${r}`));

    return contextParts.join('\n');
  }

  /**
   * Generates the strict boolean gates that the Scene Validators will use
   * to reject or accept a generated scene.
   */
  public getValidationConstraints(): string[] {
    return [
      ...this.ncp.rules.diegetic,
      ...this.ncp.rules.nonDiegetic
    ];
  }
}
