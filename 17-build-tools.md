# Chapter 17 — Build Tools

Every framework chapter so far started with `npm create` and ended with `npm run build`. Between the
source you write and the files a browser loads sits a build tool. It resolves `import 'preact'` to a file
in `node_modules`, compiles TypeScript, JSX, `.vue` and `.svelte` files to JavaScript, serves your app in
development and updates it as you type, and then produces a small set of minified, hashed files for
production. This chapter explains why that step exists and what it does, starting from a page with no
build at all. It then surveys the tools: Vite (now built on Rolldown and Oxc), esbuild, Rspack and Rsbuild,
Turbopack, webpack, Parcel and Bun. It bundles the same small app with five of them and compares the
output, and shows how to read a production build: hashed names, code splitting, tree shaking and source
maps. It ends with the tools that check code without building it: TypeScript's type checker (now a
native compiler in TypeScript 7), linters and formatters.

The examples live in `examples/ch17/`. [Chapter 18](18-meta-frameworks-and-rendering.md) builds on this
one: meta-frameworks are, among other things, build tools that know how to render on a server.

## Why bundle at all

Browsers have run JavaScript modules natively since 2018, and every current browser supports import maps.
A build step is no longer required to use `import`. It still exists because the code you write is not
the code you want to ship:

```text
  source you write                       build step                          files you ship
  ----------------                       ----------                          --------------
  .ts .tsx .vue .svelte  ───────▶  compile to JavaScript              ┐
  import 'nanostores'    ───────▶  resolve to node_modules/…          │
  100s of small modules  ───────▶  bundle into a few chunks           ├──▶  index.html
  process.env.NODE_ENV   ───────▶  replace with "production"          │     assets/index-BBLgevhC.js
  unused exports         ───────▶  tree-shake them away               │     assets/details-D8d41xfe.js
  import('./details')    ───────▶  split into a lazy chunk            │     *.js.map
  readable code          ───────▶  minify, hash file names, maps      ┘
```

- **Compiling.** Browsers do not understand TypeScript, JSX or single-file components. Svelte, Vue,
  Angular and Solid also compile templates into JavaScript. This step is not optional for those
  frameworks.
- **Resolving packages.** `import { atom } from 'nanostores'` uses a *bare specifier*. A browser only
  understands URLs. Something has to map the name to a file.
- **Bundling.** An app and its dependencies can be hundreds of modules. Loading each one separately costs a
  request, and the browser only discovers a module's imports after downloading it, which creates a
  waterfall. Bundling merges modules into a few files.
- **Optimizing.** Minifying, removing unused code, splitting rarely used code into chunks that load on
  demand, and adding a content hash to each file name so it can be cached forever.

## No build: native modules and import maps

To see what a build step adds, start without one. `examples/ch17/no-build/` is a Preact counter that runs
in the browser exactly as written. An *import map* tells the browser what the bare specifiers mean:

`examples/ch17/no-build/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>No build step</title>
    <!-- Maps bare specifiers ("preact") to URLs. Must come before any module script. -->
    <script type="importmap">
      {
        "imports": {
          "preact": "/node_modules/preact/dist/preact.mjs",
          "preact/hooks": "/node_modules/preact/hooks/dist/hooks.mjs",
          "htm": "/node_modules/htm/dist/htm.mjs",
          "htm/preact": "/node_modules/htm/preact/index.mjs"
        }
      }
    </script>
    <script type="module" src="./app.js"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

`examples/ch17/no-build/app.js`
```js
import { render } from 'preact'
import { useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { plural } from './plural.js'

function Counter() {
  const [count, setCount] = useState(0)
  // htm turns this tagged template into preact.h() calls at run time: no JSX compiler needed.
  return html`
    <p>Clicked ${count} ${plural(count, 'time')}</p>
    <button type="button" onClick=${() => setCount(count + 1)}>Click me</button>
  `
}

render(html`<${Counter} />`, document.getElementById('app'))
```

There is no JSX, because nothing would compile it. `htm` parses the tagged template at run time and calls
Preact's `h()`. The helper module is plain JavaScript with type annotations in JSDoc comments, which
editors and `tsc --checkJs` understand:

`examples/ch17/no-build/plural.js`
```js
/**
 * @param {number} n
 * @param {string} word
 */
export function plural(n, word) {
  return n === 1 ? word : `${word}s`
}
```

Any static file server works. This one is 30 lines of Node with no dependencies:

`examples/ch17/serve.mjs`
```js
// A static file server in 30 lines: all a no-build site needs.
// Usage: node serve.mjs [port]   (serves this folder)
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const root = import.meta.dirname
const port = Number(process.argv[2] ?? 4337)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript', // module scripts are refused without a JavaScript MIME type
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let path = normalize(join(root, decodeURIComponent(url.pathname)))
  if (path !== root && !path.startsWith(root + sep)) return response.writeHead(403).end()
  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html')
    statSync(path)
  } catch {
    return response.writeHead(404).end('Not found')
  }
  response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(response)
}).listen(port, () => console.log(`http://localhost:${port}/no-build/`))
```

The `Content-Type` line matters: browsers refuse to run a module script served with a non-JavaScript MIME
type. Run `npm run serve:no-build` and open `http://localhost:4337/no-build/`. The browser's network panel
shows what it fetched, in this order:

```text
200 text/html; charset=utf-8 /no-build/
200 text/javascript /no-build/app.js
200 text/javascript /node_modules/preact/dist/preact.mjs
200 text/javascript /node_modules/preact/hooks/dist/hooks.mjs
200 text/javascript /node_modules/htm/preact/index.mjs
200 text/javascript /no-build/plural.js
200 text/javascript /node_modules/htm/dist/htm.mjs
```

Seven requests and about 17.7 kB of JavaScript. Note the last line: `htm.mjs` is imported by
`htm/preact/index.mjs`, so the browser could only request it after that file arrived. That is the
waterfall bundlers remove. With seven files it does not matter. With seven hundred it does.

No-build works well for small sites, prototypes, documentation demos and pages that sprinkle in a little
interactivity, which is also the territory of [htmx](13-htmx.md) and [Alpine](14-alpine.md). It stops
working when you want TypeScript or JSX syntax, single-file components, or packages that assume a bundler
(exercise 3 runs into one). CDNs such as esm.sh and jsDelivr serve npm packages as browser-ready modules,
and `es-module-shims` polyfills import-map features for older browsers.

## Vite: the default

Vite started in 2020 as a development server for Vue and became the default build tool for most of the
ecosystem. The official starters for Vue, Svelte, Solid and Preact use it, `create-vite` has templates
for React, Lit and the rest, and Nuxt, SvelteKit, Astro, SolidStart, Analog, Qwik City and React Router's framework mode.
Angular's CLI uses Vite as its development server.

### The development server

In development, Vite does not bundle your code. It serves each source module as a separate file and
compiles it on request. Run `npm run dev` in `examples/ch17/` and the page at `http://localhost:4437/`
requests:

```text
/
/@vite/client
/src/main.ts
/src/cart.ts
/src/format.ts
/node_modules/.vite/deps/nanostores.js
/node_modules/vite/dist/client/env.mjs
```

Your own files arrive one by one, compiled from TypeScript on the fly. Dependencies are different:
`nanostores` is a dozen small files, so Vite *pre-bundles* each dependency once into
`node_modules/.vite/deps/` and serves that single file. `/@vite/client` is a small script that opens a
WebSocket to the dev server. Note that `src/details.ts` is missing: it is imported with `import()`, so it
is only requested when you click "Show details". Because nothing is bundled up front, the server starts
quickly regardless of app size; this run reported `ready in 113 ms`.

### Hot module replacement

When you save a file, the dev server tells the browser which module changed over that WebSocket. What
happens next depends on whether some module has declared that it can accept the update. In
`examples/ch17` nothing has, so Vite reloads the page. Saving `src/format.ts` printed:

```console
10:00:58 AM [vite] (client) page reload src/format.ts
```

Framework plugins add the missing piece. `@vitejs/plugin-react` wraps every component module with React
Refresh, so a component can be swapped in place. In `examples/ch16` (React and Vue islands sharing a
store), adding an item to the cart and then saving `src/Products.tsx` printed:

```console
10:01:16 AM [vite] (client) hmr update /src/Products.tsx
```

The browser console showed `[vite] hot updated: /src/Products.tsx`, and the header badge still read
"1 item": the component was replaced and the state survived. Vue, Svelte, Solid and Preact plugins do the
same for their components. Hot module replacement (HMR) is the reason modern development feels immediate:
you change a style or a label and see it without losing the state you clicked your way into.

### Vite 8: one bundler instead of two

Until version 7, Vite used two tools: esbuild for fast transforms and dependency pre-bundling in
development, and Rollup for production builds. Vite 8, released in March 2026, replaced both with
Rolldown, a Rust bundler with Rollup's plugin API, and Oxc, a Rust toolkit that parses, transforms and
minifies JavaScript and TypeScript. The release post put it this way:

> Today, it resolves into one: Vite 8 ships with Rolldown as its single, unified, Rust-based bundler,
> delivering up to 10-30x faster builds while maintaining full plugin compatibility.
>
> — Vite team, "Vite 8.0 is out!" (2026)

