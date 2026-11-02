# Chapter 12 — Lit and Web Components

Every framework in this course defines its own idea of a component. A React component works only in React,
and a Svelte component only in Svelte. The browser has its own component model, **Web Components**: a set
of standards that let you define new HTML elements, such as `<toggle-chip>` or `<task-item>`, with their own
behavior and private DOM and CSS. Elements defined this way work in any page and with any framework, or with
none, because to everything else they are just HTML elements.

The standards are low-level, so most people write web components with a library. **Lit**, from Google, is
the most widely used. It adds reactive properties, efficient templates and a small update cycle on top of
the standards, in about 5 kB. This chapter first builds a custom element with no library, so you can see
what the platform does on its own. Then it builds Tasklet in Lit and faces the question every web component
app meets: should shadow DOM keep the shared stylesheet out? Last, it covers how React, Vue, Angular and
Svelte use web components, the design systems built on them, and when they are the right choice. The next
chapter, on htmx, leaves client-side components behind altogether.

## At a glance

| | Lit |
| --- | --- |
| First released | lit-html 0.1.0 in June 2017 and LitElement in September 2017, as successors to Polymer; merged as Lit 2.0 in September 2021 |
| Current version | 3.3.3 (May 14, 2026); `@lit/task` 1.0.3 |
| Created by / maintained by | Google's Lit team (from the Polymer project); since October 2025 an OpenJS Foundation project, with a technical steering committee of engineers from Google, Adobe, Reddit and elsewhere |
| License | BSD-3-Clause |
| Rendering model | Each element renders into its own shadow root (or its light DOM) with lit-html: tagged template literals, with only the `${}` parts updated. No virtual DOM |
| Reactivity model | Reactive properties: setting one schedules an asynchronous, batched update of that element |
| Templates | `` html`…` `` tagged template literals, with `.prop`, `?bool` and `@event` bindings |
| Language | JavaScript or TypeScript; decorators (`@customElement`, `@property`, `@state`) are optional |
| Tasklet build size | 10.64 kB gzip (28.37 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | None. Server rendering is experimental (`@lit-labs/ssr`) |
| Good fit for | Design systems and widgets shared across teams and frameworks; pages that need components without a framework; long-lived code that should outlast a framework |

## Why it exists

### Web Components: the platform's components

Google proposed Web Components in 2011 and shipped a first version in Chrome in 2013–2014. Other browsers
objected to parts of it, and the version everyone agreed on, "v1", only arrived later: Chrome and Safari
shipped custom elements and shadow DOM v1 in 2016–2017, Firefox in October 2018 (version 63), and Edge
when it moved to Chromium in January 2020. Since then you can use them in every browser without a polyfill.

The idea is that a component model belongs in the browser, so that a date picker or a button written once
works everywhere, the way `<video>` and `<select>` do. You get a lifecycle, private DOM, scoped styles and
the ability to accept child content, all from the platform. What you don't get is rendering: the standards
have no templating with data binding and no reactive state. Writing a non-trivial element by hand means
creating DOM nodes and updating them yourself, which is the problem frameworks solved in the first place
([Chapter 3](03-the-problem-frameworks-solve.md)).

### Lit: the thinnest useful layer

Google's Polymer project (from 2013) filled that gap and served as a testbed for the standards. When the v1
standards and ES modules landed in browsers, the Polymer team started over with two small libraries. One
was **lit-html** (2017), a templating library that uses JavaScript's tagged template literals, so it needs
no compiler. The other was **LitElement**, a base class that adds reactive properties to a custom element
and renders with lit-html. Lit 2.0 (September 2021) merged them under one name. Lit 3.0 (October 2023)
dropped Internet Explorer support and added standard TC39 decorators. In October 2025 Lit joined the OpenJS
Foundation, which hosts Node.js and webpack, so it no longer depends on Google alone.

Lit's design rule is to add as little as possible to the platform. A Lit element *is* a custom element; you
can use it from plain HTML. Its home page says Lit weighs "around 5 KB (minified and compressed)", and that
holds up: the chapter bundled `LitElement`, `html` and `css` with esbuild and measured 5,965 bytes gzipped
(5,393 bytes with Brotli).

## The mental model

### The standards

"Web Components" is an umbrella term for several standards that work together. You can use each alone.

- **Custom elements** let you register a class for a tag name with a dash:
  `customElements.define('toggle-chip', ToggleChip)`. The class extends `HTMLElement`. The browser calls
  `connectedCallback` when the element enters the document, `disconnectedCallback` when it leaves, and
  `attributeChangedCallback` when one of the attributes listed in `static observedAttributes` changes. An
  element in the page before its class is defined stays a plain `HTMLElement` until `define` runs. Then it
  is *upgraded*.
- **Shadow DOM** gives an element a private DOM tree, its *shadow root*, attached with
  `this.attachShadow({ mode: 'open' })`. Page CSS doesn't reach into it and its CSS doesn't leak out. Page
  scripts don't find its nodes with `document.querySelector`. Events that come out of it are *retargeted* so
  they appear to come from the host element. Inherited properties, such as `color`, `font` and CSS custom
  properties, still pass through.
- **Slots**: `<slot>` elements in the shadow root show the element's children (its *light DOM*) at that
  place. A `<slot name="hint">` shows the children with `slot="hint"`. The children stay in the page's DOM
  and keep the page's styles.
- **`<template>`** holds inert markup the browser parses once and you clone many times.
- **Form-associated custom elements** (`static formAssociated = true` and `attachInternals()`) let an
  element take part in forms like an `<input>`: submit a value, be reset, be validated and be labeled.
- **Declarative Shadow DOM** (`<template shadowrootmode="open">`) lets HTML alone, for example from a server,
  create a shadow root without any script.
- **Constructable stylesheets** (`new CSSStyleSheet()` and `adoptedStyleSheets`) let one parsed stylesheet
  be shared by the document and any number of shadow roots.

How widely they are supported, according to webstatus.dev, today:

| Feature | Available in all major browsers since | Status |
| --- | --- | --- |
| Custom elements, shadow DOM, slots, templates (v1) | January 2020 (Edge 79) | Widely available |
| Constructable stylesheets, `adoptedStyleSheets` | March 2023 (Safari 16.4) | Widely available |
| Form-associated custom elements | March 2023 (Safari 16.4) | Widely available |
| Declarative Shadow DOM | February 2024 (Firefox 123) | Widely available since August 2026 |
| Customized built-ins (`is="…"`, extending `<button>`) | Not in Safari | Limited |
| Scoped custom element registries | Safari 26, Chrome 146; not Firefox | Limited |
| `:host-context()` | Chrome only | Limited |

### A custom element with no library

`examples/ch12/toggle-chip.js` defines `<toggle-chip>`, a pill-shaped toggle button, with nothing but the
standards:

`examples/ch12/toggle-chip.js`

```js
// <toggle-chip>: a pill-shaped toggle button, written with no library.
// Load it with a classic <script>, so index.html also works from file://.

const template = document.createElement('template')
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
    button {
      font: inherit;
      padding: 0.25rem 0.75rem;
      border: 1px solid #8a93a3;
      border-radius: 999px;
      background: white;
      color: #1d2330;
      cursor: pointer;
    }
    :host([pressed]) button {
      background: #2f5bd3;
      border-color: #2f5bd3;
      color: white;
    }
    ::slotted([slot="hint"]) {
      font-size: 0.85em;
      opacity: 0.75;
    }
  </style>
  <button type="button" part="button" aria-pressed="false">
    <slot>Toggle</slot> <slot name="hint"></slot>
  </button>
`

class ToggleChip extends HTMLElement {
  // Changes to these attributes call attributeChangedCallback.
  static observedAttributes = ['pressed']

  #button

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.append(template.content.cloneNode(true))
    this.#button = root.querySelector('button')
    this.#button.addEventListener('click', () => {
      this.pressed = !this.pressed
      this.dispatchEvent(
        new CustomEvent('toggle-change', {
          detail: { pressed: this.pressed },
          bubbles: true, // up through the ancestors...
          composed: true, // ...and out of any shadow root the chip sits in
        }),
      )
    })
  }

  // The property reflects the boolean attribute: present means true.
  get pressed() {
    return this.hasAttribute('pressed')
  }

  set pressed(value) {
    this.toggleAttribute('pressed', Boolean(value))
  }

  connectedCallback() {
    // A property set before the element was defined landed on the plain
    // object and hides the setter; take it off and set it again.
    if (Object.hasOwn(this, 'pressed')) {
      const value = this.pressed
      delete this.pressed
      this.pressed = value
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.#button.setAttribute('aria-pressed', String(newValue !== null))
  }
}

