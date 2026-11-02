# Chapter 15 — Reactivity Compared

Every framework in Parts II to IV answers the same question from
[Chapter 3](03-the-problem-frameworks-solve.md): when a piece of state changes, what in the page has to change,
and how does the framework find out? You have seen each answer from the inside, one framework at a time. This
chapter puts them side by side. It names the three families (re-render and diff, fine-grained signals, and
compiled updates), explains the ideas that separate good reactive systems from fragile ones (push and pull,
glitch-freedom, dependency tracking, ownership and cleanup, batching), and then has you build a small but
correct signals library from scratch, with tests, so that none of it stays abstract. It ends with the same
counter in nine frameworks and the status of the TC39 proposal to put signals into JavaScript itself.

After this chapter, [Chapter 16](16-state-routing-and-data.md) moves up a level, from the reactivity inside a
component to state shared across an app, routing and server data.

## One question, three answers

A counter is enough to show the differences. It has one piece of state (`count`), one derived value
(`double`, always `count * 2`), and one side effect (log `count is N` whenever it changes). The page shows a
button with the count and a paragraph with the double. When you click, three things must happen: the button
text changes, the paragraph text changes, and a line is logged. Frameworks disagree about how much work it
takes to get there.

```text
1. Re-render and diff (React, Preact, Mithril; Vue and Lit at the component level)

   click -> setState -> run the component again -> new description of the UI
                                                     |
                               compare with the previous description
                                                     |
                                    patch the DOM nodes that differ

2. Fine-grained signals (Solid, Preact Signals, Angular, Vue refs, Qwik, VanJS, Alpine)

   click -> count.set(1) -> mark everything that read count as stale
                                                     |
                     rerun only those computations: double, and the two
                     small effects that each own one DOM text node

3. Compiled updates (Svelte; Vue Vapor; Solid's JSX)

   build time: component -> compiler -> code that creates the DOM once and
                                         one update function per dynamic spot
   run time:   click -> count changes -> the generated updates for count run
```

The families overlap, and most real frameworks are hybrids. Vue tracks dependencies with signals to decide
*which component* re-renders, then diffs that component's virtual DOM. Svelte 5 compiles templates into code
that uses signals at run time. Solid uses signals for everything and a compiler to turn JSX into DOM calls.
Still, each framework has a center of gravity, and knowing it predicts how the framework behaves: what reruns
when, what is cheap and what is expensive, and which mistakes are easy to make.

## Re-render and diff

React's model, covered in [Chapter 4](04-react.md), is the simplest to state: **the UI is a function of the
state**. When state changes, React calls your component function again. The function returns a description
of what the UI should look like (React elements, often called the virtual DOM); React compares it with the
previous description and applies the differences to the real DOM. This comparison is called
**reconciliation**.

```text
   state ----> Counter() ----> element tree ----+
                                                |  diff  ---> DOM patches
               previous element tree -----------+
```

Its strengths come from that simplicity:

- **Values are plain.** `count` is a number, `double` is `count * 2` computed on every render. There is no
  wrapper to unwrap and no special syntax for derived values: any JavaScript works, and the result is always
  consistent with the state because it is recomputed from scratch.
- **No dependency tracking to get wrong.** React does not need to know what your component read. If the
  component re-renders, everything it reads is read again.
- **The unit of work is a component**, which is also the unit you think in.

The costs follow from the same choice:

- **Wasted work.** A click that changes one text node re-runs the whole component, and by default all of
  its children, then diffs their output. Most of the time this is fast enough (Chapter 19's
  [benchmarks](19-comparing-frameworks.md) put numbers on it); when it isn't, you add
  `memo`, `useMemo` and `useCallback`, or let the React Compiler add them for you.
- **Effects need dependency lists.** Because React does not track reads, `useEffect(fn, [count])` asks you
  to declare what the effect depends on, and a wrong list gives you a stale value or an extra run.
- **Closures capture a snapshot.** Each render's event handlers see that render's state. This is a
  deliberate design (state as a snapshot), but it surprises people who expect a live variable.

Preact ([Chapter 9](09-preact.md)) and Mithril ([Chapter 10](10-mithril-and-the-minimalists.md)) share this
model with smaller runtimes; Mithril simply redraws after every event handler it wraps, without needing
`setState` at all.

Lit ([Chapter 12](12-lit-and-web-components.md)) sits nearby but avoids a virtual DOM. Setting a reactive
property schedules an update; `render()` runs again and returns a template result, but lit-html already knows
where the dynamic parts of the template are (each `${}` expression), so it compares only those values with
the previous ones and touches only the parts that changed. The static parts of the template are never
compared.

## Fine-grained signals

The second family turns the question around. Instead of re-running code and comparing results, it records
**which computation read which value**, and when a value changes, it re-runs only the computations that read
it. The pieces have different names in different frameworks, but there are always three:

- a **signal** (`ref`, `$state`, `signal()`, `createSignal`, `van.state`, observable): a value that knows who
  has read it;
- a **computed** (`computed`, `$derived`, `createMemo`, `van.derive`): a cached value derived from others,
  recalculated only when one of its inputs changes;
- an **effect** (`watchEffect`, `$effect`, `effect`, `createEffect`): a function that does something
  outside the graph, such as updating the DOM or logging, whenever its inputs change.

Together they form a **dependency graph**. For the counter:

```text
                 count            (signal)
                /     \
               /       \
          double        \         (computed)
             |           \
             v            v
   effect: <p> text    effect: button text    effect: console.log
```

When `count` changes, the graph says exactly what to do: recompute `double`, then rerun the three effects
that depend, directly or through `double`, on `count`. Nothing else runs. In Solid
([Chapter 8](08-solid.md)) the component function itself runs only once, to build the DOM and set up this
graph; afterwards the graph does all the updating, so there is nothing to diff. Steve Sanderson described the
key property when he introduced Knockout in 2010:

> You don’t have to configure this – it’s inferred from your code execution, even if you have chains of
> observables referencing other observables.
>
> — Steve Sanderson, "Introducing Knockout, a UI library for JavaScript" (2010)

The strengths of this family:

- **Work proportional to the change.** One changed value updates the nodes that show it, whether the
  component has three elements or three thousand.
