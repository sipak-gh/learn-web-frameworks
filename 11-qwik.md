# Chapter 11 — Qwik

Every framework so far ships your components to the browser and runs them there at least once. Even when a
server renders the HTML first, the browser downloads the components and runs them again to attach event
listeners and rebuild the state. That step is called *hydration*. **Qwik** is built to skip it. A compiler
splits your app into many small chunks at the places you mark with a `$`. The server writes the state and
the location of every event handler into the HTML. The browser then loads code only when the user does
something that needs it. Qwik calls this *resumability*.

This chapter builds Tasklet in Qwik 1.20, the stable line, and looks at what the compiler produces and what
the server writes into the page. It also covers the rules that resumability imposes on your code. Tasklet is
a bad fit in one important way: its data lives in `localStorage`, which only the browser can read, while
Qwik is designed around the server. The chapter shows how the app handles that and measures what it costs.
Qwik 2.0, a rewrite released as a candidate in October 2026 under new package names, comes at the end. The
next chapter goes back to the platform: Lit and Web Components.

## At a glance

| | Qwik |
| --- | --- |
| First released | June 2021 on npm (`@builder.io/qwik` 0.0.x); 1.0 on May 2, 2023, together with Qwik City 1.0 |
| Current version | 1.20.3 (October 25, 2026). Qwik 2.0 is at release candidate 2.0.0-rc.4 (October 25, 2026) as `@qwik.dev/core` |
| Created by / maintained by | Miško Hevery (the creator of AngularJS) and a team at Builder.io; since 2024 the QwikDev organization on GitHub, run by community maintainers, with Builder.io as a sponsor |
| License | MIT |
| Rendering model | Server-first. The server (or the build) renders HTML and serializes state into it; the browser *resumes* without re-running components, then updates the DOM through signals |
| Reactivity model | Signals and stores: `useSignal`, `useStore`, `useComputed$`, and tasks that track them |
| Templates | JSX, with `$`-suffixed props for anything that may load lazily (`onClick$`) |
| Language | TypeScript (the starters are TypeScript-only) |
| Tasklet build size | 45.70 kB gzip in 35 files (101.59 kB raw), measured with `tasklet/tools/size.mjs`; the page fetches 12 of the files, 28.74 kB, before you interact with it |
| Meta-framework | Qwik City (routing, loaders, actions, adapters); renamed Qwik Router in 2.0 |
| Good fit for | Content-heavy sites and storefronts where most of the page is static, start-up time matters, and the data lives on the server |

## Why it exists

By 2020 the usual way to build a fast site with a component framework was server-side rendering followed by
hydration. The server sends HTML, so the content appears quickly. But the page doesn't respond until the
browser has downloaded the JavaScript for every component on it, run those components again and attached
their listeners. On a large page and a slow phone that can take seconds, and the work grows with the size of
the page, not with what the user does. Lazy loading helps, but only for code you can predict you won't
need. Islands, as in Astro, help by hydrating only the interactive parts, at the cost of splitting the page
into separate apps (see [Chapter 18](18-meta-frameworks-and-rendering.md)).

Miško Hevery, who had created AngularJS at Google, joined Builder.io, a company that makes a visual
editor for web content, in 2021 and started Qwik there. Builder.io cares about storefront pages
that must load fast and score well on Core Web Vitals. Qwik asks a different question: what if the browser
never had to replay the server's work? If the server writes down everything it knows (the state, which
component rendered which part of the DOM, which function handles which event), the browser can pick up
where the server stopped.

> Resumability is about pausing execution on the server and resuming execution on the client without having
> to replay and download all of the application logic.
>
> — Qwik documentation, "Resumable" (2023)

The 1.0 release came in May 2023 with Qwik City, the meta-framework. In March 2024 the project moved from
Builder.io's GitHub account to its own QwikDev organization, with an open collective, community maintainers
leading it and Builder.io continuing as a sponsor. The same year the team announced Qwik 2.0, which has
been in alpha, beta and now release candidate since.

## The mental model

### Hydration versus resumability

```text
Hydration (React, Vue, Svelte, Solid, Preact …)

server    render components ─► HTML
browser   paint ▲ content    download the code of every component on the page
                             run every component again, attach listeners  ▲ interactive
user      click ─► the handler is already in memory ─► run it

Resumability (Qwik)

server    render components ─► HTML + serialized state + "this element's click runs chunk X"
browser   paint ▲ content    small loader: one document listener per event type  ▲ interactive
user      click ─► loader reads on:click on the element ─► import chunk X
                ─► read the captured state from the page ─► run it ─► update the DOM through signals
```

In the hydration model the work that makes the page interactive grows with the size of the page. In the
resumable model it is the same tiny loader for every page, and the cost moves to the moment of the first
interaction: if chunk X isn't in the browser yet, the click waits for the network. Qwik's answer to that
delay is to *preload*: since 1.14 (May 2025), a small preloader script adds `<link rel="modulepreload">` tags
for the chunks the page is likely to need, in the background, while the browser is idle. You'll see what
that means for Tasklet's byte count below.

### `$` marks where the code can be split

Everything with a `$` in its name takes a function the compiler may move into its own file: `component$`,
`onClick$`, `useTask$`, `useComputed$`, and `$()` itself. Qwik's compiler, called the *optimizer* (written
in Rust, running as a Vite plugin), finds each `$` call and extracts its function into a separate module
called a *segment* (older docs say *symbol*). In the original code it leaves a **QRL** (Qwik URL): a
serializable reference that says "the export named `s_abc` of this chunk", along with the variables the
function captured.

Here is a counter, from the chapter's examples:

`examples/ch11/counter.tsx`

```tsx
import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const count = useSignal(0);
  const step = 2;

  return (
    <button type="button" onClick$={() => (count.value += step)}>
      Count: {count.value}
    </button>
  );
});
```

`examples/ch11/optimize.mjs` runs the optimizer on a single file, without a project, and prints what it
produces:

