import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode: _mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Animation library — large, shared across pages
            'vendor-motion': ['motion'],
            // Icon library
            'vendor-lucide': ['lucide-react'],
            // CodeMirror (the Fountain editor's real, always-mounted text
            // engine — see FountainEditor.tsx) has to stay an EAGER import:
            // it's on the typing-latency hot path, so it can't become a
            // React.lazy() boundary the way the ScriptIDE side panels
            // (ScriptDoctorPanel, SnapshotManager, etc.) did. Left alone, its
            // ~2.5MB of unpacked source (view/state/commands/autocomplete/
            // search/language + the `codemirror` bundle + @lezer parsers)
            // rides along inside ScriptIDE.tsx's own chunk and was the
            // largest remaining contributor once every lazy-loadable panel
            // and the collab CRDT stack (yjs/y-websocket/y-codemirror.next,
            // dynamic-imported in collab.ts — only needed by a writer who
            // actually opens a real-time room) were pulled out. Pinning it to
            // its own manualChunks entry doesn't change WHEN it loads (still
            // fetched eagerly, in parallel with the ScriptIDE chunk, before
            // first paint) — only which FILE it loads from — so this is
            // pure code-splitting for the 500KB-per-chunk cap, not a
            // behavior change.
            'vendor-codemirror': [
              '@codemirror/view',
              '@codemirror/state',
              '@codemirror/commands',
              '@codemirror/autocomplete',
              '@codemirror/search',
              '@codemirror/language',
              'codemirror',
            ],
            // 'vendor-recharts': ['recharts'] intentionally removed. Rollup's
            // object-form manualChunks force-adds each listed package as an
            // extra entry point (addAdditionalModules(files, true)), which
            // marks all of its exports as "may be used externally" and
            // exempts them from tree-shaking — even when nothing in the app
            // actually imports the package. recharts was only ever reached by
            // a dead function in ScriptIDE.tsx (removed alongside this); with
            // that gone, recharts has zero real import sites, so keeping this
            // entry would keep force-shipping recharts + its d3-*/es-toolkit
            // transitive deps as a vendor chunk nobody loads it for.
          },
        },
      },
    },
  };
});
