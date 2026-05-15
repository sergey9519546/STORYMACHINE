import React, { useState, Suspense, lazy, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { GameStateProvider } from './contexts/GameStateContext';
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
  // Fountain text + extracted character list coming from a Story Machine export
  const [importedScript, setImportedScript] = useState<string | undefined>(undefined);
  const [importedCharacters, setImportedCharacters] = useState<
    Array<{ name: string; ghost: string; lie: string; want: string; need: string }> | undefined
  >(undefined);

  const handleExportToIDE = useCallback(
    (fountain: string, characters: Array<{ name: string; ghost: string; lie: string; want: string; need: string }>) => {
      setImportedScript(fountain);
      setImportedCharacters(characters);
      setShowStoryMachine(false);
    },
    [],
  );

  const handleClearImport = useCallback(() => {
    setImportedScript(undefined);
    setImportedCharacters(undefined);
  }, []);

  return (
    <GameStateProvider>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {showStoryMachine ? (
          <StoryMachine
            onClose={() => setShowStoryMachine(false)}
            onExportToIDE={handleExportToIDE}
          />
        ) : config ? (
          <ScriptIDE
            initialConfig={config}
            onOpenStoryMachine={() => setShowStoryMachine(true)}
            importedScript={importedScript}
            importedCharacters={importedCharacters}
            onImportConsumed={handleClearImport}
          />
        ) : (
          <StartScreen onStart={setConfig} isGenerating={false} />
        )}
      </Suspense>
    </ErrorBoundary>
    </GameStateProvider>
  );
}