- **No dependency lists.** Effects and computeds subscribe to what they actually read, every time they run.
- **State can live anywhere.** A signal is an ordinary object, so the same reactive state works inside a
  component, in a module shared by many components, or in a plain test with no DOM.

And the costs:

- **Reads must be tracked.** A signal has to be read through a function call or property access
  (`count()`, `count.value`, `count.get()`) so the library can see the read. Svelte hides this behind a
  compiler; other frameworks make you write it. Destructuring a value out of a signal, or reading it outside
  a tracking scope, loses reactivity, and this is the most common bug in signal-based code.
- **Mutations can slip past.** Changing an object or array *inside* a signal, without telling the signal,
  updates nothing (Exercise 4 shows it). Vue and Svelte 5 wrap objects in proxies to catch such mutations;
  Solid, Preact Signals, Angular and VanJS expect you to replace the value.
- **Lifetimes need managing.** Effects hold subscriptions; something must dispose of them when the UI that
  created them goes away (see "Ownership and cleanup" below).

## Compiled updates

The third family moves work from run time to build time. A compiler reads a component and can see, before
the code ever runs, which parts of the template are static and which expressions are dynamic. It can then
generate code that creates the DOM once and updates each dynamic spot directly, with no virtual DOM and
little runtime library.

Svelte ([Chapter 6](06-svelte.md)) made this its identity. Svelte 3 and 4 tracked changes at compile time:
assigning to a top-level `let` made the compiler insert an "invalidate" call, and the generated update code
checked a bitmask of what had changed. Svelte 5 kept the compiler but switched the run-time model to signals
(runes): `$state` compiles to a signal, `$derived` to a computed, and each dynamic part of the template to a
small effect. The TC39 proposal's README notes that this is what Svelte 5 does internally, with its own
signals library.

Compilation shows up in other places too. Solid's compiler turns JSX into `template` cloning and one effect
per expression. Vue's template compiler marks static content and dynamic "patch flags" so the diff can skip
what cannot change, and Vue's upcoming **Vapor mode** (3.6, in release candidate in November 2026) compiles
templates straight to DOM operations driven by signals, with no virtual DOM. Angular compiles templates to
instruction functions. Even React now has a compiler, though it does something different: it memoizes
values and JSX so that re-rendering does less work, without changing React's model.

The trade-offs of compilation are mostly about tooling. You need the build step (Svelte and Vapor components
are not valid JavaScript; [Chapter 17](17-build-tools.md) covers the tools), source maps and editor plugins have to understand the language, and some
behavior is decided by the compiler in ways that are not visible in your code. In exchange you get small
output and precise updates.

## The vocabulary of reactivity

The families differ in where the work happens. The ideas below are what separate reactive systems that stay
correct and predictable from ones that show stale values, flicker or leak. They apply most directly to
signals, but you have met each of them in some form in every framework chapter.

### Dependency tracking

**Automatic dependency tracking** is the trick that makes signals feel automatic. While a computed or an
effect runs, the library keeps a global pointer to it (the "current observer"). Every signal read checks the
pointer: if something is running, the signal adds it to its list of observers, and the running computation
adds the signal to its list of sources. When the function finishes, its dependencies are exactly the signals
it read.

Tracking is **dynamic**: it is redone on every run. If an effect reads `details` only when `showDetails` is
true, then while `showDetails` is false, changes to `details` do not rerun it. Re-tracking on every run keeps
the graph minimal, at the cost of some bookkeeping.

The alternatives are explicit dependencies (React's effect dependency arrays, Vue's `watch(source, fn)`,
Backbone's `listenTo`) and checking everything (AngularJS's digest, and in a sense React's re-render, which
reads everything again). Explicit dependencies are clear but can drift out of date; checking everything is
simple but scales with the size of the page rather than the size of the change.

### Push, pull and push-pull

There are two directions information can flow through a dependency graph.

- **Push**: when a signal changes, it immediately recomputes its dependents, which recompute theirs, and so
  on down the graph. Early observable libraries and event emitters worked this way.
- **Pull**: nothing happens when a signal changes. When someone *reads* a derived value, it recomputes from
  its sources. This is lazy and never wastes work on values nobody reads, but on its own it cannot tell you
  *when* to read: something has to poll. Dirty checking and re-rendering are pull-based in this sense.

Modern signal libraries use **push-pull**: push a cheap notification ("you might be stale") down the graph,
then pull values on demand, recomputing only what is both stale and needed. Ryan Carniato, describing how
MobX introduced the approach to JavaScript UI libraries:

> Notification of changes are pushed out but the execution of the derived state was deferred to where it was
> read.
>
> — Ryan Carniato, "The Evolution of Signals in JavaScript" (2023)

Solid, Preact Signals, Vue, Angular, Svelte 5, alien-signals, the TC39 proposal and the library you will
build below are all push-pull. The push phase only sets flags and queues effects; it never runs user code.
The pull phase runs effects, and each effect pulls the values it reads, which recompute in dependency order.

### Glitches and the diamond

A **glitch** is a moment when some code sees a half-updated graph: one input already new, another still old.
The classic case is a **diamond**, where two computeds depend on the same signal and a third depends on
both:

```text
            a = 1                 a.set(2)
           /     \
     b = a * 2   c = a + 10       b: 2 -> 4      c: 11 -> 12
           \     /
         d = `${b}+${c}`          d should go "2+11" -> "4+12", never "4+11"
```

With naive eager push, changing `a` notifies `b`, which recomputes and immediately notifies `d`, which
recomputes while `c` is still old. Here is a deliberately naive implementation, in which every change is
forwarded the moment it happens:

`examples/ch15/naive.ts`
```ts
// Eager push with no ordering: every change is forwarded immediately.
type Listener = () => void

function cell<T>(value: T) {
  const listeners: Listener[] = []
  return {
    get: () => value,
    set(next: T) { value = next; for (const listener of listeners) listener() },
    subscribe(listener: Listener) { listeners.push(listener) },
  }
}

function derived<T>(deps: { subscribe(l: Listener): void }[], fn: () => T) {
  const result = cell(fn())
  for (const dep of deps) dep.subscribe(() => result.set(fn()))
  return result
}

const a = cell(1)
const b = derived([a], () => a.get() * 2)
const c = derived([a], () => a.get() + 10)
const d = derived([b, c], () => `${b.get()}+${c.get()}`)
d.subscribe(() => console.log('d =', d.get()))

a.set(2)
```

