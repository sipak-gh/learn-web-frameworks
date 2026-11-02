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
