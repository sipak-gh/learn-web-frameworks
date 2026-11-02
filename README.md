# Learn Web Frameworks: A Survey Course for Web Developers

A hands-on survey of the JavaScript web frameworks in use today, for developers who know HTML, CSS, the DOM
and some TypeScript. Instead of teaching one framework in depth, the course shows what makes each one
different: its mental model, how its code is structured, how its reactivity works, what it costs and who
stands behind it. Every framework builds the same small app, **Tasklet**, a task list with filters, loading
and error states and persistence, and every version passes the same fifteen-test acceptance suite. So you can
put the code side by side, measure the builds, and by the end choose a tool for your next project with
reasons you can defend.

The course covers React, Vue, Svelte and Angular; Solid, Preact, Mithril, VanJS and Qwik; Lit and Web
Components; htmx and Alpine.js; and, in survey chapters, the state, routing and data libraries, build tools
and meta-frameworks (Next.js, Nuxt, SvelteKit, Astro and others) built around them.

## Who it's for

This course is for web developers who have built pages with HTML, CSS and JavaScript and used the DOM
directly, and who want an informed overview before they commit to a framework, or want to know what else
is out there beyond the one they use. It assumes no framework knowledge. [Chapter 3](03-the-problem-frameworks-solve.md)
builds Tasklet in plain TypeScript, finds where it hurts, and introduces the vocabulary the rest of the course
uses.

Most of the code is TypeScript, but only the basics. If you can't read everyday TypeScript yet, work through
the [TypeScript Crash Course](../learn-typescript-crashcourse/README.md) first. React gets a short chapter
here because it has a course of its own: [Learn React](../learn-react/README.md) teaches it in depth.

## Requirements

- **Node.js 26 LTS or newer** (verified with Node.js 26.13.0) and the npm that ships with it (verified with
  npm 11.20.0). Node and npm run the tooling: the dev servers, the builds and the tests, and the htmx app's
  small server. Every other app runs in the browser.
- **Any current evergreen browser**, for example Chrome, Edge, Firefox or Safari.
- Optional: nothing else. The acceptance suite downloads its own Chromium through Playwright.

This course doesn't cover installing Node.js. Check your versions:

```console
$ node --version
v26.13.0
$ npm --version
11.20.0
```

Every app and example pins its packages in `package.json` and `package-lock.json`, so `npm ci` installs
exactly what the course was tested with. The Tasklet apps use these versions:

| App | Framework | Build tool | TypeScript |
|---|---|---|---|
| Vanilla | none | Vite 8.3.5 | 7.0.2 |
| React | React and react-dom 19.3.1 | Vite 8.3.5, @vitejs/plugin-react 6.2.1 | 7.0.2 |
| Vue | Vue 3.5.44 | Vite 8.3.5, @vitejs/plugin-vue 6.0.10 | 6.0.3 (vue-tsc 3.3.14) |
| Svelte | Svelte 5.57.3 | Vite 8.3.5, @sveltejs/vite-plugin-svelte 7.3.1 | 6.0.3 (svelte-check 4.7.8) |
| Angular | Angular 22.2.4 (CLI 22.2.5) | @angular/build 22.2.5 | 6.0.3 |
| Solid | solid-js 1.9.18 | Vite 8.3.5, vite-plugin-solid 2.11.15 | 7.0.2 |
| Preact | Preact 11.1.1, @preact/signals 2.11.4 | Vite 8.3.5, @preact/preset-vite 2.10.6 | 7.0.2 |
| Mithril | Mithril 2.3.8 | Vite 8.3.5 | JavaScript |
| VanJS | vanjs-core 1.6.2, vanjs-ext 0.6.4 | Vite 8.3.5 | JavaScript |
| Qwik | @builder.io/qwik and qwik-city 1.20.3 | Vite 7.3.1 | 5.4.5 |
| Lit | Lit 3.3.3, @lit/task 1.0.3 | Vite 8.3.5 | 7.0.2 |
| htmx | htmx.org 2.0.11 | none (a Node.js server) | 7.0.2 |
| Alpine.js | alpinejs 3.17.5 | Vite 8.3.5 | JavaScript |

The acceptance suite uses @playwright/test 1.64.1. Each chapter explains why its app uses the versions it
does (for example, Vue, Svelte and Angular's type checkers still require TypeScript 6, and the Qwik starter
pins its own toolchain).

## How to use this course

1. Read the chapters in order, at least Part I and the chapters on the frameworks you care about. The
   framework chapters (4–14) can be read in any order after [Chapter 3](03-the-problem-frameworks-solve.md);
   Parts V and VI compare them and assume you've read most of them.
