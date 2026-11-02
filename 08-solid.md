# Chapter 8 — Solid

Solid looks like React. Components are functions, templates are JSX, state comes from a function whose name
starts with `create` instead of `use`. Then you put a `console.log` in a component and find that it prints
once, when the component is created, and never again, no matter how often the state changes. That is the
whole idea. A Solid component is a setup function: it runs once to build real DOM nodes and to connect each
dynamic spot in them to the signals it reads. After that, a change to a signal updates exactly the text
node, attribute or list row that depends on it. There is no virtual DOM and no re-render. This chapter
builds Tasklet with Solid 1.9, the stable line, and looks at the 2.0 release candidate that came out in
August 2026.

## At a glance

| | |
| --- | --- |
| First released | 0.0.1 on npm in April 2018; 1.0 on June 28, 2021 |
| Current version | 1.9.18 (October 29, 2026). Solid 2.0 is in release candidate (2.0.0-rc.0 on August 12, 2026; rc.20 on October 29) |
| Created by / maintained by | Ryan Carniato; maintained by a small core team and community contributors, funded by donations through Open Collective |
| License | MIT |
| Rendering model | Compiled: JSX becomes cloned HTML templates plus one small effect per dynamic expression. Components run once; there is no virtual DOM and no re-render |
| Reactivity model | Fine-grained signals (`createSignal`, `createMemo`, `createEffect`), with proxy-based stores (`createStore`) for nested data. In 1.x a write takes effect immediately; 2.0 batches writes until the next microtask |
| Templates | JSX or TSX, compiled by `babel-preset-solid` (the dom-expressions compiler); control flow uses components such as `<Show>` and `<For>` |
| Language | JavaScript or TypeScript (Tasklet type-checks with TypeScript 7.0) |
| Tasklet build size | 10.37 kB gzip (26.44 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | SolidStart 2 for Solid 1.9 ([Chapter 18](18-meta-frameworks-and-rendering.md)); in Solid 2.0, the "start mode" of `@solidjs/vite-plugin` replaces it |
| Good fit for | Interactive UIs where update cost and bundle size matter, embedded widgets, and developers who like JSX but not re-rendering |

## Why it exists

By 2016 React had made "UI is a function of state" the default way to think about interfaces, and the
virtual DOM was how the function stayed fast enough: re-run the components, diff the result, patch the
difference. Ryan Carniato had been using Knockout, one of the libraries
[Chapter 2](02-a-short-history.md) describes, whose *observables* updated exactly the DOM nodes that
depended on them, without re-running anything. He wanted both: React's components and JSX, Knockout's
precise updates, and none of the diffing in between. He started Solid around 2016 (the copyright line in its
license begins that year), published it to npm in 2018, and spent the next years measuring it in the
js-framework-benchmark, where it placed close to hand-written vanilla JavaScript. The README states the
design in two sentences:

> Solid is a declarative JavaScript library for creating user interfaces. Instead of using a Virtual DOM, it
> compiles its templates to real DOM nodes and updates them with fine-grained reactions.
>
> — Solid README

Solid 1.0 shipped in June 2021. It never became as widely used as React or Vue, but its influence went much
further than its download count. Carniato wrote and streamed about fine-grained reactivity for years, and
the word "signal" came back into frontend vocabulary largely through Solid. Preact, Angular, Qwik, Svelte 5
and Vue's Vapor mode all moved toward signals afterwards ([Chapter 2](02-a-short-history.md) tells that
story), and [Chapter 15](15-reactivity-compared.md) builds a signals library from scratch.

## The mental model

```text
  React                                    Solid

  state changes                            signal changes
       │                                        │
       ▼                                        ▼
  re-run App(), TaskItem(), …              run the effects that read it
       │                                        │
       ▼                                        ▼
  diff old and new virtual DOM             each effect writes one DOM node
       │                                   (a text node, a class, one <li>)
       ▼
  patch the changed nodes
```

### Signals, memos and effects

A **signal** is a value with a getter and a setter. Reading `count()` inside a tracking scope records a
dependency; calling `setCount(1)` notifies everything that recorded one. A **memo** (`createMemo`) is a
derived value that caches its result and notifies only when the result changes. An **effect**
(`createEffect`) runs a side effect after rendering and re-runs when what it read changes. Dependencies are
tracked automatically at run time, so there are no dependency arrays. Signals, memos and effects form a
*reactive graph*: signals at the sources, effects at the leaves, memos in between. Solid's compiled
templates are made of effects too, created for their dynamic expressions.

### Components run once

The consequence that surprises React developers is spelled out in the docs:

> What this means is that a Solid component is only run once, when it is first rendered into the DOM.
>
> — Solid docs, "Components: Basics"

A component is a function that creates DOM and sets up reactive bindings, then returns. It is not a render
function. So there is no stale-closure problem and there are no rules of hooks: you can create signals in
`if` blocks, loops or helper functions. The price is that anything reactive must stay *inside* an
expression the template or an effect re-evaluates. `const doubled = count() * 2` in a component body
computes once and never updates; `const doubled = () => count() * 2` is a derived signal that works
anywhere. An early `return` based on a signal in a component body also runs only once; conditional UI uses
the `<Show>` component instead.

### What the compiler produces

