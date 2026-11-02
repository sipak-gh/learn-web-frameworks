// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// React and Solid both use JSX, so each one is told which folder is its own.
export default defineConfig({
  integrations: [
    react({ include: ['**/react/*'] }),
    solid({ include: ['**/solid/*'] }),
    svelte(),
    vue(),
  ],
  server: { port: 4338 },
});
