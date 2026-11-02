# Chapter 6 — Svelte

React and Vue ship a runtime that interprets your components in the browser: they run a render function,
build a virtual DOM and diff it. Svelte moves that work to build time. Its compiler reads each component
and writes the JavaScript that creates the DOM and updates exactly the nodes that depend on each piece of
state, so there's no virtual DOM and no component re-render. Svelte 5 kept the compiler but changed what
it compiles to: state is now made of signals, declared with *runes* such as `$state` and `$derived`. This
chapter builds Tasklet with Svelte 5, runs the compiler by hand to see what it produces, compares runes with
the Svelte 4 syntax they replaced, and looks at shared state in `.svelte.ts` modules, snippets, SvelteKit
and the features added during 2025 and 2026.

## At a glance

| | |
| --- | --- |
| First released | November 2016 (Svelte 3 in April 2019, Svelte 5 in October 2024) |
| Current version | 5.57.3 (October 26, 2026) |
| Created by / maintained by | Rich Harris; the Svelte core team, several of them (Harris included) employed by Vercel to work on it, plus Open Collective donations |
| License | MIT |
| Rendering model | Compiled: components become JavaScript that clones HTML templates and updates individual nodes; no virtual DOM |
| Reactivity model | Signals created by runes (`$state`, `$derived`, `$effect`); objects and arrays in `$state` become deeply reactive Proxies |
| Templates | `.svelte` files: HTML with `{expressions}`, `{#if}`/`{#each}` blocks and `{#snippet}`s, plus `<script>` and scoped `<style>` |
| Language | TypeScript or JavaScript; `svelte-check` type-checks components |
| Tasklet build size | 17.76 kB gzip (45.27 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | SvelteKit ([Chapter 18](18-meta-frameworks-and-rendering.md)) |
| Good fit for | Small and fast apps and widgets, content sites with interactive parts (with SvelteKit), teams that want little boilerplate |

## Why it exists

Rich Harris, then a graphics editor at *The Guardian*, introduced Svelte in November 2016 with the post
"Frameworks without the framework" ([Chapter 2](02-a-short-history.md) tells the story). Interactive news
graphics have to load fast on phones, and a framework's runtime is code every reader downloads before
anything happens. If a compiler reads the components at build time, it can write the exact DOM operations
each one needs, and ship only the small runtime helpers that code uses. Svelte 3 (2019) made state feel
like plain variables: assign to a `let` and the compiler inserted the update code.

Svelte 5 (October 2024) is a rewrite. Compile-time tracking had limits: it worked only for top-level `let`
variables inside `.svelte` files, changing one property of an object invalidated the whole object, and the
`$:` label mixed derived values with side effects. Svelte 5 replaced them with runes and signals at run
time, still compiled. Its launch post sums up both sides of the design:

> Because the compiler shifts a lot of the work out of the browser and into `npm run build`, Svelte apps are
> small and fast.
>
> — The Svelte team, "Svelte 5 is alive" (2024)

## The mental model

There are two halves: what the compiler does with your file, and what the generated code does at run time.

```text
  build time                                    run time (in the browser)

  Counter.svelte                                count = $.state(0) ──────────┐ read in
  ┌───────────────────────┐   svelte/compiler   double = $.derived(…) ───────┤ the effect
  │ <script>  runes       │ ──────────────────► template clone: <button>     │ (tracked)
  │ markup    {count}     │                     $.template_effect(() =>      ▼
  │ <style>   (scoped)    │                       set_text(text, count…)) ◄──┘
  └───────────────────────┘                                │
                                                            ▼
                         click → count++ → signal notifies → effect re-runs → one text node updated
```

A component compiles to a function that runs **once**, when the component is mounted. It clones a static
HTML template, finds the dynamic nodes, attaches event listeners and creates one small effect per dynamic
part of the template. Each effect reads the signals it needs. When a signal changes, only the effects that
read it run again, and each of them updates one attribute or one text node. There's nothing to diff
because the compiler already knows, from the template, what can change.

You can see this by running the compiler yourself. Here is a tiny component:

`examples/ch06/Counter.svelte`

```svelte
<script lang="ts">
  let count = $state(0)
  const double = $derived(count * 2)
</script>

<button type="button" onclick={() => count++}>
  {count} × 2 = {double}
</button>
```

and a script that passes it to `compile()` from `svelte/compiler`, the same function the Vite plugin calls:

`examples/ch06/compile.mjs`

```js
// Runs the Svelte compiler on a component and prints the generated JavaScript.
// Run: node compile.mjs Counter.svelte [client|server] [--async]
import { readFileSync } from 'node:fs'
import { compile } from 'svelte/compiler'

const args = process.argv.slice(2)
const async = args.includes('--async')
const [file = 'Counter.svelte', generate = 'client'] = args.filter((arg) => arg !== '--async')

const result = compile(readFileSync(file, 'utf8'), {
  filename: file,
  generate,
  experimental: { async },
})

for (const warning of result.warnings) console.error(`warning ${warning.code}: ${warning.message}`)
console.log(result.js.code)
```

```console
$ cd examples/ch06
$ npm ci
$ node compile.mjs Counter.svelte
import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button type="button"> </button>`);