```console
$ cd examples/ch11
$ node optimize.mjs counter.tsx --code

// counter.tsx_Counter_component_button_onClick_w50qpfHkfAQ.js
//   segment counter.tsx_Counter_component_button_onClick (eventHandler onClick$), captures: true
import { useLexicalScope } from "@builder.io/qwik";
export const s_w50qpfHkfAQ = ()=>{
    const [count] = useLexicalScope();
    return count.value += 2;
};

// counter.js
import { componentQrl } from "@builder.io/qwik";
import { qrl } from "@builder.io/qwik";
export const Counter = /*#__PURE__*/ componentQrl(/*#__PURE__*/ qrl(()=>import("./counter.tsx_Counter_component_u287G10q3ug.js"), "s_u287G10q3ug"));

// counter.tsx_Counter_component_u287G10q3ug.js
//   segment counter.tsx_Counter_component (function component$), captures: false
import { _fnSignal } from "@builder.io/qwik";
import { _jsxQ } from "@builder.io/qwik";
import { qrl } from "@builder.io/qwik";
import { useSignal } from "@builder.io/qwik";
export const s_u287G10q3ug = ()=>{
    const count = useSignal(0);
    return /*#__PURE__*/ _jsxQ("button", null, {
        type: "button",
        onClick$: /*#__PURE__*/ qrl(()=>import("./counter.tsx_Counter_component_button_onClick_w50qpfHkfAQ.js"), "s_w50qpfHkfAQ", [
            count
        ])
    }, [
        "Count: ",
        _fnSignal((p0)=>p0.value, [
            count
        ], "p0.value")
    ], 3, "eo_0");
};
```

One small component became three modules. `counter.js` is all that's left of the original file: `Counter`
is a `componentQrl` around a `qrl()` that imports the component's body from another file. The body is the
second segment, and in it the JSX has become `_jsxQ` calls. The `onClick$` prop is no longer a function
but another `qrl()`, pointing to the third segment, with `[count]` as its captured variables. The handler
reads them back with `useLexicalScope()`. Note what happened to `step`: it was a constant, so the optimizer
inlined it as `+= 2` and there is nothing to capture. And `{count.value}` in the text became `_fnSignal`,
a binding that lets Qwik update that one text node when the signal changes without running the component
again.

The rule that falls out of this: **code inside a `$` function can't assume it runs in the same module, or the
same machine, as the code around it**. It can use what it captures, if Qwik can serialize it, and anything
it imports at the top level of a module.

### What the server sends

`examples/ch11/render.mjs` server-renders a component with Qwik's `renderToString` (in development mode,
which explains the `ssr-dev` and `data-qwik-inspector` attributes):

```console
$ node render.mjs counter.tsx Counter
<!--cq-->
<div q:container="paused" q:version="1.20.3-dev+2fec922" q:render="ssr-dev" q:base="/build/" q:manifest-hash="devxqcdn2jgdim" q:instance="pnj08378gy" class="qc📦">
<!--qv q:id=0 q:key=lPN0:-->
<button type="button" on:click="/build/Counter_component_button_onClick_VD90mczxR2o.js#Counter_component_button_onClick_VD90mczxR2o[0]" q:key="z4_0" q:id="1" data-qwik-inspector="./counter.tsx:8:5">Count: <!--t=2-->0<!---->
</button>
<!--/qv-->
<script type="qwik/json">{
  "refs": {
    "1": "0"
  },
  "ctx": {},
  "objs": [
    "\u00121",
    0,
    "\u00110 @0",
    "#2"
  ],
  "subs": [
    [
      "3 #2 2 #2"
    ]
  ]
}</script>
<script q:func="qwik/json">document["qFuncs_pnj08378gy"]=[(p0,)=>(p0.value)]</script>
<script>(window.qwikevents||(window.qwikevents=[])).push("click")</script>
</div>
<!--/cq-->
…
```

Read it from the top:

- `q:container="paused"` marks the root of a Qwik app whose state is in the page, waiting to resume.
- The button has no listener. It has an attribute: `on:click="…onClick_VD90mczxR2o.js#…[0]"`, a QRL. The
  `[0]` lists what the handler captured, as indexes into the element's entry in `refs` (`"1": "0"`, for the
  element with `q:id="1"`), which points to object 0 in `objs`: the `count` signal.
- `<!--t=2-->0<!---->` marks the text node that `_fnSignal` binds, so the browser can find it later without
  re-rendering.
- `<script type="qwik/json">` holds the state: `objs` is the list of serialized objects (the signal, its value
  `0`, …), `refs` ties elements to objects and `subs` records which DOM nodes subscribe to which signal.
- The last script pushes `"click"` onto `qwikevents`, which tells the loader to listen for clicks on the
  document.

