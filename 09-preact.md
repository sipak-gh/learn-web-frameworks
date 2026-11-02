# Chapter 9 — Preact

Preact gives you React's API, function components, hooks and JSX, in a runtime about a tenth the size. For
ten years that was the whole pitch. Today Preact has a second identity: it's the home of **Preact Signals**,
a signals library that plugs into the renderer so deeply that a state change can update one text node
without calling a single component. This chapter builds Tasklet the way Preact's own docs now recommend,
with signals for the state, and puts the result next to the React version from [Chapter 4](04-react.md):
the code, the bundle and how many components each action re-renders. Then it looks at what Tasklet doesn't
use: `preact/compat` for running React libraries, what changed in Preact 11, and the meta-frameworks that
build on Preact, Fresh among them.

## At a glance

| | |
| --- | --- |
| First released | September 2015 (10.0 in October 2019, 11.0 on September 30, 2026) |
| Current version | 11.1.1 (October 31, 2026); `@preact/signals` 2.11.4 |
| Created by / maintained by | Jason Miller; an open-source core team in the `preactjs` GitHub organization, with no company owning the project |
| License | MIT |
| Rendering model | Virtual DOM, diffed against the previous virtual tree; real DOM events, no synthetic event system |
| Reactivity model | Like React (state and hooks re-render a component and its children), plus Preact Signals: components subscribe to the signals they read, and signals passed into JSX update text and attributes directly |
| Templates | JSX; or HTM tagged templates without a build step |
| Language | TypeScript or JavaScript |
| Tasklet build size | 11.74 kB gzip (29.60 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | Fresh (Deno), Astro's Preact integration, `preact-iso` for routing and prerendering ([Chapter 18](18-meta-frameworks-and-rendering.md)) |
| Good fit for | Apps that want React's model and much of its ecosystem with a small bundle; widgets embedded in other pages; server-rendered sites with islands |

## Why it exists

Jason Miller released Preact in September 2015, two years into React's rise, with a simple question: how
small could a library with React's API be? The answer was a few kilobytes. Instead of React's layered
architecture (a reconciler shared across platforms, a separate DOM renderer, a synthetic event system that
normalized browser differences), Preact did one thing, diffing a virtual tree into the browser DOM, and used
the DOM's own features wherever it could. The scaffolding tool still opens with the project's tagline,
"Fast 3kB alternative to React with the same modern API".

Preact is not a React clone, and it says so:

> Preact is not intended to be a reimplementation of React. There are differences.
>
> — Preact documentation, "Differences to React"

The differences are what make it small. A thin optional layer, `preact/compat`, papers over most of them so
React libraries run unchanged. Preact X (10.0, 2019) added hooks, fragments and that compat layer, and
stayed the current major for seven years. In September 2022 the team released **Preact Signals**, and it has
grown into the most distinctive part of the project: `@preact/signals` integrates with Preact's renderer,
`@preact/signals-react` brings the same API to React, and `@preact/signals-core` works with no framework at
all. Preact 11 arrived on September 30, 2026; the release post opens with "The Road to Preact 11 ticket was
started over six years ago".

On npm, `preact` was downloaded 53.8 million times in the week of October 26 to November 1, 2026: a fifth of
`react`, but more than twice `vue`. A large share of that comes through other tools that embed it, so it is
used far more widely than it is chosen.

## The mental model

### React's model, in fewer layers

Without signals, a Preact app works exactly like the React model from Chapter 4. State lives in hooks
(`useState`, `useReducer`) imported from `preact/hooks`. A state change re-renders the component and its
children; Preact diffs the new virtual tree against the old one and patches the DOM. Keys match list items.
Effects run after the DOM is updated. Most of what [the React course](../learn-react/README.md) teaches
about components, hooks and their rules applies unchanged.

The differences are under the hood:

- **No synthetic events.** React attaches listeners at the root and dispatches its own event objects.
  Preact calls `addEventListener` on the element itself, with one small proxy function per event name that
  looks up your current handler, so swapping handlers between renders costs nothing. Your handler receives
  the browser's real `Event`. `onClick` becomes a `click` listener, `onInput` an `input` listener, and
  `onChange` the DOM's `change` event, which for a text field fires only when the value is *committed* (on
  blur or Enter), not on every keystroke. That is why Preact code uses `onInput`.
- **Props are DOM properties or attributes.** Preact checks whether the element has a property with the
  prop's name and sets it; otherwise it sets the attribute. `class` and `for` work as written, so do
  `className` and `htmlFor`, and custom elements get their properties set directly.
- **One renderer, no scheduler.** Updates are batched into a microtask and rendered synchronously. There is
  no Fiber architecture, no time slicing and no concurrent rendering, and so no `startTransition` that
  actually defers work. Fewer features, much less code.
- **Old tree against new tree.** Each virtual node keeps a reference to its DOM node, and the diff walks
  both trees together. A component that returns the *same* vnode object as last time is skipped outright,
  which is what Signals' `For` relies on below.

### Signals on top

