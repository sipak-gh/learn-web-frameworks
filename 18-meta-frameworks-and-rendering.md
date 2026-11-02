# Chapter 18 — Meta-Frameworks and Rendering

So far the course has looked at what happens in the browser: components, reactivity, routers, build tools.
This chapter looks at the server. It asks one question for every page: where and when does the HTML get
made? You learn the main answers, each with a timeline: client-side rendering, server-side rendering, static
generation, incremental regeneration, streaming, hydration and its cost, partial hydration and islands,
resumability, React Server Components and the edge. Next you build an Astro page with islands from four
frameworks and measure how much JavaScript each one ships. Last, you tour the meta-frameworks that package
these strategies: Next.js, React Router, TanStack Start, Nuxt, SvelteKit, Astro, SolidStart, Analog and Qwik
City. For each one you see what makes it different, how its files map to routes and how a page gets its data.
[Chapter 19](19-comparing-frameworks.md) then sets the frameworks side by side with measured numbers.

## What a meta-framework adds

A UI framework like React, Vue or Svelte renders components. It doesn't decide which URL shows which
component, where data comes from, how the page reaches the browser or where the code runs. A
**meta-framework** is a framework built on top of a UI framework that makes those decisions for you. Most
meta-frameworks give you:

- **File-based routing.** A file's location under `routes/` or `pages/` sets its URL, with nested layouts.
  [Chapter 16](16-state-routing-and-data.md) compared this with routers you configure in code.
- **Server rendering.** The same components that run in the browser also run on a server, or at build time,
  to produce HTML.
- **Data loading tied to routes.** Each route says what data it needs, and the framework fetches it on the
  server before rendering, so components don't start fetching only after they mount.
- **Mutations.** Forms, actions or server functions send changes back to the server, often working without
  JavaScript too.
- **A server.** API endpoints, middleware, cookies, redirects and headers live in the same project.
- **A build and a deploy story.** A bundler that splits code for the server and the browser
  ([Chapter 17](17-build-tools.md)), plus adapters that package the result for Node, serverless functions,
  edge runtimes or a static file host.

The React course covers the React side of this in
[Chapter 20 of the React course](../learn-react/20-where-next.md) ("What a framework adds" and "Server
Components and Server Functions"). This chapter takes the same ideas across every framework in the course.

## Rendering strategies

Each strategy below answers two questions: when is the HTML made, and how does it become interactive? Each
timeline runs from left to right. `▲ content` marks the moment the user first sees the page's real content.
`▲ interactive` marks the moment clicks start working.

### CSR and SSR

**Client-side rendering (CSR)** sends an almost empty HTML file and a JavaScript bundle. The browser
downloads the bundle, runs it, fetches data and only then builds the page. Most of the Tasklet apps in this
course work this way.

```text
CSR
server    [send shell]
browser        [parse][── download app.js ──][run][── fetch /api ──][render]
screen    blank ............................................................▲ content
                                                                            ▲ interactive
```

**Server-side rendering (SSR)** runs the components on the server for each request and sends finished HTML.
The browser can paint content as soon as the HTML arrives. The page then downloads the same components as
JavaScript and makes the HTML interactive, a step called **hydration** (more on it below).

```text
SSR
server    [── fetch data ──][render HTML][send]
browser                                      [paint][── download JS ──][hydrate]
screen    blank ....................................▲ content ..................▲ interactive
```

SSR shows content sooner, works for crawlers and link previews that don't run JavaScript, and puts the data
fetch next to the database. In return, the server does work on every request and the server's response
starts later, because the data must be fetched before the first byte goes out.

You can see the difference without any framework. The example in `examples/ch18/ssr-vs-csr/` is a Node
server with no dependencies. It serves the same three-task list two ways. Both pages share one rendering
function:

```js
// Shared by the server (to render HTML) and the browser (to render or hydrate).
const escape = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderTasks(tasks) {
  return tasks
    .map((t) => `<li><button type="button" data-id="${t.id}" aria-pressed="${t.done}">${escape(t.title)}</button></li>`)
    .join('');
}

export function attach(list, tasks) {
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const task = tasks.find((t) => t.id === button.dataset.id);
    task.done = !task.done;
    button.setAttribute('aria-pressed', String(task.done));
  });
}
```

That's `public/tasks.mjs`. The server (`server.mjs`) sends an empty list on `/csr` and a rendered list on
`/ssr`:

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderTasks } from './public/tasks.mjs';

const tasks = [
  { id: '1', title: 'Read the Vue chapter', done: false },
  { id: '2', title: 'Try Svelte runes', done: false },
  { id: '3', title: 'Write a signal from scratch', done: true },
];

// Escape "<" so a title containing "</script>" can't end the data block early.
const serialize = (data) => JSON.stringify(data).replaceAll('<', '\\u003c');

const page = (body, script) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Tasks</title></head>
<body>
<h1>Tasks</h1>
${body}
<script type="module" src="/${script}"></script>
</body>
</html>
`;

const routes = {
  '/csr': () => page('<ul id="tasks"></ul>', 'csr.mjs'),
  '/ssr': () =>
    page(
      `<ul id="tasks">${renderTasks(tasks)}</ul>
<script type="application/json" id="data">${serialize(tasks)}</script>`,
      'hydrate.mjs',
    ),
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (routes[pathname]) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(routes[pathname]());
  } else if (pathname === '/api/tasks') {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(tasks));
  } else if (/^\/[\w-]+\.mjs$/.test(pathname)) {
    const js = await readFile(new URL(`./public${pathname}`, import.meta.url));
    res.writeHead(200, { 'content-type': 'text/javascript' }).end(js);
  } else {
    res.writeHead(404).end('Not found');
  }
}).listen(4438, () => console.log('http://localhost:4438/csr and /ssr'));
```

The two browser scripts differ in one line. `public/csr.mjs` builds the DOM itself:

```js
import { renderTasks, attach } from './tasks.mjs';

const list = document.querySelector('#tasks');
const tasks = await (await fetch('/api/tasks')).json();
list.innerHTML = renderTasks(tasks); // build the DOM in the browser
attach(list, tasks);
```

`public/hydrate.mjs` finds the DOM already there and only wires it up:

```js
import { attach } from './tasks.mjs';

const list = document.querySelector('#tasks');
const tasks = JSON.parse(document.querySelector('#data').textContent);
attach(list, tasks); // the DOM is already there: only wire it up
```

Run `npm start` in the folder, then ask for each page with `curl`. You get what a crawler, or a browser with
JavaScript turned off, gets:

```console
$ curl -s localhost:4438/csr
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Tasks</title></head>
<body>
<h1>Tasks</h1>
<ul id="tasks"></ul>
<script type="module" src="/csr.mjs"></script>
</body>
</html>
$ curl -s localhost:4438/ssr
<!doctype html>
…
<ul id="tasks"><li><button type="button" data-id="1" aria-pressed="false">Read the Vue chapter</button></li><li><button type="button" data-id="2" aria-pressed="false">Try Svelte runes</button></li><li><button type="button" data-id="3" aria-pressed="true">Write a signal from scratch</button></li></ul>
<script type="application/json" id="data">[{"id":"1","title":"Read the Vue chapter","done":false},{"id":"2","title":"Try Svelte runes","done":false},{"id":"3","title":"Write a signal from scratch","done":true}]</script>
<script type="module" src="/hydrate.mjs"></script>
…
```

