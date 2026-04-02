import React, { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import ScriptIDE from './components/ScriptIDE';
import StoryMachine from './components/StoryMachine';
import { StoryConfig } from './types';

export default function App() {
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [showStoryMachine, setShowStoryMachine] = useState(false);

  useEffect(() => {
    const handleOpenStoryMachine = () => setShowStoryMachine(true);
    const handleCloseStoryMachine = () => setShowStoryMachine(false);
    
    window.addEventListener('open-story-machine', handleOpenStoryMachine);
    window.addEventListener('close-story-machine', handleCloseStoryMachine);
    
    return () => {
      window.removeEventListener('open-story-machine', handleOpenStoryMachine);
      window.removeEventListener('close-story-machine', handleCloseStoryMachine);
    };
  }, []);

  if (showStoryMachine) return <StoryMachine />;
  if (config) return <ScriptIDE initialConfig={config} />;
  return <StartScreen onStart={setConfig} isGenerating={false} />;
}

