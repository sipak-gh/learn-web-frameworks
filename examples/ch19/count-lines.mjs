// Usage: node count-lines.mjs
//
// Recounts the source files listed in tasklet/tools/compare-results.json
// three ways: every line (as compare.mjs does), non-blank lines, and
// non-blank lines that are not only a comment. The comment test is a simple
// one (a line starting with //, /*, *, */ or <!--), good enough for Tasklet.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const TASKLET_DIR = resolve(import.meta.dirname, '../../tasklet')
const { results } = JSON.parse(readFileSync(join(TASKLET_DIR, 'tools/compare-results.json'), 'utf8'))
const comment = /^(\/\/|\/\*|\*|<!--)/

const rows = results.map(({ app, source }) => {
  const lines = source.list.flatMap((file) => readFileSync(join(TASKLET_DIR, app, file), 'utf8').split('\n').slice(0, -1))
  const code = lines.map((line) => line.trim()).filter((line) => line !== '')
  return { app, all: lines.length, nonBlank: code.length, code: code.filter((line) => !comment.test(line)).length }
})

console.log(`${'app'.padEnd(10)} ${'all'.padStart(5)} ${'non-blank'.padStart(10)} ${'code'.padStart(5)}`)
for (const row of rows.sort((a, b) => a.code - b.code)) {
  console.log(`${row.app.padEnd(10)} ${String(row.all).padStart(5)} ${String(row.nonBlank).padStart(10)} ${String(row.code).padStart(5)}`)
}