```console
$ node naive.ts
d = 4+11
d = 4+12
```

`d` passed through `4+11`, a value that never corresponds to any real state of `a`, and the effect logged it.
In a UI that is a flicker of wrong data; if the effect sends a request or the computation divides by a value
that is briefly zero, it is a real bug. `d` was also computed twice for one change.

A glitch-free library makes sure that when any code reads `d`, both `b` and `c` are already current, and that
`d` is computed once per change. Push-pull does this naturally: the push phase only marks `b`, `c`, `d` and
the effect as stale; when the effect then pulls `d`, `d` pulls `b` and `c` first. The same diamond with the
library from this chapter:

`examples/ch15/diamond.ts`
```ts
import { signal, computed, effect } from './signals.ts'

const a = signal(1)
const b = computed(() => a.get() * 2)
const c = computed(() => a.get() + 10)
const d = computed(() => `${b.get()}+${c.get()}`)
effect(() => console.log('d =', d.get()))

a.set(2)
```

```console
$ node diamond.ts
d = 2+11
d = 4+12
```

The first line is the effect's initial run; the second is the single update after `a.set(2)`. No `4+11`.

### Equality and cutoff

If a computed recalculates and gets the same value as before, nothing downstream needs to run. This
**equality cutoff** is what makes derived state cheap: `isEven` may recompute on every change to `n`, but the
effects that show it rerun only when it flips. Signal libraries compare with `===` or `Object.is` by default
and let you pass a custom `equals` (Angular, Solid, the TC39 proposal). Cutoff is also why glitch-freedom
needs the "might be stale" flag rather than a plain "stale" one: a node downstream of a recomputed computed
does not know whether that computed's value actually changed until it asks.

### Batching and scheduling

Change two signals in a row and, with synchronous effects, every effect that reads both runs twice, once with
a half-updated pair. **Batching** groups writes so that effects run once at the end. Libraries expose it as
`batch` (Solid, Preact Signals) or make it implicit by **scheduling** effects instead of running them during
`set`:

- Vue queues component updates and most watchers and flushes them in a microtask.
- Svelte 5 runs `$effect` after the DOM has been updated, in a microtask.
- Angular runs effects as part of its change-detection pass, which signal writes schedule.
- VanJS runs `van.derive` derivations asynchronously, in a microtask, after the current code finishes.
- React batches state updates (since React 18, everywhere, not only in event handlers) and runs `useEffect`
  after the DOM changes have been committed.

The TC39 proposal deliberately leaves scheduling to frameworks; more on that at the end of the chapter.

### Ownership and cleanup

Effects subscribe to signals, and subscriptions keep things alive. If a component creates an effect and the
component is removed from the page, the effect must be **disposed** (unsubscribed), or it keeps running
against DOM that no longer exists and keeps everything it references in memory.

Signal libraries solve this with **ownership**: every effect created while another computation is running is
*owned* by it. When the owner reruns or is disposed, it first disposes everything it owns. A component's
render effect owns the effects of its children, so removing a subtree disposes all of its effects in one
step. S.js introduced the idea, and Solid's `createRoot` and `onCleanup`, Vue's `effectScope`, and Angular's
injection context and `DestroyRef` are all versions of it. Effects can also return or register a
**cleanup function** that runs before each rerun and on disposal: clear a timer, close a socket, remove a
listener. Component-based frameworks without signals reach the same goal through the component lifecycle
(React's effect cleanup, Lit's `disconnectedCallback`).

## Building a signals library

All of the above fits in a small amount of code. The library in `examples/ch15/signals.ts` has four exports:

- `signal(value)` returns `{ get, set }`.
- `computed(fn)` returns `{ get }`, a cached derived value.
- `effect(fn)` runs `fn` now and whenever its dependencies change, and returns a function that disposes it.
  `fn` may return a cleanup function.
- `batch(fn)` runs `fn` and defers effects until it returns.

It has automatic, dynamic dependency tracking, push-pull evaluation, glitch-free diamonds, equality cutoff,
batching, cleanup and ownership. It is 91 lines including comments and blank lines, about 75 without them,
somewhat more than the 60 often quoted for a toy version, because ownership and cleanup are included. It is
for learning: it uses `get`/`set` objects rather than any framework's syntax, so you can map it onto all of
them.

`examples/ch15/signals.ts`
```ts
// A tiny push-pull signals library, for learning only.
const CLEAN: number = 0, CHECK: number = 1, DIRTY: number = 2 // CHECK: a source *might* have changed

interface Node {
  value: unknown
  fn?: () => unknown // computeds and effects have a function; signals don't
  isEffect: boolean
  state: number
  sources: Set<Node>
  observers: Set<Node>
  cleanups: (() => void)[]
}

let tracking: Node | undefined // the computed or effect that is running now
let batchDepth = 0
const queue = new Set<Node>() // effects waiting to run

function node(value: unknown, fn?: () => unknown, isEffect = false): Node {
  return { value, fn, isEffect, state: fn ? DIRTY : CLEAN, sources: new Set(), observers: new Set(), cleanups: [] }
}

function read(n: Node): unknown {
  if (tracking) { n.observers.add(tracking); tracking.sources.add(n) } // automatic dependency tracking
  update(n)
  return n.value
}

function write(n: Node, value: unknown): void {
  if (Object.is(n.value, value)) return
  n.value = value
  for (const o of n.observers) mark(o, DIRTY) // push: dependents are now stale
  if (batchDepth === 0) flush()
}

function mark(n: Node, state: number): void {
  if (n.state >= state) return
  const wasClean = n.state === CLEAN
  n.state = state
  if (n.isEffect) queue.add(n)
  if (wasClean) for (const o of n.observers) mark(o, CHECK)
}

function update(n: Node): void { // pull: bring n up to date, rerunning it only if a source really changed
  if (n.state === CHECK) for (const s of n.sources) { update(s); if (n.state === DIRTY) break }
  if (n.state === DIRTY) run(n)
  n.state = CLEAN
}

function run(n: Node): void {
  unlink(n)
  const outer = tracking
  tracking = n
  let value: unknown
  try { value = n.fn!() } finally { tracking = outer }
  if (n.isEffect) { if (typeof value === 'function') n.cleanups.push(value as () => void) }
  else if (!Object.is(value, n.value)) { n.value = value; for (const o of n.observers) o.state = DIRTY }
}

function unlink(n: Node): void { // run cleanups (and dispose child effects), forget old dependencies
  for (const cleanup of n.cleanups.splice(0)) cleanup()
  for (const s of n.sources) s.observers.delete(n)
  n.sources.clear()
}

function flush(): void {
  batchDepth++
  try { for (const e of queue) { queue.delete(e); update(e) } } finally { batchDepth-- }
}

export function signal<T>(value: T) {
  const n = node(value)
  return { get: () => read(n) as T, set: (next: T) => write(n, next) }
}

export function computed<T>(fn: () => T) {
  const n = node(undefined, fn)
  return { get: () => read(n) as T }
}

export function effect(fn: () => void | (() => void)): () => void {
  const n = node(undefined, fn, true)
  const dispose = () => { unlink(n); queue.delete(n) }
  update(n)
  tracking?.cleanups.push(dispose) // ownership: a parent rerun disposes this effect
  return dispose
}

export function batch<T>(fn: () => T): T {
  batchDepth++
  try { return fn() } finally { if (--batchDepth === 0) flush() }
}
```

