// Lets Node import .svelte.ts modules by compiling them the way
// vite-plugin-svelte does: strip the types, then run Svelte's compiler.
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { fileURLToPath } from 'node:url'
import { compileModule } from 'svelte/compiler'

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.svelte.ts')) return nextLoad(url, context)
    const filename = fileURLToPath(url)
    const js = stripTypeScriptTypes(readFileSync(filename, 'utf8'))
    const { code } = compileModule(js, { filename, generate: 'client' }).js
    return { format: 'module', source: code, shortCircuit: true }
  },
})
