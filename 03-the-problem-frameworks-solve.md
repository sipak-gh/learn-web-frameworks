# Chapter 3 — The Problem Frameworks Solve

Every framework in this course claims to make user interfaces easier to build. Easier than what? This
chapter answers that by building the course's reference app, **Tasklet**, with no framework at all: plain
TypeScript, the DOM API and Vite as the build tool. You walk through every file, then look at where the code
hurts: keeping the screen in sync with the data, wiring events, patching lists, cleaning up, handling async
results. Those pain points give you the vocabulary for the rest of the course: components, declarative
rendering, reactivity, templates, binding, effects, SPA and MPA. Finally you meet the acceptance test that
every Tasklet implementation must pass, and run it. [Chapter 4](04-react.md) rebuilds the same app in React.

## Tasklet: one app, thirteen times

Tasklet is a tiny task list. You will see it built thirteen times in this course, once per framework, and
each build passes the same automated test. It's small enough to read in one sitting and large enough to
exercise what every UI framework has to solve:

```text
+--------------------------------------------+
| Tasklet                                    |
|                                            |
| New task                                   |
| [______________________________] [Add]     |
|                                            |
| [All] [Active] [Done]                      |
|                                            |
| [ ] Read the Vue chapter                ×  |
| [ ] Try Svelte runes                    ×  |
| [x] Write a signal from scratch         ×  |
|                                            |
| 2 tasks left                  [Clear done] |
+--------------------------------------------+
```

The behavior, in short ([Appendix C](appendix-c-tasklet-spec.md) has the full contract):

- On start, the app reads the saved list from `localStorage` under the key `tasklet:v1`. If there is none,
  it fetches `./tasks.json` and shows "Loading tasks…" until it arrives. If the fetch fails it shows
  "Couldn't load tasks." and a **Retry** button.
- The form adds a task. The title is trimmed, a blank title is ignored, and the input is cleared afterwards.
- Each task has a checkbox that toggles it and a **×** button, named `Delete "<title>"` for assistive
  technology, that removes it.
- **All**, **Active** and **Done** filter the list. The current filter button has `aria-pressed="true"`.
- When the filtered list is empty, "Nothing to show." replaces it.
- The footer counts the unfinished tasks ("2 tasks left", "1 task left") and has a **Clear done** button,
  disabled when no task is done.
- Every change to the list is saved back to `localStorage`.

Each requirement exists because it exercises one problem:

| Requirement | What it exercises |
|---|---|
| The task list, the filter, the loading and error flags | **Local state**: data the UI owns and changes |
| "2 tasks left", the filtered list, Clear done's disabled state | **Derived state**: values computed from other state |
| One `<li>` per task | **Lists with keys**: which element belongs to which item |
| Loading, error, empty, list | **Conditional rendering** |
| A task's checkbox changes the list in `App` | **Events from child to parent** |
| The New task input | **Form input** |
| Fetching `tasks.json`, Retry | **Async data** with loading and error states |
| Saving to `localStorage` | **Side effects** |
| `App`, `TaskForm`, `TaskItem`, `FilterBar` | **Component composition** |

The app is always split the same way: `App` owns the state, the loading and the persistence; `TaskForm`
reports "add this title"; `TaskItem` shows one task and reports "toggle me" or "remove me"; `FilterBar` shows
the current filter and reports a new one. Every implementation keeps the same names, so you can compare
`TaskItem` in Vue with `TaskItem` in Solid side by side.

## Tasklet in vanilla TypeScript

The vanilla version lives in `tasklet/vanilla/`. "Vanilla" means no UI framework: the code talks to the DOM
directly. It still uses TypeScript, for types, and Vite, for a dev server and a production build. Neither is
a framework, and neither ships code to the browser beyond what you write.

### Scaffolding

The project started from Vite's official vanilla TypeScript template, created from the `tasklet/` folder:

```console
$ npm create vite@latest vanilla -- --template vanilla-ts
npm warn exec The following package was not found and will be installed: create-vite@9.3.3

> npx
> 'cva' vanilla --template vanilla-ts


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/vanilla...
│
└  Done. Now run:

  cd vanilla
  npm install
  npm run dev
```

The `--` passes `--template vanilla-ts` through `npm create` to `create-vite`, so it doesn't ask questions.
The template is a demo page with a counter button and logos. All of that was deleted; what remains is Vite,
TypeScript, a `tsconfig.json` and an `index.html`. Then the shared files were copied in: the stylesheet
`tasklet/shared/tasklet.css` to `src/tasklet.css`, and the seed data `tasklet/shared/tasks.json` to
`public/tasks.json`. Vite serves `public/` as-is at the site root, so the app can fetch `./tasks.json`. Every
Tasklet copies the same two files and uses them unchanged, so every version looks the same.

The result:

```text
tasklet/vanilla/
  index.html          the page: a <div id="app"> and the script tag
  package.json
  package-lock.json
  tsconfig.json       from the template, unchanged
  tasklet.json        tells the acceptance test how to build and serve this app
  public/
    tasks.json        the seed tasks, served at ./tasks.json
  src/
    main.ts           entry point: imports the CSS, mounts the app
    app.ts            App: state, rendering, loading, persistence
    taskForm.ts       TaskForm
    taskItem.ts       TaskItem
    filterBar.ts      FilterBar
    tasks.ts          the data model: types and pure functions
    storage.ts        localStorage and fetch
    dom.ts            a small helper for creating elements
    tasklet.css       the shared stylesheet, copied unchanged
```

```json
{
  "name": "tasklet-vanilla",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4301 --strictPort",
    "build": "tsc && vite build",
    "preview": "vite preview --port 4301 --strictPort"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vite": "8.3.5"
  }
}
```

Two dependencies, both build-time tools, pinned to exact versions so the build is reproducible.
`npm run build` runs `tsc` first, which type-checks and emits nothing (`"noEmit": true` in `tsconfig.json`),
then `vite build`, which bundles `src/` into `dist/`. `preview` serves `dist/` on port 4301; every Tasklet has
its own fixed port, so you can run several at once.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tasklet — vanilla TypeScript</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`tasklet.json` isn't part of the app. The acceptance test reads it to learn how to build and serve this app
and which port to visit:

```json
{
  "name": "Vanilla TypeScript",
  "port": 4301,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

You'll come back to it when you run the test at the end of the chapter.

### The model: `tasks.ts`

The first file has no DOM code at all. It defines what a task is and every operation on the list, as pure
functions: each takes the current list and returns a new one, without changing the old.

```ts
// The data model: types and pure functions. No DOM here.

