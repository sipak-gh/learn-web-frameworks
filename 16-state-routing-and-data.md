# Chapter 16 — State, Routing and Data

Every framework in this course gives a component somewhere to keep its own data. Real apps need more
than that. A cart badge in the header and a checkout page share one cart. A task list comes from a server
and goes stale while you look at it. The filter you picked should survive a reload and be shareable as a
link. A form has values, errors and a "submitting" flag that nobody else cares about. This chapter sorts
those needs into five kinds of state. It then shows the libraries the ecosystem built for each kind:
stores (Redux Toolkit, Zustand, Jotai, Pinia, NgRx Signal Store, Svelte runes in modules, Solid stores,
Preact Signals and the framework-agnostic nanostores), server-state caches (TanStack Query and SWR),
routers (React Router, TanStack Router, Vue Router, Angular Router and file-based routing) and form
libraries.

You will run the same cart through nine store libraries and compare what their subscribers see. You will
share one store between a React island and a Vue island on the same page. You will also watch TanStack
Query dedupe, cache and revalidate a request, with timestamps. The examples live in `examples/ch16/`.
[Chapter 17](17-build-tools.md) then looks at the tools that turn all of this into files a browser can
load.

## Five kinds of state

"State management" is one phrase for several different problems. Before you pick a library, decide which
kind of state you have. Each kind has a natural home, and most state-management pain comes from keeping
data in the wrong one.

```text
                       who owns it?            where it lives               typical tool
                       ------------            --------------               ------------
  local state          one component           the component                useState, ref, $state, signal
  shared client state  several components      a store outside the tree     context, Pinia, Zustand, a signal module
  server state         the server              a cache in the browser       TanStack Query, SWR, router loaders
  URL state            the address bar         location.pathname / search   the router, URLSearchParams
  form state           one form, briefly       the form                     native forms, a form library
```

- **Local state** belongs to one component: whether a menu is open, the text in a search box before you
  press Enter. Keep it in the component. Every framework handles this well with nothing extra.
- **Shared client state** is data that the browser owns and several distant components read: the cart,
  the signed-in user's preferences, a theme. This is the classic job of a "store".
- **Server state** is a copy of data that someone else owns. Other users can change it. It arrives
  asynchronously and goes out of date. Treating it as a cache, not as a store, is the main idea of the
  "Server state is a cache" section.
- **URL state** is anything that should survive a reload or travel in a link: the current page, the
  selected task, a filter, a search term, a page number. The router reads and writes it.
- **Form state** covers the values being edited, plus touched, dirty, error and submitting flags. It lives
  for the length of one form and is thrown away (or sent) at the end.

A useful habit is to ask "what if this is lost?" Losing local state is fine. Losing URL state breaks the
Back button and shared links. Losing server state only costs a refetch. Shared client state is the only
kind you have to protect with persistence or a careful design, and in most apps there is less of it than
you expect.

## What you get before any library

Every framework from Part II and Part III can already share state without a dedicated library. You met
the tools in the framework chapters:

| Framework | Local | Shared without a library | Derived |
|---|---|---|---|
| React | `useState`, `useReducer` | lift state up, context, `useSyncExternalStore` for outside stores | compute during render, `useMemo` |
| Vue | `ref`, `reactive` | a module that exports refs, `provide`/`inject` | `computed` |
| Svelte | `$state` | a class or object with `$state` fields in a `.svelte.ts` module, context | `$derived` |
| Angular | `signal` | an injectable service holding signals | `computed` |
| Solid | `createSignal`, `createStore` | signals and stores at module level, context | functions, `createMemo` |
| Preact | `useState`, signals | a module that exports signals, context | `computed` |

The table hides a difference that matters for libraries. In the signal-based frameworks (Vue, Svelte,
Angular, Solid and Preact with signals), a reactive value declared in a plain module *is* already a
shared store: any component that reads it subscribes. [Chapter 15](15-reactivity-compared.md) showed why:
the dependency tracking lives in the value, not in the component. React's state lives inside components,
so a value outside React needs a bridge. That bridge is `useSyncExternalStore`, which every React store
library uses under the hood. The React course builds one in
[Chapter 13](../learn-react/13-custom-hooks.md) and covers reducers and context in
[Chapter 7](../learn-react/07-reducers.md) and [Chapter 10](../learn-react/10-composition-and-context.md).

So start with what the framework gives you. Redux's own FAQ quotes its co-author on this:

> I would like to amend this: don't use Redux until you have problems with vanilla React.
>
> — Dan Abramov, quoted in "Redux FAQ: General" (2026)

The same advice applies to every library in this chapter. Reach for one when you can name the problem it
solves: state that many unrelated components need, updates that are hard to trace, or a need for
devtools, persistence or undo.

## One cart, nine stores

To compare store libraries fairly, `examples/ch16/stores/` implements the same tiny cart in each of them.
The cart holds a list of item names, derives a count, and has two actions: add an item and clear the cart.
A runner, `stores/run.ts`, subscribes to each store and then runs the same four steps: add Apple, add
Pear, clear, and clear again. It prints every count the subscriber was told about. The last step changes
nothing, which makes it a good test of how precise each library's notifications are.

### Redux Toolkit

Redux keeps all shared state in one object that only changes when you *dispatch* an action, a plain
object that describes what happened. A pure *reducer* function computes the next state from the current
state and the action. Redux Toolkit (RTK) is the official way to write Redux today. Its `createSlice`
generates the action creators and the reducer from one object, and uses Immer so that code that looks
like mutation produces a new immutable state.

