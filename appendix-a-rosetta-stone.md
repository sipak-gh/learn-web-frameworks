# Appendix A — Rosetta Stone

This appendix shows the same idea written in all thirteen implementations of the course. Each section covers one concept (local state, a list with keys, a DOM ref and so on). It gives you one short snippet per framework, in the order the chapters introduce them. Use it when you know how to do something in one framework and want the equivalent in another. Use it also when you want to see how far apart two frameworks really are.

## How to read it

- Most snippets come straight from the Tasklet implementations. The line under each framework name gives the source file and line numbers, relative to `tasklet/`. Inside a snippet, `…` marks lines left out.
- The course apps are written in two code styles: Angular, Solid and Qwik use semicolons (Qwik also uses double quotes), and the others don't. Each snippet follows the style of its app.
- Tasklet doesn't need some concepts: DOM refs, a mount-and-cleanup pair, context, and scoped styles. For these the snippets come from one small test component, written once per framework and marked **not in Tasklet**. The component:
  - focuses its input when it mounts;
  - listens for the `/` key on `window` and removes that listener when it unmounts;
  - reads a filter value from context;
  - styles its label with a scoped `.label` rule.

  Each of these test components was type-checked and built with the same toolchain and versions as the matching Tasklet app. It was then run in Chromium to check four things: the input has focus after mount; the context value renders; the scoped rule doesn't leak outside the component; and no `keydown` listener is left behind after unmount.
- For htmx, most of the UI lives on the server, so its entry usually describes what the server does.
- Vanilla is the plain TypeScript version from [Chapter 3](03-the-problem-frameworks-solve.md). Read it as the baseline: it shows the work each framework takes off your hands.

The versions are the ones the course apps use:

| Framework | Version | Chapter |
|---|---|---|
| React | 19.3.1 | [Chapter 4](04-react.md) |
| Vue | 3.5.44 | [Chapter 5](05-vue.md) |
| Svelte | 5.57.3 | [Chapter 6](06-svelte.md) |
| Angular | 22.2.4 (zoneless) | [Chapter 7](07-angular.md) |
| Solid | 1.9.18 | [Chapter 8](08-solid.md) |
| Preact + Signals | 11.1.1 + @preact/signals 2.11.4 | [Chapter 9](09-preact.md) |
| Mithril | 2.3.8 | [Chapter 10](10-mithril-and-the-minimalists.md) |
| VanJS | vanjs-core 1.6.2 + vanjs-ext 0.6.4 | [Chapter 10](10-mithril-and-the-minimalists.md) |
| Qwik | 1.20.3 | [Chapter 11](11-qwik.md) |
| Lit | 3.3.3 + @lit/task 1.0.3 | [Chapter 12](12-lit-and-web-components.md) |
| Alpine.js | 3.17.5 | [Chapter 14](14-alpine.md) |
| htmx | 2.0.11 | [Chapter 13](13-htmx.md) |
| Vanilla TypeScript | (no library) | [Chapter 3](03-the-problem-frameworks-solve.md) |

## Quick index

