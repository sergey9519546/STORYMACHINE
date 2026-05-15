import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import ScriptIDE from './components/ScriptIDE';
import StoryMachine from './components/StoryMachine';
import { StoryConfig } from './types';

export default function App() {
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [showStoryMachine, setShowStoryMachine] = useState(false);

  if (showStoryMachine) return <StoryMachine onClose={() => setShowStoryMachine(false)} />;
  if (config) return <ScriptIDE initialConfig={config} onOpenStoryMachine={() => setShowStoryMachine(true)} />;
  return <StartScreen onStart={setConfig} isGenerating={false} />;
}
