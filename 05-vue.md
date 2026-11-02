# Chapter 5 — Vue

Vue sits between the two styles you have seen so far. Like the vanilla version in
[Chapter 3](03-the-problem-frameworks-solve.md), you change data in place: `task.done = true`, `tasks.push(…)`.
Like React in [Chapter 4](04-react.md), you describe the UI declaratively and a virtual DOM updates the
page. Between the two sits a reactivity system that records which component read which piece of state, so
Vue knows exactly which components to re-render after a change. This chapter explains that model, builds
Tasklet with single-file components and the Composition API, and then looks at what Tasklet leaves out:
Vue Router, Pinia, Nuxt, the devtools and Vapor mode, the compilation mode that drops the virtual DOM and is
in release candidates as Vue 3.6.

## At a glance

| | |
| --- | --- |
| First released | February 2014 (1.0 in October 2015, 3.0 in September 2020) |
| Current version | 3.5.44 (October 13, 2026); 3.6.0-rc.14 with Vapor mode on the `rc` tag (October 30, 2026) |
| Created by / maintained by | Evan You; an independent core team funded by sponsors and donations, with no company owning the project |
| License | MIT |
| Rendering model | Virtual DOM per component, with compiler hints (patch flags, hoisting); opt-in Vapor mode in 3.6 compiles templates to direct DOM updates |
| Reactivity model | Fine-grained: `ref` and `computed` are signals, `reactive` objects are Proxies; tracking decides which components re-render |
| Templates | HTML-based templates in single-file components (`.vue`); render functions and JSX are optional |
| Language | TypeScript or JavaScript; `vue-tsc` type-checks templates as well as scripts |
| Tasklet build size | 28.37 kB gzip (72.34 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | Nuxt ([Chapter 18](18-meta-frameworks-and-rendering.md)) |
| Good fit for | Teams that want HTML-like templates and an official router, store and devtools; adding interactivity to existing server-rendered pages; apps of any size |

## Why it exists

Evan You started Vue in 2013 after working with AngularJS. He wanted the part he liked, data binding in
HTML templates with directives, in a much smaller library that tracked dependencies instead of dirty
checking (the history is in [Chapter 2](02-a-short-history.md)). Vue 2 (2016) put a
virtual DOM under the templates, and Vue 3 (2020) rewrote the reactivity system on JavaScript Proxies and
added the **Composition API**, a function-based way to write components next to the original object-based
**Options API**.

Vue calls itself the *progressive framework*: you can add it to one widget on a server-rendered page with
a `<script>` tag, or build a full single-page app with a compiler, a router, a store and a meta-framework.
The documentation states the starting point:

> It builds on top of standard HTML, CSS, and JavaScript and provides a declarative, component-based
> programming model that helps you efficiently develop user interfaces of any complexity.
>
> — Vue documentation, "Introduction" (2026)

Two design choices follow from that. First, templates are valid-looking HTML with a few attributes added
(`v-if`, `v-for`, `@click`), so designers and back-end developers can read them. Second, the official
pieces (Vue Router, Pinia, the devtools, `create-vue`, the language tools) come from the same core team
and are released together, so there is one recommended answer to most questions. Vue has never had a large
company behind it; it is funded by sponsors and donations. Its creator also founded VoidZero, the company
behind Vite, Rolldown and Oxc ([Chapter 17](17-build-tools.md)), which Cloudflare acquired in June 2026.

## The mental model

Vue's model has three layers: reactive state, effects that read it, and a renderer that turns each
component's output into DOM changes.

```text
  reactive state                               one component
  ┌───────────────────────┐   read (track)    ┌─────────────────────────┐
  │ ref  reactive         │ ────────────────► │ render effect           │
  │ computed              │                   │ template → VNode tree   │
  └───────────────────────┘                   └────────────┬────────────┘
        ▲            │                                     │ new tree
        │ write      │ trigger: queue the components       ▼
        │            │ that read it (once each,     ┌─────────────────────────┐
  event handler      │ flushed in a microtask)      │ patch: diff old and new │
  task.done = true   └────────────────────────────► │ guided by patch flags   │ ──► DOM
                                                    └─────────────────────────┘
```

**Reactive state.** `ref(value)` returns an object whose `.value` getter records a read and whose setter
reports a write. These are signals, as in [Chapter 15](15-reactivity-compared.md). `reactive(object)`
returns a Proxy around the object that does the same for every property, nested objects included (a `ref`
holding an object or array wraps it with `reactive` too). `computed(fn)` is a cached derived value that
recomputes only when something it read has changed.

**Effects.** An effect is a function that runs, records every reactive value it reads, and runs again when
one of them changes. You write effects with `watch` and `watchEffect`. Vue writes one for every component:
the component's render function. That's the step that makes Vue different from React. React re-runs a
component when its state setter is called and, by default, re-renders all its children too. Vue re-runs a
component's render only when something that render actually read has changed, and a child re-renders only
when its props changed or its own dependencies did.

**The renderer.** Rendering still produces a virtual DOM tree for that one component, which Vue diffs
against the previous one. The template compiler makes the diff cheap: it caches static parts and event
handlers, and tags each dynamic node with a *patch flag* that says what can change (only the text, only the
class, only certain props). So Vue tracks dependencies at the level of individual values, but updates the
DOM at the level of a component.

You can watch the Proxy at work without a browser. `effect()` is the low-level function that `computed`,
`watch` and component rendering are built on:

`examples/ch05/proxy.ts`

```ts
// What reactive() returns: a Proxy that records reads (track) and reports writes (trigger).
// Run: node proxy.ts
import { computed, effect, isProxy, reactive, ref, toRaw } from 'vue'

const task = { id: '1', title: 'Read the Vue chapter', done: false }
const state = reactive(task)

console.log('isProxy(state):', isProxy(state), '| toRaw(state) === task:', toRaw(state) === task)

// effect() is the low-level primitive behind computed, watch and component rendering.
effect(() => {
  console.log(`effect ran: ${state.title} is ${state.done ? 'done' : 'not done'}`)
})

state.done = true // tracked property: the effect re-runs
state.id = '42' // not read by the effect: nothing happens
task.done = false // the raw object bypasses the proxy: nothing happens

const tasks = ref([state])
const left = computed(() => tasks.value.filter((t) => !t.done).length)
console.log('left:', left.value)
tasks.value.push(reactive({ id: '2', title: 'Try Svelte runes', done: false }))
console.log('left after push:', left.value)
```

```console
$ cd examples/ch05
$ npm ci
$ node proxy.ts
isProxy(state): true | toRaw(state) === task: true
effect ran: Read the Vue chapter is not done
effect ran: Read the Vue chapter is done
left: 1
left after push: 2
```

Three lessons are in that output. Changing a property the effect read (`done`) re-runs it; changing one it
didn't read (`id`) does nothing. Writing to the raw object behind the Proxy goes unnoticed: reactivity lives
in the Proxy, not in the data. The raw write did change the data, though, which is why `left` starts at 1:
the effect never re-ran to print "not done", but the next read saw `done: false`. And `push` on a reactive
array is a tracked write, so `left` recomputes to 2.

The compiler's side is visible too. Here is Tasklet's `TaskItem` component compiled by
`@vue/compiler-sfc` (the script in `examples/ch05/vapor/compile.mjs`; blank lines trimmed):

```console
$ cd examples/ch05/vapor
$ node compile.mjs vdom
…
  setup(__props: any, { emit: $emit }) {
return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("li", {
    class: _normalizeClass(['task', { done: __props.task.done }])
  }, [
    _createElementVNode("label", null, [
      _createElementVNode("input", {
        type: "checkbox",
        checked: __props.task.done,
        onChange: _cache[0] || (_cache[0] = ($event: any) => ($emit('toggle')))
      }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_1),
      _cache[2] || (_cache[2] = _createTextVNode()),
      _createElementVNode("span", null, _toDisplayString(__props.task.title), 1 /* TEXT */)
    ]),
    _createElementVNode("button", {
      type: "button",
      class: "delete",
      "aria-label": `Delete "${__props.task.title}"`,
      onClick: _cache[1] || (_cache[1] = ($event: any) => ($emit('remove')))
    }, " × ", 8 /* PROPS */, _hoisted_2)
  ], 2 /* CLASS */))
}
}
```

The template became a render function that returns VNodes, and each dynamic node carries a flag: `1 /* TEXT */`
on the `<span>` means only its text can change, `2 /* CLASS */` on the `<li>` means only its class can, and
`_hoisted_1 = ["checked"]` lists the one prop worth comparing on the checkbox. The event handlers are
created once and cached in `_cache`. When `TaskItem` re-renders, the diff checks a handful of values
instead of every attribute.

## Code structure

### Scaffolding

The official starter is `create-vue`, run through `npm create vue@latest`. It asks questions
interactively unless you pass feature flags; Tasklet uses TypeScript and the "bare" option, which leaves
out the example components:

```console
$ cd tasklet
$ npm create vue@latest vue -- --ts --bare
npm warn exec The following package was not found and will be installed: create-vue@3.24.0

> npx
> 'create-vue' vue --ts --bare

┌  Vue.js - The Progressive JavaScript Framework

Scaffolding project in /home/tbangma/learn-web-frameworks/tasklet/vue...
│
└  Done. Now run:

   cd vue
   npm install
   npm run dev
```

The other flags add the official extras: `--router`, `--pinia`, `--vitest`, `--playwright`, `--cypress`,
`--eslint`, `--prettier`, `--oxfmt` and `--jsx`. `--default` creates a project with no extras, `--vue-rc`
uses the Vue 3.6 release candidate, and `--tsgo` swaps in the native TypeScript 7 compiler through a bridge
package. `npx create-vue@latest --help` lists them all.

The generated project:

```text
vue/
├── index.html            the page Vite serves; <div id="app"> + <script src="/src/main.ts">
├── package.json          vue, vite, @vitejs/plugin-vue, vue-tsc, vite-plugin-vue-devtools …
├── vite.config.ts        plugins: vue(), vueDevTools(); alias "@" → src/
├── env.d.ts              Vite's client types
├── tsconfig.json         references tsconfig.app.json (src) and tsconfig.node.json (config files)
├── public/favicon.ico
└── src/
    ├── main.ts           createApp(App).mount('#app')
    └── App.vue           the root component
```

The `.gitignore`, `README.md` and `.vscode/` files are left out above. A larger app adds
`src/components/` for components, `src/composables/` for reusable `useSomething()` functions,
`src/stores/` for Pinia stores and `src/router/` and `src/views/` for routing. Component files are named in
PascalCase (`TaskItem.vue`) and used in templates the same way (`<TaskItem />`).

### Anatomy of a single-file component

A `.vue` file has up to three top-level blocks: `<script>` for logic, `<template>` for markup and `<style>`
for CSS (add `scoped` to limit the styles to this component). `<script setup>` is the form you will use in
almost all new code: every top-level binding in it (variables, functions, imports, including imported
components) is available in the template, and macros such as `defineProps` and `defineEmits` declare the
component's interface. `lang="ts"` turns on TypeScript. `@vitejs/plugin-vue` compiles each file into a
JavaScript module at build time, as shown above.

Templates use a few kinds of syntax:

| Syntax | Meaning | In Tasklet |
| --- | --- | --- |
| `{{ expr }}` | text interpolation | `{{ countLabel(tasks) }}` |
| `:attr="expr"` (`v-bind`) | bind an attribute or prop to an expression | `:disabled="!anyDone"` |
| `@event="handler"` (`v-on`) | listen to a DOM or component event | `@click="clearDone"` |
| `.prevent`, `.stop`, `.enter` … | event modifiers | `@submit.prevent="submit"` |
| `v-if` / `v-else-if` / `v-else` | conditional rendering | loading, error, empty, list |
| `v-for="x in xs"` + `:key` | list rendering with keys | the task list |
| `v-model` | two-way binding on inputs and components | the input, the filter |
| `v-show` | toggle `display` without removing the element | not used |

Expressions inside templates are JavaScript evaluated against the component's bindings, and refs are
unwrapped automatically, so you write `filter`, not `filter.value`.

### Composition API and Options API

Vue 3 supports two ways to write a component's logic. The **Options API** describes a component as an
object with `data`, `computed`, `methods` and lifecycle options, and you reach everything through `this`.
The **Composition API** uses imported functions (`ref`, `computed`, `watch`, `onMounted`) inside
`setup()` or `<script setup>`. Here is Tasklet's form both ways. The Composition API version is the one in
the app:

`tasklet/vue/src/components/TaskForm.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ add: [title: string] }>()

const title = ref('')

function submit() {
  const trimmed = title.value.trim()
  if (trimmed === '') return
  emit('add', trimmed)
  title.value = ''
}
</script>

<template>
  <form aria-label="Add task" class="add" @submit.prevent="submit">
    <label for="new-task">New task</label>
    <input id="new-task" v-model="title" name="title" autocomplete="off" />
    <button type="submit">Add</button>
  </form>
</template>
```

`examples/ch05/options-api/TaskForm.vue`

```vue
<script lang="ts">
import { defineComponent } from 'vue'

// TaskForm with the Options API: the same behavior as src/components/TaskForm.vue.
export default defineComponent({
  emits: {
    add: (title: string) => title.length > 0,
  },
  data() {
    return { title: '' }
  },
  methods: {
    submit() {
      const trimmed = this.title.trim()
      if (trimmed === '') return
      this.$emit('add', trimmed)
      this.title = ''
    },
  },
})
</script>

<template>
  <form aria-label="Add task" class="add" @submit.prevent="submit">
    <label for="new-task">New task</label>
    <input id="new-task" v-model="title" name="title" autocomplete="off" />
    <button type="submit">Add</button>
  </form>
</template>
```

The template is identical. Swapped into `tasklet/vue`, the Options API version passes all 15 acceptance
tests. For a component this small, the difference is taste. It shows up as components grow: the Options
API groups code by *kind* (all data here, all methods there), so one feature is spread across several
options, while the Composition API lets you group code by *feature* and move it into a function, a
**composable**, that other components can call (Exercise 3 does this for Tasklet). The Composition API is
also easier to type, because there is no `this` to infer. The Vue docs are careful to say what it is not:

> **Composition API is NOT functional programming**. Composition API is based on Vue's mutable,
> fine-grained reactivity paradigm, whereas functional programming emphasizes immutability.
>
> — Vue documentation, "Composition API FAQ" (2026)

Both APIs are supported and share the same reactivity underneath. The Options API costs bundle size even
when you don't use it, which matters below.

## Building Tasklet in Vue

`tasklet/vue/` has the same seven source files as the other versions: `main.ts`, `App.vue`, three
components in `src/components/`, and `tasks.ts` and `storage.ts` copied unchanged from the React version.
`tasks.ts` holds the `Task` and `Filter` types and the pure helpers `isTaskList`, `visibleTasks` and
`countLabel`; `storage.ts` holds `loadSavedTasks`, `saveTasks` and `fetchTasks`. The template files the
app doesn't need (the favicon, README, `.gitignore`, `.vscode/`) were deleted; `tasklet.css` and
`tasks.json` come from `tasklet/shared/`.

### `package.json`

```json
{
  "name": "tasklet-vue",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 4303 --strictPort",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview --port 4303 --strictPort",
    "build-only": "vite build",
    "type-check": "vue-tsc --build"
  },
  "dependencies": {
    "vue": "3.5.44"
  },
  "devDependencies": {
    "@tsconfig/node24": "24.0.5",
    "@types/node": "24.19.2",
    "@vitejs/plugin-vue": "6.0.10",
    "@vue/tsconfig": "0.9.1",
    "npm-run-all2": "9.0.4",
    "typescript": "6.0.3",
    "vite": "8.3.5",
    "vite-plugin-vue-devtools": "8.2.1",
    "vue-tsc": "3.3.14"
  },
  "engines": {
    "node": "^22.18.0 || >=24.12.0"
  }
}
```

The scripts are the template's, with the port added. `build` uses `run-p` from `npm-run-all2` to run two
scripts in parallel: `vue-tsc --build`, which type-checks the TypeScript *and* the templates, and
`vite build`. If either fails, the build fails. Versions are pinned exactly.

One difference from the React version: `typescript` is 6.0.3, not 7.0. TypeScript 7 is the native compiler
written in Go, and `vue-tsc` is built on the JavaScript TypeScript API that TypeScript 6 still provides, so
`create-vue` pins `typescript ~6.0.0`. The `--tsgo` flag swaps in an experimental bridge package if you
want the faster checker.

### `main.ts`

```ts
import { createApp } from 'vue'
import App from './App.vue'
import './tasklet.css'

createApp(App).mount('#app')
```

`createApp` creates an application instance (where you would also install plugins with `.use(router)` or
`.use(pinia)`), and `mount` renders the root component into `<div id="app">`.

### `App.vue`

The root component owns the task list, the load state and the filter:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FilterBar from './components/FilterBar.vue'
import TaskForm from './components/TaskForm.vue'
import TaskItem from './components/TaskItem.vue'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

// null until the tasks are loaded, from localStorage (right away) or tasks.json.
const tasks = ref<Task[] | null>(loadSavedTasks())
const failed = ref(false)
const filter = ref<Filter>('all')

const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
const anyDone = computed(() => tasks.value?.some((task) => task.done) ?? false)

async function load() {
  failed.value = false
  try {
    tasks.value = await fetchTasks()
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  if (tasks.value === null) load()
})

// Save after every change: a new array, or a change inside it (deep).
watch(
  tasks,
  (current) => {
    if (current !== null) saveTasks(current)
  },
  { deep: true },
)

function add(title: string) {
  tasks.value?.push({ id: crypto.randomUUID(), title, done: false })
}

function toggle(task: Task) {
  task.done = !task.done
}

function remove(id: string) {
  tasks.value = tasks.value?.filter((task) => task.id !== id) ?? null
}

function clearDone() {
  tasks.value = tasks.value?.filter((task) => !task.done) ?? null
}
</script>

<template>
  <main class="tasklet">
    <h1>Tasklet</h1>
    <TaskForm @add="add" />
    <FilterBar v-model="filter" />
    <template v-if="failed">
      <p role="alert">Couldn't load tasks.</p>
      <button type="button" @click="load">Retry</button>
    </template>
    <p v-else-if="tasks === null" role="status">Loading tasks…</p>
    <p v-else-if="visible.length === 0" class="empty">Nothing to show.</p>
    <ul v-else class="tasks" aria-label="Tasks">
      <TaskItem
        v-for="task in visible"
        :key="task.id"
        :task="task"
        @toggle="toggle(task)"
        @remove="remove(task.id)"
      />
    </ul>
    <footer v-if="tasks !== null" class="footer">
      <p class="count" aria-live="polite">{{ countLabel(tasks) }}</p>
      <button type="button" class="clear" :disabled="!anyDone" @click="clearDone">Clear done</button>
    </footer>
  </main>
</template>
```

Here is how each Tasklet requirement maps to Vue:

- **Local state.** `tasks`, `failed` and `filter` are refs. `tasks` starts as whatever `loadSavedTasks()`
  returns: a saved array or `null`. A saved list therefore renders immediately, with no loading state and
  no fetch, as the spec requires.
- **Derived state.** `visible` and `anyDone` are `computed`. The count is computed inline in the template
  with `countLabel(tasks)`, which is also fine: the template is itself tracked, so it re-runs when a `done`
  flag changes. Use `computed` when you want caching or a name.
- **Async loading with an error state.** `load()` is an ordinary `async` function that sets refs as it
  goes. `onMounted` starts it once the component is in the page, and Retry calls the same function. Because
  a component's setup runs only once (not on every render, as in React), there is no effect dependency
  array and no risk of starting the fetch twice.
- **Mutation instead of copies.** `add` pushes onto the array and `toggle` flips `task.done` on the task
  object. Both are tracked writes: `tasks.value` is a reactive array, and the `task` that `v-for` hands to
  `@toggle` is the same reactive object. `remove` and `clearDone` assign a new filtered array instead,
  because that's the shortest way to write them. Vue is happy with either style.
- **Persistence.** `watch(tasks, …, { deep: true })` runs the callback after any change to the ref *or
  anything inside it*. Without `deep`, watching a ref only reacts to `tasks.value = …`, and the `push` and
  the toggle would never be saved. Exercise 2 shows the test that catches this.
- **Conditional rendering.** `v-if`, `v-else-if` and `v-else` must sit on adjacent siblings. The error
  state is two elements, so it uses `<template v-if>`, a wrapper that renders nothing itself.
- **Lists with keys.** `v-for="task in visible"` with `:key="task.id"` lets Vue move, insert and remove
  `<li>`s by identity, the job [Chapter 3](03-the-problem-frameworks-solve.md) did by hand.
- **Events from child to parent.** `@add`, `@toggle` and `@remove` listen to events the children declare
  with `defineEmits`. `@remove="remove(task.id)"` is an inline handler; Vue wraps it in a function for you.
- **Two-way binding.** `v-model="filter"` on `<FilterBar>` passes the value down and updates it when the
  child emits a change.

### `TaskForm.vue`

You have already seen the form. `defineEmits<{ add: [title: string] }>()` declares a typed `add` event:
`emit('add', 42)` is a type error, and so is listening for an event the component doesn't declare.
`v-model="title"` on the `<input>` is two-way binding: it sets the input's value from `title` and updates
`title` on every `input` event. `@submit.prevent` calls `event.preventDefault()` before `submit`, so the
browser doesn't reload the page. After a valid submit, `title.value = ''` clears the input through the
binding.

### `TaskItem.vue`

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

`defineProps<{ task: Task }>()` declares a typed prop. The compiler reads the TypeScript type and generates
the runtime prop declaration, and props are available in the template by name. In the script you would
write `const props = defineProps<…>()` and use `props.task`; since Vue 3.5 you can also destructure
(`const { task } = defineProps<…>()`) and the compiler keeps the destructured name reactive.

The component never changes the task itself. Props are read-only in Vue, as in React: a child that writes
to a prop gets a warning. Instead it emits `toggle` and `remove` and lets `App` decide. `$emit` is
available in the template without assigning `defineEmits` to a variable.

Two template details: `:class` accepts an array mixing strings and `{ className: condition }` objects, so
`done` appears only for finished tasks. And the `aria-label` must contain straight double quotes inside a
double-quoted attribute, so the template writes them as `&quot;`, which the template compiler decodes
before the expression runs. The checkbox uses `:checked` plus `@change` rather than `v-model`, because the
state belongs to the parent.

### `FilterBar.vue`

```vue
<script setup lang="ts">
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// v-model on <FilterBar>: a "modelValue" prop plus an "update:modelValue" event.
const filter = defineModel<Filter>({ required: true })
</script>

<template>
  <div role="group" aria-label="Filter" class="filters">
    <button
      v-for="{ value, label } in FILTERS"
      :key="value"
      type="button"
      :aria-pressed="value === filter"
      @click="filter = value"
    >
      {{ label }}
    </button>
  </div>
</template>
```

`defineModel` (stable since Vue 3.4) is the shortcut for components that support `v-model`. It declares a
`modelValue` prop and an `update:modelValue` event, and returns a ref: reading it gives the parent's value,
and assigning to it (`filter = value` in the click handler) emits the event, so the parent's `filter`
changes. The data still flows one way; the parent owns the value. `v-for` can destructure each item.
`:aria-pressed="value === filter"` binds a boolean; Vue renders `aria-*` attributes with boolean values as
the strings `"true"` and `"false"`, which is what the test expects.

### The manifest

`tasklet/vue/tasklet.json` registers the app with the acceptance test:

```json
{
  "name": "Vue",
  "port": 4303,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

No tests are skipped.

### Build it and run it

```console
$ cd tasklet/vue
$ npm ci
$ npm run build

> tasklet-vue@0.0.0 build
> run-p type-check "build-only {@}" --


> tasklet-vue@0.0.0 type-check
> vue-tsc --build


> tasklet-vue@0.0.0 build-only
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 20 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.39 kB │ gzip:  0.27 kB
dist/assets/index-BeKL5seo.css   2.38 kB │ gzip:  0.95 kB
dist/assets/index-Cx1SdNI3.js   69.56 kB │ gzip: 27.46 kB

✓ built in 152ms
$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-Cx1SdNI3.js     69.56 kB    27.14 kB
index.html                    0.40 kB     0.28 kB
total                        72.34 kB    28.37 kB
```

The whole build, type check included, takes about 1.4 seconds. 28.37 kB is about 40 percent of React's
70.14 kB for the same app, and the app's own code is 207 lines across the seven source files. Most of the
JavaScript is the Vue runtime, and part of that is the Options API, which Tasklet doesn't use. Vue exposes a
compile-time flag for exactly this case; adding it to `vite.config.ts` (the full file is
`examples/ch05/no-options-api/vite.config.ts`) removes that code:

```ts
  define: {
    __VUE_OPTIONS_API__: 'false',
  },
```

With the flag, the same app measures 67.63 kB raw and 26.66 kB gzipped, and still passes every test. Then
run the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs vue
=== Vue (tasklet/vue, port 4303) ===
…
$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 15 workers

  ✓   8 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (463ms)
  ✓   3 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (496ms)
  ✓  14 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks (456ms)
  …
  ✓  10 [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All (846ms)
  ✓   6 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (862ms)
  ✓   5 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.4s)

  15 passed (2.0s)

Summary
app     port  build  passed  failed  skipped  note
vue     4303  ok     15      0       0
```

All 15 pass. `npm run dev` starts the dev server at `http://localhost:4303/` with hot module replacement:
edit a component and only that component is swapped, with its state kept.

## Beyond Tasklet

### Watchers in more detail

Tasklet uses one `watch`. Vue has two kinds of watcher, and the difference matters:

- `watch(source, callback, options)` watches an explicit source (a ref, a getter, a reactive object or an
  array of those) and calls the callback with the new and old values. It is lazy by default (add
  `immediate: true` to run it at once), and `deep` controls how far it looks into objects (since Vue 3.5
  it can also be a number of levels). `once: true` stops after the first call.
- `watchEffect(fn)` runs `fn` at once and re-runs it whenever anything it read changes, like `effect()`
  above. It's shorter, but its dependencies are implicit.

Both run *before* the component updates by default; pass `flush: 'post'` (or use `watchPostEffect`) to see
the updated DOM. Several changes in one tick are batched into one run. Exercise 1 lets you predict the
exact sequence.

### Vue Router and Pinia

**Vue Router** is the official router. You map paths to components, render the current one with
`<RouterView />`, link with `<RouterLink to="/done">`, and read the current route with `useRoute()`.
Vue Router 5 (January 2026; 5.4.0 is current) merged the former `unplugin-vue-router` into the core, so
file-based routes (`src/pages/tasks/[id].vue` becoming `/tasks/:id`) with typed route names are built in.
Tasklet's filter could be a route (`/active`, `/done`); [Chapter 16](16-state-routing-and-data.md) compares
routers.

**Pinia** is the official store. A *setup store* is written with the same `ref`, `computed` and functions
you write in a component, wrapped in `defineStore`. Components call `useTasksStore()` and share one
instance, and the devtools show its state and a timeline of changes. Pinia 4 (July 2026; 4.1.0 is current)
is ESM-only and needs `@vue/devtools-api` 8 installed next to it. Exercise 4 moves Tasklet's list into a
Pinia store.

### Nuxt

**Nuxt** is Vue's meta-framework: file-based routing, server-side rendering, static generation, server
API routes on the Nitro server toolkit, data fetching with `useFetch`, and auto-imported components and
composables. Nuxt 4.6.3 is current, and 4.6 added support for Vapor mode.
[Chapter 18](18-meta-frameworks-and-rendering.md) covers Nuxt next to Next.js and SvelteKit. Vercel acquired
NuxtLabs, the company behind Nuxt, in 2025; Nuxt stays MIT-licensed.

### Devtools, testing and the language tools

`create-vue` adds `vite-plugin-vue-devtools`, which injects Vue DevTools into the page during development
(nothing in the production build). It shows the component tree with each component's props and state
(editable), a timeline of events, and panels for Pinia and the router. A browser extension does the same
for apps without the plugin. Version 9 of the plugin, in release candidates, moves the panel into Vite's
own DevTools.

For tests, `create-vue --vitest` adds Vitest with `@vue/test-utils` for component tests, and
`--playwright` or `--cypress` add end-to-end tests. Editor support comes from the Vue language tools
("Volar"): the VS Code extension and `vue-tsc` share the same engine, so templates are type-checked in the
editor and in the build.

Built-in components cover common needs: `<Transition>` and `<TransitionGroup>` for enter and leave
animations, `<KeepAlive>` to cache components that are switched out, `<Teleport>` to render a modal into
`<body>`, and `<Suspense>` (still experimental) for async setup. `provide` and `inject` pass values down
the tree without props, Vue's equivalent of React context.

### Vapor mode and Vue 3.6

Vue 3.6 brings two changes. Its `@vue/reactivity` package was rewritten on top of alien-signals, a fast
signals library, which makes reactivity faster and lighter on memory without changing the API. And it adds
**Vapor mode**: a second compiler output that generates direct DOM operations instead of a render function
that returns VNodes, the approach Svelte and Solid take. The status in November 2026: 3.6.0-alpha.1 shipped
in July 2025, beta.1 in December 2025, rc.1 on July 18, 2026, and 3.6.0-rc.14 (October 30, 2026) is on
npm's `rc` tag while 3.5.x patches continue on `latest`. There is no 3.6 announcement post yet; the release
notes in the changelog describe it:

> Vue 3.6 is now entering the RC phase as we have completed the intended feature set for Vapor Mode.
>
> — Vue team, "Vue 3.6.0-rc.1" release notes (2026)

Vapor is opt-in per component: add `vapor` to the script tag (`<script setup vapor lang="ts">`). An app
made only of Vapor components is created with `createVaporApp` and skips the virtual DOM renderer; Vapor
components inside a normal app need `vaporInteropPlugin`. The release notes list what Vapor does not
support: the Options API, `getCurrentInstance()`, `app.config.globalProperties`, `v-memo`, the
`@vue:xxx` element lifecycle events, and accessing properties of component template refs. They recommend
it for performance-sensitive parts of existing apps and for small new apps, and report performance in the
js-framework-benchmark on par with Solid and Svelte 5.

Compiled in Vapor mode, `TaskItem` becomes a cloned HTML template plus one effect that sets exactly the
four dynamic values:

```console
$ node compile.mjs vapor
…
const t0 = _template("<li><label><input type=checkbox> <span> </label><button type=button class=delete> × ", 1)
…
  const n3 = t0()
  let p0 = _child(n3)
  const n0 = _child(p0)
  const n1 = _nthChild(p0, 2)
  const n2 = _next(p0)
  _on(n0, "change", () => ($emit('toggle')))
  const x1 = _txt(n1)
  _on(n2, "click", () => ($emit('remove')))
  _renderEffect(() => {
    const _task = __props.task
    const _task_done = _task.done
    const _task_title = _task.title
    _setClass(n3, ['task', { done: _task_done }])
    _setProp(n0, "checked", _task_done)
    _setText(x1, _toDisplayString(_task_title))
    _setAttr(n2, "aria-label", `Delete "${_task_title}"`)
  })
  return n3
```

Compare that with the VNode version earlier: no tree is created or diffed on update; the effect writes to
the four nodes it needs. Exercise 5 builds all of Tasklet this way. On Tasklet it passes the acceptance
test and saves about 3 kB gzipped against Vue 3.6 without Vapor. The bundle still contains Vue's shared
runtime (the scheduler, watchers, lifecycle hooks and component instances) and the new Vapor runtime, so
the gain on a small app is modest; Vapor's main argument is update speed.

## Strengths and trade-offs

| Strengths | Trade-offs |
| --- | --- |
| Templates are close to HTML and readable by people who don't write JavaScript all day | Templates are a second language: directives, modifiers and their rules, checked by a separate tool (`vue-tsc`) |
| Fine-grained tracking: components re-render only when what they read changes, with no memoization to manage | Proxies have edges: destructuring a `reactive` object or writing to the raw object loses reactivity, and you must remember `.value` on refs in scripts |
| One coherent official stack (router, store, devtools, `create-vue`, Nuxt) released by the same team | A smaller job market and third-party ecosystem than React's; fewer component libraries and examples |
| Mutable state is natural to write and to read (`task.done = !task.done`) | Mutation makes "who changed this?" harder to answer than immutable updates; deep watchers can be costly on large data |
| Good TypeScript support with `<script setup>`, typed props, emits and models | TypeScript 7 support depends on the language tools; Tasklet stays on TypeScript 6 |
| Stable: Vue 3 has been compatible since 2020, and Vapor is opt-in per component | Two API styles and two compilation modes mean more choices to explain to a team; the Vue 2 to 3 migration was hard for many |
| Small runtime: 28 kB gzipped for Tasklet, 27 kB without the Options API | Without a large company, the project depends on sponsorship and a small core team |

## Compared with React

The two versions of Tasklet have the same components and almost the same templates. The differences are
in how state changes. Toggling a task in React creates a new array with a new task object:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

In Vue you change the object, and the Proxy reports it:

`tasklet/vue/src/App.vue` (excerpt)

```ts
function toggle(task: Task) {
  task.done = !task.done
}
```

Persistence shows the other side. React's effect re-runs whenever `tasks` is a new array, which every update
guarantees, because updates are immutable:

`tasklet/react/src/App.tsx` (excerpt)

```tsx
  useEffect(() => {
    if (tasks !== null) saveTasks(tasks)
  }, [tasks])
```

Vue's mutations keep the same array, so the watcher must look inside it with `deep: true`. And the filter
bar: React passes a value and a callback, Vue a single `v-model`:

`tasklet/react/src/components/FilterBar.tsx` (excerpt)

```tsx
        <button key={value} type="button" aria-pressed={value === filter} onClick={() => onChange(value)}>
```

`tasklet/vue/src/components/FilterBar.vue` (excerpt)

```vue
      :aria-pressed="value === filter"
      @click="filter = value"
```

Under the hood, React re-runs `App` and, by default, every `TaskItem` when one task changes, then diffs the
result; the React Compiler or `memo` can skip the unchanged items. Vue re-runs `App` (its count reads every
`done` flag) and the one `TaskItem` whose task changed, and skips the others because their props are the
same objects. [Appendix A](appendix-a-rosetta-stone.md) lines up these concepts across every framework in
the course.

## Summary

- Vue combines fine-grained reactivity with a virtual DOM per component. `ref`, `computed` and Proxy-based
  `reactive` objects record who reads them; a write queues the affected components, which re-render and
  patch the DOM using the compiler's patch flags.
- Single-file components hold `<script setup lang="ts">`, `<template>` and optional `<style scoped>`.
  Templates use `{{ }}`, `:attr`, `@event`, `v-if`, `v-for` with `:key`, and `v-model`.
- The Composition API (`ref`, `computed`, `watch`, `onMounted`) groups code by feature and moves it into
  composables; the Options API (`data`, `methods`, `this`) still works and passed the same tests.
- `defineProps`, `defineEmits` and `defineModel` declare a component's typed interface.
- `npm create vue@latest vue -- --ts --bare` scaffolds the app; `vue-tsc` type-checks templates in the
  build. Vue Tasklet is 207 lines, 28.37 kB gzipped and passes all 15 tests.
- Pinia, Vue Router 5, the Vue DevTools and Nuxt make up the official stack. Vue 3.6, in release candidates,
  rebuilds reactivity on alien-signals and adds opt-in Vapor mode, which compiles templates to direct DOM
  updates.

## Exercises

1. **Predict the output.** `examples/ch05/reactivity.ts` sets up a computed, a `watchEffect`, a plain
   `watch` and a deep `watch` on the same list, then changes the list three ways. Write down what you
   expect it to print before you run it.

   ```ts
   // Exercise 1: predict the output, then run it.
   // Run: node reactivity.ts
   import { computed, nextTick, ref, watch, watchEffect } from 'vue'

   const tasks = ref([
     { id: '1', title: 'Read the Vue chapter', done: false },
     { id: '2', title: 'Try Svelte runes', done: false },
   ])

   const left = computed(() => {
     console.log('  (computing left)')
     return tasks.value.filter((task) => !task.done).length
   })

   watchEffect(() => console.log(`watchEffect: ${left.value} left`))
   watch(tasks, () => console.log('watch: tasks changed'))
   watch(tasks, () => console.log('watch deep: tasks changed'), { deep: true })

   console.log('-- A: toggle both tasks')
   tasks.value[0]!.done = true
   tasks.value[1]!.done = true
   await nextTick()

   console.log('-- B: add a done task')
   tasks.value.push({ id: '3', title: 'Write a signal from scratch', done: true })
   await nextTick()

   console.log('-- C: replace the array')
   tasks.value = []
   await nextTick()
   ```

   <details><summary>Solution</summary>

   ```console
   $ node reactivity.ts
     (computing left)
   watchEffect: 2 left
   -- A: toggle both tasks
     (computing left)
   watchEffect: 0 left
   watch deep: tasks changed
   -- B: add a done task
   watch deep: tasks changed
     (computing left)
   -- C: replace the array
     (computing left)
   watch: tasks changed
   watch deep: tasks changed
   ```

   - `watchEffect` runs once immediately; `watch` doesn't.
   - **A.** Two writes, one run: watchers are queued and flushed after the current code, so
     `watchEffect` sees the final value (0) once. The plain `watch` stays silent, because `tasks.value` is
     still the same array; only the deep one sees changes inside it.
   - **B.** The push changes the array, so the deep watch fires and `left` recomputes, but its value is
     still 0. A computed that produces the same value doesn't notify its dependents, so `watchEffect`
     doesn't run.
   - **C.** Assigning `tasks.value` triggers both watches. `left` recomputes to 0 again, so `watchEffect`
     stays quiet once more.

   </details>

2. **Break the persistence.** In `tasklet/vue/src/App.vue`, remove `{ deep: true }` from the `watch`
   call. Which of the 15 tests do you expect to fail, and why? Run `APP=vue npx playwright test
   --workers=1` from `tasklet/e2e` to check, then put the option back.

   <details><summary>Solution</summary>

   One test fails:

   ```console
   $ APP=vue npx playwright test --workers=1
   …
     ✘  12 [chromium] › tests/tasklet.spec.ts:347:1 › saves the list to localStorage after every change (5.1s)
   …
       - Expected  - 5
       + Received  + 0
   …
       -   Object {
       -     "done": false,
       -     "id": StringMatching /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
       -     "title": "Learn Qwik",
       -   },
   …
     1 failed
       [chromium] › tests/tasklet.spec.ts:347:1 › saves the list to localStorage after every change ───
     14 passed (12.8s)
   ```

   Without `deep`, the watcher only reacts when `tasks.value` is replaced. `add` pushes onto the same array
   and `toggle` changes a task inside it, so neither is saved; the test adds "Learn Qwik" and waits for it
   in storage until it times out. Deleting and clearing reassign the array, so they still save.

   The reload test (`keeps changes after a reload`) still passes, which is the interesting part. It adds,
   toggles, then deletes before reloading, and the delete saves the whole current array, including the
   earlier unsaved changes. A bug like this can hide behind a later change. That's why the suite checks
   storage after every single change.

   </details>

3. **A composable.** Move the task list's state, loading, persistence and operations out of `App.vue` into
   a function `useTasks()` in `src/useTasks.ts`, so `App.vue` keeps only the filter and the template.

   <details><summary>Solution</summary>

   A composable is a plain function that calls Composition API functions. Called during a component's
   setup, its `onMounted` and `watch` attach to that component.

   `examples/ch05/use-tasks/useTasks.ts` (excerpt)

   ```ts
   export function useTasks() {
     const tasks = ref<Task[] | null>(loadSavedTasks())
     const failed = ref(false)
     const anyDone = computed(() => tasks.value?.some((task) => task.done) ?? false)
   ```

   The rest of the function is `App.vue`'s `load`, `onMounted` and `watch`, unchanged, followed by
   `return { tasks, failed, anyDone, load, add(title) { … }, toggle(task) { … }, … }` with the four
   operations.

   In `examples/ch05/use-tasks/App.vue`, the script shrinks to the imports and three lines; the template is
   unchanged:

   ```ts
   const { tasks, failed, anyDone, load, add, toggle, remove, clearDone } = useTasks()
   ```

   Destructuring is safe here because the composable returns refs, not a `reactive` object. With both files
   copied into `tasklet/vue/src/`, `node run-all.mjs vue` passes 15 of 15. Each component that calls
   `useTasks()` gets its *own* list; to share one list, use a store (next exercise).

   </details>

4. **A Pinia store.** Turn the list into a Pinia setup store, `useTasksStore`, and use it from `App.vue`.
   Keep the filter in the component. What does Pinia add to the bundle?

   <details><summary>Solution</summary>

   The solution is a full copy of the app in `examples/ch05/pinia/` (port 4326), with `pinia` 4.1.0 and
   `@vue/devtools-api` 8.2.1 added. The store is the composable from Exercise 3 inside `defineStore`:

   `examples/ch05/pinia/src/stores/tasks.ts` (excerpt)

   ```ts
   // Exercise 4: Tasklet's task list as a Pinia setup store.
   export const useTasksStore = defineStore('tasks', () => {
     // null until the tasks are loaded, from localStorage (right away) or tasks.json.
     const tasks = ref<Task[] | null>(loadSavedTasks())
   ```

   The body continues exactly like `useTasks()` without the `onMounted`, and ends with
   `return { tasks, failed, anyDone, load, add, toggle, remove, clearDone }`.

   `main.ts` installs Pinia:

   `examples/ch05/pinia/src/main.ts`

   ```ts
   import { createPinia } from 'pinia'
   import { createApp } from 'vue'
   import App from './App.vue'
   import './tasklet.css'

   createApp(App).use(createPinia()).mount('#app')
   ```

   `App.vue` calls `const store = useTasksStore()` and uses `store.tasks`, `store.add` and so on in the
   template; a store unwraps its refs, so there is no `.value`. Unlike the composable, every component
   that calls `useTasksStore()` gets the same instance. The `watch` lives in the store, so it runs once
   for the app, not once per component. The build passes the acceptance test (15 passed) and measures
   79.42 kB raw, 31.20 kB gzipped: Pinia costs about 2.8 kB here, in exchange for devtools integration,
   a shared instance and plugins (persistence, undo).

   </details>

5. **Vapor mode.** Build Tasklet with Vue 3.6 RC in Vapor mode: switch every component to
   `<script setup vapor lang="ts">`, mount with `createVaporApp`, and compare the bundle size and the
   compiled `TaskItem` with the regular build.

   <details><summary>Solution</summary>

   `examples/ch05/vapor/` is a copy of the app on port 4325. `package.json` pins `vue` to 3.6.0-rc.14 and,
   as `create-vue --vue-rc` does, adds `overrides` so every `@vue/*` package resolves to the same RC.
   Without them, npm refuses to install, because `@vue/tsconfig` declares an optional peer dependency on
   `vue@^3.4.0`, which a prerelease doesn't satisfy. The devtools plugin is left out. The entry point:

   `examples/ch05/vapor/src/main.ts`

   ```ts
   import { createVaporApp } from 'vue'
   import App from './App.vue'
   import './tasklet.css'

   createVaporApp(App).mount('#app')
   ```

   The four components are unchanged apart from the `vapor` attribute. The results:

   ```console
   $ npm run build
   …
   dist/assets/index-kP_nCvuK.js   66.17 kB │ gzip: 25.17 kB

   ✓ built in 160ms
   $ node ../../../tasklet/tools/size.mjs dist | tail -1
   total                        68.96 kB    26.13 kB
   $ npm run preview &
   $ cd ../../../tasklet/e2e
   $ APP=vue BASE_URL=http://localhost:4325/ TASKLET_WEBSERVER=0 npx playwright test
   …
     15 passed (1.9s)
   ```

   | Build | Raw | Gzip |
   | --- | --- | --- |
   | Vue 3.5.44 (Tasklet) | 72.34 kB | 28.37 kB |
   | Vue 3.6.0-rc.14, virtual DOM | 75.24 kB | 29.30 kB |
   | Vue 3.6.0-rc.14, Vapor | 68.96 kB | 26.13 kB |

   Vapor passes all 15 tests and saves 3.17 kB gzipped against 3.6 without it. The unminified bundle shows
   why the saving isn't larger: the VNode renderer and diff are gone, but the shared runtime (scheduler,
   watchers, lifecycle, component instances) and about 3,800 lines of the new Vapor runtime remain. The
   compiled output (`node compile.mjs vapor`, shown in "Beyond Tasklet") has no VNodes at all: a cloned
   template, four node references and one render effect.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-5--vue)