When you click, the loader (*qwikloader*, about 1.7 kB gzipped in Tasklet's build) walks up from the
target to an element with `on:click`, imports the chunk, rebuilds `count` from the JSON and calls the
handler. The handler sets `count.value`; the signal knows the text node subscribed to it; Qwik updates that
node. `Counter`'s function never runs in the browser. That is the payoff: on a page with a hundred
components and one button, the browser runs one handler.

### Serialization is the price

Everything that crosses from server to browser must survive `JSON`-like serialization: what a handler
captures, what a store holds, the props of components that may re-render in the browser. Qwik 1 can
serialize primitives (including `BigInt`, `Infinity` and `NaN`), plain objects and arrays, promises, `Date`,
`URL`, `URLSearchParams`, `RegExp`, `Error`, `Map`, `Set`, `FormData` and `Uint8Array`, and its own objects:
signals, stores, QRLs, tasks, components and JSX. It can't serialize instances of other classes, closures
that aren't `$` functions, or anything with hidden state, such as a database connection, an
`Intl.NumberFormat` or a third-party library's object. Two ways out exist: put the value at the top level of a module, so segments import it
instead of capturing it, or wrap it in `noSerialize()`, which tells Qwik to leave it out and accept that it
will be `undefined` after resuming. Exercise 2 hits this rule.

Because a captured variable is serialized, it must also be `const`, and the ESLint plugin
(`eslint-plugin-qwik`, in every starter) checks the static part of these rules as you type.

## Code structure

### Scaffolding

`npm create qwik@latest` asks questions by default, but it takes a starter name and a directory as
arguments. The 1.20 starters are `empty` ("Blank project with routing included"), `playground` (a demo
app), `library` (for publishing components), and two internal ones, `base` and `e2e-library`. There is no
client-only starter. Every app starter includes Qwik City, because Qwik expects a server, or at least a
build step, to render pages. For a site without a server you add the *static adapter*, which renders every
route to HTML at build time (static site generation, SSG):

```console
$ npm create qwik@latest empty qwik
…
┌  Let's create a  Qwik App  ✨ (v1.20.3-dev+28a07b2)
│
◇  Result ────────────────────────────────────────────────╮
│                                                         │
│  🦄  Success!  Project created in qwik directory        │
…
└  Happy coding! 🎉

$ cd qwik && npm install
…
$ npm run qwik add static --skipConfirmation=true
…
┌  🦋  Add Integration  static
[?25l│
[999D[J◇  App updated
[?25h│
◇  New scripts added ──────╮
│                          │
│  - npm run build.server  │
│                          │
├──────────────────────────╯
│
◇  🟣  Action Required!  ───────────────────────────────────╮
│                                                           │
│  You have to change the 'origin' url under staticAdapter  │
│  inside './adapters/static/vite.config.ts'                │
│                                                           │
├───────────────────────────────────────────────────────────╯
│
└  🦄  Success!  Added static to your app
```

The pinned tool versions are worth noticing. The 1.20.3 starter writes exact versions: Vite 7.3.1,
TypeScript 5.4.5, ESLint 9.32.0. The other Tasklet apps use Vite 8 and TypeScript 6 or 7, but Qwik 1.20's
plugin is built for Vite 7, so this app keeps the starter's versions. (Qwik 2 moves to Vite 8.)

### Tree

```text
tasklet/qwik/
├── adapters/static/vite.config.ts   the static adapter: build config for SSG
├── public/tasks.json                served as is
├── src/
│   ├── components/
│   │   ├── router-head/             starter: renders <title> and <meta> from each route's head
│   │   ├── app.tsx                  the Tasklet component and its state
│   │   ├── filter-bar.tsx
│   │   ├── task-form.tsx
│   │   └── task-item.tsx
│   ├── routes/index.tsx             the page at /: <App /> and the document title
│   ├── entry.dev.tsx                starter: client-only rendering for `vite` without SSR
│   ├── entry.ssr.tsx                starter: renderToStream(<Root />), used by SSG
│   ├── root.tsx                     starter: <QwikCityProvider>, <head>, <body>
│   ├── storage.ts, tasks.ts         the same helpers as the other Tasklet apps
│   └── tasklet.css
├── tasklet.json
├── vite.config.ts                   qwikCity() + qwikVite() plugins
└── vite.preview.config.ts           serves dist/ as a static host would
```

The app is 428 lines in 11 files, more than any version so far, but 121 of those lines are starter files
you don't edit (`root.tsx`, the two entries and `router-head.tsx`). The 307 lines that are Tasklet's own are
close to React's 249, mostly because Qwik's formatter (Prettier, at 80 columns) breaks lines more often.

### Routes and the root

A Qwik City app is a set of routes in `src/routes/`, much like SvelteKit or Next.js. Tasklet has one:

`tasklet/qwik/src/routes/index.tsx`

```tsx
import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { App } from "../components/app";

export default component$(() => <App />);

export const head: DocumentHead = {
  title: "Tasklet — Qwik",
};
```

`root.tsx` renders the whole document, `<html>` excepted: `<QwikCityProvider>`, then a `<head>` with
`<RouterHead />` and a `<body>` with `<RouterOutlet />`, where the route's component goes. It also imports
`tasklet.css`, which Vite bundles into one stylesheet and the page links in its `<head>`.

## Building Tasklet in Qwik

### Deciding how to serve it

The harness builds each app and then serves it on its port with `npm run preview`. A Qwik City app can be
served in three ways: by a Node (or Deno, Bun, Cloudflare …) server that renders each request, by Vite's
preview server running the same SSR code, or as static files produced by SSG. Tasklet has no server-side
data: the seed list is a static `tasks.json` and the saved list is in the browser. So a server renders
exactly the same page for every request, and SSG renders it once at build time instead. That is what the
static adapter does, and it's the deployment closest to the other Tasklet apps: a folder of files.

The starter's `npm run preview` runs `qwik build preview`, which builds a separate SSR bundle and serves it
through Vite's preview server. With SSG that would serve a different build from the one in `dist/`. So the
Tasklet version serves `dist/` with a plugin-free Vite config:

`tasklet/qwik/vite.preview.config.ts`

```ts
import { defineConfig } from "vite";

// `npm run preview` serves the static site in dist/ (written by the static
// adapter during `npm run build`) as a plain static host would: no Qwik
// plugins and no server-side rendering per request.
export default defineConfig({
  preview: { port: 4310, strictPort: true },
});
```

`tasklet/qwik/adapters/static/vite.config.ts`

```ts
import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["@qwik-city-plan"],
      },
    },
    plugins: [
      staticAdapter({
        origin: "http://localhost:4310",
      }),
    ],
  };
});
```

The static adapter needs an `origin`, used for absolute URLs such as the canonical link and the sitemap; the
`qwik add` command reminds you to change it. The scripts in `package.json` tie it together. `qwik build`
runs `build.types`, `build.client`, `build.server` and `lint`, and the server build is the SSG step:

`tasklet/qwik/package.json` (excerpt)

```json
  "scripts": {
    "build": "qwik build",
    "build.client": "vite build",
    "build.server": "qwik check-client src dist && vite build -c adapters/static/vite.config.ts",
    "build.types": "tsc --incremental --noEmit",
    "deploy": "echo \"Deploy the static files in dist/ to any static host\"",
    "dev": "vite --mode ssr --port 4310 --strictPort",
    "dev.debug": "node --inspect-brk ./node_modules/vite/bin/vite.js --mode ssr --force",
    "fmt": "prettier --write .",
    "fmt.check": "prettier --check .",
    "lint": "eslint \"src/**/*.ts*\"",
    "preview": "vite preview --config vite.preview.config.ts",
    "start": "vite --open --mode ssr --port 4310 --strictPort",
    "qwik": "qwik"
  },
```

### Client-only state in a server-first framework

This is where Tasklet works against Qwik. Qwik wants the server to render the real content and then do
nothing in the browser until the user acts. But Tasklet's first screen depends on `localStorage`, which only
exists in the browser: if there's a valid saved list, show it; if not, fetch `tasks.json`, showing "Loading
tasks…" meanwhile. At build time there is no saved list to read, so the prerendered HTML can only show the
loading state, and something must run in the browser as soon as the page loads.

Qwik has one hook for that, `useVisibleTask$`. It runs only in the browser, by default when the component
becomes visible (through an `IntersectionObserver`), or, with `strategy: "document-ready"`, as soon as the
document is ready. Running code eagerly is the opposite of what Qwik is for, so the ESLint plugin warns
about every `useVisibleTask$` (rule `qwik/no-use-visible-task`), and the docs call it an escape hatch. For
Tasklet there is no other choice, and the code says so with a comment.

The alternatives are worse or different apps. Qwik's `render()` can render on the client only; the
starter's `entry.dev.tsx` uses it, with a warning not to do so in production, because none of Qwik's
optimizer or serialization paths run. A cookie instead of `localStorage` would let a server read the list
and render it, but that is a server app with a different persistence contract, and the static build would
lose it. Exercise 4 asks you to sketch that version.

### `app.tsx`

`tasklet/qwik/src/components/app.tsx`

```tsx
import {
  $,
  component$,
  isServer,
  useComputed$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import { fetchTasks, loadSavedTasks, saveTasks } from "../storage";
import {
  addTask,
  clearDone,
  countLabel,
  removeTask,
  toggleTask,
  visibleTasks,
  type Filter,
  type Task,
} from "../tasks";
import { FilterBar } from "./filter-bar";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";

interface AppState {
  status: "loading" | "error" | "ready";
  tasks: Task[];
}

export const App = component$(() => {
  const state = useStore<AppState>({ status: "loading", tasks: [] });
  const filter = useSignal<Filter>("all");

  const visible = useComputed$(() => visibleTasks(state.tasks, filter.value));
  const count = useComputed$(() => countLabel(state.tasks));
  const anyDone = useComputed$(() => state.tasks.some((task) => task.done));

  // $() makes the function a QRL: a lazy-loadable reference that handlers
  // and tasks can capture and that survives serialization.
  const load = $(async () => {
    state.status = "loading";
    try {
      state.tasks = await fetchTasks();
      state.status = "ready";
    } catch {
      state.status = "error";
    }
  });

  // The page is rendered at build time, where there is no localStorage, so
  // start-up is browser-only work: Qwik's escape hatch, a visible task.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    () => {
      const saved = loadSavedTasks();
      if (saved) {
        state.tasks = saved;
        state.status = "ready";
      } else {
        load();
      }
    },
    { strategy: "document-ready" },
  );

  // Runs once at build time (and stops at the guard); after that, in the
  // browser, whenever state.tasks changes: save every change.
  useTask$(({ track }) => {
    const tasks = track(() => state.tasks);
    if (isServer || state.status !== "ready") return;
    saveTasks(tasks);
  });

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm
        onAdd$={(title) => {
          state.tasks = addTask(state.tasks, title);
        }}
      />
      <FilterBar
        filter={filter.value}
        onChange$={(next) => {
          filter.value = next;
        }}
      />
      {state.status === "loading" && <p role="status">Loading tasks…</p>}
      {state.status === "error" && (
        <>
          <p role="alert">Couldn't load tasks.</p>
          <button type="button" onClick$={load}>
            Retry
          </button>
        </>
      )}
      {state.status === "ready" &&
        (visible.value.length === 0 ? (
          <p class="empty">Nothing to show.</p>
        ) : (
          <ul class="tasks" aria-label="Tasks">
            {visible.value.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle$={() => {
                  state.tasks = toggleTask(state.tasks, task.id);
                }}
                onRemove$={() => {
                  state.tasks = removeTask(state.tasks, task.id);
                }}
              />
            ))}
          </ul>
        ))}
      {state.status === "ready" && (
        <footer class="footer">
          <p class="count" aria-live="polite">
            {count.value}
          </p>
          <button
            type="button"
            class="clear"
            disabled={!anyDone.value}
            onClick$={() => {
              state.tasks = clearDone(state.tasks);
            }}
          >
            Clear done
          </button>
        </footer>
      )}
    </main>
  );
});
```

Walk through it in the order Qwik sees it:

- **State.** `useStore` makes a deeply reactive object, here the status and the task list, and `useSignal`
  a single value, the filter. Both are serialized into the page. The status starts as `"loading"`, which is
  what the prerendered HTML shows.
- **Derived values.** `useComputed$` is a memoized derivation that tracks what it reads, like Solid's
  `createMemo` or Vue's `computed`. `visible`, `count` and `anyDone` recompute when `state.tasks` or `filter`
  change. Because the store is replaced with a new array on every change, the helpers from `tasks.ts` stay
  pure functions, as in the other versions.
- **`load` is a `$()`.** The function is used in two places, the visible task and the Retry button. A plain
  arrow function can't be captured by a handler, since Qwik couldn't serialize it, so `$()` turns it into a
  QRL that both can capture.
- **Start-up.** `useVisibleTask$` reads `localStorage` and either shows the saved tasks or calls `load()`.
- **Saving.** `useTask$` runs once on the server (here, at build time) and then again in the browser
  whenever something it `track`s changes. The guard keeps it from touching `localStorage` on the server, and
  from saving before the list is ready, so the first save happens after the first change. That matches the
  contract: the app saves after every change.
- **Callbacks to children.** `onAdd$`, `onChange$`, `onToggle$` and `onRemove$` end in `$`, so the
  optimizer extracts each arrow function and the child receives a QRL. A child can call it like a function,
  but it returns a promise, because the code may have to load first.

In the JSX, `class` is spelled `class`, as in HTML, not `className`. Conditional rendering uses `&&` and
`map` with a `key`, as in React.

### The components

`tasklet/qwik/src/components/task-form.tsx`

```tsx
import { component$, useSignal, type QRL } from "@builder.io/qwik";

interface TaskFormProps {
  onAdd$: QRL<(title: string) => void>;
}

// The "Add task" form. Calls onAdd$ with the trimmed title; ignores blanks.
export const TaskForm = component$<TaskFormProps>(({ onAdd$ }) => {
  const title = useSignal("");

  return (
    <form
      class="add"
      aria-label="Add task"
      // Handlers load lazily, so they can't call event.preventDefault() in
      // time; this attribute tells Qwik's global listener to do it.
      preventdefault:submit
      onSubmit$={async () => {
        const trimmed = title.value.trim();
        if (trimmed === "") return;
        await onAdd$(trimmed);
        title.value = "";
      }}
    >
      <label for="new-task">New task</label>
      <input id="new-task" name="title" autoComplete="off" bind:value={title} />
      <button type="submit">Add</button>
    </form>
  );
});
```

Two details are Qwik-specific. First, a handler is loaded *after* the event fires, so by the time it runs
the browser has already started submitting the form; `event.preventDefault()` would come too late.
`preventdefault:submit` is an attribute that the loader reads when the event fires, synchronously. Second,
`bind:value={title}` is a two-way binding between the input and the signal, the equivalent of Vue's
`v-model` or Svelte's `bind:value`. The handler awaits `onAdd$` before it clears the input, since QRL calls
are asynchronous.

`tasklet/qwik/src/components/task-item.tsx`

```tsx
import { component$, type QRL } from "@builder.io/qwik";
import type { Task } from "../tasks";

interface TaskItemProps {
  task: Task;
  onToggle$: QRL<() => void>;
  onRemove$: QRL<() => void>;
}

// One task: a checkbox wrapped in its label, and a Delete button.
export const TaskItem = component$<TaskItemProps>(
  ({ task, onToggle$, onRemove$ }) => (
    <li class={task.done ? "task done" : "task"}>
      <label>
        <input type="checkbox" checked={task.done} onChange$={onToggle$} />{" "}
        <span>{task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label={`Delete "${task.title}"`}
        onClick$={onRemove$}
      >
        ×
      </button>
    </li>
  ),
);
```

`onChange$={onToggle$}` passes the parent's QRL straight to the element. There's no wrapper function, so
the checkbox's `on:change` attribute points directly at the chunk that holds the parent's toggle code.
`FilterBar` is the same shape with three buttons, each calling `onChange$(value)` and setting
`aria-pressed` from the current filter.

### Build it and run it

```console
$ cd tasklet/qwik
$ npm run build

> build
> qwik build
…
npm run build.types
npm run build.client
npm run build.server
npm run lint

npm warn Unknown cli config "--pretty". This will stop working in the next major version of npm.

> build.types
> tsc --incremental --noEmit

> build.client
> vite build

vite v7.3.1 building client environment for production...
transforming...
✓ 74 modules transformed.
rendering chunks...
computing gzip size...
dist/assets/DgS0Yp8w-bundle-graph.json   1.53 kB │ gzip:  0.88 kB
dist/q-manifest.json                    33.58 kB │ gzip:  5.52 kB
dist/assets/onwFC3US-style.css           2.31 kB │ gzip:  0.94 kB
dist/build/q-CCy5IoHN.js                 0.13 kB │ gzip:  0.13 kB
dist/build/q-CHHscJ04.js                 0.14 kB │ gzip:  0.14 kB
…
dist/build/q-B0RNzhzp.js                 2.24 kB │ gzip:  1.09 kB
dist/build/q-naDMFAHy.js                 3.10 kB │ gzip:  1.68 kB
dist/build/q-BKZ00VYc.js                 3.73 kB │ gzip:  2.00 kB
dist/build/q-B5ooOPla.js                 4.11 kB │ gzip:  1.39 kB
dist/build/q-C1eB3LhH.js                 6.88 kB │ gzip:  2.80 kB
dist/build/q-BsGaJFMz.js                 6.93 kB │ gzip:  3.28 kB
dist/build/q-BhPbCVFk.js                50.11 kB │ gzip: 20.25 kB
✓ built in 399ms

✓ Built client modules

> build.server
> qwik check-client src dist && vite build -c adapters/static/vite.config.ts


> lint
> eslint "src/**/*.ts*"
…
[36mvite v7.3.1 [32mbuilding ssr environment for production...[36m[39m
transforming...
[32m✓[39m 30 modules transformed.
rendering chunks...
[2mserver/[22m[36m@qwik-city-plan.js  [39m[1m[2m 4.33 kB[22m[1m[22m
[2mserver/[22m[36mentry.ssr.js        [39m[1m[2m29.97 kB[22m[1m[22m
[2mserver/[22m[36mq-BC6-Xamw.js       [39m[1m[2m71.65 kB[22m[1m[22m
[32m✓ built in 340ms[39m

[1m[32mStarting Qwik City SSG...[39m[22m
[2mdist/[22mindex.html

[32mSSG results[39m
- Generated: [2m1 page[22m
- Duration: [2m398.8 ms[22m
- Average: [2m398.8 ms per page[22m

…
✓ Built server (ssr) modules
✓ Type checked
✓ Lint checked

$ node ../tools/size.mjs dist
file                              raw        gzip
404.html                      0.76 kB     0.43 kB
assets/onwFC3US-style.css     2.31 kB     0.94 kB
build/q-3mX9JcPz.js           0.96 kB     0.56 kB
…
build/q-BhPbCVFk.js          50.10 kB    20.23 kB
index.html                    6.58 kB     2.86 kB
total                       101.59 kB    45.70 kB
```

The build runs four steps and takes about 3 seconds, ten times longer than the Vite-only apps. Most of it is
the type check, the SSR build and SSG; the client build itself takes 0.4 seconds. The client build writes
32 `q-*.js` chunks for 74 modules, and the SSG step renders one page, `dist/index.html`.

Then the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs qwik
=== Qwik (tasklet/qwik, port 4310) ===
…
Running 15 tests using 15 workers

  ✓   9 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks (634ms)
  ✓   6 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (684ms)
…
  ✓   7 [chromium] › tests/tasklet.spec.ts:204:1 › adds a trimmed task, clears the input and ignores blank titles (1.1s)
  ✓   5 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.6s)

  15 passed (2.2s)

