# Chapter 1 — The Landscape

There are more JavaScript frameworks than anyone can learn, and they keep changing. This course doesn't
try to teach any of them in full. It gives you a map: what each widely used tool is, the idea that makes it
different, what its code looks like, and what it costs. Every framework builds the same small app, Tasklet,
and passes the same automated test, so you can compare them on equal terms. This chapter lists every tool
the course covers, explains the axes it uses to compare them, and gets you set up to run the apps and the
test. [Chapter 2](02-a-short-history.md) tells the story of how the web got here, from jQuery to signals.

## What "framework" means here

A **UI framework** keeps what's on the screen in sync with your application's data. You describe the
interface in terms of the data (the *state*), and the framework updates the page when the state changes.
That's the core job, and [Chapter 3](03-the-problem-frameworks-solve.md) shows in detail what it saves you
from by building Tasklet without one.

Around that core sits a whole ecosystem, and the course covers it in layers:

```text
  ┌──────────────────────────────────────────────────────────────┐
  │ meta-frameworks: routing, server rendering, data loading,    │  Chapter 18
  │ deployment (Next.js, Nuxt, SvelteKit, Astro, …)              │
  ├──────────────────────────────────────────────────────────────┤
  │ libraries: state, server data, routing, forms                │  Chapter 16
  │ (Redux Toolkit, Zustand, Pinia, TanStack Query, …)           │
  ├──────────────────────────────────────────────────────────────┤
  │ UI frameworks: components, rendering, reactivity             │  Chapters 4–14
  │ (React, Vue, Svelte, Angular, Solid, …, htmx, Alpine)        │
  ├──────────────────────────────────────────────────────────────┤
  │ build tools: dev server, bundling, transpiling, linting      │  Chapter 17
  │ (Vite, Rolldown, esbuild, Rspack, webpack, …)                │
  ├──────────────────────────────────────────────────────────────┤
  │ the web platform: HTML, CSS, the DOM, JavaScript, TypeScript │
  └──────────────────────────────────────────────────────────────┘
```

Some tools span several layers. Angular is a framework, a router, a forms library, an HTTP client and a
CLI in one package. htmx replaces most of the stack with HTML returned by your server. The layers are still
a useful way to place a name you haven't met before.

## Every tool in this course

Versions are the npm `latest` release as of November 2026. The summaries are short on purpose: each tool's
chapter explains its mental model, shows its code and builds Tasklet with it.

### Component frameworks: the big four

These four have the largest communities, ecosystems and job markets. Each organizes the UI into
components, renders on the client and the server, and has an official meta-framework.

| Tool | Version | Chapter |
|---|---|---|
| React | 19.3.1 | [Chapter 4](04-react.md) |
| Vue | 3.5.44 | [Chapter 5](05-vue.md) |
| Svelte | 5.57.3 | [Chapter 6](06-svelte.md) |
| Angular | 22.2.4 | [Chapter 7](07-angular.md) |

**[React](04-react.md)** is a library for building UIs from components written as functions that return JSX. When state
changes, React calls the component again and reconciles the new output with the previous one, the
"UI = f(state)" model that most of the industry adopted. It has the largest ecosystem of all, and its newer
pieces (the React Compiler, Server Components) shape how meta-frameworks such as Next.js work. This course
covers it briefly; [the React course](../learn-react/README.md) teaches it in depth.

**[Vue](05-vue.md)** is a progressive framework: you can drop it into one page or build a full app with it. Components
are usually single-file components (`.vue` files with a template, a script and styles), and its reactivity
tracks exactly which data each component uses, so only those components update. It's known for approachable
docs and a cohesive official toolkit (Vue Router, Pinia, Vite, Nuxt). Vue 3.6, in release candidates as of
this writing, adds an optional **Vapor mode** that compiles templates to direct DOM updates without a
virtual DOM.

**[Svelte](06-svelte.md)** is a compiler. You write components in `.svelte` files that look like HTML with a script, and
the compiler turns them into small JavaScript modules that update the DOM directly. Svelte 5 made
reactivity explicit with **runes** (`$state`, `$derived`, `$effect`), which compile to signals. Its
meta-framework, SvelteKit, is the standard way to build Svelte apps.