A Playwright test in headless Chromium confirmed what this shows. With JavaScript on, both pages end up with
three tasks that toggle. With JavaScript off, `/ssr` shows the list and `/csr` shows nothing. Notice too
that the `/ssr` page carries every task title twice: once as HTML and once as JSON for the hydration script.
Keep that in mind for the hydration section.

### SSG: static site generation

**Static site generation (SSG)**, also called prerendering, runs the server rendering once, at build time,
and writes an HTML file for every route. Any static host or CDN can then serve those files.

```text
SSG
build     [fetch data][render every route to .html]           (once, in CI)
request   CDN [send file]
browser        [paint][── download JS ──][hydrate]            (if the page has any JS)
screen    ............▲ content ..................▲ interactive
```

It's the fastest and cheapest option, and the hardest to break, because nothing runs per request. Its
limits: content is only as fresh as the last build, a site with a million product pages takes a long time to
build, and nothing can depend on who the user is. Most meta-frameworks let you prerender some routes and
render others on demand, often with a single option per route.

### ISR and revalidation

**Incremental static regeneration (ISR)** sits between SSG and SSR. A page is rendered once and cached. After
a set time it counts as stale. The next request still gets the stale copy right away, and the server
re-renders it in the background. HTTP has the same idea in the `stale-while-revalidate` directive of
`Cache-Control`.

```text
ISR, revalidate after 60 s
t=0      first request renders /product/42 (price $10) and caches it
t=30s    request A ─► cache hit, fresh ─► $10
t=90s    request B ─► cache hit, stale ─► $10 sent at once
                       └─► background: re-render with the new price $12, replace the cache
t=91s    request C ─► cache hit, fresh ─► $12
```

You can also revalidate **on demand**. After a mutation, the code calls a function such as Next.js's
`revalidateTag` or `updateTag`, and the cached pages tagged with that name are invalidated. Next.js made ISR
famous. Nuxt offers it per route through `routeRules` (`isr` and `swr`). SvelteKit offers it through its
Vercel adapter. Astro 7 made route caching stable, with cache providers for CDNs.

Next.js 16 changed the model. With **Cache Components**, which Next.js 16.4 enables by default in new apps
and plans to make the default in Next.js 17, nothing is cached unless you say so. You mark a component or
function with the `'use cache'` directive and set its lifetime with `cacheLife`. Next.js prerenders a static
shell for each route and streams the uncached parts in at request time.

> Cache Components are a new set of features designed to make caching in Next.js both more explicit, and more flexible.
>
> — Next.js team, "Next.js 16" (2025)

### Streaming SSR

Plain SSR has a weakness: the slowest data fetch delays the whole page. **Streaming SSR** sends the HTML in
pieces. The server sends the page's shell and a placeholder for each slow part at once. When a slow part's
data arrives, the server sends that part's HTML through the same response, together with a small inline
script that swaps it into place.

```text
Streaming SSR
server    [shell]─send──────────[── slow query ──]─send part + swap script─┐
browser        [paint shell + skeleton]                                   [swap in]
screen    .............................▲ content (shell) ..........................▲ content (all)
```

In React, the boundaries are `<Suspense>` components, and `renderToPipeableStream` (for Node) or
`renderToReadableStream` (for Web Streams) produce the stream. Next.js's `loading.tsx` files are Suspense
boundaries. React Router and SvelteKit stream promises that a loader returns without awaiting them. SolidStart
and Qwik City stream as well, and Nuxt added experimental streaming in 4.5. The cost is subtle: once the
first byte has gone out, the server can't change the status code or the headers, so an error deep in the page
can't turn into a 404 or a redirect.

### Hydration and its cost

SSR gives you HTML that looks ready but doesn't respond. **Hydration** is the step that makes it respond. The
framework downloads the code for every component on the page and runs them again in the browser. As it goes,
it builds its internal model (a virtual DOM tree, or signals and their subscriptions) and matches each node to
the DOM node the server sent. Then it attaches event listeners.

```text
Hydration
server HTML ──► [paint]▲ content (looks ready)
                       ├─ download JS for every component on the page
                       ├─ parse and run it
                       ├─ re-render the components to rebuild the framework's model
                       └─ attach listeners ▲ interactive
                <─── uncanny valley: buttons visible, clicks lost or delayed ───>
```

That work has four costs:

- **The code ships even for static parts.** A footer or a long article must be hydrated with everything
  else, so its component code is downloaded and run, even though it will never change.
- **The data ships twice.** The state used to render the HTML is serialized into the page so the client can
  re-render to the same result. You saw this in `/ssr`. Nuxt calls it the *payload*.
- **The work happens during the uncanny valley.** On a slow phone, the page looks finished for seconds
  before it responds. Some frameworks record early clicks and replay them after hydration (React does this
  for Suspense boundaries, and Angular calls it event replay), but the delay is still there.
- **Mismatches.** If the client renders anything different from the server, for example
  `new Date()`, a random ID or data read from `localStorage`, the framework warns about a **hydration
  mismatch** and fixes the DOM or re-renders that part on the client.

Every remaining strategy in this section is a way to do less of this work.

### Progressive and partial hydration

**Progressive hydration** (also called lazy or incremental hydration) still hydrates the whole page, but in
pieces and on triggers, not all at once. React hydrates each `<Suspense>` boundary separately and hydrates
the one the user clicks first. Angular's **incremental hydration** adds a `hydrate` trigger to `@defer`
blocks, so that `@defer (hydrate on viewport)` renders on the server but leaves the block inert, its code not
even downloaded, until it scrolls into view. It's on by default when an app uses `provideClientHydration()`.
Vue 3.5 has hydration strategies for async components (`hydrateOnVisible`, `hydrateOnIdle`), and Nuxt
exposes them as props on lazy components, such as `<LazyComments hydrate-on-visible />`.

**Partial hydration** goes further: some components are never hydrated at all, because nothing on the
client ever needs them. Their code never reaches the browser. That raises a design question: who decides
which components need to be interactive? Islands answer it one way, Server Components another.

### Islands

An **islands architecture** treats the page as static HTML with a few interactive regions, the islands. Each
island hydrates on its own, with its own trigger, and the rest of the page ships no JavaScript. Jason Miller
named the pattern in 2020, building on a term from Katie Sylor-Miller:

> render HTML pages on the server, and inject placeholders or slots around highly dynamic regions. These placeholders/slots contain the server-rendered HTML output from their corresponding widget.
>
> — Jason Miller, "Islands Architecture" (2020)

```text
Islands
┌──────────────── static HTML page (no JS) ────────────────┐
│ header, nav, article text …                              │
│  ┌──────────────┐                    ┌────────────────┐  │
│  │ island A     │                    │ island B       │  │
│  │ client:load  │                    │ client:visible │  │
│  └──────────────┘                    └────────────────┘  │
│ footer                                                   │
└──────────────────────────────────────────────────────────┘

browser   [paint whole page]▲ content
          [── A: download + hydrate ──]▲ A interactive
          ...... user scrolls ......[── B: download + hydrate ──]▲ B interactive
```

