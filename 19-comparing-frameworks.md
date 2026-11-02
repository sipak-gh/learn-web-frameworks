# Chapter 19 — Comparing Frameworks

You have now built the same app thirteen times. Each chapter judged its framework on its own terms; this one
sets them side by side. It starts with what you can measure yourself: a script that builds every Tasklet app
the same way and reports its size, its source lines and its build time, and one run of the acceptance suite
across all thirteen apps. Then it turns to evidence from outside the course: the js-framework-benchmark, the
State of JavaScript and Stack Overflow surveys, npm downloads, GitHub stars and the HTTP Archive's Web
Almanac. Last come the qualities no script measures well: who owns and funds each project, how often it
breaks your code, how good its TypeScript support is, how long it takes to learn, how big its ecosystem and
job market are, and what it offers for server rendering. The chapter ends with a matrix of the course's
comparison axes and a table of pros and cons for every framework.

Every number here is dated. Sizes, downloads and survey results change, sometimes within weeks, so each
section says when its data was collected (most of it on November 2, 2026) and how you can collect it again.
More important than any single number is knowing what it measures and what it leaves out, and most of this
chapter is about that.

[Chapter 20](20-choosing-a-framework.md) then turns the comparison into decisions: the questions to ask
about a project, and a recommendation, a runner-up and the reasons against for a dozen common scenarios.

## Three kinds of evidence

Before the numbers, sort the evidence by the question it answers:

- **What you measure yourself.** Tasklet is small, but every app implements the same behavior and passes
  the same tests, so differences in size, code and build come from the framework and its idioms. These
  numbers are reproducible: you can run the script and get the same sizes.
- **Lab benchmarks.** The js-framework-benchmark measures how fast each framework creates, updates and
  removes thousands of table rows. It is careful and public, but it tests one kind of work, at a scale
  most screens never reach.
- **Adoption signals.** Surveys, download counts, GitHub stars and crawls of the web estimate how many
  people use a framework and how they feel about it. None of them counts what you actually care about
  (how many teams ship working products with it), and each counts something nearby with its own bias.

A fourth kind isn't a number at all: governance, release history, tooling and learning curve. You judge them
from the record, which is why the last third of the chapter describes the record.

## Measuring Tasklet

The course already has `tasklet/tools/size.mjs`, which every framework chapter used for one app at a time.
`tasklet/tools/compare.mjs` runs the same measurement for all thirteen apps, one after the other, and adds
build time and source lines. It has no dependencies beyond Node:

`tasklet/tools/compare.mjs`
```js
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
```

The three measurements need precise definitions, because each could be defined differently:

- **Size** is what a browser can download for the app: every `.js`, `.mjs`, `.css` and `.html` file in the
  build output, compressed with gzip at level 9, as `size.mjs` has done all course. "JS gzip" is the
  JavaScript part alone. For most apps this is also what the page loads; Qwik is the exception, covered
  below.
- **htmx** has no build output to measure: the server renders the page on each request. So the script
  starts the htmx server, resets its data to the seed tasks, requests the page, and fetches every script and
  stylesheet the page links to. That is what a browser downloads on a first visit: `htmx.min.js`, the
  stylesheet and the rendered HTML with three tasks in it. Each later action downloads a small HTML
  fragment, which this number doesn't include, while the client-side apps download nothing more.
- **Source lines** are lines (as `wc -l` counts them) in the files you wrote for the app: TypeScript,
  JavaScript, JSX, `.vue`, `.svelte` and HTML templates under `src/`. It leaves out CSS (shared by all apps),
  `tasks.json`, configuration files, type declarations and generated files. For htmx the counted files are
  the server's, because that is where its rendering code lives. For Alpine the root `index.html` counts,
  because the whole template is there. Angular's `src/index.html` is a host page with one tag, so it
  doesn't.
- **Build time** is the wall-clock time of the app's own `build` command from its `tasklet.json`, run three
  times, and the median reported. It includes type checking where the app's build does it.

Run it from the course root. The progress lines go to standard error and the table to standard output:

```console
$ node tasklet/tools/compare.mjs
vanilla: building ×3… 0.4 / 0.37 / 0.38 s, measuring… done
react: building ×3… 0.39 / 0.38 / 0.37 s, measuring… done
vue: building ×3… 1.29 / 1.2 / 1.25 s, measuring… done
svelte: building ×3… 1.92 / 1.88 / 1.87 s, measuring… done
angular: building ×3… 1.5 / 1.51 / 1.54 s, measuring… done
solid: building ×3… 2.17 / 2.13 / 2.18 s, measuring… done
preact: building ×3… 0.43 / 0.4 / 0.4 s, measuring… done
mithril: building ×3… 0.23 / 0.23 / 0.24 s, measuring… done
vanjs: building ×3… 0.23 / 0.23 / 0.22 s, measuring… done
qwik: building ×3… 2.6 / 2.92 / 3.11 s, measuring… done
lit: building ×3… 0.3 / 0.3 / 0.3 s, measuring… done
htmx: building ×3… 0.15 / 0.15 / 0.16 s, measuring… done
alpine: building ×3… 0.25 / 0.24 / 0.24 s, measuring… done
| App | Version | Files | Raw kB | Gzip kB | JS gzip kB | × vanilla | Source lines (files) | Build s (median) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Vanilla TypeScript | — | 3 | 7.12 | 3.16 | 1.93 | 1.0 | 309 (8) | 0.38 |
| React | 19.3.1 | 3 | 225.51 | 70.14 | 68.92 | 22.2 | 249 (7) | 0.38 |
| Vue | 3.5.44 | 3 | 72.34 | 28.37 | 27.14 | 9.0 | 207 (7) | 1.25 |
| Svelte | 5.57.3 | 3 | 45.27 | 17.76 | 16.53 | 5.6 | 194 (7) | 1.88 |
| Angular | 22.2.4 | 3 | 241.20 | 76.97 | 75.31 | 24.4 | 263 (13) | 1.51 |
| Solid | 1.9.18 | 3 | 26.44 | 10.37 | 9.11 | 3.3 | 262 (8) | 2.17 |
| Preact | 11.1.1 | 3 | 29.60 | 11.74 | 10.50 | 3.7 | 260 (8) | 0.40 |
| Mithril | 2.3.8 | 3 | 31.69 | 11.94 | 10.71 | 3.8 | 224 (7) | 0.23 |
| VanJS | 1.6.2 | 3 | 11.12 | 4.95 | 3.72 | 1.6 | 231 (7) | 0.23 |
| Qwik | 1.20.3 | 35 | 101.59 | 45.71 | 41.47 | 14.5 | 428 (11) | 2.92 |
| Lit | 3.3.3 | 2 | 28.37 | 10.64 | 10.40 | 3.4 | 323 (8) | 0.30 |
| htmx | 2.0.11 | 3 | 58.99 | 19.09 | 16.88 | 6.0 | 345 (4) | 0.15 |
| Alpine.js | 3.17.5 | 3 | 61.91 | 21.82 | 19.86 | 6.9 | 239 (6) | 0.24 |

JSON: tasklet/tools/compare-results.json
```