Solid's JSX is compiled by `babel-preset-solid`, the preset `vite-plugin-solid` runs. To see the output,
`examples/ch08/compile/compile.mjs` compiles a few small components with babel-preset-solid 1.9.16. Here is
a counter, `examples/ch08/compile/Counter.jsx`:

```jsx
import { createSignal } from 'solid-js';

export function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" class="counter" onClick={() => setCount(count() + 1)}>
      Clicked {count()} times
    </button>
  );
}
```

and what the compiler turns it into, `examples/ch08/compile/out/Counter.js`:

```js
import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<button type=button class=counter>Clicked <!> times`);
import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$4 = _el$2.nextSibling,
      _el$3 = _el$4.nextSibling;
    _el$.$$click = () => setCount(count() + 1);
    _$insert(_el$, count, _el$4);
    return _el$;
  })();
}
_$delegateEvents(["click"]);
```

The static HTML becomes a template string. `_$template` parses it once into a `<template>` element, and
each call to `_tmpl$()` clones it, which is the fastest way to create many DOM nodes. The `<!>` is a
comment placeholder that marks where the dynamic text goes. The compiler walks to it with `firstChild` and
`nextSibling` and calls `_$insert(_el$, count, _el$4)`: insert whatever `count` returns before the
placeholder, and keep it up to date. Since `{count()}` is a plain call, the compiler passes the getter
itself; `insert` wraps it in an effect. That effect is the only thing that ever runs again. The click
handler is stored on the element as `$$click`, and `_$delegateEvents(["click"])` installs one listener on
the document that dispatches to it, so a thousand rows don't need a thousand listeners.

### Props are getters

Props carry reactivity from parent to child, which raises a question: if `Counter` runs once, how does a
child see a new prop value? Look at `examples/ch08/compile/Greeting.jsx`, written two ways:

```jsx
export function Greeting(props) {
  return <p class="greeting">Hello, {props.name}!</p>;
}

export function DestructuredGreeting({ name }) {
  return <p class="greeting">Hello, {name}!</p>;
}
```

and a parent that passes it a signal, `examples/ch08/compile/Parent.jsx`:

```jsx
import { createSignal } from 'solid-js';
import { Greeting } from './Greeting.jsx';

export function Parent() {
  const [user, setUser] = createSignal('Ada');
  return <Greeting name={user()} />;
}
```

The parent compiles to this (`examples/ch08/compile/out/Parent.js`):

```js
import { createComponent as _$createComponent } from "solid-js/web";
import { createSignal } from 'solid-js';
import { Greeting } from './Greeting.jsx';
export function Parent() {
  const [user, setUser] = createSignal('Ada');
  return _$createComponent(Greeting, {
    get name() {
      return user();
    }
  });
}
```

The props object has a **getter**: `props.name` calls `user()` each time it is read. Now the two greetings
(`examples/ch08/compile/out/Greeting.js`):

```js
import { template as _$template } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<p class=greeting>Hello, <!>!`);
export function Greeting(props) {
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$4 = _el$2.nextSibling,
      _el$3 = _el$4.nextSibling;
    _$insert(_el$, () => props.name, _el$4);
    return _el$;
  })();
}
export function DestructuredGreeting({
  name
}) {
  return (() => {
    var _el$5 = _tmpl$(),
      _el$6 = _el$5.firstChild,
      _el$8 = _el$6.nextSibling,
      _el$7 = _el$8.nextSibling;
    _$insert(_el$5, name, _el$8);
    return _el$5;
  })();
}
```

In `Greeting`, the compiler wraps the read in a function, `() => props.name`, so the effect calls the
getter, which calls `user()`, and the text updates when `user` changes. In `DestructuredGreeting`, the
parameter list `{ name }` reads `props.name` once, when the component runs, and `insert` receives a plain
string. It renders "Ada" forever. Hence the rule in the docs:

> With Solid, destructuring props is not recommended as it can break reactivity.
>
> — Solid docs, "Components: Props"

When you need defaults or want to forward a subset of props, `mergeProps` and `splitProps` do it without
reading the values. Exercise 1 destructures a prop in Tasklet and shows exactly which tests fail.

### Ownership and cleanup

Every effect and memo is created under an **owner**, the reactive scope that was running when it was
created. A component's computations belong to the component, and `<Show>` or `<For>` create a child owner
for each piece of UI they render. When an owner is disposed (a `<Show>` turns false, a `<For>` row is
removed), everything it owns is disposed with it and `onCleanup` callbacks run. `createRoot` makes an owner
by hand. `examples/ch08/reactivity/ownership.mjs` uses one outside any component:

```js
import { createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js';

const [count, setCount] = createSignal(0);

// createRoot creates an owner. Everything created inside belongs to it.
const dispose = createRoot((dispose) => {
  const double = createMemo(() => count() * 2);
  createEffect(() => {
    console.log(`effect: count=${count()} double=${double()}`);
    onCleanup(() => console.log('  cleanup'));
  });
  return dispose;
});

console.log('setCount(1)');
setCount(1);
console.log('dispose()');
dispose();
console.log('setCount(2)');
setCount(2);
console.log('done');
```

```console
$ npm run -s ownership
effect: count=0 double=0
setCount(1)
  cleanup
effect: count=1 double=2
dispose()
  cleanup
setCount(2)
done
```

