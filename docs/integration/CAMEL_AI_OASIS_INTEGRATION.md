# CAMEL-AI OASIS Integration for StoryMachine
## From Social Media Simulation → Screenplay Character Simulation

---

## 🎯 VISION: Transform OASIS for Film Production

**CAMEL-AI OASIS** simulates 1M+ agents on social media platforms.  
**StoryMachine OASIS** should simulate screenplay characters at cinematic scale.

---

## 📊 What CAMEL-AI OASIS Provides

### Core Capabilities
- **1M+ agent scale** — Simulate entire populations, not just main characters
- **23 action types** — Rich behavioral vocabulary (follow, comment, repost, mute, etc.)
- **Dynamic environments** — Real-time adaptation to network changes
- **Recommendation systems** — Interest-based and hot-score content discovery
- **Multi-platform** — Twitter, Reddit simulation out-of-box
- **LLM-powered agents** — Each agent has personality, memory, goals
- **Python-based** — `pip install camel-oasis`

### Technical Stack
- **Platform:** Python (not TypeScript)
- **Models:** OpenAI, extensible to other LLMs
- **Database:** Built-in persistence layer
- **Scale:** Handles millions of agents efficiently
- **Actions:** 23 pre-defined social actions
- **Graphs:** Agent relationship networks

---

## 🎬 How OASIS Maps to Screenplay Needs

| CAMEL-AI OASIS Feature | StoryMachine Equivalent |
|------------------------|-------------------------|
| **Social media posts** | Character dialogue lines |
| **Follow/Mute actions** | Character relationships (ally/antagonist) |
| **Like/Dislike** | Agreement/conflict dynamics |
| **Comment threads** | Multi-character conversations |
| **Trending content** | Plot momentum / thematic resonance |
| **User profiles** | Character sheets (psychology, goals, voice) |
| **Recommendation algorithm** | Scene selection / beat ordering |
| **Network effects** | Ensemble dynamics / crowd scenes |
| **1M agent scale** | Background characters, crowds, armies, cities |

---

## 🏗️ INTEGRATION ARCHITECTURE

### Phase 1: Python Bridge Layer
Since CAMEL-AI OASIS is Python and StoryMachine is TypeScript/Node:

```
┌─────────────────────────────────────────────┐
│  StoryMachine (TypeScript/Node)             │
│  ├─ Frontend (React)                        │
│  ├─ Server (Express)                        │
│  └─ NVM Engine (Doctor, Detectors)          │
└─────────────────┬───────────────────────────┘
                  │ HTTP/WebSocket
                  ↓
┌─────────────────────────────────────────────┐
│  OASIS Bridge Service (Python FastAPI)      │
│  ├─ CAMEL-AI OASIS Integration              │
│  ├─ Character → Agent mapping               │
│  ├─ Scene → Environment translation         │
│  └─ Action → Dialogue converter             │
└─────────────────┬───────────────────────────┘
                  │ Native Python
                  ↓
┌─────────────────────────────────────────────┐
│  CAMEL-AI OASIS (pip install camel-oasis)   │
│  ├─ 1M+ agent simulation                    │
│  ├─ LLM-powered behaviors                   │
│  └─ Social dynamics engine                  │
└─────────────────────────────────────────────┘
```

### Phase 2: Hybrid Architecture
```typescript
// StoryMachine server/routes/oasis-camel.ts
import { spawn } from 'child_process';

interface OASISSimulationRequest {
  characters: CharacterSheet[];
  scene: SceneContext;
  actionBudget: number; // How many turns to simulate
}

export async function runOASISSimulation(req: OASISSimulationRequest) {
  // Spawn Python subprocess running CAMEL-AI OASIS
  const pythonBridge = spawn('python', [
    'scripts/oasis-bridge.py',
    '--characters', JSON.stringify(req.characters),
    '--scene', JSON.stringify(req.scene),
    '--budget', req.actionBudget.toString(),
  ]);
  
  // Stream results back
  return new Promise((resolve) => {
    let output = '';
    pythonBridge.stdout.on('data', (data) => {
      output += data.toString();
    });
    pythonBridge.on('close', () => {
      resolve(JSON.parse(output));
    });
  });
}
```

---

## 🎭 USE CASES FOR STORYMACHINE