A **signal** is an object with a `.value`. Reading `.value` inside a component *subscribes* that component;
writing it re-renders only the subscribers. A **computed** derives a value from other signals and is only
recalculated when they change; an **effect** runs whenever the signals it read change. Chapter 15 covers the
algorithm; here, what matters is how Preact uses it. There are three ways a signal can reach the screen:

```text
               ┌────────────────────────────────────────────────────────────┐
  signal ──┬──►│ read as sig.value in a component body                      │
           │   │   → that component re-renders (virtual DOM diff, as usual) │
           │   └────────────────────────────────────────────────────────────┘
           │   ┌────────────────────────────────────────────────────────────┐
           ├──►│ passed into JSX as text: <p>{sig}</p>                       │
           │   │   → Preact binds it to one Text node; no component renders │
           │   └────────────────────────────────────────────────────────────┘
           │   ┌────────────────────────────────────────────────────────────┐
           └──►│ passed as a DOM prop: <input value={sig} />                │
               │   → Preact sets that one property; no component renders    │
               └────────────────────────────────────────────────────────────┘
```

The guide's own summary of the point:

> The signal can be updated without re-rendering any components, since components see the signal and not
> its value.
>
> — Preact documentation, "Signals"

So the same app can sit anywhere between React-style re-rendering and fine-grained updates, decided line
by line by whether you write `{count}` or `{count.value}`. That makes it easy to adopt and easy to get
subtly wrong; the render counts below show both.

## Code structure

### Scaffolding

Preact has an official initializer, `create-preact`, and the Preact docs recommend it. create-vite has
`preact` and `preact-ts` templates too, but its own Preact menu lists "Official Preact Starter ↗", which
runs `npm create preact@latest`, so this chapter uses that. (The create-vite template works fine: it's a
Vite project with `@preact/preset-vite` and `tsc -b` in the build. The difference is that `create-preact`
offers a router and prerendering.)

`create-preact` 0.6.0 has no flags for its choices, only prompts:

```console
$ npm create preact@latest preact

> npx
> 'create-preact' preact

┌  Preact - Fast 3kB alternative to React with the same modern API
│
◇  Project language:
│  TypeScript
│
◇  Use router?
│  No
│
◇  Prerender app (SSG)?
│  No
│
◇  Use ESLint?
│  No
│
◇  Set up project directory
│
◇  Installed project dependencies
│
◇  Getting Started ─╮
│                   │
│  $ cd preact      │
│  $ npm run dev    │
│                   │
├───────────────────╯
│
└  You're all set!
```

"Use router?" adds `preact-iso`, Preact's small router with lazy loading. "Prerender app (SSG)?" adds
`preact-iso`'s prerendering and `preact-render-to-string`, so the build emits HTML for each route. Tasklet
needs neither.

### What you get

- `index.html` with `<div id="app">` and a module script for `src/index.tsx`.
- `vite.config.ts` with one plugin, `@preact/preset-vite`, which sets up JSX for Preact, hot module
  replacement through Prefresh, the Preact DevTools bridge in development, and aliases for `react` and
  `react-dom` to `preact/compat`.
- `tsconfig.json` with `"jsxImportSource": "preact"`, so `.tsx` files compile to Preact's JSX runtime, and
  `paths` that point `react` at `preact/compat` for the type checker too.
- Components are `.tsx` files exporting functions, as in React.

## Building Tasklet in Preact

`tasklet/preact/` has eight source files: `index.tsx`, `App.tsx`, the three components, `model.ts`, and
`tasks.ts` and `storage.ts` copied unchanged from the React version. The template's demo files (logo, demo
component, its CSS, README, `.gitignore`) were deleted; `tasklet.css` and `tasks.json` come from
`tasklet/shared/`.

**Why signals?** You could port the React version line for line: `useState` and `useEffect` exist in
`preact/hooks`, and Exercise 2 shows that the React source runs almost unchanged on `preact/compat`. That
would teach nothing new. Preact's documentation now presents signals as its recommended state solution, and
they're the feature React doesn't have, so this version puts all the state in a **model** built from
signals and keeps one hook (`useSignal`) for the form's local text.

### `package.json`

```json
{
	"name": "tasklet-preact",
	"private": true,
	"version": "0.0.0",
	"type": "module",
	"scripts": {
		"dev": "vite --port 4307 --strictPort",
		"build": "tsc && vite build",
		"preview": "vite preview --port 4307 --strictPort"
	},
	"dependencies": {
		"@preact/signals": "2.11.4",
		"preact": "11.1.1"
	},
	"devDependencies": {
		"@preact/preset-vite": "2.10.6",
		"typescript": "7.0.2",
		"vite": "8.3.5"
	}
}
```

The template's `build` script is plain `vite build`, which strips types without checking them; this
version adds `tsc &&` so a type error fails the build, as in the other Tasklet apps. The template installs
with `^` ranges; the versions here are pinned exactly. The file keeps the template's tab indentation.

