# Chapter 13 — htmx

Every chapter so far moved the app into the browser. The server sent an almost empty page and a bundle of
JavaScript; the JavaScript fetched `tasks.json`, kept the tasks in memory and built the DOM. htmx goes the
other way. The server keeps the data and renders HTML, and the browser shows it, as on the web of 2005. What
htmx adds is a set of HTML attributes that let any element send a request and put the HTML that comes back
anywhere on the page, without reloading it. You write no client-side JavaScript for the app at all.

This chapter explains the idea behind that, hypermedia, and the essays in which Carson Gross argues for it.
It then builds Tasklet as a small Node server that renders the page and the fragments htmx asks for. That
version is the only one in the course whose data lives on the server, so it also skips the six tests about
`localStorage` and client-side fetching, and you see why each one can't apply. The chapter ends with what
Tasklet leaves out (`hx-boost`, events, extensions, history), htmx 4, which was released in August 2026 but
is not yet npm's default, and where htmx fits among server frameworks.

## At a glance

| | |
| --- | --- |
| First released | May 2020 as the successor of intercooler.js (2013); 1.0 in November 2020, 2.0 in June 2024, 4.0 in August 2026 (there is no 3.x) |
| Current version | 2.0.11 (September 22, 2026) on npm's `latest` tag; 4.0.1 (November 1, 2026) on the `next` tag |
| Created by / maintained by | Carson Gross, with a small core team (Alex Petros, Michael West, Christian Tanul for htmx 4); funded through GitHub Sponsors and corporate sponsors listed on htmx.org |
| License | 0BSD (Zero-Clause BSD) |
| Rendering model | The server renders HTML; htmx swaps the returned fragments into the page. No virtual DOM and no client-side templates |
| Reactivity model | None in the browser. State lives on the server; the page changes when a response arrives |
| Templates | Whatever your server uses (here a tagged template literal); behavior is declared in `hx-*` attributes |
| Language | No app code in the browser. Tasklet's server is TypeScript, run directly by Node's type stripping |
| Tasklet build size | 19.09 kB gzip (58.99 kB raw) for htmx, the stylesheet and the rendered page, measured with `tasklet/tools/size.mjs` |
| Meta-framework | None; htmx pairs with any server framework (Django, Rails, Laravel, Go, ASP.NET Core, Spring, …) |
| Good fit for | Server-rendered apps with forms and lists (CRUD, admin tools, dashboards, content sites); teams whose strength is the backend; progressive enhancement |

## Why it exists

Carson Gross wrote intercooler.js in 2013 as a jQuery plugin with one idea: let HTML attributes trigger AJAX
requests and replace parts of the page with HTML from the server, instead of JSON that client code turns
into DOM. htmx is that idea rewritten without jQuery. Its 0.0.1 release reached npm in May 2020 and 1.0
followed on November 24, 2020 ([Chapter 2](02-a-short-history.md) has the wider history).

The htmx home page states the motivation as four questions:

```text
Why should only <a> & <form> be able to make HTTP requests?
Why should only click & submit events trigger them?
Why should only GET & POST methods be available?
Why should you only be able to replace the entire screen?
```

and answers them: "By removing these constraints, htmx completes HTML as a hypertext." In plain HTML a link
or a form is a **hypermedia control**: it carries its own URL and method, the browser sends the request,
and the response replaces the whole page. htmx generalizes each part. Any element can be a control, any
event can trigger it, any HTTP method can be used, and the response can replace any part of the page.

The argument around it is about architecture, not syntax. Since around 2010, most web apps have been
**single-page applications**: a JSON API on the server and a client app that holds the state and renders
it. Gross's essays (collected on htmx.org and in the book *Hypermedia Systems*, written with Adam Stepinski
and Deniz Akşimşek in 2023) argue that many of those apps would be simpler as **hypermedia-driven
applications**, where the server sends HTML that already contains the next possible actions. They are
careful about the limits, too. "When Should You Use Hypermedia?" lists where it is a good fit (UIs that are
mostly text and images, CRUD, "nested" UIs that update in well-defined blocks) and where it isn't (many
dynamic interdependencies, as in a spreadsheet; offline use; UI state that changes extremely often). Its
conclusion:

> We feel that, with htmx, hypermedia can go much, much further than many web developers today believe is possible.
>
> — Carson Gross, "When Should You Use Hypermedia?" (2022)

## The mental model

### Hypermedia and HATEOAS

**HATEOAS**, "Hypermedia as the Engine of Application State", is one of the constraints in Roy Fielding's
2000 dissertation that defined REST. The client needs no prior knowledge of the application beyond how to
read hypermedia; everything it can do next comes in the response. A browser showing a bank account doesn't
know what a "withdrawal" is. It sees a form, and if the account is overdrawn, the server leaves the form out.

htmx's essay "HATEOAS" (unsigned, on htmx.org) and Gross's "How Did REST Come To Mean The Opposite of REST?"
(2022) argue that JSON APIs called "REST" usually aren't. JSON carries data; the client must already know
what it means and which URLs to call next, so client and server must change together. HTML carries its
controls with it.

In the React Tasklet the client knows that a task has `id`, `title` and `done`, how to filter, count and
save. In the htmx version the browser receives `<input type="checkbox" hx-post="/tasks/2/toggle" …>` and
knows only that a change means "POST here and put the result in `#task-list`". Only the server knows what a
task is.

### The exchange

Every htmx interaction follows the same cycle: an event triggers a request, the server answers with HTML,
and htmx swaps that HTML into a target.

```text
  browser                                                      server
  ┌────────────────────────────────────┐
  │ <input type="checkbox"             │  1. "change" event (hx-trigger)
  │   hx-post="/tasks/2/toggle"        │
  │   hx-include="#current-filter"     │  2. POST /tasks/2/toggle
  │   hx-target="#task-list"           │     HX-Request: true      ┌─────────────────────┐
  │   hx-swap="innerHTML">             │     filter=active ──────▶ │ toggle task 2       │
  └────────────────────────────────────┘                           │ render the list,    │
                                                                   │ the count and the   │
  3. swap: the <ul> goes into #task-list (innerHTML)  ◀─────────── │ Clear done button   │
     out of band: #count and #clear-done replaced by id            └─────────────────────┘
```

The first pain point of [Chapter 3](03-the-problem-frameworks-solve.md), two copies of the truth, is gone:
the DOM is the only client-side state, and the server renders the whole truth each time. The price is a
network round trip for every change, and a server that renders fragments as well as pages.

### The attribute model

Five questions describe any htmx control, and each has an attribute:

| Question | Attribute | Default | Tasklet example |
| --- | --- | --- | --- |
| Which request? | `hx-get`, `hx-post`, `hx-put`, `hx-patch`, `hx-delete` | none | `hx-post="/tasks/2/toggle"` |
| When? | `hx-trigger` | `click`; `change` for inputs, selects and textareas; `submit` for forms | `hx-trigger="change"` |
| With which values? | `hx-include`, `hx-vals`, the element's own value and its form | the element, plus its enclosing form for non-GET requests | `hx-include="#current-filter"` |
| Where does the answer go? | `hx-target` (a CSS selector, or `this`, `closest …`, `find …`) | the element itself | `hx-target="#task-list"` |
| How is it inserted? | `hx-swap` | `innerHTML` | `hx-swap="innerHTML"` |