The effect runs once right away, since outside of rendering there is nothing to wait for. `setCount(1)`
runs the cleanup from the previous run, then the effect again, which reads the updated memo. After
`dispose()` the effect is gone: `setCount(2)` prints nothing. In an app you rarely call `createRoot`
yourself, since `render` creates the root, but ownership is why Solid needs no `useEffect` return value
or unmount hooks to avoid leaks. (The script runs with `node --conditions=browser`, because Solid's default
server build doesn't run effects.)

## Code structure

### Scaffolding

Solid's official scaffolding tool is `create-solid`, which the docs' quick start runs with
`npm create solid`. Version 0.12.0 offers four project kinds: "Solid 2.0 (RC)", "SolidStart (Solid 1.x)",
"SolidJS + Vite (Solid 1.x)" and "Library". Tasklet needs the plain one, which is the `--vanilla` flag:

```console
$ cd tasklet
$ npm create solid@0.12.0 -- --project-name solid --vanilla --template basic --ts

> npx
> 'create-solid' --project-name solid --vanilla --template basic --ts

┌  
 Create-Solid v0.12.0
│
◇  Project created 🎉
│
◇  To get started, run: ─╮
│                        │
│  cd solid              │
│  npm install           │
│  npm run dev           │
│                        │
├────────────────────────╯
```

(The spinner frames are removed from the output.) `npm create vite@latest solid -- --template solid-ts`
creates a similar project from Vite's own templates; Tasklet uses create-solid because it is the one Solid's
docs recommend. The template is small: `index.html`, `src/index.tsx`, `src/App.tsx`, a sample `Comp.tsx`,
`vite.config.ts`, `tsconfig.json`, a README and a pnpm lockfile. It ships `^` ranges (`solid-js ^1.9.5`,
`vite ^7.1.4`, `typescript ^5.7.2`) and the `solid-devtools` plugin. Tasklet's version pins exact current
versions, moves to Vite 8 and TypeScript 7, removes `solid-devtools` and the lockfile for pnpm, and sets the
ports. The finished app:

```text
tasklet/solid/
├── index.html               the page, with <div id="root"> and the entry script
├── package.json
├── tsconfig.json            "jsx": "preserve", "jsxImportSource": "solid-js"
├── vite.config.ts
├── public/tasks.json        the seed tasks
└── src/
    ├── index.tsx            render(() => <App />, root)
    ├── App.tsx              the page: form, filters, list, footer
    ├── taskStore.ts         createTaskStore(): the tasks, loading and persistence
    ├── tasks.ts             Task type, isTaskList, visibleTasks, countLabel
    ├── storage.ts           localStorage and fetch
    ├── tasklet.css          the shared stylesheet
    └── components/
        ├── TaskForm.tsx
        ├── TaskItem.tsx
        └── FilterBar.tsx
```

`tasks.ts` and `storage.ts` are the same logic as React's (Chapter 4), only formatted with semicolons. In
`tsconfig.json`, `"jsx": "preserve"` tells TypeScript to type-check JSX but leave it alone: Babel compiles
it, and `jsxImportSource` points TypeScript at Solid's JSX types. That split is also why TypeScript 7 works
here. `tsc` only checks types; it never transforms the code.

## Building Tasklet in Solid

### `package.json`, `vite.config.ts` and `index.tsx`

```json
{
  "name": "tasklet-solid",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4306 --strictPort",
    "build": "tsc && vite build",
    "preview": "vite preview --port 4306 --strictPort"
  },
  "dependencies": {
    "solid-js": "1.9.18"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vite": "8.3.5",
    "vite-plugin-solid": "2.11.15"
  }
}
```

`--strictPort` makes Vite exit with "Port 4306 is already in use" instead of picking another port. Vite has
a real `preview` command, so no extra server is needed.

```ts
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'esnext',
  },
});
```

`vite-plugin-solid` runs `babel-preset-solid` on every `.jsx` and `.tsx` file and adds hot module
replacement. `target: 'esnext'` comes from the template; it tells Vite not to down-level modern syntax.

```tsx
/* @refresh reload */
import { render } from 'solid-js/web';
import './tasklet.css';

import App from './App';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <App />, root!);
```

`render` takes a *function* that creates the app, because it must run it inside a new root owner; it
returns a `dispose` function. The `/* @refresh reload */` comment tells Solid's hot-reload plugin to reload
the page when this file changes instead of trying to swap modules.

### `taskStore.ts`

Tasklet keeps its state outside the components, in a function that creates it:

```ts
import { createEffect, createResource } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fetchTasks, loadSavedTasks, saveTasks } from './storage';
import type { Task } from './tasks';

export function createTaskStore() {
  const saved = loadSavedTasks();

  // A store, so changing one task updates only the bindings that read that task.
  const [tasks, setTasks] = createStore<Task[]>(saved ?? []);

  // Fetch the seed tasks only when nothing was saved. The resource tracks the
  // request (pending, ready, errored); the store keeps the data.
  const [seed, { refetch }] = createResource(saved === null, async () => {
    setTasks(await fetchTasks());
    return true;
  });

  const ready = () => saved !== null || seed.state === 'ready';

  // JSON.stringify reads every task and field, so the effect tracks them all.
  createEffect(() => {
    if (ready()) saveTasks(tasks);
  });

  return {
    tasks,
    ready,
    loading: () => seed.loading,
    failed: () => seed.state === 'errored',
    retry: () => refetch(),
    add(title: string) {
      setTasks(tasks.length, { id: crypto.randomUUID(), title, done: false });
    },
    toggle(id: string) {
      setTasks((task) => task.id === id, 'done', (done) => !done);
    },
    remove(id: string) {
      setTasks((list) => list.filter((task) => task.id !== id));
    },
    clearDone() {
      setTasks((list) => list.filter((task) => !task.done));
    },
  };
}
```

Four decisions are worth explaining.

**A store, not a signal.** `createStore` wraps the array in a proxy. Reading `tasks[0].done` through the
proxy tracks *that property* of *that object*, and writing it notifies only the readers of that property.
The setter takes a path: `setTasks(tasks.length, task)` writes one new index, and
`setTasks((task) => task.id === id, 'done', (done) => !done)` selects the matching tasks, then their `done`
key, then applies the updater. Toggling a task therefore changes one boolean. `remove` and `clearDone` pass
a function that returns a new array; for an array store, Solid copies it into the existing array index by
index and sets the length, so the remaining task objects stay the same objects. The alternative is a
signal holding an immutable array, as in React. It works, but every change replaces every task object, and
Exercise 2 shows what that costs.

**`createResource` for the fetch.** A resource wraps an async function and exposes its state as signals:
`seed.loading`, `seed.state` (`'unresolved'`, `'pending'`, `'ready'`, `'refreshing'` or `'errored'`),
`seed.error`, and a `refetch` function. Its first argument is a *source*: when the source is `false`,
`null` or `undefined`, the fetcher doesn't run. Passing `saved === null` is the whole "fetch only when
nothing was saved" rule. The fetcher writes the tasks into the store rather than returning them, so the
data has one home and stays fine-grained; the resource only tracks the request. The UI reads `seed.state`
and `seed.loading` but never calls `seed()` itself. That matters: reading a resource's value suspends
inside `<Suspense>` and throws to the nearest `<ErrorBoundary>` when the request failed. Tasklet wants an
inline error with a Retry button, so it reads only the state.

**`createEffect` for persistence.** `saveTasks(tasks)` calls `JSON.stringify`, which reads the length and
every property of every task through the proxy, so the effect depends on all of them and re-runs after any
change. The `ready()` check stops it from saving the empty array while the seed tasks load.

**A plain object as the API.** The store is returned as an object of methods and accessors and created in
`App`. If several distant components needed it, it could go into a context (`createContext` plus
`useContext`), which is Solid's dependency injection. Tasklet has one consumer, so a function call is
enough. Since components run once, `createTaskStore()` also runs once; there is no need for `useMemo` or a
`useRef` to keep it.

### `App.tsx`

```tsx
import { createMemo, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';
import { FilterBar } from './components/FilterBar';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { createTaskStore } from './taskStore';
import { countLabel, visibleTasks, type Filter } from './tasks';

const App: Component = () => {
  const store = createTaskStore();
  const [filter, setFilter] = createSignal<Filter>('all');
  const visible = createMemo(() => visibleTasks(store.tasks, filter()));

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={store.add} />
      <FilterBar filter={filter()} onChange={setFilter} />
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
        <Match when={visible().length > 0}>
          <ul class="tasks" aria-label="Tasks">
            <For each={visible()}>
              {(task) => (
                <TaskItem
                  task={task}
                  onToggle={() => store.toggle(task.id)}
                  onRemove={() => store.remove(task.id)}
                />
              )}
            </For>
          </ul>
        </Match>
      </Switch>
      <Show when={store.ready()}>
        <footer class="footer">
          <p class="count" aria-live="polite">
            {countLabel(store.tasks)}
          </p>
          <button
            type="button"
            class="clear"
            disabled={!store.tasks.some((task) => task.done)}
            onClick={() => store.clearDone()}
          >
            Clear done
          </button>
        </footer>
      </Show>
    </main>
  );
};

export default App;
```

`visible` is a memo, so the filtering runs only when a task or the filter changes, and the four places that
read `visible()` share one result. The JSX looks like React's, but every `{…}` is a binding, not a value
computed during a render. `filter={filter()}` compiles to a getter, so `FilterBar` sees the new filter
without re-running.

Control flow uses components. `<Switch>`/`<Match>` renders the first `<Match>` whose `when` is truthy, like
`switch (true)`. `<Show when={…}>` renders its children or an optional `fallback`. `<For each={…}>` maps an
array to rows *by reference*: when the array changes, it keeps the DOM for items it has seen and creates
rows only for new objects. That is why `For` needs no `key` prop, and why the store matters: the objects
keep their identity. With the All filter, `visibleTasks` returns the store array itself, so the memo's value
never changes, and the list still updates: `<For>` tracks the array it is given, and the store array
notifies it when items are added or removed. Writing `{visible().map(…)}` instead would also work, but the
whole `map` would re-run inside one effect and create every row from scratch on every change. Tasklet's
contract says "Nothing to show." replaces the list instead of appearing inside it, so it is a `<Match>`
instead of `<For>`'s `fallback` prop.

The arrow functions passed as `onToggle` and `onRemove` are created once per row, when `<For>` creates the
row, not on every change.

### `TaskItem.tsx`

```tsx
import type { Task } from '../tasks';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
}

export function TaskItem(props: TaskItemProps) {
  return (
    <li class="task" classList={{ done: props.task.done }}>
      <label>
        <input type="checkbox" checked={props.task.done} onChange={props.onToggle} /> <span>{props.task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label={`Delete "${props.task.title}"`}
        onClick={props.onRemove}
      >
        ×
      </button>
    </li>
  );
}
```

Every read goes through `props`. `classList={{ done: props.task.done }}` toggles one class; React would
build the whole `className` string. The compiler output (`examples/ch08/compile/out/TaskItem.js`) shows what
the browser actually runs:

```js
import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { setAttribute as _$setAttribute } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
import { addEventListener as _$addEventListener } from "solid-js/web";
import { effect as _$effect } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<li class=task><label><input type=checkbox> <span></span></label><button type=button class=delete>×`);
export function TaskItem(props) {
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.nextSibling,
      _el$5 = _el$4.nextSibling,
      _el$6 = _el$2.nextSibling;
    _$addEventListener(_el$3, "change", props.onToggle);
    _$insert(_el$5, () => props.task.title);
    _$addEventListener(_el$6, "click", props.onRemove, true);
    _$effect(_p$ => {
      var _v$ = !!props.task.done,
        _v$2 = `Delete "${props.task.title}"`;
      _v$ !== _p$.e && _el$.classList.toggle("done", _p$.e = _v$);
      _v$2 !== _p$.t && _$setAttribute(_el$6, "aria-label", _p$.t = _v$2);
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    _$effect(() => _el$3.checked = props.task.done);
    return _el$;
  })();
}
_$delegateEvents(["click"]);
```

The template contains every static part of the row, including the `×` and the space between the checkbox
and the title. The event handlers are attached once with `props.onToggle` and `props.onRemove` read once:
event handlers in Solid are not reactive, which is fine because the parent never changes them. The title
gets an `insert`. The `done` class and the `aria-label` share one effect that keeps the previous values in
`_p$` and touches the DOM only for the ones that changed, and `checked` has an effect of its own. When you
toggle a task, the store notifies those effects of that row, and nothing else in the app runs, which
Exercise 3 makes visible.

### `TaskForm.tsx` and `FilterBar.tsx`

```tsx
import { createSignal } from 'solid-js';

