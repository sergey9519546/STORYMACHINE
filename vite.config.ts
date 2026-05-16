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
            // Chart library — only used in EngineVisualizer
            'vendor-recharts': ['recharts'],
            // Icon library
            'vendor-lucide': ['lucide-react'],
          },
        },
      },
    },
  };
});
