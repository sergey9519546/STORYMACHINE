import React, { useState, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { StoryConfig } from './types';

const StartScreen  = lazy(() => import('./components/StartScreen'));
const ScriptIDE    = lazy(() => import('./components/ScriptIDE'));
const StoryMachine = lazy(() => import('./components/StoryMachine'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-white flex items-center justify-center font-mono">
    <div className="text-black text-xl uppercase tracking-widest animate-pulse">Loading...</div>
  </div>
);

export default function App() {
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [showStoryMachine, setShowStoryMachine] = useState(false);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {showStoryMachine
          ? <StoryMachine onClose={() => setShowStoryMachine(false)} />
          : config
            ? <ScriptIDE initialConfig={config} onOpenStoryMachine={() => setShowStoryMachine(true)} />
            : <StartScreen onStart={setConfig} isGenerating={false} />
        }
      </Suspense>
    </ErrorBoundary>
  );
}