**[Angular](07-angular.md)** is Google's full platform: components, a router, forms, an HTTP client, dependency injection,
testing tools and a CLI, all versioned together. It suits large teams that value a single, opinionated way
to do everything. Recent versions moved from zone.js-based change detection to **signals** and zoneless
apps, and replaced structural directives with built-in control flow (`@if`, `@for`).

### Fine-grained and small

These frameworks are smaller, faster or simpler than the big four, usually all three. Some use React's
API; some take a different path entirely.

| Tool | Version | Chapter |
|---|---|---|
| Solid | 1.9.18 (2.0 in release candidate) | [Chapter 8](08-solid.md) |
| Preact | 11.1.1, Preact Signals 2.11.4 | [Chapter 9](09-preact.md) |
| Mithril | 2.3.8 | [Chapter 10](10-mithril-and-the-minimalists.md) |
| VanJS | 1.6.2 | [Chapter 10](10-mithril-and-the-minimalists.md) |
| Qwik | 1.20.3 (2.0 in release candidate) | [Chapter 11](11-qwik.md) |

**[Solid](08-solid.md)** looks like React (function components, JSX) but works very differently: components run once, and
**signals** update exactly the DOM nodes that depend on them, with no virtual DOM and no re-rendering.
It consistently ranks near the top of rendering benchmarks, and it did much to popularize the signals now
found in Angular, Preact, Vue Vapor, Svelte 5 and Qwik. Solid 2.0 is in release candidates on npm's `next` tag;
the course teaches the stable 1.9 line and explains what 2.0 changes.

**[Preact](09-preact.md)** is a small alternative to React with the same modern API (function components, hooks, JSX) in a
few kilobytes. `preact/compat` lets most React libraries run on it unchanged. **Preact Signals** adds
fine-grained reactivity that can update text in the DOM without re-rendering the component.

**[Mithril](10-mithril-and-the-minimalists.md)** is a small framework from 2014 with a router and an HTTP client built in. You write the UI as
plain function calls (*hyperscript*: `m('li', task.title)`), and it redraws automatically after event
handlers and its own requests. It's stable, maintained by a few volunteers and still used, with a slow release
pace; Chapter 10 looks at the evidence and what it means for a new project.