### How it works

Every signal, computed and effect is a `Node` in one graph. `sources` are the nodes it read last time;
`observers` are the nodes that read it. Each node has a `state`, the "color" used by the push-pull
algorithm (this three-state scheme follows the Reactively library's hybrid push-pull design):

- `CLEAN`: the value is current.
- `CHECK`: something further upstream changed, so this node *might* be stale. Find out before using it.
- `DIRTY`: a direct source changed. Rerun.

**Reading** (`read`) does the tracking: if a computed or effect is running (`tracking`), link the two nodes.
Then it calls `update` so the reader always gets a current value.

**Writing** (`write`) is the push phase. If the value is unchanged (`Object.is`), stop. Otherwise mark the
direct observers `DIRTY`. `mark` spreads `CHECK` further down the graph, but only the first time a node
leaves `CLEAN`, so each node is visited once per change. Effects that get marked are added to `queue`.
Unless a batch is open, `flush` then runs the queue. No user code runs during marking.

**Updating** (`update`) is the pull phase. A `CHECK` node updates its sources in order; if any of them really
changed, that source's `run` sets this node to `DIRTY`, and the loop stops early. A `DIRTY` node reruns. Then
it is `CLEAN`. A `CHECK` node whose sources all turned out unchanged becomes `CLEAN` without running: that is
equality cutoff.

**Running** (`run`) calls `unlink` first, which runs any cleanups and forgets the node's old sources, then
runs `fn` with `tracking` pointing at the node, so the reads inside rebuild the dependency list from scratch.
For a computed, if the new value differs, it marks its direct observers `DIRTY`. For an effect, a function
return value is stored as a cleanup.

**Ownership** is one line in `effect`: when an effect is created while another computation is running,
its `dispose` is pushed onto the parent's `cleanups`. The next time the parent reruns (or is disposed),
`unlink` calls it. **Batching** is a counter: while `batchDepth` is above zero, `write` does not flush, and
`flush` itself holds the counter up while it runs, so writes made by effects are queued rather than nested.

Here is the diamond traced through those states when `a` goes from 1 to 2:

```text
push (a.set(2))                     pull (flush -> update(effect))
---------------                     ------------------------------
a.value = 2                         effect is CHECK: update its source d
b: CLEAN -> DIRTY                     d is CHECK: update its first source b
  d: CLEAN -> CHECK                     b is DIRTY: run b -> 4 (changed) -> d DIRTY
    effect: CLEAN -> CHECK, queued      d is DIRTY: stop checking, run d
c: CLEAN -> DIRTY                         d reads b (CLEAN, 4)
  d already CHECK: stop                   d reads c: c is DIRTY: run c -> 12
                                          d = "4+12" (changed) -> effect DIRTY
                                    effect is DIRTY: run it -> logs "d = 4+12"
```

`b`, `c`, `d` and the effect each ran once, in an order where every read saw current values.

### Testing it

The tests use Node's built-in test runner. Node 26 runs TypeScript files directly by stripping the type
annotations (types are not checked; `npm run typecheck` runs `tsc` for that), so there is no build step.

`examples/ch15/signals.test.ts`
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signal, computed, effect, batch } from './signals.ts'

test('computed derives from a signal and stays current', () => {
  const count = signal(1)
  const double = computed(() => count.get() * 2)
  assert.equal(double.get(), 2)
  count.set(5)
  assert.equal(double.get(), 10)
})

test('effect runs once now, then after every real change', () => {
  const count = signal(0)
  const seen: number[] = []
  effect(() => { seen.push(count.get()) })
  count.set(1)
  count.set(1) // same value: no notification
  count.set(2)
  assert.deepEqual(seen, [0, 1, 2])
})

test('diamond: no glitch, each node recomputes once', () => {
  //      a
  //     / \
  //    b   c
  //     \ /
  //      d
  const a = signal(1)
  let runs = 0
  const b = computed(() => a.get() * 2)
  const c = computed(() => a.get() + 10)
  const d = computed(() => { runs++; return `${b.get()}+${c.get()}` })
  const seen: string[] = []
  effect(() => { seen.push(d.get()) })
  a.set(2)
  assert.deepEqual(seen, ['2+11', '4+12']) // never "4+11" (half-updated)
  assert.equal(runs, 2)
})

test('an unchanged computed value stops propagation', () => {
  const n = signal(2)
  const isEven = computed(() => n.get() % 2 === 0)
  let runs = 0
  effect(() => { isEven.get(); runs++ })
  n.set(4) // isEven is still true
  assert.equal(runs, 1)
  n.set(5)
  assert.equal(runs, 2)
})

test('batch: many writes, one effect run', () => {
  const first = signal('Ada')
  const last = signal('Lovelace')
  const seen: string[] = []
  effect(() => { seen.push(`${first.get()} ${last.get()}`) })
  batch(() => {
    first.set('Grace')
    last.set('Hopper')
  })
  assert.deepEqual(seen, ['Ada Lovelace', 'Grace Hopper'])
})

