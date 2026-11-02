// Runs the Svelte compiler on a component and prints the generated JavaScript.
// Run: node compile.mjs Counter.svelte [client|server] [--async]
import { readFileSync } from 'node:fs'
import { compile } from 'svelte/compiler'

const args = process.argv.slice(2)
const async = args.includes('--async')
const [file = 'Counter.svelte', generate = 'client'] = args.filter((arg) => arg !== '--async')

const result = compile(readFileSync(file, 'utf8'), {
  filename: file,
  generate,
  experimental: { async },
})

for (const warning of result.warnings) console.error(`warning ${warning.code}: ${warning.message}`)
console.log(result.js.code)