export interface Task {
  id: string
  title: string
  done: boolean
}

export type Filter = 'all' | 'active' | 'done'

export function isTaskList(value: unknown): value is Task[] {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        typeof task?.id === 'string' &&
        typeof task?.title === 'string' &&
        typeof task?.done === 'boolean',
    )
  )
}

export function addTask(tasks: Task[], title: string): Task[] {
  return [...tasks, { id: crypto.randomUUID(), title, done: false }]
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
}

export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id)
}

export function clearDone(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.done)
}

export function visibleTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.done)
  if (filter === 'done') return tasks.filter((task) => task.done)
  return tasks
}

export function countLabel(tasks: Task[]): string {
  const left = tasks.filter((task) => !task.done).length
  return `${left} ${left === 1 ? 'task' : 'tasks'} left`
}
```

Keeping the model pure pays off twice. The functions are trivial to test without a browser. And every change
produces a **new** array, so "did the list change?" is a cheap reference comparison (`next !== previous`).
Several frameworks in this course rely on exactly that kind of comparison.

`isTaskList` is a *type guard*: when it returns `true`, TypeScript treats the value as `Task[]`. Anything
read from `localStorage` or the network is untrusted (an old version of the app may have saved another
shape, or the file may be broken), so it goes through this check before the app uses it.

### Storage and fetching: `storage.ts`

```ts
import { isTaskList, type Task } from './tasks.ts'

const STORAGE_KEY = 'tasklet:v1'

// The saved list, or null if there is none or it isn't a valid task list.
export function loadSavedTasks(): Task[] | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isTaskList(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('./tasks.json')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
  return data
}
```

`loadSavedTasks` returns `null` for "nothing usable saved": no key, invalid JSON or the wrong shape. The
caller then fetches the seed list. `fetchTasks` treats an HTTP error (`response.ok` is `false` for a 404 or
a 500) the same as a network failure: both throw, so the caller has one error path. The URL is relative, so
the app works wherever it's deployed.

### A helper: `dom.ts`

Creating elements with the raw DOM API takes many lines: `createElement`, then one assignment per property,
then `append`. A small helper keeps the components readable:

```ts
type Tag = keyof HTMLElementTagNameMap

// Creates an element, sets its properties and appends its children:
// el('button', { type: 'button' }, 'Add').
export function el<K extends Tag>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), props)
  element.append(...children)
  return element
}
```

`el('button', { type: 'submit' }, 'Add')` creates `<button type="submit">Add</button>`. `Object.assign`
copies the properties onto the new element, and TypeScript checks them against the element type: `htmlFor`
is accepted on a `label`, but not on a `div`. ARIA attributes use their reflected properties (`ariaLabel`,
`ariaPressed`, `ariaLive`, `role`), which current browsers support.

Notice what just happened: the first file of DOM code is a helper to make creating DOM nicer. Almost every
non-trivial vanilla codebase grows one. It's a first, small step toward writing your own framework, and
it's worth keeping in mind for the rest of the chapter.

### `TaskForm`

```ts
import { el } from './dom.ts'

// The "Add task" form. Calls onAdd with the trimmed title; ignores blanks.
export function createTaskForm(onAdd: (title: string) => void): HTMLFormElement {
  const input = el('input', { id: 'new-task', name: 'title', autocomplete: 'off' })
  const form = el(
    'form',
    { className: 'add', ariaLabel: 'Add task' },
    el('label', { htmlFor: 'new-task' }, 'New task'),
    input,
    el('button', { type: 'submit' }, 'Add'),
  )

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const title = input.value.trim()
    if (title === '') return
    onAdd(title)
    input.value = ''
  })

  return form
}
```

The form is a **component** in everything but name: a function that builds a piece of UI, keeps its own
details (the input) private, and reports to its parent through a callback, `onAdd`. It never touches the
task list. It doesn't know a list exists.

`event.preventDefault()` stops the browser's default form submission, which would reload the page. Pressing
Enter in the input submits the form too, for free, because it's a real `<form>` with a submit button.

### `FilterBar`

```ts
import { el } from './dom.ts'
import type { Filter } from './tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

export interface FilterBar {
  element: HTMLDivElement
  update(current: Filter): void
}

// The All / Active / Done buttons. Calls onChange with the clicked filter;
// update() marks the current one as pressed.
export function createFilterBar(onChange: (filter: Filter) => void): FilterBar {
  const buttons = FILTERS.map(({ value, label }) => {
    const button = el('button', { type: 'button' }, label)
    button.addEventListener('click', () => onChange(value))
    return button
  })
  const element = el('div', { className: 'filters', role: 'group', ariaLabel: 'Filter' }, ...buttons)

  function update(current: Filter) {
    buttons.forEach((button, i) => {
      button.ariaPressed = String(FILTERS[i].value === current)
    })
  }

  return { element, update }
}
```

Here the vanilla pattern shows its shape. `TaskForm` never changes after it's built, but `FilterBar` must
show which filter is current, and that changes. So the function returns two things: the `element`, and an
`update` function that the parent calls with the current filter. **Creating** the UI and **updating** it are
two separate code paths. Keep an eye on that split; it's the root of most of the pain later in this chapter.

### `TaskItem`

```ts
import { el } from './dom.ts'
import type { Task } from './tasks.ts'

export interface TaskItemHandlers {
  onToggle(id: string): void
  onRemove(id: string): void
}

export interface TaskItem {
  element: HTMLLIElement
  update(task: Task): void
}

// One <li> in the list. update() copies a (possibly changed) task onto the
// existing elements instead of building new ones.
export function createTaskItem(task: Task, { onToggle, onRemove }: TaskItemHandlers): TaskItem {
  const checkbox = el('input', { type: 'checkbox' })
  const title = el('span')
  const remove = el('button', { type: 'button', className: 'delete' }, '×')
  const element = el('li', { className: 'task' }, el('label', {}, checkbox, ' ', title), remove)

  checkbox.addEventListener('change', () => onToggle(task.id))
  remove.addEventListener('click', () => onRemove(task.id))

  function update(next: Task) {
    element.classList.toggle('done', next.done)
    checkbox.checked = next.done
    title.textContent = next.title
    remove.ariaLabel = `Delete "${next.title}"`
  }

  update(task)
  return { element, update }
}
```

Same pattern: build the elements once, attach the listeners once, and expose `update(task)` to copy a new
version of the task onto the existing elements. The listeners report the task's `id`, which never changes,
so they don't need updating.

`textContent` sets text, never markup. A task titled `<img src=x onerror=alert(1)>` shows up as those
characters, not as an image with a script. If you built the `<li>` from an HTML string with `innerHTML`, you
would have to escape every title yourself; forget once, and any text a user can enter becomes a script that
runs in your page (cross-site scripting, XSS).

### `App`

`App` owns the state and puts everything together:

```ts
import { el } from './dom.ts'
import { createFilterBar } from './filterBar.ts'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { createTaskForm } from './taskForm.ts'
import { createTaskItem, type TaskItem } from './taskItem.ts'
import {
  addTask,
  clearDone,
  countLabel,
  removeTask,
  toggleTask,
  visibleTasks,
  type Filter,
  type Task,
} from './tasks.ts'

