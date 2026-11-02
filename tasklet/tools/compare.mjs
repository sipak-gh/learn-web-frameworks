#!/usr/bin/env node
// Usage: node tasklet/tools/compare.mjs [app …] [--runs N] [--json]
//
// Measures every Tasklet app (or the ones named) the same way, one after the
// other, and prints a Markdown table. Also writes compare-results.json next to
// this script.
//
//   build    the manifest's build command (tasklet.json), run N times (default
//            3); the table shows the median wall-clock time. `npm ci` first
//            only if node_modules is missing; it is not timed.
//   size     gzip (level 9) and raw size of what the browser can download, via
//            size.mjs: every .js/.mjs/.css/.html file in the build output.
//            htmx has no build output, so its server is started and the page
//            it renders, plus every script and stylesheet the page links to,
//            is fetched and measured the same way.
//   lines    newline count (as `wc -l`) of the app's own source: files under
//            src/ ending in .ts .tsx .js .jsx .vue .svelte .html, without
//            type declarations (.d.ts), unit tests (.spec/.test) and
//            src/index.html (Angular's host page). CSS, tasks.json, config
//            files and build output are not counted. Alpine's template lives
//            in the root index.html, so that file is counted for Alpine.
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const TOOLS_DIR = import.meta.dirname
const TASKLET_DIR = resolve(TOOLS_DIR, '..')

// The main package of each app, to report the version actually installed.
const PACKAGE = {
  react: 'react', vue: 'vue', svelte: 'svelte', angular: '@angular/core', solid: 'solid-js',
  preact: 'preact', mithril: 'mithril', vanjs: 'vanjs-core', qwik: '@builder.io/qwik', lit: 'lit',
  htmx: 'htmx.org', alpine: 'alpinejs',
}
// Build output folders that are not dist/.
const OUTPUT = { angular: 'dist/angular/browser' }
// Entry pages that hold the app's template (counted as source).
const TEMPLATE_PAGES = { alpine: ['index.html'] }

const args = process.argv.slice(2)
const runsIndex = args.indexOf('--runs')
const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 3
const requested = args.filter((arg, i) => !arg.startsWith('--') && (runsIndex < 0 || i !== runsIndex + 1))
const printJson = args.includes('--json')

const manifests = readdirSync(TASKLET_DIR)
  .filter((id) => existsSync(join(TASKLET_DIR, id, 'tasklet.json')))
  .map((id) => ({ id, ...JSON.parse(readFileSync(join(TASKLET_DIR, id, 'tasklet.json'), 'utf8')) }))
  .filter((app) => requested.length === 0 || requested.includes(app.id))
  .sort((a, b) => a.port - b.port)

function version(app) {
  const name = PACKAGE[app.id]
  if (!name) return '—'
  const file = join(TASKLET_DIR, app.id, 'node_modules', name, 'package.json')
  return JSON.parse(readFileSync(file, 'utf8')).version
}

function sh(command, cwd) {
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr)
    throw new Error(`"${command}" failed in ${cwd}`)
  }
}

function timeBuild(app) {
  const dir = join(TASKLET_DIR, app.id)
  if (!existsSync(join(dir, 'node_modules'))) sh('npm ci', dir)
  const seconds = []
  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    sh(app.build, dir)
    seconds.push((performance.now() - start) / 1000)
  }
  const sorted = [...seconds].sort((a, b) => a - b)
  return { runs: seconds.map((s) => Number(s.toFixed(2))), median: Number(sorted[Math.floor(sorted.length / 2)].toFixed(2)) }
}

function summarize(files) {
  const sum = (list, key) => list.reduce((total, f) => total + f[key], 0)
  const js = files.filter((f) => ['.js', '.mjs'].includes(extname(f.file)))
  return {
    files: files.length,
    raw: sum(files, 'raw'),
    gzip: sum(files, 'gzip'),
    jsGzip: sum(js, 'gzip'),
    largest: files.reduce((a, b) => (b.gzip > (a?.gzip ?? -1) ? b : a), null)?.file,
  }
}

