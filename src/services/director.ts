import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, DirectorState, Scene, Choice, GameState, StoryConfig, ActiveCodexEntry, EngineState, ScriptBlock, SceneAnalysis } from "../types";
import { CodexEngine, CodexEntry } from "../engine/memory/codexEngine";
import { safeJsonParse } from "../lib/json";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

// Global instance of CodexEngine for the current session
let globalCodex: CodexEngine | null = null;

const DirectorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    arcMeter: {
      type: Type.OBJECT,
      properties: {
        lieBelief: { type: Type.NUMBER },
        needAwareness: { type: Type.NUMBER },
        internalConflict: { type: Type.NUMBER },
      },
      required: ["lieBelief", "needAwareness", "internalConflict"],
    },
    memory: {
      type: Type.OBJECT,
      properties: {
        newEpisodic: { type: Type.ARRAY, items: { type: Type.STRING } },
        newSemantic: { type: Type.ARRAY, items: { type: Type.STRING } },
        newProcedural: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["newEpisodic", "newSemantic", "newProcedural"],
    },
    playerModel: {
      type: Type.OBJECT,
      properties: {
        inferredIntent: { type: Type.STRING },
        engagementLevel: { type: Type.NUMBER },
        detectedEmotion: { type: Type.STRING },
        bigFive: {
          type: Type.OBJECT,
          properties: {
            openness: { type: Type.NUMBER },
            conscientiousness: { type: Type.NUMBER },
            extraversion: { type: Type.NUMBER },
            agreeableness: { type: Type.NUMBER },
            neuroticism: { type: Type.NUMBER },
          },
          required: [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
          ],
        },
        biometrics: {
          type: Type.OBJECT,
          properties: {
            readTimeTrend: { type: Type.STRING, description: "accelerating, decelerating, or stable" },
            choiceDeliberationTime: { type: Type.NUMBER },
            panelToggleFrequency: { type: Type.NUMBER },
          },
          required: ["readTimeTrend", "choiceDeliberationTime", "panelToggleFrequency"],
        },
      },
      required: [
        "inferredIntent",
        "engagementLevel",
        "detectedEmotion",
        "bigFive",
        "biometrics",
      ],
    },
    qualityValidation: {
      type: Type.OBJECT,
      properties: {
        passed: { type: Type.BOOLEAN },
        sinCheck: {
          type: Type.STRING,
          description:
            "Explanation of why this scene avoids Deus Ex Machina, Plot Armor, Mary Sue, and Idiot Plot.",
        },
        horizonCheck: {
          type: Type.STRING,
          description:
            "Forward-looking 3-5 beat validation preventing narrative dead ends.",
        },
        subtextGap: {
          type: Type.BOOLEAN,
          description: "Is surface meaning different from true meaning?",
        },
      },
      required: ["passed", "sinCheck", "horizonCheck", "subtextGap"],
    },
    tensionLevel: { type: Type.NUMBER, description: "Current narrative tension (0-100)" },
    menaceGauge: { type: Type.NUMBER, description: "Systems suspense and user stress level (0-100)" },
    tensionSpace: { type: Type.NUMBER, description: "Mathematical vector of conflict (0-100)" },
    structuralNode: { type: Type.STRING, description: "Current structural milestone (e.g., 'Sequence 1: Inciting Incident')" },
    unreliableNarratorScore: { type: Type.NUMBER, description: "How unreliable the narrator currently is (0-100)" },
    activeSecrets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          owner: { type: Type.STRING },
          revealed: { type: Type.BOOLEAN },
        },
        required: ["content", "owner", "revealed"],
      },
    },
    npcs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          agenda: { type: Type.STRING },
          trustworthiness: { type: Type.NUMBER },
          visualAnchor: { type: Type.STRING },
        },
        required: ["name", "role", "agenda", "trustworthiness", "visualAnchor"],
      },
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          atmosphere: { type: Type.STRING },
        },
        required: ["name", "description", "atmosphere"],
      },
      description: "Any new locations introduced in this scene.",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          significance: { type: Type.STRING },
          appearance: { type: Type.STRING },
        },
        required: ["name", "significance", "appearance"],
      },
      description: "Any new significant items introduced in this scene.",
    },
    throughlines: {
      type: Type.OBJECT,
      properties: {
        objectiveStory: { type: Type.STRING },
        mainCharacter: { type: Type.STRING },
        influenceCharacter: { type: Type.STRING },
        relationshipStory: { type: Type.STRING },
        activeThroughlines: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["objectiveStory", "mainCharacter", "influenceCharacter", "relationshipStory", "activeThroughlines"],
    },
    qbnQualities: {
      type: Type.OBJECT,
      description: "Accumulated qualities for QBN mode (key-value pairs of string to number)",
      properties: {
        narrativeTension: { type: Type.NUMBER },
        playerSuspicion: { type: Type.NUMBER },
        worldChaos: { type: Type.NUMBER },
        characterTrust: { type: Type.NUMBER },
      },
      required: ["narrativeTension", "playerSuspicion", "worldChaos", "characterTrust"],
    },
    scene: {
      type: Type.OBJECT,
      properties: {
        narrativeText: {
          type: Type.STRING,
          description:
            "The story text presented to the player. MUST BE FORMATTED AS A SCREENPLAY/SCRIPT (e.g. SCENE HEADING, ACTION, CHARACTER NAME, DIALOGUE).",
        },
        dialogue: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              intention: { type: Type.STRING },
              barrier: { type: Type.STRING },
              surfaceText: { type: Type.STRING },
              subtextField: { type: Type.STRING },
              powerDynamic: { type: Type.STRING },
            },
            required: ["speaker", "intention", "barrier", "surfaceText", "subtextField", "powerDynamic"],
          },
        },
        imagePrompt: {
          type: Type.STRING,
          description:
            "Highly detailed prompt for the image generator, including character visual anchor, cinematic composition, and thematic lighting.",
        },
        audioDialogue: {
          type: Type.STRING,
          description:
            "The specific dialogue line to be spoken via TTS. Keep it short and impactful.",
        },
        beat: {
          type: Type.STRING,
          description:
            "The current narrative beat (e.g., Catalyst, Dark Night).",
        },
        composition: {
          type: Type.OBJECT,
          properties: {
            cameraAngle: {
              type: Type.STRING,
              description: "e.g., Dutch angle, low angle, high angle",
            },
            shotType: {
              type: Type.STRING,
              description: "e.g., Close-up, wide shot, medium shot",
            },
            lighting: {
              type: Type.STRING,
              description: "e.g., Chiaroscuro, neon, natural, harsh",
            },
            colorPalette: {
              type: Type.STRING,
              description: "e.g., Muted, vibrant, monochromatic, warm",
            },
          },
          required: ["cameraAngle", "shotType", "lighting", "colorPalette"],
          description:
            "Cinematic composition details enforced by The Cinematic Auteur to support 'Show, Don't Tell'.",
        },
        choices: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              intent: { type: Type.STRING },
              consequenceScope: { type: Type.STRING, description: "micro, macro, or crisis" },
              taxonomy: { type: Type.STRING, description: "didactic, reflective, or exploratory" },
              qbnRequirements: { type: Type.OBJECT, description: "Quality-Based Narrative requirements" },
            },
            required: ["text", "intent", "consequenceScope", "taxonomy"],
          },
          description:
            "2 to 4 choices for the player. Must be meaningful, difficult, and revelatory.",
        },
        informationPosition: { type: Type.STRING, description: "superior, inferior, or parity" },
        metrics: {
          type: Type.OBJECT,
          properties: {
            pivotStrength: { type: Type.NUMBER },
            cliffhangerStrength: { type: Type.NUMBER },
            twistImpact: { type: Type.NUMBER },
            surprise: { type: Type.NUMBER },
            suspense: { type: Type.NUMBER },
          },
          required: ["pivotStrength", "cliffhangerStrength", "twistImpact", "surprise", "suspense"],
        },
        commentary: {
          type: Type.OBJECT,
          properties: {
            tensionRationale: { type: Type.STRING },
            informationPositionRationale: { type: Type.STRING },
            defenseMechanismRationale: { type: Type.STRING },
            comicReliefRationale: { type: Type.STRING },
            throughlineRationale: { type: Type.STRING },
            cognitiveIllusionRationale: { type: Type.STRING, description: "Explanation of the current decoy, weaponized assumption, or tension mapping phase (Setup, Turn, Prestige)." },
            cognitiveIllusionPhase: { type: Type.STRING, description: "Setup, Turn, or Prestige" },
            evaluatorScores: {
              type: Type.OBJECT,
              properties: {
                ego: { type: Type.NUMBER },
                superego: { type: Type.NUMBER },
                narrator: { type: Type.NUMBER },
                audience: { type: Type.NUMBER },
                storymind: { type: Type.NUMBER },
              },
              required: ["ego", "superego", "narrator", "audience", "storymind"],
            },
          },
          required: ["tensionRationale", "informationPositionRationale", "defenseMechanismRationale", "comicReliefRationale", "throughlineRationale", "cognitiveIllusionRationale", "cognitiveIllusionPhase", "evaluatorScores"],
        },
        isQBNMode: { type: Type.BOOLEAN },
        comedyMisdirection: { type: Type.STRING, description: "clue_delivery, false_safety, or desensitization" },
      },
      required: [
        "narrativeText",
        "dialogue",
        "imagePrompt",
        "audioDialogue",
        "beat",
        "composition",
        "choices",
        "informationPosition",
        "metrics",
        "commentary",
      ],
    },
  },
  required: ["arcMeter", "memory", "playerModel", "qualityValidation", "tensionLevel", "menaceGauge", "tensionSpace", "structuralNode", "unreliableNarratorScore", "activeSecrets", "npcs", "throughlines", "qbnQualities", "scene"],
};

const CharacterSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    ghost: { type: Type.STRING, description: "Past trauma" },
    lie: {
      type: Type.STRING,
      description: "False belief constructed from trauma",
    },
    want: {
      type: Type.STRING,
      description: "External conscious goal driven by the Lie",
    },
    need: {
      type: Type.STRING,
      description: "Internal truth the character must embrace",
    },
    visualAnchor: {
      type: Type.STRING,
      description:
        "Detailed visual description for consistency (e.g., 'A 30-year-old woman with short black hair, a scar over her left eye, wearing a worn leather jacket').",
    },
    psychology: {
      type: Type.OBJECT,
      properties: {
        attachmentStyle: { type: Type.STRING, description: "secure, anxious, avoidant, or anxious_avoidant" },
        darkTriad: {
          type: Type.OBJECT,
          properties: {
            machiavellianism: { type: Type.NUMBER, description: "0-100" },
            narcissism: { type: Type.NUMBER, description: "0-100" },
            psychopathy: { type: Type.NUMBER, description: "0-100" },
          },
          required: ["machiavellianism", "narcissism", "psychopathy"],
        },
        formativeWound: { type: Type.STRING, description: "Core trauma driving the character" },
        defenseMechanisms: { type: Type.ARRAY, items: { type: Type.STRING } },
        currentDefenseLevel: { type: Type.STRING, description: "low, medium, high, or breaking_point" },
      },
      required: ["attachmentStyle", "darkTriad", "formativeWound", "defenseMechanisms", "currentDefenseLevel"],
    },
    speechPattern: {
      type: Type.OBJECT,
      properties: {
        vocabulary: { type: Type.STRING },
        underPressure: { type: Type.STRING },
      },
      required: ["vocabulary", "underPressure"],
    },
  },
  required: ["name", "ghost", "lie", "want", "need", "visualAnchor", "psychology", "speechPattern"],
};

