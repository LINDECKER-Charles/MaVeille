import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    prerender: {
      handleHttpError: 'warn'
    },
    paths: {
      // Override via BASE_PATH for GitHub Pages deployment (e.g. /Veille)
      base: process.env.BASE_PATH ?? ''
    }
  }
};

export default config;