Summary
app   port  build  passed  failed  skipped  note
qwik  4310  ok     15      0       0
```

All 15 pass with no skips. The two changes from the starter that the harness depends on are the `origin`
and the preview config: the starter's `preview` script would build and serve the SSR preview bundle on
Vite's default port, not the SSG output in `dist/` on 4310.

### What the browser downloads

The total, 45.70 kB gzipped, is the largest of the client-side Tasklets so far (React is 70.14 kB, Vue 28.37
kB, Svelte 17.76 kB, Preact 11.74 kB). But the total isn't what Qwik claims to save; it's what the browser
fetches before the user acts. So the chapter measured that: a Playwright script loads the page in headless
Chromium, records every JavaScript response, and adds up their gzip sizes as `size.mjs` reports them.

| Situation | JS files fetched | gzip |
| --- | --- | --- |
| Page loaded, no saved tasks, no interaction | 12 | 28.74 kB |
| … then add a task | +0 | 28.74 kB |
| Page loaded with saved tasks | 12 | 28.74 kB |

The 12 files are the same in both start-ups. The largest is `q-BhPbCVFk.js`, 20.23 kB, which is Qwik's
core. Three things fetch it before you click:

- The HTML has `<link rel="modulepreload">` tags for the loader (`q-naDMFAHy.js`, 1.68 kB), the preloader
  (`q-BKZ00VYc.js`, 2.00 kB) and the core, written by the server renderer's defaults since 1.14.
- An inline script waits for the window's `load` event and idle time, then has the preloader fetch the
  handler chunks the page may need: the form's, the filter buttons', the visible task's.
- The visible task runs at `document-ready`, so its code, the store and the core must run on every visit
  anyway.

After that, adding a task fetches nothing new: everything the click needs was preloaded. This is the
trade-off in plain numbers. Qwik doesn't make Tasklet's start-up cheap, because Tasklet's start-up needs
code by design, and Qwik's preloader trades bytes for an instant first click. It does mean the HTML arrives
with the real layout and that nothing renders twice. A page that showed server data and had no visible
task would download the loader and preload the core and handlers in idle time, still without running any
component. The loader in [Chapter 18](18-meta-frameworks-and-rendering.md)'s resumability diagram is
1.68 kB gzipped in this build, but it isn't the only script the page downloads.

## Beyond Tasklet

### Qwik City

Qwik City is to Qwik what SvelteKit is to Svelte, and it's where Qwik's design pays off, because the data
starts on the server. A route is a folder in `src/routes/` with an `index.tsx`; `layout.tsx` files wrap the
routes below them; `[param]` folders are dynamic segments. Three server-side tools carry the data:

- `routeLoader$` runs on the server before the route renders and returns serializable data that the
  component reads as a signal. On a static build, loaders run at build time.
- `routeAction$` handles a form submission on the server. With Qwik City's `<Form>` it works without
  JavaScript, as a normal POST, and with JavaScript, by fetching.
- `server$` wraps a function so that calling it from the browser runs it on the server, an RPC. It is the
  same idea as React's server functions ([Chapter 18](18-meta-frameworks-and-rendering.md) compares them).

Qwik City also handles links that navigate without a full page load (`<Link>`), middleware (`onRequest`,
`onGet`), and adapters for Node, Deno, Bun, Cloudflare Pages, Netlify Edge, Vercel Edge, Azure Static Web
Apps, Google Cloud Run and static hosting.

### `useResource$` and async state

Qwik 1 has a hook for async data in components, `useResource$`, rendered with a `<Resource>` component that
takes `onPending`, `onRejected` and `onResolved` callbacks. Tasklet doesn't use it. Its loading is a
one-time start-up step that may come from `localStorage` instead, and the Retry button needs to start it
again on demand, which a store and a `$()` function express more directly than a resource that re-runs when
its tracked values change. A sketch of the resource style, for a search box:

```tsx
// sketch: v1 useResource$
const query = useSignal("");
const results = useResource$(async ({ track, cleanup }) => {
  const q = track(() => query.value);
  const controller = new AbortController();
  cleanup(() => controller.abort());
  const response = await fetch(`/api/search?q=${q}`, { signal: controller.signal });
  return (await response.json()) as string[];
});

