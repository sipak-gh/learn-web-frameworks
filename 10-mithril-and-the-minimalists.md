# Chapter 10 — Mithril and the Minimalists

React, Vue, Svelte and Preact each come with a compiler, a plugin or a JSX transform, and an ecosystem
around them. This chapter looks at libraries that offer much less, and are built that way on purpose.
**Mithril** is a 2014 framework that fits a virtual DOM, a router and an HTTP client into about 9 kB, and
you write it in plain JavaScript function calls with no build step required. **VanJS** goes further. Its core
is about 1 kB and offers five functions: one makes reactive state, one builds real DOM elements, and a
binding updates only the property or text that reads a state. You build Tasklet in both, measure them, and
find where small turns into extra work for you.

Two questions come up whenever these libraries do, and the chapter answers them with data you can check:
is Mithril still in use, and does VanJS really weigh 1 kB? It ends with short notes on Hyperapp, Inferno,
Arrow and Million, which you may still meet, and on what "minimal" buys and costs. The next chapter goes
the opposite way: Qwik, a framework with a compiler that splits your app into many small lazy-loaded
pieces.

## At a glance

| | Mithril | VanJS |
| --- | --- | --- |
| First released | April 2014 (npm 0.1.2); 1.0 in January 2017, 2.0 in July 2019 | July 31, 2023 (1.0.0; the repository opened in May 2023) |
| Current version | 2.3.8 (November 8, 2025) | 1.6.2 (November 1, 2026); VanX `vanjs-ext` 0.6.4 (November 1, 2026) |
| Created by / maintained by | Leo Horie; now a volunteer team (most 2025 commits are by kfule, with James Forbes and Claudia Meadows). No company or foundation | Tao Xin, who still writes most of it, as a personal open source project |
| License | MIT | MIT |
| Rendering model | Virtual DOM: `view()` builds a tree of vnodes, which is diffed against the last one | Real DOM built by functions; no virtual DOM. Binding functions replace only what they produced |
| Reactivity model | None to declare. State is plain variables; Mithril redraws everything after event handlers, `m.request` and route changes | Signals: `van.state` and `van.derive`; VanX turns objects and arrays into a state per field |
| Templates | Hyperscript: `m('li.task', attrs, children)` (JSX is possible with a Babel or esbuild setting) | Tag functions: `li({ class: 'task' }, children)` from the `van.tags` proxy |
| Language | JavaScript; types from the community package `@types/mithril` | JavaScript; TypeScript declarations ship in the package |
| Tasklet build size | 11.94 kB gzip (31.69 kB raw), measured with `tasklet/tools/size.mjs` | 4.95 kB gzip (11.12 kB raw), measured the same way |
| Meta-framework | None; `mithril-node-render` renders to a string on the server | None; Mini-Van renders on the server and VanJS can hydrate it |
| Good fit for | Small to medium single-page apps that want routing and requests included without a build step or a large dependency tree | Widgets, small apps and pages enhanced with a little interactivity, where bytes or a build step matter |

## Why it exists

### Mithril: a whole framework you can read

Leo Horie released Mithril in 2014, when AngularJS and Backbone dominated and React was a year old. React
had shown that re-rendering a virtual DOM and diffing it was fast enough for real apps. Mithril took that
idea and added the parts React left to other libraries: a router and an XHR wrapper. It came in one file
you could read in an afternoon. It also used *hyperscript*, function calls instead of JSX, so it needed no
compiler; you could add a `<script>` tag and start.

The other idea was to make redrawing automatic. React asks you to call `setState` so it knows that
something changed. Mithril assumes that the things that change state are the events you handle, the
requests you make and the route changes, so it redraws after each of them. Your state can be any
variable or object, and you change it by assigning to it. The 1.0 rewrite (2017) and 2.0 (2019) changed the
component and request APIs, but this model has stayed the same for twelve years.

### VanJS: the bash of UI

VanJS appeared in 2023, after signals had become popular again with Solid and Preact Signals. Tao Xin
asked how small a reactive UI library could be if it did only two things: build DOM elements from plain
functions, and update those elements when state changes. The answer is a 1 kB core: no JSX, no
templates, no virtual DOM, no build tool and no components beyond functions that return elements. The
name is short for "Vanilla JavaScript": the project describes itself as vanilla JavaScript plus syntax
sugar.

> VanJS is the scripting language for UI, just like bash is the scripting language for terminal.
>
> — Tao Xin, "Story behind VanJS" (2023)

The comparison is useful because it suggests where VanJS stops. You don't write a large program in
bash; you write short scripts that glue things together. VanJS is meant to be equally easy to start with
and equally unceremonious.

## The mental model

### Mithril: redraw everything, diff, patch

A Mithril component is an object with a `view` method that returns *vnodes*, plain objects describing
elements. `m('li.task', { class: 'done' }, 'Read')` makes one such vnode. When Mithril redraws, it calls
`view()` for every component that is mounted, builds a new vnode tree, compares it with the previous tree
and changes only the DOM that differs, like React does.

```text
  onclick / onsubmit handler     m.request settles     route changes
  defined in a view
            │                           │                    │
            └─────────────┬─────────────┴────────────────────┘
                          ▼
            redraw scheduled (at most once per animation frame)
                          ▼
            every mounted component's view() runs again
                          ▼
            new vnode tree ──diff──▶ previous vnode tree
                          ▼
            patch the DOM nodes that changed
```

What triggers a redraw is the key point. Mithril wraps every event handler you put on a vnode, and after
your handler returns, it schedules a redraw. It does the same when a promise from `m.request` settles,
and when the route changes. It does **not** know about anything else: a `setTimeout`, a WebSocket
message, a plain `fetch`, a third-party library's callback. For those you call `m.redraw()` yourself. You
can also opt out for one event by setting `event.redraw = false`.

Mithril's documentation describes the event-handler case like this, in a code comment:

> a redraw happens synchronously after this function runs
>
> — Mithril.js documentation, "The auto-redraw system" (2026)