The cost of islands is that they are separate apps. Islands don't share a component tree, so they can't
share context. Moving from one page to another is a full page load unless you add view transitions or a
client router, and an app that is mostly interactive ends up as one big island. Astro is the best-known islands
framework. Nuxt's `<NuxtIsland>` and server components work the other way round: they render parts of a
hydrated page on the server only. Fresh (for Deno) also uses islands. The Astro example below makes the idea
concrete.

### Resumability

Hydration replays work the server already did. **Resumability** tries to skip that replay. The server
serializes into the HTML everything the client would need: the application state, which component owns which
DOM node and which code handles each event. The browser loads a small loader script (1.68 kB gzipped in Tasklet's Qwik build) that sets up one global
listener.
When the user clicks, that listener looks up the handler's chunk in the HTML, downloads only that chunk and
runs it. Nothing is re-rendered up front.

```text
Resumability (Qwik)
server    [render + serialize state, listeners and component boundaries into the HTML]
browser   [paint]▲ content   [load a small loader, one global listener]▲ interactive
user      click ──► download that handler's chunk ──► run it ──► update the DOM
```

Qwik is the framework built on this idea, and [Chapter 11](11-qwik.md) covers how its `$` markers let the
optimizer split every handler into its own chunk. The costs: the first click may wait for a network request,
state must be serializable, and the programming model has rules a newcomer must learn. To hide that first
wait, Qwik by default preloads likely chunks, including its core, during idle time, so the page still
downloads JavaScript early; it just doesn't run it until it's needed.

### React Server Components and server functions

**React Server Components (RSC)** split components into two kinds. **Server Components** are the default.
They run only on the server or at build time, can be `async`, can read a database or the filesystem directly,
and never ship their code to the browser. **Client Components** start with a `'use client'` directive. They
render on the server too (for the first HTML) and hydrate in the browser, as before.

```text
React Server Components
server    [Server Components run: read DB, render]──► RSC payload:
              rendered tree + "client reference: ./LikeButton.tsx" + its props
          [SSR: turn the payload into HTML]
browser   [paint]▲ content  [download Client Component JS only][hydrate those]▲ interactive
navigate  fetch a new RSC payload ──► React merges it into the page (client state kept)
```

It's partial hydration decided per component, inside one React tree. Unlike islands, Server and Client
Components can nest in each other and share a single router. **Server functions** (`'use server'`) are the
reverse direction. A server-side `async` function becomes something a Client Component can call, or a
form's `action`. The framework turns it into an HTTP endpoint and the call into a `fetch`.

Treat every server function as a public endpoint: anyone can call it with any arguments, so validate the
input and check the user's permissions inside it. The protocol itself has had bugs too. In December 2025 the
React team disclosed CVE-2025-55182, a CVSS 10.0 flaw that allowed unauthenticated remote code execution
through payloads sent to React Server Functions, and frameworks shipped patched releases. Keep framework
versions current.

React defines RSC, but a framework provides the bundler and server that make it work. Next.js's App Router
is the main one. React Router has RSC support marked unstable, and TanStack Start has it as experimental.
The React course's [Chapter 20](../learn-react/20-where-next.md) shows Server Components and Server Functions
in code. [Chapter 17 of the React course](../learn-react/17-async-react.md) covers Suspense and Actions,
which they build on.

### Edge and Node runtimes

Where the server code runs matters as much as when. There are two broad kinds of place:

- **Node.js** (or Bun or Deno) in one region: a long-running server, a container or a serverless function.
  It has the full Node API and every npm package, and it can sit next to the database.
- **Edge runtimes**, such as Cloudflare Workers or Vercel's and Netlify's edge functions, which run V8
  isolates in data centers close to each user. They start in milliseconds and offer web-standard APIs
  (`fetch`, `Request`, `Response`, Web Streams, Web Crypto). Not every Node API is available, though Workers
  has a Node.js compatibility mode, and CPU time and memory are limited. Ecma's WinterTC committee (TC55)
  standardizes a "minimum common API" that these runtimes share.

```text
Edge vs Node, a user in Sydney, a database in Virginia
edge      user ─5 ms─► Sydney isolate ─200 ms─► DB ─200 ms─► DB (each query crosses the ocean)
node      user ───────────200 ms────────────► Virginia server ─1 ms─► DB ─1 ms─► DB
```

The edge is fast when the work is close to the user: redirects, auth checks, A/B tests, cached or
personalized HTML with little data. It is slow when a page makes several queries to a database far away. The
industry has partly stepped back from rendering everything at the edge. Next.js 16 renamed `middleware.ts` to
`proxy.ts`, which runs on Node.js, and Cache Components requires the Node.js runtime. Cloudflare, on the other
hand, runs whole applications on Workers and now owns Astro. Most meta-frameworks hide the choice behind
**adapters** (Nitro's presets, SvelteKit and Astro adapters, Next.js's Adapter API, stable since 16.2), so one
codebase can deploy to either kind of place.

## Example: an Astro page with four islands

Astro is the clearest place to see islands, because it ships no JavaScript unless you ask for it, and its
islands can use any of six UI frameworks. The example in `examples/ch18/astro-islands/` has one static page
with:

- a server-only Astro component that reads files at build time;
- a React counter with no directive, so it is rendered to HTML only;
- the same React counter with `client:load`, which hydrates as soon as possible;
- a Svelte counter with `client:idle`, which hydrates when the browser is idle (`requestIdleCallback`);
- a Solid counter with `client:only`, which skips server rendering and renders in the browser only;
- a Vue counter with `client:visible`, below a tall spacer, which hydrates when it scrolls into view
  (`IntersectionObserver`).

The project was scaffolded with
`npm create astro@latest astro-islands -- --template minimal --no-install --no-git --skip-houston --yes`. The
four integrations were then added with `npm install --save-exact`. It uses Astro 7.4.5, React 19.3.1,
Svelte 5.57.3, Vue 3.5.44 and Solid 1.9.18.

### The files

`astro.config.mjs` registers one integration per framework:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// React and Solid both use JSX, so each one is told which folder is its own.
export default defineConfig({
  integrations: [
    react({ include: ['**/react/*'] }),
    solid({ include: ['**/solid/*'] }),
    svelte(),
    vue(),
  ],
  server: { port: 4338 },
});
```

The four counters are ordinary components of their own frameworks. None of them knows anything about Astro.
`src/components/react/ReactCounter.tsx`:

```tsx
import { useState } from 'react';

export default function ReactCounter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <>
      <p>
        Count: <output>{count}</output>
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Add one
      </button>
    </>
  );
}
```

`src/components/solid/SolidCounter.tsx` has the same shape. Its first line tells TypeScript the file uses
Solid's JSX, not React's:

```tsx
/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';

export default function SolidCounter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);
  return (
    <>
      <p>
        Count: <output>{count()}</output>
      </p>
      <button type="button" onClick={() => setCount(count() + 1)}>
        Add one
      </button>
    </>
  );
}
```

`src/components/SvelteCounter.svelte`:

```svelte
<script lang="ts">
  let { start = 0 }: { start?: number } = $props();
  let count = $state(start);
</script>

<p>Count: <output>{count}</output></p>
<button type="button" onclick={() => (count += 1)}>Add one</button>
```

`src/components/VueCounter.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{ start?: number }>(), { start: 0 });
const count = ref(props.start);
</script>