interface State {
  status: 'loading' | 'error' | 'ready'
  tasks: Task[]
  filter: Filter
}

// Builds the whole UI once, then keeps it in sync with `state` by hand:
// every change goes through setState(), which saves and calls render().
export function mountApp(root: HTMLElement): void {
  let state: State = { status: 'loading', tasks: [], filter: 'all' }

  function setState(changes: Partial<State>) {
    const tasksChanged = changes.tasks !== undefined && changes.tasks !== state.tasks
    state = { ...state, ...changes }
    if (tasksChanged) saveTasks(state.tasks)
    render()
  }

  // Children: they report what happened, App decides what it means.
  const form = createTaskForm((title) => setState({ tasks: addTask(state.tasks, title) }))
  const filterBar = createFilterBar((filter) => setState({ filter }))
  const itemHandlers = {
    onToggle: (id: string) => setState({ tasks: toggleTask(state.tasks, id) }),
    onRemove: (id: string) => setState({ tasks: removeTask(state.tasks, id) }),
  }

  // Every element that can ever appear, created once. render() shows or
  // hides them and patches their contents.
  const loading = el('p', { role: 'status' }, 'Loading tasks…')
  const error = el('p', { role: 'alert' }, "Couldn't load tasks.")
  const retry = el('button', { type: 'button' }, 'Retry')
  const list = el('ul', { className: 'tasks', ariaLabel: 'Tasks' })
  const empty = el('p', { className: 'empty' }, 'Nothing to show.')
  const count = el('p', { className: 'count', ariaLive: 'polite' })
  const clear = el('button', { type: 'button', className: 'clear' }, 'Clear done')
  const footer = el('footer', { className: 'footer' }, count, clear)

  retry.addEventListener('click', load)
  clear.addEventListener('click', () => setState({ tasks: clearDone(state.tasks) }))

  root.append(
    el(
      'main',
      { className: 'tasklet' },
      el('h1', {}, 'Tasklet'),
      form,
      filterBar.element,
      loading,
      error,
      retry,
      list,
      empty,
      footer,
    ),
  )

  // One TaskItem per visible task, keyed by id, so a re-render updates the
  // existing <li> (keeping focus and checkbox state) instead of replacing it.
  const items = new Map<string, TaskItem>()

  function renderList(tasks: Task[]) {
    const keep = new Set<string>()
    tasks.forEach((task, index) => {
      let item = items.get(task.id)
      if (item) {
        item.update(task)
      } else {
        item = createTaskItem(task, itemHandlers)
        items.set(task.id, item)
      }
      keep.add(task.id)
      const current = list.children[index]
      if (current !== item.element) list.insertBefore(item.element, current ?? null)
    })
    for (const [id, item] of items) {
      if (!keep.has(id)) {
        item.element.remove()
        items.delete(id)
      }
    }
  }

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

  async function load() {
    setState({ status: 'loading' })
    try {
      setState({ status: 'ready', tasks: await fetchTasks() })
    } catch {
      setState({ status: 'error' })
    }
  }

  const saved = loadSavedTasks()
  if (saved) {
    setState({ status: 'ready', tasks: saved })
  } else {
    load()
  }
}
```

Read it top to bottom:

1. **State.** One object: the loading `status`, the `tasks` and the current `filter`. It's replaced, never
   mutated, by `setState`, the only way to change it. `setState` merges the changes, saves the list if it
   changed, then calls `render()`.
2. **Children.** The three components are created with callbacks. Each callback turns "something happened"
   into a state change: the form's `onAdd` becomes `addTask(...)`, the filter bar's `onChange` becomes a new
   filter, and so on. Data flows **down** (through `update` calls); events flow **up** (through callbacks).
3. **Every element that can ever appear**, created once: the loading message, the error message and Retry
   button, the list, the empty message, the footer. They're all in the page from the start; `render()`
   decides which are visible with the `hidden` attribute.
4. **`renderList`**, a keyed list update: it reuses the `<li>` of a task it has already rendered (found by
   `id` in a `Map`), creates the ones that are new, moves them into order and removes the ones that
   disappeared.
5. **`render()`**, the single place where state reaches the screen. It recomputes the derived values (the
   visible tasks, the count, whether anything is done) and writes all of them to the DOM.
6. **`load()`** sets the loading status, awaits `fetchTasks()`, and sets either the tasks or the error. Retry
   calls the same function.
7. **Start-up**: saved tasks if there are any, otherwise `load()`.

`main.ts` imports the stylesheet (Vite bundles it into a CSS file) and mounts the app:

```ts
import { mountApp } from './app.ts'
import './tasklet.css'

mountApp(document.querySelector<HTMLDivElement>('#app')!)
```

### Build it and run it

```console
$ cd tasklet/vanilla
$ npm ci
$ npm run build

> tasklet-vanilla@0.0.0 build
> tsc && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.41 kB │ gzip: 0.28 kB
dist/assets/index-BeKL5seo.css  2.38 kB │ gzip: 0.95 kB
dist/assets/index-DetuhChd.js   4.32 kB │ gzip: 1.92 kB

✓ built in 58ms
```

`npm run dev` starts Vite's dev server at `http://localhost:4301/` with hot reloading while you edit;
`npm run preview` serves the production build from `dist/` on the same port. The whole app is 4.32 kB of
JavaScript before compression. The course measures every Tasklet build with the same tool,
`tasklet/tools/size.mjs`, which gzips each file at the highest compression level:

```console
$ node tasklet/tools/size.mjs tasklet/vanilla/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DetuhChd.js      4.32 kB     1.93 kB
index.html                    0.41 kB     0.28 kB
total                         7.12 kB     3.16 kB
```

About 3 kB over the network for the whole app, styles included. That's the baseline every framework in the
course is compared with: the React build of the same app, for example, is 70.14 kB by the same measure.

## Where it hurts

The vanilla Tasklet works, passes every acceptance test, and is about 300 lines you can read in ten minutes.
It isn't a strawman: it's how careful developers wrote interactive pages for years, and for a widget this
size it's a perfectly good choice. But look at what you had to manage by hand, and imagine the app ten times
larger.