In version 2.3.8 that isn't quite what happens. The redraw is scheduled through `requestAnimationFrame`, so
it runs before the next frame is painted, not as your handler returns. In a Playwright check, the DOM was
unchanged right after a click and after a microtask, and updated after the next animation frame. You only
notice the difference if code reads the DOM directly after a handler; `m.redraw.sync()` exists for that.
Since 2.3.0 (May 2025), a handler that returns a promise (an `async` function, say) also gets a second
redraw when the promise settles.

Redrawing everything sounds expensive, but it rarely is: diffing a few hundred vnodes takes well under a
millisecond. Where it does matter, a component's `onbeforeupdate` can return `false` to skip its subtree.

### VanJS: state bound to the DOM

VanJS has no render cycle. `van.tags` gives you a function per HTML tag; calling `li(...)` creates a real
`<li>` element right away. A `van.state` is a signal with a `.val` property. Two things subscribe to it:

```text
  const done = van.state(false)

  binding function            reads done.val    ──▶ one DOM property or one child node
  class: () => done.val ? 'task done' : 'task'      (re-run when done changes)

  van.derive(() => …)         reads done.val    ──▶ a new state, or just a side effect
                                                    (re-run when done changes)

  done.val = true  ──▶  queued; in the next microtask VanJS re-runs every binding
                        and derive that read `done`, and nothing else
```

A **binding** is a function passed where a value is expected: as a property (`class: () => …`) or as a
child (`() => countLabel(tasks)`). VanJS runs it once, records which states it read, and runs it again
when one of them changes. For a property, it sets the property. For a child, it replaces the DOM node that
the function returned last time with the new one. Nothing else is touched; there is no diff. Changes are
batched: setting three states in a row updates the DOM once, in a microtask.

Two consequences follow. First, a component is just a function that runs once and returns elements; there is
no re-render to optimize. Second, if a child binding returns a large subtree, all of it is rebuilt when the
binding re-runs. That's the problem VanX solves for lists, as you'll see in Tasklet.

### Hyperscript and tag functions

Both libraries build markup with function calls. Mithril parses a CSS-like selector:
`m('input#new-task[type=checkbox].big', attrs, children)` creates an `<input>` with an `id`, an attribute
and a class. VanJS uses a `Proxy`: any property of `van.tags` becomes a function for that tag name, so
`const { li, span } = van.tags` gives you `li()` and `span()`. In both, an optional first argument holds
attributes and event handlers, and the rest are children. The trade-off against JSX is a matter of taste:
no build step and no closing tags, but long views turn into nested parentheses.

## Code structure

### Scaffolding

Neither library has an official project generator, and neither needs one. You can load Mithril with a
`<script>` tag and VanJS with an `import` from a CDN, and the exercises at the end of this chapter do exactly
that. For an app with a dev server, a production build and npm packages, the simplest start is Vite's
vanilla template (there is a community `npm create vanjs@latest`, by thednp, but it isn't part of the VanJS
project):

```console
$ cd tasklet
$ npm create vite@latest mithril -- --template vanilla --no-interactive

> npx
> 'cva' mithril --template vanilla --no-interactive


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/.webfw-shared/ch10-12/scaffold/mithril...
│
└  Done. Now run:

  cd mithril
  npm install
  npm run dev
```

The generated project is a demo page with a counter:

```text
mithril/
├── index.html           <div id="app"> + <script type="module" src="/src/main.js">
├── package.json         scripts dev, build, preview; devDependencies: vite only
├── public/              favicon.svg, icons.svg
└── src/
    ├── main.js          builds the demo page with innerHTML
    ├── counter.js       a click counter in plain DOM code
    ├── style.css
    └── assets/          hero.png, javascript.svg, vite.svg
```

Tasklet deletes `src/` and `public/`, adds the library (`npm install mithril` or
`npm install vanjs-core vanjs-ext`), pins the versions and the ports, and writes its own files. There is no
Vite plugin and no `vite.config.js`: both libraries are ordinary npm packages.

### JavaScript, not TypeScript

The other Tasklet apps use TypeScript, and the template also has a `vanilla-ts` variant. These two use
plain JavaScript, for three reasons. Both libraries are designed to work without a build step, and code you could
paste into a `<script type="module">` shows that best. The code is short enough that types add little. And
in Mithril's case the types aren't part of the library: they come from the community package
`@types/mithril`, and hyperscript's string selectors (`'input[type=checkbox]'`) give the type checker little
to work with. The one place where types help, the shape of a task, is documented with JSDoc `@typedef`
comments in `tasks.js`, which editors read just as they read TypeScript.

### Anatomy of a component

Mithril has three kinds of component. A plain object with a `view` method is stateless. A **closure
component** is a function that runs once, keeps its state in local variables and returns that object. (A
class with a `view` method also works.) Attributes from the parent arrive as `vnode.attrs`:

```js
function Counter() {
  let count = 0 // state: a plain variable
  return {
    view: ({ attrs }) => m('button', { onclick: () => count++ }, `${attrs.label}: ${count}`),
  }
}
```

Lifecycle methods sit on the same object: `oninit` (before the first view), `oncreate` (after the DOM exists),
`onbeforeupdate` (return `false` to skip a redraw), `onupdate`, `onbeforeremove` (return a promise and
Mithril waits for it, which is how exit animations work) and `onremove`. Exercise 3 prints their order.

A VanJS component is a function that returns an element:

```js
function Counter({ label }) {
  const count = van.state(0)
  return button({ onclick: () => count.val++ }, label, ': ', count)
}
```

Passing a state directly as a child (`count`) or property binds it, like `() => count.val`. VanJS has no
lifecycle methods. Setup is the function body, and cleanup is handled by VanJS itself: bindings attached to
elements that have left the page are garbage-collected every second.

Conventions are yours to choose in both. Tasklet uses one file per component in `src/components/`, PascalCase
names and named exports, the same layout as the other Tasklet apps.

## Building Tasklet in Mithril

`tasklet/mithril/` has seven source files, like the React version: `main.js`, `App.js`, three components in
`src/components/`, and `tasks.js` and `storage.js`. `tasks.js` holds the JSDoc types, `isTaskList`,
`visibleTasks` and `countLabel`, the same helpers as React's `tasks.ts` minus the type syntax.
`tasklet.css` and `tasks.json` come from `tasklet/shared/`.

### `package.json` and `main.js`