export default function Counter($$anchor) {
	let count = $.state(0);
	const double = $.derived(() => $.get(count) * 2);
	var button = root();
	var text = $.only_child(button);

	$.template_effect(() => $.set_text(text, `${$.get(count) ?? ''} × 2 = ${$.get(double) ?? ''}`));
	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, button);
}

$.delegate(['click']);
```

Read it from the top. `$state(0)` became `$.state(0)`, a signal, and `$derived(count * 2)` became a
computed signal whose expression was wrapped in a function. Every read of `count` became `$.get(count)`,
which is how the signal knows who depends on it, and `count++` became `$.update(count)`. The markup became
an HTML string that `root()` clones, and the one dynamic text became one `template_effect`. The click
handler is *delegated*: Svelte puts one `click` listener on the root of the app and dispatches to the right
element, which saves memory in long lists.

That's the main difference from Vue. In Vue, a change re-runs a component's render function and diffs its
VNodes. In Svelte, the render function never runs again; the change goes straight to the effect that owns
the affected text node. The compiler also explains why `count` in your source is a plain number, with no
`.value` or `count()`: the compiler rewrote every access for you. The cost is that the rewriting only
happens in files the compiler processes, which is why runes work only in `.svelte`, `.svelte.js` and
`.svelte.ts` files.

### Runes, and what they replaced

Runes are compiler instructions that look like function calls:

> Runes are symbols that influence the Svelte compiler.
>
> — The Svelte team, "Introducing runes" (2023)

| Rune | Purpose | In Tasklet |
| --- | --- | --- |
| `$state(value)` | reactive state; objects and arrays become deep Proxies | `tasks`, `failed`, `filter`, `title` |
| `$derived(expr)` / `$derived.by(fn)` | value computed from other state, cached and lazy | `visible`, `anyDone` |
| `$effect(fn)` | side effect that re-runs when what it read changes; runs after the DOM updates | saving to `localStorage` |
| `$props()` | the component's props, destructured | every child component |
| `$bindable()` | marks a prop the parent may bind with `bind:` | `filter` in `FilterBar` |
| `$inspect(value)` | logs a value whenever it changes, in development only | not used |

Svelte 4 used plain JavaScript syntax for the same jobs. Here is the counter in Svelte 4 style:

`examples/ch06/legacy/Counter.svelte`

```svelte
<script lang="ts">
  let count = 0
  $: double = count * 2
</script>

<button type="button" on:click={() => count++}>
  {count} × 2 = {double}