test('dependencies are dynamic: only what was read last time counts', () => {
  const showDetails = signal(false)
  const details = signal('x')
  let runs = 0
  effect(() => { runs++; if (showDetails.get()) details.get() })
  details.set('y') // not read in the last run
  assert.equal(runs, 1)
  showDetails.set(true)
  details.set('z')
  assert.equal(runs, 3)
})

test('cleanup runs before a rerun and on dispose', () => {
  const id = signal(1)
  const log: string[] = []
  const dispose = effect(() => {
    const current = id.get()
    log.push(`start ${current}`)
    return () => log.push(`stop ${current}`)
  })
  id.set(2)
  dispose()
  id.set(3) // disposed: nothing happens
  assert.deepEqual(log, ['start 1', 'stop 1', 'start 2', 'stop 2'])
})

test('ownership: a rerun disposes the effects created inside it', () => {
  const outer = signal(0)
  const inner = signal(0)
  let innerRuns = 0
  effect(() => {
    outer.get()
    effect(() => { inner.get(); innerRuns++ })
  })
  outer.set(1) // the first inner effect is disposed, a new one created
  inner.set(1) // only the live inner effect reruns
  assert.equal(innerRuns, 3)
})
```

```console
$ npm test

> test
> node --test

✔ computed derives from a signal and stays current (0.739509ms)
✔ effect runs once now, then after every real change (0.445441ms)
✔ diamond: no glitch, each node recomputes once (0.188526ms)
✔ an unchanged computed value stops propagation (0.142461ms)
✔ batch: many writes, one effect run (0.131488ms)
✔ dependencies are dynamic: only what was read last time counts (0.100511ms)
✔ cleanup runs before a rerun and on dispose (0.110234ms)
✔ ownership: a rerun disposes the effects created inside it (0.109145ms)
✔ untrack reads the current value without subscribing (0.92652ms)
✔ tracking resumes after untrack returns (0.174395ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 81.965474
```

`node --test` finds every `*.test.ts` file in the folder, including the two `untrack` tests from Exercise 2's
solution in `solutions/`.

### What a real library adds

The toy is correct for the cases it tests, and it leaves out things production libraries spend most of
their code on:

- **Unobserved computeds.** A computed read outside any effect stays subscribed to its sources forever.
  Real libraries unlink a computed when its last observer goes away and treat it as lazy until it is read
  again, so a discarded computed can be garbage-collected.
- **Errors.** If `fn` throws, a real library records the error, keeps the graph consistent and rethrows on
  the next read. Here an exception leaves the node half-updated.
- **Writes during effects.** An effect that writes a signal it also reads does not rerun itself here (it is
  marked `CLEAN` when it finishes). Libraries differ here: some rerun the effect, some report a possible
  infinite loop.
- **Performance.** `Set`s are convenient but slow; libraries such as alien-signals (which Vue 3.6 builds on)
  and Preact Signals use linked lists and version numbers to avoid allocations and to make the common
  "nothing changed" check cheap.
- **Untracked reads and scheduling.** `untrack` (Exercise 2) and a scheduler for effects (Exercise 3 shows a
  microtask scheduler) are standard.

## A DOM counter with the library

Effects are how signals reach the DOM. Each effect below owns exactly one piece of output, which is what a
fine-grained framework's compiled template does for you.

`examples/ch15/counter.html`
```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Signals counter</title>
<button type="button" id="increment">Count: 0</button>
<p id="double">Double: 0</p>
<script type="module" src="./counter.ts"></script>
```

`examples/ch15/counter.ts`
```ts
import { signal, computed, effect } from './signals.ts'

const count = signal(0)
const double = computed(() => count.get() * 2)

const button = document.querySelector<HTMLButtonElement>('#increment')!
const output = document.querySelector<HTMLParagraphElement>('#double')!

// Each effect is a precise DOM update: it reruns only when what it read changes.
effect(() => { button.textContent = `Count: ${count.get()}` })
effect(() => { output.textContent = `Double: ${double.get()}` })
effect(() => { console.log('count is', count.get()) })

button.addEventListener('click', () => count.set(count.get() + 1))
```

Browsers do not run TypeScript, so the example has a twenty-line server that strips types on the fly, using
the same `stripTypeScriptTypes` function Node uses for its own type stripping. It listens on port 4335 (the
course uses 4320 plus the chapter number):

`examples/ch15/serve.ts`
```ts
// Serves this folder on http://localhost:4335/ and strips TypeScript types so the browser can run .ts files.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { extname, join } from 'node:path'

const types: Record<string, string> = { '.html': 'text/html', '.ts': 'text/javascript' }

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const file = join(import.meta.dirname, path === '/' ? 'counter.html' : path)
  const type = types[extname(file)]
  try {
    if (!type) throw new Error('unsupported file type')
    let body = await readFile(file, 'utf8')
    if (extname(file) === '.ts') body = stripTypeScriptTypes(body)
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }).end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(4335, () => console.log('Serving http://localhost:4335/'))
```

```console
$ npm start

> start
> node serve.ts

Serving http://localhost:4335/
(node:427957) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
```

Open `http://localhost:4335/` and click the button twice. The button shows `Count: 2`, the paragraph shows
`Double: 4`, and the browser console shows `count is 0`, `count is 1`, `count is 2`. (This was checked with
Playwright in headless Chromium.) Stop the server with Ctrl+C.

Notice what does *not* happen on a click: no function rebuilds the button or the paragraph, and nothing is
compared. `count.set` marks two effects and a computed, the effects rerun, and each assigns one
`textContent`.

## The same counter in nine frameworks

Here is the counter (state `count`, derived `double`, an effect logging `count is N`) in each framework the
course covers that has client-side reactivity. Each snippet was built with the versions below and clicked
twice in headless Chromium; every one showed `Count: 2` and `Double: 4` and logged `count is 0`, `count is 1`
and `count is 2`: react 19.3.1, vue 3.5.44, svelte 5.57.3, @angular/core 22.2.4, solid-js 1.9.18,
preact 11.1.1 with @preact/signals 2.11.4, lit 3.3.3, alpinejs 3.17.5 and vanjs-core 1.6.2. The interesting
part is not the syntax but the comment above each: what reruns when you click.

**React.** The component function reruns; `double` is recomputed as a plain value; React diffs the result and
updates two text nodes; the effect runs after the commit because `count` is in its dependency list.