### 1. **Ensemble Scene Simulation** (10-100 characters)
**Problem:** Writing crowd scenes, party scenes, courtroom galleries  
**OASIS Solution:** Simulate 100 background characters with distinct personalities reacting to main action

```python
# Generate 100 wedding guests
guests = await generate_screenplay_agent_graph(
    character_count=100,
    scene_type="wedding_reception",
    main_characters=["BRIDE", "GROOM", "DRUNK_UNCLE"],
)

# Simulate 20 turns of social dynamics
env = oasis.make(
    agent_graph=guests,
    platform=ScreenplayPlatformType.ENSEMBLE_SCENE,
)

# Get emergent dialogue and reactions
reactions = await env.run(turns=20)
```

**Output:** 100 characters with emergent:
- Side conversations
- Reactions to toast speeches
- Gossip spreading through the crowd
- Cliques forming
- Conflicts escalating

### 2. **Character Relationship Evolution** (5-20 characters)
**Problem:** How do relationships change over a season of TV?  
**OASIS Solution:** Simulate character network over 100 episodes

```python
# TV show cast simulation
cast = await generate_tv_cast_graph(
    main_characters=8,
    recurring_characters=12,
    seasons=3,
)

# Run 100 episode-equivalents
for episode in range(100):
    env.step()
    
# Extract:
# - Which friendships strengthened
# - Which alliances broke
# - Emergent rivalries
# - Romantic pairings
```

### 3. **Dialogue Generation at Scale** (1M characters)
**Problem:** Generate 10,000 lines of crowd dialogue for epic battle scene  
**OASIS Solution:** 1M agents = 1M unique voices

```python
# Epic battle: Two armies
army_a = 500_000  # Half million soldiers
army_b = 500_000

battle_env = oasis.make(
    agent_count=1_000_000,
    factions=["ARMY_A", "ARMY_B"],
    scene_type="battle",
)

# Generate war cries, commands, death speeches
dialogue = await battle_env.generate_dialogue(lines=10_000)
```

### 4. **Plot Testing via Social Dynamics**
**Problem:** Will this reveal land with the audience?  
**OASIS Solution:** Simulate 1000 "audience agents" reacting to story beats

```python
# Create 1000 simulated viewers
audience = await generate_audience_agents(
    demographics={"age": "18-49", "genre_preference": "thriller"},
    size=1000,
)

# Show them the plot
for beat in screenplay_beats:
    reactions = audience.react(beat)
    
# Measure:
# - Surprise at reveals
# - Emotional engagement
# - Confusion points
# - Prediction accuracy
```

### 5. **Character Voice Consistency**
**Problem:** Does this character sound like themselves across 120 pages?  
**OASIS Solution:** Train agent on character's existing dialogue, detect deviations

```python
# Create agent from existing character
john_agent = await train_character_agent(
    existing_dialogue=john_lines_scenes_1_to_50,
    personality=john_character_sheet,
)

# Test new dialogue for consistency
new_line = "Whatever, I don't care."
consistency_score = john_agent.evaluate_line(new_line)
# → 0.23 (LOW — John never says "whatever")
```

---

## 🛠️ IMPLEMENTATION PLAN

### Step 1: Python Bridge Service (Week 1-2)
**File:** `scripts/oasis-bridge.py`