**[VanJS](10-mithril-and-the-minimalists.md#building-tasklet-in-vanjs)** is an even smaller library (about 1 kB) that builds the DOM with plain functions (`li(task.title)`)
and updates it with fine-grained `van.state` values. No build step, no JSX, no virtual DOM. Chapter 10 also
mentions **[Hyperapp and Inferno](10-mithril-and-the-minimalists.md#hyperapp-inferno-and-others)**, which you may still meet in older code bases, and what "minimal"
buys you and costs you.

**[Qwik](11-qwik.md)** attacks the cost of starting an app in the browser. Instead of *hydrating* a server-rendered page
(re-running components to attach listeners), it serializes the app's state into the HTML and **resumes**
where the server stopped, loading the code for an event handler only when that event happens. The `$`
suffix (`onClick$`, `component$`) marks the boundaries where code can be split. Qwik City is its
meta-framework. Qwik 2.0 is in release candidates under the new `@qwik.dev` package names, where Qwik City
becomes Qwik Router.

### Web Components

| Tool | Version | Chapter |
|---|---|---|
| Lit | 3.3.3 | [Chapter 12](12-lit-and-web-components.md) |
| Stencil (mentioned) | 4.45.2 | [Chapter 12](12-lit-and-web-components.md) |

**[Web Components](12-lit-and-web-components.md)** are a set of browser standards (custom elements, shadow DOM, templates and slots) for
defining your own HTML elements. They work in any page and inside any framework, which makes them popular for
design systems shared across teams that use different frameworks. **[Lit](12-lit-and-web-components.md)** is
a thin layer over the standards, created at Google and an OpenJS Foundation project since 2025: reactive
properties, and `html` tagged template literals that update only the parts that change.
**[Stencil](12-lit-and-web-components.md#stencil-and-the-design-systems)** is a compiler that generates Web
Components, used by several large design systems.

### HTML-first

These tools start from server-rendered HTML instead of a JavaScript app, and add behavior with attributes.

| Tool | Version | Chapter |
|---|---|---|
| htmx | 2.0.11 (4.0 released on the `next` tag) | [Chapter 13](13-htmx.md) |
| Alpine.js | 3.17.5 | [Chapter 14](14-alpine.md) |

**[htmx](13-htmx.md)** extends HTML so that any element can make an HTTP request and swap the HTML response into the
page: `<button hx-post="/tasks" hx-target="#list">`. The server renders HTML, not JSON, so the application
logic lives in whatever backend language you use, and the browser runs one small library. The Tasklet
version is the only one whose data lives on a server. htmx 4.0 has been released, but npm's `latest` tag stays on
2.x until early 2027 so existing users aren't upgraded by accident; Chapter 13 explains the differences.

**[Alpine.js](14-alpine.md)** adds small amounts of reactive behavior directly in HTML attributes: `x-data` declares state,
`x-model` binds an input, `x-for` repeats an element. There's no build step and no component files. It's a
common choice for sprinkling interactivity onto server-rendered pages, often together with htmx.

### Meta-frameworks

A **meta-framework** builds on a UI framework and adds what a whole application needs: file-based routing,
server-side rendering, data loading, API endpoints, and a deployment story. [Chapter 18](18-meta-frameworks-and-rendering.md)
compares them and their rendering strategies (SSR, SSG, streaming, islands, resumability, Server
Components), with a runnable Astro example.

| Tool | Built on | Version |
|---|---|---|
| Next.js | React | 16.4.4 |
| React Router (framework mode) | React | 8.5.1 |
| TanStack Start | React, Solid | 1.169.4 |
| Nuxt | Vue | 4.6.3 |
| SvelteKit | Svelte | 3.1.1 |
| Astro | any (islands) | 7.4.5 |
| SolidStart | Solid | 2.2.0 |
| Analog | Angular | 2.9.5 |
| Qwik City | Qwik | part of Qwik |

**[Next.js](18-meta-frameworks-and-rendering.md#nextjs-16)**, from Vercel, is the most widely used React meta-framework and the main home of React Server
Components; since version 16 it builds with Turbopack by default. **[React Router](18-meta-frameworks-and-rendering.md#react-router-8-framework-mode)** grew from a router into a
full framework (the successor to Remix). **[TanStack Start](18-meta-frameworks-and-rendering.md#tanstack-start)** is a newer, type-safe full-stack framework built
on TanStack Router. **[Nuxt](18-meta-frameworks-and-rendering.md#nuxt-4)** does for Vue what Next.js does for React. **[SvelteKit](18-meta-frameworks-and-rendering.md#sveltekit-3)** is Svelte's official
application framework. **[Astro](18-meta-frameworks-and-rendering.md#astro-7)** renders content sites to HTML and hydrates only the interactive parts,
*islands*, which can be written in React, Vue, Svelte, Solid, Preact or Lit, even mixed on one page.
**[SolidStart](18-meta-frameworks-and-rendering.md#solidstart-2)** and
**[Analog](18-meta-frameworks-and-rendering.md#analog-angular)** bring the same ideas to Solid and Angular, and
**[Qwik City](18-meta-frameworks-and-rendering.md#qwik-city)** to Qwik.

### Build tools

Almost every project uses a **build tool** for a dev server with hot module replacement, TypeScript and
JSX transformation, and an optimized production bundle. [Chapter 17](17-build-tools.md) explains what they do
and inspects a Tasklet build.

| Tool | Version | Role |
|---|---|---|
| Vite | 8.3.5 | Dev server and build tool; the default for most frameworks |
| Rolldown | 1.2.16 | Rust bundler with a Rollup-compatible API; Vite's bundler |
| esbuild | 0.28.2 | Fast Go bundler and transpiler |
| Rspack / Rsbuild | 2.3.0 / 2.3.0 | Rust, webpack-compatible bundler / a build tool on top of it |
| Turbopack | part of Next.js | Rust bundler, Next.js's default |
| webpack | 5.112.2 | The long-time standard; still in many existing projects |
| Bun | 1.4.4 | A JavaScript runtime with a bundler, test runner and package manager |
| TypeScript | 7.0.2 | Type checker; version 7 is the native (Go) compiler |
| Oxlint / Biome / ESLint / Prettier | 1.90.0 / 2.6.4 / 10.14.0 / 3.9.10 | Linters and formatters |

**[Vite](17-build-tools.md#vite-the-default)** is the build tool behind this course's Tasklet apps (except Angular's, whose CLI uses its own
esbuild-based builder). It serves native ES modules during development, so the dev server starts quickly,
and bundles for production with **Rolldown**. **[esbuild](17-build-tools.md#the-other-bundlers)** showed how fast a bundler written in a compiled
language could be. **[Rspack](17-build-tools.md#the-other-bundlers)** is a Rust reimplementation of webpack's API for large projects that can't
leave webpack's plugin ecosystem, and **Rsbuild** is a ready-made build tool on top of it. **webpack**
defined bundling for a decade and remains in many existing apps. **Bun** is a runtime that bundles too.
**Oxlint**, **Biome**, **ESLint** and **Prettier** ([Chapter 17](17-build-tools.md#linters-and-formatters))
check and format code; the first two are fast Rust tools,
the last two the long-standing JavaScript ones.

### State, data and routing libraries

Frameworks manage component state well; the hard parts of a large app are state shared across many
components, data that lives on a server, and the URL. [Chapter 16](16-state-routing-and-data.md) covers
them.

| Tool | For | Version |
|---|---|---|
| Redux Toolkit | React (and others) | 2.13.0 |
| Zustand | React | 5.0.16 |
| Jotai | React | 3.0.1 |
| Pinia | Vue | 4.1.0 |
| NgRx Signal Store | Angular | 22.0.1 |
| TanStack Query | React, Vue, Svelte, Solid, Angular | 5.105.2 |
| TanStack Router | React, Solid | 1.170.46 |
| Vue Router | Vue | 5.4.0 |
| React Router, Angular Router | React, Angular | 8.5.1, 22.2.4 |

**[Redux Toolkit](16-state-routing-and-data.md#redux-toolkit)** is the official, modern way to use Redux: one store, changes described as actions,
reducers that compute the next state. **[Zustand](16-state-routing-and-data.md#zustand)** is a small hook-based store, and
**[Jotai](16-state-routing-and-data.md#jotai)** builds state from small independent *atoms*.
**[Pinia](16-state-routing-and-data.md#pinia)** is Vue's official store, and
**[NgRx Signal Store](16-state-routing-and-data.md#ngrx-signal-store)** a signals-based store for Angular.
**[TanStack Query](16-state-routing-and-data.md#tanstack-query)** caches server data, handles loading and error states, refetches and
deduplicates requests, for most frameworks. Each framework has a standard [router](16-state-routing-and-data.md#routing): **React Router** or
**TanStack Router** for React, **Vue Router**, **Angular Router**, and the file-based routing built into the
meta-frameworks. Svelte runes in modules and Solid stores show how far a framework's own reactivity gets you
before you need a library.

### History

[Chapter 2](02-a-short-history.md) covers the tools that came before and shaped all of the above:
**jQuery**, **Backbone**, **Knockout**, **AngularJS** and **Ember**, which is
[still shipping](02-a-short-history.md#ember-today-still-shipping) (7.4.0) with a loyal community. You don't need any of them for a new project, but you'll recognize their ideas everywhere.

## How the course compares tools

Every framework chapter opens with an **At a glance** table, and Chapters 19 and 20 compare everything side
by side. The comparison uses the same axes throughout:

- **Rendering model.** Where and when HTML is produced: in the browser (client-side rendering), on the server
  per request (SSR), at build time (SSG), or a mix, with hydration, islands or resumability to make the
  page interactive.
- **Reactivity model.** How the framework finds out what changed and updates the DOM: re-render and diff a
  virtual DOM (React, Preact, Mithril), fine-grained signals (Solid, Vue, Angular, Qwik, VanJS), or code
  generated by a compiler (Svelte, Solid's JSX, Vue Vapor). [Chapter 15](15-reactivity-compared.md) builds a
  signal library from scratch to compare them.
- **Templates.** How you write markup: JSX, HTML templates with directives, single-file components, tagged
  template literals, hyperscript function calls, or HTML attributes.
- **Size.** The gzip size of the Tasklet build, measured the same way for every framework with
  `tasklet/tools/size.mjs`. Size is a proxy for how much JavaScript a user downloads and runs before the page
  works; it matters most on slow phones and networks.
- **Ecosystem.** Libraries, component kits, tools, learning material, hiring pool. A large ecosystem means
  most problems are already solved by someone; a small one means you'll write more yourself.
- **Stability.** How often the framework changes in ways that make you rewrite code, how upgrades are
  handled, who maintains it and how it's funded. A framework you'll maintain for ten years should still be
  maintained in ten years.
- **Server story.** What the framework offers for server rendering, data loading and full-stack apps,
  usually through its meta-framework, or, for htmx and Alpine, by starting on the server in the first place.

No tool wins on every axis. A framework with the smallest bundle may have the smallest ecosystem; the one
with the most built in may be the hardest to learn. The course tries to show each design as a coherent answer
to real problems, and then what it costs.

To calibrate the size axis, here is every Tasklet build, measured the same way (JavaScript, CSS and HTML,
gzipped) by `tasklet/tools/compare.mjs`:

| Tasklet build | Gzip size | × vanilla |
|---|---:|---:|
| [Vanilla TypeScript (no framework)](03-the-problem-frameworks-solve.md) | 3.16 kB | 1.0 |
| [VanJS](10-mithril-and-the-minimalists.md) | 4.95 kB | 1.6 |
| [Solid](08-solid.md) | 10.37 kB | 3.3 |
| [Lit](12-lit-and-web-components.md) | 10.64 kB | 3.4 |
| [Preact](09-preact.md) | 11.74 kB | 3.7 |
| [Mithril](10-mithril-and-the-minimalists.md) | 11.94 kB | 3.8 |
| [Svelte](06-svelte.md) | 17.76 kB | 5.6 |
| [htmx](13-htmx.md) | 19.09 kB | 6.0 |
| [Alpine.js](14-alpine.md) | 21.82 kB | 6.9 |
| [Vue](05-vue.md) | 28.37 kB | 9.0 |
| [Qwik](11-qwik.md) | 45.71 kB | 14.5 |
| [React](04-react.md) | 70.14 kB | 22.2 |
| [Angular](07-angular.md) | 76.97 kB | 24.4 |

The CSS and HTML (about 1.2 kB of each total, gzipped) are the same in every build, so the differences are
almost all framework code. Two numbers need a footnote: Qwik's build is split into 35 files and a page loads
only part of it up front, and htmx's total is its server-rendered page plus the htmx library.
[Chapter 19](19-comparing-frameworks.md) explains what these numbers mean and what they don't, alongside
source size, build time, benchmarks, popularity and governance.

## How to use this course

The course has six parts:

1. **The Landscape** (Chapters 1–3): this map, the history, and the problem frameworks solve, with the
   vocabulary the rest of the course uses.
2. **The Big Four** (Chapters 4–7): React, Vue, Svelte, Angular.
3. **Fine-Grained and Minimal** (Chapters 8–12): Solid, Preact, Mithril and VanJS, Qwik, Lit.
4. **HTML-First** (Chapters 13–14): htmx and Alpine.js.
5. **Across Frameworks** (Chapters 15–18): reactivity, state and data, build tools, meta-frameworks and
   rendering.
6. **Choosing** (Chapters 19–20): measured comparisons, and a decision guide for real projects.

Read Chapters 1–3 first: Chapter 3 defines the terms every later chapter uses. After that, the framework
chapters stand on their own; read them in order for the full tour, or jump to the ones you're evaluating.
Each framework chapter has the same structure (at a glance, why it exists, the mental model, code
structure, building Tasklet, beyond Tasklet, strengths and trade-offs, a comparison), so you can compare
the same section across chapters. Three appendices help with that: the
[Rosetta Stone](appendix-a-rosetta-stone.md) shows the same concept in every framework, the
[Glossary](appendix-b-glossary.md) defines the terms, and the [Tasklet Specification](appendix-c-tasklet-spec.md)
documents the app and its test.

The course is a survey. It explains how each tool thinks and what building with it feels like, but it doesn't
document every API; each chapter links to the official docs, and `REFERENCES.md` lists every source. For
React, [the React course](../learn-react/README.md) goes much deeper.

### What you need to know

You should be comfortable with HTML, CSS, the DOM and everyday JavaScript (modules, arrow functions,
`async`/`await`, array methods). Most of the code is TypeScript, but only the basics: type annotations,
interfaces, union types and generics in a function signature. If those are new, work through
[the TypeScript Crash Course](../learn-typescript-crashcourse/README.md) first. Three apps (Alpine, Mithril,
VanJS) use plain JavaScript where that's more idiomatic, and their chapters say why. The htmx app's server is
TypeScript that Node.js runs directly. You'll use a terminal to run commands. Git is not required.

## Requirements

- **Node.js 26 LTS or newer**, with the npm it bundles (the course was verified with Node.js 26.13.0 and
  npm 11.20.0). Installing Node isn't covered.
- A current browser (Chrome, Edge, Firefox or Safari) to open the apps.
- For the acceptance test, Playwright's Chromium. `npx playwright install chromium` in `tasklet/e2e`
  downloads it.
- An internet connection for `npm ci` the first time you install each app.

Check your versions:

```console
$ node --version
v26.13.0
$ npm --version
11.20.0
```

Every app has its own `package.json` and `package-lock.json` with exact versions, so `npm ci` installs
exactly what the course was tested with.

## Running Tasklet

Every implementation lives in its own folder under `tasklet/` and runs on its own port, so you can run
several at once and compare them in your browser:

| App | Folder | Port | App | Folder | Port |
|---|---|---|---|---|---|
| Vanilla TypeScript | `tasklet/vanilla` | 4301 | Mithril | `tasklet/mithril` | 4308 |
| React | `tasklet/react` | 4302 | VanJS | `tasklet/vanjs` | 4309 |
| Vue | `tasklet/vue` | 4303 | Qwik | `tasklet/qwik` | 4310 |
| Svelte | `tasklet/svelte` | 4304 | Lit | `tasklet/lit` | 4311 |
| Angular | `tasklet/angular` | 4305 | htmx | `tasklet/htmx` | 4312 |
| Solid | `tasklet/solid` | 4306 | Alpine.js | `tasklet/alpine` | 4313 |
| Preact | `tasklet/preact` | 4307 | | | |

Each app has the same three scripts:

```console
$ cd tasklet/vanilla
$ npm ci
$ npm run dev        # dev server with hot reload: http://localhost:4301/
$ npm run build      # type-check, then build into dist/
$ npm run preview    # serve dist/ on http://localhost:4301/
```

Stop a server with Ctrl+C. All apps look the same, because they share one stylesheet and the same seed data
(`tasklet/shared/`). The tasks you add are saved in your browser's `localStorage` per port, so each app has
its own list; clear the site data in your browser's developer tools to start over. The htmx version is the
exception: it keeps the tasks in its small Node server, and Chapter 13 explains how to run it.

## Running the acceptance test

The acceptance test in `tasklet/e2e/` is a Playwright suite of fifteen browser tests that every Tasklet must
pass: adding, toggling, deleting, filtering, the loading and error states, persistence, and the exact texts
and accessible names of the contract. Chapter 3 explains how it works. To test one app, build it, then:

```console
$ cd tasklet/e2e
$ npm ci
$ APP=vanilla npx playwright test

Running 15 tests using 15 workers
…
  15 passed (3.8s)
```

The harness starts the app's production server (`npm run preview`) itself and stops it afterwards. To
install, build, serve and test several apps in one go, and get a summary table:

```console
$ node run-all.mjs vanilla react
…
Summary
app      port  build  passed  failed  skipped  note
vanilla  4301  ok     15      0       0
react    4302  ok     15      0       0
```

Run `node run-all.mjs` with no arguments to test every app.

## Summary

- The course covers UI frameworks, the meta-frameworks built on them, the build tools under them and the
  state and data libraries around them, plus the history that led there.
- The big four are React, Vue, Svelte and Angular. Solid, Preact, Mithril, VanJS and Qwik are smaller or take
  a different approach. Lit builds on Web Components; htmx and Alpine start from server-rendered HTML.
- Meta-frameworks (Next.js, React Router, TanStack Start, Nuxt, SvelteKit, Astro, SolidStart, Analog, Qwik
  City) add routing, server rendering and data loading.
- Vite, built on Rolldown, is the most common build tool; esbuild, Rspack, Turbopack, webpack and Bun are the
  others you'll meet.
- Tools are compared on rendering model, reactivity model, templates, size, ecosystem, stability and server
  story.
- Every framework builds Tasklet and passes the same fifteen-test acceptance suite. You need Node.js 26 or
  newer; `npm ci` and `npm run dev` in an app folder run it, `APP=<app> npx playwright test` in
  `tasklet/e2e` tests it.

## Exercises

1. **Run two Tasklets side by side.** Start the vanilla and React apps' dev servers in two terminals and open
   both. Add a task in one. Does it appear in the other? Why or why not?

   <details><summary>Solution</summary>

   ```console
   $ cd tasklet/vanilla && npm ci && npm run dev
   $ cd tasklet/react && npm ci && npm run dev
   ```

   Open `http://localhost:4301/` and `http://localhost:4302/`. The new task appears only in the app where you
   added it. Both apps save to `localStorage` under the same key, `tasklet:v1`, but `localStorage` belongs to
   an **origin** (scheme, host and port), and different ports are different origins.

   </details>

2. **Check the versions yourself.** Versions in this chapter will be out of date by the time you read it.
   Write a script that asks the npm registry for the `latest` version of a list of packages, the date it was
   published, and the `next` pre-release if there is one. Use `fetch` and `https://registry.npmjs.org/<name>`.

   <details><summary>Solution</summary>

   ```js
   // Exercise 2: print the version npm installs today (the `latest` tag) and any
   // `next` pre-release for a few of the packages in this course.
   // Run: node latest-versions.mjs [package ...]
   const packages = process.argv.slice(2)
   if (packages.length === 0) packages.push('react', 'vue', 'svelte', 'solid-js', 'htmx.org')

   for (const name of packages) {
     const response = await fetch(`https://registry.npmjs.org/${name}`)
     if (!response.ok) {
       console.log(`${name.padEnd(16)} not found (HTTP ${response.status})`)
       continue
     }
     const { 'dist-tags': tags, time } = await response.json()
     const date = time[tags.latest].slice(0, 10)
     const next = tags.next ? `  next: ${tags.next}` : ''
     console.log(`${name.padEnd(16)} ${tags.latest.padEnd(11)} (${date})${next}`)
   }
   ```

   ```console
   $ node latest-versions.mjs
   react            19.3.1      (2026-10-14)  next: 19.3.0-canary-d5736f09-20260507
   vue              3.5.44      (2026-10-13)
   svelte           5.57.3      (2026-10-26)  next: 5.0.0-next.272
   solid-js         1.9.18      (2026-10-29)  next: 2.0.0-rc.20
   htmx.org         2.0.11      (2026-09-22)  next: 4.0.1
   $ node latest-versions.mjs mithril @qwik.dev/core no-such-package-xyz-123
   mithril          2.3.8       (2025-11-08)  next: 3.0.0-next.102
   @qwik.dev/core   2.0.0-rc.4  (2026-10-25)
   no-such-package-xyz-123 not found (HTTP 404)
   ```

   Read the tags with care. `next` is just a name a project chooses: Svelte's points at an old 5.0
   pre-release that nobody updated, React's at a canary build, Solid's and htmx's at the next major version.
   And `latest` isn't always stable: the new `@qwik.dev/core` package publishes its 2.0 release candidates
   as `latest`. `npm view <name> dist-tags` shows the same data.

   </details>

3. **Measure the cost of a framework.** Build the vanilla and React apps (`npm run build` in each), then
   write a script that runs `tasklet/tools/size.mjs --json` on several builds and prints each total gzip size
   and its ratio to the vanilla build.

   <details><summary>Solution</summary>

   ```js
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
   ```

   ```console
   $ node examples/ch01/compare-sizes.mjs vanilla react
   vanilla       3.16 kB  1.0× vanilla
   react        70.14 kB  22.2× vanilla
   ```

   The React build is about 22 times the size of the vanilla one, and almost all of that is React and
   React DOM, not Tasklet. That's a fixed cost: a ten-times-larger app would add its own code, but not
   another copy of React. Chapter 19 runs the comparison for all thirteen apps and puts the numbers in
   context.

   </details>

4. **Place a project on the axes.** You're building an internal admin tool for a team of six developers who
   already know React. It's used on desktop office computers, behind a login, and has dozens of forms and
   tables. Which comparison axes matter most, and which matter least?

   <details><summary>Solution</summary>

   Most important: **ecosystem** (form, table and component libraries save months), **stability** (an
   internal tool is maintained for years by whoever is on the team), and the team's existing knowledge, which
   isn't an axis of the framework but often decides. Least important: **size** (fast desktop machines on an
   office network, used daily, so the code is cached) and the **server story** (behind a login, nothing to
   index for search engines, so client-side rendering is fine). That points at React with a mature component
   library, and Chapter 20 walks through this and other scenarios in more detail. A different team, or a
   public site where load time on phones matters, would weigh the same axes differently.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-1--the-landscape)
