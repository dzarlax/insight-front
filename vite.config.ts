import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    chunkSizeWarningLimit: 500,
    // Never ship source maps to production — they would expose original sources.
    sourcemap: false,
  },
  esbuild: {
    // Strip `debugger` statements from production bundles. `console.*` calls are
    // already gated behind `import.meta.env.DEV` and tree-shaken by Vite.
    drop: ['debugger'],
  },
});
