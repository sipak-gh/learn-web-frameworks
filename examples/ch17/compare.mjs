// Compares the builds in dist/<tool>/: JavaScript files (no source maps), raw and gzip
// size, and whether the unused export survived tree shaking.
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const kb = (n) => `${(n / 1000).toFixed(2)} kB`.padStart(9)

for (const tool of ['vite', 'esbuild', 'rolldown', 'rspack', 'bun']) {
  const dir = join('dist', tool)
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === '.js')
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
  let raw = 0
  let gzip = 0
  let unused = false
  for (const file of files) {
    const bytes = readFileSync(file)
    raw += bytes.length
    gzip += gzipSync(bytes, { level: 9 }).length
    unused ||= bytes.includes('UNUSED REPORT')
  }
  const names = files.map((file) => relative(dir, file)).join(', ')
  console.log(`${tool.padEnd(9)}${kb(raw)}${kb(gzip)}  unused export: ${unused ? 'kept' : 'removed'}  ${names}`)
}