`examples/ch16/stores/redux.ts`
```ts
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as string[] },
  reducers: {
    // Immer turns these "mutations" into new immutable state.
    added(state, action: PayloadAction<string>) {
      state.items.push(action.payload)
    },
    cleared(state) {
      state.items = []
    },
  },
  selectors: {
    selectCount: (cart) => cart.items.length,
  },
})

export const { added, cleared } = cartSlice.actions
export const { selectCount } = cartSlice.selectors

export const store = configureStore({ reducer: { cart: cartSlice.reducer } })
```

The ceremony buys a log of every change: Redux DevTools can list each action, show the state before and
after, and step back in time. RTK also ships RTK Query, a server-state cache in the spirit of TanStack
Query. In React you read the store with `useSelector` from `react-redux`; the React course's
[Chapter 7](../learn-react/07-reducers.md) teaches the reducer pattern itself with `useReducer`.

### Zustand

Zustand keeps the "one store, change it with functions" idea and drops actions and reducers. The store is
a function that receives `set` and returns the initial state plus the functions that change it.

`examples/ch16/stores/zustand.ts`
```ts
import { createStore } from 'zustand/vanilla'

interface CartState {
  items: string[]
  add: (name: string) => void
  clear: () => void
}

// zustand's `create` makes a React hook; `createStore` makes a plain store.
export const cartStore = createStore<CartState>()((set) => ({
  items: [],
  add: (name) => set((state) => ({ items: [...state.items, name] })),
  clear: () => set({ items: [] }),
}))
```

In a React app you would call `create` instead, which returns a hook: `const count =
useCart((state) => state.items.length)`. The component re-renders only when the selected value changes.
Zustand has no provider and very little API, which has made it a popular choice for React apps that
outgrow context.

### Jotai

Jotai builds state bottom-up from *atoms*: small independent pieces of state, plus derived atoms that read
other atoms. Components subscribe to exactly the atoms they use, which is the same fine-grained idea as a
signal graph, expressed in React's terms.

`examples/ch16/stores/jotai.ts`
```ts
import { atom } from 'jotai/vanilla'

export const itemsAtom = atom<string[]>([])

// A derived (read-only) atom.
export const countAtom = atom((get) => get(itemsAtom).length)

// Write-only atoms act as actions.
export const addAtom = atom(null, (get, set, name: string) => {
  set(itemsAtom, [...get(itemsAtom), name])
})
export const clearAtom = atom(null, (_get, set) => set(itemsAtom, []))
```

In React you use `useAtom(itemsAtom)` or `useAtomValue(countAtom)` and `useSetAtom(addAtom)`. Jotai 3,
released in September 2026, is mostly a cleanup release: it removes long-deprecated APIs and keeps the atom model.

### Pinia

Pinia is Vue's official store. A "setup store" is written with the same `ref` and `computed` you use in a
component, so there is almost nothing new to learn. Vue's devtools show each store's state and let you
edit it.

`examples/ch16/stores/pinia.ts`
```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// A "setup store": the same ref/computed you write in a component.
export const useCartStore = defineStore('cart', () => {
  const items = ref<string[]>([])
  const count = computed(() => items.value.length)
  function add(name: string) {
    items.value.push(name)
  }
  function clear() {
    items.value = []
  }
  return { items, count, add, clear }
})
```

A component calls `const cart = useCartStore()` and reads `cart.count` in its template. Pinia 4 is ESM
only and expects `@vue/devtools-api` v8 to be installed alongside it. [Chapter 5](05-vue.md) shows Pinia
in the Vue Tasklet context.

### NgRx Signal Store

Angular apps share state through injectable services, and a service holding a few signals is often enough
(see [Chapter 7](07-angular.md)). NgRx, long known for its Redux-style store built on RxJS, now also
offers the Signal Store: a store assembled from *features* such as state, computed values and methods.
The result is an injectable class whose state is exposed as signals.

`examples/ch16/stores/ngrx.ts`
```ts
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as string[] }),
  withComputed(({ items }) => ({
    count: () => items().length,
  })),
  withMethods((store) => ({
    add(name: string) {
      patchState(store, (state) => ({ items: [...state.items, name] }))
    },
    clear() {
      patchState(store, { items: [] })
    },
  })),
)
```

A component injects it (`readonly cart = inject(CartStore)`) and reads `cart.count()` in its template.
Custom features let teams package reusable behavior, such as loading flags or entity collections, and
compose them into many stores.

### Svelte runes in a `.svelte.ts` module

Svelte 5 needs no store library for this. Runes also work in `.svelte.js` and `.svelte.ts` files, so a
class with `$state` fields is a shared store.

`examples/ch16/stores/cart.svelte.ts`
```ts
// Runes work in .svelte.ts modules too, so shared state is just a class.
class Cart {
  items = $state<string[]>([])
  count = $derived(this.items.length)

  add(name: string) {
    this.items.push(name)
  }

  clear() {
    this.items = []
  }
}

export const cart = new Cart()
```

The class matters. The Svelte docs note that you can declare state in a `.svelte.ts` module but can only
export it if it is not directly reassigned. The compiler rewrites reads and writes of a
`$state` variable inside the file that declares it, and an importing file cannot see a reassignment.
Exporting an object or a class instance and changing its properties avoids the problem. The older
`svelte/store` module (`writable`, `readable`, `derived`) still works and is the "store contract" other
libraries implement; [Chapter 6](06-svelte.md) covers both.

