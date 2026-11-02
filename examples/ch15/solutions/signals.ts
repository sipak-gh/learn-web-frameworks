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

export function untrack<T>(fn: () => T): T {
  const outer = tracking
  tracking = undefined // reads inside fn see no running computation, so nothing subscribes
  try { return fn() } finally { tracking = outer }
}