This run was on November 2, 2026, with Node.js 26.13.0 on a Linux laptop (an Intel Core i9-13950HX).
`compare-results.json` keeps every build time, the largest file of each build and the list of files counted
as source, so you can check what went into each number. Every size matches the one measured in the
framework's own chapter: the builds are reproducible to the byte. The one exception is Qwik, whose
prerendered page contains a random instance ID, so its total moves by a byte or two between builds (45.70 kB
in Chapter 11, 45.71 kB here).

## What the numbers mean, and what they don't

### Size is mostly the framework's fixed cost

Tasklet's own code is small. The vanilla build, with no library at all, is 3.16 kB, and 1.2 kB of that is
the CSS and the HTML page that every app shares. Everything above about 3 kB in the table is the price of the
framework's runtime, plus whatever a framework's idioms add to the app's own code. That price is mostly
paid once. A screen ten times larger would add its own code, perhaps 15 or 20 kB, but not a second copy of
React DOM. So the ratio column ("22.2× vanilla") is true of Tasklet and misleading for a real app: as an app
grows, the gap between frameworks shrinks in relative terms, while the absolute baseline stays.

That still matters, for three reasons. The baseline is the floor for every page that uses the framework, so a
content page with one small interactive widget pays all of it. It is parsed and executed on the device, which
costs more on a low-end phone than on the laptop that measured it. And it is the part you can't optimize
away later without changing frameworks.

Sorting by gzipped size puts the apps into four groups:

- **Under 5 kB:** vanilla (3.16 kB) and VanJS (4.95 kB). VanJS's core is about 1 kB; the rest is Tasklet.
- **10–12 kB:** Solid (10.37), Lit (10.64), Preact (11.74) and Mithril (11.94). Four different designs
  (compiled signals, Web Components, a small virtual DOM with signals, and a virtual DOM with a router and
  HTTP client built in) land within 1.6 kB of each other.
- **17–29 kB:** Svelte (17.76), htmx (19.09, all of it downloaded before any action), Alpine (21.82) and Vue
  (28.37). Svelte's compiled components still import runtime helpers; Alpine includes Vue's reactivity
  package and the code that walks the page and evaluates its directives.
- **Over 45 kB:** Qwik (45.71 total, much less loaded), React (70.14) and Angular (76.97).

The chapters measured variations that move frameworks between groups. Vue's Vapor mode build was 26.13 kB.
React with the React Compiler grew slightly, to 71.03 kB. Angular without Signal Forms and `HttpClient` was
46.05 kB, so most of its total is features that a larger app would use anyway. Preact running the React
app's code through `preact/compat` was 9.62 kB. A size is a property of a framework *and* a set of features,
not of the framework alone.

### Qwik: what is built versus what is loaded

Qwik's 45.71 kB is spread over 35 files because its optimizer splits the code at every `$`. The browser
doesn't fetch all of them. To see what a page actually fetches, you need a browser, not a file listing.
`examples/ch19/first-load.mjs` starts an app's preview server, loads the page in headless Chromium, and adds up
(gzipped) the HTML, JavaScript and CSS it receives, first when the task list is visible and again after one
click:

