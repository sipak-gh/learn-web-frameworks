import { defineConfig } from 'vite'

// Same build as ../vite.config.ts, minus the modulepreload helper and polyfill.
export default defineConfig({
  build: { outDir: 'dist/vite-no-preload', sourcemap: true, modulePreload: false },
})