```json
{
  "name": "tasklet-mithril",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4308 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 4308 --strictPort"
  },
  "dependencies": {
    "mithril": "2.3.8"
  },
  "devDependencies": {
    "vite": "8.3.5"
  }
}
```

```js
import m from 'mithril'
import { App } from './App.js'
import './tasklet.css'

m.mount(document.getElementById('app'), App)
```

`m.mount` renders `App` into the element and turns on auto-redraw. (`m.render` would render once, with no
auto-redraw, and `m.route` mounts with routing.)

### `storage.js`

The localStorage helpers are the same as in every other version. The fetch is not:

`tasklet/mithril/src/storage.js` (excerpt)

```js
// m.request instead of fetch: Mithril redraws after the promise chain built
// on it settles. It rejects for HTTP errors (status outside 2xx/304) too.
export function fetchTasks() {
  return m.request({ url: './tasks.json' }).then((data) => {
    if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
    return data
  })
}
```

`m.request` parses the JSON, rejects when the status is not a success, and, most importantly, triggers a
redraw when the promise chain settles. With `fetch` you would get the same data, but the page would keep
showing "Loading tasks…" until something else caused a redraw, unless you called `m.redraw()` yourself.
Using `m.request` lets Mithril's auto-redraw cover the async part of Tasklet too.

### `App.js`

```js
import m from 'mithril'
import { FilterBar } from './components/FilterBar.js'
import { TaskForm } from './components/TaskForm.js'
import { TaskItem } from './components/TaskItem.js'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.js'
import { countLabel, visibleTasks } from './tasks.js'

// A closure component: App() runs once, its local variables are the state,
// and view() reads them again on every redraw. Mithril redraws after every
// event handler in a view and after m.request settles, so the handlers just
// assign to variables.
export function App() {
  let tasks = loadSavedTasks() // null until loaded
  let failed = false
  let filter = 'all'

  // Every change to the list goes through here, so every change is saved.
  function setTasks(next) {
    tasks = next
    saveTasks(tasks)
  }

  function load() {
    failed = false
    fetchTasks().then(setTasks, () => {
      failed = true
    })
  }

  function content() {
    if (failed) {
      return [
        m('p', { role: 'alert' }, "Couldn't load tasks."),
        m('button', { type: 'button', onclick: load }, 'Retry'),
      ]
    }
    if (tasks === null) return m('p', { role: 'status' }, 'Loading tasks…')

    const visible = visibleTasks(tasks, filter)
    if (visible.length === 0) return m('p.empty', 'Nothing to show.')
    return m(
      'ul.tasks',
      { 'aria-label': 'Tasks' },
      visible.map((task) =>
        m(TaskItem, {
          key: task.id,
          task,
          onToggle: () => setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))),
          onRemove: () => setTasks(tasks.filter((t) => t.id !== task.id)),
        }),
      ),
    )
  }

  return {
    oninit() {
      if (tasks === null) load()
    },
    view: () =>
      m(
        'main.tasklet',
        m('h1', 'Tasklet'),
        m(TaskForm, {
          onAdd: (title) => setTasks([...(tasks ?? []), { id: crypto.randomUUID(), title, done: false }]),
        }),
        m(FilterBar, { filter, onChange: (next) => (filter = next) }),
        content(),
        tasks !== null &&
          m(
            'footer.footer',
            m('p.count', { 'aria-live': 'polite' }, countLabel(tasks)),
            m(
              'button.clear',
              {
                type: 'button',
                disabled: !tasks.some((task) => task.done),
                onclick: () => setTasks(tasks.filter((task) => !task.done)),
              },
              'Clear done',
            ),
          ),
      ),
  }
}
```

This is a closure component. `App()` runs once; `tasks`, `failed` and `filter` are ordinary variables in its
closure. The handlers assign to them (`filter = next`) or call `setTasks`, and nothing tells Mithril about
the change: it redraws because the handler ran from a view.

Tasklet's requirements map onto plain JavaScript:

- **Derived state** is computed in `view()`. `visibleTasks(tasks, filter)` and `countLabel(tasks)` run on
  every redraw, which is cheap, and can't get out of date.
- **Persistence** happens in `setTasks`, the only function that changes the list. Mithril has no effects to
  watch state with, so you put the side effect where the change happens. The initial fetch goes through
  `setTasks` too, so the seed list is saved.
- **Conditional rendering** is `if` and `&&`. `content()` returns an array for the error state (Mithril
  renders arrays as fragments), and `tasks !== null && m(...)` leaves a hole when it is `false`.
- **Lists with keys**: `key: task.id` in the attributes, as in React. Mithril requires that all siblings in an
  array be keyed or none.
- **Events from child to parent** are callbacks in attributes, such as `onToggle` and `onRemove`.
- **Loading** starts in `oninit`, which runs once before the first view. Retry calls `load()` from a click
  handler, so the redraw after the click shows the loading state, and `m.request` redraws again with the
  result.

### The components

```js
import m from 'mithril'

// The "Add task" form. A closure component: `title` lives as long as the
// form does. Calls onAdd with the trimmed title; ignores blanks.
export function TaskForm() {
  let title = ''

  return {
    view: ({ attrs: { onAdd } }) =>
      m(
        'form.add',
        {
          'aria-label': 'Add task',
          onsubmit(event) {
            event.preventDefault()
            const trimmed = title.trim()
            if (trimmed === '') return
            onAdd(trimmed)
            title = ''
          },
        },
        m('label', { for: 'new-task' }, 'New task'),
        m('input#new-task', {
          name: 'title',
          autocomplete: 'off',
          value: title,
          oninput: (event) => (title = event.target.value),
        }),
        m('button', { type: 'submit' }, 'Add'),
      ),
  }
}
```

`TaskForm` keeps the input's text in `title`, so it's a closure component. The input is controlled: `value`
comes from the variable and `oninput` writes it back, and after the redraw that follows `onsubmit`, the input
shows the cleared value. Event names are the DOM's, all lowercase.