</button>
```

A top-level `let` was state, `$:` marked a reactive statement (here a derived value, but it could equally
run a side effect), `export let` declared a prop and `on:click` an event listener. It was short, but the
rules applied only at the top level of a component, and the dependencies of a `$:` statement were fixed at
compile time from the names that appeared in it, so moving code into a function silently broke it. The
same post lists the trouble with `$:`:

> And while the `$:` construct for reactively re-running statements is a neat trick, it turned out to be a
> footgun.
>
> — The Svelte team, "Svelte 5 is alive" (2024)

Svelte 5 still compiles Svelte 4 components, in *legacy mode*, so existing apps keep working. A component
uses runes mode as soon as it contains a rune. Compiling the legacy counter shows the difference: the
compiler emits `$.mutable_source` and `$.legacy_pre_effect` to emulate the old semantics on top of the new
signals:

```console
$ node compile.mjs legacy/Counter.svelte
…
export default function Counter($$anchor, $$props) {
	$.push($$props, false);

	const double = $.mutable_source();
	let count = $.mutable_source(0);

	$.legacy_pre_effect(() => ($.get(count)), () => {
		$.set(double, $.get(count) * 2);
	});
…
```

`svelte/compiler` also exports `migrate()`, the function behind `npx sv migrate svelte-5`, which rewrites
Svelte 4 syntax to runes. Exercise 3 uses it.

### Deep reactivity

`$state` given an array or a plain object returns a Proxy, like Vue's `reactive`. Reading `tasks[0].done`
inside an effect subscribes to that one property, and `tasks.push(…)` or `task.done = true` notify only the
effects that read what changed. Nested objects are wrapped when they are first read. Two variants opt out:
`$state.raw(value)` makes only reassignment reactive (useful for large data you replace wholesale), and
`$state.snapshot(value)` returns a plain, non-Proxy copy for code that can't handle Proxies, such as
`structuredClone`. Class instances aren't proxied; to make a class reactive, you declare `$state` fields
in it, as Exercise 4 does.

## Code structure

### Scaffolding

Svelte offers two starting points. `npx sv create` is the official CLI for **SvelteKit** projects; its
templates (`minimal`, `demo`, `library`) all create SvelteKit apps, and its add-ons set up Prettier, ESLint,
Vitest, Playwright, Tailwind, Drizzle and more. Tasklet is a single page with no routing, no server
rendering and no server code, so SvelteKit's router, file conventions and adapters would add nothing. For
that case, Svelte's documentation points to Vite's template:

```console
$ cd tasklet
$ npm create vite@latest svelte -- --template svelte-ts

> npx
> 'cva' svelte --template svelte-ts


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/svelte...
│
└  Done. Now run:

  cd svelte
  npm install
  npm run dev
```

The generated project (`.gitignore`, `README.md` and `.vscode/` left out):

```text
svelte/
├── index.html             <div id="app"> + <script type="module" src="/src/main.ts">
├── package.json           svelte, vite, @sveltejs/vite-plugin-svelte, svelte-check, typescript
├── svelte.config.js       compiler options (empty)
├── vite.config.ts         plugins: [svelte()]
├── tsconfig.json          references tsconfig.app.json and tsconfig.node.json
├── public/                favicon.svg, icons.svg
└── src/
    ├── main.ts            mount(App, { target: … })
    ├── App.svelte         demo page
    ├── app.css
    ├── assets/            images for the demo
    └── lib/Counter.svelte a demo component
```

Tasklet deletes the demo files and keeps the configuration. Components go in PascalCase `.svelte` files.
Shared reactive logic goes in `.svelte.ts` modules; in SvelteKit, shared code lives in `src/lib/`.

### Anatomy of a component

A `.svelte` file has an optional `<script>` (with `lang="ts"` for TypeScript), the markup, and an optional
`<style>` whose rules are scoped to the component automatically. There's no `export default` and no
wrapper function: the file *is* the component. Markup syntax:

| Syntax | Meaning | In Tasklet |
| --- | --- | --- |
| `{expr}` | text or attribute value | `{countLabel(tasks)}`, `disabled={!anyDone}` |
| `{name}` shorthand | `name={name}` | `<TaskItem {task} …>` |
| `onclick={fn}` | DOM event listener (an ordinary attribute) | `onclick={load}` |
| `{#if}` / `{:else if}` / `{:else}` | conditional block | loading, error, empty, list |
| `{#each list as item (key)}` | keyed list | the task list |
| `bind:value`, `bind:checked`, `bind:prop` | two-way binding | the input, the filter |
| `{#snippet name(args)}` / `{@render name(args)}` | reusable piece of markup | not needed; see "Beyond Tasklet" |
| `class={[…]}` | class from an array or object (since 5.16) | `TaskItem`'s `<li>` |

## Building Tasklet in Svelte

`tasklet/svelte/` has the same seven source files as the other versions: `main.ts`, `App.svelte`, three
components in `src/components/`, and `tasks.ts` and `storage.ts` copied unchanged from the React version
(the types `Task` and `Filter`, the helpers `visibleTasks` and `countLabel`, and `loadSavedTasks`,
`saveTasks` and `fetchTasks`). `tasklet.css` and `tasks.json` come from `tasklet/shared/`.

### `package.json` and type checking

```json
{
  "name": "tasklet-svelte",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4304 --strictPort",
    "build": "npm run check && vite build",
    "preview": "vite preview --port 4304 --strictPort",
    "check": "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "7.3.1",
    "@tsconfig/svelte": "5.0.8",
    "@types/node": "24.19.2",
    "svelte": "5.57.3",
    "svelte-check": "4.7.8",
    "typescript": "6.0.3",
    "vite": "8.3.5"
  }
}
```

Everything is a dev dependency: Svelte is a compiler, and the runtime helpers it imports end up in the
bundle. Two changes from the template matter. The template's `build` script is plain `vite build`, which
compiles components but does **not** type-check them (the compiler strips TypeScript without checking it).
The template provides a separate `check` script running `svelte-check`, so Tasklet's `build` runs `check`
first, and a type error fails the build. Second, the imports use explicit `.ts` extensions
(`'./tasks.ts'`), as in the other Tasklet versions, so `tsconfig.app.json` gets one extra option:

`tasklet/svelte/tsconfig.app.json` (excerpt)

```json
    "noEmit": true,
    "allowImportingTsExtensions": true,
```

As in the Vue chapter, TypeScript is 6.0.3 rather than 7.0: `svelte-check` 4.7 requires TypeScript 5 or 6,
and uses the native TypeScript 7 compiler only behind a `--tsgo` flag, with TypeScript 6 installed
alongside.

### `main.ts`

```ts
import { mount } from 'svelte'
import App from './App.svelte'
import './tasklet.css'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
```

In Svelte 5, components are functions, and `mount` renders one into a target element. (Svelte 4 used
`new App({ target })`.)

### `App.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import FilterBar from './components/FilterBar.svelte'
  import TaskForm from './components/TaskForm.svelte'
  import TaskItem from './components/TaskItem.svelte'
  import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
  import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  let tasks = $state<Task[] | null>(loadSavedTasks())
  let failed = $state(false)
  let filter = $state<Filter>('all')

  const visible = $derived(visibleTasks(tasks ?? [], filter))
  const anyDone = $derived(tasks?.some((task) => task.done) ?? false)

  async function load() {
    failed = false
    try {
      tasks = await fetchTasks()
    } catch {
      failed = true
    }
  }

  onMount(() => {
    if (tasks === null) load()
  })

  // Save after every change. saveTasks() stringifies the list, which reads
  // every task, so the effect depends on all of them.
  $effect(() => {
    if (tasks !== null) saveTasks(tasks)
  })

  function add(title: string) {
    tasks?.push({ id: crypto.randomUUID(), title, done: false })
  }

  function remove(id: string) {
    tasks = tasks?.filter((task) => task.id !== id) ?? null
  }

  function clearDone() {
    tasks = tasks?.filter((task) => !task.done) ?? null
  }
</script>

<main class="tasklet">
  <h1>Tasklet</h1>
  <TaskForm onadd={add} />
  <FilterBar bind:filter />
  {#if failed}
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" onclick={load}>Retry</button>
  {:else if tasks === null}
    <p role="status">Loading tasks…</p>
  {:else if visible.length === 0}
    <p class="empty">Nothing to show.</p>
  {:else}
    <ul class="tasks" aria-label="Tasks">
      {#each visible as task (task.id)}
        <TaskItem {task} ontoggle={() => (task.done = !task.done)} onremove={() => remove(task.id)} />
      {/each}
    </ul>
  {/if}
  {#if tasks !== null}
    <footer class="footer">
      <p class="count" aria-live="polite">{countLabel(tasks)}</p>
      <button type="button" class="clear" disabled={!anyDone} onclick={clearDone}>Clear done</button>
    </footer>
  {/if}
</main>
```

The structure matches the Vue version almost line for line. How each requirement maps to Svelte:

- **Local state.** `tasks`, `failed` and `filter` are `$state`. They're plain variables in the code:
  `failed = true` is an update. A saved list is used at once, without a loading state or a fetch.
- **Derived state.** `visible` and `anyDone` are `$derived`. A plain `const` would be computed once and
  never again; Exercise 2 shows what the compiler does with that mistake.
- **Async loading.** `load()` assigns as it goes. `onMount` starts it when the component is in the page,
  and Retry calls it again. The component's script runs once, so there's no risk of a double fetch.
- **Mutation.** `add` pushes onto the array, and the toggle handler flips `task.done` directly: `task`
  comes from `{#each}` over a `$state` array, so it's a Proxy and the write is tracked. `remove` and
  `clearDone` assign a new array.
- **Persistence.** `$effect` runs after the component mounts and again after any change to what it read.
  It reads `tasks` and, through `JSON.stringify` inside `saveTasks`, every property of every task, so any
  change to the list re-runs it. Svelte batches changes: several writes in one event handler cause one
  save. Unlike Vue's `watch`, you don't say what to watch or how deeply; the effect tracks what it actually
  reads. The flip side: an effect that reads nothing reactive, or reads it only after an `await`, never
  re-runs.
- **Conditional rendering and lists.** `{#if}` blocks need no wrapper element, and `{#each … (task.id)}`
  is keyed: Svelte moves, adds and removes the `<li>`s by key.
- **Events from child to parent.** Children receive callbacks as ordinary props (`onadd`, `ontoggle`,
  `onremove`), named like DOM events by convention. Svelte 4's `createEventDispatcher` still works but is
  deprecated.
- **Two-way binding.** `<FilterBar bind:filter />` is shorthand for `bind:filter={filter}`: the child may
  assign to its `filter` prop, and the assignment flows back to the parent's state.

### `TaskForm.svelte`

```svelte
<script lang="ts">
  let { onadd }: { onadd: (title: string) => void } = $props()

  let title = $state('')

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    onadd(trimmed)
    title = ''
  }
</script>

<form aria-label="Add task" class="add" onsubmit={submit}>
  <label for="new-task">New task</label>
  <input id="new-task" bind:value={title} name="title" autocomplete="off" />
  <button type="submit">Add</button>
</form>
```

`$props()` returns the props object, destructured and typed with an ordinary TypeScript annotation. The
event handler is the `onsubmit` attribute; Svelte 5 has no event modifiers, so `submit` calls
`preventDefault()` itself. `bind:value={title}` keeps the input and the state in sync both ways, which is
how `title = ''` clears the field.

### `TaskItem.svelte`

```svelte
<script lang="ts">
  import type { Task } from '../tasks.ts'

  interface Props {
    task: Task
    ontoggle: () => void
    onremove: () => void
  }

  let { task, ontoggle, onremove }: Props = $props()
</script>

<li class={['task', task.done && 'done']}>
  <label>
    <input type="checkbox" checked={task.done} onchange={ontoggle} /> <span>{task.title}</span>
  </label>
  <button type="button" class="delete" aria-label={`Delete "${task.title}"`} onclick={onremove}>×</button>
</li>
```

An `interface Props` is the usual way to type props when there are several. `class` accepts an array, and
falsy entries are dropped, so `done` appears only for finished tasks. The `aria-label` is a template
literal inside braces, so the double quotes need no escaping. The child doesn't change the task; it calls
the parent's callbacks. In development, Svelte warns when a child mutates state it doesn't own unless the
prop is bindable.

### `FilterBar.svelte`

```svelte
<script lang="ts">
  import type { Filter } from '../tasks.ts'

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
  ]

  // $bindable: the parent may write <FilterBar bind:filter />.
  let { filter = $bindable() }: { filter: Filter } = $props()
</script>

<div role="group" aria-label="Filter" class="filters">
  {#each FILTERS as { value, label } (value)}
    <button type="button" aria-pressed={value === filter} onclick={() => (filter = value)}>
      {label}
    </button>
  {/each}
</div>
```

Props are one-way unless the child marks them `$bindable()`. Then `filter = value` updates the local
prop and, because the parent used `bind:filter`, the parent's `$state` too. It's the same contract as Vue's
`defineModel`. Boolean `aria-pressed` values render as `"true"` and `"false"`. The manifest,
`tasklet/svelte/tasklet.json`, is the same as Vue's apart from the name and port 4304, and skips no tests.

### Build it and run it

```console
$ cd tasklet/svelte
$ npm ci
$ npm run build

> tasklet-svelte@0.0.0 build
> npm run check && vite build


> tasklet-svelte@0.0.0 check
> svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json

Loading svelte-check in workspace: /home/tbangma/learn-web-frameworks/tasklet/svelte
Getting Svelte diagnostics...

svelte-check found 0 errors and 0 warnings
vite v8.3.5 building client environment for production...
transforming...
✓ 115 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.40 kB │ gzip:  0.27 kB
dist/assets/index-BeKL5seo.css   2.38 kB │ gzip:  0.95 kB
dist/assets/index-CUMpr2XS.js   42.48 kB │ gzip: 16.71 kB

✓ built in 205ms
$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-CUMpr2XS.js     42.48 kB    16.53 kB
index.html                    0.40 kB     0.28 kB
total                        45.27 kB    17.76 kB
```

The 115 modules are mostly small files from `svelte/internal`; the bundler keeps only the helpers the
compiled components import. The whole build takes about 2.1 seconds, most of it `svelte-check`. At
17.76 kB gzipped, Svelte Tasklet is a quarter of React's 70.14 kB and under two-thirds of Vue's 28.37 kB,
and the source is the shortest so far at 194 lines. Then the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs svelte
=== Svelte (tasklet/svelte, port 4304) ===
…
Running 15 tests using 15 workers

  ✓  10 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (437ms)
  ✓   1 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (513ms)
  …
  ✓   9 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (873ms)
  ✓  15 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (2.0s)

Summary
app     port  build  passed  failed  skipped  note
svelte  4304  ok     15      0       0
```

All 15 pass. `npm audit` reports two low-severity advisories in `deepmerge`, a dependency of the Vite
plugin with no fix available yet; it runs only at build time, not in the shipped app.

## Beyond Tasklet

### Shared state in `.svelte.ts` modules

Runes work in modules whose names end in `.svelte.ts` or `.svelte.js`, so state can live outside any
component and be shared by importing it. Svelte 4 used *stores* for this: objects with a `subscribe`
method from `svelte/store` (`writable`, `readable`, `derived`), read in components with a `$` prefix
(`$count`). Stores still work and remain the contract many libraries implement, but a class with `$state`
fields usually does the job with less ceremony. One rule applies: a module can't export a `$state` variable
that it reassigns, because importing files can't see the reassignment. Export an object or class instance
and change its properties instead. Exercise 4 moves Tasklet's list into such a module, and
[Chapter 16](16-state-routing-and-data.md) compares this with Pinia, Zustand and other stores.

### Snippets instead of slots

Svelte 4 passed markup into a component with `<slot />`, named slots and `let:` directives. Svelte 5
replaces them with **snippets**: named pieces of markup declared with `{#snippet name(params)}` and
rendered with `{@render name(args)}`. A snippet declared inside a component's tags becomes a prop of that
component, and content without a snippet becomes the `children` prop. Because snippets are values, you can
type them (`Snippet<[Task]>`), check whether one was passed, and pass them on. Tasklet needs none, since
each component renders its own markup, but a reusable list would accept one snippet per item and one for
the empty state. Exercise 5 builds that.

### Newer Svelte 5 features

Svelte 5 has kept adding features in minor releases. The ones you are most likely to meet, as of
November 2026:

| Version | Date | Feature |
| --- | --- | --- |
| 5.3 | December 2024 | `<svelte:boundary>` error boundaries, later with a `pending` snippet for async content |
| 5.16 | December 2024 | `class` accepts arrays and objects, as in Tasklet |
| 5.29 | May 2025 | **attachments**: `{@attach fn}` on an element runs `fn(element)` and its cleanup, replacing most `use:` actions |
| 5.36 | July 2025 | `await` in component scripts, `$derived` and markup, behind `experimental.async` |
| 5.40 | October 2025 | `createContext()` for type-safe context (5.57 added a `has` check) |
| 5.42 | October 2025 | experimental `fork` API for preparing state changes in the background, such as preloading |
| 5.56 | May 2026 | declaration tags: `{let open = $state(false)}` directly in markup, for example per `{#each}` item |
| 5.57 | August 2026 | `SvelteMap.getOrInsert`, `defaultValue` on `<select>` |

**Asynchronous Svelte** is the largest change and is still experimental. With the compiler option
`experimental: { async: true }`, a component's script can `await` at the top level:

`examples/ch06/async/Tasks.svelte`

```svelte
<script lang="ts">
  const response = await fetch('./tasks.json')
  const tasks: { id: string; title: string }[] = await response.json()
</script>

<ul>
  {#each tasks as task (task.id)}
    <li>{task.title}</li>
  {/each}
</ul>
```

Without the option, the compiler refuses:

```console
$ node compile.mjs async/Tasks.svelte
…
[InternalCompileError: Cannot use `await` in deriveds and template expressions, or at the top level of a component, unless the `experimental.async` compiler option is `true`
```

With `--async`, it compiles, and the output imports `svelte/internal/flags/async` and wraps the awaits in
`$.run([...])`. The nearest `<svelte:boundary>` shows its `pending` snippet until the first result
arrives, and `$effect.pending()` reports work in flight. The documentation says the flag will be removed
in Svelte 6. Tasklet keeps the explicit `load()` function, because the spec requires a Retry button that
re-runs the fetch and a loading state you can test.

**Attachments** are functions that receive an element when it mounts and may return a cleanup:

`examples/ch06/attach/AutoFocus.svelte`

```svelte
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  let title = $state('')

  // Runs when the element is mounted; the returned function runs when it is removed.
  const autofocus: Attachment<HTMLInputElement> = (input) => {
    input.focus()
    return () => console.log('input removed')
  }
</script>

<input {@attach autofocus} bind:value={title} aria-label="New task" />
```

Unlike Svelte 4 actions, an attachment runs inside an effect, so it re-runs when state it reads changes, and
it can be passed through components as a prop.

### SvelteKit, testing and tooling

**SvelteKit** is the official application framework: file-based routing with `+page.svelte` and
`+layout.svelte`, `load` functions, form actions, server rendering, prerendering and adapters for Node,
static hosting, Vercel, Cloudflare and Netlify. SvelteKit 3 shipped in October 2026; remote functions
(typed server functions) are still experimental. [Chapter 18](18-meta-frameworks-and-rendering.md) covers it.
Create a project with `npx sv create my-app --template minimal --types ts`.

For tests, the `sv` CLI adds Vitest (unit and component tests) and Playwright. `svelte-check` runs the
same diagnostics as the editor extension, which is built on the Svelte language server. There's no
dedicated official devtools extension; `$inspect` logs state changes, and the compiler's warnings
(accessibility checks included) appear in the terminal and the editor.

## Strengths and trade-offs

| Strengths | Trade-offs |
| --- | --- |
| Small bundles: Tasklet is 17.76 kB gzipped, the smallest framework build so far | The compiler is required: no `.svelte` without a build step, and runes only in compiler-processed files |
| Little boilerplate: state is a variable, updates are assignments, props are destructured | The magic hides the signals: a `$state` passed out of a function or destructured loses reactivity in ways the syntax doesn't show |
| Fine-grained updates with no virtual DOM and no re-render to optimize | The Svelte 4 to 5 change was large: tutorials, answers and libraries written for `let`/`$:`/slots are now legacy |
| Scoped CSS, transitions and animations built in | Smaller ecosystem and job market than React's or Vue's; fewer component libraries |
| `.svelte.ts` modules give shared state without a store library | Experimental features (async, `fork`, remote functions) are a moving target |
| Good TypeScript support since Svelte 5, with `svelte-check` and the language server | `vite build` doesn't type-check; you must wire `svelte-check` into the build yourself, and TypeScript 7 needs `svelte-check --tsgo` |

## Compared with React and Vue

All three Tasklets have the same component tree. The differences show in the lines that change state. A
toggle in React builds a new array; in Vue the parent's `toggle` function mutates the task; in Svelte the
mutation is inline:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

`tasklet/vue/src/App.vue` (excerpt)

```ts
function toggle(task: Task) {
  task.done = !task.done
}
```

`tasklet/svelte/src/App.svelte` (excerpt)

```svelte
        <TaskItem {task} ontoggle={() => (task.done = !task.done)} onremove={() => remove(task.id)} />
```

Persistence uses three different ideas. React's effect lists its dependency; Vue's watcher names its
source and asks for a deep look; Svelte's effect discovers what it reads:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  useEffect(() => {
    if (tasks !== null) saveTasks(tasks)
  }, [tasks])
```

`tasklet/vue/src/App.vue` (excerpt)

```ts
watch(
  tasks,
  (current) => {
    if (current !== null) saveTasks(current)
  },
  { deep: true },
)
```

`tasklet/svelte/src/App.svelte` (excerpt)

```svelte
  $effect(() => {
    if (tasks !== null) saveTasks(tasks)
  })
```

And two-way binding on the filter: React passes `filter` and `onChange`; Vue uses `v-model` with
`defineModel`; Svelte uses `bind:filter` with `$bindable`. The update models differ too. React re-renders
`App` and its children and diffs them; Vue re-renders the components whose dependencies changed and diffs
those; Svelte re-runs only the effects that read the changed values and touches only their nodes. The
build sizes follow: 70.14 kB, 28.37 kB and 17.76 kB gzipped. [Appendix A](appendix-a-rosetta-stone.md) has
the full side-by-side table.

## Summary

- Svelte is a compiler. `.svelte` files become JavaScript that clones HTML templates and creates one small
  effect per dynamic part; a component's script runs once, and there is no virtual DOM.
- Svelte 5's runes are compiler instructions: `$state` (deeply reactive Proxies for objects and arrays),
  `$derived`, `$effect`, `$props` and `$bindable`. They replaced Svelte 4's top-level `let`, `$:` and
  `export let`, which still compile in legacy mode.
- Events are attributes (`onclick`) and callback props (`onadd`); two-way binding is `bind:value` or
  `bind:prop` with a `$bindable` prop.
- `npm create vite@latest svelte -- --template svelte-ts` makes a plain SPA; `npx sv create` makes a
  SvelteKit app. The Vite template's build doesn't type-check, so Tasklet's build runs `svelte-check` first.
  Svelte Tasklet is 194 lines, 17.76 kB gzipped and passes all 15 tests.
- Shared state lives in `.svelte.ts` modules; snippets replace slots; attachments replace most actions.
  `await` in components is available behind `experimental.async`.

## Exercises

1. **Server output.** Svelte also compiles components for server-side rendering. Run
   `node compile.mjs Counter.svelte server` in `examples/ch06/` and compare the result with the client
   output above. What's missing, and why?

   <details><summary>Solution</summary>

   ```console
   $ node compile.mjs Counter.svelte server
   import * as $ from 'svelte/internal/server';

   export default function Counter($$renderer) {
   	let count = 0;
   	const double = $.derived(() => count * 2);

   	$$renderer.push(`<button type="button">${$.escape(count)} × 2 = ${$.escape(double())}</button>`);
   }
   ```

   The server version builds a string. `count` is a plain variable instead of a signal, the click handler
   is gone, and there are no effects: on the server the component renders once and nothing can change it.
   Values are escaped into the HTML. The browser then *hydrates* that HTML with the client output, which
   attaches the listener and the effects ([Chapter 18](18-meta-frameworks-and-rendering.md) explains
   hydration). One component, two compilation targets: that's how SvelteKit renders on the server without
   shipping a server renderer to the browser.

   </details>

2. **Forget `$derived`.** `examples/ch06/derived/Count.svelte` counts the tasks left with a plain `const`.
   What does the paragraph show after you tick a checkbox? Compile it and look at the generated code for
   `left`, then fix it.

   ```svelte
   <script lang="ts">
     let tasks = $state([
       { title: 'Read the Vue chapter', done: false },
       { title: 'Try Svelte runes', done: false },
     ])
     const left = tasks.filter((task) => !task.done).length
   </script>

   <ul>
     {#each tasks as task (task.title)}
       <li><label><input type="checkbox" bind:checked={task.done} /> {task.title}</label></li>
     {/each}
   </ul>
   <p>{left} left</p>
   ```

   <details><summary>Solution</summary>

   It shows "2 left" forever. The compiled code makes that visible:

   ```console
   $ node compile.mjs derived/Count.svelte
   …
   	const left = tasks.filter((task) => !task.done).length;
   …
   	$.template_effect(() => $.set_text(text_1, `${left ?? ''} left`));
   ```

   `left` is computed once, when the component's script runs. The template effect reads `left`, a plain
   number, so it has no signal to subscribe to and never runs again. The compiler gives no warning here,
   because nothing is wrong syntactically. Wrapping the expression in `$derived`
   (`examples/ch06/derived/CountFixed.svelte`) turns it into a signal:

   ```console
   $ node compile.mjs derived/CountFixed.svelte
   …
   	const left = $.derived(() => tasks.filter((task) => !task.done).length);
   …
   	$.template_effect(() => $.set_text(text_1, `${$.get(left) ?? ''} left`));
   ```

   Now the effect reads `$.get(left)`, and `left` reads every `done` flag through the Proxy, so ticking a
   box updates the count. Svelte 4 behaved the same way, where only `$:` made such a line reactive. In
   Svelte 5 the rule is simpler to state: only runes create reactivity.

   </details>

3. **Migrate a Svelte 4 component.** `examples/ch06/legacy/TaskItem.svelte` is Tasklet's `TaskItem` in
   Svelte 4 style, with `export let`, `$:`, `on:` and `createEventDispatcher`. Run Svelte's migration on
   it (`node migrate.mjs legacy/TaskItem.svelte`). What did it change, and what is left for you?

   ```svelte
   <script lang="ts">
     import { createEventDispatcher } from 'svelte'
     import type { Task } from '../tasks.ts'

     export let task: Task

     const dispatch = createEventDispatcher<{ toggle: null; remove: null }>()

     $: label = `Delete "${task.title}"`
   </script>

   <li class="task" class:done={task.done}>
     <label>
       <input type="checkbox" checked={task.done} on:change={() => dispatch('toggle')} /> <span>{task.title}</span>
     </label>
     <button type="button" class="delete" aria-label={label} on:click={() => dispatch('remove')}>×</button>
   </li>
   ```

   <details><summary>Solution</summary>

   ```console
   $ node migrate.mjs legacy/TaskItem.svelte
   <script lang="ts">
     import { createEventDispatcher } from 'svelte'
     import type { Task } from '../tasks.ts'

     interface Props {
       task: Task;
     }

     let { task }: Props = $props();

     const dispatch = createEventDispatcher<{ toggle: null; remove: null }>()

     let label = $derived(`Delete "${task.title}"`)
   </script>

   <li class="task" class:done={task.done}>
     <label>
       <input type="checkbox" checked={task.done} onchange={() => dispatch('toggle')} /> <span>{task.title}</span>
     </label>
     <button type="button" class="delete" aria-label={label} onclick={() => dispatch('remove')}>×</button>
   </li>
   ```

   The migration turned `export let` into `$props()` with a `Props` interface, the `$:` into `$derived`
   (it recognized a pure derived value, not a side effect), and `on:change`/`on:click` into `onchange` and
   `onclick`. It left `createEventDispatcher` alone, because replacing an event with a callback prop
   changes the component's API for every parent. Finishing by hand means adding `ontoggle` and `onremove`
   to `Props`, calling them instead of `dispatch`, and changing the parents from `on:toggle` to `ontoggle`.
   The result is `tasklet/svelte/src/components/TaskItem.svelte`. `class:done` still works in Svelte 5;
   Tasklet uses the newer array form.

   </details>

4. **Shared state in a `.svelte.ts` module.** Move the task list, its loading state, persistence and
   operations out of `App.svelte` into `src/tasks.svelte.ts`, so any component could import them. Keep the
   filter in `App`.

   <details><summary>Solution</summary>

   `examples/ch06/shared-state/tasks.svelte.ts`

   ```ts
   // Exercise 4: Tasklet's state in a .svelte.ts module. Any component that imports
   // `tasks` shares the same reactive state. Copy to tasklet/svelte/src/.
   import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
   import type { Task } from './tasks.ts'

   class TaskStore {
     // null until the tasks are loaded, from localStorage (right away) or tasks.json.
     list = $state<Task[] | null>(loadSavedTasks())
     failed = $state(false)
     anyDone = $derived(this.list?.some((task) => task.done) ?? false)

     // Arrow functions keep `this` when passed as callbacks: onclick={tasks.load}.
     load = async () => {
       this.failed = false
       try {
         this.list = await fetchTasks()
       } catch {
         this.failed = true
       }
     }

     add = (title: string) => {
       this.list?.push({ id: crypto.randomUUID(), title, done: false })
     }

     remove = (id: string) => {
       this.list = this.list?.filter((task) => task.id !== id) ?? null
     }

     clearDone = () => {
       this.list = this.list?.filter((task) => !task.done) ?? null
     }
   }

   export const tasks = new TaskStore()

   // A module has no component to own its effects, so create a root for them.
   $effect.root(() => {
     $effect(() => {
       if (tasks.list !== null) saveTasks(tasks.list)
     })
   })
   ```

   A class is the natural shape: `$state` and `$derived` work as class fields, and the module exports one
   instance whose properties change, which sidesteps the rule against exporting reassigned state. Methods
   are arrow functions so `onclick={tasks.load}` keeps `this`. An `$effect` normally belongs to the
   component that created it and stops when it unmounts; at module level there is no component, so
   `$effect.root` creates a root that lives as long as the page. `App.svelte`
   (`examples/ch06/shared-state/App.svelte`) imports `tasks` and uses `tasks.list`, `tasks.add` and so
   on; its script shrinks to the filter, `visible` and `onMount`. With both files copied into
   `tasklet/svelte/src/`, `node run-all.mjs svelte` reports `svelte  4304  ok  15  0  0`.

   </details>

5. **A list with snippets.** Write a `TaskList` component that renders the `<ul>` and takes two snippets:
   `item`, called for each task, and an optional `empty`, rendered instead of the default "Nothing to
   show." paragraph. Use it from a parent that supplies both.

   <details><summary>Solution</summary>

   `examples/ch06/snippets/TaskList.svelte`

   ```svelte
   <script lang="ts">
     import type { Snippet } from 'svelte'
     import type { Task } from '../tasks.ts'

     interface Props {
       tasks: Task[]
       item: Snippet<[Task]>
       empty?: Snippet
     }

     let { tasks, item, empty }: Props = $props()
   </script>

   {#if tasks.length === 0}
     {#if empty}{@render empty()}{:else}<p class="empty">Nothing to show.</p>{/if}
   {:else}
     <ul class="tasks" aria-label="Tasks">
       {#each tasks as task (task.id)}
         {@render item(task)}
       {/each}
     </ul>
   {/if}
   ```

   `examples/ch06/snippets/Demo.svelte`

   ```svelte
   <script lang="ts">
     import TaskList from './TaskList.svelte'
     import type { Task } from '../tasks.ts'

     let tasks = $state<Task[]>([{ id: '1', title: 'Try snippets', done: false }])
   </script>

   <TaskList {tasks}>
     {#snippet item(task: Task)}
       <li class={['task', task.done && 'done']}>
         <label><input type="checkbox" bind:checked={task.done} /> <span>{task.title}</span></label>
       </li>
     {/snippet}
     {#snippet empty()}
       <p class="empty">All clear.</p>
     {/snippet}
   </TaskList>
   ```

   Snippets declared between a component's tags become props with the same names, which the compiled
   `Demo` shows (`node compile.mjs snippets/Demo.svelte`):

   ```console
   		TaskList($$anchor, {
   			get tasks() {
   				return tasks;
   			},
   			item,
   			empty,
   			$$slots: { item: true, empty: true }
   		});
   ```

   `Snippet<[Task]>` types the argument, so `svelte-check` rejects `{@render item()}` without a task, and
   `{#if empty}` tests whether the parent passed one. Note also the getter for `tasks`: props are passed
   as getters, so the child reads the parent's current value lazily and stays reactive without copying.
   Running `svelte-check` over the examples folder reports no errors in either file.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-6--svelte)