<template>
  <p>Count: <output>{{ count }}</output></p>
  <button type="button" @click="count++">Add one</button>
</template>
```

An `.astro` file has a **frontmatter** script between `---` fences, which runs on the server (here, at build
time), and an HTML-like template below it. `src/components/BuildInfo.astro` reads `package.json` files with
Node's `fs` and uses top-level `await`. None of that can run in a browser, and none of it needs to:

```astro
---
// Runs at build time only (it reads files with Node's fs); none of it reaches the browser.
import { readFile } from 'node:fs/promises';

const names = ['astro', 'react', 'svelte', 'vue', 'solid-js'];
const versions = await Promise.all(
  names.map(async (name) => {
    const pkg = JSON.parse(await readFile(`node_modules/${name}/package.json`, 'utf8'));
    return { name, version: pkg.version as string };
  }),
);
const builtAt = new Date().toISOString();
---

<section class="card" aria-labelledby="build-info">
  <h2 id="build-info">Server-only: an Astro component</h2>
  <p>Built at <time datetime={builtAt}>{builtAt}</time> with:</p>
  <ul>
    {versions.map(({ name, version }) => <li><code>{name}</code> {version}</li>)}
  </ul>
</section>
```

The page, `src/pages/index.astro`, is where the islands are chosen. A **client directive** on a component
turns it into an island and sets when it hydrates:

```astro
---
import Base from '../layouts/Base.astro';
import BuildInfo from '../components/BuildInfo.astro';
import ReactCounter from '../components/react/ReactCounter.tsx';
import SolidCounter from '../components/solid/SolidCounter.tsx';
import SvelteCounter from '../components/SvelteCounter.svelte';
import VueCounter from '../components/VueCounter.vue';
---

<Base title="Islands">
  <p>This page is static HTML. Only the islands below load JavaScript.</p>

  <BuildInfo />

  <section class="card" aria-labelledby="react-static">
    <h2 id="react-static">Server-only: React, no directive</h2>
    <ReactCounter start={10} />
  </section>

  <section class="card" aria-labelledby="react-load">
    <h2 id="react-load">React, <code>client:load</code></h2>
    <ReactCounter client:load start={10} />
  </section>

  <section class="card" aria-labelledby="svelte-idle">
    <h2 id="svelte-idle">Svelte, <code>client:idle</code></h2>
    <SvelteCounter client:idle start={20} />
  </section>

  <section class="card" aria-labelledby="solid-only">
    <h2 id="solid-only">Solid, <code>client:only</code></h2>
    <SolidCounter client:only="solid-js" start={30} />
  </section>

  <p class="spacer">Scroll down: the Vue island loads when it comes into view.</p>

  <section class="card" aria-labelledby="vue-visible">
    <h2 id="vue-visible">Vue, <code>client:visible</code></h2>
    <VueCounter client:visible start={40} />
  </section>
</Base>
```

`client:only` needs the framework's name, because Astro won't render the component on the server to find
out. The layout, `src/layouts/Base.astro`, holds the `<html>` shell and a little CSS.

### Building it

Install the pinned versions with `npm ci`, then build:

```console
$ npm run build
…
10:05:08 [build] output: "static"
10:05:08 [build] mode: "static"
…
10:05:08 [build] Building static entrypoints...
10:05:08 [vite] ✓ built in 224ms
10:05:08 [vite] ✓ built in 231ms
10:05:08 [build] Rearranging server assets...

 generating static routes 
10:05:08   ├─ /exercises/media/index.html (+12ms) 
10:05:08   ├─ /exercises/shared/index.html (+8ms) 
10:05:08   ├─ /index.html (+8ms) 
10:05:08 ✓ Completed in 61ms.

10:05:08 [build] ✓ Completed in 568ms.
10:05:08 [build] 3 page(s) built in 643ms
10:05:08 [build] Complete!
```

The two extra pages are exercise solutions. `dist/` now holds plain HTML files and an `_astro/` folder of
JavaScript chunks. Look at the HTML Astro wrote for the islands (attributes trimmed to the interesting ones):

```html
<h2 id="react-static">Server-only: React, no directive</h2><p>Count: <output>10</output></p><button type="button">Add one</button>
…
<astro-island uid="1DhX8k" prefix="r3" component-url="/_astro/ReactCounter.ffpUD8A2.js" component-export="default" renderer-url="/_astro/client.CzWaolnw.js" props="{&quot;start&quot;:[0,10]}" ssr client="load" …>
…
<astro-island uid="Z2vfbRN" component-url="/_astro/SolidCounter.RnK_VrCc.js" component-export="default" renderer-url="/_astro/client.CgBmtZaM.js" props="{&quot;start&quot;:[0,30]}" ssr client="only" …></astro-island>
…
<astro-island uid="29AdhN" prefix="s0" component-url="/_astro/VueCounter.2shU-ysE.js" component-export="default" renderer-url="/_astro/client.Bah3zyZK.js" props="{&quot;start&quot;:[0,40]}" ssr client="visible" …><!--[--><p>Count: <output>40</output></p><button type="button">Add one</button><!--]--><!--astro:end--></astro-island>
```

The React counter without a directive is just HTML: React ran during the build and left a button with no
listener. Each island is an `<astro-island>` custom element. It records the URL of the component, the URL of
that framework's renderer, the serialized props and the directive. Inside it is the server-rendered HTML
(Vue's `<!--[-->` comments are its hydration markers). The Solid island is empty, because `client:only`
skipped the server. A small inline script defines `<astro-island>`. When the directive's condition is met,
the element imports the two URLs, hydrates the component into itself and removes its `ssr` attribute.

### How much JavaScript each island ships

Astro's build log doesn't list file sizes, so the example includes `sizes.mjs`. It reads `dist/index.html`,
follows each island's imports through `dist/_astro/` and adds up the bytes, raw and gzipped (1 kB = 1,024
bytes here):

```console
$ node sizes.mjs
island                         files        raw       gzip
ReactCounter (client:load)         5  216.5 kB   66.8 kB
SvelteCounter (client:idle)        4   29.6 kB   11.7 kB
SolidCounter (client:only)         3   19.3 kB    7.4 kB
VueCounter (client:visible)        3   71.8 kB   27.9 kB
inline <script> in the HTML        0    5.7 kB    2.1 kB
whole page (no duplicates)        15  342.9 kB  113.6 kB
```

The counters' own code is tiny: the component files in `dist/_astro/` are 338 to 599 bytes each. The rest is
each framework's client runtime, which every island of that framework shares. React DOM's client alone is
212,880 bytes (about 64 kB gzipped), Vue's runtime core 65,683, Svelte's client runtime 28,775 and Solid's
web runtime 13,386. These numbers line up with the size comparisons in [Chapter 19](19-comparing-frameworks.md).
They also show why mixing frameworks on one page is possible but rarely wise: you pay for every runtime you
use. The server-only React counter and `BuildInfo` added nothing to these totals.

### Watching it hydrate

Run `npm run preview` and open `http://localhost:4338/` with your browser's network panel open:

```console
$ npm run preview
…
 astro  v7.4.5 ready in 17 ms

┃ Local    http://localhost:4338/
┃ Network  use --host to expose
```

The React and Svelte chunks load at once. On an idle page, `client:idle` fires almost right away. The Solid
counter appears a moment after the rest of the page. The Vue chunks load only when you scroll down. Clicking
the first React button does nothing, ever.

This was checked in headless Chromium with Playwright 1.64.1, using tests kept outside the course
repository. With JavaScript disabled, every server-rendered count is in the HTML (10, 10, 20, 40), the Solid
island is empty and the build info lists five packages. With JavaScript on, each island loses its `ssr`
attribute and counts up when clicked, the directive-less React button stays at 10, and no `VueCounter` file is
requested until the island is scrolled into view. The browser requested 15 scripts, the same 15 files that
`sizes.mjs` counted.

## The meta-frameworks

The rest of the chapter tours nine meta-frameworks, current as of November 2026. Each section covers what
makes the framework distinct, its routing layout and its data-loading idiom. The code snippets in this
section are sketches of each idiom, not files in the course repository. `db` and `getPost` stand for your own
data access.

### Next.js 16

Next.js (by Vercel; 16.4 is current) is the most used React meta-framework and the reference implementation
of React Server Components. Its **App Router** treats every component as a Server Component unless it says
`'use client'`. Pages fetch data by being `async`. Version 16 made Turbopack the default bundler, made React
Compiler support stable and introduced Cache Components. Version 16.2 made the Adapter API stable, with a
test suite and a working group that includes the OpenNext project, so platforms other than Vercel get a
supported way to deploy Next.js. Version 16.3 added instant navigations with partial prefetching.

```text
app/
├── layout.tsx              root layout: <html>, <body>
├── page.tsx                /
├── loading.tsx             Suspense fallback for this segment
├── error.tsx               error boundary for this segment
├── (marketing)/about/page.tsx    /about  (a group: no URL segment)
├── posts/[slug]/page.tsx   /posts/:slug
└── api/posts/route.ts      GET/POST handlers at /api/posts
proxy.ts                    runs before matching routes (formerly middleware.ts)
```

With Cache Components, a page is a Server Component that awaits its data, and caching is opt-in per function
or component:

```tsx
// app/posts/[slug]/page.tsx (sketch)
import { cacheLife, cacheTag } from 'next/cache';

async function getPost(slug: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`post-${slug}`);
  return db.post.find(slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <h1>{post.title}</h1>;
}
```

A server function with `'use server'` updates the post and calls ``updateTag(`post-${slug}`)``. Code that
reads the request, such as `cookies()`, must sit inside a `<Suspense>` boundary, and it streams in after the
static shell. Next.js's strengths are its reach, its deep integration with React's newest features and
Vercel's investment. Its costs are a large surface area, two caching models in the docs (the older implicit
one is documented separately) and features that work best on Vercel's platform, a gap the stable Adapter API
is meant to narrow.