```tsx
import { useEffect, useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  const double = count * 2 // derived: recalculated on every render

  useEffect(() => {
    console.log('count is', count)
  }, [count])

  return (
    <>
      <button type="button" onClick={() => setCount(count + 1)}>Count: {count}</button>
      <p>Double: {double}</p>
    </>
  )
}
```

**Vue** ([Chapter 5](05-vue.md)). `count` is a `ref` (a signal), `double` a cached `computed`, and `watchEffect` tracks what it reads.
The component's render is itself an effect: when `count` changes, Vue schedules that one component to
re-render and diffs its virtual DOM. In the template, refs are unwrapped, so you write `count`, not
`count.value`.

```vue
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

watchEffect(() => console.log('count is', count.value))
</script>

<template>
  <button type="button" @click="count++">Count: {{ count }}</button>
  <p>Double: {{ double }}</p>
</template>
```

**Svelte 5.** The compiler turns `$state` into a signal, `$derived` into a computed and each `{…}` in the
markup into a small effect. You read and write plain variables; the compiler inserts the `get`/`set` calls.
On a click, the two text effects and the `$effect` rerun.

```svelte
<script lang="ts">
  let count = $state(0)
  let double = $derived(count * 2)

  $effect(() => {
    console.log('count is', count)
  })
</script>

<button type="button" onclick={() => count++}>Count: {count}</button>
<p>Double: {double}</p>
```

**Angular** ([Chapter 7](07-angular.md)). Signals are functions: call `count()` to read, `set` or `update` to write. `effect` must be
created in an injection context (here, the constructor), which also ties its lifetime to the component. A
signal read in the template marks this component for checking; in a zoneless app (the default since Angular
21) the write schedules change detection, which refreshes this component's bindings.

```ts
import { Component, computed, effect, signal } from '@angular/core'

@Component({
  selector: 'app-counter',
  template: `
    <button type="button" (click)="increment()">Count: {{ count() }}</button>
    <p>Double: {{ double() }}</p>
  `,
})
export class Counter {
  count = signal(0)
  double = computed(() => this.count() * 2)

  constructor() {
    effect(() => console.log('count is', this.count()))
  }

  increment() {
    this.count.update((n) => n + 1)
  }
}
```

**Solid.** It looks like React, but `Counter` runs once. `count` is a getter function; the compiler wraps
`{count()}` and `{double()}` in their own effects, so a click updates the two text nodes and reruns the
logging effect. Nothing else runs again.

```tsx
import { createEffect, createMemo, createSignal } from 'solid-js'

export function Counter() {
  const [count, setCount] = createSignal(0)
  const double = createMemo(() => count() * 2)

  createEffect(() => console.log('count is', count()))

  return (
    <>
      <button type="button" onClick={() => setCount(count() + 1)}>Count: {count()}</button>
      <p>Double: {double()}</p>
    </>
  )
}
```

**Preact with Signals.** A Preact component, but the state is a signal. Passing the signal itself into JSX
(`{count}`, not `{count.value}`) lets Preact Signals bind it straight to the text node, so a click updates
the text without re-rendering the component. Reading `count.value` in the body would subscribe the whole
component instead, and it would re-render like a hooks component.

```tsx
import { useComputed, useSignal, useSignalEffect } from '@preact/signals'

export function Counter() {
  const count = useSignal(0)
  const double = useComputed(() => count.value * 2)

  useSignalEffect(() => console.log('count is', count.value))

  return (
    <>
      <button type="button" onClick={() => count.value++}>Count: {count}</button>
      <p>Double: {double}</p>
    </>
  )
}
```

**Lit.** A reactive property triggers an asynchronous update; `render()` runs again and lit-html updates the
two expressions whose values changed. There is no computed primitive: a getter recalculates on each render,
and `updated()` is the place for effects, with a map of what changed. This uses standard decorators, which
need the `accessor` keyword; with TypeScript's `experimentalDecorators` you would write `@state() count = 0`.

```ts
import { LitElement, html, type PropertyValues } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('lit-counter')
export class LitCounter extends LitElement {
  @state() accessor count = 0

  get double() {
    return this.count * 2 // derived: recalculated on every render
  }

  updated(changed: PropertyValues<this>) {
    if (changed.has('count')) console.log('count is', this.count)
  }

  render() {
    return html`
      <button type="button" @click=${() => this.count++}>Count: ${this.count}</button>
      <p>Double: ${this.double}</p>
    `
  }
}
```

**Alpine.** Plain JavaScript in HTML attributes (see [Chapter 14](14-alpine.md) for why JavaScript rather
than TypeScript). Alpine makes the `x-data` object reactive with `@vue/reactivity`, the same package Vue
uses, so each `x-text` is an effect and `x-effect` is a user effect. The getter is not cached; it reruns
whenever an effect that reads it reruns.

```html
<div x-data="{ count: 0, get double() { return this.count * 2 } }"
     x-effect="console.log('count is', count)">
  <button type="button" @click="count++">Count: <span x-text="count"></span></button>
  <p>Double: <span x-text="double"></span></p>
</div>
```

**VanJS.** Also plain JavaScript ([Chapter 10](10-mithril-and-the-minimalists.md)). `van.state` is a signal,
`van.derive` both a computed and, if you ignore its result, an effect (the VanJS docs show this use). Passing
a state as a child binds it to a text node. Derivations run in a microtask after the change.

```js
import van from 'vanjs-core'

const { button, p } = van.tags

const Counter = () => {
  const count = van.state(0)
  const double = van.derive(() => count.val * 2)
  van.derive(() => console.log('count is', count.val)) // a derive used only for its side effect

  return [
    button({ type: 'button', onclick: () => ++count.val }, 'Count: ', count),
    p('Double: ', double),
  ]
}

van.add(document.getElementById('app'), Counter())
```

Three frameworks from the course have no snippet here. Mithril redraws its virtual DOM after every event
handler, so its counter is a plain variable and a view function. Qwik's `useSignal`, `useComputed$` and
`useTask$` follow the signals pattern, with the twist that the graph is serialized into the HTML so the
browser can resume it ([Chapter 11](11-qwik.md) and
[Chapter 18](18-meta-frameworks-and-rendering.md)). htmx ([Chapter 13](13-htmx.md)) has no client-side state
at all: the count would live on the server, and a click would fetch new HTML.