### Solid stores

Solid's signals hold single values. For nested data, `createStore` returns a reactive proxy and a setter
that supports paths, so that a change to one item only notifies the code that reads that item.

`examples/ch16/stores/solid.ts`
```ts
import { createStore } from 'solid-js/store'

const [cart, setCart] = createStore({ items: [] as string[] })

export { cart }

export const count = () => cart.items.length

export function add(name: string) {
  // Path syntax: set index `length` of `items`, i.e. append.
  setCart('items', cart.items.length, name)
}

export function clear() {
  setCart('items', [])
}
```

Solid also has `produce` for Immer-style updates and `reconcile` for merging fresh server data into an
existing store. [Chapter 8](08-solid.md) covers stores in Solid 1.x and what changes in Solid 2.0.

### Preact Signals

`@preact/signals-core` is the framework-independent core of Preact Signals. A module-level signal is a
store.

`examples/ch16/stores/preact-signals.ts`
```ts
import { computed, signal } from '@preact/signals-core'

export const items = signal<string[]>([])

export const count = computed(() => items.value.length)

export function add(name: string) {
  items.value = [...items.value, name]
}

export function clear() {
  items.value = []
}
```

In Preact you can pass a signal straight into JSX and Preact updates just that text node.
[Chapter 9](09-preact.md) shows this. Adapters exist for React too (`@preact/signals-react`), but they have
to work around React's rendering model and come with their own setup requirements.

### What the subscribers saw

The ninth store is nanostores, which the next section uses. Run the comparison:

```console
$ npm run stores

Redux Toolkit   1 → 2 → 0 → 0
Zustand         1 → 2 → 0 → 0
Jotai           1 → 2 → 0
Pinia           1 → 2 → 0
NgRx Signals    0 → 1 → 2 → 0 → 0
nanostores      0 → 1 → 2 → 0
Preact Signals  0 → 1 → 2 → 0
Solid store     0 → 1 → 2 → 0 → 0
Svelte runes    0 → 1 → 2 → 0
```

Two patterns show up.

**Some subscribers run at once.** nanostores' `subscribe`, Preact's `effect`, Solid's `createEffect`,
Svelte's `$effect` and NgRx's `watchState` call the callback immediately with the current value, so their
lines start with 0. Redux, Zustand, Jotai's `store.sub` and Vue's `watch` wait for the first change.

