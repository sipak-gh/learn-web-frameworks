# Chapter 4 — React

React is the framework most of the others in this course react to, so it comes first. This chapter is
deliberately short. There is a whole course on it: **[the React course](../learn-react/README.md)** teaches
React from the first component to a finished, shipped app over twenty chapters, and this chapter links to it
wherever you want depth. Here you get the model in one sitting: the UI as a function of state, the
render → reconcile → commit cycle, hooks and their rules, the React Compiler and a first look at Server
Components. Then you build Tasklet in React and measure it against the vanilla version from
[Chapter 3](03-the-problem-frameworks-solve.md), which was the benchmark for every chapter that follows.

If React is new to you, read [Chapter 2 of the React course](../learn-react/02-from-vanilla-dom-to-react.md)
("From Vanilla DOM to React") alongside this one. It makes the same move from hand-written DOM updates to
React, with a smaller app.

## At a glance

| | |
| --- | --- |
| First released | May 2013 (hooks in 16.8, February 2019; 19.0 in December 2024) |
| Current version | 19.3.1 (October 14, 2026); React Compiler 1.0.0 (October 7, 2025) |
| Created by / maintained by | Jordan Walke at Facebook; the React team at Meta and outside contributors, governed by the React Foundation (Linux Foundation) since February 2026 |
| License | MIT |
| Rendering model | Virtual DOM: components return elements, React reconciles them with the previous tree and commits the differences |
| Reactivity model | None tracked: a state update re-renders that component and, by default, its children; the optional React Compiler memoizes automatically |
| Templates | JSX |
| Language | TypeScript or JavaScript |
| Tasklet build size | 70.14 kB gzip (225.51 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | Next.js, React Router (framework mode), TanStack Start ([Chapter 18](18-meta-frameworks-and-rendering.md)) |
| Good fit for | Teams that want the largest hiring pool, library ecosystem and documentation; apps that may grow into React Native or Server Components |

## Why it exists

In 2013 most client-side apps kept the DOM in sync with two-way bindings and observers (the MV\* frameworks
of [Chapter 2](02-a-short-history.md)). Facebook's teams found that hard to reason about at their scale: a
change in one model could ripple through a chain of observers into parts of the page nobody expected.
React proposed something blunter. Describe what the whole UI should look like for the current state, and let
the library work out what to change. You stop writing "when X happens, update Y"; you write "Y looks like
this when the state is X". The **virtual DOM** made that affordable: React compares two cheap JavaScript
descriptions instead of rebuilding the page.

Three later steps shaped the React you write today:

- **Hooks** (16.8, 2019) replaced class components with plain functions that call `useState`,
  `useEffect` and friends.
- **Concurrent rendering** (18, 2022) let React prepare a render in the background and interrupt it, the
  basis for transitions and Suspense.
- **The React Compiler** (1.0, October 2025) adds the memoization people used to write by hand, at build
  time.

React also has the largest ecosystem of any framework in this course. In the week of October 26 to
November 1, 2026, npm counted 243.7 million downloads of `react`, against 53.8 million for `preact`, 24.6
million for `vue`, 10.9 million for `solid-js`, 9.1 million for `svelte` and 8.3 million for
`@angular/core`. Download counts include CI installs and transitive dependencies, so read them as a rough
measure of reach, not of how many people choose each framework. The ecosystem around those downloads, the
component libraries, routers, form and data libraries, testing tools, React Native and the meta-frameworks
in [Chapter 18](18-meta-frameworks-and-rendering.md), is React's strongest argument. In February 2026 the
project moved from Meta to the **React Foundation**, hosted by the Linux Foundation and governed by a board
of member companies (Amazon, Callstack, Expo, Huawei, Meta, Microsoft, Software Mansion and Vercel).

## The mental model

### UI = f(state)

A React component is a function from props and state to a description of the UI:

```text
   props + state ──► TaskItem(…) ──► element tree (plain objects: type, props, children)
```

The function has no side effects and keeps nothing between calls. It runs again whenever the state it
depends on changes, and each run returns a fresh description. Anything you can compute from state, you
compute during render: Tasklet's visible list, its "2 tasks left" label and whether Clear done is disabled
are not stored anywhere. They are expressions in the component body. That is the first big change from the
vanilla app, where `render()` had to patch `count.textContent` and `clear.disabled` by hand.

[Chapter 4 of the React course](../learn-react/04-components-and-jsx.md) covers components and JSX, and
[Chapter 6](../learn-react/06-thinking-in-react.md) ("Thinking in React") covers how to decide what is state
and what is derived.

### Render, reconcile, commit

A state update starts a three-step cycle:

```text
 setTasks(next)
      │
      ▼
 1. TRIGGER   React queues a re-render of the component that owns the state
      │
      ▼
 2. RENDER    React calls App(), then each child component, top-down;
              every call returns a new element tree
      │
      ▼
    RECONCILE React compares the new tree with the previous one, node by node:
              same type at the same place (or same key in a list) ─► keep the DOM node, diff its props
              different type, or a key that disappeared          ─► unmount, mount a new one
      │
      ▼
 3. COMMIT    React applies the differences to the real DOM in one pass,
              then runs Effects; the browser paints
```

Rendering is pure computation and can be repeated, interrupted or thrown away; only the commit touches the
page. In development, `<StrictMode>` takes advantage of that by rendering every component twice and running
every Effect setup and cleanup an extra time, so that impure code shows up as a visible bug. The production
build does neither.

Two consequences matter for Tasklet:

- **Keys.** In a list, React matches old and new children by `key`. Give each `<TaskItem>` the task's id
  and React moves the existing `<li>` when the list reorders, keeping its focus and checkbox state: the same
  job `renderList` did by hand in Chapter 3.
- **State is a snapshot.** Calling `setTasks(next)` doesn't change `tasks` in the running function; it asks
  for a new render in which `tasks` is `next`. When the new value depends on the old one, pass an updater
  function, `setTasks((current) => …)`, so each update starts from the latest state.

[Chapter 5 of the React course](../learn-react/05-state-and-events.md) teaches state and events, and
[Chapter 16](../learn-react/16-rendering-and-performance.md) ("Rendering and Performance") shows the render
cycle in DevTools and the Profiler.

### Hooks and their rules

Hooks are functions whose names start with `use`. They give a function component the things a class used to
hold in instance fields: state (`useState`, `useReducer`), a mutable box (`useRef`), context
(`useContext`), memoized values (`useMemo`, `useCallback`) and **Effects** (`useEffect`), which
synchronize the component with something outside React after a commit.

React doesn't know your hooks by name. It stores each component's hook state in a list and matches the
first `useState` call of this render to the first slot, the second to the second, and so on. That is why
the **Rules of Hooks** exist:

1. Call hooks only at the top level of a component or a custom hook: not inside conditions, loops, nested
   functions or after an early `return`.
2. Call hooks only from React function components or custom hooks, not from ordinary functions.

Break rule 1 and the slots shift: on a render where a condition is false, the hook that should get slot 2
gets slot 1, and you get another hook's state or a crash. Lint rules catch this before you run anything
(Exercise 1 shows one). [Chapter 11 of the React course](../learn-react/11-effects.md) covers Effects,
including when you don't need one, [Chapter 12](../learn-react/12-refs-and-the-dom.md) covers refs and
[Chapter 13](../learn-react/13-custom-hooks.md) covers writing your own hooks.

## Code structure

The app was scaffolded with create-vite's `react-ts` template:

```console
$ npm create vite@latest react -- --template react-ts

> npx
> 'cva' react --template react-ts


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/react...
│
└  Done. Now run:

  cd react
  npm install
  npm run dev
```

A React project from this template has:

- `index.html` with a `<div id="root">` and a module script for `src/main.tsx`.
- `src/main.tsx`, which creates a **root** on that element and renders the top component.
- Components as `.tsx` files: functions that return JSX. TypeScript type-checks props like any other
  function arguments.
- `vite.config.ts` with `@vitejs/plugin-react`, which compiles JSX and adds Fast Refresh in development
  (edit a component and it updates in place, keeping its state).
- `.oxlintrc.json`, a config for **oxlint**, the Rust linter the template uses by default (create-vite
  has an `--eslint` option if you prefer ESLint), with `react/rules-of-hooks` set to `error`.

JSX is the template language. It's JavaScript with an HTML-like syntax for elements: `{expr}` embeds any
expression, attributes use DOM property names (`className`, `htmlFor`), events are camelCase props
(`onClick`) that take functions, and lists are plain `array.map(…)` with a `key` on each element. There
are no directives; a condition is `&&` or a ternary, and a loop is `map`. The React course's
[cheat sheet](../learn-react/appendix-a-react-cheatsheet.md) collects the syntax on one page.

## Building Tasklet in React

`tasklet/react/` has seven source files: `main.tsx`, `App.tsx`, the three components `TaskForm.tsx`,
`TaskItem.tsx` and `FilterBar.tsx`, plus `tasks.ts` (the `Task` and `Filter` types and the pure helpers
`isTaskList`, `visibleTasks` and `countLabel`) and `storage.ts` (`loadSavedTasks`, `saveTasks` and
`fetchTasks`). Later chapters copy those last two unchanged. The template's demo files (logos, `App.css`,
`index.css`, the favicon, README and `.gitignore`) were deleted; `tasklet.css` and `tasks.json` come from
`tasklet/shared/`.