2. Run the Tasklet apps and read their code next to the chapter. Each app lives in `tasklet/<app>/` and runs
   on its own port (4301–4313), so you can run several at once:

   ```console
   $ cd tasklet/vue
   $ npm ci
   $ npm run dev        # dev server with hot reload: http://localhost:4303/
   $ npm run build      # type-check, then build into dist/
   $ npm run preview    # serve dist/ on http://localhost:4303/
   ```

   The htmx app has a server instead of a build; [Chapter 13](13-htmx.md) explains how to run it.
   [Chapter 1](01-the-landscape.md#running-tasklet) lists every app's folder and port.
3. Run the acceptance suite. It builds, serves and tests every app with Playwright and prints a summary
   table. The htmx app runs 9 tests and skips 6 that check the client-side loading of `tasks.json` and
   `localStorage`, because its server renders the tasks and keeps them in memory:

   ```console
   $ cd tasklet/e2e
   $ npm ci
   $ npx playwright install chromium
   $ node run-all.mjs              # every app; or name some: node run-all.mjs vue svelte
   $ APP=vanilla npx playwright test   # one app whose dist/ you have built
   ```

4. Run the examples. Each chapter's other examples and exercise solutions are in `examples/chNN/`, where `NN`
   is the chapter number, and run as shown in the chapter.
5. Do the exercises at the end of each chapter before you open their solutions.

Versions and numbers (downloads, survey results, release dates) were checked in November 2026. They will
date; [Chapter 1](01-the-landscape.md#exercises) shows how to check current versions, and
[Chapter 19](19-comparing-frameworks.md) how to re-measure the builds.

## Table of contents

### Part I — The Landscape

| Chapter | Title | What it covers |
|---|---|---|
| 1 | [The Landscape](01-the-landscape.md) | Every framework and tool in the course in a few sentences, the axes used to compare them, and how to run Tasklet |
| 2 | [A Short History](02-a-short-history.md) | From jQuery through Backbone, Knockout, AngularJS and Ember to React, Vue, compilers, signals and the return to the server |
| 3 | [The Problem Frameworks Solve](03-the-problem-frameworks-solve.md) | Tasklet in vanilla TypeScript, where it hurts, the vocabulary of the course, and the acceptance test |

### Part II — The Big Four

| Chapter | Title | What it covers |
|---|---|---|
| 4 | [React](04-react.md) | UI as a function of state, re-render and reconcile, hooks, the React Compiler; a short tour that points to the React course |
| 5 | [Vue](05-vue.md) | Single-file components, the Composition API, proxy-based reactivity, templates and directives, Vapor mode |
| 6 | [Svelte](06-svelte.md) | The compiler, Svelte 5 runes, snippets and reactive modules |
| 7 | [Angular](07-angular.md) | The full platform: CLI, dependency injection, signals, zoneless change detection, built-in control flow |

### Part III — Fine-Grained and Minimal

| Chapter | Title | What it covers |
|---|---|---|
| 8 | [Solid](08-solid.md) | Signals, components that run once, JSX compiled to real DOM, stores, and Solid 2.0 |
| 9 | [Preact](09-preact.md) | React's API in a few kilobytes, `preact/compat`, Preact Signals, and when to choose it |
| 10 | [Mithril and the Minimalists](10-mithril-and-the-minimalists.md) | Mithril and VanJS, whether Mithril is still in use, Hyperapp and Inferno, and what "minimal" buys and costs |
| 11 | [Qwik](11-qwik.md) | Resumability instead of hydration, `$` boundaries, serialization, and Qwik 2.0 |
| 12 | [Lit and Web Components](12-lit-and-web-components.md) | Custom elements, shadow DOM, slots, Lit's reactive properties, Web Components in other frameworks, Stencil |

### Part IV — HTML-First

| Chapter | Title | What it covers |
|---|---|---|
| 13 | [htmx](13-htmx.md) | Hypermedia: a server that renders HTML, `hx-*` attributes, swaps and triggers, and htmx 4 |
| 14 | [Alpine.js](14-alpine.md) | Behavior in HTML attributes, stores, plugins, and pairing with htmx and server-rendered pages |

### Part V — Across Frameworks

| Chapter | Title | What it covers |
|---|---|---|
| 15 | [Reactivity Compared](15-reactivity-compared.md) | Virtual DOM diffing, fine-grained signals and compiled updates; a signal library built from scratch; the TC39 Signals proposal |
| 16 | [State, Routing and Data](16-state-routing-and-data.md) | Kinds of state, Redux Toolkit, Zustand, Jotai, Pinia, NgRx Signal Store, TanStack Query, routers and forms |
| 17 | [Build Tools](17-build-tools.md) | Why bundle, Vite and Rolldown, esbuild, Rspack, Turbopack, webpack, Bun, type-checking, linters and formatters |
| 18 | [Meta-Frameworks and Rendering](18-meta-frameworks-and-rendering.md) | CSR, SSR, SSG, streaming, hydration, islands, resumability, Server Components, and the meta-frameworks |

### Part VI — Choosing

| Chapter | Title | What it covers |
|---|---|---|
| 19 | [Comparing Frameworks](19-comparing-frameworks.md) | Measured sizes, source lines and build times, benchmarks, surveys, downloads, governance, and pros and cons |
| 20 | [Choosing a Framework](20-choosing-a-framework.md) | A decision guide: the questions to ask, eleven scenarios, "boring" choices, migrating, and where to go next |

### Appendices

- [Appendix A — Rosetta Stone](appendix-a-rosetta-stone.md): the same concept (state, derived values,
  events, lists, effects and more) in every framework, side by side.
- [Appendix B — Glossary](appendix-b-glossary.md): the terms used in the course, with the chapter that
  explains each.
- [Appendix C — Tasklet Specification](appendix-c-tasklet-spec.md): Tasklet's behavior, its DOM contract,
  the acceptance tests, and how to add a new implementation.

References: [REFERENCES.md](REFERENCES.md) lists the sources behind each chapter, with archived copies
(Wayback Machine / Software Heritage) of every link where one exists.

## Repository layout

```text
README.md                 this file
01-the-landscape.md …     chapters
appendix-*.md             appendices
REFERENCES.md             sources for every chapter
tasklet/<app>/            Tasklet in each framework (13 apps, ports 4301–4313)
tasklet/shared/           the stylesheet and seed tasks every app shares
tasklet/e2e/              the Playwright acceptance suite and run-all.mjs
tasklet/tools/            size.mjs and compare.mjs, which measure the builds
examples/chNN/            the other examples and exercise solutions from chapter NN
```