### `tsconfig.json`

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"noEmit": true,
		"allowJs": true,
		"checkJs": true,
		"allowImportingTsExtensions": true,

		/* Preact Config */
		"jsx": "react-jsx",
		"jsxImportSource": "preact",
		"skipLibCheck": true,
		"paths": {
			"react": ["./node_modules/preact/compat/"],
			"react-dom": ["./node_modules/preact/compat/"],
			"react-dom/*": ["./node_modules/preact/compat/*"]
		}
	},
	"include": ["node_modules/vite/client.d.ts", "src", "vite.config.ts"]
}
```

Two changes from the template. `allowImportingTsExtensions` lets the shared files import `./tasks.ts` with
its extension, as they do in every Tasklet app. `include` was `["node_modules/vite/client.d.ts", "**/*"]`,
which would also type-check `dist/` after a build; it now lists the source and the config. There's no
`strict` line because TypeScript 7 turns strict mode on by default.

### `vite.config.ts` and `index.tsx`

The template's config, unchanged:

```ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact()],
});
```

```tsx
import { render } from 'preact'
import { App } from './App.tsx'
import './tasklet.css'

render(<App />, document.getElementById('app')!)
```

`render` replaces React's `createRoot(…).render(…)`. There's no `<StrictMode>`; in development the preset
injects `preact/debug` instead, which warns about mistakes such as missing keys or invalid nesting.

### `model.ts`

The state and everything that changes it live in one model, outside any component:

```ts
import { computed, createModel, effect, signal } from '@preact/signals'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

export type Status = 'loading' | 'error' | 'ready'

// All of Tasklet's state and logic, as signals. App creates one with useModel.
export const TaskletModel = createModel(() => {
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  const tasks = signal<Task[] | null>(loadSavedTasks())
  const failed = signal(false)
  const filter = signal<Filter>('all')

  const status = computed<Status>(() => (failed.value ? 'error' : tasks.value === null ? 'loading' : 'ready'))
  const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
  const left = computed(() => countLabel(tasks.value ?? []))
  const noneDone = computed(() => !tasks.value?.some((task) => task.done))

  // Fetch the seed tasks while loading; Retry clears `failed`, which runs it again.
  // The cleanup ignores a response that arrives after the model was disposed.
  effect(() => {
    if (status.value !== 'loading') return
    let ignore = false
    fetchTasks().then(
      (loaded) => {
        if (!ignore) tasks.value = loaded
      },
      () => {
        if (!ignore) failed.value = true
      },
    )
    return () => {
      ignore = true
    }
  })

  // Save the list to localStorage after every change.
  effect(() => {
    if (tasks.value !== null) saveTasks(tasks.value)
  })

  function update(change: (current: Task[]) => Task[]) {
    if (tasks.value !== null) tasks.value = change(tasks.value)
  }

  return {
    status,
    filter,
    visible,
    left,
    noneDone,
    add(title: string) {
      update((current) => [...current, { id: crypto.randomUUID(), title, done: false }])
    },
    toggle(id: string) {
      update((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
    },
    remove(id: string) {
      update((current) => current.filter((task) => task.id !== id))
    },
    clearDone() {
      update((current) => current.filter((task) => !task.done))
    },
    setFilter(value: Filter) {
      filter.value = value
    },
    retry() {
      failed.value = false
    },
  }
})
```

It mirrors React's `App` almost line for line, but nothing in it is a component:

- **Three signals, four computeds.** The same three pieces of state as the React version. The derived
  values that React recomputes on every render are `computed`s here, recalculated only when `tasks` or
  `filter` changes, and only if something reads them.
- **Effects without dependency lists.** The fetch effect reads `status.value`, so it re-runs whenever the
  status changes and does work only while it's `'loading'`. Retry just sets `failed` to `false`; the status
  becomes `'loading'` and the effect fetches again. Nobody declared that dependency; the effect recorded
  it by reading. The cleanup works like React's: it runs before the effect re-runs and when it's disposed.
- **Immutable updates.** A signal notifies when you assign a new value, compared with `===`. `tasks.value.push(…)`
  would change the array without assigning, and nothing would update. So the actions build new arrays,
  exactly as React's updater functions do.
- **`createModel`** (added in `@preact/signals` 2.7) wraps the factory so that every effect created inside
  belongs to the model and is disposed with it, and every method is an *action*: its writes are batched
  into one update and its reads don't subscribe anything. `useModel` creates one instance per component
  and disposes it on unmount.

Because the model is plain TypeScript, you can test it without rendering anything: `new TaskletModel()`,
call `add`, read `left.value`.

### `App.tsx`

```tsx
import { useModel } from '@preact/signals'
import { For, Show } from '@preact/signals/utils'
import { FilterBar } from './components/FilterBar.tsx'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskItem } from './components/TaskItem.tsx'
import { TaskletModel } from './model.ts'

export function App() {
  const model = useModel(TaskletModel)
  // The only .value read here: App re-renders when the status changes, not when a task does.
  const status = model.status.value

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={model.add} />
      <FilterBar filter={model.filter} onChange={model.setFilter} />
      {status === 'loading' && <p role="status">Loading tasks…</p>}
      {status === 'error' && (
        <>
          <p role="alert">Couldn't load tasks.</p>
          <button type="button" onClick={model.retry}>
            Retry
          </button>
        </>
      )}
      {status === 'ready' && (
        <>
          <Show when={() => model.visible.value.length > 0} fallback={<p class="empty">Nothing to show.</p>}>
            <ul class="tasks" aria-label="Tasks">
              <For each={model.visible} getKey={(task) => task.id}>
                {(task) => (
                  <TaskItem task={task} onToggle={() => model.toggle(task.id)} onRemove={() => model.remove(task.id)} />
                )}
              </For>
            </ul>
          </Show>
          <footer class="footer">
            <p class="count" aria-live="polite">
              {model.left}
            </p>
            <button type="button" class="clear" disabled={model.noneDone} onClick={model.clearDone}>
              Clear done
            </button>
          </footer>
        </>
      )}
    </main>
  )
}
```

Where each signal ends up decides what re-renders:

- `model.status.value` is read in the body, so `App` subscribes to the status: it renders twice in its
  life, "loading" and "ready" (or three times with an error and a retry).
- `{model.left}` passes the computed itself, so the count is a **text binding**: checking a task changes
  that one Text node and no component runs.
- `disabled={model.noneDone}` is the same thing for a DOM property.
- `model.filter` goes to `FilterBar` as a signal, not a value, so `App` never reads it.
- `Show` and `For` come from `@preact/signals/utils`. Each is a small component that reads the signal
  itself, so only it re-renders when the list changes. `For` also caches the vnode it made for each item,
  keyed by the item object, and returns the same vnode next time; Preact skips identical vnodes, so a
  `TaskItem` renders only when its own task object is new. `getKey` sets the `key` Preact uses to match
  list items, as `key={task.id}` does in React.
- `model.add`, `model.retry` and the other actions are stable functions, created once with the model, so
  passing them down doesn't need `useCallback`.

The names `Show` and `For` (and the callback-child style) come from Solid, the subject of
[Chapter 8](08-solid.md).

### `TaskForm.tsx`

```tsx
import { useSignal } from '@preact/signals'
import type { TargetedSubmitEvent } from 'preact'