customElements.define('toggle-chip', ToggleChip)
```

Every standard shows up here. The template holds the shadow root's markup and its `<style>`, parsed once
and cloned for each chip. `:host` is the chip element itself as seen from inside, and `:host([pressed])`
matches it when it has the attribute. The default `<slot>` shows the chip's text, with "Toggle" as fallback
content when there is none; the named slot shows a `slot="hint"` child, and `::slotted()` styles it from the
inside. `part="button"` exposes the inner button to page CSS through `toggle-chip::part(button)`, the one
deliberate opening in the encapsulation.

Then the hard part, which every element author has to get right: **attributes and properties**. HTML gives
an element attributes (strings in the markup); JavaScript gives it properties (any value). Built-in
elements keep the two in sync, and a custom element must do it by hand. Here `pressed` is a boolean
property that *reflects* to a boolean attribute: present means true, absent means false, as with `disabled`.
Note that `pressed="false"` means *pressed*. The `connectedCallback` handles a case that catches everyone
out: if a framework sets `el.pressed = true` before the class is defined, the value lands on the plain
object and shadows the setter, so the element takes it off and sets it again after the upgrade.

Last, the event. `toggle-change` is a `CustomEvent` with the new state in `detail`. `bubbles: true` lets an
ancestor listen, and `composed: true` lets the event cross out of a shadow root if the chip sits inside one.
That's how a parent hears from a child in web components: properties go down, events come up.

`examples/ch12/index.html` puts three chips on a page with a page-level rule `button { background: hotpink }`.
`verify-toggle-chip.mjs` opens it in headless Chromium and reports what it finds:

```console
$ cd examples/ch12
$ npm run verify

> verify
> node verify-toggle-chip.mjs

defined: true
shadowMode: "open"
lightDomText: "Write a signal 5 min"
defaultSlot: ["Write a signal "]
hintSlot: ["<span slot=\"hint\">5 min</span>"]
emptyChipShowsFallback: true
queryFromOutside: null
pageButtonBackground: "rgb(255, 105, 180)"
chipButtonBackground: "rgb(255, 255, 255)"
pressedChipBackground: "rgb(47, 91, 211)"
partFontSize: "20px"

pressed property: false
after el.pressed = true -> attribute:  | aria-pressed: true
after setAttribute("pressed", "false") -> property: true
after removeAttribute("pressed") -> property: false

