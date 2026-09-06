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
          // FUNCTION FORM (required by Vite 8 / Rolldown — object-form
          // manualChunks is REMOVED, not just deprecated: Rolldown throws
          // "Invalid type: Expected Function but received Object" at build
          // time, verified against this exact config before converting it).
          // Rollup's old object form also force-added every listed package
          // as an extra entry point (addAdditionalModules(files, true)),
          // marking all of its exports "may be used externally" and
          // exempting them from tree-shaking even for a package with zero
          // real import sites — that's exactly why 'vendor-recharts':
          // ['recharts'] was deliberately removed here (recharts was only
          // ever reached by a dead function in ScriptIDE.tsx). The function
          // form below does not force-add anything — it only renames the
          // chunk an already-imported module lands in — so it carries no
          // risk of reintroducing that bug; if anything it is the strictly
          // safer of the two forms. Chunk boundaries verified byte-for-byte
          // equivalent in shape after the conversion (vendor-motion,
          // vendor-lucide, vendor-codemirror all still split out; the
          // 500KB-per-chunk cap in scripts/verify-production-build.mjs still
          // passes with none oversized).
          manualChunks(id: string) {
            if (id.includes('node_modules/motion')) return 'vendor-motion';
            if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
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
            if (
              id.includes('node_modules/@codemirror/') ||
              id.includes('node_modules/codemirror/')
            ) {
              return 'vendor-codemirror';
            }
            return undefined;
          },
        },
      },
    },
  };
});