interface TaskFormProps {
  onAdd: (title: string) => void
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const title = useSignal('')

  function handleSubmit(event: TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.value.trim()
    if (trimmed === '') return
    onAdd(trimmed)
    title.value = ''
  }

  // value={title} passes the signal itself: typing updates the input without re-rendering TaskForm.
  return (
    <form aria-label="Add task" class="add" onSubmit={handleSubmit}>
      <label for="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autocomplete="off"
        value={title}
        onInput={(event) => (title.value = event.currentTarget.value)}
      />
      <button type="submit">Add</button>
    </form>
  )
}
```

`useSignal('')` is a signal created once per component instance: the signals counterpart of `useState`.
The input is still controlled, but through a property binding: `onInput` writes the signal, the binding
writes the property, and `title.value = ''` after an add clears the field. `TaskForm` itself never
re-renders while you type. The handler uses `onInput` because, as above, `onChange` is the DOM's `change`
event in Preact. `TargetedSubmitEvent` types `event.currentTarget` as the form; React's types call the same
thing `SubmitEvent` and wrap a synthetic event.

### `FilterBar.tsx` and `TaskItem.tsx`

```tsx
import type { ReadonlySignal } from '@preact/signals'
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

interface FilterBarProps {
  filter: ReadonlySignal<Filter>
  onChange: (filter: Filter) => void
}