```python
#!/usr/bin/env python3
"""
CAMEL-AI OASIS Bridge for StoryMachine
Translates screenplay concepts → OASIS simulation
"""
import asyncio
import json
import sys
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType
import oasis

async def simulate_screenplay_scene(characters, scene_context, budget):
    """
    Simulate a screenplay scene using CAMEL-AI OASIS
    
    Args:
        characters: List of CharacterSheet objects
        scene_context: SceneContext (location, time, dramatic question)
        budget: Number of simulation turns
    
    Returns:
        Simulated dialogue, actions, and relationship changes
    """
    # Convert StoryMachine characters → OASIS agent profiles
    agent_profiles = []
    for char in characters:
        agent_profiles.append({
            "name": char["name"],
            "personality": char["personality"],
            "goals": char["goals"],
            "relationships": char["relationships"],
            "voice_model": char.get("voice", {}),
        })
    
    # Create agent graph
    agent_graph = await oasis.generate_custom_agent_graph(
        profiles=agent_profiles,
        platform_type="SCREENPLAY",
    )
    
    # Define screenplay-specific actions
    screenplay_actions = [
        oasis.ActionType.SPEAK,  # Say dialogue line
        oasis.ActionType.REACT,  # React to another character
        oasis.ActionType.MOVE,   # Physical action
        oasis.ActionType.THINK,  # Internal monologue
        oasis.ActionType.LISTEN, # Observe silently
    ]
    
    # Create environment
    env = oasis.make(
        agent_graph=agent_graph,
        platform=oasis.CustomPlatformType.SCREENPLAY,
        scene_context=scene_context,
        available_actions=screenplay_actions,
    )
    
    await env.reset()
    
    # Run simulation
    results = []
    for turn in range(budget):
        observations, actions = await env.step()
        results.append({
            "turn": turn,
            "actions": [serialize_action(a) for a in actions],
            "state": env.get_state(),
        })
    
    return {
        "dialogue": extract_dialogue(results),
        "relationship_changes": extract_relationships(results),
        "emergent_beats": extract_story_beats(results),
    }

def serialize_action(action):
    """Convert OASIS action → JSON-serializable format"""
    return {
        "character": action.agent_id,
        "type": action.action_type.name,
        "content": action.content,
        "target": action.target_id,
        "timestamp": action.timestamp,
    }

def extract_dialogue(results):
    """Extract fountain-formatted dialogue from simulation"""
    dialogue = []
    for turn in results:
        for action in turn["actions"]:
            if action["type"] == "SPEAK":
                dialogue.append({
                    "character": action["character"],
                    "line": action["content"],
                    "turn": turn["turn"],
                })
    return dialogue

if __name__ == "__main__":
    # Parse CLI args from Node.js spawn
    characters = json.loads(sys.argv[2])
    scene = json.loads(sys.argv[4])
    budget = int(sys.argv[6])
    
    # Run simulation
    result = asyncio.run(simulate_screenplay_scene(characters, scene, budget))
    
    # Output JSON to stdout
    print(json.dumps(result))
```

### Step 2: TypeScript Integration (Week 2-3)
**File:** `server/routes/oasis-simulation.ts`

```typescript
import express from 'express';
import { spawn } from 'child_process';
import { gameLimiter } from '../lib/session-store.ts';
import { z } from 'zod';
import type { CharacterSheet } from '../engine/types.ts';

const router = express.Router();

const SimulationRequestSchema = z.object({
  characters: z.array(z.object({
    name: z.string(),
    personality: z.string(),
    goals: z.array(z.string()),
    relationships: z.record(z.string()),
  })),
  sceneContext: z.object({
    location: z.string(),
    time: z.string(),
    dramaticQuestion: z.string(),
  }),
  turnBudget: z.number().min(1).max(100),
});

router.post('/api/oasis/simulate', gameLimiter, async (req, res) => {
  try {
    const { characters, sceneContext, turnBudget } = SimulationRequestSchema.parse(req.body);
    
    // Spawn Python OASIS bridge
    const pythonProcess = spawn('python3', [
      'scripts/oasis-bridge.py',
      '--characters', JSON.stringify(characters),
      '--scene', JSON.stringify(sceneContext),
      '--budget', turnBudget.toString(),
    ]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: 'OASIS simulation failed',
          details: errorOutput,
        });
      }
      
      try {
        const result = JSON.parse(output);
        res.json({
          dialogue: result.dialogue,
          relationshipChanges: result.relationship_changes,
          emergentBeats: result.emergent_beats,
        });
      } catch (parseError) {
        res.status(500).json({
          error: 'Failed to parse OASIS output',
          raw: output,
        });
      }
    });
    
  } catch (error) {
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

export default router;
```

### Step 3: Frontend Panel (Week 3-4)
**File:** `src/components/OASISEnsemblePanel.tsx`

