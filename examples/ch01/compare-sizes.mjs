// Exercise 3: compare the gzip size of several Tasklet builds with the vanilla one.
// Run from the course root after building the apps:
//   node examples/ch01/compare-sizes.mjs vanilla react
import { execFileSync } from 'node:child_process'

const apps = process.argv.slice(2)
const gzip = (app) => {
  const out = execFileSync('node', ['tasklet/tools/size.mjs', `tasklet/${app}/dist`, '--json'])
  return JSON.parse(out.toString()).total.gzip
}

const base = gzip('vanilla')
for (const app of apps) {
  const size = gzip(app)
  console.log(`${app.padEnd(10)} ${(size / 1000).toFixed(2).padStart(7)} kB  ${(size / base).toFixed(1)}× vanilla`)
}