`examples/ch19/first-load.mjs`
```js
// Usage: node first-load.mjs [app …]   (default: react qwik svelte)
//
// Opens each built Tasklet app in headless Chromium and adds up, gzipped, the
// HTML, JavaScript and CSS the browser fetched: first until the task list is
// on screen, then again after one click on a checkbox. Run the app's build
// first (tasklet/tools/compare.mjs does). Each server is stopped afterwards.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const TASKLET_DIR = resolve(import.meta.dirname, '../../tasklet')
const apps = process.argv.length > 2 ? process.argv.slice(2) : ['react', 'qwik', 'svelte']
const counted = new Set(['document', 'script', 'stylesheet'])

async function waitUntilUp(url) {
  for (const deadline = Date.now() + 30_000; Date.now() < deadline; ) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  throw new Error(`${url} did not start`)
}

const browser = await chromium.launch()
console.log('app        first load (JS of it)          after one click')
for (const id of apps) {
  const app = JSON.parse(readFileSync(join(TASKLET_DIR, id, 'tasklet.json'), 'utf8'))
  const url = `http://localhost:${app.port}/`
  const server = spawn(app.serve, { cwd: join(TASKLET_DIR, id), shell: true, detached: true, stdio: 'ignore' })
  try {
    await waitUntilUp(url)
    const page = await browser.newPage()
    const fetched = []
    page.on('response', (response) => {
      const type = response.request().resourceType()
      if (!counted.has(type)) return
      const body = response.body().catch(() => Buffer.alloc(0))
      fetched.push(body.then((bytes) => ({ type, gzip: gzipSync(bytes, { level: 9 }).length })))
    })
    const total = async () => {
      const files = await Promise.all(fetched)
      const kb = (list) => (list.reduce((sum, f) => sum + f.gzip, 0) / 1000).toFixed(2)
      return `${files.length} files ${kb(files)} kB (${kb(files.filter((f) => f.type === 'script'))})`
    }
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.getByRole('list', { name: 'Tasks' }).waitFor()
    const first = await total()
    await page.getByRole('checkbox').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    console.log(`${id.padEnd(10)} ${first.padEnd(30)} ${await total()}`)
    await page.close()
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      // Already gone.
    }
  }
}
await browser.close()
```

```console
$ cd examples/ch19 && npm install && node first-load.mjs react qwik svelte solid
app        first load (JS of it)          after one click
react      3 files 70.14 kB (68.92)       3 files 70.14 kB (68.92)
qwik       13 files 31.60 kB (28.74)      13 files 31.60 kB (28.74)
svelte     3 files 17.76 kB (16.53)       3 files 17.76 kB (16.53)
solid      3 files 10.37 kB (9.11)        3 files 10.37 kB (9.11)
```

The bundled apps load everything at once, so their numbers equal the build size. Qwik's page fetched 13 of
its 35 files: the HTML and 12 JavaScript files totaling 28.74 kB, the same figure as
[Chapter 11](11-qwik.md). The click fetched nothing more, because Qwik's preloader had already downloaded the
handlers in idle time. Two things stand out. First, Qwik's advantage isn't in bytes on this app: 28.74 kB is
more than Svelte or Solid load, because Tasklet is client-only and the task list is visible at once. Second,
what Qwik changes is *execution*: it doesn't re-run components to hydrate the page, which matters most on
large server-rendered pages on slow phones, a case Tasklet doesn't exercise.

### Source lines measure idioms, not productivity

The line counts range from 194 (Svelte) to 428 (Qwik). The spread is real but narrower than it looks:

- **Qwik** counts 121 lines of starter files (`root.tsx`, `entry.ssr.tsx`, `entry.dev.tsx` and the
  router head) that every Qwik City project has. Its own Tasklet code is 307 lines.
- **htmx** counts its server: the HTTP handling, the routes and the HTML templates are 345 lines in four
  files. Those lines replace both a client app and an API; a comparable client app also needs a server to
  talk to, which the other apps don't count.
- **Lit** (323) pays for classes, decorators and styles adopted per shadow root; **vanilla** (309) pays for
  writing the DOM updates by hand.
- **Svelte** (194) and **Vue** (207) are shortest because their templates state structure compactly and
  their reactivity needs no setters.

Everything in the middle, from Mithril's 224 to Angular's 263, is within 40 lines, about 15%. Different
formatting conventions or a different file split would move an app by that much. A line count also says
nothing about how hard each line was to write: Svelte's 194 lines rely on rules (a destructured value isn't
reactive) that Mithril's 224 lines don't need. Exercise 1 recounts the same files without blank and comment
lines, and the order changes a little.

### Build time measures toolchains, and only roughly

Build times run from 0.15 s (htmx) to 2.92 s (Qwik), but they compare different work:

- **Mithril, VanJS and Alpine** (0.23–0.24 s) are plain JavaScript, so their build is Vite alone, with no
  type check.
- **React, Preact, Lit and vanilla** (0.30–0.40 s) run `tsc` with TypeScript 7, the native compiler, then
  Vite. **htmx**'s build is only the TypeScript 7 check of its server.
- **Vue** (1.25 s) and **Svelte** (1.88 s) check types with TypeScript 6, through `vue-tsc` and
  `svelte-check`, because those tools don't run on TypeScript 7 yet. TypeScript 6 is the older compiler
  written in TypeScript, several times slower than TypeScript 7.
- **Solid** (2.17 s) uses TypeScript 7's `tsc`, but its type check alone takes about 1.7 s: checking
  Solid's JSX types creates over 700,000 types (`tsc --extendedDiagnostics`), where React's app needs about
  6,000.
- **Angular** (1.51 s) uses its own builder, which caches between runs.
- **Qwik** (2.92 s) runs four steps: a type check with TypeScript 5.4, a client build, a server build and
  static generation, on Vite 7.

The first of the three runs is usually slowest, as caches warm up. Differences under half a second are noise
on a laptop that is also doing other things. For a real project, the times that matter are the development
server's start and its hot updates, and the full CI build of a large app, where whether the type checker
can use TypeScript 7 makes a large difference. [Chapter 17](17-build-tools.md)
covers both.

### What Tasklet doesn't measure

Tasklet has one screen, three tasks and no routing, forms library, server data cache, animation,
internationalization or accessibility beyond the basics. It says nothing about how a framework behaves with
200 components, ten developers or a five-year-old code base. It also doesn't measure runtime speed, because
every framework updates three list items instantly. For that, you need a benchmark built to stress updates.

## The acceptance suite, once more

Size and lines would mean little if the apps didn't do the same thing. The acceptance suite from
[Chapter 3](03-the-problem-frameworks-solve.md) runs the same 15 Playwright tests against every app. One
serial run, from build to summary, took about a minute on November 2, 2026:

```console
$ cd tasklet/e2e && node run-all.mjs
=== Alpine.js (tasklet/alpine, port 4313) ===
…
Summary
app      port  build  passed  failed  skipped  note
alpine   4313  ok     15      0       0
angular  4305  ok     15      0       0
htmx     4312  ok     9       0       6
lit      4311  ok     15      0       0
mithril  4308  ok     15      0       0
preact   4307  ok     15      0       0
qwik     4310  ok     15      0       0
react    4302  ok     15      0       0
solid    4306  ok     15      0       0
svelte   4304  ok     15      0       0
vanilla  4301  ok     15      0       0
vanjs    4309  ok     15      0       0
vue      4303  ok     15      0       0
```

Twelve apps pass all 15 tests. htmx passes 9 and skips 6 on purpose: its tasks live on the server, so the
tests for the loading state, the two error states, `localStorage` writes, saved data and invalid saved data
don't apply. Its manifest lists them under `skip`, and [Chapter 13](13-htmx.md) explains why. Everything else
(adding, trimming, toggling, deleting, filtering with `aria-pressed`, the empty message, the pluralized count,
Clear done and keeping changes after a reload) behaves identically in all thirteen apps.

## The js-framework-benchmark

Stefan Krause's js-framework-benchmark is the standard public comparison of rendering speed. Each
implementation renders the same table, and an automated Chrome runs the same operations against it: create
1,000 rows, replace them, update every tenth row, select a row, swap two rows, remove a row, create 10,000
rows, append 1,000, and clear. It records the duration of each, memory use, the size of the code, and the time
to first paint. Since Chrome 118 the overall score is a weighted geometric mean of the slowdown against the
fastest implementation, so 1.00 would be the fastest in every test.

The official results are published per Chrome version. The latest, for Chrome 156, came out on October 25,
2026, with 201 keyed implementations ("keyed" means each row is tied to its data item, as Tasklet's lists
are; non-keyed implementations may reuse rows and are ranked separately). Selected rows:

| Rank of 201 | Implementation | CPU (weighted mean) | Memory | Compressed size (kB) | First paint (ms) |
| ---: | --- | ---: | ---: | ---: | ---: |
| 4 | vanillajs | 1.02 | 1.06 | 2.5 | 40.7 |
| 24 | marko 6.3.28 | 1.10 | 1.29 | 4.8 | 49.4 |
| 30 | inferno 10.0.0 | 1.12 | 1.32 | 9.3 | 66.9 |
| 33 | vue-vapor 3.6.0-rc.5 | 1.12 | 1.63 | 18.7 | 90.2 |
| 46 | solid 1.9.3 | 1.14 | 1.28 | 4.5 | 53.5 |
| 58 | svelte 5.42.1 | 1.19 | 1.48 | 9.7 | 65.5 |
| 73 | lit-html 3.2.0 | 1.24 | 1.31 | 4.5 | 51.7 |
| 85 | lit 3.2.0 | 1.28 | 1.45 | 7.3 | 53.8 |
| 90 | vue 3.5.39 | 1.30 | 1.92 | 23.3 | 95.8 |
| 96 | preact-classes 11.0.0 | 1.31 | 1.46 | 6.2 | 55.1 |
| 97 | hyperapp 2.0.22 | 1.31 | 1.27 | 2.6 | 56.4 |
| 114 | preact-signals 11.0.0 | 1.39 | 3.74 | 8.3 | 61.6 |
| 129 | vanjs 1.5.2 | 1.48 | 1.12 | 2.0 | 47.6 |
| 133 | angular-cf-new-nozone 22.2.2 | 1.51 | 2.29 | 33.2 | 139.3 |
| 141 | react-hooks 19.2.0 | 1.56 | 2.62 | 51.4 | 228.1 |
| 147 | mithril 2.2.2 | 1.58 | 1.63 | 11.7 | 74.3 |
| 151 | react-compiler-hooks 19.0.0 | 1.61 | 2.64 | 50.0 | 223.6 |
| 153 | preact-hooks 11.0.0 | 1.62 | 1.43 | 5.9 | 56.7 |
| 170 | stencil 4.23.0 | 1.77 | 1.51 | 7.2 | 58.3 |
| 186 | ember 7.3.0-alpha.5 | 2.04 | 8.92 | 38.4 | 161.4 |
| 197 | alpine 3.14.7 | 2.98 | 3.36 | 14.7 | 73.2 |
| 199 | qwik 1.20.2 | 3.31 | 4.67 | 30.5 | 97.9 |

The top three places go to small, specialized libraries and hand-tuned vanilla variants. htmx has no entry:
its updates come from a server, which the benchmark doesn't model.

What the table supports:

- **The design families separate, a little.** Compiled and fine-grained frameworks (Marko, Vue Vapor,
  Solid, Svelte) sit between 1.10 and 1.19, close to vanilla. Virtual DOM libraries (Vue's default mode,
  Preact, React, Mithril) sit between 1.30 and 1.62. Angular, now signal-driven and zoneless, sits with
  React. The order matches [Chapter 15](15-reactivity-compared.md)'s explanation of the three families.
- **Vapor delivers what it promises.** Vue 3.6 in Vapor mode scores 1.12 against 1.30 for standard Vue,
  the same as Solid.
- **Sizes agree with Tasklet, roughly.** The benchmark's app and compression differ, but the same groups
  appear: Solid, Lit and Preact small, Vue in the middle, Angular and React largest.

What it doesn't support:

- **"React is slow."** A score of 1.56 means React takes about half again as long as the fastest
  implementation across operations on 1,000 to 10,000 rows. On a typical screen, with dozens of elements
  changing per interaction, every framework in the table finishes within a frame.
- **Rankings for Alpine and Qwik in real use.** Both are built for other jobs. Alpine evaluates expressions
  written in attributes, which costs time in a 10,000-row table and none worth noticing on a server-rendered
  page with a few widgets. Qwik's design aims at start-up, which this test, run after the page is loaded,
  barely measures.
- **Comparisons across releases.** The maintainers warn against comparing results from different Chrome
  versions; the machine and the browser change between runs. The framework versions also lag: the benchmark
  measured Svelte 5.42 and Mithril 2.2, while Tasklet uses 5.57 and 2.3.

Use the benchmark when your app really renders large, frequently updated tables or lists: trading screens,
log viewers, spreadsheets. For everything else, the size and first-paint columns tell you more than the CPU
column.

## Adoption and sentiment

### State of JavaScript 2025

The State of JavaScript survey is run each year by Devographics. The latest edition, State of JavaScript
2025, ran from September 24 to November 10, 2025, collected 13,002 responses and was published on February 3,
2026. No 2026 edition has been announced as of November 2026. About 12,000 respondents answered the
front-end framework questions:

| Framework | Usage | Awareness | Interest | Retention 2025 | Retention 2024 |
| --- | ---: | ---: | ---: | ---: | ---: |
| React | 85% | 99% | 27% | 72% | 75% |
| Vue.js | 52% | 99% | 47% | 84% | 87% |
| Angular | 48% | 98% | 16% | 48% | 54% |
| Svelte | 27% | 96% | 63% | 86% | 88% |
| Preact | 15% | 82% | 27% | 81% | 80% |
| Lit | 10% | 51% | 32% | 67% | 66% |
| Solid | 10% | 78% | 55% | 89% | 90% |
| Alpine.js | 9% | 64% | 27% | 77% | 76% |
| HTMX | 9% | 78% | 37% | 69% | 72% |
| Stencil | 4% | 36% | 17% | 45% | 51% |
| Qwik | 3% | 59% | 33% | 64% | 74% |

The ratios have specific meanings. *Usage* is the share of respondents who have used the framework.
*Retention* is the share of those users who would use it again (the survey's "satisfaction"). *Interest* is
the share of people who have heard of it but not used it who want to learn it. *Awareness* is the share who
have heard of it.

Three readings hold up. React is nearly universal among respondents and its retention is falling slowly,
from 75% to 72%. Solid has the highest retention, 89%, and the survey notes it has held that position for five
years running, though only one respondent in ten has used it. Angular's retention, 48%, is the lowest of the
large frameworks, which fits a framework many people use at work by assignment. The survey's own summary also
notes that Qwik lost the most ground in retention, from 74% to 64%, and that Solid and Preact were the only
frameworks gaining interest.

The limits are just as important. The survey is opt-in, its audience leans toward people who follow
JavaScript news, and frameworks can (and do) promote it to their own users. Mithril and VanJS aren't listed,
so absence means nothing. Retention measures how users feel, which is not the same as how their projects
turned out.

### Stack Overflow Developer Survey 2026

Stack Overflow's survey reaches a broader and more work-focused group: 30,903 valid responses, collected
from June 23 to August 5, 2026. Its "web frameworks and technologies" question mixes front-end and back-end
tools. Of 10,281 people who answered it, the share who did extensive work with each in the past year:

| Technology | Share | Technology | Share |
| --- | ---: | --- | ---: |
| Node.js | 46.4% | Svelte | 7.8% |
| React | 41.5% | Astro | 6.2% |
| Next.js | 20.6% | AngularJS | 6.0% |
| jQuery | 19.7% | SvelteKit | 5.6% |
| Vue.js | 17.2% | htmx | 5.4% |
| Angular | 16.0% | Nuxt.js | 4.4% |
| Preact | 1.9% | SolidJS | 1.5% |
| Lit | 0.2% | | |

This group reports Angular nearly as often as Vue, and jQuery more often than either; 6% still worked
extensively with AngularJS, which reached end of life in 2021. That is the code people maintain at work, not
the code they read about.

### npm downloads

npm's public API gives download counts per package (`api.npmjs.org/downloads`). Two numbers per package: the
week of October 26 to November 1, 2026 (from `point/last-week`), and the average of the four weeks ending
November 1, which [Exercise 2](#exercises) computes:

| Package | Last week | Four-week average |
| --- | ---: | ---: |
| `react` | 243,715,739 | 168,606,180 |
| `next` | 89,613,141 | 61,392,001 |
| `preact` | 53,809,691 | 35,550,857 |
| `vue` | 24,583,048 | 15,994,453 |
| `jquery` | 18,309,497 | 12,537,577 |
| `solid-js` | 10,874,774 | 6,988,098 |
| `astro` | 10,746,270 | 7,125,495 |
| `lit` | 9,611,740 | 6,325,780 |
| `svelte` | 9,053,823 | 6,111,738 |
| `@angular/core` | 8,318,587 | 5,431,962 |
| `@sveltejs/kit` | 4,503,568 | 3,021,991 |
| `nuxt` | 3,285,990 | 2,167,037 |
| `@stencil/core` | 1,960,458 | 1,319,406 |
| `alpinejs` | 882,603 | 622,720 |
| `ember-source` | 393,800 | 246,056 |
| `htmx.org` | 392,151 | 255,889 |
| `inferno` | 361,457 | 233,852 |
| `@builder.io/qwik` | 61,565 | 44,916 |
| `marko` | 33,475 | 26,597 |
| `mithril` | 33,271 | 20,900 |
| `@qwik.dev/core` | 11,058 | 7,030 |
| `hyperapp` | 6,567 | 4,001 |
| `vanjs-core` | 3,435 | 1,868 |

Downloads are the easiest signal to collect and the easiest to misread:

- **One week is noisy.** The last week was almost twice the week before for every package. The four-week
  averages match the figures in Chapters 10 to 12.
- **Downloads count installs, not users.** Every CI run that installs dependencies counts, so a few
  thousand companies with busy pipelines produce millions of downloads.
- **Transitive dependencies inflate some packages.** `preact` is downloaded twice as often as `vue`, and
  `solid-js` more than `svelte`, largely because widely used tools and libraries depend on them, not because
  more apps are built with them.
- **CDN and no-build users are invisible.** htmx, Alpine, Mithril and VanJS are often loaded with a
  `<script>` tag from a CDN or a copied file, which npm never sees.
- **Package renames split counts.** Qwik's two package names must be added together, and Angular's users
  install a dozen `@angular/*` packages, of which `core` is only one.

Used carefully, downloads show trends for one package over time (Chapters 10 and 11 tracked them) and orders of
magnitude between packages, not precise market shares.

### GitHub stars, a weak signal

Stars on the main repositories, on November 2, 2026:

| Repository | Stars | Repository | Stars |
| --- | ---: | --- | ---: |
| `react/react` | 252,093 | `alpinejs/alpine` | 32,001 |
| `vuejs/vue` (Vue 2) | 212,501 | `emberjs/ember.js` | 22,565 |
| `angular/angular` | 101,096 | `QwikDev/qwik` | 22,068 |
| `sveltejs/svelte` | 88,528 | `lit/lit` | 21,876 |
| `vuejs/core` (Vue 3) | 55,028 | `hyperapp/hyperapp` | 19,188 |
| `bigskysoftware/htmx` | 49,595 | `infernojs/inferno` | 16,459 |
| `preactjs/preact` | 38,973 | `MithrilJS/mithril.js` | 14,507 |
| `solidjs/solid` | 36,207 | `vanjs-org/van` | 4,453 |

A star is a bookmark, given once and never taken back, so stars measure attention accumulated over a project's
life. The Vue rows show the problem: the Vue 2 repository, which has had no commits since October 2024, has
four times the stars of the Vue 3 repository where all current work happens. htmx has more stars than Preact
and Solid, with a small fraction of their downloads. Hyperapp, finished software, has nearly as many as Lit.
(React's repository has moved from `facebook/react` to `react/react` as part of the transfer to the React
Foundation; the old address redirects.) Look at stars only to tell a known project from an obscure one; look at recent
commits, releases and issue response times to tell a living project from a dormant one.

### What the web actually runs

The HTTP Archive crawls millions of pages each month and detects libraries with Wappalyzer. The most recent
Web Almanac chapter on JavaScript is from the 2024 edition (published March 2025; the 2025 edition, published
December 2025, has no JavaScript chapter). It found jQuery on 74% of mobile pages and React on 10%, up from 8%
the year before, with no other UI framework in the top fifteen libraries. A large share of the jQuery
figure comes from WordPress.

This is the long tail of the web: content sites, shops and themes, each counted once regardless of traffic.
It shows how much of the web is server-rendered HTML with a little script, the world htmx and Alpine target.
It undercounts apps behind a login, which crawlers never see, which is where Angular, React and Vue do much of
their work.

### Reading the signals together

Put side by side, the signals agree on the large picture and disagree on details:

- **React is the default.** It leads every usage signal by a wide margin, and its ecosystem follows from
  that: Next.js alone is downloaded more than any UI framework except React itself.
- **Vue and Angular are the established alternatives**, with Vue ahead in surveys that lean toward individual
  developers and Angular close behind in the work-focused Stack Overflow data.
- **Svelte is the most-liked of the frameworks with sizable usage**, with high retention and the highest
  interest of any framework in State of JS.
- **Solid, Preact and Lit have far more downloads than their survey usage suggests**, much of it from
  inside other tools and design systems; Solid has the happiest users of all.
- **htmx and Alpine are well known and moderately used**, mostly where npm can't see them.
- **Qwik, Mithril and VanJS are niche**: Qwik with falling satisfaction and a major version in flight, Mithril
  stable and small, VanJS young and dependent on one person.

## Governance, funding and longevity

A framework is a long-term dependency, and its future depends on who pays for the work. The state in
November 2026:

| Framework | Owner and governance | Funding | License |
| --- | --- | --- | --- |
| React | React Foundation (Linux Foundation) since February 2026; technical direction by the maintainers | Members: Amazon, Callstack, Expo, Huawei, Meta, Microsoft, Software Mansion, Vercel; most core engineers still at Meta | MIT |
| Vue | Evan You and an independent core team | Sponsors and donations | MIT |
| Svelte | Svelte core team | Vercel employs Rich Harris and other core members; Open Collective | MIT |
| Angular | Google's Angular team | Google | MIT |
| Solid | Ryan Carniato and a small core team | Open Collective donations | MIT |
| Preact | Independent core team (`preactjs`) | Volunteers; Open Collective | MIT |
| Mithril | Volunteer team; no company or foundation | Volunteers; Open Collective | MIT |
| VanJS | Tao Xin | Personal project | MIT |
| Qwik | QwikDev organization, community maintainers | Builder.io sponsors; Open Collective | MIT |
| Lit | OpenJS Foundation project since October 2025 | Google's Lit team, with Adobe, Reddit and others on the steering committee | BSD-3-Clause |
| htmx | Carson Gross and a small core team | GitHub Sponsors and corporate sponsors | 0BSD |
| Alpine.js | Caleb Porzio, with community contributors | GitHub Sponsors; Laravel Livewire ships it | MIT |

The tooling underneath has consolidated too. Vercel funds Next.js, employs Svelte's creator and acquired
NuxtLabs. Cloudflare acquired the company behind Astro in January 2026 and VoidZero, the company behind Vite,
Vitest, Rolldown and Oxc, in June 2026, with a $1 million fund for independent Vite maintainers. Shopify
funds the Remix team behind React Router. All of these projects stayed MIT-licensed, and none of the
acquisitions has changed how the tools work so far. But a large share of the JavaScript ecosystem now
depends on a few hosting companies, whose interest is that you deploy to them.

No funding model guarantees a future, and each has its own risk:

- **One company** (Angular, and Lit before its move) brings full-time engineers and long planning horizons,
  and the risk that the company changes its mind. Google has kept Angular going for a decade and published
  its support schedule; the AngularJS-to-Angular rewrite is the cautionary tale.
- **A foundation** (React, Lit) protects a project from one company's decisions, but a foundation doesn't
  write code: React's engineers are still mostly at Meta.
- **Sponsorship** (Vue, Solid, Preact, htmx) keeps a project independent and works as long as the core
  team stays motivated. Vue has done this for twelve years.
- **One person** (VanJS, and Alpine to a degree) has a bus factor of one. That is fine for a small library
  you could maintain yourself, which a 1 kB library is.

## Release cadence and breaking changes

How often a framework makes you rewrite code matters more over five years than any benchmark:

| Framework | First release | Major breaks so far | Now | Known next change |
| --- | --- | --- | --- | --- |
| React | 2013 | Hooks (2019) were additive; 19 (December 2024) removed long-deprecated APIs | 19.3 | Mostly additive; Server Components live in frameworks |
| Vue | 2014 | Vue 2 to 3 (2020), a hard migration for many; Vue 2 reached end of life at the end of 2023 | 3.5 | Vapor mode in 3.6, opt-in per component |
| Svelte | 2016 | Svelte 3 (2019) and Svelte 5 runes (2024) each changed how state is written | 5.57 | Experimental async features |
| Angular | 2016 (AngularJS 2010) | AngularJS to Angular (2016) was a rewrite; since then, scheduled majors with `ng update` migrations | 22.2 | One major a year from v22; a new compiler for TypeScript 7 |
| Solid | 2021 (1.0) | None yet | 1.9 | Solid 2.0 (release candidate): batching, async, packages |
| Preact | 2015 | Preact X (10, 2019); Preact 11 (September 2026) | 11.1 | Ecosystem catching up with 11 |
| Mithril | 2014 | 1.0 (2017) and 2.0 (2019) | 2.3 | None announced |
| VanJS | 2023 | None | 1.6 | None announced |
| Qwik | 2023 (1.0) | None in 1.x | 1.20 | Qwik 2.0 (release candidate) with new package names |
| Lit | 2017 (lit-html) | Polymer to Lit; Lit 3 (2023) dropped IE | 3.3 | None announced |
| htmx | 2020 | htmx 2 (2024) | 2.0 | htmx 4 (on `next`), expected on `latest` in 2027 |
| Alpine.js | 2019 | Alpine 3 (2021) was a rewrite | 3.17 | None announced |

The most stable records belong to the smallest and the oldest: Mithril's 2.x API is from 2019, Alpine 3's
from 2021, and Ember (with no chapter in this course) has shipped every six weeks for over a decade without a
rewrite. The frameworks with the most churn are the ones moving the field: Svelte changed its reactivity
twice, and Solid, Qwik and htmx all have breaking majors in flight. React is in between: its APIs rarely break,
but best practice moves (class components, hooks, Server Components) and much of it now lives in
meta-frameworks that change faster than React does.

## TypeScript support

Ten of the thirteen apps are written in TypeScript (Mithril, VanJS and Alpine use plain JavaScript), and the
quality of TypeScript support differs:

- **Strongest: React, Preact, Solid and Lit.** Their templates are TypeScript expressions (JSX, or tagged
  templates for Lit), so plain `tsc` checks everything, and they work with TypeScript 7 today. Lit's
  `html` strings need a plugin to be checked inside the template, but the code around them is plain
  TypeScript.
- **Strong, with their own checkers: Angular, Vue and Svelte.** Templates are a separate language, and
  each has a tool that type-checks them: Angular's compiler with strict templates, `vue-tsc` and
  `svelte-check`. All three are on TypeScript 6 as of November 2026; TypeScript 7 support depends on each
  tool (Vue and Svelte have experimental `--tsgo` modes; Angular needs a new compiler front end first).
- **Pinned: Qwik.** The starter pins TypeScript 5.4 and Vite 7.
- **Weak or absent: Mithril, VanJS, Alpine, htmx.** Mithril's types come from a community package; VanJS
  ships declarations; Alpine's logic lives in attribute strings that no type checker reads; htmx's
  attributes aren't typed either, though the server that renders them can be TypeScript, as Tasklet's is.

## Learning curve

What you need to learn before you are productive, judged from building Tasklet:

- **Least new to learn:** htmx and Alpine, if you know HTML and a server framework; Mithril and VanJS, if
  you know JavaScript and the DOM. Each has a small API that fits on a page.
- **Small, with one central idea:** Preact (React's model, if you know it), Svelte (runes and the
  compiler's rules), Vue (refs, templates and directives), Lit (custom elements and reactive properties).
- **Moderate:** React (hooks, the rules of hooks, effects and their pitfalls) and Solid (React-like syntax
  with different rules: components run once, don't destructure props).
- **Most:** Angular, with decorators, dependency injection, several forms APIs, signals and RxJS, but also
  the most answered in one place; and Qwik, whose serialization rules and `$` boundaries are new to almost
  everyone.

Learning the library is the smaller part. The larger part is the ecosystem around it: router, data
fetching, forms, testing, and the meta-framework, which for React is a second large thing to learn.

## Ecosystem and hiring

React's ecosystem is in a class of its own: several component libraries for every design language, the
largest choice of meta-frameworks, and most third-party SDKs ship a React version first. Vue and Angular
have complete official stacks and large ecosystems of their own. Svelte's has grown with SvelteKit but is
smaller. Solid, Qwik, Preact (beyond `preact/compat`), Lit, Mithril and VanJS have small ecosystems, and
Lit's components work in all of the others.

Hiring follows usage. In the Stack Overflow survey, React was used by 41.5% of respondents, Vue by 17.2% and
Angular by 16.0%; every other framework was below 8%. A job posting for React reaches the most candidates, and
most React developers can learn Preact in days and Solid or Vue in weeks. Angular hiring is concentrated in
large companies, where it remains common. For the smaller frameworks, expect to hire good developers and
train them.

## The server story

| Framework | Server rendering |
| --- | --- |
| React | Through frameworks: Next.js, React Router, TanStack Start; Server Components and Server Functions |
| Vue | Nuxt, with hybrid per-route rendering |
| Svelte | SvelteKit |
| Angular | Built in (`@angular/ssr`) with incremental hydration; Analog adds file routes |
| Solid | SolidStart (Solid 1.9); the "start mode" of Solid 2.0's Vite plugin |
| Preact | `preact-render-to-string`; Fresh, Astro, `preact-iso` prerendering |
| Mithril | `mithril-node-render`, a separate package |
| VanJS | Mini-Van renders on the server; VanJS can hydrate it |
| Qwik | Server-first by design: Qwik City, resumability |
| Lit | Experimental (`@lit-labs/ssr`) |
| htmx | It *is* server rendering, with any backend |
| Alpine.js | Enhances pages any server renders; no components to render |

[Chapter 18](18-meta-frameworks-and-rendering.md) compares the meta-frameworks in depth.

## The comparison matrix

The course's comparison axes from [Chapter 1](01-the-landscape.md), for every framework. Size class is
Tasklet's gzipped build: tiny under 5 kB, small 5–15 kB, medium 15–30 kB, large over 30 kB.

| Framework | Rendering model | Reactivity | Templates | Size class | Meta-framework | Maturity |
| --- | --- | --- | --- | --- | --- | --- |
| React | Virtual DOM | Re-render on state change; compiler memoizes | JSX | Large (70 kB) | Next.js, React Router, TanStack Start | Mature, 2013 |
| Vue | Virtual DOM with compiler hints; Vapor opt-in | Fine-grained refs and Proxies, per component | HTML templates in `.vue` | Medium (28 kB) | Nuxt | Mature, 2014 |
| Svelte | Compiled to DOM updates | Signals via runes | `.svelte` files | Medium (18 kB) | SvelteKit | Mature, 2016; v5 2024 |
| Angular | Compiled template instructions | Signals; zoneless | HTML templates with `@if`/`@for` | Large (77 kB) | Built in; Analog | Mature, 2016 |
| Solid | Compiled to DOM updates; components run once | Fine-grained signals and stores | JSX | Small (10 kB) | SolidStart | Established, 2021; 2.0 coming |
| Preact | Virtual DOM | Hooks, plus Signals | JSX or HTM | Small (12 kB) | Fresh, Astro | Mature, 2015 |
| Mithril | Virtual DOM | Redraw everything after events | Hyperscript | Small (12 kB) | None | Mature, slow pace |
| VanJS | Real DOM from functions | Signals | Tag functions | Tiny (5 kB) | None | Young, 2023 |
| Qwik | Server-rendered, resumable | Signals and stores | JSX with `$` | Large (46 kB, 29 kB loaded) | Qwik City | Young, 2023; 2.0 coming |
| Lit | lit-html template parts in shadow DOM | Reactive properties, batched | Tagged templates | Small (10 kB) | None | Mature, 2017 (lit-html) |
| htmx | Server renders HTML; swaps | None in the browser | Server's templates + `hx-*` | Medium (19 kB) | Any backend | Established, 2020; 4.0 coming |
| Alpine.js | Enhances existing DOM | Vue's Proxies | Attributes in the page | Medium (22 kB) | None (Livewire) | Established, 2019 |

## Pros and cons, framework by framework

These summarize the "Strengths and trade-offs" sections of the framework chapters, with the measured numbers
from this chapter:

| Framework | Pros | Cons |
| --- | --- | --- |
| Vanilla TypeScript | Smallest (3.16 kB) and nothing to upgrade; no abstraction between you and the DOM; updates as precise as you write them | Manual state-to-DOM syncing; most code of the client apps (309 lines); every team invents its own structure |
| React | Largest ecosystem and job market; UI as a function of state; plain TypeScript in JSX; widest range of rendering options; foundation governance | Large baseline (70.14 kB); re-renders subtrees by default; rules of hooks and effects are easy to get wrong; much of the story lives in meta-frameworks |
| Vue | Readable HTML templates; fine-grained tracking without memoization; complete official stack; templates type-checked; Vapor mode | `.value` in scripts; two API styles; templates are a second language; TypeScript 7 support lags |
| Svelte | Least code (194 lines); state is a variable; compiled fine-grained updates; scoped CSS and transitions built in | Needs the compiler; syntax hides reactivity rules; Svelte 4 material is now legacy; smaller ecosystem |
| Angular | Complete platform from one team; signals everywhere; type-checked templates; published yearly schedule and LTS | Largest bundle (76.97 kB); most concepts to learn; two generations of APIs in existing code; TypeScript 7 lags |
| Solid | Fine-grained updates, components run once, no dependency arrays; small (10.37 kB); readable compiled output; highest retention in State of JS | React-like syntax with different rules; small ecosystem and job market; Solid 2.0 migration ahead |
| Preact | React's API in 11.74 kB; `preact/compat` for React libraries; Signals; real DOM events | Not React: no concurrent features or Server Components; two reactivity models; Preact 11 ecosystem catching up |
| Mithril | Router and HTTP client in 12 kB; no build needed; plain variables as state; stable API since 2019 | Small community; redraw-everything model; community types only; slow release pace |
| VanJS | Tiny (about 1 kB core); no build, no JSX, no virtual DOM; fine-grained updates; tiny API | Lists need VanX; no lifecycle or context; very small community; one maintainer |
| Qwik | Resumability instead of hydration; automatic code splitting at `$`; Qwik City with many adapters | Little benefit for client-only apps; serialization constraints in everyday code; Qwik 2.0 package move; slowest build here |
| Lit | Standard custom elements usable everywhere; small; batched updates; OpenJS governance | Shadow DOM complicates global CSS, forms and ARIA; components only; class and decorator boilerplate (323 lines) |
| htmx | Tiny client, no client state; any backend; HTML as the API; progressive enhancement is cheap | A round trip per interaction; no offline; escaping is your job; partial-update bookkeeping grows; htmx 4 rewrite ahead |
| Alpine.js | No build; behavior on the element; works with any server-rendered HTML and with htmx; small API | No types or components; global stores invite disorder; not for large SPAs; near the bottom of the benchmark |

And the frameworks the course mentions without building Tasklet in them:

- **Ember** (7.4; first released in 2011, on six-week releases since 2013): conventions, a router-first
  app model, long-term-support releases and a deprecate-then-remove policy that avoids rewrites. It scores
  near the bottom of the benchmark, with the highest memory use of any framework in the table above, and
  its 250,000 weekly downloads are a small fraction of the big four's. A sound choice for teams already on it.
- **Inferno** (10.0, October 2026): a React-like virtual DOM tuned for speed, among the fastest in the
  benchmark. Alive, with one main maintainer and a small ecosystem.
- **Hyperapp** (2.0.22, March 2022): a tiny Elm-like architecture. Finished, not maintained; don't start new
  work with it.
- **Stencil** (4.45): a compiler that generates Web Components, used by Ionic and several design systems. A
  peer of Lit for the design-system job, with more build tooling.
- **Marko** (6.4, created at eBay): a compiled, streaming, server-first framework that ranks near the top of
  the benchmark. Small community outside eBay.
- **jQuery, Backbone, Knockout and AngularJS** ([Chapter 2](02-a-short-history.md)): code you maintain, not
  code you start. jQuery still runs on most of the web; AngularJS has had no support since January 2022.

## Summary

- `tasklet/tools/compare.mjs` builds all thirteen Tasklet apps the same way and reports gzipped size, source
  lines and median build time; the results are in `tasklet/tools/compare-results.json`.
- Sizes ran from 3.16 kB (vanilla) and 4.95 kB (VanJS) through 10–12 kB (Solid, Lit, Preact, Mithril) and
  18–28 kB (Svelte, htmx, Alpine, Vue) to 45.71 kB (Qwik, of which 28.74 kB of JavaScript loads), 70.14 kB
  (React) and 76.97 kB (Angular). On an app this small, the framework's fixed cost dominates.
- Source lines (194 to 428) mostly reflect idioms and boilerplate; build times (0.15 to 2.92 s) mostly
  reflect the type checker and the number of build steps.
- All thirteen apps pass the acceptance suite; htmx skips the six tests about client-side loading and
  storage by design.
- In the js-framework-benchmark (Chrome 156, October 2026), compiled and fine-grained frameworks score
  closest to vanilla, virtual DOM frameworks somewhat behind. On ordinary screens, all are fast enough.
- State of JS 2025: React is used by 85% of respondents, Vue 52%, Angular 48%, Svelte 27%; Solid has the
  highest retention (89%). Stack Overflow 2026 shows React at 41.5%, Vue 17.2% and Angular 16.0%.
- npm downloads and GitHub stars are noisy and biased; use them for orders of magnitude and trends, not
  rankings.
- Governance ranges from Google (Angular) and foundations (React, Lit) to sponsors (Vue, Solid, Preact,
  htmx) and single maintainers (VanJS). Hosting companies (Vercel, Cloudflare) now fund much of the
  ecosystem.
- Solid 2.0, Qwik 2.0 and htmx 4 are breaking majors in progress; Mithril, Alpine and Ember have the calmest
  records.

## Exercises

1. **Count lines another way.** Recount Tasklet's source files without blank lines and without lines that
   are only a comment. Does the order of the apps change?

   <details><summary>Solution</summary>

   `examples/ch19/count-lines.mjs` reads the file lists from `compare-results.json`, so it counts exactly
   the files `compare.mjs` counted:

   `examples/ch19/count-lines.mjs`
   ```js
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
   ```

   ```console
   $ node examples/ch19/count-lines.mjs
   app          all  non-blank  code
   svelte       194        166   161
   vue          207        178   174
   mithril      224        205   188
   vanjs        231        207   189
   alpine       239        216   202
   react        249        221   216
   angular      263        234   221
   preact       260        233   224
   solid        262        232   226
   vanilla      309        267   251
   lit          323        287   267
   htmx         345        301   272
   qwik         428        387   341
   ```

   The ends of the list don't move: Svelte and Vue are shortest, Lit, htmx and Qwik longest. The middle
   shuffles: Angular moves ahead of Preact and Solid, because its 13 files have more blank and comment
   lines. The distance between the first and last also shrinks, from 234 lines to 180. A different but equally
   reasonable definition changes the details, so treat differences of a few dozen lines as ties.

   </details>

2. **One week or four.** The npm download figures in Chapters 10 to 12 don't match the "last week" numbers
   in this chapter. Fetch the last four weeks for the main packages and explain the difference.

   <details><summary>Solution</summary>

   `examples/ch19/downloads.mjs` asks the npm API for daily counts and adds them up per week:

   `examples/ch19/downloads.mjs`
   ```js
   // Usage: node downloads.mjs [package …]
   //
   // npm downloads for the last four full weeks (Monday to Sunday), from the
   // public api.npmjs.org endpoints, and the average of the four. One week alone
   // moves with holidays, CI changes and releases; the average moves less.
   // Requests are a second apart to stay under the API's rate limit.
   const packages = process.argv.length > 2
     ? process.argv.slice(2)
     : ['react', 'vue', 'svelte', '@angular/core', 'solid-js', 'preact', 'lit', 'alpinejs', 'htmx.org', 'mithril']

   const api = 'https://api.npmjs.org/downloads'
   const { end } = await (await fetch(`${api}/point/last-week/react`)).json()
   const day = (date, offset) => new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10)
   const start = day(end, -27)
   const n = (value) => value.toLocaleString('en-US').padStart(12)

   console.log(`Weeks ending ${[21, 14, 7, 0].map((d) => day(end, -d)).join(', ')}\n`)
   console.log(`${'package'.padEnd(14)} ${['week 1', 'week 2', 'week 3', 'week 4', 'average'].map((h) => h.padStart(12)).join(' ')}`)
   for (const name of packages) {
     await new Promise((r) => setTimeout(r, 1000))
     const response = await fetch(`${api}/range/${start}:${end}/${name}`)
     if (!response.ok) {
       console.log(`${name.padEnd(14)} HTTP ${response.status}, try again later`)
       continue
     }
     const { downloads } = await response.json()
     const weeks = [0, 7, 14, 21].map((i) => downloads.slice(i, i + 7).reduce((sum, d) => sum + d.downloads, 0))
     const average = Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length)
     console.log(`${name.padEnd(14)} ${[...weeks, average].map(n).join(' ')}`)
   }
   ```

   ```console
   $ node examples/ch19/downloads.mjs
   Weeks ending 2026-10-11, 2026-10-18, 2026-10-25, 2026-11-01

   package              week 1       week 2       week 3       week 4      average
   react           188,481,362  116,163,376  126,064,243  243,715,739  168,606,180
   vue              17,621,360   10,175,328   11,598,075   24,583,048   15,994,453
   svelte            6,726,480    4,210,714    4,455,934    9,053,823    6,111,738
   @angular/core     6,249,015    3,415,695    3,744,549    8,318,587    5,431,962
   solid-js          7,192,437    4,649,796    5,235,386   10,874,774    6,988,098
   preact           38,692,983   23,228,055   26,472,697   53,809,691   35,550,857
   lit               7,044,909    3,965,350    4,681,120    9,611,740    6,325,780
   alpinejs            736,506      418,249      453,522      882,603      622,720
   htmx.org            289,763      167,199      174,444      392,151      255,889
   mithril              21,228       13,543       15,556       33,271       20,900
   ```

   The chapters used four-week averages (Mithril's 20,900 and Lit's 6.3 million are in Chapters 10 and 12),
   while `point/last-week` returns one week. Week 4 is about twice weeks 2 and 3 for every package at
   once, so the cause is in the registry's traffic (CI systems, mirrors, bots), not a sudden doubling of
   users of every framework. Ratios between packages barely moved: React was 9.9 times Vue in week 4 and
   10.5 times on average. Compare packages within the same period, and prefer averages.

   </details>

3. **Read a survey row.** In State of JS 2025, Angular has 48% usage and 48% retention, and Solid has 10%
   usage and 89% retention. Does that mean Solid is the better framework for a new project?

   <details><summary>Solution</summary>

   No. Retention is measured among people who have used a framework, and those groups differ. Angular's
   users are often assigned to it at work, on large and old code bases, some still with NgModules and
   Zone.js. Solid's users mostly chose it themselves, often for smaller or newer projects, and the survey's
   audience leans toward developers who enjoy trying new tools. Each number says something true about its own
   group, and nothing about how your team would do on your project. What the row does suggest: Solid's
   design satisfies the people who try it, and Angular's retention is worth asking about (which parts
   frustrate users, and are they the parts the last three releases changed?). Use surveys to choose what to
   investigate, then build something.

   </details>

4. **Read a benchmark row.** React scores 1.56 and Solid 1.14 in the js-framework-benchmark. Your app is a
   dashboard with 30 cards that update every few seconds. Should the benchmark decide between them?

   <details><summary>Solution</summary>

   Hardly. The CPU score summarizes operations on 1,000 to 10,000 table rows, where React takes about 37%
   longer than Solid (1.56 / 1.14). Thirty cards updating every few seconds is a tiny amount of work for
   either, finished well within one 16 ms frame. The columns that do apply to every page are size and first
   paint: 51.4 kB against 4.5 kB compressed, and 228 ms against 54 ms to first paint in the benchmark's
   setup, a difference you pay on every cold load, especially on slow phones. For a dashboard used daily on
   office machines, where the code is cached, even that matters little, and team knowledge and ecosystem
   matter more. [Chapter 20](20-choosing-a-framework.md) works through this scenario.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-19--comparing-frameworks)