`hx-swap` also takes `outerHTML`, `beforeend`, `afterbegin`, `delete`, `none` and others, with modifiers
such as `swap:200ms` or `scroll:top`. `hx-trigger` takes any DOM event with modifiers (`changed`,
`delay:300ms`, `throttle:1s`, `from:<selector>`), htmx's own `load`, `revealed` and `intersect`, and polling
(`every 2s`). Requests carry an `HX-Request: true` header, and response headers (`HX-Redirect`,
`HX-Retarget`, `HX-Trigger`, `HX-Push-Url` …) can steer the client.

**Out-of-band swaps** handle one action that changes several parts of the page. A top-level element in
the response with `hx-swap-oob="true"` and an `id` replaces the element with that id, wherever it is; the
rest goes to the normal target. A Tasklet toggle changes the list, the count and Clear done, and the
response carries all three.

### Locality of behavior

The attributes are deliberately on the element they affect. In jQuery-era code, and in Chapter 3's vanilla
Tasklet, you see a button in the HTML and then search the scripts for its `addEventListener`. Gross named
the alternative in a 2020 essay:

> The behaviour of a unit of code should be as obvious as possible by looking only at that unit of code
>
> — Carson Gross, "Locality of Behaviour (LoB)" (2020)

The essay weighs it against DRY and separation of concerns, and says the trade-offs "need to be made
judiciously". Tasklet leans toward locality: every control repeats its `hx-target` and `hx-swap` instead of
inheriting them from a parent. That is more text, but each element reads on its own, and it is what htmx 4's
explicit inheritance favors (see [htmx 4](#htmx-4)). Alpine ([Chapter 14](14-alpine.md)) applies the same
principle to client-side behavior.

## Code structure

### Installing

htmx has no project generator. Its docs give three ways to load it: a `<script>` tag pointing at a CDN,
a downloaded copy, or the `htmx.org` package from npm. The course pins exact versions and serves every file
itself, so the Tasklet server reads `node_modules/htmx.org/dist/htmx.min.js` and serves it at `/htmx.min.js`.
The project started as an empty npm package:

```console
$ cd tasklet && mkdir htmx && cd htmx
$ npm init -y
Wrote to /home/tbangma/learn-web-frameworks/tasklet/htmx/package.json:

{
  "name": "htmx",
  "version": "1.0.0",
  …
  "type": "commonjs"
}
$ npm install --save-exact htmx.org@2.0.11

added 1 package, and audited 2 packages in 369ms

found 0 vulnerabilities
$ npm install --save-exact --save-dev typescript@7.0.2 @types/node@26.6.6

added 4 packages, and audited 6 packages in 1s

found 0 vulnerabilities
```

`package.json` was then edited by hand: a `tasklet-htmx` name, `"type": "module"` and three scripts. The
shared `tasks.json` and `tasklet.css` were copied into `public/`, unchanged.

```text
tasklet/htmx/
  package.json
  package-lock.json
  tsconfig.json       type-check only (noEmit)
  tasklet.json        the manifest for the acceptance test
  public/
    tasklet.css       the shared stylesheet, served at /tasklet.css
    tasks.json        the seed tasks, read once at startup
  src/
    server.ts         node:http: routing, assets, fragments vs pages, POST /__reset
    views.ts          one function per piece of the page
    html.ts           escaping and the html`` tagged template
    tasks.ts          the data model and the in-memory store
```

### Why a plain Node server, in TypeScript

htmx doesn't care what the server is written in; Express, Hono, Django or Go would all do. Tasklet uses
`node:http` with no dependency, so nothing hides what htmx needs from a server: read a request, change the
data, answer with HTML. With routing as a table of four regular expressions, that takes 112 lines. A real
project would usually pick a framework for routing, sessions and templates.

The code is TypeScript rather than plain JavaScript because all of the app's code is server code, where
types catch mistakes such as passing a `Filter` where a `Task[]` is expected. Node 26 runs `.ts` files
directly by stripping the types, so `npm run serve` is just `node src/server.ts`. TypeScript's
`erasableSyntaxOnly` option rejects the syntax that stripping can't handle (enums, parameter properties).

`tasklet/htmx/package.json`

```json
{
  "name": "tasklet-htmx",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.ts",
    "build": "tsc",
    "serve": "node src/server.ts"
  },
  "dependencies": {
    "htmx.org": "2.0.11"
  },
  "devDependencies": {
    "@types/node": "26.6.6",
    "typescript": "7.0.2"
  }
}
```

The three scripts:

- `dev`: `node --watch` restarts the server when a file changes.
- `build`: there is nothing to bundle, so `build` is a type check: `tsc` with `noEmit`.
- `serve`: starts the server on port 4312.

The other apps call their production server `preview`, because it serves a Vite-built `dist/` folder. Here
there is no `dist/`, and the same server runs in development and production.

### Anatomy of a view

Instead of components, the server has **view functions** from data to HTML. The page calls all of them,
and each htmx response reuses a few, so a fragment can never differ from the matching part of the page.
Here is the add form:

`tasklet/htmx/src/views.ts` (excerpt)

```ts
// Without JavaScript the form posts to /tasks and the server redirects back
// to the page. With htmx it posts in the background and swaps the list; the
// form is reset once htmx has collected its values (htmx:config-request).
export function taskForm(): Html {
  return html`<form aria-label="Add task" class="add" method="post" action="/tasks"
        hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
        hx-on::config-request="this.reset()">
        <label for="new-task">New task</label>
        <input id="new-task" name="title" autocomplete="off">
        <button type="submit">Add</button>
      </form>`
}
```

The `method` and `action` make it a normal HTML form; the `hx-*` attributes take over when htmx is loaded.
That double meaning is how htmx does **progressive enhancement**, covered below.

## Building Tasklet in htmx

### The components, mapped

The client-side components of other chapters become view functions, and their state moves to the server
or into the page:

| Tasklet piece | htmx version |
| --- | --- |
| `App` state (`tasks`) | `let tasks` in `tasks.ts`, in the server's memory |
| `App` state (`filter`) | a hidden input `#current-filter` in the page, sent with every request |
| `App` loading and error states | none: the tasks are in the first response |
| `TaskForm` | `taskForm()`: a form with `hx-post="/tasks"` |
| `FilterBar` | `filterBar(current)`: three buttons with `hx-get="/?filter=…"` |
| `TaskItem` | `taskItem(task)`: a checkbox with `hx-post` and a button with `hx-delete` |
| derived `visible`, count, "has done" | computed on the server for each response |
| events from child to parent | HTTP requests from the element to the server |
| persistence effect | none: the server's memory is the store |

### The model: `tasks.ts`

The first half of `tasks.ts` is Chapter 3's model (`Task`, `isTaskList`, `visibleTasks`, `countLabel`),
plus `parseFilter`, which turns any query value into a valid filter. The second half is the store:

`tasklet/htmx/src/tasks.ts` (excerpt)

```ts
function loadSeed(): Task[] {
  const data: unknown = JSON.parse(readFileSync(new URL('../public/tasks.json', import.meta.url), 'utf8'))
  if (!isTaskList(data)) throw new Error('public/tasks.json is not a task list')
  return data
}

const seed = loadSeed()

// The only copy of the data. It lives as long as the server process.
let tasks: Task[] = structuredClone(seed)

export function allTasks(): Task[] {
  return tasks
}

export function resetTasks(): void {
  tasks = structuredClone(seed)
}

export function addTask(title: string): void {
  tasks.push({ id: crypto.randomUUID(), title, done: false })
}

// toggleTask and removeTask return false when there is no task with that id.
export function toggleTask(id: string): boolean {
  const task = tasks.find((task) => task.id === id)
  if (task) task.done = !task.done
  return task !== undefined
}

export function removeTask(id: string): boolean {
  const before = tasks.length
  tasks = tasks.filter((task) => task.id !== id)
  return tasks.length < before
}

export function clearDone(): void {
  tasks = tasks.filter((task) => !task.done)
}
```

The tasks live as long as the process; a restart brings the seed back. The harness allows memory or a
file, and memory keeps the code free of file handling (Exercise 3 adds a file). `resetTasks()` serves the
acceptance test's `POST /__reset`, and `structuredClone` keeps changes from leaking into the seed.

### Escaping: `html.ts`

A server that builds HTML from strings must escape all user data, or a task titled
`<img src=x onerror=…>` runs a script in every visitor's browser. htmx's security docs put this first
("Rule 1: Escape All User Content"): with htmx, injected `hx-*` attributes can do work too. Client frameworks
escape text by default; a hand-written server must do it itself, here with a tagged template literal:

`tasklet/htmx/src/html.ts`

```ts
// Escaping, and an `html` tagged template that escapes every value it is
// given unless the value is already markup (the result of another html``).

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char])
}

export class Html {
  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

type Value = Html | string | number | boolean | null | undefined | Value[]

function render(value: Value): string {
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  if (value === null || value === undefined) return ''
  return escapeHtml(String(value))
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  let result = strings[0]
  values.forEach((value, index) => {
    result += render(value) + strings[index + 1]
  })
  return new Html(result)
}
```

`escapeHtml` replaces the five characters that can end a text node or an attribute value. The `html` tag
escapes every interpolated value unless it is already an `Html` object from another `html` call. Arrays are
joined, so `${tasks.map(taskItem)}` works, and `null` renders as nothing, for optional attributes. Markup
can only be built with `html`, so a raw string from a request can't sneak in. Server template engines
(Jinja, ERB, Blade, Go's `html/template`) escape by default in the same way. Exercise 1 tests it.

### The views: `views.ts`

`tasklet/htmx/src/views.ts`

```ts
// The views: one function per piece of the page, in place of the components
// of the other chapters. The full page uses them all; the fragments that
// answer htmx requests reuse the same functions, so the markup never differs.
import { html, type Html } from './html.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// Marks an element for an out-of-band swap: htmx puts it in place of the
// element with the same id, wherever that is on the page.
const oobAttr = (oob: boolean, swap = 'true') => (oob ? html` hx-swap-oob="${swap}"` : null)

export function page(tasks: Task[], filter: Filter): Html {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasklet — htmx</title>
    <link rel="stylesheet" href="/tasklet.css">
    <script src="/htmx.min.js"></script>
  </head>
  <body>
    <main class="tasklet">
      <h1>Tasklet</h1>
      ${taskForm()}
      ${filterBar(filter)}
      <div id="task-list">
        ${taskList(tasks, filter)}
      </div>
      <footer class="footer">
        ${count(tasks)}
        ${clearButton(tasks)}
      </footer>
    </main>
  </body>
</html>
`
}

// Without JavaScript the form posts to /tasks and the server redirects back
// to the page. With htmx it posts in the background and swaps the list; the
// form is reset once htmx has collected its values (htmx:config-request).
export function taskForm(): Html {
  return html`<form aria-label="Add task" class="add" method="post" action="/tasks"
        hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
        hx-on::config-request="this.reset()">
        <label for="new-task">New task</label>
        <input id="new-task" name="title" autocomplete="off">
        <button type="submit">Add</button>
      </form>`
}

// The current filter lives in the page itself, in a hidden input that the
// other requests include, so the server renders the list they expect.
export function filterBar(current: Filter, oob = false): Html {
  return html`<div role="group" aria-label="Filter" class="filters" id="filters"${oobAttr(oob)}>
        <input type="hidden" id="current-filter" name="filter" value="${current}">${FILTERS.map(
          ({ value, label }) => html`
        <button type="button" id="filter-${value}" aria-pressed="${value === current}"
          hx-get="/?filter=${value}" hx-target="#task-list" hx-swap="innerHTML">${label}</button>`,
        )}
      </div>`
}

// What goes inside <div id="task-list">, the target of every request. The div
// itself is never replaced, so a response still finds it even when another
// response has just swapped its contents.
export function taskList(tasks: Task[], filter: Filter): Html {
  const visible = visibleTasks(tasks, filter)
  if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
  return html`<ul class="tasks" aria-label="Tasks">${visible.map(taskItem)}
        </ul>`
}

export function taskItem(task: Task): Html {
  const path = `/tasks/${encodeURIComponent(task.id)}`
  return html`
          <li class="${task.done ? 'task done' : 'task'}">
            <label><input type="checkbox" id="toggle-${task.id}"${task.done ? html` checked` : null}
              hx-post="${path}/toggle" hx-trigger="change" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML"> <span>${task.title}</span></label>
            <button type="button" class="delete" aria-label="${`Delete "${task.title}"`}"
              hx-delete="${path}" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML">×</button>
          </li>`
}

// The live region stays in the page; out-of-band swaps replace only its text.
export function count(tasks: Task[], oob = false): Html {
  return html`<p class="count" id="count" aria-live="polite"${oobAttr(oob, 'innerHTML')}>${countLabel(tasks)}</p>`
}

export function clearButton(tasks: Task[], oob = false): Html {
  const noneDone = !tasks.some((task) => task.done)
  return html`<button type="button" class="clear" id="clear-done"${noneDone ? html` disabled` : null}${oobAttr(oob)}
          hx-post="/tasks/clear-done" hx-include="#current-filter"
          hx-target="#task-list" hx-swap="innerHTML">Clear done</button>`
}

// The answer to every change: the list, plus the count and Clear done out of band.
export function afterChange(tasks: Task[], filter: Filter): Html {
  return html`${taskList(tasks, filter)}
${count(tasks, true)}
${clearButton(tasks, true)}
`
}

// The answer to a filter button: the list, plus the filter bar out of band.
export function afterFilter(tasks: Task[], filter: Filter): Html {
  return html`${taskList(tasks, filter)}
${filterBar(filter, true)}
`
}
```

How each Tasklet requirement maps:

- **Adding a task.** The form posts `title` and the current filter; the server trims the title and
  ignores blanks. The input must be empty afterwards. Resetting on submit is too early (htmx hasn't read
  the value yet), and resetting after the response is too late (you may already be typing the next task).
  So the form resets on `htmx:configRequest` (`hx-on::config-request`), which fires after htmx has
  collected the values and before it sends them.
- **Toggling.** Each checkbox posts on `change`, and the response renders the whole list again. The
  checkbox's `id` matters: after a swap, htmx puts the focus back on the element with the id that had it,
  so a keyboard user can keep pressing Space on the same task.
- **Deleting.** `hx-delete` sends `DELETE /tasks/<id>`; the title in the `aria-label` is escaped like any
  other value.
- **Filtering.** The server answers `hx-get="/?filter=active"` with the list plus the filter bar out of
  band, so `aria-pressed` and the hidden input change together. `${value === current}` renders exactly
  the strings `"true"` and `"false"` that `aria-pressed` needs.
- **The current filter.** The server must know it to render the list the user is looking at, so it lives in
  a hidden input that every control names in `hx-include`. The URL is the other obvious place, and
  Exercise 4 shows why the acceptance test rules that out.
- **Empty list and footer.** `taskList` returns the `<ul>` or "Nothing to show."; the footer is always
  there, because the tasks are always loaded.

The `<div id="task-list">` wrapper came from a bug. An earlier version targeted the `<ul>` itself with
`outerHTML`, so when the list became empty, the `<ul>` was replaced by the `<p>`. htmx resolves `hx-target`
when a request starts, so a request started just before that swap landed on a detached element. A wrapper
that is never replaced is always there. Every control also spells out `hx-swap="innerHTML"`, htmx 2's
default, so the intent is visible on the element.

### The server: `server.ts`

`tasklet/htmx/src/server.ts`

```ts
// The Tasklet server, built on node:http alone. Browsers get full pages;
// htmx requests (they carry an `HX-Request: true` header) get fragments.
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Html } from './html.ts'
import { addTask, allTasks, clearDone, parseFilter, removeTask, resetTasks, toggleTask } from './tasks.ts'
import { afterChange, afterFilter, page } from './views.ts'

const PORT = Number(process.env.PORT ?? 4312)

const ASSETS: Record<string, { body: Buffer; type: string }> = {
  '/tasklet.css': {
    body: readFileSync(new URL('../public/tasklet.css', import.meta.url)),
    type: 'text/css; charset=utf-8',
  },
  '/htmx.min.js': {
    body: readFileSync(new URL(import.meta.resolve('htmx.org/dist/htmx.min.js'))),
    type: 'text/javascript; charset=utf-8',
  },
}

// The changes the page can ask for. `run` returns false if the task is missing.
const ACTIONS: { method: string; path: RegExp; run: (params: URLSearchParams, id: string) => boolean }[] = [
  {
    method: 'POST',
    path: /^\/tasks$/,
    run: (params) => {
      const title = (params.get('title') ?? '').trim()
      if (title !== '') addTask(title)
      return true
    },
  },
  {
    method: 'POST',
    path: /^\/tasks\/clear-done$/,
    run: () => {
      clearDone()
      return true
    },
  },
  { method: 'POST', path: /^\/tasks\/([^/]+)\/toggle$/, run: (_, id) => toggleTask(id) },
  { method: 'DELETE', path: /^\/tasks\/([^/]+)$/, run: (_, id) => removeTask(id) },
]

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const fromHtmx = request.headers['hx-request'] === 'true'

  const asset = request.method === 'GET' ? ASSETS[url.pathname] : undefined
  if (asset) {
    response.writeHead(200, { 'Content-Type': asset.type }).end(asset.body)
    return
  }

  // The acceptance test calls this before every test.
  if (request.method === 'POST' && url.pathname === '/__reset') {
    resetTasks()
    response.writeHead(204).end()
    return
  }

  if (request.method === 'GET' && url.pathname === '/') {
    const filter = parseFilter(url.searchParams.get('filter'))
    sendHtml(response, fromHtmx ? afterFilter(allTasks(), filter) : page(allTasks(), filter))
    return
  }

  for (const action of ACTIONS) {
    const match = request.method === action.method ? action.path.exec(url.pathname) : null
    if (!match) continue
    const params = await readParams(request, url)
    if (!action.run(params, decodeURIComponent(match[1] ?? ''))) break
    if (fromHtmx) {
      sendHtml(response, afterChange(allTasks(), parseFilter(params.get('filter'))))
    } else {
      // A plain form post: Post/Redirect/Get back to the page.
      response.writeHead(303, { Location: '/' }).end()
    }
    return
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
}

function sendHtml(response: ServerResponse, body: Html): void {
  // The same URL answers with a page or a fragment, so caches must key on the header.
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Vary: 'HX-Request' }).end(body.value)
}