### `package.json`

```json
{
  "name": "tasklet-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4302 --strictPort",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview --port 4302 --strictPort"
  },
  "dependencies": {
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@types/node": "24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.2.1",
    "oxlint": "1.90.0",
    "typescript": "7.0.2",
    "vite": "8.3.5"
  }
}
```

Two runtime packages: `react` holds components, hooks and the reconciler's public API; `react-dom` holds
the renderer that commits to the browser DOM (React Native and other renderers reuse `react` with their own
renderer). `build` type-checks with `tsc -b` before `vite build`. Versions are pinned exactly.

### `main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './tasklet.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### `App.tsx`

`App` owns all the state and passes data down and callbacks up:

```tsx
import { useEffect, useState } from 'react'
import { FilterBar } from './components/FilterBar.tsx'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskItem } from './components/TaskItem.tsx'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

export default function App() {
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  const [tasks, setTasks] = useState<Task[] | null>(loadSavedTasks)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const loading = tasks === null && !failed

  // Fetch the seed tasks while loading. The ignore flag drops a response that
  // arrives after the Effect was cleaned up (Strict Mode runs it twice in dev).
  useEffect(() => {
    if (!loading) return
    let ignore = false
    fetchTasks().then(
      (loaded) => {
        if (!ignore) setTasks(loaded)
      },
      () => {
        if (!ignore) setFailed(true)
      },
    )
    return () => {
      ignore = true
    }
  }, [loading])

  // Sync the list to localStorage after every change.
  useEffect(() => {
    if (tasks !== null) saveTasks(tasks)
  }, [tasks])

  function handleAdd(title: string) {
    setTasks((current) => [...(current ?? []), { id: crypto.randomUUID(), title, done: false }])
  }

  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }

  function handleRemove(id: string) {
    setTasks((current) => current && current.filter((task) => task.id !== id))
  }

  function handleClearDone() {
    setTasks((current) => current && current.filter((task) => !task.done))
  }

  let content
  if (failed) {
    content = (
      <>
        <p role="alert">Couldn't load tasks.</p>
        <button type="button" onClick={() => setFailed(false)}>
          Retry
        </button>
      </>
    )
  } else if (tasks === null) {
    content = <p role="status">Loading tasks…</p>
  } else {
    const visible = visibleTasks(tasks, filter)
    content =
      visible.length === 0 ? (
        <p className="empty">Nothing to show.</p>
      ) : (
        <ul className="tasks" aria-label="Tasks">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task.id)}
              onRemove={() => handleRemove(task.id)}
            />
          ))}
        </ul>
      )
  }

  return (
    <main className="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={handleAdd} />
      <FilterBar filter={filter} onChange={setFilter} />
      {content}
      {tasks !== null && (
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
      )}
    </main>
  )
}
```