**Some subscribers hear about changes that change nothing.** The final "clear again" step replaces an
empty list with a new empty list. Redux and Zustand notify every subscriber after every update; it is
the job of a selector (`useSelector`, Zustand's hook) to compare the selected value and skip the render.
NgRx's `watchState` reports every state change. Solid's `count` is a plain function, so the effect re-ran
when `items` was replaced; wrapping it in `createMemo` would stop at the unchanged number. Jotai's derived
atom, Pinia's `computed`, nanostores' `computed`, Preact's `computed` and Svelte's `$derived` compare the
new count with the old one and stay quiet.

Neither behavior is wrong. A coarse "something changed" notification is simple and cheap, and the
framework binding filters it. A derived value that compares results saves work further down the graph.
The difference matters when you subscribe outside a framework, or when a store feeds an expensive
computation.

## One store, two frameworks

A store that does not depend on a framework can be shared by components written in different frameworks.
That sounds exotic, but it happens: during a gradual migration, with micro-frontends, or with islands of
several frameworks on one page, which [Chapter 18](18-meta-frameworks-and-rendering.md) builds with
Astro. nanostores is designed for this. Its README puts the store code at between 351 and 844 bytes (minified
and brotlied). Small adapters connect it to React, Preact, Vue, Solid, Lit and Angular, and its stores
implement Svelte's store contract, so `.svelte` files can use them with `$store` directly.

The cart store does not import any framework:

`examples/ch16/src/cart.ts`
```ts
import { atom, computed } from 'nanostores'

// One store, owned by no framework. Any island on the page can import it.
export const $cart = atom<readonly string[]>([])

export const $count = computed($cart, (items) => items.length)

export function addToCart(name: string) {
  $cart.set([...$cart.get(), name])
}

export function clearCart() {
  $cart.set([])
}
```

A React component reads the count and adds products:

`examples/ch16/src/Products.tsx`
```tsx
import { useStore } from '@nanostores/react'
import { $count, addToCart } from './cart.ts'

const products = ['Apple', 'Pear', 'Plum']

export function Products() {
  const count = useStore($count)
  return (
    <section aria-label="Products (React)">
      <h2>Products (React)</h2>
      <ul>
        {products.map((name) => (
          <li key={name}>
            {name}{' '}
            <button type="button" onClick={() => addToCart(name)}>
              Add {name}
            </button>
          </li>
        ))}
      </ul>
      <p>React sees {count} in the cart.</p>
    </section>
  )
}
```

A Vue component reads the same store and clears it:

`examples/ch16/src/CartSummary.vue`
```vue
<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { $cart, $count, clearCart } from './cart.ts'

const items = useStore($cart)
const count = useStore($count)
</script>

<template>
  <section aria-label="Cart (Vue)">
    <h2>Cart (Vue)</h2>
    <p v-if="count === 0">Your cart is empty.</p>
    <ol v-else>
      <li v-for="(item, index) in items" :key="index">{{ item }}</li>
    </ol>
    <button type="button" :disabled="count === 0" @click="clearCart">Clear cart</button>
  </section>
</template>
```

The entry point mounts both, and adds a third subscriber with no framework at all, a badge in the page
header:

`examples/ch16/src/main.tsx`
```tsx
import { createRoot } from 'react-dom/client'
import { createApp } from 'vue'
import { $count } from './cart.ts'
import CartSummary from './CartSummary.vue'
import { Products } from './Products.tsx'

createRoot(document.getElementById('react-root')!).render(<Products />)
createApp(CartSummary).mount('#vue-root')

// A third subscriber with no framework at all.
const badge = document.getElementById('badge')!
$count.subscribe((count) => {
  badge.textContent = count === 1 ? '1 item' : `${count} items`
})
```

Vite builds the React and Vue code side by side because both plugins are registered:

`examples/ch16/vite.config.ts`
```ts
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), vue()],
  server: { port: 4336, strictPort: true },
  preview: { port: 4336, strictPort: true },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', urlFilter: 'url-filter.html' },
    },
  },
})
```

Run it with `npm run dev` in `examples/ch16/` and open `http://localhost:4336/`. Click "Add Apple" in the
React section and the Vue list, the React sentence and the header badge all update. "Clear cart" in Vue
empties the React count. The Playwright check in this course's verification runs exactly that sequence
against the production build (`npm run build && npm run preview`).

The build output shows the price of the experiment:

```console
$ npm run build
…
dist/index.html                                   0.56 kB │ gzip:  0.34 kB
dist/url-filter.html                              0.67 kB │ gzip:  0.35 kB
dist/assets/modulepreload-polyfill-P2Xu9kJm.js    0.67 kB │ gzip:  0.38 kB
dist/assets/urlFilter-CQ4cIIN0.js                 0.94 kB │ gzip:  0.53 kB
dist/assets/main-fLzP5sLG.js                    285.37 kB │ gzip: 94.09 kB
```

Most of the 94 kB is two framework runtimes. The store itself costs almost nothing. Sharing state across
frameworks is cheap; shipping two frameworks is not.

The same approach works with any framework-free store: a Zustand vanilla store, a Jotai store from
`jotai/vanilla`, a Preact signal from `@preact/signals-core`, or a hand-written object with `get`, `set`
and `subscribe` (exercise 2 builds one). The TC39 Signals proposal, covered in
[Chapter 15](15-reactivity-compared.md), aims to make this kind of sharing a language feature.

## Server state is a cache

Most data in a typical app is not yours. The task list, the product catalog and the user's profile live
on a server. The browser holds a copy. The TanStack Query docs put the difference this way:

> While most traditional state management libraries are great for working with client state, they are not
> so great at working with async or server state. This is because server state is totally different.
>
> — TanStack Query documentation, "Overview" (2026)

Fetching that data in a component effect works for a demo. In an app it raises questions every team ends
up answering by hand. Two components need the same data: do they make two requests? The user comes back
to a tab after ten minutes: is the data still right? A request resolves after the user has navigated away:
does it overwrite newer data? A save succeeds: which lists are now out of date? The React course walks
through the race-condition part of this in [Chapter 11](../learn-react/11-effects.md) and
[Chapter 17](../learn-react/17-async-react.md).

A server-state library answers those questions once. You describe each piece of server data by a **key**
and a **function** that fetches it. The library keeps a cache keyed by those keys and decides when to
fetch.

```text
   component A ─┐                      ┌───────────── cache ─────────────┐
                ├─ useQuery(['price'])─▶ ['price'] → 101  fresh / stale  │──▶ fetchPrice() ──▶ server
   component B ─┘                      └──────────────────────────────────┘     (one request,
                                         ▲ invalidate(['price']) after a save     deduped)
```

### TanStack Query

TanStack Query (formerly React Query) is the best known of these libraries, and its core,
`@tanstack/query-core`, is framework-independent. Official adapters wrap it for React, Vue, Solid, Svelte,
Preact, Lit and Angular. The Angular adapter is still published as
`@tanstack/angular-query-experimental`, and the Svelte adapter's version 6 is built on Svelte 5 runes. All
of them share the same cache logic, so this example uses the core directly, in Node, to show what a
`useQuery` call does over time:

`examples/ch16/query/cache-demo.ts`
```ts
import { QueryClient, QueryObserver } from '@tanstack/query-core'

const start = performance.now()
const log = (message: string) =>
  console.log(`${String(Math.round(performance.now() - start)).padStart(5)} ms  ${message}`)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A pretend server: every request takes 100 ms and returns a new price.
let requests = 0
async function fetchPrice(): Promise<number> {
  requests += 1
  log(`  server: request #${requests}`)
  await sleep(100)
  return 100 + requests
}

const priceQuery = { queryKey: ['price'], queryFn: fetchPrice }
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 1_000 } } })

log('1. Two callers ask at the same time')
const [a, b] = await Promise.all([client.fetchQuery(priceQuery), client.fetchQuery(priceQuery)])
log(`   both got ${a} and ${b}`)

log('2. Ask again while the data is fresh (staleTime 1000 ms)')
log(`   got ${await client.fetchQuery(priceQuery)} from the cache`)

await sleep(1_100)
log('3. The data is now stale. A component mounts (useQuery uses an observer)')
const observer = new QueryObserver(client, priceQuery)
const first = observer.getCurrentResult()
log(`   it renders at once: data ${first.data}, isStale ${first.isStale}`)
observer.subscribe((result) => {
  log(`   update: data ${result.data}, isStale ${result.isStale}, isFetching ${result.isFetching}`)
})
await sleep(200)