// Parameters from the query string (GET, and DELETE in htmx 2) and from a
// form-encoded body (POST).
async function readParams(request: IncomingMessage, url: URL): Promise<URLSearchParams> {
  const params = new URLSearchParams(url.search)
  let body = ''
  request.setEncoding('utf8')
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) throw new Error('Request body too large')
  }
  for (const [name, value] of new URLSearchParams(body)) params.append(name, value)
  return params
}

createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    console.error(error)
    if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Bad request')
  })
}).listen(PORT, () => {
  console.log(`Tasklet (htmx) on http://localhost:${PORT}/`)
})
```

The routes:

| Request | Answer for htmx (`HX-Request: true`) | Answer for a plain browser |
| --- | --- | --- |
| `GET /`, `GET /?filter=done` | `afterFilter`: the list and the filter bar (OOB) | `page`: the full document |
| `POST /tasks` | `afterChange`: the list, the count and Clear done (OOB) | `303 See Other` to `/` |
| `POST /tasks/:id/toggle` | `afterChange` | `303` to `/` |
| `DELETE /tasks/:id` | `afterChange` | (not reachable without JavaScript) |
| `POST /tasks/clear-done` | `afterChange` | `303` to `/` |
| `POST /__reset` | `204 No Content` | `204 No Content` |
| `GET /htmx.min.js`, `GET /tasklet.css` | the file | the file |

Some details:

- **One URL, two answers.** `GET /` returns a page or a fragment depending on `HX-Request`, so
  `sendHtml` sets `Vary: HX-Request`; otherwise a cache could hand the fragment to a browser.
- **Toggle is a POST.** `PATCH` would also do, but toggling isn't idempotent, and `POST` is what an HTML
  form can send without JavaScript.
- **Parameters.** htmx 2 sends `GET` and `DELETE` parameters in the query string and `POST` parameters in a
  form-encoded body; `readParams` merges both and caps the body size.
- **A missing task** (another tab removed it) gets a 404. htmx 2 doesn't swap error responses, so the page
  stays as it was.
- **`POST /__reset`** restores the seed and answers `204` once that's done, as the harness requires.

Here are the real responses, with `curl` standing in for htmx and for a browser without JavaScript:

```console
$ curl -i -X POST -H "HX-Request: true" -d filter=active http://localhost:4312/tasks/2/toggle
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Vary: HX-Request
…