Read it against the model:

- **Three pieces of state, everything else derived.** `loading`, `visible`, the count label and the
  disabled flag are recomputed on every render. There is no `status` field to keep consistent with
  `tasks`; "loading" *means* "no tasks yet and no failure".
- **A lazy initializer.** `useState(loadSavedTasks)` passes the function, not its result, so React reads
  `localStorage` once, on the first render, rather than on every render.
- **Two Effects, two external systems.** The first fetches while `loading` is true. Its dependency list,
  `[loading]`, says when to re-run it: Retry sets `failed` to `false`, `loading` becomes `true` and the fetch
  runs again. The cleanup sets `ignore`, so a response that arrives after the Effect was torn down (Strict
  Mode does that once on purpose in development) is dropped instead of setting state twice. The second
  Effect writes to `localStorage` whenever `tasks` changes.
- **Updater functions.** Every handler uses `setTasks((current) => …)` and returns a new array, never
  mutating the old one. React compares state with `Object.is`; a mutated array would be the same object,
  and React would skip the render.
- **Conditional rendering is JavaScript.** An `if` chain builds `content`; `&&` shows the footer.

### `TaskForm.tsx`

```tsx
import { useState, type SubmitEvent } from 'react'

interface TaskFormProps {
  onAdd: (title: string) => void
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    onAdd(trimmed)
    setTitle('')
  }

  return (
    <form aria-label="Add task" className="add" onSubmit={handleSubmit}>
      <label htmlFor="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  )
}
```