### React Router 8 (framework mode)

React Router is one of the oldest React routers, and since version 7 it is also the successor of Remix: Remix v2
became React Router's **framework mode**. You can use React Router in three modes. *Declarative* is the
classic `<Routes>` you saw in [Chapter 16](16-state-routing-and-data.md). *Data* adds loaders and actions to
a client router. *Framework* adds a Vite plugin, SSR, type generation and code splitting. Version 8 shipped in
June 2026 and is deliberately unexciting. It requires React 19.2.7+, Node 22.22+ and Vite 7+, and ships as
ESM only. It turns middleware and split route modules on by default and removes the `react-router-dom`
package. Its RSC support is still marked unstable.

> When working with React, we think you should be in charge. We don't force you into using Server Components, SSR, SSG, or any other acronym.
>
> — Brooks Lybrand, "React Router v8" (2026)

Routes are configured in code in `app/routes.ts`. File-based routing is an option through
`@react-router/fs-routes`:

```text
app/
├── root.tsx                the document and root layout
├── routes.ts               the route config
└── routes/
    ├── home.tsx            index('routes/home.tsx')
    └── post.tsx            route('posts/:slug', 'routes/post.tsx')
react-router.config.ts      ssr: true | false (SPA mode), prerender: [...]
```

Each route module exports a `loader` (runs on the server), an `action` (handles form posts) and a component.
The `+types` import is generated per route, so `loaderData` is typed end to end:

```tsx
// app/routes/post.tsx (sketch)
import type { Route } from './+types/post';

export async function loader({ params }: Route.LoaderArgs) {
  return { post: await db.post.find(params.slug) };
}

export default function Post({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.post.title}</h1>;
}
```

`clientLoader` and `clientAction` do the same in the browser, which is how SPA mode and gradual migrations
from a client-only app work. The model is plain request and response, and forms work before JavaScript loads.

**Remix 3 is a different framework.** In 2025 the Remix team announced that the Remix name would move to a
new framework that is not built on React ("Wake up, Remix!").

> This isn't just a new version, it's a new direction. One that's faster, simpler, and closer to the web itself.
>
> — Michael Jackson and Ryan Florence, "Wake up, Remix!" (2025)

The release candidate, announced in August 2026, describes a full-stack framework built on web primitives
and shipped as a single `remix` package, with its own UI runtime, server, asset handling and database tooling.
Version 3.0.0 was published to npm on October 1, 2026. If you have a Remix v2 app, its path forward is React
Router framework mode, not Remix 3.

### TanStack Start

TanStack Start (1.0 announced as stable in October 2026) is a full-stack framework on top of **TanStack
Router**, the type-safe router from [Chapter 16](16-state-routing-and-data.md), built with Vite. It is
client-first: the router and its typed search params are the center, and the server adds full-document SSR,
streaming, server routes, middleware and **server functions** created with `createServerFn`. Rendering can be
chosen per route ("selective SSR"), and there are SPA and prerender modes. Server Components support is
experimental. There are React and Solid versions.

```text
src/
├── router.tsx
├── routeTree.gen.ts        generated from the files below; gives typed links
└── routes/
    ├── __root.tsx          the document shell
    ├── index.tsx           /
    └── posts.$postId.tsx   /posts/:postId
```

```tsx
// src/routes/posts.$postId.tsx (sketch)
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

const getPost = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(({ data }) => db.post.find(data));

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params }) => getPost({ data: params.postId }),
  component: Post,
});

function Post() {
  const post = Route.useLoaderData();
  return <h1>{post.title}</h1>;
}
```

Loaders here are *isomorphic*. They run on the server for the first request and in the browser on later
navigations. A server function is how a loader reaches server-only code from either side. The strengths are
end-to-end type safety and an explicit model. The costs are a young ecosystem and an API with many options.

### Nuxt 4

Nuxt is Vue's meta-framework and has been around since 2016, so its conventions are mature. It
auto-imports components and composables, has a large module ecosystem, and runs its server on **Nitro**, a
server toolkit that builds for more than a dozen deployment presets. Nuxt 4 (July 2025) moved app code into
`app/` and added a `shared/` folder. Version 4.5 (July 2026) moved to Vite 8 and added experimental SSR
streaming. Version 4.6 (October 2026) added `nuxt/server`, which opens the server layer to runtimes other than
Nitro, and support for Vue's Vapor mode. Nuxt 3 reached end of life on July 31, 2026. Nuxt 5, with Nitro v3,
is next, and you can opt into its behavior today with `future.compatibilityVersion: 5`. Vercel acquired
NuxtLabs, the company behind Nuxt, in July 2025. Nuxt stays MIT-licensed and community-governed.