log('4. A mutation changed the price on the server: invalidate')
await client.invalidateQueries({ queryKey: ['price'] })
log(`   requests so far: ${requests}`)
observer.destroy()
```

```console
$ npm run query

    0 ms  1. Two callers ask at the same time
    3 ms    server: request #1
  103 ms     both got 101 and 101
  103 ms  2. Ask again while the data is fresh (staleTime 1000 ms)
  103 ms     got 101 from the cache
 1205 ms  3. The data is now stale. A component mounts (useQuery uses an observer)
 1205 ms     it renders at once: data 101, isStale true
 1206 ms     update: data 101, isStale true, isFetching true
 1206 ms    server: request #2
 1306 ms     update: data 102, isStale false, isFetching false
 1406 ms  4. A mutation changed the price on the server: invalidate
 1406 ms     update: data 102, isStale true, isFetching false
 1406 ms     update: data 102, isStale true, isFetching true
 1407 ms    server: request #3
 1507 ms     update: data 103, isStale false, isFetching false
 1507 ms     requests so far: 3
```

Read it step by step:

1. **Deduplication.** Two callers asked for `['price']` at the same moment. The server saw one request and
   both callers got its answer.
2. **Fresh data comes from the cache.** Within `staleTime`, asking again costs nothing.
3. **Stale-while-revalidate.** After `staleTime`, the data is stale but still in the cache. A new observer
   (what `useQuery` creates when a component mounts) gets the stale value at once, so the component renders
   without a spinner, and a background refetch replaces it 100 ms later.
4. **Invalidation.** After a mutation, you tell the cache which keys are now wrong.
   `invalidateQueries` marks them stale and refetches the ones on screen.

In a React component, steps 3 and 4 are two lines: `const { data, isPending } = useQuery({ queryKey:
['price'], queryFn: fetchPrice })`, and `queryClient.invalidateQueries({ queryKey: ['price'] })` in a
mutation's `onSuccess`. The Vue, Solid, Svelte and Angular adapters use the same option names.

The defaults surprise people, so they are worth learning. `staleTime` is 0: cached data counts as stale
immediately, so every new mount, window focus and network reconnect triggers a background refetch.
Inactive queries stay in the cache for 5 minutes (`gcTime`) before they are garbage-collected. Failed
queries are retried 3 times with exponential backoff before you see an error. Most apps raise `staleTime`
globally to something that matches how often their data really changes.

### SWR and the alternatives

SWR, from Vercel, takes its name from the HTTP `stale-while-revalidate` cache directive and implements the
behavior from step 3 with a smaller API: `const { data, error, isLoading } = useSWR('/api/tasks',
fetcher)`. The key is usually the URL itself. SWR is React-only. Pick it when you want the core caching
behavior with less configuration; pick TanStack Query for richer mutation handling, devtools, or a
framework other than React.

Other options solve the same problem from another angle. RTK Query is part of Redux Toolkit. Pinia Colada,
from Pinia's author, is a data-fetching layer for Vue built on Pinia. GraphQL clients such as Apollo Client and urql cache by
entity rather than by key. Angular has `resource()` and `httpResource()`, which load async data into
signals.

### Router loaders: fetch where you navigate

The other answer is to load data in the router. A route declares a *loader*, and the router calls it
before (or while) it renders the page, so data fetching starts at navigation time instead of after the
component mounts. React Router's data and framework modes, TanStack Router, SvelteKit's `load`, Nuxt's
`useFetch` and Angular's resolvers all work this way. Loaders and query caches combine well: a loader can
call `queryClient.ensureQueryData(...)` so that navigation starts the fetch and the cache keeps it fresh
afterwards. The next section shows loaders in each router.

## Routing

A single-page app still needs URLs. Each screen should have an address you can bookmark, reload and share,
and Back should go back. A client-side router keeps the URL and the screen in sync without full page
loads:

```text
   click <a href="/tasks/2">          popstate (Back / Forward)
          │                                     │
          ▼                                     ▼
   preventDefault + history.pushState     read location
          └──────────────┬──────────────────────┘
                         ▼
            match the URL against the route table   /tasks/:id  → { id: '2' }
                         ▼
            run loaders / guards (optional)         fetchTask('2')
                         ▼
            render the matched layouts and page     <Layout><TaskPage/></Layout>
```

All the routers below share this model, plus three features: **nested routes** (a layout route renders
an outlet where its child route appears), **dynamic segments** (`:id`), and **lazy routes** (a page's
code is loaded when you first visit it, which [Chapter 17](17-build-tools.md) shows as a separate chunk).
The examples in `examples/ch16/routers/` are type-checked against the installed versions; they share a
small fake API in `routers/api.ts`.

### React Router

React Router is the oldest and most widely used React router. Version 8 (released in June 2026) continues the shape
introduced in v7, which merged Remix into React Router. You pick one of three modes:

- **Declarative mode**: `<BrowserRouter>`, `<Routes>` and `<Route>` elements. Routing only, no data
  loading. The React course's [last chapter](../learn-react/20-where-next.md) introduces it.
- **Data mode**: routes are objects passed to `createBrowserRouter`, and each route can have a `loader`
  and an `action`.
- **Framework mode**: React Router's Vite plugin adds file conventions, server rendering and type
  generation. It is a meta-framework, covered in
  [Chapter 18](18-meta-frameworks-and-rendering.md).

`examples/ch16/routers/react-router.tsx`
```tsx
import { createBrowserRouter, Link, Outlet, useLoaderData } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { fetchTask, fetchTasks } from './api.ts'

