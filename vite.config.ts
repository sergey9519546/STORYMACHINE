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