interface TaskFormProps {
  onAdd: (title: string) => void;
}

export function TaskForm(props: TaskFormProps) {
  const [title, setTitle] = createSignal('');

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = title().trim();
    if (trimmed === '') return;
    props.onAdd(trimmed);
    setTitle('');
  }

  return (
    <form aria-label="Add task" class="add" onSubmit={handleSubmit}>
      <label for="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autocomplete="off"
        value={title()}
        onInput={(event) => setTitle(event.currentTarget.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
```

The input is controlled the same way as in React: `value={title()}` and an `onInput` handler. Solid's
`onInput` is the native `input` event (React's `onChange` on text inputs means the same thing), and
`event.currentTarget` is typed as the input element. Writing `setTitle('')` after submitting updates the
input's `value` through the binding. Solid has no two-way binding syntax; a `ref` would also work.

```tsx
import { For } from 'solid-js';
import type { Filter } from '../tasks';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

interface FilterBarProps {
  filter: Filter;
  onChange: (filter: Filter) => void;
}

export function FilterBar(props: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter" class="filters">
      <For each={FILTERS}>
        {({ value, label }) => (
          <button type="button" aria-pressed={value === props.filter} onClick={() => props.onChange(value)}>
            {label}
          </button>
        )}
      </For>
    </div>
  );
}
```

Here destructuring is fine. `({ value, label })` destructures one item of a constant array that never
changes; the reactive value, `props.filter`, is read inside the `aria-pressed` expression.

### Build it and run it

```console
$ cd tasklet/solid
$ npm ci
$ npm run build

> tasklet-solid@0.0.0 build
> tsc && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.52 kB │ gzip: 0.33 kB
dist/assets/index-D6WTA7wE.css   2.28 kB │ gzip: 0.92 kB
dist/assets/index-Bn4w6B8B.js   23.63 kB │ gzip: 9.19 kB

✓ built in 141ms
$ node ../tools/size.mjs dist
file                              raw        gzip
assets/index-Bn4w6B8B.js     23.63 kB     9.11 kB
assets/index-D6WTA7wE.css     2.28 kB     0.93 kB
index.html                    0.52 kB     0.33 kB
total                        26.44 kB    10.37 kB
```

The whole build, type check included, takes about 2.6 seconds. Then the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs solid
=== Solid (tasklet/solid, port 4306) ===
…
$ npm run preview &    (in /home/tbangma/learn-web-frameworks/tasklet/solid)

> tasklet-solid@0.0.0 preview
> vite preview --port 4306 --strictPort

  ➜  Local:   http://localhost:4306/
  ➜  Network: use --host to expose

$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 15 workers
…
  15 passed (2.0s)

Summary
app    port  build  passed  failed  skipped  note
solid  4306  ok     15      0       0
```

All 15 pass. The app is 262 lines of TypeScript (`find src -name '*.ts' -o -name '*.tsx' | xargs wc -l`),
against React's 249, and 10.37 kB gzipped: about a seventh of React's 70.14 kB and a third of Vue's
28.37 kB. Solid's runtime is small because most of the work happens in the compiler, and what remains is a
reactive core and a handful of DOM helpers that are tree-shaken to what the app uses.

`npm run dev` starts Vite's dev server at `http://localhost:4306/` with hot module replacement.

## Beyond Tasklet

### More of the toolkit

- **Stores in depth.** Besides path setters, `solid-js/store` has `produce`, which lets you write a
  mutation against a draft (`setTasks(produce((list) => { list[0].done = true; }))`), and `reconcile`,
  which diffs fresh data, such as a server response, into an existing store and keeps the objects that
  didn't change, so `<For>` keeps their rows. `createMutable` gives a store you write to directly, MobX
  style, at the cost of reads and writes no longer being separated (Solid 2.0 removes it).
- **Context.** `createContext` and `useContext` pass values down the tree, usually a store and its
  functions.
- **Async UI.** `<Suspense>` shows a fallback while resources read inside it are loading, and
  `<ErrorBoundary>` catches errors thrown below it. `lazy(() => import('./Admin'))` code-splits a
  component.
- **Other built-ins.** `<Index>` maps by position instead of by reference (good for lists of primitives),
  `<Dynamic component={…}>` picks a component at run time, and `<Portal>` renders elsewhere in the document.
- **Router.** `@solidjs/router` 1.0 (July 2026) supports Solid 1.x and provides nested routes, `query` and
  `createAsync` for data loading, and actions for mutations. Its 2.0 line is in prerelease for Solid 2.0.
- **SolidStart** adds file-based routing, server functions and server rendering. [Chapter 18](18-meta-frameworks-and-rendering.md)
  covers SolidStart 2, which targets Solid 1.9.

### Solid 2.0

Solid 2.0 has been in development since early 2025 (2.0.0-experimental.0 in February 2025, the first beta in
March 2026). The release candidate arrived on August 12, 2026, with a post titled "Solid 2.0 RC: The Big
`<Reveal>`", and rc.20 is the current version. The headline is async: a memo can return a promise, and
everything downstream waits for it, with no special resource primitive and no manual loading flags. The
RC post sets expectations clearly:

> Release Candidate means the API is frozen, not that there won't be bugs
>
> — Ryan Carniato, "Solid 2.0 RC: The Big `<Reveal>`" (2026)

The migration guide in the `next` branch of the Solid repository lists the changes. The ones that would
touch Tasklet:

- **Batching by default.** Writes are batched until the next microtask, and a setter doesn't change what a
  read returns until then (`flush()` forces it). Exercise 4 runs this.
- **Split effects.** `createEffect(compute, apply)`: the first function tracks and returns a value, the
  second does the side effect with it and may return a cleanup. `onMount` becomes `onSettled`.
- **Async in the graph.** `createResource` is replaced by an async `createMemo` (or `createStore(fn)` for
  collections), `<Suspense>` by `<Loading>`, `<ErrorBoundary>` by `<Errored>`, `refetch` by `refresh`, and
  `isPending(() => …)` tells you a new value is on its way. New primitives cover mutations with optimistic
  updates (`action`, `createOptimistic`, `createOptimisticStore`) and loading order (`<Reveal>` replaces
  `SuspenseList`).
- **Stores.** Setters are draft-first, as if every setter were wrapped in `produce`; the path forms remain
  as shorthands. Stores move from `solid-js/store` into `solid-js`, and `unwrap` becomes `snapshot`.
- **Packages and JSX.** The DOM runtime moves from `solid-js/web` to `@solidjs/web`, which also owns the JSX
  types. `classList` is folded into `class` (`class={['task', { done: … }]}`), `<Index>` becomes
  `<For keyed={false}>`, `use:` directives become `ref` factories, and `mergeProps`/`splitProps` become
  `merge`/`omit`.
- **Dev warnings.** Reading a reactive value at the top level of a component body, including by
  destructuring props, now warns in development, which catches the bug from Exercise 1 at its source.

The tooling changed too. The new `@solidjs/vite-plugin` compiles JSX with an Oxc-based compiler written in
Rust, which the post measures at 23 to 355 times faster than the Babel plugin, and its **start mode**
(`solid({ start: true })`) adds file-system routing, server rendering and server functions. The post's
conclusion is that start mode replaces SolidStart: server functions moved into core, file routing into a
router-neutral package, and nothing was left for a separate meta-framework to do. For new projects the
post points to the Solid 2.0 templates in `npm create solid`, to preview docs at v2.solidjs.com, and to
`npx solid-migration-assistant` for existing code. Until 2.0 is final, `npm install solid-js` still gives you
1.9, and the libraries most apps depend on are moving at different speeds; Tasklet stays on 1.9.

### Signals everywhere

Solid didn't invent signals, but it showed that a whole UI could run on them with a component model people
already liked. Preact Signals, Angular's signals (Chapter 7), Svelte 5's runes, Qwik and Vue's Vapor mode all
followed, and a TC39 proposal to add signals to JavaScript itself is at Stage 1.
[Chapter 15](15-reactivity-compared.md) compares the implementations and builds one from scratch.

## Strengths and trade-offs

**Strengths**

- **Precise updates.** Only the DOM that depends on a change is touched, without diffing, memoization or
  dependency arrays, and performance stays predictable as the app grows.
- **Small output.** 10.37 kB gzipped for Tasklet, the smallest framework build in the course so far.
- **Familiar syntax.** JSX, functions and TypeScript; React developers can read Solid code on day one.
- **Simple mental model once learned.** A component is setup code, a signal is a getter, an effect is a
  subscription. There are no rules of hooks and no stale closures.
- **Stores.** Nested, mutable-feeling state that stays fine-grained, without immutable copying.

**Trade-offs**

- **Looks like React, isn't.** Destructuring props, early returns and reading signals in a component body
  all fail silently in 1.x. The syntax invites habits the model punishes.
- **Smaller ecosystem.** Fewer component libraries, fewer jobs and fewer answers online than React, Vue or
  Angular. Many React libraries have no Solid equivalent.
- **Control-flow components.** `<Show>`, `<For>` and `<Switch>` are needed for efficient updates, where
  React uses plain JavaScript.
- **A major transition.** Solid 2.0 changes batching, effects, async and the package layout, and replaces
  SolidStart. Code and libraries written for 1.x need migrating, and for now the ecosystem is split.

## Compared with React and Angular

The **list item** is the clearest comparison. React's (`tasklet/react/src/components/TaskItem.tsx`):

```tsx
export function TaskItem({ task, onToggle, onRemove }: TaskItemProps) {
  return (
    <li className={task.done ? 'task done' : 'task'}>
      <label>
        <input type="checkbox" checked={task.done} onChange={onToggle} /> <span>{task.title}</span>
```

React destructures props and computes `className` because the function runs again on every render with
fresh props. Solid's version reads `props.task.done` inside bindings because the function never runs again.
The same JSX means different things: in React it describes the UI at one moment, in Solid it describes
which bindings to create.

The **state update**: React's toggle builds a new array with a new task object and lets the re-render find
the difference. Solid's store path setter flips one boolean, and the two or three bindings that read it run.
Angular, like Solid, uses signals, but it tracks them per component: changing `tasks` marks the views that
read it dirty, and their whole update pass runs. Solid tracks per *expression*, so the unit of update is a
text node or an attribute, not a component.

The **fetch**: React needs `useState` for data and error plus a `useEffect` with an `ignore` flag. Angular's
`httpResource` and Solid's `createResource` both expose loading, error and refetch as reactive state. Solid's
resource takes a plain async function, so `fetch` needs no wrapper.

The **platform**: Angular ships the router, forms, HTTP, i18n and a CLI. Solid ships a reactive core and a
DOM renderer, and you choose the rest (Solid Router, TanStack Query, a form library), much as with React.
Tasklet weighs 70.14 kB in React, 76.97 kB in Angular and 10.37 kB in Solid. [Appendix A](appendix-a-rosetta-stone.md)
lines up the syntax of all the frameworks, and the next chapter, Preact, takes React's API and makes it
small, borrowing Solid's `<Show>`/`<For>` names for its signals.

## Summary

- Solid uses JSX and function components, but a component runs once. It creates DOM and connects each
  dynamic expression to the signals it reads; afterwards, only those bindings re-run.
- `createSignal`, `createMemo` and `createEffect` form a reactive graph with automatic dependency tracking.
  Ownership (`createRoot`, `onCleanup`) disposes computations together with the UI that created them.
- The compiler turns JSX into cloned `<template>` HTML plus `insert` and `effect` calls. Props are passed as
  getters, so destructuring them reads the value once and breaks reactivity.
- `<Show>`, `<For>` and `<Switch>`/`<Match>` handle conditional and list rendering; `<For>` keys rows by
  object identity.
- `createStore` gives fine-grained nested state with path setters; `createResource` tracks async work.
- Tasklet in Solid is 262 lines, 10.37 kB gzipped, and passes all 15 tests.
- Solid 2.0 (release candidate since August 2026) batches writes by default, splits effects, puts async in
  the reactive graph, moves the DOM runtime to `@solidjs/web` and replaces SolidStart with start mode.

## Exercises

The variants live in `examples/ch08/exercises/`. `./check.sh <variant>` copies `tasklet/solid`, lays the
variant's files over it, builds it, serves it on port 4328 and runs the Tasklet tests. Then
`row-identity.cjs` toggles the first task and reports whether its `<li>` is still the same DOM node, and
`size.mjs` prints the size.

1. **Destructure the props.** Change `TaskItem` to read `const { done, title } = props.task;` at the top and
   use `done` and `title` in the JSX. Predict which tests fail before you run `./check.sh destructure`.

   <details><summary>Solution</summary>

   The variant (`examples/ch08/exercises/destructure/src/components/TaskItem.tsx`) begins:

   ```tsx
     const { done, title } = props.task;
     return (
       <li class="task" classList={{ done }}>
         <label>
           <input type="checkbox" checked={done} onChange={props.onToggle} /> <span>{title}</span>
   ```

   ```console
   $ ./check.sh destructure
   …
     2 failed
       [chromium] › tests/tasklet.spec.ts:223:1 › toggles a task with its checkbox ────────────────────
       [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All 
     13 passed (6.3s)
   toggling the first task
   same <li> after toggle: true
   total                        26.34 kB    10.35 kB
   ```

   Both failures are the same assertion: after a toggle, the `<li>` should have the class `done`, and it
   still has only `task`. `done` was read once, when the row was created, so the class binding never
   changes. The title and Delete label still display correctly because titles never change in Tasklet, and
   deleting and adding work because they create or remove whole rows. The checkbox itself appears to work:
   the browser checks it, and nothing ever writes `checked` back. That is the dangerous part of this bug, a
   UI that looks half right. Solid 2.0 warns about the top-level read in development.

   </details>

2. **A signal instead of a store.** Replace the store in `taskStore.ts` with
   `createSignal<Task[]>`, updating it immutably as React does (`signal-list/src/taskStore.ts`). Do the tests
   pass? Is the `<li>` the same node after a toggle?

   <details><summary>Solution</summary>

   The toggle becomes:

   ```ts
       toggle(id: string) {
         setTasks((list) => list.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
       },
   ```

   ```console
   $ ./check.sh signal-list
   …
     15 passed (1.9s)
   toggling the first task
   same <li> after toggle: false
   total                        22.73 kB     9.10 kB
   ```

   All tests pass and the build is 1.27 kB smaller gzipped, because the store module is gone. But the toggled row
   is a new `<li>`: the toggle creates a new object for that task, `<For>` sees an object it doesn't know,
   disposes the old row and creates a new one. The checkbox loses focus, any state inside the row is lost,
   and a list of a thousand rows replaced at once costs a thousand row creations. React solves this with
   `key`; Solid's answer is to keep object identity, which is what the store's path setters do. (`<For>`
   keys by reference; `<Index>` keys by position, which would keep the row and update its bindings from the
   new object.)

   </details>

3. **Watch it run once.** Add `console.log` at the top of `TaskItem` and an effect that logs `done`
   (`runs-once/src/components/TaskItem.tsx`). What is logged when the page loads, and what when you toggle
   the first task?

   <details><summary>Solution</summary>

   ```tsx
   export function TaskItem(props: TaskItemProps) {
     console.log('TaskItem body runs for', props.task.title);
     createEffect(() => console.log('effect: done =', props.task.done, 'for', props.task.title));
   ```

   ```console
   $ ./check.sh runs-once
   …
     15 passed (1.9s)
   console: TaskItem body runs for Read the Vue chapter
   console: TaskItem body runs for Try Svelte runes
   console: TaskItem body runs for Write a signal from scratch
   console: effect: done = false for Read the Vue chapter
   console: effect: done = false for Try Svelte runes
   console: effect: done = true for Write a signal from scratch
   toggling the first task
   console: effect: done = true for Read the Vue chapter
   same <li> after toggle: true
   total                        26.56 kB    10.42 kB
   ```

   Each body runs once, at load. Effects run after the rows are rendered. Toggling the first task logs one
   line: that row's effect. No component function runs, the other rows' effects don't run, and the `<li>`
   is the same element. In React, the same toggle would call `App` and all three `TaskItem` functions.

   </details>

4. **Solid 2.0 batching.** `examples/ch08/solid2/batching.mjs` runs against `solid-js` 2.0.0-rc.20:

   ```js
   import { createEffect, createMemo, createRoot, createSignal, flush } from 'solid-js';

   const [count, setCount] = createSignal(0);

   setCount(1);
   console.log('after setCount(1):', count());
   flush();
   console.log('after flush():', count());

   createRoot(() => {
     const double = createMemo(() => count() * 2);
     // Split effect: the first function tracks, the second does the side effect.
     createEffect(
       () => double(),
       (value) => {
         console.log('effect applies double =', value);
         return () => console.log('  cleanup for', value);
       },
     );
   });
   flush();

   setCount(5);
   setCount(6);
   await Promise.resolve();
   console.log('after a microtask:', count());
   ```

   Predict each line before you run `npm run -s batching` in `examples/ch08/solid2`. Then compare with
   `examples/ch08/reactivity/batching.mjs`, the 1.9 version of the first half.

   <details><summary>Solution</summary>

   ```console
   $ npm run -s batching
   after setCount(1): 0
   after flush(): 1
   effect applies double = 2
     cleanup for 2
   effect applies double = 12
   after a microtask: 6
   ```

   In 2.0 a write is queued: `count()` still returns 0 until `flush()` (or the next microtask) applies it.
   The effect's apply function first runs at the `flush()` after `createRoot`. `setCount(5)` and
   `setCount(6)` land in the same batch, so the effect never sees 5 or 10: after the microtask, the cleanup
   from the previous run fires and the apply function runs once with 12. In 1.9, the same writes are visible
   immediately, even inside `batch`, which only defers effects:

   ```console
   $ npm run -s batching
   after setCount(1): 1
   inside batch: 2
   after batch: 2
   ```

   Synchronous reads are easier to reason about in small scripts; deferred reads mean an app never observes
   a half-applied update, and they are what lets async values fit into the graph.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-8--solid)