after clicking the chip -> log: Write a signal: true
a click inside the shadow root, seen from document -> event.target: toggle-chip
property set before define -> after upgrade: {"property":true,"attribute":""}
```

Read it as a list of the standards at work. The light DOM text includes the hint, but the default slot shows
only "Write a signal". `document.querySelector` can't find the inner button (`null`). The page's hot pink
reaches the page's button but not the chips'. The `::part` rule sets the big chip's font size to 20px.
Setting the property adds the attribute, and `setAttribute("pressed", "false")` still means pressed. A click
inside the shadow root reaches the document with `event.target` retargeted to `<toggle-chip>`. And a
property set before `define` survives the upgrade.

That's about 80 lines for one small control, with no rendering beyond a static template. A list of tasks
would also need you to create, update and remove DOM nodes as the data changes. Lit does that part.

### Lit: reactive properties, batched updates, template parts

A Lit element is a custom element whose class extends `LitElement`. You declare *reactive properties*, and
Lit turns each one into an accessor. Setting one doesn't render right away. It schedules an update in a
microtask, so ten property changes in one event handler cause one render:

```text
this.tasks = [...]          set a reactive property
  └─ requestUpdate()        record the old value in `changed`; schedule an update (once)
       ⋮ microtask
  performUpdate()
    shouldUpdate(changed)   return false to skip this update
    willUpdate(changed)     compute values from the changed properties
    update(changed)         reflect properties to attributes, call render(),
                            commit the template result to the DOM
    firstUpdated(changed)   first time only: the DOM now exists
    updated(changed)        after every update: side effects (Tasklet saves here)
  updateComplete            a promise that resolves when the update is done
```

`render()` returns a lit-html template result, not DOM and not a virtual DOM. The first time a given
template renders, lit-html creates a `<template>` from its static strings, clones it and remembers where
each `${}` expression goes: a text position, an attribute, a property, an event listener. Later renders of
the same template only compare the new expression values with the old ones and touch the parts that
changed. The static parts are never compared, because JavaScript guarantees that the strings array of a
tagged template is the same object every time.

The binding prefixes say what each expression is:

| Binding | Meaning | Tasklet example |
| --- | --- | --- |
| `name=${v}` | Attribute (as a string) | `filter=${this.filter}` |
| `.name=${v}` | Property (any value) | `.task=${task}`, `.checked=${task.done}` |
| `?name=${v}` | Boolean attribute: present or absent | `?disabled=${!anyDone}` |
| `@name=${fn}` | Event listener | `@task-toggle=${…}` |

## Code structure

### Scaffolding

Vite has a Lit template:

```console
$ npm create vite@latest lit -- --template lit-ts --no-interactive

> npx
> 'cva' lit --template lit-ts --no-interactive


create-vite v9.3.3

│
◇  Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/lit...
│
└  Done. Now run:

  cd lit
  npm install
  npm run dev
```

It writes one sample element, `src/my-element.ts`, an `index.html` that uses it, and a `tsconfig.json` with
two settings that matter for Lit. `"experimentalDecorators": true` turns on TypeScript's older decorator
syntax, which Lit's decorators support alongside the newer standard decorators. `"useDefineForClassFields":
false` is needed with those decorators: with standard class-field semantics, a field such as
`filter = 'all'` would be defined on each instance and hide the accessor Lit installed for the reactive
property. The template's versions are TypeScript 7.0.2 (the native compiler) and Vite 8.3.5; `lit` is the
only runtime dependency, joined here by `@lit/task`.

### Tree

```text
tasklet/lit/
├── index.html                   <tasklet-app></tasklet-app> and the module script
├── package.json
├── public/tasks.json
├── src/
│   ├── main.ts                  adopts the stylesheet into the document; loads the app
│   ├── styles.ts                the shared stylesheet as a CSSStyleSheet
│   ├── tasklet-app.ts           <tasklet-app>: state, loading, saving, the list
│   ├── components/
│   │   ├── task-form.ts         <task-form>    fires task-add
│   │   ├── filter-bar.ts        <filter-bar>   fires filter-change
│   │   └── task-item.ts         <task-item>    fires task-toggle, task-remove
│   ├── storage.ts, tasks.ts     the same helpers as the other Tasklet apps
│   └── tasklet.css
├── tasklet.json
└── tsconfig.json
```

The source is 323 lines in 8 files, against React's 249 in 7. The extra lines come from the class syntax, the
`declare global` blocks that tell TypeScript about each tag, and the event dispatching.

## Building Tasklet in Lit

### Shadow DOM or not?

Tasklet has a contract: one shared stylesheet, `tasklet.css`, styles the same DOM structure in every version
(`main.tasklet`, `.tasks`, `li.task`, `.tasklet button`, `.tasklet .delete`…). Shadow DOM is designed to
keep page styles *out*, so a component per shadow root breaks that contract in two ways. A stylesheet in the
document doesn't reach into any shadow root. And even with the sheet copied into every shadow root, a
selector like `.tasklet .delete` needs the `.tasklet` ancestor to be in the *same* tree as the button. Inside
`<task-item>`'s own shadow root there is no `.tasklet` ancestor, so the rule doesn't match. Exercise 4
measures this: with its own shadow root, the Delete button falls back to the browser's default look.

There are three common ways out:

1. **No shadow DOM at all.** Each element overrides `createRenderRoot()` to return `this`, so it renders into
   its own light DOM, and the page's stylesheet applies as usual. Slots stop working (they are a shadow DOM
   feature), and the element's markup is open to page CSS and scripts.
2. **Shadow DOM everywhere, with styles written for it.** Each element adopts its own styles and uses
   `:host`, parts and CSS custom properties for theming. This is how design systems work, but it means
   rewriting the shared stylesheet, which the contract forbids.
3. **A hybrid.** The outer element keeps a shadow root and adopts the shared stylesheet into it; the child
   elements render into their light DOM, which is *inside* the outer shadow root. All of Tasklet's markup ends
   up in one tree with one stylesheet, which is what the selectors expect.

Tasklet uses the hybrid. It shows the most of the platform while keeping the CSS contract: the app is
encapsulated from the page around it, and inside it the components share styles as the stylesheet assumes.
The stylesheet is parsed once into a `CSSStyleSheet` and adopted twice:

`tasklet/lit/src/styles.ts`

```ts
import css from './tasklet.css?inline'