### Two copies of the truth

The app has two representations of the same data: the `state` object, and the DOM. They must always agree,
and keeping them in agreement is entirely your job. `render()` is where it happens:

```ts
    filterBar.update(filter)
    loading.hidden = status !== 'loading'
    error.hidden = retry.hidden = status !== 'error'
    list.hidden = !ready || visible.length === 0
    empty.hidden = !ready || visible.length > 0
    footer.hidden = !ready
    renderList(ready ? visible : [])
    count.textContent = countLabel(tasks)
    clear.disabled = !tasks.some((task) => task.done)
```

Each line is a rule of the form "this part of the screen depends on these parts of the state". The rules
are scattered between the creation code (what an element looks like at first) and this update code (what
it looks like later). Add a feature, such as showing the number of done tasks in the page title, and you
must remember to add a line here. Forget, and the title is right at start-up and wrong after the first
click. Nothing warns you: no type error, no exception, just a stale screen. The rules are also invisible:
to answer "what does the footer show while loading?" you have to read `render()`, the element creation and
the CSS together.

### Describing changes instead of results

There are two ways to tell a computer what the screen should show:

```text
imperative: "when a task is toggled, find its <li>, toggle the class 'done',
             set the checkbox, recount the tasks left, update the footer
             text, enable or disable Clear done, and if the filter is
             Active, remove the <li>"

declarative: "the list shows the visible tasks; each <li> has the class 'done'
              if its task is done; the footer says how many are left;
              Clear done is disabled when nothing is done"
```

The imperative version describes **transitions**: for every event, what to change. With N kinds of event and
M parts of the screen, you have up to N × M little pieces of code to get right. The declarative version
describes **the result** for any state, once. Vanilla Tasklet already leans declarative: instead of patching
the DOM in each handler, every handler calls `setState`, and one `render()` recomputes everything. That's
the single most useful idea in this chapter, and you could only get halfway there by hand. The creation code
is still separate from the update code (`createTaskItem` versus `update`), and `render()` is still a list of
commands.

What you'd like to write is the declarative version as code: a description of the UI as a function of the
state, and something else that works out which DOM operations are needed. That something else is a UI
framework.
[Chapter 2 of the React course](../learn-react/02-from-vanilla-dom-to-react.md) makes the same move from DOM
code to React step by step, if you want a slower walk through it.

### Lists: rebuild or patch?

`render()` runs after every change. The simplest way to render the list would be to throw away the old
`<li>` elements and build new ones each time:

```ts
  function renderList(tasks: Task[]) {
    list.replaceChildren(...tasks.map((task) => createTaskItem(task, itemHandlers).element))
  }
```

That's one line instead of twenty, and it passes all fifteen acceptance tests (you'll try it in the
exercises). But it destroys and recreates every element on every change, and an element is more than what
you see. It also holds **focus**, the caret position in a text field, the scroll position, a running CSS
transition, an open `<details>`. Toggle a checkbox with the keyboard (Tab to it, press Space) and its `<li>`
is replaced. The focused element no longer exists, so focus falls back to the page `<body>`, and a keyboard
user has to Tab all the way back. Rebuilding also costs work proportional to the size of the list, for every
keystroke-sized change.

So the real `renderList` patches instead. It keeps a `Map` from task `id` to the `TaskItem` it created, and
for each visible task it reuses the existing `<li>`, updates it, and moves it into place:

```text
before:  [li#1] [li#2] [li#3]          state change: delete task 2
after:   [li#1] [li#3]                 li#1 and li#3 are the same elements as before;
                                       only li#2 was removed
```

The `id` is the **key**: it tells the code which element belongs to which item, so a task keeps its element
when other tasks are added, removed or reordered. Without keys, the only way to match old elements to new
items is by position, and then deleting the first task would update every `<li>` below it to show the next
title, and move focus to the wrong task.

