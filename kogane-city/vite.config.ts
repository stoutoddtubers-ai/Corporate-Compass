import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 4000,
    // Fixed file name so the playable test link can be updated in place after each step.
    rollupOptions: { output: { entryFileNames: 'assets/game.js' } },
  },
});
