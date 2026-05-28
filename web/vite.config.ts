import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      // Allow Vite to serve sibling content folders (Recap/, Categorie/) at the repo root
      allow: [resolve(__dirname, '..')]
    }
  }
});
