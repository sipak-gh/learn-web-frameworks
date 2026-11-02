// Exercise 1: build the Alpine Tasklet, unchanged, with Alpine's CSP build
// and serve it under a Content-Security-Policy that forbids eval().
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const policy = "script-src 'self'"

export default defineConfig({
  root: fileURLToPath(new URL('../../../tasklet/alpine', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('dist', import.meta.url)),
    emptyOutDir: true,
  },
  resolve: {
    // Every `import Alpine from 'alpinejs'` gets the CSP build instead.
    alias: {
      alpinejs: fileURLToPath(new URL('../node_modules/@alpinejs/csp/dist/module.esm.js', import.meta.url)),
    },
  },
  plugins: [
    {
      name: 'csp-meta',
      transformIndexHtml: (html) =>
        html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        ),
    },
  ],
})