// One constructable stylesheet, parsed once, shared by the document and by
// the <tasklet-app> shadow root.
export const taskletSheet = new CSSStyleSheet()
taskletSheet.replaceSync(css)
```

`tasklet/lit/src/main.ts`

```ts
import { taskletSheet } from './styles.ts'
import './tasklet-app.ts'

// The page itself needs the :root colors and the body margin from the
// shared stylesheet; <tasklet-app> adopts the same sheet into its shadow root.
document.adoptedStyleSheets = [...document.adoptedStyleSheets, taskletSheet]
```

The document needs the sheet too, because `tasklet.css` styles `body` and sets its colors as custom
properties on `:root`. Inside a shadow root there is no `:root` or `body` for those rules to match, but custom
properties inherit across the shadow boundary, so the colors set on the document reach the app. The `?inline`
suffix makes Vite import the CSS as a string instead of injecting a `<link>`. That's why the build has no
`.css` file: the stylesheet is part of the JavaScript bundle.

The acceptance tests didn't need any change. Playwright's role and text locators look inside open shadow
roots, so `getByRole('checkbox')` finds the checkboxes in `<tasklet-app>`'s shadow root. A script calling
`document.querySelector('li.task')` would not; it would have to go through
`document.querySelector('tasklet-app').shadowRoot`.

### `<tasklet-app>`

`tasklet/lit/src/tasklet-app.ts`

```ts
import { Task as AsyncTask } from '@lit/task'
import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import './components/filter-bar.ts'
import './components/task-form.ts'
import './components/task-item.ts'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'
import { taskletSheet } from './styles.ts'

// The app. It keeps the default shadow root, so the page's CSS can't reach in,
// and adopts the shared stylesheet there. The child elements render into this
// shadow root (they opt out of their own), so one stylesheet styles them all.
@customElement('tasklet-app')
export class TaskletApp extends LitElement {
  static styles = [taskletSheet, css`task-item { display: contents; }`]

  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  @state() private tasks: Task[] | null = loadSavedTasks()
  @state() private filter: Filter = 'all'

  // A reactive controller from @lit/task: tracks pending/complete/error for
  // the fetch and requests an update of this element on every change.
  private loader = new AsyncTask(this, {
    task: () => fetchTasks(),
    autoRun: false,
    onComplete: (tasks) => {
      this.tasks = tasks
    },
  })

  connectedCallback() {
    super.connectedCallback()
    if (this.tasks === null) this.loader.run()
  }

  // Runs after every render; changed says which reactive properties caused it.
  protected updated(changed: PropertyValues) {
    if (changed.has('tasks') && this.tasks !== null) saveTasks(this.tasks)
  }

  private addTask(title: string) {
    this.tasks = [...(this.tasks ?? []), { id: crypto.randomUUID(), title, done: false }]
  }

  private toggleTask(id: string) {
    this.tasks = (this.tasks ?? []).map((task) => (task.id === id ? { ...task, done: !task.done } : task))
  }

  private removeTask(id: string) {
    this.tasks = (this.tasks ?? []).filter((task) => task.id !== id)
  }

  private clearDone() {
    this.tasks = (this.tasks ?? []).filter((task) => !task.done)
  }

  private renderList(tasks: Task[]) {
    const visible = visibleTasks(tasks, this.filter)
    if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
    return html`
      <ul class="tasks" aria-label="Tasks">
        ${repeat(
          visible,
          (task) => task.id,
          (task) => html`
            <li class=${task.done ? 'task done' : 'task'}>
              <task-item
                .task=${task}
                @task-toggle=${() => this.toggleTask(task.id)}
                @task-remove=${() => this.removeTask(task.id)}
              ></task-item>
            </li>
          `,
        )}
      </ul>
    `
  }