| Section | The question it answers |
|---|---|
| [Local state](#local-state) | Where does a component keep a value that changes? |
| [Derived state](#derived-state) | How do you compute a value from other state? |
| [Side effects](#side-effects) | How do you run code when state changes? |
| [Props in](#props-in) | How does a parent pass data to a child? |
| [Events out](#events-out) | How does a child tell its parent something happened? |
| [Lists with keys](#lists-with-keys) | How do you render a list so items keep their identity? |
| [Conditional rendering](#conditional-rendering) | How do you show one thing or another? |
| [Two-way binding and form input](#two-way-binding-and-form-input) | How do you keep an input and a state in sync? |
| [DOM refs](#dom-refs) | How do you get hold of a real element? |
| [Mount and cleanup](#mount-and-cleanup) | How do you run code when a component appears and undo it when it goes? |
| [Context and shared state](#context-and-shared-state) | How do you share a value without passing it through every level? |
| [Scoped styles](#scoped-styles) | How do you keep a component's CSS from leaking? |
| [Async data](#async-data) | How do you load data, with loading and error states? |
| [Summary tables](#summary-tables) | All of the above, one idiom per cell |

## Local state

Local state is a value that a component owns and that updates the UI when it changes. In Tasklet that is the task list, the load status and the current filter.

**[React](04-react.md)** — `react/src/App.tsx`, lines 10–12

```tsx
const [tasks, setTasks] = useState<Task[] | null>(loadSavedTasks)
const [failed, setFailed] = useState(false)
const [filter, setFilter] = useState<Filter>('all')
```

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 10–12

```ts
const tasks = ref<Task[] | null>(loadSavedTasks())
const failed = ref(false)
const filter = ref<Filter>('all')
```

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 10–12

```ts
let tasks = $state<Task[] | null>(loadSavedTasks())
let failed = $state(false)
let filter = $state<Filter>('all')
```

**[Angular](07-angular.md)** — `angular/src/app/app.ts`, line 15, and `filter-bar/filter-bar.html`, line 6

```ts
protected readonly filter = signal<Filter>('all');
// read: filter()   write: filter.set('done') or filter.update(f => …)
```

**[Solid](08-solid.md)** — `solid/src/App.tsx`, line 10, and `solid/src/taskStore.ts`, line 10

```tsx
const [filter, setFilter] = createSignal<Filter>('all');
const [tasks, setTasks] = createStore<Task[]>(saved ?? []);
```

**[Preact](09-preact.md)** — `preact/src/model.ts`, lines 10–12, and `components/TaskForm.tsx`, line 9

```ts
const tasks = signal<Task[] | null>(loadSavedTasks())
const failed = signal(false)
const filter = signal<Filter>('all')
// inside a component: const title = useSignal('')
```

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/App.js`, lines 12–15

```js
export function App() {
  let tasks = loadSavedTasks() // null until loaded
  let failed = false
  let filter = 'all'
```

Plain variables in a closure component. Mithril redraws after every event handler it attached and after `m.request` settles, so assigning to a variable is enough.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 15–17

```js
const tasks = vanX.reactive(saved ?? []) // every task field becomes a state
const status = van.state(saved ? 'ready' : 'loading')
const filter = van.state('all')
```

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 32–33

```tsx
const state = useStore<AppState>({ status: "loading", tasks: [] });
const filter = useSignal<Filter>("all");
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, lines 20–21

```ts
@state() private tasks: Task[] | null = loadSavedTasks()
@state() private filter: Filter = 'all'
```

**[Alpine](14-alpine.md)** — `alpine/src/components.js`, lines 4–7, used by `alpine/index.html`, line 17

```js
export function taskForm() {
  return {
    title: '',
    …
```

```html
<form class="add" aria-label="Add task" x-data="taskForm" @submit.prevent="submit">
```

**[htmx](13-htmx.md)** — `htmx/src/tasks.ts`, line 48, and `htmx/src/views.ts`, line 62

The server owns the task list, in memory. The only client-side state is the current filter, kept in a hidden input that other requests include.

```ts
let tasks: Task[] = structuredClone(seed)
```

```html
<input type="hidden" id="current-filter" name="filter" value="${current}">
```

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 26–33

```ts
let state: State = { status: 'loading', tasks: [], filter: 'all' }

function setState(changes: Partial<State>) {
  const tasksChanged = changes.tasks !== undefined && changes.tasks !== state.tasks
  state = { ...state, ...changes }
  if (tasksChanged) saveTasks(state.tasks)
  render()
}
```

## Derived state

Derived state is computed from other state and never stored on its own. Tasklet derives the visible tasks from the list and the filter.

**[React](04-react.md)** — `react/src/App.tsx`, lines 14 and 68

```tsx
const loading = tasks === null && !failed
…
const visible = visibleTasks(tasks, filter)
```

A plain computation during render. Wrap it in `useMemo` only when it is expensive; the React Compiler ([Chapter 4](04-react.md#the-react-compiler)) can memoize it for you.

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 14–15

```ts
const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
const anyDone = computed(() => tasks.value?.some((task) => task.done) ?? false)
```

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 14–15

```ts
const visible = $derived(visibleTasks(tasks ?? [], filter))
const anyDone = $derived(tasks?.some((task) => task.done) ?? false)
```

**[Angular](07-angular.md)** — `angular/src/app/app.ts`, lines 17–19

```ts
protected readonly visible = computed(() =>
  visibleTasks(this.store.tasks() ?? [], this.filter()),
);
```

**[Solid](08-solid.md)** — `solid/src/App.tsx`, line 11

```tsx
const visible = createMemo(() => visibleTasks(store.tasks, filter()));
```

**[Preact](09-preact.md)** — `preact/src/model.ts`, lines 14–15

```ts
const status = computed<Status>(() => (failed.value ? 'error' : tasks.value === null ? 'loading' : 'ready'))
const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
```

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/App.js`, line 39

```js
const visible = visibleTasks(tasks, filter)
```

Computed again inside the view on every redraw, like React without memoization.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 19–21

```js
const visibleCount = van.derive(
  () => tasks.filter((task) => matchesFilter(task, filter.val)).length,
)
```

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 35–37

```tsx
const visible = useComputed$(() => visibleTasks(state.tasks, filter.value));
const count = useComputed$(() => countLabel(state.tasks));
const anyDone = useComputed$(() => state.tasks.some((task) => task.done));
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, line 60

```ts
const visible = visibleTasks(tasks, this.filter)
```

Computed in `render()`, which runs after any `@state` or `@property` changes.

**[Alpine](14-alpine.md)** — `alpine/src/store.js`, lines 14–16

```js
get visible() {
  return visibleTasks(this.tasks, this.filter)
},
```

Getters on a reactive object are re-read by every directive that uses them.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, lines 73–75

```ts
export function taskList(tasks: Task[], filter: Filter): Html {
  const visible = visibleTasks(tasks, filter)
  if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
```

The server computes it for every response.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 99–101

```ts
function render() {
  const { status, tasks, filter } = state
  const visible = visibleTasks(tasks, filter)
```

## Side effects

A side effect is code that reaches outside the UI when state changes. Tasklet's one effect saves the list to `localStorage` after every change.

**[React](04-react.md)** — `react/src/App.tsx`, lines 35–37

```tsx
useEffect(() => {
  if (tasks !== null) saveTasks(tasks)
}, [tasks])
```

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 31–37

```ts
watch(
  tasks,
  (current) => {
    if (current !== null) saveTasks(current)
  },
  { deep: true },
)
```

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 32–34

```ts
$effect(() => {
  if (tasks !== null) saveTasks(tasks)
})
```

**[Angular](07-angular.md)** — `angular/src/app/task-store.ts`, lines 26–29

```ts
effect(() => {
  const tasks = this.tasks();
  if (tasks) saveTasks(tasks);
});
```

**[Solid](08-solid.md)** — `solid/src/taskStore.ts`, lines 22–24

```tsx
createEffect(() => {
  if (ready()) saveTasks(tasks);
});
```

**[Preact](09-preact.md)** — `preact/src/model.ts`, lines 38–40

```ts
effect(() => {
  if (tasks.value !== null) saveTasks(tasks.value)
})
```

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/App.js`, lines 18–21

```js
function setTasks(next) {
  tasks = next
  saveTasks(tasks)
}
```

Mithril has no reactive effects. Every write goes through one function, and that function does the saving.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 24–27

```js
van.derive(() => {
  const list = vanX.compact(tasks) // reads every task, removes holes
  if (status.val === 'ready') saveTasks(list)
})
```

A `derive` whose result is ignored is an effect.

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 69–73

```tsx
useTask$(({ track }) => {
  const tasks = track(() => state.tasks);
  if (isServer || state.status !== "ready") return;
  saveTasks(tasks);
});
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, lines 39–41

```ts
protected updated(changed: PropertyValues) {
  if (changed.has('tasks') && this.tasks !== null) saveTasks(this.tasks)
}
```

**[Alpine](14-alpine.md)** — `alpine/src/main.js`, lines 14–17

```js
const store = Alpine.store('tasklet')
Alpine.effect(() => {
  if (store.ready) saveTasks(store.tasks)
})
```

**[htmx](13-htmx.md)** — `htmx/src/server.ts`, lines 68–74

```ts
for (const action of ACTIONS) {
  const match = request.method === action.method ? action.path.exec(url.pathname) : null
  if (!match) continue
  const params = await readParams(request, url)
  if (!action.run(params, decodeURIComponent(match[1] ?? ''))) break
  if (fromHtmx) {
    sendHtml(response, afterChange(allTasks(), parseFilter(params.get('filter'))))
```

There is nothing to save in the browser. The request itself changes the server's list. The response then carries the new HTML.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, line 31

```ts
if (tasksChanged) saveTasks(state.tasks)
```

Inside `setState`, as in Mithril: the effect runs because every write goes through one function.

## Props in

Props are values a parent passes down to a child, which the child reads but doesn't own. In Tasklet the parent passes each task to its task item.

**[React](04-react.md)** — `react/src/components/TaskItem.tsx`, lines 3–11; parent `App.tsx`, line 77

```tsx
interface TaskItemProps {
  task: Task
  onToggle: () => void
  onRemove: () => void
}

export function TaskItem({ task, onToggle, onRemove }: TaskItemProps) {
  return (
    <li className={task.done ? 'task done' : 'task'}>
…
// parent: <TaskItem key={task.id} task={task} … />
```

**[Vue](05-vue.md)** — `vue/src/components/TaskItem.vue`, lines 4 and 10; parent `App.vue`, line 71

```vue
<script setup lang="ts">
defineProps<{ task: Task }>()
</script>

<template>
  <li :class="['task', { done: task.done }]">
<!-- parent: <TaskItem … :task="task" /> -->
```

**[Svelte](06-svelte.md)** — `svelte/src/components/TaskItem.svelte`, lines 4–13; parent `App.svelte`, line 63

```svelte
<script lang="ts">
  interface Props {
    task: Task
    ontoggle: () => void
    onremove: () => void
  }

  let { task, ontoggle, onremove }: Props = $props()
</script>

<li class={['task', task.done && 'done']}>
<!-- parent: <TaskItem {task} … /> -->
```

**[Angular](07-angular.md)** — `angular/src/app/task-item/task-item.ts`, lines 8–11; parent `app.html`, line 19

```ts
  host: { class: 'task', '[class.done]': 'task().done' },
})
export class TaskItem {
  readonly task = input.required<Task>();
// parent: <li app-task-item [task]="task" …></li>
```

An input is a read-only signal: the child reads it as `task()`.

**[Solid](08-solid.md)** — `solid/src/components/TaskItem.tsx`, lines 9–11

```tsx
export function TaskItem(props: TaskItemProps) {
  return (
    <li class="task" classList={{ done: props.task.done }}>
```

Read props as `props.task`, and don't destructure them. In Solid, props are getters, so destructuring reads them once and loses reactivity ([Chapter 8](08-solid.md#props-are-getters)).

**[Preact](09-preact.md)** — `preact/src/components/TaskItem.tsx`, line 9, and `components/FilterBar.tsx`, lines 11 and 20

```tsx
export function TaskItem({ task, onToggle, onRemove }: TaskItemProps) {
…
// a signal as a prop: only the child that reads .value re-renders
filter: ReadonlySignal<Filter>
<button … aria-pressed={value === filter.value} …>
```

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/components/TaskItem.js`, lines 4–8

```js
export const TaskItem = {
  view: ({ attrs: { task, onToggle, onRemove } }) =>
    m(
      'li.task',
      { class: task.done ? 'done' : undefined },
```

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/components/TaskItem.js`, lines 7–9

```js
export function TaskItem({ task, hidden, onToggle, onRemove }) {
  return li(
    { class: () => (task.done ? 'task done' : 'task'), hidden },
```

A component is a plain function that runs once. To stay live, a prop has to be a state, a reactive object (as `task` is here) or a function.

**[Qwik](11-qwik.md)** — `qwik/src/components/task-item.tsx`, lines 4–13

```tsx
interface TaskItemProps {
  task: Task;
  onToggle$: QRL<() => void>;
  onRemove$: QRL<() => void>;
}

export const TaskItem = component$<TaskItemProps>(
  ({ task, onToggle$, onRemove$ }) => (
    <li class={task.done ? "task done" : "task"}>
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/components/task-item.ts`, line 10, and `filter-bar.ts`, line 15; parent `tasklet-app.ts`, lines 70 and 88

```ts
@property({ attribute: false }) task!: Task   // set as a property: .task=${task}
@property() filter: Filter = 'all'            // also settable as an attribute: filter=${this.filter}
```

**[Alpine](14-alpine.md)** — `alpine/index.html`, lines 41–42, and `alpine/src/components.js`, lines 33–37

```html
<template x-for="task in $store.tasklet.visible" :key="task.id">
  <li class="task" :class="{ done: task.done }" x-data="taskItem">
```

```js
export function taskItem() {
  return {
    get deleteLabel() {
      return `Delete "${this.task.title}"`
    },
```

There are no props. A nested `x-data` sees every variable of the scopes around it, here the loop variable `task`.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, lines 80–83

```ts
export function taskItem(task: Task): Html {
  const path = `/tasks/${encodeURIComponent(task.id)}`
  return html`
          <li class="${task.done ? 'task done' : 'task'}">
```

The server's view functions take arguments; the browser receives only the HTML.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/taskItem.ts`, lines 16 and 25–30

```ts
export function createTaskItem(task: Task, { onToggle, onRemove }: TaskItemHandlers): TaskItem {
…
  function update(next: Task) {
    element.classList.toggle('done', next.done)
    checkbox.checked = next.done
    title.textContent = next.title
    remove.ariaLabel = `Delete "${next.title}"`
  }
```

The child can't notice when its input changes, so the parent calls `update()` with the new task.

## Events out

Events go the other way: the child reports that something happened, and the parent decides what it means. In Tasklet the form reports a new, trimmed title.

**[React](04-react.md)** — `react/src/components/TaskForm.tsx`, lines 4 and 14; parent `App.tsx`, line 89

```tsx
onAdd: (title: string) => void
…
onAdd(trimmed)
// parent: <TaskForm onAdd={handleAdd} />
```

A callback prop.

**[Vue](05-vue.md)** — `vue/src/components/TaskForm.vue`, lines 4 and 11; parent `App.vue`, line 59

```ts
const emit = defineEmits<{ add: [title: string] }>()
…
emit('add', trimmed)
// parent: <TaskForm @add="add" />
```

**[Svelte](06-svelte.md)** — `svelte/src/components/TaskForm.svelte`, lines 2 and 10; parent `App.svelte`, line 51

```ts
let { onadd }: { onadd: (title: string) => void } = $props()
…
onadd(trimmed)
// parent: <TaskForm onadd={add} />
```

Svelte 5 replaced `createEventDispatcher` with callback props.

**[Angular](07-angular.md)** — `angular/src/app/task-form/task-form.ts`, lines 10 and 23; parent `app.html`, line 3

```ts
readonly add = output<string>();
…
this.add.emit(title);
// parent: <app-task-form (add)="store.add($event)" />
```

**[Solid](08-solid.md)** — `solid/src/components/TaskForm.tsx`, lines 4 and 14; parent `App.tsx`, line 16

```tsx
onAdd: (title: string) => void;
…
props.onAdd(trimmed);
// parent: <TaskForm onAdd={store.add} />
```

**[Preact](09-preact.md)** — `preact/src/components/TaskForm.tsx`, lines 5 and 15; parent `App.tsx`, line 16

```tsx
onAdd: (title: string) => void
…
onAdd(trimmed)
// parent: <TaskForm onAdd={model.add} />
```

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/components/TaskForm.js`, lines 9 and 18; parent `App.js`, lines 63–65

```js
view: ({ attrs: { onAdd } }) =>
…
onAdd(trimmed)
// parent:
m(TaskForm, {
  onAdd: (title) => setTasks([...(tasks ?? []), { id: crypto.randomUUID(), title, done: false }]),
}),
```

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/components/TaskForm.js`, lines 6 and 17; parent `App.js`, lines 62–64

```js
export function TaskForm({ onAdd }) {
…
onAdd(trimmed)
// parent:
TaskForm({
  onAdd: (title) => tasks.push({ id: crypto.randomUUID(), title, done: false }),
}),
```

**[Qwik](11-qwik.md)** — `qwik/src/components/task-form.tsx`, lines 4 and 21; parent `app.tsx`, lines 78–82

```tsx
onAdd$: QRL<(title: string) => void>;
…
await onAdd$(trimmed);
// parent:
<TaskForm
  onAdd$={(title) => {
    state.tasks = addTask(state.tasks, title);
  }}
/>
```

The `$` suffix tells the optimizer to turn the function into a lazy-loadable QRL. Calling a QRL returns a promise.

**[Lit](12-lit-and-web-components.md)** — `lit/src/components/task-form.ts`, line 18; parent `tasklet-app.ts`, line 86

```ts
this.dispatchEvent(new CustomEvent('task-add', { detail: trimmed }))
// parent:
html`<task-form @task-add=${(event: CustomEvent<string>) => this.addTask(event.detail)}></task-form>`
```

A real DOM event. Add `bubbles: true, composed: true` if a listener above a shadow root has to hear it. Here the parent listens on the element itself, so the event needs neither.

**[Alpine](14-alpine.md)** — `alpine/src/components.js`, lines 7–12

```js
submit() {
  const title = this.title.trim()
  if (title === '') return
  this.$store.tasklet.add(title)
  this.title = ''
},
```

Tasklet's components call the global store directly. To raise a DOM event instead, use the `$dispatch('name', detail)` helper and listen with `@name` on an ancestor.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, lines 49–51, and `htmx/src/server.ts`, lines 27–29

```html
<form aria-label="Add task" class="add" method="post" action="/tasks"
      hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
      hx-on::config-request="this.reset()">
```

```ts
run: (params) => {
  const title = (params.get('title') ?? '').trim()
  if (title !== '') addTask(title)
```

The "event" is an HTTP request. The server changes the list and answers with the HTML that replaces `#task-list`.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/taskForm.ts`, lines 4 and 18; parent `app.ts`, line 36

```ts
export function createTaskForm(onAdd: (title: string) => void): HTMLFormElement {
…
onAdd(title)
// parent:
const form = createTaskForm((title) => setState({ tasks: addTask(state.tasks, title) }))
```

## Lists with keys

A key tells the framework which item is which, so an item that moves keeps its DOM node, its focus and its checkbox state. Tasklet keys each task by its `id`.

**[React](04-react.md)** — `react/src/App.tsx`, lines 74–81

```tsx
{visible.map((task) => (
  <TaskItem
    key={task.id}
    task={task}
    onToggle={() => handleToggle(task.id)}
    onRemove={() => handleRemove(task.id)}
  />
))}
```

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 68–74

```vue
<TaskItem
  v-for="task in visible"
  :key="task.id"
  :task="task"
  @toggle="toggle(task)"
  @remove="remove(task.id)"
/>
```

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 62–64

```svelte
{#each visible as task (task.id)}
  <TaskItem {task} ontoggle={() => (task.done = !task.done)} onremove={() => remove(task.id)} />
{/each}
```

The key goes in parentheses after the item.

**[Angular](07-angular.md)** — `angular/src/app/app.html`, lines 16–23

```html
@for (task of visible(); track task.id) {
  <li
    app-task-item
    [task]="task"
    (toggle)="store.toggle(task.id)"
    (remove)="store.remove(task.id)"
  ></li>
}
```

`track` is required.

**[Solid](08-solid.md)** — `solid/src/App.tsx`, lines 33–41

```tsx
<For each={visible()}>
  {(task) => (
    <TaskItem
      task={task}
      onToggle={() => store.toggle(task.id)}
      onRemove={() => store.remove(task.id)}
    />
  )}
</For>
```

`<For>` keys by object identity, so there is no `key` prop. A store keeps a task's object identity when its fields change.

**[Preact](09-preact.md)** — `preact/src/App.tsx`, lines 31–35

```tsx
<For each={model.visible} getKey={(task) => task.id}>
  {(task) => (
    <TaskItem task={task} onToggle={() => model.toggle(task.id)} onRemove={() => model.remove(task.id)} />
  )}
</For>
```

`For` comes from `@preact/signals/utils`. A plain `.map()` with `key={task.id}`, as in React, works too.

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/App.js`, lines 44–51

```js
visible.map((task) =>
  m(TaskItem, {
    key: task.id,
    task,
    onToggle: () => setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))),
    onRemove: () => setTasks(tasks.filter((t) => t.id !== task.id)),
  }),
),
```

In one list, either every vnode has a key or none does.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 43–57

```js
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
```

`vanX.list` builds one element per entry of a reactive array and adds or removes elements as entries come and go. Entries are tracked by their own state, not by a key. Tasklet renders every task and hides the ones the filter excludes.

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 103–114

```tsx
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
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, lines 64–76

```ts
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
```

A plain `visible.map(...)` also works, but it reuses DOM by position. `repeat` with a key function moves DOM with its item.

**[Alpine](14-alpine.md)** — `alpine/index.html`, lines 41–49

```html
<template x-for="task in $store.tasklet.visible" :key="task.id">
  <li class="task" :class="{ done: task.done }" x-data="taskItem">
    …
  </li>
</template>
```

`x-for` must sit on a `<template>` with exactly one root element.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, line 76

```ts
return html`<ul class="tasks" aria-label="Tasks">${visible.map(taskItem)}
        </ul>`
```

The server renders the whole list, and htmx replaces the contents of `#task-list` with it. With `innerHTML` swapping there is no diff, so there are no keys. Instead, ids play that role for focus: after a swap, htmx puts focus back on the element whose `id` had it, which is why each checkbox has `id="toggle-<id>"`. For a real diff that keeps more element state, use the `idiomorph` extension ([Chapter 13](13-htmx.md)).

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 75–97 (abridged)

```ts
const items = new Map<string, TaskItem>()

function renderList(tasks: Task[]) {
  const keep = new Set<string>()
  tasks.forEach((task, index) => {
    let item = items.get(task.id)
    if (item) item.update(task)
    else { item = createTaskItem(task, itemHandlers); items.set(task.id, item) }
    keep.add(task.id)
    const current = list.children[index]
    if (current !== item.element) list.insertBefore(item.element, current ?? null)
  })
  // …then remove the items whose id is not in keep
}
```

This is the keyed reconciliation the frameworks above do for you.

## Conditional rendering

Conditional rendering shows one piece of UI or another depending on state. Tasklet picks one of four views: an error with Retry, "Loading tasks…", "Nothing to show." or the list.

**[React](04-react.md)** — `react/src/App.tsx`, lines 55–66 and 92

```tsx
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
} else { … }
…
{tasks !== null && (
  <footer className="footer">
```

Plain JavaScript: `if`, the ternary operator and `&&`.

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 61–67

```vue
<template v-if="failed">
  <p role="alert">Couldn't load tasks.</p>
  <button type="button" @click="load">Retry</button>
</template>
<p v-else-if="tasks === null" role="status">Loading tasks…</p>
<p v-else-if="visible.length === 0" class="empty">Nothing to show.</p>
<ul v-else class="tasks" aria-label="Tasks">
```

`v-show` toggles CSS `display` instead of adding and removing the element.

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 53–61

```svelte
{#if failed}
  <p role="alert">Couldn't load tasks.</p>
  <button type="button" onclick={load}>Retry</button>
{:else if tasks === null}
  <p role="status">Loading tasks…</p>
{:else if visible.length === 0}
  <p class="empty">Nothing to show.</p>
{:else}
  <ul class="tasks" aria-label="Tasks">
```

**[Angular](07-angular.md)** — `angular/src/app/app.html`, lines 6–14

```html
@if (store.loading()) {
  <p role="status">Loading tasks…</p>
} @else if (store.failed()) {
  <p role="alert">Couldn't load tasks.</p>
  <button type="button" (click)="store.retry()">Retry</button>
} @else if (store.tasks()) {
  @if (visible().length === 0) {
    <p class="empty">Nothing to show.</p>
  } @else {
```

**[Solid](08-solid.md)** — `solid/src/App.tsx`, lines 18–30 and 45

```tsx
<Switch>
  <Match when={store.failed()}>
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" onClick={store.retry}>
      Retry
    </button>
  </Match>
  <Match when={!store.ready()}>
    <p role="status">Loading tasks…</p>
  </Match>
  <Match when={visible().length === 0}>
    <p class="empty">Nothing to show.</p>
  </Match>
  …
</Switch>
<Show when={store.ready()}>
```

A component runs only once, so a bare `if` in its body would run only once too. Branch with `<Show>` and `<Switch>`/`<Match>`, which re-evaluate their `when` reactively. A ternary inside JSX also works, because the compiler wraps JSX expressions.

**[Preact](09-preact.md)** — `preact/src/App.tsx`, lines 18 and 29

```tsx
{status === 'loading' && <p role="status">Loading tasks…</p>}
…
<Show when={() => model.visible.value.length > 0} fallback={<p class="empty">Nothing to show.</p>}>
```

`&&` and ternaries, as in React. `Show` from `@preact/signals/utils` re-renders only its own subtree when its signal changes.

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/App.js`, lines 31–40

```js
if (failed) {
  return [
    m('p', { role: 'alert' }, "Couldn't load tasks."),
    m('button', { type: 'button', onclick: load }, 'Retry'),
  ]
}
if (tasks === null) return m('p', { role: 'status' }, 'Loading tasks…')

const visible = visibleTasks(tasks, filter)
if (visible.length === 0) return m('p.empty', 'Nothing to show.')
```

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 66–68

```js
p({ role: 'status', hidden: () => status.val !== 'loading' }, 'Loading tasks…'),
p({ role: 'alert', hidden: () => status.val !== 'error' }, "Couldn't load tasks."),
button({ type: 'button', hidden: () => status.val !== 'error', onclick: load }, 'Retry'),
```

Tasklet builds every element once and binds `hidden`. To add and remove elements instead, pass a function child: `() => cond.val ? p('Yes') : p('No')`, which VanJS rebuilds when its states change.

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 89–101

```tsx
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
```

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, lines 61 and 101–103

```ts
if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
…
${tasks === null
  ? nothing
  : html`
```

Use ternaries in the template; `nothing` renders nothing. Lit also has `when()` and `choose()` directives.

**[Alpine](14-alpine.md)** — `alpine/index.html`, lines 34–36 and 51–53

```html
<p role="status" x-show="$store.tasklet.status === 'loading'">Loading tasks…</p>
<p role="alert" x-show="$store.tasklet.status === 'error'" x-cloak>Couldn't load tasks.</p>
…
<template x-if="$store.tasklet.ready && $store.tasklet.visible.length === 0">
  <p class="empty">Nothing to show.</p>
</template>
```

`x-show` toggles `display`; `x-if` adds and removes its `<template>`'s one root element. `x-cloak` hides elements until Alpine has initialized them.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, line 75

```ts
if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
```

The server decides. There is no loading or error view, because the page arrives with its tasks already in it.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 105–109

```ts
loading.hidden = status !== 'loading'
error.hidden = retry.hidden = status !== 'error'
list.hidden = !ready || visible.length === 0
empty.hidden = !ready || visible.length > 0
footer.hidden = !ready
```

## Two-way binding and form input

Two-way binding keeps an input and a piece of state in sync in both directions. Tasklet uses it for the title field, and in some apps for the filter bar.

**[React](04-react.md)** — `react/src/components/TaskForm.tsx`, lines 25–26

```tsx
value={title}
onChange={(event) => setTitle(event.target.value)}
```

A controlled input. React has no two-way binding: you pass the value down and the change handler back up. React's `onChange` fires on every keystroke, like the DOM `input` event.

**[Vue](05-vue.md)** — `vue/src/components/TaskForm.vue`, line 19, and `components/FilterBar.vue`, line 11; parent `App.vue`, line 60

```vue
<input id="new-task" v-model="title" name="title" autocomplete="off" />
```

```ts
// v-model on a component: a "modelValue" prop plus an "update:modelValue" event
const filter = defineModel<Filter>({ required: true })
// parent: <FilterBar v-model="filter" />
```

**[Svelte](06-svelte.md)** — `svelte/src/components/TaskForm.svelte`, line 17, and `components/FilterBar.svelte`, line 11; parent `App.svelte`, line 52

```svelte
<input id="new-task" bind:value={title} name="title" autocomplete="off" />
```

```ts
let { filter = $bindable() }: { filter: Filter } = $props()
// parent: <FilterBar bind:filter />
```

**[Angular](07-angular.md)** — `angular/src/app/task-form/task-form.ts`, lines 17–27, `task-form.html`, lines 1–3, and `filter-bar/filter-bar.ts`, line 11

```ts
protected readonly titleField = form(this.title, {
  name: 'title',
  submission: {
    action: async () => { … },
  },
});
```

```html
<form aria-label="Add task" class="add" [formRoot]="titleField">
  <label for="new-task">New task</label>
  <input id="new-task" autocomplete="off" [formField]="titleField" />
```

```ts
readonly filter = model.required<Filter>();
// parent: <app-filter-bar [(filter)]="filter" />
```

Signal Forms (`@angular/forms/signals`) bind a field to a signal both ways. `[(x)]`, the "banana in a box", binds a `model()` input.

**[Solid](08-solid.md)** — `solid/src/components/TaskForm.tsx`, lines 25–26

```tsx
value={title()}
onInput={(event) => setTitle(event.currentTarget.value)}
```

One-way down and an event handler up, as in React. Use `onInput`, not `onChange`: Solid passes these to the DOM unchanged, and the DOM `change` event fires only when the field loses focus.

**[Preact](09-preact.md)** — `preact/src/components/TaskForm.tsx`, lines 27–28

```tsx
value={title}
onInput={(event) => (title.value = event.currentTarget.value)}
```

Passing the signal itself (`value={title}`, not `title.value`) binds it straight to the DOM property, so typing doesn't re-render `TaskForm`.

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/components/TaskForm.js`, lines 26–27

```js
value: title,
oninput: (event) => (title = event.target.value),
```

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/components/TaskForm.js`, lines 26–27

```js
value: title,
oninput: (event) => (title.val = event.target.value),
```

Passing a state as a property binds it one way. The `oninput` handler closes the loop.

**[Qwik](11-qwik.md)** — `qwik/src/components/task-form.tsx`, line 26

```tsx
<input id="new-task" name="title" autoComplete="off" bind:value={title} />
```

`bind:value` takes a signal and wires both directions.

**[Lit](12-lit-and-web-components.md)** — `lit/src/components/task-form.ts`, lines 30–31

```ts
.value=${this.draft}
@input=${(event: InputEvent) => (this.draft = (event.target as HTMLInputElement).value)}
```

The `.` prefix sets the DOM property, not the attribute; the property is what holds the current text.

**[Alpine](14-alpine.md)** — `alpine/index.html`, line 19

```html
<input id="new-task" name="title" autocomplete="off" x-model="title" />
```

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, lines 49–53

```html
<form aria-label="Add task" class="add" method="post" action="/tasks"
      hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
      hx-on::config-request="this.reset()">
  <label for="new-task">New task</label>
  <input id="new-task" name="title" autocomplete="off">
```

No binding. The browser keeps the field's value; htmx sends the form's fields as the request body. `hx-on::config-request` clears the form once htmx has read the values.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/taskForm.ts`, lines 14–19

```ts
form.addEventListener('submit', (event) => {
  event.preventDefault()
  const title = input.value.trim()
  if (title === '') return
  onAdd(title)
  input.value = ''
})
```

Read the DOM when you need the value; there is no state to keep in sync.

## DOM refs

A ref gives you the real element, for the things a template can't express: focusing an input, measuring a box or handing a node to a non-framework library. Tasklet never needs one. Apart from VanJS and vanilla, the snippets below are **not in Tasklet**: each comes from the small test component described in [How to read it](#how-to-read-it), which focuses its input.

**[React](04-react.md)** — not in Tasklet

```tsx
const input = useRef<HTMLInputElement>(null)
…
<input ref={input} id="q" />
// later: input.current?.focus()
```

In React 19, `ref` is an ordinary prop on function components; `forwardRef` is no longer needed.

**[Vue](05-vue.md)** — not in Tasklet

```vue
<script setup lang="ts">
const input = useTemplateRef<HTMLInputElement>('input')
// later: input.value?.focus()
</script>

<template>
  <input ref="input" id="q" />
</template>
```

**[Svelte](06-svelte.md)** — not in Tasklet

```svelte
<script lang="ts">
  let input: HTMLInputElement
  // later, in onMount: input.focus()
</script>

<input bind:this={input} id="q" />
```

**[Angular](07-angular.md)** — not in Tasklet

```ts
template: `<input #input id="q" />`,
…
private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
// later: this.input().nativeElement.focus();
```

**[Solid](08-solid.md)** — not in Tasklet

```tsx
let input!: HTMLInputElement;
…
<input ref={input} id="q" />
// later, in onMount: input.focus();
```

The compiler assigns the element to the variable when it creates it.

**[Preact](09-preact.md)** — not in Tasklet

```tsx
import { useRef } from 'preact/hooks'

const input = useRef<HTMLInputElement>(null)
…
<input ref={input} id="q" />
```

**[Mithril](10-mithril-and-the-minimalists.md)** — not in Tasklet

```js
m('input#q', { oncreate: ({ dom }) => { input = dom; dom.focus() } })
```

Every vnode lifecycle hook gets the vnode, and `vnode.dom` is its element.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/components/TaskForm.js`, line 22

```js
input({
  id: 'new-task',
  …
```

A tag function returns a real element, so the value you build the UI with is already the ref. Keep it in a variable: `const field = input({ id: 'q' })`, then `field.focus()`.

**[Qwik](11-qwik.md)** — not in Tasklet

```tsx
const input = useSignal<HTMLInputElement>();
…
<input ref={input} id="q" />
// later, in the browser only: input.value?.focus();
```

**[Lit](12-lit-and-web-components.md)** — not in Tasklet

```ts
@query('#q') input!: HTMLInputElement
…
render() {
  return html`<label class="label">Search ${this.filter} <input id="q" /></label>`
}
```

`@query` looks the element up in the render root. Lit also has a `ref()` directive for refs inside templates.

**[Alpine](14-alpine.md)** — not in Tasklet

```html
<label class="label" x-data x-init="$refs.q.focus()">
  … <input x-ref="q" id="q" />
</label>
```

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, line 50

```html
hx-include="#current-filter" hx-target="#task-list"
```

There are no refs. Attributes name other elements with CSS selectors (and extended ones such as `closest li` or `this`). Any script you add uses ordinary DOM queries.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/taskForm.ts`, lines 5 and 16

```ts
const input = el('input', { id: 'new-task', name: 'title', autocomplete: 'off' })
…
const title = input.value.trim()
```

You created the element, so you already hold it.

## Mount and cleanup

Some work has to start when a component appears in the page and be undone when it leaves, such as a timer, a subscription or a listener on `window`. Tasklet's components never unmount, so most snippets here are **not in Tasklet**. Each one focuses the input on mount, adds a `keydown` listener to `window`, and removes that listener on unmount. Every one was checked in Chromium: no listener was left behind.

**[React](04-react.md)** — not in Tasklet

```tsx
useEffect(() => {
  input.current?.focus()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === '/') input.current?.focus()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

An effect with an empty dependency array runs after the first commit. The function it returns is the cleanup. In development, Strict Mode mounts, unmounts and mounts again to check that the cleanup is right.

**[Vue](05-vue.md)** — not in Tasklet; Tasklet uses `onMounted` in `vue/src/App.vue`, lines 26–28

```ts
function onKey(event: KeyboardEvent) {
  if (event.key === '/') input.value?.focus()
}
onMounted(() => {
  input.value?.focus()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
```

**[Svelte](06-svelte.md)** — not in Tasklet; Tasklet uses `onMount` in `svelte/src/App.svelte`, lines 26–28

```ts
onMount(() => {
  input.focus()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === '/') input.focus()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
})
```

The function `onMount` returns runs on unmount. `$effect` can return a cleanup too. For listeners on `window`, the `<svelte:window onkeydown={…} />` element adds and removes them for you.

**[Angular](07-angular.md)** — not in Tasklet

```ts
constructor() {
  const onKey = (event: KeyboardEvent) => {
    if (event.key === '/') this.input().nativeElement.focus();
  };
  afterNextRender(() => {
    this.input().nativeElement.focus();
    window.addEventListener('keydown', onKey);
  });
  inject(DestroyRef).onDestroy(() => window.removeEventListener('keydown', onKey));
}
```

`afterNextRender` runs only in the browser, after the DOM exists. The class hooks `ngOnInit` and `ngOnDestroy` still work.

**[Solid](08-solid.md)** — not in Tasklet

```tsx
const onKey = (event: KeyboardEvent) => {
  if (event.key === '/') input.focus();
};

onMount(() => {
  input.focus();
  window.addEventListener('keydown', onKey);
});
onCleanup(() => window.removeEventListener('keydown', onKey));
```

`onCleanup` registers with the current owner: the component, or an effect or memo if called inside one ([Chapter 8](08-solid.md#ownership-and-cleanup)).

**[Preact](09-preact.md)** — not in Tasklet; the cleanup pattern appears in `preact/src/model.ts`, lines 21–35

```tsx
import { useEffect } from 'preact/hooks'

useEffect(() => {
  input.current?.focus()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === '/') input.current?.focus()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

The same as React. A signals `effect()` can also return a cleanup, which runs before the next run and on dispose.

**[Mithril](10-mithril-and-the-minimalists.md)** — not in Tasklet; Tasklet uses `oninit` in `mithril/src/App.js`, lines 56–58

```js
function SearchBox() {
  let input
  const onKey = (event) => {
    if (event.key === '/') input.focus()
  }
  return {
    oncreate: () => window.addEventListener('keydown', onKey),
    onremove: () => window.removeEventListener('keydown', onKey),
    view: ({ attrs }) =>
      m('label.label', 'Search ', attrs.filter, ' ',
        m('input#q', { oncreate: ({ dom }) => { input = dom; dom.focus() } })),
  }
}
```

The hooks are `oninit`, `oncreate`, `onbeforeupdate`, `onupdate`, `onbeforeremove` and `onremove`. They work on components and on plain element vnodes.

**[VanJS](10-mithril-and-the-minimalists.md)** — not in Tasklet

```js
const field = input({ id: 'q' })
const box = label({ class: 'label' }, 'Search ', filter, ' ', field)
const onKey = (event) => {
  if (event.key === '/') field.focus()
}
const hide = () => {
  box.remove()
  window.removeEventListener('keydown', onKey)
}

van.add(document.getElementById('app'), button({ id: 'toggle', onclick: hide }, 'Hide'), box)
field.focus()
window.addEventListener('keydown', onKey)
```

VanJS has no lifecycle hooks. You know when you add an element, because you add it yourself; undo the work where you remove it. Bindings to elements that left the DOM are garbage-collected.

**[Qwik](11-qwik.md)** — not in Tasklet; Tasklet's start-up task is in `qwik/src/components/app.tsx`, lines 54–65

```tsx
useVisibleTask$(({ cleanup }) => {
  input.value?.focus();
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "/") input.value?.focus();
  };
  window.addEventListener("keydown", onKey);
  cleanup(() => window.removeEventListener("keydown", onKey));
});
```

`useVisibleTask$` runs only in the browser, by default when the component becomes visible, and it makes Qwik download that code eagerly. That is why its lint rule warns about it. For a global listener alone, `useOn$`, `useOnWindow$` and `useOnDocument$` are lazier.

**[Lit](12-lit-and-web-components.md)** — not in Tasklet; Tasklet uses `connectedCallback` in `lit/src/tasklet-app.ts`, lines 33–36

```ts
private onKey = (event: KeyboardEvent) => {
  if (event.key === '/') this.input.focus()
}

connectedCallback() {
  super.connectedCallback()
  window.addEventListener('keydown', this.onKey)
}

disconnectedCallback() {
  super.disconnectedCallback()
  window.removeEventListener('keydown', this.onKey)
}

firstUpdated() {
  this.input.focus()
}
```

The standard custom element callbacks, plus Lit's `firstUpdated` and `updated`, which run after a render. An element can connect and disconnect more than once, so set things up in `connectedCallback`, not in the constructor.

**[Alpine](14-alpine.md)** — not in Tasklet; Tasklet uses `x-init` in `alpine/index.html`, line 14

```html
<template x-if="shown">
  <label class="label" x-data x-init="$refs.q.focus()"
         @keydown.window="$event.key === '/' && $refs.q.focus()">
    Search <span x-text="filter"></span> <input x-ref="q" id="q" />
  </label>
</template>
```

`x-init` runs when Alpine initializes the element. A listener added with `.window` is removed when the element leaves, here when `x-if` turns false. For other cleanup, give the `x-data` object a `destroy()` method.

**[htmx](13-htmx.md)** — not in Tasklet; not run

```js
htmx.onLoad((content) => {
  content.querySelector('#q')?.focus()
})
document.body.addEventListener('htmx:beforeCleanupElement', (event) => {
  // undo whatever was set up for event.detail.elt
})
```

htmx calls the `onLoad` callback with each piece of content it swaps in. It also calls it once for the body at start-up, if the callback was registered by then. Before it removes an element, it fires `htmx:beforeCleanupElement` on it. Both exist in htmx 2.0.11. This snippet was not run.

**[Vanilla](03-the-problem-frameworks-solve.md)** — not in Tasklet

```ts
const controller = new AbortController()
window.addEventListener(
  'keydown',
  (event) => {
    if (event.key === '/') input.focus()
  },
  { signal: controller.signal },
)
hide.addEventListener('click', () => {
  controller.abort()
  host.remove()
})
```

There is no lifecycle, so you make one. An `AbortController` removes every listener registered with its signal in one call.

## Context and shared state

Context makes a value available to every component below a provider, without passing it as a prop through each level. Dependency injection and global stores solve the same problem. Most snippets are **not in Tasklet**, which has a single owner of its state; Angular, Preact and Alpine use their shared-state tools in Tasklet itself.

**[React](04-react.md)** — not in Tasklet

```tsx
const FilterContext = createContext<Filter>('all')

// provider
<FilterContext value="done">
  …
</FilterContext>

// consumer
const filter = use(FilterContext)
```

React 19 renders a context object directly as its provider; `<FilterContext.Provider>` still works. `use(Context)` can be called conditionally; `useContext` can't.

**[Vue](05-vue.md)** — not in Tasklet

```ts
// keys.ts
export const filterKey: InjectionKey<Ref<Filter>> = Symbol('filter')

// provider (App.vue)
const filter = ref<Filter>('done')
provide(filterKey, filter)

// consumer (SearchBox.vue)
const filter = inject(filterKey)
```

Provide the ref itself, not its `.value`, so consumers stay reactive. For app-wide stores, Pinia is the official choice ([Chapter 16](16-state-routing-and-data.md)).

**[Svelte](06-svelte.md)** — not in Tasklet

```ts
// context.ts
export const [getFilter, setFilter] = createContext<() => Filter>()

// provider (App.svelte)
let filter = $state<Filter>('done')
setFilter(() => filter)

// consumer (SearchBox.svelte)
const filter = getFilter()   // read it as filter()
```

`createContext` returns a typed pair; the older `setContext(key, value)` and `getContext(key)` still work. Pass a getter (or a `$state` object), not the bare value, to keep the context reactive. A module-level `$state` object in a `.svelte.ts` file is shared state with no provider at all.

**[Angular](07-angular.md)** — `angular/src/app/task-store.ts`, lines 6–7, and `app.ts`, line 14

```ts
@Service()
export class TaskStore {
…
protected readonly store = inject(TaskStore);
```

`@Service()` is shorthand for `@Injectable({ providedIn: 'root' })`: one app-wide instance, created the first time something injects it. `inject()` asks the injector for that instance. To give a component subtree its own instance, list the class in that component's `providers`.

**[Solid](08-solid.md)** — not in Tasklet

```tsx
const FilterContext = createContext<Accessor<Filter>>(() => 'all' as const);

// provider
const [filter] = createSignal<Filter>('done');
<FilterContext.Provider value={filter}>
  …
</FilterContext.Provider>

// consumer
const filter = useContext(FilterContext);   // read it as filter()
```

Pass the accessor, not its value. A signal or store created at module level is shared state too, but only in the browser; on a server it would be shared between requests.

**[Preact](09-preact.md)** — not in Tasklet; Tasklet shares one model through `useModel` in `preact/src/App.tsx`, line 9

```tsx
const FilterContext = createContext<Signal<Filter>>(signal('all'))

// provider
const filter = useSignal<Filter>('done')
<FilterContext.Provider value={filter}>
  …
</FilterContext.Provider>

// consumer
const filter = useContext(FilterContext)   // {filter} in JSX renders the signal's text directly
```

Passing a signal through context means the provider never re-renders when the value changes.

**[Mithril](10-mithril-and-the-minimalists.md)** — not in Tasklet

```js
m(SearchBox, { filter: 'done' })
```

There is no context. Pass attrs, or import a module-level object: every redraw reads its current value.

**[VanJS](10-mithril-and-the-minimalists.md)** — not in Tasklet

```js
const filter = van.state('done')
label({ class: 'label' }, 'Search ', filter, ' ', field)
```

There is no context. A state is a plain object: export it from a module or pass it as an argument, and every binding that reads it stays live.

**[Qwik](11-qwik.md)** — not in Tasklet

```tsx
export const FilterContext = createContextId<Signal<Filter>>("filter");

// provider
const filter = useSignal<Filter>("done");
useContextProvider(FilterContext, filter);

// consumer
const filter = useContext(FilterContext);
```

Use a context, not a module-level variable, for state. The context is serialized with the page; a module-level variable on the server is shared by every request.

**[Lit](12-lit-and-web-components.md)** — not in Tasklet; needs `@lit/context` (version 1.1.6 was checked)

```ts
export const filterContext = createContext<Filter>(Symbol('filter'))

// provider element
@provide({ context: filterContext }) filter: Filter = 'done'

// consumer element
@consume({ context: filterContext, subscribe: true }) @state() filter: Filter = 'all'
```

`@lit/context` implements the community Context Protocol with DOM events. Any element that follows the protocol can take part, whatever library it is written with. `subscribe: true` re-delivers the value when the provider changes it.

**[Alpine](14-alpine.md)** — `alpine/src/main.js`, line 7; `alpine/src/components.js`, line 24; `alpine/index.html`, line 56

```js
Alpine.store('tasklet', tasklet)
…
return this.$store.tasklet.filter === value
```

```html
<p class="count" aria-live="polite" x-text="$store.tasklet.countLabel"></p>
```

A global, reactive store. Scope also flows down: a nested `x-data` can read every variable of the `x-data` around it.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, lines 62 and 85

```html
<input type="hidden" id="current-filter" name="filter" value="${current}">
…
hx-post="${path}/toggle" hx-trigger="change" hx-include="#current-filter"
```

The server is the shared state. The little that the page itself must remember goes in the DOM, and `hx-include` adds it to requests. `hx-vals` and `hx-headers` are inherited by descendants, which is the closest htmx comes to context.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 36–41

```ts
const form = createTaskForm((title) => setState({ tasks: addTask(state.tasks, title) }))
const filterBar = createFilterBar((filter) => setState({ filter }))
const itemHandlers = {
  onToggle: (id: string) => setState({ tasks: toggleTask(state.tasks, id) }),
  onRemove: (id: string) => setState({ tasks: removeTask(state.tasks, id) }),
}
```

Closures and arguments. Anything deeper calls for a module-level object or an event bus that you write yourself.

## Scoped styles

Scoped styles apply only to one component's markup, so two components can both use `.label` without clashing. Tasklet doesn't need them, because every app loads the same global `tasklet.css`. Lit is the one exception: it adopts that sheet into its shadow root. The snippets are therefore **not in Tasklet**. Each was checked in Chromium: a `.label` paragraph outside the component kept the default color.

**[React](04-react.md)** — not in Tasklet

```tsx
// SearchBox.module.css:  .label { color: rgb(255 0 0); }
import styles from './SearchBox.module.css'

<label className={styles.label}>
```

React has no styling system of its own. Vite compiles any `*.module.css` file as a CSS Module: each class name gets a unique hash, and the import maps the original names to the hashed ones.

**[Vue](05-vue.md)** — not in Tasklet

```vue
<template>
  <label class="label">Search {{ filter }} <input ref="input" id="q" /></label>
</template>

<style scoped>
.label {
  color: rgb(255 0 0);
}
</style>
```

`scoped` adds a `data-v-…` attribute to the component's elements and to its selectors. `:deep()` reaches into child components.

**[Svelte](06-svelte.md)** — not in Tasklet

```svelte
<label class="label">Search {filter()} <input bind:this={input} id="q" /></label>

<style>
  .label {
    color: rgb(255 0 0);
  }
</style>
```

Scoped by default: the compiler adds a `svelte-…` class to matching elements. `:global(...)` opts out.

**[Angular](07-angular.md)** — not in Tasklet

```ts
@Component({
  selector: 'app-search-box',
  template: `<label class="label">Search {{ filter() }} <input #input id="q" /></label>`,
  styles: `
    .label {
      color: rgb(255 0 0);
    }
  `,
})
```

Scoped by default through emulated encapsulation (generated `_ngcontent-…` attributes). Set `encapsulation: ViewEncapsulation.ShadowDom` for a real shadow root, or `None` for global styles.

**[Solid](08-solid.md)** — not in Tasklet

```tsx
import styles from './SearchBox.module.css';

<label class={styles.label}>
```

CSS Modules through Vite, as with React.

**[Preact](09-preact.md)** — not in Tasklet

```tsx
import styles from './SearchBox.module.css'

<label class={styles.label}>
```

CSS Modules through Vite.

**[Mithril](10-mithril-and-the-minimalists.md)**, **[VanJS](10-mithril-and-the-minimalists.md)** and **[Alpine](14-alpine.md)** have nothing built in. In a Vite build, CSS Modules work in Mithril and VanJS as they do in React. You can also use a naming convention such as BEM, or the CSS `@scope` rule in browsers that support it.

**[Qwik](11-qwik.md)** — not in Tasklet

```tsx
useStylesScoped$(`
  .label {
    color: rgb(255 0 0);
  }
`);
```

Inside `component$`. The styles are scoped with a generated class and loaded only when the component renders. `useStyles$` is the unscoped version.

**[Lit](12-lit-and-web-components.md)** — not in Tasklet; Tasklet's `lit/src/tasklet-app.ts`, line 17, adopts a shared sheet with ``static styles = [taskletSheet, css`…`]``

```ts
static styles = css`
  .label {
    color: rgb(255 0 0);
  }
`
```

The styles go into the element's shadow root, which the page's CSS can't reach into and which these styles can't leave. A constructable `CSSStyleSheet` works too, as `lit/src/styles.ts` shows.

**[htmx](13-htmx.md)** — `htmx/src/views.ts`, line 24

```html
<link rel="stylesheet" href="/tasklet.css">
```

htmx has no components and so no scoping. The server sends ordinary stylesheets; scope with naming conventions or `@scope`.

**[Vanilla](03-the-problem-frameworks-solve.md)** — not in Tasklet

```ts
const host = el('div')
const shadow = host.attachShadow({ mode: 'open' })
const sheet = new CSSStyleSheet()
sheet.replaceSync('.label { color: rgb(255 0 0); }')
shadow.adoptedStyleSheets = [sheet]
shadow.append(box)
```

The platform's own scoping: a shadow root and an adopted stylesheet ([Chapter 12](12-lit-and-web-components.md#shadow-dom-or-not)).

## Async data

Tasklet loads its seed tasks from `./tasks.json` when nothing is saved. It shows "Loading tasks…" while the request is pending, and an error with a Retry button if the request fails. Every client-rendered app except Angular has a `fetchTasks()` in its `storage` module. It rejects on a non-2xx status or a malformed list. The snippets show how each app turns that promise into UI state.

**[React](04-react.md)** — `react/src/App.tsx`, lines 18–32, Retry on line 60

```tsx
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
// Retry: onClick={() => setFailed(false)} makes loading true again, so the effect runs again
```

The `ignore` flag drops a response that arrives after cleanup. React 19's `use(promise)` with `<Suspense>` is the other route; it needs a promise that is cached outside the component.

**[Vue](05-vue.md)** — `vue/src/App.vue`, lines 17–28

```ts
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
```

**[Svelte](06-svelte.md)** — `svelte/src/App.svelte`, lines 17–28

```ts
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
```

Svelte also has `{#await promise}…{:then value}…{:catch error}…{/await}` blocks for rendering a promise directly.

**[Angular](07-angular.md)** — `angular/src/app/task-store.ts`, lines 12–14, 21–22 and 32–34

```ts
private readonly seed = httpResource(() => (this.saved ? undefined : './tasks.json'), {
  parse: parseTaskList,
});
…
readonly loading = this.seed.isLoading;
readonly failed = computed(() => this.seed.status() === 'error');
…
retry(): void {
  this.seed.reload();
}
```

A resource is a signal-based request: it exposes `value()`, `status()`, `isLoading()` and `error()`. It refetches when the URL function's signals change; returning `undefined` keeps it idle.

**[Solid](08-solid.md)** — `solid/src/taskStore.ts`, lines 14–17 and 29–31

```tsx
const [seed, { refetch }] = createResource(saved === null, async () => {
  setTasks(await fetchTasks());
  return true;
});
…
loading: () => seed.loading,
failed: () => seed.state === 'errored',
retry: () => refetch(),
```

A falsy source (here `saved === null` being `false`) keeps the resource from fetching. Reading a resource inside `<Suspense>` shows the fallback while it loads.

**[Preact](09-preact.md)** — `preact/src/model.ts`, lines 21–35, Retry on lines 67–69

```ts
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
…
retry() {
  failed.value = false
},
```

The same shape as React's, but as a signal effect, outside any component.

**[Mithril](10-mithril-and-the-minimalists.md)** — `mithril/src/storage.js`, lines 22–27, and `mithril/src/App.js`, lines 23–28

```js
export function fetchTasks() {
  return m.request({ url: './tasks.json' }).then((data) => {
    if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
    return data
  })
}
…
function load() {
  failed = false
  fetchTasks().then(setTasks, () => {
    failed = true
  })
}
```

`m.request` parses JSON, rejects on HTTP errors and redraws when it settles. With plain `fetch`, call `m.redraw()` yourself.

**[VanJS](10-mithril-and-the-minimalists.md)** — `vanjs/src/App.js`, lines 29–39

```js
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
```

**[Qwik](11-qwik.md)** — `qwik/src/components/app.tsx`, lines 41–49 and 54–65

```tsx
const load = $(async () => {
  state.status = "loading";
  try {
    state.tasks = await fetchTasks();
    state.status = "ready";
  } catch {
    state.status = "error";
  }
});

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
```

Tasklet loads in the browser because its data depends on `localStorage`. For data the server can fetch, `useResource$` with `<Resource>` is the usual tool, and Qwik City's `routeLoader$` loads it on the server ([Chapter 11](11-qwik.md#useresource-and-async-state)).

**[Lit](12-lit-and-web-components.md)** — `lit/src/tasklet-app.ts`, lines 25–31 and 93–100

```ts
private loader = new AsyncTask(this, {
  task: () => fetchTasks(),
  autoRun: false,
  onComplete: (tasks) => {
    this.tasks = tasks
  },
})
…
this.loader.render({
  initial: () => html`<p role="status">Loading tasks…</p>`,
  pending: () => html`<p role="status">Loading tasks…</p>`,
  error: () => html`
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" @click=${() => this.loader.run()}>Retry</button>
  `,
})
```

`Task` from `@lit/task` is a reactive controller; Tasklet imports it as `AsyncTask` to avoid a clash with its own `Task` type. With `args`, it reruns when they change.

**[Alpine](14-alpine.md)** — `alpine/src/store.js`, lines 33–41, called from `alpine/index.html`, lines 14 and 36

```js
async load() {
  this.status = 'loading'
  try {
    this.tasks = await fetchTasks()
    this.status = 'ready'
  } catch {
    this.status = 'error'
  }
},
```

```html
<main class="tasklet" x-data x-init="$store.tasklet.start()">
…
<button type="button" x-show="$store.tasklet.status === 'error'" x-cloak @click="$store.tasklet.load()">
```

**[htmx](13-htmx.md)** — `htmx/src/tasks.ts`, lines 39–45, and `htmx/src/views.ts`, lines 64–65

```ts
function loadSeed(): Task[] {
  const data: unknown = JSON.parse(readFileSync(new URL('../public/tasks.json', import.meta.url), 'utf8'))
  if (!isTaskList(data)) throw new Error('public/tasks.json is not a task list')
  return data
}

const seed = loadSeed()
```

```html
<button type="button" id="filter-${value}" aria-pressed="${value === current}"
  hx-get="/?filter=${value}" hx-target="#task-list" hx-swap="innerHTML">${label}</button>
```

The server reads the seed once at start-up and renders it into the first page, so the browser never fetches JSON. Every later request returns HTML. To load part of a page after the page itself, use `hx-get` with `hx-trigger="load"` and put a placeholder inside the target.

**[Vanilla](03-the-problem-frameworks-solve.md)** — `vanilla/src/app.ts`, lines 115–129

```ts
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
```

## Summary tables

One idiom per cell. "Server" means the htmx server does the work and the browser receives HTML.

| | Local state | Derived state | Side effect | Props in | Events out | List keys | Conditional |
|---|---|---|---|---|---|---|---|
| [React](04-react.md) | `useState` | compute in render | `useEffect` | function arguments | callback prop | `key={id}` | `&&`, `? :` |
| [Vue](05-vue.md) | `ref`, `reactive` | `computed` | `watch`, `watchEffect` | `defineProps` | `defineEmits`, `emit` | `v-for` + `:key` | `v-if`, `v-show` |
| [Svelte](06-svelte.md) | `$state` | `$derived` | `$effect` | `$props()` | callback prop | `{#each … (id)}` | `{#if}` |
| [Angular](07-angular.md) | `signal()` | `computed()` | `effect()` | `input()` | `output()`, `emit` | `@for … track` | `@if` |
| [Solid](08-solid.md) | `createSignal`, `createStore` | `createMemo` | `createEffect` | `props.x`, not destructured | callback prop | `<For>`, by reference | `<Show>`, `<Switch>` |
| [Preact](09-preact.md) | `signal`, `useSignal` | `computed` | `effect` | function arguments, signal props | callback prop | `<For getKey>` or `key` | `&&`, `<Show>` |
| [Mithril](10-mithril-and-the-minimalists.md) | closure variables | compute in `view` | call it in the write path | `vnode.attrs` | callback attr | `key` attr | `if`, `&&` |
| [VanJS](10-mithril-and-the-minimalists.md) | `van.state`, `vanX.reactive` | `van.derive` | `van.derive`, result unused | function arguments | callback argument | `vanX.list` | `hidden: () => …`, function child |
| [Qwik](11-qwik.md) | `useSignal`, `useStore` | `useComputed$` | `useTask$` + `track` | `component$` props | QRL prop `onX$` | `key={id}` | `&&`, `? :` |
| [Lit](12-lit-and-web-components.md) | `@state()` | compute in `render()` | `updated()` | `@property()` | `CustomEvent` | `repeat()` | `? :`, `nothing` |
| [Alpine](14-alpine.md) | `x-data` | getter | `Alpine.effect`, `$watch` | inherited scope | `$store` call or `$dispatch` | `x-for` + `:key` | `x-show`, `x-if` |
| [htmx](13-htmx.md) | server memory, hidden input | server | server, per request | server view arguments | HTTP request | none: whole swap | server |
| [Vanilla](03-the-problem-frameworks-solve.md) | variable + `setState` | compute in `render` | inside `setState` | function arguments + `update()` | callback argument | `Map` by id | `hidden` |

| | Two-way binding | DOM ref | Mount and cleanup | Shared state | Scoped styles | Async data |
|---|---|---|---|---|---|---|
| [React](04-react.md) | `value` + `onChange` | `useRef` | `useEffect` returning cleanup | `createContext` + `use` | CSS Modules (Vite) | `useEffect` + ignore flag, or `use()` |
| [Vue](05-vue.md) | `v-model`, `defineModel` | `useTemplateRef` | `onMounted`, `onUnmounted` | `provide`, `inject` | `<style scoped>` | `async` function + `onMounted` |
| [Svelte](06-svelte.md) | `bind:value`, `$bindable` | `bind:this` | `onMount` returning cleanup | `createContext` | `<style>`, scoped by default | `onMount`, `{#await}` |
| [Angular](07-angular.md) | `[formField]`, `model()` | `viewChild()` | `afterNextRender`, `DestroyRef` | `@Service()` + `inject()` | `styles`, emulated | `httpResource` |
| [Solid](08-solid.md) | `value` + `onInput` | `ref={el}` | `onMount`, `onCleanup` | `createContext` + `useContext` | CSS Modules (Vite) | `createResource` |
| [Preact](09-preact.md) | signal `value` + `onInput` | `useRef` | `useEffect` returning cleanup | `createContext` + `useContext` | CSS Modules (Vite) | signal `effect` + ignore flag |
| [Mithril](10-mithril-and-the-minimalists.md) | `value` + `oninput` | `vnode.dom` | `oncreate`, `onremove` | attrs or module state | none built in | `m.request` |
| [VanJS](10-mithril-and-the-minimalists.md) | state `value` + `oninput` | the element itself | none: do it by hand | module state | none built in | `async` function |
| [Qwik](11-qwik.md) | `bind:value` | `useSignal` + `ref` | `useVisibleTask$` + `cleanup` | `createContextId` + `useContext` | `useStylesScoped$` | `$()` + `useVisibleTask$`, `useResource$` |
| [Lit](12-lit-and-web-components.md) | `.value` + `@input` | `@query` | `connectedCallback`, `disconnectedCallback` | `@lit/context` | `static styles` in shadow DOM | `@lit/task` |
| [Alpine](14-alpine.md) | `x-model` | `x-ref`, `$refs` | `x-init`, `destroy()` | `Alpine.store` | none built in | `async` method |
| [htmx](13-htmx.md) | plain form fields | CSS selectors | `htmx.onLoad`, `htmx:beforeCleanupElement` | server + `hx-include` | none built in | server-rendered, `hx-trigger="load"` |
| [Vanilla](03-the-problem-frameworks-solve.md) | read `input.value` | the element itself | `AbortController` | closures | shadow root + adopted sheet | `async` function + `setState` |