For you, most of this is invisible: the same `vite.config.ts`, the same plugins, faster builds. A few
option names changed, such as `build.rolldownOptions` replacing `build.rollupOptions` (the
[Chapter 16](16-state-routing-and-data.md) example uses it to build two HTML pages). Development and
production now go through the same bundler, which removes a class of "works in dev, breaks in build"
differences. Rolldown and Oxc are developed by VoidZero, the company founded by Vite's creator Evan You, which
also publishes Vite+, a single `vp` command that wraps Vite, Vitest, Oxlint, Oxfmt and other tools.
Cloudflare acquired VoidZero in June 2026; the announcement commits Vite, Vitest, Rolldown, Oxc and Vite+ to
staying open source and vendor-agnostic, with Vite governed by its core team.

## The other bundlers

**Rolldown** is also usable on its own, with a Rollup-compatible configuration. It is a good fit for
building libraries, and `tsdown`, a library bundler built on it, is the replacement that the
no-longer-maintained `tsup` now recommends.

**esbuild**, written in Go by Evan Wallace, made the case that build tools did not have to be slow. Its
home page still opens with the claim:

> Our current build tools for the web are 10-100x slower than they could be.
>
> — Evan Wallace, "esbuild" (2026)

esbuild bundles, minifies and transforms TypeScript and JSX, all very quickly, with a deliberately small
feature set: no HMR and a minimal plugin API. It is still at 0.x versions after six years, but widely used
inside other tools. Angular's build system uses it for application builds. Vite 8 no longer depends on it.

**webpack** dominated bundling from about 2015 to 2020, and webpack 5 is still maintained and still runs a
large share of existing production apps. Its ideas shaped every tool that followed: loaders that turn any
file type into a module, a plugin system with hooks into every build phase, code splitting with
`import()`, and Module Federation for sharing code between separately deployed apps. Its costs are
configuration complexity and speed on large projects.

**Rspack** is a Rust reimplementation of webpack's architecture by ByteDance's web infrastructure team.
It aims to run existing webpack configurations, loaders and plugins with few changes, which makes it the
usual migration path for large webpack apps. Rspack 2.0 shipped in April 2026. **Rsbuild** is the
higher-level tool on top of it, with defaults comparable to Vite's.

**Turbopack** is Vercel's Rust bundler for Next.js. Next.js 16 made it the default for both `next dev` and
`next build`, with `--webpack` as the opt-out. It is not offered as a general-purpose bundler outside
Next.js.

**Parcel** pioneered the "zero configuration" approach: point it at an HTML file and it figures out the
rest. It is still maintained (2.16) but has a smaller share of new projects than Vite.

**Bun** is a JavaScript runtime with a built-in bundler (`bun build` and `Bun.build()`), with an
esbuild-like command line. It also accepts HTML entry points and has a development server. It is
convenient when your project already runs on Bun.

### Five bundlers, one app

`examples/ch17/src/` is a small app with the features that make bundling interesting: an npm dependency
(nanostores), an unused export that should disappear, and a module loaded on demand.

`examples/ch17/src/main.ts`
```ts
import { $total, addItem } from './cart.ts'
import { formatPrice } from './format.ts'

const total = document.querySelector<HTMLOutputElement>('#total')!
const details = document.querySelector<HTMLDivElement>('#details')!

$total.subscribe((cents) => {
  total.value = formatPrice(cents)
})

document.querySelector('#add')!.addEventListener('click', () => addItem(250))

document.querySelector('#show')!.addEventListener('click', async () => {
  const { renderDetails } = await import('./details.ts')
  renderDetails(details)
})
```

`examples/ch17/src/format.ts`
```ts
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

// Exported but never imported: tree shaking should leave it out of every bundle.
export function formatReport(rows: readonly string[]): string {
  return `UNUSED REPORT\n${rows.join('\n')}`
}
```

`examples/ch17/src/details.ts`
```ts
import { $items } from './cart.ts'
import { formatPrice } from './format.ts'

// Loaded with import(), so bundlers put it in its own chunk.
export function renderDetails(target: HTMLElement) {
  const items = $items.get().map((cents, i) => `<li>Item ${i + 1}: ${formatPrice(cents)}</li>`)
  target.innerHTML = `<ol>${items.join('')}</ol>`
}
```

`src/cart.ts` holds two nanostores stores, the same idea as [Chapter 16](16-state-routing-and-data.md)'s
cart. The `package.json` builds it five ways. Every version is pinned:

`examples/ch17/package.json`
```json
{
  "name": "ch17-build-tools",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p . && vite build",
    "preview": "vite preview",
    "build:esbuild": "esbuild src/main.ts --bundle --format=esm --splitting --minify --sourcemap --outdir=dist/esbuild",
    "build:rolldown": "rolldown -c rolldown.config.ts",
    "build:rspack": "rspack build",
    "build:bun": "bun build src/main.ts --outdir=dist/bun --format=esm --splitting --minify --sourcemap=linked",
    "build:all": "npm run build && npm run build:esbuild && npm run build:rolldown && npm run build:rspack && npm run build:bun",
    "compare": "node compare.mjs",
    "serve:no-build": "node serve.mjs 4337",
    "lint": "oxlint src"
  },
  "dependencies": {
    "htm": "3.1.1",
    "nanostores": "1.5.5",
    "preact": "11.1.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.6.4",
    "@rspack/cli": "2.3.0",
    "@rspack/core": "2.3.0",
    "@types/node": "26.6.6",
    "bun": "1.4.4",
    "esbuild": "0.28.2",
    "oxlint": "1.90.0",
    "rolldown": "1.2.16",
    "typescript": "7.0.2",
    "vite": "8.3.5"
  }
}
```

Vite needs only an output folder and a port; it finds `index.html` and follows its `<script>` tag:

`examples/ch17/vite.config.ts`
```ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 4437, strictPort: true },
  preview: { port: 4437, strictPort: true },
  build: { outDir: 'dist/vite', sourcemap: true },
})
```

Rolldown and Rspack need an entry point and options that Vite sets for you:

`examples/ch17/rolldown.config.ts`
```ts
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/main.ts',
  output: { dir: 'dist/rolldown', format: 'esm', minify: true, sourcemap: true },
})
```

`examples/ch17/rspack.config.mjs`
```js
import { defineConfig } from '@rspack/cli'

export default defineConfig({
  mode: 'production',
  entry: './src/main.ts',
  output: { path: `${import.meta.dirname}/dist/rspack`, clean: true },
  devtool: 'source-map',
  module: {
    rules: [{ test: /\.ts$/, loader: 'builtin:swc-loader', type: 'javascript/auto' }],
  },
})
```

Rspack, like webpack, only understands JavaScript until you add a loader; `builtin:swc-loader` is a Rust
TypeScript transform built into Rspack. Here is what each build printed:

```console
$ npm run build
…
vite v8.3.5 building client environment for production...
transforming...
✓ 22 modules transformed.
rendering chunks...
computing gzip size...
dist/vite/index.html                  0.48 kB │ gzip: 0.29 kB
dist/vite/assets/details-D8d41xfe.js  0.21 kB │ gzip: 0.20 kB │ map:  0.68 kB
dist/vite/assets/index-BBLgevhC.js    4.56 kB │ gzip: 2.12 kB │ map: 17.07 kB

✓ built in 58ms

$ npm run build:esbuild
…
  dist/esbuild/chunk-XVEKJS7G.js         2.1kb
  dist/esbuild/main.js                   396b
  dist/esbuild/details-4UH7ZSIG.js       229b
  dist/esbuild/chunk-XVEKJS7G.js.map    16.4kb
  dist/esbuild/main.js.map               1.0kb
  dist/esbuild/details-4UH7ZSIG.js.map   709b

⚡ Done in 3ms

$ npm run build:rolldown
…
<DIR>/details-C4QNbdOD.js.map  asset │ size:  0.68 kB
<DIR>/main.js.map              asset │ size: 16.65 kB
<DIR>/details-C4QNbdOD.js      chunk │ size:  0.21 kB
<DIR>/main.js                  chunk │ size:  2.33 kB

✔ rolldown v1.2.16 Finished in 22.97 ms

$ npm run build:rspack
…
Rspack compiled successfully in 40 ms

$ npm run build:bun
…
Bundled 11 modules in 4ms

  main.js                  1.1 KB     (entry point)
  main-31azpweg.js         2.71 KB    (chunk)
  details-e3cpr00a.js      264 bytes  (chunk)
  main.js.map              0.98 KB    (source map)
  main-31azpweg.js.map     16.82 KB   (source map)
  details-e3cpr00a.js.map  0.67 KB    (source map)
```

Each tool reports sizes differently (`kb`, `kB`, `KB`), so `compare.mjs` measures them all the same way:
the JavaScript files only, raw and gzipped at level 9, 1 kB = 1,000 bytes. It also checks whether the
unused export's marker text survived:

`examples/ch17/compare.mjs`
```js
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
```

```console
$ npm run compare

vite       4.78 kB  2.32 kB  unused export: removed  assets/details-D8d41xfe.js, assets/index-BBLgevhC.js
esbuild    2.75 kB  1.62 kB  unused export: removed  chunk-XVEKJS7G.js, details-4UH7ZSIG.js, main.js
rolldown   2.54 kB  1.36 kB  unused export: removed  details-C4QNbdOD.js, main.js
rspack     7.61 kB  3.64 kB  unused export: removed  726.js, main.js
bun        4.07 kB  2.34 kB  unused export: removed  details-e3cpr00a.js, main-31azpweg.js, main.js
```

All five removed the unused export and put `details.ts` in its own chunk. The differences are in the
details:

- **Build time** is a few milliseconds to a few tens of milliseconds for everyone. On an app this small,
  start-up costs dominate; the gaps between tools only show on large codebases.
- **Rolldown** produced the smallest output. Reading `dist/rolldown/main.js` shows why: it inlined
  constants and dropped code paths it could prove unused, such as nanostores' batching support, which
  this app never calls.
- **Vite** uses Rolldown too, but its default build kept those paths and adds a *preload helper*: when a
  lazy chunk has dependencies, Vite injects `<link rel="modulepreload">` tags so they download in
  parallel instead of in a waterfall. That helper is about 0.5 kB here; exercise 2 measures it. Vite also
  wrote `index.html` with the hashed script name filled in, which none of the plain bundlers did.
- **esbuild** moved the code shared by `main.js` and `details.js` into a separate `chunk-*.js`, so the
  entry costs an extra request. Its entry file name has no hash.
- **Rspack** is the largest because it carries webpack's module runtime: a registry of numbered modules
  (`726.js` is a chunk ID, not a name) and its own chunk loader. That runtime is a fixed cost of a few
  kilobytes that pays for webpack-style features such as Module Federation.
- **Bun** split the shared code into a hashed chunk, like esbuild, but did not inline as much.

None of these numbers decides a choice on its own. The framework runtime and your own code will be much
larger than these differences. They are useful as a way to learn what a bundler does.

## Inspecting a production build

Reading `dist/` is the best way to understand what your build tool did. Four things are worth looking for.

**The entry HTML.** Vite rewrites `index.html`. The `/src/main.ts` script became the hashed bundle:

```console
$ cat dist/vite/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bundled</title>
    <script type="module" crossorigin src="/assets/index-BBLgevhC.js"></script>
  </head>
…
```

**Content hashes.** `index-BBLgevhC.js` contains a hash of the file's content. If the content changes, the
name changes. A server can therefore send these files with a "cache for a year" header, and the only file
that must be revalidated on each visit is `index.html`. The course's Tasklet builds show the effect. The
vanilla and React versions share the same stylesheet, so their CSS files have the same hashed name, while
the JavaScript differs. The course's size tool, `tasklet/tools/size.mjs`, reports:

```console
$ node tasklet/tools/size.mjs tasklet/vanilla/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DetuhChd.js      4.32 kB     1.93 kB
index.html                    0.41 kB     0.28 kB
total                         7.12 kB     3.16 kB
$ node tasklet/tools/size.mjs tasklet/react/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DhuhZyYo.js    222.72 kB    68.92 kB
index.html                    0.40 kB     0.28 kB
total                       225.51 kB    70.14 kB
```

The React bundle is mostly `react-dom`. [Chapter 19](19-comparing-frameworks.md) puts every framework's
Tasklet build side by side.

**Code splitting.** `import('./details.ts')` became a separate file in every build. The course's
Playwright check for this example confirms that no `details-*.js` request happens until "Show details" is
clicked. Shared code is the tricky part: `details.ts` needs `formatPrice` and the `$items` store, which
`main.ts` also uses. Rolldown kept them in `main.js` and exported them from it under short names, so the
lazy chunk imports from the entry. The last line of `dist/rolldown/main.js` is:

```js
…e(m)});export{l as n,f as t};
```

Routers use the same mechanism for lazy routes ([Chapter 16](16-state-routing-and-data.md)): every
`() => import('./pages/TaskPage.vue')` becomes its own chunk.

**Tree shaking and side effects.** A bundler can only remove an unused export if removing it cannot change
behavior. Libraries help with annotations, and you can see them in the unminified parts of the Rolldown
output: `/* @__NO_SIDE_EFFECTS__ */` on nanostores' `atom` and `/* @__PURE__ */` on calls to it tell the
minifier that an unused call can be dropped. Packages can also declare `"sideEffects": false` in
`package.json`, which lets bundlers skip whole files that nothing uses.

**Source maps.** Minified code is unreadable, so every tool here also wrote `.map` files that map
positions in the output back to the original sources. Browser devtools load them automatically, so you
debug `src/main.ts`, not `index-BBLgevhC.js`. A source map is JSON, and its `sources` list is a quick way
to see what went into a chunk:

```console
$ node -e "for (const f of process.argv.slice(1)) { const m = JSON.parse(require('fs').readFileSync(f)); console.log(f, m.sources) }" dist/vite/assets/*.map
dist/vite/assets/details-D8d41xfe.js.map [ '../../../src/details.ts' ]
dist/vite/assets/index-BBLgevhC.js.map [
  '../../../node_modules/nanostores/atom/index.js',
  '../../../node_modules/nanostores/lifecycle/index.js',
  '../../../node_modules/nanostores/computed/index.js',
  '../../../src/cart.ts',
  '../../../src/format.ts',
  '../../../src/main.ts'
]
```