<ul class="tasks" aria-label="Tasks">
          <li class="task">
            <label><input type="checkbox" id="toggle-1"
              hx-post="/tasks/1/toggle" hx-trigger="change" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML"> <span>Read the Vue chapter</span></label>
            <button type="button" class="delete" aria-label="Delete &quot;Read the Vue chapter&quot;"
              hx-delete="/tasks/1" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML">×</button>
          </li>
        </ul>
<p class="count" id="count" aria-live="polite" hx-swap-oob="innerHTML">1 task left</p>
<button type="button" class="clear" id="clear-done" hx-swap-oob="true"
          hx-post="/tasks/clear-done" hx-include="#current-filter"
          hx-target="#task-list" hx-swap="innerHTML">Clear done</button>

$ curl -i -X POST -d "title=Learn htmx" http://localhost:4312/tasks
HTTP/1.1 303 See Other
Location: /
…
```

Task 2 is now done, so under Active only task 1 is left, and Clear done is enabled. Notice the two OOB
styles. The count uses `hx-swap-oob="innerHTML"`, which replaces only its text, so the
`<p aria-live="polite">` stays the same element and screen readers announce the change. Clear done uses
`"true"` (`outerHTML`), because its `disabled` attribute has to change too.

### Progressive enhancement

htmx's docs recommend that the app keep working without JavaScript where that's cheap: give controls real
`href`s and `action`s, and check `HX-Request` on the server. Tasklet does that for the add form. With htmx,
`hx-post` sends it in the background. Without JavaScript (disabled, failed to load, or a click before it
loaded), the browser submits the form normally, the server sees no `HX-Request`, adds the task and answers
`303 See Other` to `/`. This **Post/Redirect/Get** pattern means a reload doesn't post twice. A Playwright
script with JavaScript disabled confirmed it: adding "No JS" gave four items and "3 tasks left".

The other controls need JavaScript. Without it they would need a `<form>` around every checkbox and delete
button, a submit button per checkbox, `POST /tasks/:id/delete` (forms can only send GET and POST) and
filter links instead of the `type="button"` buttons the DOM contract requires. That doubles the markup for
a case the course doesn't test, so Tasklet stops at the form. On a real site `hx-boost` (below) gets you
most of the way more cheaply.

### The manifest and the skips

`tasklet/htmx/tasklet.json`

```json
{
  "name": "htmx",
  "port": 4312,
  "build": "npm run build",
  "serve": "npm run serve",
  "persistence": "server",
  "skip": [
    { "test": "shows \"Loading tasks…\" while tasks.json loads, then the seed tasks", "reason": "The server renders the tasks into the page; there is no client-side fetch or loading state." },
    { "test": "shows an error for a failed response and Retry loads the tasks", "reason": "No client-side fetch of tasks.json: the server reads it once at startup." },
    { "test": "shows the error for a network failure too", "reason": "No client-side fetch of tasks.json: the server reads it once at startup." },
    { "test": "saves the list to localStorage after every change", "reason": "Tasks persist on the server (in memory), not in localStorage." },
    { "test": "uses tasks saved in localStorage without fetching tasks.json", "reason": "Tasks persist on the server (in memory), not in localStorage." },
    { "test": "ignores invalid saved data and fetches tasks.json", "reason": "Tasks persist on the server (in memory), not in localStorage." }
  ]
}
```

`"persistence": "server"` makes the harness call `POST /__reset` before every test and run the tests one
at a time, because they share one store. The six skips are the ones the harness allows for a server app,
and each tests something this design doesn't have:

1. **"shows "Loading tasks…" while tasks.json loads, then the seed tasks".** The first response already
   contains the tasks, and the browser never requests `tasks.json`, so there is no loading state.
2. **"shows an error for a failed response and Retry loads the tasks"** and
3. **"shows the error for a network failure too".** Both fail the browser's `tasks.json` request. The
   server reads the file once at startup; there is no browser request to fail.
4. **"saves the list to localStorage after every change"**,
5. **"uses tasks saved in localStorage without fetching tasks.json"** and
6. **"ignores invalid saved data and fetches tasks.json".** These read or plant `tasklet:v1` in
   `localStorage`, and nothing is stored in the browser.

The persistence test that applies, "keeps changes after a reload, with the filter back on All", passes: the
changes are on the server, and the filter was never stored anywhere but the page.

### Build it and run it

```console
$ cd tasklet/htmx
$ npm ci
$ time npm run build