function Layout() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> <Link to="/tasks">Tasks</Link>
      </nav>
      <Outlet />
    </>
  )
}

function TaskList() {
  const tasks = useLoaderData<typeof tasksLoader>()
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <Link to={task.id}>{task.title}</Link>
        </li>
      ))}
    </ul>
  )
}

function TaskPage() {
  const task = useLoaderData<typeof taskLoader>()
  return <h1>{task.title}</h1>
}

const tasksLoader = () => fetchTasks()

async function taskLoader({ params }: { params: { id?: string } }) {
  const task = await fetchTask(params.id ?? '')
  if (!task) throw new Response('Not found', { status: 404 })
  return task
}

// Data mode: the router owns the URL *and* loads each page's data
// before rendering it.
const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <h1>Home</h1> },
      { path: 'tasks', loader: tasksLoader, Component: TaskList },
      { path: 'tasks/:id', loader: taskLoader, Component: TaskPage },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
```

Since v8 there is no `react-router-dom` package: everything is imported from `react-router`, with
DOM-specific pieces such as `RouterProvider` in `react-router/dom`. Version 8 also requires an
ESM-capable setup and React 19.2 or later.

### TanStack Router

TanStack Router is built around type safety. Route paths, params, loader data and search params all
carry types, so `<Link to="/tasks" search={{ filter: 'active' }}>` fails to compile if the route does not
exist or the filter is not a valid value. It treats search params as first-class, validated state rather
than strings.

`examples/ch16/routers/tanstack-router.tsx`
```tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fetchTasks, type Filter } from './api.ts'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <nav>
        <Link to="/tasks" search={{ filter: 'active' }}>
          Active tasks
        </Link>
      </nav>
      <Outlet />
    </>
  ),
})

const filters: readonly Filter[] = ['all', 'active', 'done']

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  // Search params are validated and typed, like route params.
  validateSearch: (search: Record<string, unknown>): { filter: Filter } => ({
    filter: filters.find((f) => f === search.filter) ?? 'all',
  }),
  loader: () => fetchTasks(),
  component: function TaskList() {
    const { filter } = tasksRoute.useSearch()
    const tasks = tasksRoute.useLoaderData()
    const shown = tasks.filter((task) => filter === 'all' || task.done === (filter === 'done'))
    return (
      <ul>
        {shown.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    )
  },
})

const router = createRouter({ routeTree: rootRoute.addChildren([tasksRoute]) })

// Registering the router makes every <Link to> and search object type-checked.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return <RouterProvider router={router} />
}
```

This example uses code-based routes. Most TanStack Router projects use its file-based routing plugin
instead, which generates the route tree from `src/routes/`. TanStack Start, its meta-framework, is
covered in [Chapter 18](18-meta-frameworks-and-rendering.md).

### Vue Router

Vue Router is Vue's official router. Routes map paths to components, `<RouterLink>` renders links and
`<RouterView>` is the outlet.

`examples/ch16/routers/vue-router.ts`
```ts
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/tasks', component: () => import('./pages/TaskList.vue') },
    // props: true passes :id to the component as a prop.
    { path: '/tasks/:id', component: () => import('./pages/TaskPage.vue'), props: true },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
})

// main.ts: createApp(App).use(router).mount('#app')
// App.vue: <RouterLink to="/tasks">Tasks</RouterLink> <RouterView />
```

Vue Router 5 merged the former `unplugin-vue-router` into the core package. With its Vite plugin, routes
come from files in `src/pages/` (`src/pages/tasks/[id].vue` becomes `/tasks/:id`) and route names and
params are typed. Version 5 also ships experimental data loaders. Nuxt, Vue's meta-framework, builds its
routing on Vue Router.

### Angular Router

Angular's router is part of the platform, configured with a `Routes` array and `provideRouter`:

`examples/ch16/routers/angular-routes.ts`
```ts
import type { ActivatedRouteSnapshot, Routes } from '@angular/router'
import { fetchTask } from './api.ts'

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/angular-pages.ts').then((m) => m.HomePage) },
  {
    path: 'tasks/:id',
    loadComponent: () => import('./pages/angular-pages.ts').then((m) => m.TaskPage),
    // A resolver loads data before the route activates.
    resolve: { task: (route: ActivatedRouteSnapshot) => fetchTask(route.paramMap.get('id') ?? '') },
  },
  { path: '**', redirectTo: '' },
]