  render() {
    const tasks = this.tasks
    return html`
      <main class="tasklet">
        <h1>Tasklet</h1>
        <task-form @task-add=${(event: CustomEvent<string>) => this.addTask(event.detail)}></task-form>
        <filter-bar
          filter=${this.filter}
          @filter-change=${(event: CustomEvent<Filter>) => (this.filter = event.detail)}
        ></filter-bar>
        ${tasks !== null
          ? this.renderList(tasks)
          : this.loader.render({
              initial: () => html`<p role="status">Loading tasks…</p>`,
              pending: () => html`<p role="status">Loading tasks…</p>`,
              error: () => html`
                <p role="alert">Couldn't load tasks.</p>
                <button type="button" @click=${() => this.loader.run()}>Retry</button>
              `,
            })}
        ${tasks === null
          ? nothing
          : html`
              <footer class="footer">
                <p class="count" aria-live="polite">${countLabel(tasks)}</p>
                <button
                  type="button"
                  class="clear"
                  ?disabled=${!tasks.some((task) => task.done)}
                  @click=${this.clearDone}
                >
                  Clear done
                </button>
              </footer>
            `}
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tasklet-app': TaskletApp
  }
}
```

The pieces, in order:

- **`@customElement('tasklet-app')`** calls `customElements.define` for the class. `static styles` is the
  adopted stylesheet; Lit accepts a `CSSStyleSheet` there as well as its own `` css`…` `` results.
- **`@state()`** declares internal reactive properties: `tasks` and `filter`. Setting them schedules an
  update. `@property()` (used by the children) declares *public* ones that can also be set from an attribute.
  `tasks` starts with the saved list, or `null`, which means "not loaded yet".
- **`@lit/task`** provides `Task`, a *reactive controller*: an object that hooks into its host element's
  lifecycle and requests updates. Here it tracks the fetch's state (initial, pending, complete, error);
  `this.loader.render({...})` picks the template for the current state, and `run()` starts the fetch again
  for Retry. `autoRun: false` keeps it from running on its own, because it only runs when nothing was saved.
  The import renames it `AsyncTask`, since `Task` is Tasklet's own type for a task.
- **`connectedCallback`** is the standard custom element callback. It must call `super`, which starts Lit's
  first update. If there was no saved list, it starts the fetch.
- **`updated(changed)`** runs after every render, with a map of the properties that changed. Saving when
  `tasks` changed gives the contract's "save after every change" without a separate effect system.
- **Templates.** `repeat` is a directive that keys the list by `task.id`, so a toggle updates the right
  `<li>` and `<task-item>` instead of reusing elements by position. `.task=${task}` sets a property (an object can't be
  an attribute), `filter=${this.filter}` an attribute, `?disabled` a boolean attribute, and the `@task-…`
  bindings listen for the children's events. `nothing` renders nothing.

- **The `<li>` belongs to the parent.** A `<ul>` may only contain `<li>` elements (and script-supporting
  ones), so `<tasklet-app>` renders each `<li class="task">` and puts a `<task-item>` inside it. The second
  entry in `static styles`, `task-item { display: contents; }`, gives the element no box of its own, so its
  label and button lay out as flex items of the `<li>`, as the shared stylesheet expects.

Note that `@click=${this.clearDone}` passes a method without binding it. Lit calls event listeners with the
host element as `this`, so methods work as listeners.

### The child elements

`tasklet/lit/src/components/task-item.ts`

```ts
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Task } from '../tasks.ts'

// One task's contents: a checkbox wrapped in its label, and a Delete button.
// The parent wraps it in the <li>, since a <ul> may only contain <li> elements.
// Fires task-toggle and task-remove.
@customElement('task-item')
export class TaskItem extends LitElement {
  // An object, so property-only: set it with .task=${task}, not an attribute.
  @property({ attribute: false }) task!: Task

  protected createRenderRoot() {
    return this
  }

  render() {
    const { task } = this
    return html`
      <label>
        <input
          type="checkbox"
          .checked=${task.done}
          @change=${() => this.dispatchEvent(new CustomEvent('task-toggle'))}
        />
        <span>${task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label=${`Delete "${task.title}"`}
        @click=${() => this.dispatchEvent(new CustomEvent('task-remove'))}
      >
        ×
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'task-item': TaskItem
  }
}
```

`createRenderRoot()` returning `this` is the light DOM opt-out from the decision above. The element renders
the inside of a list item; the `<li>` around it comes from the parent. The `task` property
has `attribute: false` because an object has no sensible attribute form, so the parent must use `.task=`.
The element doesn't change the task. It dispatches `task-toggle` and `task-remove` and lets the parent
decide, the same "data down, events up" flow as the React version's callbacks, but through the DOM's own
event system. The events don't need `bubbles` or `composed`, because the parent listens on the child element
itself.

`<task-form>` keeps its draft in a `@state()` and fires `task-add` with the trimmed title; `<filter-bar>` has
a public `filter` property and fires `filter-change`:

`tasklet/lit/src/components/task-form.ts` (excerpt)

```ts
  private handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = this.draft.trim()
    if (trimmed === '') return
    this.dispatchEvent(new CustomEvent('task-add', { detail: trimmed }))
    this.draft = ''
  }
```

Two names had to change on the way, because a custom element class inherits everything from `HTMLElement`.
A `title` state in `<task-form>` would collide with the standard `title` attribute and property (the
tooltip). An event or method called `remove` would be confused with `Element.remove()`, which deletes the
element. TypeScript caught the first; the second is the reason the events have a `task-` prefix. Collisions
like these are the cost of components that are real DOM elements.

### Build it and run it

```console
$ cd tasklet/lit
$ npm run build

> tasklet-lit@0.0.0 build
> tsc && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 36 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.33 kB │ gzip:  0.23 kB
dist/assets/index-H8KOMvHv.js  28.03 kB │ gzip: 10.49 kB

✓ built in 70ms
$ node ../tools/size.mjs dist
file                             raw        gzip
assets/index-H8KOMvHv.js    28.04 kB    10.40 kB
index.html                   0.33 kB     0.24 kB
total                       28.37 kB    10.64 kB
```

`tsc` only type-checks (the template sets `noEmit`), then Vite bundles everything into one JavaScript file,
10.40 kB gzipped, with the CSS inside it. At 10.64 kB in total, Lit Tasklet is about the size of Solid's
(10.37 kB, [Chapter 8](08-solid.md)) and a little smaller than Preact's (11.74 kB) and Mithril's (11.94 kB);
only VanJS (4.95 kB) is much smaller. Bundled on their own, the Lit modules the app imports come to 7.7 kB
gzipped, so most of the bundle is the library.

```console
$ cd ../e2e
$ node run-all.mjs lit
=== Lit (tasklet/lit, port 4311) ===
…
Running 15 tests using 15 workers

  ✓  10 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (369ms)
  ✓   1 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (463ms)
…
  ✓  11 [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All (735ms)
  ✓   9 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.2s)

  15 passed (1.8s)