return (
  <Resource
    value={results}
    onPending={() => <p>Searching…</p>}
    onRejected={() => <p role="alert">Search failed.</p>}
    onResolved={(list) => <ul>{list.map((item) => <li key={item}>{item}</li>)}</ul>}
  />
);
```

In Qwik 2, `useResource$` is deprecated in favor of an async `useComputed$`, which tracks what it reads
before its first `await`, provides an `abortSignal`, and is rendered inside new `<Pending>` and `<Catch>`
components instead of `<Resource>`.

### Qwik 2.0 and the new package names

Qwik 2 has been in development since early 2024. It reached alpha in November 2024, beta in June 2025 and
release candidate on October 1, 2026; 2.0.0-rc.4 came out on October 25, 2026. On npm it is already the
`latest` tag of `@qwik.dev/core`, while `npm create qwik@latest` still scaffolds 1.20.3 (the 2.0 starter is
under the `rc` tag). The GitHub repository's `main` branch is version 2; a `v1` branch receives the 1.x
releases, which are still active (1.20.3 shipped the same day as rc.4).

> Qwik v2 is a ground-up rewrite of the framework.
>
> — Qwik documentation, "Migrating to Qwik v2" (2026)

What changes for you:

| Qwik 1 | Qwik 2 |
| --- | --- |
| `@builder.io/qwik` | `@qwik.dev/core` |
| `@builder.io/qwik-city`, "Qwik City" | `@qwik.dev/router`, "Qwik Router" |
| `@builder.io/qwik-react` | `@qwik.dev/react` |
| `<QwikCityProvider>` | `useQwikRouter()` in the root (or `<QwikRouterProvider>`) |
| `on:click="…"` attributes | `q-e:click="…"` (and `q-ep:` for passive listeners) |
| `<script type="qwik/json">` | `qwik/vnode` and `qwik/state` scripts at the end of the document |
| `useResource$` + `<Resource>` | async `useComputed$` + `<Pending>` / `<Catch>` |
| Vite 5 to 7 (`>=5 <8`) | Vite 8 (Rolldown) and Vite's environment API |

The guide also lists smaller serialized state ("up to 30% smaller HTML"), hot module replacement that
keeps state, and a migration command, `qwik migrate-v2`, that rewrites the imports. The API you learned in
this chapter (`component$`, `useSignal`, `useStore`, `useTask$`, `$`, QRLs) carries over; the serialization
format, the renderer and the package names don't. The new state format lets the server stream parts of the
page out of order, which Qwik 1 couldn't. If you start a project today, 1.20 is the stable choice and the
one that most documentation, tutorials and libraries assume; plan for the migration if the project will
live beyond 2027.

### Adoption, honestly

Qwik is well known and lightly used. The numbers from npm and GitHub:

| | May 2023 | May 2024 | May 2025 | May 2026 | October 2026 |
| --- | --- | --- | --- | --- | --- |
| `@builder.io/qwik`, weekly downloads | 11,452 | 15,676 | 22,783 | 29,407 | 44,916 |
| `@qwik.dev/core`, weekly downloads | – | – | – | – | 7,030 |

For scale, `lit` has about 6.3 million weekly downloads and React tens of millions. The repository has
22,068 stars, and its `main` branch had 379 commits from 25 authors in October 2026, most from two
maintainers (Varixo and maiieul) and Wout Mertens, so the project is active. The ecosystem is small: Qwik UI
for components, Modular Forms, a React adapter (`qwik-react`) that lets you use React components as
islands, Partytown (moving third-party scripts to a web worker) from the same team, and integrations listed
in the docs. Few large companies say publicly that they use Qwik. The qwik.dev site is itself a Qwik City
app (its HTML carries `q:container`); the Builder.io home page, fetched for this chapter, doesn't carry
Qwik's markers.

## Strengths and trade-offs

**Strengths**

- Start-up work doesn't grow with the size of the page. Nothing is hydrated; components run in the browser
  only when their state changes.
- Code splitting is automatic and fine-grained. You don't write `import()` or decide where chunks go; every
  `$` is a possible boundary, and the bundler groups segments into chunks.
- The HTML is complete and real on arrival: server-rendered or prerendered, with state attached.
- Fine-grained signals update single text nodes and attributes, without re-running components.
- Qwik City covers routing, loaders, actions, forms that work without JavaScript, and many deploy targets.

**Trade-offs**

- The rules are new and strict: `$` boundaries, serializable captures, QRLs that return promises,
  `preventdefault:` attributes instead of `event.preventDefault()`. The compiler and linter catch many
  mistakes, but some, like Exercise 2's, only show at runtime.
- Client-only state is awkward. `useVisibleTask$` works but gives up the model's main benefit, as Tasklet
  shows.
- The first interaction can wait for the network, which the preloader hides by downloading code in advance,
  so the byte savings are smaller than "only what you click" suggests.
- More moving parts: four build steps, a server or SSG step even for a static page, pinned tool versions,
  and a larger project than the other apps.
- A small ecosystem and community, and a major version in transition, with new package names, at the time
  of writing.

## Compared with React

Qwik's JSX looks like React's, and the API names are close enough to mislead you. Here is the toggle in
React, from [Chapter 4](04-react.md):

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

and in Qwik:

`tasklet/qwik/src/components/app.tsx` (excerpt)

```tsx
                onToggle$={() => {
                  state.tasks = toggleTask(state.tasks, task.id);
                }}