You've just written a small **reconciler**: code that compares what is on screen with what should be, and
applies the minimal set of DOM changes. It's twenty lines for one flat list. Real UIs have nested lists,
conditional sections inside list items, components inside components. Every framework in this course ships
a general solution to this problem, and keys show up in nearly all of them (`key` in React and Vue, the
keyed `{#each}` in Svelte, `track` in Angular's `@for`, `repeat` in Lit).

Even the visibility switch has a subtle bug lurking. The footer is styled `display: flex`, and an author
`display` rule beats the browser's built-in `[hidden] { display: none }`. The shared stylesheet needs an
explicit `[hidden] { display: none !important; }` for `footer.hidden = true` to work at all. Hiding is not
removing, either: hidden elements still sit in the DOM and still hold their old content.

### Events and their wiring

Every interactive element needs an `addEventListener` call, written next to the code that creates it, and
each listener needs to know which task it belongs to. `TaskItem` captures the `id` in a closure, which works
because ids never change. If a listener needed something that *does* change, such as the title, it would
have to read it from somewhere current, not from the closure: the closure keeps whatever value existed when
the listener was created. That's the vanilla form of the "stale closure" problem that every framework has a
version of.

The parent–child contract is also informal. `createTaskItem(task, { onToggle, onRemove })` is a plain
function call with an object of callbacks. TypeScript checks the types, but there's no notion of "the props
of a component changed", so the parent must remember to call `item.update(task)` itself.

### Cleanup and leaks

When `renderList` removes an `<li>`, its listeners go with it: once nothing references the element, the
browser can free it and the closures it holds. That's the easy case. The hard cases are things a component
starts that outlive its elements: a listener on `window` or `document` (a keyboard shortcut, a resize
handler), a timer, a WebSocket subscription, an `IntersectionObserver`. Removing the element doesn't stop
any of them. Vanilla code has no "this component is going away" moment; you have to invent one, call it at
the right time, and remember to call it from every place that removes the component. If you register a
global listener in a function that runs on every render, you get one more listener per render, and a key
press that should run once runs a hundred times. The third exercise shows exactly that.

Frameworks give components a **lifecycle**: a well-defined moment when a component appears (mounts),
updates and disappears (unmounts), with a place to put cleanup code that's guaranteed to run.

### Async results arrive late

`load()` sets the status to `'loading'`, awaits the fetch, and then sets the result. Between the `await` and
the result, anything can happen. Here the Retry button disappears while loading, so a second `load()` can't
start before the first ends. But in an app with a search box, a request for "ab" can return *after* a newer
request for "abc", and if the code sets whatever arrives last, the screen shows results for the old query.
The vanilla fix is bookkeeping (a request counter or an `AbortController`), written again for every async
call. Frameworks offer patterns for it: cleanup functions that cancel or ignore stale work (the `ignore` flag
in the React version of Tasklet, in the next chapter), resources and async primitives that track loading and
error states for you (Solid, Svelte, Angular, Vue's Suspense), or libraries such as TanStack Query (Chapter
16).

### What it costs to keep going

None of these problems is hard on its own. Together they explain why vanilla code gets harder to change as
it grows: each feature adds creation code, update code, wiring, maybe cleanup, and the rules connecting them
live in your head. The frameworks in this course all automate the same thing (keeping the DOM in sync with
the state), and they differ in **how**. You'll find that most of them still let you, and sometimes require
you to, drop down to the DOM for the cases they don't cover: focus management, measuring elements,
third-party widgets.

Be fair to vanilla too. It cost 3 kB, no dependencies, no framework to learn and no upgrade treadmill. The
web platform keeps adding pieces that frameworks used to provide: `<template>`, custom elements and shadow
DOM (Chapter 12), `<dialog>` and popovers, and even a `moveBefore()` method that moves an element without
resetting its focus or animations (so far with limited browser support). A small widget, an enhancement to a
server-rendered page or a performance-critical hot spot can be the right place for plain DOM code.

## The vocabulary for the rest of the course

The rest of the course uses these terms constantly. Each one names a solution to one of the problems above.

### Components

A **component** is a reusable piece of UI that bundles structure, behavior and often style, takes inputs
from its parent and reports events back. `TaskForm`, `TaskItem` and `FilterBar` are components built by
hand. In a framework, a component is a function (React, Solid, Preact), a class (Angular, Lit), a
single-file component combining a template, script and style (Vue, Svelte), or an object with a `view`
method (Mithril). The inputs are **props** (properties); the outputs are **events** or **callbacks**.
**Composition** means building bigger components out of smaller ones, as `App` does.

### Declarative rendering

**Declarative rendering** means you describe what the UI should look like for a given state, and the
framework updates the DOM to match. It's often summarized as `UI = f(state)`. The framework handles the
"create versus update" split, so you write one description instead of two code paths. Every framework in
this course is declarative in this sense; htmx (Chapter 13) moves the "f" to the server, which returns HTML.

### State, derived state and one-way data flow

**State** is data that changes over time and that the UI depends on: the tasks, the filter, the loading
status. **Derived state** (also *computed* values) is anything you can calculate from state: the visible
tasks, the count, whether Clear done is disabled. Store the state; compute the derived values. A separate
`tasksLeft` variable would be one more thing to keep in sync.

**One-way data flow** means data goes down from parent to child through props, and changes go back up as
events; only the owner of a piece of state changes it. Vanilla Tasklet already works this way: only `App`
calls `setState`.

### Reactivity: three strategies

**Reactivity** is how a framework finds out that state changed, and which part of the DOM to update. This is
the biggest technical difference between the frameworks in this course, and Chapter 15 compares the
approaches in depth. There are three broad strategies.

**1. Re-render and diff (virtual DOM).** When state changes, the framework calls your component function
again. It returns a lightweight description of the UI (a tree of plain objects, the *virtual DOM*). The
framework compares the new tree with the previous one and applies the differences to the real DOM, the same
job `renderList` does, generalized to every element. React, Preact, Mithril and Inferno work this way. Vue
uses a virtual DOM too, but its reactivity tracks which components depend on which data, so only those
components re-render.

```text
state changes ──► component function runs again ──► new virtual tree
                                                          │
                          real DOM ◄── patch ◄── diff with previous tree
```

The model is simple to reason about (your component is a function from state to UI), at the cost of
re-running code that often didn't need to run, and of the diffing work. Frameworks offer memoization to skip
unchanged parts; the React Compiler (Chapter 4) adds it automatically.

**2. Fine-grained reactivity (signals).** State lives in **signals**: containers that remember who reads
them. When a piece of UI reads a signal, the signal records that dependency. When the signal changes, it
updates exactly the DOM nodes that depend on it, without re-running whole components and without a diff.

```text
signal: tasks ─────────┬──► <li> elements of the list
                       ├──► computed: tasksLeft ──► count text
                       └──► computed: anyDone ────► Clear done disabled
signal: filter ────────┬──► computed: visible ────► <li> elements of the list
                       └──► aria-pressed of the three buttons
```

Solid, Preact Signals, VanJS, Qwik and Angular's signals work this way, and Vue's `ref` and `computed` are
the same idea. It updates precisely and fast; the costs are rules you must learn about what is reactive and
what isn't (reading a signal outside a tracking scope, for example, or destructuring props in Solid). In
2024 a TC39 proposal to add signals to JavaScript itself reached Stage 1; it's still at Stage 1.

**3. Compile-time reactivity.** A compiler reads your components at build time and generates the DOM
update code for you, so the runtime ships little or no diffing machinery. Svelte is the best-known example:
its compiler turns components into code that creates elements and updates them directly, and Svelte 5's
runes (`$state`, `$derived`) compile to signals. Solid compiles its JSX to direct DOM operations too, and
Vue's Vapor mode applies the idea to Vue. In effect, the compiler writes the `create` and `update` code of
this chapter for you.

The categories overlap, and the lines keep moving: most modern frameworks combine a compiler with signals,
and even React now uses a compiler. They're still useful labels for *where the work happens*: at runtime by
diffing, at runtime by dependency tracking, or at build time.

### Templates, JSX, tagged templates, hyperscript

Declarative UI needs a way to write markup in code. The same `<li>` in five notations, to recognize them
later (simplified):

```text
JSX (React, Preact, Solid, Qwik):
  <li className={task.done ? 'task done' : 'task'}><span>{task.title}</span></li>

HTML templates with directives (Vue, Svelte, Angular):
  Vue:     <li :class="['task', { done: task.done }]"><span>{{ task.title }}</span></li>
  Svelte:  <li class={['task', task.done && 'done']}><span>{task.title}</span></li>
  Angular: <li class="task" [class.done]="task.done"><span>{{ task.title }}</span></li>

Tagged template literals (Lit):
  html`<li class=${task.done ? 'task done' : 'task'}><span>${task.title}</span></li>`

Hyperscript, plain function calls (Mithril, VanJS):
  m('li', { class: task.done ? 'task done' : 'task' }, m('span', task.title))

HTML attributes interpreted at runtime (Alpine):
  <li class="task" :class="{ done: task.done }"><span x-text="task.title"></span></li>
```

**JSX** is an extension of JavaScript syntax that a compiler turns into function calls; logic is ordinary
JavaScript (`map` for lists, `?:` and `&&` for conditions). **Templates** are HTML with special syntax for
data and control flow (`v-if`, `{#each}`, `@for`), compiled ahead of time. **Tagged templates** are a
standard JavaScript feature: a function receives the static string parts and the dynamic values separately,
so no build step is needed. **Hyperscript** is plain function calls that build the tree (`dom.ts`'s `el` is
a hyperscript function that creates real elements). The choice affects tooling, type checking and how much
"JavaScript versus HTML" your components feel like; it says little about performance.

### One-way and two-way binding

A **binding** connects a value in the state to something in the DOM. **One-way** binding goes from state to
DOM: the count text, the `disabled` flag. Input from the user comes back as an event, and your code decides
what to do with it. React's **controlled input** works this way: the input shows `value={title}`, and
`onChange` sets `title`.

**Two-way binding** connects both directions with one declaration: when the user types, the bound state
updates; when the state changes, the input updates. Vue's `v-model`, Svelte's `bind:value`, Angular's
`[(ngModel)]` and Alpine's `x-model` are two-way. It's less code for forms; the cost is that changes can come
from more places, which matters in large apps. Vanilla Tasklet has neither: it reads `input.value` when the
form is submitted.

### Effects and lifecycle

A **side effect** is anything a component does besides producing UI: saving to `localStorage`, fetching,
subscribing to an event on `window`, setting a timer. Frameworks give effects a place to live and a way to
undo them. **Lifecycle** hooks or callbacks run when a component mounts, updates and unmounts (`onMount` and
`onDestroy`, `connectedCallback` and `disconnectedCallback`, `ngOnInit` and `ngOnDestroy`). An **effect**
(`useEffect` in React, `watchEffect` in Vue, `$effect` in Svelte, `createEffect` in Solid, `effect()` in
Angular) runs after rendering whenever its dependencies change, and its **cleanup** function runs before the
next run and when the component goes away. That's the guaranteed "going away" moment vanilla code lacks.

### SPA and MPA

A **single-page application** (SPA) loads one HTML page and then renders everything in the browser with
JavaScript, including navigation between "pages". A **multi-page application** (MPA) is the web's original
model: every navigation loads a new HTML document from the server. Tasklet is a one-screen SPA, and all of its
rendering is **client-side rendering** (CSR): the HTML that arrives is an empty `<div id="app">`, and
JavaScript builds the rest.

Rendering only in the browser has costs (nothing to see until the JavaScript runs, more work for search
engines), so most frameworks can also render on the server (**SSR**) or at build time (**SSG**) and then
**hydrate** the HTML in the browser, attaching the event listeners. Meta-frameworks such as Next.js, Nuxt and
SvelteKit build on that, and some tools avoid hydrating whole pages at all (islands, resumability). Chapter 18
covers all of it; htmx (Chapter 13) and Alpine (Chapter 14) start from server-rendered MPAs instead.

### The terms, mapped to Tasklet

| Term | In vanilla Tasklet | What a framework adds |
|---|---|---|
| Component | `createTaskForm`, `createTaskItem`, `createFilterBar` | One definition instead of create + update |
| Props / events | the `task` argument, `onToggle`/`onRemove` callbacks | Props that update automatically; typed events |
| State | the `state` object, changed only by `setState` | State that triggers updates by itself |
| Derived state | `visibleTasks`, `countLabel`, recomputed in `render()` | Computed values, cached and tracked |
| Declarative rendering | `render()`, halfway | The whole UI as a function of state |
| Keys / reconciliation | the `Map` in `renderList` | A general reconciler or fine-grained updates |
| Conditional rendering | `hidden` on elements created up front | Elements created and removed as needed |
| Effects / lifecycle | `saveTasks` in `setState`; no cleanup | Effects with dependencies and cleanup |
| Async data | `load()` with a `status` field | Patterns for stale results and loading states |

## The acceptance test

How do you know that thirteen implementations of Tasklet really behave the same? Each one passes the same
automated **acceptance test**: a browser test suite, written with [Playwright](https://playwright.dev/), that
clicks and types through the app like a user and checks what appears. It lives in `tasklet/e2e/`, with its own
`package.json` and lockfile, and knows nothing about how an app is built: it reads the app's `tasklet.json`,
opens `http://localhost:<port>/` in a headless Chromium, and goes.

### What it checks

Fifteen tests, each in a fresh browser context, so `localStorage` starts empty unless a test puts something
in it:

| Test | What it checks |
|---|---|
| shows the heading "Tasklet" and the form, filter and list roles | The landmarks, roles and names of the DOM contract |
| shows "Loading tasks…" while tasks.json loads, then the seed tasks | The loading state, then the three seed tasks |
| shows an error for a failed response and Retry loads the tasks | HTTP 500 → "Couldn't load tasks." and Retry; Retry shows loading again, then the tasks |
| shows the error for a network failure too | The same for a failed connection |
| adds a trimmed task, clears the input and ignores blank titles | Adding with the button and with Enter |
| toggles a task with its checkbox | Checkbox, the `done` class, the count; clicking the title toggles too |
| deletes a task with its Delete button | The `Delete "<title>"` button |
| filters All, Active and Done with aria-pressed | Filtering and `aria-pressed` |
| shows "Nothing to show." when no task matches the filter | The empty state |
| counts the tasks left with correct pluralization | "2 tasks left", "1 task left", "0 tasks left" |
| Clear done is disabled with no done tasks and removes the done ones | Clear done |
| saves the list to localStorage after every change | `tasklet:v1` after the fetch and after every change |
| uses tasks saved in localStorage without fetching tasks.json | Saved tasks are used, and `tasks.json` is never requested |
| ignores invalid saved data and fetches tasks.json | Broken storage falls back to the fetch |
| keeps changes after a reload, with the filter back on All | Persistence across a reload; the filter isn't persisted |

### How it finds things

The tests find elements the way a user, or a screen reader, does: by **role** and **accessible name**, not
by CSS classes or framework-specific ids. Some of the helpers at the top of
`tasklet/e2e/tests/tasklet.spec.ts`:

```ts
const taskList = (page: Page) => page.getByRole('list', { name: 'Tasks', exact: true })
const items = (page: Page) => taskList(page).getByRole('listitem')
const checkbox = (page: Page, title: string) => page.getByRole('checkbox', { name: title, exact: true })
const deleteButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Delete "${title}"`, exact: true })
```

`getByRole('checkbox', { name: 'Try Svelte runes' })` only matches if the checkbox's accessible name is
exactly the task title, which is true only if the `<label>` wraps it as the contract says. So the suite tests
accessibility and behavior at once, and it doesn't care whether the DOM came from JSX, a template or
`createElement`. Its assertions retry until they pass or time out (5 seconds), so a framework that updates
the DOM asynchronously, after a microtask or an animation frame, passes as long as the right thing appears.

The loading and error tests control the network. Playwright's `page.route` intercepts every request matching
`**/tasks.json`. The loading test holds the response until it has checked the loading state; the error test
answers the first request with an HTTP 500 and lets the second one through:

```ts
test(T.error, async ({ page }) => {
  const { opened, release } = gate()
  let calls = 0
  await page.route('**/tasks.json', async (route) => {
    calls += 1
    if (calls === 1) {
      await route.fulfill({ status: 500, body: 'Server error' })
      return
    }
    await opened
    await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toHaveText("Couldn't load tasks.")
```

### Running it

From the course root:

```console
$ cd tasklet/e2e
$ npm ci

added 3 packages, and audited 4 packages in 456ms

found 0 vulnerabilities
$ APP=vanilla npx playwright test

Running 15 tests using 15 workers

  ✓  10 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (383ms)
  ✓   5 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (451ms)
  ✓  14 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks (376ms)
  …
  ✓   6 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (794ms)
  ✓   9 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (3.8s)
```

`APP` names the folder under `tasklet/`. The configuration reads `tasklet/vanilla/tasklet.json`, points the
browser at port 4301 and, if nothing is listening there yet, starts the app's `serve` command
(`npm run preview`) and stops it afterwards. The app must be built first (`npm run build` in its folder).
The suite tests the production build, not the dev server. Playwright needs its Chromium browser; if it isn't
installed yet, `npx playwright install chromium` downloads it. The number of workers depends on your CPU
cores. To run one test, filter by title: `APP=vanilla npx playwright test -g "toggles"`.

To build, serve and test several apps in one go, use `run-all.mjs`. For each app it installs the
dependencies if `node_modules` is missing, runs the build, starts the server, waits for the port, runs the
suite and stops the server:

```console
$ node run-all.mjs vanilla react
…
Summary
app      port  build  passed  failed  skipped  note
vanilla  4301  ok     15      0       0
react    4302  ok     15      0       0
```

Without arguments it runs every app that has a `tasklet.json`.

### The manifest and skips

Each app's `tasklet.json` tells the harness how to build (`build`), how to serve the production build
(`serve`) and on which `port`. `persistence` is `"localStorage"` for every app except the htmx version, which
keeps the tasks on its server (`"server"`); for that app the harness resets the server's data before each
test. `skip` lists tests that can't apply to an app, each with a reason, as
`{ "test": "<exact title>", "reason": "…" }`. The htmx app, for example, has no client-side fetch and no
`localStorage`, so it skips the six tests about those, and its chapter explains why. A skip with a title that
doesn't match a test is an error, so a typo can't silently disable nothing. Appendix C has the details.

## Summary

- Tasklet is a small task list that exercises local and derived state, keyed lists, conditional rendering,
  child-to-parent events, form input, async loading with errors, persistence and composition. Every chapter
  rebuilds it, with the same components: `App`, `TaskForm`, `TaskItem`, `FilterBar`.
- The vanilla version is about 300 lines of TypeScript and 3.16 kB gzipped. It keeps state in one object,
  changes it only through `setState`, and syncs the DOM in one `render()` function.
- The pain points: two copies of the truth (state and DOM) synced by hand; separate create and update code;
  hand-written keyed list patching (rebuilding loses focus); manual event wiring; no lifecycle for cleanup;
  stale async results.
- Components bundle UI and behavior behind props and events. Declarative rendering means describing the UI
  for any state (`UI = f(state)`) and letting the framework update the DOM.
- Reactivity strategies: re-render and diff a virtual DOM (React, Preact, Mithril), fine-grained signals
  (Solid, Preact Signals, Vue refs, Angular, Qwik, VanJS) and compile-time (Svelte, Solid's JSX, Vue Vapor).
- Markup comes as JSX, HTML templates with directives, tagged template literals, hyperscript calls or HTML
  attributes. Binding is one-way (state to DOM, events back) or two-way (`v-model`, `bind:value`).
- Effects and lifecycle give side effects a place and a guaranteed cleanup.
- The acceptance test in `tasklet/e2e/` checks every implementation by role, accessible name and exact text.
  Run it with `APP=<app> npx playwright test` or `node run-all.mjs <app> …`.

## Exercises

1. **Plural rules.** `countLabel` hard-codes English: one is singular, everything else plural. Rewrite it with
   [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
   so the choice of noun comes from the locale's rules, and print the labels for 0, 1, 2 and 21.

   <details><summary>Solution</summary>

   `Intl.PluralRules` maps a number to a plural category (`'one'`, `'other'`, and in some languages `'few'`,
   `'many'` …). Look the noun up by category:

   ```ts
   // Exercise 1: the count label with Intl.PluralRules instead of `left === 1`.
   // Run: node count-label.ts
   const rules = new Intl.PluralRules('en-US')
   const nouns: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'task', other: 'tasks' }

   export function countLabel(left: number): string {
     return `${left} ${nouns[rules.select(left)] ?? nouns.other} left`
   }

   for (const left of [0, 1, 2, 21]) {
     console.log(countLabel(left))
   }
   ```

   ```console
   $ node count-label.ts
   0 tasks left
   1 task left
   2 tasks left
   21 tasks left
   ```

   Node runs the TypeScript file directly by stripping the types. In English only 1 is `'one'`; in other
   locales 21 can be singular too, which is why the category comes from the rules rather than `=== 1`. The
   result is identical for Tasklet, so the acceptance test still passes.

   </details>

2. **A store.** Vanilla Tasklet's `setState` calls `render()` and `saveTasks()` directly, so every new
   reaction to a change means editing `setState`. Write `createStore(initial)` returning `get()`,
   `set(update)` and `subscribe(listener)`. `subscribe` calls the listener immediately and after every change
   and returns an unsubscribe function, and `set` notifies nobody when the update returns the same value.
   Use it with two subscribers, a "render" and a "save".

   <details><summary>Solution</summary>

   ```ts
   // Exercise 2: a tiny store. set() notifies every subscriber, so "render after
   // every change" no longer depends on remembering to call render().
   // Run: node store.ts
   type Listener<T> = (state: T) => void

   export function createStore<T>(initial: T) {
     let state = initial
     const listeners = new Set<Listener<T>>()

     return {
       get: () => state,
       set(update: (state: T) => T) {
         const next = update(state)
         if (Object.is(next, state)) return
         state = next
         for (const listener of listeners) listener(state)
       },
       subscribe(listener: Listener<T>) {
         listeners.add(listener)
         listener(state)
         return () => {
           listeners.delete(listener)
         }
       },
     }
   }

   interface Task {
     id: string
     title: string
     done: boolean
   }

   const tasks = createStore<Task[]>([{ id: '1', title: 'Read the Vue chapter', done: false }])

   const stopRender = tasks.subscribe((list) => console.log('render:', list.map((t) => t.title).join(', ')))
   tasks.subscribe((list) => console.log('save:', JSON.stringify(list.map((t) => t.id))))

   tasks.set((list) => [...list, { id: '2', title: 'Try Svelte runes', done: false }])
   tasks.set((list) => list) // same array: nobody is notified
   stopRender()
   tasks.set((list) => list.filter((t) => t.id !== '1'))
   ```

   ```console
   $ node store.ts
   render: Read the Vue chapter
   save: ["1"]
   render: Read the Vue chapter, Try Svelte runes
   save: ["1","2"]
   save: ["2"]
   ```

   The second `set` returns the same array, so `Object.is` skips the notification. After `stopRender()`
   only "save" reacts. `setState` no longer needs to know who's interested in a change: that's the
   *observer* pattern, and it's the seed of every reactivity system in this course. Svelte's stores have
   this exact `subscribe` contract. A signal is the same idea, made automatic: instead of calling `subscribe`
   yourself, reading the value inside a tracked function subscribes it.

   </details>

3. **Spot the leak.** A teammate adds a keyboard shortcut to vanilla Tasklet by putting this line inside
   `render()`:

   ```ts
   document.addEventListener('keydown', handleShortcut)
   ```

   With a named function, `addEventListener` ignores the duplicates, but their next version uses an arrow
   function, `(event) => handleShortcut(event)`. What happens after ten changes to the list? Show it and fix
   it without moving the line out of `render()`.

   <details><summary>Solution</summary>

   Every `render()` adds a new arrow function, a different listener each time, so after ten renders one key
   press runs the shortcut eleven times, and none of those listeners is ever removed. An `AbortController`
   gives each registration an "undo": aborting its `signal` removes every listener registered with it.
   Abort the previous render's controller before adding the new listener:

   ```ts
   // Exercise 3: a listener added on every render, and the fix.
   // Run: node leak.ts
   const page = new EventTarget() // stands in for `document`

   let shortcutRuns = 0
   function renderLeaky() {
     page.addEventListener('keydown', () => shortcutRuns++)
   }

   for (let i = 0; i < 3; i++) renderLeaky()
   page.dispatchEvent(new Event('keydown'))
   console.log('leaky: one key press ran the shortcut', shortcutRuns, 'times')

   let fixedRuns = 0
   let controller: AbortController | undefined
   function renderFixed() {
     controller?.abort() // removes the listener the previous render added
     controller = new AbortController()
     page.addEventListener('keydown', () => fixedRuns++, { signal: controller.signal })
   }

   for (let i = 0; i < 3; i++) renderFixed()
   page.dispatchEvent(new Event('keydown'))
   console.log('fixed: one key press ran the shortcut', fixedRuns, 'time')
   ```

   ```console
   $ node leak.ts
   leaky: one key press ran the shortcut 3 times
   fixed: one key press ran the shortcut 1 time
   ```

   The example uses a bare `EventTarget` so it runs in Node; `document` is an `EventTarget` too. The better fix
   is not to subscribe in `render()` at all, but once at start-up. Frameworks make the "undo" part of the
   API: an effect returns a cleanup function, and the framework calls it before the effect runs again and
   when the component goes away.

   </details>

4. **Rebuild instead of patch.** Replace `renderList` in `tasklet/vanilla/src/app.ts` with the one-line
   version from "Lists: rebuild or patch?", build, and run the acceptance test. Then open the app, Tab to the
   checkbox of "Try Svelte runes" and press Space twice. What happens, and why doesn't the test catch it?

   <details><summary>Solution</summary>

   The complete replacement file is `examples/ch03/app-rebuild.ts` (copy it over `src/app.ts`). Apart from
   a header comment, it drops the `TaskItem` type import and the `items` map, and `renderList` becomes:

   ```ts
     // Throws the old <li> elements away and builds new ones on every render.
     function renderList(tasks: Task[]) {
       list.replaceChildren(...tasks.map((task) => createTaskItem(task, itemHandlers).element))
     }
   ```

   All fifteen tests pass. In the browser, the first Space checks the box, and the second does nothing: the
   checkbox you focused was replaced by a new one, so focus fell back to `<body>`. A small Playwright check
   run against both versions printed:

   ```text
   keyed (tasklet/vanilla): focus after Space = INPUT; second Space -> checked=false
   rebuild: focus after Space = BODY; second Space -> checked=true
   ```

   The acceptance test uses `click()`, which finds the element afresh each time, so it never notices that
   the element changed. A test only checks what it asserts; preserving focus isn't in Tasklet's contract.
   Put the original `app.ts` back afterwards (keep a copy before you replace it) and rebuild.

   </details>

5. **Break it on purpose.** In `tasklet/vanilla/src/tasks.ts`, change `left === 1 ? 'task' : 'tasks'` to
   always produce "tasks". Predict which tests fail, then rebuild and run the suite.

   <details><summary>Solution</summary>

   Every test that expects "1 task left" at some point fails, six of them; the test for the count is only one
   of them:

   ```console
   $ APP=vanilla npx playwright test --workers=1
   …
     1) [chromium] › tests/tasklet.spec.ts:223:1 › toggles a task with its checkbox ───────────────────
       Error: expect(locator).toHaveText(expected) failed
       Locator:  locator('p.count')
       Expected: "1 task left"
       Received: "1 tasks left"
       Timeout:  5000ms
   …
     6 failed
       [chromium] › tests/tasklet.spec.ts:223:1 › toggles a task with its checkbox ────────────────────
       [chromium] › tests/tasklet.spec.ts:244:1 › deletes a task with its Delete button ───────────────
       [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed ──────
       [chromium] › tests/tasklet.spec.ts:315:1 › counts the tasks left with correct pluralization ────
       [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json
       [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All
     9 passed (36.6s)
   ```

   Each failure shows the expected and the received text and where in the test it happened. A trace of every
   failed test is saved under `tasklet/e2e/test-results/` (open one with `npx playwright show-trace`).
   Undo the change and rebuild before you move on.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-3--the-problem-frameworks-solve)
