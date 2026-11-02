#!/usr/bin/env node
// Usage: node tasklet/tools/size.mjs <distDir> [--json]
// Prints the raw and gzip (zlib level 9) size of every .js, .css and .html
// file under <distDir> (source maps excluded), per file and in total.
// 1 kB = 1000 bytes, as in Vite's build output.
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const json = args.includes('--json')
const dir = args.find((arg) => !arg.startsWith('--'))
if (!dir) {
  console.error('usage: node size.mjs <distDir> [--json]')
  process.exit(1)
}

const kinds = new Set(['.js', '.mjs', '.css', '.html'])
const files = readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && kinds.has(extname(entry.name)))
  .map((entry) => {
    const path = join(entry.parentPath, entry.name)
    const bytes = readFileSync(path)
    return {
      file: relative(dir, path),
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
    }
  })
  .sort((a, b) => a.file.localeCompare(b.file))

const sum = (kind) => files.reduce((total, f) => total + f[kind], 0)
const total = { raw: sum('raw'), gzip: sum('gzip') }

if (json) {
  console.log(JSON.stringify({ dir, files, total }, null, 2))
} else {
  const kb = (n) => `${(n / 1000).toFixed(2)} kB`.padStart(10)
  const width = Math.max(5, ...files.map((f) => f.file.length))
  console.log(`${'file'.padEnd(width)}  ${'raw'.padStart(10)}  ${'gzip'.padStart(10)}`)
  for (const f of files) console.log(`${f.file.padEnd(width)}  ${kb(f.raw)}  ${kb(f.gzip)}`)
  console.log(`${'total'.padEnd(width)}  ${kb(total.raw)}  ${kb(total.gzip)}`)
}