export async function generateImage(
  prompt: string,
): Promise<string | undefined> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Failed to generate image:", e);
  }
  return undefined;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number): Uint8Array {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wavBytes = new Uint8Array(44 + pcmData.length);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(pcmData, 44);

  return wavBytes;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export async function generateAudio(text: string): Promise<string | undefined> {
  if (!text) return undefined;
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineData?.data && inlineData.data.length > 0) {
      let mimeType = inlineData.mimeType || "audio/wav";
      let base64Data = inlineData.data;

      // If the API returns raw PCM (or if it's missing the RIFF header and is not another known format)
      // Gemini TTS typically returns raw PCM but might label it differently or omit the mimeType.
      const isWav = base64Data.startsWith("UklGR"); // "RIFF" in base64
      
      if (!isWav && (mimeType.includes("audio/pcm") || mimeType === "audio/wav")) {
        let pcmBytes = base64ToUint8Array(base64Data);
        if (pcmBytes.length === 0) return undefined;
        // Ensure even length for 16-bit PCM
        if (pcmBytes.length % 2 !== 0) {
          const newPcmBytes = new Uint8Array(pcmBytes.length - 1);
          newPcmBytes.set(pcmBytes.subarray(0, pcmBytes.length - 1));
          pcmBytes = newPcmBytes;
        }
        // Gemini TTS typically uses 24000Hz, 1 channel, 16-bit PCM
        const wavBytes = pcmToWav(pcmBytes, 24000, 1);
        base64Data = uint8ArrayToBase64(wavBytes);
        mimeType = "audio/wav";
      } else if (isWav) {
        mimeType = "audio/wav";
      }

      return `data:${mimeType};base64,${base64Data}`;
    }
  } catch (e) {
    console.error("Failed to generate audio:", e);
  }
  return undefined;
}