// app.config.ts: providers: [provideRouter(routes, withComponentInputBinding())]
// With component input binding, TaskPage receives `id` and `task` as inputs.
```

`loadComponent` makes a route lazy. Resolvers load data before the route activates, guards (`canActivate`,
`canMatch` and others) decide whether navigation may proceed, and with `withComponentInputBinding()` the
router passes route params and resolved data to the component as inputs. Analog, the Angular
meta-framework, adds file-based routing on top.

### The others

Svelte has no standalone router from the Svelte team: routing comes with SvelteKit. Solid has
`@solidjs/router`, which also powers SolidStart. Preact's `preact-iso` includes a small router with lazy
loading. Lit apps often use `@lit-labs/router` or a framework-free router. Mithril ships its own router,
shown in [Chapter 10](10-mithril-and-the-minimalists.md).

### File-based routing in meta-frameworks

Meta-frameworks generate the route table from the file system, so adding a page means adding a file. The
conventions differ in the details:

| Framework | File for `/tasks/:id` |
|---|---|
| Next.js (App Router) | `app/tasks/[id]/page.tsx` |
| Nuxt | `pages/tasks/[id].vue` |
| SvelteKit | `src/routes/tasks/[id]/+page.svelte` |
| SolidStart | `src/routes/tasks/[id].tsx` |
| Astro | `src/pages/tasks/[id].astro` |
| TanStack Router / Start | `src/routes/tasks/$id.tsx` |
| Vue Router 5 (file routes) | `src/pages/tasks/[id].vue` |
| Analog | `src/app/pages/tasks/[id].page.ts` |

React Router's framework mode uses a `routes.ts` configuration file by default, with an optional helper
for file-system routes. File-based routing pairs a page with its loader and its layout, which is why
meta-frameworks favor it. [Chapter 18](18-meta-frameworks-and-rendering.md) covers what those loaders do
on the server.

### The URL is state too

The router turns the path into state. The query string is state as well, and it is the most underused
kind. A filter, a sort order, a search term or a tab kept in `?filter=active` survives a reload, works with
Back and Forward, and can be shared as a link, with no store and no persistence code.

The rule is the same as for server state: keep one source of truth. Read the value from the URL every
time you render, and change it by navigating. Do not copy it into a store and then try to keep the two in
sync. TanStack Router's validated search params, React Router's `useSearchParams`, Vue Router's
`route.query` and Angular's `queryParamMap` are all ways to follow that rule. Exercise 3 does it with no
library: `URLSearchParams`, `history.pushState` and the `popstate` event.

## Forms

Form state is local, short-lived and fiddly: values, which fields were touched, which are dirty,
validation errors, and whether a submit is in flight. Every framework can bind inputs to state on its own
(`v-model`, `bind:value`, controlled inputs, `[(ngModel)]`), and plain HTML forms with `FormData` go a long
way, as the React course shows in [Chapter 9](../learn-react/09-forms.md). Libraries help with large forms,
complex validation and arrays of fields.

- **React Hook Form** registers inputs and reads them from the DOM, so typing does not re-render the whole
  form.
- **TanStack Form** is headless and type-safe, with adapters for React, Vue, Angular, Solid, Svelte and Lit.
  Field names and values are inferred from the default values.
- **Angular signal forms** (`@angular/forms/signals`) build a form from a signal holding the model:
  `form(signal({ title: '' }))`. Validation rules are functions in a schema, and field state such as
  `valid()` and `touched()` is exposed as signals. Introduced as experimental in Angular 21, the API is
  marked public and stable from v22. Reactive forms and template-driven forms remain supported.
- **Superforms** for SvelteKit validates on the server and the client from one schema and keeps working
  without JavaScript, which suits SvelteKit's form actions.
- **VeeValidate** is the long-standing Vue form library, with a composable API (`useForm`, `useField`) and
  schema validation.

Most of these accept a schema from a validation library such as Zod or Valibot, often through Standard
Schema, a shared interface that lets a form library accept any compliant validator. Write the schema once
and use it for the form, the API request and the server handler.

## Choosing

A short checklist, in the order the questions usually come up:

1. **Is it server data?** Use a query cache (TanStack Query, SWR, RTK Query, Pinia Colada) or your router's
   loaders. Do not copy it into a client store.
2. **Should it survive a reload or a shared link?** Put it in the URL.
3. **Is it one form?** Keep it in the form, with a library if the form is large.
4. **Is it used by one component, or a parent and its children?** Keep it local and pass it down.
5. **What remains** is shared client state. Use your framework's idiom first: a module of signals in Vue,
   Svelte, Solid, Angular or Preact; context or a small store in React. When that strains, pick the
   library that matches your framework and team: Pinia for Vue; Zustand or Jotai for React, or Redux
   Toolkit when you want strict, logged, centralized updates; NgRx Signal Store for large Angular apps;
   nanostores when several frameworks must share it.

Whatever you pick, keep components unaware of where state lives by wrapping access in a custom hook,
composable or service. Then you can change the store later without touching every component.

## Summary

- Sort state into five kinds: local, shared client, server, URL and form. Each has a natural home.
- Signal-based frameworks share state with a module-level reactive value; React needs
  `useSyncExternalStore`, which every React store library uses internally.
- Redux Toolkit centralizes updates through actions and reducers; Zustand is a minimal store with a hook;
  Jotai composes atoms; Pinia is Vue's official store; NgRx Signal Store composes features into an
  injectable signal store; Svelte shares state through `.svelte.ts` modules; Solid stores are nested,
  fine-grained proxies; Preact Signals work outside Preact.
- Libraries differ in when subscribers run: immediately or not, and on every update or only on real
  changes. Derived values that compare results skip no-op updates.
- A framework-agnostic store such as nanostores can be shared by React, Vue and plain DOM code on one
  page.
- Server state is a cache: TanStack Query dedupes requests, serves fresh data from the cache, shows stale
  data while it revalidates, and refetches what you invalidate. Its `staleTime` defaults to 0.
- Routers map URLs to nested layouts and pages, lazy-load page code and can load data before rendering.
  React Router has three modes, TanStack Router types everything including search params, Vue Router 5
  includes file-based routing, and Angular's router uses resolvers and guards.
- Keep filters and other shareable view state in the URL, read it on every render and change it by
  navigating.
- Form libraries (React Hook Form, TanStack Form, Angular signal forms, Superforms, VeeValidate) handle
  field state and schema validation for large forms.

## Exercises

1. **Classify the state.** A recipe site has: the recipe list from the API; the text typed into the
   search box; the selected cuisine filter; whether the "share" popover is open; the user's saved recipes
   (stored on the server); a draft review in a half-filled form; the light/dark theme. Name the kind of
   state for each and where you would keep it.

   <details><summary>Solution</summary>

   | State | Kind | Where |
   |---|---|---|
   | Recipe list | server | a query cache keyed by the filter, or a route loader |
   | Search text while typing | local | the search component; commit it to the URL on submit or after a debounce |
   | Cuisine filter | URL | `?cuisine=thai`, so reload, Back and shared links work |
   | Share popover open | local | the component that owns the popover |
   | Saved recipes | server | the query cache; saving invalidates or updates that key |
   | Draft review | form | the form, perhaps also in `sessionStorage` if losing it would hurt |
   | Theme | shared client | a small store or context, persisted to `localStorage` |

   Only the theme needs a client store. Everything else has a better home.

   </details>

2. **Write the smallest store.** Write `createStore(initial)` returning `get`, `set` and `subscribe`
   (which returns an unsubscribe function), with no library. Use it for the cart and run the same four
   steps as `stores/run.ts`. Make the final "clear again" step notify nobody.

   <details><summary>Solution</summary>

   `examples/ch16/exercises/tiny-store.ts` is the store and the cart. `set` skips the update when
   `Object.is` says nothing changed. That alone is not enough for "clear again", because `[]` and `[]` are
   different arrays. The fix is to clear to one shared empty array:

   `examples/ch16/exercises/tiny-store.ts`
   ```ts
   type Listener<T> = (value: T) => void

   // The whole idea of a store: a value, a way to change it, and a way to hear about changes.
   export function createStore<T>(initial: T) {
     let value = initial
     const listeners = new Set<Listener<T>>()
     return {
       get: () => value,
       set(next: T) {
         if (Object.is(next, value)) return
         value = next
         for (const listener of listeners) listener(value)
       },
       subscribe(listener: Listener<T>) {
         listeners.add(listener)
         return () => listeners.delete(listener)
       },
     }
   }

   // One shared empty array, so clearing an empty cart is "no change" for Object.is.
   const empty: readonly string[] = []

   export const items = createStore(empty)

   export const cart = {
     add: (name: string) => items.set([...items.get(), name]),
     clear: () => items.set(empty),
   }
   ```

   `examples/ch16/exercises/run-tiny-store.ts` subscribes, runs the four steps, unsubscribes, and adds one
   more item:

   ```console
   $ node exercises/run-tiny-store.ts
   tiny store      1 → 2 → 0
   after unsubscribe the store still works: Plum
   ```

   With `clear: () => items.set([])` the output is `1 → 2 → 0 → 0`, like Redux and Zustand. This store
   also fits React's `useSyncExternalStore(items.subscribe, items.get)` as it is.

   </details>

3. **Put the filter in the URL.** Build a page with All, Active and Done buttons over a task list, where
   the filter lives only in the URL. Reload must keep the filter, and Back must restore the previous one.
   Use no library.

   <details><summary>Solution</summary>

   `examples/ch16/url-filter.html` holds the buttons and an empty list, and
   `examples/ch16/exercises/url-filter.ts` does the work. The key parts:

   ```ts
   function currentFilter(): Filter {
     const value = new URLSearchParams(location.search).get('filter')
     return filters.find((filter) => filter === value) ?? 'all'
   }
   ```

   Clicking a button builds a new URL, calls `history.pushState(null, '', url)` and renders. A `popstate`
   listener renders again when the user presses Back or Forward, and `render()` always reads
   `currentFilter()` instead of a variable. Run `npm run dev` and open
   `http://localhost:4336/url-filter.html`. The course's Playwright check clicks Active, then Done,
   reloads, and presses Back twice, checking the pressed button and the list each time.

   </details>