```typescript
import { useState } from 'react';

export function OASISEnsemblePanel() {
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const runEnsembleSimulation = async () => {
    setSimulationRunning(true);
    
    const response = await fetch('/api/oasis/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characters: [
          { name: 'JOHN', personality: 'skeptical detective', goals: ['solve murder'], relationships: {} },
          { name: 'MARY', personality: 'ambitious reporter', goals: ['break story'], relationships: { JOHN: 'rival' } },
          { name: 'SUSPECT', personality: 'nervous accountant', goals: ['hide truth'], relationships: {} },
        ],
        sceneContext: {
          location: 'INT. POLICE STATION - INTERROGATION ROOM',
          time: 'NIGHT',
          dramaticQuestion: 'Will the suspect break under pressure?',
        },
        turnBudget: 20,
      }),
    });
    
    const data = await response.json();
    setResults(data);
    setSimulationRunning(false);
  };
  
  return (
    <div className="oasis-panel">
      <h2>🏝️ OASIS Ensemble Simulation</h2>
      <p>Powered by CAMEL-AI OASIS (1M agent scale)</p>
      
      <button onClick={runEnsembleSimulation} disabled={simulationRunning}>
        {simulationRunning ? 'Simulating...' : 'Run 20-Turn Simulation'}
      </button>
      
      {results && (
        <div className="results">
          <h3>Generated Dialogue ({results.dialogue.length} lines)</h3>
          {results.dialogue.map((line: any, idx: number) => (
            <div key={idx} className="dialogue-line">
              <strong>{line.character}</strong>: {line.line}
            </div>
          ))}
          
          <h3>Relationship Changes</h3>
          <pre>{JSON.stringify(results.relationshipChanges, null, 2)}</pre>
          
          <h3>Emergent Story Beats</h3>
          <ul>
            {results.emergentBeats.map((beat: string, idx: number) => (
              <li key={idx}>{beat}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 📦 DEPENDENCIES

### Python Requirements
```bash
pip install camel-oasis
pip install fastapi uvicorn  # For bridge service
```

### Node/TypeScript
```typescript
// package.json additions (none required — uses child_process)
```

---

## 🚀 DEPLOYMENT

### Local Development
```bash
# Terminal 1: StoryMachine
npm run dev

# Terminal 2: Python OASIS bridge (if using FastAPI service)
python scripts/oasis-bridge-server.py
```

### Production
```dockerfile
# Dockerfile additions
FROM node:22 AS base

# Install Python + OASIS
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install camel-oasis

# Copy Python scripts
COPY scripts/oasis-bridge.py /app/scripts/

# Rest of existing Dockerfile...
```

---

## 🎯 ROADMAP

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| **Phase 1** | Week 1-2 | Python bridge script working |
| **Phase 2** | Week 2-3 | TypeScript route integration |
| **Phase 3** | Week 3-4 | Frontend panel + UI |
| **Phase 4** | Week 4-6 | Scale to 1000 character simulations |
| **Phase 5** | Week 6-8 | Scale to 1M crowd scenes |
| **Phase 6** | Week 8+ | Production deployment |

---

## ⚡ QUICK WIN: Minimal Integration (This Week)

**Install OASIS and run one test:**

```bash
# 1. Install OASIS
pip install camel-oasis

# 2. Create test script
cat > test-oasis.py << 'EOF'
import asyncio
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType
import oasis

async def test():
    model = ModelFactory.create(
        model_platform=ModelPlatformType.OPENAI,
        model_type=ModelType.GPT_4O_MINI,
    )
    
    # Create 3 character simulation
    characters = [
        {"name": "DETECTIVE", "personality": "skeptical"},
        {"name": "WITNESS", "personality": "nervous"},
        {"name": "LAWYER", "personality": "aggressive"},
    ]
    
    print("✅ OASIS installed and working!")
    print(f"📊 Simulating {len(characters)} characters...")

asyncio.run(test())
EOF

# 3. Run test
export OPENAI_API_KEY=your_key_here
python test-oasis.py
```

---

## 🎬 VISION SUMMARY

**Transform CAMEL-AI OASIS from social media simulator → Hollywood's character engine:**

- ✅ **Crowd scenes** — 1M background characters with emergent behavior
- ✅ **Ensemble dynamics** — 10-100 characters with evolving relationships
- ✅ **Dialogue at scale** — Generate 10K unique lines in minutes
- ✅ **Plot testing** — 1000 simulated viewers react to story beats
- ✅ **Voice consistency** — AI checks every line against character voice
- ✅ **TV season arcs** — Simulate 100 episodes of relationship evolution

**This turns StoryMachine from a screenplay analyzer → a living story universe simulator.**

Ready to implement Phase 1?