```

They look alike, and both replace the list with a new one. But in React the component function runs again
after `setTasks` and React diffs the new tree; in Qwik the assignment notifies the computed `visible`
signal, which re-renders the list part of `App` in the browser (loading the component's code if this is the
first time). The React function is created on every render; the Qwik one is extracted by the compiler, has
a name like `s_iedie3i8ExA`, and is loaded on demand.

| | React 19 | Qwik 1.20 |
| --- | --- | --- |
| Component | Function that runs on every render | `component$`: runs on the server, and in the browser only when its state changes |
| State | `useState`, `useReducer` | `useSignal`, `useStore` (deep, mutable) |
| Derived | Computed during render; `useMemo` | `useComputed$` (tracked) |
| Effects | `useEffect` (browser only) | `useTask$` (server and browser), `useVisibleTask$` (browser only) |
| Events | `onClick={fn}`, `event.preventDefault()` | `onClick$={fn}`, `preventdefault:click` |
| Two-way input | Controlled input: `value` + `onChange` | `bind:value={signal}` |
| SSR on the client | Hydration | Resumption |
| Code splitting | Manual: `lazy()` and `import()` | Automatic at every `$` |
| Tasklet size (gzip) | 70.14 kB total, all loaded | 45.70 kB total, 28.74 kB loaded |

If you know Solid ([Chapter 8](08-solid.md)), Qwik's reactivity will feel closer: signals, tracked computed
values, components that don't re-run for every change. Where Solid hydrates and keeps everything in memory,
Qwik serializes and resumes, and that is what the `$` and the serialization rules pay for.

## Summary

- Qwik replaces hydration with *resumability*: the server writes state, component boundaries and event
  handler references into the HTML, and the browser loads a handler's code only when its event fires.
- The `$` suffix marks where the optimizer may split code. Each `$` function becomes a segment, referenced
  by a QRL with its captured variables; Exercise 1 shows one component turning into three modules.
- What a `$` function captures must be serializable and `const`. Put other values at module level or wrap
  them in `noSerialize()`.
- The hooks: `useSignal` and `useStore` for state, `useComputed$` for derived values, `useTask$` for
  reactions on server and browser, `useVisibleTask$` for browser-only work, `useResource$` (v1) for async
  values.
- Qwik City is the meta-framework and the normal way to build a Qwik app, even a static one; Tasklet uses
  its static adapter, and its preview serves `dist/` like a static host.
- Tasklet's `localStorage` start-up works against Qwik. It needs a visible task, and with the default
  preloader the page fetches 28.74 kB of JavaScript before any click.
- Qwik 2.0 is a rewrite in release candidate, published as `@qwik.dev/core` and `@qwik.dev/router`; 1.20 is
  the stable line. Adoption is modest and the project is actively developed.

## Exercises

The examples for this chapter are in `examples/ch11/`. Run `npm ci` there once. The scripts run Qwik's
optimizer and server renderer on single files, so you don't need a project to try them.

1. **Find the `$` boundaries.** Before you run anything, predict how many modules the optimizer will make
   out of `counter.tsx`, which of them will capture variables and what each captures. Then run
   `node optimize.mjs counter.tsx` (add `--code` to see the code). What happened to `step`, and what would
   change if `step` were `useSignal(2)`?

   <details><summary>Solution</summary>

   Three: the original module, the component body (from `component$`) and the click handler (from
   `onClick$`):

   ```console
   $ node optimize.mjs counter.tsx

   // counter.tsx_Counter_component_button_onClick_w50qpfHkfAQ.js
   //   segment counter.tsx_Counter_component_button_onClick (eventHandler onClick$), captures: true

   // counter.js

   // counter.tsx_Counter_component_u287G10q3ug.js
   //   segment counter.tsx_Counter_component (function component$), captures: false
   ```

   Only the handler captures, and only `count` (`useLexicalScope()` returns `[count]` in the `--code` output
   earlier in the chapter). The component body captures nothing: it's a top-level function. `step` is a
   constant number, so the optimizer inlined it as `count.value += 2`. If `step` were a signal, it would be a
   captured variable like `count`, the handler's QRL would carry `[count, step]`, and its value would be
   serialized into the page.

   </details>

2. **A value that won't serialize.** `price.tsx` shows a price and doubles it on click, formatting it with an
   `Intl.NumberFormat`. Render it with `node render.mjs price.tsx Price`, read the error, and fix the
   component without changing what it shows.

   <details><summary>Solution</summary>

   ```console
   $ node render.mjs price.tsx Price
   Trying to serialize Intl.NumberFormat {}
   …
   Error: Captured variable in the closure can not be serialized because it's an instance of "NumberFormat". You might need to use 'noSerialize()' or use an object literal instead. Check out https://qwik.dev/docs/advanced/dollar/
   …
   ```

   The handler uses `money`, so the optimizer makes `money` a captured variable, and Qwik must put it in the
   page. A `NumberFormat` is a class instance with internal state, which Qwik can't serialize. The fix moves
   it to module scope, where every segment that uses it imports it, so nothing about it is serialized:

   `examples/ch11/solutions/price.tsx`

   ```tsx
   import { component$, useSignal } from "@builder.io/qwik";

   // Module scope: every segment that uses it imports it instead of capturing it,
   // so nothing about it has to be serialized.
   const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

   export const Price = component$(() => {
     const cents = useSignal(1999);
     const label = useSignal(money.format(cents.value / 100));

     return (
       <button
         type="button"
         onClick$={() => {
           cents.value *= 2;
           label.value = money.format(cents.value / 100);
         }}
       >
         {label.value}
       </button>
     );
   });
   ```

   ```console
   $ node render.mjs solutions/price.tsx Price
   <!--cq-->
   <div q:container="paused" q:version="1.20.3-dev+2fec922" q:render="ssr-dev" q:base="/build/" q:manifest-hash="devo0jy3rh441" q:instance="ezrmprxg00t" class="qc📦">
   <!--qv q:id=0 q:key=tsy9:-->
   <button type="button" on:click="/build/Price_component_button_onClick_RyMvcr3ouu0.js#Price_component_button_onClick_RyMvcr3ouu0[0 1]" q:key="I9_0" q:id="1" data-qwik-inspector="./solutions/price.tsx:12:5">
   <!--t=2-->$19.99<!---->
   </button>
   <!--/qv-->
   <script type="qwik/json">{
     "refs": {
       "1": "0 1"
     },
     "ctx": {
       "0": {
         "h": "6",
         "s": "0 1"
       }
     },
     "objs": [
       "\u00122",
       "\u00123",
       1999,
       "$19.99",
       "\u00111 @0",
       "#2",
       "\u0002/build/Price_component_tsy9iw8PBis.js#Price_component_tsy9iw8PBis"
     ],
     "subs": [
       [
         "0 #0"
       ],
       [
         "3 #2 4 #2"
       ]
     ]
   }</script>
   <script q:func="qwik/json">document["qFuncs_ezrmprxg00t"]=[(p0,)=>(p0.value)]</script>
   <script>(window.qwikevents||(window.qwikevents=[])).push("click")</script>
   </div>
   <!--/cq-->
   …
   ```

   Now the handler captures `[0 1]`, the two signals, and the page holds `1999` and `"$19.99"`.
   `noSerialize(money)` would also silence the error, but the value would be `undefined` after resuming in
   the browser, so the first click would fail. Use `noSerialize()` for values you recreate in the browser,
   such as in a visible task.

   </details>

3. **Read a resumable page.** Build `tasklet/qwik`, then run
   `node inspect.mjs ../../tasklet/qwik/dist/index.html`. It lists the event attributes in the prerendered
   page and the plain values in its `qwik/json` state. Why does the state contain `"loading"`, an empty list
   and `"0 tasks left"`? Why do the three filter buttons point to the same chunk and symbol, and what do they
   capture?

   <details><summary>Solution</summary>

   ```console
   $ node inspect.mjs ../../tasklet/qwik/dist/index.html
   Event attributes:
     on-document:qinit="q-DnI9wF94.js#_hW[0]"
     on:submit="q-D1Ss5QEM.js#s_nWs2zagNdko[0 1]"
     on:input="q-D1Ss5QEM.js#s_j02jRxU58oY[0]"
     on:click="q-PJ3eoCfo.js#s_iedie3i8ExA[0 1]"
     on:click="q-PJ3eoCfo.js#s_iedie3i8ExA[0 1]"
     on:click="q-PJ3eoCfo.js#s_iedie3i8ExA[0 1]"
     on-document:qcinit="q-B0RNzhzp.js#s_yYuJeHUwXF4"
     on-document:qinit="#0"

   qwik/json: 999 characters, 33 objects. Plain values among them:
     [[],{"status":"i","tasks":"1"},"all","0 tasks left",false,"loading",{"onAdd$":"m"},"",{"$$filter":"p","onChange$":"q"},"active","done",true]
   ```

   The page was rendered at build time, where `localStorage` doesn't exist, so it holds the initial state:
   status `"loading"`, no tasks, and the computed count for an empty list. In the browser, the visible task
   replaces all three. The filter buttons share one handler, `s_iedie3i8ExA`, because they come from the
   same arrow function in the `map` in `filter-bar.tsx`. Each captures the parent's `onChange$` QRL and its
   own `value`; `[0 1]` indexes into each element's own entry in `refs`, so the same numbers point to
   different values for each button. The
   `on-document:` attributes are listeners on the document: Qwik City's start-up (`qcinit`) and the visible
   task (`qinit`), which is what makes the browser run code without a click.

   </details>

4. **Server-first Tasklet.** Suppose Tasklet stored its tasks on a server instead of in `localStorage`.
   Sketch how the Qwik City version would load and change them, and say what would disappear from
   `app.tsx` and what the browser would download before the first click.

   <details><summary>Solution</summary>

   A `routeLoader$` would read the tasks on the server, so the HTML would already contain the list and the
   loading state would disappear. Adding, toggling and deleting would be `routeAction$`s, used with
   `<Form>`, so they work as normal form posts even before any JavaScript loads:

   ```tsx
   // sketch: src/routes/index.tsx in a server-first Tasklet
   export const useTasks = routeLoader$(async () => db.tasks.list());

   export const useAddTask = routeAction$(
     async ({ title }) => db.tasks.add(title),
     zod$({ title: z.string().trim().min(1) }),
   );

   export default component$(() => {
     const tasks = useTasks();
     const add = useAddTask();
     return (
       <main class="tasklet">
         <Form action={add}>
           <input name="title" />
           <button type="submit">Add</button>
         </Form>
         <ul class="tasks">
           {tasks.value.map((task) => <li key={task.id}>{task.title}</li>)}
         </ul>
       </main>
     );
   });
   ```

   `useVisibleTask$`, `load`, the saving task and the `status` field go away; after an action, Qwik City
   reruns the loader and the list updates. Before the first click, the browser would run no component
   code. It would load the loader and, in idle time, preload the handlers, but nothing would execute
   until you interact. The cost is a server (no static hosting) and a request per change, and it no longer
   meets Tasklet's contract, which says the data lives in the browser.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-11--qwik)