Summary
app  port  build  passed  failed  skipped  note
lit  4311  ok     15      0       0
```

All 15 pass with no skips, and the computed styles of the Lit version match the React version's: the
hybrid kept the stylesheet working.

## Beyond Tasklet

### Using web components from frameworks

A custom element is an HTML element, so every framework can render it. The differences are in three
questions: does the framework set data as a property or as an attribute, how do you listen to a custom
event, and does the compiler complain about an unknown tag? The site Custom Elements Everywhere runs the
same tests against each framework. React 19, Vue 3, Angular, Svelte, Preact, Solid and Lit all score 100%
in its current results.

**React 19.** Before version 19, React passed everything to custom elements as attributes, so objects
arrived as `"[object Object]"`, and you needed a ref and `addEventListener` for custom events. React 19 fixed
both:

> React 19 adds full support for custom elements and passes all tests on Custom Elements Everywhere.
>
> — The React team, "React v19" (2024)

In the browser, React now sets a prop as a property if the element has a property of that name (`key in
element`), and otherwise as an attribute. A prop that starts with `on` and holds a function becomes an event
listener for the rest of the name, as written:

```tsx
// sketch: React 19
<toggle-chip pressed={done} ontoggle-change={(event) => setDone(event.detail.pressed)}>
  Done
