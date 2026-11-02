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