```js
import m from 'mithril'

// One task. Stateless: it reads everything from attrs on every redraw.
export const TaskItem = {
  view: ({ attrs: { task, onToggle, onRemove } }) =>
    m(
      'li.task',
      { class: task.done ? 'done' : undefined },
      m(
        'label',
        m('input[type=checkbox]', { checked: task.done, onchange: onToggle }),
        ' ',
        m('span', task.title),
      ),
      m(
        'button.delete',
        { type: 'button', 'aria-label': `Delete "${task.title}"`, onclick: onRemove },
        '×',
      ),
    ),
}
```

`TaskItem` and `FilterBar` hold no state, so they are plain objects with a `view`. The selector
`input[type=checkbox]` sets the attribute; `checked: task.done` sets the property. Mithril decides between
attribute and property by itself, using the property when the element has one. `FilterBar` maps the three
filters to buttons with `'aria-pressed': String(value === filter)` and `role=group` in its selector, like
the React version.

### Build it and run it

```console
$ cd tasklet/mithril
$ npm run build

> tasklet-mithril@0.0.0 build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 38 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.40 kB │ gzip:  0.27 kB
dist/assets/index-BeKL5seo.css   2.38 kB │ gzip:  0.95 kB
dist/assets/index-B7foV_Ex.js   28.90 kB │ gzip: 10.78 kB

✓ built in 84ms
$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-B7foV_Ex.js     28.90 kB    10.71 kB
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
index.html                    0.40 kB     0.28 kB
total                        31.69 kB    11.94 kB
```

The 38 modules are mostly Mithril's own CommonJS files (the package isn't an ES module build, so the bundler
can't drop the router or `m.request` even when you don't use them). At 11.94 kB gzipped, Mithril Tasklet is
almost exactly the size of the Preact version from [Chapter 9](09-preact.md), 11.74 kB, and the source is
224 lines against React's 249. Then the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs mithril
=== Mithril (tasklet/mithril, port 4308) ===
…
Running 15 tests using 15 workers

  ✓  10 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (359ms)
  ✓   2 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (438ms)
…
  ✓  15 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (734ms)
  ✓  12 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (1.9s)

Summary
app      port  build  passed  failed  skipped  note
mithril  4308  ok     15      0       0
```

All 15 pass, with no skips; `tasklet/mithril/tasklet.json` is the same as the other manifests apart from the
name and port.

## Building Tasklet in VanJS

`tasklet/vanjs/` has the same seven files. `storage.js` uses plain `fetch`, since VanJS has no HTTP helper and
needs none: setting a state from anywhere, including after an `await`, updates the DOM. `tasks.js` has
`matchesFilter(task, filter)` for one task, in place of `visibleTasks` for the list, for a reason you'll see
in `App.js`. `package.json` is the same as Mithril's apart from the dependencies, `vanjs-core` 1.6.2 and
`vanjs-ext` 0.6.4, and `main.js` calls `van.add(document.getElementById('app'), App())`, which appends the
elements `App()` returns.

### Lists: core VanJS or VanX?

The core library gives you one way to render a list: a binding function that builds the whole list from a
state holding an array.

```js
const tasks = van.state([])
main(() => ul(tasks.val.map(TaskItem)))
```

That works, but each change (ticking one checkbox) replaces the array, and the binding rebuilds the whole
`<ul>`. Every `<li>` is a new element, so the checkbox you just clicked is no longer the one with focus.
Exercise 4 measures it: after a toggle, the core version's first `<li>` is a different element and focus
is back on `<body>`; with VanX, the element is the same and the checkbox keeps focus. For Tasklet that's a
keyboard accessibility bug, not just wasted work.

**VanX** (`vanjs-ext`) is the official extension for this, about 1.3 kB more (1,277 bytes gzipped, measured
in Exercise 5). It adds:

- `vanX.reactive(obj)`, which wraps an object or array in a `Proxy` whose fields are states, so that
  `task.done = true` updates only the bindings that read `task.done`.
- `vanX.list(container, items, itemFn)`, which builds one element per item, adds and removes elements as items
  come and go, and never rebuilds the others: keyed rendering, with the item itself as the key.
- `vanX.replace(items, newItems)` to update a reactive array in place, and `vanX.compact(items)` to copy it
  without holes.

Tasklet uses VanX. Keeping the DOM stable is the main reason; the second is that it's the documented
answer for lists, so the code shows what VanJS apps look like in practice.

### `App.js`

```js
import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'
import { FilterBar } from './components/FilterBar.js'
import { TaskForm } from './components/TaskForm.js'
import { TaskItem } from './components/TaskItem.js'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.js'
import { countLabel, matchesFilter } from './tasks.js'

const { button, footer, h1, main, p, ul } = van.tags

