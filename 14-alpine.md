# Chapter 14 — Alpine.js

htmx, in [Chapter 13](13-htmx.md), kept all the state on the server. Some behavior doesn't belong there:
opening a menu, switching a tab, counting the characters in a text box. Nobody wants a round trip for
those, and nobody wants a 70 kB framework and a build step for them either. Alpine.js is for that gap. You
write the behavior as attributes in your HTML (`x-data`, `x-show`, `@click`), Alpine finds them when the
page loads and keeps the DOM in sync with a small amount of reactive state. Its home page calls it "a
rugged, minimal tool for composing behavior directly in your markup" and adds: "Think of it like jQuery for
the modern web."

This chapter explains how Alpine works, including the Vue reactivity engine inside it, and builds the full
Tasklet with it: a client-side app like the React and Vue versions, with `localStorage` and a fetch, that
passes all fifteen acceptance tests. Then it covers what Tasklet leaves out: the CSP build, the official
plugins, Alpine next to htmx and in Laravel Livewire, and where the approach stops scaling.

## At a glance

| | |
| --- | --- |
| First released | 1.0 in December 2019; 2.0 in February 2020; 3.0, a rewrite, in June 2021 |
| Current version | 3.17.5 (October 20, 2026) |
| Created by / maintained by | Caleb Porzio, the creator of Laravel Livewire, with community contributors |
| License | MIT |
| Rendering model | Enhances the HTML already in the page: Alpine walks the DOM, reads the `x-*` attributes and binds each one to an effect. No virtual DOM and no compiler; `x-for` and `x-if` clone the contents of a `<template>` |
| Reactivity model | Proxies from `@vue/reactivity` (Vue's own package), with effects batched into a microtask |
| Templates | The page itself; directives hold JavaScript expressions as attribute strings |
| Language | JavaScript. Tasklet is plain JavaScript, because most of its logic lives in HTML attributes that TypeScript can't check |
| Tasklet build size | 21.82 kB gzip (61.91 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | None; it is a companion to server frameworks, and Livewire is built on it |
| Good fit for | Interactivity sprinkled over server-rendered pages (menus, tabs, modals, form behavior), next to htmx or Livewire; small widgets and prototypes |

## Why it exists

Caleb Porzio, who also created Laravel Livewire, published Alpine 1.0 in December 2019. The problem it
addresses is the behavior that must stay in the browser on a page the server has already rendered. jQuery
can do it, but then the behavior lives in a separate script that finds elements by selector, the gap
between markup and code that [Chapter 3](03-the-problem-frameworks-solve.md) described. Vue can do it too,
but brings a build step, components and a virtual DOM to a page that arrives mostly finished.

Alpine's answer was to borrow Vue's template syntax and drop everything else. The README of version 2
said that the syntax is "almost entirely borrowed from Vue (and by extension Angular)", and put the pitch
this way:

> Alpine.js offers you the reactive and declarative nature of big frameworks like Vue or React at a much lower cost.
>
> — Caleb Porzio, Alpine.js README, v2.8.2 (2021)

The cost is low in a specific sense. There is no build step: one `<script>` tag is enough, and the page is
written in HTML, often by a server template. There is no component tree to design up front: you add
`x-data` to an element and that element is now interactive. The home page still describes the whole API as
"a collection of 15 attributes, 6 properties, and 2 methods"; the 3.17.5 source has grown to 18 directives
and 9 magic properties, still small enough to learn in an afternoon.

Version 3 (June 2021) was a rewrite. Version 2 had built its reactivity on Salesforce's
`observable-membrane` and left global state to Spruce, a community library. Version 3 switched to
`@vue/reactivity`, the package that powers Vue 3, added `Alpine.data()` and `Alpine.store()`, and moved
optional features into official plugins.

## The mental model

### Behavior in attributes

An Alpine component is any element with `x-data`. Its value is a JavaScript object, and every element
inside can read that object's properties in its own directives:

```html
<div x-data="{ open: false }">
  <button type="button" :aria-expanded="open" @click="open = !open">Details</button>
  <p x-show="open">Shown only while open is true.</p>
</div>
```

`:aria-expanded` is short for `x-bind:aria-expanded` and `@click` for `x-on:click`, as in Vue. When you
click, the handler sets `open`, and the two elements that read `open` update. There is no render function
and nothing to mount; the HTML is already the UI. This is the same **locality of behavior** that htmx
argues for ([Chapter 13](13-htmx.md#locality-of-behavior)): you see what the button does by reading the
button.

The directives Tasklet uses, with their Vue equivalents:

| Alpine | What it does | Vue |
| --- | --- | --- |
| `x-data="…"` | declares a component and its reactive data | `data()` / `setup()` |
| `x-init="…"` | runs an expression when the element is initialized | `onMounted` |
| `x-bind:attr` / `:attr` | sets an attribute from an expression | `v-bind` / `:` |
| `x-on:event` / `@event` | runs an expression on an event (`.prevent`, `.window`, `.debounce` …) | `v-on` / `@` |
| `x-text` | sets the text content | `{{ }}` |
| `x-model` | two-way binding for an input | `v-model` |
| `x-show` | toggles `display: none` | `v-show` |
| `x-if` | adds or removes the contents of a `<template>` | `v-if` |
| `x-for` + `:key` | repeats the contents of a `<template>` | `v-for` + `:key` |
| `x-cloak` | removed when Alpine initializes the element; hide it with CSS until then | `v-cloak` |
| `$store`, `Alpine.store()` | global reactive state | Pinia |
| `Alpine.data()` | a named, reusable component | a component |
| `Alpine.effect()`, `$watch` | run code when the data it read changes | `watchEffect`, `watch` |

The others are `x-html`, `x-effect`, `x-ref`, `x-transition`, `x-ignore`, `x-teleport`, `x-id` and
`x-modelable`, and the magics `$el`, `$refs`, `$dispatch`, `$nextTick`, `$root`, `$data` and `$id`.

### How Alpine runs

When `Alpine.start()` runs, Alpine walks the document from every element with `x-data` or `x-init` that
isn't inside another one. For each directive it finds, it compiles the attribute string into a
function and creates an **effect**: a function that evaluates the expression and applies the result to the
element, such as setting `textContent` for `x-text`. A `MutationObserver` watches the page afterwards, so
elements added later, by htmx or anything else, are initialized the same way.

The compilation step explains two things you will meet later. Expressions are turned into functions with
the `AsyncFunction` constructor, roughly `new AsyncFunction('scope', 'with (scope) { return <expression> }')`.
That is why `open = !open` can name `open` without `this.`, and why a strict Content Security Policy that
forbids `eval` also breaks Alpine (see [the CSP build](#the-csp-build)). And a typo in an attribute is not
an error until that line runs; then Alpine logs an "Alpine Expression Error" with the expression and the
element.

### Vue's reactivity, under the hood

The reactivity docs say it directly: "Alpine uses VueJS's reactivity engine under the hood to provide these
functions." `alpinejs` 3.17.5 depends on `@vue/reactivity` `~3.5.40`, and its `index.js` imports
`reactive`, `effect`, `stop` and `toRaw` from it. The model is the one [Chapter 5](05-vue.md) explained:

- `x-data` objects and stores are wrapped in `reactive()` Proxies.
- While an effect runs, every property it reads is recorded as a dependency.
- When a property changes, the Proxy re-runs the effects that read it, and only those.

Alpine adds one thing: a scheduler. Effects don't re-run synchronously; they are queued and flushed in a
microtask (`queueMicrotask(flushJobs)` in `scheduler.js`). A click handler that changes three properties
updates the DOM once, after the handler returns.

What Alpine does not take from Vue is the virtual DOM. Each directive updates its own element directly,
so there is nothing to diff. That is a good trade for a page with dozens of bindings, and it is also why
Alpine has no compiler that could optimize anything ahead of time.

## Code structure

### Scaffolding

Alpine needs no build tool: the docs' first example is a `<script defer>` tag. The course builds every
client app with Vite, so Tasklet started from Vite's plain JavaScript template:

```console
$ cd tasklet
$ npm create vite@latest alpine -- --template vanilla --no-interactive

> npx
> 'cva' alpine --template vanilla --no-interactive


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/alpine...
│
└  Done. Now run:

  cd alpine
  npm install
  npm run dev
```

The template creates `index.html`, `src/main.js`, a demo `src/counter.js` with a stylesheet and images,
and `public/` icons. Those demo files were deleted, `alpinejs` was added with
`npm install --save-exact alpinejs@3.17.5`, Vite was pinned to `8.3.5`, the ports were added to the
scripts, and the shared `tasks.json` went into `public/`:

```text
tasklet/alpine/
  index.html          the whole UI: markup plus x-* directives
  package.json
  tasklet.json        the manifest for the acceptance test
  public/tasks.json   the seed tasks, fetched at runtime
  src/
    main.js           registers the store and components, the save effect, Alpine.start()
    store.js          $store.tasklet: the state, getters and actions
    components.js     Alpine.data(): taskForm, filterBar, taskItem
    storage.js        loadSavedTasks, saveTasks, fetchTasks
    tasks.js          the data model (Chapter 3), with JSDoc types
    tasklet.css       the shared stylesheet, imported by main.js
```

There is no `vite.config.js`; Vite's defaults are enough.

`tasklet/alpine/package.json`

```json
{
  "name": "tasklet-alpine",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4313 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 4313 --strictPort"
  },
  "dependencies": {
    "alpinejs": "3.17.5"
  },
  "devDependencies": {
    "vite": "8.3.5"
  }
}
```

### Why JavaScript, not TypeScript

The other client apps in the course are TypeScript. The SPEC allows plain JavaScript where it is more
idiomatic, and Alpine is the clearest case. Most of Tasklet's Alpine code is expressions in `index.html`,
such as `$store.tasklet.visible.length > 0`. TypeScript never sees those strings, and no official tool
type-checks them. TypeScript could check only the four small files in `src/`, which would give a typed
store that the markup then uses untyped. The Alpine docs and most Alpine code are JavaScript too. So
Tasklet stays in JavaScript, and `tasks.js` records the shape of a task in JSDoc comments
(`@typedef {{ id: string, title: string, done: boolean }} Task`) as documentation.

## Building Tasklet in Alpine

### The components, mapped

Alpine has no component tree with props and events. It has scopes: a nested `x-data` sees the data of every
`x-data` around it, and a global store that every expression can reach. Tasklet uses both:

| Tasklet piece | Alpine version |
| --- | --- |
| `App` state (`tasks`, `filter`, loading status) | `Alpine.store('tasklet', …)` in `store.js`, read as `$store.tasklet` |
| `App` loading and error states | `status` in the store; three elements with `x-show` |
| `App` persistence effect | `Alpine.effect()` in `main.js` |
| derived `visible`, count, "has done" | getters on the store |
| `TaskForm` | `Alpine.data('taskForm')`: its own `title`, bound with `x-model`, and `submit()` |
| `FilterBar` | `Alpine.data('filterBar')`: the three filters, `isCurrent()` and `choose()` |
| `TaskItem` | `Alpine.data('taskItem')` on each `<li>` inside `x-for` |
| props (`task`) | scope: `taskItem` reads `task`, the `x-for` loop variable around it |
| events from child to parent | calls to store methods (`this.$store.tasklet.toggle(id)`) |

A single scope would also work: `<main x-data="tasklet">` with all the state and methods in one object,
and every element reading it directly. For a page this small that is a reasonable choice. The store version
was chosen for three reasons. It keeps each component's own state (the form's `title`) out of the shared
object. `Alpine.data()` gives each Tasklet component a name you can find in the markup. And `main.js` can
reach a store without a component instance, which the save effect needs.

### The page: `index.html`

`tasklet/alpine/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tasklet — Alpine.js</title>
    <style>
      [x-cloak] {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <main class="tasklet" x-data x-init="$store.tasklet.start()">
      <h1>Tasklet</h1>

      <form class="add" aria-label="Add task" x-data="taskForm" @submit.prevent="submit">
        <label for="new-task">New task</label>
        <input id="new-task" name="title" autocomplete="off" x-model="title" />
        <button type="submit">Add</button>
      </form>

      <div class="filters" role="group" aria-label="Filter" x-data="filterBar">
        <template x-for="filter in filters" :key="filter.value">
          <button
            type="button"
            :aria-pressed="isCurrent(filter.value)"
            @click="choose(filter.value)"
            x-text="filter.label"
          ></button>
        </template>
      </div>

      <p role="status" x-show="$store.tasklet.status === 'loading'">Loading tasks…</p>
      <p role="alert" x-show="$store.tasklet.status === 'error'" x-cloak>Couldn't load tasks.</p>
      <button type="button" x-show="$store.tasklet.status === 'error'" x-cloak @click="$store.tasklet.load()">
        Retry
      </button>

      <ul class="tasks" aria-label="Tasks" x-show="$store.tasklet.ready && $store.tasklet.visible.length > 0" x-cloak>
        <template x-for="task in $store.tasklet.visible" :key="task.id">
          <li class="task" :class="{ done: task.done }" x-data="taskItem">
            <label>
              <input type="checkbox" :checked="task.done" @change="toggle" />
              <span x-text="task.title"></span>
            </label>
            <button type="button" class="delete" :aria-label="deleteLabel" @click="remove">×</button>
          </li>
        </template>
      </ul>
      <template x-if="$store.tasklet.ready && $store.tasklet.visible.length === 0">
        <p class="empty">Nothing to show.</p>
      </template>

      <footer class="footer" x-show="$store.tasklet.ready" x-cloak>
        <p class="count" aria-live="polite" x-text="$store.tasklet.countLabel"></p>
        <button type="button" class="clear" :disabled="!$store.tasklet.hasDone" @click="$store.tasklet.clearDone()">
          Clear done
        </button>
      </footer>
    </main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

Things to notice:

- **`<main x-data>`** has no value. An empty `x-data` makes `<main>` a root, so Alpine processes every
  directive inside it, including the ones outside the three named components. Its `x-init` starts the app.
- **`x-cloak`** hides the error message, the Retry button, the list and the footer until Alpine has
  initialized them; the `[x-cloak]` rule in `<head>` does the hiding, and Alpine removes the attribute.
  Without it, the page would flash every element for a moment before the first `x-show` runs. "Loading
  tasks…" deliberately has no `x-cloak`, so it shows from the first paint, which is also the right state.
- **`x-for`** must be on a `<template>` with one root element, and `:key="task.id"` lets Alpine move the
  existing `<li>` when the list changes, as keys do in React and Vue.
- **`x-show` versus `x-if`.** `x-show` keeps the element and toggles `display: none`; `x-if` adds and
  removes it. Both suit the DOM contract, because the acceptance test asks for visibility, and an element
  with `display: none` is out of the accessibility tree. The list uses `x-show`, so the `<ul>` stays in the page
  and is only hidden; the empty message uses `x-if`, which must also be on a `<template>`.
- **`:aria-pressed="isCurrent(filter.value)"`** passes a boolean. For boolean attributes such as
  `disabled` Alpine adds or removes the attribute, but `aria-pressed` isn't one, so `false` is rendered as
  `aria-pressed="false"`, as the contract requires. The footer's `:disabled="!$store.tasklet.hasDone"`
  shows the other case.
- **`@submit.prevent`** is `x-on:submit` with the `.prevent` modifier, which calls `preventDefault()`.

The expressions stay short on purpose. Anything more than a property, a comparison or a method call goes
into JavaScript, where it can be read, tested and, with the CSP build, run at all.

### The store: `store.js`

`tasklet/alpine/src/store.js`

```js
import { fetchTasks, loadSavedTasks } from './storage.js'
import { countLabel, visibleTasks } from './tasks.js'

// The app's state, shared by every component as $store.tasklet. Alpine wraps
// this object in a reactive proxy, so the methods simply mutate it.
export const tasklet = {
  status: 'loading',
  tasks: [],
  filter: 'all',

  get ready() {
    return this.status === 'ready'
  },
  get visible() {
    return visibleTasks(this.tasks, this.filter)
  },
  get countLabel() {
    return countLabel(this.tasks)
  },
  get hasDone() {
    return this.tasks.some((task) => task.done)
  },

  start() {
    const saved = loadSavedTasks()
    if (saved) {
      this.tasks = saved
      this.status = 'ready'
    } else {
      this.load()
    }
  },
  async load() {
    this.status = 'loading'
    try {
      this.tasks = await fetchTasks()
      this.status = 'ready'
    } catch {
      this.status = 'error'
    }
  },

  add(title) {
    this.tasks.push({ id: crypto.randomUUID(), title, done: false })
  },
  toggle(id) {
    const task = this.tasks.find((task) => task.id === id)
    if (task) task.done = !task.done
  },
  remove(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id)
  },
  clearDone() {
    this.tasks = this.tasks.filter((task) => !task.done)
  },
}
```

`Alpine.store()` wraps this object in a reactive Proxy, so the actions just mutate it: `push` a task,
flip `task.done`, assign a filtered array. That is Vue's style rather than React's, and for the same
reason. The getters are computed again whenever they're read, and because each `x-show` or `x-text` that
reads them is an effect, they re-run exactly when `tasks` or `filter` changes.

`start()` is the loading logic of every client Tasklet. A valid saved list is used as it is, including an
empty one; otherwise it fetches `tasks.json`. `load()` is also the Retry action, and its `status` drives
the three state elements. A store may also have an `init()` method that Alpine calls on registration;
Tasklet starts from `x-init` instead, so the start is visible in the markup.

### The components: `components.js`

`tasklet/alpine/src/components.js`

```js
// The per-element components, registered with Alpine.data() and used as
// x-data="taskForm" and so on. Each one sees $store.tasklet through `this`.

export function taskForm() {
  return {
    title: '',
    submit() {
      const title = this.title.trim()
      if (title === '') return
      this.$store.tasklet.add(title)
      this.title = ''
    },
  }
}

export function filterBar() {
  return {
    filters: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'done', label: 'Done' },
    ],
    isCurrent(value) {
      return this.$store.tasklet.filter === value
    },
    choose(value) {
      this.$store.tasklet.filter = value
    },
  }
}

// Lives inside x-for, so `this.task` is the loop variable of that row.
export function taskItem() {
  return {
    get deleteLabel() {
      return `Delete "${this.task.title}"`
    },
    toggle() {
      this.$store.tasklet.toggle(this.task.id)
    },
    remove() {
      this.$store.tasklet.remove(this.task.id)
    },
  }
}
```

Each function returns the data for one `x-data`, and Alpine calls it once per element, so every `<li>` gets
its own `taskItem`. Inside, `this` is the component's data merged with the scopes around it and the magics.
`this.task` is therefore the loop variable from `x-for`, and `this.$store` the store. The form clears its
`title` after adding a task, and `x-model` puts the empty value back in the input. `deleteLabel` is a
getter, so the label follows a title change.

`taskItem` reading `this.task` from its surroundings is the main difference from a real component. It only
works inside a loop that names the variable `task`, and nothing checks that. That is the price of scopes
instead of props.

### Saving: `main.js` and `storage.js`

`tasklet/alpine/src/main.js`

```js
import Alpine from 'alpinejs'
import { filterBar, taskForm, taskItem } from './components.js'
import { saveTasks } from './storage.js'
import { tasklet } from './store.js'
import './tasklet.css'

Alpine.store('tasklet', tasklet)
Alpine.data('taskForm', taskForm)
Alpine.data('filterBar', filterBar)
Alpine.data('taskItem', taskItem)

// Re-runs whenever anything it read changes. saveTasks() stringifies the
// whole list, so it reads (and so depends on) every task's every field.
const store = Alpine.store('tasklet')
Alpine.effect(() => {
  if (store.ready) saveTasks(store.tasks)
})

Alpine.start()
```

`tasklet/alpine/src/storage.js`

```js
import { isTaskList } from './tasks.js'

const STORAGE_KEY = 'tasklet:v1'

// The saved list, or null if there is none or it isn't a valid task list.
export function loadSavedTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isTaskList(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export async function fetchTasks() {
  const response = await fetch('./tasks.json')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
  return data
}
```

The components and the store must be registered before `Alpine.start()`. The script is a module, which
the browser runs after parsing the page, so when `Alpine.start()` runs, the whole document is there.

Persistence is one `Alpine.effect()`. It runs once immediately, recording what it read, and again
whenever any of that changes. `saveTasks()` calls `JSON.stringify(store.tasks)`, which reads every task and
every field, so adding, toggling, removing or clearing all re-run it. Vue needs `{ deep: true }` for the
same result; here the stringify does the deep reading. Thanks to Alpine's scheduler, `clearDone()` produces
one save, not one per removed task. The `if (store.ready)` guard matters: without it, the empty initial list
would be saved before the fetch finishes, and a failed fetch would leave `[]` in storage, so the next visit
would show an empty list instead of trying again.

Two alternatives were rejected. `$watch('$store.tasklet.tasks', …)` would also work, but it is a magic of
a component, so it would have to live in an `x-init` somewhere in the page. And `@alpinejs/persist`, the
official plugin for exactly this job, can't meet Tasklet's storage rules; Exercise 2 shows why.

`storage.js` is the same as in the React and Vue chapters, in JavaScript. `loadSavedTasks()` returns
`null` for anything that isn't a valid task list, including JSON that doesn't parse.

### The manifest

`tasklet/alpine/tasklet.json`

```json
{
  "name": "Alpine.js",
  "port": 4313,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

No skips: the Alpine version has the loading state, the error state with Retry, and the `localStorage`
format of the other client apps.

### Build it and run it

```console
$ cd tasklet/alpine
$ npm ci
$ time npm run build

> tasklet-alpine@0.0.0 build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 11 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  2.56 kB │ gzip:  1.00 kB
dist/assets/index-BeKL5seo.css   2.38 kB │ gzip:  0.95 kB
dist/assets/index-DNaMWPmo.js   56.95 kB │ gzip: 20.09 kB

✓ built in 82ms

real	0m0.285s

$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DNaMWPmo.js     56.95 kB    19.86 kB
index.html                    2.57 kB     1.00 kB
total                        61.91 kB    21.82 kB
```

(`size.mjs` compresses at zlib level 9, so its gzip numbers differ slightly from Vite's; the course
compares `size.mjs` totals.) 21.82 kB is less than a third of React's 70.14 kB and less than Vue's
28.37 kB, which contains the same reactivity package. Svelte's 17.76 kB is smaller still. Almost all of
Alpine's bundle is Alpine itself: the app code is 239 lines, 64 of them in `index.html`
(`wc -l index.html src/*.js`). Unlike htmx's, this number covers the whole app; after loading, nothing
else is downloaded.

```console
$ cd ../e2e
$ node run-all.mjs alpine

=== Alpine.js (tasklet/alpine, port 4313) ===

$ npm run build    (in /home/tbangma/learn-web-frameworks/tasklet/alpine)
…
$ npm run preview &    (in /home/tbangma/learn-web-frameworks/tasklet/alpine)

> tasklet-alpine@0.0.0 preview
> vite preview --port 4313 --strictPort

  ➜  Local:   http://localhost:4313/
  ➜  Network: use --host to expose

$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 15 workers
…
  15 passed (1.9s)

Summary
app     port  build  passed  failed  skipped  note
alpine  4313  ok     15      0       0
```

All fifteen pass, with nothing skipped.

## Beyond Tasklet

### The CSP build

A Content Security Policy without `'unsafe-eval'` forbids the `AsyncFunction` constructor, and with it
the standard build. Alpine's answer is `@alpinejs/csp`, a build with its own expression parser that never
creates functions from strings. Its docs list what that parser supports: property access, literals,
arithmetic, comparisons, the ternary operator, method calls, simple assignments such as `count = 0` or
`count++`, and `x-model`. Not supported:

- assignments to properties (`user.name = 'John'`)
- arrow functions, destructuring, template literals and the spread operator
- globals such as `console`, `document`, `Math` or `JSON`
- `x-html`

The docs' advice is the same as Tasklet's style: move logic into `Alpine.data()` components and getters,
and keep attributes to names and method calls. Exercise 1 runs Tasklet, unchanged, with the CSP build.

### Plugins

Official plugins are separate packages, registered with `Alpine.plugin()` before `Alpine.start()`:

- **Persist** (`@alpinejs/persist`): `$persist(value)` saves a property to `localStorage` (or another
  storage with `.using()`) under a key of your choice with `.as('key')`, or `_x_` plus the property name.
- **Focus**: `x-trap` keeps keyboard focus inside a dialog while an expression is true, and `$focus`
  moves focus around.
- **Intersect**: `x-intersect` runs an expression when an element scrolls into view, for lazy loading and
  infinite scroll.
- **Morph**: `Alpine.morph(el, html)` patches an element to match new HTML while keeping Alpine's state and
  the browser's (focus, input values). Its docs say a utility like it "is at the core of full-stack
  frameworks like Laravel Livewire and Phoenix LiveView".
- **Collapse**: `x-collapse` animates the height of an element shown with `x-show`.

There are also `mask` (input masks), `anchor` (position an element next to another), `sort` (drag to
reorder) and `resize`. Each is small and loaded only if you use it.

### Alpine and htmx

htmx and Alpine split the work along the line htmx's essays draw. Gross's "Hypermedia-Friendly Scripting"
names Alpine as one of the libraries that practice inline scripting, and gives the rule for which state
may live in the browser:

> The crucial aspect to consider is whether any state updated on the client side needs to be synchronized with the server. If yes, then a hypermedia exchange should be used. If no, then it is fine to keep the state client-side only.
>
> — Carson Gross, "Hypermedia-Friendly Scripting" (2022)

By that rule, a Tasklet built for real on htmx would keep the tasks on the server and use Alpine for
anything that doesn't need saving: a dropdown, a "show details" toggle, the character count of the title.
The two libraries don't know about each other, and they don't need to. When htmx inserts a fragment that
contains `x-data`, Alpine's `MutationObserver` initializes it (Exercise 3 shows this). The friction is in
swaps: when htmx replaces an element, any Alpine state inside it is lost. A morphing swap, such as the
`alpine-morph` htmx extension built on Alpine's Morph plugin, keeps it.

### Laravel Livewire and the TALL stack

Livewire takes the server-rendering idea further. A Livewire component is a PHP class with a Blade
template. `wire:click` or `wire:model` sends the interaction to the server, the class updates and
re-renders, and Livewire morphs the new HTML into the page. Livewire 4.0 was released on January 14,
2026; the latest version is 4.4.8 (October 21, 2026). Its docs say that "Livewire ships with Alpine out of
the box", and they expose each component to Alpine as the `$wire` object, so an Alpine expression can read
`$wire.content` or call a PHP method. Tailwind CSS, Alpine, Laravel and Livewire together are known as
the **TALL stack**, a popular way to build interactive Laravel apps without a JavaScript single-page app.

### Where Alpine stops scaling

Alpine's limits all follow from putting code in attributes:

- **No checking.** Expressions are strings. A misspelled `$store.taskelt` is an "Alpine Expression Error"
  in the console when that line runs, not a compile error. TypeScript can't help, and editor support comes
  from extensions.
- **No real components.** There are no props, slots or component files. Reuse means a server-side partial
  that repeats the markup, or `Alpine.data()` plus the markup copied wherever it is used. Data reaches
  nested components by scope, as `taskItem` reads `task`, and that coupling is invisible.
- **Global state is global.** `$store` is shared by the whole page, and anything can change it.
- **No compiler.** Every expression is parsed at runtime (once each; Alpine caches the function), and
  every directive is an effect. Nothing is optimized ahead of time, as in Svelte or Vue's compiler.
- **Testing** means a browser: there is no official way to render an Alpine component in isolation, so
  tests drive the real page with Playwright, as the acceptance test does.

None of that matters for a menu, and all of it matters for an app with dozens of screens built by a team.
That is where a component framework earns its build step.

## Strengths and trade-offs

| Strengths | Trade-offs |
| --- | --- |
| No build step needed; a `<script>` tag and HTML attributes | Logic in strings: no types, no compile-time errors, weaker editor support |
| Works on any HTML, including server-rendered pages and fragments htmx inserts | No props, slots or component files; scope-based data flow is implicit |
| Vue's syntax and Vue's fine-grained reactivity, learned in an afternoon | The standard build needs `unsafe-eval`; the CSP build supports less syntax |
| Small: 21.82 kB gzip for all of Tasklet | Not much smaller than Vue's 28.37 kB for a full client app; Svelte is smaller |
| Official plugins cover common UI needs (focus traps, collapse, persist, morph) | Testing needs a real browser; there is no component test story |
| First-class partner of Livewire, htmx and server frameworks | Not designed for large single-page apps; no router, no SSR of its own |

## Compared with Vue and htmx

Alpine's markup is Vue's. Here is a task row in each:

`tasklet/vue/src/components/TaskItem.vue`

```vue
<script setup lang="ts">
import type { Task } from '../tasks.ts'

defineProps<{ task: Task }>()

defineEmits<{ toggle: []; remove: [] }>()
</script>

<template>
  <li :class="['task', { done: task.done }]">
    <label>
      <input type="checkbox" :checked="task.done" @change="$emit('toggle')" /> <span>{{ task.title }}</span>
    </label>
    <button type="button" class="delete" :aria-label="`Delete &quot;${task.title}&quot;`" @click="$emit('remove')">
      ×
    </button>
  </li>
</template>
```

`tasklet/alpine/index.html` (excerpt)

```html
        <template x-for="task in $store.tasklet.visible" :key="task.id">
          <li class="task" :class="{ done: task.done }" x-data="taskItem">
            <label>
              <input type="checkbox" :checked="task.done" @change="toggle" />
              <span x-text="task.title"></span>
            </label>
            <button type="button" class="delete" :aria-label="deleteLabel" @click="remove">×</button>
          </li>
        </template>
```

`:class`, `:checked`, `@change` and `:aria-label` mean the same in both. The differences are around the
markup. Vue's `TaskItem` declares a typed `task` prop and emits `toggle` and `remove`, and the compiler
checks the template against them. Alpine's row has no declared inputs; it reads `task` from the loop and
calls the store. Vue compiles the template to a render function at build time; Alpine reads the attributes
in the browser.

Persistence shows the shared engine. Vue watches the tasks with an explicit deep watcher:

`tasklet/vue/src/App.vue` (excerpt)

```ts
// Save after every change: a new array, or a change inside it (deep).
watch(
  tasks,
  (current) => {
    if (current !== null) saveTasks(current)
  },
  { deep: true },
)
```

Alpine's `Alpine.effect()` is Vue's `watchEffect`: no source list, just the reads the function makes.

Against htmx, the split is where the state lives. In htmx the server owns the tasks and every toggle is a
round trip that returns HTML; in Alpine the browser owns them, every change is instant, and the server
only hands out `tasks.json`. The htmx version could not pass the `localStorage` tests; the Alpine version
couldn't share tasks between two browsers. [Appendix A](appendix-a-rosetta-stone.md) lines up these
concepts across every framework in the course.

## Summary

- Alpine adds behavior to HTML with `x-*` attributes. An `x-data` element is a component, and its
  directives are effects that keep the DOM in sync with its data.
- The reactivity is Vue's: `alpinejs` depends on `@vue/reactivity`, so data is a Proxy, effects track
  what they read, and Alpine batches updates into a microtask. There is no virtual DOM and no compiler.
- Tasklet in Alpine is plain JavaScript: a `$store.tasklet` holds the state, getters and actions, and
  `Alpine.data()` components (`taskForm`, `filterBar`, `taskItem`) stand in for the course's components,
  with scope instead of props. `x-init` starts the load, and `Alpine.effect()` saves after every change.
- It passes all 15 acceptance tests, with nothing skipped, in 21.82 kB gzipped and 239 lines.
- Attribute expressions are compiled with the `AsyncFunction` constructor at runtime, so a strict CSP
  needs the `@alpinejs/csp` build and simpler expressions.
- Alpine pairs with server rendering: with htmx for state that stays in the browser, and inside Livewire,
  which ships it. Its limits (no types, no props, no compiler) show in large apps.

## Exercises

1. **Run Tasklet under a strict CSP.** Build the Alpine Tasklet, unchanged, with `@alpinejs/csp`, serve
   it under `Content-Security-Policy: script-src 'self'` and run the acceptance test against it. Then
   serve the standard build under the same policy and compare.

   <details><summary>Solution</summary>

   `examples/ch14/csp/vite.config.js` builds `tasklet/alpine` with an alias that swaps the import and a
   small plugin that adds the policy as a `<meta>` tag:

   `examples/ch14/csp/vite.config.js`

   ```js
   // Exercise 1: build the Alpine Tasklet, unchanged, with Alpine's CSP build
   // and serve it under a Content-Security-Policy that forbids eval().
   import { fileURLToPath } from 'node:url'
   import { defineConfig } from 'vite'

   const policy = "script-src 'self'"

   export default defineConfig({
     root: fileURLToPath(new URL('../../../tasklet/alpine', import.meta.url)),
     build: {
       outDir: fileURLToPath(new URL('dist', import.meta.url)),
       emptyOutDir: true,
     },
     resolve: {
       // Every `import Alpine from 'alpinejs'` gets the CSP build instead.
       alias: {
         alpinejs: fileURLToPath(new URL('../node_modules/@alpinejs/csp/dist/module.esm.js', import.meta.url)),
       },
     },
     plugins: [
       {
         name: 'csp-meta',
         transformIndexHtml: (html) =>
           html.replace(
             '<meta charset="UTF-8" />',
             `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
           ),
       },
     ],
   })
   ```

   The alias names the ESM file directly. Resolving the package with `import.meta.resolve` picks its
   CommonJS file, which Vite bundles into a 97.80 kB script instead.

   ```console
   $ cd examples/ch14
   $ npm run csp:build
   …
   csp/dist/index.html                  2.64 kB │ gzip:  1.04 kB
   csp/dist/assets/index-BeKL5seo.css   2.38 kB │ gzip:  0.95 kB
   csp/dist/assets/index-Bon7LN74.js   72.94 kB │ gzip: 23.97 kB

   ✓ built in 63ms
   $ npm run csp:preview &
   $ cd ../../tasklet/e2e
   $ APP=alpine BASE_URL=http://localhost:4334/ TASKLET_WEBSERVER=0 npx playwright test --reporter=line
   …
     15 passed (1.9s)
   ```

   All fifteen pass, because every expression in `index.html` is a property, a comparison, a negation or
   a method call. The assignments, such as `choose()`'s `this.$store.tasklet.filter = value`, are in
   JavaScript, and `x-model` is supported.
   The CSP build is 16 kB larger (72.94 kB against 56.95 kB) because it carries an expression parser.

   The standard build under the same policy never gets going. Playwright collected 20 warnings like this
   one, one per expression, and the page stayed on "Loading tasks…" with no tasks:

   ```text
   Alpine Expression Error: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script: script-src 'self'".

   Expression: "$store.tasklet.start()"
   ```

   </details>

2. **Try `$persist`.** Replace `storage.js`'s saving and loading with `@alpinejs/persist`:
   `tasks: Alpine.$persist([]).as('tasklet:v1')`. Run the acceptance test. Which tests fail, and why can't
   the plugin be configured to pass them?

   <details><summary>Solution</summary>

   `examples/ch14/persist.diff` (apply with `patch -p1` from the course root, then `npm install` in
   `tasklet/alpine`) makes the store a function, so `$persist` exists when it's created, and drops the
   effect:

   `examples/ch14/persist.diff`

   ```diff
   --- a/tasklet/alpine/package.json
   +++ b/tasklet/alpine/package.json
   @@ -9,6 +9,7 @@
        "preview": "vite preview --port 4313 --strictPort"
      },
      "dependencies": {
   +    "@alpinejs/persist": "3.17.5",
        "alpinejs": "3.17.5"
      },
      "devDependencies": {
   --- a/tasklet/alpine/src/main.js
   +++ b/tasklet/alpine/src/main.js
   @@ -1,19 +1,13 @@
    import Alpine from 'alpinejs'
   +import persist from '@alpinejs/persist'
    import { filterBar, taskForm, taskItem } from './components.js'
   -import { saveTasks } from './storage.js'
    import { tasklet } from './store.js'
    import './tasklet.css'
    
   -Alpine.store('tasklet', tasklet)
   +Alpine.plugin(persist)
   +Alpine.store('tasklet', tasklet())
    Alpine.data('taskForm', taskForm)
    Alpine.data('filterBar', filterBar)
    Alpine.data('taskItem', taskItem)
    
   -// Re-runs whenever anything it read changes. saveTasks() stringifies the
   -// whole list, so it reads (and so depends on) every task's every field.
   -const store = Alpine.store('tasklet')
   -Alpine.effect(() => {
   -  if (store.ready) saveTasks(store.tasks)
   -})
   -
    Alpine.start()
   --- a/tasklet/alpine/src/store.js
   +++ b/tasklet/alpine/src/store.js
   @@ -1,11 +1,12 @@
   -import { fetchTasks, loadSavedTasks } from './storage.js'
   +import Alpine from 'alpinejs'
   +import { fetchTasks } from './storage.js'
    import { countLabel, visibleTasks } from './tasks.js'
    
    // The app's state, shared by every component as $store.tasklet. Alpine wraps
    // this object in a reactive proxy, so the methods simply mutate it.
   -export const tasklet = {
   +export const tasklet = () => ({
      status: 'loading',
   -  tasks: [],
   +  tasks: Alpine.$persist([]).as('tasklet:v1'),
      filter: 'all',
    
      get ready() {
   @@ -22,9 +23,7 @@
      },
    
      start() {
   -    const saved = loadSavedTasks()
   -    if (saved) {
   -      this.tasks = saved
   +    if (this.tasks.length > 0) {
          this.status = 'ready'
        } else {
          this.load()
   @@ -53,4 +52,4 @@
      clearDone() {
        this.tasks = this.tasks.filter((task) => !task.done)
      },
   -}
   +})
   ```

   Thirteen tests pass and two fail:

   ```console
     2 failed
       [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json
       [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json
     13 passed (6.5s)
   ```

   The plugin's source (`@alpinejs/persist` 3.17.5, `dist/module.esm.js`) explains both. On creation it
   reads the key with a bare `JSON.parse`, with no `try` and no check of the shape, so `{ not json` throws
   while the store is created, and the app never starts ("Expected: 3, Received: 0" items). On a first
   visit, it writes the initial value immediately, so `[]` is in storage before `tasks.json` arrives. And
   it can't tell "nothing saved" from "an empty list saved", so `start()` must guess from `length`, and
   a saved empty list is fetched again ("Expected: "0 tasks left", Received: "2 tasks left""). Fixing that
   means checking `localStorage` yourself before the plugin reads it, which is `storage.js` again.
   `$persist` is right for preferences such as a theme or a closed sidebar; Tasklet's validated format
   needs the hand-written version. Undo with `patch -R -p1`.

   </details>

3. **Alpine inside htmx fragments.** Write a page where an htmx button appends server-rendered cards,
   each with its own Alpine "Details" toggle. Do cards added after the page loaded work?

   <details><summary>Solution</summary>

   `examples/ch14/together/server.js` (`npm run together` in `examples/ch14`, then open
   `http://localhost:4434/`) serves both libraries from `node_modules` and a fragment per card:

   `examples/ch14/together/server.js`

   ```js
   // Exercise 3: htmx fetches HTML from the server; Alpine adds client-only
   // behavior to it, including to fragments htmx inserts later.
   // Run: npm run together, then open http://localhost:4434/
   import { readFileSync } from 'node:fs'
   import { createServer } from 'node:http'

   const PORT = 4434
   const scripts = {
     '/htmx.min.js': readFileSync(new URL(import.meta.resolve('htmx.org/dist/htmx.min.js'))),
     '/alpine.min.js': readFileSync(new URL(import.meta.resolve('alpinejs/dist/cdn.min.js'))),
   }

   let cards = 0

   // A server-rendered fragment that carries its own Alpine component.
   function card(n) {
     return `<article x-data="{ open: false }">
     <h2>Card ${n}</h2>
     <button type="button" :aria-expanded="open" @click="open = !open">Details</button>
     <p x-show="open">Rendered by the server at ${new Date().toISOString()}.</p>
   </article>`
   }

   const page = `<!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8">
       <title>htmx + Alpine</title>
       <script src="/htmx.min.js"></script>
       <script defer src="/alpine.min.js"></script>
     </head>
     <body>
       <button type="button" hx-get="/card" hx-target="#cards" hx-swap="beforeend">Load a card</button>
       <div id="cards"></div>
     </body>
   </html>
   `

   createServer((request, response) => {
     const script = scripts[request.url]
     if (script) {
       response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(script)
     } else if (request.url === '/card') {
       response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(card(++cards))
     } else if (request.url === '/') {
       response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page)
     } else {
       response.writeHead(404).end('Not found')
     }
   }).listen(PORT, () => console.log(`htmx + Alpine on http://localhost:${PORT}/`))
   ```

   A Playwright script clicked "Load a card" twice, then the second card's Details button:

   ```console
   expanded: false true
   visible: false true
   ```

   Both cards were initialized, though neither existed when Alpine started: Alpine's `MutationObserver`
   saw htmx insert them. Each `<article>` has its own `open`, so opening card 2 left card 1 closed. The
   fragment needs no script and no setup; the behavior travels with the HTML.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-14--alpinejs)
