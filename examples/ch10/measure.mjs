// Bundles each library the way an app imports it, minified, and reports
// raw, gzip (level 9) and brotli sizes in bytes.
import { readFile } from 'node:fs/promises'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { build } from 'esbuild'

async function bundle(contents) {
  const result = await build({
    stdin: { contents, resolveDir: import.meta.dirname },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
  })
  return result.outputFiles[0].contents
}

function sizes(label, bytes) {
  const gzip = gzipSync(bytes, { level: 9 }).length
  const brotli = brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length
  console.log(`${label.padEnd(44)} ${String(bytes.length).padStart(6)} ${String(gzip).padStart(6)} ${String(brotli).padStart(7)}`)
}

console.log(`${'bundle'.padEnd(44)} ${'raw'.padStart(6)} ${'gzip'.padStart(6)} ${'brotli'.padStart(7)}`)
sizes('vanjs-core (esbuild)', await bundle(`import van from 'vanjs-core'; window.van = van`))
sizes('vanjs-core + vanjs-ext (esbuild)', await bundle(`import van from 'vanjs-core'; import * as vanX from 'vanjs-ext'; window.van = van; window.vanX = vanX`))
sizes('mithril (esbuild, whole default export)', await bundle(`import m from 'mithril'; window.m = m`))
sizes('mithril/mithril.min.js (as published)', await readFile('node_modules/mithril/mithril.min.js'))