Side by side:

| Framework | State | Derived | Effect | On a click, what reruns |
|---|---|---|---|---|
| React | `useState` | plain `const` | `useEffect` + deps | the component; diff; effect after commit |
| Vue | `ref` | `computed` | `watchEffect` | the watcher; the component's render + diff |
| Svelte 5 | `$state` | `$derived` | `$effect` | two compiled text effects; the effect |
| Angular | `signal` | `computed` | `effect` | this component's bindings; the effect |
| Solid | `createSignal` | `createMemo` | `createEffect` | two text effects; the effect |
| Preact Signals | `useSignal` | `useComputed` | `useSignalEffect` | two text bindings; the effect |
| Lit | reactive property | getter | `updated()` | `render()`; the changed expressions |
| Alpine | `x-data` property | getter | `x-effect` | two `x-text` effects; the effect |
| VanJS | `van.state` | `van.derive` | `van.derive` | the derive; two bound text nodes |

[Appendix A](appendix-a-rosetta-stone.md) extends this table to props, lists, two-way binding and more.

## The TC39 Signals proposal

Nearly every framework now has its own signals, each with its own graph. A signal from one library cannot be
read inside another library's computed, which is a problem for code meant to be shared: a data layer, a
design system, a model used by both a Lit component and a React app. In April 2024 a group of framework
authors brought a proposal to TC39 to add one signal primitive to JavaScript. The original authors are Rob
Eisenberg and Daniel Ehrenberg, and the README says the draft is based on design input from the maintainers
of Angular, Ember, MobX, Preact, Qwik, Solid, Svelte, Vue and others.

The proposal reached **Stage 1** in April 2024, meaning the committee agrees the problem is worth exploring.
As of November 2026 it is **still at Stage 1** in TC39's own proposals list. Its README says the plan is to
prototype heavily, including integration into several frameworks, before asking for Stage 2.

The API is deliberately small:

- `new Signal.State(value)` with `get()` and `set()`;
- `new Signal.Computed(fn)` with `get()`, lazy, cached and glitch-free;
- `Signal.subtle`, a namespace for framework authors, with `untrack`, introspection, and `Watcher`, an object
  that is notified synchronously when a watched computed might be stale.

There is no `effect`. The README explains why:

> The Signal API does not include any built-in function like `effect`. This is because effect scheduling is
> subtle and often ties into framework rendering cycles and other high-level framework-specific state or
> strategies which JS does not have access to.
>
> — TC39 Signals proposal README

So a standard would give frameworks a shared graph and leave scheduling, ownership and rendering to them,
which is the split this chapter's library hints at: `signal`, `computed` and the push-pull algorithm are
generic; `effect`, `batch` and ownership encode a policy.

You can experiment today with `signal-polyfill` (0.2.2, January 2025), which the proposal links to. Lit has
an experimental integration, `@lit-labs/signals`, built on it. Exercise 3 builds a microtask-scheduled
effect on the polyfill's `Watcher`. The polyfill is not meant for production, and the API may change
before Stage 2. Even if the proposal advances quickly, the README expects at least two to three years before
signals are available natively across browsers without a polyfill.

## Which model is best?

None of them, in general. The differences above are real but rarely decisive on their own: a re-rendering
framework with a compiler or careful memoization is fast enough for nearly every app, and a signals framework
still needs good component design. What the model does decide is the *texture* of everyday work. With
re-render and diff you think in snapshots and pay attention to what re-renders and to effect dependencies.
With signals you think in a graph and pay attention to where values are read and to keeping them wrapped.
With a compiler you write the most direct code and trust the tool to make it reactive. Pick the texture
your team finds natural, then weigh the things that usually matter more: ecosystem, hiring, stability and
the server story. [Chapter 19](19-comparing-frameworks.md) measures the frameworks side by side, and
[Chapter 20](20-choosing-a-framework.md) turns all of this into a decision guide.

## Summary

- Re-render and diff (React, Preact, Mithril) reruns component functions and reconciles their output: plain
  values and a simple model, at the cost of wasted work and dependency arrays.
- Fine-grained signals (Solid, Preact Signals, Angular, Vue refs, VanJS, Alpine, Qwik) track which
  computation read which value and rerun only those: work proportional to the change, at the cost of
  tracked reads and lifetime management.