</toggle-chip>
```

During server rendering React can't know the element's properties, so it renders strings, numbers and `true`
as attributes and leaves out `false`, objects and functions. For TypeScript you declare the tag in JSX's
`IntrinsicElements`. Lit also offers `@lit/react`, which wraps a Lit element in a React component with
typed props and named events, for code that still supports React 18.

**Vue.** Vue first tries to resolve an unknown tag as a Vue component and warns when it can't, unless you
tell it which tags are custom elements with `compilerOptions.isCustomElement` (for example, every tag with a
dash) in the Vite plugin options. Vue then
checks `key in element` and sets a property when one exists. `.prop` and `.attr` modifiers force one or the
other, and `@toggle-change` listens to the custom event. Vue can also *produce* web components with
`defineCustomElement`.

**Angular.** Add `CUSTOM_ELEMENTS_SCHEMA` to the component's `schemas`, or the template compiler rejects the
unknown tag. Then `[pressed]="done"` binds a property, `[attr.pressed]` an attribute, and
`(toggle-change)="onToggle($event)"` listens to the event. Angular Elements (`@angular/elements`) goes the
other way and wraps Angular components as custom elements.

**Svelte.** Svelte 5 needs no configuration. It sets a prop as a property when the defined element has a
setter for it, and as an attribute otherwise; `ontoggle-change={…}` listens to the event. With
`<svelte:options customElement="…">` Svelte compiles a component into a custom element.

Two problems remain everywhere. Server rendering of a framework page leaves custom elements empty until their
JavaScript loads, unless they support Declarative Shadow DOM. And shadow DOM breaks some patterns that
frameworks and tests take for granted: a `<label for>` or `aria-labelledby` can't point to an element in
another tree, and global CSS doesn't apply. (A proposal called `referenceTarget`, shipped so far only in
Chrome 152, addresses the ARIA references.)

### Server rendering and Declarative Shadow DOM

Declarative Shadow DOM makes server rendering of shadow roots possible: the server writes
`<template shadowrootmode="open">` inside the element, the HTML parser attaches the shadow root, and the
element is styled and laid out before any script runs. Exercise 3 does it with plain HTML. Lit's server
renderer, `@lit-labs/ssr` (4.1.0), renders Lit elements into this form, and Lit's hydration support then
attaches the elements to the existing DOM. It's still a "labs" package, and frameworks integrate it
separately (there are Lit plugins for Eleventy and Next.js), so most Lit elements are rendered in the
browser.

### Stencil and the design systems

Web components fit **design systems** best: a company's buttons, inputs and dialogs, written once and used by
teams on React, Angular, Vue and plain pages. Several large ones are built this way:

- **Web Awesome**, the successor to **Shoelace**. Shoelace (2.x, last released March 2025) is now marked
  "sunset", with no active development. Its successor, made with the Font Awesome team, came out as Web
  Awesome 3.0 in October 2025 (3.14.0 in September 2026). It's built with Lit, MIT-licensed, with a paid Pro tier of extra components and themes.
- **Material Web** (`@material/web`), Google's Material Design 3 components, built with Lit. In June 2024
  its README announced that the project was "in maintenance mode pending new maintainers". Releases didn't
  stop altogether: 2.5.0 came out in July 2026. Treat it as maintained, slowly.
- **Spectrum Web Components** (Adobe) and **Carbon Web Components** (IBM) are built with Lit; **Fluent UI Web
  Components** (Microsoft) with Microsoft's FAST library. All published releases in the last three months.
- **Ionic**'s mobile UI components are built with **Stencil**.

**Stencil**, made by the Ionic team, is the main alternative to Lit for this job. It isn't a runtime library
but a compiler: you write components in TypeScript with JSX and decorators, and Stencil builds
standards-based custom elements, lazy-loading bundles, and *output targets* that generate React, Angular and
Vue wrapper packages for each component, which smooths over the property and event differences listed
above. Stencil 4.45.2 is current, and Stencil 5 is in beta.

| Weekly npm downloads | May 2023 | October 2026 |
| --- | --- | --- |
| `lit` | 912,239 | 6,325,780 |
| `@stencil/core` | 769,320 | 1,319,406 |
| `@awesome.me/webawesome` | – | 221,243 |
| `@material/web` | 39,319 | 128,109 |

Lit's downloads are high partly because the design systems above depend on it, so many projects install Lit
without writing an element. The Lit home page lists Adobe, Alaska Airlines, Cisco, Google, IBM, ING,
Microsoft, Red Hat, SAP, VMware and YouTube among its users, and Home Assistant's interface is built with
it.

### When to choose web components

Choose them when the component must outlive or cross frameworks: a design system for teams on different
stacks, a widget that other people embed in their sites, a micro-frontend boundary, or an app that should
not depend on a framework's release cycle. Lit is also a reasonable choice for a whole app when you want
little JavaScript and no framework lock-in, as long as you accept its trade-offs.

Prefer a framework's own components when one framework owns the whole app. You'll get server rendering,
routing, data loading and a large ecosystem built for it, and you won't fight shadow DOM over forms,
accessibility references and global CSS. Mixing both is common: a React or Angular app that uses a company's
web component design system for its controls.

## Strengths and trade-offs

**Strengths**

- Standards-based: a Lit element is a real HTML element, usable from any framework or from plain HTML, and
  the platform parts will keep working as long as browsers do.
- Small and fast: about 5 kB of runtime, no virtual DOM, and updates that touch only changed template parts.
- Encapsulation when you want it: shadow DOM scopes styles and markup; slots and parts define a clear styling
  and content API.
- No compiler required. Templates are plain JavaScript; TypeScript and decorators are optional.
- Interoperability has caught up: React 19 finished the last big gap.

**Trade-offs**

- Shadow DOM works against global stylesheets, cross-tree ARIA references, `<label for>` and some testing
  and analytics tools. Opting out with light DOM gives up slots and scoping.
- The attribute versus property split, upgrade timing and name collisions with `HTMLElement` are your
  problem, not the library's.
- Components only, by design. No router, no app-level state, no data loading, and server rendering is still
  labs-only. You assemble those from other libraries.
- Each element is a global name in one registry; two versions of the same element can't coexist on a page
  until scoped registries are supported everywhere.
- A smaller app-building community than React's or Vue's: most Lit code is design systems, not apps.

## Compared with React

The task item in React from [Chapter 4](04-react.md), then in Lit:

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

`tasklet/lit/src/components/task-item.ts` (excerpt)

```ts
      <label>
        <input
          type="checkbox"
          .checked=${task.done}
          @change=${() => this.dispatchEvent(new CustomEvent('task-toggle'))}
        />
        <span>${task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label=${`Delete "${task.title}"`}
        @click=${() => this.dispatchEvent(new CustomEvent('task-remove'))}
      >
        ×
      </button>
```

The markup is nearly the same, except that the Lit parent renders the `<li>` around each `<task-item>`. The
React component gets two callbacks as props and calls them; the Lit element dispatches events and lets
whoever rendered it listen. React's JSX is compiled to function calls and
diffed against a virtual DOM; Lit's template is a string literal that the browser parses once into a
`<template>`, and later renders update only the `${}` parts.

| | React 19 | Lit 3 |
| --- | --- | --- |
| Component | A function, known only to React | A class registered as an HTML element |
| State | `useState`, re-runs the function | Reactive properties (`@state`, `@property`), batched update |
| Rendering | Virtual DOM diff | lit-html template parts |
| Child to parent | Callback props | DOM events (`CustomEvent`) |
| Styles | Global CSS, CSS modules or CSS-in-JS | Shadow DOM with `static styles`, or light DOM |
| Composition | `children` and props | Slots (with shadow DOM) and properties |
| Usable from other frameworks | No (needs wrapping) | Yes |
| Tasklet size (gzip) | 70.14 kB | 10.64 kB |

## Summary

- Web Components are browser standards: custom elements, shadow DOM, slots and templates, plus
  form-associated elements, Declarative Shadow DOM and constructable stylesheets. All are supported in every
  major browser; scoped registries and customized built-ins aren't yet.
- A custom element by hand needs you to sync attributes and properties, handle upgrades, and update the DOM
  yourself. `<toggle-chip>` shows each of these in about 80 lines.
- Lit adds reactive properties, a batched asynchronous update cycle (`willUpdate`, `render`, `updated`) and
  lit-html templates that update only their dynamic parts, in about 5 kB.
- Shadow DOM and a shared global stylesheet don't mix. Tasklet uses a hybrid: one shadow root for the app
  with the stylesheet adopted into it, and light DOM children inside it.
- Children talk to parents with DOM events; parents pass objects down as properties with `.prop=`.
- React 19, Vue, Angular and Svelte all handle custom elements well now; Declarative Shadow DOM makes server
  rendering possible, though Lit's own SSR is still experimental.
- Lit, Stencil and the design systems built on them (Web Awesome, Material Web, Spectrum, Carbon, Fluent,
  Ionic) are where web components are most used. Choose them for components that must cross frameworks.

## Exercises

The examples are in `examples/ch12/`. Run `npm ci` there once (and `npx playwright install chromium` if you
haven't installed Chromium). `npm run verify:solutions` checks the solutions to exercises 1–3 in headless
Chromium.

1. **The chip that won't hide.** `hidden.html` has two chips, one with the `hidden` attribute. Both are
   visible. Find out why, and fix `toggle-chip.js` so `hidden` works as it does for any other element.

   <details><summary>Solution</summary>

   The browser hides `[hidden]` elements with a user-agent rule, `display: none`. The chip's `:host` rule,
   `display: inline-block`, comes from the element's own shadow root and wins over the user-agent rule, so
   the element stays visible. The fix restates the rule inside the shadow root:

   `examples/ch12/solutions/toggle-chip.js` (excerpt)

   ```css
       :host {
         display: inline-block;
       }
       /* :host beats the browser's [hidden] rule, so restate it. */
       :host([hidden]) {
         display: none;
       }
   ```

   ```console
   $ npm run verify:solutions
   …
   hidden.html: <toggle-chip hidden> display inline-block, visible true
   solutions/hidden.html: <toggle-chip hidden> display none, visible false
   …
   ```

   Every element that sets `display` on `:host` needs this rule, Lit elements included.

   </details>

2. **A chip that belongs to a form.** Make a `<form-toggle-chip name="urgent" value="yes">` that is
   submitted with its form when pressed, is left out when not, is reset by the form's Reset button and shows
   up in `form.elements`. Extend `ToggleChip` rather than copying it.

   <details><summary>Solution</summary>

   `examples/ch12/solutions/form-toggle-chip.js`

   ```js
   // <form-toggle-chip>: <toggle-chip> taught to take part in forms.
   // Load toggle-chip.js first: classic scripts share one global scope, so the
   // ToggleChip class it declares is visible here.

   class FormToggleChip extends ToggleChip {
     // Opt in: the element can now be a form control, like <input>.
     static formAssociated = true

     #internals = this.attachInternals()

     // What a form control is expected to have.
     get form() {
       return this.#internals.form
     }

     get name() {
       return this.getAttribute('name')
     }

     attributeChangedCallback(name, oldValue, newValue) {
       super.attributeChangedCallback(name, oldValue, newValue)
       // Submitted as name=value when pressed, left out when not (a checkbox's rule).
       this.#internals.setFormValue(newValue === null ? null : (this.getAttribute('value') ?? 'on'))
     }

     // Called by the browser when the form is reset.
     formResetCallback() {
       this.pressed = false
     }
   }

   customElements.define('form-toggle-chip', FormToggleChip)
   ```

   ```console
   $ npm run verify:solutions
   …
   form data before: [["title","Write chapter 12"]]
   after clicking the chip: [["title","Write chapter 12"],["urgent","yes"]]
   chip.form is the form: true
   form.elements: ["input","form-toggle-chip","button"]
   after Reset: [["title","Write chapter 12"]], pressed false
   …
   ```

   `static formAssociated = true` tells the browser the element is a form control; `attachInternals()`
   returns the `ElementInternals` object through which it sets its value (`setFormValue`), and later its
   validity (`setValidity`) and accessibility state. `formResetCallback` is one of four form callbacks, with
   `formAssociatedCallback`, `formDisabledCallback` and `formStateRestoreCallback`.

   </details>

3. **A shadow root without JavaScript.** Write a page with a `<task-card>` whose shadow root is created by
   the HTML parser alone, with a style that colors its paragraph differently from the page's paragraphs.
   Check that it works with JavaScript disabled.

   <details><summary>Solution</summary>

   `examples/ch12/solutions/declarative.html` (excerpt)

   ```html
       <task-card>
         <template shadowrootmode="open">
           <style>
             p {
               color: rgb(47, 91, 211);
             }
           </style>
           <p><slot></slot></p>
         </template>
         Rendered on the server, styled inside its own shadow root.
       </task-card>
   ```

   ```console
   $ npm run verify:solutions
   …
   JavaScript enabled in the page: false
   task-card has a shadow root: open
   <template> left in the light DOM: false
   shadow <p> color: rgb(47, 91, 211)
   page <p> color: rgb(180, 35, 24)
   visible text: "Rendered on the server, styled inside its own shadow root."
   ```

   The parser turns the `<template shadowrootmode="open">` into a shadow root and removes the template.
   `<task-card>` is never defined, and doesn't need to be. If a script later defines it, the class finds the
   shadow root already attached (`this.shadowRoot`, or `attachInternals().shadowRoot` for a closed one), which
   is how Lit's SSR hydration starts. The `shadowroot` attribute without `mode` was an earlier, Chrome-only
   form; `shadowrootmode` is the standard one.

   </details>

4. **Give `<task-item>` its own shadow root.** Copy `tasklet/lit`, replace `src/components/task-item.ts` with
   a version that keeps its shadow root (remove `createRenderRoot`) and adopts the shared stylesheet with
   `static styles = taskletSheet`. Build it and compare the first task's styles with the original. What
   changes, and why?

   <details><summary>Solution</summary>

   `examples/ch12/solutions/task-item-shadow.ts` (excerpt)

   ```ts
     // Its own shadow root this time, with the shared sheet adopted into it.
     static styles = taskletSheet
   ```

   ```console
   $ node solutions/compare-styles.mjs ../../tasklet/lit/dist <copy>/dist
   {"shadowRoot":false,".delete":{"padding":"0px 8px","borderColor":"rgba(0, 0, 0, 0)","backgroundColor":"rgb(255, 255, 255)","color":"rgb(93, 102, 118)","fontSize":"20px"},"li.task":{"display":"flex","borderBottom":"1px solid rgb(213, 217, 224)"},".task label":{"display":"flex","cursor":"pointer"}}
   {"shadowRoot":true,".delete":{"padding":"1px 6px","borderColor":"rgb(0, 0, 0)","backgroundColor":"rgb(239, 239, 239)","color":"rgb(29, 35, 48)","fontSize":"16px"},"li.task":{"display":"flex","borderBottom":"1px solid rgb(213, 217, 224)"},".task label":{"display":"block","cursor":"default"}}
   ```

   The first line is the original, the second the copy. The `<li>` looks the same in both, because it is
   rendered by `<tasklet-app>` and stays in its shadow tree. Everything inside `<task-item>` loses its styles.
   The Delete button gets the browser's `1px 6px` padding, the default gray background and 16px text, and the
   label stops being a flex row with a pointer cursor. The rules are `.tasklet button`, `.tasklet .delete` and
   `.task label`, and both the `.tasklet` element (the `<main>`) and the `li.task` are in `<tasklet-app>`'s
   shadow tree, not in `<task-item>`'s. Selectors don't cross shadow boundaries. To make it work you would
   rewrite those rules for shadow DOM (for example `:host .delete`, or a custom property set on `.tasklet`),
   which is why Tasklet's child elements use light DOM. `:host-context(.tasklet)` would express it, but only
   Chrome supports it.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-12--lit-and-web-components)