// App runs once and returns real DOM elements. States are bound to the
// properties and text that read them; nothing re-renders as a whole.
export function App() {
  const saved = loadSavedTasks()
  const tasks = vanX.reactive(saved ?? []) // every task field becomes a state
  const status = van.state(saved ? 'ready' : 'loading') // 'loading' | 'error' | 'ready'
  const filter = van.state('all')

  const visibleCount = van.derive(
    () => tasks.filter((task) => matchesFilter(task, filter.val)).length,
  )

  // A derive whose result is ignored is an effect: save after every change.
  van.derive(() => {
    const list = vanX.compact(tasks) // reads every task, removes holes
    if (status.val === 'ready') saveTasks(list)
  })

  async function load() {
    status.val = 'loading'
    try {
      vanX.replace(tasks, await fetchTasks())
      status.val = 'ready'
    } catch {
      status.val = 'error'
    }
  }

  if (!saved) load()

  // vanX.list creates one <li> per task, adds and removes <li>s as tasks
  // come and go, and never rebuilds the others.
  const list = vanX.list(
    ul({
      class: 'tasks',
      'aria-label': 'Tasks',
      hidden: () => status.val !== 'ready' || visibleCount.val === 0,
    }),
    tasks,
    ({ val: task }, deleter) =>
      TaskItem({
        task,
        hidden: () => !matchesFilter(task, filter.val),
        onToggle: () => (task.done = !task.done),
        onRemove: deleter,
      }),
  )

  return main(
    { class: 'tasklet' },
    h1('Tasklet'),
    TaskForm({
      onAdd: (title) => tasks.push({ id: crypto.randomUUID(), title, done: false }),
    }),
    FilterBar({ filter, onChange: (next) => (filter.val = next) }),
    p({ role: 'status', hidden: () => status.val !== 'loading' }, 'Loading tasks…'),
    p({ role: 'alert', hidden: () => status.val !== 'error' }, "Couldn't load tasks."),
    button({ type: 'button', hidden: () => status.val !== 'error', onclick: load }, 'Retry'),
    list,
    p(
      { class: 'empty', hidden: () => status.val !== 'ready' || visibleCount.val > 0 },
      'Nothing to show.',
    ),
    footer(
      { class: 'footer', hidden: () => status.val !== 'ready' },
      p({ class: 'count', 'aria-live': 'polite' }, () => countLabel(tasks)),
      button(
        {
          type: 'button',
          class: 'clear',
          disabled: () => !tasks.some((task) => task.done),
          onclick: () => vanX.replace(tasks, (list) => list.filter((task) => !task.done)),
        },
        'Clear done',
      ),
    ),
  )
}
```

Compared with Mithril, `App()` runs once and nothing runs again as a whole. What re-runs are the small
functions:

- `hidden: () => status.val !== 'loading'` is a property binding. Every piece of UI is created once and
  shown or hidden. Tasklet's shared stylesheet makes `[hidden]` win over its `display` rules, and hidden
  elements are left out of the accessibility tree, so the tests see the same page as in Mithril. The
  alternative, a child binding that returns a different element per status, would rebuild the list each
  time the status changed.
- Filtering hides `<li>` elements instead of removing them, so `vanX.list` keeps one element per task.
  That's why `tasks.js` has `matchesFilter` for one task. `visibleCount` is a derived state that decides
  between the list and "Nothing to show."
- `van.derive(() => { … saveTasks(list) })` ignores its result, which makes it an effect: it reads every
  task through `vanX.compact`, so it re-runs after any change, including a single `done` flag. The VanJS
  docs use `derive` this way, and there is no separate effect function.
- Deleting from a reactive array leaves a hole (`vanX.list`'s `deleter` does that, to keep indexes
  stable). `filter` and `some` skip holes, and `compact` removes them before the array is saved.
- Bulk changes use `vanX.replace`: the fetched list replaces the empty one, and Clear done keeps the tasks
  that aren't done. VanX compares the new items with the old ones and updates the list in place.

### `TaskItem.js` and the other components

```js
import van from 'vanjs-core'

const { button, input, label, li, span } = van.tags

// One task. `task` is a VanX reactive object, so each binding function
// below re-runs only when the field it reads changes. Built once per task.
export function TaskItem({ task, hidden, onToggle, onRemove }) {
  return li(
    { class: () => (task.done ? 'task done' : 'task'), hidden },
    label(
      input({ type: 'checkbox', checked: () => task.done, onchange: onToggle }),
      ' ',
      span(() => task.title),
    ),
    button(
      {
        type: 'button',
        class: 'delete',
        'aria-label': () => `Delete "${task.title}"`,
        onclick: onRemove,
      },
      '×',
    ),
  )
}
```

`task` is a field of the reactive array, so `() => task.done` subscribes to one boolean. Ticking a checkbox
re-runs the two bindings in this item that read it (the class and `checked`), and in `App` the count, the
Clear done button and the save effect. No other item is touched. `hidden` is passed in from `App` and used as is:
a binding function works the same whether you write it here or in the parent.

`TaskForm` keeps the input text in `van.state('')` and binds `value: title`; setting `title.val = ''` after
adding clears the input. `FilterBar` receives the `filter` state itself and binds
`'aria-pressed': () => String(filter.val === value)`, so only the three buttons update when the filter
changes.

### Build it and run it

```console
$ cd tasklet/vanjs
$ npm run build

> tasklet-vanjs@0.0.0 build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 13 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.40 kB │ gzip: 0.27 kB
dist/assets/index-BeKL5seo.css  2.38 kB │ gzip: 0.95 kB
dist/assets/index-CCFa1m7Q.js   8.33 kB │ gzip: 3.74 kB

✓ built in 51ms
$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-CCFa1m7Q.js      8.33 kB     3.72 kB
index.html                    0.40 kB     0.28 kB
total                        11.12 kB     4.95 kB
$ cd ../e2e
$ node run-all.mjs vanjs
=== VanJS (tasklet/vanjs, port 4309) ===
…
Running 15 tests using 15 workers

  ✓   4 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks (553ms)
  ✓   9 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (480ms)