4. **Skip the refetch.** In the TanStack Query demo, step 4 invalidates `['price']` and refetches. Suppose
   the save request returns the new price. Change the flow so the screen shows it with no extra request.

   <details><summary>Solution</summary>

   Write the server's answer into the cache with `setQueryData`. Every observer of that key updates, and no
   request is made:

   `examples/ch16/exercises/set-query-data.ts`
   ```ts
   import { QueryClient, QueryObserver } from '@tanstack/query-core'

   const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

   let price = 101
   let requests = 0
   async function fetchPrice(): Promise<number> {
     requests += 1
     await sleep(100)
     return price
   }

   // The mutation's response already contains the new price.
   async function savePrice(next: number): Promise<number> {
     await sleep(100)
     price = next
     return price
   }

   const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
   const observer = new QueryObserver(client, { queryKey: ['price'], queryFn: fetchPrice })
   observer.subscribe((result) => {
     if (!result.isFetching) console.log(`screen shows ${result.data}`)
   })
   await sleep(200)

   const saved = await savePrice(120)
   client.setQueryData(['price'], saved) // write the answer into the cache: no refetch
   await sleep(200)

   console.log(`requests: ${requests}`)
   observer.destroy()
   ```

   ```console
   $ node exercises/set-query-data.ts
   screen shows 101
   screen shows 120
   requests: 1
   ```

   Use `setQueryData` when the response contains the new data, and invalidation when it does not or when
   the change affects other keys too (a new task changes every task list). Optimistic updates go one step
   further: set the data before the request finishes and roll back if it fails.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-16--state-routing-and-data)
