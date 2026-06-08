import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          xterm: ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links']
        }
      }
    }
  },
  server: {
    port: 3000
  }
});
