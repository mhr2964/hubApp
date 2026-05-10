import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    port: 3053,
    proxy: {
      '/api': 'http://localhost:5053'
    },
    fs: {
      // Allow reading block-types.json one level above client/
      allow: ['..']
    }
  }
});