Three nanostores files out of the dozen in the package made it into the bundle. Bundle analyzers draw the
same information as a treemap. Vite turns source maps off by default (this example enables them with
`build.sourcemap`); if you publish them, anyone can read your original source, which is usually fine for
front-end code but worth deciding on purpose.

## Transpiling is not type-checking

Most of the tools above handle TypeScript by *stripping* the types: they delete the annotations and keep
the JavaScript. That is fast because each file is handled alone, but it means they never check the types.
`examples/ch17/typecheck/total.ts` has a classic bug:

`examples/ch17/typecheck/total.ts`
```ts
function addShipping(cents: number): number {
  return cents + 500
}

const fromForm = '250' // input.value is always a string
console.log(addShipping(fromForm))
```

Node runs `.ts` files by stripping types too, and esbuild compiles it without complaint:

```console
$ node typecheck/total.ts
250500
$ npx esbuild typecheck/total.ts
"use strict";
function addShipping(cents) {
  return cents + 500;
}
const fromForm = "250";
console.log(addShipping(fromForm));
```

Only the type checker catches it:

```console
$ npx tsc -p typecheck
typecheck/total.ts(6,25): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

That is why the `build` script in every example in this course is `tsc -p . && vite build`, and why
editors run the TypeScript language service as you type. Per-file transpilers also impose a rule: each
file must make sense without looking at others. The `verbatimModuleSyntax` option in the examples'
`tsconfig.json` enforces that, for example by requiring `import type` for type-only imports.

### TypeScript 7

TypeScript 7.0, released in July 2026, is a port of the compiler to Go. The project describes typical
speedups of 8 to 12 times on full builds, and it is the `tsc` used throughout this course (7.0.2). It
checks the same way TypeScript 6 did. The catch is tooling that embeds the compiler:

> While TypeScript 7.0 is here, it does not ship with an API. We expect TypeScript 7.1 to ship with a new
> (and different) API.
>
> — Daniel Rosenwasser, "Announcing TypeScript 7.0" (2026)

Tools that call the compiler as a library, such as typescript-eslint, and the template type-checkers for
Vue (`vue-tsc`), Svelte (`svelte-check`), Astro and others, still need TypeScript 6 for now. The
announcement recommends installing both side by side, using the `@typescript/typescript6` compatibility
package for those tools. This course's Chapter 16 example shows the gap: `tsc` checks its `.tsx` and `.ts`
files, but not the `<script setup lang="ts">` block in its `.vue` file.

## Linters and formatters

A **linter** finds code that is probably wrong or against your team's rules. A **formatter** rewrites code
into one consistent layout, so reviews are about content, not spacing. `examples/ch17/lint/sample.ts`
gives a linter three things to find:

`examples/ch17/lint/sample.ts`
```ts
export function findTask(tasks: { id: string }[], id: string) {
  const unused = tasks.length
  for (const task of tasks) {
    if (task.id == id) return task
  }
  debugger
}
```

**ESLint** is the standard JavaScript linter, with the largest ecosystem of plugins (React hooks rules,
accessibility, framework-specific rules) and `typescript-eslint` for type-aware rules. ESLint 10, released
in February 2026, removed the old `.eslintrc` configuration system entirely; configuration is now always
the "flat" `eslint.config.js`. **Prettier** is the standard formatter: few options on purpose, so teams
stop arguing about style.

Two Rust projects now cover both jobs much faster. **Biome** is one binary that lints and formats
JavaScript, TypeScript, JSON and CSS, with its own rule set modeled on ESLint's popular rules:

```console
$ npx biome lint lint
lint/sample.ts:2:9 lint/correctness/noUnusedVariables  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ! This variable unused is unused.
…
lint/sample.ts:4:17 lint/suspicious/noDoubleEquals  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Using == may be unsafe if you are relying on type coercion.
…
lint/sample.ts:6:3 lint/suspicious/noDebugger  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × This is an unexpected use of the debugger statement.
…
Checked 1 file in 2ms. No fixes applied.
Found 2 errors.
Found 1 warning.
```

**Oxlint**, from the Oxc project, implements ESLint's rules (more than 870, including many from popular
plugins) and provides tooling to migrate an ESLint configuration. Its sibling **Oxfmt** is a
Prettier-compatible formatter. The React Tasklet app uses Oxlint, the linter in `create-vite`'s React
templates:

```console
$ npx oxlint lint
lint/sample.ts:2:9: warning eslint(no-unused-vars): Variable 'unused' is declared but never used. Unused variables should start with a '_'. help: Consider removing this declaration.
lint/sample.ts:6:3: warning eslint(no-debugger): `debugger` statement is not allowed help: Remove the debugger statement
```

Oxlint did not flag `==`: its default rule set is limited to high-confidence correctness checks, and
stricter rules such as `eqeqeq` are opt-in (`npx oxlint -D eqeqeq lint` reports it as an error). Biome's recommended set includes the equivalent rule.
Defaults differ between tools, so read what a tool enables before you trust a clean result.

In practice: ESLint plus Prettier is the safe, plugin-rich choice; Biome replaces both with one fast tool
if its rules cover your needs; Oxlint plus Oxfmt is the choice that aligns with Vite's toolchain. A common
mixed setup runs Oxlint first for speed and keeps ESLint for plugins Oxlint lacks, with
`eslint-plugin-oxlint` turning off the ESLint rules Oxlint already covers.

## How frameworks plug into Vite

Vite itself knows HTML, CSS, JavaScript, TypeScript and JSX syntax. Everything framework-specific comes from
a plugin. A plugin hooks into module loading and transformation: when the dev server or the build meets
`CartSummary.vue`, the Vue plugin compiles it to JavaScript and CSS, and in development it adds the HMR
code that swaps the component in place.

| Framework | Vite integration | Version used in this course |
|---|---|---|
| React | `@vitejs/plugin-react` (Oxc for JSX and React Refresh) | 6.2.1 |
| Vue | `@vitejs/plugin-vue` (SFC compiler) | 6.0.10 |
| Svelte | `@sveltejs/vite-plugin-svelte` (Svelte compiler) | 7.3.1 |
| Solid | `vite-plugin-solid` (Solid's JSX compiler, a Babel plugin) | 2.11.15 |
| Preact | `@preact/preset-vite` (JSX, Prefresh HMR, React aliasing) | 2.10.6 |
| Angular | the Angular CLI's `@angular/build` (esbuild and Rolldown builds, Vite dev server), or Analog's `@analogjs/vite-plugin-angular` | 22.2.5 / 2.9.5 |
| Lit | none needed: Lit is plain TypeScript | — |

The configuration is usually one line, as in `examples/ch16/vite.config.ts`, which registers the React
and Vue plugins together. The meta-frameworks in [Chapter 18](18-meta-frameworks-and-rendering.md) wrap
Vite in a larger plugin that also adds routing and server rendering.

## Choosing

For most projects the build tool follows from the framework, and the question answers itself:

- **A single-page app with React, Vue, Svelte, Solid, Preact or Lit:** Vite.
- **An Angular app:** the Angular CLI, which already uses esbuild, Rolldown and Vite internally.
- **A meta-framework:** whatever it ships. Next.js uses Turbopack; most others use Vite.
- **A large existing webpack app:** Rspack, or Rsbuild for a fresh start with webpack-compatible plugins.
- **A library:** Rolldown or tsdown, or Vite's library mode.
- **A small site or a demo:** consider no build at all, with native modules and an import map.

For checks, run `tsc` (or `vue-tsc`, `svelte-check`, or the Angular compiler) in CI, a linter, and a
formatter. Which linter and formatter matters less than running them on every change.

## Summary

- Browsers run ES modules natively, and import maps resolve bare specifiers, so a build step is optional
  for simple pages. A no-build page pays with request waterfalls and no TypeScript or JSX syntax.
- Build tools compile TypeScript, JSX and components, resolve packages, bundle, minify, tree-shake,
  split code into lazy chunks, hash file names and write source maps.
- Vite serves unbundled modules in development, pre-bundles dependencies and supports HMR through
  framework plugins. Vite 8 builds with Rolldown and Oxc, replacing esbuild and Rollup.
- esbuild, Rolldown, Rspack, Bun, Turbopack, webpack and Parcel all bundle; they differ in speed, output,
  configuration and ecosystem compatibility. Rspack and Rsbuild target webpack users; Turbopack is for
  Next.js.
- On a tiny app, all five tested bundlers tree-shook the unused export and split the lazy module; output
  ranged from 1.36 kB (Rolldown) to 3.64 kB (Rspack) gzipped.
- Content-hashed names allow long-term caching; source maps map minified code back to the source.
- Transpilers strip types without checking them. Run `tsc` as well. TypeScript 7 is a native, much faster
  `tsc`, but has no API yet, so template type-checkers still use TypeScript 6.
- ESLint and Prettier are the established linter and formatter; Biome and Oxlint/Oxfmt are much faster
  Rust alternatives with different default rule sets.

## Exercises

1. **Read the output.** Without looking back, explain each line of this Vite build output: which file the
   browser loads first, which it loads later and when, and why the names contain random-looking letters.

   ```console
   dist/vite/index.html                  0.48 kB │ gzip: 0.29 kB
   dist/vite/assets/details-D8d41xfe.js  0.21 kB │ gzip: 0.20 kB │ map:  0.68 kB
   dist/vite/assets/index-BBLgevhC.js    4.56 kB │ gzip: 2.12 kB │ map: 17.07 kB
   ```

   <details><summary>Solution</summary>

   The browser loads `index.html` first. Its `<script type="module">` tag points at
   `assets/index-BBLgevhC.js`, the entry chunk with `main.ts`, `cart.ts`, `format.ts` and the parts of
   nanostores they use. `details-D8d41xfe.js` is the chunk created by `import('./details.ts')`; it loads
   only when the user clicks "Show details". The letters are content hashes: they change when the file's
   content changes, so the files can be cached for a long time, and only `index.html` (which has no hash)
   needs revalidating. The `map` column is the size of each source map, which the browser downloads only
   when devtools are open.

   </details>

2. **Measure the preload helper.** Build the Chapter 17 app with Vite's module preloading turned off and
   compare the entry chunk with the normal build. What did you save, and what did you give up?

   <details><summary>Solution</summary>

   `examples/ch17/exercises/no-preload.config.ts` sets `build.modulePreload` to `false`:

   `examples/ch17/exercises/no-preload.config.ts`
   ```ts
   import { defineConfig } from 'vite'

   // Same build as ../vite.config.ts, minus the modulepreload helper and polyfill.
   export default defineConfig({
     build: { outDir: 'dist/vite-no-preload', sourcemap: true, modulePreload: false },
   })
   ```

   ```console
   $ npx vite build -c exercises/no-preload.config.ts
   vite v8.3.5 building client environment for production...
   transforming...
   ✓ 21 modules transformed.
   rendering chunks...
   computing gzip size...
   dist/vite-no-preload/index.html                  0.48 kB │ gzip: 0.29 kB
   dist/vite-no-preload/assets/details-CbFacV0A.js  0.21 kB │ gzip: 0.20 kB │ map:  0.68 kB
   dist/vite-no-preload/assets/index-BYRZrItU.js    4.03 kB │ gzip: 1.90 kB │ map: 17.07 kB

   ✓ built in 58ms
   ```

   One module fewer (the helper), and the entry chunk went from 4.56 kB (2.12 kB gzipped) to 4.03 kB
   (1.90 kB); the lazy chunk did not change. The cost: when a lazy chunk imports other chunks, the browser now discovers them one at a time. In this
   app the lazy chunk has no chunk dependencies of its own, so nothing is lost. In an app with lazy routes
   that share chunks, keep preloading on.

   </details>

3. **Add a package to the import map.** Add `nanostores` to a no-build page through an import map and
   build the "Add $2.50" total from this chapter without a bundler. What goes wrong, and how do you fix it?

   <details><summary>Solution</summary>

   Mapping `"nanostores": "/node_modules/nanostores/index.js"` is enough for the browser to load the
   package and its relative imports. The page then fails with `ReferenceError: process is not defined`.
   nanostores, like many packages, checks `process.env.NODE_ENV` to include development warnings, and
   relies on the bundler to replace that expression with a string. Without a bundler, nothing does. The
   fix is to define it before any module runs:

   `examples/ch17/exercises/import-map-store/index.html`
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <title>Import map with a store</title>
       <!-- nanostores reads process.env.NODE_ENV, which bundlers replace. Without one, define it. -->
       <script>
         globalThis.process = { env: { NODE_ENV: 'production' } }
       </script>
       <script type="importmap">
         {
           "imports": {
             "nanostores": "/node_modules/nanostores/index.js"
           }
         }
       </script>
       <script type="module" src="./app.js"></script>
     </head>
     <body>
       <output id="total">$0.00</output>
       <button type="button" id="add">Add $2.50</button>
     </body>
   </html>
   ```

   `examples/ch17/exercises/import-map-store/app.js` is the same store code as `src/cart.ts`, in plain
   JavaScript. With `npm run serve:no-build` running, open
   `http://localhost:4337/exercises/import-map-store/`; the course's Playwright check clicks "Add $2.50"
   twice and sees `$5.00` with no page errors. A CDN that prepares packages for browsers, such as esm.sh,
   performs this replacement for you.

   </details>

4. **Explain 250500.** `typecheck/total.ts` printed `250500` instead of `750`. Explain why, why Node and
   esbuild did not notice, and how this course's build scripts prevent it from reaching production.

   <details><summary>Solution</summary>

   `fromForm` is the string `'250'`, and `+` with a string operand concatenates: `'250' + 500` is
   `'250500'`. Node and esbuild only strip type annotations and never compare the argument's type with
   the parameter's. `tsc` does, and reports TS2345. Every example's `build` script runs `tsc -p .` before
   `vite build`, and `&&` stops the build if `tsc` fails. The code fix is to convert at the boundary where
   the string enters: `addShipping(Number(fromForm))`, or read `input.valueAsNumber` from a number input.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-17--build-tools)