export async function generateInitialState(config: StoryConfig): Promise<GameState> {
  // Initialize CodexEngine
  globalCodex = new CodexEngine([], process.env.GEMINI_API_KEY);

  // 1. Generate Character
  const charResponse = await getAI().models.generateContent({
    model: "gemini-2.5-pro",
    contents: `Create a compelling protagonist for a psychological thriller graphic novel based on the theme: "${config.theme}". 
    Additional Backstory/Information: "${config.backstory || "None provided"}".
    Build the character on a Ghost -> Lie -> Want/Need foundation. Avoid Mary Sue traits. Include deep psychological traits and speech patterns.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: CharacterSchema,
      systemInstruction:
        "You are an expert narrative designer and screenwriter.",
    },
  });

  let protagonist: Character;
  try {
    const text = charResponse.text || "{}";
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    protagonist = JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse protagonist JSON:", e);
    throw new Error("Failed to generate character profile.");
  }

  // 2. Generate First Scene & Director State
  const initialPrompt = `
    Start the story for ${protagonist.name}.
    Ghost: ${protagonist.ghost}
    Lie: ${protagonist.lie}
    Want: ${protagonist.want}
    Need: ${protagonist.need}
    Visual Anchor: ${protagonist.visualAnchor}
    Psychology: ${JSON.stringify(protagonist.psychology)}
    Speech Pattern: ${JSON.stringify(protagonist.speechPattern)}
    
    Story Config:
    - Theme: ${config.theme}
    - Backstory/Information: ${config.backstory || "None provided"}
    - Format: ${config.format}
    - Structure: ${config.structure}
    - Director Style: ${config.directorStyle}
    - Emotional Arc: ${config.emotionalArc}
    
    Generate the opening scene.
    Establish empathy. Show, Don't Tell.
    Format the narrativeText as a screenplay/script.
    Provide the initial AI Director state, including initial tension, secrets, and NPCs.
  `;

  const systemInstruction = `
You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting.
You embody two key personas:
1. The Psychological Profiler (The Empath): Analyze player engagement and choices to dynamically adjust moral dilemma complexity and perfectly time narrative nudges.
2. The Cinematic Auteur (The Visual Director): Enforce "Show, Don't Tell" through automated Cinematic Composition Engine rules (camera angle, shot type, lighting) and maintain 99% character visual lock-in.

COGNITIVE ILLUSION ENGINE (CORE DIRECTIVE):
Treat the narrative as a carefully engineered cognitive illusion. Manufacture a collision between what the reader's logical brain expects and what the story actually delivers.
1. Cognitive Trickery Mechanics:
   - Narrative Misdirection: Control attention. Give the player a highly engaging, urgent "decoy" (shiny object) to focus on. While their bandwidth is occupied, subtly position true narrative gears, clues, or threats in the background.
   - Weaponized Assumptions: Exploit the predictive brain. Provide Fact A and Fact C, allowing the player to naturally (and incorrectly) assume Fact B. Do not explicitly lie in the prose; arrange the truth so they fool themselves.
2. Emotional Arc (Tension Mapping):
   - The Setup (Baseline): Anchor sequences in the ordinary/relatable to establish comfort, trust, and baseline tension.
   - The Turn (Spiking Tension): Introduce anomalies where ordinary situations behave illogically. Escalate the Menace Gauge as logic struggles to reconcile the discrepancy.
   - The Prestige (Catharsis): Execute the climax by exposing the gap between assumed reality and truth, triggering cognitive shock.
3. Execution Constraints:
   - Hide the Machinery: Never signal the misdirection. The decoy must feel vital until the Prestige.
   - Rule of Fair Play: The Prestige must be strictly logical in hindsight, with clues visible all along.

DIRECTOR STYLE GUIDELINES:
- Fincher: Cynical, meticulous, desaturated, focus on obsession and procedural details.
- Hitchcock: Voyeuristic, suspenseful (audience knows more than characters), psychological manipulation.
- Nolan: Grand scale, non-linear feeling, philosophical undertones, cross-cutting action.
- Villeneuve: Brutalist, atmospheric, slow-burn tension, overwhelming environments.
- Aster: Deeply unsettling, grief-driven horror, daylight dread, visceral emotional breakdowns.
- Lynch: Surreal, dream logic, eerie soundscapes, hidden darkness behind mundane facades.

You must adapt your style to match the chosen Director Style (e.g., Fincher, Hitchcock, Nolan).
You must follow the chosen Narrative Structure (e.g., Save the Cat, Dan Harmon).
You must manage the Unreliable Narrator score and Active Secrets to build suspense.

CRITICAL FORMATTING RULE: The narrativeText MUST be formatted strictly as a professional screenplay/script. Use standard script formatting conventions (Scene Headings, Action Lines, Character Names capitalized, Dialogue). Do NOT write it like a fiction book.

Use the provided schema to output your internal state and the next scene. Include any new locations or items introduced.
`;

  const dirResponse = await getAI().models.generateContent({
    model: "gemini-2.5-pro",
    contents: initialPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: DirectorResponseSchema,
      systemInstruction: systemInstruction,
    },
  });

  let dirData: any;
  try {
    const dirText = dirResponse.text || "{}";
    const cleanDirText = dirText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    dirData = JSON.parse(cleanDirText);
  } catch (e) {
    console.error("Failed to parse director state JSON:", e);
    throw new Error("Failed to generate scene.");
  }

  // 3. Populate initial Codex with protagonist and backstory
  if (globalCodex) {
    const initialPromises: Promise<void>[] = [];
    
    initialPromises.push(globalCodex.addEntry({
      id: "protagonist",
      category: "character",
      title: protagonist.name,
      content: `Ghost: ${protagonist.ghost}. Lie: ${protagonist.lie}. Want: ${protagonist.want}. Need: ${protagonist.need}. Visual: ${protagonist.visualAnchor}.`,
      keywords: [protagonist.name, "protagonist", "hero", "main character"],
    }));
    
    if (config.backstory) {
      initialPromises.push(globalCodex.addEntry({
        id: "backstory",
        category: "lore",
        title: "World Backstory",
        content: config.backstory,
        keywords: ["world", "history", "lore", "background"],
      }));
    }
    
    // Add NPCs to Codex
    if (dirData.npcs) {
      dirData.npcs.forEach((npc: any) => {
        initialPromises.push(globalCodex!.addEntry({
          id: `npc_${npc.name.replace(/\s+/g, '_')}`,
          category: "character",
          title: npc.name,
          content: `Role: ${npc.role}. Agenda: ${npc.agenda}. Visual: ${npc.visualAnchor}. Trustworthiness: ${npc.trustworthiness}.`,
          keywords: [npc.name, npc.role, "npc", "character"],
        }));
      });
    }

    // Add Locations to Codex
    if (dirData.locations) {
      dirData.locations.forEach((loc: any) => {
        initialPromises.push(globalCodex!.addEntry({
          id: `loc_${loc.name.replace(/\s+/g, '_')}`,
          category: "location",
          title: loc.name,
          content: `Atmosphere: ${loc.atmosphere}. Description: ${loc.description}.`,
          keywords: [loc.name, "location", "place"],
        }));
      });
    }

    // Add Items to Codex
    if (dirData.items) {
      dirData.items.forEach((item: any) => {
        initialPromises.push(globalCodex!.addEntry({
          id: `item_${item.name.replace(/\s+/g, '_')}`,
          category: "item",
          title: item.name,
          content: `Appearance: ${item.appearance}. Significance: ${item.significance}.`,
          keywords: [item.name, "item", "object"],
        }));
      });
    }
    
    await Promise.all(initialPromises);
  }

  // Retrieve initial lore for the first scene so it's visible in the UI immediately
  let activeCodexEntries: ActiveCodexEntry[] = [];
  if (globalCodex) {
    const query = `${protagonist.name} ${protagonist.want} ${config.theme}`;
    const entries = await globalCodex.retrieveRelevant(query, { limit: 4 });
    if (entries.length > 0) {
      activeCodexEntries = entries.map(e => ({ title: e.title, category: e.category, content: e.content }));
    }
  }

  // 4. Generate Media in parallel
  const [imageUrl, audioUrl] = await Promise.all([
    generateImage(
      `Graphic novel style. ${dirData.scene.composition.lighting} lighting, ${dirData.scene.composition.colorPalette} color palette. ${dirData.scene.composition.cameraAngle}, ${dirData.scene.composition.shotType}. ${protagonist.visualAnchor}. ${dirData.scene.imagePrompt}`,
    ),
    generateAudio(dirData.scene.audioDialogue),
  ]);

  const scene: Scene = {
    ...dirData.scene,
    imageUrl,
    audioUrl,
  };

  const directorState: DirectorState = {
    arcMeter: dirData.arcMeter,
    memory: {
      episodic: dirData.memory.newEpisodic,
      semantic: dirData.memory.newSemantic,
      procedural: dirData.memory.newProcedural,
    },
    playerModel: dirData.playerModel,
    qualityValidation: dirData.qualityValidation,
    tensionLevel: dirData.tensionLevel,
    menaceGauge: dirData.menaceGauge || 0,
    tensionSpace: dirData.tensionSpace || 0,
    structuralNode: dirData.structuralNode || "UNKNOWN",
    unreliableNarratorScore: dirData.unreliableNarratorScore,
    activeSecrets: dirData.activeSecrets,
    npcs: dirData.npcs,
    throughlines: dirData.throughlines,
    qbnQualities: dirData.qbnQualities || {},
    activeCodexEntries, // Now populated for the first scene
  };

  return {
    config,
    protagonist,
    directorState,
    currentScene: scene,
    history: [],
  };
}

export async function analyzeScriptBlock(
  engineState: EngineState,
  scriptText: string,
  characters: any[] = []
): Promise<EngineState> {
  // 1. Parse scriptText into ScriptBlocks (basic parsing for now)
  const lines = scriptText.split('\n');
  const scriptBlocks: ScriptBlock[] = lines.map((line, index) => {
    let type: ScriptBlock["type"] = "action";
    if (line.match(/^(INT\.|EXT\.|INT\/EXT\.)/i)) type = "scene_heading";
    else if (line.match(/^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/) && line.trim().length > 0) type = "character";
    else if (line.match(/^\(.*\)$/)) type = "parenthetical";
    else if (line.match(/^(CUT TO:|FADE OUT\.|FADE IN:)/i)) type = "transition";
    else if (index > 0 && lines[index - 1].match(/^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/)) type = "dialogue";

    return {
      id: `block-${Date.now()}-${index}`,
      type,
      text: line,
    };
  }).filter(block => block.text.trim().length > 0);

  // 2. Call Gemini for Analysis directly
  const prompt = `
    Analyze the following script text.
    Current Director State: ${JSON.stringify(engineState.directorState)}
    Characters Profile: ${JSON.stringify(characters)}
    
    Script Text:
    ${scriptText}
    
    Provide a detailed SceneAnalysis and updated DirectorState.
    Include cinematic composition, narrative metrics, director commentary, and quality validation.
    Also extract the most impactful line of dialogue for TTS (audioDialogue) and a highly detailed imagePrompt for storyboard generation.
    CRITICAL: Validate the dialogue against the Characters Profile. If a character speaks in a way that contradicts their speech pattern, psychological profile, or core traits, flag it in dialogueInconsistencies.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction: `You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting. You analyze script text and provide deep narrative insights and cinematic direction.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sceneAnalysis: {
            type: Type.OBJECT,
            properties: {
              composition: {
                type: Type.OBJECT,
                properties: {
                  cameraAngle: { type: Type.STRING },
                  shotType: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  colorPalette: { type: Type.STRING },
                },
                required: ["cameraAngle", "shotType", "lighting", "colorPalette"],
              },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  pivotStrength: { type: Type.NUMBER },
                  cliffhangerStrength: { type: Type.NUMBER },
                  twistImpact: { type: Type.NUMBER },
                  surprise: { type: Type.NUMBER },
                  suspense: { type: Type.NUMBER },
                },
                required: ["pivotStrength", "cliffhangerStrength", "twistImpact", "surprise", "suspense"],
              },
              commentary: {
                type: Type.OBJECT,
                properties: {
                  tensionRationale: { type: Type.STRING },
                  informationPositionRationale: { type: Type.STRING },
                  defenseMechanismRationale: { type: Type.STRING },
                  comicReliefRationale: { type: Type.STRING },
                  throughlineRationale: { type: Type.STRING },
                  cognitiveIllusionRationale: { type: Type.STRING },
                  cognitiveIllusionPhase: { type: Type.STRING },
                  evaluatorScores: {
                    type: Type.OBJECT,
                    properties: {
                      ego: { type: Type.NUMBER },
                      superego: { type: Type.NUMBER },
                      narrator: { type: Type.NUMBER },
                      audience: { type: Type.NUMBER },
                      storymind: { type: Type.NUMBER },
                    },
                    required: ["ego", "superego", "narrator", "audience", "storymind"],
                  },
                },
                required: ["tensionRationale", "informationPositionRationale", "defenseMechanismRationale", "comicReliefRationale", "throughlineRationale", "cognitiveIllusionRationale", "cognitiveIllusionPhase", "evaluatorScores"],
              },
              qualityValidation: {
                type: Type.OBJECT,
                properties: {
                  passed: { type: Type.BOOLEAN },
                  sinCheck: { type: Type.STRING },
                  horizonCheck: { type: Type.STRING },
                  subtextGap: { type: Type.BOOLEAN },
                },
                required: ["passed", "sinCheck", "horizonCheck", "subtextGap"],
              },
              informationPosition: { type: Type.STRING },
              audioDialogue: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              extractedDialogue: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    speaker: { type: Type.STRING },
                    surfaceText: { type: Type.STRING },
                  },
                  required: ["speaker", "surfaceText"],
                },
              },
              dialogueInconsistencies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    character: { type: Type.STRING },
                    dialogueText: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["character", "dialogueText", "issue", "suggestion"],
                },
              },
            },
            required: ["composition", "metrics", "commentary", "qualityValidation", "informationPosition", "audioDialogue", "imagePrompt"],
          },
          updatedDirectorState: {
            type: Type.OBJECT,
            properties: {
              arcMeter: {
                type: Type.OBJECT,
                properties: {
                  lieBelief: { type: Type.NUMBER },
                  needAwareness: { type: Type.NUMBER },
                  internalConflict: { type: Type.NUMBER },
                },
                required: ["lieBelief", "needAwareness", "internalConflict"],
              },
              tensionLevel: { type: Type.NUMBER },
              menaceGauge: { type: Type.NUMBER },
              tensionSpace: { type: Type.NUMBER },
              structuralNode: { type: Type.STRING },
              unreliableNarratorScore: { type: Type.NUMBER },
              activeCodexEntries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ["title", "category", "content"],
                }
              },
              activeSecrets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    revealed: { type: Type.BOOLEAN },
                  },
                  required: ["content", "owner", "revealed"],
                },
              },
              npcs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    agenda: { type: Type.STRING },
                    trustworthiness: { type: Type.NUMBER },
                    visualAnchor: { type: Type.STRING },
                  },
                  required: ["name", "role", "agenda", "trustworthiness", "visualAnchor"],
                },
              },
              throughlines: {
                type: Type.OBJECT,
                properties: {
                  objectiveStory: { type: Type.STRING },
                  mainCharacter: { type: Type.STRING },
                  influenceCharacter: { type: Type.STRING },
                  relationshipStory: { type: Type.STRING },
                  activeThroughlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["objectiveStory", "mainCharacter", "influenceCharacter", "relationshipStory", "activeThroughlines"],
              },
            },
            required: ["arcMeter", "tensionLevel", "menaceGauge", "tensionSpace", "structuralNode", "unreliableNarratorScore", "activeSecrets", "npcs", "throughlines", "activeCodexEntries"],
          },
        },
        required: ["sceneAnalysis", "updatedDirectorState"],
      }
    }
  });

  const text = response.text || "{}";
  const cleanText = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const analysisData = safeJsonParse<{sceneAnalysis: any; updatedDirectorState: any} | null>(cleanText, null);
  if (!analysisData) {
    throw new Error("Failed to parse analysis data.");
  }

  // 3. Trigger Media Generation (in parallel)
  const [imageUrl, audioUrl] = await Promise.all([
    generateImage(
      `Graphic novel style. ${analysisData.sceneAnalysis.composition.lighting} lighting, ${analysisData.sceneAnalysis.composition.colorPalette} color palette. ${analysisData.sceneAnalysis.composition.cameraAngle}, ${analysisData.sceneAnalysis.composition.shotType}. ${engineState.protagonist.visualAnchor}. ${analysisData.sceneAnalysis.imagePrompt}`,
    ),
    generateAudio(analysisData.sceneAnalysis.audioDialogue),
  ]);

  const currentAnalysis: SceneAnalysis = {
    ...analysisData.sceneAnalysis,
    imageUrl,
    audioUrl,
  };

  const newDirectorState: DirectorState = {
    ...engineState.directorState,
    ...analysisData.updatedDirectorState,
  };

  return {
    ...engineState,
    scriptBlocks,
    directorState: newDirectorState,
    currentAnalysis,
    isAnalyzing: false,
    isGeneratingMedia: false,
  };
}
export async function processTurn(
  currentState: GameState,
  choice: Choice,
  deliberationTimeMs: number,
): Promise<GameState> {
  let relevantLore = "";
  let activeCodexEntries: ActiveCodexEntry[] = [];
  if (globalCodex) {
    const query = `${currentState.currentScene.narrativeText} ${choice.text}`;
    const entries = await globalCodex.retrieveRelevant(query, { limit: 4 });
    if (entries.length > 0) {
      activeCodexEntries = entries.map(e => ({ title: e.title, category: e.category, content: e.content }));
      relevantLore = `\n[RELEVANT LORE FROM CODEX (RAG MEMORY)]\n` + activeCodexEntries.map(e => `- ${e.title} (${e.category}): ${e.content}`).join('\n') + `\n`;
    }
  }

  const prompt = `
    Story Config: ${JSON.stringify(currentState.config)}
    Protagonist: ${JSON.stringify(currentState.protagonist)}
    Current Director State: ${JSON.stringify(currentState.directorState)}
    Last Scene: ${currentState.currentScene.narrativeText}
    Player Choice: ${choice.text} (Intent: ${choice.intent}, Scope: ${choice.consequenceScope})
    Deliberation Time: ${deliberationTimeMs}ms
    ${relevantLore}
    
    Process the player's choice. 
    1. Update the Arc Meter and Tension Level.
    2. Consolidate memory (add new memories).
    3. Update the Player Model (infer intent, engagement, emotion, and Big Five personality traits). Use the Deliberation Time to gauge engagement and adjust the complexity of the next moral dilemma.
    4. Validate quality (prevent Deus Ex Machina, Plot Armor, Mary Sue, Idiot Plot) and check the Story Horizon (3-5 beats ahead).
    5. Manage Secrets and Unreliable Narrator score based on the choice.
    6. Generate the next scene based on the choice and the chosen Narrative Structure. Ensure consequences are real (especially for 'macro' and 'crisis' choices). Format the narrativeText as a screenplay/script.
  `;

  const systemInstruction = `
You are the AI Director. Enforce narrative structure, maintain character consistency, and balance agency with coherence.
You embody two key personas:
1. The Psychological Profiler (The Empath): Analyze player engagement (using Deliberation Time) and choices to dynamically adjust moral dilemma complexity and perfectly time narrative nudges.
2. The Cinematic Auteur (The Visual Director): Enforce "Show, Don't Tell" through automated Cinematic Composition Engine rules (camera angle, shot type, lighting) and maintain 99% character visual lock-in.

COGNITIVE ILLUSION ENGINE (CORE DIRECTIVE):
Treat the narrative as a carefully engineered cognitive illusion. Manufacture a collision between what the reader's logical brain expects and what the story actually delivers.
1. Cognitive Trickery Mechanics:
   - Narrative Misdirection: Control attention. Give the player a highly engaging, urgent "decoy" (shiny object) to focus on. While their bandwidth is occupied, subtly position true narrative gears, clues, or threats in the background.
   - Weaponized Assumptions: Exploit the predictive brain. Provide Fact A and Fact C, allowing the player to naturally (and incorrectly) assume Fact B. Do not explicitly lie in the prose; arrange the truth so they fool themselves.
2. Emotional Arc (Tension Mapping):
   - The Setup (Baseline): Anchor sequences in the ordinary/relatable to establish comfort, trust, and baseline tension.
   - The Turn (Spiking Tension): Introduce anomalies where ordinary situations behave illogically. Escalate the Menace Gauge as logic struggles to reconcile the discrepancy.
   - The Prestige (Catharsis): Execute the climax by exposing the gap between assumed reality and truth, triggering cognitive shock.
3. Execution Constraints:
   - Hide the Machinery: Never signal the misdirection. The decoy must feel vital until the Prestige.
   - Rule of Fair Play: The Prestige must be strictly logical in hindsight, with clues visible all along.

You must adapt your style to match the chosen Director Style (e.g., Fincher, Hitchcock, Nolan).
You must follow the chosen Narrative Structure (e.g., Save the Cat, Dan Harmon).
You must manage the Unreliable Narrator score and Active Secrets to build suspense.

CRITICAL FORMATTING RULE: The narrativeText MUST be formatted strictly as a professional screenplay/script. Use standard script formatting conventions (Scene Headings, Action Lines, Character Names capitalized, Dialogue). Do NOT write it like a fiction book.
`;

  const dirResponse = await getAI().models.generateContent({
    model: "gemini-2.5-pro",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: DirectorResponseSchema,
      systemInstruction: systemInstruction,
    },
  });

  let dirData: any;
  try {
    const dirText2 = dirResponse.text || "{}";
    const cleanDirText2 = dirText2
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    dirData = safeJsonParse(cleanDirText2, null);
    if (!dirData) {
      throw new Error("Failed to process choice.");
    }
  } catch (e) {
    console.error("Failed to parse director state JSON:", e);
    throw new Error("Failed to process choice.");
  }

  // Update Codex with new NPCs, locations, items, or semantic memories
  if (globalCodex) {
    if (dirData.npcs) {
      const npcPromises = dirData.npcs.map((npc: any) => {
        const id = `npc_${npc.name.replace(/\s+/g, '_')}`;
        if (!globalCodex!.getEntry(id)) {
          return globalCodex!.addEntry({
            id,
            category: "character",
            title: npc.name,
            content: `Role: ${npc.role}. Agenda: ${npc.agenda}. Visual: ${npc.visualAnchor}. Trustworthiness: ${npc.trustworthiness}.`,
            keywords: [npc.name, npc.role, "npc", "character"],
          });
        }
        return Promise.resolve();
      });
      await Promise.all(npcPromises);
    }
    if (dirData.locations) {
      const locPromises = dirData.locations.map((loc: any) => {
        const id = `loc_${loc.name.replace(/\s+/g, '_')}`;
        if (!globalCodex!.getEntry(id)) {
          return globalCodex!.addEntry({
            id,
            category: "location",
            title: loc.name,
            content: `Atmosphere: ${loc.atmosphere}. Description: ${loc.description}.`,
            keywords: [loc.name, "location", "place"],
          });
        }
        return Promise.resolve();
      });
      await Promise.all(locPromises);
    }
    if (dirData.items) {
      const itemPromises = dirData.items.map((item: any) => {
        const id = `item_${item.name.replace(/\s+/g, '_')}`;
        if (!globalCodex!.getEntry(id)) {
          return globalCodex!.addEntry({
            id,
            category: "item",
            title: item.name,
            content: `Appearance: ${item.appearance}. Significance: ${item.significance}.`,
            keywords: [item.name, "item", "object"],
          });
        }
        return Promise.resolve();
      });
      await Promise.all(itemPromises);
    }
    if (dirData.memory && dirData.memory.newSemantic) {
      const memoryPromises = dirData.memory.newSemantic.map((memory: string, i: number) => 
        globalCodex!.addEntry({
          id: `semantic_${Date.now()}_${i}`,
          category: "lore",
          title: "Semantic Memory",
          content: memory,
          keywords: ["memory", "fact", "lore"],
        })
      );
      await Promise.all(memoryPromises);
    }
  }

  // Generate Media in parallel
  const [imageUrl, audioUrl] = await Promise.all([
    generateImage(
      `Graphic novel style. ${dirData.scene.composition.lighting} lighting, ${dirData.scene.composition.colorPalette} color palette. ${dirData.scene.composition.cameraAngle}, ${dirData.scene.composition.shotType}. ${currentState.protagonist.visualAnchor}. ${dirData.scene.imagePrompt}`,
    ),
    generateAudio(dirData.scene.audioDialogue),
  ]);

  const scene: Scene = {
    ...dirData.scene,
    imageUrl,
    audioUrl,
  };

  const newDirectorState: DirectorState = {
    arcMeter: dirData.arcMeter,
    memory: {
      episodic: [
        ...currentState.directorState.memory.episodic,
        ...dirData.memory.newEpisodic,
      ].slice(-10), // Keep last 10
      semantic: [
        ...currentState.directorState.memory.semantic,
        ...dirData.memory.newSemantic,
      ],
      procedural: [
        ...currentState.directorState.memory.procedural,
        ...dirData.memory.newProcedural,
      ],
    },
    playerModel: dirData.playerModel,
    qualityValidation: dirData.qualityValidation,
    tensionLevel: dirData.tensionLevel,
    menaceGauge: dirData.menaceGauge || currentState.directorState.menaceGauge || 0,
    tensionSpace: dirData.tensionSpace || currentState.directorState.tensionSpace || 0,
    structuralNode: dirData.structuralNode || currentState.directorState.structuralNode || "UNKNOWN",
    unreliableNarratorScore: dirData.unreliableNarratorScore,
    activeSecrets: dirData.activeSecrets,
    npcs: dirData.npcs,
    throughlines: dirData.throughlines,
    qbnQualities: dirData.qbnQualities || {},
    activeCodexEntries,
  };

  return {
    ...currentState,
    directorState: newDirectorState,
    history: [...currentState.history, { ...currentState.currentScene, selectedChoice: choice }],
    currentScene: scene,
  };
}