// Reads filter.value, so FilterBar (and only FilterBar) re-renders when the filter changes.
export function FilterBar({ filter, onChange }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter" class="filters">
      {FILTERS.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={value === filter.value} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  )
}
```

`FilterBar` takes the signal, typed `ReadonlySignal` so it can't write it, and reads `.value` while
rendering. Clicking a filter re-renders `FilterBar` and the list, and nothing else. `aria-pressed={false}`
renders as `aria-pressed="false"`, which is what the test expects.

`TaskItem.tsx` is the React file with two words changed: `className` became `class` (twice). The checkbox
keeps `onChange`, because for a checkbox the DOM's `change` event fires on every click, so React's and
Preact's meanings agree.

### The manifest

```json
{
  "name": "Preact",
  "port": 4307,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

### Build it and run it

```console
$ cd tasklet/e2e
$ node run-all.mjs preact

=== Preact (tasklet/preact, port 4307) ===

$ npm run build    (in /home/tbangma/learn-web-frameworks/tasklet/preact)

> tasklet-preact@0.0.0 build
> tsc && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 18 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.38 kB │ gzip: 0.28 kB
dist/assets/index-BeKL5seo.css   2.38 kB │ gzip: 0.95 kB
dist/assets/index-D_uV-bqT.js   26.82 kB │ gzip: 10.60 kB

✓ built in 57ms
…
Running 15 tests using 15 workers

  ✓   7 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (445ms)
  ✓   6 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (511ms)
  …
  ✓   5 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (997ms)
  ✓  13 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (2.1s)

Summary
app     port  build  passed  failed  skipped  note
preact  4307  ok     15      0       0
$ node ../tools/size.mjs ../preact/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-D_uV-bqT.js     26.83 kB    10.50 kB
index.html                    0.39 kB     0.28 kB
total                        29.60 kB    11.74 kB
```

All 15 tests pass with no skips, and the build, type check included, takes about 0.4 seconds. The JavaScript
is 10.50 kB gzipped, against 68.92 kB for React. Measured the same way (gzip level 9) on the package files,
that's Preact's core at 5.00 kB, hooks at 1.59 kB and Signals (`@preact/signals` plus `-core` and the
utilities) at about 4.5 kB, less what the bundler removes. The "3kB" in the tagline is generous for
Preact 11, but the order of magnitude is right.

### Who re-renders?

`examples/ch09/render-count/` is a copy of the app with one extra import: a module that hooks Preact's
documented `options.diffed` callback and counts every component vnode Preact diffs. `measure.mjs` drives the
production build with Playwright and prints the counts after each action:

```console
$ npm run build && npm run preview &
$ node measure.mjs
initial load                 {"TaskForm":2,"FilterBar":2,"App":2,"M$1":2,"TaskItem":3,"Item":4,"For":1,"Show":1,"ReactiveTextNode":1}
type 15 characters           {}
add a task                   {"Item":5,"TaskItem":1,"For":1,"Show":1}
toggle the first task        {"TaskItem":1,"Item":5,"For":1,"Show":1}
filter: Active               {"FilterBar":1,"TaskItem":2,"Item":3,"For":1,"Show":1}
clear done                   {"Item":3,"For":1,"Show":1}
```

`M$1` is Preact's `Fragment` (the build isn't minified, but the bundler renamed it), `Item` is the small
wrapper `Show` and `For` put around each child, and `ReactiveTextNode` is the component Signals uses for
`{model.left}`: it renders once, and after that the binding updates the Text node directly. `Item` is
reported even when Preact reuses its cached vnode and skips it, so the column to read is `TaskItem`:

`examples/ch09/render-count-react/` instruments the React app the same way (a `countRender()` call at the
top of each component) and runs the same script:

```console
$ node measure.mjs
initial load                 {"App":2,"TaskForm":2,"FilterBar":2,"TaskItem":3}
type 15 characters           {"TaskForm":15}
add a task                   {"App":1,"TaskForm":1,"FilterBar":1,"TaskItem":4}
toggle the first task        {"App":1,"TaskForm":1,"FilterBar":1,"TaskItem":4}
filter: Active               {"App":1,"TaskForm":1,"FilterBar":1,"TaskItem":2}
clear done                   {"App":1,"TaskForm":1,"FilterBar":1,"TaskItem":2}
```

| Action | Preact components that ran | React (no compiler) |
| --- | --- | --- |
| Type 15 characters | none | `TaskForm` 15 times |
| Add a task | `For`, `Show`, the new `TaskItem` | `App`, `TaskForm`, `FilterBar`, all 4 `TaskItem`s |
| Toggle a task | `For`, `Show`, that `TaskItem` | `App`, `TaskForm`, `FilterBar`, all 4 `TaskItem`s |
| Change the filter | `FilterBar`, `For`, `Show`, 2 `TaskItem`s | `App`, `TaskForm`, `FilterBar`, the visible `TaskItem`s |
| Clear done (count unchanged) | `For`, `Show` | `App`, `TaskForm`, `FilterBar`, the visible `TaskItem`s |

Both apps render `App` twice on load (loading, then ready). After that, the React column is the model from
Chapter 4: each `setState` in `App` re-renders `App` and every child, and each keystroke in `TaskForm`
re-renders `TaskForm`. Two Preact rows need explaining. After the
filter changes, two `TaskItem`s re-render because their *position* changed: `For` hands each item its index
as a signal, and an index change re-renders that item. And "clear done" leaves the count at "3 tasks left",
so the `left` computed produces the same string, and nothing downstream runs.

## Beyond Tasklet

### `preact/compat` and aliasing

`preact/compat` is a module that exports React's API on top of Preact: `React.memo`, `forwardRef`,
`Children`, `createPortal`, `Suspense` and `lazy`, `useSyncExternalStore`, `flushSync`, and the React DOM
entry points (`createRoot`, `hydrateRoot`). It also translates what differs: `onChange` on text inputs
becomes `onInput`, `onDoubleClick` becomes `onDblClick`, camelCase SVG attributes are mapped, and
`className` and `class` are kept in sync. Preact's docs measure compatibility against the current and
previous major versions of React.