The input is **controlled**: its value comes from state, and every keystroke sets the state, which
re-renders `TaskForm` and writes the value back. That loop is what lets `setTitle('')` clear the field after
an add. In React, `onChange` on a text input fires on every keystroke, like the DOM's `input` event;
[Chapter 9](09-preact.md) shows why that matters when you move to Preact.
[Chapter 9 of the React course](../learn-react/09-forms.md) covers forms in depth, including uncontrolled
inputs and form Actions.

`TaskItem.tsx` and `FilterBar.tsx` are presentational: they take props and call callbacks. `TaskItem` puts a
checkbox and a Delete button in an `<li>`; `FilterBar` maps three filter values to buttons with
`aria-pressed={value === filter}`. You'll see `FilterBar` in full below, before and after the React
Compiler.

### The manifest

```json
{
  "name": "React",
  "port": 4302,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

### Build it and run it

```console
$ cd tasklet/e2e
$ node run-all.mjs react

=== React (tasklet/react, port 4302) ===

$ npm run build    (in /home/tbangma/learn-web-frameworks/tasklet/react)

> tasklet-react@0.0.0 build
> tsc -b && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 21 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.40 kB │ gzip:  0.27 kB
dist/assets/index-BeKL5seo.css    2.38 kB │ gzip:  0.95 kB
dist/assets/index-DhuhZyYo.js   222.72 kB │ gzip: 69.80 kB

✓ built in 109ms
…
Running 15 tests using 15 workers

  ✓   5 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (504ms)
  ✓   7 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (490ms)
  …
  ✓  10 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (884ms)
  ✓   4 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.4s)

  15 passed (1.9s)

Summary
app    port  build  passed  failed  skipped  note
react  4302  ok     15      0       0
$ node ../tools/size.mjs ../react/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DhuhZyYo.js    222.72 kB    68.92 kB
index.html                    0.40 kB     0.28 kB
total                       225.51 kB    70.14 kB
```

All 15 tests pass with no skips. The full build, type check included, takes about 0.4 seconds. The app's
own code is 249 lines in seven files (`find src -name '*.ts' -o -name '*.tsx' | xargs wc -l`), against 309
for vanilla. The bundle is another story: 70.14 kB gzipped, against 3.16 kB for vanilla. Almost all of it is
`react-dom`, which carries the reconciler, the scheduler for concurrent rendering, the event system,
hydration and form Actions whether Tasklet uses them or not. Whether 67 kB is a lot depends on what you are
building; on a slow mobile connection it's a noticeable part of the first load, and in an app with fifty
screens it's a fixed cost spread across all of them.

## Beyond Tasklet

### The React Compiler

Without help, a state change in `App` re-renders `App` and every component below it: toggling one task calls
`TaskForm`, `FilterBar` and every `TaskItem` again, and reconciliation then finds that almost nothing
changed. That's usually fast enough. When it isn't, React offers `memo` for components and `useMemo` and
`useCallback` for values, which you place by hand and which break silently when a new object or function
sneaks into a prop.

The **React Compiler** places them for you. It's a Babel plugin that analyzes each component and hook, works
out which values depend on which inputs, and caches JSX and computed values between renders. The React team
calls 1.0 production-ready:

> The compiler has been battle tested on major apps at Meta and is fully production-ready.
>
> — React team, "React Compiler v1.0" (October 7, 2025)

The same post says new apps should use it, and that Vite, Next.js and Expo now offer it when you create a
project. With Vite, that means a separate template. The `react-ts` template Tasklet was scaffolded from does
**not** enable the compiler, and its README says why:

> The React Compiler is not enabled on this template because of its impact on dev & build performances.

create-vite 9.3.3 lists a second variant, `react-compiler-ts` ("TypeScript + React Compiler"), which
generates the same project plus four dev dependencies (`babel-plugin-react-compiler`,
`@rolldown/plugin-babel`, `@babel/core` and `@types/babel__core`) and this plugin list:

```ts
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// Tasklet's React app with the React Compiler, configured as the react-compiler-ts template does.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
```

That file is `examples/ch04/react-compiler/vite.config.ts`, a copy of Tasklet with the compiler enabled the
way the template does it. Vite 8 bundles with Rolldown, which is written in Rust and doesn't run Babel, so the
compiler runs through a Babel plugin for Rolldown; the template's README mentions that `@vitejs/plugin-react`
also has experimental native support (`compiler: true`). Here is what the compiler does to `FilterBar`
(`node compile-one.mjs src/components/FilterBar.tsx` in the example folder). The source:

```tsx
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

