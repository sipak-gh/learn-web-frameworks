import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 4437, strictPort: true },
  preview: { port: 4437, strictPort: true },
  build: { outDir: 'dist/vite', sourcemap: true },
})