- Compiled updates (Svelte, Vue Vapor, Solid's JSX) move the analysis to build time and generate direct DOM
  updates; most compiled frameworks now use signals at run time.
- Push-pull evaluation pushes "might be stale" flags and pulls values on demand, which gives lazy,
  glitch-free updates in which every node recomputes at most once per change.
- Automatic, dynamic dependency tracking, equality cutoff, batching or scheduled effects, and ownership with
  cleanup are what make a signals system correct and leak-free.
- `examples/ch15/signals.ts` implements all of that in about 75 lines, with ten passing `node --test` tests
  and a DOM counter.
- The TC39 Signals proposal is at Stage 1 (November 2026); it standardizes `State` and `Computed` and leaves
  effects and scheduling to frameworks. `signal-polyfill` lets you try it.

## Exercises

1. **Cutoff in a diamond.** Change the diamond so that `b = a > 0` and `c` is `'even'` or `'odd'`, with
   `a = 1` and an effect that logs `d`. Predict which nodes rerun after `a.set(3)` and after `a.set(4)`, then
   check with the library.

   <details><summary>Solution</summary>

   `examples/ch15/solutions/cutoff.ts`
   ```ts
   import { signal, computed, effect } from '../signals.ts'

   const runs: string[] = []
   const a = signal(1)
   const b = computed(() => { runs.push('b'); return a.get() > 0 })
   const c = computed(() => { runs.push('c'); return a.get() % 2 === 0 ? 'even' : 'odd' })
   const d = computed(() => { runs.push('d'); return `${b.get()} ${c.get()}` })
   effect(() => { runs.push('effect'); console.log('d =', d.get()) })

   runs.length = 0
   a.set(3) // b stays true and c stays "odd"
   console.log('after a.set(3), reran:', runs.join(', '))

   runs.length = 0
   a.set(4) // b stays true, c becomes "even"
   console.log('after a.set(4), reran:', runs.join(', '))
   ```

   ```console
   $ node solutions/cutoff.ts
   d = true odd
   after a.set(3), reran: b, c
   d = true even
   after a.set(4), reran: b, c, d, effect
   ```

   After `a.set(3)`, `b` and `c` are marked `DIRTY` and `d` and the effect `CHECK`. The effect pulls `d`,
   `d` pulls `b` (reruns, still `true`) and `c` (reruns, still `'odd'`). Neither changed, so neither marks
   `d` `DIRTY`; `d` goes back to `CLEAN` without running, and so does the effect. Only the two nodes that
   read `a` directly ran. After `a.set(4)`, `c` changes to `'even'`, which marks `d` `DIRTY`; `d` reruns,
   produces a new string, marks the effect `DIRTY`, and the effect logs. A pure push system would have run
   `d` and the effect both times.

   </details>

2. **Add `untrack`.** Add `untrack(fn)` to the library: it runs `fn` and returns its result, but reads inside
   `fn` must not become dependencies of the running computation. Write tests.

   <details><summary>Solution</summary>

   Append to a copy of `signals.ts` (the solution is `examples/ch15/solutions/signals.ts`, identical to the
   library plus this function):

   ```ts
   export function untrack<T>(fn: () => T): T {
     const outer = tracking
     tracking = undefined // reads inside fn see no running computation, so nothing subscribes
     try { return fn() } finally { tracking = outer }
   }
   ```

   `examples/ch15/solutions/untrack.test.ts`
   ```ts
   import { test } from 'node:test'
   import assert from 'node:assert/strict'
   import { signal, effect, untrack } from './signals.ts'

   test('untrack reads the current value without subscribing', () => {
     const count = signal(0)
     const label = signal('clicks')
     const seen: string[] = []
     effect(() => { seen.push(`${count.get()} ${untrack(() => label.get())}`) })
     label.set('taps') // not a dependency: no rerun
     count.set(1) // a dependency: rerun, and it sees the new label
     assert.deepEqual(seen, ['0 clicks', '1 taps'])
   })

   test('tracking resumes after untrack returns', () => {
     const a = signal(1)
     const b = signal(1)
     let runs = 0
     effect(() => { untrack(() => a.get()); b.get(); runs++ })
     b.set(2)
     assert.equal(runs, 2)
   })
   ```

   Both tests pass (they are the last two lines of the `npm test` output above). The `try`/`finally`
   matters: if `fn` throws, tracking must still be restored, or every later read in the outer computation
   would go untracked. Every framework has this escape hatch: `untracked` in Angular, `untrack` in Solid and
   Svelte, `.peek()` in Preact Signals, `rawVal` in VanJS and `Signal.subtle.untrack` in the proposal.

   </details>

3. **Use the proposal.** Rewrite the counter's logic (state, double, a logging effect) with
   `signal-polyfill`. Because the proposal has no `effect`, build one on `Signal.subtle.Watcher` that runs
   effects in a microtask.

   <details><summary>Solution</summary>

   `examples/ch15/solutions/polyfill-counter.ts`
   ```ts
   import { Signal } from 'signal-polyfill'

   // A minimal effect on top of a Watcher, after the proposal README's example.
   const pending = new Set<Signal.Computed<void>>()
   const watcher = new Signal.subtle.Watcher(() => {
     if (pending.size === 0) queueMicrotask(flush)
     for (const s of watcher.getPending()) pending.add(s as Signal.Computed<void>)
   })

   function flush() {
     for (const s of pending) s.get() // reruns the effect if a source really changed
     pending.clear()
     watcher.watch() // re-arm: the watcher notifies only once until watch() is called
   }

   function effect(fn: () => void) {
     const computed = new Signal.Computed(fn)
     watcher.watch(computed)
     computed.get()
     return () => watcher.unwatch(computed)
   }

   const count = new Signal.State(0)
   const double = new Signal.Computed(() => count.get() * 2)

   effect(() => console.log('count is', count.get(), 'double is', double.get()))

   count.set(1)
   count.set(2) // same microtask: the effect runs once, with 2
   setTimeout(() => count.set(3))
   ```

   ```console
   $ node solutions/polyfill-counter.ts
   count is 0 double is 0
   count is 2 double is 4
   count is 3 double is 6
   ```

   An effect here is a `Computed` whose function has side effects, kept alive by the watcher. When a
   watched computed might be stale, the watcher's callback runs synchronously inside `set`, where reading
   signals is not allowed, so it only records the pending computeds and schedules `flush` with
   `queueMicrotask`. `flush` calls `get()` on each, which reruns the function only if a source really
   changed, then calls `watch()` again to re-arm the watcher. Because `count.set(1)` and `count.set(2)`
   happen in the same task, the effect runs once and never logs 1: scheduling gives you batching for free.
   This is the pattern the proposal's README sketches for framework authors.

   </details>

4. **Why didn't it update?** This effect logs `items: a` once and then seems to ignore the next change.
   Explain the output, and find the one line that does trigger an update.

   `examples/ch15/solutions/mutation.ts`
   ```ts
   import { signal, effect } from '../signals.ts'

   const items = signal(['a'])
   effect(() => console.log('items:', items.get().join(', ')))

   items.get().push('b') // mutates the array in place: no signal is told
   items.set(items.get()) // the same array: Object.is says nothing changed
   items.set([...items.get(), 'c']) // a new array: the effect reruns
   ```

   <details><summary>Solution</summary>

   ```console
   $ node solutions/mutation.ts
   items: a
   items: a, b, c
   ```

   `items.get().push('b')` changes the array, but no `set` is called, so the signal never hears about it.
   `items.set(items.get())` does call `set`, but with the same array object, and `Object.is` reports no
   change, so nothing is marked. Only `items.set([...items.get(), 'c'])` passes a *new* array, which
   triggers the effect, and by then the array contains `b` as well, so you see `a, b, c`. Solid, Preact
   Signals, Angular and VanJS all behave like this (VanJS's docs say never to mutate `val`), and React's
   `setState` works the same way for the same reason. Vue's `reactive` and `ref` and Svelte 5's `$state`
   wrap arrays and objects in proxies, so `push` is tracked there; Solid offers `createStore` and Angular
   `update(arr => [...arr, x])` for the same need.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-15--reactivity-compared)