interface FilterBarProps {
  filter: Filter
  onChange: (filter: Filter) => void
}

export function FilterBar({ filter, onChange }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter" className="filters">
      {FILTERS.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={value === filter} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  )
}
```

The compiled component (types and the `FILTERS` constant omitted):

```text
export function FilterBar(t0) {
  const $ = _c(5);
  const {
    filter,
    onChange
  } = t0;
  let t1;
  if ($[0] !== filter || $[1] !== onChange) {
    t1 = FILTERS.map(t2 => {
      …
      return <button key={value} type="button" aria-pressed={value === filter} onClick={() => onChange(value)}>{label}</button>;
    });
    $[0] = filter;
    $[1] = onChange;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <div role="group" aria-label="Filter" className="filters">{t1}</div>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}
```

`_c(5)` allocates a five-slot cache for this component instance. The buttons are rebuilt only when `filter`
or `onChange` changes; otherwise the cached elements come back, and because they are the *same objects* as
last time, React skips reconciling that subtree. The compiler also inserts this check around child
elements in `App`, so a cached `<FilterBar>` element is not re-rendered at all. It's still re-render and
diff, with far less of both.

The cost, measured on Tasklet: the build passes all 15 tests and grows from 70.14 kB to 71.03 kB gzipped
(the cache code and the small `react/compiler-runtime`), and the Vite build step goes from about 110 ms to
about 500 ms. For a five-component app there's nothing to win. The payoff comes in large trees with
expensive children, which is where [Chapter 16 of the React course](../learn-react/16-rendering-and-performance.md#the-react-compiler)
measures it with the Profiler, before and after. The compiler relies on your components following the
[Rules of React](https://react.dev/reference/rules) (pure renders, no mutation of props or state); where it
can't prove that, it skips the component and leaves it as written.

### Server Components, in one paragraph

Everything in Tasklet runs in the browser. **React Server Components** split components into two kinds:
Server Components (the default in frameworks that support them) run only on the server or at build time,
can be `async` and read a database directly, and send their rendered output, not their code, to the browser;
Client Components, marked `'use client'`, hydrate and handle interaction as before. **Server Functions**
(`'use server'`) go the other way, letting a form or button call server code. React defines the protocol,
but you need a framework to supply the bundler integration and server: Next.js's App Router is the main
one, with support in React Router and TanStack Start. create-vite lists RSC starters too (an `rsc` template
from `@vitejs/plugin-rsc`, RedwoodSDK and Vike). [Chapter 18](18-meta-frameworks-and-rendering.md#react-server-components-and-server-functions)
compares Server Components with islands and resumability, and the React course's
[Chapter 20](../learn-react/20-where-next.md#server-components-and-server-functions) shows them in code.

### Everything else

React 19 added Actions and form handling (`useActionState`, `useFormStatus`, `useOptimistic`) and the `use`
hook for reading promises and context; [Chapter 17 of the React course](../learn-react/17-async-react.md)
covers them with Suspense. React 19.2 added `<Activity>`, which hides part of the UI without losing its
state, and 19.3 added `<ViewTransition>` and Fragment refs; [Chapter 20](../learn-react/20-where-next.md)
walks through them. For routing, shared state, data fetching, forms and component libraries,
[Chapter 20](../learn-react/20-where-next.md) is a map of the ecosystem, and
[Chapter 16 of this course](16-state-routing-and-data.md) compares those concerns across frameworks.

## Strengths and trade-offs

Strengths:

- **One simple model.** UI = f(state), re-run on change. Values are plain JavaScript, derived data is just
  an expression, and nothing tracks what you read.
- **The ecosystem.** More libraries, answers, tutorials, jobs and tooling than any other framework, plus
  React Native for mobile and several meta-frameworks.
- **Stability.** Code written with hooks in 2019 still runs. Breaking changes come with codemods and long
  deprecation periods.
- **A strong long-term roadmap.** Concurrent rendering, Server Components and the compiler are big bets
  that other frameworks have answered or borrowed from.

Trade-offs:

- **Size.** 70 kB gzipped for Tasklet, more than twenty times the vanilla version. Most of it is fixed
  cost that doesn't shrink when your app does.
- **Re-render by default.** Updates do more work than fine-grained frameworks, and fixing it means
  memoization, by hand or by the compiler, with a build cost.
- **Effects and dependency lists.** Because React doesn't track reads, you declare what an Effect depends
  on, and a wrong list is a bug. The React docs spend a whole page on
  [when you don't need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
- **Decisions left to you.** No official router, store or data layer; you pick from the ecosystem or let a
  meta-framework pick for you.

## Compared with vanilla

Chapter 3 kept a status, the tasks and the filter in one object, and every change went through `setState`,
which saved and called a `render()` that patched each element by hand:

```ts
  function render() {
    const { status, tasks, filter } = state
    const visible = visibleTasks(tasks, filter)
    const ready = status === 'ready'

    filterBar.update(filter)
    loading.hidden = status !== 'loading'
    error.hidden = retry.hidden = status !== 'error'
    list.hidden = !ready || visible.length === 0
    empty.hidden = !ready || visible.length > 0
    footer.hidden = !ready
    renderList(ready ? visible : [])
    count.textContent = countLabel(tasks)
    clear.disabled = !tasks.some((task) => task.done)
  }
```

React's version of the same lines is the JSX at the bottom of `App`: `{countLabel(tasks)}` in place of
`count.textContent = …`, `disabled={!tasks.some(…)}` in place of `clear.disabled = …`, and
`visible.map(…)` with keys in place of the 30-line `renderList`. The vanilla code creates every element once
and shows or hides it; React creates elements when they're needed and removes them when they're not. You
traded 3 kB for 70 kB and gained an app where adding a feature means changing what the UI looks like, never
the order of DOM updates.

| | Vanilla (Chapter 3) | React |
| --- | --- | --- |
| Gzip size (total) | 3.16 kB | 70.14 kB |
| Source lines (src, `.ts`/`.tsx`) | 309 | 249 |
| Who updates the DOM | `render()` and `renderList`, by hand | React, by reconciling |
| Derived values | recomputed in `render()` | recomputed on every render |
| Persistence | `setState` calls `saveTasks` | an Effect on `[tasks]` |

## Summary

- React describes the UI as a function of state. A state update re-runs the component and its children;
  React reconciles the new element tree with the old one and commits only the differences.
- State is a snapshot per render. Use updater functions when the next state depends on the previous one,
  and derive everything else during render.
- Hooks attach state, refs, context and Effects to function components. They're identified by call
  order, so call them unconditionally at the top level; the template's oxlint config enforces that.
- The React Compiler (1.0, October 2025) memoizes automatically. create-vite's `react-ts` template leaves
  it off; `react-compiler-ts` turns it on through a Babel plugin for Rolldown.
- Server Components move rendering to the server inside one React tree; they need a framework
  ([Chapter 18](18-meta-frameworks-and-rendering.md)).
- Tasklet in React: 249 lines, 15 of 15 tests, 70.14 kB gzipped. For everything this chapter skipped,
  continue with [the React course](../learn-react/README.md).

## Exercises

1. **Break a Rule of Hooks.** `examples/ch04/rules-of-hooks/TaskCount.tsx` shows the count only once tasks
   have loaded, and returns early before calling its hooks. Run oxlint on it with Tasklet's config. What does
   it report, and how would you fix the component?

   ```tsx
   import { useEffect, useState } from 'react'
   import { countLabel, type Task } from '../../../tasklet/react/src/tasks.ts'

   // Breaks the Rules of Hooks on purpose: run oxlint on this file.
   export function TaskCount({ tasks }: { tasks: Task[] | null }) {
     if (tasks === null) return <p>Loading…</p>

     const [label, setLabel] = useState('')
     useEffect(() => {
       setLabel(countLabel(tasks))
     }, [tasks])

     return <p className="count">{label}</p>
   }
   ```

   <details><summary>Solution</summary>

   ```console
   $ cd examples/ch04/rules-of-hooks
   $ ../../../tasklet/react/node_modules/.bin/oxlint TaskCount.tsx
   TaskCount.tsx:10:5: warning react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.
   TaskCount.tsx:8:29: error react-hooks(rules-of-hooks): React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render. help: Move the Hook call before the condition, or call it unconditionally and branch inside the Hook/effect instead.
   TaskCount.tsx:9:3: error react-hooks(rules-of-hooks): React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. help: Move the Hook call before the condition, or call it unconditionally and branch inside the Hook/effect instead.
   ```

   Two errors: on the loading render the component returns before `useState` and `useEffect`, so it has
   zero hooks; on the next it has two, and React can't line the slots up. The warning points at the deeper
   problem: the label is derived from `tasks`, so it shouldn't be state at all. The fix
   (`TaskCountFixed.tsx`, which oxlint passes) removes both hooks:

   ```tsx
   export function TaskCount({ tasks }: { tasks: Task[] | null }) {
     if (tasks === null) return <p>Loading…</p>
     return <p className="count">{countLabel(tasks)}</p>
   }
   ```

   An early return is fine once nothing after it is a hook.

   </details>

2. **Turn on the compiler.** Copy `tasklet/react` to `examples/ch04/react-compiler`, give it port 4324,
   and enable the React Compiler the way create-vite's `react-compiler-ts` template does. Build it, run the
   acceptance test against it and compare the size with Tasklet.

   <details><summary>Solution</summary>

   Install the template's four dev dependencies (pinned) and use the `vite.config.ts` shown in "Beyond
   Tasklet":

   ```console
   $ npm install --save-exact -D @rolldown/plugin-babel@^0.2.4 babel-plugin-react-compiler@^1.0.0 @babel/core@^7.29.7 @types/babel__core@^7.20.5
   $ npm run build
   …
   dist/assets/index-4EgN1-u6.js   224.90 kB │ gzip: 70.70 kB

   ✓ built in 499ms
   $ node ../../../tasklet/tools/size.mjs dist | tail -1
   total                       227.69 kB    71.03 kB
   $ npm run preview &
   $ cd ../../../tasklet/e2e
   $ APP=react BASE_URL=http://localhost:4324/ TASKLET_WEBSERVER=0 npx playwright test
   …
     15 passed (1.9s)
   ```

   All 15 tests pass. The bundle grows by 0.89 kB gzipped and the Vite step takes about four times as
   long (499 ms against 109 ms here). Running `node compile-one.mjs` on each file shows four compiled
   components (`App`, `TaskForm`, `TaskItem` and `FilterBar`, each now starting with a `_c(n)` cache), and
   none of the source changed. With five small components there's no measurable win; the
   point is that the compiler is a build setting, not a rewrite.

   </details>

3. **Why not store it?** Tasklet keeps `tasks`, `failed` and `filter` in state and computes everything
   else. Suppose you added `const [left, setLeft] = useState('')` and an Effect that calls
   `setLeft(countLabel(tasks))`. What would go wrong, and what would the user see?

   <details><summary>Solution</summary>

   Every change to `tasks` would cost two renders and commits instead of one: the first with the new list
   and the *old* label, then the Effect runs after the commit, sets `left`, and React renders again. For one
   frame the count is wrong ("3 tasks left" after you checked a task), and screen readers watching the
   `aria-live` region may announce the stale value. You'd also have two sources of truth that can drift
   apart if any code path forgets the Effect. Computing `countLabel(tasks)` during render is always
   consistent and costs nothing measurable. It's the same lint warning as in Exercise 1:
   `set-state-in-effect`. The React course covers this pattern in
   [Chapter 11](../learn-react/11-effects.md).

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-4--react)