To use a React library, you **alias** `react` and `react-dom` to `preact/compat`, so every `import … from
'react'` in your dependencies loads Preact instead. `@preact/preset-vite` does that by default (its
`reactAliasesEnabled` option), and the template's `tsconfig.json` does the same for types, which is why
`paths` was there. With other bundlers you add the aliases yourself; for TypeScript types, the `paths`
entries are the alias. Libraries that reach into React's internals (some animation and state libraries
have, historically) or that need concurrent rendering won't work, and Preact's docs list the known gaps.

Exercise 2 runs the React Tasklet's source on compat: three lines change, the tests pass and the bundle is
9.62 kB gzipped. That's smaller than the signals version, because `preact/compat` (4.0 kB) is smaller than
Signals and its utilities. Signals pay for themselves in update work, not in bytes.

### Preact 11

Preact 11 is a cleanup release more than a new model. From the upgrade guide:

- **Hydration 2.0**: a suspended boundary during hydration can now produce zero or several DOM nodes, and
  hydration works together with streamed server rendering.
- **Hooks compare dependencies with `Object.is`**, as React does, so `NaN` no longer re-runs an Effect.
- **Refs are forwarded by default**: `ref` is a normal prop on function components, and `forwardRef` is
  no longer needed (compat keeps it, but it doesn't forward to class components).
- **Compat gains** `use()`, `useEffectEvent`, the `getServerSnapshot` argument of
  `useSyncExternalStore` and the context argument of `Children.map`; `createPortal` moved into core.
- **Moved to compat**: automatic `px` suffixes on numeric styles and `defaultProps` on function components.
- **Removed**: `render`'s `replaceNode` argument (use `preact-root-fragment`), `Component.base` and
  `SuspenseList`.
- **Timing**: `useEffect` cleanups on unmount are deferred until after paint, like React.
- **Types**: `useRef` requires an initial value, and most types moved from the `JSX` namespace to the
  `preact` namespace (`ButtonHTMLAttributes`, `TargetedSubmitEvent`).
- **Packaging**: ESM only (`.mjs`), TypeScript 5.1 or later, and evergreen browsers (Chrome 71, Safari
  12.1, Firefox 69, Edge 79 and later).

Preact 10's last release was 10.29.8 on August 1, 2026, so check your dependencies before you upgrade: some
tools in the ecosystem still declare `preact@^10`.

### More about Signals

- **Outside components.** `signal`, `computed`, `effect` and `batch` work anywhere: a module-level store,
  a test, a Web Worker. A model like `TaskletModel` can be shared through context or imported directly.
- **In hooks.** `useSignal`, `useComputed` and `useSignalEffect` create the same primitives tied to a
  component's lifetime. `useLiveSignal` turns a changing prop into a signal; `useSignalRef` is a ref you
  can subscribe to.
- **Reading without subscribing.** `signal.peek()` or `untracked(fn)` read a value without creating a
  dependency, the escape hatch when an effect should run on one signal but not another.
- **In React.** `@preact/signals-react` (3.12.0) provides the same API for React, using a Babel transform
  or a `useSignals()` hook to subscribe components; the direct text binding is Preact-only.

### Server rendering and meta-frameworks

Preact has no framework of its own on the scale of Next.js or Nuxt; it shows up in other people's:

- **Fresh** is Deno's web framework: server-rendered pages with Preact, file-based routing, and islands, so
  only the interactive components ship JavaScript. Version 2.0 shipped in September 2025 and 2.3.3 is
  current (April 2026). Fresh powers deno.com, and its docs say plainly that it's the wrong tool for a
  single-page app. Its `@fresh/core` package still declares `preact@^10.29.1`, so Fresh apps run on
  Preact 10 for now.
- **Astro** supports Preact islands through `@astrojs/preact` (6.1.1, compatible with Preact 10 and 11),
  and can alias React components to compat inside them. [Chapter 18](18-meta-frameworks-and-rendering.md)
  builds an Astro page with islands.
- **`preact-iso`** (2.12.2) is the router and prerenderer the scaffold offers: lazy routes, async
  components and a `prerender()` that writes static HTML at build time. With
  `preact-render-to-string` (6.8.2) you can render on any server yourself.
- **No build at all.** Preact runs from a CDN as ES modules, and with `htm` (tagged templates instead of
  JSX) you can write components in a `<script type="module">` with no tools.

Islands, the idea Fresh and Astro are built on, was named by Preact's creator: Jason Miller's 2020 essay is
covered in [Chapter 2](02-a-short-history.md) and Chapter 18.

## Strengths and trade-offs

Strengths:

- **Small.** Tasklet ships 11.74 kB gzipped, a sixth of the React build, and the core runtime is about
  5 kB. That matters for widgets embedded in other people's pages, low-end phones and slow networks.
- **React knowledge transfers.** Components, JSX, hooks and their rules work the same; most React
  tutorials, and with compat most React libraries, apply.
- **Signals.** Fine-grained updates inside a familiar component model, adopted one component or one
  binding at a time. Effects track their own dependencies.
- **Close to the DOM.** Real events, `class` and `for`, attributes as written, custom elements with
  properties: what you know from vanilla JavaScript keeps working.

Trade-offs:

- **Not React.** No concurrent rendering, transitions that defer work, or Server Components. Libraries
  that depend on React internals or new React-only features may break or lag behind.
- **Two models in one app.** Whether a component re-renders depends on `{sig}` versus `{sig.value}`, which
  is easy to change by accident and invisible in review. The render counts above are the only way to be
  sure.
- **A smaller ecosystem of its own.** Meta-frameworks, component libraries and learning material are a
  fraction of React's; most Preact-specific help is the official docs.
- **Version churn in the stack.** Preact 11 is new, and parts of the ecosystem (Fresh, for example) were
  still on 10 when this chapter was written.

## Compared with React

The React and Preact apps share `tasks.ts`, `storage.ts`, the CSS and almost all of their markup.

| | React (Chapter 4) | Preact |
| --- | --- | --- |
| Gzip size (total) | 70.14 kB | 11.74 kB |
| Raw size (total) | 225.51 kB | 29.60 kB |
| Source lines (src, `.ts`/`.tsx`) | 249 in 7 files | 260 in 8 files |
| State | `useState` in `App` | signals in `TaskletModel` |
| Derived values | recomputed every render | `computed`, recalculated on change |
| Effects | `useEffect` with dependency lists | `effect`, dependencies tracked |
| Re-render on toggle | `App` and every child | one `TaskItem`, `For`, `Show`; text bound directly |
| Text input event | `onChange` (React's, fires per keystroke) | `onInput` (DOM's) |
| Attributes | `className`, `htmlFor`, `autoComplete` | `class`, `for`, `autocomplete` |

The same footer in both. React computes the values in the render and diffs them:

```tsx
        <footer className="footer">
          <p className="count" aria-live="polite">
            {countLabel(tasks)}
          </p>
          <button
            type="button"
            className="clear"
            disabled={!tasks.some((task) => task.done)}
            onClick={handleClearDone}
          >
            Clear done
          </button>
        </footer>
```

Preact passes computeds, which bind straight to the Text node and the `disabled` property:

```tsx
          <footer class="footer">
            <p class="count" aria-live="polite">
              {model.left}
            </p>
            <button type="button" class="clear" disabled={model.noneDone} onClick={model.clearDone}>
              Clear done
            </button>
          </footer>
```

And the input. React's `onChange` is its own synthetic event that fires on every keystroke:

```tsx
        onChange={(event) => setTitle(event.target.value)}
```

Preact listens for the DOM's `input` event and writes a signal:

```tsx
        onInput={(event) => (title.value = event.currentTarget.value)}
```

The Preact version is eleven lines longer, almost all of it the model's `return { … }` block of named
actions. In exchange, the logic is out of the component tree, testable on its own, and the components do
less work. If you'd rather keep React's style, Preact runs it too: Exercise 2 is the proof.

## Summary

- Preact implements React's component model (JSX, function components, hooks) in a few kilobytes, using
  the DOM directly: real events, `addEventListener` per element, properties or attributes as written.
- In Preact, `onChange` is the DOM's `change` event; use `onInput` for text fields. `preact/compat`
  translates React's conventions and lets React libraries run when `react` is aliased to it, which
  `@preact/preset-vite` does by default.
- Preact Signals add fine-grained reactivity: reading `.value` subscribes a component, and passing a signal
  into JSX binds a Text node or DOM property without rendering any component.
- Tasklet in Preact keeps all state in a `createModel` model, binds the count and Clear done directly, and
  uses `Show` and `For` for the list. It passes 15 of 15 tests at 11.74 kB gzipped; toggling a task renders
  one `TaskItem` instead of the whole tree.
- Preact 11 (September 2026) modernizes hydration, refs, types and packaging; Fresh, Astro and `preact-iso`
  provide server rendering and islands.

## Exercises

1. **Break the text binding.** In `examples/ch09/render-count/`, `src/AppValue.tsx` is `App.tsx` with
   `{model.left}` changed to `{model.left.value}`. Before you run it, predict which rows of the render
   table change. Then run `node measure.mjs value` and compare.

   <details><summary>Solution</summary>

   ```console
   $ node measure.mjs value
   initial load                 {"TaskForm":2,"FilterBar":2,"AppValue":2,"M$1":2,"TaskItem":3,"Item":4,"For":1,"Show":1}
   type 15 characters           {}
   add a task                   {"TaskForm":1,"FilterBar":1,"Item":5,"TaskItem":1,"For":1,"Show":1,"M$1":1,"AppValue":1}
   toggle the first task        {"TaskForm":1,"FilterBar":1,"TaskItem":1,"Item":5,"For":1,"Show":1,"M$1":1,"AppValue":1}
   filter: Active               {"FilterBar":1,"TaskItem":2,"Item":3,"For":1,"Show":1}
   clear done                   {"Item":3,"For":1,"Show":1}
   ```

   Reading `.value` in `App`'s body subscribes `App` to `left`. Adding and toggling change the label, so
   `App` re-renders, and with it `TaskForm` and `FilterBar`, which aren't memoized: that's React's
   behavior, back again. `ReactiveTextNode` is gone from the first row because there's no signal in the
   JSX anymore. The `TaskItem`s still don't re-render, because `For` returns cached vnodes. Filtering and
   clearing done don't change the label, so those rows are unchanged: a computed only notifies when its
   value actually changes. The page looks identical and all 15 tests still pass; only counting renders
   shows the difference.

   </details>

2. **React code on Preact.** Copy `tasklet/react/src` and `index.html` into a copy of the Preact project
   (keep its `package.json`, `tsconfig.json` and `vite.config.ts`, use port 4329), build it and run the
   acceptance test. What has to change, and how big is the bundle?

   <details><summary>Solution</summary>

   The copy is `examples/ch09/react-on-compat/`. The preset aliases `react` and `react-dom` to
   `preact/compat`, and the template's `paths` do the same for TypeScript. The first build fails the type
   check in one file:

   ```console
   $ npm run build
   …
   src/components/TaskForm.tsx(1,25): error TS2305: Module '"react"' has no exported member 'SubmitEvent'.
   src/components/TaskForm.tsx(26,39): error TS18047: 'event.target' is possibly 'null'.
   src/components/TaskForm.tsx(26,52): error TS2339: Property 'value' does not exist on type 'EventTarget'.
   ```

   React 19.3's types have a `SubmitEvent` type and type `event.target` on a change event as the input;
   compat's types follow the DOM, where `target` is any `EventTarget` and only `currentTarget` is the
   element the handler is on. Three lines change:

   ```diff
   < import { useState, type SubmitEvent } from 'react'
   > import { useState, type FormEvent } from 'react'
   < function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
   > function handleSubmit(event: FormEvent<HTMLFormElement>) {
   < onChange={(event) => setTitle(event.target.value)}
   > onChange={(event) => setTitle(event.currentTarget.value)}
   ```

   ```console
   $ npm run build
   …
   dist/assets/index-DJbeiy3l.js   20.14 kB │ gzip: 8.45 kB
   $ node ../../../tasklet/tools/size.mjs dist | tail -1
   total                        22.95 kB     9.62 kB
   $ npm run preview &
   $ cd ../../../tasklet/e2e
   $ APP=preact BASE_URL=http://localhost:4329/ TASKLET_WEBSERVER=0 npx playwright test
   …
     15 passed (1.9s)
   ```

   All 15 pass, `onChange` included: compat turns it into an `input` listener. `StrictMode`, `createRoot`,
   `useState` and `useEffect` all come from compat. The same React code ships in 9.62 kB instead of
   70.14 kB, smaller even than the signals version, since compat costs less than Signals. What you don't
   get is React's concurrent rendering, and nothing in Tasklet needs it.

   </details>

3. **`onChange` in Preact.** In a copy of the Preact app (`examples/ch09/onchange/`), change the text
   input's `onInput` to `onChange` and run the acceptance test. Explain the result, and describe a feature
   that would break.

   <details><summary>Solution</summary>

   ```console
   $ npm run build
   …
   dist/assets/index-CBvDIH2w.js   26.83 kB │ gzip: 10.59 kB
   $ npm run preview &
   $ cd ../../../tasklet/e2e
   $ APP=preact BASE_URL=http://localhost:4329/ TASKLET_WEBSERVER=0 npx playwright test
   …
     15 passed (1.9s)
   ```

   It passes, which is the instructive part. Without compat, `onChange` is the DOM's `change` event, which
   fires when the value is committed: on blur, or on Enter just before the form submits. The tests type
   and then click Add (the input loses focus, `change` fires, then `click`) or press Enter (`change`, then
   `submit`), so `title` is always up to date by the time `handleSubmit` reads it. Anything that needs the
   value *while* you type would break: a live character counter, disabling Add while the field is empty,
   or filtering the list as you type would all lag one commit behind. Use `onInput` for text fields in
   Preact, and remember that a green test suite only proves what it tests.

   </details>

4. **Which one?** For each project, would you choose React, Preact with hooks, or Preact with Signals,
   and why? (a) A feedback widget that other companies paste into their pages. (b) A large dashboard built
   by a team that already uses a React component library and plans to adopt Server Components. (c) A
   content site on Deno with a few interactive parts.

   <details><summary>Solution</summary>

   (a) Preact, with Signals or hooks: every kilobyte lands on someone else's page, and the widget's state
   is small. Real DOM events also make it easier to coexist with the host page. (b) React: the component
   library may work on compat, but Server Components, concurrent rendering and the React meta-frameworks
   don't come with Preact, and a large team benefits from React's documentation and hiring pool. Enable the
   React Compiler rather than reaching for Preact for update performance. (c) Fresh, which means Preact,
   with islands for the interactive parts; signals shared between islands are a documented Fresh pattern.
   There's no single right answer, but the deciding questions are the same: how much does size matter,
   which React-only features do you need, and how much of the ecosystem must work unchanged.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-9--preact)
