import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/main.ts',
  output: { dir: 'dist/rolldown', format: 'esm', minify: true, sourcemap: true },
})