…
  ✓  15 [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All (741ms)
  ✓   5 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (2.0s)

Summary
app    port  build  passed  failed  skipped  note
vanjs  4309  ok     15      0       0
```

All 15 pass. VanJS Tasklet is 4.95 kB gzipped, the smallest in the course; the JavaScript alone is
3.72 kB, and most of that is Tasklet's own code. The source is 231 lines, a few more than Mithril's,
mostly because every dynamic value is wrapped in a function.

### Does VanJS really weigh 1 kB?

vanjs.org says VanJS is "1.0kB in the gzipped minified bundle". Exercise 5 checks that, and
Mithril's 8.8 KiB, with esbuild 0.28.2 and gzip level 9:

```console
$ cd examples/ch10
$ npm run measure
bundle                                          raw   gzip  brotli
vanjs-core (esbuild)                           2361   1179    1073
vanjs-core + vanjs-ext (esbuild)               5282   2456    2264
mithril (esbuild, whole default export)       26503  10074    8983
mithril/mithril.min.js (as published)         24697   8932    8042
```

The official minified file, `van-1.6.2.min.js`, is 1,074 bytes gzipped (1.05 KiB), so the claim holds; a
bundle that imports the npm package is about the same, 1,179 bytes. Adding VanX brings it to 2.4 kB.
Mithril's published `mithril.min.js` is 8,932 bytes, matching the 8.93 KB in its README (the homepage's
8.8 KiB is from an older build). Bundled through an app, all of Mithril comes along, 10 kB, because the
default export carries the router and request modules with it.

## Is Mithril still in use?

The question comes up because Mithril's release pace is slow and its website looks the way it did years
ago. The data, checked on November 2, 2026:

**Downloads.** npm's weekly downloads, averaged over four weeks:

| Period | `mithril` | `vanjs-core` |
| --- | --- | --- |
| May 2023 | 26,363 | — |
| November 2023 | 12,474 | 420 |
| May 2024 | 11,635 | 547 |
| October 2024 | 14,745 | 1,176 |
| May 2025 | 18,005 | 1,227 |
| November 2025 | 22,152 | 2,732 |
| May 2026 | 27,695 | 2,027 |
| October 2026 | 20,900 | 1,868 |

Mithril's numbers fell by half in 2023 and have since recovered to between 20,000 and 28,000. For scale,
Preact had 35.5 million weekly downloads in October 2026. Mithril's 21,000 is a small, steady user base, the
kind kept up by existing apps and their CI builds rather than by new projects.

**Releases.** 2.3.8, released November 8, 2025, is the current version. 2025 saw twelve releases, from
2.2.13 in January to 2.3.8, mostly bug fixes and performance work, plus one feature (2.3.0's redraw after
async handlers). Since then the repository has had four commits that aren't from bots, the last merged on
August 13, 2026, and a release pull request for 2.3.9 has been open since November 2025.

**The `next` line.** npm's `next` tag points to `3.0.0-next.102`. That looks like a Mithril 3 in progress,
but it isn't one. The project's release workflow publishes a prerelease from the main branch automatically;
it has published 103 of them under 3.0.0-next since June 2022 (47 in 2024, 35 in 2025, one in 2026). No
Mithril 3 has been announced, and the stable code ships as 2.3.x.

**People.** In January to October 2025, 80 commits landed: 50 by kfule, 11 by James Forbes and 10 by
Claudia Meadows. The repository has 14,507 stars. The community chat is on Zulip (mithril.zulipchat.com),
which the README links, along with Stack Overflow; there is no Discord.

**Users.** The README says Mithril is "used by companies like Vimeo and Nike, and open source platforms
like Lichess". The first two can't be checked from outside. The third is out of date: Lichess's current
frontend uses Snabbdom, not Mithril. A verifiable, active user is the forum software Flarum, whose 2.0 release
(October 2026) still builds its frontend on Mithril 2.2.8.

The honest answer: yes, Mithril is in use and maintained, by a few volunteers, at the pace of bug fixes. It
works, its API is stable, and an app written for 2.0 in 2019 still runs. For a new project, weigh the small
ecosystem (few component libraries, few current tutorials), types that live outside the library, and a
bus factor of about three people, against a tiny API you can learn in a day and a dependency that's
unlikely to break your code.

## Beyond Tasklet

### Mithril's router and streams

Tasklet has one page, but routing is Mithril's best-known extra, and [Chapter 16](16-state-routing-and-data.md)
points here for it. `m.route(root, defaultRoute, routes)` replaces `m.mount`. Routes map paths to components,
or to *route resolvers* whose `onmatch` can load code, check permissions or redirect. Exercise 2 puts
Tasklet's filter in the URL:

`examples/ch10/solutions/route.html` (excerpt)

```js
      // A route resolver: onmatch picks the component, or redirects.
      m.route(document.getElementById('app'), '/all', {
        '/:filter': {
          onmatch: ({ filter }) => (FILTERS.includes(filter) ? TaskList : m.route.set('/all')),
        },
      })
```

Route parameters arrive as attributes (`attrs.filter`). `m.route.Link` renders an `<a>` that navigates without
a page load, and `m.route.set` navigates from code. By default URLs use a hashbang (`#!/done`), which works
on any static host; `m.route.prefix = ''` switches to real paths, which need a server that returns
`index.html` for every route.

The optional `mithril/stream` module adds observable values (`stream()`, `stream.combine`) for derived
state. It predates the current interest in signals and isn't wired into rendering; a change still needs a
redraw.

### Server rendering

Mithril has no meta-framework. `mithril-node-render` renders vnodes to an HTML string (its last release was
3.0.2, in 2022), but Mithril can't hydrate that HTML; `m.mount` replaces it. VanJS has a better story:
**Mini-Van** (`mini-van-plate` 0.6.4) uses the same tag-function API to produce HTML strings on the server,
and `van.hydrate(dom, f)` attaches state to an existing element in the browser. The VanJS site's
"SSR & Hydration" page walks through a full example.

### The VanJS ecosystem

The vanjs.org site lists VanUI, an official set of small components (`Modal`, `Tabs`, `Tooltip`, `Toggle` and others),
and community packages such as routers (`vanjs-router`, `vanjs-routing`), a form helper and a JSX wrapper.
There are also an HTML-to-VanJS converter and a custom GPT that writes VanJS code. All of it is small and
mostly the work of single maintainers.

### Hyperapp, Inferno and others

You'll meet other minimal libraries in older code and in benchmark tables. Their status on November 2, 2026:

- **Hyperapp** (Jorge Bucaran) offered a tiny Elm-like architecture: one state object, pure actions and a
  `view`. Its last npm release is 2.0.22, from March 2022, and the repository's last commit was in March
  2025. Weekly downloads fell from 8,929 to 4,001 between May 2025 and October 2026. Treat it
  as finished software, not a choice for new work.
- **Inferno** is a React-like virtual DOM library optimized for raw speed, with its own JSX compiler plugins
  that emit specialized calls. It's alive: 10.0.0 shipped on October 4, 2026, and its maintainer, Sampo
  Kivistö, made 26 of the repository's last 30 commits, all in October 2026. Its 234,000 weekly downloads come largely from existing apps
  and dependencies.
- **Arrow** (`@arrow-js/core`) is reactive templates with tagged template literals and no build step,
  similar in spirit to VanJS. It reached 1.0 on March 20, 2026, after five years of alphas, and its repository
  now lives in the `standardagents` organization, which presents it as a UI framework "for the agentic era",
  with WASM sandboxes for running generated code. Downloads are small (7,735 a week).
- **Million** isn't a framework but a compiler that made React components faster with a "block" virtual DOM.
  Its last release is 3.1.11, from June 2024, and the repository has had no meaningful changes since.

### What "minimal" buys and what it costs

What you gain:

- **Bytes.** VanJS Tasklet is 4.95 kB; React's is 70.14 kB. On a slow phone, or in a widget embedded in
  someone else's page, that matters.
- **No build step, if you want none.** Both libraries run from a `<script>` tag or a CDN import, and the
  exercises below work straight from `node_modules/`.
- **Code you can read.** `van.js` is 141 lines. Mithril's render engine is one file. When something behaves
  oddly, you can read the source, as you did for the redraw timing above.
- **Stability.** A small API has less to change. Mithril 2 code from 2019 runs unchanged.

What you pay:

- **Everything around the library is yours to build or choose**: forms, accessibility patterns, data
  fetching, component libraries, devtools. React, Vue and Angular have mature answers for these; Mithril and
  VanJS have a few community packages.
- **Fewer people know it.** Hiring, code review and finding answers all get harder. Stack Overflow and AI
  assistants have far less Mithril and VanJS code to learn from.
- **The low-level details are yours.** VanJS's holes in arrays and Mithril's "fetch doesn't redraw" are
  the kind of thing a larger framework hides or warns about.
- **Bus factor.** A library maintained by one to three volunteers can slow down or stop, as Hyperapp did.

## Strengths and trade-offs

| Strengths | Trade-offs |
| --- | --- |
| Small: Mithril Tasklet is 11.94 kB gzipped and VanJS Tasklet 4.95 kB, the smallest in the course | Small ecosystems: few component libraries, routers or form tools, mostly maintained by one person each |
| No build step required; plain JavaScript with no JSX, template compiler or plugin | Hyperscript and tag functions get hard to read in large views, and editors can't check them like JSX or templates |
| Mithril includes routing and HTTP requests and redraws automatically; state is plain variables | Mithril's auto-redraw has blind spots: timers, `fetch` and third-party callbacks need `m.redraw()` |
| VanJS updates exactly the bound property or text, with no virtual DOM and no re-render | VanJS needs VanX for efficient lists, and VanX has its own rules (holes, `replace`, `compact`) |
| Stable APIs: Mithril 2 has been compatible since 2019, and VanJS has stayed on 1.x since 2023 | Slow release pace and small teams; Mithril's types live outside the library, and neither has meta-framework support |
| Easy to learn: a handful of functions each | Hard to hire for, and fewer tutorials, answers and examples, including in AI tools' training data |

## Compared with React

The same toggle in each version. In React, the handler asks for a new state with a setter, and React
re-renders `App` and its children:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

In Mithril, the handler assigns a new array to a variable, and the redraw that follows the event calls
every `view()` again, much like a React re-render without the setter:

`tasklet/mithril/src/App.js` (excerpt)

```js
          onToggle: () => setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))),
```

In VanJS the handler flips one field of a reactive object. Nothing re-runs except the bindings that read
`task.done`:

`tasklet/vanjs/src/App.js` (excerpt)

```js
        onToggle: () => (task.done = !task.done),
```

And the item markup, JSX against hyperscript against tag functions:

`tasklet/react/src/components/TaskItem.tsx` (excerpt)

```tsx
    <li className={task.done ? 'task done' : 'task'}>
      <label>
        <input type="checkbox" checked={task.done} onChange={onToggle} /> <span>{task.title}</span>
      </label>
      <button type="button" className="delete" aria-label={`Delete "${task.title}"`} onClick={onRemove}>
        ×
      </button>
    </li>
```

`tasklet/mithril/src/components/TaskItem.js` (excerpt)

```js
    m(
      'li.task',
      { class: task.done ? 'done' : undefined },
      m(
        'label',
        m('input[type=checkbox]', { checked: task.done, onchange: onToggle }),
        ' ',
        m('span', task.title),
      ),
      m(
        'button.delete',
        { type: 'button', 'aria-label': `Delete "${task.title}"`, onclick: onRemove },
        '×',
      ),
    ),
```

`tasklet/vanjs/src/components/TaskItem.js` (excerpt)

```js
  return li(
    { class: () => (task.done ? 'task done' : 'task'), hidden },
    label(
      input({ type: 'checkbox', checked: () => task.done, onchange: onToggle }),
      ' ',
      span(() => task.title),
    ),
    button(
      {
        type: 'button',
        class: 'delete',
        'aria-label': () => `Delete "${task.title}"`,
        onclick: onRemove,
      },
      '×',
    ),
  )
```

Mithril reads like React with the JSX desugared and the setters removed. VanJS reads like Solid without
JSX: every dynamic value is a function. [Appendix A](appendix-a-rosetta-stone.md) has the full comparison
across all frameworks, and [Chapter 15](15-reactivity-compared.md) compares the reactivity models in depth.

## Summary

- Mithril (2014) is a virtual DOM framework with a router and `m.request` built in, at 8.9 kB gzipped. You
  write views with hyperscript, `m('li.task', attrs, children)`, and keep state in plain variables, often in
  closure components.
- Mithril redraws all mounted components after view event handlers, `m.request` and route changes, at most
  once per animation frame. Anything else (timers, `fetch`) needs `m.redraw()`.
- VanJS (2023) is a 1 kB library with no virtual DOM: `van.tags` functions build real elements,
  `van.state` holds values, and binding functions and `van.derive` re-run when the states they read change,
  batched in a microtask.
- For lists, VanX's `reactive`, `list`, `replace` and `compact` give keyed updates without rebuilding the
  list; core VanJS alone rebuilds it and loses focus.
- Both apps are plain JavaScript built with Vite's vanilla template and pass all 15 tests: Mithril
  Tasklet is 11.94 kB gzipped and 224 lines, VanJS Tasklet 4.95 kB and 231 lines.
- Mithril is still used and maintained, slowly, by a few volunteers; downloads are steady at about 21,000 a
  week. Hyperapp has been dormant since 2022, Inferno is active, Million is dormant.
- Minimal libraries buy bytes, simplicity and stability, and cost you ecosystem, hiring and the work a larger
  framework would do for you.

## Exercises

The pages for these exercises are in `examples/ch10/`. They load the libraries straight from `node_modules/`,
so `npm ci` is all the setup they need. `npm run verify` opens each one in headless Chromium and prints what
happened, and `npm run measure` prints the sizes.

1. **The clock that doesn't tick.** `clock.html` counts the seconds since the page loaded, in a closure
   component with `setInterval`. Open it: the text says "0 seconds" and stays there, until you click
   Refresh, a button whose handler does nothing. Explain both, then fix the component so it ticks and doesn't
   leak its timer.

   <details><summary>Solution</summary>

   The interval callback changes `seconds`, but a timer isn't one of the things Mithril redraws after, so
   the view never runs again. Clicking Refresh runs an event handler from a view, which triggers a redraw,
   and that redraw shows the current value. The fix calls `m.redraw()` after the change, and clears the
   timer when the component is removed:

   `examples/ch10/solutions/clock.html` (excerpt)

   ```js
         function Clock() {
           let seconds = 0
           // A timer isn't a Mithril event handler, so ask for the redraw.
           const timer = setInterval(() => {
             seconds += 1
             m.redraw()
           }, 1000)
           return {
             onremove: () => clearInterval(timer),
             view: () => [
               m('p', `${seconds} seconds`),
               m('button', { type: 'button', onclick: () => {} }, 'Refresh'),
             ],
           }
         }
   ```

   ```console
   $ npm run verify
   …
   clock.html: after 2.3 s "0 seconds"; after clicking Refresh "2 seconds"
   solutions/clock.html: after 2.3 s "2 seconds"; after clicking Refresh "2 seconds"
   ```

   The same applies to a WebSocket, a `fetch` or a callback from any library that isn't Mithril.

   </details>

2. **The filter in the URL.** Put Tasklet's filter in the URL with `m.route`, so that `#!/done` shows the
   done tasks, the browser's Back button changes the filter, and an unknown filter such as `#!/someday`
   redirects to `#!/all`. Use `m.route.Link` for the links and mark the current one with
   `aria-current="page"`.

   <details><summary>Solution</summary>

   `examples/ch10/solutions/route.html` uses one route, `/:filter`, with a route resolver. `onmatch` returns
   the component for a known filter and calls `m.route.set('/all')` for anything else; the component reads
   the parameter from `attrs.filter` (the full code is in "Beyond Tasklet" above).

   ```console
   $ npm run verify
   …
   route #!/done: ["Write the outline"]
   clicked "active": #!/active ["Draft chapter 10","Run the tests"]
   back: #!/done ["Write the outline"]
   route #!/someday redirected to #!/all
   ```

   The filter is now part of the page's address, so it survives a reload and can be shared as a link,
   which Tasklet's spec deliberately doesn't ask for.

   </details>

3. **Lifecycle order.** `lifecycle.html` shows an `Item` with all six lifecycle methods, each writing to a
   log, and two buttons: Toggle removes or restores the item, and Redraw does nothing but trigger a redraw.
   Predict the log after this sequence: load the page, click Redraw, click Toggle twice. What does
   `onbeforeremove` returning a promise change?

   <details><summary>Solution</summary>

   ```console
   $ npm run verify
   …
   lifecycle: <li> count after onbeforeremove 1, after onremove 0
   oninit item
   oncreate item
   onbeforeupdate item
   onupdate item
   onbeforeremove item
   onremove item
   oninit item
   oncreate item
   ```

   Loading runs `oninit` and then `oncreate` once the `<li>` is in the DOM. The empty Redraw handler still
   triggers a redraw, which calls `onbeforeupdate` (it could return `false` to skip the diff) and then
   `onupdate`. Hiding calls `onbeforeremove`; because it returns a promise, Mithril leaves the `<li>` in the
   page for the 300 ms until it resolves, and then calls `onremove`. Showing the item again creates a new
   instance, so `oninit` runs again: component state does not survive removal.

   </details>

4. **A list without VanX.** Write a VanJS list of tasks with checkboxes using only `vanjs-core`: one
   `van.state` holding the array, and a binding function that builds the `<ul>`. Then write the same with
   `vanX.reactive` and `vanX.list`. Tick a checkbox in each: is the first `<li>` the same element as before,
   and which element has focus afterwards?

   <details><summary>Solution</summary>

   `examples/ch10/solutions/van-core-list.html` replaces the array on each toggle, and the binding
   `() => ul(tasks.val.map(TaskItem))` rebuilds the list. `examples/ch10/solutions/vanx-list.html` binds
   each property to one field:

   `examples/ch10/solutions/vanx-list.html` (excerpt)

   ```js
             vanX.list(ul, tasks, ({ val: task }) =>
               li(
                 { class: () => (task.done ? 'task done' : 'task') },
                 label(
                   input({
                     type: 'checkbox',
                     checked: () => task.done,
                     onchange: () => (task.done = !task.done),
                   }),
                   ' ',
                   span(() => task.title),
                 ),
               ),
             ),
   ```

   ```console
   $ npm run verify
   …
   solutions/van-core-list.html: {"sameFirstItem":false,"focused":"BODY","done":["Write the outline","Draft chapter 10"]}
   solutions/vanx-list.html: {"sameFirstItem":true,"focused":"INPUT","done":["Write the outline","Draft chapter 10"]}
   ```

   Both show the right result. The core version replaced every element, so the focused checkbox was
   removed and focus fell back to `<body>`: a keyboard user would have to tab back to where they were. The
   VanX version changed one `class` and one `checked` property and kept the elements.

   </details>

5. **Check the size claims.** Use esbuild to bundle `vanjs-core`, `vanjs-core` with `vanjs-ext`, and
   `mithril` the way an app imports them, minified, and compare the gzipped sizes with "1.0kB" (vanjs.org)
   and "8.8 KiB" (mithril.js.org). Why is the bundled Mithril bigger than its published `mithril.min.js`?

   <details><summary>Solution</summary>

   `examples/ch10/measure.mjs` bundles each import with esbuild and compresses the result; its output is in
   "Does VanJS really weigh 1 kB?" above. VanJS core is 1,179 bytes gzipped as bundled and 1,074 bytes as
   published, so "1.0kB" is accurate. Mithril's published file is 8,932 bytes, a little above the homepage's
   8.8 KiB. The bundled version is 10,074 bytes because `import m from 'mithril'` pulls in the package's
   CommonJS entry, which a bundler can't tree-shake, and esbuild wraps each of its modules in a function,
   which adds bytes the single-file `mithril.min.js` doesn't have. In both cases the whole library ships, router and `m.request` included.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-10--mithril-and-the-minimalists)
