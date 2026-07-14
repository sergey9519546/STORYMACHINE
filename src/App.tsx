import React, { useState, Suspense, lazy, useCallback, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { StoryConfig } from './types';

const StartScreen  = lazy(() => import('./components/StartScreen'));
const ScriptIDE    = lazy(() => import('./components/ScriptIDE'));
const StoryMachine = lazy(() => import('./components/StoryMachine'));
const DesignPreview = lazy(() => import('./components/DesignPreview'));

const LoadingFallback = () => (
  <div className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center font-mono">
    <div className="border-[1.5px] border-ink bg-panel px-6 py-4 text-xs font-bold uppercase tracking-[.16em] shadow-[6px_6px_0_rgba(33,29,21,.15)] animate-pulse">
      Loading…
    </div>
  </div>
);

// ── Persisted top-level view state (audit finding B) ────────────────────────
// Previously config/showStoryMachine lived in plain useState, so a hard
// refresh always fell through to `config ? ScriptIDE : StartScreen` with
// config === null — dumping every returning user back into the 5-step wizard,
// even though their script draft (ScriptIDE's own `script_draft` key) already
// survived the refresh in localStorage. This key persists *which screen* the
// user was on so app-level view state rehydrates in lockstep with the draft.
const APP_VIEW_KEY = 'sm_app_view_v1';

interface PersistedAppView {
  config: StoryConfig | null;
  showStoryMachine: boolean;
}

function loadPersistedView(): PersistedAppView {
  try {
    const raw = localStorage.getItem(APP_VIEW_KEY);
    if (!raw) return { config: null, showStoryMachine: false };
    const parsed = JSON.parse(raw) as Partial<PersistedAppView> | null;
    const config = parsed && typeof parsed === 'object' && parsed.config && typeof parsed.config === 'object'
      ? (parsed.config as StoryConfig)
      : null;
    return { config, showStoryMachine: !!parsed?.showStoryMachine };
  } catch {
    // Corrupt JSON / localStorage unavailable (private browsing, quota) —
    // fail safe into the wizard rather than throwing during render.
    return { config: null, showStoryMachine: false };
  }
}

// A minimal, sensible StoryConfig used by every "skip the wizard" entry point
// (StartScreen's "open the editor" / "Open OASIS Story Machine" shortcuts).
// ScriptIDE/StoryMachine only need *some* config to initialize; the 5-step
// wizard remains available — and fully overrides these values — for anyone
// who wants to dial in format/structure/director/arc up front (audit finding C).
export const DEFAULT_STORY_CONFIG: StoryConfig = {
  theme: 'Untitled Story',
  backstory: '',
  format: 'film',
  structure: 'save_the_cat',
  directorStyle: 'fincher',
  emotionalArc: 'man_in_a_hole',
};

export default function App() {
  // Read localStorage exactly once, synchronously, via a ref initializer —
  // avoids a first-render flash of the wizard followed by a snap to ScriptIDE.
  const initialView = useRef<PersistedAppView | null>(null);
  if (initialView.current === null) initialView.current = loadPersistedView();

  const [config, setConfig] = useState<StoryConfig | null>(initialView.current.config);
  const [showStoryMachine, setShowStoryMachine] = useState(initialView.current.showStoryMachine);
  // Fountain text + extracted character list coming from a Story Machine export
  const [importedScript, setImportedScript] = useState<string | undefined>(undefined);
  const [importedCharacters, setImportedCharacters] = useState<
    Array<{ name: string; ghost: string; lie: string; want: string; need: string }> | undefined
  >(undefined);

  // Persist on every change so a hard refresh resumes exactly where the user
  // left off. try/catch: persistence is a nicety, never something that should
  // throw and break the app (private browsing, quota-exceeded, etc).
  useEffect(() => {
    try {
      localStorage.setItem(APP_VIEW_KEY, JSON.stringify({ config, showStoryMachine }));
    } catch {
      // best-effort — continue silently
    }
  }, [config, showStoryMachine]);

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

  // Audit finding D: StartScreen's "Open OASIS Story Machine" CTA called
  // onOpenStoryMachine?.() but App never passed one in — a dead no-op. Also
  // seeds a default config (only if none is set yet) so closing StoryMachine
  // (onClose → setShowStoryMachine(false)) lands the user in ScriptIDE rather
  // than falling through to the wizard with config still null.
  const handleOpenStoryMachineFromStart = useCallback(() => {
    setConfig((prev) => prev ?? DEFAULT_STORY_CONFIG);
    setShowStoryMachine(true);
  }, []);

  // Deliverable 2's "New story" affordance: ScriptIDE can send the user back
  // to the wizard on demand (e.g. to start an unrelated project) by clearing
  // the persisted config. A genuinely-new user still gets the full wizard;
  // this only clears the *view* state — script_draft/snapshots/etc in
  // ScriptIDE's own localStorage keys are untouched.
  const handleNewStory = useCallback(() => {
    setConfig(null);
    setShowStoryMachine(false);
    try { localStorage.removeItem(APP_VIEW_KEY); } catch { /* best-effort */ }
  }, []);

  // Design-system preview: open the app with `#design-preview` in the URL to
  // render the paper·ink·stamp primitive gallery instead of the normal flow.
  // A dev-only affordance — untouched by any persisted view state.
  const isDesignPreview = typeof window !== 'undefined'
    && window.location.hash.replace(/^#/, '') === 'design-preview';
  if (isDesignPreview) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <DesignPreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
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
            onNewStory={handleNewStory}
          />
        ) : (
          <StartScreen
            onStart={setConfig}
            isGenerating={false}
            onOpenStoryMachine={handleOpenStoryMachineFromStart}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