function sizeOfBuild(app) {
  const dir = join(TASKLET_DIR, app.id, OUTPUT[app.id] ?? 'dist')
  const out = execFileSync('node', [join(TOOLS_DIR, 'size.mjs'), dir, '--json'], { encoding: 'utf8' })
  return { measured: relative(TASKLET_DIR, dir), ...summarize(JSON.parse(out).files) }
}

async function waitUntilUp(url, server) {
  for (const deadline = Date.now() + 30_000; Date.now() < deadline; ) {
    if (server.exitCode !== null) break
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  throw new Error(`${url} did not start`)
}

// For a server-rendered app: what a browser downloads for the first page.
async function sizeOfServedPage(app) {
  const base = `http://localhost:${app.port}/`
  try {
    await fetch(base, { signal: AbortSignal.timeout(1000) })
    throw new Error(`port ${app.port} already in use`)
  } catch (error) {
    if (error.message.startsWith('port')) throw error
  }
  const server = spawn(app.serve, { cwd: join(TASKLET_DIR, app.id), shell: true, detached: true, stdio: 'ignore' })
  try {
    await waitUntilUp(base, server)
    await fetch(new URL('__reset', base), { method: 'POST' })
    const page = Buffer.from(await (await fetch(base)).arrayBuffer())
    const html = page.toString('utf8')
    const links = [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*\shref)="([^"]+)"/g)].map((m) => m[1])
    const assets = [{ file: 'index.html', bytes: page }]
    for (const link of links) {
      const url = new URL(link, base)
      if (!['.js', '.mjs', '.css'].includes(extname(url.pathname))) continue
      assets.push({ file: url.pathname.slice(1), bytes: Buffer.from(await (await fetch(url)).arrayBuffer()) })
    }
    const files = assets.map(({ file, bytes }) => ({ file, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length }))
    return { measured: `GET ${base} + linked assets`, ...summarize(files) }
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      // Already gone.
    }
  }
}

function sourceLines(app) {
  const dir = join(TASKLET_DIR, app.id)
  const kinds = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html'])
  const files = readdirSync(join(dir, 'src'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && kinds.has(extname(entry.name)))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .filter((file) => !/\.d\.ts$|\.(spec|test)\.[jt]sx?$/.test(file) && file !== join('src', 'index.html'))
    .concat(TEMPLATE_PAGES[app.id] ?? [])
    .sort()
  const count = (file) => (readFileSync(join(dir, file), 'utf8').match(/\n/g) ?? []).length
  return { files: files.length, lines: files.reduce((total, file) => total + count(file), 0), list: files }
}

const results = []
for (const app of manifests) {
  process.stderr.write(`${app.id}: building ×${runs}…`)
  const build = timeBuild(app)
  process.stderr.write(` ${build.runs.join(' / ')} s, measuring…`)
  const size = app.persistence === 'server' ? await sizeOfServedPage(app) : sizeOfBuild(app)
  const source = sourceLines(app)
  process.stderr.write(' done\n')
  results.push({ app: app.id, name: app.name, version: version(app), build, size, source })
}

const kb = (bytes) => (bytes / 1000).toFixed(2)
const vanilla = results.find((r) => r.app === 'vanilla')
console.log('| App | Version | Files | Raw kB | Gzip kB | JS gzip kB | × vanilla | Source lines (files) | Build s (median) |')
console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const r of results) {
  const ratio = vanilla ? (r.size.gzip / vanilla.size.gzip).toFixed(1) : '—'
  console.log(
    `| ${r.name} | ${r.version} | ${r.size.files} | ${kb(r.size.raw)} | ${kb(r.size.gzip)} | ${kb(r.size.jsGzip)} | ${ratio} | ${r.source.lines} (${r.source.files}) | ${r.build.median.toFixed(2)} |`,
  )
}

const report = {
  date: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  runs,
  results,
}
const json = `${JSON.stringify(report, null, 2)}\n`
writeFileSync(join(TOOLS_DIR, 'compare-results.json'), json)
if (printJson) console.log(`\n${json}`)
console.log(`\nJSON: ${relative(process.cwd(), join(TOOLS_DIR, 'compare-results.json'))}`)