> tasklet-htmx@0.0.0 build
> tsc


real	0m0.216s
```

The "build" is TypeScript 7's type check (which has `strict` on by default), in about 0.2 seconds. With
no `dist/` to measure, what a browser downloads was copied into one folder: `htmx.min.js`, `tasklet.css` and
the rendered page (`curl http://localhost:4312/ > index.html` right after a reset):

```console
$ node tasklet/tools/size.mjs size-htmx
file                raw        gzip
htmx.min.js    52.18 kB    16.88 kB
index.html      3.40 kB     0.89 kB
tasklet.css     3.40 kB     1.32 kB
total          58.99 kB    19.09 kB
```

19.09 kB gzipped is less than a third of React's 70.14 kB, and almost all of it is htmx. (The CSS is
larger than in the Vite apps only because this server doesn't minify it.) But every later interaction costs
a round trip and a fragment; the toggle response above is 874 bytes. The server is 345 lines
(`wc -l src/*.ts`: `html.ts` 38, `server.ts` 112, `tasks.ts` 77, `views.ts` 118), and the browser runs no
app code.

Then the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs htmx

=== htmx (tasklet/htmx, port 4312) ===

$ npm run build    (in /home/tbangma/learn-web-frameworks/tasklet/htmx)
…
$ npm run serve &    (in /home/tbangma/learn-web-frameworks/tasklet/htmx)

> tasklet-htmx@0.0.0 serve
> node src/server.ts

Tasklet (htmx) on http://localhost:4312/