```text
app/
├── app.vue
├── layouts/default.vue
└── pages/
    ├── index.vue           /
    └── posts/[slug].vue    /posts/:slug
server/
└── api/posts/[slug].ts     GET /api/posts/:slug (Nitro)
nuxt.config.ts              routeRules, modules
```

`useFetch` runs during SSR, puts the result in the page's payload and reuses it during hydration, so the data
isn't fetched twice:

```vue
<!-- app/pages/posts/[slug].vue (sketch) -->
<script setup lang="ts">
const route = useRoute();
const { data: post } = await useFetch(`/api/posts/${route.params.slug}`);
</script>

<template>
  <h1>{{ post?.title }}</h1>
</template>
```

One of Nuxt's distinctive features is **hybrid rendering**: a different strategy per route pattern, in one
config:

```ts
// nuxt.config.ts (sketch)
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { isr: 3600 },
    '/products/**': { swr: 600 },
    '/admin/**': { ssr: false },
  },
});
```

The costs: auto-imports and the many conventions hide where things come from, and a major upgrade can wait
on community modules catching up.

### SvelteKit 3

SvelteKit is the official application framework for Svelte, built by the Svelte team (Svelte's creator, Rich
Harris, works at Vercel). SvelteKit 3 shipped in October 2026. Its main changes are housekeeping.
Configuration moves into `vite.config.ts`. The `$lib` alias becomes `#lib`, a standard Node.js
subpath import. It requires Node 22+ and TypeScript 6+, and environment variables and service workers got
better support. **Remote functions**, typed server functions declared as `query`, `form`, `command` and
`prerender`, are still experimental. The SvelteKit 3 post answers its own question "Are remote functions
ready yet?" with "Not quite."

```text
src/routes/
├── +layout.svelte          shared layout
├── +page.svelte            /
└── posts/[slug]/
    ├── +page.svelte        the page component
    ├── +page.server.ts     load() and form actions, server only
    └── +server.ts          GET/POST endpoint at the same URL (optional)
```

Every route is a folder, and the `+` prefix marks files the router reads. A `load` function in
`+page.server.ts` runs only on the server, and one in `+page.ts` runs on both sides. The page receives the
result as its `data` prop:

```ts
// src/routes/posts/[slug]/+page.server.ts (sketch)
import { error } from '@sveltejs/kit';
import { db } from '#lib/server/database.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const post = await db.getPost(params.slug);
  if (!post) error(404, 'Not found');
  return { post };
};
```

```svelte
<!-- src/routes/posts/[slug]/+page.svelte (sketch) -->
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<h1>{data.post.title}</h1>
```

Each route can also export `prerender`, `ssr` and `csr` flags. Setting `csr = false` gives a page with no
JavaScript at all. Form actions work without JavaScript and are enhanced with `use:enhance`. The adapter you
install (`auto`, `node`, `static`, `vercel`, `cloudflare`, `netlify`) decides the deploy target.
[Chapter 6](06-svelte.md) covers the Svelte side. The costs: the folder-per-route layout with many files
named `+page` takes getting used to, and the newest data API is not yet stable.

### Astro 7

Astro is content-first. Pages are `.astro` files rendered on the server or at build time with zero JavaScript
by default, and interactivity comes as islands from any supported UI framework. Official integrations
exist for React, Preact, Svelte, Vue, Solid and Alpine. Astro 7 (June 2026) moved the `.astro` compiler and
Markdown processing to Rust, moved to Vite 8 with Rolldown, made route caching stable and reported builds
15–61% faster. In January 2026 Cloudflare acquired The Astro Technology Company. Astro remains MIT-licensed
and deploys to any platform through adapters.

```text
src/
├── content.config.ts       content collections: schemas and loaders
├── layouts/Base.astro
└── pages/
    ├── index.astro         /
    ├── blog/[slug].astro   /blog/:slug
    └── rss.xml.ts          an endpoint that returns a Response
```

Data loading is just `await` in the frontmatter. For content, **content collections** validate Markdown,
JSON or remote data against a schema and give you typed entries:

```ts
// src/content.config.ts (sketch)
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/blog' }),
  schema: z.object({ title: z.string(), date: z.coerce.date() }),
});

export const collections = { blog };
```

A page then calls `await getCollection('blog')`. **Live collections** (`src/live.config.ts`) fetch at request
time instead of build time. **Server islands** turn the islands idea around: `<Avatar server:defer />` renders
that one component on the server *after* the cached static page is sent, with a fallback in the meantime. The
page stays cacheable while one corner of it stays personal. Astro's costs come from its focus. An app that is
interactive everywhere fights the islands model, and islands can't share framework context (Exercise 3 shows
the workaround).

### SolidStart 2

SolidStart is Solid's meta-framework ([Chapter 8](08-solid.md)). Version 2.0 (August 2026) is a rebuild on
Vite 8's Environment API. It dropped the Vinxi layer that v1 used and deploys through Nitro v3 or through
Cloudflare's and Netlify's Vite plugins. It requires Node 24+, and it still targets Solid 1.9, not the Solid
2.0 release candidate. It is router-agnostic: you can use Solid Router or TanStack's Solid router. SolidStart
keeps a small core and composes standard pieces: a Vite plugin, a router, server functions.