$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 1 worker

  ✓   1 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (587ms)
  -   2 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks
  -   3 [chromium] › tests/tasklet.spec.ts:159:1 › shows an error for a failed response and Retry loads the tasks
  -   4 [chromium] › tests/tasklet.spec.ts:190:1 › shows the error for a network failure too
  ✓   5 [chromium] › tests/tasklet.spec.ts:204:1 › adds a trimmed task, clears the input and ignores blank titles (899ms)
  ✓   6 [chromium] › tests/tasklet.spec.ts:223:1 › toggles a task with its checkbox (790ms)
  ✓   7 [chromium] › tests/tasklet.spec.ts:244:1 › deletes a task with its Delete button (737ms)
  ✓   8 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (1.2s)
  ✓   9 [chromium] › tests/tasklet.spec.ts:295:1 › shows "Nothing to show." when no task matches the filter (1.1s)
  ✓  10 [chromium] › tests/tasklet.spec.ts:315:1 › counts the tasks left with correct pluralization (898ms)
  ✓  11 [chromium] › tests/tasklet.spec.ts:326:1 › Clear done is disabled with no done tasks and removes the done ones (1.0s)
  -  12 [chromium] › tests/tasklet.spec.ts:347:1 › saves the list to localStorage after every change
  -  13 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json
  -  14 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json
  ✓  15 [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All (992ms)

  6 skipped
  9 passed (8.7s)

Summary
app   port  build  passed  failed  skipped  note
htmx  4312  ok     9       0       6
```

Nine pass and six are skipped. The run takes 8.7 seconds against about 2 for the client apps, because the
tests share one store and run one at a time. Manual Playwright checks covered what the suite doesn't:
clicking three checkboxes as fast as possible ends correct ("1 task left"), since each response renders the
server's complete current list; focus returns to the same control after a toggle or filter click; and the
URL stays `/`.

## Beyond Tasklet

### hx-boost

`hx-boost="true"` on a container (often `<body>`) turns its ordinary links and forms into htmx requests:
htmx fetches the page, swaps in its `<body>`, updates the title and pushes the URL. A multi-page site gets
the feel of a single-page app from one attribute, and still works without JavaScript. It is the main
exception to locality of behavior, since one attribute changes every link inside it.

### Events and hx-on

htmx fires DOM events through the request cycle: `htmx:configRequest`, `htmx:beforeRequest`,
`htmx:beforeSwap` (where you can, say, allow a 422 to swap), `htmx:afterSwap`, `htmx:load` and more. Listen
with `addEventListener`, or inline with `hx-on`. Attribute names are case-insensitive, so htmx 2 also fires
every event in kebab-case, and `::` is short for `htmx:`; hence Tasklet's `hx-on::config-request`. In the
other direction, an `HX-Trigger` response header fires an event in the browser, the usual way to tell other
parts of the page that "the cart changed". Smaller attributes cover the edges: `hx-indicator`,
`hx-confirm`, `hx-disabled-elt`, `hx-select`, `hx-preserve`, and `hx-sync` for a request that starts while
another is in flight.

### History

`hx-push-url="true"` adds the request URL to the history. On Back, htmx 2 restores a snapshot it saved in
`localStorage`, or fetches the URL, so the server must render a full page for every URL htmx pushes.
Exercise 4 tries it on Tasklet.

### Extensions

htmx 2 keeps rarer features in extensions, loaded with a `<script>` and enabled with `hx-ext`. The core
team maintains seven: `head-support`, `htmx-1-compat`, `idiomorph` (morphing swaps that keep focus and
state), `preload`, `response-targets` (targets per status code), `sse` and `ws`. Community extensions
include `alpine-morph`, which morphs while keeping Alpine state.

### Security

The server is responsible for injection: escape everything, and never put user data in `hx-on` or other
attributes evaluated as code. htmx 2 helps with `htmx.config.selfRequestsOnly` (on by default, blocks
other origins), `htmx.config.allowEval` (turn off string evaluation) and `hx-disable` (ignore htmx
attributes inside an element, for user-generated HTML). Requests carry cookies, so they need CSRF
protection like forms; `hx-headers` with a token on `<body>` is common.

### Testing and tooling

There is little client code to test, so you test the server: view functions with `node:test`
(Exercise 1), routes with an HTTP client, behavior with Playwright. In the browser, `htmx.logAll()` logs
every event, and the network panel shows each request and its HTML fragment.

### Where htmx fits

htmx is a client library for whatever renders your HTML. In November 2026:

- **Django.** The `django-htmx` package (1.29.0) adds helpers such as `request.htmx`.
- **Rails.** Rails ships Hotwire (Turbo and Stimulus) by default since Rails 7, a sibling approach where
  links, forms, "frames" and "streams" fetch HTML. htmx works with ERB views as well.
- **Laravel.** Livewire and Alpine (the TALL stack, [Chapter 14](14-alpine.md)) are the house style; htmx
  is a lighter alternative.
- **Go.** `templ` documents htmx use, and `html/template` with `net/http` is a popular minimal stack (see
  [the Go course](../learn-go/README.md)).
- **Anything else** that returns HTML: ASP.NET Core, Spring, Phoenix, Flask, Express, Hono, or Tasklet's
  `node:http`.

The one requirement, a server that renders HTML, rules htmx out for static hosting and offline apps.

### htmx 4

htmx 4.0.0 was released on August 28, 2026, and 4.0.1 on November 1, 2026. The announcement explains the
origin: building fixi, a minimal htmx-like library, made Gross familiar with `fetch()`. Christian Tanul's
ideas about streaming HTML suggested moving htmx's internals to it, and Michael West and Alex Petros joined;
the work took eight months. On npm, 2.0.11 stays `latest` and 4.x stays on `next` "until some point in
early 2027", so that sites loading an unversioned CDN URL aren't upgraded by surprise. The htmx 4 docs
live at four.htmx.org; in early November 2026, htmx.org still documents 2.x. There is no htmx 3.

The announcement says that "from a user's viewpoint" htmx 4 is almost identical to htmx 2, and names three
major changes:

> Attribute inheritance is now explicit by default rather than implicit by default (this is the biggest upgrade item)
>
> — the htmx team, "htmx 4.0.0 has been released!" (2026)

The other two are events renamed to a consistent `htmx:phase:action` pattern (`htmx:configRequest` becomes
`htmx:config:request`) and history that no longer caches pages in `localStorage`. Instead, htmx re-fetches
the page on Back. The "What's new in htmx 4" page lists the rest:

- **Requests** use `fetch()` instead of `XMLHttpRequest`; the `htmx:xhr:*` events are gone.
- **Inheritance** is opt-in per attribute: `hx-target:inherited="#x"`.
- **Errors**: 4xx and 5xx responses are swapped by default, and `hx-status:422="…"` sets behavior per code.
- **Smaller changes**: OOB swaps run after the main swap, requests time out after 60 seconds,
  `hx-disable` is renamed `hx-ignore`, and `hx-vars`, `hx-params` and `hx-prompt` are removed.
- **New**: built-in morph swaps (`innerMorph`, `outerMorph`), `<hx-partial>` for multi-target responses
  (backported to 2.0.11), an `HX-Request-Type` header, and core extensions such as `hx-sse`, `hx-ws` and an
  `htmx-2-compat` layer, all loaded with a plain `<script>` tag.

Most changes can be switched back with one config line (`htmx.config.implicitInheritance = true` and so
on), and an `upgrade-check` command scans your templates.

Tasklet needed exactly one change to run on htmx 4.0.1: the event name in the form's `hx-on`. Because every
control repeats its own attributes, explicit inheritance changed nothing. The `upgrade-check` command didn't
notice the event name, and Exercise 5 walks through the port. The minified file shrank from 52.18 kB to
37.45 kB (16.88 kB to 13.39 kB gzipped).

There is a tension worth knowing about. In "The Future of htmx" (January 2025), Gross and Alex Petros
promised stability, "No New Features as a Feature", and that "the htmx that they write in 2025 will look
very similar to htmx they write in 2035 and beyond". htmx 4 keeps the attribute model and offers switches
back for most changes, but it is still a migration. 2.x remains supported and is the default on npm for now.

## Strengths and trade-offs

| Strengths | Trade-offs |
| --- | --- |
| Almost no client code: Tasklet runs zero lines of app JavaScript in the browser, and htmx is 16.88 kB gzipped | Every interaction is a network round trip; on a slow connection a toggle feels slower than in a client app, and nothing works offline |
| One source of truth, on the server: no client state to sync, no duplicated validation or models, no JSON API to version | The server must render fragments as well as pages, and must know which fragment each control expects; the coupling moves into templates |
| Works with any backend language; teams strong on Django, Rails, Laravel or Go stay in their stack | Rich client-side interactions (drag and drop, editors, complex forms with instant feedback) still need JavaScript, usually Alpine or a component library |
| Progressive enhancement is natural: controls can be real links and forms | Escaping, CSRF and caching (`Vary`) are your job, and a mistake in a template is an injection |
| Locality of behavior: an element's markup shows what it does | Attributes are strings: no type checking, no autocomplete without editor plugins, and typos fail silently |
| Small, stable API; 2.x has been compatible since 2024, and old htmx 1 code still runs on 2 with a compat extension | htmx 4 is a migration (inheritance, events, error swaps), and the ecosystem is in the middle of it in late 2026 |
| No build step, no bundler, no `node_modules` in the browser | Fewer UI component libraries and less tooling than React or Vue; testing means server tests plus browser tests |

## Compared with React and Vue

Toggling a task shows the difference in where the work happens. React changes client state and re-renders:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

`tasklet/react/src/components/TaskItem.tsx` (excerpt)

```tsx
        <input type="checkbox" checked={task.done} onChange={onToggle} /> <span>{task.title}</span>
```

htmx sends the request and lets the server change the data and render the result:

`tasklet/htmx/src/views.ts` (excerpt)

```ts
            <label><input type="checkbox" id="toggle-${task.id}"${task.done ? html` checked` : null}
              hx-post="${path}/toggle" hx-trigger="change" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML"> <span>${task.title}</span></label>
```

`tasklet/htmx/src/tasks.ts` (excerpt)

```ts
export function toggleTask(id: string): boolean {
  const task = tasks.find((task) => task.id === id)
  if (task) task.done = !task.done
  return task !== undefined
}
```

The server mutates the object in place, like Vue, because there is nothing to re-render reactively, only
a response to build. React keeps the count, filter and list in sync by re-running `App`; htmx renders all
three in one response. Loading shows the biggest difference: React needs a fetch, loading and error states,
Retry, an `ignore` flag for late responses and a save Effect, and htmx needs none of it, because the first
response contains the tasks. Latency runs the other way: React updates the checkbox instantly, and htmx
waits for the server.

The filter bar's markup is nearly identical in all three. Vue binds `:aria-pressed="value === filter"`, and
htmx renders `aria-pressed="${value === current}"` on the server.
[Appendix A](appendix-a-rosetta-stone.md) lines up these concepts across every framework in the course.

## Summary

- htmx extends HTML so that any element can send any HTTP request on any event and swap the HTML response
  into any part of the page. The server renders HTML and holds the state; the browser runs no app code.
- Hypermedia and HATEOAS: responses carry their own controls, so the client needs no knowledge of the
  application. Carson Gross's essays argue that this suits more apps than the SPA era assumed, and say where
  it doesn't.
- The attribute model answers five questions: which request (`hx-post` …), when (`hx-trigger`), which values
  (`hx-include`), where (`hx-target`) and how (`hx-swap`). Out-of-band swaps update several places from one
  response.
- Locality of behavior: an element's behavior is visible on the element. Tasklet repeats its attributes
  instead of inheriting them.
- Tasklet in htmx is a 345-line TypeScript server on `node:http`. Views return escaped HTML through an
  `html` tagged template, and the same views render the page and the fragments. The current filter lives
  in a hidden input. The add form works without JavaScript (Post/Redirect/Get).
- 19.09 kB gzipped, 9 tests passed, 6 skipped because there is no client-side fetch and no `localStorage`.
- htmx 4 (August 2026, on npm's `next` tag until early 2027) moves to `fetch()`, makes inheritance explicit,
  renames events, swaps error responses and drops the `localStorage` history cache. Tasklet needed a
  one-line change.

## Exercises

1. **Prove the escaping.** Write tests with `node:test` that show `escapeHtml` and the `html` tag turn
   `<img src=x onerror="alert('hi')">` into text, keep nested `html` results as markup, and that
   `taskItem` renders such a title safely in both the `<span>` and the `aria-label`.

   <details><summary>Solution</summary>

   `examples/ch13/escape.test.ts` imports the app's own modules, so it tests the real code:

   `examples/ch13/escape.test.ts`

   ```ts
   // Exercise 1: a hostile title must come back as text, never as markup.
   // Run with `npm test` in examples/ch13.
   import assert from 'node:assert/strict'
   import { test } from 'node:test'
   import { escapeHtml, html } from '../../tasklet/htmx/src/html.ts'
   import { taskItem } from '../../tasklet/htmx/src/views.ts'

   const evil = `<img src=x onerror="alert('hi')">`

   test('escapeHtml replaces the five special characters', () => {
     assert.equal(escapeHtml(evil), '&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;')
     assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry')
   })

   test('html`` escapes values but keeps nested html`` as markup', () => {
     const inner = html`<b>${'<i>'}</b>`
     assert.equal(html`<p>${inner}${'<br>'}</p>`.value, '<p><b>&lt;i&gt;</b>&lt;br&gt;</p>')
   })

   test('a task titled with markup renders as text in the span and the aria-label', () => {
     const markup = taskItem({ id: '7', title: evil, done: false }).value
     assert.ok(!markup.includes('<img'), 'no raw <img> tag')
     assert.ok(markup.includes(`<span>${escapeHtml(evil)}</span>`))
     assert.ok(markup.includes(`aria-label="Delete &quot;&lt;img`))
   })
   ```

   ```console
   $ cd examples/ch13 && npm test
   ✔ escapeHtml replaces the five special characters (0.545423ms)
   ✔ html`` escapes values but keeps nested html`` as markup (0.151837ms)
   ✔ a task titled with markup renders as text in the span and the aria-label (0.169987ms)
   …
   ℹ pass 5
   ℹ fail 0
   ```

   The test runner and the assertion library are built into Node, and Node runs the `.ts` file directly.
   The `aria-label` case matters as much as the text. An unescaped `"` would close the attribute, and
   everything after it would become new attributes, including `hx-*` ones that htmx would act on.

   </details>

2. **Active search.** Build a page with a search box that shows the matching framework names as you type,
   from a list on the server. Wait until typing pauses for 300 ms, cancel stale requests, show "Searching…"
   while waiting, and make it work without JavaScript when you press Enter.

   <details><summary>Solution</summary>

   `examples/ch13/active-search/server.ts` (run `npm run search` in `examples/ch13`, then open
   `http://localhost:4333/`) reuses Tasklet's `html.ts`. The input carries the whole behavior:

   `examples/ch13/active-search/server.ts` (excerpt)

   ```ts
     <body>
       <form action="/search" role="search">
         <label for="q">Search frameworks</label>
         <input id="q" type="search" name="q" value="${query}" autocomplete="off"
           hx-get="/search" hx-trigger="input changed delay:300ms, search"
           hx-target="#results" hx-sync="this:replace" hx-indicator="#searching">
         <span id="searching" class="htmx-indicator">Searching…</span>
   ```

   - `input changed delay:300ms` fires 300 ms after the last keystroke, and only if the value changed. The
     `search` event covers the clear button of `type="search"`.
   - `hx-sync="this:replace"` aborts a request still in flight when a new one starts, so a slow answer for
     "p" can't overwrite the answer for "pre".
   - `hx-indicator` adds the `htmx-request` class to the "Searching…" span during the request; htmx's
     built-in styles make `.htmx-indicator` visible only then.

   The server answers `/search?q=…` with the `<ul>` for htmx and with the whole page otherwise, again with
   `Vary: HX-Request`. Typing "pre" in Chromium sent one request and showed "Preact". With JavaScript
   disabled, typing "v" and pressing Enter loaded `/search?q=v` with Vue, Svelte and VanJS. A query of `<x>`
   comes back as `No match for “&lt;x&gt;”.`

   </details>

3. **Survive a restart.** Keep the tasks in a JSON file so that restarting the server doesn't lose them.
   Write `loadTasks(file)` and `saveTasks(file, tasks)`, make a broken or missing file fall back to the seed,
   and make sure a crash in the middle of a write can't leave a half-written file.

   <details><summary>Solution</summary>

   `examples/ch13/file-store.ts`

   ```ts
   // Exercise 3: keep the tasks in a JSON file so they survive a restart.
   import { readFileSync, renameSync, writeFileSync } from 'node:fs'
   import { isTaskList, type Task } from '../../tasklet/htmx/src/tasks.ts'

   // The saved list, or null if the file is missing or not a valid task list.
   export function loadTasks(file: string): Task[] | null {
     try {
       const data: unknown = JSON.parse(readFileSync(file, 'utf8'))
       return isTaskList(data) ? data : null
     } catch {
       return null
     }
   }

   // Write to a temporary file, then rename it over the old one: a rename is
   // atomic, so a crash mid-write never leaves half a JSON file behind.
   export function saveTasks(file: string, tasks: Task[]): void {
     const temporary = `${file}.tmp`
     writeFileSync(temporary, JSON.stringify(tasks, null, 2))
     renameSync(temporary, file)
   }
   ```

   `examples/ch13/file-store.test.ts` checks a round trip and that a missing file and `{ not json` both
   load as `null`; both pass with `npm test`. To use it in Tasklet, change two places in `tasks.ts`: start
   from `loadTasks(FILE) ?? structuredClone(seed)`, and call `saveTasks(FILE, tasks)` at the end of
   `addTask`, `toggleTask`, `removeTask`, `clearDone` and `resetTasks`. Writing a temporary file and then
   renaming it is the standard trick: a rename within one directory is atomic on POSIX file systems, so a
   reader sees the old file or the new one. A real app would use a database such as SQLite (`node:sqlite`).

   </details>

4. **Put the filter in the URL.** Add `hx-push-url="true"` to the filter buttons so that the address bar
   shows `/?filter=done` and the Back button returns to the previous filter. Run the acceptance test. What
   fails, and why?

   <details><summary>Solution</summary>

   The change is one attribute (`examples/ch13/push-url.diff`, apply with `patch -p1` from the course
   root):

   `examples/ch13/push-url.diff`

   ```diff
   --- a/tasklet/htmx/src/views.ts
   +++ b/tasklet/htmx/src/views.ts
   @@ -62,7 +62,7 @@
            <input type="hidden" id="current-filter" name="filter" value="${current}">${FILTERS.map(
              ({ value, label }) => html`
            <button type="button" id="filter-${value}" aria-pressed="${value === current}"
   -          hx-get="/?filter=${value}" hx-target="#task-list" hx-swap="innerHTML">${label}</button>`,
   +          hx-get="/?filter=${value}" hx-push-url="true" hx-target="#task-list" hx-swap="innerHTML">${label}</button>`,
            )}
          </div>`
    }
   ```

   It works in the browser: the URL changes, Back restores the previous filter (from htmx's history
   snapshot), and a reload renders the page for the URL. But the acceptance test fails one test:

   ```console
     1) [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All

       Error: expect(locator).toHaveCount(expected) failed

       Locator:  getByRole('list', { name: 'Tasks', exact: true }).getByRole('listitem')
       Expected: 3
       Received: 2
   …
     1 failed
       [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All
     6 skipped
     8 passed (15.6s)
   ```

   The test chooses a filter, reloads and expects the full list with All selected. Tasklet's contract says
   the filter is not persisted. `page.reload()` keeps the URL, so the server renders `?filter=…` and the
   list shows two tasks instead of three. View state in the URL is shareable and many htmx apps do it; it
   just isn't Tasklet's contract. Undo the change (`patch -R -p1`) before you go on.

   </details>