That makes SolidStart 2 the last of its line. The Solid 2.0 RC announcement (August 12, 2026) moves each of
its pieces home: server functions into Solid's core, file-system routing into a router-neutral package, and
the serving layer into the **start mode** of the new `@solidjs/vite-plugin`. Its verdict is "Start mode
replaces SolidStart." For a Solid 1.9 app today, SolidStart 2 is the tool; for Solid 2.0, plan on start mode
([Chapter 8](08-solid.md#solid-20) has the details).

```text
src/
├── app.tsx                 the root: router + <FileRoutes />
└── routes/
    ├── index.tsx           /
    ├── posts/[id].tsx      /posts/:id
    └── api/hello.ts        export function GET() { … }
vite.config.ts              plugins: solidStart(), nitro()
```

Data comes from **queries**, cached functions that may contain `"use server"`, read with `createAsync`, which
plugs into Suspense and streams. A route's `preload` starts the query before the component renders:

```tsx
// src/routes/posts/[id].tsx (sketch)
import { query, createAsync, type RouteDefinition } from '@solidjs/router';

const getPost = query(async (id: string) => {
  'use server';
  return db.post.find(id);
}, 'post');

export const route = {
  preload: ({ params }) => getPost(params.id),
} satisfies RouteDefinition;

export default function PostPage(props: { params: { id: string } }) {
  const post = createAsync(() => getPost(props.params.id));
  return <h1>{post()?.title}</h1>;
}
```

Mutations use `action()` with forms, and they revalidate the queries they touch. Solid's fine-grained
reactivity makes hydration cheaper than a virtual DOM's, but it is still hydration. The costs are a smaller
ecosystem and a v2 that is new.

### Analog (Angular)

Angular has built-in SSR and prerendering through `@angular/ssr`, with render modes per route and the
incremental hydration covered above. **Analog** adds what Angular itself doesn't have: file-based routing,
server-side `load` functions, API routes and Markdown content, using Vite and Nitro. Brandon Roberts
created it and leads it as a community project. Version 2.0 (November 2025) removed the experimental Analog
single-file components. 2.9 is current and 3.0 is in beta.

```text
src/app/pages/
├── (home).page.ts          /       (the parentheses keep the name out of the URL)
├── posts/[slug].page.ts    /posts/:slug
└── posts/[slug].server.ts  load() for that page, server only
src/server/routes/
└── api/posts.ts            GET /api/posts (Nitro)
```

A page's `.server.ts` file exports `load`, and the page injects its result:

```ts
// src/app/pages/posts/[slug].server.ts (sketch)
import type { PageServerLoad } from '@analogjs/router';

export const load = async ({ params }: PageServerLoad) => {
  return { post: await db.post.find(params['slug']) };
};
```

```ts
// src/app/pages/posts/[slug].page.ts (sketch)
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad } from '@analogjs/router';
import { load } from './[slug].server';

@Component({
  template: `<h1>{{ data().post.title }}</h1>`,
})
export default class PostPage {
  data = toSignal(injectLoad<typeof load>(), { requireSync: true });
}
```

Analog lets Angular teams work the way Nuxt and SvelteKit users do while keeping Angular's components, DI and
signals ([Chapter 7](07-angular.md)). Its costs: it's a smaller community project than the others here, and it
sits on top of the Angular CLI's own build and SSR story rather than replacing it.

### Qwik City

Qwik City is Qwik's meta-framework, and it exists to make resumability work for a whole site. Routing, data
loading and actions are serialized into the HTML like everything else, so a page with server data still
starts with almost no JavaScript. The stable line is Qwik 1.x with `@builder.io/qwik-city` (1.20 is current).
Qwik 2.0 reached release candidate in October 2026. It renames the packages to `@qwik.dev/core` and
`@qwik.dev/router` (so Qwik City becomes **Qwik Router**) and changes how state is embedded so that
out-of-order streaming works. Qwik was created at Builder.io. [Chapter 11](11-qwik.md) covers it.

```text
src/routes/
├── layout.tsx              shared layout (a Slot for the page)
├── index.tsx               /
└── posts/[slug]/
    └── index.tsx           /posts/:slug
```

```tsx
// src/routes/posts/[slug]/index.tsx (sketch)
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const usePost = routeLoader$(({ params }) => db.post.find(params.slug));

export default component$(() => {
  const post = usePost();
  return <h1>{post.value.title}</h1>;
});
```

`routeLoader$` runs on the server before rendering. `routeAction$` handles form posts (with or without
JavaScript), and `server$` makes any function callable from the client. The costs are those of Qwik itself: a
new mental model, serialization rules, a small ecosystem and a major version in transition.

## Comparing the meta-frameworks

| | Base | Rendering modes | Routing | Data loading | Deploy targets | Backing |
|---|---|---|---|---|---|---|
| **Next.js 16.4** | React (RSC) | SSR, SSG, streaming, static shell + `'use cache'`; ISR in the older model | `app/` folders: `page.tsx`, `layout.tsx` | async Server Components, `'use cache'`, server functions | Vercel, Node server, static export; other platforms through the Adapter API (OpenNext) | Vercel |
| **React Router 8** | React | SSR, SPA mode, prerender, streaming; RSC unstable | `app/routes.ts` config; file routes optional | `loader` / `action` (and client versions) per route | Node and others through adapters and Vite plugins | Remix team at Shopify; open governance |
| **TanStack Start 1** | React or Solid | SSR, streaming, selective SSR, SPA, prerender; RSC experimental | `src/routes/` files, generated typed route tree | isomorphic route `loader` + `createServerFn` | Nitro, Cloudflare, Netlify, Vercel, Node, Bun | TanStack, with sponsors and hosting partners |
| **Nuxt 4.6** | Vue | SSR, CSR, SSG, per-route `routeRules` (ISR/SWR), server components | `app/pages/` files | `useFetch`, `useAsyncData`, `server/api` | Nitro presets (Node, static, Vercel, Netlify, Cloudflare, Deno, Bun …) | Community core team; NuxtLabs (Vercel) |
| **SvelteKit 3.1** | Svelte 5 | SSR, CSR, prerender per route, streamed promises | `src/routes/` folders: `+page`, `+layout`, `+server` | `load` in `+page(.server).ts`, form actions; remote functions experimental | adapters: auto, node, static, vercel, cloudflare, netlify | Svelte team; creator Rich Harris at Vercel |
| **Astro 7.4** | Any (React, Vue, Svelte, Solid, Preact, Alpine) | SSG by default, on-demand SSR, islands, server islands, route caching | `src/pages/` files | `await` in frontmatter, content and live collections | static hosts; adapters: Node, Cloudflare, Vercel, Netlify | Cloudflare (since 2026) |
| **SolidStart 2.2** | Solid 1.9 | SSR with streaming, CSR, prerender | `src/routes/` files | `query` + `createAsync`, `"use server"`, `action` | Nitro v3 presets, Cloudflare and Netlify Vite plugins | Solid core team |
| **Analog 2.9** | Angular | SSR, SSG, hybrid | `src/app/pages/*.page.ts` files | `.server.ts` `load` + `injectLoad`, API routes | Nitro presets | Community, led by Brandon Roberts |
| **Qwik City 1.20** | Qwik | SSR with resumability, SSG | `src/routes/` folders: `index.tsx`, `layout.tsx` | `routeLoader$`, `routeAction$`, `server$` | adapters: Node, Cloudflare, Netlify, Vercel, static … | Qwik core team (created at Builder.io) |

Three things stand out. First, the routing conventions differ more than the ideas do: every framework
nests layouts by folder and turns `[param]` or `$param` into a URL parameter. Second, data loading has
settled into two families. *Route loaders* (React Router, TanStack Start, SvelteKit, Analog, Qwik City) fetch
per route before rendering. *Component-level async* (Next.js Server Components, Nuxt's `useFetch`,
SolidStart's `createAsync`, Astro frontmatter) lets any component await its own data. Third, the deploy layer
has converged. Vite underlies all of them except Next.js (which uses Turbopack), Nitro serves several, and adapters make most of
them portable. [Chapter 19](19-comparing-frameworks.md) compares the underlying UI frameworks, and
[Chapter 20](20-choosing-a-framework.md) turns this into scenario-by-scenario advice.

## Summary

- A meta-framework adds routing, server rendering, route-level data loading, mutations, a server and a
  deploy story on top of a UI framework.
- CSR renders in the browser after the JavaScript loads. SSR renders per request on the server. SSG renders
  once at build time. ISR caches rendered pages and refreshes them in the background or on demand.
- Streaming SSR sends a shell first and fills in slow parts through the same response.
- Hydration re-runs components in the browser to attach behavior to server HTML. It costs downloaded code,
  data sent twice, an uncanny valley and possible mismatches.
- Progressive hydration spreads that work out. Islands and React Server Components skip it for parts that
  never need it. Resumability (Qwik) avoids replaying it at all.
- Edge runtimes put code close to users, and Node keeps it close to data. Adapters let one codebase target
  either.
- In the Astro example, each island shipped its framework's runtime: 66.8 kB gzipped for React, 27.9 kB for
  Vue, 11.7 kB for Svelte and 7.4 kB for Solid. The server-only components shipped nothing.
- Next.js 16 makes caching explicit with Cache Components. React Router 8 is Remix's continuation (Remix 3 is
  a new, non-React framework). TanStack Start is a type-safe, router-first option. Nuxt 4 offers hybrid
  rendering on Nitro. SvelteKit 3 has file-folder routes and `load`. Astro 7 has islands and content
  collections. SolidStart 2 rebuilt on Vite's Environment API. Analog brings file routes to Angular. Qwik
  City makes resumability work across a site.

## Exercises

1. **Pick a strategy.** For each page, choose CSR, SSR, SSG, ISR or streaming SSR, and say why: (a) a
   documentation site; (b) a product page whose price changes a few times a day; (c) a logged-in analytics
   dashboard; (d) a news home page with a slow "recommended for you" panel.

   <details><summary>Solution</summary>

   (a) **SSG.** The content changes only when the docs change, so render on each deploy and serve from a CDN.
   (b) **ISR** with a revalidate time of minutes, plus on-demand revalidation when the price is edited. Most
   requests get a cached page, and the price is never stale for long. (c) **CSR or SSR without caching.**
   Every view is personal and behind a login, so crawlers don't matter. SSR gets the first numbers on screen
   sooner, and an SPA is simpler to host. Both are defensible. (d) **Streaming SSR**, or a cached static
   shell with the personal panel streamed in (Next.js Cache Components) or deferred (Astro's
   `server:defer`). The headlines arrive at once and the slow panel doesn't hold them back. In Nuxt, (a) to
   (c) map directly to `routeRules`: `prerender: true`, `isr: 600` and `ssr: false`.

   </details>

2. **Hydrate on small screens only.** Astro's `client:media` hydrates an island only when a CSS media query
   matches. Make a page with the Svelte counter that becomes interactive only on screens 600px wide or
   narrower. What happens on a wide screen, and what happens if the window is then made narrow?

   <details><summary>Solution</summary>

   `examples/ch18/astro-islands/src/pages/exercises/media.astro`:

   ```astro
   ---
   import Base from '../../layouts/Base.astro';
   import SvelteCounter from '../../components/SvelteCounter.svelte';
   ---

   <Base title="client:media">
     <section class="card" aria-labelledby="svelte-media">
       <h2 id="svelte-media">Svelte, <code>client:media</code></h2>
       <SvelteCounter client:media="(max-width: 600px)" start={50} />
     </section>
   </Base>
   ```

   Build and open `http://localhost:4338/exercises/media/`. At 1280px wide, the counter shows 50 and the
   button does nothing: the island keeps its `ssr` attribute, and Svelte is never downloaded. At 400px wide it
   hydrates at once and counts up to 51. Astro listens for changes to the media query, so a page loaded wide
   hydrates when the window is narrowed to 500px. Playwright tests confirmed all three cases. Use this for
   components that only matter on one layout, such as a mobile menu toggle.

   </details>

3. **Share state between islands.** Islands are separate apps, so a React island and a Svelte island can't
   share React context. Make two islands, one React and one Svelte, that display and increment the same
   count.

   <details><summary>Solution</summary>

   Put the state in a plain module that both frameworks can subscribe to.
   `src/lib/count.ts`:

   ```ts
   // A tiny store. Every island that imports this module shares the same instance,
   // because the bundler puts it in one chunk and the browser evaluates it once.
   type Listener = (value: number) => void;

   let value = 0;
   const listeners = new Set<Listener>();

   export const count = {
     get: () => value,
     set(next: number) {
       value = next;
       listeners.forEach((listener) => listener(value));
     },
     subscribe(listener: Listener) {
       listeners.add(listener);
       return () => {
         listeners.delete(listener);
       };
     },
   };
   ```

   React reads an external store with `useSyncExternalStore`
   (`src/components/react/SharedReact.tsx`):

   ```tsx
   import { useSyncExternalStore } from 'react';
   import { count } from '../../lib/count';

   export default function SharedReact() {
     const value = useSyncExternalStore(count.subscribe, count.get, count.get);
     return (
       <button type="button" onClick={() => count.set(value + 1)}>
         React: {value}
       </button>
     );
   }
   ```

   Svelte copies it into `$state` and subscribes in an `$effect`, which also unsubscribes on teardown
   (`src/components/SharedSvelte.svelte`):

   ```svelte
   <script lang="ts">
     import { count } from '../lib/count';

     let value = $state(count.get());
     $effect(() => count.subscribe((next) => (value = next)));
   </script>

   <button type="button" onclick={() => count.set(value + 1)}>Svelte: {value}</button>
   ```

   `src/pages/exercises/shared.astro` puts both on a page with `client:load`:

   ```astro
   ---
   import Base from '../../layouts/Base.astro';
   import SharedReact from '../../components/react/SharedReact.tsx';
   import SharedSvelte from '../../components/SharedSvelte.svelte';
   ---

   <Base title="Shared state">
     <p>Two islands, two frameworks, one count.</p>
     <SharedReact client:load />
     <SharedSvelte client:load />
   </Base>
   ```

   The build put the store in its own 126-byte chunk, `count.CS3A-0bF.js`, which both islands import, so the
   browser evaluates it once. In Playwright, clicking "React: 0" changed the Svelte button to "Svelte: 1", and
   clicking that changed React's to "React: 2". Nano Stores, which Astro's docs recommend, is a library
   built on the same idea. [Chapter 16](16-state-routing-and-data.md) covers stores in general.

   </details>

4. **Why escape `<`?** In `ssr-vs-csr/server.mjs`, `serialize` replaces every `<` in the JSON with
   `\u003c`. What would go wrong without it, and why is the result still valid JSON?

   <details><summary>Solution</summary>

   `JSON.stringify` doesn't escape `<`. If a task title were `</script><script>alert(1)</script>`, the HTML
   parser would end the `<script type="application/json">` block at the first `</script>`, whatever the
   JSON around it says, and run the rest as a real script. That's a cross-site scripting hole in any page
   that embeds user data for hydration. `\u003c` is a JSON string escape for the same character, so
   `JSON.parse` in `hydrate.mjs` turns it back into `<`, but the HTML parser never sees a `<`. Frameworks
   that embed hydration data do this (or something stronger) for you. It's one more reason to let them
   serialize state rather than writing it into the page yourself.

   </details>

5. **Count the bytes twice.** The `/ssr` page sends every task title twice. Explain how islands, React
   Server Components and resumability each change what is sent twice.

   <details><summary>Solution</summary>

   With **full hydration**, all the data that went into the HTML is sent again as state, together with
   the code for every component. With **islands**, only the props of each island are serialized (the
   `props` attribute on `<astro-island>`). Text and data used only by static parts are sent once, as HTML.
   With **React Server Components**, Server Components' output is in the HTML and again in the RSC payload
   (as a description of the rendered tree, not as raw data), but their code and the data they read are never
   sent. Only Client Components' props are serialized. With **resumability**, the state the page needs is
   serialized once, and nothing is re-rendered to rebuild what the HTML already shows. Code downloads happen
   only when an interaction needs them. Each one trades less repetition for more rules about what can cross
   the server–client boundary.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-18--meta-frameworks-and-rendering)