5. **Port Tasklet to htmx 4.** Copy `tasklet/htmx` to a scratch folder, install `htmx.org@4.0.1`, run the
   acceptance test against it, and fix what breaks. Does `hx-delete` still send the filter?

   <details><summary>Solution</summary>

   With only the version changed, 8 tests pass and "adds a trimmed task, clears the input and ignores blank
   titles" fails: the task is added, but the input keeps its text. The form resets on
   `hx-on::config-request`, and htmx 4 has no `htmx:configRequest` event any more; it is
   `htmx:config:request`. htmx's own checker doesn't catch it:

   ```console
   $ npx htmx.org@4.0.1 upgrade-check src
   File extensions: .html, .php, .js, .ts, .jinja, .jinja2, .j2, .erb, .hbs
   Use --ext to add more (e.g. --ext .vue --ext .svelte)

   Scanning 4 file(s)...


   Found 0 issue(s) in 0 of 4 file(s).
   ```

   The full change is `examples/ch13/htmx-4.diff`:

   `examples/ch13/htmx-4.diff`

   ```diff
   --- a/tasklet/htmx/package.json
   +++ b/tasklet/htmx/package.json
   @@ -9,7 +9,7 @@
        "serve": "node src/server.ts"
      },
      "dependencies": {
   -    "htmx.org": "2.0.11"
   +    "htmx.org": "4.0.1"
      },
      "devDependencies": {
        "@types/node": "26.6.6",
   --- a/tasklet/htmx/src/views.ts
   +++ b/tasklet/htmx/src/views.ts
   @@ -48,7 +48,7 @@
    export function taskForm(): Html {
      return html`<form aria-label="Add task" class="add" method="post" action="/tasks"
            hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
   -        hx-on::config-request="this.reset()">
   +        hx-on::config:request="this.reset()">
            <label for="new-task">New task</label>
            <input id="new-task" name="title" autocomplete="off">
            <button type="submit">Add</button>
   ```

   With it, the run on port 4433 gives `6 skipped`, `9 passed (9.8s)`, the same as htmx 2. The no-JavaScript
   form, rapid toggles and focus restoring behaved the same in the manual checks. `hx-delete` still sends
   the filter: under Active, deleting task 1 sent `DELETE /tasks/1?filter=active` and the list stayed
   filtered. The htmx 4 change only drops the *enclosing form's* values, and Tasklet names its value with
   `hx-include`. The other breaking changes don't touch Tasklet:

   - It inherits no attributes.
   - It never relies on OOB order, because each OOB element is independent of the list.
   - Its only error response (404 for a missing task) is plain text that would now be swapped into the list.

   That last one is worth fixing in a real app, with `hx-status:404="swap:none"` or a proper fragment.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-13--htmx)
